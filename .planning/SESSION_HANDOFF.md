# Session Handoff — 2026-06-11

Read this first, then `docs/design/README.md` → `VISION.md` → `VISUAL_STYLE.md`. Those docs are authoritative; everything in `docs/archive/` and the old `.planning/ROADMAP.md` is superseded.

## Where the project stands

The game was redesigned this session around three pillars: **the network is the factory · flow you can watch (relaxing AND stimulating — lofi energy, "arcade" only means simpler-than-Factorio) · the frontier always pulls.** Treat everything older as prototype — the user said so explicitly.

Committed on local `main` (NOT pushed):
1. `411650a` — design doc rewrite (`docs/design/`, nine docs incl. DEFENSE.md "The Hollow" and EA_ROADMAP.md M1–M6)
2. `e45f57d` — M1 "Feels Alive" implementation: probe speed 2.5x, time controls (1x/2x/4x/pause, keys 1/2/3/Space), sim-time signal aging, Probethium rebalance (5 exotic → 1P, station probethiumOutput split, wall-clock trickle removed), procedural `SfxManager`, `ComboSystem`, `StatsManager` throughput dashboard, 5-step "Guided Minute" tutorial + just-in-time tips. Tests: `tests/redesign-m1.spec.js` + rewritten `tutorial-system.spec.js` — all pass.
3. `3079604` — **Void Premium visual identity, foundation only**: `VISUAL_STYLE.md` contract, bundled fonts (Jost + IBM Plex Mono in `public/fonts/`), `styles.css` fully rebuilt on CSS tokens, signal lifetimes relaxed to 2.5–4s, vision/tone retune.

## ⚠ In-flight: the visual redesign is HALF DONE

`styles.css` is fully Void Premium (tokens, fonts, chrome) but the **markup and canvas still render the old prototype look**. The game runs fine in this mixed state. Next session continues here:

1. **Rebuild the start screen** (`index.html` lines ~16–44). The CSS classes already exist and are styled: `.start-title`, `.start-rule`, `.start-tagline`, `.start-menu`, `.start-menu-btn` (+`.primary`), `.start-footnote`, `#constellationCanvas`. Replace the inline-styled markup with these; **must keep** ids `newGameBtn`, `continueGameBtn`, `loadGameBtn`, an `h1` whose text contains "Probetheus" (tests + handlers in index.html ~700–800 depend on them). Then write the **living constellation** canvas animation (signature element — see VISUAL_STYLE.md "Motion language": drifting gold hairline network, a spark occasionally traveling a line; respect prefers-reduced-motion). Reference concept: `docs/design/concepts/direction-C-void-premium.png`.
2. **Canvas repaint** — add `PALETTE` to `src/GameConstants.js` from the VISUAL_STYLE tokens, then swap canvas literals: rarity colors (GameController `getRarityColor` ~line 1540 and `rarityColors` in `renderSignals`; ProbeManager rarity logic), hubs green→thin gold hex strokes, route/connector lines→hairline gold `rgba(212,175,55,0.28)`, probe trail default `#00ffff`→violet-white `rgba(232,228,240,0.35)` (in ProbeManager/GameController/CosmeticManager fallbacks), sector boundaries, radar pulses, selection rings→gold breathing. **Add cargo sparks**: small gold points traveling along routes on delivery — this is the "fall in love with watching the flow" feature the user asked for.
3. **index.html inline chrome sweep** — header spans, panel frames (`detailsHeader` etc.), cutscene skip button still carry inline `#0ff` styling; convert to tokens/classes. The interior HTML that `UIManager.js`/`DetailsPanel.js` generate is a large follow-up pass of its own.
4. **No emoji in chrome** (VISUAL_STYLE don'ts) — start screen/buttons/test-panel still have 🚀⚙️ etc.
5. Verify visually (screenshot drive — see pattern below) + run `npx playwright test tests/redesign-m1.spec.js tests/tutorial-system.spec.js --project=chromium`.

## Open decisions / known issues

- **Remote divergence (user knows, chose "playtest first, merge later"):** local main is ahead 5 / **behind 40** vs `origin/main` (`jalyper/Probetheus`). The remote has v1.4 "Probe Specialization" (Feb 8) touching every src file. Merging is its own focused task; specialization content fits the new design (probe roles, PROBE_NETWORKS.md automation ladder).
- ~50 pre-existing test failures (progression-gates, synthesis-system, signal-rewards, etc.) existed at baseline before the redesign — verified via worktree diff. Not regressions; don't chase them as such.
- Dark Market purchase button bug still open (`DARK_MARKET_BUG.md`) — M1 leftover, plus guaranteed-first-encounter scripted spawn (STORY.md).
- Dev "Testing" panel still visible (strip for production — EA_ROADMAP M3).
- `nul` file at repo root is junk Windows artifact; ignore.

## How to run / test

- Serve: `python -m http.server 8000` from repo root (vite isn't installed; `npm run dev` fails). Open `http://localhost:8000`.
- Tests: `npx playwright test --project=chromium` (local `@playwright/test` now installed; chromium downloaded). JSON results pattern: set `$env:PLAYWRIGHT_JSON_OUTPUT_NAME` then parse — webserver log noise drowns line reporter.
- Visual smoke: drive with a temp spec in `tests/` (page.evaluate to start game/skip cutscene/deploy), screenshot, Read the PNG. Delete the temp spec after.
- Repo CLAUDE.md rules: Playwright tests required for new features; **no Claude/AI attribution in commits**; PowerShell quoting — use `git commit -F <file>` for messages with quotes.

## Asset generation

Higgsfield MCP for all art. Every prompt prepends the style block in VISUAL_STYLE.md §"Asset-generation prompt template". Model: nano_banana_pro (server used nano_banana_2), 16:9. Download CloudFront URLs directly (not browser-accessible for user); approved art → `docs/design/concepts/`. The `frontend-design` skill is installed project-locally (`.claude/skills/frontend-design/`) — invoke it before UI design work.

## After the repaint (EA_ROADMAP order)

M2: bottleneck visuals (red supply lines — same hairline language), copy-route, probe wear, sector completion, **viewport culling** (none exists; needed before big saves). M3: Nebula biome, landmarks, Codex, echo 1, Signal Storm, Steam hygiene. User decision style: pick a recommended default and move; ask only on real forks (art direction was chosen via generated concept images — that worked well).
