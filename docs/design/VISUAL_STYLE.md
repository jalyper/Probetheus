# Visual Style — "Void Premium"

**Last updated:** 2026-06-11
**Status:** Authoritative. Every CSS token, canvas color, and asset-generation prompt derives from this document. Chosen by playtest decision 2026-06-10 from three generated directions (`docs/design/concepts/`).

## The idea

The void is the canvas; **gold is the stolen fire.** In the Prometheus saga, Probethium is fire taken from the void — so gold is never decoration. It marks exactly one thing across the whole game: **what the player has earned and built.** Your hubs, your routes, your combos, your legendaries, your Probethium — gold. Everything else recedes into a near-black violet depth that makes the network read like a constellation you authored.

The feel target (VISION.md pillar 2): **relaxing and stimulating.** A player should zoom out and watch their network the way they'd watch an aquarium — slow drift, traveling sparks, soft chimes. Premium restraint in the chrome; gentle life in the playfield.

## Palette tokens

| Token | Hex | Use |
|---|---|---|
| `--void` | `#07060B` | Page/canvas ground. Never pure black — always this violet-tinted near-black |
| `--rift` | `#1A1030` | Nebula depth. Only as soft radial/linear gradients rising out of `--void`, never flat fill |
| `--fire` | `#D4AF37` | The gold. UI accent: active states, underlines, network lines, hubs, scores |
| `--fire-bright` | `#FFD700` | Gameplay gold: legendary signals, combo callouts, Probethium. Brighter sibling, used small |
| `--signal` | `#E8E4F0` | Primary text + probe bodies. Off-white with a violet whisper |
| `--mist` | `#8B84A3` | Secondary text, captions, inactive UI, common signals |
| `--line` | `rgba(212,175,55,0.28)` | Hairline gold — borders, route lines, constellation strokes |
| `--danger` | `#E0524D` | Warnings/destruction only. Soft red, used sparingly, never flashing |

Rule of proportion: a typical screen is ~85% void/rift, ~10% signal/mist text, **≤5% gold**. Gold stays precious by staying scarce.

## Rarity recalibration

Old palette (gray/green/blue/magenta/gold) is retired. New ramp lives inside the world:

| Rarity | Hex | Note |
|---|---|---|
| Common | `#8B84A3` (mist) | quiet, plentiful |
| Uncommon | `#7FD6C2` | soft teal |
| Rare | `#5B8CFF` | clear blue |
| Epic | `#B06BFF` | violet — harmonizes with the rift |
| Legendary | `#FFD700` (fire-bright) | the only gameplay object that shares the prestige color — that's the point |

## Typography

| Role | Face | Usage |
|---|---|---|
| Display | **Jost** 200/300 (bundled woff2, OFL) | Titles, screen headers. Uppercase, letter-spacing 0.30–0.45em. The thinness + tracking IS the brand |
| UI | **Jost** 300/400 | Buttons, labels, body. Sentence case, letter-spacing 0.04–0.12em |
| Data | **IBM Plex Mono** 300/400 (bundled woff2, OFL) | Numbers, rates, coordinates, the dashboard. Anywhere a value ticks |

Fallbacks: `'Century Gothic', 'Segoe UI', sans-serif` / `'Courier New', monospace`. Fonts self-hosted in `public/fonts/` — no network dependency (Electron/Steam offline).

Type rules: no bold display weights, ever — emphasis comes from gold, spacing, or size. No emoji in chrome (the prototype's 🚀⚙️💎 era is over; replace with thin line glyphs or text).

## Motion language

Motion is the visible signature of an efficient network (pillar 2) — earned by building well, never staged for its own sake. The grammar:

- **Drift, don't snap.** Ambient elements (constellation, nebula, stars) move at minutes-per-cycle speeds. Easing: `cubic-bezier(0.4, 0, 0.2, 1)` everywhere; UI transitions 240–400ms.
- **Sparks travel.** The signature motif: a small gold point moving along a hairline route — start menu constellation, in-game cargo deliveries, shuttle runs. Whenever value moves through the network, a spark shows it.
- **Pulses breathe.** Radar rings, hub glows, and selection states ease in-out on 2–4s cycles, like breathing — never strobe, never blink.
- **Nothing shakes by default.** Screen shake reserved for the rare biggest beats (synthesis, portal). Respect `prefers-reduced-motion`: ambient drift slows, sparks become fades, shake disabled.

## Chrome rules (panels, buttons, HUD)

- Panels: `rgba(10, 8, 18, 0.92)` ground, 1px `--line` border, **no border-radius above 4px**, generous padding (16px+), backdrop-blur ok.
- Buttons: text-first. Default state is quiet (mist text, no box); hover brightens to signal + a thin gold underline slides in; active/selected = gold text. Boxes/borders only for destructive or primary CTAs.
- The header is a single thin band; data values in Plex Mono, labels in Jost smallcaps-style (uppercase, 10px, 0.15em tracking, mist).
- One accent per surface: a panel may use gold for its active element only.

## Playfield rendering (canvas)

- Ground: `--void` with a barely-there rift gradient toward the sector the camera faces; stars in mist at 20–50% alpha, two parallax tiers.
- **The network is gold:** hubs are thin gold hexagon strokes with a breathing glow; routes are hairline `--line` strokes; delivered cargo runs along routes as `--fire` sparks. The player's built network literally becomes the start menu's constellation.
- Probes: small `--signal` bodies, soft violet-white trails (`rgba(232,228,240,0.35)` fading), rotation-aligned.
- Signals: rarity ramp above, soft outer glow, gentle 2s breathing pulse.
- Hazards: asteroid fields in desaturated mist-brown strokes; nebulae as rift-violet haze; danger states use `--danger` lines, thin and steady (no flashing).
- Selection/lock: gold breathing ring.

## Material flow — the conveyor in space (added 2026-06-11)

The Factorio payoff we're after: *watching ore ride a belt into a processor and come out as something better.* Probetheus does it without belts — sleek, weightless, light-based. This is the visual language for the deposit loop (LOOP_REDESIGN.md); cargo sparks were v1 of this grammar, this section is where it goes.

### The grammar

- **Filaments, not belts.** A worked route renders as a hairline gold filament (existing `--line` strokes). No rollers, no slats — the route IS the conveyor.
- **Beads, not items.** Cargo in transit renders as small rounded beads riding the filament, evenly spaced, **density proportional to throughput** — a starved route carries one lonely bead; a humming route carries a glittering chain. This is the belt-read: you glance at a line and *see* its load factor.
- **Beads are type-colored** (the deposit palette): copper `#C97B4A` minerals, blue `#5B8CFF` data, violet `#B06BFF` artifacts, signal-white `#E8E4F0` exotics. A mixed-haul route reads as a striped chain — instantly diagnostic.
- **The dock consumes.** At the hub, beads queue into the intake ring and are swallowed one at a time, each consumption a small gold pulse + the header counter ticking. When intake saturates, the bead chain visibly *backs up* along the filament — the Factorio belt-jam, in light. (The "N waiting" queue is the current v1 of this.)
- **Processors transform.** Stations/refineries have one **input port** (beads enter, port glows the input color) and one **output port** (beads exit in the output color). One rotating interior element per processor — a single thin-stroke ring or vane, 2–4s period, speed ∝ uptime. In = raw color, out = refined color: the transformation is literally visible at the machine's edge.
- **Restraint rules still apply:** beads are 2–3px, glow only on consumption beats, everything eases — a loaded network should read like a jeweled circuit, not a particle storm. Bead pooling caps per route (≈12 visible; beyond that the filament itself brightens instead).

### Build order (procedural canvas, no sprite assets needed)

1. **Flow beads v1** — replace event-based cargo sparks with continuous bead chains on actively-worked routes, density from StatsManager per-route throughput.
2. **Dock consumption** — bead swallow animation + back-up when intake queues (replaces/augments "N waiting" text).
3. **Processor ports** — input/output bead handoff at stations + the rotating element, colored by recipe.
4. **Key art** — Higgsfield concepts via the template below for store/marketing once the in-game version proves the look ("a sleek gold network of light-filaments carrying jeweled cargo beads through the void, a thin-stroke station consuming them").

## Asset-generation prompt template (Higgsfield)

Every generated asset prepends this style block:

> *"Void Premium game art style: near-black (#07060B) background with subtle deep-violet nebula gradient, thin elegant gold (#D4AF37) line-art, generous negative space, museum-quality restraint, soft off-white accents, premium minimal indie game aesthetic, no clutter, 16:9."*

Then the subject. Key art, biome backdrops, landmark illustrations, Remnant portraits (portraits may add one violet rim-light), Steam capsules — all through this template. Concepts and approved assets live in `docs/design/concepts/`.

## Don'ts

- No cyan. The prototype's `#0ff` era is fully retired — teal exists only as the uncommon rarity.
- No gradients on text, no glow on body text, no more than one gold element competing per view.
- No emoji in UI chrome. No klaxons, no flashing, no red except `--danger` moments.
- No flat black and no pure white — everything breathes slightly violet.
