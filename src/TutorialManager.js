/**
 * Tutorial Management System
 * Handles tutorial tips and mission briefings for new players
 */
class TutorialManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        
        // Tutorial state tracking
        this.currentStep = 0;
        this.tutorialActive = false;
        this.tutorialsDisabled = this.loadTutorialDisabledState();
        
        // Step tracking
        this.steps = [
            {
                id: 'deploy_first_probe',
                title: 'Deploy Your First Probe',
                message: 'To probe the unknown, you need a probe! Luckily, you have three. Click on your Recon Hub (green hexagon), then click "Deploy Probe" and place waypoints to explore!',
                checkCondition: () => {
                    // Check if at least one probe has been deployed (has waypoints and is active)
                    return this.gameState.entities.probes.some(p => p.active && p.waypoints && p.waypoints.length > 0);
                },
                completed: false
            },
            {
                id: 'click_signal',
                title: 'Identify a Signal',
                message: 'Your probes detect SIGNALS which can be identified by clicking on them. Wait for signals to appear, then click on one!',
                checkCondition: () => {
                    // This will be triggered by signal:clicked event
                    return this.signalClicked === true;
                },
                completed: false
            },
            {
                id: 'explore_planet',
                title: 'Choose Exploration Method',
                message: 'Identifying a SIGNAL brings up the EXPLORATION SCREEN. Here, you can decide how to exploit the planet you\'ve discovered. All planets have specialties for producing certain resources based on climate, geography, and more. Choose an exploration option (Excavate, Exterminate, or Expedition)!',
                checkCondition: () => {
                    // This will be triggered by exploration:actionChosen event
                    return this.explorationActionChosen === true;
                },
                completed: false
            },
            {
                id: 'deploy_remaining_probes',
                title: 'Deploy Remaining Probes',
                message: 'Each Hub can support up to 5 probes. It\'s generally a good idea to have as many active probes as possible. Click on your Hub to deploy two more probes. You can buy more from the Hub once you have the required materials!',
                checkCondition: () => {
                    // Count deployed probes (probes with waypoints)
                    const deployedProbes = this.gameState.entities.probes.filter(p => 
                        p.active && p.waypoints && p.waypoints.length > 0
                    ).length;
                    return deployedProbes >= 3;
                },
                completed: false
            },
            {
                id: 'gather_resources',
                title: 'Gather Resources for Hub',
                message: 'Excellent. Now try and gather enough resources through identifying the signals detected by your probes to build a Hub. You need 100 Minerals.',
                checkCondition: () => {
                    const resources = this.gameState.getResources();
                    return resources.minerals >= 100;
                },
                completed: false
            },
            {
                id: 'place_hub',
                title: 'Place Your Hub',
                message: 'Great! Now select an active probe, then click "Build Hub" from the probe\'s menu. Place a Hub anywhere along the probe\'s route (except the return journey). This allows you to expand further and discover new sectors with special rewards (and special dangers)!',
                checkCondition: () => {
                    return this.gameState.entities.reconHubs && this.gameState.entities.reconHubs.length >= 2;
                },
                completed: false
            },
            {
                id: 'research_lab_unlocked',
                title: 'Welcome to the Research Lab',
                message: 'This is your Research Laboratory! Each tech tree unlocks powerful upgrades for your probes. Click on a research node to spend your Research Points and unlock new abilities. Start by researching one of the Auto-Collect technologies!',
                checkCondition: () => {
                    // Check if player has researched anything beyond root nodes
                    const research = this.gameState.getResearchSystem();
                    return research.researched && research.researched.size > 3; // More than the 3 root nodes
                },
                triggerAfterResearchUnlock: true, // Special flag: only show after research is unlocked
                completed: false
            },
            {
                id: 'install_probe_equipment',
                title: 'Upgrade Your Probes',
                message: 'You\'ve unlocked probe equipment! Select an active probe and click "Manage Equipment" to install upgrades like the Auto-Collector. Equipment helps probes gather resources automatically!',
                checkCondition: () => {
                    // Check if any probe has equipment installed
                    return this.gameState.entities.probes.some(p =>
                        p.equipment && (Array.isArray(p.equipment) ? p.equipment.length > 0 : true)
                    );
                },
                triggerAfterCollectionResearch: true, // Special flag: only show after Collection research
                completed: false
            },
            // Mining Operations Tutorial Steps
            {
                id: 'build_mining_station',
                title: 'Establish Mining Operations',
                message: 'Mining stations produce Probetheum, the ultimate resource! Select a probe and click "Build Mining Station" (100M, 50D) to place one along an exploration route. Mining stations work best near sectors with lots of signals!',
                checkCondition: () => {
                    const stations = this.gameState.mining?.stations || [];
                    return stations.length >= 1;
                },
                triggerAfterHubCount: 2, // Show after player has 2+ hubs
                completed: false
            },
            {
                id: 'build_shuttle',
                title: 'Supply Your Mining Station',
                message: 'Mining stations need resources to operate! Click on a Hub near your mining station, then build a Shuttle (50M, 25D). After building, click on the mining station to connect the shuttle and begin resource transport.',
                checkCondition: () => {
                    // Require: shuttle built AND mining station clicked to deploy shuttle
                    const shuttles = this.gameState.mining?.shuttles || [];
                    const hasShuttle = shuttles.length >= 1;
                    return hasShuttle && this.miningStationClickedAfterShuttle === true;
                },
                triggerAfterMiningStation: true, // Show after first mining station built
                completed: false
            },
            {
                id: 'collect_probetheum',
                title: 'Probetheum Production',
                message: 'Excellent! Your shuttle is now supplying the mining station. Watch as resources are delivered and Probetheum production begins! You can click on the mining station anytime to check its status.',
                checkCondition: () => {
                    // Just require some probetheum to be produced
                    const probetheum = this.gameState.probethium?.current || 0;
                    return probetheum >= 0.001;
                },
                triggerAfterShuttle: true, // Show after shuttle step is completed
                completed: false
            }
        ];
        
        // Additional tracking for specific events
        this.explorationActionChosen = false;
        this.signalClicked = false;
        this.collectionResearchCompleted = false;
        this.researchLabUnlocked = false;
        this.miningStationBuilt = false;
        this.shuttleBuilt = false;
        this.miningStationClicked = false;
        this.miningStationClickedAfterShuttle = false;

        // Research access gating - research can only be accessed after place_hub step
        // This prevents research from interrupting the early tutorial flow
        this.researchAccessAllowed = false;

        // Listen for relevant events
        this.eventBus.on('probe:deployed', this.checkStepCompletion.bind(this));
        this.eventBus.on('probe:returned', this.checkStepCompletion.bind(this));
        this.eventBus.on('hub:built', () => {
            this.checkStepCompletion();
            // Check if we should trigger mining station tutorial
            this.triggerMiningStationTutorial();
            // After building first hub, allow research access and check if it should unlock
            this.checkResearchAccessGate();
        });
        this.eventBus.on('signal:discovered', this.checkStepCompletion.bind(this));
        this.eventBus.on('planet:explored', this.checkStepCompletion.bind(this));
        this.eventBus.on('signal:clicked', () => {
            this.signalClicked = true;
            this.checkStepCompletion();
        });
        this.eventBus.on('planet:actionChosen', () => {
            this.explorationActionChosen = true;
            this.checkStepCompletion();
        });
        this.eventBus.on('research:completed', (data) => {
            // Check if this is a specific auto-collector research
            const autoCollectorResearch = ['auto_minerals', 'auto_data', 'auto_artifacts'];
            if (data.node && autoCollectorResearch.includes(data.node.id)) {
                this.collectionResearchCompleted = true;
                this.triggerEquipmentTutorial();
            }
            this.checkStepCompletion();
        });
        this.eventBus.on('research:unlocked', () => {
            this.researchLabUnlocked = true;
            // Don't trigger tutorial here - wait until player actually opens research lab
        });
        // Trigger research lab tutorial when player actually opens the research screen
        this.eventBus.on('research:showTree', () => {
            if (this.researchLabUnlocked) {
                this.triggerResearchLabTutorial();
            }
        });
        // Listen for research points being awarded - check if we should unlock research
        this.eventBus.on('research:pointAwarded', () => {
            // If research access is allowed and we have points, trigger the unlock check
            if (this.researchAccessAllowed) {
                this.eventBus.emit('tutorial:checkResearchUnlock');
            }
        });
        // Mining tutorial events
        this.eventBus.on('mining:stationBuilt', () => {
            this.miningStationBuilt = true;
            this.checkStepCompletion();
            this.triggerShuttleTutorial();
        });
        this.eventBus.on('mining:shuttleBuilt', () => {
            this.shuttleBuilt = true;

            // Clear shuttle button highlight
            const shuttleBtn = document.getElementById('buildShuttleBtn');
            if (shuttleBtn) {
                shuttleBtn.classList.remove('tutorial-highlight');
            }

            // If we're on the build_shuttle step, building a shuttle means the player
            // already selected a mining station to deploy it to - that counts as the required click
            const shuttleStepIndex = this.steps.findIndex(s => s.id === 'build_shuttle');
            if (this.currentStep === shuttleStepIndex && !this.steps[shuttleStepIndex].completed) {
                this.miningStationClickedAfterShuttle = true;
            }

            this.checkStepCompletion();
        });
        this.eventBus.on('probetheum:collected', this.checkStepCompletion.bind(this));
        // Track when mining station is clicked (for shuttle deployment in step 9)
        this.eventBus.on('entity:selected', (data) => {
            if (data.type === 'miningStation') {
                this.miningStationClicked = true;
                // Only set miningStationClickedAfterShuttle if a shuttle has been built
                const shuttles = this.gameState.mining?.shuttles || [];
                if (shuttles.length >= 1) {
                    this.miningStationClickedAfterShuttle = true;
                }
                this.checkStepCompletion();
            }
        });

        // Also check periodically in case events don't fire
        this.checkInterval = setInterval(() => {
            if (this.tutorialActive) {
                this.checkStepCompletion();
            }
        }, 1000); // Check every second
        
        this.createTutorialPanel();
    }
    
    /**
     * Start the tutorial from the beginning
     */
    startTutorial() {
        // Don't start tutorials if disabled
        if (this.tutorialsDisabled) {
            console.log('Tutorial skipped (disabled in settings)');
            return;
        }

        console.log('Starting tutorial from beginning');
        this.currentStep = 0;
        this.tutorialActive = true;
        this.steps.forEach(step => step.completed = false);
        this.showCurrentStep();
    }
    
    /**
     * Check if current step is completed
     */
    checkStepCompletion() {
        if (!this.tutorialActive) return;

        const currentStepData = this.steps[this.currentStep];
        if (!currentStepData) return;

        // Don't check if already completed
        if (currentStepData.completed) return;

        if (currentStepData.checkCondition()) {
            console.log(`Tutorial step ${this.currentStep} completed: ${currentStepData.id}`);
            currentStepData.completed = true;

            // Store which step index triggered this completion
            const completedStepIndex = this.currentStep;

            // Wait a moment to let player see what they did
            setTimeout(() => {
                // Only advance if we're still on the step that was completed
                // (a trigger function might have already changed currentStep)
                if (this.currentStep === completedStepIndex) {
                    this.nextStep();
                }
            }, 1500); // Increased from 1000ms to give player more time
        }
    }

    /**
     * Trigger equipment tutorial when Collection research is completed
     */
    triggerEquipmentTutorial() {
        if (this.tutorialsDisabled) return;

        // Find the equipment tutorial step
        const equipmentStepIndex = this.steps.findIndex(s => s.id === 'install_probe_equipment');
        if (equipmentStepIndex === -1) return;

        const equipmentStep = this.steps[equipmentStepIndex];

        // Don't trigger if already completed or currently active
        if (equipmentStep.completed) return;
        if (this.currentStep === equipmentStepIndex) return;

        // Only show if the tutorial is active and past the hub placement step
        // OR if all prior steps are completed
        const allPriorStepsCompleted = this.steps.slice(0, equipmentStepIndex).every(s => s.completed);

        if (allPriorStepsCompleted || this.currentStep >= equipmentStepIndex - 1) {
            console.log('Triggering equipment tutorial after Collection research');

            // Jump to equipment step
            this.currentStep = equipmentStepIndex;
            this.tutorialActive = true;
            this.showCurrentStep();
        }
    }

    /**
     * Trigger Research Lab tutorial when research is first unlocked
     */
    triggerResearchLabTutorial() {
        if (this.tutorialsDisabled) return;

        // Find the research lab tutorial step
        const researchStepIndex = this.steps.findIndex(s => s.id === 'research_lab_unlocked');
        if (researchStepIndex === -1) return;

        const researchStep = this.steps[researchStepIndex];

        // Don't trigger if already completed or currently active
        if (researchStep.completed) return;
        if (this.currentStep === researchStepIndex) return;

        // Only show if all prior steps are completed
        const allPriorStepsCompleted = this.steps.slice(0, researchStepIndex).every(s => s.completed);

        if (allPriorStepsCompleted || this.currentStep >= researchStepIndex - 1) {
            console.log('Triggering Research Lab tutorial after research unlock');

            // Jump to research lab step
            this.currentStep = researchStepIndex;
            this.tutorialActive = true;
            this.showCurrentStep();
        }
    }

    /**
     * Trigger Mining Station tutorial when player has 2+ hubs
     */
    triggerMiningStationTutorial() {
        if (this.tutorialsDisabled) return;

        // Check if player has at least 2 hubs
        const hubCount = this.gameState.entities.reconHubs?.length || 0;
        if (hubCount < 2) return;

        // Find the mining station tutorial step
        const miningStepIndex = this.steps.findIndex(s => s.id === 'build_mining_station');
        if (miningStepIndex === -1) return;

        const miningStep = this.steps[miningStepIndex];

        // Don't trigger if already completed or currently active
        if (miningStep.completed) return;
        if (this.currentStep === miningStepIndex) return;

        // Check if this step should be triggered (prior steps completed)
        const allPriorStepsCompleted = this.steps.slice(0, miningStepIndex).every(s => s.completed);

        if (allPriorStepsCompleted) {
            console.log('Triggering Mining Station tutorial after building 2+ hubs');
            this.currentStep = miningStepIndex;
            this.tutorialActive = true;
            this.showCurrentStep();
        }
    }

    /**
     * Trigger Shuttle tutorial after first mining station is built
     */
    triggerShuttleTutorial() {
        if (this.tutorialsDisabled) return;

        // Find the shuttle tutorial step
        const shuttleStepIndex = this.steps.findIndex(s => s.id === 'build_shuttle');
        if (shuttleStepIndex === -1) return;

        const shuttleStep = this.steps[shuttleStepIndex];

        // Don't trigger if already completed or currently active
        if (shuttleStep.completed) return;
        if (this.currentStep === shuttleStepIndex) return;

        // Check if mining station step is completed
        const miningStep = this.steps.find(s => s.id === 'build_mining_station');
        if (!miningStep || !miningStep.completed) return;

        // Reset the flag so player must click mining station AFTER building shuttle
        this.miningStationClickedAfterShuttle = false;

        console.log('Triggering Shuttle tutorial after building mining station');
        this.currentStep = shuttleStepIndex;
        this.tutorialActive = true;
        this.showCurrentStep();
    }

    /**
     * Trigger Probetheum tutorial after first shuttle is built
     */
    triggerProbetheumTutorial() {
        if (this.tutorialsDisabled) return;

        // Find the probetheum tutorial step
        const probetheumStepIndex = this.steps.findIndex(s => s.id === 'collect_probetheum');
        if (probetheumStepIndex === -1) return;

        const probetheumStep = this.steps[probetheumStepIndex];

        // Don't trigger if already completed or currently active
        if (probetheumStep.completed) return;
        if (this.currentStep === probetheumStepIndex) return;

        // Check if shuttle step is completed
        const shuttleStep = this.steps.find(s => s.id === 'build_shuttle');
        if (!shuttleStep || !shuttleStep.completed) return;

        console.log('Triggering Probetheum tutorial after building shuttle');
        this.currentStep = probetheumStepIndex;
        this.tutorialActive = true;
        this.showCurrentStep();
    }

    /**
     * Check if player has passed the research access gate (after building first hub)
     * This controls when research can be unlocked to prevent tutorial interruption
     */
    checkResearchAccessGate() {
        // Research access is allowed after building the first hub
        const hubCount = this.gameState.entities.reconHubs?.length || 0;
        const placeHubStep = this.steps.find(s => s.id === 'place_hub');

        // Allow research access if:
        // 1. Player has built at least 2 hubs (first hub + the one they just built)
        // 2. OR the place_hub tutorial step is completed
        // 3. OR tutorials are disabled
        if (hubCount >= 2 || (placeHubStep && placeHubStep.completed) || this.tutorialsDisabled) {
            if (!this.researchAccessAllowed) {
                this.researchAccessAllowed = true;
                console.log('Research access gate passed - research can now be unlocked');

                // Trigger research unlock check in UIManager
                this.eventBus.emit('tutorial:checkResearchUnlock');
            }
        }
    }

    /**
     * Check if research access is currently allowed by the tutorial
     * Used by UIManager to gate research unlock
     */
    isResearchAccessAllowed() {
        // If tutorials are disabled, always allow research
        if (this.tutorialsDisabled) {
            return true;
        }

        return this.researchAccessAllowed;
    }

    /**
     * Show the current tutorial step
     */
    showCurrentStep() {
        // Don't show tutorials if disabled
        if (this.tutorialsDisabled) {
            return;
        }

        const stepData = this.steps[this.currentStep];
        if (!stepData) {
            this.completeTutorial();
            return;
        }

        console.log(`=== SHOWING TUTORIAL STEP ${this.currentStep} ===`);
        console.log(`Step ID: ${stepData.id}`);
        console.log(`Title: ${stepData.title}`);
        console.log(`Condition already met: ${stepData.checkCondition()}`);
        
        // Handle step-specific actions
        this.handleStepActions(stepData.id);
        
        this.showTutorialMessage(stepData.title, stepData.message);
    }
    
    /**
     * Handle step-specific actions (highlighting, auto-selection, etc.)
     */
    handleStepActions(stepId) {
        // Clear any previous highlights first
        this.clearAllHighlights();

        if (stepId === 'place_hub') {
            // Step 6: Place Hub
            // 1. Auto-select the starting hub
            this.autoSelectStartingHub();

            // 2. Auto-select the first active probe from that hub
            setTimeout(() => {
                this.autoSelectProbeFromHub();
            }, 100);

            // 3. Wait a moment for UI to update, then highlight the probe building panel
            setTimeout(() => {
                this.highlightProbeBuildingPanel();
            }, 300);
        }

        if (stepId === 'research_lab_unlocked') {
            // Open the research screen when showing this tutorial step
            this.openResearchScreen();
        }

        if (stepId === 'build_shuttle') {
            // Step 9: Build Shuttle
            // 1. Find and snap camera to nearest hub
            this.snapCameraToNearestHub();

            // 2. Auto-select the hub
            setTimeout(() => {
                this.autoSelectNearestHub();
            }, 100);

            // 3. Highlight the shuttle button in hub operations
            setTimeout(() => {
                this.highlightShuttleButton();
            }, 300);
        }
    }

    /**
     * Open the research screen programmatically
     */
    openResearchScreen() {
        if (!window.game) return;

        // Ensure research is properly unlocked before opening the screen
        const research = this.gameState.getResearchSystem();
        if (!research.unlocked) {
            research.unlocked = true;
        }
        if (research.unlockedTrees.length === 0) {
            research.unlockedTrees = ['collection', 'probe', 'alien'];
        }

        // Always auto-research root nodes if not already researched (correct IDs from GameState.js)
        const rootNodeIds = ['collection', 'probe_tech', 'alien_tech'];
        rootNodeIds.forEach(rootId => {
            const rootNode = research.tree[rootId];
            if (rootNode && !rootNode.researched) {
                rootNode.researched = true;
                research.researched.add(rootId);
                // Make child nodes available (root nodes use 'children' not 'unlocks')
                if (rootNode.children) {
                    rootNode.children.forEach(childId => {
                        const childNode = research.tree[childId];
                        if (childNode) childNode.available = true;
                    });
                }
            }
        });

        // Make sure the research button is visible
        const researchBtn = document.getElementById('researchBtn');
        if (researchBtn) {
            researchBtn.style.display = 'inline-block';
        }

        // Use the game's showScreen method for proper screen switching
        window.game.showScreen('researchScreen');

        // Render the research tree using ResearchManager
        if (window.game.researchManager) {
            window.game.researchManager.renderResearchTree();

            // Auto-select the first available (non-researched) node to show its details
            // Prefer collection tree nodes since tutorial suggests researching a collector
            const collectorNodes = ['auto_minerals', 'auto_data', 'auto_artifacts'];
            for (const nodeId of collectorNodes) {
                const node = research.tree[nodeId];
                if (node && node.available && !node.researched) {
                    window.game.researchManager.showResearchDetails(node);
                    break;
                }
            }
        }
    }
    
    /**
     * Auto-select the starting hub (first hub in the list)
     */
    autoSelectStartingHub() {
        if (!this.gameState.entities.reconHubs || this.gameState.entities.reconHubs.length === 0) {
            console.warn('No hubs available to auto-select');
            return;
        }
        
        const startingHub = this.gameState.entities.reconHubs[0];
        
        // Deselect all hubs
        this.gameState.entities.reconHubs.forEach(hub => hub.selected = false);
        
        // Select the starting hub
        startingHub.selected = true;
        
        // Emit event so GameController can update UI
        this.eventBus.emit('hub:selected', { hub: startingHub });
        
        console.log('Auto-selected starting hub for tutorial');
    }
    
    /**
     * Auto-select an active probe from the selected hub
     */
    autoSelectProbeFromHub() {
        // Get the selected hub
        const selectedHub = this.gameState.entities.reconHubs.find(h => h.selected);
        if (!selectedHub) {
            console.warn('No hub selected to get probe from');
            return;
        }
        
        // Find an active probe from this hub that has waypoints
        const probe = this.gameState.entities.probes.find(p => 
            p.active && 
            p.hub && 
            p.hub.id === selectedHub.id &&
            p.waypoints && 
            p.waypoints.length > 0
        );
        
        if (!probe) {
            console.warn('No active probe with waypoints found for tutorial');
            return;
        }
        
        // Emit event to select the probe
        this.eventBus.emit('probe:select', { probe: probe });
        
        console.log('Auto-selected probe for tutorial');
    }
    
    /**
     * Highlight the probe building panel with pulsing yellow border
     */
    highlightProbeBuildingPanel() {
        const panel = document.getElementById('probeBuildingPanel');
        if (!panel) {
            console.warn('Probe building panel not found');
            return;
        }
        
        // Add the highlight class
        panel.classList.add('tutorial-highlight');
        
        console.log('Highlighted probe building panel');
    }
    
    /**
     * Clear all tutorial highlights
     */
    clearAllHighlights() {
        // Remove highlight from probe building panel
        const panel = document.getElementById('probeBuildingPanel');
        if (panel) {
            panel.classList.remove('tutorial-highlight');
        }

        // Remove highlight from shuttle button
        const shuttleBtn = document.getElementById('buildShuttleBtn');
        if (shuttleBtn) {
            shuttleBtn.classList.remove('tutorial-highlight');
        }

        // Remove highlight from any mining stations
        document.querySelectorAll('.mining-station-highlight').forEach(el => {
            el.classList.remove('mining-station-highlight');
        });
    }

    /**
     * Snap camera to the nearest hub (for shuttle tutorial)
     */
    snapCameraToNearestHub() {
        const hubs = this.gameState.entities.reconHubs;
        if (!hubs || hubs.length === 0) {
            console.warn('No hubs available for camera snap');
            return;
        }

        // Find the hub nearest to the current view center or first hub
        const hub = hubs[0];
        if (!hub) return;

        // Get canvas dimensions
        const canvas = document.getElementById('galaxyCanvas');
        if (!canvas) return;

        // Calculate view offset to center the hub
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const zoomLevel = this.gameState.world.zoomLevel || 1;

        // Center the camera on the hub
        this.gameState.world.viewOffset = {
            x: hub.x - (canvasWidth / 2) / zoomLevel,
            y: hub.y - (canvasHeight / 2) / zoomLevel
        };

        console.log('Snapped camera to hub at', hub.x, hub.y);
    }

    /**
     * Auto-select the nearest hub (for shuttle tutorial)
     */
    autoSelectNearestHub() {
        const hubs = this.gameState.entities.reconHubs;
        if (!hubs || hubs.length === 0) {
            console.warn('No hubs available to auto-select');
            return;
        }

        const hub = hubs[0];

        // Deselect all hubs first
        hubs.forEach(h => h.selected = false);

        // Select this hub
        hub.selected = true;

        // Emit event to show hub details panel
        this.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });

        console.log('Auto-selected hub for shuttle tutorial');
    }

    /**
     * Highlight the shuttle button in hub operations
     */
    highlightShuttleButton() {
        const shuttleBtn = document.getElementById('buildShuttleBtn');
        if (!shuttleBtn) {
            console.warn('Shuttle button not found');
            return;
        }

        // Add the highlight class
        shuttleBtn.classList.add('tutorial-highlight');

        console.log('Highlighted shuttle button');
    }

    /**
     * Highlight the nearest mining station (after shuttle is built)
     */
    highlightNearestMiningStation() {
        const stations = this.gameState.mining?.stations;
        if (!stations || stations.length === 0) {
            console.warn('No mining stations to highlight');
            return;
        }

        // For now, we can't directly highlight the canvas element,
        // but we can update the tutorial message and snap camera
        const station = stations[0];
        if (!station) return;

        // Snap camera to the mining station
        const canvas = document.getElementById('galaxyCanvas');
        if (canvas) {
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const zoomLevel = this.gameState.world.zoomLevel || 1;

            this.gameState.world.viewOffset = {
                x: station.position.x - (canvasWidth / 2) / zoomLevel,
                y: station.position.y - (canvasHeight / 2) / zoomLevel
            };
        }

        // Update tutorial message to guide player to click on the mining station
        this.showTutorialMessage(
            'Connect Your Shuttle',
            'Great! Now click on the mining station (⛏️) to connect your shuttle and begin resource transport!'
        );

        console.log('Highlighted mining station at', station.position.x, station.position.y);
    }

    /**
     * Move to next step
     */
    nextStep() {
        this.closeTutorial();
        
        // Clear highlights from previous step
        this.clearAllHighlights();
        
        this.currentStep++;
        if (this.currentStep >= this.steps.length) {
            this.completeTutorial();
        } else {
            // Small delay before showing next step
            setTimeout(() => {
                this.showCurrentStep();
            }, 500);
        }
    }
    
    /**
     * Complete the tutorial
     */
    completeTutorial() {
        console.log('Tutorial completed!');
        this.tutorialActive = false;

        // Clear any remaining highlights
        this.clearAllHighlights();

        // Clear the periodic check interval
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        this.closeTutorial();

        // Show completion message
        setTimeout(() => {
            this.showTutorialMessage(
                'Tutorial Complete! 🎉',
                'You\'re ready to explore the galaxy! Collect resources, research technologies, and build your probe network.',
                true // auto-close after 5 seconds
            );
        }, 500);
    }

    /**
     * Check if tutorials are enabled
     */
    isTutorialEnabled() {
        return !this.tutorialsDisabled;
    }

    /**
     * Enable or disable tutorials
     */
    setTutorialEnabled(enabled) {
        this.tutorialsDisabled = !enabled;
        this.saveTutorialDisabledState();

        if (!enabled) {
            // Hide tutorial panel immediately when disabled
            this.closeTutorial();
            this.tutorialActive = false;
        }

        console.log('Tutorial enabled:', enabled);
    }

    /**
     * Load tutorial disabled state from storage
     */
    loadTutorialDisabledState() {
        try {
            const saved = localStorage.getItem('csog_tutorial_disabled');
            return saved === 'true';
        } catch (e) {
            return false;
        }
    }

    /**
     * Save tutorial disabled state to storage
     */
    saveTutorialDisabledState() {
        try {
            localStorage.setItem('csog_tutorial_disabled', this.tutorialsDisabled.toString());
        } catch (e) {
            console.warn('Could not save tutorial state:', e);
        }
    }
    
    /**
     * Show a tutorial message with title and content
     */
    showTutorialMessage(title, message, autoClose = false) {
        const tutorialPanel = document.getElementById('tutorialPanel');
        const tutorialContent = tutorialPanel?.querySelector('div');
        
        if (!tutorialPanel || !tutorialContent) {
            console.error('Tutorial panel not found!');
            return;
        }
        
        // Update content - sleek top banner design
        tutorialContent.innerHTML = `
            <div style="display: flex; align-items: center; gap: 20px; padding: 0;">
                <!-- Icon -->
                <div style="flex-shrink: 0; width: 40px; height: 40px; background: rgba(0, 255, 255, 0.1); border: 1px solid rgba(0, 255, 255, 0.3); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                    🎯
                </div>
                
                <!-- Content -->
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px;">
                        <h3 style="color: #0ff; margin: 0; font-size: 16px; font-weight: 600; white-space: nowrap;">
                            ${title}
                        </h3>
                        ${this.tutorialActive ? `<span style="color: #666; font-size: 12px;">Step ${this.currentStep + 1}/${this.steps.length}</span>` : ''}
                    </div>
                    <div style="color: #aaa; font-size: 14px; line-height: 1.4;">
                        ${message}
                    </div>
                </div>
                
                <!-- Status indicator -->
                <div style="flex-shrink: 0; display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 6px;">
                    ${autoClose ? 
                        '<span style="color: #0f0; font-size: 12px;">✓ Complete</span>' :
                        '<div style="display: flex; align-items: center; gap: 6px;"><div class="tutorial-pulse"></div><span style="color: #0ff; font-size: 12px;">In Progress</span></div>'
                    }
                </div>
            </div>
        `;
        
        // Show panel with animation (preserve translateX centering)
        tutorialPanel.style.display = 'block';
        tutorialPanel.style.opacity = '0';
        tutorialPanel.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
            tutorialPanel.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            tutorialPanel.style.opacity = '1';
            tutorialPanel.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
        
        // Auto-close if requested
        if (autoClose) {
            setTimeout(() => {
                this.closeTutorial();
            }, 5000);
        }
    }
    
    /**
     * Close the tutorial panel
     */
    closeTutorial() {
        const tutorialPanel = document.getElementById('tutorialPanel');
        if (tutorialPanel) {
            tutorialPanel.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            tutorialPanel.style.opacity = '0';
            tutorialPanel.style.transform = 'translateX(-50%) translateY(-20px)';
            
            setTimeout(() => {
                tutorialPanel.style.display = 'none';
            }, 400);
        }
    }

    /**
     * Create the tutorial panel HTML structure
     */
    createTutorialPanel() {
        // Create tutorial banner (fixed position, appended to body for highest z-index priority)
        const tutorialPanel = document.createElement('div');
        tutorialPanel.id = 'tutorialPanel';
        tutorialPanel.style.cssText = `
            display: none;
            position: fixed;
            top: 90px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 600px;
            z-index: 10001;
            pointer-events: none;
        `;
        
        // Create tutorial content container - sleek dark design
        const tutorialContent = document.createElement('div');
        tutorialContent.style.cssText = `
            background: linear-gradient(135deg, rgba(10, 15, 25, 0.98), rgba(5, 10, 20, 0.98));
            border: 1px solid rgba(0, 255, 255, 0.2);
            border-radius: 10px;
            padding: 16px 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            position: relative;
            overflow: hidden;
            pointer-events: auto;
        `;
        
        // Add subtle animated background
        const bgAnimation = document.createElement('div');
        bgAnimation.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 200%;
            height: 100%;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(0, 255, 255, 0.03) 50%, 
                transparent 100%);
            animation: tutorialShimmer 8s ease-in-out infinite;
            pointer-events: none;
        `;
        tutorialContent.appendChild(bgAnimation);
        
        // Content will be updated dynamically
        tutorialContent.innerHTML += '<div style="position: relative; z-index: 1;"></div>';
        
        tutorialPanel.appendChild(tutorialContent);

        // Append to document.body so tutorial is above all game screens and stacking contexts
        document.body.appendChild(tutorialPanel);
        
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes tutorialShimmer {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(50%); }
            }
            
            @keyframes tutorialPulse {
                0%, 100% { opacity: 0.4; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.2); }
            }
            
            @keyframes tutorialHighlightPulse {
                0%, 100% { 
                    border-color: rgba(255, 255, 0, 0.6);
                    box-shadow: 0 0 10px rgba(255, 255, 0, 0.4);
                }
                50% { 
                    border-color: rgba(255, 255, 0, 1);
                    box-shadow: 0 0 20px rgba(255, 255, 0, 0.8), 0 0 30px rgba(255, 255, 0, 0.4);
                }
            }
            
            .tutorial-pulse {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #0ff;
                animation: tutorialPulse 2s ease-in-out infinite;
            }
            
            .tutorial-highlight {
                border: 3px solid rgba(255, 255, 0, 0.8) !important;
                animation: tutorialHighlightPulse 2s ease-in-out infinite;
                transition: border 0.3s ease, box-shadow 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Handle probe deployment events
     */
    // Now handled by checkStepCompletion via event listener
}

// Export for use in other modules
window.TutorialManager = TutorialManager;