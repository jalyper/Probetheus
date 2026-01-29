---
phase: 03-bonus-gameplay
plan: 02
subsystem: probe-bonuses
tags: [shell-system, probe-bonuses, gameplay-integration]

dependency-graph:
  requires: [03-01]
  provides: [probe-bonus-integration, 8-probe-bonus-types-wired]
  affects: [03-03, 03-04, 03-05]

tech-stack:
  added: []
  patterns: [per-entity-bonus-integration, baseMaxDamage-tracking, multiplicative-bonus-stacking]

file-tracking:
  key-files:
    created:
      - tests/probe-bonus-integration.spec.js
    modified:
      - src/ProbeManager.js
      - src/ShellSystem.js
      - src/GameController.js

decisions:
  - id: explorationRewards-before-artifactDiscovery
    choice: "Apply explorationRewards before artifactDiscovery for multiplicative stacking"
    rationale: "explorationRewards boosts all resources, then artifactDiscovery further boosts artifacts specifically"
  - id: baseMaxDamage-tracking
    choice: "Store baseMaxDamage on probes to prevent durability bonus compounding"
    rationale: "Shell swaps recalculate from base, not from already-boosted value"
  - id: starting-probes-baseMaxDamage
    choice: "Added baseMaxDamage, damage, cargo to starting probes in GameController"
    rationale: "Starting probes were missing these properties, preventing durability bonus from working"

metrics:
  tasks: 2/2
  tests-added: 9
  tests-passing: 9
  duration: ~12min
  completed: 2026-01-28
---

# Phase 3 Plan 2: Probe Bonus Integration Summary

Wired all 8 probe bonus types into ProbeManager.js so equipped shells affect probe behavior via getEntityBonus().

## What Was Done

### Task 1: Wire signal and range bonuses (PBON-01, PBON-02, PBON-03)

**PBON-01: dataSignalDiscovery** - Signal generation chance now uses `0.3 * (1 + bonus / 100)` instead of hardcoded `0.3`. Equipped probes find signals more frequently.

**PBON-02: signalRange** - Both radar pulse `maxRadius` and auto-collection `collectionRange` scale with bonus: `80 * (1 + bonus / 100)`. Visual pulse and functional range stay in sync.

**PBON-03: rareSignalChance** - Rarity distribution shifts away from common toward rarer outcomes. Common threshold reduces by `commonBase * (rareBonus / 100)`, freed probability distributed equally to uncommon/rare/epic. Epic threshold capped at 0.99 via `Math.min`. Works for both normal and asteroid field distributions. `determineSignalRarity` now accepts optional `probe` parameter.

### Task 2: Wire survival, discovery, and yield bonuses (PBON-04 through PBON-08)

**PBON-04: probeDurability** - New probes store `baseMaxDamage` alongside `maxDamage`. Shell bonus applied at creation: `Math.floor(baseMaxDamage * (1 + bonus / 100))`. Shell equip in ShellSystem.js recalculates from `baseMaxDamage` to prevent compounding. Applied in both `buildProbe()` and `createNewProbe()`.

**PBON-05: asteroidSurvival** - Destruction chance reduced: `probeDestructionChance * (1 - bonus / 100)`. A 10% shell bonus at 10% destruction chance = 9% effective chance.

**PBON-06: artifactDiscovery** - Artifact rewards multiplied: `Math.floor(artifacts * (1 + bonus / 100))`. Applied AFTER explorationRewards for multiplicative stacking.

**PBON-07: explorationRewards** - ALL reward types (minerals, data, artifacts) multiplied. Applied BEFORE artifactDiscovery so bonuses stack multiplicatively.

**PBON-08: exoticYield** - Exotic mineral amounts scaled: `Math.floor(exoticAmount * (1 + bonus / 100))`. Minimum of 1 preserved when base >= 1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Starting probes missing baseMaxDamage**
- **Found during:** Task 2 verification (tests)
- **Issue:** Starting probes created in GameController.js lacked `damage`, `baseMaxDamage`, `maxDamage`, `cargo` properties
- **Fix:** Added these properties to the starting probe template in GameController.js
- **Files modified:** src/GameController.js
- **Commit:** d73159a

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| explorationRewards before artifactDiscovery | Multiplicative stacking: general boost first, then specific boost |
| baseMaxDamage tracking on probes | Prevents compounding when swapping shells repeatedly |
| Starting probes get baseMaxDamage | Consistency with new probe creation paths |

## Test Results

9 new tests in `tests/probe-bonus-integration.spec.js`:
- PBON-01: dataSignalDiscovery increases signal chance
- PBON-02: signalRange increases collection range
- PBON-03: rareSignalChance shifts rarity distribution (statistical test with 10k trials)
- PBON-04: probeDurability increases maxDamage
- PBON-04: shell swap does not compound durability
- PBON-05: asteroidSurvival bonus accessible
- PBON-06/07: exploration and artifact bonuses wired
- PBON-08: exoticYield bonus accessible
- Default shell returns zero for all 8 bonus types (regression test)

## Next Phase Readiness

All 8 probe bonus types are fully wired. Remaining plans:
- 03-03: Hub bonus integration (researchSpeed)
- 03-04: Mining station bonus integration (miningEfficiency, shuttleSpeed, probethiumRate)
- 03-05: UI display of active bonuses
