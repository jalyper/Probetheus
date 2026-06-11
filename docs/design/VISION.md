# Probetheus — Vision

**Last updated:** 2026-06-10
**Status:** Active — this is the source of truth for game direction. Older design docs are archived in `docs/archive/`.

## What this game is

**Probetheus is an arcade-paced factory game about building probe networks in deep space.**

One sentence pitch: *Factorio's "watch your machine hum" satisfaction, at the tempo of an arcade game, where the factory is a network of probes, hubs, and shuttles spread across an infinite galaxy — and the frontier always has something worth flying toward.*

The previous framing ("space exploration idle game") is retired. Idle/offline progress remains as a retention feature, but the game is designed around **active sessions** where the player is routing probes, reading their network's throughput, chasing events, and pushing the frontier. If a feature makes the best move "wait longer," it's wrong for this game.

## The three pillars

Every feature must serve at least one pillar. Features that serve none get cut, no matter how cool.

### 1. The network is the factory
The player's probe/hub/shuttle network is a living machine with measurable throughput. Like Factorio, the game must **show the player their own bottlenecks** — starved stations, idle shuttles, overloaded probes — and reward fixing them with visibly better numbers. A well-tuned network should feel meaningfully different from a sloppy one, and the player should be able to *see* the difference.

### 2. Arcade tempo
Fast probes, snappy collection, juicy feedback, short loops. Sessions should feel like spinning plates, not watching paint dry. Sound, particles, combo moments, and timed events (Signal Storms) provide the pulse. Time controls (1x/2x/4x) let the player set their own tempo. Travel time exists to create routing decisions, never to pad the clock.

### 3. The frontier always pulls
Distance must mean something. The further from home, the stranger and richer the galaxy gets: hazard biomes with exclusive resources, derelicts and landmarks that exist nowhere else, story echoes that only spawn far out. Exploration is never "more of the same in a new place" — every expedition outward should answer "can my current build handle it?" and pay off with something home sectors can't offer.

## What changed from the previous direction (2026-06-10)

| Before | Now |
|---|---|
| Idle game with active elements | Active arcade-factory game with idle retention layer |
| Probethium as ultra-slow wall-clock currency | Probethium earned through active play at meaningful rates (see ECONOMY.md) |
| Exploration = discover sector, collect bonus, done | Sector completion, hazard biomes, landmarks, codex (see EXPLORATION.md) |
| Network optimization invisible and unrewarded | Throughput dashboard + bottleneck visuals as core systems (see PROBE_NETWORKS.md) |
| Full Prometheus saga (7 echoes + portal + 3 endings) before ship | Echoes 1–3 in Early Access; portal + endings are the 1.0 promise (see STORY.md) |
| No sound, no events, no time controls | Sound pass, Signal Storms, and speed toggle are core-loop features (see CORE_LOOP.md) |

What is **kept** from the previous direction:
- The Prometheus narrative arc, the Remnants, the Dark Market, and the three endings — recast onto an EA→1.0 schedule.
- The shell/cosmetics system and its bonus design (shipped, working).
- The Probethium shop catalog and its price points — the prices were right; the income was broken.
- Sector resource profiles and distance-weighted richness (shipped, the foundation of pillar 3).

## Target player

- Factorio / Mindustry / Dyson Sphere Program players who want a lighter, faster cousin they can play in 30–60 minute sessions.
- Idle-adjacent players who enjoy "my machine ran while I was away" but want the *playing* part to be a real game.
- Players who explore for the sake of finding things (Outer Wilds energy, scaled way down).

Explicitly **not** designing for: pure idle players who never want to touch the controls, and hardcore Factorio players who want belt-level logistics depth. We stop at two-stage production chains.

## Design tenets (the small rules)

- **Visible > stated.** A red supply line beats a tooltip explaining starvation.
- **Earned automation.** Every automation tier (patrol → auto-routing → swarm) is researched, never default. The manual version must be fun first.
- **Risk is a trade, not a tax.** Research changes the terms of a hazard, never deletes it (Phase Shift's current "negate asteroids" behavior gets reworked).
- **Numbers the player can feel.** Prefer one stat the player watches (resources/min) over five they don't.
- **No dead clicks.** Every click does something with feedback within 100ms — sound, flash, number.
- **Ship the pulse early.** One live event in players' hands beats five in a doc.

## Platform & Early Access intent

Desktop-first via Electron, targeting **Steam Early Access**. The EA bar: core loop juiced and audible, networks measurable, one hazard biome beyond asteroid fields, echoes 1–3 live, economy functional end-to-end, and Steam hygiene done (cloud saves, achievements, no dev panel). Full scope and sequencing in `EA_ROADMAP.md`.

## Document map

| Doc | Covers |
|---|---|
| `CORE_LOOP.md` | Moment-to-moment play, tempo, juice, sound, time controls, live events |
| `PROBE_NETWORKS.md` | Throughput stats, bottleneck visibility, blueprints, logistics chains, automation ladder |
| `EXPLORATION.md` | Sector completion, hazard biomes, landmarks/derelicts, codex, minimap |
| `ECONOMY.md` | Resources, the Probethium rebalance, cargo system, upkeep, full price list |
| `DEFENSE.md` | The Hollow — frontier structure attacks, Sentinels, Guardians, threat zones |
| `STORY.md` | Prometheus saga, echoes, Remnants, Dark Market, endings |
| `ONBOARDING.md` | The 60-second tutorial and just-in-time tips |
| `EA_ROADMAP.md` | Milestone sequencing, Steam EA checklist, 1.0 definition |
