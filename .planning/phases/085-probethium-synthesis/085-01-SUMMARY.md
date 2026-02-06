---
phase: 085
plan: 01
subsystem: resource-production
tags: [synthesis, probethium, animation, alien-tech, resource-conversion]
dependencies:
  requires: [08-03]
  provides: [probethium-synthesis-system, synthesis-animation-queue]
  affects: [09-01]
tech-stack:
  added: []
  patterns: [event-queue, canvas-animation-phases, resource-conversion]
key-files:
  created:
    - src/SynthesisAnimationManager.js
    - tests/synthesis-system.spec.js
  modified:
    - src/GameState.js
    - src/DetailsPanel.js
    - src/GameController.js
    - index.html
decisions:
  - id: SYNTH-BATCH
    decision: "Process all available batches at once (not one-at-a-time)"
    rationale: "Simpler UX - click once to convert all exotic minerals"
    file: src/GameController.js

  - id: SYNTH-BUTTON-HIDDEN
    decision: "Hide synthesis button before research (not greyed out)"
    rationale: "Cleaner UI - players won't see unavailable features"
    file: src/DetailsPanel.js

  - id: SYNTH-ANIMATION-QUEUE
    decision: "Sequential animation queue (not overlapping/simultaneous)"
    rationale: "Visual clarity - prevents animation chaos on rapid clicks"
    file: src/SynthesisAnimationManager.js

  - id: SYNTH-SHAKE-PROPERTY
    decision: "Screen shake via getShakeOffset() property (not viewOffset mutation)"
    rationale: "Clean separation - animation manager doesn't mutate game state"
    file: src/SynthesisAnimationManager.js

  - id: SYNTH-THREE-PHASES
    decision: "3-phase animation: spiral, flash/shake, drift (3 seconds total)"
    rationale: "Visual progression - buildup, climax, aftermath matches synthesis theme"
    file: src/SynthesisAnimationManager.js

metrics:
  duration: "7 minutes"
  tasks-completed: 3
  files-created: 2
  files-modified: 4
  tests-added: 8
  lines-added: ~600
  commits: 3

completed: 2026-02-06
---

# Phase 085 Plan 01: Probethium Synthesis Implementation

**One-liner:** Hub synthesis button converts exotic minerals to probethium with queued purple-to-gold canvas animation

## What Was Built

### Research Node
- Added `probethium_synthesis` to alien tech tree (cost: 3 artifacts)
- Parent: `alien_tech`, icon: ⚗️
- Position: (350, 920) - below other alien tech nodes
- Unlocks synthesis capability at hubs

### Hub Synthesis Button
- **Visibility:** Only shown after research is unlocked (hidden otherwise)
- **Location:** Hub Operations panel, after shuttle button
- **Styling:** Purple-to-gold gradient background matching animation theme
- **Dynamic text:** Shows batch count when enough resources available
- **Disabled state:** Greyed out when < 5 exotic minerals
- **Tooltip:** Shows conversion details (exotics consumed → probethium gained)

### Resource Conversion Logic
- **Conversion rate:** 5 exotic minerals → 0.001 probethium per batch
- **Batch processing:** Converts all available batches in one click
- **Event:** `synthesis:triggered` emitted from button → handler in GameController
- **Resource updates:** Decrements `exoticMinerals`, increments `probethium`
- **UI feedback:** Success message shows exact amounts converted

### Synthesis Animation System
**File:** `src/SynthesisAnimationManager.js` (295 lines)

**Architecture:**
- Queue-based system for sequential animations
- Listens to `synthesis:triggered` events
- Integrated into GameController update/render loop

**Animation Phases (3 seconds total):**

**Phase 1 (0-1000ms): Inward Spiral**
- 12 purple particles spiral toward hub center
- Hub emits pulsing purple glow
- Particles decay in size as they approach center
- Rotation: 4π radians over 1 second

**Phase 2 (1000-1500ms): Flash and Shake**
- White-to-gold flash at hub center (500ms)
- Screen shake: 2-3px magnitude, 300ms decay
- Golden expanding ring from center (radius: 20→80px)
- Peak visual intensity at 1200ms

**Phase 3 (1500-3000ms): Golden Drift**
- 16 golden particles drift outward from hub
- Hub retains golden afterglow, fading over 1.5 seconds
- Particles fade alpha from 1.0 → 0.0
- Drift speed: 0.3-0.7 units/frame

**Technical Details:**
- Screen shake via `getShakeOffset()` property (read-only for GameController)
- World-to-screen transformation via `ctx.save()/restore()`
- Queue prevents overlapping animations (visual clarity)
- Each animation runs exactly 3000ms regardless of frame rate

### Testing
**File:** `tests/synthesis-system.spec.js` (8 tests)

- ✓ Research node exists in alien tech tree
- ✓ Button only visible after research unlock
- ✓ Conversion: 5 exotics → 0.001 probethium (multi-batch)
- ✓ Button disabled when insufficient resources
- ✓ Button text shows correct batch count
- ✓ Animation manager instantiated
- ✓ Multiple triggers queue animations
- ✓ Animation completes after 3 seconds

## Technical Implementation

### Event Flow
```
User clicks Synthesize button
  → DetailsPanel emits synthesis:triggered
    → GameController handler converts resources
      → UI updates, success message
    → SynthesisAnimationManager enqueues animation
      → GameController.update() advances animation
      → GameController.render() draws animation
        → 3 seconds later: animation completes, queue processes next
```

### File Changes

**src/GameState.js:**
- Added `probethium_synthesis` to `alien_tech.children` array
- Added research node definition after `omniscience` node

**src/DetailsPanel.js:**
- Conditional synthesis button rendering in `showHubDetails()`
- Click handler in `setupHubButtons()` emits `synthesis:triggered`
- Button state update in `updateButtonStates()` (disabled, text, tooltip)

**src/GameController.js:**
- Added `SynthesisAnimationManager` instantiation in constructor
- Event listener for `synthesis:triggered` with batch conversion logic
- `update()` calls: `synthesisAnimation.update(deltaTime)`
- `render()` applies shake offset via `ctx.translate()`
- `render()` calls: `synthesisAnimation.render(ctx, viewOffset)`

**index.html:**
- Added `<script src="src/SynthesisAnimationManager.js"></script>` before GameController

## Requirements Completed

| Req | Description | Status |
|-----|-------------|--------|
| SYNTH-01 | Research unlock gates synthesis feature | ✅ Complete |
| SYNTH-02 | Hub button converts 5 exotics → 0.001 probethium | ✅ Complete |
| SYNTH-03 | 3-second purple-to-gold animation on galaxy canvas | ✅ Complete |
| SYNTH-04 | Sequential animation queue for rapid clicks | ✅ Complete |

## Integration Points

**Depends on:**
- Phase 8 sector resource profiles (exotic minerals as input resource)
- Alien tech research tree (parent node for unlock)
- Hub panel UI structure (button placement)

**Provides for:**
- Phase 9 Discovery Reveal (synthesis as probethium production method)
- Player progression (alternative to mining stations for probethium)

**Affects:**
- Exotic mineral economy (new sink beyond trading)
- Probethium balance (increases availability if player has exotic supply)

## Edge Cases Handled

1. **Insufficient resources:** Button disabled, error message on click
2. **Partial batches:** 17 exotics → 3 batches (15 used, 2 remain)
3. **Rapid clicking:** Animations queue sequentially, no visual overlap
4. **Research not unlocked:** Button hidden entirely (not greyed out)
5. **Zero exotics:** Button shows "5 Exotic" text, disabled state
6. **Animation during sector transition:** World-to-screen transform handles viewOffset changes

## Performance Considerations

- Animation particles limited to 28 total (12 inward + 16 outward)
- Canvas operations isolated via `ctx.save()/restore()`
- Screen shake magnitude capped at 3px
- Queue prevents unlimited animation accumulation

## Deviations from Plan

None - plan executed exactly as written.

## Future Enhancements (Out of Scope)

- Upgrade research: Higher conversion efficiency (4 exotics → 0.001)
- Bulk synthesis: "Convert all" button for large exotic stockpiles
- Animation variants: Different colors/patterns for rare resource combinations
- Sound effects: Synthesis audio feedback

## Known Limitations

- No visual indicator of synthesis in progress (aside from animation)
- Button doesn't show cooldown or processing state
- Animation timing not configurable via research/upgrades

## Next Steps

**Phase 9: Discovery Reveal**
- Discovery modal should mention synthesis as probethium source
- Sector profiles shown in context of resource gathering for synthesis

**Testing:**
- Run full Playwright test suite to verify no regressions
- Manual verification of animation visual quality
- Verify synthesis persists across save/load

---

**Implementation time:** ~7 minutes
**Commit hashes:** 21de6eb, 2f83d07, f9826c2
**Test coverage:** 8 automated tests (research, button, conversion, animation)
