# Probetheus

## What This Is

A browser-based space exploration game where players deploy probes to explore sectors, collect resources (minerals, data, artifacts), build hubs and mining stations, research upgrades, and interact with Remnant NPCs. Equipped shells provide cosmetic visuals and gameplay bonuses to probes, hubs, and mining stations. Built with vanilla JavaScript and HTML5 Canvas.

## Core Value

Players explore, expand, and upgrade through satisfying resource collection and progression loops.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Probe deployment, movement, and resource collection — v1.0
- ✓ Hub and mining station building — v1.0
- ✓ Research tree with upgrades — v1.0
- ✓ Equipment slot system (collectors, universal collector) — v1.0
- ✓ Tutorial system with step-based progression — v1.0
- ✓ Save/load system with migration support — v1.0
- ✓ Shell cosmetic system (50+ shells, visual effects, glow) — v1.1
- ✓ Shell persistence through save/load — v1.1
- ✓ Remnant NPC system Phase 1 (spawning, dialogue UI) — v1.0
- ✓ All 12 shell bonus types functional in gameplay (per-entity) — v1.2
- ✓ Bonus tooltips visible on hover in shell selection and detail panels — v1.2
- ✓ Bonuses apply to probes, hubs, and mining stations — v1.2

### Active

<!-- Current scope. Building toward these. -->

(Next milestone not yet planned)

### Out of Scope

- Hub/mining station shell visuals — deferred tech debt from v1.1
- Remnants story Phase 2 — separate milestone
- Signal distribution system — separate milestone
- Equipment slot upgrade to 3 slots via research — separate milestone

## Context

- ShellSystem.js has complete bonus infrastructure: definitions, calculation methods (`getTotalBonuses`, `getBonus`, `applyBonus`, `getEntityBonus`, `applyBonusMultiplier`), display helpers
- 12 bonus types defined with labels, units, and icons — all functional in gameplay
- ~40 shells have bonuses, ~10 are cosmetic-only
- Per-entity model: each shell's bonus only affects the entity it's equipped on
- Bonus values normalized to rarity scale (10/15/20/25 primary, 5/8/10/12 secondary)
- Tooltip system shows bonus info on hover across all detail panels and shell modal
- 67 shell bonus tests across 8 test files
- 181 total Playwright tests passing on Chromium

## Constraints

- **Tech stack**: Vanilla JS, HTML5 Canvas, no frameworks — consistency with existing codebase
- **Testing**: Playwright tests required for all new features (per CLAUDE.md)
- **Compatibility**: Must not break existing save files

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Per-entity bonuses (not global stacking) | Intuitive — each entity's shell affects only itself | ✓ Good |
| All 12 bonus types in scope | Complete the system rather than partial implementation | ✓ Good |
| All entity types (probe, hub, station) | Consistent experience across all shell-equippable entities | ✓ Good |
| explorationRewards before artifactDiscovery | Multiplicative stacking: general boost then specific | ✓ Good |
| baseMaxDamage tracking on probes | Prevents compounding when swapping shells | ✓ Good |
| Research cost reduction: Math.max(1, Math.ceil(...)) | Conservative rounding; minimum 1 prevents free research | ✓ Good |
| Category-appropriate bonuses only | Probes don't get researchSpeed; hubs don't get asteroidSurvival | ✓ Good |
| 300ms tooltip delay | Standard UX pattern prevents accidental tooltips | ✓ Good |

---
*Last updated: 2026-02-02 after v1.2 milestone*
