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

        // Act 1 — The Guided Minute (docs/design/ONBOARDING.md)
        // Five steps, one instruction at a time, ≤2 short sentences each.
        // Everything past the core loop is taught just-in-time via `tips`.
        this.steps = [
            {
                id: 'select_hub',
                title: 'Your Hub',
                message: 'Click your Hub — the green hexagon.',
                checkCondition: () => !!(this.gameState.ui?.selectedHub ||
                    this.gameState.entities.reconHubs.some(h => h.selected)),
                completed: false
            },
            {
                id: 'deploy_probe',
                title: 'Deploy',
                message: 'Click "Deploy Probe", then click out in the dark. Right-click to launch early.',
                checkCondition: () => this.gameState.entities.probes.some(p =>
                    p.active && p.waypoints && p.waypoints.length > 0),
                completed: false
            },
            {
                id: 'collect_signals',
                title: 'Signals',
                message: 'Signals! Click one before it fades.',
                checkCondition: () => this.explorationActionChosen === true,
                completed: false
            },
            {
                id: 'cargo_return',
                title: 'Delivery',
                message: 'Your probe hauls it home. Cargo pays out on return.',
                checkCondition: () => this.cargoDelivered === true,
                completed: false
            },
            {
                id: 'release',
                title: 'The Loop',
                message: 'That\'s the loop — build, explore, optimize. You\'re on your own.',
                checkCondition: () => this.releaseRead === true,
                completed: false
            }
        ];

        // Event tracking flags
        this.explorationActionChosen = false;
        this.signalClicked = false;
        this.cargoDelivered = false;
        this.releaseRead = false;

        // Research gating removed (ONBOARDING.md: no tutorial-only restrictions)
        this.researchAccessAllowed = true;

        // Listen for relevant events
        this.eventBus.on('probe:deployed', this.checkStepCompletion.bind(this));
        this.eventBus.on('hub:selected', this.checkStepCompletion.bind(this));
        this.eventBus.on('entity:selected', this.checkStepCompletion.bind(this));
        this.eventBus.on('signal:clicked', () => {
            this.signalClicked = true;
            this.checkStepCompletion();
        });
        this.eventBus.on('planet:actionChosen', () => {
            this.explorationActionChosen = true;
            this.checkStepCompletion();
        });
        this.eventBus.on('probe:cargoDelivered', () => {
            this.cargoDelivered = true;
            this.checkStepCompletion();
        });
        this.eventBus.on('research:pointAwarded', () => {
            this.eventBus.emit('tutorial:checkResearchUnlock');
        });

        // Also check periodically in case events don't fire
        this.checkInterval = setInterval(() => {
            if (this.tutorialActive) {
                this.checkStepCompletion();
            }
        }, 1000);

        this.createTutorialPanel();

        // Act 2 — just-in-time tips (ONBOARDING.md): each fires once on first
        // encounter as a small toast; ≤2 short sentences; never repeats.
        this.shownTips = this.loadShownTips();
        this.setupTips();
    }

    /**
     * Just-in-time tips — Act 2 of onboarding (docs/design/ONBOARDING.md)
     */
    setupTips() {
        const on = (event, id, text, condition = null) => {
            this.eventBus.on(event, (data) => {
                if (condition && !condition(data)) return;
                this.showTip(id, text);
            });
        };

        on('research:pointAwarded', 'tip_research',
            'Research Point earned. The Lab is open — milestones earn more.');
        on('probe:cargoDelivered', 'tip_full_cargo',
            'That probe came home stuffed — full cargo is slow cargo. Shorter routes pay faster.',
            (d) => (d?.capacityRatio || 0) >= 0.9);
        on('sector:discovered', 'tip_sector',
            'New sector. Different sectors favor different resources — check the Sector Survey.');
        on('mining:stationBuilt', 'tip_station',
            'Stations eat resources to produce more. Shuttles feed them — watch the supply line.');
        on('mining:shuttleBuilt', 'tip_shuttle',
            'Shuttle deployed. It ferries supplies from Hub to station automatically.');
        on('remnant:spawned', 'tip_remnant',
            'Something is out there, watching. Click it… if you like.');
        on('probe:destroyed', 'tip_probe_lost',
            'Probe lost. Asteroid fields are rich but deadly — research durability or phase tech.');
        on('combo:chain', 'tip_combo',
            'Combo! Chained collections earn bonus resources. Dense routes pay.');
        on('synthesis:triggered', 'tip_synthesis',
            'Exotic minerals became Probethium. Spend it with the Remnants — when you find them.');

        // Condition-polled tips (no event fires for these)
        this.tipPollInterval = setInterval(() => {
            const resources = this.gameState.getResources();
            if (resources.minerals >= 100 && this.gameState.entities.reconHubs.length === 1) {
                this.showTip('tip_second_hub',
                    '100 minerals banked. A second Hub extends your reach — build it on an outbound route.');
            }
            if (this.allTipsShown()) {
                clearInterval(this.tipPollInterval);
                this.tipPollInterval = null;
            }
        }, 2000);
    }

    allTipsShown() {
        return this.shownTips.includes('tip_second_hub');
    }

    showTip(id, text) {
        if (this.tutorialsDisabled) return;
        if (this.shownTips.includes(id)) return;
        this.shownTips.push(id);
        this.saveShownTips();

        let container = document.getElementById('tipToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'tipToastContainer';
            container.style.cssText = 'position: fixed; top: 120px; right: 15px; width: 280px; z-index: 10002; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: linear-gradient(135deg, rgba(10, 15, 25, 0.97), rgba(5, 10, 20, 0.97));
            border: 1px solid rgba(0, 255, 255, 0.25);
            border-radius: 8px;
            padding: 10px 12px;
            color: #bdd;
            font-size: 12px;
            line-height: 1.45;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
            pointer-events: auto;
            display: flex;
            gap: 8px;
            align-items: flex-start;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        toast.innerHTML = `
            <span style="flex-shrink:0;">💡</span>
            <span style="flex:1;">${text}</span>
            <button style="background:none;border:none;color:#678;cursor:pointer;font-size:14px;line-height:1;padding:0;">×</button>
        `;
        toast.querySelector('button').addEventListener('click', () => toast.remove());
        container.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 350);
        }, 9000);
    }

    loadShownTips() {
        try {
            return JSON.parse(localStorage.getItem('csog_tips_shown') || '[]');
        } catch (e) {
            return [];
        }
    }

    saveShownTips() {
        try {
            localStorage.setItem('csog_tips_shown', JSON.stringify(this.shownTips));
        } catch (e) { /* non-fatal */ }
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
     * Research access is never tutorial-gated anymore
     * (ONBOARDING.md: no tutorial-only restrictions). Kept for callers.
     */
    isResearchAccessAllowed() {
        return true;
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

        if (stepId === 'collect_signals') {
            // Guaranteed cluster on the new probe's path (ONBOARDING.md Act 1)
            this.spawnTutorialSignalCluster();
        }

        if (stepId === 'release') {
            // Auto-dismiss the send-off, then surface the time-controls tip
            setTimeout(() => {
                this.releaseRead = true;
                this.checkStepCompletion();
                this.showTip('tip_time_controls',
                    'Press 1 / 2 / 3 for game speed, Space to pause.');
            }, 5000);
        }
    }

    /**
     * Guaranteed discovery pings so the prospecting lesson can't fizzle
     * (ONBOARDING.md Act 1 step 3, recast for LOOP_REDESIGN.md): ping the
     * starter deposits near home — collecting a ping charts a deposit.
     */
    spawnTutorialSignalCluster() {
        const depositSystem = window.game?.depositSystem;
        const hub = this.gameState.entities.reconHubs[0];

        if (depositSystem && hub) {
            // Make sure home-sector deposits exist even this early in a session
            depositSystem.update(0);
            const starters = depositSystem
                .findUndiscoveredInRange(hub.x, hub.y, 600)
                .slice(0, 3);
            starters.forEach(dep => {
                const alreadyPinged = this.gameState.entities.signals.some(
                    s => s.depositId === dep.id);
                if (alreadyPinged) return;
                this.gameState.entities.signals.push({
                    x: dep.x + (Math.random() - 0.5) * 30,
                    y: dep.y + (Math.random() - 0.5) * 30,
                    radius: 10,
                    rarity: dep.richness >= 9 ? 'rare' : 'uncommon',
                    signalType: 'discovery',
                    depositId: dep.id,
                    duration: 60000, // generous window — this is a lesson, not a test
                    createdAt: Date.now(),
                    age: 0
                });
            });
            if (starters.length > 0) return;
        }

        // Fallback: plain signals near the tutorial probe's route
        const probe = this.gameState.entities.probes.find(p =>
            p.active && p.waypoints && p.waypoints.length > 1);
        if (!probe) return;

        const target = probe.waypoints[Math.min(1, probe.waypoints.length - 1)];
        for (let i = 0; i < 4; i++) {
            this.gameState.entities.signals.push({
                x: target.x + (Math.random() - 0.5) * 180,
                y: target.y + (Math.random() - 0.5) * 180,
                radius: 9 + Math.random() * 3,
                rarity: 'common',
                signalType: 'standard',
                duration: 20000,
                createdAt: Date.now(),
                age: 0
            });
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
                'Good hunting.',
                'The frontier is that way. →',
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
