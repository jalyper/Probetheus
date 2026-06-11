# Exploration — The Frontier Always Pulls

**Last updated:** 2026-06-10
**Pillar served:** The frontier always pulls (primary)

## The problem this doc solves

Sector discovery currently grants 1 RP and a few bonus signals, then the sector is "done." Distance-weighted resource profiles (shipped in v1.3) are the right foundation, but nothing *out there* is qualitatively different from home, and the map gives no reason to wonder what's next. Exploration needs: things worth working for in a sector (completion), things that only exist far away (landmarks, biomes), and a map that provokes curiosity (minimap hints, codex).

## 1. Sector completion

Every discovered sector gets a **scan meter** (0–100%), driven by: area covered by probe pulses (60%), exclusive signal type collected at least once (20%), any landmark in the sector investigated (20%).

- Shown in the sector report panel and as a thin ring on the minimap tile.
- **100% reward:** +2 RP, one guaranteed rare+ signal spawn, codex entry stamped "Surveyed," and a small Probethium bonus scaling with sector distance (see ECONOMY.md).
- Patrol routes now have a purpose beyond farming: park a patrol in a sector to grind out its scan coverage. Converts "I flew through it" into "I worked it."
- Completion is *optional* — the meter rewards thoroughness, it never gates progression.

## 2. Hazard biomes — risk is a trade, not a tax

Asteroid Fields are the template: danger + exclusive resource. Two fixes and two new biomes.

### Fix: Phase Shift rework
Phase Shift currently *negates* asteroid danger, which deletes the trade. Rework: phased probes take no damage but **cannot collect while phased**; phase toggles automatically in/out of hazard zones with a 3s cooldown. Shields remain the "slower but always collecting" alternative (regen exists today). Now there are two viable builds instead of one solved checkbox.

### Fix: asteroid pacing
10% destruction-roll every 3s is swingy. Change to deterministic chip damage (1 HP per 5s in-field, telegraphed by screen-edge crackle + sound) so durability research and shells have legible value.

### New biome: Nebula (ship in EA)
- Spawn weight ~5%, only at distance ≥ 4 from origin.
- Effect: minimap and signal pings are **suppressed** inside — the player flies blind; signals are visible only within a small radius of each probe. Probe trails become the player's own breadcrumbs.
- Exclusive resource: **Condensate** (data-family exotic), used by high-tier research and one echo decode.
- Counterplay research: "Spectral Filter" (Alien tree) restores partial visibility — again a trade: filter equipped costs an equipment slot.

### New biome: Void Pocket (post-EA, pairs with story)
- Rare (~2%), distance ≥ 8. Cargo slowly *drains* while inside (leaks into the void); drained cargo crystallizes as recoverable void shards at fixed points.
- Exclusive resource: **Void Shards** — the Dark Market's preferred currency (Null, the void NPC, pays a premium; see STORY.md).
- The push-your-luck biome: dart in, grab, get out.

### Biome rule
Every biome answers "can my current build handle that sector type yet?" with equipment/research trades — never with a flat stat check, and never with total negation.

## 3. Landmarks & derelicts — things that exist only out there

Procedural one-off structures, spawn chance scaling with distance from origin (0% in the first ring, ~15% per sector at distance 8+). Investigated by sending a probe to dwell at the site for 10–20s (visible scan beam — interruptible, creating tension in hazard biomes).

| Landmark | Distance | Payoff |
|---|---|---|
| **Derelict Probe** | 2+ | small resource cache + codex lore fragment (cheap, common, teaches the mechanic) |
| **Shattered Relay** | 4+ | repairable for minerals → acts as a half-range mini-hub (probes can route through it). The exploration ↔ network crossover piece |
| **Ancient Vault** | 6+ | unique equipment item from a fixed pool (e.g., "Vault Resonator" — +1 combo window) — items that cannot be researched or bought |
| **Prometheus Wreckage Fragment** | 8+ | story echo site (see STORY.md) + large Probethium grant |
| **Sleeping Structure** | 10+ | post-EA mystery class — visible, scannable to 99%, "respond[s] to nothing you have… yet." Pure forward-promise for content updates |

Landmarks are the wishlist-trailer content: screenshots of a probe scanning a derelict in a nebula sell this game.

## 4. The Codex

A collection archive, opened from the main UI. Tabs:

- **Sectors** — every discovered sector: name, type, profile, scan %, landmarks found.
- **Signals** — every signal type & rarity collected (collection grid with silhouettes for unfound).
- **Landmarks** — illustrated entries + lore text.
- **Remnants** — NPC encounter log + dialogue history (gives the story system a memory).
- **Echoes** — decoded echo transcripts (STORY.md).

Completion percentages per tab; each tab's 100% grants a cosmetic shell exclusive to that tab. The codex doubles as the achievement backbone — most Steam achievements map 1:1 to codex milestones (see EA_ROADMAP.md).

## 5. The minimap provokes, not just records

- **Adjacency hints:** unexplored sectors adjacent to explored ones render a faint procedural tint hinting at type — reddish grain (asteroid), violet haze (nebula), gold glint (ancient), pale shimmer (void). Hints are 80% reliable; Quantum Sensors research (exists today) makes them exact.
- **Scan rings:** explored tiles show the completion ring (from §1).
- **Landmark pips:** discovered-but-uninvestigated landmarks pulse softly on their tile.
- **Storm/event flashes:** live events flash their tile (CORE_LOOP.md).
- Net effect: the minimap becomes the "where next?" decision surface — the player should glance at it and *want* something.

## What got cut / changed from old designs

- **Sector Mapper (200P shop item: "reveal all signals in sector")** — cut; it deletes exploration. Replaced in spirit by Quantum Sensors + adjacency hints.
- Flat "discovery bonus signals" remain but are now the floor, not the whole reward.
- Infinite-galaxy framing stays, but content density now *rises* with distance instead of staying uniform — the infinite part is the promise, the gradient is the game.
