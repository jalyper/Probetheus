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
1. Update automated integration tests to reflect recent UI/tutorial changes
2. Add color coding for rarity text in planet descriptions
3. Finish building out the tutorial system  
4. Add ability to turn off tips/tutorial from main menu
5. Implement new signal distribution system

## Testing Notes
- GitHub workflow now only runs tests on PRs, not main branch pushes
- Tests may need updates after UI changes (planet legend repositioning, tutorial fixes)
- Save system tests should remain stable but verify after major changes