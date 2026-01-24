# Probetheus Changelog

All notable changes to this project will be documented in this file.

## [0.7.2] - 2026-01-23

### Added
- **Rarity Color Coding**: Planet descriptions now show rarity text in color (gray/green/blue/magenta/gold)
- **Rarity Display Tests**: New test file `tests/rarity-display.spec.js` with 3 tests

### Fixed
- **Smoke Tests**: Updated for current UI structure (16/25 tests now passing)
- **Tutorial Panel Blocking**: Tests now dismiss tutorial panel to prevent UI blocking
- **Test Selectors**: Updated to use `#mainMenuBtn`, `#deployFromHub`, `entity:selected` event

---

## [0.7.1] - 2025-01-XX (In Development)

### Added
- **Hub Shuttle Limit**: Hubs now support max 3 shuttles (upgradeable to 6 in future)
- **Future Tutorial Steps**: Outlined steps 7-11 for mining facility, research, and upgrades
- **Periodic Supply Check**: Mining stations check for resources every 2 seconds
- **Hub Upgrade Design**: Documented plans for shuttle capacity, probe capacity, and range upgrades

### Changed
- **Button Text**: Renamed "Recon Hub" → "Build Hub", "Mining Facility" → "Build Mining Facility"
- **Hub Placement**: Confirmed hubs can only be placed on outbound segments (not return journey)
- **Mining Placement**: Mining facilities respect same outbound-only rule as hubs
- **Tutorial Step Delay**: Increased to 1.5 seconds for better player feedback
- **Exploration Screen**: Now has solid black background and preserves resource bar visibility

### Fixed
- **Mining Station Stalls**: Shuttles now wake up when resources become available
- **Tutorial Auto-Advancing**: Steps 2, 4, 6 no longer skip automatically
- **Resource Bar**: Stays visible during and after tutorial completion
- **Screen Positioning**: Exploration/research screens don't override map screen styles
- **Signal Collection**: Proper cargo assignment to probes when collecting signals
- **Aspect Ratio**: Disabled 16:9 lock to fix UI panel positioning issues

---

## [0.7.0] - 2025-01-XX

### Added

#### Desktop Application
- **Electron Integration**: Native desktop app for Windows, Mac, and Linux
- **Steam-Ready Builds**: electron-builder configuration for distribution
- **Desktop Save System**: File-based saves using electron-store
- **Production Builds**: Create installers with `npm run build:electron`

#### Enhanced Save System  
- **StorageAdapter**: Universal storage interface for web and desktop
- **Async Save/Load**: All storage operations use async/await pattern
- **Multiple Save Slots**: 5 manual save slots with metadata (timestamp, resources, progress)
- **Auto-Save**: Automatic saves every 5 minutes and on quit
- **Save Metadata Display**: Shows date, time, probethium, sectors, research points
- **Offline Progress**: Calculates resource generation while away
- **Cross-Platform**: Seamlessly works in browser and Electron

#### Interactive Tutorial System
- **Step-Based Tutorials**: New tutorial manager with progressive steps
- **Action-Based Progression**: Waits for player to complete each action
- **Non-Blocking UI**: Sleek banner at top of screen (doesn't block gameplay)
- **Progress Tracking**: Shows "Step X of Y" indicator
- **Always Triggers**: Tutorial starts on every new game
- **Smooth Animations**: Subtle shimmer background, slide-in/out transitions
- **Tutorial Steps**:
  1. Deploy Your First Probe
  2. Deploy All Probes (fill starting hub to 5/5)

#### Intro Cutscene
- **Animated Introduction**: Space probe journey with particles
- **Skippable**: Skip button for returning players
- **One-Time Play**: Shows once per new game session
- **Smooth Transition**: Fades into tutorial and gameplay

### Changed

#### UI/UX Improvements
- **Tutorial Design**: Redesigned from centered modal to top banner
  - Reduced height: ~52px (was 600px)
  - Increased width: 90% screen width, max 1200px
  - Dark gradient background: `rgba(10,15,25) → rgba(5,10,20)`
  - Subtle cyan accents at low opacity
  - 8-second shimmer animation

- **Tutorial Content**: Simplified and streamlined
  - Removed verbose explanations
  - Focus on immediate actionable steps
  - Clear, concise messaging

#### Technical Improvements
- **Build System**: Added Vite for modern development workflow
- **Development Server**: Hot module reload for faster iteration
- **Module Loading**: Proper script loading order verification
- **Error Handling**: Comprehensive error logging and debugging tools

### Fixed
- **Save System**: Migrated from localStorage to async StorageAdapter
- **Duplicate Methods**: Removed duplicate `createSaveData()` in SaveManager
- **Async Issues**: Fixed all async/await patterns throughout codebase
- **Cutscene Storage**: Updated IntroCutscene to use StorageAdapter
- **Module Verification**: Fixed false positive "StorageAdapter not loaded" error
- **CSP Warnings**: Added Content Security Policy headers

### Technical Changes

#### New Files
- `electron/main.js` - Electron main process
- `electron/preload.js` - Secure IPC bridge
- `vite.config.js` - Vite configuration
- `src/StorageAdapter.js` - Universal storage interface
- `tests/tutorial-system.spec.js` - Tutorial tests
- `tests/storage-system.spec.js` - Storage tests
- `ELECTRON_MIGRATION.md` - Migration documentation

#### Modified Files
- `src/SaveManager.js` - All methods now async
- `src/GameController.js` - Auto-save uses StorageAdapter
- `src/TutorialManager.js` - Complete rewrite for step system
- `src/IntroCutscene.js` - Uses StorageAdapter
- `index.html` - Module loading verification
- `package.json` - New scripts for Electron and Vite

#### Save System Changes
- All `localStorage.getItem()` → `await storageAdapter.getItem()`
- All `localStorage.setItem()` → `await storageAdapter.setItem()`
- All `localStorage.removeItem()` → `await storageAdapter.removeItem()`
- Functions using storage → `async`
- ~41 localStorage calls migrated

### Documentation
- Updated README.md with v0.7.0 features
- Added Technical Documentation section
- Added Architecture overview
- Created ELECTRON_MIGRATION.md guide
- Added development workflow documentation

---

## [0.6.1] - Previous Version

### Features
- Recon Hub System with strategic placement
- Advanced Probe Management with patrol mode
- Signal Discovery & Collection system
- Cargo Management with capacity tracking
- Planet Exploration (Excavate/Exterminate/Expedition)
- Research Laboratory with 3 specialization trees
- Building & Construction system
- Equipment & Automation (auto-collectors)
- Infinite Sector System with probethium mining
- Save/Load system (localStorage-based)
- Offline progression calculation

---

## Migration Notes for Developers

### Breaking Changes
None - fully backward compatible with existing saves

### Save File Migration
- Web saves: Automatically work with StorageAdapter
- Electron: Saves migrated to file system on first run
- Format unchanged: JSON with same structure

### API Changes
```javascript
// OLD (synchronous)
const data = localStorage.getItem('key');
localStorage.setItem('key', value);

// NEW (asynchronous)
const data = await storageAdapter.getItem('key');
await storageAdapter.setItem('key', value);
```

### Testing Changes
- New test suites for tutorial and storage
- Run with: `npm test`
- Tests work in both web and Electron environments
