/**
 * Shared gameplay constants
 * Tuning values referenced across modules. Design rationale: docs/design/
 * (CORE_LOOP.md for tempo, ECONOMY.md for Probethium rates)
 */
window.GAME_CONSTANTS = {
    PROBE: {
        // Arcade tempo: 2.5x the original 0.0001 (CORE_LOOP.md "Tempo changes")
        BASE_SPEED: 0.00025,
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
    miningStation: { minerals: 100, data: 50 },
    shuttle: { minerals: 50, data: 25 },

    // Intake Bay: deliveries/min = INTAKE_PER_MIN_BASE × level.
    // Keyed by the level being purchased. Tier 3 demands exotics (ring 2+).
    intakeBay: {
        2: { minerals: 150, data: 60 },
        3: { minerals: 300, data: 120, exoticMinerals: 8 }
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
            artifacts: 'Artifacts', exoticMinerals: 'Exotic'
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

    // Rarity ramp (VISUAL_STYLE.md "Rarity recalibration")
    RARITY: {
        common: '#8B84A3',
        uncommon: '#7FD6C2',
        rare: '#5B8CFF',
        epic: '#B06BFF',
        legendary: '#FFD700'
    }
};
