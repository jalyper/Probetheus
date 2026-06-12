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
            exoticMinerals: 0,
            alloy: 0    // forged at Foundries (REBUILD.md §2) — never found, only made
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

        // The Uplink (REBUILD.md §1) — research is a flow problem.
        // Crafted at the home hub; streams stored data into one active
        // protocol at a capped rate. Catalog: window.PROTOCOLS.
        this.uplink = {
            built: false,
            level: 1,
            active: null,        // protocol id currently decoding
            progress: {},        // protocol id -> data units streamed so far
            paid: new Set(),     // protocol ids whose catalysts were consumed
            decoded: new Set()   // completed protocol ids
        };

        // The Foundry (REBUILD.md §2) — the network's first processor.
        // Foundries consume a mineral flow and emit an alloy flow; freighters
        // work the hub↔Foundry legs. Replaces the mining station system.
        this.foundry = {
            foundries: [],
            freighters: []
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

        // Emit ui:update so hub menu button states refresh dynamically
        if (eventBus) {
            eventBus.emit('ui:update');
        }
    }

    /**
     * Capitalize first letter of string
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Get Uplink state (REBUILD.md §1 — replaces the research system)
     */
    getUplink() {
        return this.uplink;
    }

    /**
     * Has the given protocol been decoded at the Uplink?
     */
    hasProtocol(id) {
        return this.uplink.decoded.has(id);
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
     * Probethium accumulation (docs/design/ECONOMY.md)
     *
     * The old wall-clock trickle (0.00000000277/s — 1P per 100 hours) is removed,
     * and mining-station production died with the Foundry recast (REBUILD.md §2).
     * Probethium now comes from active play only:
     *   - Exotic synthesis (5 exotic -> 1P) — GameController 'synthesis:triggered',
     *     gated by the exotic_synthesis protocol
     * This method is kept as a hook for future passive sources; stats multipliers
     * remain available via this.probethium.multipliers.
     */
    calculateProbethium(deltaTime) {
        // Intentionally no passive wall-clock accumulation.
    }
}

// Export for use in other modules
window.GameState = GameState;
