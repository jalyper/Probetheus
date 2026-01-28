# Phase 1: Shell Visuals for Probes - Research

**Researched:** 2026-01-27
**Domain:** Visual rendering, cosmetic systems, canvas 2D graphics
**Confidence:** HIGH

## Summary

This research investigates how to implement visual changes to probes based on equipped shells. The codebase already has a robust foundation:

1. **ShellSystem.js** - A complete shell catalog with 25+ probe shells, each containing `visual` properties including `color`, `trail`, `glow`, and `pattern` fields
2. **CosmeticManager.js** - A legacy cosmetic system that demonstrates the trail implementation pattern (`probe.cosmetic.trail` object)
3. **GameController.js** - Contains `renderProbes()`, `drawProbeComponents()`, and `drawProbeTrail()` methods that use `probe.cosmetic` data

The key insight is that the shell system stores visual data (`shell.visual`) but the rendering system reads from `probe.cosmetic`. The integration point is clear: when a shell is equipped on a probe, the shell's visual properties need to populate the probe's cosmetic data structure.

**Primary recommendation:** Modify `ShellSystem.equipShellOnProbe()` to copy shell visual properties to `probe.cosmetic`, and update rendering to apply glow effects based on shell config.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D API | Native | Probe rendering | Already used throughout GameController |
| Vanilla JS | ES6+ | Shell system logic | Project standard, no frameworks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Playwright | 1.x | Testing visual changes | Test verification |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Canvas 2D | WebGL/Three.js | Overkill for 2D sprites, would require major refactor |
| Manual hex-to-rgba | Color library | Not needed, existing code handles this well |

**No new dependencies required.** All functionality can be achieved with existing code patterns.

## Architecture Patterns

### Existing Data Flow
```
ShellSystem.js                 ProbeManager.js               GameController.js
     |                               |                             |
SHELL_CATALOG                  probe object                   renderProbes()
  ├── probes                        |                             |
  │   └── shell.visual         probe.cosmetic ─────────────► drawProbeTrail()
  │       ├── color                 ├── trailEnabled              drawProbeComponents()
  │       ├── trail                 ├── trail.color
  │       └── glow                  ├── trail.width
  │                                 └── bodyColor
  │
  └── equipShellOnProbe()  ──► sets probe.shellId
```

### Recommended Pattern: Shell-to-Cosmetic Bridge
```
equipShellOnProbe(probe, shellId)
    │
    ├── probe.shellId = shellId
    │
    └── probe.cosmetic = buildCosmeticFromShell(shell)
            │
            ├── trailEnabled: true
            ├── trail: { color, width, length, opacity }
            ├── bodyColor: shell.visual.color
            ├── wingColor: shell.visual.color
            ├── glow: shell.visual.glow
            └── pattern: shell.visual.pattern (future)
```

### Recommended Project Structure
No new files needed. Changes should be made to:
```
src/
├── ShellSystem.js       # Add cosmetic building logic
├── GameController.js    # Apply glow effects, use shell color
└── tests/
    └── shell-system.spec.js  # Add visual tests
```

### Pattern 1: Cosmetic Property Mapping
**What:** Map shell visual properties to the cosmetic format expected by rendering
**When to use:** When equipping/unequipping shells
**Example:**
```javascript
// In ShellSystem.js
buildCosmeticFromShell(shell) {
    const visual = shell?.visual || {};
    return {
        trailEnabled: true,
        trail: {
            length: 15,
            color: visual.trail || visual.color || '#00ffff',
            width: visual.glow ? 4 : 3,  // Wider trail for glow shells
            opacity: visual.glow ? 0.95 : 0.9
        },
        bodyColor: visual.color || '#00ffff',
        wingColor: visual.color || '#00ffff',
        frontColor: visual.color || '#00ffff',
        antennaColor: visual.color || '#00ffff',
        glow: visual.glow || false,
        blinkSpeed: 1500
    };
}
```

### Pattern 2: Glow Effect in Rendering
**What:** Add glow filter when shell has `glow: true`
**When to use:** During probe body rendering
**Example:**
```javascript
// In drawProbeComponents(), before drawing body:
if (skin?.glow) {
    this.ctx.shadowColor = bodyColor;
    this.ctx.shadowBlur = 10;
}

// After drawing, reset shadow:
this.ctx.shadowBlur = 0;
```

### Anti-Patterns to Avoid
- **Reading shell data during render:** Don't call `shellSystem.getProbeShell()` every frame. Cache the visual data on `probe.cosmetic` when equipped.
- **Separate visual state from probe:** Keep all visual state on the probe object itself, not in external lookups.
- **Modifying SHELL_CATALOG:** The catalog is static definitions. Don't mutate it at runtime.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hex to RGBA conversion | Custom parser | Existing `drawProbeComponents()` already handles this | Lines 2787-2801 in GameController.js |
| Trail fading | Custom alpha calculation | Existing `drawProbeTrail()` calculates fade ratio | Lines 2927-2929 in GameController.js |
| Color parsing | Regex parsing | Simple `slice()` on hex strings | Pattern established in codebase |

**Key insight:** The `CosmeticManager.createSkinCatalog()` shows exactly how the cosmetic object should be structured. The `crimson_explorer` skin demonstrates the trail configuration pattern with color, width, length, and opacity.

## Common Pitfalls

### Pitfall 1: Forgetting to Apply Cosmetic on Shell Equip
**What goes wrong:** Shell is equipped (probe.shellId set) but probe appearance doesn't change
**Why it happens:** Only `probe.shellId` is set, but `probe.cosmetic` still has old/default values
**How to avoid:** Always update `probe.cosmetic` when calling `equipShellOnProbe()`
**Warning signs:** Shell name updates in UI but probe color doesn't change in game view

### Pitfall 2: Clearing Cosmetic When No Shell
**What goes wrong:** Probe loses trail/color when shell is removed
**Why it happens:** Setting `probe.cosmetic = null` instead of resetting to default
**How to avoid:** Always fall back to default cosmetic, never null
**Warning signs:** Probe disappears or has no trail after changing shells

### Pitfall 3: Missing Zoom Level in Screen Position
**What goes wrong:** Connector line or visual effects drift from probe at different zoom levels
**Why it happens:** Not multiplying by `world.zoomLevel` when calculating screen position
**How to avoid:** Always use the `getProbeScreenPosition()` pattern in UIManager.js (lines 130-147)
**Warning signs:** Visual elements detach from probe when zooming in/out

### Pitfall 4: Performance Degradation from Per-Frame Shell Lookups
**What goes wrong:** Game slows down with many probes
**Why it happens:** Calling `shellSystem.getProbeShell()` every render frame
**How to avoid:** Cache cosmetic data on probe object, only update on shell change
**Warning signs:** FPS drops proportional to probe count

## Code Examples

Verified patterns from existing codebase:

### Existing Trail Configuration (CosmeticManager.js:82-88)
```javascript
// Source: src/CosmeticManager.js lines 82-88
trail: {
    length: 18,      // Longer trail
    color: '#ff4500', // Orange-red trail
    width: 4,        // Wider trail
    opacity: 0.85
}
```

### Existing Trail Rendering (GameController.js:2880-2929)
```javascript
// Source: src/GameController.js lines 2886-2890
const trailConfig = probe.cosmetic.trail || {};
const maxTrailLength = trailConfig.length || 15;
const trailColor = trailConfig.color || probe.cosmetic.bodyColor || '#0ff';
const trailWidth = trailConfig.width || 2;
const trailOpacity = trailConfig.opacity || 0.8;
```

### Existing Probe Color Application (GameController.js:2776-2779)
```javascript
// Source: src/GameController.js lines 2776-2779
const bodyColor = skin?.bodyColor || probeColor;
const wingColorBase = skin?.wingColor || probeColor;
const antennaColorBase = skin?.antennaColor || probeColor;
const frontColor = skin?.frontColor || probeColor;
```

### Shell Visual Data Structure (ShellSystem.js:105-106)
```javascript
// Source: src/ShellSystem.js lines 105-106
visual: { color: '#9400d3', trail: '#9400d3', glow: true }
```

### Current equipShellOnProbe (ShellSystem.js:761-771)
```javascript
// Source: src/ShellSystem.js lines 761-771
equipShellOnProbe(probe, shellId) {
    if (!this.ownsShell('probes', shellId)) {
        return { success: false, error: 'Shell not owned' };
    }

    probe.shellId = shellId;
    this.eventBus.emit('shell:equippedOnProbe', { probe, shellId });
    this.eventBus.emit('ui:update');

    return { success: true };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CosmeticManager (skins) | ShellSystem (shells) | Jan 2026 | Shell system replaces skin system for cosmetics |
| Single cosmetic per probe | Per-probe shellId | Jan 2026 | Each probe can have different shell |
| No glow effects | Glow flag in shell.visual | Jan 2026 | Shells can specify glow effect |

**Deprecated/outdated:**
- `CosmeticManager.ownedSkins`: Migrated to `ShellSystem.ownedShells`
- `probe.cosmetic` from CosmeticManager: Should now come from ShellSystem

## Open Questions

Things that couldn't be fully resolved:

1. **Pattern implementation (shell.visual.pattern)**
   - What we know: Shells have a `pattern` field (e.g., 'circuit', 'hex', 'wave')
   - What's unclear: No existing rendering code for patterns
   - Recommendation: Defer pattern rendering to Phase 2; focus on color and trail first

2. **Default shell application to existing probes**
   - What we know: New probes get cosmetic from CosmeticManager.getActiveSkinDesign()
   - What's unclear: Should existing probes without shellId get default shell cosmetic?
   - Recommendation: Apply default cosmetic to probes with no shellId during rendering

## Sources

### Primary (HIGH confidence)
- src/ShellSystem.js - Complete shell catalog with visual properties
- src/GameController.js - Rendering implementation (renderProbes, drawProbeTrail, drawProbeComponents)
- src/CosmeticManager.js - Legacy skin system showing cosmetic data structure
- src/UIManager.js - Shell modal and shell section UI

### Secondary (MEDIUM confidence)
- tests/shell-system.spec.js - Testing patterns for shell equipping
- src/ProbeManager.js - Probe creation with cosmetic property

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All code is in existing codebase, no external research needed
- Architecture: HIGH - Clear data flow visible in existing code
- Pitfalls: HIGH - Based on actual code patterns and connector line fix in recent commits

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable existing codebase)
