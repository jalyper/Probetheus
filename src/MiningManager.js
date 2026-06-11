/**
 * Mining Management System
 * Handles Probetheum mining stations, resource consumption, and shuttle logistics
 */
class MiningManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        
        // Initialize mining data if not present
        if (!this.gameState.mining) {
            this.gameState.mining = {
                stations: [],
                shuttles: [],
                totalProbetheum: 0,
                efficiencyBonus: 1.0, // Multiplier from research
                lastUpdateTime: Date.now()
            };
        }
        
        // Ensure efficiencyBonus exists for older save files
        if (this.gameState.mining.efficiencyBonus === undefined) {
            this.gameState.mining.efficiencyBonus = 1.0;
        }
        
        // Listen for game updates
        this.eventBus.on('game:update', this.updateMining.bind(this));
        this.eventBus.on('mining:buildStation', this.buildMiningStation.bind(this));
        this.eventBus.on('mining:buildShuttle', this.buildShuttle.bind(this));
        this.eventBus.on('mining:upgradeStation', this.upgradeStation.bind(this));
        this.eventBus.on('mining:deleteStation', this.deleteStation.bind(this));
        this.eventBus.on('mining:deleteShuttle', this.deleteShuttle.bind(this));
        
        // Periodic supply check to wake up waiting shuttles
        this.supplyCheckInterval = setInterval(() => {
            this.checkStationSupplyNeeds();
        }, 2000); // Check every 2 seconds
    }

    /**
     * Mining station types and their properties
     */
    getStationTypes() {
        // Output rates: docs/design/ECONOMY.md.
        // `output` = resource units per cycle (sector-profile resources).
        // `probethiumOutput` = Probethium per cycle in probethium-rich sectors —
        // targets ~10/20/30 P/hour at level 1 while supplied.
        return {
            basic: {
                name: 'Basic Mining Station',
                cost: { minerals: 100, data: 50 },
                requirements: { minerals: 100, data: 50 }, // Direct requirement to start mining
                output: 5,               // resources per 30s cycle (~600/hr)
                probethiumOutput: 0.085, // ~10 P/hr at 120 cycles/hr
                maxLevel: 3,
                icon: '⛏️',
                operationDuration: 30000 // 30 seconds per operation cycle
            },
            advanced: {
                name: 'Advanced Mining Station',
                cost: { minerals: 200, data: 100, artifacts: 50 },
                requirements: { minerals: 150, data: 100, artifacts: 75 }, // Direct requirement to start mining
                output: 12,              // ~1440/hr
                probethiumOutput: 0.17,  // ~20 P/hr
                maxLevel: 5,
                icon: '🏭',
                operationDuration: 30000 // 30 seconds per operation cycle
            },
            quantum: {
                name: 'Quantum Mining Station',
                cost: { minerals: 500, data: 300, artifacts: 150, exoticMinerals: 50 },
                requirements: { minerals: 200, data: 150, artifacts: 100, exoticMinerals: 50 },
                output: 60,              // ~720/hr at 12 cycles/hr
                probethiumOutput: 2.5,   // ~30 P/hr
                maxLevel: 7,
                icon: '💠',
                operationDuration: 300000
            }
        };
    }

    /**
     * Build a new mining station
     */
    buildMiningStation(data) {
        const { type, position, hubId } = data;
        const stationTypes = this.getStationTypes();
        const stationType = stationTypes[type];
        
        if (!stationType) {
            console.error('Invalid station type:', type);
            return false;
        }
        
        // Check if hub has reached the 3 station limit
        const hubStations = this.gameState.mining.stations.filter(s => s.hubId === hubId);
        if (hubStations.length >= 3) {
            this.eventBus.emit('ui:message', { 
                text: 'This hub already has the maximum of 3 mining stations!', 
                type: 'error' 
            });
            return false;
        }
        
        const resources = this.gameState.getResources();
        
        // Check if player has enough resources
        if (!this.canAfford(resources, stationType.cost)) {
            this.eventBus.emit('ui:message', { 
                text: 'Insufficient resources for mining station!', 
                type: 'error' 
            });
            return false;
        }
        
        // Deduct resources
        const newResources = this.deductResources(resources, stationType.cost);
        this.gameState.updateResources(newResources, this.eventBus);
        
        // Create mining station
        const station = {
            id: `station_${Date.now()}`,
            type: type,
            position: position,
            hubId: hubId, // Which hub supplies this station
            level: 1,
            active: false, // Starts inactive until supplied
            efficiency: 1.0,
            resourceBuffer: {}, // Stores resources waiting to be consumed
            lastConsumption: Date.now(),
            totalProduced: 0,
            createdAt: Date.now()
        };
        
        this.gameState.mining.stations.push(station);
        
        this.eventBus.emit('ui:message', { 
            text: `${stationType.name} constructed!`, 
            type: 'success' 
        });
        
        this.eventBus.emit('mining:stationBuilt', { station });
        this.eventBus.emit('ui:update');
        
        return station;
    }

    /**
     * Build a resource shuttle
     */
    buildShuttle(data) {
        const { hubId, stationId } = data;
        
        // Check shuttle limit per hub (max 3 shuttles per hub, upgradeable to 6)
        const maxShuttlesPerHub = 3; // TODO: Make upgradeable to 6
        const existingShuttles = this.gameState.mining.shuttles.filter(s => s.hubId === hubId);
        
        if (existingShuttles.length >= maxShuttlesPerHub) {
            this.eventBus.emit('ui:message', { 
                text: `Hub can only support ${maxShuttlesPerHub} shuttles! (Upgrade hub to increase limit)`, 
                type: 'error' 
            });
            return false;
        }
        
        const shuttleCost = { minerals: 50, data: 25 };
        const resources = this.gameState.getResources();
        
        if (!this.canAfford(resources, shuttleCost)) {
            this.eventBus.emit('ui:message', { 
                text: 'Insufficient resources for shuttle!', 
                type: 'error' 
            });
            return false;
        }
        
        // Find hub and station (check both possible hub locations)
        const hubs = this.gameState.entities.hubs || this.gameState.entities.reconHubs || [];
        const hub = hubs.find(h => h.id === hubId);
        const station = this.gameState.mining.stations.find(s => s.id === stationId);
        
        if (!hub || !station) {
            console.error('Invalid hub or station for shuttle', { hubId, stationId, hubsAvailable: hubs.length, stationsAvailable: this.gameState.mining.stations.length });
            return false;
        }
        
        // Deduct resources
        const newResources = this.deductResources(resources, shuttleCost);
        this.gameState.updateResources(newResources, this.eventBus);
        
        // Create shuttle
        const shuttle = {
            id: `shuttle_${Date.now()}`,
            hubId: hubId,
            stationId: stationId,
            capacity: 20, // Can carry 20 resources per trip
            speed: 0.5, // Pixels per frame
            cargo: {},
            position: { x: hub.x, y: hub.y },
            target: 'station', // 'station' or 'hub'
            status: 'loading', // 'loading', 'delivering', 'returning'
            level: 1,
            createdAt: Date.now()
        };
        
        this.gameState.mining.shuttles.push(shuttle);
        
        this.eventBus.emit('ui:message', { 
            text: `Resource shuttle deployed! (${existingShuttles.length + 1}/${maxShuttlesPerHub} shuttles at hub)`, 
            type: 'success' 
        });
        
        this.eventBus.emit('mining:shuttleBuilt', { shuttle });
        this.eventBus.emit('ui:update');
        
        return shuttle;
    }

    /**
     * Update mining operations
     */
    updateMining(data) {
        const { deltaTime } = data;
        const currentTime = Date.now();
        
        // Update each mining station
        this.gameState.mining.stations.forEach(station => {
            this.updateStation(station, deltaTime, currentTime);
        });
        
        // Update shuttles
        this.gameState.mining.shuttles.forEach(shuttle => {
            this.updateShuttle(shuttle, deltaTime);
        });
        
        // Update total Probetheum
        this.updateProbetheum();
    }

    /**
     * Update individual mining station
     */
    updateStation(station, deltaTime, currentTime) {
        const stationTypes = this.getStationTypes();
        const stationType = stationTypes[station.type];
        
        if (!stationType) return;
        
        // Initialize station properties if not present
        if (!station.stationInventory) station.stationInventory = {};
        if (!station.lowResourcesPulses) station.lowResourcesPulses = [];
        if (!station.lastLowResourcesPulse) station.lastLowResourcesPulse = 0;
        if (!station.operationCycleProgress) station.operationCycleProgress = 0;
        if (!station.cycleStartTime) station.cycleStartTime = currentTime;
        if (!station.efficiency) station.efficiency = 1.0;
        
        // Check for missing resources and create pulse if needed
        const needsResources = !this.checkStationHasRequirements(station, stationType);
        if (needsResources && currentTime - station.lastLowResourcesPulse > 3000) { // Pulse every 3 seconds when missing resources
            this.createLowResourcesPulse(station);
            station.lastLowResourcesPulse = currentTime;
        }
        
        // Update resource pulse animations
        station.lowResourcesPulses = station.lowResourcesPulses.filter(pulse => {
            pulse.elapsed += deltaTime;
            pulse.radius += (pulse.maxRadius / pulse.duration) * deltaTime;
            return pulse.elapsed < pulse.duration;
        });
        
        // Update operation cycle progress
        if (station.active) {
            const cycleElapsed = currentTime - station.cycleStartTime;
            station.operationCycleProgress = Math.min(1, cycleElapsed / stationType.operationDuration);
            
            // Continuous production and resource consumption during mining
            // Check if station is in an asteroid field for 3x bonus
            const sectorBonus = this.getStationSectorBonus(station);
            // Shell bonus: miningEfficiency increases output
            const efficiencyShellBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('miningStations', null, 'miningEfficiency') : 0;
            const efficiencyShellMultiplier = 1 + efficiencyShellBonus / 100;
            // ECONOMY.md: probethium and resource outputs are tuned separately
            const stationOutputResource = this.getStationOutputResource(station);
            let baseOutput = stationOutputResource === 'probethium'
                ? stationType.probethiumOutput
                : stationType.output;
            if (stationOutputResource === 'probethium') {
                // Shell bonus: probethiumRate (moved here from the removed wall-clock trickle)
                const probethiumShellBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('miningStations', null, 'probethiumRate') : 0;
                baseOutput *= 1 + probethiumShellBonus / 100;
            }
            const productionPerMs = (baseOutput * station.level * station.efficiency * this.gameState.mining.efficiencyBonus * sectorBonus * efficiencyShellMultiplier) / stationType.operationDuration;
            const continuousProduction = productionPerMs * deltaTime;

            // Consume resources continuously during the cycle
            Object.entries(stationType.requirements).forEach(([resource, totalRequired]) => {
                const consumptionPerMs = totalRequired / stationType.operationDuration;
                const continuousConsumption = consumptionPerMs * deltaTime;

                if (station.stationInventory[resource] > 0 && continuousConsumption > 0) {
                    station.stationInventory[resource] = Math.max(0, station.stationInventory[resource] - continuousConsumption);
                }
            });

            // PROF-05: Apply production based on sector resource profile
            if (continuousProduction > 0) {
                station.totalProduced += continuousProduction;

                const outputResource = this.getStationOutputResource(station);

                if (outputResource === 'probethium') {
                    // Probethium-rich sectors produce probethium (backward compatible)
                    this.gameState.mining.totalProbetheum += continuousProduction;
                    this.gameState.probethium.current += continuousProduction;
                    this.eventBus.emit('probetheum:collected');
                } else if (outputResource === 'mixed') {
                    // Balanced sectors produce reduced mixed resources (0.3x to each type)
                    const mixedProduction = continuousProduction * 0.3;
                    const resources = this.gameState.getResources();
                    resources.minerals = (resources.minerals || 0) + mixedProduction;
                    resources.data = (resources.data || 0) + mixedProduction;
                    resources.artifacts = (resources.artifacts || 0) + mixedProduction;
                    this.gameState.updateResources(resources, this.eventBus);
                } else {
                    // Specific resource output (minerals, data, artifacts)
                    const resources = this.gameState.getResources();
                    resources[outputResource] = (resources[outputResource] || 0) + continuousProduction;
                    this.gameState.updateResources(resources, this.eventBus);
                }
            }
            
            // Trigger periodic UI updates to show resource depletion
            if (!station.lastUIUpdate || currentTime - station.lastUIUpdate > 500) { // Update every 500ms
                this.eventBus.emit('ui:update');
                station.lastUIUpdate = currentTime;
            }
            
            console.log('Station', station.id, 'mining progress:', (station.operationCycleProgress * 100).toFixed(1) + '%', 
                       'elapsed:', cycleElapsed, 'duration:', stationType.operationDuration, 'producing:', continuousProduction.toFixed(10));
            
            // Check if cycle is complete
            if (station.operationCycleProgress >= 1) {
                console.log('Mining cycle complete for station', station.id);
                const hasResources = this.checkStationResources(station, stationType);
                
                if (hasResources) {
                    console.log('Mining cycle completed for station', station.id);
                    // Note: Resource consumption and Probethium production are now continuous during the cycle
                    
                    // Trigger UI update to refresh progress bars and displays
                    this.eventBus.emit('ui:update');
                    
                    // Reset cycle
                    station.operationCycleProgress = 0;
                    station.cycleStartTime = currentTime;
                } else {
                    station.active = false;
                }
            }
        } else {
            // Try to start operation if station has required resources
            const hasRequirements = this.checkStationHasRequirements(station, stationType);
            
            if (hasRequirements) {
                station.active = true;
                station.cycleStartTime = currentTime;
                station.operationCycleProgress = 0;
            }
        }
    }

    /**
     * Update shuttle movement and cargo
     */
    updateShuttle(shuttle, deltaTime) {
        const hubs = this.gameState.entities.hubs || this.gameState.entities.reconHubs || [];
        const hub = hubs.find(h => h.id === shuttle.hubId);
        const station = this.gameState.mining.stations.find(s => s.id === shuttle.stationId);
        
        if (!hub || !station) return;
        
        // If station is actively mining (between 10-90% of cycle), send shuttle back to hub instead of freezing mid-flight
        const isMiningActive = station.active && station.operationCycleProgress > 0.1 && station.operationCycleProgress < 0.9;
        if (isMiningActive && shuttle.status === 'delivering') {
            // Return to hub and wait instead of freezing in place
            shuttle.target = 'hub';
            shuttle.status = 'returning';
        }
        
        // Calculate movement
        const targetPos = shuttle.target === 'station' ? station.position : { x: hub.x, y: hub.y };
        const dx = targetPos.x - shuttle.position.x;
        const dy = targetPos.y - shuttle.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) { // Still traveling
            // Check if we should abort delivery (station became full while we were traveling)
            if (shuttle.status === 'delivering' && shuttle.target === 'station') {
                const stationType = this.getStationTypes()[station.type];
                const progress = this.getStationResourceProgress(station, stationType);

                // Use same threshold as "needs resources" check (0.999) for consistency
                if (progress >= 0.999) {
                    console.log('Station became full during delivery, returning to hub');
                    // Station is full, abort delivery and return home
                    shuttle.target = 'hub';
                    shuttle.status = 'returning';
                    // Keep cargo - it will be returned to global resources when arriving at hub
                    return; // Skip movement this frame to recalculate target
                }
            }
            
            // Move towards target
            // Shell bonus: shuttleSpeed increases shuttle movement speed
            const speedShellBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('miningStations', null, 'shuttleSpeed') : 0;
            const moveDistance = shuttle.speed * shuttle.level * (1 + speedShellBonus / 100) * deltaTime;
            const moveRatio = Math.min(moveDistance / distance, 1);
            
            shuttle.position.x += dx * moveRatio;
            shuttle.position.y += dy * moveRatio;
        } else {
            // Arrived at destination
            if (shuttle.target === 'station' && shuttle.status === 'delivering') {
                // Deliver resources to station
                this.deliverToStation(shuttle, station);
                shuttle.target = 'hub';
                shuttle.status = 'returning';
            } else if (shuttle.target === 'hub' && shuttle.status === 'returning') {
                console.log('Shuttle arrived back at hub, checking if station needs resources');
                
                // Return any remaining cargo to global resources (from aborted deliveries)
                if (shuttle.cargo && Object.keys(shuttle.cargo).length > 0) {
                    const resources = this.gameState.getResources();
                    Object.entries(shuttle.cargo).forEach(([resource, amount]) => {
                        resources[resource] = (resources[resource] || 0) + amount;
                        console.log(`Returned ${amount} ${resource} to hub from aborted delivery`);
                    });
                    this.gameState.updateResources(resources, this.eventBus);
                    shuttle.cargo = {};
                }
                
                // Check if station needs resources
                const stationType = this.getStationTypes()[station.type];
                const progress = this.getStationResourceProgress(station, stationType);
                const needsResources = progress < 0.999; // Station needs resources until 100% full

                console.log('Station progress:', progress.toFixed(3), 'needs resources:', needsResources);
                
                if (needsResources) {
                    // Check if we have ANY of the required resources available
                    const canLoadAnything = this.canLoadAnyRequiredResources(shuttle, station, stationType);
                    
                    if (canLoadAnything) {
                        // Load resources from hub
                        this.loadFromHub(shuttle);
                        
                        // Check if we actually loaded anything
                        if (Object.keys(shuttle.cargo).length > 0) {
                            shuttle.target = 'station';
                            shuttle.status = 'delivering';
                        } else {
                            // Nothing loaded despite having resources, wait
                            shuttle.status = 'waiting';
                        }
                    } else {
                        // No required resources available at hub, wait for probes to return
                        shuttle.status = 'waiting';
                        console.log('Shuttle waiting at hub - no required resources available');
                    }
                } else {
                    // Station has sufficient resources, stay at hub
                    shuttle.status = 'waiting';
                }
            } else if (shuttle.status === 'loading') {
                // Initial load - check if station needs resources
                const stationType = this.getStationTypes()[station.type];
                const needsResources = !this.checkStationHasRequirements(station, stationType);
                
                if (needsResources) {
                    const canLoadAnything = this.canLoadAnyRequiredResources(shuttle, station, stationType);
                    
                    if (canLoadAnything) {
                        this.loadFromHub(shuttle);
                        shuttle.target = 'station';
                        shuttle.status = 'delivering';
                    } else {
                        shuttle.status = 'waiting';
                        console.log('Shuttle waiting at initial load - no required resources available');
                    }
                } else {
                    shuttle.status = 'waiting';
                }
            } else if (shuttle.status === 'waiting') {
                // Check if station needs resources again
                const stationType = this.getStationTypes()[station.type];
                const progress = this.getStationResourceProgress(station, stationType);
                const shouldResume = progress < 0.999; // Resume deliveries when station drops below 100%
                
                if (shouldResume) {
                    // Check if we have resources available before attempting to load
                    const canLoadAnything = this.canLoadAnyRequiredResources(shuttle, station, stationType);
                    
                    if (canLoadAnything) {
                        console.log('Waiting shuttle resuming deliveries, station critically low at', (progress * 100).toFixed(1) + '%');
                        this.loadFromHub(shuttle);
                        
                        if (Object.keys(shuttle.cargo).length > 0) {
                            shuttle.target = 'station';
                            shuttle.status = 'delivering';
                        }
                    } else {
                        // Still waiting for resources
                        if (!shuttle.lastWaitingMessage || Date.now() - shuttle.lastWaitingMessage > 5000) {
                            console.log('Shuttle still waiting - station needs resources but none available');
                            shuttle.lastWaitingMessage = Date.now();
                        }
                    }
                }
            }
        }
    }

    /**
     * Check if hub has any of the resources required by the station
     */
    canLoadAnyRequiredResources(shuttle, station, stationType) {
        const resources = this.gameState.getResources();
        
        // Initialize station inventory if not present
        if (!station.stationInventory) {
            station.stationInventory = {};
        }
        
        // Check if we have ANY of the required resources that the station needs
        for (const [resource, required] of Object.entries(stationType.requirements)) {
            const currentInventory = station.stationInventory[resource] || 0;
            const needed = Math.max(0, required - currentInventory);
            const available = resources[resource] || 0;
            
            if (needed > 0 && available > 0) {
                // We have at least some of this required resource
                return true;
            }
        }
        
        // No required resources available
        return false;
    }

    /**
     * Load resources from hub into shuttle
     */
    loadFromHub(shuttle) {
        const resources = this.gameState.getResources();
        const station = this.gameState.mining.stations.find(s => s.id === shuttle.stationId);
        if (!station) return;
        
        const stationType = this.getStationTypes()[station.type];
        if (!stationType) return;
        
        // Initialize station inventory if not present
        if (!station.stationInventory) {
            station.stationInventory = {};
        }
        
        // Load exact requirements that station is missing
        shuttle.cargo = {};
        let totalLoaded = 0;

        console.log('Loading shuttle for station', station.id);
        console.log('Station current inventory:', JSON.stringify(station.stationInventory));
        console.log('Station requirements:', JSON.stringify(stationType.requirements));

        // Build up deductions first, then apply once to avoid overwriting previous deductions
        const deductions = {};

        Object.entries(stationType.requirements).forEach(([resource, required]) => {
            const currentInventory = station.stationInventory[resource] || 0;
            const needed = Math.max(0, required - currentInventory);

            console.log(`Resource ${resource}: has ${currentInventory}, needs ${required}, missing ${needed}`);

            if (needed > 0) {
                const toLoad = Math.min(
                    needed, // Only load what's needed to meet requirements
                    resources[resource] || 0,
                    shuttle.capacity - totalLoaded
                );

                console.log(`Loading ${toLoad} ${resource} (capacity limit: ${shuttle.capacity - totalLoaded})`);

                if (toLoad > 0) {
                    shuttle.cargo[resource] = toLoad;
                    totalLoaded += toLoad;
                    deductions[resource] = toLoad;
                }
            }
        });

        // Apply all resource deductions at once
        if (Object.keys(deductions).length > 0) {
            const newResources = { ...resources };
            Object.entries(deductions).forEach(([resource, amount]) => {
                newResources[resource] -= amount;
            });
            this.gameState.updateResources(newResources, this.eventBus);
        }

        console.log('Shuttle loaded with:', JSON.stringify(shuttle.cargo), 'total:', totalLoaded);

        // Trigger UI update to show resource consumption
        this.eventBus.emit('ui:update');
    }

    /**
     * Deliver resources from shuttle to station
     */
    deliverToStation(shuttle, station) {
        if (!station.stationInventory) {
            station.stationInventory = {};
        }

        const delivered = Object.keys(shuttle.cargo).length > 0;
        Object.entries(shuttle.cargo).forEach(([resource, amount]) => {
            station.stationInventory[resource] = (station.stationInventory[resource] || 0) + amount;
        });

        shuttle.cargo = {};

        // Cargo spark: value just moved hub -> station
        if (delivered) {
            const hub = this.gameState.entities.reconHubs.find(h => h.id === shuttle.hubId);
            if (hub) {
                this.eventBus.emit('shuttle:cargoDelivered', {
                    from: { x: hub.x, y: hub.y },
                    to: { x: station.position.x, y: station.position.y }
                });
            }
        }
    }

    /**
     * Check if station has required resources to start mining
     */
    checkStationHasRequirements(station, stationType) {
        if (!station.stationInventory) return false;

        // Use small tolerance for floating point comparison
        const TOLERANCE = 0.001;

        for (const [resource, required] of Object.entries(stationType.requirements)) {
            const currentAmount = station.stationInventory[resource] || 0;
            // Check if we have at least (required - tolerance) to handle floating point precision
            if (currentAmount < required - TOLERANCE) {
                return false;
            }
        }

        return true;
    }
    
    /**
     * Check if station has enough resources for one operation cycle  
     */
    checkStationResources(station, stationType) {
        return this.checkStationHasRequirements(station, stationType);
    }
    
    /**
     * Calculate the progress percentage of resources at a station (0-1)
     */
    getStationResourceProgress(station, stationType) {
        if (!station.stationInventory) return 0;
        
        let totalRequired = 0;
        let totalPresent = 0;
        
        Object.entries(stationType.requirements).forEach(([resource, required]) => {
            totalRequired += required;
            totalPresent += Math.min(station.stationInventory[resource] || 0, required);
        });
        
        return totalRequired > 0 ? totalPresent / totalRequired : 0;
    }
    
    /**
     * Create a low resources pulse effect
     */
    createLowResourcesPulse(station) {
        const pulse = {
            x: station.position.x,
            y: station.position.y,
            radius: 0,
            maxRadius: 60,
            duration: 2000, // 2 seconds
            elapsed: 0,
            color: 'rgba(255, 140, 0, 0.8)' // Dark orange
        };
        
        station.lowResourcesPulses.push(pulse);
    }
    
    /**
     * Consume station resources
     */
    consumeStationResources(station, stationType) {
        Object.entries(stationType.requirements).forEach(([resource, amount]) => {
            station.stationInventory[resource] -= amount;
        });
    }

    /**
     * Update total Probetheum display
     * Header rendering is owned by UIManager.updateResourceDisplay (single source of truth);
     * this hook is kept for compatibility with callers.
     */
    updateProbetheum() {
        // no-op: UIManager renders the wallet (gameState.probethium.current)
    }

    /**
     * Get output resource type for a mining station based on sector resource profile
     * PROF-05: Mining stations produce sector specialty resource
     */
    getStationOutputResource(station) {
        // Determine which sector the station is in
        const world = this.gameState.getWorld();
        const sectorX = Math.floor(station.position.x / world.standardSectorWidth);
        const sectorY = Math.floor(station.position.y / world.standardSectorHeight);
        const key = `${sectorX},${sectorY}`;
        const sector = world.sectors.get(key);

        // Backward compatibility: if no sector or no profile, default to probethium
        if (!sector || !sector.resourceProfile || !sector.resourceProfile.type) {
            console.log(`[PROF-05] Station ${station.id} in unknown sector, defaulting to probethium`);
            return 'probethium';
        }

        // Map resource profile type to output resource
        const profileType = sector.resourceProfile.type;

        switch (profileType) {
            case 'mineral-rich':
                return 'minerals';
            case 'data-rich':
                return 'data';
            case 'artifact-rich':
                return 'artifacts';
            case 'probethium-rich':
                return 'probethium';
            case 'balanced':
                return 'mixed';
            default:
                console.warn(`[PROF-05] Unknown profile type ${profileType}, defaulting to probethium`);
                return 'probethium';
        }
    }

    /**
     * Get sector bonus for mining station
     */
    getStationSectorBonus(station) {
        // Determine which sector the station is in
        const world = this.gameState.getWorld();
        const sectorX = Math.floor(station.position.x / world.standardSectorWidth);
        const sectorY = Math.floor(station.position.y / world.standardSectorHeight);
        const key = `${sectorX},${sectorY}`;
        const sector = world.sectors.get(key);

        // Return 3x bonus for asteroid fields, 1x for others
        if (sector && sector.type && sector.type.name === 'Asteroid Field') {
            return 3.0;
        }
        return 1.0;
    }

    /**
     * Check if player can afford cost
     */
    canAfford(resources, cost) {
        for (const [resource, amount] of Object.entries(cost)) {
            if ((resources[resource] || 0) < amount) {
                return false;
            }
        }
        return true;
    }

    /**
     * Deduct resources from player
     */
    deductResources(resources, cost) {
        const newResources = { ...resources };
        Object.entries(cost).forEach(([resource, amount]) => {
            newResources[resource] -= amount;
        });
        return newResources;
    }

    /**
     * Upgrade a mining station
     */
    upgradeStation(data) {
        const { stationId } = data;
        const station = this.gameState.mining.stations.find(s => s.id === stationId);
        
        if (!station) return false;
        
        const stationType = this.getStationTypes()[station.type];
        if (station.level >= stationType.maxLevel) {
            this.eventBus.emit('ui:message', { 
                text: 'Station at maximum level!', 
                type: 'warning' 
            });
            return false;
        }
        
        // Calculate upgrade cost (scales with level)
        const upgradeCost = {};
        Object.entries(stationType.cost).forEach(([resource, amount]) => {
            upgradeCost[resource] = Math.floor(amount * (station.level + 1) * 0.5);
        });
        
        const resources = this.gameState.getResources();
        
        if (!this.canAfford(resources, upgradeCost)) {
            this.eventBus.emit('ui:message', { 
                text: 'Insufficient resources for upgrade!', 
                type: 'error' 
            });
            return false;
        }
        
        // Deduct resources and upgrade
        const newResources = this.deductResources(resources, upgradeCost);
        this.gameState.updateResources(newResources, this.eventBus);
        
        station.level++;
        station.efficiency = 1 + (station.level - 1) * 0.2; // 20% efficiency per level
        
        this.eventBus.emit('ui:message', { 
            text: `Station upgraded to level ${station.level}!`, 
            type: 'success' 
        });
        
        this.eventBus.emit('ui:update');
        return true;
    }
    
    /**
     * Delete a mining station
     */
    deleteStation(data) {
        const { stationId } = data;
        
        // Find the station
        const stationIndex = this.gameState.mining.stations.findIndex(s => s.id === stationId);
        if (stationIndex === -1) {
            this.eventBus.emit('ui:message', { 
                text: 'Station not found!', 
                type: 'error' 
            });
            return false;
        }
        
        const station = this.gameState.mining.stations[stationIndex];
        const stationType = this.getStationTypes()[station.type];
        
        // Return 50% of the build cost to the player
        const resources = this.gameState.getResources();
        const refund = {};
        Object.entries(stationType.cost).forEach(([resource, amount]) => {
            refund[resource] = Math.floor(amount * 0.5);
            resources[resource] += refund[resource];
        });
        
        // Delete all shuttles associated with this station
        this.gameState.mining.shuttles = this.gameState.mining.shuttles.filter(s => s.stationId !== stationId);
        
        // Remove the station
        this.gameState.mining.stations.splice(stationIndex, 1);
        
        // Update resources
        this.gameState.updateResources(resources, this.eventBus);
        
        this.eventBus.emit('ui:message', { 
            text: `Station deleted. Refunded: ${Object.entries(refund).map(([r, a]) => `${a} ${r}`).join(', ')}`, 
            type: 'success' 
        });
        
        this.eventBus.emit('ui:update');
        return true;
    }
    
    /**
     * Delete a shuttle
     */
    deleteShuttle(data) {
        const { shuttleId } = data;
        
        // Find the shuttle
        const shuttleIndex = this.gameState.mining.shuttles.findIndex(s => s.id === shuttleId);
        if (shuttleIndex === -1) {
            this.eventBus.emit('ui:message', { 
                text: 'Shuttle not found!', 
                type: 'error' 
            });
            return false;
        }
        
        const shuttle = this.gameState.mining.shuttles[shuttleIndex];
        
        // Return any cargo to global resources
        if (shuttle.cargo && Object.keys(shuttle.cargo).length > 0) {
            const resources = this.gameState.getResources();
            Object.entries(shuttle.cargo).forEach(([resource, amount]) => {
                resources[resource] += amount;
            });
            this.gameState.updateResources(resources, this.eventBus);
        }
        
        // Return 50% of shuttle cost (25 minerals, 10 data)
        const resources = this.gameState.getResources();
        resources.minerals += 25;
        resources.data += 10;
        this.gameState.updateResources(resources, this.eventBus);
        
        // Remove the shuttle
        this.gameState.mining.shuttles.splice(shuttleIndex, 1);
        
        this.eventBus.emit('ui:message', { 
            text: 'Shuttle deleted. Refunded: 25 minerals, 10 data', 
            type: 'success' 
        });
        
        this.eventBus.emit('ui:update');
        return true;
    }
    
    /**
     * Periodic check to wake up waiting shuttles when resources become available
     */
    checkStationSupplyNeeds() {
        if (!this.gameState.mining || !this.gameState.mining.shuttles) return;
        
        this.gameState.mining.shuttles.forEach(shuttle => {
            // Only check shuttles that are waiting at hub
            if (shuttle.status !== 'waiting') return;
            
            // Find the station this shuttle serves
            const station = this.gameState.mining.stations.find(s => s.id === shuttle.stationId);
            if (!station) return;
            
            // Check if station needs resources
            const stationType = this.getStationTypes()[station.type];
            const progress = this.getStationResourceProgress(station, stationType);
            
            // If station needs resources (match main shuttle logic threshold)
            if (progress < 0.999) {
                // Check if we now have resources available
                const canLoadAnything = this.canLoadAnyRequiredResources(shuttle, station, stationType);
                
                if (canLoadAnything) {
                    console.log(`Supply check: Waking up shuttle for station ${station.id}, progress: ${(progress * 100).toFixed(1)}%`);
                    this.loadFromHub(shuttle);
                    
                    if (Object.keys(shuttle.cargo).length > 0) {
                        shuttle.target = 'station';
                        shuttle.status = 'delivering';
                        console.log('Shuttle loaded and now delivering');
                    }
                }
            }
        });
    }
}

// Export for use in other modules
window.MiningManager = MiningManager;