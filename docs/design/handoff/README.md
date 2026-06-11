# Handoff: Probetheus In-Game UI ("Void Premium")

## Overview
This package is the full in-game UI + asset kit for **Probetheus**, designed to make the
running game feel like the shipped start screen "never ended." It covers the six chrome
surfaces (HUD header, Hub Operations, Uplink research, Probe detail floater, Tutorial/tip
chrome, Dark Market), a thin-line **iconography kit** that replaces every emoji, an
**in-world canvas** treatment (hexagon hubs, route filaments, cargo beads, deposits, Uplink
dish, probes), and a one-page **design spec** of tokens.

Everything derives from the existing contract in `docs/design/VISUAL_STYLE.md` and the shipped
`styles.css` — it is a *refinement and completion* of the current UI, not a new direction.

## About the Design Files
The files in this bundle are **design references created in HTML/CSS/JS** — high-fidelity
prototypes that show the intended look, motion, and behavior. They are **not** a drop-in
replacement for the game.

The task is to **recreate these designs inside the existing Probetheus codebase** — the
vanilla-JS / Electron app under `Probetheus/` (modules like `UIManager.js`, `DetailsPanel.js`,
`UplinkSystem.js`, `DarkMarketSystem.js`, the canvas renderer, and `styles.css`). Reuse the
established patterns: the EventBus, the `GameState`/`GameController` flow, the existing CSS
custom properties, and the `window.PALETTE` canvas tokens. The prototype intentionally mirrors
those names so the mapping is one-to-one. **Do not ship the HTML** — port the markup, CSS, and
canvas drawing routines into the corresponding modules.

The prototype's tokens are identical to the shipped ones, so most CSS can be moved across with
near-zero translation; the new work is structural (the redesigned HUD, the merged Hub
Operations panel) and the canvas drawing routines.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, motion, and interactions. Recreate
pixel-for-pixel using the codebase's existing tokens and module structure. Exact values are in
the **Design Tokens** section and throughout each screen description.

---

## Screens / Views

### 1. HUD Header Bar
- **Purpose:** Always-on top band: orientation + economy at a glance, plus time control.
- **Layout:** Single horizontal flex band, `height: 66px`, `padding: 0 22px`, full width.
  Background `linear-gradient(180deg, rgba(26,16,48,0.42) 0%, rgba(7,6,11,0.78) 70%, rgba(7,6,11,0) 100%)`,
  `border-bottom: 1px solid var(--line-soft)`, `backdrop-filter: blur(6px)`. Clusters separated by
  `1px × 30px` hairline dividers (`.hud-div`, `background: var(--line-soft)`, `margin: 0 20px`).
- **Clusters, left → right:**
  1. **Menu + Settings** — two 34px circular `.iconbtn` (1px `--line-soft` border, mist glyph; hover → gold border+glyph). Glyphs: `power`, `settings`.
  2. **Sector** — stacked: 9px/0.22em uppercase mist label "SECTOR"; 15px/0.12em signal value "Hearthfall" with an 11px mono mist coordinate "Balanced · [0, 0]".
  3. **Six resource readouts** (`.rd`, `gap: 22px`) — each is `[material glyph 16–17px] + [mono value 15px signal] over [8.5px/0.18em uppercase mist label]`. The four materials use their material colors on the glyph; **Probes** and **Hubs** are "built" readouts and tint the *value* gold (`.rd.built .rd-val { color: var(--fire) }`). Order: Minerals, Data, Artifacts, Exotic, Probes, Hubs.
  4. **Probethium score** (`.score`) — `spark` glyph in `--fire-bright`; value 19px mono `--fire-bright` with `text-shadow: 0 0 14px rgba(255,215,0,0.25)`; label "PROBETHIUM".
  5. **Flow / throughput** — `flow` glyph `--fire`; value 15px `--fire` with an 11px `--mat-data` "/min ↑" trend; label "FLOW".
  6. **Time controls** (`#time`, pushed right by a flex spacer) — text buttons `.tbn` (mono 12px, mist; `border-bottom` slides to gold). Pause toggles glyph `pause`↔`play` and turns `--fire-bright`. Scale buttons `1× / 2× / 4×`; active = gold text + gold bottom border.
- **States:** material glyph colors are constant; only earned/active values are gold. Pause = bright gold; active scale = gold.

### 2. Hub Operations Panel
- **Purpose:** The workhorse panel for the selected hub. Replaces/merges the current
  `detailsPanel` + `probePanel` hub views into one surface.
- **Layout:** `.panel` glass card, `top: 88px; left: 18px; width: 312px; padding: 18px 20px 16px`.
- **Components (top → bottom):**
  - **Header** — `hub` glyph (gold) + "HEARTHFALL · OPS" (12px/0.26em uppercase gold) + close `×`.
  - **Status row** — 6px gold dot with glow + "ONLINE" (11px/0.16em uppercase signal) + right-aligned mono "home hub".
  - **Stat grid** — 2×2, hairline-separated cells (`grid` with `gap: 1px` over a `--line-soft` background to fake dividers). Each cell: 8.5px/0.16em uppercase mist key + 14px mono signal value. Cells: Ready Probes `2 / 4`, Active Probes `6`, Mining Stations `3`, Shuttles `2`.
  - **Intake Bay block** (`.ho-block`, 1px `--line-soft`, radius 3px) — row: `foundry` glyph + "Intake Bay" (12px/0.1em signal) and right-aligned "Level 2" (10px mono gold). Rate line: 14px mono "16.0 deliveries / min" (unit in mist 10px). Capacity bar: 3px track `rgba(212,175,55,0.12)`, gold fill at 72%. Primary CTA `.cta`: "Upgrade to Level 3 · 300 M · 120 D · 8 X" with `upgrade` glyph.
  - **Operations** — section label (9px/0.2em uppercase mist) then text-first `.tbtn` rows, hairline-separated: Deploy Probe `[D]`, Build Hub `[B]`, Build Mining Station `[M]`, Build Shuttle `[S]`. Each: leading 16px glyph + label + right-aligned `.key` chip (mono 10px in a 1px `--line-soft` box). Hover: mist→signal, glyph→gold, gold underline scales in left→right, key chip → gold.
  - **Equipped-shell footer** — top hairline; 34px violet-bordered chip (`probe` glyph in `--violet`) + stacked "EQUIPPED SHELL" / "Void Walker" + right-aligned "Change" link (violet underline on hover).

### 3. Uplink (Research) Panel
- **Purpose:** Decode recovered protocols without leaving the map. One decodes at a time.
- **Layout:** `.panel` glass, `top: 88px; right: 18px; width: 344px; max-height: calc(100vh - 116px)`,
  internal column with scrolling list.
- **Components:**
  - Header `uplink` glyph + "UPLINK" + close `×`.
  - Intro paragraph (12px mist, 1.55 line-height).
  - Two stat tiles (`.up-stat`): "Decode Rate 24 u/min", "Data in Store 318" (value in `--mat-data`).
  - **Protocol list** — one `.proto` card each (1px `--line-soft`, radius 3px). Card = name (13px signal) + state tag, italic lore (11px mist), effect (11.5px signal), cost line (10px mono; data portion in `--mat-data`), footer.
    - **Decoded:** card `opacity: 0.5`, state "DECODED" gold, footer "N data streamed".
    - **Decoding (active):** `border-color: rgba(91,140,255,0.5)`; state "DECODING" in `--mat-data`; footer = 3px data-blue progress bar (`box-shadow: 0 0 8px rgba(91,140,255,0.5)`) + mono percent.
    - **Available:** state "AVAILABLE" mist; footer = cost + `Decode` button (1px box; hover → gold). Disabled while any protocol is decoding.
    - **Locked:** `opacity: 0.55`, state = `lock` glyph + "LOCKED"; footer notes the prerequisite.
  - **Catalog (exact):** Swift Carriage (40 data, done) · Deep Resonance (60, done) · Harvest Lattice (80 + 2 artifacts, decoding) · Extraction Harmonics (120 + 4 artifacts) · Universal Lattice (150 + 6 artifacts) · Exotic Synthesis (200 + 4 exotic) · Remnant Protocols (250 + 8 artifacts + 4 exotic, locked). Lore/effect strings are in `ui.js` `PROTOCOLS[]` and match `Probetheus/src/GameConstants.js` `window.PROTOCOLS`.

### 4. Probe Detail Floater + Connector
- **Purpose:** Small panel tethered to a selected probe on the canvas.
- **Layout:** `.panel` glass, `width: 236px; padding: 15px 16px`. Position is computed each frame:
  `floaterX = clamp(probeScreenX + 84, 360, uplinkLeft - width - 14)`,
  `floaterY = clamp(probeScreenY - height/2, 150, viewportH - height - 80)`.
- **Connector:** full-screen SVG (`#connector`, z-index 28). A `4 5` dashed gold line
  (`stroke: #D4AF37; stroke-opacity: 0.32`) from the probe's screen point to the floater's
  left edge (`y = floaterY + 30`), plus a 3.5px gold dot pinned on the probe. (The shipped game
  already has this exact connector in `UIManager.createConnectorLine()` — reuse it.)
- **Components:** badge (`probe` glyph) + "Probe Vetch-09" + mono "Patrolling · Loop" + close.
  Two toggles (`patrol`, `camera`) as custom pill switches (`.sw`; on = gold). Equipment row:
  two filled 40px slots (mineral/data collector glyphs in material color) + one locked dashed slot
  (`lock` glyph, `opacity: 0.4`). Cargo: "Cargo Hold · 62%" + two rows (glyph + name + 2px
  material-colored bar + mono amount).

### 5. Tutorial Card + Toast Tip
- **Tutorial card** (`#tutorial`): top-center, `top: 84px; transform: translateX(-50%); width: 430px;
  padding: 16px 20px`, glass. `spark` glyph + title (12px/0.2em uppercase gold) + right-aligned mono
  "Step 3 / 7". Body 13px/1.6 signal, 2 sentences. Footer = step dots (5px; active gold) + "Dismiss" link.
- **Toast tip** (`#toast`): right edge, vertically centered, `width: 248px`, glass with a single
  gold left border (`border-left: 1px solid var(--fire)`). `flow` glyph + "TIP" (9px/0.2em gold) +
  11.5px mist body (emphasis words in signal). **Behavior:** the toast yields to the Uplink panel —
  it is hidden whenever Uplink is open (both live on the right edge).

### 6. Dark Market Modal
- **Purpose:** The one surface allowed a second accent — a restrained **rift-violet** (`#B06BFF`)
  identity for the shady trader. Still glass, still hairline, no neon.
- **Layout:** scrim `rgba(7,6,11,0.86)` + `blur(3px)`; modal `width: 760px; max-height: calc(100vh - 64px)`,
  `background: linear-gradient(165deg, rgba(40,20,64,0.5) 0%, var(--panel) 55%)`,
  `border: 1px solid var(--violet-line)`, soft violet outer glow.
- **Components:** NPC header = 64px striped portrait placeholder (violet) + eyebrow
  "ENCRYPTED CHANNEL · SIGNAL DECAYING" + name (24px/0.12em signal) + italic theme line. Italic
  greeting with a violet left rule. "SHELL COSMETICS" 2-col grid of `.mk-item` (swatch + name +
  italic desc + gold-spark price + violet "ACQUIRE"). "SPECIAL CACHE" full-width `.mk-special`.
  NPC data (Keth-Varn, Whisperer, Mira-Sol, Archivist, Null) matches `DarkMarketSystem.js` `NPC_INVENTORY`.

### 7. Iconography Kit
- 27 thin-line glyphs, **24×24 viewBox, 1.25px stroke, round caps/joins, `fill: none`** except
  node cores (`fill: currentColor`). Rendered via `window.icon(name, {size, stroke, color})`. All
  use `currentColor` so they inherit gold/mist from context. Full source in `icons.js`; sheet in
  `Probetheus — Icon Kit.html`. These replace the emoji still present in the prototype era
  (⚙︎ ⏻ ◇ etc.) across `index.html` and the JS modules.

### 8. In-World Canvas
- Procedural, no sprites. Drawing routines in `playfield.js` (`Playfield` class) — port into the
  game's canvas renderer:
  - **Hubs:** gold hexagon stroke (`--line` at 0.55–0.9 alpha, breathing), thin inner intake ring,
    a filled gold **breathing core** (2–4px, 0.7s pulse, soft glow). Home hub adds the **Uplink dish**:
    a small arc + feed dot orbiting the hub, rotation speed ∝ decoding.
  - **Routes:** hairline `--line` strokes, alpha scales with load factor.
  - **Cargo beads:** 2.4px rounded beads riding each filament, **count ∝ throughput** (spacing ~30
    world units), colored by material; a bead brightens + glows as it reaches the hub (dock consume).
  - **Deposits:** per-material thin glyph (rhombus / arcs / triangle / star) with a slow 0.9s pulse.
  - **Probes:** small `--signal` diamond + violet-white trail gradient; selected probe gets a gold
    breathing selection ring.
  - **Ground:** `--void` + a rift-violet radial gradient rising from the camera-facing sector; two
    parallax star tiers, breathing alpha.
  - **Clocks:** `time` (ambient — drift/breathing, never pauses) vs `simTime` (beads/probes — scales
    with the time controls; pause sets `timeScale = 0`).

---

## Interactions & Behavior
- **Time controls:** click or keys `Space` (pause), `1`/`2`/`3` (→ 1×/2×/4×). Sets `playfield.timeScale`.
- **Uplink decode:** clicking `Decode` on an affordable, available protocol starts it (becomes the
  single active decode at 0%); the data-blue bar fills over time; on 100% it flips to DECODED and
  re-enables the others. Only one active at a time.
- **Hub Ops upgrade:** the Intake CTA shows "Upgrading…" then settles to "Level 3", rate 24.0/min,
  capacity bar drops to 48%, and the button reads "Intake Bay at maximum" (disabled).
- **Panel toggles:** dock "Uplink" button shows/hides the panel (and hides/show the toast). Each
  panel's `×` collapses it. Floater pill toggles flip on/off. Open states persist to
  `localStorage['probetheus_ui_v1']`.
- **Dark Market:** dock "Dark Market" (with a pulsing violet pip) opens the modal; scrim click or `×` closes.
- **Connector tracking:** runs every frame via `requestAnimationFrame`; repositions floater + redraws
  the connector to the moving probe.
- **Transitions:** all `cubic-bezier(0.4, 0, 0.2, 1)`, 240–400ms. Button underlines `scaleX` from left.
  Respect `prefers-reduced-motion` (drift slows, sparks fade in place).

## State Management
- `playfield.timeScale` (0 | 1 | 2 | 4); `playfield.decoding` (drives dish speed).
- Uplink: a single `activeId` + per-protocol `{ done, active, progress }`. Store the affordability
  check against current resources (`data`, `artifacts`, `exoticMinerals`).
- Panel visibility flags persisted in `localStorage['probetheus_ui_v1']`
  (`{ uplink, tutorial, floater }`). In the real game these map onto `GameState.ui`.
- In the codebase, drive all of this through the existing `EventBus` events
  (`ui:update`, `ui:probeSelected`, `probe:statusChanged`, etc.) rather than the prototype's
  local listeners.

## Design Tokens
```
--void        #07060B    page / canvas ground (never pure black)
--rift        #1A1030    nebula depth (gradients only)
--fire        #D4AF37    the gold — active states, hubs, routes, scores
--fire-bright #FFD700    Probethium, legendaries (used small)
--signal      #E8E4F0    primary text + probe bodies
--mist        #8B84A3    secondary text, inactive UI
--line        rgba(212,175,55,0.28)   hairline gold border
--line-soft   rgba(212,175,55,0.14)   softer hairline
--danger      #E0524D    loss / warning only
--panel       rgba(10,8,18,0.92)      glass panel ground (+ blur 6px)
--violet      #B06BFF    Dark Market second accent only
--violet-line rgba(176,107,255,0.45)
materials     minerals #C97B4A · data #5B8CFF · artifacts #B06BFF · exotic #E8E4F0
rarity        common #8B84A3 · uncommon #7FD6C2 · rare #5B8CFF · epic #B06BFF · legendary #FFD700

Type:   Jost (200/300/400/500) display+UI · IBM Plex Mono (300/400) data
        Display: uppercase, letter-spacing 0.22–0.42em. UI: sentence case, 0.04–0.12em.
        No bold display weights, ever. Fallbacks: Century Gothic/Segoe UI · Courier New.
Radius: 4px max (panels) · 3px (controls/cells) · 2px (bars). Never above 4px.
Border: 1px hairline only. Panel padding ≥ 16px.
Motion: ease cubic-bezier(0.4,0,0.2,1) · UI 240–400ms · ambient minutes/cycle.
Proportion: ~85% void/rift · ~10% text · ≤5% gold.
```
Full spec with live samples + a copy-paste `:root` block: **Probetheus — Design Spec.html**.

## Assets
- **Fonts (self-hosted, OFL):** `fonts/Jost-200/300/400/500.woff2`, `fonts/IBMPlexMono-300/400.woff2`.
  These are the same files the game already ships in `Probetheus/public/fonts/` — reference those.
- **Icons:** all procedural SVG in `icons.js` — no image assets.
- **Canvas art:** all procedural in `playfield.js` — no sprites.
- No raster images, no emoji.

## Files (in this bundle)
- `Probetheus — Game UI.html` — the living scene (all six surfaces over the animated playfield).
- `Probetheus — Icon Kit.html` — the glyph sheet.
- `Probetheus — Design Spec.html` — tokens / type / form / motion + CSS block.
- `styles.css` — all UI CSS (tokens + every surface), aligned to the shipped `styles.css`.
- `icons.js` — `window.icon()` + the 27-glyph library.
- `playfield.js` — `Playfield` canvas engine (hubs, filaments, beads, deposits, dish, probes).
- `ui.js` — wiring: icon injection, protocol list, market, connector tracking, time controls,
  decode loop, panel toggles + persistence, keyboard hints.
- `fonts/` — the six woff2 faces.

## Reference (in the existing repo)
`docs/design/VISUAL_STYLE.md` · `styles.css` · `src/UIManager.js` · `src/DetailsPanel.js` ·
`src/UplinkSystem.js` · `src/DarkMarketSystem.js` · `src/GameConstants.js` (`PROTOCOLS`, `RECIPES`,
`PALETTE`) · `index.html` (current header + panel markup to replace).
```
