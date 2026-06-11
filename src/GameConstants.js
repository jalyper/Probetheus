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
        // Standard signals: 1.5-2.5s (was 2-3s) — pairs with faster probes
        STANDARD_DURATION_MIN: 1500,
        STANDARD_DURATION_RAND: 1000,
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
    }
};
