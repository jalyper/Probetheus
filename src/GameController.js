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
        
        // Track if asteroid field tip has been shown
        this.hasShownAsteroidTip = false;
        
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
        this.uiManager = new UIManager(this.gameState, this.eventBus, this.probeManager, this.buildingSystem);
        
        // Make cosmetic manager available to gameState for easy access
        this.gameState.cosmeticManager = this.cosmeticManager;
        
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
        
        // Listen for asteroid field entry
        this.eventBus.on('probe:enteredAsteroidField', () => {
            this.showAsteroidFieldTip();
        });
        
        // Listen for screen switching events
        this.eventBus.on('ui:switchScreen', (data) => {
            this.showScreen(data.screen + 'Screen');
            if (data.screen === 'research') {
                this.eventBus.emit('research:showTree');
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
        
        this.setupCanvas();
        this.initializeGame();
        this.setupEventListeners();
        
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
        
        // Tips will be shown by cutscene system for new games, 
        // or immediately for continued/loaded games
        if (this.shouldShowTipsImmediately()) {
            this.showGameTips();
        }
        
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
     * Determine if tutorial tips should show immediately
     * (for continued/loaded games) vs waiting for cutscene (new games)
     */
    shouldShowTipsImmediately() {
        // For new games, tips will be triggered by cutscene system
        // For continued/loaded games, show tips immediately
        const gameLoadType = window.gameLoadType || 'unknown';
        
        console.log('shouldShowTipsImmediately: gameLoadType =', gameLoadType);
        
        // Show immediately for continued and loaded games
        // Wait for cutscene trigger for new games
        return gameLoadType === 'continue' || gameLoadType === 'load';
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
                        speed: 0.0001,
                        pulseTimer: 0,
                        pulses: [],
                        radarPulses: [],
                        active: true,
                        hub: hub,
                        recoveryMode: false,
                        outboundWaypointsCount: 0,
                        returnSpeed: 0.0003,
                        patrolMode: true,
                        equipment: null,
                        status: 'ready',
                        returnedToHub: false,
                        // Apply active cosmetic skin (if CosmeticManager exists)
                        cosmetic: this.gameState.cosmeticManager ? 
                            { ...this.gameState.cosmeticManager.getActiveSkinDesign() } :
                            {
                                // Fallback default skin
                                trailEnabled: true,
                                trail: {
                                    length: 15,
                                    color: '#00ffff',
                                    width: 3,
                                    opacity: 0.9
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
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.x;
            const y = (e.clientY - rect.top) / this.gameState.world.zoomLevel + this.gameState.world.viewOffset.y;
            
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
                
                this.gameState.world.viewOffset.x = this.gameState.input.lastViewOffset.x - deltaX / this.gameState.world.zoomLevel;
                this.gameState.world.viewOffset.y = this.gameState.input.lastViewOffset.y - deltaY / this.gameState.world.zoomLevel;
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
                console.log('Stopped camera dragging');
                this.gameState.input.isDragging = false;
                this.canvas.style.cursor = 'grab';
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

        // Probetheum test button
        const testProbetheum = document.getElementById('testAddProbetheum');
        if (testProbetheum) {
            testProbetheum.addEventListener('click', () => {
                if (this.miningManager && this.miningManager.gameState.mining) {
                    this.miningManager.gameState.mining.totalProbetheum += 1.0;
                    this.miningManager.updateProbetheum();
                    console.log('Added 1.0 Probetheum');
                }
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
    }

    /**
     * Handle canvas clicks
     */
    handleCanvasClick(worldX, worldY) {
        console.log(`=== CANVAS CLICK HANDLER ===`);
        console.log(`Click at world: (${worldX}, ${worldY})`);
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
            this.eventBus.emit('entity:selected', { entity: clickedProbe, type: 'probe' });
            return;
        }

        // Check for signal clicks
        const clickedSignal = this.findSignalAt(worldX, worldY);
        if (clickedSignal) {
            console.log('Found signal at click location');
            this.collectSignal(clickedSignal);
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
            return distance <= 60; // Large hitbox for easy selection
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
        
        this.gameState.entities.probes.forEach(probe => {
            if (probe.active && probe.status === 'exploring') {
                const distance = Math.sqrt(
                    Math.pow(x - probe.current.x, 2) + 
                    Math.pow(y - probe.current.y, 2)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestProbe = probe;
                }
            }
        });
        
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
        
        // Emit event for tutorial
        this.eventBus.emit('signal:identified');
        
        // Remove signal from world
        const index = this.gameState.entities.signals.indexOf(signal);
        if (index > -1) {
            this.gameState.entities.signals.splice(index, 1);
        }
        
        // Show exploration modal
        this.showExplorationModal(signal);
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
     * Show exploration screen
     */
    showExplorationScreen(planet, signal) {
        // Update planet info - show name and type separately
        document.getElementById('planetName').textContent = `${planet.name} (${planet.type})`;
        document.getElementById('planetDesc').textContent = planet.description;
        
        // Store planet data for exploration
        this.currentPlanet = planet;
        this.currentSignal = signal;
        
        // Show exploration screen
        this.showScreen('exploreScreen');
        
        // Highlight best resource options based on planet type
        this.highlightPlanetResources(planet.type);
        
        // Emit event for tutorial (when exploration screen first appears)
        this.eventBus.emit('exploration:screenShown');
        
        // Draw planet on canvas
        this.drawPlanet(planet);
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
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show selected screen
        document.getElementById(screenId).classList.add('active');
    }

    /**
     * Explore planet with chosen method
     */
    explore(mode) {
        if (!this.currentPlanet || !this.currentSignal) return;

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

        // Add bonus exotic minerals for rare+ signals
        let exoticBonus = 0;
        if (rarity === 'rare') exoticBonus = 1;
        else if (rarity === 'epic') exoticBonus = 3;
        else if (rarity === 'legendary') exoticBonus = 10;

        // Find nearest active probe to store the rewards
        const nearestProbe = this.findNearestActiveProbe(signal.x, signal.y);
        if (nearestProbe) {
            // Initialize cargo if it doesn't exist
            if (!nearestProbe.cargo) {
                nearestProbe.cargo = {
                    minerals: 0,
                    data: 0,
                    artifacts: 0,
                    exoticMinerals: 0
                };
            }
            
            // Add rewards to probe's cargo
            nearestProbe.cargo[primaryReward] += rewardAmount;
            if (exoticBonus > 0) {
                nearestProbe.cargo.exoticMinerals += exoticBonus;
            }
            
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
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

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

        // Update selected probe detail panel position continuously
        if (this.gameState.ui.selectedProbe && 
            document.getElementById('probeDetailPanel').style.display === 'block') {
            this.uiManager.updateProbeDetailPanelPosition(this.gameState.ui.selectedProbe);
        }

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
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context and apply zoom
        this.ctx.save();
        this.ctx.scale(this.gameState.world.zoomLevel, this.gameState.world.zoomLevel);

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

        // Restore context
        this.ctx.restore();
    }

    /**
     * Render stars
     */
    renderStars() {
        this.ctx.fillStyle = '#666';
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
            let probeColor = '#0ff'; // Default cyan for exploring
            
            if (probe === this.gameState.ui.selectedProbe) {
                probeColor = isOnReturnSegment ? '#ffa500' : '#ff0'; // Orange for on return segment, Yellow for exploring
            } else if (isOnReturnSegment) {
                probeColor = '#ff8c00'; // Dark orange for returning unselected
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
                
                this.ctx.strokeStyle = `rgba(0, 255, 255, ${1 - pulse.elapsed / pulse.duration})`;
                this.ctx.lineWidth = 2;
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
        const trailColor = trailConfig.color || probe.cosmetic.bodyColor || '#0ff';
        const trailWidth = trailConfig.width || 2;
        const trailOpacity = trailConfig.opacity || 0.8;
        
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
                    rgba = `rgba(0,255,255,${alpha})`; // Default cyan
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
        
        // Determine colors based on selection
        const selectedColors = { exploration: '#ff0', return: '#ffa500' }; // Yellow exploration, Orange return
        const unselectedColors = { exploration: 'rgba(0, 255, 255, 0.6)', return: 'rgba(255, 165, 0, 0.6)' }; // Cyan exploration, Orange return
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
                
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
                this.ctx.beginPath();
                this.ctx.arc(waypointX, waypointY, 4, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.strokeStyle = '#ff0';
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
                this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([10, 10]);
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, hub.range, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            // Draw hub icon - hexagonal base (matching original design)
            this.ctx.strokeStyle = hub.selected ? '#ffff00' : '#00ff80';
            this.ctx.fillStyle = hub.selected ? '#404000' : '#004020';
            this.ctx.lineWidth = hub.selected ? 4 : 3;
            
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
            
            // Add pulsing animation for selected hub
            if (hub.selected) {
                const pulseSize = size + Math.sin(Date.now() * 0.005) * 3;
                this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                this.ctx.lineWidth = 2;
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
                // Ready/idle probes - blue color
                this.ctx.fillStyle = '#00ffff';
                this.ctx.globalAlpha = 1.0;
            } else if (i < activeProbes.length) {
                // Working probes - green color
                this.ctx.fillStyle = '#00ff80';
                this.ctx.globalAlpha = 1.0;
            } else {
                // Empty slots - faded green
                this.ctx.fillStyle = '#00ff80';
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
        const currentTime = Date.now();
        
        this.gameState.entities.signals.forEach(signal => {
            const screenX = signal.x - this.gameState.world.viewOffset.x;
            const screenY = signal.y - this.gameState.world.viewOffset.y;
            
            // Calculate age and fade effect
            const age = currentTime - (signal.createdAt || currentTime);
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
            
            // Draw signal with appropriate color and pulsing
            // Get base color for rarity
            const rarityColors = {
                common: '#fff',
                uncommon: '#0f0', 
                rare: '#06f',
                epic: '#f0f',
                legendary: '#ffd700'
            };
            
            // Apply signal type theming
            let color = rarityColors[signal.rarity] || '#fff';
            
            // Override color for themed signals
            if (signal.signalType) {
                switch (signal.signalType) {
                    case 'mineral':
                        // Orange/amber theme for minerals
                        const mineralColors = {
                            common: '#ff8c00',
                            uncommon: '#ffa500', 
                            rare: '#ff6b00',
                            epic: '#ff4500',
                            legendary: '#ff2500'
                        };
                        color = mineralColors[signal.rarity] || '#ff8c00';
                        break;
                        
                    case 'data':
                        // Green/cyan theme for data
                        const dataColors = {
                            common: '#00ff88',
                            uncommon: '#00ffaa', 
                            rare: '#00ffcc',
                            epic: '#00ffff',
                            legendary: '#88ffff'
                        };
                        color = dataColors[signal.rarity] || '#00ff88';
                        break;
                        
                    case 'artifact':
                        // Purple/magenta theme for artifacts
                        const artifactColors = {
                            common: '#aa88ff',
                            uncommon: '#bb99ff', 
                            rare: '#ccaaff',
                            epic: '#ddbbff',
                            legendary: '#eeccff'
                        };
                        color = artifactColors[signal.rarity] || '#aa88ff';
                        break;
                        
                    case 'mixed':
                    default:
                        // Keep standard rarity colors for mixed signals
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
            
            gradient.addColorStop(0, hexToRgba(color, 0.5 * fadeAlpha)); // Semi-transparent center
            gradient.addColorStop(0.5, hexToRgba(color, 0.25 * fadeAlpha)); // More transparent middle
            gradient.addColorStop(1, hexToRgba(color, 0)); // Fully transparent edge
            
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
                this.ctx.fillStyle = '#ffffff';
                
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
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([4, 4]);
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, radius * 3, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]); // Reset line dash
            }
            
            // Reset global alpha
            this.ctx.globalAlpha = 1;
        });
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
                this.ctx.fillStyle = '#ff0';
                this.ctx.fillRect(x - 8, y - 8, 16, 16);
            } else if (structure.type === 'miningFacility') {
                this.ctx.fillStyle = '#f80';
                this.ctx.fillRect(x - 12, y - 12, 24, 24);
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
            
            // Skip if off-screen
            if (screenX < -50 || screenX > this.canvas.width + 50 || 
                screenY < -50 || screenY > this.canvas.height + 50) return;
            
            const stationType = this.miningManager.getStationTypes()[station.type];
            const baseSize = station.type === 'basic' ? 18 : station.type === 'advanced' ? 22 : 26;
            const size = baseSize + station.level * 2;
            
            // Animation values
            const time = Date.now() * 0.001; // Convert to seconds
            const rotationSpeed = station.active ? 0.5 : 0; // Rotate only when active
            const rotation = time * rotationSpeed;
            const pulsePhase = Math.sin(time * 2) * 0.5 + 0.5; // 0 to 1, every 0.5 seconds
            
            // TRON-like color scheme
            const baseColor = '#aaa'; // Light gray
            const activeGlow = station.active ? '#00ffff' : '#004444'; // Cyan glow when active
            const strokeColor = station.active ? '#00dddd' : '#666666';
            
            this.ctx.save();
            this.ctx.translate(screenX, screenY);
            
            // Outer glow effect when active (color changes based on resource status)
            if (station.active) {
                const glowIntensity = 0.3 + pulsePhase * 0.4; // Pulse between 0.3 and 0.7
                const glowSize = size + 8 + pulsePhase * 6;
                
                // Determine glow color based on resource status
                const progress = this.miningManager.getStationResourceProgress(station, stationType);
                let glowColor = '#00ffff'; // Default cyan
                
                if (progress < 0.3) {
                    glowColor = '#ff4400'; // Red when low on resources
                } else if (progress < 0.7) {
                    glowColor = '#ff8800'; // Orange when medium resources
                } else {
                    glowColor = '#00ffff'; // Cyan when good resources
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
            
            // Main octagonal structure
            this.ctx.fillStyle = baseColor;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
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
            
            // Inner geometric details (TRON-style lines)
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 1;
            
            // Draw inner cross pattern
            this.ctx.beginPath();
            const innerSize = size * 0.6;
            this.ctx.moveTo(-innerSize, 0);
            this.ctx.lineTo(innerSize, 0);
            this.ctx.moveTo(0, -innerSize);
            this.ctx.lineTo(0, innerSize);
            
            // Diagonal lines
            const diagSize = size * 0.4;
            this.ctx.moveTo(-diagSize, -diagSize);
            this.ctx.lineTo(diagSize, diagSize);
            this.ctx.moveTo(-diagSize, diagSize);
            this.ctx.lineTo(diagSize, -diagSize);
            this.ctx.stroke();
            
            // Central energy core
            if (station.active) {
                const coreSize = 4 + pulsePhase * 3;
                const coreGlow = 0.8 + pulsePhase * 0.2;
                
                this.ctx.fillStyle = '#00ffff';
                this.ctx.globalAlpha = coreGlow;
                this.ctx.shadowColor = '#00ffff';
                this.ctx.shadowBlur = 10;
                
                this.ctx.beginPath();
                this.ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.shadowBlur = 0;
                this.ctx.globalAlpha = 1;
            } else {
                // Inactive core
                this.ctx.fillStyle = '#333';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
            
            // Note: Low resources indication is now handled by the main glow color above
            
            // Draw level indicator
            if (station.level > 1) {
                this.ctx.font = '10px Arial';
                this.ctx.fillStyle = '#ff0';
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
                this.ctx.fillStyle = 'rgba(60, 60, 60, 0.8)';
                this.ctx.fillRect(screenX - 20, screenY + size + 15, barWidth, barHeight);
                
                // Calculate fill width based on progress
                const fillWidth = barWidth * progress;
                let barColor;
                
                if (progress >= 0.95) { // Green when 95% or more filled (accounts for continuous consumption)
                    barColor = '#00ff00';
                } else if (progress > 0) {
                    // Yellow to orange gradient as it fills up
                    const intensity = Math.min(1, progress + 0.3);
                    barColor = `rgb(${Math.floor(255 * intensity)}, ${Math.floor(255 * intensity * 0.8)}, 0)`;
                } else {
                    // Blinking red when empty
                    const blinkAlpha = 0.3 + 0.7 * Math.abs(Math.sin(time));
                    barColor = `rgba(255, 68, 0, ${blinkAlpha})`;
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
            
            // Skip if off-screen
            if (screenX < -20 || screenX > this.canvas.width + 20 || 
                screenY < -20 || screenY > this.canvas.height + 20) return;
            
            // Draw shuttle body with status-based colors
            const size = 8 + shuttle.level;
            let shuttleColor = '#ff0'; // Default yellow for returning
            if (shuttle.status === 'delivering') shuttleColor = '#0f0'; // Green when delivering
            else if (shuttle.status === 'waiting') shuttleColor = '#888'; // Gray when waiting
            
            this.ctx.fillStyle = shuttleColor;
            this.ctx.strokeStyle = '#fff';
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
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + cargoPercent * 0.5})`;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.restore();
            }
            
            // Draw shuttle trail
            this.ctx.strokeStyle = `rgba(200, 150, 255, 0.3)`;
            this.ctx.lineWidth = 2;
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
        
        this.ctx.strokeStyle = '#0ff';
        this.ctx.lineWidth = 2;
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
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
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
        
        // Draw selection rectangle with security camera style
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
        this.ctx.lineWidth = 2;
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
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 1.0)';
        this.ctx.lineWidth = 3;
        
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
        
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
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
                
                this.ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
                this.ctx.beginPath();
                this.ctx.arc(pointScreenX, pointScreenY, 6, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.strokeStyle = 'rgba(0, 255, 255, 1)';
                this.ctx.lineWidth = 2;
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
    
    /**
     * Show asteroid field warning tip
     */
    showAsteroidFieldTip() {
        if (this.hasShownAsteroidTip) return;
        this.hasShownAsteroidTip = true;
        
        const tipsElement = document.getElementById('gameTips');
        const tipText = document.getElementById('tipText');
        
        if (!tipsElement || !tipText) return;
        
        // Update text for asteroid field warning
        tipText.innerHTML = 'ASTEROID FIELDS YIELD 3X RESOURCES<br>BUT THERE ARE RISKS<br>ROUTES HERE MUST BE PROTECTED FROM ASTEROID IMPACT';
        
        // Hide progress dots for this one-time tip
        const tipProgress = document.getElementById('tipProgress');
        if (tipProgress) {
            tipProgress.style.display = 'none';
        }
        
        // Show tip
        tipsElement.style.opacity = '1';
        
        // Fade out after 6 seconds (longer for this important warning)
        setTimeout(() => {
            tipsElement.style.opacity = '0';
            setTimeout(() => {
                tipsElement.style.display = 'none';
                // Restore progress dots for future use
                if (tipProgress) {
                    tipProgress.style.display = 'flex';
                }
            }, 500);
        }, 6000);
    }
    
    /**
     * Show TRON-style game tips
     */
    showGameTips() {
        // Check if tutorial has already been completed
        if (localStorage.getItem('tutorialCompleted') === 'true') {
            console.log('Tutorial already completed, skipping');
            return;
        }
        
        // Load tutorial progress
        const savedProgress = this.loadTutorialProgress();
        console.log('Loaded tutorial progress:', savedProgress);
        
        const tipsElement = document.getElementById('gameTips');
        const tipText = document.getElementById('tipText');
        const tipDots = [
            document.getElementById('tipDot1'),
            document.getElementById('tipDot2'),
            document.getElementById('tipDot3'),
            document.getElementById('tipDot4'),
            document.getElementById('tipDot5'),
            document.getElementById('tipDot6'),
            document.getElementById('tipDot7'),
            document.getElementById('tipDot8'),
            document.getElementById('tipDot9')
        ];
        
        if (!tipsElement || !tipText) return;
        
        // Initialize from saved progress
        let hasDragged = savedProgress.hasDragged;
        let hasScrolled = savedProgress.hasScrolled;
        let hasIdentifiedSignal = savedProgress.hasIdentifiedSignal;
        let hasChosenAction = savedProgress.hasChosenAction;
        let hasSeenProbeLimit = savedProgress.hasSeenProbeLimit;
        let hasSeenBuildInfo = savedProgress.hasSeenBuildInfo;
        let hasClickedHubForBuild = savedProgress.hasClickedHubForBuild;
        let currentTip = savedProgress.currentStep;
        
        // Initialize deployment count - track actual deployment actions, not probe count
        let deployedProbeCount = savedProgress.deployedProbeCount;
        
        // For new games, deployedProbeCount should start at 0 regardless of existing probes
        // Only saved progress from resumed games should count
        const isNewGame = window.gameLoadType === 'new' && savedProgress.currentStep === 0;
        if (isNewGame) {
            deployedProbeCount = 0;
        }
        
        // Define tips
        const tips = [
            { text: 'CLICK AND DRAG TO MOVE', action: 'drag' },
            { text: 'SCROLL TO ZOOM IN/OUT', action: 'scroll' },
            { text: 'CLICK ON HUB TO DEPLOY YOUR FIRST PROBE', action: 'deploy_first', counter: true },
            { text: 'IDENTIFY SIGNALS BY CLICKING ON THEM AS THEY\'RE DISCOVERED BY YOUR PROBES', action: 'signal' },
            { text: 'CONTINUE DEPLOYING PROBES TO EXPLORE MORE SPACE', action: 'deploy_continue', counter: true },
            { text: 'CHOOSE AN ACTION. EACH ACTION YIELDS DIFFERENT REWARDS.', action: 'planet' },
            { text: 'YOU CAN DEPLOY UP TO <span style="color: #ffff00; text-shadow: 0 0 10px #ffff00;">5</span> PROBES PER HUB', action: 'info1' },
            { text: 'WHEN YOU IDENTIFY ENOUGH MINERALS, BUILD MORE PROBES FROM YOUR HUB.', action: 'info2' },
            { text: 'CLICK ON A HUB TO SEE THE BUILD PROBE BUTTON', action: 'hubclick' }
        ];
        
        // Only skip ahead if this is a resumed game with progress, not a fresh start
        // Check if tutorial progress exists or if this is a continued/loaded game
        const isResumedGame = savedProgress.currentStep > 0 || window.gameLoadType === 'continue' || window.gameLoadType === 'load';
        
        if (deployedProbeCount >= 3 && isResumedGame) {
            currentTip = Math.max(savedProgress.currentStep, 5); // Start from planet interaction tip or saved progress
        }
        
        // Initialize tutorial hub interaction state
        this.tutorialAllowsHubClick = false;
        
        // Helper function to update progress
        const updateProgress = () => {
            const progress = {
                completedSteps: [], // We'll track this differently
                currentStep: currentTip,
                hasDragged,
                hasScrolled,
                deployedProbeCount,
                hasIdentifiedSignal,
                hasChosenAction,
                hasSeenProbeLimit,
                hasSeenBuildInfo,
                hasClickedHubForBuild
            };
            this.saveTutorialProgress(progress);
        };
        
        // Function to show current tip
        const showCurrentTip = () => {
            if (currentTip >= tips.length) {
                // All tips completed, mark tutorial as complete and fade out
                this.completeTutorial();
                setTimeout(() => {
                    tipsElement.style.opacity = '0';
                    setTimeout(() => {
                        tipsElement.style.display = 'none';
                    }, 3000);
                }, 3000);
                return;
            }
            
            // Update text (handle HTML for special formatting)
            if (tips[currentTip].text.includes('<span')) {
                tipText.innerHTML = tips[currentTip].text;
            } else {
                let displayText = tips[currentTip].text;
                // Add counter for deploy tips
                if (tips[currentTip].counter && tips[currentTip].action === 'deploy_first') {
                    displayText += ` ${deployedProbeCount}/1 PROBE DEPLOYED`;
                } else if (tips[currentTip].counter && tips[currentTip].action === 'deploy_continue') {
                    displayText += ` ${deployedProbeCount}/3 PROBES DEPLOYED`;
                }
                tipText.textContent = displayText;
            }
            
            // Update progress dots
            tipDots.forEach((dot, index) => {
                if (dot) {
                    if (index === currentTip) {
                        dot.style.background = '#00ffff';
                        dot.style.border = 'none';
                        dot.style.boxShadow = '0 0 5px #00ffff';
                    } else {
                        dot.style.background = 'none';
                        dot.style.border = '1px solid #00ffff';
                        dot.style.boxShadow = 'none';
                    }
                }
            });
            
            // Control hub clicking based on tutorial step
            const currentAction = tips[currentTip]?.action;
            this.tutorialAllowsHubClick = (currentAction === 'deploy_first' || currentAction === 'deploy_continue' || currentAction === 'hubclick');
            console.log(`Tutorial step ${currentTip} (${currentAction}): hub clicking ${this.tutorialAllowsHubClick ? 'allowed' : 'restricted'}`);
        };
        
        // Track drag action
        let isDragging = false;
        let dragStartPos = null;
        
        const handleMouseDown = (e) => {
            if (currentTip === 0 && tips[currentTip].action === 'drag') {
                isDragging = true;
                dragStartPos = { x: e.clientX, y: e.clientY };
            }
        };
        
        const handleMouseMove = (e) => {
            if (isDragging && dragStartPos) {
                const dragDistance = Math.sqrt(
                    Math.pow(e.clientX - dragStartPos.x, 2) + 
                    Math.pow(e.clientY - dragStartPos.y, 2)
                );
                
                // If dragged more than 50 pixels, consider it completed
                if (dragDistance > 50 && !hasDragged) {
                    hasDragged = true;
                    currentTip++;
                    updateProgress();
                    showCurrentTip();
                }
            }
        };
        
        const handleMouseUp = () => {
            isDragging = false;
            dragStartPos = null;
        };
        
        // Track scroll action
        const handleWheel = (e) => {
            if (currentTip === 1 && tips[currentTip].action === 'scroll' && !hasScrolled) {
                hasScrolled = true;
                currentTip++;
                updateProgress();
                showCurrentTip();
            }
        };
        
        // Track probe deployment with counter
        const checkProbeDeployment = () => {
            // First probe deployment (step 2)
            if (currentTip === 2 && tips[currentTip].action === 'deploy_first') {
                deployedProbeCount++;
                updateProgress();
                // Update the tip text with new count
                showCurrentTip();
                
                // Move to signal identification tip after first probe
                if (deployedProbeCount >= 1) {
                    currentTip++;
                    updateProgress();
                    showCurrentTip();
                }
            }
            // Continue deploying probes (step 4)
            else if (currentTip === 4 && tips[currentTip].action === 'deploy_continue') {
                deployedProbeCount++;
                updateProgress();
                // Update the tip text with new count
                showCurrentTip();
                
                // Move to next tip when 3 probes are deployed
                if (deployedProbeCount >= 3) {
                    currentTip++;
                    updateProgress();
                    showCurrentTip();
                }
            }
        };
        
        // Track signal identification
        const checkSignalCollection = () => {
            if (currentTip === 3 && tips[currentTip].action === 'signal' && !hasIdentifiedSignal) {
                hasIdentifiedSignal = true;
                currentTip++;
                updateProgress();
                showCurrentTip();
            }
        };
        
        // Track exploration screen appearing
        const checkExplorationScreen = () => {
            // When exploration screen appears, advance to "CHOOSE AN ACTION" if we're at "CONTINUE DEPLOYING"
            if (currentTip === 4 && tips[currentTip].action === 'deploy_continue') {
                currentTip = 5; // Jump to "CHOOSE AN ACTION"
                updateProgress();
                showCurrentTip();
            }
        };
        
        // Track planet action choice
        const checkPlanetAction = () => {
            if (currentTip === 5 && tips[currentTip].action === 'planet' && !hasChosenAction) {
                hasChosenAction = true;
                currentTip++;
                updateProgress();
                showCurrentTip();
                
                // Start timer for info tips
                setTimeout(() => {
                    if (currentTip === 6 && !hasSeenProbeLimit) {
                        hasSeenProbeLimit = true;
                        currentTip++;
                        updateProgress();
                        showCurrentTip();
                        
                        setTimeout(() => {
                            if (currentTip === 7 && !hasSeenBuildInfo) {
                                hasSeenBuildInfo = true;
                                currentTip++;
                                updateProgress();
                                showCurrentTip();
                                
                                // No need for automatic progression - wait for hub click
                            }
                        }, 3000);
                    }
                }, 2000);
            }
        };
        
        // Track hub click for final tutorial step
        const checkHubClick = () => {
            if (currentTip === 8 && tips[currentTip].action === 'hubclick' && !hasClickedHubForBuild) {
                hasClickedHubForBuild = true;
                
                // Mark tutorial as complete
                this.completeTutorial();
                
                // Hide the tip
                tipsElement.style.opacity = '0';
                setTimeout(() => {
                    tipsElement.style.display = 'none';
                }, 500);
                
                // Highlight the BUILD PROBE button after a short delay
                setTimeout(() => {
                    this.highlightBuildProbeButton();
                }, 1000);
            }
        };
        
        // Listen for game events
        this.eventBus.on('probe:deployed', checkProbeDeployment);
        this.eventBus.on('signal:identified', checkSignalCollection);
        this.eventBus.on('exploration:screenShown', checkExplorationScreen);
        this.eventBus.on('planet:actionChosen', checkPlanetAction);
        this.eventBus.on('hub:clicked', checkHubClick);
        
        // Add event listeners
        this.canvas.addEventListener('mousedown', handleMouseDown);
        this.canvas.addEventListener('mousemove', handleMouseMove);
        this.canvas.addEventListener('mouseup', handleMouseUp);
        this.canvas.addEventListener('wheel', handleWheel);
        
        // Show first tip after a short delay
        setTimeout(() => {
            tipsElement.style.opacity = '1';
            showCurrentTip();
        }, 500);
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
        const currentTime = Date.now();
        const initialCount = this.gameState.entities.signals.length;
        
        this.gameState.entities.signals = this.gameState.entities.signals.filter(signal => {
            const age = currentTime - (signal.createdAt || currentTime);
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
        const { x, y, amount, resourceType, pending } = data;
        
        const colors = {
            minerals: '#fff',     // White (common signals)
            data: '#fff',         // White (common signals)
            artifacts: '#fff',    // White (common signals)
            all: '#ffd700'        // Gold (universal collection)
        };
        
        // Different styling for pending vs delivered resources
        const text = pending ? `+${amount} (pending)` : `+${amount}`;
        const color = pending ? '#ff9900' : (colors[resourceType] || '#fff'); // Orange for pending
        
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
                    
                    // Draw sector boundary
                    this.ctx.strokeStyle = sector.type.borderColor;
                    this.ctx.lineWidth = 3;
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
                        this.ctx.fillStyle = '#fff';
                        this.ctx.font = 'bold 24px monospace';
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
                            
                            this.ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
                            this.ctx.fillRect(sectorScreenX, sectorScreenY, world.standardSectorWidth, world.standardSectorHeight);
                            
                            this.ctx.strokeStyle = '#333';
                            this.ctx.lineWidth = 2;
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
                    const saveData = this.saveManager.createSaveData(); // This needs to be synchronous
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