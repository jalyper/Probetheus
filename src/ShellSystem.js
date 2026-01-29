/**
 * Shell System
 * Manages shell definitions, bonuses, ownership, and application
 * Shells are cosmetic outer hulls for probes, hubs, and mining stations
 */

// Bonus type definitions
const BONUS_TYPES = {
    dataSignalDiscovery: { label: 'Data Signal Discovery', unit: '%', icon: '📊' },
    researchSpeed: { label: 'Research Speed', unit: '%', icon: '🔬' },
    signalRange: { label: 'Signal Range', unit: '%', icon: '📡' },
    rareSignalChance: { label: 'Rare Signal Chance', unit: '%', icon: '✨' },
    probeDurability: { label: 'Probe Durability', unit: '%', icon: '🛡️' },
    asteroidSurvival: { label: 'Asteroid Survival', unit: '%', icon: '☄️' },
    artifactDiscovery: { label: 'Artifact Discovery', unit: '%', icon: '🏺' },
    explorationRewards: { label: 'Exploration Rewards', unit: '%', icon: '🎁' },
    exoticYield: { label: 'Exotic Mineral Yield', unit: '%', icon: '💎' },
    probethiumRate: { label: 'Probethium Rate', unit: '%', icon: '⚗️' },
    miningEfficiency: { label: 'Mining Efficiency', unit: '%', icon: '⛏️' },
    shuttleSpeed: { label: 'Shuttle Speed', unit: '%', icon: '🚀' }
};

// Rarity definitions
const RARITY = {
    common: { name: 'Common', color: '#aaaaaa', multiplier: 1.0 },
    uncommon: { name: 'Uncommon', color: '#00ff00', multiplier: 1.5 },
    rare: { name: 'Rare', color: '#0088ff', multiplier: 2.0 },
    epic: { name: 'Epic', color: '#ff00ff', multiplier: 3.0 },
    legendary: { name: 'Legendary', color: '#ffd700', multiplier: 5.0 }
};

// NPC Vendor themes
const NPC_THEMES = {
    keth_varn: {
        name: 'Keth-Varn',
        title: 'The Calculator',
        theme: 'Data & Math',
        color: '#00ffff',
        eyeColor: '#00ffff',
        bonusTypes: ['dataSignalDiscovery', 'researchSpeed'],
        flavorText: 'Probability favors the prepared mind.'
    },
    whisperer: {
        name: 'Whisperer',
        title: 'Voice of Futures',
        theme: 'Signals',
        color: '#ffffff',
        eyeColor: '#ffffff',
        bonusTypes: ['signalRange', 'rareSignalChance'],
        flavorText: 'I hear echoes of what you seek...'
    },
    mira_sol: {
        name: 'Mira-Sol',
        title: 'The Survivor',
        theme: 'Survival',
        color: '#ffaa00',
        eyeColor: '#ffaa00',
        bonusTypes: ['probeDurability', 'asteroidSurvival'],
        flavorText: 'Endurance is the truest strength.'
    },
    archivist: {
        name: 'Archivist',
        title: 'Keeper of Records',
        theme: 'Discovery',
        color: '#ff4444',
        eyeColor: '#ff4444',
        bonusTypes: ['artifactDiscovery', 'explorationRewards'],
        flavorText: 'Every secret... eventually surfaces.'
    },
    null: {
        name: 'Null',
        title: 'The Void',
        theme: 'Exotic',
        color: '#1a0a2e',
        eyeColor: '#000000',
        bonusTypes: ['exoticYield', 'probethiumRate'],
        flavorText: 'From nothing... everything.'
    }
};

// Complete Shell Catalog (50+ shells)
const SHELL_CATALOG = {
    // ==========================================
    // PROBE SHELLS (25 total)
    // ==========================================
    probes: {
        // Shared shells (no bonuses, purely visual) - 5
        default: {
            id: 'default',
            name: 'Standard Issue',
            description: 'Factory-standard probe hull',
            rarity: 'common',
            price: 0,
            npcVendor: null,
            visual: { color: '#00ffff', trail: '#00ffff', glow: false },
            bonuses: {}
        },
        void_walker: {
            id: 'void_walker',
            name: 'Void Walker',
            description: 'Dark purple hull with mysterious origins',
            rarity: 'uncommon',
            price: 150,
            npcVendor: null,
            visual: { color: '#9400d3', trail: '#9400d3', glow: true },
            bonuses: {}
        },
        solar_flare: {
            id: 'solar_flare',
            name: 'Solar Flare',
            description: 'Burning bright like a newborn star',
            rarity: 'uncommon',
            price: 175,
            npcVendor: null,
            visual: { color: '#ff4500', trail: '#ff8800', glow: true },
            bonuses: {}
        },
        quantum_phase: {
            id: 'quantum_phase',
            name: 'Quantum Phase',
            description: 'Shifts between dimensional frequencies',
            rarity: 'rare',
            price: 200,
            npcVendor: null,
            visual: { color: '#00ffaa', trail: '#88ffcc', glow: true },
            bonuses: {}
        },
        nebula_drift: {
            id: 'nebula_drift',
            name: 'Nebula Drift',
            description: 'Swirling cosmic colors',
            rarity: 'rare',
            price: 225,
            npcVendor: null,
            visual: { color: '#ff66cc', trail: '#cc44aa', glow: true },
            bonuses: {}
        },

        // Keth-Varn shells (Data & Math) - 4
        calculator_core: {
            id: 'calculator_core',
            name: 'Calculator Core',
            description: 'Optimized for data processing',
            rarity: 'uncommon',
            price: 200,
            npcVendor: 'keth_varn',
            visual: { color: '#00ffff', trail: '#00cccc', glow: true, pattern: 'circuit' },
            bonuses: { dataSignalDiscovery: 10 }
        },
        probability_engine: {
            id: 'probability_engine',
            name: 'Probability Engine',
            description: 'Calculates optimal paths',
            rarity: 'rare',
            price: 350,
            npcVendor: 'keth_varn',
            visual: { color: '#00ddff', trail: '#0099cc', glow: true, pattern: 'hex' },
            bonuses: { dataSignalDiscovery: 15 }
        },
        quantum_processor: {
            id: 'quantum_processor',
            name: 'Quantum Processor',
            description: 'Computes across dimensions',
            rarity: 'epic',
            price: 500,
            npcVendor: 'keth_varn',
            visual: { color: '#00eeff', trail: '#00bbff', glow: true, pattern: 'matrix' },
            bonuses: { dataSignalDiscovery: 20 }
        },
        infinity_calculator: {
            id: 'infinity_calculator',
            name: 'Infinity Calculator',
            description: 'Transcends mathematical limits',
            rarity: 'legendary',
            price: 800,
            npcVendor: 'keth_varn',
            visual: { color: '#66ffff', trail: '#33ffff', glow: true, pattern: 'infinity' },
            bonuses: { dataSignalDiscovery: 25 }
        },

        // Whisperer shells (Signals) - 4
        echo_receiver: {
            id: 'echo_receiver',
            name: 'Echo Receiver',
            description: 'Attuned to distant signals',
            rarity: 'uncommon',
            price: 200,
            npcVendor: 'whisperer',
            visual: { color: '#ffffff', trail: '#cccccc', glow: true, pattern: 'wave' },
            bonuses: { signalRange: 10 }
        },
        frequency_hunter: {
            id: 'frequency_hunter',
            name: 'Frequency Hunter',
            description: 'Detects hidden frequencies',
            rarity: 'rare',
            price: 350,
            npcVendor: 'whisperer',
            visual: { color: '#eeeeff', trail: '#aaaacc', glow: true, pattern: 'pulse' },
            bonuses: { signalRange: 15, rareSignalChance: 8 }
        },
        cosmic_antenna: {
            id: 'cosmic_antenna',
            name: 'Cosmic Antenna',
            description: 'Receives universal broadcasts',
            rarity: 'epic',
            price: 500,
            npcVendor: 'whisperer',
            visual: { color: '#ffffff', trail: '#ddddff', glow: true, pattern: 'radial' },
            bonuses: { signalRange: 20, rareSignalChance: 10 }
        },
        omniscient_listener: {
            id: 'omniscient_listener',
            name: 'Omniscient Listener',
            description: 'Hears whispers across galaxies',
            rarity: 'legendary',
            price: 800,
            npcVendor: 'whisperer',
            visual: { color: '#ffffff', trail: '#ffffff', glow: true, pattern: 'aura' },
            bonuses: { signalRange: 25, rareSignalChance: 12 }
        },

        // Mira-Sol shells (Survival) - 4
        reinforced_hull: {
            id: 'reinforced_hull',
            name: 'Reinforced Hull',
            description: 'Extra plating for protection',
            rarity: 'uncommon',
            price: 200,
            npcVendor: 'mira_sol',
            visual: { color: '#ffaa00', trail: '#cc8800', glow: false, pattern: 'armor' },
            bonuses: { probeDurability: 10 }
        },
        survivor_class: {
            id: 'survivor_class',
            name: 'Survivor Class',
            description: 'Built to endure',
            rarity: 'rare',
            price: 350,
            npcVendor: 'mira_sol',
            visual: { color: '#ffbb33', trail: '#cc9922', glow: true, pattern: 'shield' },
            bonuses: { probeDurability: 15, asteroidSurvival: 8 }
        },
        fortress_probe: {
            id: 'fortress_probe',
            name: 'Fortress Probe',
            description: 'Nearly indestructible',
            rarity: 'epic',
            price: 500,
            npcVendor: 'mira_sol',
            visual: { color: '#ffcc44', trail: '#ddaa33', glow: true, pattern: 'fortress' },
            bonuses: { probeDurability: 20, asteroidSurvival: 10 }
        },
        immortal_sentinel: {
            id: 'immortal_sentinel',
            name: 'Immortal Sentinel',
            description: 'Defies destruction itself',
            rarity: 'legendary',
            price: 800,
            npcVendor: 'mira_sol',
            visual: { color: '#ffdd66', trail: '#eebb44', glow: true, pattern: 'immortal' },
            bonuses: { probeDurability: 25, asteroidSurvival: 12 }
        },

        // Archivist shells (Discovery) - 4
        relic_seeker: {
            id: 'relic_seeker',
            name: 'Relic Seeker',
            description: 'Drawn to ancient artifacts',
            rarity: 'uncommon',
            price: 200,
            npcVendor: 'archivist',
            visual: { color: '#ff4444', trail: '#cc2222', glow: true, pattern: 'ancient' },
            bonuses: { artifactDiscovery: 10 }
        },
        treasure_hunter: {
            id: 'treasure_hunter',
            name: 'Treasure Hunter',
            description: 'Finds what others miss',
            rarity: 'rare',
            price: 350,
            npcVendor: 'archivist',
            visual: { color: '#ff5555', trail: '#dd3333', glow: true, pattern: 'treasure' },
            bonuses: { artifactDiscovery: 15, explorationRewards: 8 }
        },
        archaeologist_prime: {
            id: 'archaeologist_prime',
            name: 'Archaeologist Prime',
            description: 'Master of uncovering secrets',
            rarity: 'epic',
            price: 500,
            npcVendor: 'archivist',
            visual: { color: '#ff6666', trail: '#ee4444', glow: true, pattern: 'dig' },
            bonuses: { artifactDiscovery: 20, explorationRewards: 10 }
        },
        eternal_curator: {
            id: 'eternal_curator',
            name: 'Eternal Curator',
            description: 'Preserves what was lost to time',
            rarity: 'legendary',
            price: 800,
            npcVendor: 'archivist',
            visual: { color: '#ff8888', trail: '#ff5555', glow: true, pattern: 'eternal' },
            bonuses: { artifactDiscovery: 25, explorationRewards: 12 }
        },

        // Null shells (Exotic) - 4
        void_touched: {
            id: 'void_touched',
            name: 'Void Touched',
            description: 'Tainted by the abyss',
            rarity: 'uncommon',
            price: 200,
            npcVendor: 'null',
            visual: { color: '#1a0a2e', trail: '#3a1a4e', glow: true, pattern: 'void' },
            bonuses: { exoticYield: 10 }
        },
        abyssal_harvester: {
            id: 'abyssal_harvester',
            name: 'Abyssal Harvester',
            description: 'Extracts from the darkness',
            rarity: 'rare',
            price: 350,
            npcVendor: 'null',
            visual: { color: '#2a1a3e', trail: '#4a2a5e', glow: true, pattern: 'abyss' },
            bonuses: { exoticYield: 15 }
        },
        entropy_engine: {
            id: 'entropy_engine',
            name: 'Entropy Engine',
            description: 'Converts chaos to resource',
            rarity: 'epic',
            price: 500,
            npcVendor: 'null',
            visual: { color: '#3a2a4e', trail: '#5a3a6e', glow: true, pattern: 'entropy' },
            bonuses: { exoticYield: 20 }
        },
        null_singularity: {
            id: 'null_singularity',
            name: 'Null Singularity',
            description: 'A paradox made manifest',
            rarity: 'legendary',
            price: 800,
            npcVendor: 'null',
            visual: { color: '#4a3a5e', trail: '#6a4a7e', glow: true, pattern: 'singularity' },
            bonuses: { exoticYield: 25 }
        }
    },

    // ==========================================
    // HUB SHELLS (15 total)
    // ==========================================
    hubs: {
        // Shared shells - 3
        default: {
            id: 'default',
            name: 'Standard Hub',
            description: 'Factory-standard recon hub',
            rarity: 'common',
            price: 0,
            npcVendor: null,
            visual: { color: '#00ffff', glow: '#00ffff', ring: '#00ffff' },
            bonuses: {}
        },
        command_center: {
            id: 'command_center',
            name: 'Command Center',
            description: 'Military-grade coordination hub',
            rarity: 'uncommon',
            price: 300,
            npcVendor: null,
            visual: { color: '#44ff44', glow: '#44ff44', ring: '#44ff44' },
            bonuses: {}
        },
        nexus_prime: {
            id: 'nexus_prime',
            name: 'Nexus Prime',
            description: 'State-of-the-art operations center',
            rarity: 'rare',
            price: 500,
            npcVendor: null,
            visual: { color: '#ff44ff', glow: '#ff44ff', ring: '#ff44ff' },
            bonuses: {}
        },

        // Keth-Varn hubs - 2
        data_nexus: {
            id: 'data_nexus',
            name: 'Data Nexus',
            description: 'Optimized for information processing',
            rarity: 'rare',
            price: 450,
            npcVendor: 'keth_varn',
            visual: { color: '#00ddff', glow: '#00ffff', ring: '#00ccff', pattern: 'data' },
            bonuses: { researchSpeed: 15 }
        },
        quantum_hub: {
            id: 'quantum_hub',
            name: 'Quantum Hub',
            description: 'Processes data across probabilities',
            rarity: 'epic',
            price: 700,
            npcVendor: 'keth_varn',
            visual: { color: '#00eeff', glow: '#33ffff', ring: '#00ddff', pattern: 'quantum' },
            bonuses: { researchSpeed: 20 }
        },

        // Whisperer hubs - 2
        signal_amplifier: {
            id: 'signal_amplifier',
            name: 'Signal Amplifier',
            description: 'Extends communication range',
            rarity: 'rare',
            price: 450,
            npcVendor: 'whisperer',
            visual: { color: '#ffffff', glow: '#ffffff', ring: '#ddddff', pattern: 'signal' },
            bonuses: { researchSpeed: 15 }
        },
        echo_chamber: {
            id: 'echo_chamber',
            name: 'Echo Chamber',
            description: 'Captures faint transmissions',
            rarity: 'epic',
            price: 700,
            npcVendor: 'whisperer',
            visual: { color: '#eeeeff', glow: '#ffffff', ring: '#ccccff', pattern: 'echo' },
            bonuses: { researchSpeed: 20 }
        },

        // Mira-Sol hubs - 2
        shelter_station: {
            id: 'shelter_station',
            name: 'Shelter Station',
            description: 'Protects probes from harm',
            rarity: 'rare',
            price: 450,
            npcVendor: 'mira_sol',
            visual: { color: '#ffbb33', glow: '#ffaa00', ring: '#cc8800', pattern: 'shelter' },
            bonuses: { researchSpeed: 15 }
        },
        bastion_hub: {
            id: 'bastion_hub',
            name: 'Bastion Hub',
            description: 'Fortress-class protection hub',
            rarity: 'epic',
            price: 700,
            npcVendor: 'mira_sol',
            visual: { color: '#ffcc44', glow: '#ffbb33', ring: '#ddaa22', pattern: 'bastion' },
            bonuses: { researchSpeed: 20 }
        },

        // Archivist hubs - 2
        archive_vault: {
            id: 'archive_vault',
            name: 'Archive Vault',
            description: 'Stores discovered artifacts safely',
            rarity: 'rare',
            price: 450,
            npcVendor: 'archivist',
            visual: { color: '#ff5555', glow: '#ff4444', ring: '#cc3333', pattern: 'archive' },
            bonuses: { researchSpeed: 15 }
        },
        museum_prime: {
            id: 'museum_prime',
            name: 'Museum Prime',
            description: 'Ultimate artifact preservation',
            rarity: 'epic',
            price: 700,
            npcVendor: 'archivist',
            visual: { color: '#ff6666', glow: '#ff5555', ring: '#dd4444', pattern: 'museum' },
            bonuses: { researchSpeed: 20 }
        },

        // Null hubs - 2
        void_anchor: {
            id: 'void_anchor',
            name: 'Void Anchor',
            description: 'Stabilizes exotic matter',
            rarity: 'rare',
            price: 450,
            npcVendor: 'null',
            visual: { color: '#3a2a4e', glow: '#5a3a6e', ring: '#2a1a3e', pattern: 'void' },
            bonuses: { researchSpeed: 15 }
        },
        null_gate: {
            id: 'null_gate',
            name: 'Null Gate',
            description: 'Gateway to the abyss',
            rarity: 'epic',
            price: 700,
            npcVendor: 'null',
            visual: { color: '#4a3a5e', glow: '#6a4a7e', ring: '#3a2a4e', pattern: 'gate' },
            bonuses: { researchSpeed: 20 }
        }
    },

    // ==========================================
    // MINING STATION SHELLS (10 total)
    // ==========================================
    miningStations: {
        // Shared shells - 2
        default: {
            id: 'default',
            name: 'Standard Mining Station',
            description: 'Factory-standard extraction facility',
            rarity: 'common',
            price: 0,
            npcVendor: null,
            visual: { color: '#ffaa00', glow: '#ffaa00', platform: '#886600' },
            bonuses: {}
        },
        industrial_complex: {
            id: 'industrial_complex',
            name: 'Industrial Complex',
            description: 'Heavy-duty mining operations',
            rarity: 'uncommon',
            price: 400,
            npcVendor: null,
            visual: { color: '#888888', glow: '#666666', platform: '#444444' },
            bonuses: { miningEfficiency: 10 }
        },

        // Keth-Varn stations - 2
        optimized_extractor: {
            id: 'optimized_extractor',
            name: 'Optimized Extractor',
            description: 'Mathematically perfect extraction',
            rarity: 'rare',
            price: 600,
            npcVendor: 'keth_varn',
            visual: { color: '#00ddff', glow: '#00ffff', platform: '#006688', pattern: 'optimal' },
            bonuses: { miningEfficiency: 15, shuttleSpeed: 8 }
        },
        calculation_mine: {
            id: 'calculation_mine',
            name: 'Calculation Mine',
            description: 'Predicts optimal yields',
            rarity: 'epic',
            price: 900,
            npcVendor: 'keth_varn',
            visual: { color: '#00eeff', glow: '#33ffff', platform: '#007799', pattern: 'calc' },
            bonuses: { miningEfficiency: 20, shuttleSpeed: 10 }
        },

        // Mira-Sol stations - 2
        armored_rig: {
            id: 'armored_rig',
            name: 'Armored Rig',
            description: 'Withstands harsh environments',
            rarity: 'rare',
            price: 600,
            npcVendor: 'mira_sol',
            visual: { color: '#ffbb33', glow: '#ffaa00', platform: '#885500', pattern: 'armor' },
            bonuses: { shuttleSpeed: 15, miningEfficiency: 8 }
        },
        endurance_platform: {
            id: 'endurance_platform',
            name: 'Endurance Platform',
            description: 'Built to last millennia',
            rarity: 'epic',
            price: 900,
            npcVendor: 'mira_sol',
            visual: { color: '#ffcc44', glow: '#ffbb33', platform: '#996600', pattern: 'endure' },
            bonuses: { shuttleSpeed: 20, miningEfficiency: 10 }
        },

        // Archivist stations - 2
        excavation_site: {
            id: 'excavation_site',
            name: 'Excavation Site',
            description: 'Unearths hidden treasures',
            rarity: 'rare',
            price: 600,
            npcVendor: 'archivist',
            visual: { color: '#ff5555', glow: '#ff4444', platform: '#883333', pattern: 'dig' },
            bonuses: { miningEfficiency: 15, probethiumRate: 8 }
        },
        relic_foundry: {
            id: 'relic_foundry',
            name: 'Relic Foundry',
            description: 'Processes ancient materials',
            rarity: 'epic',
            price: 900,
            npcVendor: 'archivist',
            visual: { color: '#ff6666', glow: '#ff5555', platform: '#994444', pattern: 'foundry' },
            bonuses: { miningEfficiency: 20, probethiumRate: 10 }
        },

        // Null stations - 2
        void_extractor: {
            id: 'void_extractor',
            name: 'Void Extractor',
            description: 'Harvests from the darkness',
            rarity: 'rare',
            price: 600,
            npcVendor: 'null',
            visual: { color: '#3a2a4e', glow: '#5a3a6e', platform: '#1a0a2e', pattern: 'void' },
            bonuses: { probethiumRate: 15, miningEfficiency: 8 }
        },
        singularity_mine: {
            id: 'singularity_mine',
            name: 'Singularity Mine',
            description: 'Extracts from collapsed stars',
            rarity: 'legendary',
            price: 1200,
            npcVendor: 'null',
            visual: { color: '#5a4a6e', glow: '#7a5a8e', platform: '#2a1a3e', pattern: 'singularity' },
            bonuses: { probethiumRate: 25, miningEfficiency: 12 }
        }
    }
};

class ShellSystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;

        // Initialize cosmetics storage if not present
        if (!this.gameState.cosmetics) {
            this.gameState.cosmetics = {
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
        }

        // Migration: rename old skin properties to shell
        if (this.gameState.cosmetics.ownedSkins && !this.gameState.cosmetics.ownedShells) {
            this.gameState.cosmetics.ownedShells = this.gameState.cosmetics.ownedSkins;
            delete this.gameState.cosmetics.ownedSkins;
        }
        if (this.gameState.cosmetics.equippedSkins && !this.gameState.cosmetics.equippedShells) {
            this.gameState.cosmetics.equippedShells = this.gameState.cosmetics.equippedSkins;
            delete this.gameState.cosmetics.equippedSkins;
        }
    }

    /**
     * Get all shells for a category
     */
    getShellsByCategory(category) {
        return SHELL_CATALOG[category] || {};
    }

    /**
     * Get shells sold by a specific NPC
     */
    getShellsByNPC(npcId) {
        const shells = {
            probes: [],
            hubs: [],
            miningStations: []
        };

        Object.entries(SHELL_CATALOG).forEach(([category, categoryShells]) => {
            Object.values(categoryShells).forEach(shell => {
                if (shell.npcVendor === npcId) {
                    shells[category].push(shell);
                }
            });
        });

        return shells;
    }

    /**
     * Get shared shells (available from any NPC)
     */
    getSharedShells() {
        const shells = {
            probes: [],
            hubs: [],
            miningStations: []
        };

        Object.entries(SHELL_CATALOG).forEach(([category, categoryShells]) => {
            Object.values(categoryShells).forEach(shell => {
                if (shell.npcVendor === null && shell.id !== 'default') {
                    shells[category].push(shell);
                }
            });
        });

        return shells;
    }

    /**
     * Get a specific shell by category and ID
     */
    getShell(category, shellId) {
        return SHELL_CATALOG[category]?.[shellId] || null;
    }

    /**
     * Check if player owns a shell
     */
    ownsShell(category, shellId) {
        return this.gameState.cosmetics?.ownedShells?.[category]?.includes(shellId) || false;
    }

    /**
     * Purchase a shell
     */
    purchaseShell(category, shellId) {
        const shell = this.getShell(category, shellId);
        if (!shell) {
            console.error('Shell not found:', category, shellId);
            return { success: false, error: 'Shell not found' };
        }

        if (this.ownsShell(category, shellId)) {
            return { success: false, error: 'Already owned' };
        }

        // Check if player has enough Probethium
        const currentProbethium = this.gameState.probethium?.current || 0;
        if (currentProbethium < shell.price) {
            return { success: false, error: 'Insufficient Probethium' };
        }

        // Deduct Probethium
        this.gameState.probethium.current -= shell.price;

        // Add to owned shells
        if (!this.gameState.cosmetics.ownedShells[category]) {
            this.gameState.cosmetics.ownedShells[category] = [];
        }
        this.gameState.cosmetics.ownedShells[category].push(shellId);

        this.eventBus.emit('shell:purchased', { category, shellId, shell });
        this.eventBus.emit('ui:update');

        return { success: true, shell };
    }

    /**
     * Equip a shell as the default for a category
     */
    equipShell(category, shellId) {
        if (!this.ownsShell(category, shellId)) {
            return { success: false, error: 'Shell not owned' };
        }

        this.gameState.cosmetics.equippedShells[category] = shellId;
        this.eventBus.emit('shell:equipped', { category, shellId });
        this.eventBus.emit('ui:update');

        return { success: true };
    }

    /**
     * Build probe.cosmetic object from shell visual properties
     * Converts shell.visual to the format expected by probe rendering
     * @param {Object} shell - Shell definition object
     * @returns {Object} - Cosmetic data compatible with probe rendering
     */
    buildCosmeticFromShell(shell) {
        const visual = shell?.visual || {};
        const defaultColor = '#00ffff';

        return {
            trailEnabled: true,
            trail: {
                length: 15,
                color: visual.trail || visual.color || defaultColor,
                width: visual.glow ? 4 : 3,
                opacity: visual.glow ? 0.95 : 0.9
            },
            bodyColor: visual.color || defaultColor,
            wingColor: visual.color || defaultColor,
            frontColor: visual.color || defaultColor,
            antennaColor: visual.color || defaultColor,
            glow: visual.glow || false,
            blinkSpeed: 1500
        };
    }

    /**
     * Equip a shell on a specific probe (per-entity override)
     */
    equipShellOnProbe(probe, shellId) {
        if (!this.ownsShell('probes', shellId)) {
            return { success: false, error: 'Shell not owned' };
        }

        probe.shellId = shellId;

        // Apply cosmetic data to probe for immediate visual update
        const shell = this.getShell('probes', shellId);
        probe.cosmetic = this.buildCosmeticFromShell(shell);

        this.eventBus.emit('shell:equippedOnProbe', { probe, shellId });
        this.eventBus.emit('ui:update');

        return { success: true };
    }

    /**
     * Refresh probe cosmetic from its current shellId
     * Useful after save/load to re-apply visual data
     * @param {Object} probe - Probe entity to refresh
     */
    refreshProbeCosmetic(probe) {
        const shell = this.getProbeShell(probe);
        probe.cosmetic = this.buildCosmeticFromShell(shell);
    }

    /**
     * Get the shell equipped on a specific probe
     */
    getProbeShell(probe) {
        const shellId = probe?.shellId || this.gameState.cosmetics?.equippedShells?.probes || 'default';
        return this.getShell('probes', shellId);
    }

    /**
     * Get currently equipped shell for a category
     */
    getEquippedShell(category) {
        const shellId = this.gameState.cosmetics?.equippedShells?.[category] || 'default';
        return this.getShell(category, shellId);
    }

    /**
     * Get list of owned shells for a category
     */
    getOwnedShells(category) {
        const ownedIds = this.gameState.cosmetics?.ownedShells?.[category] || ['default'];
        return ownedIds.map(id => this.getShell(category, id)).filter(s => s !== null);
    }

    /**
     * Calculate total bonuses from all equipped shells
     */
    getTotalBonuses() {
        const bonuses = {};

        ['probes', 'hubs', 'miningStations'].forEach(category => {
            const shell = this.getEquippedShell(category);
            if (shell?.bonuses) {
                Object.entries(shell.bonuses).forEach(([bonusType, value]) => {
                    bonuses[bonusType] = (bonuses[bonusType] || 0) + value;
                });
            }
        });

        return bonuses;
    }

    /**
     * Get bonus value for a specific type
     */
    getBonus(bonusType) {
        const bonuses = this.getTotalBonuses();
        return bonuses[bonusType] || 0;
    }

    /**
     * Apply bonus multiplier to a base value
     * Returns: baseValue * (1 + bonus/100)
     */
    applyBonus(baseValue, bonusType) {
        const bonus = this.getBonus(bonusType);
        return baseValue * (1 + bonus / 100);
    }

    /**
     * Get NPC theme info
     */
    getNPCTheme(npcId) {
        return NPC_THEMES[npcId] || null;
    }

    /**
     * Get rarity info
     */
    getRarity(rarityId) {
        return RARITY[rarityId] || RARITY.common;
    }

    /**
     * Get bonus type info
     */
    getBonusTypeInfo(bonusType) {
        return BONUS_TYPES[bonusType] || { label: bonusType, unit: '', icon: '' };
    }

    /**
     * Format bonus for display
     */
    formatBonus(bonusType, value) {
        const info = this.getBonusTypeInfo(bonusType);
        return `${info.icon} +${value}${info.unit} ${info.label}`;
    }
}

// Export for use in other modules
window.ShellSystem = ShellSystem;
window.SHELL_CATALOG = SHELL_CATALOG;
window.NPC_THEMES = NPC_THEMES;
window.RARITY = RARITY;
window.BONUS_TYPES = BONUS_TYPES;
