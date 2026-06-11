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
        INTAKE_PER_MIN_BASE: 8
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
