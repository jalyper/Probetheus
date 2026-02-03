# Probetheus Milestones

## Completed Milestones

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
