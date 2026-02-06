# Phase 10 Context: Testing & Integration

## Design Direction

Phase 10 validates the **complete player progression journey** from new game to endgame. The core focus is:
1. **Happy path validation** — Can a player walk the entire progression from first probe to probethium synthesis?
2. **Prerequisite gating** — Can a player access features before meeting prerequisites? (answer: no)
3. **Cross-system integration** — Do features that span multiple systems work together?

Key principles:
- Test the player journey, not individual features (per-phase tests handle those)
- Heavy emphasis on "can't do X before Y" gating tests
- Full end-to-end flows that cross 3+ systems
- Lots of tests — target 35-50+ integration tests
- No backward compatibility testing (new saves don't need to load in old versions)
- Statistical validation where RNG is involved

## Decisions

### 1. Test Organization — Multiple Focused Integration Files

Split into 2-3 files organized by test category:

**`tests/progression-gates.spec.js`** — Prerequisite/gating tests
- Verifies correct order of operations
- Tests that features are locked until prerequisites met
- Tests that resources are required for actions

**`tests/happy-path-integration.spec.js`** — Full player flow tests
- New game → first probe → first signal → first hub → research → equipment → mining → probethium
- Cross-system integration chains (signal pipeline, economy pipeline, shell bonuses)

**`tests/statistical-validation.spec.js`** — RNG validation (if separate file warranted)
- Spawn rate distributions, distance curves, rarity distributions

### 2. Player Progression Gate Tests (the big one)

Each gate test verifies: "Feature X is NOT accessible until prerequisite Y is met."

**Tutorial & Early Game Gates:**
- Player starts with 0 resources, 1 hub, 3 probes
- Cannot build hub with < 100 minerals
- Cannot build mining station with < 100 minerals or < 50 data
- Cannot build shuttle with < 50 minerals or < 25 data
- Cannot install equipment before researching the corresponding collector
- Hub placement restricted to outbound path only

**Research System Gates:**
- Research system is locked at game start (unlocked = false)
- Research unlocks when: 1+ research points AND tutorial allows (after first hub placed)
- Cannot research child nodes before parent nodes
- Research nodes require correct point costs
- auto_all requires all 3 base collectors (auto_minerals, auto_data, auto_artifacts)
- probethium_synthesis requires alien_tech parent

**Equipment Gates:**
- Cannot install mineral collector before auto_minerals research
- Cannot install data collector before auto_data research
- Cannot install artifact collector before auto_artifacts research
- Cannot install universal collector before auto_all research
- Cannot exceed 2 equipment slots per probe (3rd slot not yet implemented)
- Equipment installation requires 25 minerals (50 for universal)

**Mining & Probethium Gates:**
- Cannot collect probethium before mining station + shuttle
- Mining station requires resources delivered by shuttle to operate
- Probethium synthesis button hidden until probethium_synthesis researched
- Synthesis requires 5+ exotic minerals to activate

**Remnant NPC Gates:**
- Remnants don't spawn with < 2 explored sectors
- Remnants don't spawn with 0 mining stations
- Specific NPCs have additional requirements:
  - Whisperer: 3+ mining stations
  - Mira-Sol: alien tech research
  - Archivist: 5+ explored sectors
  - Null: 10+ purchased fragments

**Sector & Signal Gates:**
- Standard sectors spawn no exclusive signals
- Non-Standard sectors spawn their specific exclusive type only (not others)
- Discovery bonus signals only spawn on first discovery (not re-visit)
- Sector discovery awards +1 research point

### 3. Happy Path End-to-End Flows

**Full progression flow (the "golden path" test):**
1. New game → dismiss tutorial / skip cutscene
2. Deploy first probe with waypoints
3. Wait for signal → click → explore → get resources
4. Deploy remaining probes
5. Accumulate 100 minerals → build second hub
6. Verify research unlocks
7. Earn research points → research auto_minerals
8. Install mineral collector (costs 25M) → verify auto-collection works
9. Accumulate 100M + 50D → build mining station
10. Build shuttle (50M + 25D) → connect to station
11. Verify mining output matches sector profile
12. Wait for probethium accumulation

**Signal pipeline flow:**
1. Create sector of specific type (e.g., Resource-Rich)
2. Verify modal shows correct exclusive signal info (Ore Vein)
3. Verify resource profile bars display correctly
4. Verify exclusive bonus signal spawned (epic/legendary ore_vein)
5. Simulate collecting the exclusive signal
6. Verify 2x mineral reward applied
7. Repeat for all 4 non-Standard sector types + Standard

**Shell bonus stacking flow:**
1. Equip shell with rareSignalChance bonus on probe
2. Discover sector with exclusive signals
3. Verify bonus affects exclusive signal rarity
4. Equip shell with explorationRewards bonus
5. Collect exclusive signal
6. Verify reward multiplier stacks correctly

**Economy pipeline flow:**
1. Discover probethium-rich sector
2. Build mining station → verify probethium output
3. Discover sector with exotic crystals
4. Collect exotic crystals → verify exotic mineral yield
5. Research probethium synthesis
6. Use hub synthesis button → verify conversion (5 exotics → 0.001 probethium)

**Save/load round-trip flow:**
1. Progress to mid-game state (hubs, stations, research, equipment)
2. Save game
3. Load game
4. Verify all state preserved: sectors, profiles, research, equipment, resources

### 4. Statistical Validation

**Spawn rate test (large sample):**
- Generate 500+ signals in a Resource-Rich sector
- Verify exclusive ore_vein signals appear at 15-30% rate
- Verify Standard sectors produce 0% exclusive signals

**Distance distribution test:**
- Create 200+ sectors at varying distances
- Verify probethium-rich sectors correlate with distance
- Near origin: ~2% probethium-rich
- Far from origin: ~10% probethium-rich

**Rarity distribution test:**
- Run spawnDiscoveryBonusSignals 100+ times for non-Standard sectors
- Verify ~80% epic, ~20% legendary distribution (with tolerance)

### 5. Backward Compatibility — DROPPED

Per user direction: "It's okay if new saves aren't backwards compatible."
- No pre-v1.3 save loading tests
- No migration tests
- Only test current save format round-trips correctly

### 6. What NOT to Re-Test

Per-phase tests already cover these thoroughly — integration tests should NOT duplicate:
- Individual signal color/particle rendering (Phase 6 tests)
- Individual reward calculations in isolation (Phase 7 tests)
- Individual profile assignment logic in isolation (Phase 8 tests)
- Individual synthesis animation frames (Phase 8.5 tests)
- Individual modal section content (Phase 9 tests)

Integration tests combine these into flows and verify gating, not atomic behavior.

## Player Progression Reference

**Unlock chain (simplified):**
```
New Game
  → Deploy probes (free, 3 starting)
  → Collect signals (probe auto-discovers)
  → Explore planets (click signals)
  → Gather resources (excavate/exterminate/expedition)
  → 50 minerals milestone → first research point
  → 100 minerals → build second hub
  → Research system unlocks (1+ RP + hub placed)
  → Research auto_collectors (1 RP each)
  → Install equipment (25M each)
  → 100M + 50D → build mining station
  → 50M + 25D → build shuttle
  → Probethium production begins
  → 2+ sectors + 1+ station → Remnants can spawn
  → Buy shells from Remnants (probethium)
  → Research probethium_synthesis (3 RP, requires alien_tech)
  → Synthesize probethium at hubs (5 exotics → 0.001 probethium)
```

**Resource costs reference:**
| Action | Minerals | Data | Artifacts | Exotic | Probethium |
|--------|----------|------|-----------|--------|------------|
| Build probe | 25 | - | - | - | - |
| Build hub | 100 | - | - | - | - |
| Mining station (basic) | 100 | 50 | - | - | - |
| Shuttle | 50 | 25 | - | - | - |
| Equipment (individual) | 25 | - | - | - | - |
| Equipment (universal) | 50 | - | - | - | - |
| Synthesis (per batch) | - | - | - | 5 | → 0.001 |

## Scope Boundaries

**In scope:**
- Prerequisite gating tests (can't do X before Y)
- Full player progression happy path
- Cross-system integration flows
- Save/load round-trip (current format only)
- Statistical validation of RNG behaviors
- Resource cost verification

**Out of scope:**
- Backward compatibility with pre-v1.3 saves
- Performance benchmarks (FPS testing)
- Visual regression testing (screenshot comparison)
- Per-requirement unit tests (already covered by Phases 5-9)
- Tutorial text content validation (already covered)

## Technical Notes

- Use same test patterns as existing files (page.evaluate, startGame helper, tutorial dismissal)
- Programmatic sector creation for deterministic flows (same pattern as discovery-reveal.spec.js)
- For gating tests: attempt action, verify it fails/is blocked, then meet prerequisite, verify it succeeds
- For statistical tests, use tolerance ranges: 40% threshold for weighted RNG, 5-40% for spawn rates
- Signal array isolation: clear signals before spawning tests to prevent pollution
- Many gating tests can programmatically set game state to just-before-unlock to test the gate directly
