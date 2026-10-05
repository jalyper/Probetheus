# Probetheus — Production Plan

**Version**: 1.0 Steam Release
**Developer**: Solo (code, art, music, QA)
**Tech Stack**: Vanilla JS, HTML5 Canvas, Electron, Vite
**Current State**: v1.3 shipped (core loop complete, 24 modules, 200+ Playwright tests)
**Methodology**: Milestone-based (GSD pattern, proven through v1.0-v1.3)
**1.0 Definition**: Complete game with ending (Prometheus Saga) + Sandbox mode

---

## Dependency Graph

```
v1.3 (CURRENT)
  |
  ├── M1: Hub Upgrades + Equipment Completion
  |     |
  |     ├── M2: Probethium Economy + Dark Market
  |     |     |
  |     |     ├── M3: Remnants Story (Phases 2-5)
  |     |     |     |
  |     |     |     └── M4: Endgame — The Prometheus Saga
  |     |     |           |
  |     |     |           ├── M5: Sandbox Mode
  |     |     |           |
  |     |     |           └── M6: Balance & Meta Tuning
  |     |     |                 |
  |     |     |                 └── M7: Polish & Juice
  |     |     |                       |
  |     |     |                       └── M8: Steam Integration
  |     |     |                             |
  |     |     |                             └── M9: Steam Launch Prep
  |     |     |                                   |
  |     |     |                                   └── LAUNCH
  |     |     |
  |     |     └── (M6 Balance can start partial work here)
  |     |
  |     └── (M7 Polish can layer incrementally from here)
  |
  └── Steam Dev Account Setup (parallel, any time)
```

**Critical Path**: M1 → M2 → M3 → M4 → M6 → M8 → M9 → Launch
**Parallelizable**: Steam account setup, music composition, art assets can happen alongside any milestone

---

## Milestones

| Milestone | Description | Exit Criteria | Est. Duration |
|-----------|-------------|---------------|---------------|
| **M1** | Hub Upgrades + Equipment Completion | 3 hub upgrade tiers purchasable; 3rd equipment slot unlockable via research; tests pass | 1-2 weeks |
| **M2** | Probethium Economy + Dark Market | All Tier 1 Probethium upgrades purchasable; Dark Market NPC functional; economy feels meaningful | 2-3 weeks |
| **M3** | Remnants Story (Phases 2-5) | All 5 Remnant NPCs have dialogue trees, trade inventories, and story fragments; story feels cohesive | 3-4 weeks |
| **M4** | Endgame — The Prometheus Saga | 7 Signal Echoes discoverable + decodable; Nexus construction sequence; ending cutscene plays; game has a WIN state | 4-6 weeks |
| **M5** | Sandbox Mode | Post-ending sandbox unlocks; no win condition; all upgrades available; prestige/restart option | 1-2 weeks |
| **M6** | Balance & Meta Tuning | Full playthrough timed; economy spreadsheet validated; no dominant strategies; no dead-end traps; no 10+ min idle walls | 2-4 weeks |
| **M7** | Polish & Juice | Screen shake, particle effects, sound design, UI animations, loading transitions, accessibility | 2-3 weeks |
| **M8** | Steam Integration | Steamworks SDK, achievements, cloud saves, overlay support, build pipeline | 1-2 weeks |
| **M9** | Steam Launch Prep | Store page, screenshots, trailer, press kit, community hub, launch marketing | 2-3 weeks |

**Estimated total**: 18-30 weeks (flexible schedule, solo dev)

---

## M1: Hub Upgrades + Equipment Completion

**Goal**: Complete the two partially-built progression systems so the mid-game has depth.

### Dependencies
- v1.3 shipped (done)

### Tasks

| # | Task | Est. | Depends On | Done When |
|---|------|------|------------|-----------|
| 1.1 | Add `hub.upgrades` object to GameState + SaveManager migration | 1d | — | Hub upgrades persist through save/load |
| 1.2 | Implement Shuttle Capacity upgrade (3→6) with UI in hub detail panel | 1d | 1.1 | Player can purchase and see effect |
| 1.3 | Implement Probe Capacity upgrade (5→8) with UI | 1d | 1.1 | Player can purchase and see effect |
| 1.4 | Implement Probe Range upgrade (+50%) with ProbeManager movement calc | 1d | 1.1 | Probes travel further from upgraded hubs |
| 1.5 | "Upgrade Hub" button + modal showing tiers, costs, current level | 1d | 1.2-1.4 | Clean upgrade UX |
| 1.6 | Research gate: "Advanced Hub Logistics", "Expanded Fleet", "Extended Range" nodes | 1d | 1.5 | Upgrades locked behind research |
| 1.7 | Equipment slot upgrade: 3rd slot unlockable via research node | 1d | — | REQ-5 from equipment-slots-prd complete |
| 1.8 | Playwright tests for all hub upgrades + 3rd equipment slot | 1d | 1.6, 1.7 | Tests green |

### Risks
- Save migration complexity (mitigate: test old saves load correctly)
- Research tree layout getting crowded (mitigate: plan node positions before coding)

### Playtest Checkpoint
- Start new game, play to hub upgrades, verify they feel impactful
- Load a v1.3 save, confirm no breakage

---

## M2: Probethium Economy + Dark Market

**Goal**: Make Probethium spending feel meaningful. Every purchase should be a real decision.

### Dependencies
- M1 (hub upgrades provide baseline progression context)

### Tasks

| # | Task | Est. | Depends On | Done When |
|---|------|------|------------|-----------|
| 2.1 | Implement Probethium upgrade shop UI (accessible from hub or dedicated screen) | 2d | — | Player can browse upgrades |
| 2.2 | Quantum Entanglement (500P): link two hubs, shared inventory | 2d | 2.1 | Two hubs share resources in real-time |
| 2.3 | Probe Automation AI (300P): auto-redeploy with route optimization | 2d | 2.1 | Probes redeploy without manual input |
| 2.4 | Signal Amplifier (250P/hub): +50% signal spawn rate per hub | 1d | 2.1 | Measurable signal increase |
| 2.5 | Mining Station Catalyst (350P): 2x Probethium production globally | 0.5d | 2.1 | Production doubles |
| 2.6 | Sector Mapper (200P): reveal all signals in sector | 1d | 2.1 | Signals visible without scanning |
| 2.7 | Time Dilation Field (600P): 2x probe speed per hub | 0.5d | 2.1 | Speed visibly doubles |
| 2.8 | Exotic Matter Synthesizer (400P): new resource type + research branch | 2d | 2.1 | New resource appears, new research nodes |
| 2.9 | Dark Market NPC: special Remnant trader with rotating inventory | 2d | — | NPC spawns, offers unique items |
| 2.10 | Dark Market inventory: exclusive shells, one-time upgrades, lore items | 1d | 2.9 | 10+ items available |
| 2.11 | Balance pass: Probethium earn rates vs spend costs (spreadsheet) | 1d | 2.2-2.10 | No upgrade feels trivially cheap or impossibly expensive |
| 2.12 | Playwright tests for all Probethium upgrades + Dark Market | 2d | 2.11 | Tests green |

### Risks
- Quantum Entanglement could trivialize logistics (mitigate: limit to 1 pair initially, research to expand)
- Probe Automation could remove all engagement (mitigate: auto-routes are suboptimal, manual is still better)
- Probethium generation could be gamed (mitigate: track in M6 balance pass)

### Playtest Checkpoint
- Play from mid-game to all Probethium upgrades purchased
- Time how long each upgrade takes to afford — should feel like a meaningful milestone, not a wall
- Verify Quantum Entanglement doesn't break resource UI

---

## M3: Remnants Story (Phases 2-5)

**Goal**: Transform Remnant NPCs from tech demos into a compelling narrative layer.

### Dependencies
- M2 (Dark Market establishes NPC trade patterns; Probethium economy provides story rewards)

### Tasks

| # | Task | Est. | Depends On | Done When |
|---|------|------|------------|-----------|
| 3.1 | Dialogue system polish: branching choices, memory of past conversations | 2d | — | NPCs remember what you've discussed |
| 3.2 | Write dialogue trees for all 5 Remnants (Keth-Varn, Whisperer, Mira-Sol, Archivist, Null) | 3d | 3.1 | Each NPC has 5+ conversation nodes |
| 3.3 | Trade inventories per NPC: unique shells, lore items, upgrades | 2d | 3.1 | Each NPC sells distinct items |
| 3.4 | Story fragment system: collecting pieces of the Prometheus backstory | 2d | 3.2 | Fragments viewable in a codex/log |
| 3.5 | NPC relationship/reputation tracking | 1d | 3.2 | Repeated visits unlock new dialogue |
| 3.6 | Encounter variety: different spawn conditions per NPC type | 1d | — | NPCs feel distinct in when/where they appear |
| 3.7 | Visual polish: unique particle effects, approach animations per NPC | 1d | — | Each NPC visually distinct |
| 3.8 | Story codex UI: collected fragments, NPC encounter log | 2d | 3.4 | Player can review all discovered lore |
| 3.9 | Playwright tests for dialogue, trade, fragments, codex | 2d | 3.8 | Tests green |

### Risks
- Writing quality (mitigate: keep dialogue tight, let mystery do the heavy lifting)
- NPC spawn RNG frustration (mitigate: increasing spawn chance over time, pity timer)

### Playtest Checkpoint
- Meet each NPC at least twice, verify dialogue flows naturally
- Collect 50% of story fragments, verify narrative coherence
- Buy from each trader, verify items feel unique

---

## M4: Endgame — The Prometheus Saga

**Goal**: Give the game a satisfying conclusion. The 7 Signal Echoes + Nexus construction = the WIN state.

### Dependencies
- M3 (Remnant NPCs provide narrative context; story fragments build toward this)
- M2 (Probethium economy provides the currency for Echo decoding)

### Tasks

| # | Task | Est. | Depends On | Done When |
|---|------|------|------------|-----------|
| 4.1 | Signal Echo discovery system: 7 echoes triggered by gameplay milestones | 2d | — | Each echo triggers at correct milestone |
| 4.2 | Echo 1: Separation Protocol (5 hubs → Hub Network Sync reward) | 1d | 4.1 | Echo discoverable, decodable for 150P |
| 4.3 | Echo 2: Distress Call (50 signals → Emergency Salvage reward) | 1d | 4.1 | Echo discoverable, decodable for 200P |
| 4.4 | Echo 3: Mining Directive (50 Probethium mined → reward) | 1d | 4.1 | Echo discoverable, decodable |
| 4.5 | Echo 4-7: Remaining echoes with escalating triggers + rewards | 3d | 4.1 | All 7 echoes functional |
| 4.6 | Coordinate fragment UI: partially revealed coordinates that fill in | 1d | 4.5 | Visual mystery element works |
| 4.7 | Nexus site selection: player chooses build location | 1d | 4.5 | Location selectable on map |
| 4.8 | Nexus construction phases (4 phases, resource + time + events) | 3d | 4.7 | All 4 construction phases playable |
| 4.9 | Interference events during construction (active defense) | 2d | 4.8 | Player must protect shuttles |
| 4.10 | Ending sequence: Nexus activates, Prometheus found, cutscene | 2d | 4.8 | Ending plays, credits roll |
| 4.11 | Lore integration: connect Remnant story fragments to ending | 1d | 4.10 | Story feels complete |
| 4.12 | Nexus Progress UI element (tracks echo collection + construction) | 1d | 4.1 | Player always knows progress toward ending |
| 4.13 | Playwright tests for echo triggers, construction, ending | 2d | 4.10 | Tests green |

### Risks
- Ending might feel anticlimactic (mitigate: layer multiple payoffs — mechanical rewards + story closure + visual spectacle)
- 1,400 Probethium + 1,000 construction cost could feel grindy (mitigate: tune in M6, ensure earn rate scales)
- Interference events could be frustrating (mitigate: telegraphed, learnable, not punishing)

### Playtest Checkpoint
- Full playthrough from new game to ending (time it)
- Verify all 7 echoes trigger correctly and rewards apply
- Verify ending cutscene is satisfying
- Check: does the coordinate reveal create genuine anticipation?

---

## M5: Sandbox Mode

**Goal**: After credits, the game continues. Players can keep expanding, experimenting, min-maxing.

### Dependencies
- M4 (ending must exist to unlock post-game)

### Tasks

| # | Task | Est. | Depends On | Done When |
|---|------|------|------------|-----------|
| 5.1 | Post-credits sandbox unlock: game continues after ending | 1d | — | Player can keep playing after win |
| 5.2 | Sandbox-exclusive content: cosmetics, titles, or visual rewards | 1d | 5.1 | Reason to keep playing |
| 5.3 | New Game+ / Prestige option: restart with bonuses | 2d | 5.1 | Player can prestige with carryover |
| 5.4 | Sandbox settings: toggle resource multipliers, spawn rates (optional) | 1d | 5.1 | Customizable sandbox experience |
| 5.5 | Statistics screen: total playtime, resources collected, echoes found, etc. | 1d | — | Player can see lifetime stats |
| 5.6 | Tests for sandbox unlock, prestige, stats | 1d | 5.5 | Tests green |

### Risks
- Sandbox feels empty without goals (mitigate: achievement-like challenges, cosmetic unlocks)
- Prestige balance (mitigate: keep bonuses modest, focus on convenience not power)

---

## M6: Balance & Meta Tuning

**Goal**: The user's #1 concern. Ensure no dominant strategies, no dead ends, no idle walls, satisfying pacing throughout.

### Dependencies
- M4 (need complete game to balance end-to-end)
- Can start partial work after M2 (economy spreadsheet)

### Tasks

| # | Task | Est. | Depends On | Done When |
|---|------|------|------------|-----------|
| 6.1 | Build economy spreadsheet: all resource sources, sinks, rates, costs | 2d | — | Every number in the game is documented |
| 6.2 | Full fresh playthrough #1: time every milestone, note friction points | 1d | 6.1 | Annotated timeline exists |
| 6.3 | Identify dominant strategies: what's OP? what trivializes content? | 1d | 6.2 | List of balance concerns |
| 6.4 | Identify slog points: where does the game stall? idle walls > 5 min? | 1d | 6.2 | List of pacing concerns |
| 6.5 | Identify exploits: can anything be gamed? infinite loops? | 1d | 6.2 | List of exploit concerns |
| 6.6 | Game loop audit: is every phase engaging? any "dead zones"? | 1d | 6.2 | Gap analysis complete |
| 6.7 | Tuning pass #1: adjust rates, costs, timers based on findings | 2d | 6.3-6.6 | First balance patch applied |
| 6.8 | Full playthrough #2: verify fixes, find new issues | 1d | 6.7 | Second annotated timeline |
| 6.9 | Tuning pass #2: fine-tune based on second playthrough | 1d | 6.8 | Second balance patch |
| 6.10 | Edge case testing: speed-focused play, idle-focused play, completionist play | 2d | 6.9 | All playstyles viable |
| 6.11 | Probethium earn curve validation: early/mid/late game rates feel right | 1d | 6.9 | No Probethium drought or flood |
| 6.12 | Shell bonus audit: are any bonuses must-have or useless? | 0.5d | 6.9 | All bonuses feel like choices, not traps |
| 6.13 | Research tree audit: any dead-end paths? any mandatory orders? | 0.5d | 6.9 | Multiple viable research strategies |
| 6.14 | Update economy spreadsheet with final values | 0.5d | 6.9 | Spreadsheet matches code |

### Meta Questions to Answer
- [ ] **Probe spam**: Is deploying maximum probes always optimal, or do fewer focused probes have value?
- [ ] **Hub spam**: Is there a reason NOT to build hubs everywhere?
- [ ] **Equipment choice**: Are individual collectors ever better than universal?
- [ ] **Shell bonuses**: Do gameplay bonuses create "correct" choices that override cosmetic preference?
- [ ] **Probethium gating**: Does the earn rate create natural milestone pacing, or artificial walls?
- [ ] **Research order**: Is there a dominant research path, or are there meaningful branches?
- [ ] **Signal collection**: Is active play rewarded enough vs idle accumulation?
- [ ] **Nexus construction**: Does the 1,000P + resources feel earned or grindy?
- [ ] **Entanglement**: Does hub linking trivialize the logistics game?
- [ ] **Automation AI**: Does auto-redeploy remove too much engagement?
- [ ] **Mining efficiency**: Can players optimize mining to break the economy?
- [ ] **Sector choice**: Does sector resource profile actually matter for strategy?

### Risks
- Balance changes could break existing saves (mitigate: migration support, test old saves)
- Over-nerfing makes the game tedious (mitigate: err on the side of fun, nerf exploits not power fantasies)

### Playtest Checkpoint
- 3 complete playthroughs with different strategies
- Confirm: 10-20 hour total playtime to ending feels right
- Confirm: no idle wall exceeds 3-5 minutes without something to do

---

## M7: Polish & Juice

**Goal**: Make every action feel satisfying. The game should feel good to play, not just function correctly.

### Dependencies
- M6 (balance must be stable before polishing feel)
- Can layer incrementally from M1 onward

### Tasks

| # | Task | Est. | Depends On | Done When |
|---|------|------|------------|-----------|
| 7.1 | Screen shake on major events (hub build, mining complete, echo discovered) | 1d | — | Events feel impactful |
| 7.2 | Particle effects: resource collection, probe launch, hub pulse, Nexus construction | 2d | — | Visual feedback everywhere |
| 7.3 | Sound design: UI clicks, resource collect, probe deploy, alert chimes | 2d | — | Every action has audio feedback |
| 7.4 | Music: composed tracks for exploration, discovery, tension, ending | 3d | — | Full soundtrack (you compose this) |
| 7.5 | UI animations: panel slides, button hover states, modal transitions | 2d | — | UI feels responsive and alive |
| 7.6 | Loading screen with tips | 0.5d | — | No blank screens during loads |
| 7.7 | Accessibility: keyboard navigation, colorblind-safe palette, text scaling | 2d | — | Playable without mouse, with vision impairment |
| 7.8 | Notification system: toast messages for milestones, warnings, achievements | 1d | — | Player never misses important events |
| 7.9 | Minimap improvements: show hub networks, Nexus progress, NPC locations | 1d | — | Map is informative at a glance |
| 7.10 | Camera improvements: smooth zoom, edge scrolling, double-click to center | 1d | — | Navigation feels natural |

### Risks
- Polish scope creep (mitigate: timebox each task, ship "good enough" then iterate)
- Audio performance on many simultaneous sounds (mitigate: sound pooling, priority system)

---

## M8: Steam Integration

**Goal**: Technical integration with Steamworks for distribution.

### Dependencies
- M7 (game should be near-final before Steam integration)
- Steam Developer Account (set up early, $100 fee, takes a few days to approve)

### Tasks

| # | Task | Est. | Depends On | Done When |
|---|------|------|------------|-----------|
| 8.1 | Set up Steam Developer account ($100, partner.steamgames.com) | 1d | — | Account approved |
| 8.2 | Register Probetheus as a new app, get App ID | 0.5d | 8.1 | App ID assigned |
| 8.3 | Integrate Steamworks SDK via greenworks or steamworks.js for Electron | 2d | 8.2 | SDK initializes in-game |
| 8.4 | Steam Cloud Saves: sync save files via Steamworks | 1d | 8.3 | Saves persist across machines |
| 8.5 | Steam Achievements: define 15-25 achievements, implement triggers | 2d | 8.3 | Achievements pop in Steam overlay |
| 8.6 | Steam Overlay compatibility: verify overlay works with Canvas | 0.5d | 8.3 | Shift+Tab opens overlay |
| 8.7 | Build pipeline: automate Electron → Steam depot upload | 1d | 8.3 | `npm run build:steam` produces uploadable depot |
| 8.8 | Test on Steam: upload build, install from Steam, verify everything works | 1d | 8.7 | Game launches from Steam library |

### Risks
- Steamworks + Electron compatibility (mitigate: research greenworks/steamworks.js early, PoC in M1 if worried)
- Cloud save conflicts (mitigate: timestamp-based resolution, test multi-machine scenario)

---

## M9: Steam Launch Prep

**Goal**: Everything needed to go live on Steam.

### Dependencies
- M8 (Steam integration working)

### Tasks

| # | Task | Est. | Depends On | Done When |
|---|------|------|------------|-----------|
| 9.1 | Store page: description, about section, system requirements | 1d | — | Page passes Steam review |
| 9.2 | Screenshots: 5-10 high-quality screenshots showing key moments | 1d | — | Screenshots uploaded |
| 9.3 | Trailer: 60-90 second gameplay trailer with music | 3d | — | Trailer uploaded |
| 9.4 | Capsule art: header, small capsule, library hero, logo | 2d | — | All required art uploaded |
| 9.5 | Press kit: description, screenshots, trailer link, dev bio | 1d | 9.2, 9.3 | Press kit page live |
| 9.6 | Community hub setup: discussions enabled, announcements channel | 0.5d | — | Community hub active |
| 9.7 | Set pricing (research comparable idle/space games) | 0.5d | — | Price set |
| 9.8 | Steam page review submission | 0.5d | 9.1-9.4 | Page approved |
| 9.9 | Release candidate build: final build uploaded to Steam | 1d | — | Build passes internal QA |
| 9.10 | Day-one patch preparation: known issues list, hotfix branch ready | 0.5d | 9.9 | Hotfix pipeline tested |
| 9.11 | Launch date set + announcement | 0.5d | 9.8 | Date public |

---

## Risk Matrix

| Risk | Impact | Likelihood | Score | Mitigation |
|------|--------|------------|-------|------------|
| **Game balance broken (dominant strategy)** | 5 | 4 | **20** | M6 dedicated balance milestone; 3 full playthroughs; economy spreadsheet |
| **Scope creep** | 4 | 4 | **16** | Strict milestone scope; "Out of Scope" list per milestone; defer to post-launch |
| **Endgame isn't satisfying** | 5 | 3 | **15** | Prototype ending early in M4; playtest the emotional arc before polishing |
| **Solo dev burnout** | 5 | 3 | **15** | Flexible schedule; buffer between milestones; celebrate each milestone |
| **Probethium economy feels grindy** | 4 | 3 | **12** | Economy spreadsheet in M2; tune earn rates before building content on top |
| **Steamworks + Electron issues** | 3 | 3 | **9** | Research early; PoC before M8 if worried; fallback to itch.io launch first |
| **Save file migration breaks** | 3 | 3 | **9** | Test old saves at every milestone; maintain migration chain |
| **Canvas performance at scale** | 3 | 2 | **6** | Profile after M4; basic shapes keep draw calls low; culling for off-screen |
| **Steam store page rejected** | 2 | 2 | **4** | Follow Steamworks guidelines; submit early for review buffer |

---

## Vertical Slice (Already Surpassed)

Probetheus v1.3 exceeds vertical slice requirements. The "core loop fun" question is already partially validated. What remains unvalidated:

- **Endgame loop**: Does the Signal Echo → decode → reward cycle feel compelling? (Validate in M4, task 4.1-4.5)
- **Probethium spending**: Does the economy create interesting decisions? (Validate in M2, task 2.11)
- **Story engagement**: Do players care about finding the Prometheus? (Validate in M3, playtest checkpoint)
- **Nexus construction**: Is active defense fun or annoying? (Validate in M4, task 4.9)

**Recommendation**: Build a minimal Echo 1 + decode sequence as the first M4 task and playtest it before committing to all 7.

---

## Quality Gates

| Gate | From → To | Criteria |
|------|-----------|----------|
| **Systems Complete** | M1-M2 → M3 | All purchasable upgrades work; economy spreadsheet drafted; no P0 bugs |
| **Story Complete** | M3 → M4 | All NPC dialogue written; story codex functional; narrative reviewed for coherence |
| **Feature Complete (Alpha)** | M4-M5 → M6 | Game is winnable start to finish; sandbox mode works; all features in; placeholder OK for polish |
| **Content Complete (Beta)** | M6-M7 → M8 | Balance tuned; all polish in; music/SFX complete; full playthrough under 20 hours; no P0/P1 bugs |
| **Steam Ready** | M8 → M9 | Achievements work; cloud saves work; build installs from Steam; overlay compatible |
| **Launch Ready** | M9 → Launch | Store page approved; trailer uploaded; pricing set; day-one patch pipeline tested; no P0 bugs |

---

## Resource Allocation (Solo Dev)

Since you're doing everything, here's how to think about time splits per milestone:

| Activity | % of Milestone Time | Notes |
|----------|-------------------|-------|
| **Code** | 50-60% | Primary work for M1-M5, M8 |
| **Design/Writing** | 15-20% | Heavy in M3-M4 (dialogue, lore, story) |
| **Art** | 5-10% | Basic shapes + particles; heavier in M7, M9 |
| **Music/Audio** | 5-10% | Can compose alongside any milestone; heavy in M7 |
| **QA/Testing** | 15-20% | Playwright tests per milestone; heavy in M6 |
| **Steam/Business** | 0-5% | Concentrated in M8-M9; account setup can happen any time |

**Parallelization opportunities**:
- Compose music while code is settling between milestones
- Set up Steam account during M1 (takes days to approve, no effort after initial setup)
- Write NPC dialogue (M3) while waiting on M2 playtest feedback
- Create capsule art / trailer assets incrementally from M5 onward

---

## Post-Launch Plan

### Week 1: Hotfix Cadence
- Monitor crash reports (Electron crash handler)
- Daily check for P0 bugs
- Hotfix build within 24 hours for critical issues

### Month 1: Player Feedback
- Read all Steam reviews and discussion posts
- Categorize feedback: bugs, balance, feature requests, praise
- Priority: fix bugs > adjust balance > quality of life

### Month 2-3: Content Update
- Based on player feedback, consider:
  - Additional Remnant dialogue
  - New shell cosmetics
  - Balance adjustments
  - New sector types

### Future (If Successful)
- DLC possibility: "The Void Rift" expansion (new galaxy layer hinted in endgame design)
- Additional story content
- Community-requested features

---

## Immediate Next Steps

1. **Now**: Set up Steam Developer account at partner.steamgames.com ($100)
2. **M1 Start**: `/gsd:new-milestone` for Hub Upgrades + Equipment Completion
3. **Background**: Start an economy spreadsheet tracking all resource rates/costs

---
*Plan created: 2026-04-04*
*Based on: v1.3 codebase, ENDGAME_DESIGN.md, PROMETHEUS_SAGA.md, PROBETHIUM_ECONOMY.md, DESIGN_NOTES.md, PROJECT.md*
