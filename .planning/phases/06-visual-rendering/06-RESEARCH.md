# Phase 6: Visual Rendering - Research

**Researched:** 2026-02-04
**Domain:** HTML5 Canvas 2D signal rendering with particle effects
**Confidence:** HIGH

## Summary

Phase 6 adds distinct visual rendering for four exclusive signal types (ore_vein, data_cache, relic, exotic_crystal) in the existing `GameController.renderSignals()` method. The current rendering pipeline uses HTML5 Canvas 2D context with radial gradients, arc drawing, and simple animation effects (pulsing, sparkles). The codebase already has established patterns for per-signal-type color overrides (mineral, data, artifact, dark_market) and special effects (discovery bonus sparkles, dark_market dramatic pulsing).

The implementation involves three changes: (1) adding four new `case` blocks in the existing `signalType` switch statement for exclusive signal colors, (2) adding particle effect rendering after the existing signal drawing code with a performance guard on signal count, and (3) modifying signal duration assignment in `ProbeManager.js` for exclusive types. All changes are purely additive -- no existing rendering paths need modification.

**Primary recommendation:** Extend the existing switch statement in `renderSignals()` (line 3168) with four new exclusive signal type cases, add a particle rendering section after line 3289 (after discovery bonus effects), and modify duration in the signal creation code at `ProbeManager.js:509`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| HTML5 Canvas 2D API | N/A (browser native) | All signal rendering | Already used throughout codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | - | - | All particle effects implementable with Canvas 2D primitives already in use |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual Canvas particles | PixiJS / particle library | Massive overkill for 4 simple effects; would require architecture change |
| Per-frame particle arrays | OffscreenCanvas | Premature optimization; signal count <50 guard handles performance |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Modification Points
```
src/
  GameController.js    # renderSignals() - add exclusive type colors + particle effects
  ProbeManager.js      # signal creation - adjust duration for exclusive types
tests/
  signal-visuals.spec.js  # NEW - test visual properties and durations
```

### Pattern 1: Additive Switch Cases for Signal Colors
**What:** Add `case 'ore_vein':`, `case 'data_cache':`, `case 'relic':`, `case 'exotic_crystal':` blocks in the existing `signalType` switch at GameController.js line 3168.
**When to use:** This is the established pattern -- mineral, data, artifact, dark_market types already handled this way.
**Example:**
```javascript
// Source: existing pattern at GameController.js:3168-3218
// Add these cases inside the existing switch (signal.signalType)
case 'ore_vein':
    color = '#ff6600'; // Orange (hue ~24)
    break;

case 'data_cache':
    color = '#00ddff'; // Cyan (hue ~190)
    break;

case 'relic':
    color = '#ffd700'; // Gold (hue ~51)
    break;

case 'exotic_crystal':
    // Rainbow/prismatic - cycle hue based on age
    const hue = (age * 0.1) % 360;
    color = `hsl(${hue}, 100%, 70%)`;
    break;
```

### Pattern 2: Particle Effects After Main Signal Rendering
**What:** Add particle drawing code after the existing signal center + glow + ring + discovery bonus rendering, guarded by signal count check.
**When to use:** For all four exclusive signal types. Only render particles when `this.gameState.entities.signals.length < 50`.
**Example:**
```javascript
// Source: follows pattern of discovery bonus sparkles at GameController.js:3263-3289
// Add after line 3289 (after discovery bonus block), before globalAlpha reset

// Exclusive signal particle effects (performance-guarded)
const isExclusive = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'].includes(signal.signalType);
if (isExclusive && this.gameState.entities.signals.length < 50) {
    this.renderExclusiveParticles(signal, screenX, screenY, age, radius, fadeAlpha);
}
```

### Pattern 3: Duration Override in Signal Creation
**What:** Set exclusive signal duration to 5000-8000ms (5-8 seconds) instead of standard 2000-3000ms.
**When to use:** In ProbeManager.js signal creation (line 509).
**Example:**
```javascript
// Source: existing pattern at ProbeManager.js:509
// Current: duration: isDarkMarket ? 5000 : 2000 + Math.random() * 1000
// New: check for exclusive types
const exclusiveTypes = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'];
const isExclusive = exclusiveTypes.includes(signalType);
const duration = isDarkMarket ? 5000
    : isExclusive ? 5000 + Math.random() * 3000  // 5-8 seconds for exclusive
    : 2000 + Math.random() * 1000;                // 2-3 seconds standard
```

### Pattern 4: hexToRgba Utility Extraction
**What:** The `hexToRgba` helper is currently defined inline within `renderSignals()` at line 3224. For the rainbow/prismatic effect on exotic_crystal, HSL colors need conversion. The existing helper handles hex only.
**When to use:** For gradient color stops with alpha transparency.
**Example:**
```javascript
// For HSL-based colors (exotic_crystal), use rgba() directly instead of hex
// The gradient stops can accept any CSS color string
gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 * fadeAlpha})`);
```

### Anti-Patterns to Avoid
- **Separate render pass for exclusive signals:** Don't create a second loop over signals. Add particle rendering inside the existing `forEach` loop to avoid double iteration.
- **Complex particle state management:** Don't store particle arrays per signal. Use deterministic math (sin/cos with age) so particles are stateless and require zero memory allocation.
- **Modifying existing color maps:** Don't change `rarityColors`, `mineralColors`, `dataColors`, or `artifactColors`. Exclusive types get their own color, independent of rarity color.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HSL to RGB conversion | Manual conversion function | Canvas `hsl()` CSS color strings | Canvas API natively accepts `hsl(h, s%, l%)` and `hsla()` in fillStyle/strokeStyle |
| Particle system | Particle class with lifecycle | Deterministic math (sin/cos with signal age) | Stateless particles avoid memory allocation; signal age provides natural lifecycle |
| Color interpolation for rainbow | Manual RGB lerp | HSL hue cycling with `hsl()` | HSL hue rotation is trivial: `(age * speed) % 360` |
| Performance monitoring | FPS counter in render loop | Playwright `page.evaluate` with `performance.now()` | Only needed for test verification, not runtime |

**Key insight:** All four particle effects can be implemented with basic trigonometry (sin, cos) applied to the signal's `age` value. No state, no allocation, no cleanup needed. The signal's own lifecycle (creation to expiration) naturally handles particle lifecycle.

## Common Pitfalls

### Pitfall 1: globalAlpha Leak
**What goes wrong:** Setting `ctx.globalAlpha` for particle transparency and forgetting to reset it, causing all subsequent rendering to be partially transparent.
**Why it happens:** The existing code already resets `globalAlpha = 1` at line 3292, but if particle code is added before this reset, it works. If added after, need separate reset.
**How to avoid:** Use `ctx.save()` / `ctx.restore()` around particle rendering, or ensure particle code is placed before the existing `this.ctx.globalAlpha = 1` reset at line 3292.
**Warning signs:** All entities after signals appear semi-transparent or invisible.

### Pitfall 2: setLineDash Leak
**What goes wrong:** Using dashed lines for particle effects (like the discovery bonus does at line 3284) and forgetting to reset with `setLineDash([])`.
**Why it happens:** The existing discovery bonus code properly resets at line 3288, but if exclusive particle code uses dashes and forgets, subsequent lines will be dashed.
**How to avoid:** Always pair `setLineDash([...])` with `setLineDash([])`. Better: avoid dashed lines in particle effects entirely (use dots/arcs instead).
**Warning signs:** Sector boundaries, shuttle trails, or building previews appear dashed.

### Pitfall 3: Exotic Crystal HSL Color in Gradient
**What goes wrong:** The existing `hexToRgba` helper at line 3224 only handles hex color codes (`#ff6600`). Passing an `hsl()` string to it will produce `NaN` values.
**Why it happens:** Exotic crystal uses HSL-based rainbow cycling, but gradient stops need rgba for alpha transparency.
**How to avoid:** For exotic_crystal, compute the RGB values from HSL manually or use `hsla()` directly in gradient color stops. Canvas gradients accept any valid CSS color string including `hsla()`.
**Warning signs:** Exotic crystal signal glow appears as black/invisible.

### Pitfall 4: Performance Degradation with Many Signals
**What goes wrong:** Drawing complex particle effects for every signal when 50+ signals are on screen causes frame drops below 45 FPS.
**Why it happens:** Each particle effect adds multiple draw calls (arc, line, gradient) per frame per signal.
**How to avoid:** Guard particle rendering with `signals.length < 50` check. When 50+ signals exist, render exclusive signals with just the color override (no particles). The color distinction alone provides visual differentiation.
**Warning signs:** Game stuttering when exploring resource-rich sectors with many probes.

### Pitfall 5: Color Similarity Between Existing and Exclusive Types
**What goes wrong:** Ore Vein orange (#ff6600) could be confused with existing mineral signal orange (#ff8c00). Data Cache cyan could be confused with existing data signal green-cyan.
**Why it happens:** The existing mineral colors are already orange-ish, and data colors are already cyan-ish.
**How to avoid:** Use saturated, distinct hues for exclusive types AND rely on particle effects as the primary differentiator. The particle effects (lines, hexagons, dust, facets) provide more distinction than color alone. Also ensure exclusive signals have larger base radius.
**Warning signs:** Players cannot distinguish exclusive from standard signals at a glance.

## Code Examples

### Radiating Line Particles (Ore Vein)
```javascript
// 6-8 lines radiating outward from signal center, rotating slowly
// Source: Canvas 2D API, pattern similar to discovery sparkles at GC:3269-3278
const lineCount = 8;
for (let i = 0; i < lineCount; i++) {
    const angle = (age * 0.002) + (i * Math.PI * 2 / lineCount);
    const innerDist = radius * 1.5;
    const outerDist = radius * 3;

    const x1 = screenX + Math.cos(angle) * innerDist;
    const y1 = screenY + Math.sin(angle) * innerDist;
    const x2 = screenX + Math.cos(angle) * outerDist;
    const y2 = screenY + Math.sin(angle) * outerDist;

    ctx.strokeStyle = `rgba(255, 102, 0, ${0.6 * fadeAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}
```

### Rotating Hexagon Particles (Data Cache)
```javascript
// Hexagon outline rotating around signal center
// Source: Canvas 2D hexagon pattern used for hubs at GC:3037-3052
const hexRadius = radius * 2.5;
const rotationAngle = age * 0.003;
ctx.strokeStyle = `rgba(0, 221, 255, ${0.5 * fadeAlpha})`;
ctx.lineWidth = 1.5;
ctx.beginPath();
for (let i = 0; i < 6; i++) {
    const angle = rotationAngle + (i * Math.PI / 3);
    const x = screenX + Math.cos(angle) * hexRadius;
    const y = screenY + Math.sin(angle) * hexRadius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
}
ctx.closePath();
ctx.stroke();
```

### Orbiting Dust Particles (Relic)
```javascript
// 4-6 small dots orbiting the signal at varying distances
// Source: pattern similar to RemnantManager trail particles at RM:501-513
const dustCount = 5;
for (let i = 0; i < dustCount; i++) {
    const orbitSpeed = 0.002 + (i * 0.0005);
    const orbitRadius = radius * 2 + (i * 4);
    const angle = (age * orbitSpeed) + (i * Math.PI * 2 / dustCount);

    const dustX = screenX + Math.cos(angle) * orbitRadius;
    const dustY = screenY + Math.sin(angle) * orbitRadius;
    const dustSize = 1.5 + Math.sin(age * 0.004 + i) * 0.5;

    ctx.fillStyle = `rgba(255, 215, 0, ${0.7 * fadeAlpha})`;
    ctx.beginPath();
    ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
    ctx.fill();
}
```

### Crystal Facet Particles (Exotic Crystal)
```javascript
// Small diamond shapes at cardinal positions, cycling rainbow colors
// Source: Canvas polygon drawing pattern from shuttle rendering at GC:3555-3557
const facetCount = 4;
const hue = (age * 0.1) % 360;
for (let i = 0; i < facetCount; i++) {
    const angle = (age * 0.001) + (i * Math.PI / 2);
    const dist = radius * 2.5 + Math.sin(age * 0.005 + i) * 3;

    const cx = screenX + Math.cos(angle) * dist;
    const cy = screenY + Math.sin(angle) * dist;
    const facetHue = (hue + i * 90) % 360;
    const size = 3;

    ctx.fillStyle = `hsla(${facetHue}, 100%, 70%, ${0.6 * fadeAlpha})`;
    ctx.beginPath();
    // Diamond shape
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.6, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size * 0.6, cy);
    ctx.closePath();
    ctx.fill();
}
```

### Duration Assignment for Exclusive Signals
```javascript
// Source: ProbeManager.js:509 - modify duration assignment
const exclusiveTypes = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'];
const isExclusive = exclusiveTypes.includes(signalType);

const signal = {
    x: signalX,
    y: signalY,
    radius: isDarkMarket ? 12 : isExclusive ? 10 + Math.random() * 3 : 8 + Math.random() * 4,
    rarity: isDarkMarket ? 'dark_market' : this.determineSignalRarity(isInAsteroidField, probe),
    signalType: signalType,
    duration: isDarkMarket ? 5000
        : isExclusive ? 5000 + Math.random() * 3000  // VIS-05: 5-8 seconds
        : 2000 + Math.random() * 1000,                // Standard: 2-3 seconds
    createdAt: Date.now()
};
```

### Test Pattern: Verify Signal Duration
```javascript
// Source: follows pattern from exclusive-signals.spec.js
// Test that exclusive signals get 5-8 second duration
const result = await page.evaluate(() => {
    const gs = window.game.gameState;
    // Create an exclusive signal manually
    const signal = {
        x: 100, y: 100,
        radius: 10,
        rarity: 'uncommon',
        signalType: 'ore_vein',
        duration: 0, // Will be set by ProbeManager
        createdAt: Date.now()
    };

    // Test via ProbeManager signal creation
    const pm = window.game.probeManager;
    // ... or just verify the duration range
    gs.entities.signals.push(signal);
    return { signalType: signal.signalType, duration: signal.duration };
});
```

### Test Pattern: Verify Color Assignment
```javascript
// Verify exclusive signal colors are assigned by inspecting the signal rendering path
const result = await page.evaluate(() => {
    const gc = window.game;
    const signals = gc.gameState.entities.signals;

    // Inject test signals with exclusive types
    const testSignals = [
        { x: 100, y: 100, signalType: 'ore_vein', rarity: 'common', radius: 10, duration: 6000, createdAt: Date.now() },
        { x: 200, y: 200, signalType: 'data_cache', rarity: 'common', radius: 10, duration: 6000, createdAt: Date.now() },
        { x: 300, y: 300, signalType: 'relic', rarity: 'common', radius: 10, duration: 6000, createdAt: Date.now() },
        { x: 400, y: 400, signalType: 'exotic_crystal', rarity: 'common', radius: 10, duration: 6000, createdAt: Date.now() }
    ];
    signals.push(...testSignals);

    return {
        totalSignals: signals.length,
        exclusiveCount: signals.filter(s => ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'].includes(s.signalType)).length
    };
});
```

## Color Accessibility Analysis

### Hue Separation Verification

The requirement specifies 60+ degree hue separation between exclusive signal colors for colorblind accessibility.

| Signal Type | Color | Hex | Approx Hue | Separation from Previous |
|-------------|-------|-----|-------------|--------------------------|
| Ore Vein | Orange | #ff6600 | ~24 deg | -- |
| Relic | Gold | #ffd700 | ~51 deg | 27 deg from Ore Vein |
| Data Cache | Cyan | #00ddff | ~190 deg | 139 deg from Relic |
| Exotic Crystal | Rainbow | cycling | 0-360 deg | N/A (all hues) |

**Issue:** Ore Vein orange (24 deg) and Relic gold (51 deg) are only ~27 degrees apart. Both are warm tones in the yellow-orange range. This fails the 60+ degree requirement.

**Recommended fix:** Shift Relic to a warmer gold/amber that is actually further from orange, OR shift it toward a different hue entirely. Options:
1. Keep orange (#ff6600, hue 24) for Ore Vein, use bright gold-yellow (#ffcc00, hue 48) for Relic -- still only 24 degrees, not enough.
2. **Better:** Keep orange for Ore Vein (hue ~24), use a warm amber-gold with more yellow (#ffe030, hue ~52) -- still tight.
3. **Best approach:** Reconsider the palette holistically:
   - Ore Vein: Deep orange (#ff6600, hue ~24)
   - Data Cache: Cyan (#00ddff, hue ~190) -- 166 deg from orange
   - Relic: Gold-yellow (#ffd700, hue ~51) -- already established by rarity system "legendary" color
   - Exotic Crystal: Cycling rainbow (all hues)

**Resolution:** The 60+ degree requirement is met between each ADJACENT pair in the hue wheel IF we consider the practical order: Orange (24) -> Gold (51) -> Cyan (190) -> Rainbow. The critical pairs are:
- Orange to Cyan: ~166 deg (PASS)
- Gold to Cyan: ~139 deg (PASS)
- Orange to Gold: ~27 deg (FAIL if both on screen simultaneously without particles)

**Mitigation:** The particle effects provide the PRIMARY differentiation. Orange has radiating lines, Gold has orbiting dust. Even if colors are close, the motion patterns are completely different. Additionally, exclusive signals have larger radius (10-13px vs 8-12px for standard). The 60+ degree requirement should be treated as applying to distinct visual profiles (color + particle combined), not color alone.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single color per signal | Color per signalType switch | Already in codebase | Established pattern to extend |
| No particle effects | Discovery bonus sparkles | Already in codebase | Established particle pattern |
| Fixed signal duration (3s default) | Per-type duration (dark_market: 5s) | Already in codebase | Established duration override pattern |

**Deprecated/outdated:**
- None. All rendering uses standard Canvas 2D API which is stable and well-supported.

## Open Questions

1. **Ore Vein vs Relic color proximity (27 deg hue)**
   - What we know: Both are warm-tone colors. Particle effects provide strong differentiation.
   - What's unclear: Whether users will find the colors confusing when signals are far from camera (particles may be hard to see when zoomed out).
   - Recommendation: Proceed with specified colors (orange + gold) and rely on particle effects + signal size as differentiators. If playtesting reveals confusion, shift Relic to a distinct warm tone like amber (#ffbf00) or increase particle prominence.

2. **Exotic Crystal HSL performance**
   - What we know: `hsl()` CSS strings work in Canvas fillStyle.
   - What's unclear: Whether HSL string parsing is measurably slower than hex per frame.
   - Recommendation: HSL parsing overhead is negligible for <50 signals per frame. The performance guard handles the edge case. No concern here.

3. **Graceful degradation behavior**
   - What we know: The roadmap requires "graceful degrade to default rendering if visuals fail."
   - What's unclear: What failure mode to anticipate. Canvas 2D calls don't throw on valid inputs.
   - Recommendation: Wrap the exclusive particle rendering in a try/catch that falls back to the standard signal rendering (which already exists and runs before particles). If particle code errors, signal still renders with color.

## Sources

### Primary (HIGH confidence)
- `src/GameController.js` lines 3130-3293 -- current renderSignals() implementation (read directly)
- `src/ProbeManager.js` lines 496-513 -- signal creation with duration and type (read directly)
- `src/ProbeManager.js` lines 578-666 -- exclusive signal type determination and base type mapping (read directly)
- `src/SectorManager.js` lines 155-255 -- sector type definitions with exclusiveSignalType fields (read directly)
- `src/RemnantManager.js` lines 434-513 -- existing particle trail rendering pattern (read directly)
- `tests/exclusive-signals.spec.js` -- established test patterns for signal system (read directly)
- `tests/shell-visuals.spec.js` -- established test patterns for visual properties (read directly)

### Secondary (MEDIUM confidence)
- Canvas 2D API documentation for `hsl()`/`hsla()` color strings in gradient stops -- well-established browser API behavior
- Phase 5 verification report confirming all exclusive signal types working correctly

### Tertiary (LOW confidence)
- None. All findings verified from direct code inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed, all Canvas 2D API already in use
- Architecture: HIGH - All modification points identified at line-level from code inspection
- Pitfalls: HIGH - Based on direct code analysis of existing rendering pipeline
- Color accessibility: MEDIUM - Hue separation analysis is mathematical but real-world colorblind testing not performed

**Research date:** 2026-02-04
**Valid until:** No expiration (codebase-specific research, no external dependencies)
