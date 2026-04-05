# Roadmap: Probetheus

## Milestones

- ✅ **v1.1 Shell Visuals & Cosmetics** - Phases 1-2 (shipped 2026-01-27)
- ✅ **v1.2 Shell Bonuses & Effects** - Phases 1-4 (shipped 2026-02-02)
- ✅ **v1.3 Signal Distribution System** - Phases 5-10 (shipped 2026-02-06)
- 🚧 **v1.4 Hub Upgrades & Equipment Completion** - Phases 11-13 (in progress)

## Phases

<details>
<summary>✅ v1.1 through v1.3 (Phases 1-10) - SHIPPED</summary>

See archived roadmaps in `.planning/milestones/` for phase details.

Phase history:
- v1.2 shipped Phases 1-4 (shell bonuses, tooltips, save/load)
- v1.3 shipped Phases 5-10 plus 8.5 (signals, resource profiles, probethium, discovery UI, tests)

</details>

### 🚧 v1.4 Hub Upgrades & Equipment Completion (In Progress)

**Milestone Goal:** Complete the two partially-built progression systems so the mid-game has depth and meaningful upgrade choices.

#### Phase 11: Hub Upgrade System
**Goal**: Players can purchase meaningful hub upgrades that improve shuttle capacity, probe capacity, and probe range through a research-gated upgrade UI
**Depends on**: Phase 10
**Requirements**: HUB-01, HUB-02, HUB-03, HUB-04, HUB-05, HUB-06, HUB-07
**Success Criteria** (what must be TRUE):
  1. Player can click "Upgrade Hub" in the hub detail panel and see a modal with all three upgrade types, their current tier, next tier benefit, and resource cost
  2. Player can purchase the Shuttle Capacity upgrade (costs 500M + 250D, requires "Advanced Hub Logistics" research) and the hub immediately supports 6 shuttles instead of 3
  3. Player can purchase the Probe Capacity upgrade (costs 300M + 200D, requires "Expanded Fleet Management" research) and the hub immediately supports 8 probes instead of 5
  4. Player can purchase the Probe Range upgrade (costs 400M + 300D + 50A, requires "Extended Range Operations" research) and probes from that hub travel 50% further before returning
  5. Hub upgrade state (which upgrades purchased on which hub) survives a save and reload, and old saves without upgrade data load without errors
**Plans**: TBD
**UI hint**: yes

#### Phase 12: Equipment 3rd Slot
**Goal**: Players can unlock a third equipment slot on probes via research, completing the equipment system designed in v1.0
**Depends on**: Phase 11
**Requirements**: EQUIP-01, EQUIP-02
**Success Criteria** (what must be TRUE):
  1. Player can research "Expanded Cargo Bay" in the research tree and all probes gain a third equipment slot
  2. After researching "Expanded Cargo Bay," the equipment UI shows 3 slots (instead of 2 active + 1 locked) and the player can equip a third item
  3. The third slot and any equipment in it persist correctly through save/load
**Plans**: TBD
**UI hint**: yes

#### Phase 13: Playwright Test Coverage
**Goal**: All new v1.4 features have Playwright test coverage, validating hub upgrades, equipment slot unlock, and save/load persistence
**Depends on**: Phase 12
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. Playwright tests confirm all three hub upgrade types (shuttle capacity, probe capacity, probe range) can be purchased and their effects apply correctly in-game
  2. Playwright tests confirm the "Expanded Cargo Bay" research unlocks the 3rd slot and a probe can be equipped with 3 items
  3. Playwright tests confirm save/load preserves hub upgrade state and 3rd slot equipment state across a reload cycle
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 → 12 → 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 11. Hub Upgrade System | v1.4 | 0/? | Not started | - |
| 12. Equipment 3rd Slot | v1.4 | 0/? | Not started | - |
| 13. Playwright Test Coverage | v1.4 | 0/? | Not started | - |
