# Defense — The Hollow

**Last updated:** 2026-06-10
**Pillar served:** The frontier always pulls (primary), The network is the factory (secondary)
**Status:** Designed for EA mid-cycle (see EA_ROADMAP.md M4) — ships after the core loop/economy/dashboard work, before 1.0.

## Concept

Past a certain distance from the starting point, the galaxy pushes back. **The Hollow** — void-born swarmers drawn to the energy signatures of permanent structures — attack hubs, stations, and refineries on the frontier. The player must defend what they build out there.

This is Probetheus's biter analog, and it completes the distance gradient:

| Zone | Distance ring | Character |
|---|---|---|
| **The Quiet Zone** | 0–2 | Safe forever. Home. Structures here are *never* attacked. |
| **The Fringe** | 3–5 | Light, infrequent raids. Tutorialized first attack. |
| **The Deep** | 6–9 | Regular waves; defense is part of any permanent outpost's cost. |
| **The Hollow's Reach** | 10+ | Heavy pressure; only well-defended networks persist. Richest rewards live here (EXPLORATION.md landmarks, biomes). |

The strategic question it creates: **expand into riches and pay for defense, or consolidate safely and earn less.** That's the core Factorio tension, recast onto our distance gradient.

## Design rules (read these before adding anything)

1. **Only permanent structures are attacked.** Probes in transit are never targeted — losing a probe to an unavoidable mid-flight attack is frustration, not challenge. (Probes *can* opt into combat via the Guardian role, below.)
2. **Attacks are telegraphed, never ambushes.** Every wave gets a 60-second warning: minimap tile flashes violet, a low gentle pulse (sound #10 — never a klaxon), banner with sector name. The interesting moment is the *response*, not the surprise — and per the tone rule, even defense should feel like calmly repositioning pieces, not firefighting.
3. **Structures are disabled, not destroyed** (EA default). A structure at 0 HP goes dark — stops producing, stops acting as a hub — until repaired (minerals + a probe dwelling there 10s, same verb as landmark scanning). A 1.0 difficulty option ("Hardcore Frontier") makes destruction permanent.
4. **Signature, not bloodlust.** Attack frequency/intensity scales with the player's **Signature** in that ring — a simple function of structure count and activity (mining cycles, synthesis) in frontier sectors. Build loud, get noticed. Quiet outposts get raided rarely. This is Factorio's pollution→evolution loop reduced to one legible number, shown in the sector report.
5. **The Quiet Zone is sacred.** Players must always have somewhere that is purely about building and optimizing. Defense is the price of the *frontier*, never a tax on the whole game.

## The attackers

**Hollow Swarmers** — small, fast, weak; come in waves of 5–20, scale with ring and Signature. Visually: dark voidy motes with violet trails (reuse signal/particle rendering tech). They beeline for the highest-Signature structure in the sector, chew it (DPS contact damage), and dissipate when destroyed or when the structure goes dark.

Post-EA variants (content drip, one per update):
- **Husk** — slow tank that shrugs off Sentinel fire; Guardians counter it.
- **Leech** — attaches and *drains cargo/resources* instead of HP; ties into the Void Pocket fiction.
- **The Choir** (1.0, story) — coordinated waves during the portal-charging finale (STORY.md): the endgame is defending the portal while it charges. This gives the saga a climax that *plays*, not just a cinematic.

Fiction note: the Hollow are drawn to Probethium synthesis above all — the "fire" we stole from the void wants to come home. One line of Remnant dialogue (Null) seeds this; echo 6–7 lore confirms it.

## The defenses

| Defense | Type | Behavior | Cost shape |
|---|---|---|---|
| **Sentinel** | building (new) | auto-fires at swarmers in radius; placed like other path buildings | minerals early; **Alloy ammo** resupplied by shuttles once the Refinery ships (PROBE_NETWORKS.md §5) — defense joins the logistics chain |
| **Guardian role** | probe equipment (new) | a probe equipped with a Guardian Module patrols and intercepts; kills grant small exotic drops | one equipment slot — collector vs. guardian is a real loadout choice |
| **Hub Aegis** | hub upgrade | shield bubble: absorbs the first N hits per wave for the hub and adjacent structures | Alloy + data |
| **Rally** | player verb (free) | during a wave, click the threatened sector banner → all patrol probes in adjacent sectors converge to defend for the wave's duration | the active-play answer; no cost, pure skill/attention |

Research lives in a fourth branch grafted onto the Alien Technology tree ("Hollow Countermeasures"): Sentinel unlock → Guardian Module → Aegis → damage/range tiers. Shell system gets 1–2 defense-bonus shells (sentinel range, guardian damage) — slots cleanly into the shipped 12-bonus-type framework.

## How a wave plays (the arcade beat)

1. **T−60s:** warning banner + minimap flash + klaxon. Dashboard shows the threatened structure.
2. **Decision window:** rally patrols? redeploy a Guardian? let the Aegis tank it? Or — legitimately — let a marginal outpost go dark and rebuild later.
3. **The wave (60–120s):** swarmers stream in; Sentinels fire (tracer lines + sound); Guardians intercept; numbers pop. It should *look* like a tiny tower-defense vignette.
4. **Resolution:** "Wave repelled — 14 swarmers destroyed, +6 exotic" toast, or structure-dark notification with a one-click "queue repair" button. Either way, back to building inside 2 minutes.

Waves in any ring ≤5 should be fully survivable with zero preparation (Aegis-free hubs lose nothing permanent) — the Fringe teaches; the Deep tests.

## Onboarding hook

First scripted wave triggers the first time the player completes a structure in ring 3+: tiny wave (3 swarmers), guaranteed survivable, with a just-in-time tip ("The Hollow noticed you. Structures out here attract attention — Sentinels are now researchable."). See ONBOARDING.md — defense follows the same teach-by-first-encounter rule as everything else.

## Dashboard integration

- New stats: threat level per ring (Signature), waves repelled, structures dark.
- A starved Sentinel (no ammo) uses the same red-supply-line language as starved stations — defense logistics reads identically to production logistics. One visual grammar, everywhere.
