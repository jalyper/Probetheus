---
phase: 03-bonus-gameplay
plan: 03
subsystem: shell-bonuses
tags: [shell-system, mining-bonus, hub-bonus, research-cost-reduction]

dependency-graph:
  requires: [03-01]
  provides: [mining-efficiency-bonus, probethium-rate-bonus, shuttle-speed-bonus, research-speed-bonus]
  affects: [03-04, 03-05]

tech-stack:
  added: []
  patterns: [category-level-bonus-resolution, cost-reduction-formula]

file-tracking:
  key-files:
    created:
      - tests/shell-bonus-wiring.spec.js
    modified:
      - src/MiningManager.js
      - src/GameState.js
      - src/ResearchManager.js

decisions:
  - id: research-cost-reduction-formula
    choice: "Math.max(1, Math.ceil(baseCost * (1 - bonus/100)))"
    rationale: "Conservative rounding (ceil) with minimum cost of 1 prevents free research"
  - id: strikethrough-cost-display
    choice: "Show original cost with strikethrough when shell reduces it"
    rationale: "Clear visual feedback of bonus effect without adding bonus indicator UI (Phase 4 scope)"

metrics:
  tasks: 2/2
  tests-added: 8
  tests-passing: 8
  duration: ~15min
  completed: 2026-01-28
---

# Phase 3 Plan 3: Station & Hub Bonus Wiring Summary

Wired all 4 non-probe bonuses (miningEfficiency, probethiumRate, shuttleSpeed, researchSpeed) into MiningManager, GameState, and ResearchManager using getEntityBonus category-level lookups.

## What Was Done

### Task 1: Wire Mining Station Bonuses (MBON-01, MBON-02, MBON-03)

**MBON-01: miningEfficiency** (src/MiningManager.js, line ~272)
- Added `efficiencyShellBonus` and `efficiencyShellMultiplier` to the production calculation
- Multiplies into: `stationType.output * station.level * station.efficiency * efficiencyBonus * sectorBonus * efficiencyShellMultiplier`
- Uses `getEntityBonus('miningStations', null, 'miningEfficiency')` with default 0

**MBON-02: probethiumRate** (src/GameState.js, calculateProbethium ~line 796)
- Added `probethiumShellBonus` and `shellMultiplier` at the end of the multiplier chain
- Final rate: `baseRate * totalMultiplier * shellMultiplier`
- Uses `getEntityBonus('miningStations', null, 'probethiumRate')` with default 0

**MBON-03: shuttleSpeed** (src/MiningManager.js, line ~373)
- Added `speedShellBonus` to shuttle movement calculation
- Move distance: `shuttle.speed * shuttle.level * (1 + speedShellBonus / 100) * deltaTime`
- Uses `getEntityBonus('miningStations', null, 'shuttleSpeed')` with default 0

### Task 2: Wire Hub researchSpeed Bonus (HBON-01)

**HBON-01: researchSpeed** (src/ResearchManager.js)
- Added `getEffectiveCost(baseCost)` method for cost reduction calculation
- Formula: `Math.max(1, Math.ceil(baseCost * (1 - researchShellBonus / 100)))`
- Updated `researchNode()`: can-afford check and deduction both use effective cost
- Updated `showResearchDetails()`: shows strikethrough original cost when reduced
- Uses `getEntityBonus('hubs', null, 'researchSpeed')` with default 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test catalog access pattern**
- **Found during:** Task 1 test verification
- **Issue:** Tests used `window.ShellSystem.SHELL_CATALOG` (non-existent) and `bonus` (singular). Actual API is `window.SHELL_CATALOG` (nested by category) and `bonuses` (plural).
- **Fix:** Updated all 4 failing tests to use `window.SHELL_CATALOG.category` with `bonuses` field
- **Files modified:** tests/shell-bonus-wiring.spec.js
- **Commit:** 23a486b

**2. [Rule 1 - Bug] Fixed shuttle speed test timing**
- **Found during:** Task 1 test verification
- **Issue:** Single shuttle arrived at destination in one tick, making distance comparison meaningless after state changed
- **Fix:** Used two separate shuttles and a much farther station (5000px) with smaller deltaTime (100)
- **Files modified:** tests/shell-bonus-wiring.spec.js
- **Commit:** 23a486b

**3. [Rule 1 - Bug] Fixed probethiumRate test timing dependency**
- **Found during:** Task 1 test verification
- **Issue:** calculateProbethium uses Date.now() internally with 1-second debounce; rapid sequential calls in tests couldn't reliably accumulate
- **Fix:** Rewrote test to verify multiplier math directly (bonus lookup + formula validation) rather than timing-dependent accumulation
- **Files modified:** tests/shell-bonus-wiring.spec.js
- **Commit:** 23a486b

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Cost reduction formula: `Math.max(1, Math.ceil(...))` | Conservative rounding prevents free research; minimum 1 ensures meaningful cost |
| Strikethrough cost display when reduced | Clear bonus feedback without adding Phase 4 bonus indicator UI |
| getEffectiveCost as separate method | Reused by both showResearchDetails (display) and researchNode (logic) |

## Test Results

8 new tests in `tests/shell-bonus-wiring.spec.js`:
- MBON-01: miningEfficiency bonus multiplies output + defaults to 0
- MBON-02: probethiumRate bonus multiplier math verified
- MBON-03: shuttleSpeed bonus increases shuttle distance
- HBON-01: researchSpeed reduces cost + minimum 1 + defaults to 0
- Default shells produce identical behavior (all 4 bonuses = 0)

All 8 tests passing.

## Next Phase Readiness

All 12 bonus types are now fully wired:
- 8 probe bonuses (Plan 02): signalRange, signalStrength, dataSignalDiscovery, probeDurability, asteroidSurvival, explorationRewards, artifactDiscovery, exoticYield
- 3 mining station bonuses (this plan): miningEfficiency, shuttleSpeed, probethiumRate
- 1 hub bonus (this plan): researchSpeed

Ready for Plan 04 (Bonus UI Indicators) and Plan 05 (Integration Tests).
