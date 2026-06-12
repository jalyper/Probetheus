# Core Loop & Game Feel

**Last updated:** 2026-06-10
**Pillar served:** Flow you can watch (primary), The network is the factory (secondary)

**Tone rule for everything below:** relaxing *and* stimulating. The screen is always gently in motion and never demands panic. Feedback exists to make actions feel satisfying, not urgent.

## The loop, restated

1. **Deploy** probes from hubs along waypoint routes (active, tactile)
2. **Collect** — probes pulse, signals spawn, collectors grab them (the dopamine layer)
3. **Deliver** — probes return, cargo deposits, numbers tick up (the payoff beat)
4. **Spend** — probes, buildings, research, equipment (the decision layer)
5. **Expand** — new hubs push the frontier outward (feeds EXPLORATION.md)

Nothing structural changes here. What changes is **tempo and feedback density** — the loop currently runs at idle-game speed with near-zero sensory feedback. This doc fixes that.

## Tempo changes

### Probe speed
- **Distance-based since 2026-06-11:** `BASE_SPEED` is now **0.125 px/ms** (125 px/s at 1×), return 1.5×. The old values (`0.0001` → `0.00025`) were *progress-fraction per ms* — every leg took a fixed ~4s regardless of length, which made route geometry cosmetic and the "shorter loops earn more" lesson false. Travel time now scales with real pixel distance (a ~500px leg ≈ 4s keeps the same feel), which is also the prerequisite for Solar Drift.
- Rationale: at the original speed a mid-length route was a coffee break and the map sat still. Target: a typical route completes in **20–40 seconds**, so a network of 4–6 probes always has something gently in motion — the aquarium effect, not plate-spinning.
- Offline/idle earnings calculations stay tuned to the *old* effective rates — the speed-up is a play-feel change, not an economy buff. Adjust `OfflineManager` hourly estimates accordingly.

### Signal lifetimes
- **Relax, don't tighten** (revised 2026-06-10 with the relaxing-and-stimulating steer): standard signals 2.5–4s (was 2–3s), exclusive signals keep their longer 5–8s windows.
- Generous windows remove click-pressure; faster probes keep the map alive. Auto-collectors remain the automation arc, but missing a signal should feel like "ah, next time," never like failure.

### Time controls
- **1x / 2x / 4x speed toggle**, always available, hotkeys `1`/`2`/`3`. Affects simulation, not animations' base smoothness.
- This is also our balancing escape hatch in EA: if pacing feedback says "too slow," players self-medicate while we tune.
- Pause (`Space`) — full sim pause with camera/UI still live, so players can plan routes calmly. Arcade tempo should be a choice, not a punishment.

## Juice (feedback) pass

The rule: **every loop event has a sound and a visual within 100ms.** Current state: SynthesisAnimationManager does shake/particles for Probethium synthesis only. Extend that energy to the events that happen hundreds of times per session, not once an hour.

### Collection
- Signal collected: pop animation (scale-up + fade), pitched blip (pitch rises with rarity), small floating `+12 ⛏` text drifting toward the probe.
- **Combo system (new):** collecting 3+ signals within 2 seconds chains a combo — each adds +10% to the chain's value (cap +50%), with a softly rising chime and a gold combo callout near the probe. Combos reward dense routing through signal clusters, which quietly teaches good route placement. Tone: a wind-chime run, not a slot machine — the player smiles, they don't spike.
- Rare+ spawn anywhere on screen: edge-of-screen ping + directional chevron for 2s.

### Delivery
- Probe docks: soft thunk + cargo numbers ticking up in the header (rolling counter, not instant swap), brief hub glow pulse.
- A full-cargo delivery (≥90% capacity) gets a slightly bigger flourish — full loads should feel like landing a big fish.

### Building & research
- Placement: construction shimmer (0.5s) + thud. Research complete: fanfare sting + the unlocked node's icon flies to its UI home.

## Sound design (currently: none — this is core scope, not polish)

Minimum viable soundscape, 14 assets:

| # | Event | Character |
|---|---|---|
| 1 | UI click/hover | dry tick |
| 2 | Probe deploy | rising whoosh |
| 3 | Signal collect (common) | short blip, pitch-shifts with rarity |
| 4 | Signal collect (epic/legendary) | distinct chime |
| 5 | Combo chain tick | escalating arpeggio steps |
| 6 | Probe return/deposit | soft thunk + coin-ish tick |
| 7 | Build placed | construction thud |
| 8 | Research complete | fanfare sting |
| 9 | Station cycle complete | industrial chunk |
| 10 | Warning (starved station / probe damage) | low pulse, non-shrill |
| 11 | Probe destroyed | muffled crack + static |
| 12 | Remnant/Dark Market arrival | eerie shimmer |
| 13 | Sector discovered | wide pad swell |
| 14 | Signal Storm start | windchime swell — an invitation, never a klaxon |

All fourteen sounds follow the tone rule: soft attacks, warm timbres, generous decay. Plus ambient bed: low space drone, ducked under MusicManager tracks. Volume sliders already exist in settings — add separate Music / SFX / Ambient channels.

## Live events — the pulse

Events are short, *gentle* spikes of opportunity — invitations, never alarms. They exist to break up routine, give the player a pleasant "ooh, let me drift over there" moment, and reward having a responsive network. Ignoring an event must always be fine. **Ship one event type in EA first patch-window; add more from the list as content updates** (events are ideal EA drip content).

### Signal Storm (ship first)
- Trigger: random, ~every 15–25 min of active play, weighted toward sectors the player has probes in.
- Effect: for **90 seconds**, signal spawn rate ×5 in one announced sector, rarity weights shifted up one tier. Screen banner + minimap flash + sound #14.
- The test of a good network: can you re-route probes there fast enough? (Patrol probes auto-benefit if already there; manual redeploy is the active play.)
- Reward beyond signals: surviving a storm with 20+ collections grants a small Probethium bonus (see ECONOMY.md active-income table).

### Later event candidates (design seeds, not commitments)
- **Meteor Shower:** asteroid-field damage rules apply to one normal sector for 60s; exotic crystals spawn there during it. Risk/reward, uses existing damage code.
- **Echo Surge:** a story echo's static intensifies — decode cost −50% for 10 minutes (ties STORY.md to the pulse).
- **Convoy:** a Remnant trader crosses several sectors on a visible path; intercept with a probe to open Dark Market early.
- **Bounty Signal:** one legendary signal spawns far out with a long (3 min) timer — a race against distance.

## Session shape target

A good 45-minute EA session: 2–3 Signal Storms, one research unlock, one new sector pushed, network throughput visibly up vs. session start (the dashboard from PROBE_NETWORKS.md makes this legible), and at least one "ooh" moment (rare find, combo streak, Remnant visit). If playtests don't hit that shape, tempo numbers above get retuned before anything new gets built.
