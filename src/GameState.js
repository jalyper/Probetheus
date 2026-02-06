/**
 * Central game state manager
 * Contains all game data and provides controlled access
 */
class GameState {
    constructor() {
        this.resources = {
            probes: 0,  // Managed per-hub
            minerals: 0,
            data: 0,
            artifacts: 0,
            exoticMinerals: 0
        };

        // Probethium scoring system
        this.probethium = {
            current: 0.0000000000,  // Start with 0, accumulates VERY slowly
            totalAccumulated: 0.0000000000,  // Track lifetime accumulation
            lastUpdateTime: Date.now(),
            
            // Statistics for efficiency calculations
            stats: {
                totalResourcesGathered: 0,
                totalProbesBuilt: 3,  // Start with 3 initial probes
                totalProbesDestroyed: 0,
                totalSignalsCollected: 0,
                totalSectorsDiscovered: 0,
                totalBuildingsConstructed: 0,
                totalResearchUnlocked: 0,
                totalDistanceTraveled: 0,
                resourcesSpent: {
                    minerals: 0,
                    data: 0,
                    artifacts: 0,
                    exoticMinerals: 0
                },
                peakEfficiencyRatio: 0,  // Best resources/probe ratio achieved
                sessionStartTime: Date.now()
            },
            
            // Multipliers for different achievements
            multipliers: {
                efficiency: 1.0,      // Resources per probe/building
                exploration: 1.0,     // Sectors discovered
                research: 1.0,        // Research progress
                endurance: 1.0        // Time played continuously
            }
        };

        this.researchSystem = {
            points: 0,
            unlocked: false,
            researched: new Set(),
            unlockedTrees: [], // Track which trees are unlocked: 'collection', 'probe', 'alien'
            firstResourceThreshold: null, // Track which resource hit 50 first
            milestones: { // Track achieved milestones for each resource type
                minerals: new Set(),
                data: new Set(),
                artifacts: new Set(),
                exoticMinerals: new Set()
            },
            tree: {
                // COLLECTION TREE (unlocked by 50 minerals first)
                'collection': {
                    id: 'collection',
                    name: 'Collection Specialization',
                    description: 'Unlocks automated resource collection technologies',
                    cost: 1,
                    position: { x: 50, y: 60 },
                    researched: false,
                    available: true,
                    icon: '📦',
                    children: ['auto_minerals', 'auto_data', 'auto_artifacts'],
                    tree: 'collection'
                },
                // MINERAL COLLECTOR BRANCH
                'auto_minerals': {
                    id: 'auto_minerals',
                    name: 'Auto-Collect Minerals',
                    description: 'Allows probes to automatically collect common mineral signals',
                    cost: 1,
                    position: { x: 200, y: 20 },
                    researched: false,
                    available: false,
                    icon: '⛏️',
                    children: ['minerals_uncommon', 'auto_all'],
                    parent: 'collection',
                    tree: 'collection'
                },
                'minerals_uncommon': {
                    id: 'minerals_uncommon',
                    name: 'Uncommon Mineral Processing',
                    description: 'Mineral Collector can now collect uncommon mineral signals',
                    cost: 2,
                    position: { x: 350, y: 20 },
                    researched: false,
                    available: false,
                    icon: '⛏️',
                    parent: 'auto_minerals',
                    children: ['minerals_rare'],
                    tree: 'collection'
                },
                'minerals_rare': {
                    id: 'minerals_rare',
                    name: 'Rare Mineral Processing',
                    description: 'Mineral Collector can now collect rare mineral signals',
                    cost: 3,
                    position: { x: 500, y: 20 },
                    researched: false,
                    available: false,
                    icon: '⛏️',
                    parent: 'minerals_uncommon',
                    children: ['minerals_epic'],
                    tree: 'collection'
                },
                'minerals_epic': {
                    id: 'minerals_epic',
                    name: 'Epic Mineral Processing',
                    description: 'Mineral Collector can now collect epic mineral signals',
                    cost: 5,
                    position: { x: 650, y: 20 },
                    researched: false,
                    available: false,
                    icon: '⛏️',
                    parent: 'minerals_rare',
                    children: ['minerals_legendary'],
                    tree: 'collection'
                },
                'minerals_legendary': {
                    id: 'minerals_legendary',
                    name: 'Legendary Mineral Processing',
                    description: 'Mineral Collector can now collect legendary mineral signals',
                    cost: 8,
                    position: { x: 800, y: 20 },
                    researched: false,
                    available: false,
                    icon: '⛏️',
                    parent: 'minerals_epic',
                    tree: 'collection'
                },

                // DATA COLLECTOR BRANCH
                'auto_data': {
                    id: 'auto_data',
                    name: 'Auto-Collect Data',
                    description: 'Allows probes to automatically collect common data signals',
                    cost: 1,
                    position: { x: 200, y: 110 },
                    researched: false,
                    available: false,
                    icon: '💾',
                    children: ['data_uncommon', 'auto_all'],
                    parent: 'collection',
                    tree: 'collection'
                },
                'data_uncommon': {
                    id: 'data_uncommon',
                    name: 'Uncommon Data Processing',
                    description: 'Data Collector can now collect uncommon data signals',
                    cost: 2,
                    position: { x: 350, y: 110 },
                    researched: false,
                    available: false,
                    icon: '💾',
                    parent: 'auto_data',
                    children: ['data_rare'],
                    tree: 'collection'
                },
                'data_rare': {
                    id: 'data_rare',
                    name: 'Rare Data Processing',
                    description: 'Data Collector can now collect rare data signals',
                    cost: 3,
                    position: { x: 500, y: 110 },
                    researched: false,
                    available: false,
                    icon: '💾',
                    parent: 'data_uncommon',
                    children: ['data_epic'],
                    tree: 'collection'
                },
                'data_epic': {
                    id: 'data_epic',
                    name: 'Epic Data Processing',
                    description: 'Data Collector can now collect epic data signals',
                    cost: 5,
                    position: { x: 650, y: 110 },
                    researched: false,
                    available: false,
                    icon: '💾',
                    parent: 'data_rare',
                    children: ['data_legendary'],
                    tree: 'collection'
                },
                'data_legendary': {
                    id: 'data_legendary',
                    name: 'Legendary Data Processing',
                    description: 'Data Collector can now collect legendary data signals',
                    cost: 8,
                    position: { x: 800, y: 110 },
                    researched: false,
                    available: false,
                    icon: '💾',
                    parent: 'data_epic',
                    tree: 'collection'
                },

                // ARTIFACT COLLECTOR BRANCH
                'auto_artifacts': {
                    id: 'auto_artifacts',
                    name: 'Auto-Collect Artifacts',
                    description: 'Allows probes to automatically collect common artifact signals',
                    cost: 1,
                    position: { x: 200, y: 200 },
                    researched: false,
                    available: false,
                    icon: '🏺',
                    children: ['artifacts_uncommon', 'auto_all'],
                    parent: 'collection',
                    tree: 'collection'
                },
                'artifacts_uncommon': {
                    id: 'artifacts_uncommon',
                    name: 'Uncommon Artifact Processing',
                    description: 'Artifact Collector can now collect uncommon artifact signals',
                    cost: 2,
                    position: { x: 350, y: 200 },
                    researched: false,
                    available: false,
                    icon: '🏺',
                    parent: 'auto_artifacts',
                    children: ['artifacts_rare'],
                    tree: 'collection'
                },
                'artifacts_rare': {
                    id: 'artifacts_rare',
                    name: 'Rare Artifact Processing',
                    description: 'Artifact Collector can now collect rare artifact signals',
                    cost: 3,
                    position: { x: 500, y: 200 },
                    researched: false,
                    available: false,
                    icon: '🏺',
                    parent: 'artifacts_uncommon',
                    children: ['artifacts_epic'],
                    tree: 'collection'
                },
                'artifacts_epic': {
                    id: 'artifacts_epic',
                    name: 'Epic Artifact Processing',
                    description: 'Artifact Collector can now collect epic artifact signals',
                    cost: 5,
                    position: { x: 650, y: 200 },
                    researched: false,
                    available: false,
                    icon: '🏺',
                    parent: 'artifacts_rare',
                    children: ['artifacts_legendary'],
                    tree: 'collection'
                },
                'artifacts_legendary': {
                    id: 'artifacts_legendary',
                    name: 'Legendary Artifact Processing',
                    description: 'Artifact Collector can now collect legendary artifact signals',
                    cost: 8,
                    position: { x: 800, y: 200 },
                    researched: false,
                    available: false,
                    icon: '🏺',
                    parent: 'artifacts_epic',
                    tree: 'collection'
                },

                // UNIVERSAL COLLECTOR BRANCH (requires all 3 base collectors)
                'auto_all': {
                    id: 'auto_all',
                    name: 'Universal Collection',
                    description: 'Universal Collector gathers ALL resource types from common signals',
                    cost: 2,
                    position: { x: 200, y: 290 },
                    researched: false,
                    available: false,
                    icon: '🌟',
                    parent: ['auto_minerals', 'auto_data', 'auto_artifacts'],
                    children: ['rarity_uncommon'],
                    tree: 'collection'
                },
                'rarity_uncommon': {
                    id: 'rarity_uncommon',
                    name: 'Universal Uncommon Processing',
                    description: 'Universal Collector can now collect uncommon signals (all types)',
                    cost: 3,
                    position: { x: 350, y: 290 },
                    researched: false,
                    available: false,
                    icon: '🔸',
                    parent: 'auto_all',
                    children: ['rarity_rare'],
                    tree: 'collection'
                },
                'rarity_rare': {
                    id: 'rarity_rare',
                    name: 'Universal Rare Processing',
                    description: 'Universal Collector can now collect rare signals (all types)',
                    cost: 5,
                    position: { x: 500, y: 290 },
                    researched: false,
                    available: false,
                    icon: '🔹',
                    parent: 'rarity_uncommon',
                    children: ['rarity_epic'],
                    tree: 'collection'
                },
                'rarity_epic': {
                    id: 'rarity_epic',
                    name: 'Universal Epic Processing',
                    description: 'Universal Collector can now collect epic signals (all types)',
                    cost: 8,
                    position: { x: 650, y: 290 },
                    researched: false,
                    available: false,
                    icon: '💎',
                    parent: 'rarity_rare',
                    children: ['rarity_legendary'],
                    tree: 'collection'
                },
                'rarity_legendary': {
                    id: 'rarity_legendary',
                    name: 'Universal Legendary Processing',
                    description: 'Universal Collector can now collect ALL signal rarities',
                    cost: 12,
                    position: { x: 800, y: 290 },
                    researched: false,
                    available: false,
                    icon: '⭐',
                    parent: 'rarity_epic',
                    tree: 'collection'
                },
                
                // PROBE TREE (unlocked by 50 data first)
                'probe_tech': {
                    id: 'probe_tech',
                    name: 'Probe Technology',
                    description: 'Advanced probe engineering and upgrades',
                    cost: 1,
                    position: { x: 50, y: 380 },
                    researched: false,
                    available: true,
                    icon: '🛸',
                    children: ['detection_range', 'probe_durability', 'equipment_slots'],
                    tree: 'probe'
                },
                'detection_range': {
                    id: 'detection_range',
                    name: 'Enhanced Detection',
                    description: 'Increases probe detection range by 50%',
                    cost: 2,
                    position: { x: 200, y: 350 },
                    researched: false,
                    available: false,
                    icon: '📡',
                    parent: 'probe_tech',
                    children: ['long_range_sensors'],
                    tree: 'probe'
                },
                'probe_durability': {
                    id: 'probe_durability',
                    name: 'Reinforced Hull',
                    description: 'Probes can take 5 damage before destruction (up from 3)',
                    cost: 2,
                    position: { x: 200, y: 440 },
                    researched: false,
                    available: false,
                    icon: '🛡️',
                    parent: 'probe_tech',
                    children: ['armor_plating'],
                    tree: 'probe'
                },
                'equipment_slots': {
                    id: 'equipment_slots',
                    name: 'Multiple Equipment Slots',
                    description: 'Probes can equip 2 pieces of equipment simultaneously',
                    cost: 3,
                    position: { x: 200, y: 530 },
                    researched: false,
                    available: false,
                    icon: '🔧',
                    parent: 'probe_tech',
                    children: ['advanced_equipment'],
                    tree: 'probe'
                },
                'long_range_sensors': {
                    id: 'long_range_sensors',
                    name: 'Long-Range Sensors',
                    description: 'Detection range increased by 100% (total 150% boost)',
                    cost: 4,
                    position: { x: 350, y: 350 },
                    researched: false,
                    available: false,
                    icon: '📶',
                    parent: 'detection_range',
                    tree: 'probe'
                },
                'armor_plating': {
                    id: 'armor_plating',
                    name: 'Armor Plating',
                    description: 'Probes can take 8 damage before destruction',
                    cost: 4,
                    position: { x: 350, y: 440 },
                    researched: false,
                    available: false,
                    icon: '🦾',
                    parent: 'probe_durability',
                    tree: 'probe'
                },
                'advanced_equipment': {
                    id: 'advanced_equipment',
                    name: 'Advanced Equipment Bay',
                    description: 'Probes can equip 3 pieces of equipment simultaneously',
                    cost: 5,
                    position: { x: 350, y: 530 },
                    researched: false,
                    available: false,
                    icon: '⚙️',
                    parent: 'equipment_slots',
                    tree: 'probe'
                },
                
                // ALIEN TECH TREE (unlocked by 50 artifacts first)
                'alien_tech': {
                    id: 'alien_tech',
                    name: 'Alien Technology',
                    description: 'Reverse-engineer alien artifacts for advanced capabilities',
                    cost: 1,
                    position: { x: 50, y: 680 },
                    researched: false,
                    available: true,
                    icon: '👽',
                    children: ['phase_shift', 'energy_shields', 'quantum_sensors', 'probethium_synthesis'],
                    tree: 'alien'
                },
                'phase_shift': {
                    id: 'phase_shift',
                    name: 'Phase Shift Technology',
                    description: 'Probes can phase through asteroid fields without taking damage',
                    cost: 3,
                    position: { x: 200, y: 650 },
                    researched: false,
                    available: false,
                    icon: '👻',
                    parent: 'alien_tech',
                    children: ['dimensional_drive', 'tunnel_tech'],
                    tree: 'alien'
                },
                'tunnel_tech': {
                    id: 'tunnel_tech',
                    name: 'Tunnel Technology',
                    description: 'Build protected routes through asteroid fields for safe passage of shuttles and infrastructure',
                    cost: 4,
                    position: { x: 200, y: 750 },
                    researched: false,
                    available: false,
                    icon: '🚇',
                    parent: 'phase_shift',
                    tree: 'alien'
                },
                'energy_shields': {
                    id: 'energy_shields',
                    name: 'Energy Shield Generator',
                    description: 'Probes regenerate 1 damage every 10 seconds while exploring',
                    cost: 3,
                    position: { x: 200, y: 740 },
                    researched: false,
                    available: false,
                    icon: '🛡️',
                    parent: 'alien_tech',
                    children: ['adaptive_shields'],
                    tree: 'alien'
                },
                'quantum_sensors': {
                    id: 'quantum_sensors',
                    name: 'Quantum Entanglement Sensors',
                    description: 'Probes detect signals across the entire sector instantly',
                    cost: 4,
                    position: { x: 200, y: 830 },
                    researched: false,
                    available: false,
                    icon: '🌌',
                    parent: 'alien_tech',
                    children: ['omniscience'],
                    tree: 'alien'
                },
                'dimensional_drive': {
                    id: 'dimensional_drive',
                    name: 'Dimensional Drive',
                    description: 'Probes move 3x faster and can teleport between hubs',
                    cost: 6,
                    position: { x: 350, y: 650 },
                    researched: false,
                    available: false,
                    icon: '🌀',
                    parent: 'phase_shift',
                    tree: 'alien'
                },
                'adaptive_shields': {
                    id: 'adaptive_shields',
                    name: 'Adaptive Energy Shields',
                    description: 'Probes become immune to damage after visiting 3+ sectors',
                    cost: 6,
                    position: { x: 350, y: 740 },
                    researched: false,
                    available: false,
                    icon: '💫',
                    parent: 'energy_shields',
                    tree: 'alien'
                },
                'omniscience': {
                    id: 'omniscience',
                    name: 'Cosmic Omniscience',
                    description: 'All sectors are automatically explored and mapped',
                    cost: 8,
                    position: { x: 350, y: 830 },
                    researched: false,
                    available: false,
                    icon: '🔮',
                    parent: 'quantum_sensors',
                    tree: 'alien'
                },
                'probethium_synthesis': {
                    id: 'probethium_synthesis',
                    name: 'Probethium Synthesis',
                    description: 'Unlocks the ability to synthesize Probethium from exotic materials at hubs',
                    cost: 3,
                    position: { x: 350, y: 920 },
                    researched: false,
                    available: false,
                    icon: '⚗️',
                    parent: 'alien_tech',
                    children: [],
                    tree: 'alien'
                }
            }
        };

        this.world = {
            sectors: new Map(),
            currentSector: { x: 0, y: 0 },
            viewOffset: { x: 0, y: 0 },
            standardSectorWidth: 1920,
            standardSectorHeight: 1080,
            zoomLevel: 1.0
        };

        this.entities = {
            stars: [],
            probes: [],
            signals: [],
            miningOutposts: [],
            miningFacilities: [],
            reconHubs: []
        };

        this.ui = {
            deployMode: false,
            buildingMode: false,
            selectedProbe: null,
            buildingPreview: null,
            cameraLocked: false,
            lockedProbe: null,
            deploymentPoints: [],
            selectedHub: null,
            hubPlacementMode: false,
            mousePosition: { x: 0, y: 0 }
        };

        this.input = {
            isDragging: false,
            dragStart: { x: 0, y: 0 },
            lastViewOffset: { x: 0, y: 0 },
            isSelectingSignals: false,
            selectionStart: null,
            selectionEnd: null
        };

        // Cosmetics/Shell system storage
        this.cosmetics = {
            ownedShells: {
                probes: ['default'],
                hubs: ['default'],
                miningStations: ['default']
            },
            equippedShells: {
                probes: 'default',
                hubs: 'default',
                miningStations: 'default'
            }
        };

        this.version = '0.3.1-pre-alpha';
    }

    /**
     * Get current resource values
     */
    getResources() {
        return { ...this.resources };
    }

    /**
     * Update resource values
     * @param {object} updates - Object containing resource updates
     * @param {EventBus} eventBus - Optional event bus for milestone checking
     */
    updateResources(updates, eventBus = null) {
        const oldResources = { ...this.resources };
        Object.assign(this.resources, updates);

        // Check for milestone achievements and trigger UI update if eventBus is provided
        if (eventBus) {
            this.checkMilestones(oldResources, this.resources, eventBus);
            // Emit ui:update so hub menu button states refresh dynamically
            eventBus.emit('ui:update');
        }
    }

    /**
     * Check for milestone achievements and award research points
     */
    checkMilestones(oldResources, newResources, eventBus) {
        const milestones = [50, 200, 500, 1000];
        const research = this.researchSystem;
        
        // Check each resource type for milestone achievements
        ['minerals', 'data', 'artifacts', 'exoticMinerals'].forEach(resourceType => {
            const oldAmount = oldResources[resourceType] || 0;
            const newAmount = newResources[resourceType] || 0;
            const achievedMilestones = research.milestones[resourceType];
            
            milestones.forEach(threshold => {
                // Check if we crossed a milestone threshold
                if (oldAmount < threshold && newAmount >= threshold && !achievedMilestones.has(threshold)) {
                    // Milestone achieved!
                    achievedMilestones.add(threshold);
                    research.points += 1;
                    
                    console.log(`${resourceType} milestone ${threshold} achieved! +1 Research Point (Total: ${research.points})`);
                    
                    // Show notification
                    eventBus.emit('ui:message', { 
                        text: `${this.capitalizeFirst(resourceType)} Milestone: ${threshold} reached! (+1 RP)`, 
                        type: 'success' 
                    });
                    
                    // Emit milestone event for UI updates
                    eventBus.emit('research:milestone', { resourceType, threshold });
                    
                    // Emit research point awarded event for alert display
                    eventBus.emit('research:pointAwarded', { source: 'milestone' });
                }
            });
        });
    }

    /**
     * Capitalize first letter of string
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Get research system state
     */
    getResearchSystem() {
        return this.researchSystem;
    }

    /**
     * Get world state (sectors, view, etc.)
     */
    getWorld() {
        return this.world;
    }

    /**
     * Get all entities
     */
    getEntities() {
        return this.entities;
    }

    /**
     * Get UI state
     */
    getUI() {
        return this.ui;
    }

    /**
     * Get input state
     */
    getInput() {
        return this.input;
    }

    /**
     * Get game version
     */
    getVersion() {
        return this.version;
    }

    /**
     * Get Probethium system
     */
    getProbethium() {
        return this.probethium;
    }

    /**
     * Update Probethium statistics
     */
    updateProbethiumStats(eventType, data = {}) {
        const stats = this.probethium.stats;
        
        switch (eventType) {
            case 'resource_gathered':
                stats.totalResourcesGathered += data.amount || 1;
                break;
            case 'probe_built':
                stats.totalProbesBuilt += 1;
                stats.resourcesSpent.minerals += 25;
                break;
            case 'probe_destroyed':
                stats.totalProbesDestroyed += 1;
                break;
            case 'signal_identified':
                stats.totalSignalsCollected += 1;
                break;
            case 'sector_discovered':
                stats.totalSectorsDiscovered += 1;
                break;
            case 'building_constructed':
                stats.totalBuildingsConstructed += 1;
                if (data.cost) {
                    Object.keys(data.cost).forEach(resource => {
                        stats.resourcesSpent[resource] += data.cost[resource];
                    });
                }
                break;
            case 'research_unlocked':
                stats.totalResearchUnlocked += 1;
                break;
            case 'distance_traveled':
                stats.totalDistanceTraveled += data.distance || 0;
                break;
        }
        
        // Calculate current efficiency ratio
        if (stats.totalProbesBuilt > 0) {
            const currentEfficiency = stats.totalResourcesGathered / stats.totalProbesBuilt;
            if (currentEfficiency > stats.peakEfficiencyRatio) {
                stats.peakEfficiencyRatio = currentEfficiency;
            }
        }
    }

    /**
     * Calculate and accumulate Probethium based on efficiency and progress
     * Only generates probetheum after first mining station is built
     */
    calculateProbethium(deltaTime) {
        // Don't accumulate probetheum until player has built at least one mining station
        if (!this.mining || !this.mining.stations || this.mining.stations.length === 0) {
            return;
        }

        const now = Date.now();
        const timeDelta = now - this.probethium.lastUpdateTime;

        if (timeDelta < 1000) return; // Only update once per second
        
        const stats = this.probethium.stats;
        const multipliers = this.probethium.multipliers;
        
        // Base accumulation rate - EXTREMELY small (0.00000000277 per second)
        // This equals 1 Probethium after 100 hours of continuous optimal play
        let baseRate = 0.00000000277; // 1 / (100 * 3600) seconds
        
        // Efficiency multiplier (resources per probe/building)
        const totalInvestment = stats.totalProbesBuilt + stats.totalBuildingsConstructed;
        multipliers.efficiency = totalInvestment > 0 ? 
            Math.log(1 + stats.totalResourcesGathered / totalInvestment) : 1.0;
        
        // Exploration multiplier (sector discovery bonus)
        multipliers.exploration = 1.0 + (stats.totalSectorsDiscovered * 0.1);
        
        // Research multiplier (knowledge progression)
        multipliers.research = 1.0 + (stats.totalResearchUnlocked * 0.2);
        
        // Endurance multiplier (time played continuously)
        const hoursPlayed = (now - stats.sessionStartTime) / (1000 * 3600);
        multipliers.endurance = 1.0 + Math.min(hoursPlayed * 0.05, 2.0); // Cap at 3x for 40+ hours
        
        // Calculate final rate
        const totalMultiplier = multipliers.efficiency * multipliers.exploration *
                               multipliers.research * multipliers.endurance;

        // Shell bonus: probethiumRate increases probethium generation
        const probethiumShellBonus = window.game?.shellSystem ? window.game.shellSystem.getEntityBonus('miningStations', null, 'probethiumRate') : 0;
        const shellMultiplier = 1 + probethiumShellBonus / 100;

        const finalRate = baseRate * totalMultiplier * shellMultiplier;
        
        // Accumulate Probethium
        const accumulated = finalRate * (timeDelta / 1000);
        this.probethium.current += accumulated;
        this.probethium.totalAccumulated += accumulated;
        this.probethium.lastUpdateTime = now;
        
        // Console logging for debugging (remove in production)
        if (Math.random() < 0.001) { // Log occasionally
            console.log(`Probethium rate: ${finalRate.toExponential(3)}/s, Total: ${this.probethium.current.toFixed(10)}`);
        }
    }
}

// Export for use in other modules
window.GameState = GameState;