---
phase: 03-bonus-gameplay
plan: 01
subsystem: shell-bonuses
tags: [shell-system, bonus-normalization, per-entity-bonus]

dependency-graph:
  requires: []
  provides: [normalized-shell-catalog, getEntityBonus-method, applyBonusMultiplier-method]
  affects: [03-02, 03-03, 03-04, 03-05]

tech-stack:
  added: []
  patterns: [per-entity-bonus-resolution, rarity-scale-normalization]

file-tracking:
  key-files:
    created:
      - tests/shell-bonus-foundation.spec.js
    modified:
      - src/ShellSystem.js

decisions:
  - id: probe-shells-no-researchSpeed
    choice: "Remove researchSpeed from all Keth-Varn probe shells"
    rationale: "Probes don't research; researchSpeed only makes sense on hubs"
  - id: probe-shells-no-probethiumRate
    choice: "Remove probethiumRate from all Null probe shells"
    rationale: "Probes don't mine probethium; probethiumRate only applies to mining stations"
  - id: hub-shells-researchSpeed-only
    choice: "All hub shells have researchSpeed as their only bonus"
    rationale: "Only hub-appropriate bonus type; hubs don't move, mine, or take damage"
  - id: station-bonuses-normalized
    choice: "Mining station shells use miningEfficiency, shuttleSpeed, probethiumRate only"
    rationale: "Removed probe-only bonuses (asteroidSurvival, explorationRewards, exoticYield)"

metrics:
  tasks: 2/2
  tests-added: 13
  tests-passing: 13
  duration: ~10min
  completed: 2026-01-28
---

# Phase 3 Plan 1: Shell Bonus Foundation Summary

Normalized all ~40 shell bonus values to the rarity scale and added per-entity bonus resolver methods to ShellSystem.

## What Was Done

### Task 1: Normalize Shell Bonus Values
Updated every shell definition in SHELL_CATALOG to match the rarity scale:
- **Primary bonus:** Common=0, Uncommon=10, Rare=15, Epic=20, Legendary=25
- **Secondary bonus:** Common=0, Uncommon=5, Rare=8, Epic=10, Legendary=12

Cleaned mismatched bonuses by entity category:
- **Probe shells:** Removed `researchSpeed` from Keth-Varn probes (4 shells), removed `probethiumRate` from Null probes (3 shells). Keth-Varn probes now have `dataSignalDiscovery` only, Null probes have `exoticYield` only.
- **Hub shells:** Replaced ALL bonuses with `researchSpeed` only (10 shells). Removed probe-only bonuses like `probeDurability`, `signalRange`, `artifactDiscovery`, `exoticYield`.
- **Mining station shells:** Replaced mismatched bonuses with `miningEfficiency`, `shuttleSpeed`, `probethiumRate` (8 shells). Removed `researchSpeed`, `asteroidSurvival`, `artifactDiscovery`, `explorationRewards`, `exoticYield`.

### Task 2: Add getEntityBonus() and applyBonusMultiplier()
Added two new methods to ShellSystem class:
- `getEntityBonus(category, entity, bonusType)` - Per-entity bonus resolver. Probes use `probe.shellId`, hubs/stations use category-level `cosmetics.equippedShells[category]`.
- `applyBonusMultiplier(baseValue, bonusPercent)` - Utility for `baseValue * (1 + bonusPercent / 100)`.

Existing methods (`getTotalBonuses`, `getBonus`, `applyBonus`) left intact.

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Remove researchSpeed from probe shells | Probes don't research; only hub-appropriate |
| Remove probethiumRate from probe shells | Probes don't mine; only station-appropriate |
| All hub shells get researchSpeed only | Only hub-appropriate bonus type |
| Station bonuses: miningEfficiency/shuttleSpeed/probethiumRate | Only station-appropriate bonus types |

## Test Results

13 new tests in `tests/shell-bonus-foundation.spec.js`:
- 5 normalization validation tests (rarity scale, no mismatched bonuses per category)
- 6 getEntityBonus() tests (existence, default=0, equipped probe, per-entity isolation, hub category, station category)
- 2 applyBonusMultiplier() tests (existence, correct math)

All 12 existing shell-system tests continue to pass.

## Next Phase Readiness

This plan provides the foundation for all subsequent bonus wiring plans:
- `getEntityBonus()` is the single method all integration points should use
- `applyBonusMultiplier()` provides consistent bonus math
- All bonus values are normalized so integration points can rely on predictable scales
