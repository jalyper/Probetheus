# Probetheus Roadmap

## Current Milestone: v1.1 Shell Visuals & Cosmetics

### Phase 1: Shell Visuals for Probes ✓

**Goal:** Implement Shell system for probes that allows equipping Shells via the Probe Details panel, granting visual aesthetics similar to the existing red probe skin. Includes unique trail effects (color variations) mapped to Dark Market shells.

**Depends on:** None (first phase)
**Status:** Complete
**Completed:** 2026-01-27
**Plans:** 1 plan

Plans:
- [x] 01-01-PLAN.md — Bridge shell visuals to probe.cosmetic and add glow rendering

**Details:**
The shell system already has visual definitions (color, trail, glow) but they aren't applied to probe rendering. This plan bridges the gap by:
1. Adding buildCosmeticFromShell() to convert shell.visual to probe.cosmetic format
2. Updating equipShellOnProbe() to apply cosmetic data immediately
3. Adding shadowBlur glow effect in drawProbeComponents() for shells with glow:true
4. Tests verifying visual application works correctly

Key requirements:
- Equip shells via Probe Details panel (already working)
- Visual aesthetic changes (similar to red probe skin) - this plan
- Trail effect color changes based on shell - this plan
- Map all shells to Dark Market offerings (already complete in ShellSystem.js)
- Reference existing red/solar skin implementation for trails - used as reference

---

### Phase 2: Shell Persistence on Save/Load

**Goal:** Ensure per-probe shell assignments persist through save/load cycles. When a player equips a custom shell on a specific probe, saves the game, and loads that save, the probe should retain its equipped shell and visual appearance.

**Depends on:** Phase 1 (Shell Visuals for Probes)
**Status:** Not started
**Gap Closure:** Closes gaps from v1.1 audit
**Plans:** 1 plan

Plans:
- [ ] 02-01-PLAN.md — Add shellId serialization and cosmetic refresh on load

**Details:**
Closes the following audit gaps:
- Integration: `probe.shellId` not serialized in SaveManager.js
- Integration: `refreshProbeCosmetic()` not called after save/load restore
- Flow: Per-probe shell persistence (shellId lost on save/load)

Key changes:
- Add `shellId` to probe serialization in `SaveManager.createSaveData()`
- Restore `shellId` and call `refreshProbeCosmetic()` in `SaveManager.restoreFromData()`
- Add integration test for shell persistence through save/load cycle

---

## Future Milestones

(To be planned)
