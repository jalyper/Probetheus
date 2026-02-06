/**
 * Tutorial Management System
 * Handles tutorial tips and mission briefings for new players
 * 7-step streamlined tutorial covering all core mechanics
 */
class TutorialManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;

        // Tutorial state tracking
        this.currentStep = 0;
        this.tutorialActive = false;
        this.tutorialsDisabled = this.loadTutorialDisabledState();

        // Step tracking — 7 streamlined steps
        this.steps = [
            {
                id: 'deploy_and_explore',
                title: 'Deploy & Explore',
                message: 'Click on your Recon Hub (green hexagon), then click "Deploy Probe" and place waypoints to explore! Your probes detect SIGNALS — click on one to explore a planet and gather resources!',
                checkCondition: () => {
                    return this.signalClicked === true && this.explorationActionChosen === true;
                },
                completed: false
            },
            {
                id: 'expand_fleet',
                title: 'Deploy More Probes',
                message: 'Each Hub supports up to 5 probes. More probes means more signals! Click on your Hub and deploy your remaining probes.',
                checkCondition: () => {
                    const deployedProbes = this.gameState.entities.probes.filter(p =>
                        p.active && p.waypoints && p.waypoints.length > 0
                    ).length;
                    return deployedProbes >= 3;
                },
                completed: false
            },
            {
                id: 'build_hub',
                title: 'Expand Your Network',
                message: 'Gather 100 Minerals, then select an active probe and click "Build Hub" to place one along the probe\'s outbound route. New hubs let you reach new sectors with unique resources!',
                checkCondition: () => {
                    return this.gameState.entities.reconHubs && this.gameState.entities.reconHubs.length >= 2;
                },
                completed: false
            },
            {
                id: 'research_and_equip',
                title: 'Research & Upgrade',
                message: 'You\'ve unlocked the Research Lab! Open it and research an Auto-Collector, then select a probe and click "Manage Equipment" to install it. Equipment lets probes gather resources automatically!',
                checkCondition: () => {
                    return this.gameState.entities.probes.some(p =>
                        p.equipment && (Array.isArray(p.equipment) ? p.equipment.length > 0 : true)
                    );
                },
                triggerAfterResearchUnlock: true,
                completed: false
            },
            {
                id: 'mining_operations',
                title: 'Mining Operations',
                message: 'Mining stations produce resources based on the sector they\'re in — check the Sector Survey to see what each sector produces! Select a probe, build a Mining Station (100M, 50D), then build a Shuttle (50M, 25D) from a nearby Hub to supply it.',
                checkCondition: () => {
                    return this.miningStationBuilt === true && this.shuttleBuilt === true;
                },
                completed: false
            },
            {
                id: 'advanced_resources',
                title: 'Probethium & Synthesis',
                message: 'Probethium is the ultimate resource. Find rare <strong style="color: #ffd700;">Probethium-rich sectors</strong> for direct mining, or research <strong style="color: #0ff;">Probethium Synthesis</strong> in the Alien Tech tree to convert exotic minerals at any Hub. Explore far from home to find richer sectors!',
                checkCondition: () => {
                    // Auto-completes via timer (informational step)
                    return this.advancedResourcesRead === true;
                },
                completed: false
            }
        ];

        // Event tracking flags
        this.explorationActionChosen = false;
        this.signalClicked = false;
        this.collectionResearchCompleted = false;
        this.researchLabUnlocked = false;
        this.miningStationBuilt = false;
        this.shuttleBuilt = false;
        this.advancedResourcesRead = false;

        // Research access gating - research can only be accessed after build_hub step
        this.researchAccessAllowed = false;

        // Listen for relevant events
        this.eventBus.on('probe:deployed', this.checkStepCompletion.bind(this));
        this.eventBus.on('probe:returned', this.checkStepCompletion.bind(this));
        this.eventBus.on('hub:built', () => {
            this.checkStepCompletion();
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
            const autoCollectorResearch = ['auto_minerals', 'auto_data', 'auto_artifacts'];
            if (data.node && autoCollectorResearch.includes(data.node.id)) {
                this.collectionResearchCompleted = true;
            }
            this.checkStepCompletion();
        });
        this.eventBus.on('research:unlocked', () => {
            this.researchLabUnlocked = true;
        });
        this.eventBus.on('research:showTree', () => {
            if (this.researchLabUnlocked) {
                this.triggerResearchStep();
            }
        });
        this.eventBus.on('research:pointAwarded', () => {
            if (this.researchAccessAllowed) {
                this.eventBus.emit('tutorial:checkResearchUnlock');
            }
        });
        this.eventBus.on('mining:stationBuilt', () => {
            this.miningStationBuilt = true;
            this.checkStepCompletion();
        });
        this.eventBus.on('mining:shuttleBuilt', () => {
            this.shuttleBuilt = true;
            const shuttleBtn = document.getElementById('buildShuttleBtn');
            if (shuttleBtn) {
                shuttleBtn.classList.remove('tutorial-highlight');
            }
            this.checkStepCompletion();
        });

        // Also check periodically in case events don't fire
        this.checkInterval = setInterval(() => {
            if (this.tutorialActive) {
                this.checkStepCompletion();
            }
        }, 1000);

        this.createTutorialPanel();
    }

    /**
     * Start the tutorial from the beginning
     */
    startTutorial() {
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

        if (currentStepData.completed) return;

        if (currentStepData.checkCondition()) {
            console.log(`Tutorial step ${this.currentStep} completed: ${currentStepData.id}`);
            currentStepData.completed = true;

            const completedStepIndex = this.currentStep;

            setTimeout(() => {
                if (this.currentStep === completedStepIndex) {
                    this.nextStep();
                }
            }, 1500);
        }
    }

    /**
     * Trigger research & equip step when player opens the research lab
     */
    triggerResearchStep() {
        if (this.tutorialsDisabled) return;

        const researchStepIndex = this.steps.findIndex(s => s.id === 'research_and_equip');
        if (researchStepIndex === -1) return;

        const researchStep = this.steps[researchStepIndex];

        if (researchStep.completed) return;
        if (this.currentStep === researchStepIndex) return;

        const allPriorStepsCompleted = this.steps.slice(0, researchStepIndex).every(s => s.completed);

        if (allPriorStepsCompleted || this.currentStep >= researchStepIndex - 1) {
            console.log('Triggering Research & Equip tutorial');
            this.currentStep = researchStepIndex;
            this.tutorialActive = true;
            this.showCurrentStep();
        }
    }

    /**
     * Check if player has passed the research access gate (after building second hub)
     */
    checkResearchAccessGate() {
        const hubCount = this.gameState.entities.reconHubs?.length || 0;
        const buildHubStep = this.steps.find(s => s.id === 'build_hub');

        if (hubCount >= 2 || (buildHubStep && buildHubStep.completed) || this.tutorialsDisabled) {
            if (!this.researchAccessAllowed) {
                this.researchAccessAllowed = true;
                console.log('Research access gate passed - research can now be unlocked');
                this.eventBus.emit('tutorial:checkResearchUnlock');
            }
        }
    }

    /**
     * Check if research access is currently allowed by the tutorial
     */
    isResearchAccessAllowed() {
        if (this.tutorialsDisabled) {
            return true;
        }
        return this.researchAccessAllowed;
    }

    /**
     * Show the current tutorial step
     */
    showCurrentStep() {
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

        this.handleStepActions(stepData.id);

        this.showTutorialMessage(stepData.title, stepData.message);
    }

    /**
     * Handle step-specific actions (highlighting, auto-selection, etc.)
     */
    handleStepActions(stepId) {
        this.clearAllHighlights();

        if (stepId === 'build_hub') {
            // Auto-select hub and probe, highlight build panel
            this.autoSelectStartingHub();
            setTimeout(() => {
                this.autoSelectProbeFromHub();
            }, 100);
            setTimeout(() => {
                this.highlightProbeBuildingPanel();
            }, 300);
        }

        if (stepId === 'research_and_equip') {
            this.openResearchScreen();
        }

        if (stepId === 'mining_operations') {
            // If mining station is already built, guide to shuttle
            if (this.miningStationBuilt && !this.shuttleBuilt) {
                this.snapCameraToNearestHub();
                setTimeout(() => {
                    this.autoSelectNearestHub();
                }, 100);
                setTimeout(() => {
                    this.highlightShuttleButton();
                }, 300);
            }
        }

        if (stepId === 'advanced_resources') {
            // Auto-complete this informational step after 8 seconds
            setTimeout(() => {
                this.advancedResourcesRead = true;
                this.checkStepCompletion();
            }, 8000);
        }
    }

    /**
     * Open the research screen programmatically
     */
    openResearchScreen() {
        if (!window.game) return;

        const research = this.gameState.getResearchSystem();
        if (!research.unlocked) {
            research.unlocked = true;
        }
        if (research.unlockedTrees.length === 0) {
            research.unlockedTrees = ['collection', 'probe', 'alien'];
        }

        const rootNodeIds = ['collection', 'probe_tech', 'alien_tech'];
        rootNodeIds.forEach(rootId => {
            const rootNode = research.tree[rootId];
            if (rootNode && !rootNode.researched) {
                rootNode.researched = true;
                research.researched.add(rootId);
                if (rootNode.children) {
                    rootNode.children.forEach(childId => {
                        const childNode = research.tree[childId];
                        if (childNode) childNode.available = true;
                    });
                }
            }
        });

        const researchBtn = document.getElementById('researchBtn');
        if (researchBtn) {
            researchBtn.style.display = 'inline-block';
        }

        window.game.showScreen('researchScreen');

        if (window.game.researchManager) {
            window.game.researchManager.renderResearchTree();

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

        this.gameState.entities.reconHubs.forEach(hub => hub.selected = false);
        startingHub.selected = true;
        this.eventBus.emit('hub:selected', { hub: startingHub });

        console.log('Auto-selected starting hub for tutorial');
    }

    /**
     * Auto-select an active probe from the selected hub
     */
    autoSelectProbeFromHub() {
        const selectedHub = this.gameState.entities.reconHubs.find(h => h.selected);
        if (!selectedHub) {
            console.warn('No hub selected to get probe from');
            return;
        }

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
        panel.classList.add('tutorial-highlight');
        console.log('Highlighted probe building panel');
    }

    /**
     * Clear all tutorial highlights
     */
    clearAllHighlights() {
        const panel = document.getElementById('probeBuildingPanel');
        if (panel) {
            panel.classList.remove('tutorial-highlight');
        }

        const shuttleBtn = document.getElementById('buildShuttleBtn');
        if (shuttleBtn) {
            shuttleBtn.classList.remove('tutorial-highlight');
        }

        document.querySelectorAll('.mining-station-highlight').forEach(el => {
            el.classList.remove('mining-station-highlight');
        });
    }

    /**
     * Snap camera to the nearest hub
     */
    snapCameraToNearestHub() {
        const hubs = this.gameState.entities.reconHubs;
        if (!hubs || hubs.length === 0) {
            console.warn('No hubs available for camera snap');
            return;
        }

        const hub = hubs[0];
        if (!hub) return;

        const canvas = document.getElementById('galaxyCanvas');
        if (!canvas) return;

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const zoomLevel = this.gameState.world.zoomLevel || 1;

        this.gameState.world.viewOffset = {
            x: hub.x - (canvasWidth / 2) / zoomLevel,
            y: hub.y - (canvasHeight / 2) / zoomLevel
        };

        console.log('Snapped camera to hub at', hub.x, hub.y);
    }

    /**
     * Auto-select the nearest hub
     */
    autoSelectNearestHub() {
        const hubs = this.gameState.entities.reconHubs;
        if (!hubs || hubs.length === 0) {
            console.warn('No hubs available to auto-select');
            return;
        }

        const hub = hubs[0];

        hubs.forEach(h => h.selected = false);
        hub.selected = true;
        this.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });

        console.log('Auto-selected hub for tutorial');
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

        shuttleBtn.classList.add('tutorial-highlight');
        console.log('Highlighted shuttle button');
    }

    /**
     * Move to next step
     */
    nextStep() {
        this.closeTutorial();

        this.clearAllHighlights();

        this.currentStep++;
        if (this.currentStep >= this.steps.length) {
            this.completeTutorial();
        } else {
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

        this.clearAllHighlights();

        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        this.closeTutorial();

        setTimeout(() => {
            this.showTutorialMessage(
                'Tutorial Complete!',
                'You\'re ready to explore the galaxy! Discover rare sectors, trade with mysterious Remnants, and unlock the secrets of Probethium.',
                true
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

        tutorialPanel.style.display = 'block';
        tutorialPanel.style.opacity = '0';
        tutorialPanel.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
            tutorialPanel.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            tutorialPanel.style.opacity = '1';
            tutorialPanel.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);

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

        tutorialContent.innerHTML += '<div style="position: relative; z-index: 1;"></div>';

        tutorialPanel.appendChild(tutorialContent);

        document.body.appendChild(tutorialPanel);

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
}

// Export for use in other modules
window.TutorialManager = TutorialManager;
