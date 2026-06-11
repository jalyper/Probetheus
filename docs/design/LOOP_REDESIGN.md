# Core Loop Redesign

**Last updated:** 2026-06-11
**Status:** DIRECTION A CHOSEN (user, 2026-06-11) + factory-first/rings/mothership framing (user, same session — see Addendum). Supersedes CORE_LOOP.md §"The loop, restated". Prototype foundation implemented same session: DepositSystem, prospecting pings, route extraction, hub intake queueing.

## Addendum — factory-first, concentric rings, the mothership (user direction)

Three commitments layered onto Direction A:

1. **Factory-first crafting.** Logistical items (probes, hubs, shuttles, stations, and especially their *upgrades*) are built from found materials — and upgrade tiers require progressively more exotic materials. You don't buy a better network; you *make* one out of what your current network can reach.
2. **Concentric difficulty rings (Valheim-style).** Difficulty and material exoticness increase in rings radiating from the starting point — in any direction. Each ring introduces materials that gate the next tier of logistics. The progression loop: push into ring N → chart its deposits → haul its exotics home → craft the upgrades that make ring N+1 reachable. (Prototype: deposit richness already scales with distance; ring 2+ deposits now carry `exoticMinerals` with rising probability.)
3. **The mothership endgame.** The story asks the player to explore outward to find — or build — pieces of ancient tech that locate and reunite the probes with their mothership, **the Probetheus**. Story beats (Remnants, echoes, relics) recast as ring milestones; the title is the destination. STORY.md needs a rewrite pass against this.

Open design work (next sessions): material list per ring + recipe table (which logistics items cost what), how hazards scale per ring, ancient-tech piece placement, and what "difficulty" means for a non-combat network game (hazard density, signal interference, probe wear).

## Diagnosis — why the playtest felt how it felt

The failure isn't tuning. It's structural, and it's one line of code deep:

**Signals spawn from the probe, not from the world.** (`ProbeManager.js` ~502: every 3s pulse, 30% chance, a signal appears within 160px of wherever the probe happens to be.) Consequences:

1. **Routing is mathematically irrelevant.** Expected income = probe count × time. A brilliant route and a random scatter produce identical yield because the probe carries its own loot fountain with it. The "network" is decoration around a slot machine.
2. **Nothing persists.** Signals live 2.5–4s. There is nothing to learn about the map, nothing to invest in, no "my territory produces X/min." Every moment is a fresh reroll, which the brain correctly reads as monotony.
3. **Nothing constrains.** Factorio's optimization fun is rate-matching through constrained links (belts saturate, inserters lag, power browns out). Here no link can saturate: hub intake is infinite, probes never queue, routes never congest. No constraints → no bottlenecks → nothing to fix → tuning is meaningless. The throughput dashboard (M1) measures noise.
4. **The early game asks zero questions.** "Where should I route?" has no answer when everywhere is identical. The first real decision arrives never.

The PROBE_NETWORKS.md instrumentation plan (dashboards, bottleneck visuals) assumed the skeleton was sound and just illegible. The playtest says otherwise: there is nothing underneath to instrument.

## What any fix must produce

Two networks with equal probe counts must visibly and measurably diverge — 2–3x — because of player decisions: where hubs sit, which sources get worked, how routes are drawn, how probes are allocated. And the first such decision must arrive in the first five minutes.

---

## Direction A — Deposits & Logistics (RECOMMENDED)

**Inversion: resources come from persistent *places*; probes are *logistics*, not slot machines.**

### The world
- Each sector generates **deposits** at init: mineral veins, data ruins, artifact sites. Persistent, mapped once discovered, biome-typed (sector exclusives slot right in).
- Each deposit has a **richness** (yield per extraction) and an **extraction rate cap** (e.g. a vein supports ~30/min no matter how many probes camp it).
- Spatial logic: starter deposits near home are small and teach the loop; richness and density scale with distance — **the frontier pull becomes mechanical, not cosmetic.**

### The loop
1. **Prospect** — undiscovered deposits emit faint pings as probes sweep nearby. Today's signal-collect moment *survives intact* as the discovery verb — but now each ping means something permanent: it marks a deposit. Early game becomes a prospecting hunt with lasting payoff instead of a screensaver.
2. **Tap** — draw a probe loop over a deposit (patrol mode becomes the core verb, not rung 1 of automation). Probes extract per pass and haul home.
3. **Route** — throughput per probe = cargo ÷ round-trip time. Shorter loops from a well-placed hub literally yield more. A skilled route services 2–3 deposits per loop. Hub placement near clusters is the defining spatial decision.
4. **Tune** — constraints create real bottlenecks:
   - **Deposit cap:** over-assigned probes saturate a vein → visible diminishing returns → expand instead of stack.
   - **Hub intake rate:** deliveries/min a hub can process. Exceed it and probes *visibly queue* at the dock — the Factorio belt-backup moment. Fix: upgrade intake, or build a second hub. (First bottleneck a player meets, ~minute 4.)
   - Refinery chain (raw → alloy, unchanged from PROBE_NETWORKS.md §5) adds the rate-matching layer; hard cap at two stages stands.
5. **Push** — range limits + distance-scaled richness force relay hubs outward. Expansion is growth, not wallpaper.

### Why this serves the pillars
- **Network is the factory:** sources, links, sinks, capacities — an actual flow network. The dashboard finally measures real things; bottleneck visuals diagnose real problems.
- **Earned flow:** cargo sparks now trace standing routes between real places. A tuned network hums visibly; a sloppy one shows queues and starved veins. *The aquarium is the scoreboard.*
- **Frontier pulls:** richness gradient + relay logistics = every push outward is a logistics question worth answering.

### First ten minutes (target shape)
- **0–2:** hub + two probes; sweeping reveals 3–4 starter deposits of visibly different quality → first choice: which two to tap.
- **2–5:** draw loops, first gold flows home, hub intake queues → first bottleneck, first fix, dashboard ticks up.
- **5–10:** prospect outward, find a 3× vein two sectors away → real decision: second hub out there, or upgrade intake here? Either answer visibly changes the network score.

### What survives / what dies
- **Survives:** probes, hubs, routes, patrol, shuttles, stations, refinery plan, research, equipment (collectors → extraction speed/specialization), shells, Probethium, story/Remnants/Dark Market, time controls, all Void Premium visual work, Signal Storms (recast: temporary rich surface-deposits — tests whether your network can spin up a route fast, not whether you can click).
- **Dies:** probe-generated signal spawning, signal-as-income, collection-as-economy. Combos recast as prospecting streaks or delivery streaks (debatable).
- **Debatable:** the Excavate/Exterminate/Expedition planet screen — could become the deposit-discovery flavor beat, or be cut as a relic.

---

## Direction B — Flow Fields ("signal weather")

Persistent **currents** of signals drift through space along slow invisible flows (think ocean currents / trade winds). The player reads the weather, anchors collector arrays across currents, and networks become fishing fleets positioned against a vector field that shifts over hours.

- Optimization = placement against flow; legible via a beautiful field-line overlay (very Void Premium).
- More original, more ambient, genuinely novel.
- Risks: harder to read than points-on-a-map; "currents shifted" can feel like the game undoing your work; rate-matching chains graft awkwardly onto it. Higher design risk, longer to find fun.

## Direction C — Demand Network (contracts & colonies)

Income comes from **continuous demand**: colonies/stations with input rates (Mini Metro / Anno energy). Supply still comes from stochastic collection; the game is balancing a growing demand graph.

- Strong rate-matching fun, very legible.
- Risk: keeps the broken supply side (random spawns) — demand pressure alone doesn't make *routing* matter, only allocation. Half the diagnosis goes unfixed.
- Best part (demand-side pressure) is already contained in Direction A via stations + refinery.

---

## Recommendation

**Direction A.** It fixes all four diagnosis points with one inversion, keeps ~90% of built systems by reassigning their roles, makes the existing dashboard/bottleneck/sparks work land instead of float, and turns both other directions' best ideas into layers it can absorb later (B's storms-as-weather as an event type; C's demand as the station/refinery sink).

**Prototype scope (1 session):** deposits in sector gen + prospecting pings + patrol extraction + hub intake cap with visible queueing + dashboard wired to real flow. Playtest the first-ten-minutes shape before touching anything else.
