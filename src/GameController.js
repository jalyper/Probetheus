/**
 * Main Game Controller
 * Coordinates all game systems and manages the main game loop
 */
class GameController {
    constructor() {
        // Initialize core systems
        this.eventBus = new EventBus();
        this.gameState = new GameState();
        
        // Resource indicators for auto-collection
        this.resourceIndicators = [];

        // Initialize managers
        this.probeManager = new ProbeManager(this.gameState, this.eventBus);
        this.buildingSystem = new BuildingSystem(this.gameState, this.eventBus);
        this.miningManager = new MiningManager(this.gameState, this.eventBus);
        this.researchManager = new ResearchManager(this.gameState, this.eventBus);
        this.sectorManager = new SectorManager(this.gameState, this.eventBus);
        this.saveManager = new SaveManager(this.gameState, this.eventBus);
        this.offlineManager = new OfflineManager(this.gameState, this.eventBus);
        this.tutorialManager = new TutorialManager(this.gameState, this.eventBus);
        this.cosmeticManager = new CosmeticManager(this.gameState, this.eventBus);
        this.darkMarketSystem = new DarkMarketSystem(this.gameState, this.eventBus);
        this.shellSystem = new ShellSystem(this.gameState, this.eventBus);
        this.remnantManager = new RemnantManager(this.gameState, this.eventBus);
        this.dialogueSystem = new DialogueSystem(this.gameState, this.eventBus);
        this.musicManager = new MusicManager(this.gameState, this.eventBus);
        this.synthesisAnimation = new SynthesisAnimationManager(this.eventBus);
        this.sfxManager = new SfxManager(this.eventBus);
        this.comboSystem = new ComboSystem(this.gameState, this.eventBus);
        this.statsManager = new StatsManager(this.gameState, this.eventBus);
        this.cargoSparkSystem = new CargoSparkSystem(this.gameState, this.eventBus);
        this.uiManager = new UIManager(this.gameState, this.eventBus, this.probeManager, this.buildingSystem);
        
        // Make managers available to gameState for easy access
        this.gameState.cosmeticManager = this.cosmeticManager;
        this.gameState.tutorialManager = this.tutorialManager;
        
        // Initialize details panel after a brief delay to ensure DOM is ready
        setTimeout(() => {
            this.detailsPanel = new DetailsPanel(this.gameState, this.eventBus);
        }, 100);
        
        // Expose globally for onclick handlers
        window.uiManager = this.uiManager;
        window.game = this;
        
        // Listen for resource indicator events
        this.eventBus.on('resource:indicator', this.addResourceIndicator.bind(this));
        
        // Listen for research completion to update probe equipment
        this.eventBus.on('research:completed', (data) => {
            this.onResearchCompleted(data.node);
        });

        // Listen for screen switching events
        this.eventBus.on('ui:switchScreen', (data) => {
            this.showScreen(data.screen + 'Screen');
            if (data.screen === 'research') {
                this.eventBus.emit('research:showTree');
            }
        });
        
        // Listen for tutorial hub selection
        this.eventBus.on('hub:selected', (data) => {
            if (data.hub) {
                this.selectHub(data.hub);
            }
        });

        // Listen for Dark Market opening from NPC trade
        this.eventBus.on('darkmarket:openForNPC', (data) => {
            this.openDarkMarketForNPC(data.npcId, data.npcType);
        });

        // Listen for probethium synthesis (rates: docs/design/ECONOMY.md — primary active P source)
        this.eventBus.on('synthesis:triggered', (data) => {
            const resources = this.gameState.getResources();
            const { EXOTIC_PER_BATCH, PROBETHIUM_PER_BATCH } = window.GAME_CONSTANTS.SYNTHESIS;
            const batchCount = Math.floor(resources.exoticMinerals / EXOTIC_PER_BATCH);

            if (batchCount > 0) {
                const exoticsConsumed = batchCount * EXOTIC_PER_BATCH;
                const probethiumGained = batchCount * PROBETHIUM_PER_BATCH;

                // Update resources — getResources() returns a copy, so the
                // deduction must be written back via updateResources
                resources.exoticMinerals -= exoticsConsumed;
                this.gameState.updateResources(resources, this.eventBus);
                this.gameState.probethium.current += probethiumGained;
                this.gameState.probethium.totalAccumulated += probethiumGained;

                // Emit updates
                this.eventBus.emit('ui:update');
                this.eventBus.emit('ui:message', {
                    text: `Synthesized ${probethiumGained} Probethium from ${exoticsConsumed} exotic minerals!`,
                    type: 'success'
                });

                console.log(`[Synthesis] Converted ${exoticsConsumed} exotics -> ${probethiumGained} probethium`);
            }
        });

        // Canvas elements
        this.canvas = document.getElementById('galaxyCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.planetCanvas = document.getElementById('planetCanvas');
        this.planetCtx = this.planetCanvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        // Timing
        this.lastTime = 0;
        // Time controls (CORE_LOOP.md): 0 = paused, 1/2/4 = speed multiplier
        this.timeScale = 1;
        this.prePauseTimeScale = 1;

        this.setupCanvas();
        this.initializeGame();
        this.setupEventListeners();
        this.setupTimeControls();
        
        // Add camera change tracker for debugging camera snap issue
        this.lastViewOffset = { ...this.gameState.world.viewOffset };
        this.cameraChangeTracker = setInterval(() => {
            const current = this.gameState.world.viewOffset;
            if (current.x !== this.lastViewOffset.x || current.y !== this.lastViewOffset.y) {
                console.log('[CAMERA DEBUG] ViewOffset CHANGED!');
                console.log('  From:', this.lastViewOffset);
                console.log('  To:', current);
                console.log('  Delta:', {
                    x: current.x - this.lastViewOffset.x,
                    y: current.y - this.lastViewOffset.y
                });
                console.trace();
                this.lastViewOffset = { ...current };
            }
        }, 100); // Check every 100ms
        
        // Set initial cursor and ensure canvas is interactive
        this.canvas.style.cursor = 'grab';
        this.canvas.style.pointerEvents = 'auto';
        
        // Test canvas interaction
        console.log('Canvas setup complete. Testing canvas click...');
        setTimeout(() => {
            console.log('Canvas getBoundingClientRect:', this.canvas.getBoundingClientRect());
            console.log('Canvas style:', {
                pointerEvents: this.canvas.style.pointerEvents,
                position: window.getComputedStyle(this.canvas).position,
                zIndex: window.getComputedStyle(this.canvas).zIndex
            });
        }, 100);
        
        this.gameLoop();
    }

    /**
     * Time controls (CORE_LOOP.md): pause + 1x/2x/4x speed
     */
    setupTimeControls() {
        const pauseBtn = document.getElementById('timePauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }
        document.querySelectorAll('.time-scale-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTimeScale(parseInt(btn.dataset.scale, 10));
            });
        });
        this.updateTimeControlsUI();
    }

    setTimeScale(scale) {
        if (!window.GAME_CONSTANTS.TIME.SCALES.includes(scale)) return;
        this.timeScale = scale;
        this.prePauseTimeScale = scale;
        this.updateTimeControlsUI();
        this.eventBus.emit('time:scaleChanged', { scale });
    }

    togglePause() {
        if (this.timeScale === 0) {
            this.timeScale = this.prePauseTimeScale || 1;
        } else {
            this.prePauseTimeScale = this.timeScale;
            this.timeScale = 0;
        }
        this.updateTimeControlsUI();
        this.eventBus.emit('time:scaleChanged', { scale: this.timeScale });
    }

    updateTimeControlsUI() {
        const pauseBtn = document.getElementById('timePauseBtn');
        if (pauseBtn) {
            pauseBtn.classList.toggle('paused', this.timeScale === 0);
            pauseBtn.textContent = this.timeScale === 0 ? '▶' : '⏸';
            pauseBtn.title = this.timeScale === 0 ? 'Resume (Space)' : 'Pause (Space)';
        }
        document.querySelectorAll('.time-scale-btn').forEach(btn => {
            btn.classList.toggle('active',
                this.timeScale !== 0 && parseInt(btn.dataset.scale, 10) === this.timeScale);
        });
    }

    /**
     * Setup canvas properties
     */
    setupCanvas() {
        const resizeCanvas = () => {
            // Fill the entire window (no aspect ratio lock for now)
            // This ensures UI panels positioned with 'fixed' stay on screen
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight - 100; // Account for top UI
            
            this.minimapCanvas.width = 150;
            this.minimapCanvas.height = 100;
            
            this.planetCanvas.width = 800;
            this.planetCanvas.height = 400;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    /**
     * Initialize the game world
     */
    initializeGame() {
        this.initializeSector(0, 0, true);
        this.generateStars();

        console.log('=== GAME INITIALIZATION ===');
        console.log('Game initialized. Hubs:', this.gameState.entities.reconHubs.length);
        console.log('Canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
        console.log('World sector size:', this.gameState.world.standardSectorWidth, 'x', this.gameState.world.standardSectorHeight);
        console.log('Initial view offset:', this.gameState.world.viewOffset);
        
        this.gameState.entities.reconHubs.forEach((hub, index) => {
            console.log(`Hub ${index}: id=${hub.id}, pos=(${hub.x}, ${hub.y}), probes=${this.probeManager.getActiveProbeCountForHub(hub)}/${hub.maxProbes}, selected=${hub.selected}`);
        });
        
        console.log('=== END INITIALIZATION ===');
        
        this.uiManager.updateUI();
        this.startPassiveGeneration();
        
        // Check for offline progression on initial load
        this.checkInitialOfflineProgression();
        
        // Setup auto-save on page unload
        this.setupAutoSaveOnExit();
    }

    /**
     * Mark tutorial as completed and save progress
     */
    completeTutorial() {
        console.log('Tutorial completed!');
        localStorage.setItem('tutorialCompleted', 'true');
        
        // Clear tutorial progress since it's completed
        localStorage.removeItem('tutorialProgress');
        
        // Trigger an auto-save to preserve completion state
        if (this.saveManager) {
            this.performAutoSave();
        }
    }

    /**
     * Check if player can interact with hubs (tutorial restriction)
     */
    canInteractWithHubs() {
        // Always allow interaction if tutorial is completed
        if (localStorage.getItem('tutorialCompleted') === 'true') {
            return true;
        }
        
        // During tutorial, only allow interaction at specific steps
        return this.isTutorialAllowingHubInteraction();
    }

    /**
     * Check if tutorial currently allows hub interaction
     */
    isTutorialAllowingHubInteraction() {
        // This will be set by the tutorial system when appropriate
        return this.tutorialAllowsHubClick === true;
    }

    /**
     * Load tutorial progress from localStorage
     */
    loadTutorialProgress() {
        const saved = localStorage.getItem('tutorialProgress');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse tutorial progress, starting fresh');
            }
        }
        
        // Default progress - all steps not completed
        return {
            completedSteps: [],
            currentStep: 0,
            hasDragged: false,
            hasScrolled: false,
            deployedProbeCount: 0,
            hasIdentifiedSignal: false,
            hasChosenAction: false,
            hasSeenProbeLimit: false,
            hasSeenBuildInfo: false,
            hasClickedHubForBuild: false
        };
    }

    /**
     * Save tutorial progress to localStorage
     */
    saveTutorialProgress(progress) {
        localStorage.setItem('tutorialProgress', JSON.stringify(progress));
        console.log('Saved tutorial progress:', progress);
    }

    /**
     * Show message when tutorial restricts interaction
     */
    showTutorialRestrictedMessage() {
        // Show a subtle message that tutorial is guiding them
        this.eventBus.emit('ui:message', { 
            text: 'Follow the tutorial tips to learn the game!', 
            type: 'info',
            duration: 2000
        });
    }

    /**
     * Initialize a sector
     */
    initializeSector(x, y, discovered = false) {
        const key = `${x},${y}`;
        if (!this.gameState.world.sectors.has(key)) {
            const isStartingSector = (x === 0 && y === 0);
            
            const sector = {
                x, y, discovered,
                explored: isStartingSector,
                signals: [],
                hubs: [],
                name: this.generateSectorName(x, y),
                type: this.generateSectorType(x, y)
            };
            
            this.gameState.world.sectors.set(key, sector);
            
            // Add starting Recon Hub in center of starting sector
            if (isStartingSector) {
                const hub = {
                    id: 'hub_0_0',
                    x: this.gameState.world.standardSectorWidth / 2,
                    y: this.gameState.world.standardSectorHeight / 2,
                    sector: { x: 0, y: 0 },
                    range: this.gameState.world.standardSectorWidth / 3,
                    maxProbes: 5,
                    selected: false
                };
                this.gameState.entities.reconHubs.push(hub);
                this.gameState.world.sectors.get('0,0').hubs.push(hub);
                
                // Create 3 starting probes at the hub
                for (let i = 0; i < 3; i++) {
                    const probe = {
                        id: `starting_probe_${i}`,
                        waypoints: [],
                        currentWaypoint: 0,
                        current: { x: hub.x, y: hub.y },
                        segmentProgress: 0,
                        speed: window.GAME_CONSTANTS.PROBE.BASE_SPEED,
                        pulseTimer: 0,
                        pulses: [],
                        radarPulses: [],
                        active: true,
                        hub: hub,
                        recoveryMode: false,
                        outboundWaypointsCount: 0,
                        returnSpeed: window.GAME_CONSTANTS.PROBE.BASE_SPEED * window.GAME_CONSTANTS.PROBE.RETURN_SPEED_MULT,
                        patrolMode: true,
                        equipment: [],
                        maxEquipmentSlots: 2,
                        status: 'ready',
                        returnedToHub: false,
                        damage: 0,
                        baseMaxDamage: 3,
                        maxDamage: 3,
                        lastDamageTime: 0,
                        cargo: {
                            minerals: 0,
                            data: 0,
                            artifacts: 0,
                            exoticMinerals: 0
                        },
                        // Apply active cosmetic skin (if CosmeticManager exists)
                        cosmetic: this.gameState.cosmeticManager ?
                            { ...this.gameState.cosmeticManager.getActiveSkinDesign() } :
                            {
                                // Fallback default skin
                                trailEnabled: true,
                                trail: {
                                    length: 15,
                                    color: window.PALETTE?.PROBE_BODY || '#E8E4F0',
                                    width: 2,
                                    opacity: 0.45
                                }
                            }
                    };
                    this.gameState.entities.probes.push(probe);
                }
            }
        }
    }

    /**
     * Setup event listeners for user input
     */
    setupEventListeners() {
        console.log('Setting up event listeners for canvas:', this.canvas.width, 'x', this.canvas.height);
        
        // Basic canvas interaction test (removed debug logging)

        // Canvas click events
        this.canvas.addEventListener('click', (e) => {
            console.log('=== CANVAS CLICK EVENT FIRED ===');
            console.log('Event:', e);
            console.log('Canvas element:', this.canvas);
            console.log('Canvas style.pointerEvents:', this.canvas.style.pointerEvents);
            
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.x;
            const y = (e.clientY - rect.top) / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.y;
            
            console.log('Click position - client:', e.clientX, e.clientY);
            console.log('Click position - world:', x, y);
            
            this.handleCanvasClick(x, y);
        });

        // Add mousedown for dragging
        this.canvas.addEventListener('mousedown', (e) => {
            console.log('Canvas mousedown event fired');
            const rect = this.canvas.getBoundingClientRect();
            const worldX = (e.clientX - rect.left) / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.x;
            const worldY = (e.clientY - rect.top) / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.y;
            
            if (!this.gameState.ui.deployMode && !this.gameState.ui.hubPlacementMode && !this.buildingSystem.isBuildingMode()) {
                // Start normal camera dragging
                this.gameState.input.isDragging = true;
                this.gameState.input.dragStart = { x: e.clientX, y: e.clientY };
                this.gameState.input.lastViewOffset = { ...this.gameState.world.viewOffset };
                this.canvas.style.cursor = 'grabbing';
                console.log('Started camera dragging');
            }
        });

        // Add mousemove for dragging
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.x;
            const y = (e.clientY - rect.top) / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.y;
            
            this.gameState.ui.mousePosition = { x, y };
            
            // Handle camera dragging
            if (this.gameState.input.isDragging) {
                const deltaX = e.clientX - this.gameState.input.dragStart.x;
                const deltaY = e.clientY - this.gameState.input.dragStart.y;
                
                const newOffsetX = this.gameState.input.lastViewOffset.x - deltaX / this.gameState.world.zoomLevel;
                const newOffsetY = this.gameState.input.lastViewOffset.y - deltaY / this.gameState.world.zoomLevel;
                
                // Log if this is causing a big jump
                const jumpX = Math.abs(newOffsetX - this.gameState.world.viewOffset.x);
                const jumpY = Math.abs(newOffsetY - this.gameState.world.viewOffset.y);
                if (jumpX > 50 || jumpY > 50) {
                    console.log('[CAMERA DEBUG] Large camera jump during drag!');
                    console.log('  isDragging:', this.gameState.input.isDragging);
                    console.log('  dragStart:', this.gameState.input.dragStart);
                    console.log('  lastViewOffset:', this.gameState.input.lastViewOffset);
                    console.log('  delta:', deltaX, deltaY);
                    console.log('  jump size:', jumpX, jumpY);
                }
                
                this.gameState.world.viewOffset.x = newOffsetX;
                this.gameState.world.viewOffset.y = newOffsetY;
                return; // Don't update cursor when dragging
            }
            
            // Update cursor based on what's under mouse
            this.updateCursor(x, y);
            
            if (this.buildingSystem.isBuildingMode()) {
                this.buildingSystem.updateBuildingPreview({ mouseX: x, mouseY: y });
            }
            
        });

        // Add mouseup for dragging and signal selection
        this.canvas.addEventListener('mouseup', () => {
            if (this.gameState.input.isDragging) {
                this.gameState.input.isDragging = false;
                this.canvas.style.cursor = 'grab';
                console.log('[CAMERA DEBUG] Stopped camera dragging - isDragging set to FALSE');
            }
        });

        // Add mouse leave to reset cursor and stop dragging
        this.canvas.addEventListener('mouseleave', () => {
            this.gameState.input.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });

        // Add mouse wheel for zooming
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Get world position before zoom
            const worldX = mouseX / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.x;
            const worldY = mouseY / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.y;
            
            // Adjust zoom level
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            let newZoom = this.gameState.world.zoomLevel * zoomDelta;
            
            // Clamp zoom between 0.1 (far zoom out) and 3 (close zoom in)
            newZoom = Math.max(0.1, Math.min(3, newZoom));
            this.gameState.world.zoomLevel = newZoom;
            
            // Adjust view offset to keep mouse position fixed
            this.gameState.world.viewOffset.x = worldX - mouseX / newZoom;
            this.gameState.world.viewOffset.y = worldY - mouseY / newZoom;
            
            console.log('Zoom level:', this.gameState.world.zoomLevel);
        });

        // Add keyboard controls for zooming
        document.addEventListener('keydown', (e) => {
            // Don't hijack keys while the player is typing in an input
            const target = e.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            // Prevent default behavior for game keys to stop browser scrolling/actions
            const gameKeys = ['d', 'D', 'F12', '+', '=', '-', '_', 'Escape', ' ', '1', '2', '3'];
            if (gameKeys.includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
            }

            // Time controls (CORE_LOOP.md): Space = pause, 1/2/3 = 1x/2x/4x
            if (e.key === ' ') {
                this.togglePause();
                return;
            } else if (e.key === '1') {
                this.setTimeScale(1);
                return;
            } else if (e.key === '2') {
                this.setTimeScale(2);
                return;
            } else if (e.key === '3') {
                this.setTimeScale(4);
                return;
            }
            
            // Debug camera snapping issue
            if (e.key === 'd' || e.key === 'D' || e.key === 'F12') {
                console.log(`[CAMERA DEBUG] Key pressed: ${e.key}`);
                console.log(`[CAMERA DEBUG] Current viewOffset:`, this.gameState.world.viewOffset);
                console.log(`[CAMERA DEBUG] Current zoom:`, this.gameState.world.zoomLevel);
                console.log(`[CAMERA DEBUG] Event target:`, e.target);
                console.log(`[CAMERA DEBUG] Active element:`, document.activeElement);
                console.log(`[CAMERA DEBUG] Mouse position:`, this.gameState.ui.mousePosition);
            }
            
            if (e.key === '+' || e.key === '=') {
                // Zoom in (center of screen)
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                
                const worldX = centerX / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.x;
                const worldY = centerY / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.y;
                
                let newZoom = this.gameState.world.zoomLevel * 1.1;
                newZoom = Math.max(0.2, Math.min(3, newZoom));
                this.gameState.world.zoomLevel = newZoom;
                
                this.gameState.world.viewOffset.x = worldX - centerX / newZoom;
                this.gameState.world.viewOffset.y = worldY - centerY / newZoom;
                
                console.log('[CAMERA DEBUG] After zoom in, viewOffset:', this.gameState.world.viewOffset);
            } else if (e.key === '-' || e.key === '_') {
                // Zoom out (center of screen)
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                
                const worldX = centerX / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.x;
                const worldY = centerY / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.y;
                
                let newZoom = this.gameState.world.zoomLevel * 0.9;
                newZoom = Math.max(0.2, Math.min(3, newZoom));
                this.gameState.world.zoomLevel = newZoom;
                
                this.gameState.world.viewOffset.x = worldX - centerX / newZoom;
                this.gameState.world.viewOffset.y = worldY - centerY / newZoom;
                
                console.log('[CAMERA DEBUG] After zoom out, viewOffset:', this.gameState.world.viewOffset);
            } else if (e.key === 'Escape') {
                // ESC to close hub panel
                if (this.gameState.ui.selectedHub) {
                    this.gameState.ui.selectedHub.selected = false;
                    this.gameState.ui.selectedHub = null;
                    this.uiManager.updateUI();
                }
            }
        });

        // Right-click to cancel building mode
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            if (this.buildingSystem.isBuildingMode()) {
                this.buildingSystem.exitBuildingMode();
            }
            
            // Cancel hub placement mode
            if (this.gameState.ui.hubPlacementMode) {
                this.gameState.ui.hubPlacementMode = false;
                this.canvas.style.cursor = 'grab';
                document.getElementById('probeStatus').textContent = '';
                console.log('Cancelled hub placement mode');
            }
            
            
            // Cancel shuttle placement mode
            if (this.gameState.ui.shuttlePlacementMode) {
                this.gameState.ui.shuttlePlacementMode = false;
                this.canvas.style.cursor = 'grab';
                document.getElementById('probeStatus').textContent = '';
                console.log('Cancelled shuttle placement mode');
            }
            
            // Cancel shuttle connection mode
            if (this.gameState.ui.shuttleConnectionMode) {
                this.gameState.ui.shuttleConnectionMode = false;
                this.gameState.ui.selectedStation = null;
                this.canvas.style.cursor = 'grab';
                document.getElementById('probeStatus').textContent = '';
                console.log('Cancelled shuttle connection mode');
            }
            
            // Cancel deployment mode
            if (this.gameState.ui.deployMode) {
                this.gameState.ui.deployMode = false;
                this.gameState.ui.deploymentPoints = [];
                this.canvas.style.cursor = 'grab';
                document.getElementById('probeStatus').textContent = '';
            }
        });

        // Deploy and build probe buttons removed - now handled in hub panel

        // Mining station button (check if it exists)
        const buildMiningBtn = document.getElementById('buildMiningBtn');
        if (buildMiningBtn) {
            buildMiningBtn.addEventListener('click', () => {
                // Use BuildingSystem for mining facility placement
                this.buildingSystem.enterBuildingMode({
                    structureType: 'miningFacility',
                    probe: null // No specific probe needed for mining facilities
                });
                this.canvas.style.cursor = 'crosshair';
                document.getElementById('probeStatus').textContent = 'Click along exploration routes to place mining station...';
                console.log('Entered mining facility building mode via BuildingSystem');
            });
        }

        // Shuttle button (check if it exists)
        const buildShuttleBtn = document.getElementById('buildShuttleBtn');
        if (buildShuttleBtn) {
            buildShuttleBtn.addEventListener('click', () => {
            if (!this.gameState.ui.selectedHub) {
                this.eventBus.emit('ui:message', { 
                    text: 'Select a hub first!', 
                    type: 'error' 
                });
                return;
            }
            
            if (!this.gameState.mining || this.gameState.mining.stations.length === 0) {
                this.eventBus.emit('ui:message', { 
                    text: 'No mining stations available!', 
                    type: 'error' 
                });
                return;
            }
            
            // Enter shuttle placement mode - user clicks on a station to connect
            this.gameState.ui.shuttlePlacementMode = true;
            this.canvas.style.cursor = 'crosshair';
            document.getElementById('probeStatus').textContent = 'Click on a mining station to connect shuttle...';
            });
        }

        // Build hub button removed - now handled by probe building system

        // Testing panel handlers
        document.querySelectorAll('.test-resource-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const resource = e.currentTarget.dataset.resource;
                const amount = parseInt(e.currentTarget.dataset.amount);
                
                if (resource === 'all') {
                    // Add to all resources
                    const resources = this.gameState.getResources();
                    this.gameState.updateResources({
                        minerals: (resources.minerals || 0) + amount,
                        data: (resources.data || 0) + amount,
                        artifacts: (resources.artifacts || 0) + amount,
                        exoticMinerals: (resources.exoticMinerals || 0) + amount,
                        researchPoints: (resources.researchPoints || 0) + 10
                    }, this.eventBus);
                    console.log(`Added ${amount} to all resources`);
                } else {
                    // Add to specific resource
                    const resources = this.gameState.getResources();
                    resources[resource] = (resources[resource] || 0) + amount;
                    this.gameState.updateResources(resources, this.eventBus);
                    console.log(`Added ${amount} ${resource}`);
                }
            });
        });

        // Probethium test button
        const testProbethium = document.getElementById('testAddProbetheum');
        if (testProbethium) {
            console.log('✓ Probethium test button found');
            testProbethium.addEventListener('click', () => {
                // Add 100 Probethium for testing
                this.gameState.mining.totalProbetheum += 100.0;
                this.gameState.probethium.current += 100.0;
                this.gameState.probethium.totalAccumulated += 100.0;

                // Update top bar display
                this.miningManager.updateProbetheum();

                // Update trade menu balance if open
                const tradeBalance = document.getElementById('tradeMenuProbethium');
                if (tradeBalance) {
                    tradeBalance.textContent = `${this.gameState.probethium.current.toFixed(4)} P`;
                }

                this.uiManager.updateUI();
            });
        } else {
            console.error('❌ Probethium test button NOT found!');
        }

        // Dark Market test button
        const testDarkMarket = document.getElementById('testSpawnDarkMarket');
        if (testDarkMarket) {
            testDarkMarket.addEventListener('click', () => {
                this.spawnDarkMarketSignal();
                console.log('🌑 Dark Market signal spawned manually');
            });
        }

        // Remnant NPC test button
        const testRemnant = document.getElementById('testSpawnRemnant');
        if (testRemnant) {
            testRemnant.addEventListener('click', () => {
                if (this.remnantManager) {
                    this.remnantManager.forceSpawn('keth_varn');
                    console.log('👁️ Remnant NPC spawned manually');
                } else {
                    console.error('RemnantManager not available');
                }
            });
        }

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
        }

        // Close settings button (X)
        const closeSettings = document.getElementById('closeSettings');
        if (closeSettings) {
            closeSettings.addEventListener('click', () => {
                this.closeSettings();
            });
        }

        // Close settings button (Close button)
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                this.closeSettings();
            });
        }

        // Music toggle
        const musicToggle = document.getElementById('musicToggle');
        if (musicToggle) {
            // Set initial state
            musicToggle.checked = this.musicManager.isMusicEnabled();
            
            musicToggle.addEventListener('change', () => {
                this.musicManager.toggleMusic();
            });
        }

        // Music mode selector
        const musicMode = document.getElementById('musicMode');
        if (musicMode) {
            // Set initial value
            musicMode.value = this.gameState.settings.musicMode || 'sequential';
            
            // Show/hide track selector based on mode
            const updateTrackSelectorVisibility = () => {
                const container = document.getElementById('trackSelectionContainer');
                if (container) {
                    container.style.display = musicMode.value === 'single' ? 'block' : 'none';
                }
            };
            updateTrackSelectorVisibility();
            
            musicMode.addEventListener('change', () => {
                this.musicManager.setMusicMode(musicMode.value);
                updateTrackSelectorVisibility();
            });
        }

        // Track selector
        const trackSelector = document.getElementById('trackSelector');
        if (trackSelector) {
            // Populate with available tracks
            const tracks = this.musicManager.getTracks();
            tracks.forEach(track => {
                const option = document.createElement('option');
                option.value = track.id;
                option.textContent = track.name;
                trackSelector.appendChild(option);
            });
            
            // Set initial value
            trackSelector.value = this.gameState.settings.selectedTrack || 'main-theme';
            
            trackSelector.addEventListener('change', () => {
                this.musicManager.selectTrack(trackSelector.value);
            });
        }

        // Music volume slider
        const musicVolume = document.getElementById('musicVolume');
        const musicVolumeLabel = document.getElementById('musicVolumeLabel');
        if (musicVolume && musicVolumeLabel) {
            // Set initial value
            musicVolume.value = this.musicManager.getMusicVolume() * 100;
            musicVolumeLabel.textContent = Math.round(musicVolume.value) + '%';
            
            musicVolume.addEventListener('input', () => {
                const volume = musicVolume.value / 100;
                this.musicManager.setMusicVolume(volume);
                musicVolumeLabel.textContent = Math.round(musicVolume.value) + '%';
            });
        }

        // Tutorial toggle
        const tutorialToggle = document.getElementById('tutorialToggle');
        if (tutorialToggle) {
            // Set initial state from TutorialManager
            tutorialToggle.checked = this.tutorialManager.isTutorialEnabled();

            tutorialToggle.addEventListener('change', () => {
                this.tutorialManager.setTutorialEnabled(tutorialToggle.checked);
            });
        }

        // Toggle test panel
        const toggleBtn = document.getElementById('toggleTestPanel');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const panel = document.getElementById('testPanel');
                panel.style.display = 'none';
            });
        }

        // Add keyboard shortcut for test panel (Ctrl+T)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault();
                const panel = document.getElementById('testPanel');
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            }
        });

        // Exploration button handlers
        document.querySelectorAll('.explore-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.explore(mode);
            });
        });

        // Return to map button
        document.getElementById('returnToMap').addEventListener('click', () => {
            this.showScreen('mapScreen');
        });

        // Reward modal close button
        const collectRewardBtn = document.getElementById('collectReward');
        if (collectRewardBtn) {
            collectRewardBtn.addEventListener('click', () => {
                document.getElementById('rewardModal').classList.remove('active');
            });
        }

        // Research modal buttons
        const openResearchLabBtn = document.getElementById('openResearchLab');
        if (openResearchLabBtn) {
            openResearchLabBtn.addEventListener('click', () => {
                document.getElementById('researchUnlockModal').classList.remove('active');
                this.showScreen('researchScreen');
                this.eventBus.emit('research:showTree');
            });
        }

        const researchLaterBtn = document.getElementById('researchLater');
        if (researchLaterBtn) {
            researchLaterBtn.addEventListener('click', () => {
                document.getElementById('researchUnlockModal').classList.remove('active');
                this.showScreen('mapScreen');
            });
        }

        // Return to map from research screen button
        const returnToMapFromResearchBtn = document.getElementById('returnToMapFromResearch');
        if (returnToMapFromResearchBtn) {
            returnToMapFromResearchBtn.addEventListener('click', () => {
                this.showScreen('mapScreen');
            });
        }

        // Research button in header
        const researchBtn = document.getElementById('researchBtn');
        if (researchBtn) {
            researchBtn.addEventListener('click', () => {
                this.showScreen('researchScreen');
                this.eventBus.emit('research:showTree');
            });
        }

        // Sector Report button
        const sectorReportBtn = document.getElementById('sectorReportBtn');
        if (sectorReportBtn) {
            sectorReportBtn.addEventListener('click', () => {
                this.showSectorReport();
            });
        }

        // Main menu button
        const mainMenuBtn = document.getElementById('mainMenuBtn');
        if (mainMenuBtn) {
            mainMenuBtn.addEventListener('click', () => {
                this.showMainMenu();
            });
        }

        // Close save/load modal
        const closeSaveLoadModal = document.getElementById('closeSaveLoadModal');
        if (closeSaveLoadModal) {
            closeSaveLoadModal.addEventListener('click', () => {
                document.getElementById('saveLoadModal').classList.remove('active');
            });
        }

        // Close Dark Market modal (X button at top)
        const closeDarkMarket = document.getElementById('closeDarkMarket');
        if (closeDarkMarket) {
            closeDarkMarket.addEventListener('click', () => {
                const modal = document.getElementById('darkMarketModal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Close Dark Market modal (Close button at bottom)
        const closeDarkMarketBottom = document.getElementById('closeDarkMarketBottom');
        if (closeDarkMarketBottom) {
            closeDarkMarketBottom.addEventListener('click', () => {
                const modal = document.getElementById('darkMarketModal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }

    /**
     * Handle canvas clicks
     */
    handleCanvasClick(worldX, worldY) {
        console.log(`=== CANVAS CLICK HANDLER ===`);
        console.log(`Click at world: (${worldX}, ${worldY})`);
        console.log(`Available signals: ${this.gameState.entities.signals ? this.gameState.entities.signals.length : 0}`);
        console.log(`Building mode: ${this.buildingSystem.isBuildingMode()}`);
        console.log(`Deploy mode: ${this.gameState.ui.deployMode}`);
        console.log(`Hub placement mode: ${this.gameState.ui.hubPlacementMode}`);
        
        // Check if we're in building mode
        if (this.buildingSystem.isBuildingMode()) {
            console.log('Handling building mode click');
            this.buildingSystem.placeBuilding();
            return;
        }

        // Handle shuttle placement mode (hub -> station) - PRIORITY OVER entity selection
        if (this.gameState.ui.shuttlePlacementMode) {
            console.log('Handling shuttle placement click');
            this.placeShuttle(worldX, worldY);
            return;
        }
        
        // Handle shuttle connection mode (station -> hub) - PRIORITY OVER entity selection
        if (this.gameState.ui.shuttleConnectionMode) {
            console.log('Handling shuttle connection click');
            this.connectShuttle(worldX, worldY);
            return;
        }

        // Check for hub clicks FIRST (higher priority than probes)
        const clickedHub = this.findHubAt(worldX, worldY);
        if (clickedHub) {
            console.log('=== HUB CLICKED ===');
            console.log('Found hub at click location:', clickedHub.id);
            console.log('Hub position:', clickedHub.x, clickedHub.y);
            
            this.selectHub(clickedHub);
            console.log('Emitting entity:selected event for hub');
            this.eventBus.emit('entity:selected', { entity: clickedHub, type: 'hub' });
            
            // Emit event for tutorial
            this.eventBus.emit('hub:clicked', { hub: clickedHub });
            console.log('=== HUB CLICK COMPLETE ===');
            return;
        }
        
        // Check for mining station clicks
        const clickedStation = this.findMiningStationAt(worldX, worldY);
        if (clickedStation) {
            console.log('Found mining station at click location');
            this.eventBus.emit('entity:selected', { entity: clickedStation, type: 'miningStation' });
            return;
        }

        // Check for probe clicks
        const clickedProbe = this.findProbeAt(worldX, worldY);
        if (clickedProbe) {
            console.log('Found probe at click location');
            this.eventBus.emit('probe:select', { probe: clickedProbe });
            // Probes use the compact probeDetailPanel via UIManager
            return;
        }

        // Check for remnant NPC clicks
        if (this.remnantManager && this.remnantManager.checkClick(worldX, worldY)) {
            console.log('Remnant NPC clicked');
            return;
        }

        // Check for signal clicks
        const clickedSignal = this.findSignalAt(worldX, worldY);
        if (clickedSignal) {
            console.log('=== SIGNAL CLICKED ===');
            console.log('Found signal at click location:', clickedSignal);
            
            // Check if this is a dark market signal
            if (clickedSignal.signalType === 'dark_market' || clickedSignal.rarity === 'dark_market') {
                console.log('🌑 Dark Market signal clicked - opening shop');
                this.openDarkMarket(clickedSignal);
                return;
            }
            
            this.collectSignal(clickedSignal);
            console.log('=== SIGNAL CLICK COMPLETE ===');
            return;
        }

        // Handle hub placement mode
        if (this.gameState.ui.hubPlacementMode) {
            console.log('Handling hub placement click');
            this.placeReconHub(worldX, worldY);
            return;
        }



        // Handle deployment mode
        if (this.gameState.ui.deployMode && this.gameState.ui.selectedHub) {
            console.log('Handling deployment click');
            this.handleDeploymentClick(worldX, worldY);
            return;
        }
        
        console.log('No clickable element found at this location');
    }

    /**
     * Handle deployment clicks
     */
    handleDeploymentClick(worldX, worldY) {
        const hub = this.gameState.ui.selectedHub;
        const maxRange = hub.range;
        const distance = Math.sqrt(
            Math.pow(worldX - hub.x, 2) + 
            Math.pow(worldY - hub.y, 2)
        );
        
        if (distance <= maxRange) {
            this.gameState.ui.deploymentPoints.push({ x: worldX, y: worldY });
            
            if (this.gameState.ui.deploymentPoints.length === 1) {
                document.getElementById('probeStatus').textContent = 'Click second destination (or right-click to cancel deployment)...';
            } else if (this.gameState.ui.deploymentPoints.length >= 2) {
                // Deploy probe
                this.eventBus.emit('probe:deploy', {
                    hub: hub,
                    waypoints: this.gameState.ui.deploymentPoints
                });
                
                this.gameState.ui.deployMode = false;
                this.gameState.ui.deploymentPoints = [];
                this.canvas.style.cursor = 'grab';
            }
        } else {
            document.getElementById('probeStatus').textContent = 'Too far from hub!';
            setTimeout(() => {
                document.getElementById('probeStatus').textContent = '';
            }, 2000);
        }
    }

    /**
     * Find probe at coordinates
     */
    findProbeAt(x, y) {
        return this.gameState.entities.probes.find(probe => {
            if (!probe.active) return false;
            const distance = Math.sqrt(
                Math.pow(x - probe.current.x, 2) + 
                Math.pow(y - probe.current.y, 2)
            );
            return distance <= 15; // 15 pixel click radius
        });
    }

    /**
     * Find hub at coordinates
     */
    findHubAt(x, y) {
        const clickedHub = this.gameState.entities.reconHubs.find(hub => {
            const distance = Math.sqrt(
                Math.pow(x - hub.x, 2) + 
                Math.pow(y - hub.y, 2)
            );
            // Hub visual size is 12px, make hitbox slightly bigger at 18px
            return distance <= 18;
        });
        
        if (clickedHub) {
            console.log('Found hub:', clickedHub.id);
        }
        return clickedHub;
    }

    /**
     * Find signal at coordinates
     */
    findSignalAt(x, y) {
        return this.gameState.entities.signals.find(signal => {
            const distance = Math.sqrt(
                Math.pow(x - signal.x, 2) + 
                Math.pow(y - signal.y, 2)
            );
            // Use very large click radius to make signals easy to click even when zoomed out
            const clickRadius = signal.radius * 8; // Significantly increased for better clickability
            
            return distance <= clickRadius;
        });
    }
    
    /**
     * Find mining station at coordinates
     */
    findMiningStationAt(x, y) {
        if (!this.gameState.mining || !this.gameState.mining.stations) return null;
        
        return this.gameState.mining.stations.find(station => {
            const distance = Math.sqrt(
                Math.pow(x - station.position.x, 2) + 
                Math.pow(y - station.position.y, 2)
            );
            // Mining stations have a large click radius for easy clicking
            return distance <= 60;
        });
    }

    /**
     * Find nearest active probe to a position
     */
    findNearestActiveProbe(x, y) {
        let nearestProbe = null;
        let minDistance = Infinity;
        
        console.log('Finding nearest active probe to position:', x, y);
        console.log('Total probes:', this.gameState.entities.probes.length);
        
        this.gameState.entities.probes.forEach(probe => {
            console.log(`Probe ${probe.id}: active=${probe.active}, status=${probe.status}, has waypoints=${probe.waypoints && probe.waypoints.length > 0}`);
            
            // Accept any active probe with waypoints (exploring)
            if (probe.active && probe.waypoints && probe.waypoints.length > 0) {
                const distance = Math.sqrt(
                    Math.pow(x - probe.current.x, 2) + 
                    Math.pow(y - probe.current.y, 2)
                );
                console.log(`  Distance: ${distance}`);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestProbe = probe;
                }
            }
        });
        
        if (nearestProbe) {
            console.log(`Found nearest probe: ${nearestProbe.id} at distance ${minDistance}`);
        } else {
            console.warn('No active probe found to carry rewards!');
        }
        
        return nearestProbe;
    }

    /**
     * Select a hub
     */
    selectHub(hub) {
        // Deselect all other hubs
        this.gameState.entities.reconHubs.forEach(h => h.selected = false);
        
        // Select this hub
        hub.selected = true;
        this.gameState.ui.selectedHub = hub;
        
        // Show feedback
        const probeCount = this.probeManager.getActiveProbeCountForHub(hub);
        const readyCount = this.probeManager.getReadyProbeCountForHub(hub);
        document.getElementById('probeStatus').textContent = `Selected hub: ${readyCount}/${hub.maxProbes} probes ready`;
        setTimeout(() => {
            document.getElementById('probeStatus').textContent = '';
        }, 2000);
        
        console.log('Hub selected:', hub.id, 'with', probeCount, 'total probes,', readyCount, 'ready');
        
        this.uiManager.updateUI();
        this.uiManager.updateProbePanel();
    }

    /**
     * Identify a signal
     */
    collectSignal(signal) {
        console.log('Signal collected:', signal.rarity);

        // Emit events for tutorial
        this.eventBus.emit('signal:clicked');  // For tutorial step 2
        this.eventBus.emit('signal:identified');

        // Canonical collection event (combo chain + SFX) — manual clicks extend
        // the chain; cargo bonuses apply on auto-collections (ComboSystem)
        this.eventBus.emit('signal:collected', {
            manual: true,
            rarity: signal.rarity,
            x: signal.x,
            y: signal.y
        });
        
        // Remove signal from world
        const index = this.gameState.entities.signals.indexOf(signal);
        if (index > -1) {
            this.gameState.entities.signals.splice(index, 1);
        }
        
        // Show exploration modal
        this.showExplorationModal(signal);
    }

    /**
     * Spawn a dark market signal (for testing)
     */
    spawnDarkMarketSignal() {
        let spawnX, spawnY;
        
        // Try to spawn near an active probe first
        const activeProbes = this.gameState.entities.probes.filter(p => p.active && p.waypoints && p.waypoints.length > 0);
        
        if (activeProbes.length > 0) {
            const probe = activeProbes[Math.floor(Math.random() * activeProbes.length)];
            spawnX = probe.current.x + (Math.random() - 0.5) * 200;
            spawnY = probe.current.y + (Math.random() - 0.5) * 200;
        } else if (this.gameState.entities.reconHubs.length > 0) {
            // Fallback: spawn near a hub
            const hub = this.gameState.entities.reconHubs[0];
            spawnX = hub.x + (Math.random() - 0.5) * 300;
            spawnY = hub.y + (Math.random() - 0.5) * 300;
            console.log('No active probes, spawning dark market near hub');
        } else {
            // Last resort: spawn at origin
            spawnX = (Math.random() - 0.5) * 400;
            spawnY = (Math.random() - 0.5) * 400;
            console.log('No probes or hubs, spawning dark market near origin');
        }
        
        const signal = {
            x: spawnX,
            y: spawnY,
            radius: 12,
            rarity: 'dark_market',
            signalType: 'dark_market',
            duration: 30000, // 30 seconds for better testing
            createdAt: Date.now()
        };
        
        this.gameState.entities.signals.push(signal);
        console.log('🌑 Dark Market signal spawned at', spawnX, spawnY);
    }

    /**
     * Open Dark Market shop
     */
    openDarkMarket(signal) {
        console.log('Opening Dark Market...');
        
        // Remove signal from world
        const index = this.gameState.entities.signals.indexOf(signal);
        if (index > -1) {
            this.gameState.entities.signals.splice(index, 1);
        }
        
        // Generate inventory
        this.darkMarketSystem.generateMarketInventory();
        
        // Populate UI
        this.populateDarkMarketUI();
        
        // Show modal
        const modal = document.getElementById('darkMarketModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Open settings modal
     */
    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Open Dark Market for a specific NPC (from dialogue Trade button)
     */
    openDarkMarketForNPC(npcId, npcType) {
        console.log('Opening Dark Market for NPC:', npcId, npcType);

        // Generate NPC-specific inventory
        this.darkMarketSystem.generateNPCInventory(npcId);

        // Populate UI with NPC-specific content
        this.populateNPCDarkMarketUI(npcId, npcType);

        // Show modal
        const modal = document.getElementById('darkMarketModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * Populate Dark Market UI with NPC-specific inventory
     */
    populateNPCDarkMarketUI(npcId, npcType) {
        const container = document.getElementById('darkMarketInventory');
        if (!container) return;

        const inventory = this.darkMarketSystem.currentMarketInventory;
        if (!inventory) return;

        const shellSystem = this.shellSystem;
        const npcConfig = inventory.npcConfig || {};
        const npcTheme = npcType || {};

        // Update modal header with NPC info
        const modalContent = container.closest('.modal-content');
        if (modalContent) {
            // Find or create header section
            let headerSection = modalContent.querySelector('.npc-market-header');
            if (!headerSection) {
                headerSection = document.createElement('div');
                headerSection.className = 'npc-market-header';
                modalContent.insertBefore(headerSection, container);
            }

            const eyeColor = npcTheme.eyeColor || npcConfig.color || '#9400d3';

            headerSection.innerHTML = `
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid ${eyeColor}44;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #222, #0a0a0f); border: 2px solid ${eyeColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px ${eyeColor}44;">
                        <div style="display: flex; gap: 12px;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${eyeColor}; box-shadow: 0 0 10px ${eyeColor};"></div>
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${eyeColor}; box-shadow: 0 0 10px ${eyeColor};"></div>
                        </div>
                    </div>
                    <div style="flex-grow: 1;">
                        <div style="color: ${eyeColor}; font-size: 24px; font-weight: bold; text-shadow: 0 0 10px ${eyeColor}44;">
                            ${npcTheme.name || npcId}
                        </div>
                        <div style="color: #888; font-size: 14px; margin-top: 4px;">
                            ${npcTheme.title || npcConfig.theme || ''}
                        </div>
                        <div style="color: #666; font-size: 12px; margin-top: 8px;">
                            ${npcConfig.description || 'A mysterious merchant...'}
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                    <button class="market-filter-btn active" data-filter="all" style="padding: 8px 16px; background: ${eyeColor}22; border: 1px solid ${eyeColor}; color: ${eyeColor}; border-radius: 4px; cursor: pointer;">All</button>
                    <button class="market-filter-btn" data-filter="probes" style="padding: 8px 16px; background: transparent; border: 1px solid #555; color: #888; border-radius: 4px; cursor: pointer;">Probes</button>
                    <button class="market-filter-btn" data-filter="hubs" style="padding: 8px 16px; background: transparent; border: 1px solid #555; color: #888; border-radius: 4px; cursor: pointer;">Hubs</button>
                    <button class="market-filter-btn" data-filter="miningStations" style="padding: 8px 16px; background: transparent; border: 1px solid #555; color: #888; border-radius: 4px; cursor: pointer;">Stations</button>
                    <button class="market-filter-btn" data-filter="special" style="padding: 8px 16px; background: transparent; border: 1px solid #555; color: #888; border-radius: 4px; cursor: pointer;">Special</button>
                </div>
            `;

            // Add filter click handlers
            headerSection.querySelectorAll('.market-filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    // Update active state
                    headerSection.querySelectorAll('.market-filter-btn').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'transparent';
                        b.style.borderColor = '#555';
                        b.style.color = '#888';
                    });
                    btn.classList.add('active');
                    btn.style.background = `${eyeColor}22`;
                    btn.style.borderColor = eyeColor;
                    btn.style.color = eyeColor;

                    // Filter items
                    this.filterMarketItems(btn.dataset.filter);
                });
            });
        }

        // Build inventory HTML
        let html = '<div class="market-items-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">';

        // Add special reward if available
        if (inventory.specialReward) {
            const special = inventory.specialReward;
            html += this.renderMarketItemCard({
                ...special,
                category: 'special',
                isSpecial: true,
                visual: { color: '#ffd700' },
                rarity: 'epic'
            }, npcConfig.color || '#9400d3');
        }

        // Add all shells
        ['probes', 'hubs', 'miningStations'].forEach(category => {
            const shells = inventory.shells?.[category] || [];
            shells.forEach(shell => {
                html += this.renderMarketItemCard({
                    ...shell,
                    category: category
                }, npcConfig.color || '#9400d3');
            });
        });

        html += '</div>';

        // Add Probethium display
        const currentProbethium = this.gameState.probethium?.current || 0;
        html += `
            <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #333;">
                <span style="color: #888;">Your Probethium:</span>
                <span id="tradeMenuProbethium" style="color: #ffd700; font-weight: bold; margin-left: 8px;">${currentProbethium.toFixed(4)} P</span>
            </div>
        `;

        container.innerHTML = html;

        // Add purchase event listeners
        this.attachMarketPurchaseHandlers();
    }

    /**
     * Render a market item card
     */
    renderMarketItemCard(item, npcColor) {
        const rarityInfo = window.RARITY?.[item.rarity] || { color: '#aaaaaa', name: 'Common' };
        const visualColor = item.visual?.color || rarityInfo.color;

        // Category labels
        const categoryLabels = {
            probes: 'Probe Shell',
            hubs: 'Hub Shell',
            miningStations: 'Station Shell',
            special: 'Special'
        };

        // Format bonuses
        let bonusHtml = '';
        if (item.bonuses && Object.keys(item.bonuses).length > 0) {
            const bonusEntries = Object.entries(item.bonuses).map(([type, value]) => {
                const info = window.BONUS_TYPES?.[type] || { icon: '', label: type, unit: '' };
                return `<div style="color: #88ff88; font-size: 11px;">${info.icon} +${value}${info.unit} ${info.label}</div>`;
            });
            bonusHtml = bonusEntries.join('');
        }

        // Unique badge
        const uniqueBadge = item.isUnique ?
            `<div style="position: absolute; top: 8px; right: 8px; background: ${npcColor}; color: #000; font-size: 10px; padding: 2px 6px; border-radius: 3px; font-weight: bold;">UNIQUE</div>` : '';

        // Preview
        let previewHtml = '';
        if (item.category === 'probes') {
            previewHtml = this.renderProbeSkinPreview(visualColor);
        } else if (item.category === 'hubs') {
            previewHtml = this.renderHubSkinPreview(visualColor);
        } else if (item.category === 'miningStations') {
            previewHtml = this.renderStationSkinPreview(visualColor);
        } else if (item.isSpecial) {
            previewHtml = '<div style="font-size: 40px;">🎁</div>';
        }

        return `
            <div class="market-item-card" data-category="${item.category}" style="
                border: 2px solid ${rarityInfo.color}44;
                border-radius: 8px;
                padding: 15px;
                background: linear-gradient(135deg, ${rarityInfo.color}11, transparent);
                position: relative;
                display: flex;
                flex-direction: column;
                min-height: 220px;
            ">
                ${uniqueBadge}
                <div style="text-align: center; margin-bottom: 10px;">
                    <div style="color: ${rarityInfo.color}; font-size: 10px; text-transform: uppercase; margin-bottom: 4px;">
                        ${rarityInfo.name} ${categoryLabels[item.category] || ''}
                    </div>
                    <div style="color: #fff; font-size: 14px; font-weight: bold;">
                        ${item.name}
                    </div>
                </div>
                <div style="width: 60px; height: 60px; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center;">
                    ${previewHtml}
                </div>
                <div style="flex-grow: 1;">
                    ${bonusHtml || '<div style="color: #666; font-size: 11px; text-align: center;">No stat bonuses</div>'}
                </div>
                <div style="color: #888; font-size: 11px; margin-bottom: 10px; text-align: center;">
                    ${item.description || ''}
                </div>
                <button class="market-buy-btn" data-item-id="${item.id}" data-category="${item.category}" data-is-special="${item.isSpecial || false}" style="
                    background: linear-gradient(135deg, ${rarityInfo.color}44, ${rarityInfo.color}22);
                    border: 1px solid ${rarityInfo.color};
                    color: ${rarityInfo.color};
                    padding: 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                    width: 100%;
                    transition: all 0.2s;
                ">
                    ${item.price} P
                </button>
            </div>
        `;
    }

    /**
     * Render hub skin preview
     */
    renderHubSkinPreview(color) {
        return `
            <svg width="50" height="50" viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="18" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4,2"/>
                <circle cx="25" cy="25" r="10" fill="${color}44" stroke="${color}" stroke-width="2"/>
                <circle cx="25" cy="25" r="4" fill="${color}"/>
            </svg>
        `;
    }

    /**
     * Render mining station skin preview
     */
    renderStationSkinPreview(color) {
        return `
            <svg width="50" height="50" viewBox="0 0 50 50">
                <rect x="15" y="20" width="20" height="20" fill="${color}44" stroke="${color}" stroke-width="2"/>
                <rect x="20" y="10" width="10" height="12" fill="${color}66"/>
                <circle cx="25" cy="30" r="5" fill="${color}"/>
            </svg>
        `;
    }

    /**
     * Filter market items by category
     */
    filterMarketItems(filter) {
        const cards = document.querySelectorAll('.market-item-card');
        cards.forEach(card => {
            const category = card.dataset.category;
            if (filter === 'all' || category === filter) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    /**
     * Attach purchase handlers to market buttons
     */
    attachMarketPurchaseHandlers() {
        document.querySelectorAll('.market-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.itemId;
                const category = btn.dataset.category;
                const isSpecial = btn.dataset.isSpecial === 'true';

                if (isSpecial) {
                    this.purchaseSpecialReward();
                } else {
                    this.purchaseMarketShell(category, itemId);
                }
            });

            // Hover effects
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.02)';
                btn.style.boxShadow = '0 0 10px currentColor';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = 'none';
            });
        });
    }

    /**
     * Purchase a skin from the market
     */
    purchaseMarketShell(category, shellId) {
        const success = this.darkMarketSystem.purchaseShell(category, shellId);
        if (success) {
            // Re-render the market UI
            const npcId = this.darkMarketSystem.currentNPC;
            const npcType = window.NPC_THEMES?.[npcId] || {};
            this.populateNPCDarkMarketUI(npcId, npcType);
        }
    }

    /**
     * Purchase special reward from market
     */
    purchaseSpecialReward() {
        const success = this.darkMarketSystem.purchaseSpecialReward();
        if (success) {
            // Re-render the market UI
            const npcId = this.darkMarketSystem.currentNPC;
            const npcType = window.NPC_THEMES?.[npcId] || {};
            this.populateNPCDarkMarketUI(npcId, npcType);
        }
    }

    /**
     * Start background music
     */
    startMusic() {
        if (this.musicManager) {
            this.musicManager.startMusic();
        }
    }

    /**
     * Populate Dark Market UI with inventory
     */
    populateDarkMarketUI() {
        const container = document.getElementById('darkMarketInventory');
        if (!container) return;
        
        const inventory = this.darkMarketSystem.currentMarketInventory;
        if (!inventory) return;
        
        let html = '';
        
        // Special reward
        const special = inventory.specialReward;
        html += `
            <div style="border: 2px solid #ff0; border-radius: 8px; padding: 15px; background: rgba(255,255,0,0.05); max-width: 100%;">
                <div style="color: #ff0; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
                    ⭐ Special Offer
                </div>
                <div style="color: #fff; font-size: 14px; margin-bottom: 5px; word-wrap: break-word;">${special.name}</div>
                <div style="color: #aaa; font-size: 12px; margin-bottom: 10px; word-wrap: break-word;">${special.description}</div>
                <button class="dark-market-buy-btn" data-item-id="${special.id}" style="background: #ff0; color: #000; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">
                    Buy for ${special.cost} Probethium
                </button>
            </div>
        `;
        
        // Cosmetics
        inventory.cosmetics.forEach(cosmetic => {
            html += `
                <div style="border: 2px solid ${cosmetic.color}; border-radius: 8px; padding: 15px; background: ${cosmetic.color}11; max-width: 100%;">
                    <div style="color: ${cosmetic.color}; font-size: 16px; font-weight: bold; margin-bottom: 10px; word-wrap: break-word;">
                        ${cosmetic.name}
                    </div>
                    <div style="width: 80px; height: 80px; margin: 10px auto; display: flex; align-items: center; justify-content: center;">
                        ${this.renderProbeSkinPreview(cosmetic.color)}
                    </div>
                    <div style="color: #aaa; font-size: 12px; margin-bottom: 10px; word-wrap: break-word;">${cosmetic.description}</div>
                    <button class="dark-market-buy-btn" data-item-id="${cosmetic.id}" style="background: ${cosmetic.color}; color: #000; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%;">
                        Buy for ${cosmetic.cost} Probethium
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add purchase event listeners
        document.querySelectorAll('.dark-market-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.getAttribute('data-item-id');
                this.purchaseDarkMarketItem(itemId);
            });
        });
    }

    /**
     * Render probe skin preview SVG
     */
    renderProbeSkinPreview(color) {
        return `
            <svg width="60" height="60" viewBox="0 0 60 60" style="transform: rotate(45deg);">
                <circle cx="30" cy="30" r="10" fill="${color}" stroke="#fff" stroke-width="2"/>
                <rect x="28" y="10" width="4" height="15" fill="${color}99" stroke="${color}" stroke-width="1"/>
                <rect x="28" y="45" width="4" height="5" fill="${color}99"/>
                <polygon points="40,30 50,25 50,35" fill="${color}"/>
                <line x1="22" y1="27" x2="15" y2="22" stroke="${color}99" stroke-width="2"/>
                <line x1="22" y1="33" x2="15" y2="38" stroke="${color}99" stroke-width="2"/>
            </svg>
        `;
    }

    /**
     * Purchase item from Dark Market
     */
    purchaseDarkMarketItem(itemId) {
        const currentProbethium = this.gameState.getProbethium().current;
        const inventory = this.darkMarketSystem.currentMarketInventory;
        
        // Find the item
        let item = null;
        let itemCost = 0;
        
        if (inventory.specialReward.id === itemId) {
            item = inventory.specialReward;
            itemCost = item.cost;
        } else {
            item = inventory.cosmetics.find(c => c.id === itemId);
            if (item) itemCost = item.cost;
        }
        
        if (!item) {
            console.error('Item not found:', itemId);
            return;
        }
        
        // Check if player has enough Probethium
        if (currentProbethium < itemCost) {
            this.eventBus.emit('ui:message', {
                text: `Not enough Probethium! Need ${itemCost}, have ${currentProbethium.toFixed(2)}`,
                type: 'error'
            });
            return;
        }
        
        // Deduct Probethium
        this.gameState.probethium.current -= itemCost;
        
        // Add item to player's inventory
        if (item.type === 'probe_skin') {
            // Add to cosmetics owned skins
            if (!this.gameState.cosmetics) {
                this.gameState.cosmetics = {
                    ownedSkins: ['default'],
                    activeSkin: 'default'
                };
            }
            
            // Check if already owned
            const skinId = item.id;
            if (!this.gameState.cosmetics.ownedSkins.includes(skinId)) {
                this.gameState.cosmetics.ownedSkins.push(skinId);
                
                // Add to cosmetic manager's catalog if not already there
                if (!this.cosmeticManager.skinCatalog[skinId]) {
                    this.cosmeticManager.skinCatalog[skinId] = {
                        name: item.name,
                        description: item.description,
                        price: item.cost,
                        unlocked: true,
                        design: {
                            bodyColor: item.color,
                            bodyRadius: 4,
                            wingColor: item.color,
                            wingLength: 8,
                            wingWidth: 2,
                            wingGap: 2,
                            frontColor: item.color,
                            frontSize: 4,
                            frontHeight: 2.5,
                            antennaColor: item.color,
                            antennaLength: 6,
                            antennaWidth: 1,
                            antennaAngle: 15,
                            blinkSpeed: 1500,
                            trailEnabled: true,
                            trail: {
                                length: 15,
                                color: item.color,
                                width: 3,
                                opacity: 0.9
                            }
                        }
                    };
                }
                
                this.eventBus.emit('ui:message', {
                    text: `Purchased ${item.name}! Equip it from the cosmetics menu.`,
                    type: 'success'
                });
            } else {
                this.eventBus.emit('ui:message', {
                    text: `You already own ${item.name}!`,
                    type: 'info'
                });
            }
        } else if (item.type === 'resources') {
            const resources = this.gameState.getResources();
            Object.entries(item.contents).forEach(([resource, amount]) => {
                resources[resource] = (resources[resource] || 0) + amount;
            });
            this.gameState.updateResources(resources, this.eventBus);
            this.eventBus.emit('ui:message', {
                text: `Purchased ${item.name}!`,
                type: 'success'
            });
        } else if (item.type === 'equipment') {
            // For now, just show message - equipment system can be expanded later
            this.eventBus.emit('ui:message', {
                text: `Purchased ${item.name}! (Equipment system coming soon)`,
                type: 'success'
            });
        }
        
        // Update UI
        this.uiManager.updateUI();
        
        // Close modal after purchase
        setTimeout(() => {
            const modal = document.getElementById('darkMarketModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }, 1500);
    }

    /**
     * Show exploration modal for signal
     */
    showExplorationModal(signal) {
        // Generate planet data based on signal
        const planet = this.generatePlanet(signal);
        
        // Show exploration screen
        this.showExplorationScreen(planet, signal);
    }

    /**
     * Generate planet data
     */
    generatePlanet(signal) {
        const planetTypes = [
            'Molten', 'Frozen', 'Toxic', 'Desert', 'Ocean', 'Forest', 'Crystal', 'Volcanic'
        ];
        
        const type = planetTypes[Math.floor(Math.random() * planetTypes.length)];
        
        // Generate name using advanced name generator
        const nameGen = new NameGenerator();
        const name = nameGen.generatePlanetName(type);
        
        return {
            name: name,
            type: type,
            rarity: signal.rarity,
            description: `A ${type.toLowerCase()} world with ${signal.rarity} potential for discovery.`
        };
    }

    /**
     * Get color for rarity level
     */
    getRarityColor(rarity) {
        // Rarity ramp lives in the world palette (VISUAL_STYLE.md)
        return window.PALETTE.RARITY[rarity] || window.PALETTE.SIGNAL;
    }

    /**
     * Show exploration screen
     */
    showExplorationScreen(planet, signal) {
        console.log('=== SHOWING EXPLORATION SCREEN ===');
        console.log('Planet:', planet);
        console.log('Signal:', signal);
        
        // Update planet info - show name and type separately
        const planetNameEl = document.getElementById('planetName');
        const planetDescEl = document.getElementById('planetDesc');
        
        console.log('Planet name element:', planetNameEl);
        console.log('Planet desc element:', planetDescEl);
        
        if (planetNameEl) {
            planetNameEl.textContent = `${planet.name} (${planet.type})`;
        } else {
            console.error('planetName element not found!');
        }
        
        if (planetDescEl) {
            // Color-code the rarity text in the description
            const rarityColor = this.getRarityColor(planet.rarity);
            const coloredDescription = planet.description.replace(
                planet.rarity,
                `<span style="color: ${rarityColor}; font-weight: bold;">${planet.rarity}</span>`
            );
            planetDescEl.innerHTML = coloredDescription;
        } else {
            console.error('planetDesc element not found!');
        }
        
        // Store planet data for exploration
        this.currentPlanet = planet;
        this.currentSignal = signal;
        
        // Show exploration screen
        console.log('Calling showScreen with exploreScreen');
        this.showScreen('exploreScreen');
        
        // Highlight best resource options based on planet type
        this.highlightPlanetResources(planet.type);
        
        // Emit event for tutorial (when exploration screen first appears)
        this.eventBus.emit('exploration:screenShown');
        
        // Draw planet on canvas
        this.drawPlanet(planet);
        
        console.log('=== EXPLORATION SCREEN SETUP COMPLETE ===');
    }

    /**
     * Highlight exploration options based on planet type
     */
    highlightPlanetResources(planetType) {
        // Reset all button highlights first
        const exploreButtons = document.querySelectorAll('.explore-btn');
        exploreButtons.forEach(btn => {
            btn.style.border = '1px solid #333';
            btn.style.boxShadow = 'none';
            btn.style.background = '#1a1a1a';
        });
        
        // Define which actions are best for each planet type
        let bestActions = [];
        switch (planetType) {
            case 'Molten':
            case 'Volcanic':
                bestActions = ['excavate']; // Minerals (+50%)
                break;
            case 'Frozen':
                bestActions = ['exterminate', 'expedition']; // Data & Artifacts (+30%)
                break;
            case 'Toxic':
                bestActions = ['excavate']; // Minerals (+40%), less artifacts
                break;
            case 'Desert':
                bestActions = ['excavate']; // Minerals (+30%)
                break;
            case 'Ocean':
                bestActions = ['exterminate']; // Data (+50%)
                break;
            case 'Forest':
                bestActions = ['exterminate', 'expedition']; // Data & Artifacts (+20%)
                break;
            case 'Crystal':
                bestActions = ['excavate', 'expedition']; // Minerals (+20%), Artifacts (+40%)
                break;
        }
        
        // Highlight the best actions with a golden glow
        bestActions.forEach(action => {
            const button = document.querySelector(`[data-mode="${action}"]`);
            if (button) {
                button.style.border = '2px solid #ffd700';
                button.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.5)';
                button.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2a2011 100%)';
            }
        });
    }

    /**
     * Draw planet on canvas
     */
    drawPlanet(planet) {
        const canvas = this.planetCanvas;
        const ctx = this.planetCtx;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 120;
        
        // Planet colors based on type
        const planetColors = {
            'Molten': ['#ff4500', '#ff6347', '#ff8c00'],
            'Frozen': ['#4169e1', '#87ceeb', '#b0e0e6'],
            'Toxic': ['#9acd32', '#32cd32', '#00ff00'],
            'Desert': ['#daa520', '#f4a460', '#d2691e'],
            'Ocean': ['#0000ff', '#4169e1', '#1e90ff'],
            'Forest': ['#228b22', '#32cd32', '#90ee90'],
            'Crystal': ['#da70d6', '#ba55d3', '#9370db'],
            'Volcanic': ['#dc143c', '#b22222', '#8b0000']
        };
        
        const colors = planetColors[planet.type] || ['#696969', '#778899', '#2f4f4f'];
        
        // Draw planet with gradient
        const gradient = ctx.createRadialGradient(centerX - 40, centerY - 40, 0, centerX, centerY, radius);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.5, colors[1]);
        gradient.addColorStop(1, colors[2]);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw some surface features
        ctx.fillStyle = colors[2] + '80';
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5;
            const x = centerX + Math.cos(angle) * (radius * 0.7);
            const y = centerY + Math.sin(angle) * (radius * 0.7);
            const size = 10 + Math.random() * 15;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Show screen
     */
    showScreen(screenId) {
        console.log(`showScreen called with: ${screenId}`);
        
        // Hide all screens
        const allScreens = document.querySelectorAll('.screen');
        console.log(`Found ${allScreens.length} screens`);
        allScreens.forEach(screen => {
            console.log(`Hiding screen: ${screen.id}`);
            screen.classList.remove('active');
            
            // Reset any inline styles we may have added
            if (screen.id !== screenId) {
                screen.style.zIndex = '';
                screen.style.position = '';
                screen.style.top = '';
                screen.style.left = '';
                screen.style.width = '';
                screen.style.height = '';
                screen.style.backgroundColor = '';
                screen.style.overflow = '';
                screen.style.padding = '';
            }
            
            // Force display none
            const computedAfter = window.getComputedStyle(screen);
            console.log(`  ${screen.id} after hiding - display: ${computedAfter.display}`);
        });
        
        // Show selected screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            console.log(`Showing screen: ${screenId}`);
            targetScreen.classList.add('active');
            
            // Only apply special positioning for exploration screen
            if (screenId === 'exploreScreen' || screenId === 'researchScreen') {
                // Force to front but keep resource bar visible
                targetScreen.style.zIndex = '10000';
                targetScreen.style.position = 'fixed';
                targetScreen.style.top = '80px'; // Below resource bar
                targetScreen.style.left = '0';
                targetScreen.style.width = '100vw';
                targetScreen.style.height = 'calc(100vh - 80px)'; // Account for resource bar
                targetScreen.style.backgroundColor = '#000'; // Solid black background
                targetScreen.style.overflow = 'auto'; // Allow scrolling if needed
                targetScreen.style.padding = '20px'; // Add some padding
            }
            
            // Check computed style
            const computedStyle = window.getComputedStyle(targetScreen);
            console.log(`Screen ${screenId} computed display:`, computedStyle.display);
            console.log(`Screen ${screenId} computed visibility:`, computedStyle.visibility);
            console.log(`Screen ${screenId} computed opacity:`, computedStyle.opacity);
            console.log(`Screen ${screenId} computed zIndex:`, computedStyle.zIndex);
            console.log(`Screen ${screenId} classList:`, Array.from(targetScreen.classList));
        } else {
            console.error(`Screen not found: ${screenId}`);
        }
    }

    /**
     * Show sector report modal with all discovered sectors
     */
    showSectorReport() {
        const modal = document.getElementById('sectorModal');
        if (!modal) return;

        const world = this.gameState.getWorld();
        const sectors = [];

        world.sectors.forEach(sector => {
            if (sector.explored) {
                sectors.push(sector);
            }
        });

        if (sectors.length === 0) {
            this.eventBus.emit('ui:message', { text: 'No sectors discovered yet!', type: 'info' });
            return;
        }

        // Sort by discovery order (distance from origin as proxy)
        sectors.sort((a, b) => {
            const distA = Math.abs(a.x) + Math.abs(a.y);
            const distB = Math.abs(b.x) + Math.abs(b.y);
            return distA - distB;
        });

        // Build sector list HTML
        let sectorsHTML = sectors.map(sector => {
            const sectorType = sector.type;
            const distance = Math.sqrt(sector.x * sector.x + sector.y * sector.y).toFixed(1);

            // Color by sector type
            const typeColors = {
                'Standard': '#66f',
                'Resource-Rich': '#fc8',
                'Data Haven': '#6f6',
                'Ancient': '#f6f',
                'Asteroid Field': '#f66'
            };
            const color = typeColors[sectorType.name] || '#aaa';

            // Resource profile info
            const profile = sector.resourceProfile;
            const profileNames = {
                'mineral-rich': 'Mineral-Rich',
                'data-rich': 'Data-Rich',
                'artifact-rich': 'Artifact-Rich',
                'probethium-rich': 'Probethium-Rich',
                'balanced': 'Balanced'
            };
            const profileName = profile ? (profileNames[profile.type] || profile.type) : '—';

            // Probethium indicator
            const hasProbethium = profile && profile.type === 'probethium-rich';

            return `
                <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-bottom: 1px solid #333; cursor: pointer;" onclick="window.game.sectorManager.snapToSector(${sector.x}, ${sector.y}); document.getElementById('sectorModal').classList.remove('active');" title="Click to navigate">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; box-shadow: 0 0 6px ${color}; flex-shrink: 0;"></div>
                    <div style="flex: 1; min-width: 0;">
                        <span style="color: #fff; font-weight: bold;">${sector.name}</span>
                        <span style="color: ${color}; font-size: 12px; margin-left: 6px;">${sectorType.name}</span>
                    </div>
                    <div style="color: #888; font-size: 12px; white-space: nowrap;">
                        ${profileName}${hasProbethium ? ' <span style="color: #ffd700;">★</span>' : ''}
                    </div>
                    <div style="color: #666; font-size: 11px; width: 50px; text-align: right;">
                        ${distance}ly
                    </div>
                </div>
            `;
        }).join('');

        // Build discovery progress (reuse SectorManager logic)
        const foundTypes = new Set();
        sectors.forEach(s => foundTypes.add(s.type.name));
        const sectorTypeInfo = [
            { name: 'Standard', color: '#66f' },
            { name: 'Resource-Rich', color: '#fc8' },
            { name: 'Data Haven', color: '#6f6' },
            { name: 'Ancient', color: '#f6f' },
            { name: 'Asteroid Field', color: '#f66' }
        ];
        const pipsHtml = sectorTypeInfo.map(type => {
            const found = foundTypes.has(type.name);
            return `<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${found ? type.color : '#444'}; opacity: ${found ? '1' : '0.3'}; margin: 0 3px; vertical-align: middle; box-shadow: ${found ? `0 0 6px ${type.color}` : 'none'};" title="${type.name}${found ? ' (found)' : ''}"></span>`;
        }).join('');

        const reportHTML = `
            <h2 style="color: #0ff; text-align: center; margin-bottom: 5px;">SECTOR REPORT</h2>
            <p style="color: #888; text-align: center; margin-bottom: 15px;">
                ${sectors.length} sector${sectors.length !== 1 ? 's' : ''} explored &middot;
                ${foundTypes.size}/5 types found ${pipsHtml}
            </p>

            <div style="max-height: 400px; overflow-y: auto; border: 1px solid #333; border-radius: 6px; margin-bottom: 15px;">
                ${sectorsHTML}
            </div>

            <p style="color: #666; text-align: center; font-size: 12px; font-style: italic;">Click a sector to navigate there</p>
        `;

        const modalContent = document.getElementById('sectorModalContent');
        if (modalContent) {
            let surveyDiv = document.getElementById('sectorSurveyContent');
            if (!surveyDiv) {
                surveyDiv = document.createElement('div');
                surveyDiv.id = 'sectorSurveyContent';
                const okBtn = document.getElementById('sectorOkBtn');
                modalContent.insertBefore(surveyDiv, okBtn);
            }
            surveyDiv.innerHTML = reportHTML;
        }

        // Set button text to "Close"
        const okBtn = document.getElementById('sectorOkBtn');
        if (okBtn) {
            okBtn.textContent = 'Close';
            const newOkBtn = okBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newOkBtn, okBtn);
            newOkBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                // Reset button text for sector discovery usage
                newOkBtn.textContent = 'Continue';
            });
        }

        modal.classList.add('active');
    }

    /**
     * Explore planet with chosen method
     */
    explore(mode) {
        console.log('=== EXPLORE CALLED ===');
        console.log('Mode:', mode);
        console.log('Current planet:', this.currentPlanet);
        console.log('Current signal:', this.currentSignal);
        
        if (!this.currentPlanet || !this.currentSignal) {
            console.error('Missing planet or signal data!');
            return;
        }

        // Emit event for tutorial
        this.eventBus.emit('planet:actionChosen');

        const signal = this.currentSignal;
        const rarity = signal.rarity;

        // Base rewards by rarity
        const baseRewards = {
            common: { minerals: 5, data: 2, artifacts: 1 },
            uncommon: { minerals: 10, data: 5, artifacts: 2 },
            rare: { minerals: 20, data: 10, artifacts: 5 },
            epic: { minerals: 40, data: 20, artifacts: 10 },
            legendary: { minerals: 100, data: 50, artifacts: 25 }
        };

        let rewards = baseRewards[rarity] || baseRewards.common;
        
        // Apply planet type bonuses
        const planet = this.currentPlanet;
        if (planet && planet.type) {
            switch (planet.type) {
                case 'Molten':
                case 'Volcanic':
                    // Hot worlds are rich in minerals (lava/metal extraction)
                    rewards = { ...rewards, minerals: Math.floor(rewards.minerals * 1.5) };
                    break;
                case 'Frozen':
                    // Cold worlds preserve data/artifacts better
                    rewards = { ...rewards, data: Math.floor(rewards.data * 1.3), artifacts: Math.floor(rewards.artifacts * 1.3) };
                    break;
                case 'Toxic':
                    // Toxic worlds have exotic minerals but less artifacts
                    rewards = { ...rewards, minerals: Math.floor(rewards.minerals * 1.4), artifacts: Math.floor(rewards.artifacts * 0.8) };
                    break;
                case 'Desert':
                    // Desert worlds have mineral deposits but little else
                    rewards = { ...rewards, minerals: Math.floor(rewards.minerals * 1.3), data: Math.floor(rewards.data * 0.9) };
                    break;
                case 'Ocean':
                    // Ocean worlds have rich biological data
                    rewards = { ...rewards, data: Math.floor(rewards.data * 1.5) };
                    break;
                case 'Forest':
                    // Forest worlds have balanced biological resources
                    rewards = { ...rewards, data: Math.floor(rewards.data * 1.2), artifacts: Math.floor(rewards.artifacts * 1.2) };
                    break;
                case 'Crystal':
                    // Crystal worlds have pristine artifacts and minerals
                    rewards = { ...rewards, minerals: Math.floor(rewards.minerals * 1.2), artifacts: Math.floor(rewards.artifacts * 1.4) };
                    break;
            }
        }
        
        // Apply signal type bonuses
        if (signal.signalType) {
            switch (signal.signalType) {
                case 'ore_vein':
                    // REW-01: 2x mineral bonus (exclusive advantage over standard 1.5x)
                    rewards = {
                        ...rewards,
                        minerals: Math.floor(rewards.minerals * 2.0)
                    };
                    break;

                case 'data_cache':
                    // REW-02: 2x data bonus (exclusive advantage over standard 1.5x)
                    rewards = {
                        ...rewards,
                        data: Math.floor(rewards.data * 2.0)
                    };
                    break;

                case 'relic':
                    // REW-03: 2x artifact bonus (relic signals also have rarity gating in ProbeManager)
                    rewards = {
                        ...rewards,
                        artifacts: Math.floor(rewards.artifacts * 2.0)
                    };
                    break;

                case 'exotic_crystal':
                    // REW-04: 60% enhanced exotic minerals, 40% all three resources at once
                    if (Math.random() < 0.6) {
                        // Outcome 1: Enhanced exotic yield (handled below in exotic bonus section)
                        // Mark for exotic enhancement - no base reward change needed
                        signal._exoticEnhanced = true;
                    } else {
                        // Outcome 2: Mixed reward - boost all three resource types by 1.5x
                        // The exploration mode will still pick one primary, but we'll add secondary rewards too
                        signal._mixedReward = true;
                        rewards = {
                            minerals: Math.floor(rewards.minerals * 1.5),
                            data: Math.floor(rewards.data * 1.5),
                            artifacts: Math.floor(rewards.artifacts * 1.5)
                        };
                    }
                    break;

                case 'mineral':
                    // 50% bonus to mineral rewards
                    rewards = {
                        ...rewards,
                        minerals: Math.floor(rewards.minerals * 1.5)
                    };
                    break;
                case 'data':
                    // 50% bonus to data rewards
                    rewards = {
                        ...rewards,
                        data: Math.floor(rewards.data * 1.5)
                    };
                    break;
                case 'artifact':
                    // 50% bonus to artifact rewards
                    rewards = {
                        ...rewards,
                        artifacts: Math.floor(rewards.artifacts * 1.5)
                    };
                    break;
            }
        }
        
        let primaryReward = '';
        let rewardAmount = 0;

        // Determine reward based on exploration mode
        switch (mode) {
            case 'excavate':
                primaryReward = 'minerals';
                rewardAmount = rewards.minerals + Math.floor(Math.random() * rewards.minerals);
                break;
            case 'exterminate':
                primaryReward = 'data';
                rewardAmount = rewards.data + Math.floor(Math.random() * rewards.data);
                break;
            case 'expedition':
                primaryReward = 'artifacts';
                rewardAmount = rewards.artifacts + Math.floor(Math.random() * rewards.artifacts);
                break;
        }

        // REW-04: Exotic Crystal mixed reward - add secondary resources to cargo
        let secondaryRewards = null;
        if (signal._mixedReward) {
            // Calculate secondary resource amounts (same formula as primary: base + 0-100% random)
            secondaryRewards = {};
            if (primaryReward !== 'minerals') {
                secondaryRewards.minerals = rewards.minerals + Math.floor(Math.random() * rewards.minerals);
            }
            if (primaryReward !== 'data') {
                secondaryRewards.data = rewards.data + Math.floor(Math.random() * rewards.data);
            }
            if (primaryReward !== 'artifacts') {
                secondaryRewards.artifacts = rewards.artifacts + Math.floor(Math.random() * rewards.artifacts);
            }
        }

        // Add bonus exotic minerals for rare+ signals
        let exoticBonus = 0;
        if (rarity === 'rare') exoticBonus = 1;
        else if (rarity === 'epic') exoticBonus = 3;
        else if (rarity === 'legendary') exoticBonus = 10;

        // REW-04: Exotic Crystal enhances exotic mineral yield (60% outcome)
        if (signal._exoticEnhanced && exoticBonus > 0) {
            exoticBonus = Math.floor(exoticBonus * 2.0);
        }

        // Find nearest active probe to store the rewards
        console.log('Finding nearest probe to signal position:', signal.x, signal.y);
        const nearestProbe = this.findNearestActiveProbe(signal.x, signal.y);
        console.log('Nearest probe found:', nearestProbe ? nearestProbe.id : 'NONE');
        
        if (nearestProbe) {
            // Initialize cargo if it doesn't exist
            if (!nearestProbe.cargo) {
                console.log('Initializing cargo for probe:', nearestProbe.id);
                nearestProbe.cargo = {
                    minerals: 0,
                    data: 0,
                    artifacts: 0,
                    exoticMinerals: 0
                };
            }
            
            // Check cargo capacity
            const cargoUsed = this.probeManager.getCargoUsed(nearestProbe);
            const cargoCapacity = this.probeManager.getCargoCapacity(nearestProbe);
            let secondaryTotal = 0;
            if (secondaryRewards) {
                secondaryTotal = Object.values(secondaryRewards).reduce((sum, v) => sum + v, 0);
            }
            const totalReward = rewardAmount + (exoticBonus || 0) + secondaryTotal;
            
            if (cargoUsed + totalReward > cargoCapacity) {
                // CARGO FULL - cannot collect
                console.warn(`Probe ${nearestProbe.id} cargo full! ${cargoUsed}/${cargoCapacity}, needed ${totalReward} more`);
                
                this.eventBus.emit('ui:message', {
                    text: `Probe ${nearestProbe.id} cargo full! (${cargoUsed}/${cargoCapacity})\nCannot collect ${totalReward} units.\nReturn to hub or equip Cargo Expander.`,
                    type: 'warning',
                    duration: 5000
                });
                
                // Don't collect - signal remains on map
                this.showScreen('mapScreen');
                return;
            }
            
            console.log('Cargo before adding rewards:', nearestProbe.cargo);
            
            // Add rewards to probe's cargo
            nearestProbe.cargo[primaryReward] += rewardAmount;
            if (exoticBonus > 0) {
                nearestProbe.cargo.exoticMinerals += exoticBonus;
            }

            // REW-04: Add secondary resources for exotic crystal mixed reward
            if (secondaryRewards) {
                for (const [resource, amount] of Object.entries(secondaryRewards)) {
                    nearestProbe.cargo[resource] = (nearestProbe.cargo[resource] || 0) + amount;
                }
            }
            
            console.log('Cargo after adding rewards:', nearestProbe.cargo);
            console.log(`Added ${rewardAmount} ${primaryReward} to probe ${nearestProbe.id}`);
            console.log(`Cargo now: ${cargoUsed + totalReward}/${cargoCapacity}`);
            
            // Update Probethium stats
            this.gameState.updateProbethiumStats('signal_identified');
            this.gameState.updateProbethiumStats('resource_gathered', { amount: rewardAmount + exoticBonus });
            
            console.log(`Probe ${nearestProbe.id} carrying cargo:`, nearestProbe.cargo);
        } else {
            console.warn('No active probe found to carry rewards!');
        }

        // Show reward message (but don't apply to inventory yet)
        let rewardText = `+${rewardAmount} ${primaryReward.charAt(0).toUpperCase() + primaryReward.slice(1)}`;
        if (exoticBonus > 0) {
            rewardText += `, +${exoticBonus} Exotic Minerals`;
        }
        // Add secondary rewards to display text (exotic crystal mixed)
        if (secondaryRewards) {
            for (const [resource, amount] of Object.entries(secondaryRewards)) {
                rewardText += `, +${amount} ${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
            }
        }
        rewardText += ' (pending delivery)';

        console.log(`Exploration reward stored: ${rewardText}`);

        // Show reward modal
        this.showRewardModal(rewardText, mode);

        // Close explore screen and return to map immediately
        this.showScreen('mapScreen');

        // Clear current planet data
        this.currentPlanet = null;
        this.currentSignal = null;

        // Update UI since we're back on the map
        this.uiManager.updateUI();
    }

    /**
     * Show reward modal
     */
    showRewardModal(rewardText, mode) {
        const modal = document.getElementById('rewardModal');
        const title = document.getElementById('rewardTitle');
        const details = document.getElementById('rewardDetails');

        const modeNames = {
            excavate: 'Excavation Complete!',
            exterminate: 'Hunt Successful!', 
            expedition: 'Expedition Complete!'
        };

        title.textContent = modeNames[mode] || 'Exploration Complete!';
        details.innerHTML = `<div style="font-size: 18px; color: #0f0;">${rewardText}</div>
                            <div style="font-size: 14px; color: #ff0; margin-top: 10px;">Resources will be delivered when probe returns to hub</div>`;

        modal.classList.add('active');

        // Modal will only close when user clicks the "Collect" button
        // (handled by the click event listener in setupEventListeners)
    }

    /**
     * Place a recon hub
     */
    placeReconHub(x, y) {
        const resources = this.gameState.getResources();
        if (resources.minerals < 100) return;

        const world = this.gameState.getWorld();
        const sectorX = Math.floor(x / world.standardSectorWidth);
        const sectorY = Math.floor(y / world.standardSectorHeight);
        
        // Initialize sector if it doesn't exist
        this.initializeSector(sectorX, sectorY);
        const sector = world.sectors.get(`${sectorX},${sectorY}`);
        
        const hub = {
            id: `hub_${sectorX}_${sectorY}_${Date.now()}`,
            x: x,
            y: y,
            sector: { x: sectorX, y: sectorY },
            range: world.standardSectorWidth / 3,
            maxProbes: 5,
            selected: false
        };
        
        this.gameState.entities.reconHubs.push(hub);
        sector.hubs.push(hub);
        
        // Deduct resources
        this.gameState.updateResources({ minerals: resources.minerals - 100 }, this.eventBus);
        
        // Exit placement mode
        this.gameState.ui.hubPlacementMode = false;
        this.canvas.style.cursor = 'grab';
        
        document.getElementById('probeStatus').textContent = 'Recon Hub built!';
        setTimeout(() => {
            document.getElementById('probeStatus').textContent = '';
        }, 2000);
        
        this.uiManager.updateUI();
    }



    /**
     * Place a shuttle by clicking on a mining station
     */
    placeShuttle(worldX, worldY) {
        const selectedHub = this.gameState.ui.selectedHub;
        console.log('placeShuttle called - selectedHub:', selectedHub?.id, 'at position:', worldX, worldY);
        
        if (!selectedHub) {
            console.log('No selected hub for shuttle placement');
            return;
        }
        
        // Find clicked mining station (within large radius for easy clicking)
        let clickedStation = null;
        if (this.gameState.mining && this.gameState.mining.stations) {
            clickedStation = this.gameState.mining.stations.find(station => {
                const distance = Math.sqrt(
                    Math.pow(station.position.x - worldX, 2) + 
                    Math.pow(station.position.y - worldY, 2)
                );
                return distance <= 60; // Large click radius for better UX
            });
        }
        
        if (!clickedStation) {
            this.eventBus.emit('ui:message', { 
                text: 'Click directly on a mining station to connect shuttle!', 
                type: 'error' 
            });
            return;
        }
        
        // Check if there's already a shuttle for this hub-station pair
        const existingShuttle = this.gameState.mining.shuttles.find(shuttle => 
            shuttle.hubId === selectedHub.id && shuttle.stationId === clickedStation.id
        );
        
        if (existingShuttle) {
            this.eventBus.emit('ui:message', { 
                text: 'Shuttle already exists between this hub and station!', 
                type: 'error' 
            });
            return;
        }
        
        // Build the shuttle
        this.eventBus.emit('mining:buildShuttle', {
            hubId: selectedHub.id,
            stationId: clickedStation.id
        });
        
        // Exit placement mode
        this.gameState.ui.shuttlePlacementMode = false;
        this.canvas.style.cursor = 'grab';
        document.getElementById('probeStatus').textContent = '';
    }

    /**
     * Connect a shuttle from station to hub (reverse of placeShuttle)
     */
    connectShuttle(worldX, worldY) {
        const selectedStation = this.gameState.ui.selectedStation;
        console.log('connectShuttle called - selectedStation:', selectedStation?.id, 'at position:', worldX, worldY);
        
        if (!selectedStation) {
            console.log('No selected station for shuttle connection');
            return;
        }
        
        // Find clicked hub (within 50 pixel radius)
        const clickedHub = this.findHubAt(worldX, worldY);
        
        if (!clickedHub) {
            this.eventBus.emit('ui:message', { 
                text: 'Click directly on a hub to connect shuttle!', 
                type: 'error' 
            });
            return;
        }
        
        // Check if there's already a shuttle for this hub-station pair
        const existingShuttle = this.gameState.mining.shuttles.find(shuttle => 
            shuttle.hubId === clickedHub.id && shuttle.stationId === selectedStation.id
        );
        
        if (existingShuttle) {
            this.eventBus.emit('ui:message', { 
                text: 'Shuttle already exists between this hub and station!', 
                type: 'error' 
            });
            // Exit connection mode
            this.gameState.ui.shuttleConnectionMode = false;
            this.canvas.style.cursor = 'grab';
            document.getElementById('probeStatus').textContent = '';
            return;
        }
        
        // Create the shuttle using MiningManager
        this.eventBus.emit('mining:buildShuttle', {
            hubId: clickedHub.id,
            stationId: selectedStation.id
        });
        
        // Exit connection mode
        this.gameState.ui.shuttleConnectionMode = false;
        this.gameState.ui.selectedStation = null;
        this.canvas.style.cursor = 'grab';
        document.getElementById('probeStatus').textContent = '';
    }

    /**
     * Update cursor based on what's under mouse
     */
    updateCursor(worldX, worldY) {
        if (this.gameState.ui.deployMode || this.gameState.ui.hubPlacementMode || 
            this.gameState.ui.miningPlacementMode || this.gameState.ui.shuttlePlacementMode ||
            this.gameState.ui.shuttleConnectionMode) {
            this.canvas.style.cursor = 'crosshair';
            return;
        }
        
        if (this.buildingSystem.isBuildingMode()) {
            this.canvas.style.cursor = 'crosshair';
            return;
        }

        // Check if hovering over clickable elements
        const overHub = this.findHubAt(worldX, worldY);
        const overProbe = this.findProbeAt(worldX, worldY);
        const overSignal = this.findSignalAt(worldX, worldY);
        
        if (overHub || overProbe || overSignal) {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'grab';
        }
    }

    /**
     * Find signals within a circular area
     */
    findSignalsInArea(centerX, centerY, radius) {
        return this.gameState.entities.signals.filter(signal => {
            const distance = Math.sqrt(
                Math.pow(centerX - signal.x, 2) + 
                Math.pow(centerY - signal.y, 2)
            );
            return distance <= radius;
        });
    }

    /**
     * Find signals within a rectangular selection area
     */
    findSignalsInRectangle(x1, y1, x2, y2) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        
        return this.gameState.entities.signals.filter(signal => {
            return signal.x >= minX && signal.x <= maxX && 
                   signal.y >= minY && signal.y <= maxY;
        });
    }

    /**
     * Complete signal selection and identify selected signals
     */
    completeSignalSelection() {
        if (!this.gameState.input.selectionStart || !this.gameState.input.selectionEnd) {
            return;
        }
        
        const selectedSignals = this.findSignalsInRectangle(
            this.gameState.input.selectionStart.x,
            this.gameState.input.selectionStart.y,
            this.gameState.input.selectionEnd.x,
            this.gameState.input.selectionEnd.y
        );
        
        console.log(`Selected ${selectedSignals.length} signals for identification`);
        
        // Identify all selected signals
        selectedSignals.forEach(signal => {
            this.collectSignal(signal);
        });
        
        if (selectedSignals.length > 0) {
            this.eventBus.emit('ui:message', { 
                text: `Security scan complete: ${selectedSignals.length} anomal${selectedSignals.length === 1 ? 'y' : 'ies'} detected`, 
                type: 'success' 
            });
        }
    }

    /**
     * Main game loop
     */
    gameLoop(currentTime = 0) {
        // Clamp raw delta so tab-switches don't teleport probes, then apply time scale
        const rawDelta = Math.min(currentTime - this.lastTime, window.GAME_CONSTANTS.TIME.MAX_FRAME_DELTA);
        this.lastTime = currentTime;
        const deltaTime = Math.max(0, rawDelta) * this.timeScale;

        // Advance signal sim-time ages (supports pause/speed; replaces wall-clock aging)
        this.gameState.entities.signals.forEach(signal => {
            signal.age = (signal.age || 0) + deltaTime;
        });

        // Update game systems
        this.eventBus.emit('game:update', { deltaTime });

        // Update Probethium accumulation
        this.gameState.calculateProbethium(deltaTime);

        // Clean up expired signals
        this.cleanupExpiredSignals();
        
        // Update resource indicators
        this.updateResourceIndicators(deltaTime);
        
        // Emit render event for minimap
        this.eventBus.emit('game:render');
        
        // Also add debug logging for probe updates
        if (deltaTime > 0 && Math.random() < 0.005) { // Less frequent logging
            const activeProbes = this.gameState.entities.probes.filter(p => p.active && p.waypoints && p.waypoints.length > 0);
            const totalSignals = this.gameState.entities.signals.length;
            if (activeProbes.length > 0) {
                console.log(`Game loop: ${activeProbes.length} active probes, ${totalSignals} signals, deltaTime: ${deltaTime}ms`);
            }
        }
        
        // Update camera if locked to probe
        if (this.gameState.ui.cameraLocked && this.gameState.ui.lockedProbe) {
            this.centerCameraOnProbe(this.gameState.ui.lockedProbe);
        }

        // Probe detail panel positioning now handled by DetailsPanel.js

        // Update synthesis animation
        this.synthesisAnimation.update(deltaTime);

        // Update cargo sparks (sim-time)
        this.cargoSparkSystem.update(deltaTime);

        // Render
        this.render();
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * Center camera on probe
     */
    centerCameraOnProbe(probe) {
        const targetX = probe.current.x - this.canvas.width / 2;
        const targetY = probe.current.y - this.canvas.height / 2;
        
        // Smooth camera movement
        const lerpFactor = 0.05;
        this.gameState.world.viewOffset.x += (targetX - this.gameState.world.viewOffset.x) * lerpFactor;
        this.gameState.world.viewOffset.y += (targetY - this.gameState.world.viewOffset.y) * lerpFactor;
    }

    /**
     * Render the game
     */
    render() {
        // Clear canvas — violet near-black ground, never pure black
        this.ctx.fillStyle = window.PALETTE.VOID;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context and apply zoom
        this.ctx.save();
        this.ctx.scale(this.gameState.world.zoomLevel, this.gameState.world.zoomLevel);

        // Apply screen shake from synthesis animation
        const shakeOffset = this.synthesisAnimation.getShakeOffset();
        this.ctx.translate(shakeOffset.x, shakeOffset.y);

        // Render stars
        this.renderStars();
        
        // Render entities
        this.renderProbes();
        this.renderHubs();
        this.renderSignals();
        this.renderResourceIndicators();
        this.renderSectorBoundaries();
        this.renderBuildings();
        this.renderMiningStations();
        this.renderShuttles();

        // Cargo sparks ride above the network they illuminate
        this.cargoSparkSystem.render(this.ctx, this.gameState.world.viewOffset);

        // Render Remnant NPCs
        if (this.remnantManager) {
            this.remnantManager.render(this.ctx);
        }

        // Render building preview
        if (this.buildingSystem.getBuildingPreview()) {
            this.renderBuildingPreview(this.buildingSystem.getBuildingPreview());
        }
        
        
        // Render UI overlays
        if (this.gameState.ui.deployMode) {
            this.renderDeploymentOverlay();
        }
        
        // Render deployment preview lines
        if (this.gameState.ui.deployMode && this.gameState.ui.selectedHub) {
            this.renderDeploymentPreview();
        }

        // Render synthesis animation
        this.synthesisAnimation.render(this.ctx, this.gameState.world.viewOffset);

        // Restore context
        this.ctx.restore();
    }

    /**
     * Render stars
     */
    renderStars() {
        this.ctx.fillStyle = 'rgba(139, 132, 163, 0.4)';
        this.gameState.entities.stars.forEach(star => {
            const x = star.x - this.gameState.world.viewOffset.x;
            const y = star.y - this.gameState.world.viewOffset.y;
            
            if (x >= -10 && x <= this.canvas.width + 10 && 
                y >= -10 && y <= this.canvas.height + 10) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, star.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }

    /**
     * Render probes
     */
    renderProbes() {
        // First pass: Draw all probe paths (background layer)
        this.gameState.entities.probes.forEach(probe => {
            if (!probe.active) return;
            
            // Draw path for all probes with waypoints (behind probe)
            if (probe.waypoints && probe.waypoints.length > 1) {
                this.renderProbePath(probe);
            }
        });
        
        // Second pass: Draw all probes (foreground layer)
        this.gameState.entities.probes.forEach(probe => {
            if (!probe.active) return;
            
            const screenX = probe.current.x - this.gameState.world.viewOffset.x;
            const screenY = probe.current.y - this.gameState.world.viewOffset.y;
            
            // Draw probe with status-based coloring
            // Only show as returning (orange) when on the final return segment
            const isOnReturnSegment = probe.outboundWaypointsCount && 
                                    probe.currentWaypoint >= probe.waypoints.length - 2;
            // Signal-white body; gold when carrying value home (gold = what you earned)
            let probeColor = window.PALETTE.PROBE_BODY;

            if (probe === this.gameState.ui.selectedProbe) {
                probeColor = window.PALETTE.FIRE_BRIGHT;
            } else if (isOnReturnSegment) {
                probeColor = window.PALETTE.FIRE;
            }
            
            // Draw trail effect if enabled
            if (probe.cosmetic && probe.cosmetic.trailEnabled) {
                this.drawProbeTrail(probe, screenX, screenY);
            }
            
            // Calculate probe rotation based on movement direction
            let probeAngle = 0;
            if (probe.waypoints && probe.currentWaypoint < probe.waypoints.length - 1) {
                // Get current and next waypoint to determine direction
                const currentWaypoint = probe.waypoints[probe.currentWaypoint];
                const nextWaypoint = probe.waypoints[probe.currentWaypoint + 1];
                
                if (currentWaypoint && nextWaypoint) {
                    const dx = nextWaypoint.x - currentWaypoint.x;
                    const dy = nextWaypoint.y - currentWaypoint.y;
                    probeAngle = Math.atan2(dy, dx);
                }
            }
            
            // Save context and apply rotation
            this.ctx.save();
            this.ctx.translate(screenX, screenY);
            this.ctx.rotate(probeAngle);
            
            // Draw probe components (all relative to origin now)
            const skin = probe.cosmetic || null;
            this.drawProbeComponents(probeColor, skin);
            
            // Restore context
            this.ctx.restore();
            
            // Draw radar pulses
            probe.radarPulses.forEach(pulse => {
                const pulseX = pulse.x - this.gameState.world.viewOffset.x;
                const pulseY = pulse.y - this.gameState.world.viewOffset.y;
                
                this.ctx.strokeStyle = `rgba(212, 175, 55, ${(1 - pulse.elapsed / pulse.duration) * 0.6})`;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(pulseX, pulseY, pulse.radius, 0, Math.PI * 2);
                this.ctx.stroke();
            });
        });
    }

    /**
     * Draw individual probe components (body, wings, front, antenna)
     * All drawing is relative to origin (0,0) which is the probe center
     * @param {string} probeColor - Base color for the probe
     * @param {Object} skin - Optional cosmetic skin data
     */
    drawProbeComponents(probeColor, skin = null) {
        const time = Date.now();
        const blinkCycle = skin?.blinkSpeed || 1500; // Customizable blink speed
        const blinkPhase = (time % blinkCycle) / blinkCycle;
        const componentAlpha = 0.6 + 0.4 * Math.abs(Math.sin(blinkPhase * Math.PI * 2));

        // Apply glow effect if shell has it enabled
        if (skin?.glow) {
            const glowColor = skin.bodyColor || probeColor;
            this.ctx.shadowColor = glowColor;
            this.ctx.shadowBlur = 12;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        }

        // Apply skin overrides
        const bodyColor = skin?.bodyColor || probeColor;
        const wingColorBase = skin?.wingColor || probeColor;
        const antennaColorBase = skin?.antennaColor || probeColor;
        const frontColor = skin?.frontColor || probeColor;
        
        // Convert hex colors to rgba for alpha blending
        let wingColor = wingColorBase;
        if (wingColorBase === '#0ff') wingColor = `rgba(0,255,255,${componentAlpha})`;
        else if (wingColorBase === '#ff0') wingColor = `rgba(255,255,0,${componentAlpha})`;
        else if (wingColorBase === '#ffa500') wingColor = `rgba(255,165,0,${componentAlpha})`;
        else if (wingColorBase === '#ff8c00') wingColor = `rgba(255,140,0,${componentAlpha})`;
        else if (wingColorBase.startsWith('#')) {
            // Handle custom hex colors
            const r = parseInt(wingColorBase.slice(1, 3), 16);
            const g = parseInt(wingColorBase.slice(3, 5), 16);
            const b = parseInt(wingColorBase.slice(5, 7), 16);
            wingColor = `rgba(${r},${g},${b},${componentAlpha})`;
        }
        
        let antennaColor = antennaColorBase;
        if (antennaColorBase.startsWith('#')) {
            const r = parseInt(antennaColorBase.slice(1, 3), 16);
            const g = parseInt(antennaColorBase.slice(3, 5), 16);
            const b = parseInt(antennaColorBase.slice(5, 7), 16);
            antennaColor = `rgba(${r},${g},${b},${componentAlpha})`;
        }
        
        // 1. Draw main body (circular center)
        const bodyRadius = skin?.bodyRadius || 4;
        
        this.ctx.fillStyle = bodyColor;
        this.ctx.strokeStyle = bodyColor;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, bodyRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 2. Draw wings (extending perpendicular to travel direction, detached from body)
        const wingLength = skin?.wingLength || 8;
        const wingWidth = skin?.wingWidth || 2;
        const wingGap = skin?.wingGap || 2; // Small gap between body and wings
        
        this.ctx.fillStyle = wingColor;
        this.ctx.strokeStyle = bodyColor;
        this.ctx.lineWidth = 1;
        
        // Top wing (extending perpendicular upward from body with gap)
        this.ctx.beginPath();
        this.ctx.rect(-wingWidth/2, -bodyRadius - wingGap - wingLength, wingWidth, wingLength);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Bottom wing (extending perpendicular downward from body with gap) 
        this.ctx.beginPath();
        this.ctx.rect(-wingWidth/2, bodyRadius + wingGap, wingWidth, wingLength);
        this.ctx.fill();
        this.ctx.stroke();
        
        // 3. Draw front (triangular nose - bigger and overlapping into body)
        const frontSize = skin?.frontSize || 4; // Made significantly bigger
        const frontHeight = skin?.frontHeight || 2.5; // Taller triangle
        this.ctx.fillStyle = frontColor;
        this.ctx.beginPath();
        this.ctx.moveTo(bodyRadius - 1, 0); // Start inside the body to hide connection
        this.ctx.lineTo(bodyRadius + frontSize, -frontHeight); // Top point
        this.ctx.lineTo(bodyRadius + frontSize, frontHeight); // Bottom point
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // 4. Draw antennas (angled outward to avoid trail overlap)
        const antennaLength = skin?.antennaLength || 6;
        const antennaAngle = skin?.antennaAngle || 15; // 15 degrees outward angle
        this.ctx.strokeStyle = antennaColor;
        this.ctx.lineWidth = skin?.antennaWidth || 1;
        
        // Convert angle to radians
        const angleRad = (antennaAngle * Math.PI) / 180;
        
        // Upper antenna (angled upward and back)
        this.ctx.beginPath();
        this.ctx.moveTo(-bodyRadius, -1);
        this.ctx.lineTo(
            -bodyRadius - antennaLength * Math.cos(angleRad), 
            -1 - antennaLength * Math.sin(angleRad)
        );
        this.ctx.stroke();
        
        // Lower antenna (angled downward and back)
        this.ctx.beginPath();
        this.ctx.moveTo(-bodyRadius, 1);
        this.ctx.lineTo(
            -bodyRadius - antennaLength * Math.cos(angleRad),
            1 + antennaLength * Math.sin(angleRad)
        );
        this.ctx.stroke();

        // Reset shadow/glow
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
    }

    /**
     * Draw trail effect for probe
     * @param {Object} probe - The probe object
     * @param {number} screenX - Screen X position of probe
     * @param {number} screenY - Screen Y position of probe
     */
    drawProbeTrail(probe, screenX, screenY) {
        // Initialize trail array if it doesn't exist
        if (!probe.trail) {
            probe.trail = [];
        }
        
        const trailConfig = probe.cosmetic.trail || {};
        const maxTrailLength = trailConfig.length || 15;
        const trailColor = trailConfig.color || probe.cosmetic.bodyColor || window.PALETTE.PROBE_BODY;
        const trailWidth = trailConfig.width || 2;
        const trailOpacity = trailConfig.opacity || 0.45;
        
        // Add current position to trail (only if moved enough distance)
        const minTrailDistance = 3; // Minimum distance between trail points
        let shouldAddPoint = true;
        
        if (probe.trail.length > 0) {
            const lastPoint = probe.trail[probe.trail.length - 1];
            const distance = Math.sqrt(
                Math.pow(probe.current.x - lastPoint.x, 2) + 
                Math.pow(probe.current.y - lastPoint.y, 2)
            );
            shouldAddPoint = distance >= minTrailDistance;
        }
        
        if (shouldAddPoint) {
            probe.trail.push({
                x: probe.current.x,
                y: probe.current.y,
                time: Date.now()
            });
        }
        
        // Remove old trail points
        if (probe.trail.length > maxTrailLength) {
            probe.trail = probe.trail.slice(-maxTrailLength);
        }
        
        // Draw trail
        if (probe.trail.length > 1) {
            this.ctx.lineWidth = trailWidth;
            this.ctx.lineCap = 'round';
            
            for (let i = 1; i < probe.trail.length; i++) {
                const point = probe.trail[i];
                const prevPoint = probe.trail[i - 1];
                
                // Calculate fade based on position in trail
                const fadeRatio = i / probe.trail.length;
                const alpha = (trailOpacity * fadeRatio).toFixed(2);
                
                // Convert hex to rgba
                let rgba;
                if (trailColor.startsWith('#')) {
                    const r = parseInt(trailColor.slice(1, 3), 16);
                    const g = parseInt(trailColor.slice(3, 5), 16);
                    const b = parseInt(trailColor.slice(5, 7), 16);
                    rgba = `rgba(${r},${g},${b},${alpha})`;
                } else {
                    rgba = `rgba(232,228,240,${alpha})`; // Default violet-white
                }
                
                this.ctx.strokeStyle = rgba;
                
                // Convert world coordinates to screen coordinates
                const x1 = prevPoint.x - this.gameState.world.viewOffset.x;
                const y1 = prevPoint.y - this.gameState.world.viewOffset.y;
                const x2 = point.x - this.gameState.world.viewOffset.x;
                const y2 = point.y - this.gameState.world.viewOffset.y;
                
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        }
    }

    /**
     * Render probe path
     */
    renderProbePath(probe) {
        if (!probe.waypoints || probe.waypoints.length < 2) return;
        
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        // Hairline gold routes; the return leg (value coming home) reads brighter
        const selectedColors = { exploration: 'rgba(255, 215, 0, 0.85)', return: 'rgba(255, 215, 0, 0.85)' };
        const unselectedColors = { exploration: 'rgba(212, 175, 55, 0.28)', return: 'rgba(212, 175, 55, 0.45)' };
        const colors = probe === this.gameState.ui.selectedProbe ? selectedColors : unselectedColors;
        
        // Draw each segment individually with appropriate coloring
        for (let i = 0; i < probe.waypoints.length - 1; i++) {
            const start = probe.waypoints[i];
            const end = probe.waypoints[i + 1];
            
            const startX = start.x - this.gameState.world.viewOffset.x;
            const startY = start.y - this.gameState.world.viewOffset.y;
            const endX = end.x - this.gameState.world.viewOffset.x;
            const endY = end.y - this.gameState.world.viewOffset.y;
            
            // Determine if this segment is part of the return journey
            // Return journey starts after outbound waypoints are complete
            const isReturnSegment = probe.outboundWaypointsCount && i >= probe.outboundWaypointsCount - 1;
            
            // Debug coloring logic occasionally
            if (Math.random() < 0.01 && probe.waypoints.length > 2) {
                console.log(`Probe ${probe.id} segment ${i}: outboundCount=${probe.outboundWaypointsCount}, isReturn=${isReturnSegment}, totalSegments=${probe.waypoints.length - 1}`);
            }
            
            // Set color for this segment
            this.ctx.strokeStyle = isReturnSegment ? colors.return : colors.exploration;
            
            // Draw this segment
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }
        
        this.ctx.setLineDash([]);
        
        // Draw waypoint markers
        if (probe === this.gameState.ui.selectedProbe) {
            probe.waypoints.forEach((waypoint, index) => {
                if (index === 0 || index === probe.waypoints.length - 1) return; // Skip hub positions
                
                const waypointX = waypoint.x - this.gameState.world.viewOffset.x;
                const waypointY = waypoint.y - this.gameState.world.viewOffset.y;
                
                this.ctx.fillStyle = 'rgba(212, 175, 55, 0.7)';
                this.ctx.beginPath();
                this.ctx.arc(waypointX, waypointY, 4, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = window.PALETTE.FIRE;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            });
        }
    }

    /**
     * Render hubs
     */
    renderHubs() {
        this.gameState.entities.reconHubs.forEach(hub => {
            const screenX = hub.x - this.gameState.world.viewOffset.x;
            const screenY = hub.y - this.gameState.world.viewOffset.y;
            
            // Draw range circle if selected
            if (hub.selected) {
                this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([10, 10]);
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, hub.range, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            // Hub icon — thin gold hexagon stroke over near-void fill (the network is gold)
            this.ctx.strokeStyle = hub.selected ? window.PALETTE.FIRE_BRIGHT : window.PALETTE.FIRE;
            this.ctx.fillStyle = hub.selected ? 'rgba(212, 175, 55, 0.12)' : 'rgba(7, 6, 11, 0.7)';
            this.ctx.lineWidth = hub.selected ? 2 : 1;
            
            // Draw hexagon
            const size = 12;
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = screenX + Math.cos(angle) * size;
                const y = screenY + Math.sin(angle) * size;
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            // Selected hub breathes gold on a slow cycle (never strobes)
            if (hub.selected) {
                const pulseSize = size + Math.sin(Date.now() * 0.002) * 3;
                this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3;
                    const x = screenX + Math.cos(angle) * pulseSize;
                    const y = screenY + Math.sin(angle) * pulseSize;
                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                this.ctx.closePath();
                this.ctx.stroke();
            }
            
            // Draw capacity indicators with status colors
            this.drawProbeCapacityIndicators(screenX, screenY - 30, hub);
        });
    }

    /**
     * Draw probe capacity indicators with status colors
     */
    drawProbeCapacityIndicators(centerX, centerY, hub) {
        const circleRadius = 4;
        const spacing = 10;
        const maxProbes = hub.maxProbes;
        const totalWidth = (maxProbes - 1) * spacing;
        const startX = centerX - totalWidth / 2;
        
        // Get probe status breakdown
        const activeProbes = this.gameState.entities.probes.filter(probe => 
            probe.active && probe.hub && probe.hub.id === hub.id
        );
        const readyProbes = activeProbes.filter(probe => probe.status === 'ready');
        const workingProbes = activeProbes.filter(probe => probe.status !== 'ready');
        
        for (let i = 0; i < maxProbes; i++) {
            const x = startX + i * spacing;
            const y = centerY;
            
            if (i < readyProbes.length) {
                // Ready/idle probes - signal white
                this.ctx.fillStyle = window.PALETTE.SIGNAL;
                this.ctx.globalAlpha = 1.0;
            } else if (i < activeProbes.length) {
                // Working probes - gold (out earning)
                this.ctx.fillStyle = window.PALETTE.FIRE;
                this.ctx.globalAlpha = 1.0;
            } else {
                // Empty slots - faded mist
                this.ctx.fillStyle = window.PALETTE.MIST;
                this.ctx.globalAlpha = 0.3;
            }
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1.0;
    }

    /**
     * Render signals with pulsing animations
     */
    renderSignals() {
        this.gameState.entities.signals.forEach(signal => {
            const screenX = signal.x - this.gameState.world.viewOffset.x;
            const screenY = signal.y - this.gameState.world.viewOffset.y;

            // Calculate age and fade effect (sim-time age — respects pause/speed)
            const age = signal.age || 0;
            const maxAge = signal.duration || 3000;
            const fadeStart = maxAge * 0.5; // Start fading at 50% of lifetime for short signals
            
            // Calculate fade alpha (1.0 for young signals, fade to 0.2 for old ones)
            let fadeAlpha = 1.0;
            if (age > fadeStart) {
                const fadeProgress = (age - fadeStart) / (maxAge - fadeStart);
                fadeAlpha = Math.max(0.2, 1.0 - (fadeProgress * 0.8));
            }
            
            // Calculate pulsing effect
            const pulseSpeed = signal.rarity === 'legendary' ? 2 : 1; // Legendary pulses faster
            const pulse = Math.sin(age * 0.005 * pulseSpeed) * 0.3 + 1; // Scale between 0.7 and 1.3
            
            // Signals draw from the rarity ramp (VISUAL_STYLE.md); signal type is
            // conveyed by shape/particle effects, not competing hue ramps
            let color = window.PALETTE.RARITY[signal.rarity] || window.PALETTE.SIGNAL;

            // Special signal identities (kept within the palette family)
            if (signal.signalType) {
                switch (signal.signalType) {
                    case 'dark_market':
                        // Deep violet with a stronger breathing pulse
                        color = '#9400d3';
                        const darkMarketPulse = Math.sin(age * 0.008) * 0.5 + 1; // Scale between 0.5 and 1.5
                        signal.radius = 12 * darkMarketPulse; // Apply to radius
                        break;

                    case 'ore_vein':
                        color = '#C97B4A'; // Copper — desaturated mist-brown family
                        break;

                    case 'data_cache':
                        color = '#5B8CFF'; // Clear blue (rare family)
                        break;

                    case 'relic':
                        color = '#B06BFF'; // Rift violet — ancient, of the void
                        break;

                    case 'exotic_crystal': {
                        // Prismatic shimmer, softened to live in the void
                        const crystalHue = (age * 0.1) % 360;
                        color = `hsl(${crystalHue}, 55%, 75%)`;
                        break;
                    }

                    default:
                        // Rarity ramp for standard signals
                        break;
                }
            }
            const radius = signal.radius * pulse;
            
            // Draw outer glow
            const gradient = this.ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius * 2);
            // Convert hex colors to rgba for proper transparency
            const hexToRgba = (hex, alpha) => {
                // Handle both 3-char (#f0f) and 6-char (#ff00ff) hex codes
                let cleanHex = hex.replace('#', '');
                if (cleanHex.length === 3) {
                    cleanHex = cleanHex.split('').map(char => char + char).join('');
                }
                const r = parseInt(cleanHex.slice(0, 2), 16);
                const g = parseInt(cleanHex.slice(2, 4), 16);
                const b = parseInt(cleanHex.slice(4, 6), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };
            
            // Handle both hex and HSL colors for gradient stops
            if (color.startsWith('#')) {
                gradient.addColorStop(0, hexToRgba(color, 0.5 * fadeAlpha));
                gradient.addColorStop(0.5, hexToRgba(color, 0.25 * fadeAlpha));
                gradient.addColorStop(1, hexToRgba(color, 0));
            } else {
                // HSL color (exotic_crystal) - extract components and use hsla()
                const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
                if (hslMatch) {
                    const [, h, s, l] = hslMatch;
                    gradient.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, ${0.5 * fadeAlpha})`);
                    gradient.addColorStop(0.5, `hsla(${h}, ${s}%, ${l}%, ${0.25 * fadeAlpha})`);
                    gradient.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`);
                } else {
                    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.5 * fadeAlpha})`);
                    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.25 * fadeAlpha})`);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                }
            }
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius * 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw solid center
            this.ctx.globalAlpha = fadeAlpha;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw pulsing ring for rare+ signals
            if (signal.rarity !== 'common') {
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = 0.6 * pulse * fadeAlpha;
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, radius * 1.5, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            // Special effects for discovery bonus signals
            if (signal.isDiscoveryBonus) {
                // Draw sparkle effect
                this.ctx.globalAlpha = 0.8 * fadeAlpha;
                this.ctx.fillStyle = window.PALETTE.SIGNAL;
                
                // Create 6 sparkle points around the signal
                for (let i = 0; i < 6; i++) {
                    const sparkleAngle = (age * 0.003) + (i * Math.PI / 3);
                    const sparkleDistance = radius * 2.5;
                    const sparkleX = screenX + Math.cos(sparkleAngle) * sparkleDistance;
                    const sparkleY = screenY + Math.sin(sparkleAngle) * sparkleDistance;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(sparkleX, sparkleY, 1.5, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                // Draw discovery bonus indicator ring
                this.ctx.globalAlpha = 0.4 * fadeAlpha;
                this.ctx.strokeStyle = window.PALETTE.SIGNAL;
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([4, 4]);
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, radius * 3, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]); // Reset line dash
            }
            
            // Exclusive signal particle effects (performance-guarded)
            const isExclusiveSignal = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'].includes(signal.signalType);
            if (isExclusiveSignal && this.gameState.entities.signals.length < 50) {
                try {
                    this.renderExclusiveParticles(signal, screenX, screenY, age, radius, fadeAlpha);
                } catch (e) {
                    // Graceful degradation: signal already rendered with color, skip particles
                }
            }

            // Reset global alpha
            this.ctx.globalAlpha = 1;
        });
    }

    /**
     * Render particle effects for exclusive signal types.
     * Each exclusive signal type has a unique particle effect:
     * - ore_vein: 8 radiating lines rotating slowly outward
     * - data_cache: rotating hexagon outline
     * - relic: 5 orbiting dust particles
     * - exotic_crystal: 4 diamond facets with cycling rainbow colors
     */
    renderExclusiveParticles(signal, screenX, screenY, age, radius, fadeAlpha) {
        this.ctx.save();

        switch (signal.signalType) {
            case 'ore_vein': {
                // Radiating lines rotating slowly outward
                const lineCount = 8;
                for (let i = 0; i < lineCount; i++) {
                    const angle = (age * 0.002) + (i * Math.PI * 2 / lineCount);
                    const innerDist = radius * 1.5;
                    const outerDist = radius * 3;
                    const x1 = screenX + Math.cos(angle) * innerDist;
                    const y1 = screenY + Math.sin(angle) * innerDist;
                    const x2 = screenX + Math.cos(angle) * outerDist;
                    const y2 = screenY + Math.sin(angle) * outerDist;
                    this.ctx.strokeStyle = `rgba(201, 123, 74, ${0.6 * fadeAlpha})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                    this.ctx.stroke();
                }
                break;
            }
            case 'data_cache': {
                // Rotating hexagon outline
                const hexRadius = radius * 2.5;
                const rotationAngle = age * 0.003;
                this.ctx.strokeStyle = `rgba(91, 140, 255, ${0.5 * fadeAlpha})`;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = rotationAngle + (i * Math.PI / 3);
                    const x = screenX + Math.cos(angle) * hexRadius;
                    const y = screenY + Math.sin(angle) * hexRadius;
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }
                this.ctx.closePath();
                this.ctx.stroke();
                break;
            }
            case 'relic': {
                // Orbiting dust particles
                const dustCount = 5;
                for (let i = 0; i < dustCount; i++) {
                    const orbitSpeed = 0.002 + (i * 0.0005);
                    const orbitRadius = radius * 2 + (i * 4);
                    const angle = (age * orbitSpeed) + (i * Math.PI * 2 / dustCount);
                    const dustX = screenX + Math.cos(angle) * orbitRadius;
                    const dustY = screenY + Math.sin(angle) * orbitRadius;
                    const dustSize = 1.5 + Math.sin(age * 0.004 + i) * 0.5;
                    this.ctx.fillStyle = `rgba(176, 107, 255, ${0.7 * fadeAlpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                break;
            }
            case 'exotic_crystal': {
                // Diamond shapes at cardinal positions with cycling rainbow
                const facetCount = 4;
                const hue = (age * 0.1) % 360;
                for (let i = 0; i < facetCount; i++) {
                    const angle = (age * 0.001) + (i * Math.PI / 2);
                    const dist = radius * 2.5 + Math.sin(age * 0.005 + i) * 3;
                    const cx = screenX + Math.cos(angle) * dist;
                    const cy = screenY + Math.sin(angle) * dist;
                    const facetHue = (hue + i * 90) % 360;
                    const size = 3;
                    this.ctx.fillStyle = `hsla(${facetHue}, 55%, 75%, ${0.6 * fadeAlpha})`;
                    this.ctx.beginPath();
                    this.ctx.moveTo(cx, cy - size);
                    this.ctx.lineTo(cx + size * 0.6, cy);
                    this.ctx.lineTo(cx, cy + size);
                    this.ctx.lineTo(cx - size * 0.6, cy);
                    this.ctx.closePath();
                    this.ctx.fill();
                }
                break;
            }
        }

        this.ctx.restore();
    }

    /**
     * Render buildings
     */
    renderBuildings() {
        // Render outposts and facilities
        [...this.gameState.entities.miningOutposts, ...this.gameState.entities.miningFacilities].forEach(structure => {
            const x = structure.x - this.gameState.world.viewOffset.x;
            const y = structure.y - this.gameState.world.viewOffset.y;
            
            if (structure.type === 'outpost') {
                this.ctx.fillStyle = 'rgba(7, 6, 11, 0.7)';
                this.ctx.fillRect(x - 8, y - 8, 16, 16);
                this.ctx.strokeStyle = window.PALETTE.FIRE;
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x - 8, y - 8, 16, 16);
            } else if (structure.type === 'miningFacility') {
                this.ctx.fillStyle = 'rgba(7, 6, 11, 0.7)';
                this.ctx.fillRect(x - 12, y - 12, 24, 24);
                this.ctx.strokeStyle = window.PALETTE.FIRE;
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x - 12, y - 12, 24, 24);
            }
        });
    }

    /**
     * Render mining stations
     */
    renderMiningStations() {
        if (!this.gameState.mining || !this.gameState.mining.stations) return;
        
        this.gameState.mining.stations.forEach(station => {
            const screenX = station.position.x - this.gameState.world.viewOffset.x;
            const screenY = station.position.y - this.gameState.world.viewOffset.y;
            
            // Skip if off-screen (account for zoom level)
            const cullPadding = 50;
            const zoomLevel = this.gameState.world.zoomLevel || 1;
            const viewportWidth = this.canvas.width / zoomLevel;
            const viewportHeight = this.canvas.height / zoomLevel;
            
            if (screenX < -cullPadding || screenX > viewportWidth + cullPadding || 
                screenY < -cullPadding || screenY > viewportHeight + cullPadding) return;
            
            const stationType = this.miningManager.getStationTypes()[station.type];
            const baseSize = station.type === 'basic' ? 18 : station.type === 'advanced' ? 22 : 26;
            const size = baseSize + station.level * 2;
            
            // Animation values
            const time = Date.now() * 0.001; // Convert to seconds
            const rotationSpeed = station.active ? 0.5 : 0; // Rotate only when active
            const rotation = time * rotationSpeed;
            const pulsePhase = Math.sin(time * 2) * 0.5 + 0.5; // 0 to 1, every 0.5 seconds
            
            // Built structures wear the gold (Void Premium)
            const baseColor = station.active ? 'rgba(26, 16, 48, 0.55)' : 'rgba(10, 8, 18, 0.7)';
            const strokeColor = station.active ? window.PALETTE.FIRE : 'rgba(212, 175, 55, 0.4)';
            
            this.ctx.save();
            this.ctx.translate(screenX, screenY);
            
            // Outer glow effect when active (color changes based on resource status)
            if (station.active) {
                const glowIntensity = 0.3 + pulsePhase * 0.4; // Pulse between 0.3 and 0.7
                const glowSize = size + 8 + pulsePhase * 6;
                
                // Determine glow color based on resource status
                const progress = this.miningManager.getStationResourceProgress(station, stationType);
                let glowColor = window.PALETTE.FIRE;

                if (progress < 0.3) {
                    glowColor = window.PALETTE.DANGER; // Starved — soft red, steady
                } else if (progress < 0.7) {
                    glowColor = '#C97B4A'; // Running thin — copper
                } else {
                    glowColor = window.PALETTE.FIRE; // Fed — gold
                }
                
                this.ctx.shadowColor = glowColor;
                this.ctx.shadowBlur = 15 * glowIntensity;
                this.ctx.globalAlpha = glowIntensity * 0.6;
                
                // Outer glow ring
                this.ctx.strokeStyle = glowColor;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
                this.ctx.stroke();
                
                this.ctx.shadowBlur = 0;
                this.ctx.globalAlpha = 1;
            }
            
            // Rotate the entire station if active
            if (station.active) {
                this.ctx.rotate(rotation);
            }
            
            // Main hexagonal structure (matching hub style but distinct)
            this.ctx.fillStyle = baseColor;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = Math.cos(angle) * size;
                const y = Math.sin(angle) * size;
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            // Inner hexagon (smaller)
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 1.5;
            const innerSize = size * 0.6;
            
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = Math.cos(angle) * innerSize;
                const y = Math.sin(angle) * innerSize;
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.stroke();
            
            // Connecting lines from center to vertices (like mining drill lines)
            this.ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = Math.cos(angle) * innerSize;
                const y = Math.sin(angle) * innerSize;
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            }
            
            // Central energy core
            if (station.active) {
                const coreSize = 4 + pulsePhase * 3;
                const coreGlow = 0.8 + pulsePhase * 0.2;
                
                this.ctx.fillStyle = window.PALETTE.FIRE_BRIGHT;
                this.ctx.globalAlpha = coreGlow;
                this.ctx.shadowColor = window.PALETTE.FIRE_BRIGHT;
                this.ctx.shadowBlur = 10;
                
                this.ctx.beginPath();
                this.ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.shadowBlur = 0;
                this.ctx.globalAlpha = 1;
            } else {
                // Inactive core
                this.ctx.fillStyle = '#3A3450';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
            
            // Note: Low resources indication is now handled by the main glow color above
            
            // Draw level indicator
            if (station.level > 1) {
                this.ctx.font = "10px 'IBM Plex Mono', monospace";
                this.ctx.fillStyle = window.PALETTE.FIRE;
                this.ctx.fillText(`Lv${station.level}`, screenX, screenY + size + 10);
            }
            
            // Draw resource requirement progress bar (gradual filling)
            if (station.stationInventory && stationType.requirements) {
                const barWidth = 40;
                const barHeight = 4;
                
                // Get progress percentage (0-1) and check if fully ready
                const progress = this.miningManager.getStationResourceProgress(station, stationType);
                const hasAllRequirements = this.miningManager.checkStationHasRequirements(station, stationType);
                const time = Date.now() * 0.005;
                
                // Background bar
                this.ctx.fillStyle = 'rgba(139, 132, 163, 0.2)';
                this.ctx.fillRect(screenX - 20, screenY + size + 15, barWidth, barHeight);

                // Calculate fill width based on progress
                const fillWidth = barWidth * progress;
                let barColor;

                if (progress >= 0.95) { // Full enough (accounts for continuous consumption)
                    barColor = window.PALETTE.FIRE_BRIGHT;
                } else if (progress > 0) {
                    // Gold brightens as the buffer fills
                    barColor = `rgba(212, 175, 55, ${0.4 + 0.6 * progress})`;
                } else {
                    // Empty — steady soft red, no flashing (VISUAL_STYLE don'ts)
                    barColor = 'rgba(224, 82, 77, 0.8)';
                }
                
                if (fillWidth > 0) {
                    this.ctx.fillStyle = barColor;
                    this.ctx.fillRect(screenX - 20, screenY + size + 15, fillWidth, barHeight);
                }
            }
        });
    }

    /**
     * Render shuttles
     */
    renderShuttles() {
        if (!this.gameState.mining || !this.gameState.mining.shuttles) return;
        
        this.gameState.mining.shuttles.forEach(shuttle => {
            const screenX = shuttle.position.x - this.gameState.world.viewOffset.x;
            const screenY = shuttle.position.y - this.gameState.world.viewOffset.y;
            
            // Skip if off-screen (account for zoom level)
            const cullPadding = 20;
            const zoomLevel = this.gameState.world.zoomLevel || 1;
            const viewportWidth = this.canvas.width / zoomLevel;
            const viewportHeight = this.canvas.height / zoomLevel;
            
            if (screenX < -cullPadding || screenX > viewportWidth + cullPadding || 
                screenY < -cullPadding || screenY > viewportHeight + cullPadding) return;
            
            // Draw shuttle body with status-based colors
            const size = 8 + shuttle.level;
            let shuttleColor = window.PALETTE.SIGNAL; // Returning empty
            if (shuttle.status === 'delivering') shuttleColor = window.PALETTE.FIRE; // Carrying value
            else if (shuttle.status === 'waiting') shuttleColor = window.PALETTE.MIST; // Idle

            this.ctx.fillStyle = shuttleColor;
            this.ctx.strokeStyle = 'rgba(232, 228, 240, 0.6)';
            this.ctx.lineWidth = 1;
            
            // Triangle shape pointing in direction of movement
            const hub = this.gameState.entities.reconHubs.find(h => h.id === shuttle.hubId);
            const station = this.gameState.mining.stations.find(s => s.id === shuttle.stationId);
            
            if (hub && station) {
                const targetPos = shuttle.target === 'station' ? station.position : { x: hub.x, y: hub.y };
                const angle = Math.atan2(targetPos.y - shuttle.position.y, targetPos.x - shuttle.position.x);
                
                this.ctx.save();
                this.ctx.translate(screenX, screenY);
                this.ctx.rotate(angle);
                
                this.ctx.beginPath();
                this.ctx.moveTo(size, 0);
                this.ctx.lineTo(-size, -size/2);
                this.ctx.lineTo(-size, size/2);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                
                // Draw cargo indicator
                const cargoAmount = Object.values(shuttle.cargo || {}).reduce((sum, val) => sum + val, 0);
                if (cargoAmount > 0) {
                    const cargoPercent = cargoAmount / shuttle.capacity;
                    this.ctx.fillStyle = `rgba(255, 215, 0, ${0.5 + cargoPercent * 0.5})`;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.restore();
            }
            
            // Shuttle run line — hairline gold route
            this.ctx.strokeStyle = window.PALETTE.LINE;
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([2, 4]);
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY);
            
            if (hub && station) {
                const targetPos = shuttle.target === 'station' ? station.position : { x: hub.x, y: hub.y };
                const targetX = targetPos.x - this.gameState.world.viewOffset.x;
                const targetY = targetPos.y - this.gameState.world.viewOffset.y;
                this.ctx.lineTo(targetX, targetY);
            }
            
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        });
    }

    /**
     * Calculate resource buffer percentage for a station
     */
    calculateBufferPercent(station, stationType) {
        if (!station.resourceBuffer || !stationType.consumption) return 0;
        
        let totalBuffer = 0;
        let totalNeeded = 0;
        
        Object.entries(stationType.consumption).forEach(([resource, amount]) => {
            totalBuffer += station.resourceBuffer[resource] || 0;
            totalNeeded += amount * 5; // 5 minutes worth
        });
        
        return totalNeeded > 0 ? Math.min(totalBuffer / totalNeeded, 1) : 0;
    }

    /**
     * Render building preview
     */
    renderBuildingPreview(preview) {
        const screenX = preview.x - this.gameState.world.viewOffset.x;
        const screenY = preview.y - this.gameState.world.viewOffset.y;
        
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);

        if (preview.type === 'outpost') {
            this.ctx.strokeRect(screenX - 8, screenY - 8, 16, 16);
        } else if (preview.type === 'miningFacility') {
            this.ctx.strokeRect(screenX - 12, screenY - 12, 24, 24);
        } else if (preview.type === 'reconHub') {
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 15, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        this.ctx.setLineDash([]);
    }


    /**
     * Render deployment overlay
     */
    renderDeploymentOverlay() {
        if (!this.gameState.ui.selectedHub) return;
        
        const hub = this.gameState.ui.selectedHub;
        const screenX = hub.x - this.gameState.world.viewOffset.x;
        const screenY = hub.y - this.gameState.world.viewOffset.y;
        
        // Draw range circle
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, hub.range, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    /**
     * Render signal selection rectangle
     */
    renderSelectionRectangle() {
        if (!this.gameState.input.selectionStart || !this.gameState.input.selectionEnd) {
            return;
        }
        
        // Account for crosshair cursor center point (crosshair is typically centered)
        const cursorOffsetX = 0; // Crosshair should be centered
        const cursorOffsetY = 0; // Crosshair should be centered
        
        const startX = this.gameState.input.selectionStart.x - this.gameState.world.viewOffset.x + cursorOffsetX;
        const startY = this.gameState.input.selectionStart.y - this.gameState.world.viewOffset.y + cursorOffsetY;
        const endX = this.gameState.input.selectionEnd.x - this.gameState.world.viewOffset.x + cursorOffsetX;
        const endY = this.gameState.input.selectionEnd.y - this.gameState.world.viewOffset.y + cursorOffsetY;
        
        const rectX = Math.min(startX, endX);
        const rectY = Math.min(startY, endY);
        const rectWidth = Math.abs(endX - startX);
        const rectHeight = Math.abs(endY - startY);
        
        // Draw selection rectangle — gold hairline frame
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
        this.ctx.fillStyle = 'rgba(212, 175, 55, 0.06)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([10, 5]);
        
        // Fill the rectangle
        this.ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        
        // Draw the rectangle border
        this.ctx.beginPath();
        this.ctx.rect(rectX, rectY, rectWidth, rectHeight);
        this.ctx.stroke();
        
        // Draw corner indicators for security camera feel
        const cornerSize = 20;
        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 1.0)';
        this.ctx.lineWidth = 1.5;
        
        // Top-left corner
        this.ctx.beginPath();
        this.ctx.moveTo(rectX, rectY + cornerSize);
        this.ctx.lineTo(rectX, rectY);
        this.ctx.lineTo(rectX + cornerSize, rectY);
        this.ctx.stroke();
        
        // Top-right corner
        this.ctx.beginPath();
        this.ctx.moveTo(rectX + rectWidth - cornerSize, rectY);
        this.ctx.lineTo(rectX + rectWidth, rectY);
        this.ctx.lineTo(rectX + rectWidth, rectY + cornerSize);
        this.ctx.stroke();
        
        // Bottom-left corner
        this.ctx.beginPath();
        this.ctx.moveTo(rectX, rectY + rectHeight - cornerSize);
        this.ctx.lineTo(rectX, rectY + rectHeight);
        this.ctx.lineTo(rectX + cornerSize, rectY + rectHeight);
        this.ctx.stroke();
        
        // Bottom-right corner
        this.ctx.beginPath();
        this.ctx.moveTo(rectX + rectWidth - cornerSize, rectY + rectHeight);
        this.ctx.lineTo(rectX + rectWidth, rectY + rectHeight);
        this.ctx.lineTo(rectX + rectWidth, rectY + rectHeight - cornerSize);
        this.ctx.stroke();
        
        // Reset line dash
        this.ctx.setLineDash([]);
    }

    /**
     * Render deployment preview lines
     */
    renderDeploymentPreview() {
        const hub = this.gameState.ui.selectedHub;
        const deploymentPoints = this.gameState.ui.deploymentPoints;
        const mousePos = this.gameState.ui.mousePosition;
        
        if (!hub) return;
        
        // Debug deployment preview
        if (Math.random() < 0.01) { // Occasional debug log
            console.log('Rendering deployment preview:', {
                hub: hub.id,
                deploymentPoints: deploymentPoints.length,
                mousePos,
                deployMode: this.gameState.ui.deployMode
            });
        }
        
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([10, 5]);

        // Draw lines from hub to deployment points
        const hubScreenX = hub.x - this.gameState.world.viewOffset.x;
        const hubScreenY = hub.y - this.gameState.world.viewOffset.y;
        
        if (deploymentPoints.length === 0) {
            // Draw line from hub to mouse cursor
            const mouseScreenX = mousePos.x - this.gameState.world.viewOffset.x;
            const mouseScreenY = mousePos.y - this.gameState.world.viewOffset.y;
            
            // Check if mouse is within range
            const distance = Math.sqrt(
                Math.pow(mousePos.x - hub.x, 2) + 
                Math.pow(mousePos.y - hub.y, 2)
            );
            
            if (distance <= hub.range) {
                this.ctx.beginPath();
                this.ctx.moveTo(hubScreenX, hubScreenY);
                this.ctx.lineTo(mouseScreenX, mouseScreenY);
                this.ctx.stroke();
            }
        } else {
            // Draw path through deployment points
            this.ctx.beginPath();
            this.ctx.moveTo(hubScreenX, hubScreenY);
            
            // Draw to each deployment point
            deploymentPoints.forEach(point => {
                const pointScreenX = point.x - this.gameState.world.viewOffset.x;
                const pointScreenY = point.y - this.gameState.world.viewOffset.y;
                this.ctx.lineTo(pointScreenX, pointScreenY);
            });
            
            // Draw to current mouse position for next point
            if (deploymentPoints.length < 2) { // Max 2 deployment points
                const mouseScreenX = mousePos.x - this.gameState.world.viewOffset.x;
                const mouseScreenY = mousePos.y - this.gameState.world.viewOffset.y;
                
                // Check if mouse is within range of hub
                const distance = Math.sqrt(
                    Math.pow(mousePos.x - hub.x, 2) + 
                    Math.pow(mousePos.y - hub.y, 2)
                );
                
                if (distance <= hub.range) {
                    this.ctx.lineTo(mouseScreenX, mouseScreenY);
                }
            }
            
            this.ctx.stroke();
            
            // Draw waypoint markers
            deploymentPoints.forEach(point => {
                const pointScreenX = point.x - this.gameState.world.viewOffset.x;
                const pointScreenY = point.y - this.gameState.world.viewOffset.y;
                
                this.ctx.fillStyle = 'rgba(212, 175, 55, 0.7)';
                this.ctx.beginPath();
                this.ctx.arc(pointScreenX, pointScreenY, 6, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = window.PALETTE.FIRE;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            });
        }
        
        this.ctx.setLineDash([]);
    }

    /**
     * Generate stars for background
     */
    /**
     * Highlight the BUILD PROBE button
     */
    highlightBuildProbeButton() {
        const buildButton = document.getElementById('buildProbeForHub');
        if (buildButton) {
            // Add subtle glow and metallic shine effect
            buildButton.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.6)';
            buildButton.style.border = '1px solid #00ffff';
            
            // Create metallic shine effect
            const originalBackground = buildButton.style.background;
            buildButton.style.background = `linear-gradient(90deg, 
                transparent 0%, 
                transparent 40%, 
                rgba(255, 255, 255, 0.3) 50%, 
                transparent 60%, 
                transparent 100%), 
                ${originalBackground || '#333'}`;
            buildButton.style.backgroundSize = '200% 100%';
            buildButton.style.animation = 'metallicShine 2s ease-in-out infinite';
            
            // Remove highlight after a few seconds
            setTimeout(() => {
                buildButton.style.animation = 'none';
                buildButton.style.boxShadow = '';
                buildButton.style.border = '';
                buildButton.style.background = originalBackground;
                buildButton.style.backgroundSize = '';
                
                // Clean up all tutorial event listeners
                this.canvas.removeEventListener('mousedown', this.tutorialMouseDown);
                this.canvas.removeEventListener('mousemove', this.tutorialMouseMove);
                this.canvas.removeEventListener('mouseup', this.tutorialMouseUp);
                this.canvas.removeEventListener('wheel', this.tutorialWheel);
                this.eventBus.off('probe:deployed', this.tutorialProbeDeployment);
                this.eventBus.off('signal:identified', this.tutorialSignalCollection);
                this.eventBus.off('exploration:screenShown', this.tutorialExplorationScreen);
                this.eventBus.off('planet:actionChosen', this.tutorialPlanetAction);
                this.eventBus.off('hub:clicked', this.tutorialHubClick);
            }, 4000);
        }
    }
    
    generateStars() {
        const starCount = 500;
        const world = this.gameState.world;
        
        for (let i = 0; i < starCount; i++) {
            this.gameState.entities.stars.push({
                x: Math.random() * world.standardSectorWidth * 3 - world.standardSectorWidth,
                y: Math.random() * world.standardSectorHeight * 3 - world.standardSectorHeight,
                size: Math.random() * 2 + 1
            });
        }
    }

    /**
     * Generate sector name
     */
    generateSectorName(x, y) {
        const adjectives = ['Distant', 'Dark', 'Bright', 'Mysterious', 'Ancient', 'Void', 'Crystal', 'Ember'];
        const nouns = ['Nebula', 'Expanse', 'Cluster', 'Sector', 'Region', 'Zone', 'Field', 'Domain'];
        
        const seed = Math.abs(x * 1000 + y);
        const adj = adjectives[seed % adjectives.length];
        const noun = nouns[(seed * 7) % nouns.length];
        
        return `${adj} ${noun}`;
    }

    /**
     * Generate sector type
     */
    generateSectorType(x, y) {
        return {
            resourceMultiplier: 1,
            probeDestructionChance: 0,
            signalFrequency: 1
        };
    }

    /**
     * Start passive resource generation
     */
    startPassiveGeneration() {
        setInterval(() => {
            let totalGeneration = 0;
            
            [...this.gameState.entities.miningOutposts, ...this.gameState.entities.miningFacilities].forEach(structure => {
                if (structure.generationRate) {
                    totalGeneration += structure.generationRate;
                }
            });
            
            if (totalGeneration > 0) {
                const resources = this.gameState.getResources();
                this.gameState.updateResources({
                    exoticMinerals: resources.exoticMinerals + totalGeneration
                }, this.eventBus);
                this.uiManager.updateUI();
            }
        }, 1000);
    }

    /**
     * Clean up expired signals
     */
    cleanupExpiredSignals() {
        const initialCount = this.gameState.entities.signals.length;

        this.gameState.entities.signals = this.gameState.entities.signals.filter(signal => {
            const age = signal.age || 0; // sim-time age (respects pause/speed)
            const maxAge = signal.duration || 3000; // Default 3 seconds
            return age < maxAge;
        });
        
        const removedCount = initialCount - this.gameState.entities.signals.length;
        if (removedCount > 0) {
            console.log(`Cleaned up ${removedCount} expired signals`);
        }
    }

    /**
     * Add a resource indicator at a specific location
     */
    addResourceIndicator(data) {
        const { x, y, amount, resourceType, pending, label, color: colorOverride } = data;

        const colors = {
            minerals: '#fff',     // White (common signals)
            data: '#fff',         // White (common signals)
            artifacts: '#fff',    // White (common signals)
            all: '#ffd700'        // Gold (universal collection)
        };

        // Different styling for pending vs delivered resources;
        // `label` overrides the default text (combo callouts etc.)
        const text = label || (pending ? `+${amount} (pending)` : `+${amount}`);
        const color = colorOverride || (pending ? '#ff9900' : (colors[resourceType] || '#fff')); // Orange for pending
        
        this.resourceIndicators.push({
            x: x,
            y: y,
            text: text,
            color: color,
            opacity: 1.0,
            age: 0,
            duration: 2000, // 2 seconds
            velocityY: -30,  // Float upward
            pending: pending || false
        });
    }

    /**
     * Update resource indicators (movement, fading)
     */
    updateResourceIndicators(deltaTime) {
        this.resourceIndicators = this.resourceIndicators.filter(indicator => {
            indicator.age += deltaTime;
            indicator.y += (indicator.velocityY * deltaTime) / 1000;
            
            // Fade out over time
            const fadeStart = indicator.duration * 0.5;
            if (indicator.age > fadeStart) {
                const fadeProgress = (indicator.age - fadeStart) / (indicator.duration - fadeStart);
                indicator.opacity = Math.max(0, 1.0 - fadeProgress);
            }
            
            return indicator.age < indicator.duration;
        });
    }

    /**
     * Render resource indicators
     */
    renderResourceIndicators() {
        this.resourceIndicators.forEach(indicator => {
            const screenX = indicator.x - this.gameState.world.viewOffset.x;
            const screenY = indicator.y - this.gameState.world.viewOffset.y;
            
            this.ctx.save();
            this.ctx.globalAlpha = indicator.opacity;
            this.ctx.fillStyle = indicator.color;
            this.ctx.font = 'bold 16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Add text stroke for better visibility
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeText(indicator.text, screenX, screenY);
            this.ctx.fillText(indicator.text, screenX, screenY);
            
            this.ctx.restore();
        });
    }

    /**
     * Render sector boundaries
     */
    renderSectorBoundaries() {
        const world = this.gameState.getWorld();
        
        // Calculate visible sector range
        const startX = Math.floor(world.viewOffset.x / world.standardSectorWidth) - 1;
        const endX = Math.ceil((world.viewOffset.x + this.canvas.width) / world.standardSectorWidth) + 1;
        const startY = Math.floor(world.viewOffset.y / world.standardSectorHeight) - 1;
        const endY = Math.ceil((world.viewOffset.y + this.canvas.height) / world.standardSectorHeight) + 1;
        
        for (let sectorX = startX; sectorX <= endX; sectorX++) {
            for (let sectorY = startY; sectorY <= endY; sectorY++) {
                const sector = world.sectors.get(`${sectorX},${sectorY}`);
                
                if (sector && sector.explored) {
                    const sectorScreenX = sectorX * world.standardSectorWidth - world.viewOffset.x;
                    const sectorScreenY = sectorY * world.standardSectorHeight - world.viewOffset.y;
                    
                    // Draw sector boundary — hairline, biome-tinted
                    this.ctx.strokeStyle = sector.type.borderColor;
                    this.ctx.lineWidth = 1;
                    this.ctx.setLineDash([15, 8]);
                    
                    this.ctx.beginPath();
                    this.ctx.rect(sectorScreenX, sectorScreenY, world.standardSectorWidth, world.standardSectorHeight);
                    this.ctx.stroke();
                    
                    this.ctx.setLineDash([]);
                    
                    // Draw sector name for center sector
                    const centerX = world.viewOffset.x + this.canvas.width / 2;
                    const centerY = world.viewOffset.y + this.canvas.height / 2;
                    const viewSectorX = Math.floor(centerX / world.standardSectorWidth);
                    const viewSectorY = Math.floor(centerY / world.standardSectorHeight);
                    
                    if (sectorX === viewSectorX && sectorY === viewSectorY) {
                        this.ctx.fillStyle = 'rgba(232, 228, 240, 0.8)';
                        this.ctx.font = "300 22px 'Jost', 'Century Gothic', sans-serif";
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText(sector.name, 
                            sectorScreenX + world.standardSectorWidth / 2, 
                            sectorScreenY + 50);
                    }
                } else if (!sector || !sector.explored) {
                    // Draw unexplored sector hint if adjacent to explored
                    const isAdjacent = this.sectorManager.isAdjacentToExplored(sectorX, sectorY);
                    if (isAdjacent) {
                        const sectorScreenX = sectorX * world.standardSectorWidth - world.viewOffset.x;
                        const sectorScreenY = sectorY * world.standardSectorHeight - world.viewOffset.y;
                        
                        // Only draw if visible
                        if (sectorScreenX + world.standardSectorWidth > -50 && sectorScreenX < this.canvas.width + 50 &&
                            sectorScreenY + world.standardSectorHeight > -50 && sectorScreenY < this.canvas.height + 50) {
                            
                            this.ctx.fillStyle = 'rgba(26, 16, 48, 0.25)';
                            this.ctx.fillRect(sectorScreenX, sectorScreenY, world.standardSectorWidth, world.standardSectorHeight);

                            this.ctx.strokeStyle = 'rgba(139, 132, 163, 0.2)';
                            this.ctx.lineWidth = 1;
                            this.ctx.setLineDash([10, 5]);
                            this.ctx.beginPath();
                            this.ctx.rect(sectorScreenX, sectorScreenY, world.standardSectorWidth, world.standardSectorHeight);
                            this.ctx.stroke();
                            this.ctx.setLineDash([]);
                        }
                    }
                }
            }
        }
    }

    /**
     * Show save/load modal
     */
    async showSaveLoadModal() {
        console.log('showSaveLoadModal called');
        console.log('SaveManager available:', !!this.saveManager);
        const modal = document.getElementById('saveLoadModal');
        const slotsContainer = document.getElementById('saveSlots');
        
        if (!modal || !slotsContainer) return;
        
        // Clear existing slots
        slotsContainer.innerHTML = '';
        
        // Get save slot information
        const slots = await this.saveManager.getAllSaveSlots();
        
        slots.forEach(slotInfo => {
            const slotDiv = document.createElement('div');
            slotDiv.style.cssText = `
                display: flex;
                align-items: center;
                padding: 15px;
                background: rgba(0,0,0,0.3);
                border: 1px solid #333;
                border-radius: 5px;
                gap: 15px;
            `;
            
            if (slotInfo.empty) {
                slotDiv.innerHTML = `
                    <div style="flex: 1;">
                        <div style="color: #0ff; font-size: 16px; margin-bottom: 5px;">Slot ${slotInfo.slotNumber}</div>
                        <div style="color: #666; font-size: 12px;">[Empty]</div>
                    </div>
                    <button class="control-btn save-slot-btn" data-slot="${slotInfo.slotNumber}" data-action="save" data-original-text="Save Here">
                        Save Here
                    </button>
                `;
            } else {
                slotDiv.innerHTML = `
                    <div style="flex: 1;">
                        <div style="color: #0ff; font-size: 16px; margin-bottom: 5px;">Slot ${slotInfo.slotNumber}</div>
                        <div style="color: #aaa; font-size: 12px; line-height: 1.4;">
                            ${slotInfo.date} ${slotInfo.time}<br>
                            Probethium: <span style="color: #c9f;">${slotInfo.probethium}</span><br>
                            Sectors: ${slotInfo.sectors} • Research: ${slotInfo.research}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="control-btn save-slot-btn" data-slot="${slotInfo.slotNumber}" data-action="load">
                            Load
                        </button>
                        <button class="control-btn save-slot-btn" data-slot="${slotInfo.slotNumber}" data-action="save" data-original-text="Overwrite"
                                style="background: #653; border-color: #865;">
                            Overwrite
                        </button>
                        <button class="control-btn save-slot-btn" data-slot="${slotInfo.slotNumber}" data-action="delete"
                                style="background: #533; border-color: #855; font-size: 11px;">
                            Delete
                        </button>
                    </div>
                `;
            }
            
            slotsContainer.appendChild(slotDiv);
        });
        
        // Add event listeners to slot buttons
        document.querySelectorAll('.save-slot-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const slot = parseInt(e.target.dataset.slot);
                const action = e.target.dataset.action;
                
                console.log('Save slot button clicked:', { slot, action, buttonText: e.target.textContent });
                console.log('Button dataset:', e.target.dataset);
                
                switch (action) {
                    case 'save':
                        if (confirm(`Save game to slot ${slot}?`)) {
                            // Check if this slot is already being saved
                            if (this.saveManager.isSlotSaving(slot)) {
                                console.warn(`Save to slot ${slot} already in progress, ignoring request`);
                                alert('Save operation already in progress for this slot. Please wait.');
                                return;
                            }
                            
                            // Disable all save buttons during save operation
                            this.disableAllSaveButtons();
                            
                            try {
                                // Debug save operation
                                console.log('Starting save operation for slot:', slot);
                                console.log('SaveManager exists:', !!this.saveManager);
                                console.log('SaveManager.saveGame exists:', !!this.saveManager?.saveGame);
                                console.log('Current saving states:', this.saveManager.savingStates);
                                
                                // Update button to show "Saving..." text
                                e.target.textContent = 'Saving...';
                                e.target.disabled = true;
                                
                                const success = await this.saveManager.saveGame(slot);
                                console.log('Save operation result:', success);
                                console.log('Saving states after operation:', this.saveManager.savingStates);
                                
                                if (success) {
                                    // Show "Saved!" confirmation
                                    e.target.textContent = 'Saved!';
                                    e.target.style.background = '#0a5';
                                    
                                    // Close modal after short delay
                                    setTimeout(() => {
                                        modal.classList.remove('active');
                                    }, 1000);
                                } else {
                                    console.error('Save operation returned false');
                                    // Save failed, restore button
                                    e.target.textContent = e.target.dataset.originalText || 'Save Here';
                                    e.target.disabled = false;
                                    this.enableAllSaveButtons();
                                    alert('Save operation failed. Please try again.');
                                }
                            } catch (error) {
                                console.error('Save error:', error);
                                console.error('Error details:', error.message);
                                console.error('Error stack:', error.stack);
                                e.target.textContent = e.target.dataset.originalText || 'Save Here';
                                e.target.disabled = false;
                                this.enableAllSaveButtons();
                                alert(`Save failed: ${error.message}`);
                            }
                        }
                        break;
                    case 'load':
                        if (confirm(`Load game from slot ${slot}? Current progress will be lost!`)) {
                            try {
                                await this.saveManager.loadGame(slot);
                                modal.classList.remove('active');
                            } catch (error) {
                                console.error('Load game error:', error);
                            }
                        }
                        break;
                    case 'delete':
                        if (confirm(`Delete save in slot ${slot}? This cannot be undone!`)) {
                            this.saveManager.deleteSave(slot);
                            // Small delay to ensure localStorage is updated before refresh
                            setTimeout(() => {
                                this.showSaveLoadModal(); // Refresh display
                            }, 50);
                        }
                        break;
                }
            });
        });
        
        modal.classList.add('active');
    }

    /**
     * Show main menu
     */
    showMainMenu() {
        const modal = document.getElementById('mainMenuModal');
        if (!modal) return;

        // Set up main menu event listeners
        this.setupMainMenuListeners();
        
        modal.classList.add('active');
    }

    /**
     * Setup main menu event listeners
     */
    setupMainMenuListeners() {
        // Save/Load from main menu
        const saveLoadMenuBtn = document.getElementById('saveLoadMenuBtn');
        if (saveLoadMenuBtn) {
            saveLoadMenuBtn.replaceWith(saveLoadMenuBtn.cloneNode(true)); // Remove old listeners
            document.getElementById('saveLoadMenuBtn').addEventListener('click', () => {
                console.log('Save/Load menu button clicked from main menu');
                console.log('GameController context:', this);
                document.getElementById('mainMenuModal').classList.remove('active');
                this.showSaveLoadModal();
            });
        }

        // Quit from main menu
        const quitGameMenuBtn = document.getElementById('quitGameMenuBtn');
        if (quitGameMenuBtn) {
            quitGameMenuBtn.replaceWith(quitGameMenuBtn.cloneNode(true)); // Remove old listeners
            document.getElementById('quitGameMenuBtn').addEventListener('click', () => {
                document.getElementById('mainMenuModal').classList.remove('active');
                this.quitGame();
            });
        }


        // Close main menu
        const closeMainMenu = document.getElementById('closeMainMenu');
        if (closeMainMenu) {
            closeMainMenu.replaceWith(closeMainMenu.cloneNode(true)); // Remove old listeners
            document.getElementById('closeMainMenu').addEventListener('click', () => {
                document.getElementById('mainMenuModal').classList.remove('active');
            });
        }
    }

    /**
     * Check for offline progression on initial game load
     */
    async checkInitialOfflineProgression() {
        // Check if there's a recent auto-save timestamp in storage
        const lastPlayTime = await storageAdapter.getItem('csog_last_play_time');
        if (lastPlayTime) {
            const lastTime = parseInt(lastPlayTime);
            const currentTime = Date.now();
            const timeSinceLastPlay = currentTime - lastTime;
            
            // Only process offline progression if away for more than 30 seconds
            if (timeSinceLastPlay > 30000) {
                try {
                    const offlineResults = await this.offlineManager.processOfflineProgress(lastTime);
                    if (offlineResults) {
                        // Show offline progress after a delay to ensure UI is ready
                        setTimeout(() => {
                            this.offlineManager.showOfflineProgressSummary(offlineResults);
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Error processing initial offline progression:', error);
                }
            }
        }
        
        // Update the last play time
        await storageAdapter.setItem('csog_last_play_time', Date.now().toString());
        
        // Update last play time every 30 seconds while playing
        setInterval(async () => {
            await storageAdapter.setItem('csog_last_play_time', Date.now().toString());
        }, 30000);
    }

    /**
     * Setup auto-save when player closes browser or refreshes
     */
    setupAutoSaveOnExit() {
        // Auto-save on page unload (browser close, refresh, navigation)
        window.addEventListener('beforeunload', (event) => {
            try {
                // For web mode, use sync localStorage operations (beforeunload can't be async)
                // For Electron, the main process handles this before quit
                if (!storageAdapter.isElectron) {
                    const saveData = this.saveManager.createSaveDataSync();
                    const autoSaveKey = 'csog_save_auto';
                    localStorage.setItem(autoSaveKey, JSON.stringify(saveData));
                    localStorage.setItem('csog_last_play_time', Date.now().toString());
                    console.log('Auto-saved on page unload (web mode)');
                }
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        });

        // Setup auto-save every 5 minutes during play
        setInterval(async () => {
            try {
                await this.performAutoSave();
                console.log('Periodic auto-save completed');
            } catch (error) {
                console.error('Periodic auto-save failed:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Load from auto-save if available
     */
    async loadAutoSave() {
        try {
            const autoSaveKey = 'csog_save_auto';
            const savedData = await storageAdapter.getItem(autoSaveKey);
            
            if (!savedData) {
                console.log('No auto-save data found');
                return false;
            }

            const saveData = JSON.parse(savedData);
            await this.saveManager.restoreGameState(saveData.gameState);
            
            // Process offline progression if enough time has passed
            if (saveData.lastSaveTime && this.offlineManager) {
                try {
                    const offlineResults = await this.offlineManager.processOfflineProgress(saveData.lastSaveTime);
                    if (offlineResults) {
                        setTimeout(() => {
                            this.offlineManager.showOfflineProgressSummary(offlineResults);
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Error processing offline progression from auto-save:', error);
                }
            }
            
            console.log('Auto-save loaded successfully');
            this.eventBus.emit('ui:message', { 
                text: 'Previous session restored!', 
                type: 'success' 
            });
            return true;
        } catch (error) {
            console.error('Failed to load auto-save:', error);
            return false;
        }
    }

    /**
     * Quit game with auto-save and return to start screen
     */
    async quitGame() {
        if (confirm('Quit game? Your progress will be automatically saved.')) {
            try {
                console.log('quitGame: Starting auto-save process...');
                console.log('quitGame: SaveManager available:', !!this.saveManager);
                
                // Use proper auto-save method instead of direct localStorage
                console.log('quitGame: Performing auto-save...');
                const autoSaveSuccess = await this.performAutoSave();
                
                if (autoSaveSuccess) {
                    console.log('quitGame: Auto-save completed successfully');
                    
                    // Show confirmation
                    this.eventBus.emit('ui:message', { 
                        text: 'Game saved! Thanks for playing!', 
                        type: 'success' 
                    });
                    
                    // Wait a moment for the message to show
                    setTimeout(() => {
                        // Reload the page to return to start screen
                        window.location.reload();
                    }, 1000);
                } else {
                    console.error('Auto-save failed during quit');
                    alert('Error saving game during quit! Your progress may not be saved. Try using the Save/Load menu to manually save before quitting.');
                }
                
            } catch (error) {
                console.error('Error during quit operation:', error);
                console.error('Error details:', error.message);
                console.error('Error stack:', error.stack);
                alert('Error saving game during quit operation! Your progress may not be saved. Try using the Save/Load menu to manually save before quitting.');
            }
        }
    }

    /**
     * Perform auto-save using proper SaveManager methods
     */
    async performAutoSave() {
        try {
            console.log('performAutoSave: Creating save data...');
            const saveData = await this.saveManager.createSaveData();
            console.log('performAutoSave: Save data created successfully');
            
            const autoSaveKey = 'csog_save_auto';
            console.log('performAutoSave: Attempting to save to storage with key:', autoSaveKey);
            await storageAdapter.setItem(autoSaveKey, JSON.stringify(saveData));
            console.log('performAutoSave: Auto-save written to storage');
            
            await storageAdapter.setItem('csog_last_play_time', Date.now().toString());
            console.log('performAutoSave: Last play time updated');
            
            return true;
        } catch (error) {
            console.error('performAutoSave failed:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            return false;
        }
    }

    /**
     * Handle research completion to update probe equipment
     */
    onResearchCompleted(node) {
        // Check if this is an auto-collection research
        const autoCollectionResearch = ['auto_minerals', 'auto_data', 'auto_artifacts', 'auto_all'];
        if (autoCollectionResearch.includes(node.id)) {
            console.log(`Auto-collection research completed: ${node.id}`);
            this.updateAllProbeEquipment();
        }
    }

    /**
     * Update all probe equipment to include newly researched collection types
     */
    updateAllProbeEquipment() {
        const probes = this.gameState.entities.probes.filter(probe => probe.equipment && probe.equipment.type === 'auto_collector');
        
        if (probes.length === 0) {
            console.log('No probes with auto-collectors found');
            return;
        }

        console.log(`Updating equipment for ${probes.length} probes with auto-collectors`);
        
        probes.forEach(probe => {
            const oldCollectionTypes = [...probe.equipment.collectionTypes];
            
            // Recalculate available collection types based on current research
            const research = this.gameState.getResearchSystem();
            const availableTypes = [];
            if (research.researched.has('auto_minerals')) availableTypes.push('minerals');
            if (research.researched.has('auto_data')) availableTypes.push('data');
            if (research.researched.has('auto_artifacts')) availableTypes.push('artifacts');
            
            // Update the equipment
            probe.equipment.availableTypes = availableTypes;
            
            // If universal collection is researched, set collection to 'all'
            if (research.researched.has('auto_all')) {
                probe.equipment.collectionTypes = ['all'];
            } else {
                // Add new collection types to existing ones (don't remove existing preferences)
                const currentTypes = probe.equipment.collectionTypes;
                const updatedTypes = [...new Set([...currentTypes, ...availableTypes])];
                probe.equipment.collectionTypes = updatedTypes;
            }
            
            console.log(`Updated probe ${probe.id} equipment:`, {
                old: oldCollectionTypes,
                new: probe.equipment.collectionTypes,
                available: availableTypes
            });
        });
        
        // Update UI for any selected probe
        if (this.gameState.ui.selectedProbe) {
            this.uiManager.updateEquipmentDisplay(this.gameState.ui.selectedProbe);
        }
        
        // Show notification
        this.eventBus.emit('ui:message', { 
            text: 'Probe equipment updated with new collection capabilities!', 
            type: 'success' 
        });
    }

    /**
     * Remove equipment from probe (delegate to UIManager)
     */
    removeEquipment(probeId) {
        this.uiManager.removeEquipment(probeId);
    }

    /**
     * Disable all save buttons to prevent rapid clicking during save operations
     */
    disableAllSaveButtons() {
        document.querySelectorAll('.save-slot-btn[data-action="save"]').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    }

    /**
     * Re-enable all save buttons after save operation completes
     */
    enableAllSaveButtons() {
        document.querySelectorAll('.save-slot-btn[data-action="save"]').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
    }
}

// Export for use in other modules
window.GameController = GameController;