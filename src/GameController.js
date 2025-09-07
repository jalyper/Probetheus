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
        this.researchManager = new ResearchManager(this.gameState, this.eventBus);
        this.sectorManager = new SectorManager(this.gameState, this.eventBus);
        this.saveManager = new SaveManager(this.gameState, this.eventBus);
        this.offlineManager = new OfflineManager(this.gameState, this.eventBus);
        this.uiManager = new UIManager(this.gameState, this.eventBus, this.probeManager, this.buildingSystem);
        
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
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight - 100;
            
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
                        returnedToHub: false
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
            
            // Cancel deployment mode
            if (this.gameState.ui.deployMode) {
                this.gameState.ui.deployMode = false;
                this.gameState.ui.deploymentPoints = [];
                this.canvas.style.cursor = 'grab';
                document.getElementById('probeStatus').textContent = '';
            }
        });

        // Deploy probe button
        document.getElementById('deployProbeBtn').addEventListener('click', () => {
            if (this.gameState.ui.selectedHub && 
                this.probeManager.getReadyProbeCountForHub(this.gameState.ui.selectedHub) > 0 && 
                !this.gameState.ui.deployMode && 
                !this.gameState.ui.hubPlacementMode) {
                
                this.gameState.ui.deployMode = true;
                this.gameState.ui.deploymentPoints = [];
                this.canvas.style.cursor = 'crosshair';
                document.getElementById('probeStatus').textContent = 'Click to set first waypoint...';
            }
        });

        // Build probe button
        document.getElementById('buildProbeBtn').addEventListener('click', () => {
            if (this.gameState.ui.selectedHub) {
                this.eventBus.emit('probe:build', { hub: this.gameState.ui.selectedHub });
            }
        });

        // Build hub button removed - now handled by probe building system

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

        // Check for hub clicks FIRST (higher priority than probes)
        const clickedHub = this.findHubAt(worldX, worldY);
        if (clickedHub) {
            console.log('Found hub at click location');
            this.selectHub(clickedHub);
            return;
        }

        // Check for probe clicks SECOND (only if no hub was clicked)
        const clickedProbe = this.findProbeAt(worldX, worldY);
        if (clickedProbe) {
            console.log('Found probe at click location');
            this.eventBus.emit('probe:select', { probe: clickedProbe });
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
                document.getElementById('probeStatus').textContent = 'Click second destination (or right-click to deploy)...';
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
     * Collect a signal
     */
    collectSignal(signal) {
        console.log('Signal collected:', signal.rarity);
        
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
        const planetNames = [
            'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Theta', 'Omega'
        ];
        
        const type = planetTypes[Math.floor(Math.random() * planetTypes.length)];
        const name = planetNames[Math.floor(Math.random() * planetNames.length)] + ' ' + 
                     (Math.floor(Math.random() * 999) + 1);
        
        return {
            name: `${type} ${name}`,
            type: type,
            rarity: signal.rarity,
            description: `A ${type.toLowerCase()} world with ${signal.rarity} potential for discovery.`
        };
    }

    /**
     * Show exploration screen
     */
    showExplorationScreen(planet, signal) {
        // Update planet info
        document.getElementById('planetName').textContent = planet.name;
        document.getElementById('planetDesc').textContent = planet.description;
        
        // Store planet data for exploration
        this.currentPlanet = planet;
        this.currentSignal = signal;
        
        // Show exploration screen
        this.showScreen('exploreScreen');
        
        // Draw planet on canvas
        this.drawPlanet(planet);
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

        const rewards = baseRewards[rarity] || baseRewards.common;
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
            this.gameState.updateProbethiumStats('signal_collected');
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
     * Update cursor based on what's under mouse
     */
    updateCursor(worldX, worldY) {
        if (this.gameState.ui.deployMode || this.gameState.ui.hubPlacementMode) {
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
     * Complete signal selection and collect selected signals
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
        
        console.log(`Selected ${selectedSignals.length} signals for collection`);
        
        // Collect all selected signals
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
            
            this.ctx.fillStyle = probeColor;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
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
            
            // Draw path for all probes with waypoints (not just selected)
            if (probe.waypoints && probe.waypoints.length > 1) {
                this.renderProbePath(probe);
            }
        });
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
            const colors = {
                common: '#fff',
                uncommon: '#0f0', 
                rare: '#06f',
                epic: '#f0f',
                legendary: '#ffd700'
            };
            
            const color = colors[signal.rarity] || '#fff';
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
    showSaveLoadModal() {
        console.log('showSaveLoadModal called');
        console.log('SaveManager available:', !!this.saveManager);
        const modal = document.getElementById('saveLoadModal');
        const slotsContainer = document.getElementById('saveSlots');
        
        if (!modal || !slotsContainer) return;
        
        // Clear existing slots
        slotsContainer.innerHTML = '';
        
        // Get save slot information
        const slots = this.saveManager.getAllSaveSlots();
        
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
        // Check if there's a recent auto-save timestamp in localStorage
        const lastPlayTime = localStorage.getItem('csog_last_play_time');
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
        localStorage.setItem('csog_last_play_time', Date.now().toString());
        
        // Update last play time every 30 seconds while playing
        setInterval(() => {
            localStorage.setItem('csog_last_play_time', Date.now().toString());
        }, 30000);
    }

    /**
     * Setup auto-save when player closes browser or refreshes
     */
    setupAutoSaveOnExit() {
        // Auto-save on page unload (browser close, refresh, navigation)
        window.addEventListener('beforeunload', (event) => {
            try {
                // Perform immediate synchronous save to slot 1 (auto-save slot)
                const saveData = this.saveManager.createSaveData();
                const autoSaveKey = 'csog_save_auto';
                localStorage.setItem(autoSaveKey, JSON.stringify(saveData));
                
                // Also update the last play time
                localStorage.setItem('csog_last_play_time', Date.now().toString());
                
                console.log('Auto-saved on page unload');
                
                // Don't show confirmation dialog for normal operation
                // event.preventDefault() or returning a string would show "Are you sure?" dialog
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        });

        // Also setup auto-save every 5 minutes during play
        setInterval(() => {
            try {
                const saveData = this.saveManager.createSaveData();
                const autoSaveKey = 'csog_save_auto';
                localStorage.setItem(autoSaveKey, JSON.stringify(saveData));
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
            const savedData = localStorage.getItem(autoSaveKey);
            
            if (!savedData) {
                console.log('No auto-save data found');
                return false;
            }

            const saveData = JSON.parse(savedData);
            this.saveManager.restoreGameState(saveData.gameState);
            
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
            const saveData = this.saveManager.createSaveData();
            console.log('performAutoSave: Save data created successfully');
            
            const autoSaveKey = 'csog_save_auto';
            console.log('performAutoSave: Attempting to save to localStorage with key:', autoSaveKey);
            localStorage.setItem(autoSaveKey, JSON.stringify(saveData));
            console.log('performAutoSave: Auto-save written to localStorage');
            
            localStorage.setItem('csog_last_play_time', Date.now().toString());
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