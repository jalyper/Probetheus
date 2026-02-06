# Requirements: Probetheus v1.3

**Defined:** 2026-02-02
**Core Value:** Players explore, expand, and upgrade through satisfying resource collection and progression loops

## v1.3 Requirements

Requirements for sector-specific signals and sector resource randomization.

### Exclusive Signals

- [x] **SIG-01**: Resource-Rich sectors spawn exclusive "Ore Vein" signals not found elsewhere
- [x] **SIG-02**: Data Haven sectors spawn exclusive "Data Cache" signals not found elsewhere
- [x] **SIG-03**: Ancient sectors spawn exclusive "Relic" signals not found elsewhere
- [x] **SIG-04**: Asteroid Field sectors spawn exclusive "Exotic Crystal" signals not found elsewhere
- [x] **SIG-05**: Standard sectors have no exclusive signal type (baseline sector)
- [x] **SIG-06**: Exclusive signals use same rarity system as existing signals (common/uncommon/rare/epic/legendary)
- [x] **SIG-07**: Shell bonuses (dataSignalDiscovery, signalRange, rareSignalChance) apply to exclusive signals

### Signal Visuals

- [x] **VIS-01**: Ore Vein signals have unique orange color scheme with radiating line particles
- [x] **VIS-02**: Data Cache signals have unique cyan color scheme with rotating hexagon particles
- [x] **VIS-03**: Relic signals have unique gold color scheme with orbiting dust particles
- [x] **VIS-04**: Exotic Crystal signals have unique rainbow/prismatic color scheme with crystal facet particles
- [x] **VIS-05**: Exclusive signals have longer lifetime (5-8 seconds) than standard signals (2-6 seconds)

### Signal Rewards

- [x] **REW-01**: Ore Vein signals yield 2x minerals on exploration compared to standard mineral signals
- [x] **REW-02**: Data Cache signals yield 2x data on exploration compared to standard data signals
- [x] **REW-03**: Relic signals yield guaranteed rare+ artifacts (no common artifacts)
- [x] **REW-04**: Exotic Crystal signals yield exotic minerals or all three basic resources at once

### Sector Resource Profiles

- [x] **PROF-01**: Each sector gets a randomized resource profile on discovery (mineral-rich, data-rich, artifact-rich, probethium-rich, or balanced)
- [x] **PROF-02**: Resource profile determines base signal spawn rates and rare signal frequency
- [x] **PROF-03**: Distance from starting hub influences profile richness (farther = richer signals more likely)
- [x] **PROF-04**: RNG allows rare lucky discoveries early (probethium-rich sector very early is possible but extremely rare)
- [x] **PROF-05**: Mining stations mine the sector's specialty resource (mineral-rich → minerals, data-rich → data, probethium-rich → probethium)
- [x] **PROF-06**: Probethium-rich sectors are rare and the only way to directly mine probethium

### Probethium Synthesis

- [ ] **SYNTH-01**: Hub menu has "Synthesize Probethium" button that converts exotic materials to probethium
- [ ] **SYNTH-02**: Synthesis ability is unlocked via research tree
- [ ] **SYNTH-03**: Hub plays a synthesis animation when converting exotics to probethium
- [ ] **SYNTH-04**: Synthesis provides an alternative probethium source for players who haven't found probethium-rich sectors

### Discovery Reveal

- [ ] **DISC-01**: Sector discovery modal shows exclusive signal type available in that sector
- [ ] **DISC-02**: Discovery modal displays sector resource profile (signal richness, probethium potential)
- [ ] **DISC-03**: First sector discovery spawns guaranteed exclusive signal (if sector type has one)
- [ ] **DISC-04**: Standard sectors show messaging about balanced exploration opportunities

### Tests

- [ ] **TEST-01**: Exclusive signals spawn only in their designated sector types
- [ ] **TEST-02**: Shell bonuses apply correctly to exclusive signal generation and collection
- [ ] **TEST-03**: Discovery reveal modal displays correct exclusive signal info
- [ ] **TEST-04**: Sector resource profiles persist through save/load
- [ ] **TEST-05**: Distance-based richness produces expected distribution over many sectors

## Future Requirements (v1.4)

### Asteroid Hazard Fields

- **HAZ-01**: Sectors can be designated as asteroid hazard fields (full-sector coverage)
- **HAZ-02**: Asteroid hazard fields have physical asteroids flying through that damage entities
- **HAZ-03**: Probes, hubs, and mining stations take damage from asteroid collisions
- **HAZ-04**: Richer sectors more likely to have asteroid hazard fields (risk/reward)
- **HAZ-05**: Research upgrade allows permanent residence in asteroid fields

## Out of Scope

| Feature | Reason |
|---------|--------|
| Asteroid hazard fields | Split to v1.4 — significant new system |
| Research upgrades for hazard survival | Depends on hazard fields (v1.4+) |
| Cross-sector synergies | High complexity, defer to future |
| Sector streak bonuses | New progression mechanic, conflicts with "focus on feel" constraint |
| Tiered exclusivity (prefer vs exclusive) | Added complexity, start with simple exclusivity |

## Traceability

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
| SYNTH-01 | Phase 8.5 | Pending |
| SYNTH-02 | Phase 8.5 | Pending |
| SYNTH-03 | Phase 8.5 | Pending |
| SYNTH-04 | Phase 8.5 | Pending |
| DISC-01 | Phase 9 | Pending |
| DISC-02 | Phase 9 | Pending |
| DISC-03 | Phase 9 | Pending |
| DISC-04 | Phase 9 | Pending |
| TEST-01 | Phase 10 | Pending |
| TEST-02 | Phase 10 | Pending |
| TEST-03 | Phase 10 | Pending |
| TEST-04 | Phase 10 | Pending |
| TEST-05 | Phase 10 | Pending |

**Coverage:**
- v1.3 requirements: 35 total
- Mapped to phases: 35 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-05 — added PROF-06, SYNTH-01 through SYNTH-04 (mining rework + probethium synthesis)*
