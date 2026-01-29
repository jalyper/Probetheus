# Probetheus Roadmap

## Completed: v1.1 Shell Visuals & Cosmetics

**Status:** Complete (2026-01-27)
**Archive:** `.planning/milestones/v1.1-ROADMAP.md`

---

## Current Milestone: v1.2 Shell Bonuses & Effects

**Goal:** Make shell bonuses functional in gameplay -- equipping a shell with a bonus actually affects the entity's behavior, and players can see what bonuses their shells provide.

**Phases:** 2 (Phase 3-4, continuing from v1.1)
**Requirements:** 25 total

### Phase 3: Bonus Gameplay

**Goal:** Equipping a shell with a bonus changes how that entity performs in-game.

**Directory:** `.planning/phases/03-bonus-gameplay/`

**Dependencies:** None (ShellSystem bonus infrastructure already exists)

**Plans:** 4 plans

Plans:
- [ ] 03-01-PLAN.md -- Normalize shell bonus values and add per-entity bonus resolver
- [ ] 03-02-PLAN.md -- Wire 8 probe bonus types into ProbeManager
- [ ] 03-03-PLAN.md -- Wire hub and mining station bonuses (researchSpeed, miningEfficiency, probethiumRate, shuttleSpeed)
- [ ] 03-04-PLAN.md -- Playwright tests for all 12 bonus types + per-entity isolation

**Requirements:**
- PBON-01: dataSignalDiscovery bonus increases data signal discovery chance
- PBON-02: signalRange bonus increases signal detection range
- PBON-03: rareSignalChance bonus increases rare signal chance
- PBON-04: probeDurability bonus increases probe durability/HP
- PBON-05: asteroidSurvival bonus increases asteroid survival chance
- PBON-06: artifactDiscovery bonus increases artifact discovery rate
- PBON-07: explorationRewards bonus increases exploration reward yield
- PBON-08: exoticYield bonus increases exotic mineral yield
- HBON-01: researchSpeed bonus increases research speed for that hub
- MBON-01: miningEfficiency bonus increases mining output
- MBON-02: probethiumRate bonus increases probethium generation rate
- MBON-03: shuttleSpeed bonus increases shuttle movement speed
- TEST-01: Test each probe bonus type applies correctly
- TEST-02: Test hub bonus applies correctly
- TEST-03: Test each mining station bonus applies correctly
- TEST-04: Test bonuses are per-entity (not global)

**Success Criteria:**
1. Player equips a shell with dataSignalDiscovery on a probe and that probe finds data signals more frequently than a probe without the bonus
2. Player equips a shell with miningEfficiency on a mining station and that station produces more output than a station without the bonus
3. Player equips a shell with researchSpeed on a hub and research progresses faster through that hub
4. Player equips the same bonus shell on one probe, and a second probe without the shell is unaffected (per-entity isolation)
5. All 12 bonus types have Playwright tests verifying the bonus modifies the correct game value

---

### Phase 4: Bonus UI & Integration

**Goal:** Players can see what bonuses a shell provides before and after equipping, and the full bonus system survives save/load cycles.

**Directory:** `.planning/phases/04-bonus-ui-integration/`

**Dependencies:** Phase 3 (bonuses must be functional before UI displays them and integration tests verify them)

**Plans:** 3 plans

Plans:
- [ ] 04-01-PLAN.md -- Tooltip system + probe shell modal and detail panel tooltips (BUI-01, BUI-02, BUI-05)
- [ ] 04-02-PLAN.md -- Hub and mining station detail panel shell indicators with tooltips (BUI-03, BUI-04)
- [ ] 04-03-PLAN.md -- Playwright tests for tooltip display and integration (TEST-05 through TEST-08)

**Requirements:**
- BUI-01: Shell selection modal shows bonus tooltip on hover
- BUI-02: Probe detail panel shows bonus tooltip on hover
- BUI-03: Hub detail panel shows bonus tooltip on hover
- BUI-04: Mining station detail panel shows bonus tooltip on hover
- BUI-05: Tooltip displays bonus type label, icon, and percentage value
- TEST-05: Test tooltip displays correct info in shell selection modal
- TEST-06: Test tooltip displays correct info in detail panels
- TEST-07: Integration test -- equip shell, verify effect, swap shell, verify change
- TEST-08: Integration test -- save/load preserves bonuses and they remain functional

**Success Criteria:**
1. Player hovers over any shell in the shell selection modal and sees a tooltip showing the bonus type, icon, and percentage value
2. Player hovers over the equipped shell in any detail panel (probe, hub, mining station) and sees the same tooltip format
3. Player equips a bonus shell, observes the gameplay effect, swaps to a different shell, and the effect changes accordingly
4. Player saves the game with bonus shells equipped, reloads, and bonuses still affect gameplay identically

---

## Progress

| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 3 | Bonus Gameplay | Complete | 16/16 |
| 4 | Bonus UI & Integration | Complete | 9/9 |

**Total:** 25/25 requirements complete

---

## Future Milestones

(To be planned)
