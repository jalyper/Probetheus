# Probetheus

## What This Is

A browser-based space exploration game where players deploy probes to explore sectors, collect resources (minerals, data, artifacts), build hubs and mining stations, research upgrades, and interact with Remnant NPCs. Sectors have unique exclusive signal types with distinct visuals and enhanced rewards, resource profiles that influence mining and signal quality, and probethium synthesis for late-game progression. Equipped shells provide cosmetic visuals and gameplay bonuses to probes, hubs, and mining stations. Built with vanilla JavaScript and HTML5 Canvas.

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
- ✓ Sector-specific exclusive signal types (Ore Vein, Data Cache, Relic, Exotic Crystal) — v1.3
- ✓ Distinct visuals with unique colors and particle effects per exclusive type — v1.3
- ✓ Enhanced rewards: 2x yields, rarity gating, exotic mineral paths — v1.3
- ✓ Sector resource profiles with distance-weighted richness — v1.3
- ✓ Mining stations produce sector specialty resource — v1.3
- ✓ Probethium synthesis via hub (research-gated, batch conversion, animation) — v1.3
- ✓ Discovery reveal modal (Sector Survey Report with 8 sections) — v1.3
- ✓ Shell bonuses apply to exclusive signal generation and collection — v1.3
- ✓ 45 integration tests validating progression, happy path, and statistical distributions — v1.3

### Active

<!-- Current scope. Building toward these. -->

## Current Milestone: v1.4 Hub Upgrades & Equipment Completion

**Goal:** Complete the two partially-built progression systems so the mid-game has depth and meaningful upgrade choices.

**Target features:**
- Hub Shuttle Capacity upgrade (3→6) with research gate
- Hub Probe Capacity upgrade (5→8) with research gate
- Hub Probe Range upgrade (+50%) with research gate
- "Upgrade Hub" UI (button + modal showing tiers, costs, current level)
- 3rd equipment slot unlockable via research
- Playwright tests for all new features

### Out of Scope

- Hub/mining station shell visuals — deferred tech debt from v1.1
- Remnants story Phase 2 — separate milestone
- Equipment slot upgrade to 3 slots via research — separate milestone
- Cross-sector synergies — high complexity, defer to future
- Sector streak bonuses — conflicts with "focus on feel" constraint

## Context

- Shipped v1.3 with sector-specific signals, resource profiles, probethium synthesis, and discovery UI
- 56 files modified in v1.3 milestone (27,253 lines added)
- Tech stack: Vanilla JS, HTML5 Canvas, no frameworks
- 30+ test files with 200+ Playwright tests covering all game systems
- Asteroidz Hazard Fields sketched as potential v1.4 (HAZ-01 through HAZ-05 in v1.3 requirements archive)

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
| Extension pattern for v1.3 (not new systems) | 95% infrastructure exists, add conditional logic | ✓ Good |
| 22.5% exclusive spawn rate | 15-30% range with shell bonus headroom | ✓ Good |
| Exclusive 2x multiplier (not additive) | Cleaner reward curve for ore_vein/data_cache | ✓ Good |
| Resource profiles on discovery | Distance-weighted RNG for progression feel | ✓ Good |
| Probethium synthesis batch processing | All available batches at once (not one-at-a-time) | ✓ Good |
| Programmatic sector creation in tests | Deterministic control, no RNG flakiness | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-04 after v1.4 milestone started*
