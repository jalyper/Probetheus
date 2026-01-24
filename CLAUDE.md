# Claude Code Development Notes

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
1. ~~Update automated integration tests~~ ✓ PARTIAL (16/25 tests passing)
2. ~~Add color coding for rarity text in planet descriptions~~ ✓ DONE
3. Finish building out the tutorial system
4. Add ability to turn off tips/tutorial from main menu
5. Implement new signal distribution system

## Recent Changes (Jan 2026)

### Rarity Color Coding
- Added `getRarityColor(rarity)` method in `src/GameController.js:1492`
- Planet descriptions now show colored rarity text in exploration screen
- Colors: Common=#aaaaaa, Uncommon=#00ff00, Rare=#0088ff, Epic=#ff00ff, Legendary=#ffd700

### Test Suite Updates
- Fixed smoke tests to work with current UI structure
- Added tutorial panel dismissal in tests (was blocking UI interactions)
- Updated selectors: `#mainMenuBtn`, `#deployFromHub`, `entity:selected` event
- New test file: `tests/rarity-display.spec.js`

### Remaining Test Fixes Needed
- `save-system.spec.js`: 5 tests failing - expect old save slot UI structure
- `storage-system.spec.js`: 3 tests failing - need save slot selector updates

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
