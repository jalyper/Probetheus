# Project State

## Current Position

**Milestone:** v1.3 Signal Distribution System
**Phase:** Phase 8 - Sector Resource Profiles (COMPLETE)
**Plan:** 03 of 03 complete
**Status:** Phase 8 complete - resource profiles, mining rework, and tests done
**Last activity:** 2026-02-06 - Completed 08-03-PLAN.md (sector profile tests)
**Next Milestone:** -

Progress: [█████████░░░░░░░░░░░] 24/35 requirements (69%)

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Players explore, expand, and upgrade through satisfying resource collection and progression loops
**Current focus:** Sector-specific signals with exclusive types, distinct visuals, and enhanced rewards

## Performance Metrics

**Current milestone (v1.3):**
- Phases: 6 (Phase 5 through Phase 10)
- Requirements: 35 total (expanded with PROF-06, SYNTH-01 through SYNTH-04)
- Completed: 24 (SIG-01 through SIG-07, VIS-01 through VIS-05, REW-01 through REW-04, PROF-01 through PROF-06)
- Remaining: 11
- Progress: 69%

**Previous milestone (v1.2):**
- Duration: ~5 days (2026-01-28 to 2026-02-02)
- Phases: 4
- Requirements: 25
- Delivery: 100%

## Completed Milestones

- **v1.2 Shell Bonuses & Effects** (2026-02-02) - 4 phases, 9 plans, 25 requirements
- **v1.1 Shell Visuals & Cosmetics** (2026-01-27) - 2 phases, 2 plans, 6 tasks

## Accumulated Context

### Current Roadmap (v1.3)

**Phase 5: Signal Type System** (7 requirements) - COMPLETE
- Goal: Exclusive signal types spawn correctly in designated sectors
- Success: Ore Vein, Data Cache, Relic, Exotic Crystal signals spawn at 15-30% rate in home sectors only
- Implementation: Add exclusiveSignalType to sector definitions, extend ProbeManager.determineSignalType()
- **Plan 05-01 COMPLETE:** Exclusive signal definitions and spawn logic implemented
- **Plan 05-02 COMPLETE:** 17 Playwright tests validating SIG-01 through SIG-07

**Phase 6: Visual Rendering** (5 requirements) - COMPLETE
- Goal: Exclusive signals instantly recognizable through distinct visuals
- Success: Orange/cyan/gold/prismatic color schemes with unique particle effects, 5-8s lifetime
- **Plan 06-01 COMPLETE:** 4 color cases, renderExclusiveParticles(), HSL gradient handling, duration override, 16 Playwright tests

**Phase 7: Signal Rewards** (4 requirements) - COMPLETE
- Goal: Exclusive signals provide meaningful reward advantages
- Success: 2x resource yields, rare+ artifact guarantees, exotic mineral options
- **Plan 07-01 COMPLETE:** Exclusive signal reward bonuses implemented, relic rarity gating, exotic crystal dual outcomes, 9 Playwright tests

**Phase 8: Sector Resource Profiles** (6 requirements) - COMPLETE
- Goal: Sectors have unique resource richness, mining stations mine sector specialty
- Success: Random profiles on discovery, distance-based richness, mining rework, probethium-rich sectors are rare
- Context: 08-CONTEXT.md captures mining station rework design decisions
- **Plan 08-01 COMPLETE:** Resource profile assignment with distance-weighted distribution (PROF-01)
- **Plan 08-02 COMPLETE:** Mining stations produce sector specialty resource (PROF-05, PROF-06)
- **Plan 08-03 COMPLETE:** 14 Playwright tests validating PROF-01 through PROF-06

**Phase 8.5: Probethium Synthesis** (4 requirements)
- Goal: Players synthesize probethium at hubs using exotic materials
- Success: Hub synthesis button, research unlock, animation, alternative probethium path

**Phase 9: Discovery Reveal** (4 requirements)
- Goal: Players understand sector specialization through discovery UI
- Success: Discovery modal highlights exclusive signals and resource profiles

**Phase 10: Testing & Integration** (5 requirements)
- Goal: All features verified through automated tests
- Success: Playwright tests for spawning, bonuses, persistence, distribution

### Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Start phases at 5 (not 1) | Continues from v1.2 Phase 4 | Applied |
| 6 phases for 30 requirements | Standard depth, natural groupings by feature area | Applied |
| Phase 5 as foundation | Signal definitions must exist before rendering/rewards | Applied |
| Extension pattern (not new systems) | 95% infrastructure exists, add conditional logic and switch cases | Applied |
| 22.5% exclusive spawn rate | Base rate targeting 15-30% range with shell bonus headroom | Validated |
| Resource profiles on discovery | Generates variety, distance-weighted RNG for progression feel | Applied |
| exotic_crystal maps to 'mixed' | Collected by universal collectors, not requiring specific equipment | Applied |
| Signals not persisted (by design) | Signals are temporary gameplay elements, not saved | Validated |
| 5-40% test tolerance for spawn rates | Accounts for RNG variance in statistical tests | Applied |
| HSL detection before gradient stops | exotic_crystal uses cycling HSL which crashes hexToRgba | Applied |
| Performance guard at 50 signals | Prevent frame drops from particle calculations | Applied |
| ctx.save()/restore() for particles | Isolated canvas state prevents rendering artifacts | Applied |
| Exclusive 2x multiplier (not additive) | ore_vein replaces mineral bonus (cleaner reward curve) | Applied |
| Relic minimum uncommon (not rare) | Prevents worthless drops while maintaining rarity spectrum | Applied |
| Exotic Crystal 60/40 split | 60% enhanced exotics maintains scarcity, 40% mixed provides variety | Applied |
| Secondary rewards with variance | Consistency with primary reward calculation (base + 0-100% random) | Applied |
| Balanced sector output | 0.3x mixed resources maintains usefulness without being optimal | Applied |
| Old saves default probethium | Backward compatibility for saves without sector profiles | Applied |
| Profiles independent from types | Resource-Rich sector can be data-rich profile (maximizes variety) | Applied |
| Distance-weighted profile RNG | Near origin: 60% balanced, Far out: 30% balanced (progression feel) | Applied |
| Spawn multipliers stack with bonuses | Sector multiplier * shell bonus = combined effect (multiplicative) | Applied |
| Profile serialization automatic | Spread operator in SaveManager handles resourceProfile without changes | Applied |
| Statistical test sample sizes | 200 samples for distribution, 500 for rare events (reliable RNG validation) | Applied |
| Test tolerance ranges for RNG | 40% threshold for balanced sectors (60% weight + variance) | Applied |

### Tech Debt

- Hub and mining station shells not visually applied (from v1.1)

### Blockers/Concerns

None

### Notes

- All 30 requirements mapped to phases (100% coverage)
- Research complete with HIGH confidence (no deep research needed during planning)
- Existing signal pipeline has all necessary extension points verified
- Shell bonuses automatically apply to exclusive signals (type-agnostic design)
- Save compatibility handled via defensive property checks with fallbacks
- **Plan 05-01:** Exclusive signal types now spawn in designated sectors, equipment compatibility via base type mapping
- **Plan 05-02:** 17 Playwright tests verify all Phase 5 requirements (SIG-01 through SIG-07)
- **Plan 06-01:** Distinct visuals for 4 exclusive signal types with colors, particles, HSL handling, and 5-8s duration
- **Plan 07-01:** Exclusive signal reward bonuses: 2x yields for ore_vein/data_cache/relic, exotic_crystal dual outcomes, relic rarity gating
- **Plan 08-01:** Resource profiles assigned on sector discovery with distance-weighted distribution
- **Plan 08-02:** Mining stations produce sector specialty (minerals/data/artifacts/probethium/mixed), UI shows output type
- **Plan 08-03:** 14 Playwright tests validate all Phase 8 requirements (PROF-01 through PROF-06)

## Session Continuity

Last session: 2026-02-06
Stopped at: Completed 08-03-PLAN.md (Phase 8 complete)
Resume file: None

**Next steps:**
1. Begin Phase 8.5: Probethium Synthesis (4 requirements: SYNTH-01 through SYNTH-04)
2. Then Phase 9: Discovery Reveal (4 requirements)
3. Then Phase 10: Testing & Integration (5 requirements)

---

*Last updated: 2026-02-05 - Phase 8 complete, 24/35 requirements done (69%)*
