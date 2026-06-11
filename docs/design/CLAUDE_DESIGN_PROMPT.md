# Claude Design brief — Probetheus in-game UI & asset kit

> Paste everything below the line into Claude design, attaching `start-screen-reference.png` (the start screen — this is the visual north star).

---

I'm building **Probetheus**, a relaxing-but-stimulating factory game about routing probe networks in deep space — Factorio's satisfaction stripped to its essence, beautiful enough to watch like an aquarium. The attached image is our shipped start screen and it IS the visual language: I need the entire in-game UI and asset kit designed to feel like that screen never ended.

## The aesthetic contract (from the attached start screen)

- **The void is the canvas; gold is the stolen fire.** Near-black violet space (`#07060B` ground, `#1A1030` depth). Gold (`#D4AF37`, bright `#FFD700`) marks exactly one thing: what the player has earned and built — their hubs, routes, scores. It is never decoration.
- **Type does the work, not boxes.** Jost (or a close geometric sans) at weight 300/400 only — no bold, ever. Wide letterspacing (0.1–0.4em) for titles and labels, sentence case for body. Emphasis comes from gold, spacing, or size. Data/numbers in IBM Plex Mono.
- **Supporting palette:** signal-white `#E8E4F0` for primary text, mist `#8B84A3` for secondary/captions, hairline gold `rgba(212,175,55,0.28)` for lines and borders, danger red `#E0524D` reserved for true loss moments. Material identities: copper `#C97B4A` minerals, clear blue `#5B8CFF` data, rift violet `#B06BFF` artifacts, shimmer white `#E8E4F0` exotics.
- **Chrome rules:** panels are near-black glass `rgba(10,8,18,0.92)` with 1px hairline gold borders, radius ≤4px, generous padding. No neon, no cyan, no glow halos, no emoji, no gradients-as-decoration. One gold accent per surface. Buttons are text-first: quiet mist by default, a thin gold underline slides in on hover, gold text when active; boxes only for primary/destructive CTAs.
- **Motion grammar:** drift, don't snap — ambient elements move at minutes-per-cycle speeds, UI transitions 240–400ms on `cubic-bezier(0.4, 0, 0.2, 1)`. Calm surface, constant gentle motion; never frantic, never static.

## What I need designed (in-game, all to the above language)

1. **HUD header bar** — sector name, six resource readouts (typed by the material colors), Probethium score, throughput (`X/min`), time controls (pause/1x/2x/4x). Currently a cramped strip; make it breathe like the start screen.
2. **Hub Operations panel** — the workhorse side panel: hub status, Intake Bay level + deliveries/min with an upgrade CTA, deploy/build/shuttle actions with keyboard hints, equipped-shell footer. This is the panel players live in.
3. **The Uplink panel** — our research system: a list of decodable "protocols," each with a name, one italic lore line, an effect line, a data-stream cost, and a thin data-blue progress bar on the active decode. One decodes at a time. Map stays visible behind it.
4. **Probe detail floater** — small panel tethered to a selected probe by a hairline connector line: status, patrol/camera toggles, 2+1 equipment slot glyphs, cargo readout.
5. **Tutorial & tip chrome** — a top-center instruction card (title + 2-sentence mechanic explanation + step counter) and small right-edge toast tips. Quiet, premium, zero klaxon energy.
6. **Dark Market modal** — the one surface allowed a second accent: a restrained rift-violet (`#B06BFF`) identity for this shady NPC trader screen. Still glass, still hairline, still no neon.
7. **Iconography kit** — thin-line glyphs (1–1.5px stroke, gold or mist) to replace emoji everywhere: probe, hub (hexagon), shuttle, mining/foundry, deposit types (4 materials), Uplink dish, equipment slot, lock, settings, pause/play/speed. Geometric, constellation-adjacent, reading at 12–20px.
8. **In-world canvas assets** — gold hexagon hub strokes with a breathing core, hairline route filaments, 2–3px cargo beads (type-colored, chain density = throughput), deposit glyphs per material with a slow pulse when charted, an Uplink dish arc that rotates while decoding. The player's network should literally look like the start screen's constellation, authored by them.

## Deliverables

Mockups for the five panel surfaces (1280×720 in-context), the icon kit as a single sheet, and a one-page spec of spacing/type scale tokens I can transcribe into CSS variables. Desktop-first (Steam/Electron).

## Hard constraints

No emoji. No cyan. No bold weights. No border-radius above 4px. Gold only for earned/active things. Every surface must sit on the violet-black void without fighting the playfield — the game behind the UI is the hero.
