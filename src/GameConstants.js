/**
 * Shared gameplay constants
 * Tuning values referenced across modules. Design rationale: docs/design/
 * (CORE_LOOP.md for tempo, ECONOMY.md for Probethium rates)
 */
window.GAME_CONSTANTS = {
    PROBE: {
        // Distance-based tempo: px per sim-ms (125 px/s at 1×). A typical
        // ~500px starter leg crosses in ~4s — the old arcade feel — but
        // travel time now scales with real route length, so shorter loops
        // genuinely pay faster (CORE_LOOP tempo; PROBE_NETWORKS round-trip
        // math; prerequisite for Solar Drift). Replaces the per-segment
        // clock (0.00025 progress/ms) that made distance cosmetic.
        BASE_SPEED: 0.125,
        // Return is faster than outbound, but no longer 3x
        RETURN_SPEED_MULT: 1.5,
        BUILD_COST: 25
    },
    SIGNAL: {
        // Standard signals: 2.5-4s — generous windows, no click-pressure
        // (CORE_LOOP.md "relaxing and stimulating" revision)
        STANDARD_DURATION_MIN: 2500,
        STANDARD_DURATION_RAND: 1500,
        // Exclusive sector signals keep their longer windows (VIS-05)
        EXCLUSIVE_DURATION_MIN: 5000,
        EXCLUSIVE_DURATION_RAND: 3000,
        DARK_MARKET_DURATION: 5000
    },
    SYNTHESIS: {
        // ECONOMY.md: exotic synthesis is the primary active Probethium source
        EXOTIC_PER_BATCH: 5,
        PROBETHIUM_PER_BATCH: 1 // was 0.001
    },
    TIME: {
        SCALES: [1, 2, 4],
        // Clamp raw frame delta so tab-switches don't teleport probes
        MAX_FRAME_DELTA: 250
    },
    HUB: {
        // Deliveries a level-1 hub can process per minute (LOOP_REDESIGN.md
        // "Tune") — exceeding this queues probes visibly at the dock
        INTAKE_PER_MIN_BASE: 8,
        MAX_INTAKE_LEVEL: 3
    },
    UPLINK: {
        // Data units/min the Uplink streams into the active protocol per level
        // (REBUILD.md §1). Research speed IS data-network throughput.
        DECODE_PER_MIN_BASE: 12,
        MAX_LEVEL: 3
    },
    FOUNDRY: {
        // The first true processor (REBUILD.md §2): consumes a mineral flow,
        // emits an alloy flow. Rate-matching is the game — a starved Foundry
        // idles visibly; one whose output isn't hauled away backs up.
        CONVERT_RATIO: 5,           // minerals consumed per alloy produced (PROBE_NETWORKS §5)
        MINERALS_PER_MIN_BASE: 20,  // consumption rate per level while running
        INPUT_CAP: 100,             // mineral buffer — freighters keep this fed
        OUTPUT_CAP: 25,             // alloy buffer — full = backed up, conversion stalls
        MAX_LEVEL: 3,
        MAX_PER_HUB: 2,
        MAX_FREIGHTERS_PER_HUB: 3,
        FREIGHTER_CAPACITY: 20,
        FREIGHTER_SPEED: 0.25       // px per sim-ms — heavier than a probe, deliberate
    }
};

/**
 * Protocol catalog — the Uplink's decode targets (REBUILD.md §1).
 * Replaces the Research Lab tree. `data` is the total data units that must
 * be STREAMED through the Uplink (consumed from stores at the decode rate);
 * `catalysts` are consumed up front when decoding starts — deep protocols
 * demand ring-2+ materials, so research gates by where you've dared to route.
 * Order is presentation order in the Uplink panel.
 */
window.PROTOCOLS = {
    swift_carriage: {
        name: 'Swift Carriage',
        data: 40,
        effect: 'Probes travel 25% faster on every leg.',
        lore: 'A drive cadence recovered from the wreck-songs of the first fleet.'
    },
    deep_resonance: {
        name: 'Deep Resonance',
        data: 60,
        effect: 'Prospecting pulses sweep 40% further.',
        lore: 'The void answers louder when you ask in its own frequency.'
    },
    harvest_lattice: {
        name: 'Harvest Lattice',
        data: 80,
        catalysts: { artifacts: 2 },
        effect: 'Unlocks collector modules for probe equipment bays.',
        lore: 'Cargo geometry folded from a derelict\'s hold.'
    },
    extraction_harmonics: {
        name: 'Extraction Harmonics',
        data: 120,
        catalysts: { artifacts: 4 },
        effect: '+1 yield on every deposit extraction pass.',
        lore: 'Veins give more to those who take in rhythm.'
    },
    universal_lattice: {
        name: 'Universal Lattice',
        data: 150,
        catalysts: { artifacts: 6 },
        effect: 'Unlocks the Universal Collector — one module, every cargo type.',
        lore: 'All matter is one lattice, sampled at different angles.'
    },
    exotic_synthesis: {
        name: 'Exotic Synthesis',
        data: 200,
        catalysts: { exoticMinerals: 4 },
        effect: 'Unlocks Probethium synthesis from exotic minerals at hubs.',
        lore: 'What the outer rings hoard, the Probetheus once burned for fuel.'
    },
    remnant_protocols: {
        name: 'Remnant Protocols',
        data: 250,
        catalysts: { artifacts: 8, exoticMinerals: 4 },
        effect: 'Opens deep trade with the Remnants.',
        lore: 'They will speak plainly only to machines that remember.'
    }
};

/**
 * Material recipes — factory-first (LOOP_REDESIGN.md addendum).
 * Logistical items are MADE from found materials; upgrade tiers demand
 * progressively more exotic materials, which only exist in the outer
 * rings — so the network you have must reach the materials for the
 * network you want.
 *
 * Keys match resource names in GameState ('minerals' | 'data' |
 * 'artifacts' | 'exoticMinerals').
 */
window.RECIPES = {
    probe: { minerals: 25 },
    reconHub: { minerals: 100 },

    // The Foundry (REBUILD.md §2): the network's first processor. Freighters
    // work the hub↔Foundry legs. Alloy is the recipe currency for tier-2+
    // logistics — you cannot buy it, only convert for it.
    foundry: { minerals: 120, data: 40 },
    foundryLevel: {
        2: { minerals: 200, data: 80 },
        3: { minerals: 350, data: 140, artifacts: 10 }
    },
    freighter: { minerals: 50, data: 25 },

    // Intake Bay: deliveries/min = INTAKE_PER_MIN_BASE × level.
    // Keyed by the level being purchased. Tier 3 is alloy-gated — top-end
    // logistics are FORGED, not bought (REBUILD.md §2).
    intakeBay: {
        2: { minerals: 150, data: 60 },
        3: { minerals: 250, data: 120, alloy: 10 }
    },

    // The Uplink (REBUILD.md §1): crafted at the home hub, then upgraded.
    // Decode rate = UPLINK.DECODE_PER_MIN_BASE × level.
    uplink: { minerals: 60, data: 25 },
    uplinkLevel: {
        2: { minerals: 150, data: 80 },
        3: { minerals: 300, data: 160, exoticMinerals: 6 }
    }
};

window.RecipeUtils = {
    /** Returns the list of missing resource amounts (empty = affordable) */
    missingFor(recipe, resources) {
        return Object.entries(recipe)
            .filter(([key, amount]) => (resources[key] || 0) < amount)
            .map(([key, amount]) => ({ key, need: amount, have: resources[key] || 0 }));
    },

    canAfford(recipe, resources) {
        return this.missingFor(recipe, resources).length === 0;
    },

    /** Deduct a recipe's costs via GameState.updateResources */
    spend(recipe, gameState, eventBus) {
        const resources = gameState.getResources();
        const updated = {};
        Object.entries(recipe).forEach(([key, amount]) => {
            updated[key] = (resources[key] || 0) - amount;
        });
        gameState.updateResources(updated, eventBus);
    },

    /** "150 Minerals, 60 Data" — display string for buttons/tooltips */
    format(recipe) {
        const names = {
            minerals: 'Minerals', data: 'Data',
            artifacts: 'Artifacts', exoticMinerals: 'Exotic',
            alloy: 'Alloy'
        };
        return Object.entries(recipe)
            .map(([key, amount]) => `${amount} ${names[key] || key}`)
            .join(', ');
    }
};

/**
 * Void Premium canvas palette — contract: docs/design/VISUAL_STYLE.md.
 * Gold marks only what the player has earned and built; everything else
 * recedes into violet near-black. Canvas code must draw from these tokens,
 * never raw literals.
 */
window.PALETTE = {
    VOID: '#07060B',
    RIFT: '#1A1030',
    FIRE: '#D4AF37',
    FIRE_BRIGHT: '#FFD700',
    SIGNAL: '#E8E4F0',
    MIST: '#8B84A3',
    LINE: 'rgba(212, 175, 55, 0.28)',
    LINE_SOFT: 'rgba(212, 175, 55, 0.14)',
    DANGER: '#E0524D',

    // Probe rendering
    PROBE_BODY: '#E8E4F0',
    PROBE_TRAIL: 'rgba(232, 228, 240, 0.35)',

    // Material flow (VISUAL_STYLE.md "Material flow — the conveyor in space")
    // One color per cargo type — deposits, flow beads, and processor ports all read from here.
    MATERIALS: {
        minerals: '#C97B4A',        // copper
        data: '#5B8CFF',            // clear blue
        artifacts: '#B06BFF',       // rift violet
        exoticMinerals: '#E8E4F0',  // signal-white shimmer — the rare stuff
        alloy: '#E8A33D'            // molten amber — copper, forged toward gold
    },

    // Rarity ramp (VISUAL_STYLE.md "Rarity recalibration")
    RARITY: {
        common: '#8B84A3',
        uncommon: '#7FD6C2',
        rare: '#5B8CFF',
        epic: '#B06BFF',
        legendary: '#FFD700'
    }
};
