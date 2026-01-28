# Probetheus Milestones

## Completed Milestones

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
