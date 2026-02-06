---
phase: 08-sector-resource-profiles
plan: 01
subsystem: game-mechanics
tags: [sector-generation, resource-profiles, spawn-rates, distance-weighting, RNG]

# Dependency graph
requires:
  - phase: 05-signal-type-system
    provides: "Exclusive signal type definitions and spawn logic in ProbeManager"
  - phase: 07-signal-rewards
    provides: "Signal reward system that works with sector-based signals"
provides:
  - "Resource profile system: assignResourceProfile() with distance-weighted RNG"
  - "Sector.resourceProfile property with type, spawnRateMultiplier, assignedDistance"
  - "Spawn rate multipliers applied to signal generation (1.5x specialized, 0.8x probethium-rich, 1.0x balanced)"
  - "Foundation for mining station rework (Plan 08-02)"
affects: [08-02-mining-rework, 09-discovery-reveal, 10-testing-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Distance-weighted RNG for progression feel"
    - "Defensive property access with fallbacks for save compatibility"
    - "Independent profile assignment (not coupled to sector type)"

key-files:
  created: []
  modified:
    - src/SectorManager.js
    - src/ProbeManager.js

key-decisions:
  - "Profiles independent from sector types (Resource-Rich sector can be data-rich profile)"
  - "Distance-weighted probabilities favor balanced near origin, rich profiles far out"
  - "Probethium-rich sectors start at 2% near origin, scale to 10% far out (PROF-04 lucky finds possible)"
  - "Spawn multipliers stack with shell bonuses (multiplicative, not additive)"

patterns-established:
  - "Profile assignment on sector creation with backward compatibility on discovery"
  - "Sector serialization automatic via spread operator in SaveManager"
  - "Defensive fallback pattern: currentSector?.resourceProfile?.property || default"

# Metrics
duration: 3min
completed: 2026-02-05
---

# Phase 8 Plan 01: Sector Resource Profiles Summary

**Distance-weighted resource profile assignment with 5 profile types and spawn rate multipliers affecting signal generation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05T20:10:53Z
- **Completed:** 2026-02-05T20:13:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Every new sector receives a resource profile (balanced, mineral-rich, data-rich, artifact-rich, or probethium-rich) based on distance from origin
- Specialized sectors generate 50% more signals (1.5x multiplier) to increase richness feel
- Probethium-rich sectors generate 20% fewer signals (0.8x multiplier, compensated by probethium mining in Plan 08-02)
- Distance-weighted RNG ensures balanced sectors near origin (60% chance), richer profiles far out (30% balanced at distance 10+)
- Lucky early probethium-rich finds possible at 2% chance within 5 sectors of origin (PROF-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add resource profile assignment to SectorManager** - `4773955` (feat)
   - assignResourceProfile() method with distance-based weight tables
   - Integration into initializeSector() for all new sectors
   - Backward compatibility in discoverSector() for existing sectors
2. **Task 2: Apply spawn rate multipliers in ProbeManager** - `84f2375` (feat, bundled with 08-02)
   - PROF-02 implementation: sector spawn multiplier applied to signal chance
   - Defensive fallback for old sectors without profiles

## Files Created/Modified
- `src/SectorManager.js` - Added assignResourceProfile() method with distance-weighted RNG, integrated into initializeSector() and discoverSector()
- `src/ProbeManager.js` - Applied sector.resourceProfile.spawnRateMultiplier to signal spawn chance in updateProbeRadar()

## Decisions Made

**1. Profiles independent from sector types**
- A Resource-Rich sector (Ore Vein signals) can be data-rich profile (mining produces data)
- Sector type determines exclusive signals; resource profile determines mining output and spawn rates
- Rationale: Maximizes variety and emergent gameplay (finding a Resource-Rich + probethium-rich sector is a jackpot)

**2. Distance-weighted probability tables**
- Distance < 5: [60, 20, 10, 8, 2] weights for [balanced, mineral-rich, data-rich, artifact-rich, probethium-rich]
- Distance 5-10: [45, 25, 15, 10, 5]
- Distance 10+: [30, 25, 20, 15, 10]
- Rationale: Progression feel - early game is predictable, exploration rewards discovery of rich sectors

**3. Spawn multipliers stack with shell bonuses**
- Multiplicative: adjustedChance = baseChance * (1 + shellBonus/100) * spawnMultiplier
- Rationale: Shell bonuses and sector profiles enhance each other, creating high-value combinations

**4. Automatic serialization via spread operator**
- No SaveManager changes needed; resourceProfile saves automatically
- Rationale: Leverage existing serialization pattern, defensive fallbacks handle old saves

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation straightforward with existing patterns.

## Next Phase Readiness

**Ready for Plan 08-02 (Mining Station Rework):**
- All sectors now have resourceProfile.type for output determination
- MiningManager can check sector.resourceProfile.type to decide output resource
- Defensive fallback pattern established for old saves

**Ready for Phase 9 (Discovery Reveal):**
- Sector discovery can display resourceProfile.type in modal
- Profile information available at discovery time

**Testing ready:**
- Console logging confirms profile assignment on sector creation
- Profile distribution can be verified via browser console inspection

---
*Phase: 08-sector-resource-profiles*
*Completed: 2026-02-05*
