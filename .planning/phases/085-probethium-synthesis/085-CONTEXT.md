# Phase 8.5 Context: Probethium Synthesis

**Created:** 2026-02-05
**Source:** Discussion session — all decisions made by Claude (user delegated)

## Design Decisions

### 1. Conversion Economics (SYNTH-01, SYNTH-04)

**Decision:** Flat rate conversion — 5 exotic minerals = 0.001 probethium per synthesis.

**Rationale:**
- Exotic minerals are scarce (only from Exotic Crystal signals in Asteroid Field sectors, or rare exploration rewards)
- Player cargo shows exoticMinerals as integers (small numbers: 1-5 per signal)
- Probethium values are extremely small (0.0000000000 scale) — 0.001 is actually a meaningful chunk
- Flat rate keeps it simple and predictable. No diminishing returns — exotic minerals are rare enough to self-limit
- 5 exotics is achievable but not trivial (requires ~3-5 Exotic Crystal signal explorations)

**Conversion formula:** `probethiumGained = Math.floor(exoticMinerals / 5) * 0.001`
- Player can synthesize multiple batches at once if they have enough exotics
- Leftover exotics are kept (e.g., 12 exotics → 2 batches = 0.002 probethium, 2 exotics remain)
- Button shows "Synthesize (5 ⚗️ → 0.001 ⚛️)" with current exotic count

### 2. Synthesis Animation & Feel (SYNTH-03)

**Decision:** Hub gets a 3-second canvas-rendered synthesis animation that feels like energy conversion.

**Animation sequence:**
1. **Charge-up (0-1s):** Hub sprite pulses brighter, purple/violet particles spiral inward toward hub center (representing exotic minerals being consumed)
2. **Conversion flash (1-1.5s):** Bright white-to-gold flash at hub center, brief screen shake (subtle, 2-3px), expanding ring of golden energy
3. **Probethium release (1.5-3s):** Golden glow radiates outward from hub, fading particles drift away, hub returns to normal with brief golden afterglow

**Key details:**
- Animation is purely visual — conversion happens instantly at button press (resources update immediately)
- Animation does NOT block gameplay — player can pan, click other things, probes keep moving
- Multiple rapid syntheses queue animations (don't stack/overlap — second plays after first finishes)
- Rendered on the main galaxy canvas using the hub's screen position
- Color palette: purple/violet (exotic) → white flash → gold (probethium)
- Sound: Not in scope (game currently has no sound effects, only MusicManager for background music)

**Why satisfying:**
- The inward spiral → flash → outward burst pattern creates a "compression and release" feel
- Gold color associates with value/rarity
- Brief screen shake adds weight to the moment
- 3 seconds is long enough to feel special, short enough not to frustrate

### 3. Research Unlock & Button Placement (SYNTH-02, SYNTH-01)

**Decision:** New research node "Probethium Synthesis" in the alien tech tree, costing 3 research points. Requires `alien_tech` (the tree root).

**Research node:**
- ID: `probethium_synthesis`
- Name: "Probethium Synthesis"
- Description: "Unlocks the ability to synthesize Probethium from exotic materials at hubs"
- Tree: `alien` (fits thematically — alien technology enables exotic material conversion)
- Cost: 3 research points
- Parent: `alien_tech` (root of alien tree)
- Icon: ⚗️

**Button placement:**
- "Synthesize Probethium" button added to hub details panel (DetailsPanel.js showHubDetails)
- Placed in the "Hub Operations" section, below existing buttons (Deploy Probe, Build Probe, Build Shuttle)
- Button is **hidden** (not shown at all) until research is unlocked — no greyed-out teaser
- When shown: purple/gold gradient button to stand out from the green hub theme
- Button text: "⚗️ Synthesize Probethium (5 Exotic → 0.001 ⚛️)"
- Disabled state: shown but greyed out when player has < 5 exotic minerals, with tooltip "Need 5 exotic minerals"
- Current exotic count shown on button: "⚗️ Synthesize (12 ⚗️ available)"

**Why hidden until researched:**
- Avoids confusing new players with a greyed-out button they can't use
- Discovery moment when it first appears feels rewarding
- Reduces UI clutter in early game

## Implementation Notes for Planner

### Existing infrastructure to leverage:
- `gameState.resources.exoticMinerals` — already tracked as integer
- `gameState.probethium.current` — tiny float, direct addition
- `gameState.researchSystem.researched` — Set containing unlocked research IDs
- `DetailsPanel.showHubDetails()` — hub panel with "Hub Operations" section
- Canvas rendering pipeline in `game.js` — can add animation layer
- EventBus pattern for `synthesis:started`, `synthesis:completed` events

### Key constraints:
- Animation must work with current canvas zoom/pan (use hub world coords → screen transform)
- Button must update dynamically (exotic count changes as probes collect)
- Probethium display is very small numbers (10 decimal places) — UI should show meaningful format
- Save/load: no special handling needed — research state and resources already persist

## Deferred Ideas

None — all decisions fit within Phase 8.5 scope.

---
*Context gathered: 2026-02-05*
