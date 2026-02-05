/**
 * Probe Management System
 * Handles probe lifecycle, movement, and interactions
 */
class ProbeManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        
        // Listen for relevant events
        this.eventBus.on('probe:deploy', this.deployProbe.bind(this));
        this.eventBus.on('probe:build', this.buildProbe.bind(this));
        this.eventBus.on('probe:select', this.selectProbe.bind(this));
        this.eventBus.on('game:update', this.updateProbes.bind(this));
    }

    /**
     * Deploy a probe with waypoints
     */
    deployProbe(data) {
        const { hub, waypoints } = data;
        if (!hub || this.getReadyProbeCountForHub(hub) <= 0) return;

        console.log('Deploying probe from hub:', hub.id, 'to waypoints:', waypoints);

        // Build waypoints: Hub -> destinations -> direct return to Hub
        const hubPos = { x: hub.x, y: hub.y };
        const outboundWaypoints = [hubPos, ...waypoints];
        // Return journey is a direct line from final destination back to hub
        const finalDestination = waypoints[waypoints.length - 1];
        const returnWaypoints = [finalDestination, hubPos];
        const allWaypoints = outboundWaypoints.concat(returnWaypoints.slice(1));
        
        console.log('Full waypoint path:', allWaypoints);
        console.log('Outbound waypoint count:', outboundWaypoints.length);

        // Calculate speeds
        const baseSpeed = 0.0001;
        const outboundSpeed = baseSpeed;
        const returnSpeed = baseSpeed * 3;

        // Check for ready probe to redeploy
        let probe = this.gameState.entities.probes.find(p => 
            p.active &&
            p.hub === hub && 
            p.status === 'ready' && 
            (!p.waypoints || p.waypoints.length === 0)
        );

        if (probe) {
            // Redeploy existing probe
            console.log(`Redeploying existing probe ${probe.id}`);
            this.setupProbeForDeployment(probe, allWaypoints, outboundWaypoints, outboundSpeed, returnSpeed);
        } else {
            // Check capacity before creating new probe
            const currentActiveProbes = this.getActiveProbeCountForHub(hub);
            if (currentActiveProbes >= hub.maxProbes) {
                console.warn('Cannot create new probe - hub at capacity');
                this.eventBus.emit('ui:message', { text: 'Hub at maximum capacity!', type: 'error' });
                return;
            }

            // Create new probe
            console.log(`Creating new probe for hub ${hub.id}`);
            probe = this.createNewProbe(hub, allWaypoints, outboundWaypoints, outboundSpeed, returnSpeed);
            this.gameState.entities.probes.push(probe);
        }

        this.eventBus.emit('ui:message', { text: 'Probe deployed from hub!', type: 'success' });
        this.eventBus.emit('ui:update');
        
        // Emit event for tutorial
        this.eventBus.emit('probe:deployed');
    }

    /**
     * Build a new probe at a hub
     */
    buildProbe(data) {
        const { hub } = data;
        const resources = this.gameState.getResources();
        
        if (hub && resources.minerals >= 25 && this.getActiveProbeCountForHub(hub) < hub.maxProbes) {
            const probe = {
                id: Date.now(),
                waypoints: [],
                currentWaypoint: 0,
                current: { x: hub.x, y: hub.y },
                segmentProgress: 0,
                speed: 0.0001,
                pulseTimer: 0,
                pulses: [],
                radarPulses: [],
                active: true,
                hub: hub,
                recoveryMode: false,
                outboundWaypointsCount: 0,
                returnSpeed: 0.0003,
                patrolMode: true,
                equipment: [],
                maxEquipmentSlots: 2,
                status: 'ready',
                returnedToHub: false,
                damage: 0,
                baseMaxDamage: 3,
                maxDamage: 3,
                lastDamageTime: 0,
                cargo: {
                    minerals: 0,
                    data: 0,
                    artifacts: 0,
                    exoticMinerals: 0
                },
                // Apply active cosmetic skin (if CosmeticManager exists)
                cosmetic: this.gameState.cosmeticManager ?
                    { ...this.gameState.cosmeticManager.getActiveSkinDesign() } :
                    {
                        // Fallback default skin
                        trailEnabled: true,
                        trail: {
                            length: 15,
                            color: '#00ffff',
                            width: 3,
                            opacity: 0.9
                        }
                    }
            };

            // PBON-04: probeDurability bonus increases maxDamage
            const durabilityBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('probes', probe, 'probeDurability') : 0;
            if (durabilityBonus > 0) {
                probe.maxDamage = Math.floor(probe.baseMaxDamage * (1 + durabilityBonus / 100));
            }

            this.gameState.entities.probes.push(probe);
            this.gameState.updateResources({ minerals: resources.minerals - 25 }, this.eventBus);
            
            // Update Probethium stats
            this.gameState.updateProbethiumStats('probe_built');
            
            this.eventBus.emit('ui:message', { text: 'Probe built!', type: 'success' });
            this.eventBus.emit('ui:update');
        }
    }

    /**
     * Select a probe for detailed view
     */
    selectProbe(data) {
        const { probe } = data;
        this.gameState.ui.selectedProbe = probe;
        this.eventBus.emit('ui:probeSelected', { probe });
    }

    /**
     * Update all probes
     */
    updateProbes(data) {
        const { deltaTime } = data;
        
        this.gameState.entities.probes.forEach(probe => {
            if (!probe.active) return;

            // Handle probe without waypoints (ready at hub)
            if (!probe.waypoints || probe.waypoints.length === 0) {
                probe.status = 'ready';
                return;
            }

            try {
                // Handle probe movement and pulse logic
                this.updateProbeMovement(probe, deltaTime);
                this.updateProbePulses(probe, deltaTime);
                
                // Handle asteroid field damage
                this.checkAsteroidFieldDamage(probe, deltaTime);
                
                // Handle auto-collection if any collector equipment is equipped
                if (probe.equipment && Array.isArray(probe.equipment) && probe.equipment.length > 0) {
                    try {
                        this.autoCollectSignals(probe);
                    } catch (error) {
                        console.error('Error in auto-collection:', error);
                    }
                }
            } catch (error) {
                console.error('Error updating probe:', probe.id, error);
                // Don't let one broken probe freeze all probes
            }
        });
    }

    /**
     * Setup probe for deployment
     */
    setupProbeForDeployment(probe, allWaypoints, outboundWaypoints, outboundSpeed, returnSpeed) {
        probe.waypoints = allWaypoints;
        probe.currentWaypoint = 0;
        probe.current = { x: probe.hub.x, y: probe.hub.y }; // Ensure we start exactly at hub
        probe.segmentProgress = 0;
        probe.speed = outboundSpeed;
        probe.returnSpeed = returnSpeed;
        probe.recoveryMode = false;
        probe.outboundWaypointsCount = outboundWaypoints.length;
        probe.status = 'exploring';
        probe.returnedToHub = false;
        probe.pulseTimer = 0;
        probe.pulses = [];
        probe.radarPulses = [];
        probe.active = true;
        // Initialize cargo if it doesn't exist
        if (!probe.cargo) {
            probe.cargo = {
                minerals: 0,
                data: 0,
                artifacts: 0,
                exoticMinerals: 0
            };
        }
        
        console.log(`Probe ${probe.id} setup: starting at (${probe.current.x}, ${probe.current.y}), waypoints: ${probe.waypoints.length}`);
    }

    /**
     * Create a new probe
     */
    createNewProbe(hub, allWaypoints, outboundWaypoints, outboundSpeed, returnSpeed) {
        const probe = {
            id: Date.now(),
            waypoints: allWaypoints,
            currentWaypoint: 0,
            current: { x: hub.x, y: hub.y }, // Start exactly at hub position
            segmentProgress: 0,
            speed: outboundSpeed,
            pulseTimer: 0,
            pulses: [],
            radarPulses: [],
            active: true,
            hub: hub,
            recoveryMode: false,
            outboundWaypointsCount: outboundWaypoints.length,
            returnSpeed: returnSpeed,
            patrolMode: true,
            equipment: [],
            maxEquipmentSlots: 2,
            status: 'exploring',
            returnedToHub: false,
            damage: 0,
            baseMaxDamage: 3,
            maxDamage: 3,
            lastDamageTime: 0,
            cargo: {
                minerals: 0,
                data: 0,
                artifacts: 0,
                exoticMinerals: 0
            }
        };

        // PBON-04: probeDurability bonus increases maxDamage
        const durabilityBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('probes', probe, 'probeDurability') : 0;
        if (durabilityBonus > 0) {
            probe.maxDamage = Math.floor(probe.baseMaxDamage * (1 + durabilityBonus / 100));
        }

        return probe;
    }

    /**
     * Update probe movement
     */
    updateProbeMovement(probe, deltaTime) {
        // Debug probe position occasionally
        if (Math.random() < 0.001) {
            console.log(`Probe ${probe.id}: waypoint ${probe.currentWaypoint}/${probe.waypoints.length}, pos (${Math.round(probe.current.x)}, ${Math.round(probe.current.y)})`);
        }
        
        if (probe.currentWaypoint >= probe.waypoints.length - 1) {
            // Probe has completed all waypoints
            
            // Always deliver cargo when returning to hub, even in patrol mode
            if (!probe.returnedToHub) {
                probe.returnedToHub = true;
                
                // Deliver cargo when returning to hub
                if (probe.cargo && Object.keys(probe.cargo).some(key => probe.cargo[key] > 0)) {
                    const currentResources = this.gameState.getResources();
                    const newResources = { ...currentResources };
                    
                    let deliveryMessage = 'Cargo delivered: ';
                    let deliveryParts = [];
                    
                    if (probe.cargo.minerals > 0) {
                        newResources.minerals += probe.cargo.minerals;
                        deliveryParts.push(`+${probe.cargo.minerals} Minerals`);
                    }
                    if (probe.cargo.data > 0) {
                        newResources.data += probe.cargo.data;
                        deliveryParts.push(`+${probe.cargo.data} Data`);
                    }
                    if (probe.cargo.artifacts > 0) {
                        newResources.artifacts += probe.cargo.artifacts;
                        deliveryParts.push(`+${probe.cargo.artifacts} Artifacts`);
                    }
                    if (probe.cargo.exoticMinerals > 0) {
                        newResources.exoticMinerals += probe.cargo.exoticMinerals;
                        deliveryParts.push(`+${probe.cargo.exoticMinerals} Exotic`);
                    }
                    
                    this.gameState.updateResources(newResources, this.eventBus);
                    
                    deliveryMessage += deliveryParts.join(', ');
                    console.log(`Probe ${probe.id} delivered cargo:`, probe.cargo);
                    
                    this.eventBus.emit('ui:message', { 
                        text: deliveryMessage, 
                        type: 'success' 
                    });
                    
                    // Clear cargo after delivery
                    probe.cargo = {
                        minerals: 0,
                        data: 0,
                        artifacts: 0,
                        exoticMinerals: 0
                    };
                }
                
                // Heal probe damage when returning to hub
                if (probe.damage > 0) {
                    console.log(`Probe ${probe.id} healed at hub (was ${probe.damage} damage)`);
                    probe.damage = 0;
                    this.eventBus.emit('ui:message', { 
                        text: 'Probe repaired at hub!', 
                        type: 'success' 
                    });
                }
            }
            
            if (probe.patrolMode && probe.waypoints.length > 2) {
                // Restart patrol loop from the hub
                probe.currentWaypoint = 0; // Start from hub (waypoint 0)
                probe.segmentProgress = 0;
                probe.current = { x: probe.hub.x, y: probe.hub.y }; // Reset position to hub
                // Always reset to base outbound speed for patrol restart
                probe.speed = 0.0001; // Base outbound speed
                probe.returnedToHub = false; // Reset for next patrol cycle
            } else {
                // Mark as ready at hub
                if (probe.status !== 'ready') {
                    probe.status = 'ready';
                    probe.currentWaypoint = 0;
                    probe.current = { x: probe.hub.x, y: probe.hub.y };
                    probe.active = true;

                    // Clear path for non-patrolling probes
                    probe.waypoints = [];
                    probe.segmentProgress = 0;
                    probe.recoveryMode = false;
                    
                    // Clear any remaining pulse animations
                    probe.pulses = [];
                    probe.radarPulses = [];
                    probe.pulseTimer = 0;

                    this.eventBus.emit('ui:update');
                    this.eventBus.emit('probe:statusChanged');
                    console.log('Probe returned to hub (path cleared)');
                }
            }
            return;
        }

        // Move probe along current segment - use return speed when on return journey
        const isOnReturnJourney = probe.outboundWaypointsCount && probe.currentWaypoint >= probe.outboundWaypointsCount - 1;
        let currentSpeed = isOnReturnJourney ? probe.returnSpeed : probe.speed;
        
        // Apply cargo penalty to speed
        const cargoSpeedModifier = this.getCargoSpeedModifier(probe);
        currentSpeed *= cargoSpeedModifier;
        
        // Debug speed logic occasionally
        if (Math.random() < 0.001) {
            console.log(`Probe ${probe.id} speed: currentWP=${probe.currentWaypoint}, outboundCount=${probe.outboundWaypointsCount}, isReturn=${isOnReturnJourney}, speed=${currentSpeed}, baseSpeed=${probe.speed}, returnSpeed=${probe.returnSpeed}, cargoMod=${cargoSpeedModifier}`);
        }
        
        // Safety check for reasonable deltaTime (max 1 second)
        const safeDeltaTime = Math.min(deltaTime, 1000);
        probe.segmentProgress += currentSpeed * safeDeltaTime;

        if (probe.segmentProgress >= 1.0) {
            // Move to next waypoint
            probe.currentWaypoint++;
            probe.segmentProgress = 0;
            probe.returnedToHub = false; // Reset for next segment
            
            // Safety check to prevent infinite waypoint progression
            if (probe.currentWaypoint > probe.waypoints.length + 5) {
                console.error('Probe waypoint overflow, resetting to hub');
                probe.currentWaypoint = probe.waypoints.length - 1;
                probe.segmentProgress = 1.0;
            }
        }

        // Update current position
        if (probe.currentWaypoint < probe.waypoints.length - 1) {
            const start = probe.waypoints[probe.currentWaypoint];
            const end = probe.waypoints[probe.currentWaypoint + 1];
            
            // Safety check for valid waypoints
            if (start && end && typeof start.x === 'number' && typeof end.x === 'number') {
                probe.current.x = start.x + (end.x - start.x) * probe.segmentProgress;
                probe.current.y = start.y + (end.y - start.y) * probe.segmentProgress;
                
                // Emit probe movement for sector discovery
                this.eventBus.emit('probe:moved', { probe });
            } else {
                console.error('Invalid waypoints detected:', { start, end, currentWaypoint: probe.currentWaypoint });
                // Reset probe to hub
                probe.current.x = probe.hub.x;
                probe.current.y = probe.hub.y;
                probe.waypoints = [];
                probe.status = 'ready';
            }
        }
    }

    /**
     * Update probe radar pulses
     */
    updateProbePulses(probe, deltaTime) {
        // Only generate pulses for probes that are actively moving
        if (!probe.waypoints || probe.waypoints.length <= 1) {
            return;
        }

        // Generate pulses during exploration (outbound journey) and patrol mode
        const isExploring = probe.outboundWaypointsCount && probe.currentWaypoint < probe.outboundWaypointsCount - 1;
        const isPatrolling = probe.patrolMode && probe.waypoints && probe.waypoints.length > 2;
        const shouldGenerateSignals = isExploring || isPatrolling;
        
        // Debug signal generation conditions
        if (Math.random() < 0.001) { // Occasional debug logging
            console.log(`Probe ${probe.id} signal check: isExploring=${isExploring}, isPatrolling=${isPatrolling}, shouldGenerate=${shouldGenerateSignals}, waypoints=${probe.waypoints.length}, currentWP=${probe.currentWaypoint}, outboundCount=${probe.outboundWaypointsCount}`);
        }
        
        if (!shouldGenerateSignals) {
            // Still update existing radar pulses even if not generating new ones
            probe.radarPulses = probe.radarPulses.filter(pulse => {
                pulse.elapsed += deltaTime;
                pulse.radius = (pulse.elapsed / pulse.duration) * pulse.maxRadius;
                return pulse.elapsed < pulse.duration;
            });
            return;
        }

        probe.pulseTimer += deltaTime;

        // Generate radar pulse every 3 seconds (during exploration and patrol)
        if (probe.pulseTimer >= 3000) {
            probe.pulseTimer = 0;

            console.log('Probe generating exploration pulse at:', probe.current.x, probe.current.y, 'Equipment:', probe.equipment ? 'Yes' : 'No');

            // PBON-02: signalRange bonus affects radar pulse visual radius
            const rangeBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('probes', probe, 'signalRange') : 0;
            const pulseMaxRadius = 80 * (1 + rangeBonus / 100);

            // Add radar pulse
            probe.radarPulses.push({
                x: probe.current.x,
                y: probe.current.y,
                radius: 0,
                maxRadius: pulseMaxRadius,
                duration: 2000,
                elapsed: 0
            });

            // PBON-01: dataSignalDiscovery bonus increases signal generation chance
            const signalDiscoveryBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('probes', probe, 'dataSignalDiscovery') : 0;
            const signalChance = 0.3 * (1 + signalDiscoveryBonus / 100);

            // Generate signals with base 30% chance (modified by shell bonus)
            if (Math.random() < signalChance) {
                try {
                    const signalX = probe.current.x + (Math.random() - 0.5) * 160;
                    const signalY = probe.current.y + (Math.random() - 0.5) * 160;
                    
                    console.log('Generating signal at:', signalX, signalY);
                    
                    // Check current sector for enhanced generation
                    const currentSector = this.getCurrentSector(probe);
                    const isInAsteroidField = currentSector && currentSector.type.name === 'Asteroid Field';
                    
                    // Check if this should be a dark market signal (access via window.game)
                    const darkMarketSystem = window.game?.darkMarketSystem;
                    const isDarkMarket = darkMarketSystem && darkMarketSystem.shouldSpawnDarkMarket();
                    
                    // Determine signal type based on sector
                    const signalType = isDarkMarket ? 'dark_market' : this.determineSignalType(currentSector, probe);
                    
                    // Create signal directly since we don't have a signal manager yet
                    const exclusiveTypes = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'];
                    const isExclusive = exclusiveTypes.includes(signalType);

                    const signal = {
                        x: signalX,
                        y: signalY,
                        radius: isDarkMarket ? 12 : isExclusive ? 10 + Math.random() * 3 : 8 + Math.random() * 4,
                        rarity: isDarkMarket ? 'dark_market' : this.determineSignalRarity(isInAsteroidField, probe),
                        signalType: signalType,
                        duration: isDarkMarket ? 5000
                            : isExclusive ? 5000 + Math.random() * 3000  // VIS-05: 5-8 seconds
                            : 2000 + Math.random() * 1000,                // Standard: 2-3 seconds
                        createdAt: Date.now()
                    };
                    
                    this.gameState.entities.signals.push(signal);
                    
                    if (isDarkMarket) {
                        console.log('🌑 DARK MARKET signal spawned!');
                    } else {
                        console.log('Signal created successfully. Total signals:', this.gameState.entities.signals.length);
                    }
                } catch (error) {
                    console.error('Error creating signal:', error);
                }
            }
        }

        // Update radar pulses
        probe.radarPulses = probe.radarPulses.filter(pulse => {
            pulse.elapsed += deltaTime;
            pulse.radius = (pulse.elapsed / pulse.duration) * pulse.maxRadius;
            return pulse.elapsed < pulse.duration;
        });
    }

    /**
     * Determine signal rarity
     */
    determineSignalRarity(inAsteroidField = false, probe = null) {
        const rand = Math.random();

        // PBON-03: rareSignalChance bonus shifts probability away from common toward rarer outcomes
        const rareBonus = (probe && window.game?.shellSystem) ? window.game.shellSystem.getEntityBonus('probes', probe, 'rareSignalChance') : 0;

        if (inAsteroidField) {
            // Asteroid fields have 2x rare resources (shifted probabilities)
            const commonReduction = 0.3 * (rareBonus / 100);
            const boost = commonReduction / 3;
            const adjCommon = 0.3 - commonReduction;
            const adjUncommon = 0.5 + boost;
            const adjRare = 0.75 + boost * 2;
            const adjEpic = Math.min(0.99, 0.92 + boost * 3);

            if (rand < adjCommon) return 'common';
            if (rand < adjUncommon) return 'uncommon';
            if (rand < adjRare) return 'rare';
            if (rand < adjEpic) return 'epic';
            return 'legendary';
        } else {
            // Normal probabilities with rareSignalChance bonus
            const commonReduction = 0.5 * (rareBonus / 100);
            const boost = commonReduction / 3;
            const adjCommon = 0.5 - commonReduction;
            const adjUncommon = 0.75 + boost;
            const adjRare = 0.9 + boost * 2;
            const adjEpic = Math.min(0.99, 0.98 + boost * 3);

            if (rand < adjCommon) return 'common';
            if (rand < adjUncommon) return 'uncommon';
            if (rand < adjRare) return 'rare';
            if (rand < adjEpic) return 'epic';
            return 'legendary';
        }
    }

    /**
     * Determine signal type based on current sector
     * SIG-01 through SIG-05: Exclusive signals spawn in designated sectors at 15-30% rate
     */
    determineSignalType(sector, probe = null) {
        if (!sector || !sector.type) {
            return 'mixed'; // Default for unknown sectors
        }

        // SIG-01 through SIG-04: Check for exclusive signal type spawning
        if (sector.type.exclusiveSignalType) {
            const exclusiveChance = 0.225; // 22.5% base rate (target: 15-30%)

            // SIG-07: Apply shell bonuses to exclusive signal spawning
            // dataSignalDiscovery bonus affects all signal types (type-agnostic design)
            let adjustedChance = exclusiveChance;
            if (probe && window.game?.shellSystem) {
                const discoveryBonus = window.game.shellSystem.getEntityBonus('probes', probe, 'dataSignalDiscovery');
                adjustedChance = exclusiveChance * (1 + discoveryBonus / 100);
            }

            if (Math.random() < adjustedChance) {
                console.log(`Exclusive signal spawned: ${sector.type.exclusiveSignalType} in ${sector.type.name} sector`);
                return sector.type.exclusiveSignalType;
            }
        }

        // SIG-05: Fallback to standard signal distribution
        const sectorName = sector.type.name;
        const random = Math.random();

        switch (sectorName) {
            case 'Resource-Rich':
                // 60% mineral, 25% mixed, 15% others
                if (random < 0.6) return 'mineral';
                if (random < 0.85) return 'mixed';
                return random < 0.925 ? 'data' : 'artifact';
                
            case 'Data Haven':
                // 60% data, 25% mixed, 15% others  
                if (random < 0.6) return 'data';
                if (random < 0.85) return 'mixed';
                return random < 0.925 ? 'artifact' : 'mineral';
                
            case 'Ancient':
                // 60% artifact, 25% mixed, 15% others
                if (random < 0.6) return 'artifact';
                if (random < 0.85) return 'mixed';
                return random < 0.925 ? 'data' : 'mineral';
                
            case 'Asteroid Field':
                // 40% mineral, 30% mixed, 20% data, 10% artifact (chaotic mix)
                if (random < 0.4) return 'mineral';
                if (random < 0.7) return 'mixed';
                if (random < 0.9) return 'data';
                return 'artifact';
                
            case 'Standard':
            default:
                // 70% mixed, 10% each specialized type
                if (random < 0.7) return 'mixed';
                if (random < 0.8) return 'mineral';
                if (random < 0.9) return 'data';
                return 'artifact';
        }
    }

    /**
     * Get base resource type for signal type (for equipment auto-collection)
     * Exclusive types map to standard collection categories
     * SIG-06: Equipment compatibility via base type mapping
     */
    getSignalBaseType(signalType) {
        switch (signalType) {
            // Exclusive types -> base categories
            case 'ore_vein':
                return 'mineral';
            case 'data_cache':
                return 'data';
            case 'relic':
                return 'artifact';
            case 'exotic_crystal':
                return 'mixed';
            // Standard types pass through
            case 'mineral':
            case 'data':
            case 'artifact':
            case 'mixed':
                return signalType;
            default:
                return 'mixed';
        }
    }

    /**
     * Get active probe count for hub
     */
    getActiveProbeCountForHub(hub) {
        const activeProbes = this.gameState.entities.probes.filter(probe => 
            probe.active && 
            probe.hub && 
            probe.hub.id === hub.id
        );
        return activeProbes.length;
    }

    /**
     * Get ready probe count for hub
     */
    getReadyProbeCountForHub(hub) {
        const readyProbes = this.gameState.entities.probes.filter(probe => 
            probe.active && 
            probe.hub && 
            probe.hub.id === hub.id && 
            probe.status === 'ready' && 
            (!probe.waypoints || probe.waypoints.length === 0)
        );
        return readyProbes.length;
    }

    /**
     * Get probe status for a hub
     */
    getProbeStatus(hub) {
        const activeCount = this.getActiveProbeCountForHub(hub);
        const readyCount = this.getReadyProbeCountForHub(hub);
        const deployedCount = activeCount - readyCount;
        
        return {
            total: activeCount,
            ready: readyCount,
            deployed: deployedCount,
            maxProbes: hub.maxProbes
        };
    }

    /**
     * Auto-collect signals within range of equipped probe
     */
    autoCollectSignals(probe) {
        // Get combined collection types from all equipment
        if (!probe.equipment || !Array.isArray(probe.equipment) || probe.equipment.length === 0) return;

        // Combine collection types from all equipped items
        const collectionTypes = new Set();
        probe.equipment.forEach(eq => {
            if (eq.collectionTypes) {
                eq.collectionTypes.forEach(t => collectionTypes.add(t));
            }
        });

        if (collectionTypes.size === 0) return;

        // Add auto-collection cooldown to prevent excessive collection
        if (!probe.lastAutoCollectionTime) {
            probe.lastAutoCollectionTime = 0;
        }

        const currentTime = Date.now();
        const cooldownTime = 500; // 0.5 second cooldown

        if (currentTime - probe.lastAutoCollectionTime < cooldownTime) {
            return; // Still in cooldown
        }

        probe.lastAutoCollectionTime = currentTime;

        const canCollectMinerals = collectionTypes.has('minerals') || collectionTypes.has('all');
        const canCollectData = collectionTypes.has('data') || collectionTypes.has('all');
        const canCollectArtifacts = collectionTypes.has('artifacts') || collectionTypes.has('all');
        const hasUniversal = collectionTypes.has('all');
        
        // PBON-02: signalRange bonus affects auto-collection range
        const collectionRangeBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('probes', probe, 'signalRange') : 0;
        const collectionRange = 80 * (1 + collectionRangeBonus / 100);
        const totalSignals = this.gameState.entities.signals.length;
        const signalsInRange = this.gameState.entities.signals.filter(signal => {
            const distance = Math.sqrt(
                Math.pow(probe.current.x - signal.x, 2) + 
                Math.pow(probe.current.y - signal.y, 2)
            );
            return distance <= collectionRange;
        });
        
        // Debug: Log if we find signals in range
        if (signalsInRange.length > 0) {
            console.log(`Found ${signalsInRange.length} signals in range of probe ${probe.id} (total signals: ${totalSignals})`);
        }
        
        signalsInRange.forEach(signal => {
            // SIG-06: Get base type for exclusive signal compatibility
            // ore_vein->mineral, data_cache->data, relic->artifact, exotic_crystal->mixed
            const signalBaseType = this.getSignalBaseType(signal.signalType);

            // Determine what can be collected based on rarity, research, and signal type
            console.log(`Signal found: rarity=${signal.rarity}, type=${signal.signalType}, baseType=${signalBaseType}, hasUniversal=${hasUniversal}`);

            const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
            const signalRarityIndex = rarityOrder.indexOf(signal.rarity);

            // Check type-specific rarity limits for each collector type
            // SIG-06: Filter based on signal's base type matching collector type
            let canCollectMineralsAtRarity = false;
            let canCollectDataAtRarity = false;
            let canCollectArtifactsAtRarity = false;

            // Check if signal's base type is compatible with collector type
            const signalIsMineralType = signalBaseType === 'mineral' || signalBaseType === 'mixed';
            const signalIsDataType = signalBaseType === 'data' || signalBaseType === 'mixed';
            const signalIsArtifactType = signalBaseType === 'artifact' || signalBaseType === 'mixed';

            if (hasUniversal) {
                // Universal collection uses universal rarity progression for ALL types
                const universalMaxRarity = this.getMaxCollectableRarity('universal');
                const universalMaxIndex = rarityOrder.indexOf(universalMaxRarity);
                const universalCanCollect = signalRarityIndex <= universalMaxIndex;

                // Universal collector can collect any signal type
                canCollectMineralsAtRarity = canCollectMinerals && universalCanCollect;
                canCollectDataAtRarity = canCollectData && universalCanCollect;
                canCollectArtifactsAtRarity = canCollectArtifacts && universalCanCollect;
            } else {
                // Individual collectors use type-specific rarity progression
                // AND must match signal's base type
                if (canCollectMinerals && signalIsMineralType) {
                    const mineralsMaxRarity = this.getMaxCollectableRarity('minerals');
                    const mineralsMaxIndex = rarityOrder.indexOf(mineralsMaxRarity);
                    canCollectMineralsAtRarity = signalRarityIndex <= mineralsMaxIndex;
                }
                if (canCollectData && signalIsDataType) {
                    const dataMaxRarity = this.getMaxCollectableRarity('data');
                    const dataMaxIndex = rarityOrder.indexOf(dataMaxRarity);
                    canCollectDataAtRarity = signalRarityIndex <= dataMaxIndex;
                }
                if (canCollectArtifacts && signalIsArtifactType) {
                    const artifactsMaxRarity = this.getMaxCollectableRarity('artifacts');
                    const artifactsMaxIndex = rarityOrder.indexOf(artifactsMaxRarity);
                    canCollectArtifactsAtRarity = signalRarityIndex <= artifactsMaxIndex;
                }
            }

            // Can collect if ANY resource type can be collected at this rarity AND matches signal type
            const canCollect = canCollectMineralsAtRarity || canCollectDataAtRarity || canCollectArtifactsAtRarity;

            console.log(`Can collect signal: ${canCollect} (minerals: ${canCollectMineralsAtRarity}, data: ${canCollectDataAtRarity}, artifacts: ${canCollectArtifactsAtRarity})`);
            
            if (canCollect) {
                // Calculate rewards based on signal rarity
                const baseRewards = {
                    common: { minerals: 5, data: 2, artifacts: 1 },
                    uncommon: { minerals: 10, data: 5, artifacts: 2 },
                    rare: { minerals: 20, data: 10, artifacts: 5 },
                    epic: { minerals: 40, data: 20, artifacts: 10 },
                    legendary: { minerals: 100, data: 50, artifacts: 25 }
                };
                
                const rewards = { ...(baseRewards[signal.rarity] || baseRewards.common) };

                // PBON-07: explorationRewards bonus increases ALL reward types (applied first for multiplicative stacking)
                const rewardBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('probes', probe, 'explorationRewards') : 0;
                if (rewardBonus > 0) {
                    rewards.minerals = Math.max(1, Math.floor(rewards.minerals * (1 + rewardBonus / 100)));
                    rewards.data = Math.max(1, Math.floor(rewards.data * (1 + rewardBonus / 100)));
                    rewards.artifacts = Math.max(1, Math.floor(rewards.artifacts * (1 + rewardBonus / 100)));
                }

                // PBON-06: artifactDiscovery bonus increases artifact rewards specifically (applied after explorationRewards)
                const artifactBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('probes', probe, 'artifactDiscovery') : 0;
                if (artifactBonus > 0) {
                    rewards.artifacts = Math.max(1, Math.floor(rewards.artifacts * (1 + artifactBonus / 100)));
                }

                // Initialize probe cargo if it doesn't exist
                if (!probe.cargo) {
                    probe.cargo = {
                        minerals: 0,
                        data: 0,
                        artifacts: 0,
                        exoticMinerals: 0
                    };
                }
                
                // Store resources in probe cargo instead of adding immediately
                let totalResourcesGained = 0;
                let primaryResourceType = '';
                let primaryResourceAmount = 0;
                
                // Use rarity-checked flags to determine what to actually collect
                if (canCollectMineralsAtRarity) {
                    probe.cargo.minerals += rewards.minerals;
                    if (rewards.minerals > primaryResourceAmount) {
                        primaryResourceAmount = rewards.minerals;
                        primaryResourceType = 'minerals';
                    }
                    totalResourcesGained += rewards.minerals;
                }
                if (canCollectDataAtRarity) {
                    probe.cargo.data += rewards.data;
                    if (rewards.data > primaryResourceAmount) {
                        primaryResourceAmount = rewards.data;
                        primaryResourceType = 'data';
                    }
                    totalResourcesGained += rewards.data;
                }
                if (canCollectArtifactsAtRarity) {
                    probe.cargo.artifacts += rewards.artifacts;
                    if (rewards.artifacts > primaryResourceAmount) {
                        primaryResourceAmount = rewards.artifacts;
                        primaryResourceType = 'artifacts';
                    }
                    totalResourcesGained += rewards.artifacts;
                }
                
                // Add exotic minerals for rare+ signals to cargo
                let exoticAmount = 0;
                if (signal.rarity === 'rare') exoticAmount = 1;
                else if (signal.rarity === 'epic') exoticAmount = 3;
                else if (signal.rarity === 'legendary') exoticAmount = 10;

                // PBON-08: exoticYield bonus increases exotic mineral rewards
                if (exoticAmount > 0) {
                    const exoticYieldBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('probes', probe, 'exoticYield') : 0;
                    if (exoticYieldBonus > 0) {
                        exoticAmount = Math.max(1, Math.floor(exoticAmount * (1 + exoticYieldBonus / 100)));
                    }
                    probe.cargo.exoticMinerals += exoticAmount;
                    totalResourcesGained += exoticAmount;
                }
                
                // Update Probethium stats for auto-collection
                this.gameState.updateProbethiumStats('signal_identified');
                this.gameState.updateProbethiumStats('resource_gathered', { amount: totalResourcesGained });
                
                console.log(`Auto-collected signal stored in probe ${probe.id} cargo:`, probe.cargo);
                
                // Show resource indicator with pending delivery message
                if (hasUniversal) {
                    // Universal collector shows total resources
                    this.eventBus.emit('resource:indicator', {
                        x: signal.x,
                        y: signal.y,
                        amount: totalResourcesGained,
                        resourceType: 'all',
                        pending: true // Indicate resources are pending delivery
                    });
                } else {
                    // Show primary resource type gained
                    this.eventBus.emit('resource:indicator', {
                        x: signal.x,
                        y: signal.y,
                        amount: primaryResourceAmount,
                        resourceType: primaryResourceType,
                        pending: true // Indicate resources are pending delivery
                    });
                }
                
                // Remove collected signal
                const signalIndex = this.gameState.entities.signals.indexOf(signal);
                if (signalIndex > -1) {
                    this.gameState.entities.signals.splice(signalIndex, 1);
                }
                
                console.log(`Auto-collected ${signal.rarity} signal with probe ${probe.id}: +${totalResourcesGained} resources`);
                
                // Force UI update to show new resource values
                this.eventBus.emit('ui:update');
            }
        });
    }

    /**
     * Get current sector for probe
     */
    getCurrentSector(probe) {
        const world = this.gameState.getWorld();
        const sectorX = Math.floor(probe.current.x / world.standardSectorWidth);
        const sectorY = Math.floor(probe.current.y / world.standardSectorHeight);
        const key = `${sectorX},${sectorY}`;
        return world.sectors.get(key);
    }

    /**
     * Check asteroid field damage for probe
     */
    checkAsteroidFieldDamage(probe, deltaTime) {
        const currentSector = this.getCurrentSector(probe);
        
        // Only take damage in asteroid fields
        if (!currentSector || currentSector.type.name !== 'Asteroid Field') {
            return;
        }
        
        // Check if this is the first time entering an asteroid field
        if (!probe.hasEnteredAsteroidField) {
            probe.hasEnteredAsteroidField = true;
            this.eventBus.emit('probe:enteredAsteroidField');
        }

        // Only take damage while exploring (not while returning)
        const isExploring = probe.outboundWaypointsCount && probe.currentWaypoint < probe.outboundWaypointsCount - 1;
        if (!isExploring) {
            return;
        }

        const currentTime = Date.now();
        
        // Check for damage every 3 seconds
        if (currentTime - probe.lastDamageTime >= 3000) {
            probe.lastDamageTime = currentTime;
            
            // PBON-05: asteroidSurvival bonus reduces destruction chance
            const survivalBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('probes', probe, 'asteroidSurvival') : 0;
            const adjustedDestructionChance = currentSector.type.probeDestructionChance * (1 - survivalBonus / 100);
            if (Math.random() < adjustedDestructionChance) {
                probe.damage++;
                console.log(`Probe ${probe.id} took damage in asteroid field! (${probe.damage}/${probe.maxDamage})`);
                
                this.eventBus.emit('ui:message', { 
                    text: `Probe damaged by asteroids! (${probe.damage}/${probe.maxDamage})`, 
                    type: 'warning' 
                });

                // Check if probe is destroyed
                if (probe.damage >= probe.maxDamage) {
                    this.destroyProbe(probe);
                    return;
                }
            }
        }
    }

    /**
     * Destroy a damaged probe
     */
    destroyProbe(probe) {
        console.log(`Probe ${probe.id} destroyed in asteroid field!`);
        
        // Remove probe from game state
        const probeIndex = this.gameState.entities.probes.indexOf(probe);
        if (probeIndex > -1) {
            this.gameState.entities.probes.splice(probeIndex, 1);
        }
        
        // Close probe detail panel if this probe was selected
        if (this.gameState.ui.selectedProbe === probe) {
            this.gameState.ui.selectedProbe = null;
            this.eventBus.emit('ui:probeDestroyed', { probe });
        }
        
        this.eventBus.emit('ui:message', { 
            text: 'Probe destroyed by asteroids! Build a new one at the hub.', 
            type: 'error' 
        });
        
        this.eventBus.emit('ui:update');
    }

    /**
     * Get maximum rarity that can be collected based on research
     */
    getMaxCollectableRarity(resourceType = 'universal') {
        const research = this.gameState.getResearchSystem();

        // Check type-specific rarity progression
        if (resourceType === 'minerals') {
            if (research.researched.has('minerals_legendary')) return 'legendary';
            if (research.researched.has('minerals_epic')) return 'epic';
            if (research.researched.has('minerals_rare')) return 'rare';
            if (research.researched.has('minerals_uncommon')) return 'uncommon';
            return 'common';
        }

        if (resourceType === 'data') {
            if (research.researched.has('data_legendary')) return 'legendary';
            if (research.researched.has('data_epic')) return 'epic';
            if (research.researched.has('data_rare')) return 'rare';
            if (research.researched.has('data_uncommon')) return 'uncommon';
            return 'common';
        }

        if (resourceType === 'artifacts') {
            if (research.researched.has('artifacts_legendary')) return 'legendary';
            if (research.researched.has('artifacts_epic')) return 'epic';
            if (research.researched.has('artifacts_rare')) return 'rare';
            if (research.researched.has('artifacts_uncommon')) return 'uncommon';
            return 'common';
        }

        // Universal collector uses global rarity research
        if (research.researched.has('rarity_legendary')) return 'legendary';
        if (research.researched.has('rarity_epic')) return 'epic';
        if (research.researched.has('rarity_rare')) return 'rare';
        if (research.researched.has('rarity_uncommon')) return 'uncommon';
        return 'common';
    }
    
    /**
     * Get total cargo weight used by probe
     */
    getCargoUsed(probe) {
        if (!probe.cargo) return 0;
        return (
            (probe.cargo.minerals || 0) +
            (probe.cargo.data || 0) +
            (probe.cargo.artifacts || 0) +
            (probe.cargo.exoticMinerals || 0)
        );
    }
    
    /**
     * Get maximum cargo capacity for probe
     */
    getCargoCapacity(probe) {
        let capacity = 100; // Base capacity
        
        // Check equipment for cargo expanders
        // Note: equipment is currently an object for auto_collector, not an array
        // Future: When equipment becomes an array of modules, this will work
        if (probe.equipment && Array.isArray(probe.equipment)) {
            probe.equipment.forEach(module => {
                if (module === 'cargo_expander_mk1') capacity += 50;
                if (module === 'cargo_expander_mk2') capacity += 100;
                if (module === 'cargo_expander_mk3') capacity += 200;
            });
        }
        
        // Check for echo bonus (future)
        // if (this.gameState.echoBonuses?.cargoCapacity) {
        //     capacity += this.gameState.echoBonuses.cargoCapacity;
        // }
        
        return capacity;
    }
    
    /**
     * Get speed modifier based on cargo level
     */
    getCargoSpeedModifier(probe) {
        const cargoUsed = this.getCargoUsed(probe);
        const cargoCapacity = this.getCargoCapacity(probe);
        const cargoPercent = cargoUsed / cargoCapacity;
        
        if (cargoPercent < 0.5) {
            return 1.0; // 0-50%: Full speed
        } else if (cargoPercent < 0.75) {
            return 0.9; // 50-75%: 10% slower
        } else if (cargoPercent < 0.9) {
            return 0.75; // 75-90%: 25% slower
        } else if (cargoPercent < 1.0) {
            return 0.6; // 90-100%: 40% slower
        } else {
            return 0.5; // 100%: 50% slower (FULL)
        }
    }
}

// Export for use in other modules
window.ProbeManager = ProbeManager;