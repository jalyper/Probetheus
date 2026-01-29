# Project State

## Current Position

**Milestone:** v1.2 Shell Bonuses & Effects
**Phase:** 4 - Bonus UI & Integration
**Plan:** 02 of 4
**Status:** In progress
**Last activity:** 2026-01-29 -- Completed 04-02-PLAN.md (Shell Indicators)
**Next Milestone:** -

Progress: [############  ] Phase 4: 2/4 plans complete (18/25 requirements)

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Players explore, expand, and upgrade through satisfying resource collection and progression loops
**Current focus:** Wire shell bonuses into gameplay systems so equipped shells affect entity behavior

## Completed Milestones

- **v1.1 Shell Visuals & Cosmetics** (2026-01-27) - 2 phases, 6 tasks

## Accumulated Context

### Technical Context
- Shell system exists in `src/ShellSystem.js` with 50+ shell definitions
- `buildCosmeticFromShell()` converts shell.visual to probe.cosmetic format
- Probes visually change when shells are equipped (color, trail, glow)
- Canvas shadowBlur used for glow effect with blur radius 12
- Trail config varies with glow: width 4/3, opacity 0.95/0.9
- shellId persists in SaveManager probe serialization
- refreshProbeCosmetic() called after probe restore in SaveManager
- All ~40 shell bonus values normalized to rarity scale (10/15/20/25 primary, 5/8/10/12 secondary)
- `getEntityBonus(category, entity, bonusType)` resolves per-entity bonuses (probes via shellId, hubs/stations via category)
- `applyBonusMultiplier(baseValue, bonusPercent)` utility for consistent bonus math
- Hub shells only have researchSpeed bonus; mining station shells only have miningEfficiency/shuttleSpeed/probethiumRate
- Probe shells do not have researchSpeed or probethiumRate
- Per-entity bonus model: each shell only affects the entity it is equipped on
- All 8 probe bonus types wired into ProbeManager.js via getEntityBonus()
- Probes store `baseMaxDamage` for durability bonus recalculation on shell swap
- explorationRewards applied before artifactDiscovery for multiplicative stacking
- Starting probes in GameController.js now include damage/baseMaxDamage/cargo properties
- All 3 mining station bonuses wired: miningEfficiency (output), shuttleSpeed (movement), probethiumRate (generation)
- Hub researchSpeed bonus wired as cost reduction with `getEffectiveCost()` in ResearchManager
- Research cost reduction formula: `Math.max(1, Math.ceil(baseCost * (1 - bonus/100)))` -- minimum cost 1
- All 12 bonus types now fully functional across 3 files
- 41 shell bonus tests across 4 test files verify all bonus types + per-entity isolation
- Hub and mining station detail panels show equipped shell indicators (name, color swatch, rarity)
- Shell indicators integrate with UIManager.attachTooltipHandlers() for bonus tooltips on hover
- Shell indicator pattern: purple-themed container with 24x24 color swatch, shell name, and rarity text

### Key Files
- `src/ShellSystem.js` - Shell definitions, cosmetic bridging, equipping, bonus methods, getEntityBonus(), durability recalc on equip
- `src/SaveManager.js` - Save/load with shellId serialization
- `src/GameController.js` - Probe rendering with glow effects, starting probe creation
- `src/ProbeManager.js` - Probe collection, movement, all 8 probe bonus integration points
- `src/GameState.js` - Research tree, resource calculations, probethiumRate bonus
- `src/MiningManager.js` - Mining station and shuttle logic, miningEfficiency + shuttleSpeed bonuses
- `src/ResearchManager.js` - Research tree UI and node purchasing, researchSpeed cost reduction
- `src/DetailsPanel.js` - Entity detail panels
- `tests/shell-visuals.spec.js` - 11 tests for shell visual system
- `tests/shell-persistence.spec.js` - 4 tests for shell persistence
- `tests/shell-bonus-foundation.spec.js` - 13 tests for bonus normalization and getEntityBonus()
- `tests/probe-bonus-integration.spec.js` - 9 tests for probe bonus integration
- `tests/shell-bonus-wiring.spec.js` - 8 tests for station and hub bonus wiring
- `tests/shell-bonuses.spec.js` - 11 tests for comprehensive bonus verification and isolation

### Key Decisions
| Decision | Rationale | Milestone |
|----------|-----------|-----------|
| Trail width 4 for glow, 3 for non-glow | Visual emphasis on glow shells | v1.1 |
| Shadow blur radius 12 | Soft, non-overwhelming glow effect | v1.1 |
| Sync cosmetic update on equip | Immediate visual feedback | v1.1 |
| shellId defaults to 'default' | Backwards compatibility with old saves | v1.1 |
| refreshProbeCosmetic after full restore | Ensure probes array complete before iteration | v1.1 |
| Per-entity bonuses (not global stacking) | Intuitive -- each entity's shell affects only itself | v1.2 |
| 2-phase roadmap (gameplay then UI) | All bonus wiring is same pattern; UI depends on working bonuses | v1.2 |
| Remove researchSpeed from probe shells | Probes don't research; only hub-appropriate | v1.2 |
| Remove probethiumRate from probe shells | Probes don't mine; only station-appropriate | v1.2 |
| All hub shells get researchSpeed only | Only hub-appropriate bonus type | v1.2 |
| Station bonuses: miningEfficiency/shuttleSpeed/probethiumRate | Only station-appropriate bonus types | v1.2 |
| explorationRewards before artifactDiscovery | Multiplicative stacking: general boost then specific | v1.2 |
| baseMaxDamage tracking on probes | Prevents compounding when swapping shells | v1.2 |
| Research cost reduction: Math.max(1, Math.ceil(...)) | Conservative rounding; minimum 1 prevents free research | v1.2 |
| Strikethrough cost display when reduced | Clear bonus feedback without Phase 4 indicator UI | v1.2 |
| Shell indicators after operations sections | Visual hierarchy: operations first, cosmetics after | v1.2 |
| Tooltip attachment after button setup | Ensures DOM elements exist before attaching event handlers | v1.2 |

### Tech Debt
- Hub and mining station shells not visually applied (from v1.1)

### Blockers/Concerns
None

## Session Continuity

Last session: 2026-01-29
Stopped at: Completed 04-02-PLAN.md (Shell Indicators for Hubs & Stations)
Resume file: None
