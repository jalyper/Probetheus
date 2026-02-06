# Roadmap: v1.3 Signal Distribution System

**Project:** Probetheus
**Milestone:** v1.3 Signal Distribution System
**Phases:** 7 (Phase 5 through Phase 10, plus Phase 8.5)
**Requirements:** 35 total
**Status:** Phase 8.5 complete, Phase 9 planned

## Overview

This milestone adds sector-specific signal types that are exclusive to designated sector categories (Resource-Rich, Data Haven, Ancient, Asteroid Field). Each sector type spawns unique signals with distinct visuals, enhanced rewards, and behaviors that encourage strategic exploration. The feature extends existing signal generation, rendering, and reward systems through additive patterns rather than architectural changes.

## Phase Structure

### Phase 5: Signal Type System
**Goal:** Exclusive signal types spawn correctly in their designated sectors

**Dependencies:** None (foundation)

**Requirements:** SIG-01, SIG-02, SIG-03, SIG-04, SIG-05, SIG-06, SIG-07

**Plans:** 2 plans
- [x] 05-01-PLAN.md — Add exclusive signal definitions and extend generation logic
- [x] 05-02-PLAN.md — Create Playwright test suite for spawning and collection

**Success Criteria:**
1. Resource-Rich sectors spawn "Ore Vein" signals at 15-30% rate (not found elsewhere)
2. Data Haven sectors spawn "Data Cache" signals at 15-30% rate (not found elsewhere)
3. Ancient sectors spawn "Relic" signals at 15-30% rate (not found elsewhere)
4. Asteroid Field sectors spawn "Exotic Crystal" signals at 15-30% rate (not found elsewhere)
5. Standard sectors continue spawning mixed/mineral/data/artifact signals (no exclusive type)
6. Shell bonuses (dataSignalDiscovery, signalRange, rareSignalChance) affect exclusive signal generation and rarity

**Implementation Notes:**
- Add `exclusiveSignalType` field to sector type definitions in SectorManager.js
- Extend ProbeManager.determineSignalType() with conditional check for exclusive types before fallback
- Map exclusive types to base collection categories (Ore Vein → minerals, Data Cache → data, Relic → artifacts, Exotic Crystal → mixed)
- Use existing rarity system (common/uncommon/rare/epic/legendary) for all exclusive types
- Cache sector lookups to prevent performance degradation with 20+ probes

---

### Phase 6: Visual Rendering
**Goal:** Exclusive signals are instantly recognizable through distinct visual theming

**Dependencies:** Phase 5 (signals must spawn before they can be rendered) - COMPLETE

**Requirements:** VIS-01, VIS-02, VIS-03, VIS-04, VIS-05

**Plans:** 1 plan
- [x] 06-01-PLAN.md — Add exclusive signal colors, particle effects, duration override, and tests

**Success Criteria:**
1. Ore Vein signals display orange color scheme with radiating line particle effects
2. Data Cache signals display cyan color scheme with rotating hexagon particle effects
3. Relic signals display gold color scheme with orbiting dust particle effects
4. Exotic Crystal signals display rainbow/prismatic color scheme with crystal facet particle effects
5. Exclusive signals remain visible for 5-8 seconds (longer than standard 2-6 second signals)

**Implementation Notes:**
- Add switch cases for exclusive types in GameController.renderSignals()
- Use 60+ degree hue separation between colors for colorblind accessibility
- Particle effects conditional on signal count <50 to maintain performance
- Test rendering at 45+ FPS with mixed signal types on screen
- All exclusive types gracefully degrade to default rendering if visuals fail

---

### Phase 7: Signal Rewards
**Goal:** Exclusive signals provide meaningful reward advantages over standard signals

**Dependencies:** Phase 5 (reward logic needs signal types defined)

**Requirements:** REW-01, REW-02, REW-03, REW-04

**Plans:** 1 plan
- [x] 07-01-PLAN.md — Add exclusive signal reward bonuses, relic rarity gating, and tests

**Success Criteria:**
1. Ore Vein signals yield 2x minerals compared to standard mineral signals on exploration
2. Data Cache signals yield 2x data compared to standard data signals on exploration
3. Relic signals guarantee rare+ artifacts (no common artifacts) on exploration
4. Exotic Crystal signals yield exotic minerals OR all three basic resources at once on exploration

**Implementation Notes:**
- Add exclusive type cases to GameController.explore() reward calculation
- Stack multipliers: shell bonuses (explorationRewards, artifactDiscovery) → signal type bonuses → planet type bonuses
- Exotic Crystal logic: 60% chance exotic minerals (existing system), 40% chance mixed reward (minerals + data + artifacts)
- Relic rarity gating: filter artifact rewards to exclude common tier, redistribute probability to uncommon+
- Track resource gain rates by sector type during testing for economy balance

---

### Phase 8: Sector Resource Profiles
**Goal:** Each sector has unique resource richness that influences signal quality, and mining stations mine the sector's specialty resource

**Dependencies:** Phase 5 (profile system affects signal spawn rates)

**Requirements:** PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06

**Plans:** 3 plans
- [x] 08-01-PLAN.md — Add resource profile assignment with distance-weighted RNG and spawn rate multipliers
- [x] 08-02-PLAN.md — Rework mining station output based on sector profile and update station UI
- [x] 08-03-PLAN.md — Playwright tests for PROF-01 through PROF-06

**Success Criteria:**
1. Each sector receives a randomized resource profile on discovery (mineral-rich, data-rich, artifact-rich, probethium-rich, or balanced) with spawn rate multipliers
2. Resource profile determines base signal spawn rate and rare signal frequency in that sector
3. Sectors farther from starting hub have higher chance of richer profiles (distance-weighted RNG)
4. Low-probability lucky discoveries allow probethium-rich sectors very early in game (1-5% chance within first 10 sectors)
5. Mining stations mine the sector's specialty resource (mineral-rich → minerals, data-rich → data, probethium-rich → probethium)
6. Probethium-rich sectors are rare and the only way to directly mine probethium

**Implementation Notes:**
- Add `resourceProfile` field to sector state with specialty type and richness multiplier
- Generate profile on sector discovery in SectorManager.initializeSector()
- Distance-weighted RNG for profile assignment (farther = richer, with outlier chance)
- Rework MiningManager to check sector profile and produce the specialty resource
- Probethium-rich sectors are rare (~5-10% of sectors); finding one is a major discovery
- Persist resource profile through save/load in SaveManager
- Display profile in sector discovery modal and sector tooltip

---

### Phase 8.5: Probethium Synthesis
**Goal:** Players can synthesize probethium at hubs using exotic materials, providing an alternative to finding rare probethium-rich sectors

**Dependencies:** Phase 8 (synthesis is the alternative path when mining isn't available)

**Requirements:** SYNTH-01, SYNTH-02, SYNTH-03, SYNTH-04

**Plans:** 2 plans
- [x] 085-01-PLAN.md — Research node, hub button, conversion logic, and 3-second canvas animation
- [x] 085-02-PLAN.md — Playwright tests for SYNTH-01 through SYNTH-04

**Success Criteria:**
1. Hub menu has "Synthesize Probethium" button that converts exotic materials to probethium
2. Synthesis ability is unlocked via a research node
3. Hub plays a visual synthesis animation when converting exotics to probethium
4. Synthesis provides a viable alternative probethium source for players who haven't found probethium-rich sectors

**Implementation Notes:**
- Research node `probethium_synthesis` in alien tech tree (parent: alien_tech, cost: 3)
- Flat rate conversion: 5 exotic minerals = 0.001 probethium per batch
- Button hidden until researched; disabled when < 5 exotics
- 3-second canvas animation: purple charge-up, white-gold flash with screen shake, golden release
- Animation queue for sequential playback (no overlapping)
- New file: src/SynthesisAnimationManager.js

---

### Phase 9: Discovery Reveal
**Goal:** Players immediately understand sector specialization through discovery UI

**Dependencies:** Phase 5 (UI displays exclusive signal types), Phase 8 (UI displays resource profiles)

**Requirements:** DISC-01, DISC-02, DISC-03, DISC-04

**Plans:** 2 plans
- [ ] 09-01-PLAN.md — Rewrite discovery modal into Sector Survey Report with 8 sections and exclusive signal spawning
- [ ] 09-02-PLAN.md — Playwright tests for DISC-01 through DISC-04

**Success Criteria:**
1. Sector discovery modal highlights exclusive signal type available in that sector (or "Balanced Signals" for Standard)
2. Discovery modal displays sector resource profile (signal richness %, probethium potential rating)
3. First discovery of a sector with exclusive signals spawns 1 guaranteed exclusive signal (epic+ rarity)
4. Standard sector discovery modal shows "Balanced exploration opportunities - all signal types available"

**Implementation Notes:**
- Extend SectorManager.showSectorDiscovery() with exclusive signal notification section
- Add resource profile summary: "Signal Richness: High (1.3x spawn rate)", "Probethium Potential: Moderate (1.2x)"
- Use color coding for richness (red = poor, yellow = standard, green = rich)
- Spawn guaranteed exclusive signal in SectorManager.spawnDiscoveryBonusSignals() if sector has exclusiveSignalType
- Discovery bonus exclusive signals use epic or legendary rarity (not common)
- Add tutorial step for first non-Standard sector discovery explaining specialization strategy

---

### Phase 10: Testing & Integration
**Goal:** All exclusive signal features verified through automated tests

**Dependencies:** Phases 5-9 (tests validate implementation)

**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04, TEST-05

**Plans:** 0 plans

**Success Criteria:**
1. Playwright tests confirm exclusive signals spawn only in their designated sector types (not in other sectors)
2. Tests verify shell bonuses (dataSignalDiscovery, rareSignalChance, explorationRewards) apply correctly to exclusive signals
3. Tests validate discovery reveal modal displays correct exclusive signal info and resource profile
4. Tests confirm sector resource profiles persist through save/load cycle
5. Statistical tests verify distance-based richness produces expected distribution over 100+ sectors

**Implementation Notes:**
- New test file: `tests/sector-exclusive-signals.spec.js`
- Test save compatibility: load pre-v1.3 saves, verify no errors on signals without new properties
- Test auto-collection: verify equipment (mineral/data/artifact collectors) auto-collects exclusive types via base type mapping
- Performance test: 20 probes in mixed sectors maintains 45+ FPS
- Spawn rate validation: generate 1000 signals, verify 15-30% exclusive rate in home sectors
- Distance distribution test: create 100 sectors at varying distances, verify richness correlation
- Regression tests: existing signal types (mineral, data, artifact, mixed) continue working unchanged

---

## Progress Tracking

| Phase | Requirements | Plans | Status | Completion |
|-------|--------------|-------|--------|------------|
| Phase 5: Signal Type System | 7 | 2 | Complete | 100% |
| Phase 6: Visual Rendering | 5 | 1 | Complete | 100% |
| Phase 7: Signal Rewards | 4 | 1 | Complete | 100% |
| Phase 8: Sector Resource Profiles | 6 | 3 | Complete | 100% |
| Phase 8.5: Probethium Synthesis | 4 | 2 | Complete | 100% |
| Phase 9: Discovery Reveal | 4 | 2 | Planned | 0% |
| Phase 10: Testing & Integration | 5 | 0 | Pending | 0% |

**Total Requirements:** 35
**Completed:** 26
**Remaining:** 9

## Coverage Map

| Requirement | Phase | Status |
|-------------|-------|--------|
| SIG-01 | Phase 5 | Complete |
| SIG-02 | Phase 5 | Complete |
| SIG-03 | Phase 5 | Complete |
| SIG-04 | Phase 5 | Complete |
| SIG-05 | Phase 5 | Complete |
| SIG-06 | Phase 5 | Complete |
| SIG-07 | Phase 5 | Complete |
| VIS-01 | Phase 6 | Complete |
| VIS-02 | Phase 6 | Complete |
| VIS-03 | Phase 6 | Complete |
| VIS-04 | Phase 6 | Complete |
| VIS-05 | Phase 6 | Complete |
| REW-01 | Phase 7 | Complete |
| REW-02 | Phase 7 | Complete |
| REW-03 | Phase 7 | Complete |
| REW-04 | Phase 7 | Complete |
| PROF-01 | Phase 8 | Complete |
| PROF-02 | Phase 8 | Complete |
| PROF-03 | Phase 8 | Complete |
| PROF-04 | Phase 8 | Complete |
| PROF-05 | Phase 8 | Complete |
| PROF-06 | Phase 8 | Complete |
| SYNTH-01 | Phase 8.5 | Complete |
| SYNTH-02 | Phase 8.5 | Complete |
| SYNTH-03 | Phase 8.5 | Complete |
| SYNTH-04 | Phase 8.5 | Complete |
| DISC-01 | Phase 9 | Pending |
| DISC-02 | Phase 9 | Pending |
| DISC-03 | Phase 9 | Pending |
| DISC-04 | Phase 9 | Pending |
| TEST-01 | Phase 10 | Pending |
| TEST-02 | Phase 10 | Pending |
| TEST-03 | Phase 10 | Pending |
| TEST-04 | Phase 10 | Pending |
| TEST-05 | Phase 10 | Pending |

**Coverage:** 35/35 requirements mapped (100%)

## Architecture Summary

**Extension Points:**
- ProbeManager.determineSignalType() - Add exclusive type conditional check
- GameController.renderSignals() - Add exclusive type visual cases
- GameController.explore() - Add exclusive type reward multipliers
- SectorManager.initializeSector() - Generate resource profiles
- SectorManager.showSectorDiscovery() - Display exclusive signals and profiles
- SectorManager.spawnDiscoveryBonusSignals() - Include exclusive types

**Key Patterns:**
- Additive switch cases (no existing code paths modified)
- Optional field checks with fallbacks (backward compatible)
- Type-agnostic bonus system (shell bonuses automatically apply)
- Defensive save loading (graceful degradation for old saves)

**Performance Mitigations:**
- Cache sector lookups (1-second refresh interval)
- Conditional particle effects (only when signal count <50)
- Pre-calculated spawn tables per sector type

**Files Modified:**
- SectorManager.js (sector types, discovery UI, bonus spawning)
- ProbeManager.js (signal generation, type determination)
- GameController.js (rendering, rewards)
- SaveManager.js (resource profile persistence)
- tests/exclusive-signals.spec.js (NEW)

## Research Flags

**No deep research needed during planning.** Architecture analysis complete with HIGH confidence. All patterns established from existing codebase (EquipmentSystem, ShellSystem, signal pipeline). Extension points verified at line-level detail.

**Validation needed during implementation:**
- Phase 6: Colorblind accessibility testing for signal colors
- Phase 7: Resource gain rate tracking for economy balance
- Phase 8: Distance curve tuning based on playtesting

---

*Roadmap created: 2026-02-02*
*Phase 5 planned: 2026-02-02*
*Phase 6 planned: 2026-02-04*
*Phase 7 complete: 2026-02-05*
*Phase 8.5 added: 2026-02-05 (probethium synthesis -- mining rework + exotic material economy)*
*Phase 8 planned: 2026-02-05*
*Phase 8.5 planned: 2026-02-05*
*Phase 8.5 complete: 2026-02-06*
*Phase 9 planned: 2026-02-05*
