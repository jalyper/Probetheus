# Phase 8.5: Probethium Synthesis - Research

**Researched:** 2026-02-05
**Domain:** Canvas animation system, research tree extension, hub UI integration
**Confidence:** HIGH

## Summary

Phase 8.5 adds Probethium synthesis functionality to hubs, allowing players to convert exotic minerals into probethium as an alternative to mining. This is a pure extension phase - 95% of required infrastructure already exists. The implementation involves three independent modifications: (1) adding a new research node to the alien tech tree, (2) adding a synthesis button to hub details panel that emits an event, and (3) implementing a 3-second canvas animation system that queues synthesis effects at hubs.

The codebase has established patterns for all three areas: research nodes in `GameState.js` follow a strict schema with position, cost, parent, and tree properties; hub buttons use event emission patterns identical to existing Deploy/Build buttons; and canvas animations use `ctx.save()/ctx.restore()` with world-to-screen transforms (`entity.x - viewOffset.x`). The animation system can leverage existing particle rendering patterns from RemnantManager (spiral particles) and IntroCutscene (pulse effects).

**Primary recommendation:** Add `probethium_synthesis` research node as a child of `alien_tech`, add synthesis button to `DetailsPanel.showHubDetails()` that emits `synthesis:triggered`, and implement a queueing animation manager that renders 3-second synthesis effects on the main canvas without blocking gameplay.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**1. Conversion Economics (SYNTH-01, SYNTH-04)**
- Flat rate: 5 exotic minerals = 0.001 probethium per synthesis
- Formula: `probethiumGained = Math.floor(exoticMinerals / 5) * 0.001`
- Multiple batches supported (12 exotics → 2 batches = 0.002 probethium, 2 exotics remain)
- Button text: "Synthesize (5 ⚗️ → 0.001 ⚛️)" with current exotic count

**2. Synthesis Animation & Feel (SYNTH-03)**
- 3-second canvas animation sequence:
  - 0-1s: Hub pulses brighter, purple/violet particles spiral inward
  - 1-1.5s: White-to-gold flash at hub center, 2-3px screen shake, expanding golden ring
  - 1.5-3s: Golden glow radiates outward, particles drift away, hub returns to normal
- Animation is visual only (conversion instant at button press)
- Does NOT block gameplay (player can pan, click, probes keep moving)
- Multiple syntheses queue (don't stack/overlap - second plays after first)
- Rendered on main galaxy canvas using hub screen position
- Color palette: purple/violet → white flash → gold
- Sound: NOT in scope (game has no sound effects, only MusicManager)

**3. Research Unlock & Button Placement (SYNTH-02, SYNTH-01)**
- Research node ID: `probethium_synthesis`
- Name: "Probethium Synthesis"
- Description: "Unlocks the ability to synthesize Probethium from exotic materials at hubs"
- Tree: `alien` (parent: `alien_tech`)
- Cost: 3 research points
- Icon: ⚗️
- Button location: Hub details panel "Hub Operations" section, below existing buttons
- Hidden until researched (not greyed out - appears only after unlock)
- Purple/gold gradient styling to stand out from green hub theme
- Disabled when < 5 exotic minerals with tooltip "Need 5 exotic minerals"
- Shows current exotic count: "⚗️ Synthesize (12 ⚗️ available)"

### Claude's Discretion
None - all design decisions finalized.

### Deferred Ideas (OUT OF SCOPE)
None - all requirements fit within Phase 8.5 scope.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| HTML5 Canvas 2D API | N/A (browser native) | Animation rendering | All game rendering uses Canvas 2D (signals, probes, hubs, effects) |
| EventBus pattern | N/A (in-codebase) | Button → logic decoupling | Established pattern for all UI interactions (deploy, build, upgrade) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | - | - | All requirements met by existing infrastructure |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| EventBus emission | Direct GameState mutation in button handler | Tight coupling; EventBus is established pattern in codebase |
| Queued animation system | Immediate overlapping animations | Violates user requirement "don't stack/overlap" |
| CSS animations on DOM overlay | Canvas rendering | Inconsistent with existing game visuals; requires separate positioning system |

**Installation:**
```bash
# No new dependencies needed
```

## Architecture Patterns

### Recommended Modification Points
```
src/
  GameState.js           # Add probethium_synthesis research node to alien tree
  DetailsPanel.js        # Add synthesis button to hub operations section
  GameController.js      # Implement synthesis animation queue and rendering
  (NEW) SynthesisAnimationManager.js  # Optional: Extract animation logic to dedicated class
tests/
  probethium-synthesis.spec.js  # NEW - test research unlock, button state, animation trigger
```

### Pattern 1: Research Node Extension (Alien Tech Tree)
**What:** Add `probethium_synthesis` node to `GameState.js` research tree, following exact schema of existing nodes.
**When to use:** All research nodes use this pattern - see `phase_shift`, `energy_shields`, `quantum_sensors` at GameState.js:442-527.
**Example:**
```javascript
// Source: GameState.js:429-527 (existing alien tech tree)
// Add to GameState.js research tree object after 'quantum_sensors' (line 489)
'probethium_synthesis': {
    id: 'probethium_synthesis',
    name: 'Probethium Synthesis',
    description: 'Unlocks the ability to synthesize Probethium from exotic materials at hubs',
    cost: 3,
    position: { x: 350, y: 920 },  // Below omniscience (x:350, y:830)
    researched: false,
    available: false,
    icon: '⚗️',
    parent: 'alien_tech',
    children: [],  // Terminal node (no children)
    tree: 'alien'
}
```

**Node positioning:** The alien tree currently spans y:680-830 (6 nodes). Adding `probethium_synthesis` at y:920 places it ~90px below the last node, maintaining consistent spacing. The x:350 positions it in the second column (child of alien_tech at x:50).

### Pattern 2: Hub Operations Button with Event Emission
**What:** Add synthesis button HTML to `DetailsPanel.showHubDetails()`, attach click listener that emits event, update button state on resource changes.
**When to use:** All hub operations buttons follow this pattern - see `deployFromHub`, `buildProbeForHub`, `buildShuttleBtn` at DetailsPanel.js:200-238 (HTML) and 650-713 (handlers).
**Example:**
```javascript
// Source: DetailsPanel.js:230-238 (shuttle button HTML), 685-712 (shuttle button handler)
// Add to DetailsPanel.showHubDetails() HTML after buildShuttleBtn (line 238)

// Check if synthesis is unlocked
const research = this.gameState.getResearchSystem();
const hasSynthesis = research.researched.has('probethium_synthesis');

// Conditionally render synthesis button (hidden until researched)
const synthesisButtonHtml = hasSynthesis ? `
    <button id="synthesizeBtn" class="control-btn" style="font-size: 12px; padding: 8px 12px; width: 100%; display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #9400d3 0%, #ffd700 100%);">
        <span style="font-size: 16px;">⚗️</span>
        Synthesize (5 ⚗️ → 0.001 ⚛️)
    </button>
` : '';

// Insert synthesisButtonHtml in content.innerHTML after shuttle button
```

```javascript
// Source: DetailsPanel.js:685-712 (shuttle button handler pattern)
// Add to setupHubButtons(hub) method after shuttle button handler

const synthesizeBtn = document.getElementById('synthesizeBtn');
if (synthesizeBtn) {
    synthesizeBtn.addEventListener('click', () => {
        const resources = this.gameState.getResources();
        if (resources.exoticMinerals < 5) {
            this.eventBus.emit('ui:message', {
                text: 'Need 5 exotic minerals to synthesize!',
                type: 'error'
            });
            return;
        }

        // Emit synthesis event with hub reference
        this.eventBus.emit('synthesis:triggered', { hub });
        this.hide(); // Close panel (optional - could stay open)
    });
}
```

### Pattern 3: Dynamic Button State Updates
**What:** Update synthesis button disabled state when resources change, show current exotic count.
**When to use:** All resource-dependent buttons update on `ui:update` event - see `updateButtonStates()` at DetailsPanel.js:612-627.
**Example:**
```javascript
// Source: DetailsPanel.js:565-572 (shuttle button state update)
// Add to updateButtonStates(hub) method

const synthesizeBtn = document.getElementById('synthesizeBtn');
if (synthesizeBtn) {
    const canAfford = resources.exoticMinerals >= 5;
    const batchCount = Math.floor(resources.exoticMinerals / 5);

    synthesizeBtn.classList.toggle('resource-button', true);
    synthesizeBtn.classList.toggle('insufficient', !canAfford);
    synthesizeBtn.disabled = !canAfford;

    // Update button text to show available batches
    const btnText = synthesizeBtn.querySelector('span:last-child');
    if (btnText) {
        btnText.textContent = canAfford
            ? `Synthesize (${resources.exoticMinerals} ⚗️ → ${batchCount * 0.001} ⚛️)`
            : 'Synthesize (Need 5 ⚗️)';
    }
}
```

### Pattern 4: Queueing Animation System
**What:** Maintain a queue of synthesis animations. Each animation runs for 3 seconds, then dequeues. Multiple rapid syntheses queue up instead of overlapping.
**When to use:** User requirement: "Multiple rapid syntheses queue animations (don't stack/overlap)".
**Example:**
```javascript
// Source: Pattern inspired by RemnantManager.update() deltaTime tracking (RM:88-106)
// Add to GameController or new SynthesisAnimationManager class

class SynthesisAnimationQueue {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.queue = [];  // Array of { hub, startTime, phase }
        this.currentAnimation = null;

        this.eventBus.on('synthesis:triggered', this.enqueueSynthesis.bind(this));
    }

    enqueueSynthesis(data) {
        this.queue.push({
            hub: data.hub,
            startTime: null, // Set when animation starts
            phase: 'queued'
        });

        // Start immediately if no animation running
        if (!this.currentAnimation) {
            this.startNextAnimation();
        }
    }

    startNextAnimation() {
        if (this.queue.length === 0) {
            this.currentAnimation = null;
            return;
        }

        this.currentAnimation = this.queue.shift();
        this.currentAnimation.startTime = Date.now();
        this.currentAnimation.phase = 'active';
        this.eventBus.emit('synthesis:started', { hub: this.currentAnimation.hub });
    }

    update(deltaTime) {
        if (!this.currentAnimation) return;

        const elapsed = Date.now() - this.currentAnimation.startTime;
        if (elapsed >= 3000) {
            // Animation complete
            this.eventBus.emit('synthesis:completed', { hub: this.currentAnimation.hub });
            this.startNextAnimation();
        }
    }

    getActiveAnimation() {
        return this.currentAnimation;
    }
}
```

### Pattern 5: Canvas Animation Rendering with ctx.save()/restore()
**What:** Render synthesis animation using world-to-screen coordinate transform, wrapped in `ctx.save()/ctx.restore()` to isolate canvas state.
**When to use:** All canvas particle effects use this pattern - see Phase 6 ctx.save() usage, RemnantManager particle trail rendering.
**Example:**
```javascript
// Source: Phase 6 RESEARCH.md anti-pattern "globalAlpha Leak" mitigation
// Add to GameController.render() or dedicated renderSynthesisAnimation() method

renderSynthesisAnimation() {
    const animation = this.synthesisQueue.getActiveAnimation();
    if (!animation) return;

    const hub = animation.hub;
    const elapsed = Date.now() - animation.startTime;
    const progress = elapsed / 3000; // 0.0 to 1.0

    // World to screen transform
    const screenX = hub.x - this.viewOffset.x;
    const screenY = hub.y - this.viewOffset.y;

    this.ctx.save(); // Isolate canvas state

    if (progress < 0.33) {
        // Phase 1: Charge-up (0-1s) - inward spiral particles
        this.renderChargeUpPhase(screenX, screenY, elapsed);
    } else if (progress < 0.5) {
        // Phase 2: Flash (1-1.5s) - white-to-gold flash + screen shake
        this.renderFlashPhase(screenX, screenY, elapsed - 1000);
    } else {
        // Phase 3: Release (1.5-3s) - golden glow radiates outward
        this.renderReleasePhase(screenX, screenY, elapsed - 1500);
    }

    this.ctx.restore(); // Reset canvas state
}
```

### Pattern 6: Screen Shake Implementation
**What:** Apply 2-3px random offset to viewOffset during flash phase, then smoothly return to original position.
**When to use:** User requirement: "brief screen shake (subtle, 2-3px)" during conversion flash.
**Example:**
```javascript
// Source: viewOffset pattern from game.js:30, 402-403 (pan handling)
// Add shake offset to viewOffset during flash phase rendering

renderFlashPhase(screenX, screenY, phaseElapsed) {
    const flashProgress = phaseElapsed / 500; // 0.0 to 1.0 over 0.5s

    // Screen shake for first 300ms
    if (phaseElapsed < 300) {
        const shakeIntensity = 2.5 * (1 - phaseElapsed / 300); // Decay over 300ms
        this.shakeOffset = {
            x: (Math.random() - 0.5) * shakeIntensity,
            y: (Math.random() - 0.5) * shakeIntensity
        };
    } else {
        this.shakeOffset = { x: 0, y: 0 };
    }

    // Apply shake to viewOffset temporarily (will be reset on next frame)
    this.viewOffset.x += this.shakeOffset.x;
    this.viewOffset.y += this.shakeOffset.y;

    // White-to-gold flash (fade from white to gold over 500ms)
    const flashColor = flashProgress < 0.5
        ? `rgba(255, 255, 255, ${1 - flashProgress * 2})`
        : `rgba(255, 215, 0, ${1 - flashProgress})`;

    // Draw flash circle expanding from hub center
    const flashRadius = 30 + flashProgress * 50;
    this.ctx.fillStyle = flashColor;
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, flashRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Golden energy ring expansion
    if (flashProgress > 0.3) {
        const ringRadius = (flashProgress - 0.3) * 100;
        this.ctx.strokeStyle = `rgba(255, 215, 0, ${0.8 * (1 - flashProgress)})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, ringRadius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
}
```

### Anti-Patterns to Avoid
- **Modifying probethium directly in button handler:** Emit event and handle conversion in GameState/GameController. This maintains separation of concerns and allows for animation triggering.
- **Rendering animation without ctx.save()/restore():** Will leak canvas state (globalAlpha, strokeStyle, lineWidth) to subsequent rendering.
- **Not guarding against rapid clicking:** Check if synthesis is already queued for same hub to prevent resource deduction without animation.
- **Using setTimeout for animation timing:** Use deltaTime-based updates in game loop for smooth animation tied to frame rate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animation timing system | Custom setTimeout/setInterval manager | Game loop deltaTime updates | Already have `requestAnimationFrame` loop with deltaTime tracking (game.js:3075-3090) |
| Particle spiral math | Complex curve calculations | Sin/cos with age-based angle | RemnantManager already uses this pattern (RM:434-513 for trail particles) |
| Resource deduction + animation sync | Separate resource update and animation trigger | Single `synthesis:triggered` event that updates resources and queues animation | EventBus ensures atomicity |
| Screen coordinate transforms | Manual canvas translation | `entity.x - viewOffset.x` pattern | Established throughout codebase (game.js:961-962, 2729-2730) |

**Key insight:** The codebase already has all infrastructure needed - research trees accept new nodes via object literal, hub buttons emit events via EventBus, canvas rendering uses world-to-screen transforms with viewOffset, and deltaTime-based animation loops are standard. No custom systems need to be built.

## Common Pitfalls

### Pitfall 1: Research Node Not Appearing in Tree
**What goes wrong:** Added `probethium_synthesis` node to GameState.js but it doesn't render in research UI.
**Why it happens:** Research tree is filtered by `research.unlockedTrees` (ResearchManager.js:41-47). The `alien` tree must be unlocked (happens when player gets 50 artifacts first).
**How to avoid:**
- Verify `tree: 'alien'` property is set on node
- Test with a save that has alien tree unlocked (artifacts >= 50)
- OR manually unlock in test: `gameState.researchSystem.unlockedTrees.push('alien')`
**Warning signs:** Node doesn't appear in research UI but no console errors. Other alien tech nodes (phase_shift, energy_shields) are visible.

### Pitfall 2: Button Appears Before Research Unlocked
**What goes wrong:** Synthesis button shows up in hub panel even when `probethium_synthesis` is not researched.
**Why it happens:** Forgot to check `research.researched.has('probethium_synthesis')` before rendering button HTML.
**How to avoid:** Conditionally include button HTML only when research is unlocked (see Pattern 2 example).
**Warning signs:** Button appears in new game before player has researched anything.

### Pitfall 3: Animation Plays While Zoomed/Panned Away
**What goes wrong:** Animation starts at hub location, but if player pans camera away, hub is off-screen and animation is invisible.
**Why it happens:** Animation uses hub's world coordinates correctly, but player moved the viewport.
**How to avoid:** This is NOT a bug - it's expected behavior. Animation plays at hub location regardless of camera position, just like probe movement. Alternative: emit a notification when synthesis completes if hub is off-screen.
**Warning signs:** Player complains "I clicked synthesize but nothing happened" when they panned away.

### Pitfall 4: Multiple Syntheses Deduct Resources But Only One Animates
**What goes wrong:** Player clicks synthesis button 3 times rapidly. Resources are deducted 3x (15 exotics, 0.003 probethium), but only one animation plays.
**Why it happens:** Button click handler deducts resources immediately, but animation queue only processes one at a time. Need to deduct resources AFTER checking queue or disable button during animation.
**How to avoid:** Two options:
1. **Recommended:** Deduct resources inside `synthesis:triggered` event handler, which queues animation AND updates resources atomically.
2. Disable synthesis button while animation is active for that hub.
**Warning signs:** Player reports "lost exotic minerals but probethium didn't increase correctly."

### Pitfall 5: Screen Shake Persists After Animation
**What goes wrong:** Screen shake continues indefinitely after synthesis animation completes.
**Why it happens:** Added shake offset to viewOffset but didn't reset it. The offset accumulates on every frame.
**How to avoid:**
- Store original viewOffset before shake, restore after flash phase
- OR apply shake temporarily and reset to 0 on next frame
- OR use a separate `shakeOffset` that's added to viewOffset only during rendering, not stored
**Warning signs:** Camera drifts or jitters continuously after synthesis.

### Pitfall 6: Animation Breaks Save/Load
**What goes wrong:** Player saves game mid-synthesis animation, loads save, and animation state is lost or corrupted.
**Why it happens:** Animation queue is not serialized to save data. On load, active animations are lost.
**How to avoid:** Animation state is ephemeral and short-lived (3 seconds). Don't serialize animation queue. On load, if player had synthesis in progress, it's acceptable to lose the in-flight animation. Resources were already updated when synthesis was triggered.
**Warning signs:** Loaded game shows probethium increase without animation (minor cosmetic issue, not a bug).

## Code Examples

### Charge-Up Phase Particles (0-1s)
```javascript
// Purple/violet particles spiraling inward toward hub center
// Source: Pattern similar to RemnantManager particle trail (RM:501-513)
renderChargeUpPhase(screenX, screenY, phaseElapsed) {
    const particleCount = 12;
    const progress = phaseElapsed / 1000; // 0.0 to 1.0

    for (let i = 0; i < particleCount; i++) {
        const angle = (phaseElapsed * 0.003) + (i * Math.PI * 2 / particleCount);
        const spiralRadius = 80 * (1 - progress); // Spiral inward from 80px to 0
        const spiralOffset = Math.sin(phaseElapsed * 0.002 + i) * 10; // Wobble

        const px = screenX + Math.cos(angle) * (spiralRadius + spiralOffset);
        const py = screenY + Math.sin(angle) * (spiralRadius + spiralOffset);
        const particleSize = 2 + Math.sin(phaseElapsed * 0.005 + i) * 1;

        // Purple/violet gradient based on distance to hub
        const hue = 270 + (1 - progress) * 20; // 270 (purple) to 290 (violet)
        this.ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${0.8 * progress})`;
        this.ctx.beginPath();
        this.ctx.arc(px, py, particleSize, 0, Math.PI * 2);
        this.ctx.fill();
    }

    // Hub pulse (brighten hub during charge-up)
    const pulseIntensity = 0.5 + 0.5 * progress;
    this.ctx.fillStyle = `rgba(148, 0, 211, ${0.3 * pulseIntensity})`; // Purple glow
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, 25 + progress * 5, 0, Math.PI * 2);
    this.ctx.fill();
}
```

### Release Phase Particles (1.5-3s)
```javascript
// Golden glow radiates outward, particles drift away
// Source: Pattern similar to discovery bonus sparkles (Phase 6 RESEARCH.md:165-187)
renderReleasePhase(screenX, screenY, phaseElapsed) {
    const particleCount = 16;
    const progress = phaseElapsed / 1500; // 0.0 to 1.0 over 1.5s

    // Golden afterglow on hub (fading)
    const glowIntensity = 1 - progress;
    this.ctx.fillStyle = `rgba(255, 215, 0, ${0.4 * glowIntensity})`;
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, 30 + progress * 20, 0, Math.PI * 2);
    this.ctx.fill();

    // Outward drifting particles
    for (let i = 0; i < particleCount; i++) {
        const angle = (i * Math.PI * 2 / particleCount) + (phaseElapsed * 0.001);
        const driftDist = 30 + progress * 60; // Drift from 30px to 90px
        const driftWobble = Math.sin(phaseElapsed * 0.004 + i) * 8;

        const px = screenX + Math.cos(angle) * (driftDist + driftWobble);
        const py = screenY + Math.sin(angle) * (driftDist + driftWobble);
        const particleSize = 2.5 * (1 - progress); // Shrink as they drift
        const particleAlpha = 0.9 * (1 - progress); // Fade out

        this.ctx.fillStyle = `rgba(255, 215, 0, ${particleAlpha})`;
        this.ctx.beginPath();
        this.ctx.arc(px, py, particleSize, 0, Math.PI * 2);
        this.ctx.fill();
    }
}
```

### Resource Conversion Handler
```javascript
// Handle synthesis:triggered event - deduct resources, add probethium, queue animation
// Source: Pattern similar to probe:build event handler
eventBus.on('synthesis:triggered', (data) => {
    const { hub } = data;
    const resources = gameState.getResources();

    // Validate resources (double-check even though button was disabled)
    if (resources.exoticMinerals < 5) {
        console.warn('Synthesis triggered without sufficient exotic minerals');
        return;
    }

    // Calculate batches
    const batchCount = Math.floor(resources.exoticMinerals / 5);
    const exoticsConsumed = batchCount * 5;
    const probethiumGained = batchCount * 0.001;

    // Update resources
    gameState.updateResources({
        exoticMinerals: resources.exoticMinerals - exoticsConsumed
    });
    gameState.probethium.current += probethiumGained;
    gameState.probethium.totalAccumulated += probethiumGained;

    // Emit UI update
    eventBus.emit('ui:update');

    // Emit message
    eventBus.emit('ui:message', {
        text: `Synthesized ${probethiumGained.toFixed(4)} ⚛️ from ${exoticsConsumed} ⚗️`,
        type: 'success'
    });

    // Animation already queued by SynthesisAnimationQueue listening to same event
});
```

### Test: Research Unlock Flow
```javascript
// Verify synthesis button appears only after researching probethium_synthesis
test('synthesis button appears after research unlock', async ({ page }) => {
    await page.goto('http://localhost:8080');

    // Setup: Give player resources and unlock alien tree
    await page.evaluate(() => {
        const gs = window.game.gameState;
        gs.updateResources({ artifacts: 50, exoticMinerals: 10 });
        gs.researchSystem.unlocked = true;
        gs.researchSystem.unlockedTrees = ['alien'];
        gs.researchSystem.points = 5;
    });

    // Open research, unlock alien_tech root
    await page.click('#researchBtn');
    await page.evaluate(() => {
        const alienTech = window.game.gameState.researchSystem.tree.alien_tech;
        window.game.researchManager.unlockResearch('alien_tech');
    });

    // Unlock probethium_synthesis
    await page.evaluate(() => {
        window.game.researchManager.unlockResearch('probethium_synthesis');
    });

    // Close research UI, select hub
    await page.click('#returnToGalaxyBtn');
    await page.evaluate(() => {
        const hub = window.game.gameState.entities.reconHubs[0];
        hub.selected = true;
        window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
    });

    // Verify synthesis button exists
    const synthesizeBtn = await page.locator('#synthesizeBtn');
    await expect(synthesizeBtn).toBeVisible();
    await expect(synthesizeBtn).toContainText('Synthesize');
});
```

### Test: Animation Queueing
```javascript
// Verify multiple rapid syntheses queue animations sequentially
test('multiple syntheses queue animations', async ({ page }) => {
    await page.goto('http://localhost:8080');

    // Setup: Research unlocked, 20 exotic minerals
    await page.evaluate(() => {
        const gs = window.game.gameState;
        gs.updateResources({ exoticMinerals: 20 });
        gs.researchSystem.researched.add('probethium_synthesis');
        // Assume alien tree already unlocked in this test
    });

    // Trigger 3 syntheses rapidly
    const hub = await page.evaluate(() => {
        return window.game.gameState.entities.reconHubs[0];
    });

    for (let i = 0; i < 3; i++) {
        await page.evaluate((h) => {
            window.game.eventBus.emit('synthesis:triggered', { hub: h });
        }, hub);
    }

    // Check queue length
    const queueLength = await page.evaluate(() => {
        return window.game.synthesisQueue.queue.length +
               (window.game.synthesisQueue.currentAnimation ? 1 : 0);
    });

    expect(queueLength).toBe(3);

    // Wait for all animations to complete (3 animations * 3 seconds each = 9 seconds)
    await page.waitForTimeout(10000);

    // Verify queue is empty
    const finalQueueLength = await page.evaluate(() => {
        return window.game.synthesisQueue.queue.length;
    });
    expect(finalQueueLength).toBe(0);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No synthesis mechanic | Exotic mineral synthesis for probethium | Phase 8.5 (NEW) | Provides alternative path to probethium for players without mining stations in probethium-rich sectors |
| Static hub visuals | Synthesis animation at hub | Phase 8.5 (NEW) | Hubs gain interactive visual feedback, not just passive structures |
| Research trees locked by milestone | Three parallel trees (collection, probe, alien) | Already in codebase | Established pattern - alien tree is correct home for synthesis |

**Deprecated/outdated:**
- None. All patterns are current as of 2026-02-05.

## Open Questions

1. **Animation visibility when hub is off-screen**
   - What we know: Animation plays at hub world coordinates regardless of camera position (established pattern for all entities).
   - What's unclear: Whether to add a camera auto-pan to hub when synthesis starts, or just let animation play off-screen.
   - Recommendation: Let animation play off-screen (consistent with existing behavior). Emit `ui:message` on completion: "Synthesis complete at Hub X" if hub is not in viewport. This is a low-priority UX enhancement for future iteration.

2. **SaveManager auto-handles new properties**
   - What we know: SaveManager spreads `gameState.probethium` object (SaveManager.js:98-101), so `current` and `totalAccumulated` are already saved.
   - What's unclear: Whether animation queue state needs to persist across saves.
   - Recommendation: Do NOT save animation queue. Animations are ephemeral (3 seconds). If player saves mid-animation, on load the animation is simply skipped. Resources were already updated when synthesis was triggered, so no data loss occurs.

3. **Button state during active animation**
   - What we know: Button can be clicked multiple times, queueing animations.
   - What's unclear: Whether to disable button while synthesis is active for the selected hub, or allow queuing.
   - Recommendation: Allow queuing (per user requirement "multiple rapid syntheses queue animations"). This gives player agency and matches the behavior of building multiple probes rapidly.

## Sources

### Primary (HIGH confidence)
- `src/GameState.js` lines 429-527 - Alien tech research tree structure (read directly)
- `src/DetailsPanel.js` lines 200-238, 650-713 - Hub button HTML and event handlers (read directly)
- `src/ResearchManager.js` lines 1-150 - Research tree rendering and filtering (read directly)
- `src/RemnantManager.js` lines 85-106, 434-513 - Animation update loop and particle rendering patterns (read directly)
- `src/IntroCutscene.js` lines 1-100 - Animation state management and timing (read directly)
- `game.js` lines 30, 402-403, 961-962, 2729-2730, 3030-3042, 3075-3090 - viewOffset transforms, screen positioning, game loop (read directly)
- `.planning/phases/06-visual-rendering/06-RESEARCH.md` lines 134-161 - Canvas state pitfalls (ctx.save/restore, globalAlpha leak) (read directly)
- `src/SaveManager.js` lines 81-150 - Save data structure and resource serialization (read directly)
- `.planning/phases/085-probethium-synthesis/085-CONTEXT.md` - User decisions and requirements (read directly)

### Secondary (MEDIUM confidence)
- None needed - all findings verified from direct codebase inspection.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all Canvas 2D and EventBus patterns already in use
- Architecture: HIGH - All modification points identified at line-level from code inspection
- Pitfalls: HIGH - Based on direct code analysis of similar systems (research, buttons, animations)
- Animation queueing: MEDIUM - Pattern is extrapolated from RemnantManager, not directly copied

**Research date:** 2026-02-05
**Valid until:** No expiration (codebase-specific research, no external dependencies)
