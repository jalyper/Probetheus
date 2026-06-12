# Economy — Resources, Probethium, Cargo, Upkeep

**Last updated:** 2026-06-10
**Pillar served:** all three — the economy is the connective tissue

## Resource roster (unchanged roles, restated)

| Resource | Source | Sink |
|---|---|---|
| Minerals | signals, excavation, mining | probes, buildings, repairs, synthesis fallback |
| Data | signals, extermination | research-adjacent buildings, advanced buildings |
| Artifacts | signals, expeditions | alien-tree costs, advanced stations |
| Exotic Minerals | asteroid fields, rare+ signals | **Probethium synthesis (primary)** |
| Condensate *(new, EXPLORATION.md)* | nebulae | high-tier research, echo decodes |
| Void Shards *(new, post-EA)* | void pockets | Dark Market premium currency |
| Alloy *(new, PROBE_NETWORKS.md)* | Refinery (5 minerals → 1) | advanced buildings, hub upgrades |
| Research Points | milestones, sector discovery, completion | research tree |
| Probethium | **see below — fully rebalanced** | shop, echo decodes, Dark Market |

## The Probethium fix (the single most important balance change)

**Problem:** base passive generation is `0.00000000277/s` (~100+ hours for 1P), yet the entire late game — shells, Dark Market, echo decoding, the upgrade shop — is priced in Probethium at 25–5000P. The second half of the game is unreachable. The prices were right; the income was broken.

**Principle:** Probethium comes primarily from **active play**, scaling with engagement — not wall-clock. Idle play earns some (retention), active play earns 3–5x more.

### Income sources (new model)

| Source | Rate | Type |
|---|---|---|
| **Exotic synthesis** (rework: was 5 exotic → 0.001P) | **5 exotic → 1P**, batched, with the existing synthesis animation | active — the main engine; ties Probethium income to hazard-biome exploration |
| Mineral synthesis (fallback, exists as 100M → 1P) | **250M → 1P** (raised cost so exotics stay the smart path) | active/idle |
| ~~Mining stations in probethium-rich sectors~~ | **Retired 2026-06-11** with the Foundry recast (REBUILD.md §2) — Foundries forge alloy, not Probethium. Synthesis is the engine. | — |
| Sector 100% completion | **2P × distance ring** (4P at ring 2, 16P at ring 8) | active |
| Signal Storm cleared (20+ collections) | **5–15P** | active |
| Landmark investigations | 5–50P by tier (Wreckage Fragments at the top) | active |
| Dark Market special deals | occasional resource→P trades | active |

### Target income curve (validates against the kept price list below)

| Stage | P/hour (active) | What that buys |
|---|---|---|
| Early (first 5h) | 5–10 | first cosmetics (25–75P) within a session or two |
| Mid | 30–60 | a Tier-1 upgrade (250–600P) per ~2 sessions — a real decision |
| Late (tuned network + far biomes) | 150+ | endgame items (2000–5000P) are multi-week goals, not multi-year |

### Price list (kept from the archived PROBETHIUM_ECONOMY.md — unchanged)

- **Tier 1 — game-changing upgrades (250–600P):** Quantum Entanglement 500P · Signal Amplifier 250P/hub · Mining Catalyst 350P · Time Dilation Field 600P. *(Removed from shop: Probe Automation AI → now research, see PROBE_NETWORKS.md §4. Sector Mapper → cut, see EXPLORATION.md.)*
- **Tier 2 — cosmetics (25–175P):** the shipped 50+ shell catalog and UI themes.
- **Tier 3 — meta (500–1000P):** Prestige 1000P · RP Boost 500P ×3 · Blueprint Library 750P.
- **Tier 4 — endgame (2000–5000P):** Wormhole Generator 2000P *(post-1.0)* · Dyson Sphere Fragment 5000P · Universal Translator 3000P.
- **Echo decodes (STORY.md):** 150 / 250 / 400P for echoes 1–3.

## Cargo system (CONFIRMED — ship as designed in archived CARGO_FINAL.md)

This was fully designed and never shipped; it is the cheapest way to create routing decisions ("go home half-full and fast, or stuffed and slow?") and it feeds the dashboard's cargo-efficiency stat.

- Base capacity **100 units** across all carried types.
- Speed by load: ≤50% full → 100% · 50–75% → 90% · 75–90% → 75% · 90–100% → 60% · full → 50%.
- Discovery through play: the probe visibly slows; details panel confirms. No map clutter.
- Cargo Expanders Mk.I/II/III: +50/+100/+200 capacity (equipment slot trade-off — capacity vs. collectors).
- Interaction with combos (CORE_LOOP.md): a full probe that can't collect breaks your combo chain — another nudge toward right-sized routes.

## Upkeep — the network gets a heartbeat (light touch)

Friction outside asteroid fields is currently zero. Add *gentle* upkeep so efficiency matters and the dashboard has stakes — explicitly **not** a death spiral:

- **Probe wear:** probes lose 1 HP per 4 minutes of active exploration (hazard damage separate, see EXPLORATION.md). Auto-repaired at hub for **2 minerals/HP**, instant, automatic, logged in the dashboard as a maintenance cost line.
- **Station wear:** none. Stations already have supply pressure; double-dipping would nag.
- **No upkeep while offline.** Idle sessions never come back to a degraded network — log in to find earnings, not damage.
- Failure mode stays shallow: a fully worn probe limps home at 50% speed; it never dies outside hazards.

## Offline / idle layer (retention, not the game)

- Keep the 24h cap and 30% probe efficiency, 100% station efficiency.
- Recalibrate hourly estimates for the new probe speeds (CORE_LOOP.md) so the speed-up doesn't silently buff idle income.
- Offline report screen gets the dashboard treatment: "While you were away: +4,120 ⛏ · stations 92% uptime · 14P" — the network *report card* framing reinforces pillar 1 even when not playing.

## Economy guardrails (for future balancing)

1. Probethium is never required for *progression* — only for acceleration, cosmetics, story decodes, and endgame. A player who ignores the shop can still reach the portal.
2. Every new resource must have exactly one primary source biome/building and ≥2 sinks before it ships.
3. Active:idle income ratio stays in the 3–5x band. Below 3x, playing feels pointless; above 5x, idle players feel punished.
4. Any price or rate change ships with a `CHANGELOG.md` entry tagged `[economy]` — EA players deserve a paper trail.
