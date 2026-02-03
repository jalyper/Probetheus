# Project Research Summary

**Project:** Probetheus v1.3 - Sector-Specific Signals
**Domain:** Space exploration idle game with zone-based signal generation
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

Sector-specific signals add exclusive signal types that only spawn in designated sector types (Resource-Rich, Data Haven, Ancient, Asteroid Field). The feature differentiates zones beyond resource bonuses and creates incentives for strategic exploration. The existing Probetheus codebase already has 95% of the necessary infrastructure in place: sector-aware signal generation, type-based rendering with color theming, discovery bonus systems, and equipment-based auto-collection. This milestone extends existing patterns through data additions and conditional logic rather than introducing new architectural components.

The recommended approach: Add 1-2 exclusive signal types per sector (5-10 total new types), spawn at 15-30% rate in home sectors, use distinct visual theming with 60+ degree hue separation for accessibility, and provide 1.5x reward multipliers over standard signals to justify their rarity. No new libraries or frameworks required. The signal pipeline is type-aware but sector-agnostic, making integration straightforward through extension points already designed for this use case.

Key risks center on save compatibility (new signal types in old saves), auto-collection filtering (equipment must recognize new types as variants of base types), and performance (sector lookups per-pulse with 20+ probes). Mitigations: defensive property checks with fallbacks, map exclusive types to base collection categories (relic→artifacts), and cache sector lookups with 1-second refresh intervals. Discovery UI must clearly communicate exclusivity to avoid players perceiving new signals as mere reskins.

## Key Findings

### Recommended Stack

**Status: No new dependencies required.** All additions integrate with existing vanilla JavaScript architecture using established patterns from ShellSystem and EquipmentSystem. The signal generation pipeline (ProbeManager), rendering system (Canvas in GameController), event system (EventBus), and state management (GameState centralized store) all support the feature without modification.

**Core technologies:**
- **Vanilla JavaScript** — Signal type definitions follow EQUIPMENT_TYPES pattern (const objects + static methods)
- **HTML5 Canvas** — Signal visuals already support color/effect variations; add cases for exclusive types
- **EventBus pattern** — Discovery reveals use same emit/on pattern as existing sector discovery events

**Why this works:** The codebase already handles complex visual effects (shell trails, discovery sparkles), sector-aware generation (determineSignalType checks sector), event-driven reveals (SectorManager emits discoveries), and typed resource systems (EquipmentSystem collectionTypes). Exclusive signals are an extension of existing signal types (mineral/data/artifact/mixed/dark_market), not a new system.

### Expected Features

**Must have (table stakes):**
- **Exclusive signal types per sector** — Core promise: "Ancient sectors have relics only found there"
- **Visual distinction** — Must be instantly recognizable as sector-specific (distinct colors, unique particle effects)
- **Discovery reveal UI** — Modal shows what's special about a sector when discovered
- **Sector-appropriate theming** — Signal names/visuals match sector identity (relics in Ancient, ore veins in Resource-Rich)
- **Backward compatibility** — Existing mixed/mineral/data/artifact signals continue working unchanged

**Should have (competitive):**
- **Enhanced rewards** — Exclusive signals provide 1.5x-2x rewards vs standard signals to justify rarity
- **Tiered exclusivity** — Some signals "prefer" sectors (2x spawn rate) vs strictly exclusive (only spawn there)
- **Signal type affects exploration** — Relic signals boost artifact yield on planet exploration
- **Discovery bonus includes exclusives** — First sector discovery spawns 1 guaranteed exclusive signal

**Defer (v2+):**
- **Cross-sector synergies** — Adjacent sector combinations spawn special signals (complex, high scope)
- **Sector streak bonuses** — Discover multiple Ancient sectors → increased relic spawn chance (may conflict with progression balance)
- **Signal codex UI** — Persistent panel showing discovered signal types with stats (completionist feature, not core)

### Architecture Approach

Sector-exclusive signals integrate through extension, not modification. The existing signal pipeline has four integration points: (1) signal type determination in ProbeManager.determineSignalType() adds conditional check for sector.exclusiveSignalType field before falling back to standard distribution; (2) signal rendering in GameController.renderSignals() adds switch cases for new signal types with custom color gradients and particle effects; (3) reward calculation in GameController.explore() adds multipliers for exclusive types; (4) discovery bonus spawning in SectorManager.spawnDiscoveryBonusSignals() includes exclusive types in bonus signal lists.

**Major components:**
1. **SignalTypeDefinitions.js (NEW)** — Sector-signal mapping with spawn weights, visual configs, reward bonuses (follows EquipmentSystem.js pattern)
2. **ProbeManager.js (EXTEND)** — Add exclusive type check in determineSignalType(), map exclusives to base types for collection
3. **GameController.js (EXTEND)** — Add exclusive type cases to render switch and reward calculation
4. **SectorManager.js (EXTEND)** — Add exclusive type to discovery bonus spawning, enhance discovery modal with exclusivity notice

**Key pattern:** All changes are additive cases in existing switch statements or optional field checks. No existing code paths change behavior. Shell bonuses (dataSignalDiscovery, rareSignalChance, explorationRewards) automatically apply to exclusive signals because they're type-agnostic.

### Critical Pitfalls

1. **Save migration breaking existing signals** — Old saves have signals without new properties (sectorType, exclusiveSignalType). Code assumes all signals have properties, causing undefined errors on load. **Prevention:** Defensive checks with fallbacks (`signal.sectorType === 'Ancient' || (!signal.sectorType && signal.signalType === 'artifact')`) and test loading pre-feature saves.

2. **Auto-collection ignoring exclusive signals** — Equipment filters by collectionTypes: ['minerals', 'data', 'artifacts']. New signal types (relic, crystalline, dataCache) don't match, probes ignore them. **Prevention:** Map exclusive types to base types (relic→artifacts, crystalline→minerals) and update collection logic to check base type.

3. **Rarity and sector-type conflicts** — System has BOTH signal type (mineral/data) AND sector type (Ancient/Resource-Rich). Without clear spawn architecture, exclusive signals spawn everywhere or dilute normal signals. **Prevention:** Separate spawn pools with explicit priority (dark_market > sector_exclusive > standard) and clear naming (relic, crystalline vs mineral, data).

4. **Discovery modal showing wrong specialty** — Modal says "60% artifact bonus" but doesn't explain relics are EXCLUSIVE and MORE valuable. Players think exclusives are reskins. **Prevention:** Update modal to highlight exclusive signals ("Relic signals only spawn here! +50% artifact rewards") and spawn 1 guaranteed exclusive on discovery.

5. **Performance degradation from sector checks** — Adding per-pulse sector lookups (getCurrentSector → Map lookup × 20 probes × 60fps) creates hotspot. **Prevention:** Cache sector lookups per-probe with 1-second refresh, pre-calculate spawn tables per sector type (SPAWN_TABLES lookup instead of complex logic).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation & Data Definitions
**Rationale:** Establishes data model and spawn architecture without affecting existing behavior. Critical to resolve spawn pool conflicts (exclusive vs normal signals) and define collection type mapping before implementation.

**Delivers:**
- Signal type definitions file (SignalTypeDefinitions.js) with 5-10 exclusive types
- Sector type definitions updated with exclusiveSignalType fields
- Spawn architecture documented (priority: dark_market > exclusive > standard)
- Collection type mapping (relic→artifacts, crystalline→minerals, etc.)

**Addresses:**
- Table stakes: Exclusive signal types per sector
- Pitfall #2: Rarity/sector-type conflicts (define spawn pools)
- Pitfall #3: Auto-collection ignoring exclusives (define type mapping)

**Avoids:** Starting implementation before architectural decisions made (would cause rewrites)

**Research flag:** Skip detailed research — patterns established from STACK.md and ARCHITECTURE.md. Standard extension of existing signal types.

---

### Phase 2: Signal Generation & Collection
**Rationale:** Enables exclusive signals to spawn and be collected. Rendering falls back to default colors gracefully, allowing validation of spawn rates and collection logic before visual polish.

**Delivers:**
- ProbeManager.determineSignalType() checks exclusiveSignalType before standard distribution
- ProbeManager.autoCollectSignals() uses base type mapping for equipment filtering
- SectorManager.spawnDiscoveryBonusSignals() includes exclusive types in bonus lists
- Sector lookup caching to prevent performance issues
- Save migration logic with defensive checks

**Addresses:**
- Table stakes: Signal spawn weighting, backward compatibility
- Pitfall #1: Save migration breaking signals
- Pitfall #5: Performance degradation

**Tests:**
- Exclusive signals spawn at expected rates (15-30% in home sectors)
- Auto-collection works with all equipment types
- Old saves load without errors
- Performance: <5% FPS regression with 20 probes

**Research flag:** Skip detailed research — implementation patterns clear from ARCHITECTURE.md integration points.

---

### Phase 3: Visual Rendering & Distinction
**Rationale:** Makes exclusive signals visually distinct so players recognize sector identity. Separate from generation allows spawn logic validation first, then layer on visuals.

**Delivers:**
- GameController.renderSignals() cases for each exclusive type with distinct colors
- Color palette with 60+ degree hue separation for accessibility
- Particle effects (optional, conditional on signal count <50)
- Visual distinction for discovery bonus signals (enhanced sparkles)

**Addresses:**
- Table stakes: Visual distinction
- Pitfall #6: Inconsistent visual coding
- Feature: Signal rarity influenced by sector danger (visual cues)

**Tests:**
- Exclusive signals render with correct colors
- Colorblind accessibility (test in monochrome)
- Performance: particle effects maintain 45+ FPS
- Signals distinguishable at a glance

**Research flag:** Consider research-phase for accessibility patterns if team lacks colorblind design experience. Otherwise skip — canvas rendering patterns established.

---

### Phase 4: Discovery UI & Rewards
**Rationale:** Communicates exclusivity to players and differentiates exclusive signals mechanically. Discovery reveal is the "teaching moment" for sector specialization.

**Delivers:**
- SectorManager.showSectorDiscovery() highlights exclusive signals in modal
- GameController.explore() reward multipliers for exclusive types (1.5x-2x)
- Discovery bonus spawns 1 guaranteed exclusive signal
- Message queue to prevent modal overload

**Addresses:**
- Table stakes: Discovery reveal UI, sector-appropriate theming
- Pitfall #4: Discovery modal showing wrong specialty
- Pitfall #7: Sector discovery message overload
- Pitfall #8: Forgetting reward calculations

**Tests:**
- Discovery modal shows exclusive signal types
- Exclusive signals award expected rewards (1.5x multiplier)
- Discovery bonus includes exclusive signal
- Players understand sector specialization (user testing)

**Research flag:** Skip research — UI patterns and reward calculation logic established.

---

### Phase 5: Tutorial & Polish
**Rationale:** Ensures players understand sector specialization strategy. Polish addresses edge cases discovered during testing.

**Delivers:**
- Tutorial step: "Sector specialization" (first non-Standard sector)
- Tutorial step: First exclusive signal collection
- Visual feedback for incompatible collectors (dimmed signals, tooltips)
- Bounds checking for signals spawning at sector borders

**Addresses:**
- Pitfall #9: Tutorial doesn't teach sector specialization
- Pitfall #10: Signals spawning at sector borders
- Pitfall #11: No feedback for incompatible collectors
- Pitfall #12: Signals despawn during discovery modal

**Tests:**
- Tutorial triggers on first exclusive discovery
- Signals spawn within sector bounds
- Incompatible signals show visual cue
- Discovery bonus signals don't despawn during modal

**Research flag:** Skip research — tutorial patterns established in TutorialManager.js, polish follows standard testing/feedback cycle.

---

### Phase Ordering Rationale

- **Phase 1 first** because architectural decisions (spawn pools, type mapping) must be resolved before code is written. Starting implementation without this causes rewrites when conflicts emerge.
- **Phase 2 before Phase 3** because validating spawn rates and collection logic is easier without visual complexity. If visuals are implemented first, bugs in spawn logic are harder to diagnose.
- **Phase 4 after Phase 2** because discovery UI should reference tested spawn behavior. Reward multipliers need baseline collection working to validate economy balance.
- **Phase 5 last** because tutorial content requires understanding final feature behavior. Polish addresses edge cases discovered during Phase 2-4 testing.

This order follows established patterns from existing milestone completion (Equipment Slots, Shell System, Tutorial System) which succeeded by defining data models first, implementing core logic second, adding visuals third, and polishing UI/UX last.

### Research Flags

**Phases needing research during planning:**
- **None** — All patterns established from codebase analysis. Signal generation, rendering, collection, and discovery systems have clear extension points documented in ARCHITECTURE.md.

**Phases with standard patterns (skip research-phase):**
- **All phases** — Vanilla JS signal extensions follow proven EquipmentSystem/ShellSystem patterns. Canvas rendering uses existing color theming. EventBus integration matches sector discovery. No novel architectural components or unfamiliar libraries.

**Validation needed during implementation:**
- **Phase 2:** Spawn rate tuning (15-30% target may need adjustment based on playtesting)
- **Phase 3:** Color palette accessibility (test with colorblind simulator)
- **Phase 4:** Reward economy balance (track resource gain rates per sector type)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | No new dependencies. All additions use existing vanilla JS patterns verified in codebase. |
| Features | **HIGH** | Table stakes identified from established roguelike/idle game patterns. Feature dependencies mapped to existing systems. |
| Architecture | **HIGH** | Integration points verified in codebase. ProbeManager (lines 484-522, 577-619), GameController (lines 3130-3280), SectorManager (lines 107-150, 510-582) all have extension points. |
| Pitfalls | **HIGH** | Critical pitfalls derived from codebase analysis (save system, equipment filters, sector lookups). Phase-specific warnings mapped to implementation order. |

**Overall confidence:** HIGH

All research based on direct codebase analysis with file paths and line numbers verified. No speculation about external libraries or unfamiliar patterns. Existing systems (signal generation, sector discovery, equipment collection, shell bonuses) provide 95% of needed functionality. Feature scope clear from domain analysis of zone-specific loot systems in roguelikes/idle games.

### Gaps to Address

**Spawn rate tuning:** Research recommends 15-30% exclusive signal spawn rate in home sectors, but optimal rate requires playtesting. Initial implementation should use 20% as baseline, then adjust based on player feedback.

**Color palette accessibility:** Visual distinction critical for feature success. Research identifies 60+ degree hue separation as minimum for colorblind accessibility, but actual palette needs testing with colorblind simulator tools. Phase 3 should include accessibility validation before sign-off.

**Reward economy balance:** Exclusive signals recommended at 1.5x-2x rewards vs standard signals to justify rarity. Research suggests tracking resource gain per hour by sector type during Phase 4 playtesting. If variance exceeds 50%, economy needs rebalancing.

**Tutorial effectiveness:** Phase 5 tutorial content assumes sector specialization is non-obvious to players. Gap: No user research validates this assumption. Consider lightweight user testing (5 players) before finalizing tutorial steps. If players naturally understand exclusivity from discovery modal, tutorial may be unnecessary.

**Shell bonus interactions:** Research identifies shell bonuses (rareSignalChance, dataSignalDiscovery, explorationRewards) as type-agnostic and automatically applying to exclusive signals. Gap: Assumption not validated in tests. Phase 2 testing must verify shell bonuses affect exclusive signal spawn rates and rewards as expected.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** — ProbeManager.js (signal generation lines 431-532, type determination 577-619), GameController.js (signal rendering 3130-3280, reward calculation 2080-2275), SectorManager.js (sector discovery 107-150, bonus spawning 510-582), EquipmentSystem.js (EQUIPMENT_TYPES pattern 6-44), ShellSystem.js (bonus definitions 8-79)
- **Existing test suite** — 25 passing tests in tests/save-system.spec.js, 12 tests in tests/shell-system.spec.js, 11 tests in tests/equipment-slots.spec.js establish patterns for feature testing
- **Project docs** — CLAUDE.md (development standards, testing requirements, architecture notes), .planning/equipment-slots-prd.md (similar feature implementation patterns)

### Secondary (MEDIUM confidence)
- **Domain patterns** — Roguelike zone-specific loot (Hades, Slay the Spire, Risk of Rain biome exclusives), idle game zone differentiation (Antimatter Dimensions, Realm Grinder), space exploration conventions (Stellaris sector specialization)
- **Established patterns** — EventBus emit/on pattern used throughout codebase, Canvas rendering performance (game handles 100+ signals at 60fps per CLAUDE.md), save compatibility approaches from EquipmentSystem migration

### Tertiary (LOW confidence)
- **Spawn rate percentages** — 15-30% exclusivity rate recommended based on similar systems, but optimal rate requires playtesting
- **Reward multipliers** — 1.5x-2x suggested based on rarity compensation, but economy balance needs validation
- **Tutorial necessity** — Assumption that players need explicit teaching of sector specialization strategy (may be self-evident from discovery modal)

---
*Research completed: 2026-02-02*
*Ready for roadmap: yes*
