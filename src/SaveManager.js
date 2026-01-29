/**
 * Save/Load System for Cosmic Probe Explorer
 * Handles game state persistence with data integrity features
 */
class SaveManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.savePrefix = 'probetheus_save_';
        this.maxSaveSlots = 2;
        
        // For future server validation - checksums and timestamps
        this.version = '1.0.0';
        
        // Track save operation states to prevent rapid clicking exploits
        this.savingStates = {}; // { slotNumber: boolean }
        
        // File system API support detection
        this.supportsFileSystemAPI = 'showSaveFilePicker' in window;
    }

    /**
     * Generate a simple checksum for data integrity
     * This is for future server validation, not current security
     */
    generateChecksum(data) {
        let hash = 0;
        const str = JSON.stringify(data);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    /**
     * Get current tutorial progress from storage
     */
    async getTutorialProgress() {
        const saved = await storageAdapter.getItem('tutorialProgress');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse tutorial progress for save');
                return null;
            }
        }
        return null;
    }

    /**
     * Create a comprehensive save data object
     */
    async createSaveData() {
        const tutorialProgress = await this.getTutorialProgress();
        const tutorialCompleted = await storageAdapter.getItem('tutorialCompleted');
        return this._buildSaveDataCore(tutorialProgress, tutorialCompleted);
    }

    /**
     * Create save data synchronously (for beforeunload handler).
     * Reads tutorial data directly from localStorage instead of async storageAdapter.
     */
    createSaveDataSync() {
        let tutorialProgress = null;
        try {
            const savedProgress = localStorage.getItem('tutorialProgress');
            tutorialProgress = savedProgress ? JSON.parse(savedProgress) : null;
        } catch (e) {
            tutorialProgress = null;
        }
        const tutorialCompleted = localStorage.getItem('tutorialCompleted');
        return this._buildSaveDataCore(tutorialProgress, tutorialCompleted);
    }

    /**
     * Core save data builder (synchronous)
     */
    _buildSaveDataCore(tutorialProgress, tutorialCompleted) {
        try {
            console.log('createSaveData: Starting save data creation...');

            console.log('createSaveData: Getting resources...');
            const resources = this.gameState.getResources();
            console.log('createSaveData: Resources obtained:', resources);

            console.log('createSaveData: Creating base save data structure...');
            
            const saveData = {
            version: this.version,
            timestamp: Date.now(),
            lastSaveTime: Date.now(), // Track when the game was last saved for offline progression
            gameState: {
                resources: { ...resources },
                probethium: {
                    current: this.gameState.probethium.current,
                    totalAccumulated: this.gameState.probethium.totalAccumulated,
                    stats: { ...this.gameState.probethium.stats },
                    multipliers: { ...this.gameState.probethium.multipliers }
                },
                mining: this.gameState.mining ? {
                    stations: [...(this.gameState.mining.stations || [])],
                    shuttles: [...(this.gameState.mining.shuttles || [])],
                    totalProbetheum: this.gameState.mining.totalProbetheum || 0,
                    efficiencyBonus: this.gameState.mining.efficiencyBonus || 1.0,
                    lastUpdateTime: this.gameState.mining.lastUpdateTime || Date.now()
                } : null,
                researchSystem: this.createResearchSystemSaveData(),
                tutorial: {
                    completed: tutorialCompleted === 'true',
                    progress: tutorialProgress
                },
                world: {
                    currentSector: { ...this.gameState.world.currentSector },
                    viewOffset: { ...this.gameState.world.viewOffset },
                    zoomLevel: this.gameState.world.zoomLevel,
                    sectors: this.serializeSectors(),
                },
                entities: {
                    probes: this.gameState.entities.probes.map(probe => ({
                        id: probe.id,
                        waypoints: [...(probe.waypoints || [])],
                        currentWaypoint: probe.currentWaypoint,
                        current: { ...probe.current },
                        segmentProgress: probe.segmentProgress,
                        speed: probe.speed,
                        active: probe.active,
                        status: probe.status,
                        hub: probe.hub ? { id: probe.hub.id, x: probe.hub.x, y: probe.hub.y } : null,
                        equipment: Array.isArray(probe.equipment) ? [...probe.equipment] : probe.equipment,
                        maxEquipmentSlots: probe.maxEquipmentSlots || 2,
                        patrolMode: probe.patrolMode,
                        damage: probe.damage || 0,
                        cargo: probe.cargo ? { ...probe.cargo } : null,
                        outboundWaypointsCount: probe.outboundWaypointsCount || 0,
                        returnSpeed: probe.returnSpeed || 0.0003,
                        shellId: probe.shellId || 'default',
                        baseMaxDamage: probe.baseMaxDamage || probe.maxDamage || 3
                    })),
                    reconHubs: this.gameState.entities.reconHubs.map(hub => ({
                        id: hub.id,
                        x: hub.x,
                        y: hub.y,
                        sector: { ...hub.sector },
                        range: hub.range,
                        maxProbes: hub.maxProbes,
                        selected: false // Don't save selection state
                    })),
                    miningOutposts: [...this.gameState.entities.miningOutposts],
                    miningFacilities: [...this.gameState.entities.miningFacilities],
                    signals: [] // Don't save temporary signals
                },
                cosmetics: this.gameState.cosmetics ? {
                    ownedShells: {
                        probes: [...(this.gameState.cosmetics.ownedShells?.probes || ['default'])],
                        hubs: [...(this.gameState.cosmetics.ownedShells?.hubs || ['default'])],
                        miningStations: [...(this.gameState.cosmetics.ownedShells?.miningStations || ['default'])]
                    },
                    equippedShells: {
                        probes: this.gameState.cosmetics.equippedShells?.probes || 'default',
                        hubs: this.gameState.cosmetics.equippedShells?.hubs || 'default',
                        miningStations: this.gameState.cosmetics.equippedShells?.miningStations || 'default'
                    }
                } : null
            }
        };

            console.log('createSaveData: Basic save data structure created');
            
            // Add checksum for future validation
            console.log('createSaveData: Generating checksum...');
            saveData.checksum = this.generateChecksum(saveData.gameState);
            console.log('createSaveData: Checksum generated successfully');
            
            console.log('createSaveData: Save data creation completed successfully');
            return saveData;
        } catch (error) {
            console.error('createSaveData: Error creating save data:', error);
            console.error('createSaveData: Error details:', error.message);
            console.error('createSaveData: Error stack:', error.stack);
            throw error; // Re-throw to be caught by calling methods
        }
    }

    /**
     * Create research system save data with error handling
     */
    createResearchSystemSaveData() {
        try {
            console.log('createResearchSystemSaveData: Starting research system data creation...');
            
            if (!this.gameState.researchSystem) {
                console.warn('createResearchSystemSaveData: Research system not initialized, using defaults');
                return {
                    points: 0,
                    unlocked: false,
                    researched: [],
                    unlockedTrees: [],
                    firstResourceThreshold: false,
                    milestones: { minerals: [], data: [], artifacts: [], exoticMinerals: [] }
                };
            }
            
            const researchData = {
                points: this.gameState.researchSystem.points || 0,
                unlocked: this.gameState.researchSystem.unlocked || false,
                researched: this.gameState.researchSystem.researched ? Array.from(this.gameState.researchSystem.researched) : [],
                unlockedTrees: this.gameState.researchSystem.unlockedTrees ? [...this.gameState.researchSystem.unlockedTrees] : [],
                firstResourceThreshold: this.gameState.researchSystem.firstResourceThreshold || false,
                milestones: {
                    minerals: this.gameState.researchSystem.milestones?.minerals ? Array.from(this.gameState.researchSystem.milestones.minerals) : [],
                    data: this.gameState.researchSystem.milestones?.data ? Array.from(this.gameState.researchSystem.milestones.data) : [],
                    artifacts: this.gameState.researchSystem.milestones?.artifacts ? Array.from(this.gameState.researchSystem.milestones.artifacts) : [],
                    exoticMinerals: this.gameState.researchSystem.milestones?.exoticMinerals ? Array.from(this.gameState.researchSystem.milestones.exoticMinerals) : []
                }
            };
            
            console.log('createResearchSystemSaveData: Research system data created successfully:', researchData);
            return researchData;
        } catch (error) {
            console.error('createResearchSystemSaveData: Error creating research data:', error);
            console.log('createResearchSystemSaveData: Falling back to safe defaults');
            return {
                points: 0,
                unlocked: false,
                researched: [],
                unlockedTrees: [],
                firstResourceThreshold: false,
                milestones: { minerals: [], data: [], artifacts: [], exoticMinerals: [] }
            };
        }
    }

    /**
     * Serialize sectors map for saving
     */
    serializeSectors() {
        try {
            console.log('serializeSectors: Starting sector serialization...');
            const sectorsArray = [];
            
            if (!this.gameState.world.sectors) {
                console.warn('serializeSectors: No sectors to serialize');
                return sectorsArray;
            }
            
            this.gameState.world.sectors.forEach((sector, key) => {
                try {
                    const serializedSector = {
                        key: key,
                        sector: {
                            ...sector,
                            // Don't save temporary data like stars
                            stars: [],
                            hubs: sector.hubs ? sector.hubs.filter(hub => hub !== null && hub !== undefined).map(hub => hub.id) : []
                        }
                    };
                    sectorsArray.push(serializedSector);
                } catch (error) {
                    console.error(`serializeSectors: Error serializing sector ${key}:`, error);
                    console.log('Problematic sector:', sector);
                    // Skip this sector but continue with others
                }
            });
            
            console.log(`serializeSectors: Serialized ${sectorsArray.length} sectors successfully`);
            return sectorsArray;
        } catch (error) {
            console.error('serializeSectors: Critical error during serialization:', error);
            return []; // Return empty array as fallback
        }
    }

    /**
     * Save game to specified slot
     */
    async saveGame(slotNumber) {
        console.log('SaveManager.saveGame called with slot:', slotNumber);
        
        if (slotNumber < 1 || slotNumber > this.maxSaveSlots) {
            console.error(`Invalid save slot: ${slotNumber}. Must be 1-${this.maxSaveSlots}`);
            throw new Error(`Invalid save slot: ${slotNumber}. Must be 1-${this.maxSaveSlots}`);
        }

        // Prevent multiple simultaneous saves to the same slot
        if (this.savingStates[slotNumber]) {
            console.warn(`Save to slot ${slotNumber} already in progress`);
            return false;
        }

        console.log('Setting saving state to true for slot:', slotNumber);
        this.savingStates[slotNumber] = true;

        try {
            // Small delay to ensure game state is stable
            console.log('Waiting 100ms for game state stability...');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('Creating save data...');
            const saveData = await this.createSaveData();
            
            // Debug: Log important data being saved
            console.log('Probethium being saved:', saveData.gameState.probethium.current);
            console.log('Mining stations being saved:', saveData.gameState.mining?.stations?.length || 0);
            console.log('Mining shuttles being saved:', saveData.gameState.mining?.shuttles?.length || 0);
            console.log('Research data being saved:');
            console.log('- Points:', saveData.gameState.researchSystem.points);
            console.log('- Unlocked:', saveData.gameState.researchSystem.unlocked);
            console.log('- Researched nodes:', saveData.gameState.researchSystem.researched);
            console.log('- Unlocked trees:', saveData.gameState.researchSystem.unlockedTrees);
            
            const saveKey = `${this.savePrefix}slot_${slotNumber}`;
            
            console.log('Attempting to save to storage with key:', saveKey);
            await storageAdapter.setItem(saveKey, JSON.stringify(saveData));
            console.log('Successfully saved to storage');
            
            // Save metadata for slot display - ensure we save the exact values
            const metadata = {
                slotNumber: slotNumber,
                timestamp: saveData.timestamp,
                lastSaveTime: saveData.lastSaveTime,
                probethium: parseFloat(saveData.gameState.probethium.current), // Ensure it's a clean number
                sectorsDiscovered: parseInt(saveData.gameState.probethium.stats.totalSectorsDiscovered),
                researchPoints: parseInt(saveData.gameState.researchSystem.points),
                version: saveData.version
            };
            
            await storageAdapter.setItem(`${this.savePrefix}meta_${slotNumber}`, JSON.stringify(metadata));
            
            console.log(`Game saved to slot ${slotNumber}`);
            this.eventBus.emit('ui:message', { 
                text: `Game saved to slot ${slotNumber}!`, 
                type: 'success' 
            });
            
            return true;
        } catch (error) {
            console.error('Save failed:', error);
            this.eventBus.emit('ui:message', { 
                text: 'Save failed!', 
                type: 'error' 
            });
            return false;
        } finally {
            // Always clear the saving state
            this.savingStates[slotNumber] = false;
        }
    }

    /**
     * Load game from specified slot
     */
    async loadGame(slotNumber) {
        if (slotNumber < 1 || slotNumber > this.maxSaveSlots) {
            throw new Error(`Invalid save slot: ${slotNumber}. Must be 1-${this.maxSaveSlots}`);
        }

        try {
            const saveKey = `${this.savePrefix}slot_${slotNumber}`;
            const savedData = await storageAdapter.getItem(saveKey);
            
            if (!savedData) {
                this.eventBus.emit('ui:message', { 
                    text: `No save data found in slot ${slotNumber}!`, 
                    type: 'error' 
                });
                return false;
            }

            const saveData = JSON.parse(savedData);
            
            // Basic version check
            if (saveData.version !== this.version) {
                console.warn(`Save version mismatch: ${saveData.version} vs ${this.version}`);
            }

            // Validate checksum (future server validation)
            const expectedChecksum = this.generateChecksum(saveData.gameState);
            if (saveData.checksum !== expectedChecksum) {
                console.warn('Save data checksum mismatch - data may have been modified');
            }

            await this.restoreGameState(saveData.gameState);
            
            // Process offline progression if enough time has passed
            if (saveData.lastSaveTime && window.game && window.game.offlineManager) {
                try {
                    const offlineResults = await window.game.offlineManager.processOfflineProgress(saveData.lastSaveTime);
                    if (offlineResults) {
                        // Show offline progress summary after a short delay to ensure UI is ready
                        setTimeout(() => {
                            window.game.offlineManager.showOfflineProgressSummary(offlineResults);
                        }, 500);
                    }
                } catch (error) {
                    console.error('Error processing offline progression:', error);
                }
            }
            
            console.log(`Game loaded from slot ${slotNumber}`);
            this.eventBus.emit('ui:message', { 
                text: `Game loaded from slot ${slotNumber}!`, 
                type: 'success' 
            });
            
            return true;
        } catch (error) {
            console.error('Load failed:', error);
            this.eventBus.emit('ui:message', { 
                text: 'Load failed!', 
                type: 'error' 
            });
            return false;
        }
    }

    /**
     * Restore game state from save data
     */
    async restoreGameState(savedState) {
        // Restore resources
        this.gameState.resources = { ...savedState.resources };
        
        // Restore Probethium system
        this.gameState.probethium.current = savedState.probethium.current || 0;
        this.gameState.probethium.totalAccumulated = savedState.probethium.totalAccumulated || 0;
        this.gameState.probethium.stats = { ...savedState.probethium.stats };
        this.gameState.probethium.multipliers = { ...savedState.probethium.multipliers };
        this.gameState.probethium.lastUpdateTime = Date.now(); // Reset update time
        
        console.log('✓ Probethium restored:', this.gameState.probethium.current);
        
        // Restore research system
        this.gameState.researchSystem.points = savedState.researchSystem.points;
        this.gameState.researchSystem.unlocked = savedState.researchSystem.unlocked;
        this.gameState.researchSystem.researched = new Set(savedState.researchSystem.researched);
        this.gameState.researchSystem.unlockedTrees = [...savedState.researchSystem.unlockedTrees];
        this.gameState.researchSystem.firstResourceThreshold = savedState.researchSystem.firstResourceThreshold;
        
        // Restore milestones
        Object.keys(savedState.researchSystem.milestones).forEach(resource => {
            this.gameState.researchSystem.milestones[resource] = new Set(savedState.researchSystem.milestones[resource]);
        });
        
        // Restore tutorial state
        if (savedState.tutorial) {
            if (savedState.tutorial.completed) {
                await storageAdapter.setItem('tutorialCompleted', 'true');
                console.log('Restored tutorial completion state');
            } else {
                await storageAdapter.removeItem('tutorialCompleted');
            }
            
            if (savedState.tutorial.progress) {
                await storageAdapter.setItem('tutorialProgress', JSON.stringify(savedState.tutorial.progress));
                console.log('Restored tutorial progress:', savedState.tutorial.progress);
            } else {
                await storageAdapter.removeItem('tutorialProgress');
            }
        }
        
        // CRITICAL: Sync individual research tree nodes with the researched Set
        console.log('Syncing research tree nodes with researched set...');
        console.log('Researched nodes:', Array.from(this.gameState.researchSystem.researched));
        
        try {
            this.gameState.researchSystem.researched.forEach(nodeId => {
                if (!this.gameState.researchSystem.tree) {
                    console.warn('Research tree not initialized, skipping node sync');
                    return;
                }
                
                const node = this.gameState.researchSystem.tree[nodeId];
                if (node) {
                    node.researched = true;
                    console.log(`Restored research node: ${nodeId} (${node.name})`);
                    
                    // Ensure child nodes are unlocked/available
                    if (node.children && Array.isArray(node.children)) {
                        node.children.forEach(childId => {
                            const childNode = this.gameState.researchSystem.tree[childId];
                            if (childNode) {
                                childNode.available = true;
                            }
                        });
                    }
                } else {
                    console.warn(`Research node ${nodeId} not found in tree!`);
                }
            });
            console.log('Research tree node sync completed successfully');
        } catch (error) {
            console.error('Error during research tree sync:', error);
            console.error('Research system state:', this.gameState.researchSystem);
        }
        
        // Restore world state
        this.gameState.world.currentSector = { ...savedState.world.currentSector };
        this.gameState.world.viewOffset = { ...savedState.world.viewOffset };
        this.gameState.world.zoomLevel = savedState.world.zoomLevel;
        
        // Restore sectors
        this.gameState.world.sectors.clear();
        savedState.world.sectors.forEach(sectorData => {
            this.gameState.world.sectors.set(sectorData.key, sectorData.sector);
        });
        
        // Restore entities
        this.gameState.entities.probes = savedState.entities.probes.map(probeData => {
            const probe = {
                ...probeData,
                waypoints: probeData.waypoints || [],
                pulses: [],
                radarPulses: [],
                returnSpeed: probeData.returnSpeed || 0.0003,
                outboundWaypointsCount: probeData.outboundWaypointsCount || 0,
                returnedToHub: false,
                pulseTimer: Math.random() * 1000, // Randomize pulse timer to restart signal generation
                maxDamage: 3,
                lastDamageTime: 0,
                maxEquipmentSlots: probeData.maxEquipmentSlots || 2,
                // Ensure base speed is always correct (0.0001) regardless of saved speed
                speed: 0.0001  // Force base speed to prevent accumulation issues
            };

            // Migrate equipment to array format if needed
            if (window.EquipmentSystem && typeof window.EquipmentSystem.migrateEquipment === 'function') {
                window.EquipmentSystem.migrateEquipment(probe);
            } else if (probe.equipment && !Array.isArray(probe.equipment)) {
                // Fallback migration if EquipmentSystem not loaded yet
                const oldEquipment = probe.equipment;
                probe.equipment = [];
                if (oldEquipment.type) {
                    probe.equipment.push({
                        type: oldEquipment.type,
                        name: oldEquipment.name,
                        collectionTypes: oldEquipment.collectionTypes || [],
                        installedAt: Date.now()
                    });
                }
            } else if (!probe.equipment) {
                probe.equipment = [];
            }

            // Debug restored probe status
            if (probe.waypoints.length > 0) {
                console.log(`Restored probe ${probe.id}: status=${probe.status}, waypoints=${probe.waypoints.length}, currentWaypoint=${probe.currentWaypoint}, outboundCount=${probe.outboundWaypointsCount}`);
                console.log(`Probe waypoints:`, probe.waypoints.map((wp, i) => `${i}: (${Math.round(wp.x)}, ${Math.round(wp.y)})`));
            }

            return probe;
        });

        // Refresh probe cosmetics from shellIds after all probes are restored
        if (window.game?.shellSystem) {
            this.gameState.entities.probes.forEach(probe => {
                window.game.shellSystem.refreshProbeCosmetic(probe);
            });
            console.log('Shell cosmetics refreshed for', this.gameState.entities.probes.length, 'probes');
        }

        this.gameState.entities.reconHubs = [...savedState.entities.reconHubs];
        this.gameState.entities.miningOutposts = [...savedState.entities.miningOutposts];
        this.gameState.entities.miningFacilities = [...savedState.entities.miningFacilities];
        this.gameState.entities.signals = []; // Start fresh with no signals
        
        // Restore mining system
        if (savedState.mining) {
            this.gameState.mining = {
                stations: [...(savedState.mining.stations || [])],
                shuttles: [...(savedState.mining.shuttles || [])],
                totalProbetheum: savedState.mining.totalProbetheum || 0,
                efficiencyBonus: savedState.mining.efficiencyBonus || 1.0,
                lastUpdateTime: Date.now() // Reset to current time
            };
            console.log('✓ Mining system restored:', this.gameState.mining.stations.length, 'stations,', this.gameState.mining.shuttles.length, 'shuttles');
        }

        // Restore cosmetics/shell system (with migration from old skin format)
        if (savedState.cosmetics) {
            // Support both old 'ownedSkins' and new 'ownedShells' format
            const ownedSource = savedState.cosmetics.ownedShells || savedState.cosmetics.ownedSkins;
            const equippedSource = savedState.cosmetics.equippedShells || savedState.cosmetics.equippedSkins;

            this.gameState.cosmetics = {
                ownedShells: {
                    probes: [...(ownedSource?.probes || ['default'])],
                    hubs: [...(ownedSource?.hubs || ['default'])],
                    miningStations: [...(ownedSource?.miningStations || ['default'])]
                },
                equippedShells: {
                    probes: equippedSource?.probes || 'default',
                    hubs: equippedSource?.hubs || 'default',
                    miningStations: equippedSource?.miningStations || 'default'
                }
            };
            console.log('✓ Cosmetics restored:',
                this.gameState.cosmetics.ownedShells.probes.length, 'probe shells,',
                this.gameState.cosmetics.ownedShells.hubs.length, 'hub shells,',
                this.gameState.cosmetics.ownedShells.miningStations.length, 'station shells');
        }

        // Clear UI state
        this.gameState.ui.selectedHub = null;
        this.gameState.ui.deployMode = false;
        this.gameState.ui.hubPlacementMode = false;
        
        // Update UI to reflect loaded state
        this.eventBus.emit('ui:update');
        this.eventBus.emit('world:generateStars');
    }

    /**
     * Get save slot metadata for UI display
     */
    async getSaveSlotInfo(slotNumber) {
        const metaKey = `${this.savePrefix}meta_${slotNumber}`;
        const metadata = await storageAdapter.getItem(metaKey);
        
        if (!metadata) {
            return {
                empty: true,
                slotNumber: slotNumber
            };
        }
        
        try {
            const data = JSON.parse(metadata);
            return {
                empty: false,
                slotNumber: slotNumber,
                date: new Date(data.timestamp).toLocaleDateString(),
                time: new Date(data.timestamp).toLocaleTimeString(),
                probethium: parseFloat(data.probethium).toFixed(10), // Ensure clean parsing
                sectors: parseInt(data.sectorsDiscovered) || 0,
                research: parseInt(data.researchPoints) || 0,
                version: data.version
            };
        } catch (error) {
            console.error('Error reading save metadata:', error);
            return {
                empty: true,
                slotNumber: slotNumber,
                error: true
            };
        }
    }

    /**
     * Delete save from specified slot
     */
    async deleteSave(slotNumber) {
        const saveKey = `${this.savePrefix}slot_${slotNumber}`;
        const metaKey = `${this.savePrefix}meta_${slotNumber}`;
        
        await storageAdapter.removeItem(saveKey);
        await storageAdapter.removeItem(metaKey);
        
        console.log(`Save slot ${slotNumber} deleted`);
        this.eventBus.emit('ui:message', { 
            text: `Save slot ${slotNumber} deleted!`, 
            type: 'success' 
        });
    }

    /**
     * Check if a slot is currently being saved
     */
    isSlotSaving(slotNumber) {
        return this.savingStates[slotNumber] || false;
    }

    /**
     * Get all save slots info
     */
    async getAllSaveSlots() {
        const slots = [];
        for (let i = 1; i <= this.maxSaveSlots; i++) {
            const slotInfo = await this.getSaveSlotInfo(i);
            slotInfo.saving = this.isSlotSaving(i);
            slots.push(slotInfo);
        }
        return slots;
    }

    /**
     * Export save game to a downloadable file
     */
    async exportSaveToFile(slotNumber = null) {
        try {
            let saveData;
            let filename;

            if (slotNumber && slotNumber >= 1 && slotNumber <= this.maxSaveSlots) {
                // Export specific slot
                const saveKey = `${this.savePrefix}slot_${slotNumber}`;
                const savedData = await storageAdapter.getItem(saveKey);
                
                if (!savedData) {
                    this.eventBus.emit('ui:message', { 
                        text: `No save data found in slot ${slotNumber}!`, 
                        type: 'error' 
                    });
                    return false;
                }
                
                saveData = JSON.parse(savedData);
                filename = `probetheus-save-slot${slotNumber}-${this.formatDateForFilename(saveData.timestamp)}.json`;
            } else {
                // Export current game state
                saveData = await this.createSaveData();
                filename = `probetheus-save-${this.formatDateForFilename(new Date())}.json`;
            }

            // Create downloadable file
            const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
            
            if (this.supportsFileSystemAPI) {
                // Modern File System Access API
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Probetheus Save Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                // Fallback: Create download link
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            this.eventBus.emit('ui:message', { 
                text: 'Save file exported successfully!', 
                type: 'success' 
            });
            return true;

        } catch (error) {
            console.error('Export failed:', error);
            this.eventBus.emit('ui:message', { 
                text: 'Failed to export save file!', 
                type: 'error' 
            });
            return false;
        }
    }

    /**
     * Import save game from a file
     */
    async importSaveFromFile() {
        try {
            let fileHandle;
            
            if (this.supportsFileSystemAPI) {
                // Modern File System Access API
                [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Probetheus Save Files',
                        accept: { 'application/json': ['.json'] }
                    }],
                    multiple: false
                });
                
                const file = await fileHandle.getFile();
                return await this.processSaveFile(file);
            } else {
                // Fallback: File input element
                return new Promise((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const result = await this.processSaveFile(file);
                            resolve(result);
                        } else {
                            resolve(false);
                        }
                    };
                    input.click();
                });
            }

        } catch (error) {
            console.error('Import failed:', error);
            this.eventBus.emit('ui:message', { 
                text: 'Failed to import save file!', 
                type: 'error' 
            });
            return false;
        }
    }

    /**
     * Process uploaded save file
     */
    async processSaveFile(file) {
        try {
            const text = await file.text();
            const saveData = JSON.parse(text);
            
            // Validate save data structure
            if (!this.validateSaveData(saveData)) {
                this.eventBus.emit('ui:message', { 
                    text: 'Invalid save file format!', 
                    type: 'error' 
                });
                return false;
            }

            // Load the save data
            if (this.loadSaveData(saveData)) {
                this.eventBus.emit('ui:message', { 
                    text: 'Save file imported successfully!', 
                    type: 'success' 
                });
                return true;
            } else {
                return false;
            }

        } catch (error) {
            console.error('Failed to process save file:', error);
            this.eventBus.emit('ui:message', { 
                text: 'Failed to read save file!', 
                type: 'error' 
            });
            return false;
        }
    }

    /**
     * Format date for filename (removes invalid characters)
     */
    formatDateForFilename(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hour = String(d.getHours()).padStart(2, '0');
        const minute = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}_${hour}-${minute}`;
    }
}

// Export for use in other modules
window.SaveManager = SaveManager;