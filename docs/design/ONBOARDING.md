# Onboarding — Playing in 60 Seconds

**Last updated:** 2026-06-10
**Goal:** the player is *flying a probe and collecting* within 60 seconds of "New Game," and never reads more than two short sentences at once. The existing TutorialManager step framework is kept; the content and philosophy are replaced.

## Principles

1. **Teach by doing, not by reading.** Every step is an action the player performs, prompted by ≤2 short sentences (target ≤12 words each). If a step can be taught with an arrow and a pulsing highlight instead of words, use the arrow.
2. **Just-in-time, not front-loaded.** Systems are explained the first time the player *encounters* them, not in advance. A player who never builds a refinery never reads about refineries.
3. **The game is the tutorial.** Combos teach dense routing. Cargo slowdown teaches load management. The scripted first Hollow wave teaches defense. Design feedback loops so the mechanic explains itself; the tip just names what the player already felt.
4. **Always skippable, never re-shown.** "Skip tutorial" on step 1; every tip has a dismiss; tips never repeat once dismissed; global toggle stays in settings (shipped).
5. **Depth lives in the Codex.** Every tip ends with an optional `[Codex]` link for players who want the full entry. Nobody is forced through it.

## Act 1 — The Guided Minute (replaces current steps 1–6)

Runs immediately after the (skippable) intro cutscene. One instruction on screen at a time, top-center banner (shipped position), each completing on the player's action:

| # | Prompt | Completion | Teaching |
|---|---|---|---|
| 1 | "Click your Hub." *(hub pulses)* | hub selected | selection |
| 2 | "Deploy a probe — click out there." *(range ring shown, ghost-line follows cursor)* | waypoint placed; auto-deploys after 1 waypoint during tutorial (no waypoint lesson yet) | the core verb |
| 3 | "Signals! Click them before they fade." *(scripted cluster of 4 commons spawns on the probe's path)* | 2+ collected — chained fast, the combo fires and announces itself | collection + combo, by feel |
| 4 | "Your probe hauls it home. Cargo pays out on return." | probe returns, deposit flourish plays | delivery loop |
| 5 | "That's the loop. Build, explore, optimize. You're on your own." *(Build Probe + minimap briefly highlighted)* | auto-dismiss 5s | release |

Five steps, one minute, zero menus. Everything else is just-in-time.

## Act 2 — Just-in-time tips (replaces current steps 7+ and the mining/research tutorial chains)

Each fires once, on first encounter, as a 2-sentence toast (not a blocking banner). Examples — the full table lives in TutorialManager:

| Trigger (event already exists on the EventBus) | Tip |
|---|---|
| first RP earned | "Research Point earned. The Lab is open — milestones earn more." |
| first time a probe returns ≥90% cargo (slowed) | "That probe was stuffed — full cargo is slow cargo. Shorter routes, faster pay." |
| first sector discovered | "New sector. The scan ring on the minimap fills as you work it." |
| first signal missed (expired unclicked) | "Signals fade fast. Auto-collectors can be researched." |
| first time second hub affordable | "100 minerals banked. A second Hub extends your reach — build it on an outbound route." |
| first mining station built | "Stations eat resources to make more. Shuttles feed them — watch the supply line." |
| first starved station (red line appears) | "Red line = hungry station. More shuttles, or closer supply." |
| first storm | "Signal Storm! Five-fold spawns in that sector for 90 seconds. Go." |
| first ring-3 structure completed | scripted mini Hollow wave + defense tip (DEFENSE.md) |
| first Remnant spawn | "Something is out there, watching. Click it… if you like." |
| first 50P owned | scripted Dark Market signal (STORY.md) |

Rule of thumb: **if a tip needs a third sentence, the mechanic needs better feedback instead.** File it as a juice bug, not a longer tip.

## What gets deleted from the current tutorial

- The 10+ step mining/research/equipment chains (REQ-1 through REQ-11 era) — all converted to just-in-time tips above.
- Tutorial-only placement restrictions that outlived the tutorial (hub placement blocked on return paths) — remove the restriction entirely; with cargo + dashboard shipped, players can discover placement quality themselves.
- Any tip over two sentences. All of them, on sight.

## Measuring it (EA telemetry, even if it's just local save-file counters)

- Time from New Game → first collection (target: <60s median).
- Tutorial skip rate and per-tip dismiss-before-read rate (if a tip is always insta-dismissed, cut it).
- % of players who build a second hub in session one (the "got it" signal — this is the activation metric).
