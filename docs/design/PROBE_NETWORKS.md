# Probe Networks — Throughput, Visibility, Logistics

**Last updated:** 2026-06-10
**Pillar served:** The network is the factory (primary)

## The problem this doc solves

Today, a player who routes probes brilliantly and one who scatters them randomly get nearly identical outcomes — and neither can tell the difference. Factorio works because the factory *shows you its own bottlenecks*. Probetheus has the skeleton (shuttles, station starvation, hub ranges, cargo) but no instrumentation and no payoff for tuning. These systems fix that, in order of leverage.

## 1. Throughput dashboard (highest priority in the whole redesign)

Optimization is only fun when it's measurable.

### Header readout (always visible)
- Global **resources/minute** per type, as a rolling 60s average with a trend arrow: `⛏ 42/min ▲`.
- Click to expand the full dashboard panel.

### Dashboard panel (per-hub and global)
| Stat | Definition | Why the player cares |
|---|---|---|
| Throughput | resources/min by type, 60s and 10min windows | the score |
| Probe round-trip time | avg seconds per route, per hub | spot bloated routes |
| Probe utilization | % of time probes are exploring vs idle-at-hub | "deploy your benched probes" |
| Cargo efficiency | avg % cargo fullness on return | half-full returns = route too short; crawling returns = too long (see ECONOMY.md cargo) |
| Freighter idle % | per hub | over/under-provisioned logistics |
| Foundry uptime | % of time running (not starved/backed up), per Foundry | the Factorio "machine working" number |
| Network score | weighted composite, 0–100 | one number for the session-over-session "am I better?" feeling |

Implementation note: all inputs already exist as events on the EventBus (`probe:returned`, cargo deposits, mining cycles). This is an aggregation layer + UI, not a systems rewrite.

### Why this is also the retention feature
"Network score 61 → 74 this session" is the arcade-factory equivalent of a high score. Surface it on the save-slot metadata and in the session-end autosave toast.

## 2. Bottleneck visibility — the map reads like a factory floor

Extend the existing station glow language (cyan/orange/red) into a complete visual grammar:

- **Starved Foundry:** red dashed line drawn from the Foundry back to its supply hub. The line *is* the diagnosis. (A *backed-up* Foundry pulses its alloy output port instead — haul it away.)
- **Saturated hub** (probes benched because hub is at capacity): hub ring pulses amber.
- **Overloaded probe** (≥90% cargo, crawling): cargo icon flashes above probe; trail dims.
- **Idle freighter:** docked-freighter glyph dims to 40% opacity.
- **Route inefficiency hint** (post-EA, once dashboard data exists): a route whose round-trip time is >2x hub average gets a subtle dotted overlay — "this one's worth a look."
- All warning states also fire sound #10 (low pulse) at most once per 30s per category — informative, never naggy. A settings toggle silences warning audio.

## 3. Blueprints & route templates (pull forward from the old 750P shop item)

Basic versions become **free QoL**; the premium version stays in the shop.

- **Copy route** (free, immediate): select probe → "Copy Route" → click another probe (or several) to paste. The #1 ask any network player will have.
- **Route library** (free): save up to 3 named routes per hub; deploy a probe directly onto a saved route from the hub panel.
- **Blueprint Library** (Probethium shop, 750P, post-EA): save full hub *layouts* — hub + station positions + shuttle counts + saved routes — and stamp them onto new territory. This is the late-game "I've solved the pattern, let me scale it" purchase, deliberately premium.

## 4. The automation ladder (earned, never default)

Mirrors Factorio's burner → electric → bots arc. Each rung is a research milestone and each must make the player *feel* relieved of work they were actually doing:

| Rung | Name | What it automates | Gate |
|---|---|---|---|
| 0 | Manual deployment | nothing — and it must be fun bare (combos, juice) | start |
| 1 | Patrol mode | route looping | exists today, stays early |
| 2 | **Auto-Routing AI** | probe self-deploys to highest-yield reachable area; respects saved routes as preferences | mid-game research, Probe Tech tree (was the 300P "Probe Automation AI" shop item — moved to research so it's a progression beat, not a purchase) |
| 3 | **Swarm Directives** | hub-level policy: "prioritize data," "feed station 2," "push frontier" — probes assigned automatically | late research, post-EA |
| 4 | **Entangled Hubs** | two linked hubs share inventory instantly; turns the network into a graph problem | Probethium shop 500P, post-EA (kept from old design — it's good) |

Design rule: every rung must still leave a reason to intervene during Signal Storms and events. Automation handles routine; the player handles spikes.

## 5. Logistics depth — two stages, no further *(shipped 2026-06-11 as the Foundry, REBUILD.md §2)*

One refinement layer creates Factorio-style *chains* without belt-game scope creep:

- **The Foundry** (the Refinery as built — it also *replaced* mining stations outright). Converts raw minerals → **Alloy** (5:1) at a continuous rate-capped flow. Fed by **freighters** (the shuttle recast) working hub↔Foundry legs: minerals out, alloy home.
- Alloy is the cost currency for tier-2+ logistics (Intake Bay 3 today; hub upgrades and Sentinels as they ship), replacing part of their raw-material costs.
- Net effect: the network has input *chains* (deposits → probes → hub → freighter → Foundry → freighter → hub), so layout and freighter allocation genuinely matter, and the dashboard's uptime stats get interesting.
- **Hard scope line:** two stages max (raw → refined). No third tier, no fluids, no ratios beyond 5:1. If a design needs more depth, it's the wrong design for this game.

## 6. Hub upgrades (already designed in v1.4 planning — confirmed, with costs recast)

- Freighter capacity 3 → 6, probe capacity 5 → 8, probe range +50% — as previously specced, but advanced tiers cost **Alloy** now that the Foundry has shipped, slotting them into the chain.
- Add one new upgrade: **Logistics Bay** — +1 saved-route slot and +10% freighter speed per level (2 levels). Cheap, network-flavored, makes hubs feel individually grown.

## What got cut from old designs

- **Wormhole Generator (2000P)** — survives, but moves post-1.0; instant travel undermines the routing game until the routing game is mature.
- **Resource Converters / auto-trading** — cut; conflicts with "the network is the factory" (conversion should happen in buildings on the map, not in a menu).
- **Multiplayer trade networks / territory control** — out of scope entirely (see VISION.md).
