# Requirements: Probetheus v1.2

**Defined:** 2026-01-28
**Core Value:** Players explore, expand, and upgrade through satisfying resource collection and progression loops

## v1.2 Requirements

### Probe Bonuses

- [ ] **PBON-01**: Probe with `dataSignalDiscovery` shell bonus has increased chance to discover data signals
- [ ] **PBON-02**: Probe with `signalRange` shell bonus has increased signal detection range
- [ ] **PBON-03**: Probe with `rareSignalChance` shell bonus has increased chance to find rare signals
- [ ] **PBON-04**: Probe with `probeDurability` shell bonus has increased durability/HP
- [ ] **PBON-05**: Probe with `asteroidSurvival` shell bonus has increased asteroid survival chance
- [ ] **PBON-06**: Probe with `artifactDiscovery` shell bonus has increased artifact discovery rate
- [ ] **PBON-07**: Probe with `explorationRewards` shell bonus has increased exploration reward yield
- [ ] **PBON-08**: Probe with `exoticYield` shell bonus has increased exotic mineral yield

### Hub Bonuses

- [ ] **HBON-01**: Hub with `researchSpeed` shell bonus increases research speed for that hub

### Mining Station Bonuses

- [ ] **MBON-01**: Mining station with `miningEfficiency` shell bonus has increased mining output
- [ ] **MBON-02**: Mining station with `probethiumRate` shell bonus has increased probethium generation rate
- [ ] **MBON-03**: Mining station with `shuttleSpeed` shell bonus has increased shuttle movement speed

### Bonus UI

- [ ] **BUI-01**: Hovering over a shell in the shell selection modal shows a tooltip with bonus effects
- [ ] **BUI-02**: Hovering over the equipped shell in probe detail panel shows a tooltip with bonus effects
- [ ] **BUI-03**: Hovering over the equipped shell in hub detail panel shows a tooltip with bonus effects
- [ ] **BUI-04**: Hovering over the equipped shell in mining station detail panel shows a tooltip with bonus effects
- [ ] **BUI-05**: Tooltip displays bonus type label, icon, and percentage value

### Tests

- [ ] **TEST-01**: Test each probe bonus type applies correctly (dataSignalDiscovery, signalRange, rareSignalChance, probeDurability, asteroidSurvival, artifactDiscovery, explorationRewards, exoticYield)
- [ ] **TEST-02**: Test hub bonus (researchSpeed) applies correctly
- [ ] **TEST-03**: Test each mining station bonus applies correctly (miningEfficiency, probethiumRate, shuttleSpeed)
- [ ] **TEST-04**: Test bonuses are per-entity (equipping a shell on one probe does not affect another)
- [ ] **TEST-05**: Test bonus tooltip displays correct info on hover in shell selection modal
- [ ] **TEST-06**: Test bonus tooltip displays correct info on hover in detail panels
- [ ] **TEST-07**: Integration test -- equip shell with bonus, verify gameplay effect, swap shell, verify effect changes
- [ ] **TEST-08**: Integration test -- save/load game preserves shell bonuses and they remain functional after load

## Future Requirements

### Bonus Enhancements (v2+)

- **BFUT-01**: Bonus stacking visualization showing total bonuses across all entities
- **BFUT-02**: Bonus comparison when swapping shells (show +/- difference)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Global bonus stacking | Per-entity model chosen for clarity |
| Hub/station shell visuals | Tech debt from v1.1, separate milestone |
| Bonus balancing pass | Ship first, balance based on playtesting |
| New bonus types beyond existing 12 | Complete current set first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PBON-01 | Phase 3 | Pending |
| PBON-02 | Phase 3 | Pending |
| PBON-03 | Phase 3 | Pending |
| PBON-04 | Phase 3 | Pending |
| PBON-05 | Phase 3 | Pending |
| PBON-06 | Phase 3 | Pending |
| PBON-07 | Phase 3 | Pending |
| PBON-08 | Phase 3 | Pending |
| HBON-01 | Phase 3 | Pending |
| MBON-01 | Phase 3 | Pending |
| MBON-02 | Phase 3 | Pending |
| MBON-03 | Phase 3 | Pending |
| BUI-01 | Phase 4 | Pending |
| BUI-02 | Phase 4 | Pending |
| BUI-03 | Phase 4 | Pending |
| BUI-04 | Phase 4 | Pending |
| BUI-05 | Phase 4 | Pending |
| TEST-01 | Phase 3 | Pending |
| TEST-02 | Phase 3 | Pending |
| TEST-03 | Phase 3 | Pending |
| TEST-04 | Phase 3 | Pending |
| TEST-05 | Phase 4 | Pending |
| TEST-06 | Phase 4 | Pending |
| TEST-07 | Phase 4 | Pending |
| TEST-08 | Phase 4 | Pending |

**Coverage:**
- v1.2 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after roadmap creation*
