# The Rebuild Slate — invented systems, not refits

**Last updated:** 2026-06-11
**Status:** Active. User directive (2026-06-11): "INVENT game mechanics more than refine the ones that exist already… take a sledgehammer to everything and rebuild it from the ground up according to our new pillars." This doc is the invention slate. It extends LOOP_REDESIGN.md (the loop stands) and **supersedes the LOOP_REDESIGN systems-audit verdicts where they said RECAST/KEEP out of caution** — caution is retired. Read order: LOOP_REDESIGN.md → VISION.md → this → VISUAL_STYLE.md.

## The test every invention must pass

A system earns its place only if it is *of the loop*: it must consume or produce **flow** (cargo moving on routes), be **legible on the map** (not on a separate screen), and get **better with player skill** (a tuned network beats a sloppy one at it). The old Research Lab failed all three — abstract points, a separate screen, zero interaction with routing. That failure pattern is the demolition criterion for everything else.

---

## 1. THE UPLINK — research is a flow problem *(replaces the Research Lab; implemented 2026-06-11)*

The Research Lab dies: the screen, the tree, the points, the "first resource to 50" unlock, all of it.

**The fiction:** your probes are orphaned machines. Everything they "learn" is decoded from the galaxy itself — protocols recovered from the data your network hauls home, unscrambled by an Uplink dish you build and feed.

**The mechanic:**
- The **Uplink** is *crafted* (factory-first): built at your home hub from found materials (`RECIPES.uplink`).
- Research nodes become **protocols**. You select ONE to decode. The Uplink **streams stored data into it at a capped rate** (`UPLINK.DECODE_PER_MIN × level`). Progress = data actually consumed.
- **Research speed IS network throughput.** A starved data supply stalls decoding; a humming data route finishes protocols fast. The dashboard number the player tunes is now also their tech clock. (Pillar 1: the network is the factory — literally including the lab.)
- Deep protocols demand **catalysts** — artifacts and exotic minerals that only exist in outer rings, consumed when decoding starts. Research gates by *where you've dared to route*, not by points. (Pillar 3.)
- While decoding, the Uplink hub wears a slow data-blue rotating arc on the map — you can *see* your network thinking. (Pillar 2.)
- No separate screen. The Uplink panel is an overlay on the map; the network stays visible behind it.

**Protocol catalog v1** (all wired to live mechanics): Swift Carriage (probe speed), Deep Resonance (prospecting pulse radius), Cargo Lattice (probe cargo cap), Extraction Harmonics (+yield per deposit pass), Harvest Lattice (unlocks collector modules), Universal Lattice (universal collector), Exotic Synthesis (unlocks Probethium synthesis), Remnant Protocols (deep Remnant trade). The dead collection-rarity ladder (auto_*/rarity_*/type-tier nodes) is deleted, not remapped.

## 2. THE FOUNDRY — transformation you can watch *(replaces Mining Stations; implemented 2026-06-11)*

"Mining Station" dies as a concept — mining belongs to deposits now. The building recasts as the **Foundry**: the first true *processor* in the network.

- A Foundry **consumes a flow** (mineral beads in) and **emits a different flow** (alloy beads out) at a fixed conversion rate. Bead chains visibly change color through the building — the conveyor-in-space grammar's processor ports (VISUAL_STYLE §"Material flow", step 3).
- Rate-matching is the game: a Foundry starved of input idles visibly; one whose output isn't hauled away backs up and stalls. Both states are diagnosable at a glance.
- Alloy is the recipe currency for tier-2+ logistics (hub upgrades, Sentinels later). Shuttles recast as **freighters** working hub↔Foundry legs.
- Absorbs the PROBE_NETWORKS §5 refinery plan; two-stage cap stands. MiningManager's demand-side rate logic survives as implementation guts only.

**As built (2026-06-11):** `src/FoundrySystem.js` — `gameState.foundry`, `RECIPES.foundry/freighter/foundryLevel`, `GAME_CONSTANTS.FOUNDRY` (5:1 ratio, 20 min/min per level, 100-in/25-out buffers). Freighters auto-loop minerals-out/alloy-home with typed bead pulses (`freighter:cargoDelivered`); processor body renders input/output ports + rotating vane (speed ∝ uptime). Alloy gates `intakeBay[3]`. Probethium's only source is now exotic synthesis. Legacy mining saves dissolve into a full materials refund. Tests: `tests/foundry.spec.js` (12).

## 3. SOLAR DRIFT — the galaxy has weather *(new invention)*

A slow, persistent **vector field** drifts across the galaxy (Direction B's best idea, absorbed as a layer). Probes riding the drift move faster; probes fighting it move slower.

- Route *orientation* becomes a real decision: the same two deposits can be served by a with-the-current loop or an against-it loop with measurably different throughput.
- Rendered as faint streamlines breathing across the void — ambient, beautiful, and *informative* (calm surface, constant motion).
- The field is fixed per save-seed (not shifting — the game never undoes your work), but differs by region, so each ring asks a fresh routing question.

## 4. RESONANCE — elegance is yield *(new invention)*

Deposits of the same type within ~150px of each other **resonate** when a single route services them all in one loop: each gains a small extraction bonus, and the cluster glows in synchronized phase.

- Rewards drawing *good* routes over greedy point-to-point ones — multi-stop loop craft becomes visible skill.
- A resonating cluster pulses in unison: the player who routes elegantly literally gets a more beautiful map. The aquarium is the scoreboard.

## 5. THE CARRIER SIGNAL — the mothership compass *(new invention, story-mechanical)*

The Probetheus is out there. From ring 2 onward, charted **ancient-tech fragments** emit a faint directional shimmer toward the next one outward — a breadcrumb compass that only resolves while your network is *quiet* (no starved links, no queued docks).

- Ties the mothership endgame to network health: a tuned network literally hears farther.
- Story beats (Remnants, echoes) recast as carrier-signal milestones per ring.

## 6. PREMIUM CHROME — one visual language, everywhere

The in-game UI gets rebuilt to the Void Premium contract — no surviving cyan, no emoji-as-icons, no per-element inline style soup:

- **Tokens only:** every panel reads from the CSS variable set (`--void --rift --fire --fire-bright --signal --mist --danger` + `PALETTE.MATERIALS`). Generated HTML (UIManager / DetailsPanel / DarkMarketSystem) migrates to shared classes.
- **Panel grammar:** near-black glass (`rgba(7,6,11,0.92)`), 1px gold-at-14% borders, generous padding, small-caps mist labels over signal-white values, gold reserved for earned things. The Intake Bay section and the new Uplink panel are the reference implementations.
- **Type, not boxes:** hierarchy from size/weight/spacing, not nested borders.
- Screens die where possible: prefer map overlays (Uplink panel) over mode-switch screens. The map is the game; never hide it.

## 7. THE GUIDED MINUTE, SPOKEN PLAINLY — tutorial teaches the *machine*

The tutorial's job is no longer "click here" — it teaches the four numbers that run the game: deposit rate caps, round-trip time, intake rate, decode rate. Every step names the mechanic and the *why*, in two sentences max. Just-in-time steps fire on the first real event: first intake queue ("your hub is the bottleneck — this is what fixing looks like"), first Uplink decode, first saturated deposit.

---

## Demolition ledger (supersedes LOOP_REDESIGN audit where they conflict)

| Old system | Fate | Replaced by |
|---|---|---|
| Research Lab screen, tree, points, RP unlock modal, milestone-unlock logic | **DELETED 2026-06-11** | §1 The Uplink |
| Collection-rarity research ladder (auto_*/rarity_*/minerals_*/data_*/artifacts_*) | **DELETED 2026-06-11** | Harvest/Universal Lattice protocols |
| Mining Stations (name + role) | **DELETED 2026-06-11** | §2 The Foundry |
| Shuttles | **RECAST 2026-06-11** | Freighters (hub↔Foundry legs) |
| Equipment collectors-by-rarity | DEMOLISH with Foundry pass | Extractor modules crafted from materials |
| Inline-styled legacy panels (hub ops, equipment modal, Dark Market, intro title card) | RESTYLE | §6 Premium Chrome |
| Tutorial v2 (six terse steps) | EXPANDED 2026-06-11 | §7 descriptive pass + just-in-time bottleneck steps |
| OfflineManager signal-odds math | DEMOLISH | honest math over deposits × caps × throughput |
| Signal Storms (5× spawn) | DEMOLISH | temporary surface deposits + §3 drift gusts |

## Build order

1. **Uplink** *(done 2026-06-11 — UplinkSystem.js, protocol catalog, panel, save migration, tests)*
2. **Foundry** *(done 2026-06-11 — FoundrySystem.js, freighter recast, processor ports, alloy currency, save migration, tests)*
3. **Premium Chrome sweep** of all generated HTML (§6) — mechanical, parallelizable
4. **Solar Drift** field + streamline render + speed integration (§3)
5. **Resonance** clusters (§4) — small system, big charm
6. **Carrier Signal** + STORY.md rewrite against rings/mothership (§5)
