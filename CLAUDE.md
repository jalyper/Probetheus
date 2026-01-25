# Claude Code Development Notes

## Development Standards
- **ALWAYS write tests for new features and bug fixes** - No exceptions. Every new feature or fix must have corresponding test coverage in Playwright.

## Git Commit Rules
- **NEVER** include Claude, AI, or "Generated with Claude Code" in commit messages
- **NEVER** include "Co-Authored-By: Claude" in commit messages
- Keep commit messages professional and focused on the actual changes
- Use conventional commit format when appropriate
- Focus on WHAT changed and WHY, not WHO made the changes

## Development Commands
- `npm start` - Start the development server
- `npm test` - Run Playwright tests (requires `npx playwright install` first)
- `npm run test:save` - Run save system tests only
- `npx playwright test --project=chromium` - Run tests on Chromium only (faster)

## Current Priority Tasks
1. ~~Update automated integration tests~~ ✓ DONE (25/25 tests passing)
2. ~~Add color coding for rarity text in planet descriptions~~ ✓ DONE
3. ~~Finish building out the tutorial system~~ ✓ DONE (see `.planning/tutorial-system-prd.md`)
4. ~~Add ability to turn off tips/tutorial from main menu~~ ✓ DONE
5. Implement new signal distribution system

### Tutorial System Sprint (Jan 2026) - COMPLETE
See `.planning/tutorial-system-prd.md` for full PRD.

- [x] **REQ-1**: Block hub placement on probe return path + test ✓
- [x] **REQ-2**: Dynamic Hub Operations button states + test ✓
- [x] **REQ-3**: Delay probetheum gathering until mining station + test ✓
- [x] **REQ-4**: Probe equipment tutorial after Collection research + test ✓
- [x] **REQ-5**: Intro animation plays on each New Game + test ✓

### Equipment Slots System (Jan 2026) - IN PROGRESS
See `.planning/equipment-slots-prd.md` for full PRD.

- [x] **REQ-1**: Equipment slot constraint (2 slots, upgradeable to 3) - base implementation done
- [x] **REQ-2**: Individual resource collectors (mineral, data, artifact) - implemented
- [x] **REQ-3**: Universal Collector (1 slot, collects all) - implemented
- [x] **REQ-4**: Equipment UI updates with slot visualization - implemented
- [ ] **REQ-5**: Upgrade to 3 slots via research (not yet implemented)

### The Remnants Story System (Jan 2026) - IN PROGRESS
See `.planning/remnants-story-prd.md` for full PRD.

**Phase 1: Foundation** - COMPLETE
- [x] Create RemnantManager.js - basic spawning and movement
- [x] Implement glow/fade animation for remnant ship
- [x] Add click detection and interaction trigger
- [x] Create DialogueSystem.js - basic UI container with typewriter effect
- [x] Design hooded figure portrait (placeholder with glowing eyes)
- [x] Tests: `tests/remnant-system.spec.js` (14 tests passing)

**Phase 2**: Dialogue polish, story content (see PRD)
**Phase 3-5**: Story fragments, endgame, polish (see PRD)

## Recent Changes (Jan 2026)

### Probe Detail Panel Enhancements
- Enhanced `probeDetailPanel` (the compact floating panel) with new features:
  - **Equipment slot visualization**: 2 available slots + 1 greyed/locked slot shown as boxes
  - **Floating position**: Panel constrained to 100px to the right of the selected probe
  - **Animated connector line**: SVG line with pulsing circle connects panel top to probe
  - Slot boxes show equipment icons when filled, "+" icons when empty, lock for unavailable slot
- Updated `src/UIManager.js`:
  - Added `createConnectorLine()` - SVG connector with animated pulse circle
  - Added `updateConnectorLine(probe)` - updates line position between panel and probe
  - Added `startProbeTracking(probe)` / `stopProbeTracking()` - continuous position updates
  - Added `updateEquipmentSlots(probe)` - renders visual slot boxes
  - Added `updateProbeDetailPanelPosition(probe)` - positions panel 100px right of probe
- `DetailsPanel.js` now skips probes (handled by `probeDetailPanel` via UIManager)

### Mining Station Fix
- Fixed bug where mining wouldn't start with exactly 100 minerals and 50 data
- Issue was floating point precision in resource comparison
- Added tolerance (0.001) to `checkStationHasRequirements()` in `MiningManager.js`
- Now uses `currentAmount < required - TOLERANCE` instead of strict `< required`

### Tutorial System Improvements
- Research Lab tutorial now only triggers when player actually opens the Research Lab
  - Changed from triggering on `research:unlocked` event
  - Now triggers on `research:showTree` event (when player clicks Enter Lab or Research Lab button)
  - Updated tutorial message to be contextual (player is already in the lab)
- Renamed "Mining Facility" to "Mining Station" in UI (index.html button)

### The Remnants Story System - Phase 1 Foundation
- New `src/RemnantManager.js` - NPC spawning, movement, and interaction
  - Five unique Remnant types: Keth-Varn, Whisperer, Mira-Sol, Archivist, Null
  - Spawn conditions: 2+ explored sectors, 10+ lifetime Probetheum, cooldown
  - Glow/fade animation with particle trail
  - Click detection and event emission
  - Story state management (fragments, encounters)
- New `src/DialogueSystem.js` - RPG-style dialogue UI
  - Bottom-center dialogue container with portrait
  - Typewriter text effect with punctuation pauses
  - Animated hooded figure portrait with glowing eyes
  - Eye color varies by NPC (cyan, white, amber, red, void-black)
  - Continue/Trade/Close buttons
- Events: `remnant:spawned`, `remnant:despawned`, `remnant:interacted`, `dialogue:started`, `dialogue:ended`
- Tests: `tests/remnant-system.spec.js` (14 tests)

### Type-Specific Rarity Upgrades
- Each individual collector now has its own rarity upgrade path:
  - Mineral Collector: `minerals_uncommon` -> `minerals_rare` -> `minerals_epic` -> `minerals_legendary`
  - Data Collector: `data_uncommon` -> `data_rare` -> `data_epic` -> `data_legendary`
  - Artifact Collector: `artifacts_uncommon` -> `artifacts_rare` -> `artifacts_epic` -> `artifacts_legendary`
- Universal Collector still has separate rarity progression: `rarity_uncommon` -> `rarity_rare` -> `rarity_epic` -> `rarity_legendary`
- Individual collectors can now collect higher rarity signals with the right research
- Updated `getMaxCollectableRarity(resourceType)` to check type-specific research
- Research tree layout adjusted to accommodate new nodes
- Location: `src/GameState.js` (research nodes), `src/ProbeManager.js` (collection logic)
- New tests in `tests/equipment-slots.spec.js`

### Exploration Screen Clarification
- Added resource yield info to exploration buttons in `index.html`:
  - Excavate: "**Yields Minerals.**"
  - Exterminate: "**Yields Data.**"
  - Expedition: "**Yields Artifacts.**"

### Mining Operations Tutorial (REQ-10)
- Added three new tutorial steps to TutorialManager.js:
  1. `build_mining_station` - Triggers after player has 2+ hubs
  2. `build_shuttle` - Triggers after first mining station built
  3. `collect_probetheum` - Triggers after first shuttle built
- Added trigger methods: `triggerMiningStationTutorial()`, `triggerShuttleTutorial()`, `triggerProbetheumTutorial()`
- Listens to `mining:stationBuilt`, `mining:shuttleBuilt`, `probetheum:collected` events
- New test file: `tests/mining-tutorial.spec.js` (9 tests)

### Equipment Slots System Implementation
- New `src/EquipmentSystem.js` with EQUIPMENT_TYPES and slot management
- Equipment now stored as array (`probe.equipment = []`) instead of single object
- Default 2 equipment slots per probe (`maxEquipmentSlots: 2`)
- Four equipment types: mineral_collector, data_collector, artifact_collector, universal_collector
- Equipment modal shows slot indicators: `[X] [X] [ ]`
- Updated files:
  - `src/EquipmentSystem.js` (new file)
  - `src/ProbeManager.js` (array-based equipment, auto-collection)
  - `src/DetailsPanel.js` (equipment modal with slots, equip/remove buttons)
  - `src/UIManager.js` (updated equipment display)
  - `src/SaveManager.js` (equipment array serialization, migration)
  - `src/GameController.js` (starting probes with equipment array)
  - `index.html` (added EquipmentSystem.js script)
- New test file: `tests/equipment-slots.spec.js` (11 tests)

### Tutorial Panel Positioning Fix
- Tutorial panel now centered at TOP MIDDLE of screen
- Position: `left: 50%` with `transform: translateX(-50%)`
- Width: `90%` with `max-width: 600px`
- z-index: 999 (below probe details panel at 1000)
- Animation preserves centering with combined transforms
- Location: `src/TutorialManager.js:704-714`

### Tutorial System Enhancements
- REQ-1: Hub placement restricted to outbound path only (`src/BuildingSystem.js:108-116`)
- REQ-2: Dynamic button states via `ui:update` event (`src/GameState.js:updateResources`)
- REQ-3: Probetheum gating until mining station (`src/GameState.js:calculateProbethium`)
- REQ-4: Equipment tutorial step (`src/TutorialManager.js:install_probe_equipment`)
- REQ-5: Intro animation replay (`index.html:startNewGame` clears cutsceneSeen)
- REQ-6: Research screen "Return to Galaxy" button moved to left (`index.html`)
- REQ-7: Equipment tutorial now only triggers for specific auto-collector research (`auto_minerals`, `auto_data`, `auto_artifacts`)
- REQ-8: Research Lab tutorial step added (`src/TutorialManager.js:research_lab_unlocked`)
- REQ-9: Manage Equipment button and modal on probe panel (`src/DetailsPanel.js`)
  - Shows equipment section with slot usage
  - Modal for equipping/removing equipment
  - Supports mineral, data, artifact, and universal collectors
- REQ-10: Mining tutorial COMPLETE - three steps: `build_mining_station`, `build_shuttle`, `collect_probetheum`
- REQ-11: Equipment modal UX improvements
  - Background click closes modal (standard behavior)
  - Probe details panel auto-updates after equipment change
  - "Manage Equipment" button added to old probeDetailPanel (`index.html`, `UIManager.js`)
- Updated tutorial text: "Click on your Hub to deploy two more probes"
- New test file: `tests/tutorial-enhancements.spec.js` (16 tests)
- Equipment icons display in probe detail panel above Manage Equipment button
- Fixed `updateEquipmentDisplay()` in UIManager.js to handle missing equipment DOM elements gracefully

### Tutorial Toggle Setting
- Added "Tutorial Tips" toggle in Settings modal under new "Gameplay" section
- Preference persists via localStorage (`csog_tutorial_disabled`)
- Disabling tutorials immediately hides the tutorial panel
- Re-enabling tutorials allows them to show again
- Location: `index.html` (UI), `src/TutorialManager.js` (logic), `src/GameController.js` (event handler)

### Rarity Color Coding
- Added `getRarityColor(rarity)` method in `src/GameController.js:1492`
- Planet descriptions now show colored rarity text in exploration screen
- Colors: Common=#aaaaaa, Uncommon=#00ff00, Rare=#0088ff, Epic=#ff00ff, Legendary=#ffd700

### Test Suite Updates
- Fixed smoke tests to work with current UI structure
- Added tutorial panel dismissal in tests (was blocking UI interactions)
- Updated selectors: `#mainMenuBtn`, `#deployFromHub`, `entity:selected` event
- New test file: `tests/rarity-display.spec.js`

### Save System Test Fixes
- Fixed localStorage key names: `csog_save_*` (was incorrectly using `probetheus_save_*`)
- Changed UI-based save/load to programmatic `saveManager.saveGame()/loadGame()` for reliability
- Fixed resource mutation: use direct assignment `resources.minerals = X` vs `updateResources()`
- Fixed complete gameplay cycle test: start new game before accessing saveManager after reload
- All 25 tests now passing

## Testing Notes
- Run `npx playwright install` if browsers are missing
- GitHub workflow only runs tests on PRs, not main branch pushes
- Tutorial panel blocks UI interactions - tests must dismiss it first
- Use `page.evaluate()` to select entities and emit events for testing

## Key UI Patterns for Tests
```javascript
// Dismiss tutorial panel
await page.evaluate(() => {
  const tutorialPanel = document.getElementById('tutorialPanel');
  if (tutorialPanel) tutorialPanel.style.display = 'none';
});

// Select a hub and open details panel
await page.evaluate(() => {
  const hub = window.game.gameState.entities.reconHubs[0];
  hub.selected = true;
  window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
});
```

## Architecture Notes
- Game uses EventBus pattern for component communication
- DetailsPanel listens to `entity:selected` event to show entity info
- Tutorial system uses TutorialManager with step-based progression
- Save system uses StorageAdapter for Electron/web compatibility
