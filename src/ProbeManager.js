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

        // Calculate speeds (tempo: docs/design/CORE_LOOP.md)
        const baseSpeed = window.GAME_CONSTANTS.PROBE.BASE_SPEED;
        const outboundSpeed = baseSpeed;
        const returnSpeed = baseSpeed * window.GAME_CONSTANTS.PROBE.RETURN_SPEED_MULT;

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
                speed: window.GAME_CONSTANTS.PROBE.BASE_SPEED,
                pulseTimer: 0,
                pulses: [],
                radarPulses: [],
                active: true,
                hub: hub,
                recoveryMode: false,
                outboundWaypointsCount: 0,
                returnSpeed: window.GAME_CONSTANTS.PROBE.BASE_SPEED * window.GAME_CONSTANTS.PROBE.RETURN_SPEED_MULT,
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
                            color: window.PALETTE?.PROBE_BODY || '#E8E4F0',
                            width: 2,
                            opacity: 0.45
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

        // Sim-time clock for extraction cooldowns and hub intake windows
        this.simNow = (this.simNow || 0) + deltaTime;

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

                // Extract from discovered deposits the route passes over
                this.checkDepositExtraction(probe);

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
     * Extract from discovered deposits within range of a moving probe.
     * One extraction per pass (cooldown), capped by the deposit's rate
     * tokens and the probe's cargo space (LOOP_REDESIGN.md "Tap").
     */
    checkDepositExtraction(probe) {
        const depositSystem = window.game?.depositSystem;
        if (!depositSystem || probe.status === 'queued' || probe.status === 'ready') return;

        probe.extractTimers = probe.extractTimers || {};
        const now = this.simNow || 0;
        const PASS_COOLDOWN = 2500; // ms sim-time - one bite per pass, not per frame

        const nearby = depositSystem.findDiscoveredInRange(
            probe.current.x, probe.current.y, depositSystem.EXTRACT_RANGE);
        for (const dep of nearby) {
            const last = probe.extractTimers[dep.id];
            if (last !== undefined && now - last < PASS_COOLDOWN) continue;
            const got = depositSystem.tryExtract(probe, dep, this);
            if (got > 0) probe.extractTimers[dep.id] = now;
        }
    }

    /**
     * Hub intake: time a hub needs to process one delivery.
     * Finite intake is the first bottleneck a player meets.
     */
    getHubIntakeMs(hub) {
        const perMin = (window.GAME_CONSTANTS.HUB?.INTAKE_PER_MIN_BASE || 8) * (hub.intakeLevel || 1);
        return 60000 / perMin;
    }

    /**
     * This probe's place in the hub's FIFO dock queue (-1 = not queued).
     * Prunes stale ids (destroyed / no-longer-queued probes) off the front
     * so the head is always a live claimant. The queue is rebuilt naturally
     * after load — it is deliberately not serialized.
     */
    intakeQueuePosition(hub, probe) {
        hub.intakeQueue = hub.intakeQueue || [];
        while (hub.intakeQueue.length > 0) {
            const headId = hub.intakeQueue[0];
            const head = this.gameState.entities.probes.find(p => p.id === headId);
            if (!head || head.status !== 'queued' || (head.hub?.id ?? head.hubId) !== hub.id) {
                hub.intakeQueue.shift();
            } else {
                break;
            }
        }
        return hub.intakeQueue.indexOf(probe.id);
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
                // Hub intake gate (LOOP_REDESIGN.md "Tune"): a hub processes a
                // finite number of deliveries per minute. A saturated dock makes
                // the probe wait visibly - the first bottleneck a player meets.
                const hasCargo = probe.cargo && Object.keys(probe.cargo).some(key => probe.cargo[key] > 0);
                if (hasCargo && probe.hub) {
                    const hub = probe.hub;
                    hub.intakeBusyUntil = hub.intakeBusyUntil || 0;
                    const now = this.simNow || 0;

                    // FIFO dock: the next intake window goes to whoever has
                    // waited longest, not whoever iterates first this frame —
                    // a looping short-route probe can't starve the queue.
                    const pos = this.intakeQueuePosition(hub, probe);
                    const mustWait = now < hub.intakeBusyUntil ||
                        (hub.intakeQueue.length > 0 && pos !== 0);

                    if (mustWait) {
                        if (probe.status !== 'queued') {
                            probe.status = 'queued';
                            probe.queuedAt = now;
                            if (pos === -1) hub.intakeQueue.push(probe.id);
                            this.eventBus.emit('hub:intakeQueued', { hub, probe });
                        }
                        return; // wait at the dock; retry next frame
                    }

                    if (pos === 0) hub.intakeQueue.shift(); // head of the line steps up
                    hub.intakeBusyUntil = Math.max(now, hub.intakeBusyUntil) + this.getHubIntakeMs(hub);
                    if (probe.status === 'queued') probe.status = 'exploring';
                }

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

                    // Juice + dashboard hook (CORE_LOOP.md / PROBE_NETWORKS.md)
                    const deliveredTotal = (probe.cargo.minerals || 0) + (probe.cargo.data || 0) +
                        (probe.cargo.artifacts || 0) + (probe.cargo.exoticMinerals || 0);
                    const capacity = this.getCargoCapacity(probe);
                    this.eventBus.emit('probe:cargoDelivered', {
                        probe,
                        cargo: { ...probe.cargo },
                        total: deliveredTotal,
                        capacityRatio: capacity > 0 ? deliveredTotal / capacity : 0
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
                probe.speed = window.GAME_CONSTANTS.PROBE.BASE_SPEED; // Base outbound speed
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

        // Swift Carriage protocol (Uplink): +25% on every leg
        if (this.gameState.hasProtocol('swift_carriage')) {
            currentSpeed *= 1.25;
        }
        
        // Debug speed logic occasionally
        if (Math.random() < 0.001) {
            console.log(`Probe ${probe.id} speed: currentWP=${probe.currentWaypoint}, outboundCount=${probe.outboundWaypointsCount}, isReturn=${isOnReturnJourney}, speed=${currentSpeed}, baseSpeed=${probe.speed}, returnSpeed=${probe.returnSpeed}, cargoMod=${cargoSpeedModifier}`);
        }
        
        // Safety check for reasonable deltaTime (max 1 second)
        const safeDeltaTime = Math.min(deltaTime, 1000);

        // Distance-based movement: speed is px/ms, so progress through the
        // current segment scales with its real length. Route geometry IS
        // round-trip time — the Deliver lesson ("cargo per trip ÷ round-trip
        // time") is mechanically true, and hub placement matters.
        const segStart = probe.waypoints[probe.currentWaypoint];
        const segEnd = probe.waypoints[probe.currentWaypoint + 1];
        const segmentLength = (segStart && segEnd)
            ? Math.hypot(segEnd.x - segStart.x, segEnd.y - segStart.y)
            : 0;

        if (segmentLength > 0.0001) {
            probe.segmentProgress += (currentSpeed * safeDeltaTime) / segmentLength;
        } else {
            probe.segmentProgress = 1.0; // zero-length or missing leg — pass through
        }

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
            // Deep Resonance protocol (Uplink): pulses sweep 40% further
            const resonanceMult = this.gameState.hasProtocol('deep_resonance') ? 1.4 : 1;
            const pulseMaxRadius = 80 * (1 + rangeBonus / 100) * resonanceMult;

            // Add radar pulse
            probe.radarPulses.push({
                x: probe.current.x,
                y: probe.current.y,
                radius: 0,
                maxRadius: pulseMaxRadius,
                duration: 2000,
                elapsed: 0
            });

            // Prospecting (LOOP_REDESIGN.md): the pulse detects UNDISCOVERED
            // deposits in range and raises a ping at the deposit's location.
            // Collecting the ping charts the deposit - permanently. The old
            // probe-generated loot signals are retired: resources come from
            // places, so routing can matter.
            const depositSystem = window.game?.depositSystem;
            if (depositSystem) {
                // PBON-02: signalRange bonus widens prospecting reach too
                const detectRange = pulseMaxRadius;
                const candidates = depositSystem.findUndiscoveredInRange(
                    probe.current.x, probe.current.y, detectRange);

                candidates.forEach(dep => {
                    const alreadyPinged = this.gameState.entities.signals.some(
                        s => s.depositId === dep.id);
                    if (alreadyPinged) return;

                    // Ping rarity hints at deposit quality before you commit
                    const rarity = dep.richness >= 16 ? 'epic'
                        : dep.richness >= 9 ? 'rare' : 'uncommon';

                    this.gameState.entities.signals.push({
                        x: dep.x + (Math.random() - 0.5) * 30,
                        y: dep.y + (Math.random() - 0.5) * 30,
                        radius: 9,
                        rarity,
                        signalType: 'discovery',
                        depositId: dep.id,
                        duration: 6000,
                        createdAt: Date.now(),
                        age: 0
                    });
                });
            }

            // Dark Market stays a rare roaming event ping (not economy)
            const darkMarketSystem = window.game?.darkMarketSystem;
            if (darkMarketSystem && darkMarketSystem.shouldSpawnDarkMarket()) {
                this.gameState.entities.signals.push({
                    x: probe.current.x + (Math.random() - 0.5) * 160,
                    y: probe.current.y + (Math.random() - 0.5) * 160,
                    radius: 12,
                    rarity: 'dark_market',
                    signalType: 'dark_market',
                    duration: window.GAME_CONSTANTS.SIGNAL.DARK_MARKET_DURATION,
                    createdAt: Date.now(),
                    age: 0
                });
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
            // Discovery pings chart deposits - no cargo, just the reveal
            if (signal.signalType === 'discovery') {
                const idx = this.gameState.entities.signals.indexOf(signal);
                if (idx > -1) this.gameState.entities.signals.splice(idx, 1);
                this.eventBus.emit('signal:collected', {
                    manual: false,
                    rarity: signal.rarity,
                    x: signal.x,
                    y: signal.y,
                    depositId: signal.depositId
                });
                return;
            }

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

                // Canonical collection event — combo system + SFX (CORE_LOOP.md)
                this.eventBus.emit('signal:collected', {
                    probe,
                    rarity: signal.rarity,
                    amount: totalResourcesGained,
                    primaryResourceType: primaryResourceType || 'minerals',
                    x: signal.x,
                    y: signal.y
                });

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

        this.eventBus.emit('probe:destroyed', { probe });
        this.eventBus.emit('ui:update');
    }

    /**
     * The collection-rarity ladder died with the Research Lab (REBUILD.md
     * demolition ledger). Collectors collect what they're typed for, period —
     * deposit richness and rings carry the progression now.
     */
    getMaxCollectableRarity(resourceType = 'universal') {
        return 'legendary';
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