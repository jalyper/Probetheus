# Requirements: Probetheus

**Defined:** 2026-04-04
**Core Value:** Players explore, expand, and upgrade through satisfying resource collection and progression loops

## v1.4 Requirements

Requirements for Hub Upgrades & Equipment Completion milestone. Each maps to roadmap phases.

### Hub Upgrades

- [ ] **HUB-01**: Player can upgrade a hub's shuttle capacity from 3 to 6 shuttles
- [ ] **HUB-02**: Player can upgrade a hub's probe capacity from 5 to 8 probes
- [ ] **HUB-03**: Player can upgrade a hub's probe range by +50%
- [ ] **HUB-04**: Player can see an "Upgrade Hub" button in the hub detail panel that opens an upgrade modal
- [ ] **HUB-05**: Upgrade modal shows current tier, next tier benefits, and resource cost for each upgrade
- [ ] **HUB-06**: Hub upgrades require corresponding research to be unlocked first (Advanced Hub Logistics, Expanded Fleet Management, Extended Range Operations)
- [ ] **HUB-07**: Hub upgrade state persists through save/load with migration support for old saves

### Equipment

- [ ] **EQUIP-01**: Player can unlock a 3rd equipment slot on probes via "Expanded Cargo Bay" research
- [ ] **EQUIP-02**: Equipment UI updates to show 3 slots when upgrade is researched (was 2 + locked)

### Testing

- [ ] **TEST-01**: Playwright tests verify all 3 hub upgrade types purchase and apply correctly
- [ ] **TEST-02**: Playwright tests verify 3rd equipment slot unlock and equip flow
- [ ] **TEST-03**: Playwright tests verify save/load preserves hub upgrades and 3rd slot state

## Future Requirements

Deferred to subsequent milestones. See `.gamedev/PLAN.md` for full production plan.

### Probethium Economy (v1.5)

- **ECON-01**: Player can spend Probethium on game-changing upgrades (Quantum Entanglement, Probe AI, etc.)
- **ECON-02**: Dark Market NPC with rotating inventory

### Remnants Story (v1.6)

- **STORY-01**: All 5 Remnant NPCs have full dialogue trees and trade inventories
- **STORY-02**: Story fragment collection system with codex UI

### Endgame (v1.7)

- **END-01**: 7 Signal Echoes discoverable and decodable
- **END-02**: Nexus construction and ending sequence

## Out of Scope

| Feature | Reason |
|---------|--------|
| Hub/mining station shell visuals | Carried tech debt from v1.1 — cosmetic only, not blocking |
| Cross-sector synergies | High complexity, defer to future |
| Sector streak bonuses | Conflicts with "focus on feel" constraint |
| Asteroid Hazard Fields | Sketched as potential feature, not committed |
| Multi-tier hub upgrades (Tier 2+) | v1.4 implements Tier 1 only; future tiers in later milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HUB-01 | Phase 11 | Pending |
| HUB-02 | Phase 11 | Pending |
| HUB-03 | Phase 11 | Pending |
| HUB-04 | Phase 11 | Pending |
| HUB-05 | Phase 11 | Pending |
| HUB-06 | Phase 11 | Pending |
| HUB-07 | Phase 11 | Pending |
| EQUIP-01 | Phase 12 | Pending |
| EQUIP-02 | Phase 12 | Pending |
| TEST-01 | Phase 13 | Pending |
| TEST-02 | Phase 13 | Pending |
| TEST-03 | Phase 13 | Pending |

**Coverage:**
- v1.4 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after roadmap creation — all 12 requirements mapped*
