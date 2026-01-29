---
phase: 03-bonus-gameplay
plan: 04
subsystem: shell-bonus-tests
tags: [shell-system, testing, playwright, bonus-verification]

dependency-graph:
  requires: [03-02, 03-03]
  provides: [comprehensive-bonus-test-coverage, per-entity-isolation-verification]
  affects: [03-05]

tech-stack:
  added: []
  patterns: [page-evaluate-test-pattern, shell-equip-verify-pattern]

file-tracking:
  key-files:
    created:
      - tests/shell-bonuses.spec.js
    modified: []

decisions:
  - id: single-comprehensive-test-file
    choice: "Created single tests/shell-bonuses.spec.js covering all TEST-01 through TEST-04"
    rationale: "Existing wave 2 test files already cover individual integration; this file provides comprehensive verification and isolation tests"
  - id: correct-shell-bonus-data
    choice: "Used actual shell bonus values from ShellSystem.js rather than plan's assumed values"
    rationale: "Uncommon shells only have primary bonus; secondary bonuses start at rare rarity"

metrics:
  tasks: 2/2
  tests-added: 11
  tests-passing: 11
  duration: ~14min
  completed: 2026-01-28
---

# Phase 3 Plan 4: Comprehensive Bonus Tests Summary

11 Playwright tests verifying all 12 bonus types and per-entity isolation, using actual shell definitions from ShellSystem.js.

## What Was Done

### Task 1: Test probe bonuses and per-entity isolation (TEST-01, TEST-04)

Created `tests/shell-bonuses.spec.js` with comprehensive coverage:

**TEST-01: All 8 Probe Bonus Types (3 tests)**
- Batch test verifying all 8 bonus types resolve correctly with appropriate shells:
  - `calculator_core` -> dataSignalDiscovery: 10
  - `echo_receiver` -> signalRange: 10
  - `frequency_hunter` -> rareSignalChance: 8
  - `reinforced_hull` -> probeDurability: 10
  - `survivor_class` -> asteroidSurvival: 8
  - `relic_seeker` -> artifactDiscovery: 10
  - `treasure_hunter` -> explorationRewards: 8
  - `void_touched` -> exoticYield: 10
- signalRange gameplay effect: verified 80 * 1.10 = 88 boosted range
- probeDurability gameplay effect: verified baseMaxDamage=10 -> maxDamage=12 with 20% bonus

**TEST-04: Per-Entity Isolation (3 tests)**
- Two probes with different shells: Probe A (calculator_core) gets dataSignalDiscovery=10, signalRange=0; Probe B (echo_receiver) gets dataSignalDiscovery=0, signalRange=10
- Shell vs no-shell: Probe A with calculator_core gets bonus=10; Probe B on default gets bonus=0
- Cross-category isolation: hub researchSpeed does not bleed to probes; station miningEfficiency does not bleed to hubs

### Task 2: Test hub and mining station bonuses (TEST-02, TEST-03)

Included in same file during Task 1 execution:

**TEST-02: Hub researchSpeed (2 tests)**
- Resolution: default=0, with data_nexus equipped=15
- Cost reduction formula: verified Math.max(1, Math.ceil(baseCost * (1 - 15/100))) for multiple costs; spot-checked cost 12 -> effective 11

**TEST-03: Mining Station Bonus Types (3 tests)**
- miningEfficiency: default=0, with equipped shell > 0
- shuttleSpeed: default=0, with equipped shell > 0
- probethiumRate: default=0, with equipped shell > 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan specified wrong shell bonus values**
- **Found during:** Task 1 initial test run
- **Issue:** Plan assumed echo_receiver had rareSignalChance:5 and reinforced_hull had asteroidSurvival:5. Actual shells: uncommon shells only have primary bonus; secondary bonuses start at rare rarity.
- **Fix:** Used correct shells for each bonus type: frequency_hunter for rareSignalChance:8, survivor_class for asteroidSurvival:8, treasure_hunter for explorationRewards:8
- **Files modified:** tests/shell-bonuses.spec.js
- **Commit:** 7877af2

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Single comprehensive test file | Wave 2 agents already created 30 tests across 3 files; this file covers remaining gaps (isolation, cross-category) |
| Used actual shell data from ShellSystem.js | Plan's assumed bonus values were incorrect for uncommon shells |
| Combined Task 1 and Task 2 in one commit | All tests went into the same file; splitting would create artificial separation |

## Test Results

11 new tests in `tests/shell-bonuses.spec.js`, all passing.
Full suite: 167 tests passing, 0 failures.

**Total shell bonus test coverage across all files:**
- `shell-bonus-foundation.spec.js`: 13 tests (normalization, getEntityBonus basics)
- `probe-bonus-integration.spec.js`: 9 tests (probe bonus integration points)
- `shell-bonus-wiring.spec.js`: 8 tests (station/hub gameplay wiring)
- `shell-bonuses.spec.js`: 11 tests (comprehensive verification + isolation)
- **Total: 41 shell bonus tests**

## Next Phase Readiness

TEST-01 through TEST-04 all satisfied. Ready for Plan 05 (Bonus UI Indicators).
