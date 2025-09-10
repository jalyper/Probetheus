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
                equipment: null,
                status: 'ready',
                returnedToHub: false,
                damage: 0,
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
                
                // Handle auto-collection if equipped
                if (probe.equipment && probe.equipment.type === 'auto_collector') {
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
            equipment: null,
            status: 'exploring',
            returnedToHub: false,
            damage: 0,
            maxDamage: 3,
            lastDamageTime: 0,
            cargo: {
                minerals: 0,
                data: 0,
                artifacts: 0,
                exoticMinerals: 0
            }
        };
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
        const currentSpeed = isOnReturnJourney ? probe.returnSpeed : probe.speed;
        
        // Debug speed logic occasionally
        if (Math.random() < 0.001) {
            console.log(`Probe ${probe.id} speed: currentWP=${probe.currentWaypoint}, outboundCount=${probe.outboundWaypointsCount}, isReturn=${isOnReturnJourney}, speed=${currentSpeed}, baseSpeed=${probe.speed}, returnSpeed=${probe.returnSpeed}`);
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

            // Add radar pulse
            probe.radarPulses.push({
                x: probe.current.x,
                y: probe.current.y,
                radius: 0,
                maxRadius: 80,
                duration: 2000,
                elapsed: 0
            });

            // Generate signals with 30% chance
            if (Math.random() < 0.3) {
                try {
                    const signalX = probe.current.x + (Math.random() - 0.5) * 160;
                    const signalY = probe.current.y + (Math.random() - 0.5) * 160;
                    
                    console.log('Generating signal at:', signalX, signalY);
                    
                    // Check if probe is in an asteroid field for enhanced rarity
                    const currentSector = this.getCurrentSector(probe);
                    const isInAsteroidField = currentSector && currentSector.type.name === 'Asteroid Field';
                    
                    // Create signal directly since we don't have a signal manager yet
                    const signal = {
                        x: signalX,
                        y: signalY,
                        radius: 8 + Math.random() * 4,
                        rarity: this.determineSignalRarity(isInAsteroidField),
                        duration: 2000 + Math.random() * 1000, // 2-3 seconds
                        createdAt: Date.now()
                    };
                    
                    this.gameState.entities.signals.push(signal);
                    console.log('Signal created successfully. Total signals:', this.gameState.entities.signals.length);
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
    determineSignalRarity(inAsteroidField = false) {
        const rand = Math.random();
        
        if (inAsteroidField) {
            // Asteroid fields have 2x rare resources (shifted probabilities)
            if (rand < 0.3) return 'common';
            if (rand < 0.5) return 'uncommon';
            if (rand < 0.75) return 'rare';
            if (rand < 0.92) return 'epic';
            return 'legendary';
        } else {
            // Normal probabilities
            if (rand < 0.5) return 'common';
            if (rand < 0.75) return 'uncommon';
            if (rand < 0.9) return 'rare';
            if (rand < 0.98) return 'epic';
            return 'legendary';
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
        const equipment = probe.equipment;
        if (!equipment || !equipment.collectionTypes) return;
        
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
        
        const canCollectMinerals = equipment.collectionTypes.includes('minerals') || equipment.collectionTypes.includes('all');
        const canCollectData = equipment.collectionTypes.includes('data') || equipment.collectionTypes.includes('all');
        const canCollectArtifacts = equipment.collectionTypes.includes('artifacts') || equipment.collectionTypes.includes('all');
        const hasUniversal = equipment.collectionTypes.includes('all');
        
        // Check for signals within auto-collection range (80 pixels)
        const collectionRange = 80;
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
            // Determine if we can collect based on rarity and research
            let canCollect = false;
            
            console.log(`Signal found: rarity=${signal.rarity}, hasUniversal=${hasUniversal}`);
            
            // Check maximum rarity that can be collected
            const maxRarity = this.getMaxCollectableRarity();
            const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
            const signalRarityIndex = rarityOrder.indexOf(signal.rarity);
            const maxRarityIndex = rarityOrder.indexOf(maxRarity);
            
            if (hasUniversal) {
                // Universal collection respects rarity progression
                canCollect = signalRarityIndex <= maxRarityIndex;
            } else {
                // Regular collection only works on common signals (base level)
                canCollect = signal.rarity === 'common';
            }
            
            console.log(`Can collect signal: ${canCollect}`);
            
            if (canCollect) {
                // Calculate rewards based on signal rarity
                const baseRewards = {
                    common: { minerals: 5, data: 2, artifacts: 1 },
                    uncommon: { minerals: 10, data: 5, artifacts: 2 },
                    rare: { minerals: 20, data: 10, artifacts: 5 },
                    epic: { minerals: 40, data: 20, artifacts: 10 },
                    legendary: { minerals: 100, data: 50, artifacts: 25 }
                };
                
                const rewards = baseRewards[signal.rarity] || baseRewards.common;
                
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
                
                if (canCollectMinerals) {
                    probe.cargo.minerals += rewards.minerals;
                    if (rewards.minerals > primaryResourceAmount) {
                        primaryResourceAmount = rewards.minerals;
                        primaryResourceType = 'minerals';
                    }
                    totalResourcesGained += rewards.minerals;
                }
                if (canCollectData) {
                    probe.cargo.data += rewards.data;
                    if (rewards.data > primaryResourceAmount) {
                        primaryResourceAmount = rewards.data;
                        primaryResourceType = 'data';
                    }
                    totalResourcesGained += rewards.data;
                }
                if (canCollectArtifacts) {
                    probe.cargo.artifacts += rewards.artifacts;
                    if (rewards.artifacts > primaryResourceAmount) {
                        primaryResourceAmount = rewards.artifacts;
                        primaryResourceType = 'artifacts';
                    }
                    totalResourcesGained += rewards.artifacts;
                }
                
                // Add exotic minerals for rare+ signals to cargo
                let exoticBonus = 0;
                if (signal.rarity === 'rare') exoticBonus = 1;
                else if (signal.rarity === 'epic') exoticBonus = 3;
                else if (signal.rarity === 'legendary') exoticBonus = 10;
                
                if (exoticBonus > 0) {
                    probe.cargo.exoticMinerals += exoticBonus;
                    totalResourcesGained += exoticBonus;
                }
                
                // Update Probethium stats for auto-collection
                this.gameState.updateProbethiumStats('signal_collected');
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

        // Only take damage while exploring (not while returning)
        const isExploring = probe.outboundWaypointsCount && probe.currentWaypoint < probe.outboundWaypointsCount - 1;
        if (!isExploring) {
            return;
        }

        const currentTime = Date.now();
        
        // Check for damage every 3 seconds
        if (currentTime - probe.lastDamageTime >= 3000) {
            probe.lastDamageTime = currentTime;
            
            // 10% chance to take damage (as defined in sector type)
            if (Math.random() < currentSector.type.probeDestructionChance) {
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
    getMaxCollectableRarity() {
        const research = this.gameState.getResearchSystem();
        
        // Check rarity progression research
        if (research.researched.has('rarity_legendary')) {
            return 'legendary';
        }
        if (research.researched.has('rarity_epic')) {
            return 'epic';
        }
        if (research.researched.has('rarity_rare')) {
            return 'rare';
        }
        if (research.researched.has('rarity_uncommon')) {
            return 'uncommon';
        }
        
        // Default is common
        return 'common';
    }
}

// Export for use in other modules
window.ProbeManager = ProbeManager;