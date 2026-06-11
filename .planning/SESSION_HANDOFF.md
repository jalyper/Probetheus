# Session Handoff — 2026-06-11 (end of session, consolidated)

Read this, then `docs/design/LOOP_REDESIGN.md` → `VISION.md` → `VISUAL_STYLE.md`. Those three are authoritative. CORE_LOOP.md's "loop restated" section and the old ONBOARDING.md flow are superseded by LOOP_REDESIGN.md. Everything in `docs/archive/` is dead.

## What this game is now

**The core loop was redesigned and prototyped this session.** Playtest verdict killed the old one ("nothing makes a well-routed network beat a sloppy one"); root cause was structural — signals spawned FROM the probe, so the map had no spatial structure and routing couldn't matter.

The new loop (Direction A, user-chosen, + user's framing):
- **Deposits** are persistent places in the world. **Prospect** (probe pulses raise pings at undiscovered deposits; collecting a ping charts it) → **Tap** (probes extract per route pass, rate-capped per deposit) → **Route** (throughput = cargo ÷ round-trip) → **Tune** (hub intake processes 8/min × level; saturated docks queue probes visibly) → **Push** (richness scales with distance).
- **Factory-first:** logistics items/upgrades are MADE from found materials (`window.RECIPES` + `RecipeUtils` in GameConstants). Intake Bay tier 3 costs exotic minerals, which only exist in ring-2+ deposits.
- **Concentric rings (Valheim-style):** difficulty/exoticness scale with distance from home in any direction.
- **Mothership endgame:** explore outward to find/build ancient tech that locates and reunites the probes with the Probetheus. STORY.md not yet rewritten against this.

Standing user directives: **no mechanic is sacred — the loop outranks existing code**; flow-watching is the *earned side effect* of an efficient network, never the goal (VISION pillar 2 reworded accordingly; tagline is "The network is the factory").

## Session commits (local main, NOT pushed; ahead 12 / behind 40 vs origin — user chose "playtest first, merge later")

1. `8e83f31` — Void Premium phase 2: start screen + living constellation (`StartConstellation.js`), full canvas repaint (`window.PALETTE`, new rarity ramp, gold network), cargo sparks (`CargoSparkSystem.js`), inline-chrome sweep (no cyan, no emoji), anime.js bundled locally (Steam offline).
2. `5fdff86` — loop prototype: `DepositSystem.js` (deterministic per-sector gen, starter cluster at home, ring scaling, exotic deposits ring 2+, token-bucket rate caps), prospecting pings replace probe-spawned loot, extraction on passes, hub intake gate + visible "N waiting" queue, save persistence of charted flags.
3. `c386404` — tutorial deleted/rewritten (select hub → scout → chart → tap → deliver → release; advances on `deposit:discovered`/`deposit:extracted`); soundtrack = five LoFi WAVs (MusicManager, stale-selection fallback); **systems audit table added to LOOP_REDESIGN.md** (KEEP/RECAST/CUT verdict for every old system — read it before touching anything old).
4. `e389fee` — Intake Bay upgrade UI on hub panel (level/rate/recipe/shortfall messages; `hub.intakeLevel` persists), RECIPES table, VISUAL_STYLE.md §"Material flow — the conveyor in space".

Tests: 34/34 green across `deposit-loop`, `intake-recipes`, `cargo-sparks`, `redesign-m1`, `tutorial-system` (chromium). ~50 OLD test failures (signal-rewards, synthesis, progression-gates…) predate everything and encode the dead economy — audit says DELETE them, don't fix.

## Next session order of attack

1. ~~**Flow beads v1**~~ DONE 2026-06-11 — `FlowBeadSystem.js` replaces CargoSparkSystem: continuous type-colored bead chains per route (density ∝ rolling 90s per-route throughput, 1 bead floor / 12 cap / over-cap filament brighten), striped by cargo mix, sim-time march; shuttle legs keep one-shot pulses; consumption rings at hub on delivery. Material colors centralized in `PALETTE.MATERIALS`. Tests: `tests/flow-beads.spec.js` (11). **Next in this track: step 2 dock consumption** (bead swallow + visible back-up when intake queues), then step 3 processor ports — spec in VISUAL_STYLE.md §"Material flow".
2. ~~**CUT** the exploration screen + dead test suites~~ DONE 2026-06-11 — removed `explore()`/planet path from GameController, exploreScreen+rewardModal markup/CSS; deleted 10 dead-economy suites (signal-rewards, exclusive-signals, signal-visuals, statistical-validation, happy-path-integration, progression-gates, probethium-synthesis, synthesis-system, rarity-display, discovery-reveal). Full suite green (208/208 minus deletions; note: heavy parallel full-suite runs can flake ~10% on worker contention — rerun before trusting a red).
3. Migrate legacy build costs (probe 25M etc. hardcoded in ProbeManager/DetailsPanel buttons) to read RECIPES.
4. Equipment/research recast per audit (extractor modules; automation-spine research).
5. Signal Storm recast (temporary surface deposits) + OfflineManager honest-math rewrite.
6. STORY.md rewrite against rings/mothership.
7. Playtest first-ten-minutes; tune intake rate (8/min), starter richness, extraction cooldown (2.5s), ring multipliers.

## Known issues / debts

- Hub panel + all UIManager/DetailsPanel/ResearchManager/DarkMarketSystem generated HTML still carries old inline colors + emoji (the Intake Bay section is the only tokenized part). IntroCutscene title card still cyan.
- Dark Market purchase button bug still open (`DARK_MARKET_BUG.md`).
- Dev "Testing" panel visible (strip at M3 "Steam hygiene").
- `nul` file at repo root is junk; `.claude/settings.local.json` + old `.planning/phases/` deletions are uncommitted pre-existing noise.

## How to run / test

- Serve: `python -m http.server 8000` from repo root (vite not installed; `npm run dev` fails). `http://localhost:8000`.
- Tests: `npx playwright test <specs> --project=chromium`. Visual smoke: temp spec → start game → page.evaluate to skip cutscene/hide `titleOverlay`,`testPanel`,`tutorialPanel` → screenshot → Read PNG → delete spec.
- Repo rules: Playwright tests for every feature; NO AI attribution in commits; `git commit -F file` for messages.
- Useful test incantations: `window.game.timeScale = 0` to freeze sim; `game.depositSystem.update(0)` to force deposit gen; pulse gate needs `probe.outboundWaypointsCount` set; save key is `probetheus_save_slot_N` (autosave is `csog_save_auto`).

## Steam (user is an accepted Steam developer, 2026-06-11)

SDK v1.64 at `C:\Users\keato\repos\steamworks_sdk\sdk`. Plan: `steamworks.js` npm (not the C++ SDK), develop against App ID 480, SteamPipe ContentBuilder uploads, overlay unreliable in Electron. Integrate at M3, not before. Offline-readiness done (fonts + anime.js self-hosted, CSP locked to 'self').

## Asset generation

Higgsfield MCP; every prompt prepends VISUAL_STYLE.md §"Asset-generation prompt template". Model nano_banana_pro, 16:9. Download CloudFront URLs directly. Approved art → `docs/design/concepts/`. Hold key-art generation until flow-beads prove the look in-game.
