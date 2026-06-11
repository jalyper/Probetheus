# Story — The Prometheus Saga

**Last updated:** 2026-06-10
**Pillar served:** The frontier always pulls
**Source material:** archived `PROMETHEUS_SAGA.md`, `RESOURCE_ECHOES.md`, `JOURNEY_HOME.md` — the narrative survives intact; this doc recuts it for the EA→1.0 schedule and ties it to the new systems.

## The arc (unchanged)

Hub-7 was torn from the starship **Prometheus** during a quantum jump accident. Corrupted transmissions — **Signal Echoes** — from the ship's AI drift in deep space. Each decoded echo reveals lore, grants a real gameplay benefit, and yields coordinate fragments pointing to a rift portal ~12,000 units out, where the Prometheus waits. At the portal, the player charges it with stockpiled resources and chooses one of three endings:

- **Rescue** (compassion): bring the ship home → unlocks Colony Mode.
- **Ascension** (knowledge): enter The Between → new dimension layer.
- **Sacrifice** (heroism): seal the rift → Martyr's Legacy bonuses for future runs.

The Prometheus-myth resonance stays the spine: Probethium is the stolen fire, and (new, via DEFENSE.md) **the Hollow are the void wanting its fire back** — which finally gives the myth a mechanical antagonist.

## What ships when (the big change)

| Beat | Old plan | New plan |
|---|---|---|
| Intro cutscene | shipped | shipped — unchanged |
| Echoes 1–3 | part of a 7-echo post-launch arc | **Early Access content** — echo 1 lands in the player's first sessions |
| Echoes 4–7 | post-launch | EA content updates (one per major patch — the story *is* the EA roadmap drip) |
| Portal + charging | 1.0 | 1.0 — now a **playable finale**: the Choir assaults the portal while it charges (DEFENSE.md), so the climax is defended, not watched |
| Three endings | 1.0 | 1.0 — unchanged |

Rationale: "there's a corrupted transmission out there, decoding it gave me a real upgrade and four coordinate digits" is the wishlist-converting hook. It must land in session one or two, not in a someday-update.

## Echoes — mechanics (consolidating the two old competing designs)

The archived docs had two echo systems (7 milestone-triggered vs. 9 resource-gated). **Consolidated: 7 echoes, discovery through exploration** — echoes are now found at **Prometheus Wreckage Fragment landmarks** (EXPLORATION.md §3, distance 8+ for late echoes, closer for early ones), because the frontier should be where the story lives. Triggers:

| Echo | Found at / trigger | Decode cost | Gameplay grant |
|---|---|---|---|
| 1 — "Distress Loop" | guaranteed wreckage landmark, ring 2, surfaced by a one-time scripted ping after the player's 3rd sector | **150P** | +25% probe speed (permanent) |
| 2 — "Navigation Logs" | wreckage, ring 3–4 | 250P | reveals exact biome hints on minimap (upgrade to EXPLORATION.md adjacency hints) |
| 3 — "Mining Directive" | wreckage, ring 4–5 | 400P | mining stations +50% Probethium |
| 4 — "Quartermaster's Ledger" | ring 5–6 | 400P | +100 cargo capacity fleet-wide |
| 5 — "The Quiet Order" | ring 6–7 | 500P | Sentinels −50% ammo use; Hollow lore reveal |
| 6 — "Captain's Final Message" | ring 8 | 500P | all hub upgrades −50% cost |
| 7 — "The Choice" | ring 10, requires echoes 1–6 | 500P + 100 Condensate | portal coordinates complete; endgame unlocked |

Decode costs are the primary mid-game Probethium sink (ECONOMY.md income curve is tuned against them: echo 1 affordable in the first 2–3 sessions under the new rates). Decoded transcripts live in the Codex.

## The Remnants (Phase 1 shipped — Phase 2 scoped here)

Five NPCs exist with spawning, dialogue UI, and portraits: **Keth-Varn, Whisperer, Mira-Sol, Archivist, Null.** Phase 2 gives them jobs in the new design:

- Each Remnant carries **2–3 short dialogue sets** keyed to player progress (echo count, deepest ring reached, first structure dark). Lines are 1–3 sentences — flavor and foreshadowing, never exposition dumps.
- Each seeds one system: Whisperer hints at the next wreckage's ring; Null foreshadows the Hollow ("It is not anger. It is gravity."); Archivist references codex gaps; Mira-Sol comments on network health (reads the dashboard!); Keth-Varn teases Dark Market stock.
- Encounter log lives in the Codex Remnants tab.

## Dark Market

- **Fix the open purchase-button bug first** (`DARK_MARKET_BUG.md`) — best content in the game is currently both unreachable (0.2% spawn) and broken at point of sale.
- **Guaranteed first encounter:** a scripted Dark Market signal spawns once the player owns ≥50P (i.e., can actually buy something). Rarity-based spawning applies only after that introduction.
- Post-EA: the **Convoy** event (CORE_LOOP.md) makes traders interceptable; **Void Shards** (EXPLORATION.md) become Null's premium currency.

## Voice & delivery rules

- No text wall ever exceeds the dialogue box (3 lines max per advance); the typewriter effect already shipped — keep it fast (skippable per-click).
- Lore depth lives in the Codex for players who want it; the map never stops for story except the intro and the three echo/ending cinematics (skippable).
- Tone: lonely, wondrous, lightly dry. The Remnants are strange, not jokey; Hub-7's own system messages can carry the dry humor.
