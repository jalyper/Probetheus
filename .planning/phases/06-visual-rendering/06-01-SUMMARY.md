---
phase: "06-visual-rendering"
plan: "01"
subsystem: "rendering"
tags: ["canvas", "particles", "signals", "visual-effects", "HSL"]

dependency-graph:
  requires: ["05-signal-type-system"]
  provides: ["exclusive-signal-visuals", "signal-duration-override", "performance-guarded-particles"]
  affects: ["07-signal-rewards", "10-testing-integration"]

tech-stack:
  added: []
  patterns: ["canvas-save-restore", "HSL-gradient-handling", "performance-guard-pattern"]

key-files:
  created:
    - "tests/signal-visuals.spec.js"
  modified:
    - "src/GameController.js"
    - "src/ProbeManager.js"

decisions:
  - id: "VIS-HSL-GRADIENT"
    description: "Detect HSL vs hex colors before gradient stop creation to avoid hexToRgba crash"
    rationale: "exotic_crystal uses cycling HSL colors which cannot be parsed by hex-to-rgba converter"

metrics:
  duration: "~28 minutes"
  completed: "2026-02-05"
  tests-added: 16
  tests-total: 214
---

# Phase 6 Plan 01: Exclusive Signal Visual Rendering Summary

Distinct visual rendering for four exclusive signal types with unique colors, particle effects, and extended lifetimes.

## What Was Done

### Task 1: Exclusive Signal Colors, Particles, and Duration Override

**GameController.js - 4 new color cases in renderSignals():**
- `ore_vein` -> `#ff6600` (orange)
- `data_cache` -> `#00ddff` (cyan)
- `relic` -> `#ffd700` (gold)
- `exotic_crystal` -> cycling `hsl()` (rainbow/prismatic)

**GameController.js - HSL gradient handling:**
- Added detection for non-hex colors before gradient.addColorStop() calls
- HSL strings matched via regex and converted to hsla() with proper alpha
- Fallback to white rgba() if color format is unrecognized

**GameController.js - renderExclusiveParticles() method:**
- `ore_vein`: 8 radiating lines rotating slowly outward from signal center
- `data_cache`: rotating hexagon outline around signal
- `relic`: 5 orbiting dust particles at varying speeds and distances
- `exotic_crystal`: 4 diamond-shaped facets with cycling rainbow hues

**Performance guard:** Particles only render when signal count < 50
**Graceful degradation:** try/catch wraps particle rendering call
**State safety:** ctx.save()/ctx.restore() prevents globalAlpha and lineDash leaks

**ProbeManager.js - Duration and radius override:**
- Exclusive signals: 5000-8000ms duration (vs 2000-3000ms standard)
- Exclusive signals: 10-13px radius (vs 8-12px standard)

### Task 2: Playwright Tests (VIS-01 through VIS-05)

16 tests in `tests/signal-visuals.spec.js`:
- VIS-01: Ore Vein renders without errors, orange color case verified
- VIS-02: Data Cache renders without errors, cyan color case verified
- VIS-03: Relic renders without errors, gold color case verified
- VIS-04: Exotic Crystal renders without errors (HSL gradient handling), HSL cycling verified
- VIS-05: Duration ranges validated (exclusive 5-8s, standard 2-3s), radius ranges validated
- Performance guard: 51 signals -> 0 particle calls; 4 signals -> 4 particle calls
- Graceful degradation: broken renderExclusiveParticles does not crash signal rendering
- Rendering state safety: globalAlpha=1.0 and lineDash=[] after render
- Particle method validation: all 4 types handled, save/restore used

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| HSL detection before gradient stops | exotic_crystal uses cycling HSL which crashes hexToRgba |
| Performance guard at 50 signals | Prevent frame drops from particle calculations |
| ctx.save()/ctx.restore() in particles | Isolated canvas state prevents rendering artifacts |
| Source code inspection for color tests | More reliable than canvas pixel inspection for CI |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 0642c46 | feat(06-01): add exclusive signal visual rendering and duration override |
| 57a74ee | test(06-01): add Playwright tests for exclusive signal visual rendering |

## Test Results

- 16 new tests added (signal-visuals.spec.js)
- 214 total tests passing
- 0 regressions

## Next Phase Readiness

Phase 6 Plan 01 complete. All 5 VIS requirements implemented and tested:
- VIS-01: Ore Vein orange with radiating lines
- VIS-02: Data Cache cyan with rotating hexagon
- VIS-03: Relic gold with orbiting dust
- VIS-04: Exotic Crystal rainbow HSL with diamond facets
- VIS-05: Exclusive signals 5-8s duration

Ready for Phase 7 (Signal Rewards) or next plan in Phase 6 if applicable.
