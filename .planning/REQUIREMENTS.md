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
- [ ] **TEST-07**: Integration test — equip shell with bonus, verify gameplay effect, swap shell, verify effect changes
- [ ] **TEST-08**: Integration test — save/load game preserves shell bonuses and they remain functional after load

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
| PBON-01 | TBD | Pending |
| PBON-02 | TBD | Pending |
| PBON-03 | TBD | Pending |
| PBON-04 | TBD | Pending |
| PBON-05 | TBD | Pending |
| PBON-06 | TBD | Pending |
| PBON-07 | TBD | Pending |
| PBON-08 | TBD | Pending |
| HBON-01 | TBD | Pending |
| MBON-01 | TBD | Pending |
| MBON-02 | TBD | Pending |
| MBON-03 | TBD | Pending |
| BUI-01 | TBD | Pending |
| BUI-02 | TBD | Pending |
| BUI-03 | TBD | Pending |
| BUI-04 | TBD | Pending |
| BUI-05 | TBD | Pending |
| TEST-01 | TBD | Pending |
| TEST-02 | TBD | Pending |
| TEST-03 | TBD | Pending |
| TEST-04 | TBD | Pending |
| TEST-05 | TBD | Pending |
| TEST-06 | TBD | Pending |
| TEST-07 | TBD | Pending |
| TEST-08 | TBD | Pending |

**Coverage:**
- v1.2 requirements: 25 total
- Mapped to phases: 0
- Unmapped: 25 ⚠️

---
*Requirements defined: 2026-01-28*
*Last updated: 2026-01-28 after initial definition*
