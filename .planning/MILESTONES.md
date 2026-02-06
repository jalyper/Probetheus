# Probetheus Milestones

## Completed Milestones

### v1.3 - Signal Distribution System
**Completed:** 2026-02-06
**Phases:** 7 (Phases 5-10, plus 8.5)
**Plans:** 14
**Requirements:** 35/35

**Delivered:** Sector-specific exclusive signals with distinct visuals, enhanced rewards, resource profiles, probethium synthesis, discovery reveal UI, and 45 integration tests validating the complete player progression.

**Key accomplishments:**
- Exclusive signal types (Ore Vein, Data Cache, Relic, Exotic Crystal) spawn at 15-30% rate in designated sectors with distinct colors and particle effects
- 2x resource yields and rarity gating for exclusive signal rewards
- Sector resource profiles assigned on discovery with distance-weighted RNG for progression feel
- Probethium synthesis system: research-gated hub button converting exotic minerals to probethium with 3-phase canvas animation
- Sector Survey Report modal with 8 sections, Unicode progress bars, discovery log, and guaranteed epic+ bonus signals
- 45 integration tests: 27 progression gates, 11 happy path flows, 7 statistical validation tests

**Stats:**
- 56 files created/modified
- 27,253 lines added, 11,303 removed
- 7 phases, 14 plans
- 2 days (2026-02-05 to 2026-02-06)
- Git range: `7f704f3` -> `3b39853`

**Tech Debt:**
- Hub and mining station shells not visually applied (carried from v1.1)

**Archive:** `.planning/milestones/v1.3-ROADMAP.md`

---

### v1.2 - Shell Bonuses & Effects
**Completed:** 2026-02-02
**Phases:** 4 (Phases 1-4)
**Plans:** 9
**Requirements:** 25/25

**Delivered:** All 12 shell bonus types functional in gameplay with per-entity resolution, bonus tooltips on all detail panels, and full save/load persistence.

**Key accomplishments:**
- Normalized ~40 shell bonus values to rarity scale and built per-entity bonus resolver
- Wired 8 probe bonus types into ProbeManager (signals, range, rarity, durability, survival, discovery, rewards, yield)
- Wired hub researchSpeed as cost reduction and 3 mining station bonuses (efficiency, probethium, shuttle speed)
- Built tooltip system showing bonus icon, label, and percentage on hover across all panels
- 67 tests across 8 test files covering gameplay, isolation, UI, and save/load integration

**Stats:**
- 35 files created/modified
- 5141 lines added, 620 removed
- 4 phases, 9 plans
- Git range: `583010d` → `c8b5060`

**Tech Debt:**
- Hub and mining station shells not visually applied (carried from v1.1)

**Archive:** `.planning/milestones/v1.2-ROADMAP.md`

---

### v1.1 - Shell Visuals & Cosmetics
**Completed:** 2026-01-27
**Phases:** 2
**Plans:** 2
**Tasks:** 6

**Accomplishments:**
- Shell cosmetic system bridges shell.visual to probe.cosmetic format
- Equipping shells changes probe body color, trail color, and glow effects
- Canvas shadowBlur glow effect for shells with glow:true property
- Shell assignments persist through save/load cycles per-probe
- 27 new tests covering shell visuals and persistence

**Key Files:**
- `src/ShellSystem.js` - buildCosmeticFromShell(), equipShellOnProbe(), refreshProbeCosmetic()
- `src/GameController.js` - Glow effect rendering with shadowBlur
- `src/SaveManager.js` - shellId serialization and cosmetic refresh on load

**Tech Debt:**
- Hub and mining station shells not visually applied (deferred to future milestone)

**Archive:** `.planning/milestones/v1.1-ROADMAP.md`

---
