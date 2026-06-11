# Probetheus
**Version 0.7.1-dev**

> **⚠ Direction update (2026-06-10):** the game's design direction was rewritten around three pillars — *the network is the factory, arcade tempo, the frontier always pulls*. The authoritative design docs now live in [`docs/design/`](docs/design/README.md) (start with `VISION.md`). Roadmap/idea sections below in this README are historical; the current plan is [`docs/design/EA_ROADMAP.md`](docs/design/EA_ROADMAP.md). Superseded design docs were moved to `docs/archive/`.

An arcade-paced factory game about building probe networks in deep space — deploy probes from Recon Hubs to discover signals, explore planets, and collect resources across an infinite procedural galaxy. Features advanced probe management, cargo delivery systems, research trees, automated collection mechanics, and Probethium mining operations.

**Now available as desktop app with Electron!**

## Quick Start

### Web Version (Development)
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev              # Vite dev server (web)
   # or
   npm run legacy:server    # Node.js server (original)
   ```
   
3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Desktop Version (Electron)
1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the desktop app:
   ```bash
   npm start               # Runs Electron app
   ```

3. Build for distribution (Steam-ready):
   ```bash
   npm run build:electron  # Creates installers in release/ folder
   ```

## New in v0.7.1

### ⚖️ Balance Changes
- **Shuttle Limit**: Hubs now support max 3 shuttles (upgradeable to 6 in future updates)
- **Building Placement**: Hubs and mining facilities can only be placed on outbound probe routes (not return journey)

### 🔧 Mining Improvements
- **Auto-Recovery**: Mining stations automatically retry resource delivery when supplies arrive
- **Periodic Checks**: System checks every 2 seconds for available resources
- **Better Feedback**: Clear messages about shuttle capacity and station supply status

### 🎓 Tutorial Polish
- **Proper Step Gating**: Steps 2, 4, 6 now wait for player actions before advancing
- **Better Timing**: 1.5s delay between steps for clearer feedback
- **Fixed Auto-Skip**: Tutorial no longer races ahead of player
- **Resource Bar**: Stays visible throughout and after tutorial

### 🎨 UI Improvements
- **Clearer Button Labels**: "Build Hub" and "Build Mining Facility" (was "Recon Hub", "Mining Facility")
- **Exploration Screen**: Solid black background, proper z-index, preserves resource bar
- **Screen Transitions**: Fixed style bleeding between map/explore/research screens

### 📋 Future Roadmap
- **Hub Upgrades** (v0.8.0):
  - Shuttle capacity: 3 → 6 shuttles
  - Probe capacity: 5 → 8 probes  
  - Exploration range: +50% probe travel distance
- **Extended Tutorial**: Steps 7-11 for mining, research, and upgrades
- See `DESIGN_NOTES.md` for detailed upgrade plans

---

## New in v0.7.0

### 🎮 Desktop App (Electron)
- Native desktop application for Windows, Mac, and Linux
- Steam-ready builds with electron-builder
- Persistent file-based save system
- No browser required

### 💾 Enhanced Save System
- **Cross-Platform Storage**: Works in both web (localStorage) and desktop (electron-store)
- **Automatic Storage Adapter**: Seamlessly switches between storage backends
- **Multiple Save Slots**: 5 manual save slots with metadata
- **Auto-Save**: Saves every 5 minutes and on quit
- **Save Metadata**: Shows timestamp, resources, and progress
- **Offline Progress**: Calculates resource gain while away

### 🎓 Interactive Tutorial System
- **Step-Based Progression**: Guides new players through core mechanics
- **Non-Blocking Design**: Sleek banner at top of screen
- **Progress Tracking**: Shows current step (e.g., "Step 1 of 2")
- **Action-Based**: Waits for player to complete each step
- **Always Available**: Triggers on every new game
- **Subtle Animations**: Dark theme with gentle shimmer effect

### 🎬 Intro Cutscene
- Animated space probe journey
- Skippable with button
- Plays once per new game session
- Smooth transition to gameplay

## Current Features

### Recon Hub System
- **Hub-Based Deployment**: All probes must be deployed from Recon Hubs
- **Limited Range**: Probes can only travel 1/3 of sector width from their hub
- **Hub Management**: Each hub stores up to 5 probes independently
- **Strategic Placement**: Build new hubs (100 Minerals) to expand exploration range
- **Visual Design**: Hexagonal green icons with animated pulses

### Advanced Probe Management
- **Hub-Specific Deployment**: Select a hub, then deploy probes within its range
- **Multi-waypoint Navigation**: Deploy probes with up to 3 waypoints for zig-zag exploration patterns
- **Variable Speed**: Probe speed automatically adjusts based on journey distance
- **Probe Construction**: Build new probes for 25 Minerals when destroyed or needed
- **Real-Time Status Tracking**: Probe list automatically updates status (Ready/Exploring/Returning)
- **Detailed Probe Panel**: Click any probe to view detailed information with equipment slots
- **Camera Tracking**: Lock camera to follow selected probes with continuous position updates
- **Patrol Mode**: Set probes to automatically loop their routes for continuous exploration
- **Visual Feedback**: 
  - Dashed deployment line from hub to mouse cursor
  - Range circles show hub coverage
  - Pulsing probe animation with radar rings
  - Real-time distance validation
  - Connected detail panels with dotted lines

### Signal Discovery & Collection
- **Direct Click Collection**: Click directly on signals to collect them (no box selection needed)
- **Cargo System**: Resources are stored as cargo on the nearest active probe
- **Delayed Rewards**: Resources only added to inventory when probe returns to hub
- **Rarity Tiers**: Common, Uncommon, Rare, Epic, Legendary
- **Dynamic Spawning**: 30% chance to spawn signals near probe pulses
- **Time-Limited**: Signals disappear after a set duration based on rarity

### Planet Exploration
- **Three Exploration Modes**:
  - **Excavate**: Mine for minerals
  - **Exterminate**: Hunt creatures for data
  - **Expedition**: Search ruins for artifacts
- **Procedural Planets**: 8 unique planet types with descriptions
- **Dynamic Visuals**: Planets rendered with randomized colors and surface features

### Research System
- **Research Laboratory**: Unlocks automatically when you earn your first research point
- **Three Specialization Trees**: Collection, Probe Technology, and Alien Technology
- **Milestone-Based Points**: Earn research points at 50/200/500/1000 of each resource type
- **Sector Discovery Points**: Gain research points for discovering new sectors
- **Auto-Unlock Modal**: Automatically opens research lab when unlocked
- **Visual Research Tree**: Three distinct trees with proper spacing and dividers
- **Universal Collection**: Ultimate automation that collects all resource types
- **Rarity Progression**: Unlock higher signal rarities for auto-collection
- **Fixed Info Panel**: Research descriptions and buttons always visible at bottom

### Building & Construction System
- **Path-Based Building**: Construct facilities along active probe routes
- **Building Types**:
  - **Mining Outposts**: Generate passive exotic minerals (50M, 20D)
  - **Mining Facilities**: Advanced resource extraction (75M, 30D) 
  - **Recon Hubs**: Expand probe deployment range (100M)
- **Building Preview**: Visual preview system shows structure placement before confirming
- **Right-Click Cancellation**: Cancel building mode or probe deployment with right-click
- **Structure Levels**: Buildings can be upgraded and enhanced over time

### Equipment & Automation
- **Equipment Slots**: Each probe has equipment slots visible in detail panel
- **Auto-Collectors**: Research-unlocked equipment for automatic signal collection
- **Idle Mechanics**: Probes continue working and collecting while away from game

### Infinite Sector System
- **Procedural Generation**: Unlimited galaxy exploration with unique sector types
- **Sector Bonuses**: Each sector provides different resource multipliers
- **Mining Outposts**: Build passive income generators in discovered sectors
- **Minimap Navigation**: Visual sector overview with click-to-navigate
- **Balanced Sectors**: Standardized 1920x1080 sector dimensions for consistent gameplay

### Probethium Mining System (NEW v0.6.0)
- **Mining Stations**: Build specialized facilities to extract Probethium cryptocurrency
  - **Basic Station**: Requires 100 minerals + 50 data to operate (30-second cycles)
  - **Advanced Station**: Requires 150 minerals + 100 data + 75 artifacts (30-second cycles)
  - **Quantum Station**: Ultimate mining facility with exotic mineral requirements
- **Resource Shuttles**: Automated logistics system
  - Deploy shuttles to deliver resources from hubs to mining stations
  - 20 resource capacity per trip requires multiple deliveries
  - Smart return-to-hub behavior when stations are full
  - Visual cargo indicators show loading/delivering/returning status
- **Station Management**:
  - Maximum 3 mining stations per hub
  - Continuous resource consumption during mining operations
  - Visual progress bars show resource levels and mining status
  - Color-coded glow effects: cyan (good), orange (medium), red (low resources)
- **Deletion & Refunds**: Delete stations or shuttles for 50% resource refund

### Probe Visual System (NEW v0.6.0)
- **Complete Cosmetic Skins**: Purchase full probe skins with Probethium
  - Standard Explorer (default): Cyan energy signature design
  - Crimson Explorer (250 Probethium): Red body with gold-trimmed wings
- **Enhanced Probe Design**: 
  - Sleek spacecraft appearance with wings, antennas, and trail effects
  - Rotation aligned to travel direction
  - Proper rendering layers (probes appear above route lines)

### Resources
- **Probes**: Start with 3, consumed on deployment, returned after journey
- **Minerals**: Gathered through excavation and mining facilities
- **Data**: Collected from extermination missions and research
- **Artifacts**: Found during expeditions and special discoveries
- **Exotic Minerals**: Rare resources from mining outposts and advanced exploration
- **Probethium**: Cryptocurrency earned through mining operations (NEW)
- **Research Points**: Currency for unlocking new technologies

## Controls

### Hub Selection & Management
1. Click on any Recon Hub to select it (turns yellow when selected)
2. Selected hub info shows in header: "Hub: 3/5" (current/max probes)
3. Use "Build Probe" to add probes to selected hub (25 Minerals)
4. Use "Build Recon Hub" to place new hubs (100 Minerals)

### Probe Deployment & Management
1. Select a Recon Hub by clicking on it
2. Click "Deploy Probe" (only enabled when hub is selected and has probes)
3. Move mouse to see deployment line and range circle
4. Click to set first waypoint (must be within hub range)
5. Click to set second waypoint (optional)
6. Click to set third waypoint or right-click to deploy early
7. **Probe Tracking**: Click any probe in Active Probes list to view detailed panel
8. **Camera Lock**: Check "Lock Camera to Probe" for continuous tracking
9. **Patrol Mode**: Enable automatic route looping for continuous exploration

### Building & Construction Controls
1. **Select Building Mode**: Click probe in Active Probes, then select building type
2. **Preview Placement**: Move mouse along probe path to see building preview
3. **Confirm Building**: Click to place structure at desired location
4. **Cancel Building**: Right-click to exit building mode
5. **Resource Validation**: Building buttons grey out when resources insufficient

### Research Laboratory
1. **Access Research**: Click "Research Lab" button (appears when you earn first research point)
2. **Auto-Open**: Research lab automatically opens when first unlocked
3. **Navigate Trees**: Scroll through three specialization trees with visual dividers
4. **View Details**: Click nodes to see research details in fixed bottom panel
5. **Unlock Technology**: Click "Research" button when you have enough Research Points
6. **Equipment Management**: Equip unlocked auto-collectors in probe detail panels
7. **Milestone Tracking**: Earn points at 50/200/500/1000 of each resource type

### Navigation & Camera
- **Panning**: Click and drag to pan around the galaxy
- **Minimap Navigation**: Click minimap to jump to different sectors
- **Arrow Keys**: Alternative panning controls
- **Probe Focus**: Camera automatically centers on selected/tracked probes

### Resource Management
- **Button States**: All action buttons grey out when requirements aren't met
- **Real-time Validation**: Visual feedback prevents invalid actions
- **Cost Display**: Button text shows resource costs
- **Cargo Delivery**: Resources collected by probes only credited upon hub return
- **Auto-Collection**: Equipped probes automatically collect nearby signals

### Signal Collection
- **Direct Click**: Click directly on signals (colored pulses) to collect them
- **Probe Cargo**: Collected resources stored on nearest active probe
- **Delayed Rewards**: Resources added to inventory only when probe returns to hub
- **Auto-Collection**: Equip Auto-Collectors for automatic signal gathering
- **Rarity Recognition**: Different colors indicate signal value and rarity

### Planet Exploration
- Choose one of three exploration modes when visiting a planet
- Each mode yields different resources based on signal rarity

## Game Loop Ideas for Future Development

### Progression Systems

#### 1. **Probe Upgrades**
- **Speed Modules**: Increase probe travel speed
- **Scanner Range**: Larger radar pulse radius
- **Signal Magnetism**: Attract nearby signals
- **Multi-Probe**: Deploy multiple probes simultaneously
- **Auto-Return**: Probes automatically redeploy on optimal paths

#### 2. **Research Tree**
- Use Data to unlock new technologies:
  - **Deep Space Scanning**: Reveal distant signal clusters
  - **Quantum Navigation**: Teleport probes instantly
  - **Signal Prediction**: AI predicts signal spawn locations
  - **Wormhole Networks**: Create permanent fast-travel points

#### 3. **Base Building**
- **Space Station Hub**: Central command center
- **Mining Outposts**: Passive mineral generation on discovered planets
- **Research Labs**: Boost data collection efficiency
- **Artifact Museums**: Display collections, unlock bonuses
- **Probe Factories**: Automated probe production

#### 4. **Discovery Crafting**
- Combine resources to create:
  - **Star Maps**: Unlock new sectors
  - **Alien Translators**: Communicate with species for quests
  - **Portal Keys**: Access special dimensions
  - **Time Crystals**: Manipulate game speed

#### 5. **Prestige Mechanics**
- **Galaxy Reset**: Start fresh with permanent bonuses
- **Ancient Tech Points**: Unlock powerful passive abilities
- **Cosmic Knowledge**: Permanent resource multipliers
- **Quantum Echoes**: Start with ghost probes from previous runs

#### 6. **Events & Challenges**
- **Solar Storms**: Navigate hazardous areas for rare rewards
- **Alien Invasions**: Defend sectors using probe networks
- **Black Hole Events**: Risk probes for exponential rewards
- **Time Rifts**: Limited-time high-value signal spawns
- **Galactic Markets**: Trade resources with fluctuating prices

#### 7. **Collection Systems**
- **Alien Codex**: Catalog discovered species
- **Mineral Database**: Complete sets for bonuses
- **Artifact Gallery**: Display legendary finds
- **Planet Archives**: 100% exploration achievements
- **Signal Encyclopedia**: Track all signal types encountered

#### 8. **Automation Features**
- **Probe AI**: Set behavior patterns (aggressive, cautious, efficient)
- **Auto-Explore**: Queue planet exploration decisions
- **Resource Converters**: Automatic resource trading
- **Signal Harvesters**: Passive collection drones

#### 9. **Multiplayer Elements**
- **Galactic Leaderboards**: Compete for most discoveries
- **Trade Networks**: Exchange resources with other players
- **Cooperative Expeditions**: Team up for mega-signals
- **Territory Control**: Claim sectors for bonuses

#### 10. **Story Mode**
- **Mystery of the Ancients**: Uncover why civilizations vanished
- **The Signal Source**: Track origin of mysterious transmissions
- **Dimensional Rifts**: Explore parallel universes
- **The Great Filter**: Prevent galactic catastrophe

## 🧪 Testing & Quality Assurance

### Testing Framework: Playwright
We use **Playwright** for comprehensive end-to-end testing, chosen specifically for its superior handling of browser APIs and localStorage testing.

#### Setup & Running Tests
```bash
# Install dependencies and browsers
npm install
npm run install-browsers

# Run all tests
npm test                    # Headless mode
npm test:headed            # With browser visible  
npm test:debug             # Debug mode
npm test:save              # Save system tests only
```

#### Test Coverage
**Save System Tests** (Critical Priority):
- ✅ Basic save/load operations across multiple slots
- ✅ Research progress persistence and tree node restoration  
- ✅ Probe equipment state management and auto-updates
- ✅ Auto-save functionality during quit operations
- ✅ Error handling and graceful recovery scenarios
- ✅ Multiple save overwrites and race condition prevention
- ✅ Save metadata accuracy and display verification
- ✅ Cross-session state consistency (save→quit→reload→load)

**Smoke Tests**:
- ✅ Game startup and core system initialization
- ✅ UI navigation and modal system functionality
- ✅ Research system unlock and basic operations
- ✅ Probe deployment and management basics

#### Testing Philosophy
The save system is the **most critical component** of an idle game. Our testing approach:

1. **Real Browser Environment**: Tests run in actual browsers to catch issues unit tests miss
2. **localStorage Focus**: Comprehensive testing of browser storage APIs
3. **Complex State Scenarios**: Tests intricate game states with multiple interacting systems
4. **Error Simulation**: Deliberately breaks systems to test recovery mechanisms
5. **Cross-Session Verification**: Full save→quit→reload→continue workflows

#### Test Results
All save system tests passing across Chrome, Firefox, and Safari. The save system has been verified as **bulletproof** through comprehensive automated testing.

## Technical Details

- **Pure JavaScript**: No frameworks or external dependencies required
- **Canvas-Based Rendering**: High-performance 2D graphics with real-time animations
- **Responsive Design**: Adapts to different screen sizes and resolutions
- **Standardized Sectors**: Fixed 1920x1080 sector dimensions for consistent gameplay
- **Real-Time Systems**: 
  - Continuous probe tracking and status updates
  - Dynamic UI state management
  - Smooth camera interpolation and locking
  - Automated resource collection and processing
- **Advanced Coordinate Systems**: Separate world and screen coordinate handling
- **DOM Integration**: Seamless blend of canvas graphics and HTML UI elements
- **Event-Driven Architecture**: Comprehensive state management and user interaction handling
- **Robust Data Persistence**: Multi-layer save system with integrity checks and error recovery

## Recent Changes (v0.6.1-dev)

### UI/UX Improvements
- **Enhanced**: Planet specialization legend moved to top-left of exploration screen for better visibility
- **Improved**: Exploration screen layout with legend positioned beside planet canvas
- **Fixed**: Tutorial progression logic - now properly tracks deployment actions vs probe count
- **Updated**: Save menu simplified to remove external file options, using only internal save slots
- **Enhanced**: Starting probes now have same cosmetic properties as player-built probes (trail effects, etc.)

### Bug Fixes & System Improvements
- **Fixed**: Tutorial getting stuck on fourth step by correcting probe deployment counting
- **Improved**: Tutorial state management with proper new game vs resumed game distinction
- **Enhanced**: Save system streamlined for better user experience
- **Fixed**: Starting probe initialization to include full cosmetic system integration

## Previous Changes (v0.5.0)

### Tutorial & New Player Experience
- **Added**: Mission Briefing tutorial system for first-time players
- **Added**: Automatic tutorial trigger on first probe deployment
- **Added**: Example signals with animated demonstrations in tutorial
- **Added**: Tutorial disable option with localStorage persistence
- **Added**: Professional TRON-style modal design with backdrop blur

### Research Tree Enhancements
- **Redesigned**: Left-to-right family tree layout with proper connecting lines
- **Added**: Smart line routing with horizontal + vertical connections
- **Added**: Line lighting effects that activate when research progresses
- **Improved**: Rigid node perimeters with double-border effects
- **Enhanced**: Visual hierarchy with improved glow and shadow effects
- **Fixed**: Clean category separation with 70px gaps between trees
- **Optimized**: Research tree takes maximum vertical space available

### Previous Changes (v0.4.0)
- **Changed**: Signals now collected via direct clicking instead of box selection
- **Added**: Probe cargo system - resources stored on probes until delivery
- **Added**: Automatic cargo delivery when probes return to hubs
- **Updated**: Resource rewards only credited after successful delivery
- **Improved**: Visual feedback showing pending deliveries

## Technical Achievements

### Recently Implemented (v0.5.0)
- ✅ **Tutorial System**: Mission Briefing panel with first probe deployment detection
- ✅ **Interactive Tutorials**: Animated signal examples with disable functionality
- ✅ **Family Tree Research Layout**: Left-to-right flow with smart connecting lines
- ✅ **Line Lighting System**: Dynamic connection highlighting based on research progress
- ✅ **Enhanced Node Design**: Rigid perimeters with double-border and glow effects
- ✅ **Clean Category Separation**: Proper spacing between Collection/Probe/Alien trees
- ✅ **Optimized Research UI**: Maximized tree space with compact info panel

### Previous Achievements (v0.4.0)
- ✅ **Cargo Delivery System**: Probes carry resources back to hubs for delivery
- ✅ **Direct Signal Collection**: Click-to-collect replaced box selection system
- ✅ **Advanced Probe Management**: Real-time status tracking with detailed panels
- ✅ **Research System**: Three-tree specialization system with auto-unlock
- ✅ **Milestone System**: Comprehensive research point awards (16 total possible)
- ✅ **Equipment System**: Auto-collectors with universal collection upgrade
- ✅ **Building System**: Path-based construction with preview and validation
- ✅ **Camera Tracking**: Continuous probe following with smooth interpolation
- ✅ **Coordinate Systems**: Fixed hub selection and panel positioning bugs
- ✅ **UI State Management**: Dynamic button states and resource validation

### Critical Systems (Sept 2025)
- ✅ **Save/Load System**: Bulletproof multi-slot save system with auto-save
- ✅ **Research Progress Persistence**: Complete research tree state restoration
- ✅ **Equipment Auto-Updates**: Equipment gains new capabilities when research completes
- ✅ **Error Handling & Recovery**: Comprehensive error logging and graceful failures
- ✅ **Cross-Session State Management**: Full game state consistency across saves
- ✅ **Automated Testing Suite**: Playwright-based testing for save system integrity

## Development Roadmap & TODO

### Immediate Next Steps (Tomorrow's Priorities)
- **🎨 Rarity Color Coding**: Add color coding for rarity text in planet descriptions
  - Example: "A forest world with **common** potential for discovery" - make "common" appear in common-colored text
  - Apply consistent color coding for all rarity levels (common, uncommon, rare, epic, legendary)
- **📖 Tutorial System Completion**: Finish building out the comprehensive tutorial system
- **⚙️ Tutorial Controls**: Add ability to turn off tips/tutorial at any time from the main menu
- **🎯 Signal Distribution**: Implement new signal distribution system to make sector discovery feel more special

### Short-term Goals  
- ✅ **Save/Load System**: Robust persistent game state across sessions (COMPLETED)
- ✅ **Comprehensive Testing**: Playwright-based automation tests (IMPLEMENTED)
- ✅ **UI Layout Improvements**: Planet specialization legend repositioning (COMPLETED)
- **Sound Design**: Audio feedback for actions and ambient space sounds
- **Enhanced Visual Effects**: Particle systems and advanced animations
- **More Building Types**: Specialized facilities with unique functions
- **Advanced Research**: Extended technology tree with branching paths

### Long-term Vision
- **Performance Optimization**: Web Workers for background calculations
- **Advanced AI**: Smart probe behaviors and automated exploration
- **Complex Resource Chains**: Multi-stage production and refinement systems
- **Diplomatic Systems**: Alien races and trading mechanics
- **Modular Probe Customization**: Hull types, engine upgrades, specialized equipment
- **Multiplayer Features**: Cooperative exploration and competitive leaderboards

---

## Technical Documentation

### Architecture

**Tech Stack:**
- Frontend: Pure JavaScript (no frameworks), Canvas 2D rendering
- Desktop: Electron + Vite
- Storage: localStorage (web) / electron-store (desktop)
- Testing: Playwright
- Build: Vite + electron-builder

**File Structure:**
```
probetheus/
├── electron/              # Electron main process
│   ├── main.js           # Main process entry
│   └── preload.js        # IPC bridge (secure)
├── src/                  # Game modules
│   ├── StorageAdapter.js # Universal storage interface ⭐ NEW
│   ├── SaveManager.js    # Save/load system (async)
│   ├── TutorialManager.js # Tutorial system ⭐ NEW
│   ├── GameController.js # Main game loop
│   ├── GameState.js      # State management
│   ├── ProbeManager.js   # Probe logic
│   └── [other modules]
├── tests/                # Playwright tests
│   ├── tutorial-system.spec.js ⭐ NEW
│   └── storage-system.spec.js  ⭐ NEW
├── dist/                 # Built web app (Vite)
├── dist-electron/        # Built Electron files
├── release/              # Electron installers
├── vite.config.js        # Vite configuration ⭐ NEW
├── index.html            # Entry point
├── game.js               # Legacy game code
└── package.json          # Dependencies & scripts
```

### Storage System

**StorageAdapter** provides unified interface:
```javascript
// Automatically detects Electron vs web
const data = await storageAdapter.getItem('key');
await storageAdapter.setItem('key', value);
await storageAdapter.removeItem('key');
```

**Backends:**
- **Web**: Uses `localStorage` (synchronous, works in browser)
- **Electron**: Uses `electron-store` (async, file-based)

**Save Locations:**
- Web: Browser localStorage
- Windows: `C:\Users\[User]\AppData\Roaming\probetheus\`
- Mac: `~/Library/Application Support/probetheus/`
- Linux: `~/.config/probetheus/`

### Tutorial System

**Step-Based Design:**
```javascript
steps = [
  {
    id: 'deploy_first_probe',
    title: 'Deploy Your First Probe',
    message: '...',
    checkCondition: () => gameState.entities.probes.some(p => p.active)
  }
]
```

**Event-Driven:**
- Listens to game events (`probe:deployed`, `probe:returned`, etc.)
- Checks conditions after each event
- Auto-advances when condition met

**UI Design:**
- Top banner (non-blocking)
- Position: `top: 80px`, `width: 90%`, `max-width: 1200px`
- Dark gradient background with subtle shimmer
- Stays visible until step completed

### Development Commands

```bash
# Web development
npm run dev                 # Vite dev server (hot reload)
npm run legacy:server       # Node.js server (original)

# Electron development  
npm start                   # Run Electron app
npm run dev:electron        # Same as above

# Building
npm run build               # Build web version
npm run build:electron      # Build Electron installers

# Testing
npm test                    # Run all Playwright tests
npm run test:headed         # Run tests with visible browser
npm run test:debug          # Debug tests
```

### Testing

**Test Coverage:**
- Tutorial system (4 tests)
- Save/load system (6 tests)
- Game smoke tests
- UI interaction tests

**Running Tests:**
```bash
npm test                           # All tests
npm test tests/tutorial-system     # Tutorial only
npm test tests/storage-system      # Storage only
```

### Contributing

See `ELECTRON_MIGRATION.md` for details on the Electron setup and migration.

Key areas for contribution:
1. **New Tutorial Steps**: Add to `TutorialManager.steps` array
2. **Save System**: All async - use `await` with storage calls
3. **Electron Features**: Add to `electron/main.js` IPC handlers
4. **Tests**: Use Playwright for E2E testing

---

## License

MIT
