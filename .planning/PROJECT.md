# Probetheus

## What This Is

A browser-based space exploration game where players deploy probes to explore sectors, collect resources (minerals, data, artifacts), build hubs and mining stations, research upgrades, and interact with Remnant NPCs. Built with vanilla JavaScript and HTML5 Canvas.

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

### Active

<!-- Current scope. Building toward these. -->

- [ ] All 12 shell bonus types functional in gameplay (per-entity)
- [ ] Bonus tooltips visible on hover in shell selection and detail panels
- [ ] Bonuses apply to probes, hubs, and mining stations

### Out of Scope

- Hub/mining station shell visuals — deferred tech debt from v1.1
- Remnants story Phase 2 — separate milestone
- Signal distribution system — separate milestone
- Equipment slot upgrade to 3 slots via research — separate milestone

## Context

- ShellSystem.js has complete bonus infrastructure: definitions, calculation methods (`getTotalBonuses`, `getBonus`, `applyBonus`), display helpers
- 12 bonus types defined with labels, units, and icons
- ~40 shells have bonuses, ~10 are cosmetic-only
- Bonus calculation methods exist but are never called by game systems
- Per-entity model: each shell's bonus only affects the entity it's equipped on

## Constraints

- **Tech stack**: Vanilla JS, HTML5 Canvas, no frameworks — consistency with existing codebase
- **Testing**: Playwright tests required for all new features (per CLAUDE.md)
- **Compatibility**: Must not break existing save files

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Per-entity bonuses (not global stacking) | Intuitive — each entity's shell affects only itself | — Pending |
| All 12 bonus types in scope | Complete the system rather than partial implementation | — Pending |
| All entity types (probe, hub, station) | Consistent experience across all shell-equippable entities | — Pending |

---
*Last updated: 2026-01-28 after milestone v1.2 initialization*
