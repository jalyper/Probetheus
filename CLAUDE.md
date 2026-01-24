# Claude Code Development Notes

## Git Commit Rules
- **NEVER** include Claude, AI, or "Generated with Claude Code" in commit messages
- **NEVER** include "Co-Authored-By: Claude" in commit messages
- Keep commit messages professional and focused on the actual changes
- Use conventional commit format when appropriate
- Focus on WHAT changed and WHY, not WHO made the changes

## Development Commands
- `npm start` - Start the development server
- `npm test` - Run Playwright tests
- `npm run test:save` - Run save system tests only

## Current Priority Tasks
1. ~~Update automated integration tests~~ ✓ PARTIAL (16/25 tests passing - smoke, rarity, tutorial tests fixed)
2. ~~Add color coding for rarity text in planet descriptions~~ ✓ DONE
3. Finish building out the tutorial system
4. Add ability to turn off tips/tutorial from main menu
5. Implement new signal distribution system

### Remaining Test Fixes Needed
- save-system.spec.js: Some tests expect old save slot UI structure
- storage-system.spec.js: Load/metadata tests need save slot selector updates

## Testing Notes
- GitHub workflow now only runs tests on PRs, not main branch pushes
- Tests may need updates after UI changes (planet legend repositioning, tutorial fixes)
- Save system tests should remain stable but verify after major changes