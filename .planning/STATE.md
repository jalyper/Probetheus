# Project State

## Current Position

**Milestone:** v1.2 Shell Bonuses & Effects
**Phase:** Not started (defining requirements)
**Plan:** -
**Status:** Defining requirements
**Last activity:** 2026-01-28 — Milestone v1.2 started
**Next Milestone:** -

Progress: Ready for new milestone

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-28)

**Core value:** Players explore, expand, and upgrade through satisfying resource collection and progression loops
**Current focus:** Defining requirements for v1.2

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
- ShellSystem has bonus calculation methods (getTotalBonuses, getBonus, applyBonus) but they are never called
- 12 bonus types defined, ~40 shells have bonuses

### Key Files
- `src/ShellSystem.js` - Shell definitions, cosmetic bridging, equipping, bonus methods
- `src/SaveManager.js` - Save/load with shellId serialization
- `src/GameController.js` - Probe rendering with glow effects
- `src/ProbeManager.js` - Probe collection and movement logic
- `src/GameState.js` - Research tree, resource calculations
- `tests/shell-visuals.spec.js` - 11 tests for shell visual system
- `tests/shell-persistence.spec.js` - 4 tests for shell persistence

### Key Decisions
| Decision | Rationale | Milestone |
|----------|-----------|-----------|
| Trail width 4 for glow, 3 for non-glow | Visual emphasis on glow shells | v1.1 |
| Shadow blur radius 12 | Soft, non-overwhelming glow effect | v1.1 |
| Sync cosmetic update on equip | Immediate visual feedback | v1.1 |
| shellId defaults to 'default' | Backwards compatibility with old saves | v1.1 |
| refreshProbeCosmetic after full restore | Ensure probes array complete before iteration | v1.1 |
| Per-entity bonuses (not global stacking) | Intuitive — each entity's shell affects only itself | v1.2 |

### Tech Debt
- Hub and mining station shells not visually applied (from v1.1)

### Blockers/Concerns
None

## Session Continuity

Last session: 2026-01-28
Stopped at: Defining requirements for v1.2
Resume file: None
