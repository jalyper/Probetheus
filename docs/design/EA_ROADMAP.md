# Early Access Roadmap

**Last updated:** 2026-06-10
**Replaces:** `.planning/ROADMAP.md` v1.4 sequencing and the version roadmap in the archived design docs. Versions below restart the public numbering at EA milestones; internal v1.x history in CHANGELOG.md stands.

## Sequencing logic

Fix the economy and the feel first (cheap, transforms every minute of play), instrument the network second (the retention engine), then ship the differentiators (exploration content, defense, story) as visible EA momentum. Steam hygiene rides along from M1 so launch is never blocked on plumbing.

## M1 — "Feels Alive" (pre-EA, internal)
*The same game, at the right tempo, audible.*

- Probethium rebalance (ECONOMY.md): exotic synthesis 5→1P, station rates, remove wall-clock trickle
- Tempo: probe speed 2.5x, signal lifetimes, **1x/2x/4x + pause time controls**
- Procedural SFX manager + the 14-sound pass + collection juice + **combo system**
- Cargo capacity + speed penalties (ship the archived CARGO_FINAL design)
- New onboarding Act 1 + just-in-time tip conversion (ONBOARDING.md)
- Fix Dark Market purchase bug; guaranteed first encounter
- Exit bar: a new player reaches "second hub built" in session one without confusion; 45-min session hits the CORE_LOOP.md session-shape target.

## M2 — "Read Your Network" (pre-EA, internal)
*The Factorio half becomes real.*

- Throughput dashboard: header readout + full panel + network score (PROBE_NETWORKS.md §1)
- Bottleneck visual grammar: red supply lines, amber saturated hubs, cargo flash, idle-freighter dimming (Foundry starved/backed states shipped with REBUILD.md §2)
- Copy Route + route library (free blueprints)
- Probe wear + auto-repair (the upkeep heartbeat)
- Sector completion meter + rewards (EXPLORATION.md §1)
- Performance pass: **viewport culling**, trail caps — before players build 20-hub saves
- Exit bar: dashboard numbers visibly respond to network tuning; 60fps with 50 probes / 10 hubs on modest hardware.

## M3 — EA LAUNCH: "The Frontier"
*Why you wishlist it.*

- Nebula biome + Condensate; Phase Shift rework + asteroid chip-damage rework
- Landmarks: Derelict Probe, Shattered Relay, Ancient Vault, Wreckage Fragments
- **Echo 1 ("Distress Loop")** + Codex (all five tabs)
- Signal Storm live event
- Minimap adjacency hints + scan rings + landmark pips
- Steam: achievements (codex-mapped), **Steam Cloud via StorageAdapter backend**, rich presence, dev/test panel stripped from production builds, settings depth (rebinds, UI scale, colorblind rarity palette)
- In-game public roadmap screen (this doc, prettified)
- Optional: Next Fest demo = M3 build, 90-minute gate
- Exit bar: EA store-page honesty test — every trailer shot is real, every roadmap item has a design doc behind it.

## M4 — EA Update 1: "The Hollow Wakes"
*The galaxy pushes back.*

- DEFENSE.md complete: Hollow swarmers, Signature, zones, Sentinels, Guardian role, Hub Aegis, Rally, wave telegraphs
- Refinery + Alloy chain (PROBE_NETWORKS.md §5) — ships together with Sentinel ammo so the chain has a consumer on day one
- Hub upgrades recast onto Alloy + Logistics Bay upgrade
- Echo 2 + 3; Remnant Phase 2 dialogue (Null foreshadows the Hollow)
- Meteor Shower event

## M5 — EA Update 2: "Deep Networks"
- Auto-Routing AI research (automation ladder rung 2); Swarm Directives (rung 3)
- Entangled Hubs (500P); Blueprint Library (750P)
- Void Pocket biome + Void Shards; Convoy + Bounty Signal events
- Echoes 4 + 5; Husk + Leech Hollow variants
- Hub specializations if EA feedback asks for them (designed in archived ENDGAME_DESIGN.md; deliberately unscheduled until demand is proven)

## M6 — 1.0: "Journey Home"
- Echoes 6 + 7; portal discovery and **defended charging finale** (the Choir, DEFENSE.md)
- Three endings + cinematics; Colony Mode / The Between / Martyr's Legacy
- Prestige system (1000P) + Cosmic Echoes meta-progression
- Hardcore Frontier difficulty option (permanent structure destruction)
- Wormhole Generator and remaining Tier-4 shop items
- Full balance pass against telemetry

## Standing rules for every milestone

- CLAUDE.md test rule applies: every shipped feature lands with Playwright coverage.
- Every economy change ships with a `[economy]`-tagged CHANGELOG entry.
- One *player-visible* feature per patch minimum during EA — momentum is the EA product.
- Cut from the bottom of a milestone, never from its exit bar.
