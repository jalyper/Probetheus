# Session Handoff — 2026-06-11 (evening, consolidated; supersedes the morning handoff)

Read order: `docs/design/REBUILD.md` → `LOOP_REDESIGN.md` → `VISION.md` → `VISUAL_STYLE.md` → **`docs/design/handoff/README.md`** (the Claude Design package — next session's primary work order). Everything in `docs/archive/` is dead. REBUILD.md outranks the LOOP_REDESIGN systems-audit verdicts where they conflict.

## Standing user directives

- **Sledgehammer mandate (2026-06-11):** "INVENT game mechanics more than refine… take a sledgehammer to everything and rebuild it from the ground up according to our new pillars." The invention slate + demolition ledger live in REBUILD.md.
- The loop outranks existing code; flow-watching is the earned side effect, never the goal.
- In-game UI must speak the start screen's language (user, this session) — that sweep is DONE; the deeper redesign is the handoff package below.

## What shipped this session (local main, force-pushed to origin)

1. **`d05d806` — The Uplink replaces the Research Lab** (REBUILD.md §1). Research is a flow problem: Uplink is crafted (`RECIPES.uplink`), streams stored data into ONE active protocol at `UPLINK.DECODE_PER_MIN_BASE(12) × level`, deep protocols charge ring catalysts once up front. State: `gameState.uplink {built, level, active, progress{}, paid:Set, decoded:Set}`; gate with `gameState.hasProtocol(id)`; catalog `window.PROTOCOLS` (7). Deleted: ResearchManager, research screen/tree/points/milestone-RP/unlock modal, the entire collection-rarity ladder (`getMaxCollectableRarity` now always 'legendary'). Equipment gates: typed collectors → `harvest_lattice`, universal → `universal_lattice`; synthesis → `exotic_synthesis`; Remnant deep trade → `remnant_protocols`. Shell `researchSpeed` bonus now multiplies `uplinkSystem.decodeRatePerMin()`. Legacy saves migrate on load (SaveManager). Tutorial rewritten descriptive-of-mechanics (REBUILD.md §7) + uplink tips. Tests: `tests/uplink.spec.js` (11); all old suites migrated off the dead API.
2. **`48bd06f` — Premium chrome sweep.** Every in-game surface tokenized to VISUAL_STYLE: intro title card now mirrors the start screen (thin signal-white PROBETHEUS + gold hairline + "The network is the factory"), tutorial panel/toasts de-neoned, all panels 1px hairline glass (no glow halos), DetailsPanel (~120 colors, ~40 emoji), UIManager (connector, slots, probe list, shell modal, alerts), Dark Market unified to one rift-violet accent. NO emoji and NO cyan remain in chrome.
3. **(this commit) — Cutscene reskin + design handoff vendored.** IntroCutscene canvas now uses the playfield grammar: void+rift nebula ground, mist stars, violet/signal mothership with gold thrust, breathing-core gold hub hexagons (ported from handoff `playfield.js`), rift-violet black-hole distortion. Claude Design package vendored at `docs/design/handoff/`.

Suite state: **199 green** (full run shows 198 + `mining-stall.spec.js` flaking under parallel workers; passes in isolation — run `--workers=4` and retry singles before trusting a red).

## NEXT SESSION: port the Claude Design handoff (`docs/design/handoff/`)

The bundle is a hi-fi HTML/CSS/JS prototype of the entire in-game UI + asset kit; its README is a precise work order with exact values, and its tokens already match shipped `styles.css`. **Do not ship the HTML — port into modules.** Suggested order:

1. **Icon kit** — port `handoff/icons.js` (27 thin-line glyphs, `window.icon(name,{size,color})`) into `src/` + script tag; replace remaining text glyphs (◇ ▸ ⏻ ⚙︎) across index.html/UIManager/DetailsPanel.
2. **HUD header bar** (README §1) — rebuild the resource bar to the 66px clustered design; KEEP existing element ids (`#minerals`, `#sectorInfo`, `#throughputValue`…) so tests survive.
3. **Hub Operations panel** (README §2) — merge detailsPanel hub view + probePanel into the single 312px surface (stat grid, Intake Bay block, text-first op rows with key chips, shell footer).
4. **Uplink panel refinements** (README §3) — stat tiles, state tags (DECODED/DECODING/AVAILABLE/LOCKED), data-blue glow bar; `UplinkSystem.renderPanel()` already structured for this.
5. **Playfield canvas** (README §8) — port `handoff/playfield.js` routines into the game renderer: breathing-core hubs + intake rings, route filament alpha ∝ load, deposit glyph shapes (FlowBeadSystem already does beads; align bead size/consume-glow), Uplink dish as orbiting arc, probe diamond + trail, void+nebula ground. Mind the two clocks: ambient `time` never pauses, `simTime` scales.
6. **Probe floater + tutorial card + toast specifics** (README §4–5), Dark Market modal interior (§6 — GameController renders its inner HTML; NPC accents already unified).

Then resume the REBUILD.md build order: **Foundry** (mining station demolition, §2) → Solar Drift → Resonance → Carrier Signal.

## Known issues / debts

- `Available: 3 | Deployed: -3` seen on hub panel — probe count math bug somewhere in DetailsPanel/hub stats; investigate.
- Black-hole rift glow reads very saturated at full-zoom finale (alpha 0.30 at radius×2); tune if it feels heavy.
- Default shell swatches still use legacy content colors (cyan Standard Hub chip) — shell CONTENT colors were deliberately kept; decide whether defaults should re-tint.
- Dev "Testing" panel visible (strip at M3); Dark Market purchase bug still open (`DARK_MARKET_BUG.md`); `nul` junk file at repo root; `.claude/settings.local.json` + `.planning/phases/` deletions remain uncommitted noise.
- OfflineManager still models the dead signal economy (REBUILD ledger: demolish → honest math).
- STORY.md still unwritten against rings/mothership.

## How to run / test

- Serve: `python -m http.server 8000` from repo root (`npm run dev` fails; vite not installed). Playwright config auto-starts/reuses it.
- Tests: `npx playwright test <specs> --project=chromium --workers=4`. Visual smoke: temp spec → start game → evaluate to skip cutscene/hide `titleOverlay`,`testPanel`,`tutorialPanel` → screenshot → Read PNG → delete spec.
- Useful: `window.game.timeScale = 0` freezes sim; drive `game.uplinkSystem.update(ms)` by hand; `game.depositSystem.update(0)` forces deposit gen; save keys `probetheus_save_slot_N` (2 slots), autosave `csog_save_auto`.
- Repo rules: Playwright tests for every feature; NO AI attribution in commits; commit via `git commit -F <file>` written with BOM-less UTF8 (`[System.IO.File]::WriteAllText` — `Out-File utf8` BOM corrupts the subject line). Beware PS5.1 `Get-Content/Set-Content` mangling UTF-8 (§/—/emoji) — use `[System.IO.File]` with explicit UTF8.

## Steam

Accepted Steam developer (2026-06-11). SDK v1.64 at `C:\Users\keato\repos\steamworks_sdk\sdk`; plan = `steamworks.js` npm against App ID 480, integrate at M3. Offline-ready (fonts + anime.js self-hosted; handoff fonts = same files as `public/fonts/`).

## Asset generation

Higgsfield MCP; prompts prepend VISUAL_STYLE.md §"Asset-generation prompt template"; nano_banana_pro, 16:9; approved art → `docs/design/concepts/`. `concepts/start-screen-reference.png` = the canonical style reference (also sent to Claude Design). The design-brief prompt used: `docs/design/CLAUDE_DESIGN_PROMPT.md`.
