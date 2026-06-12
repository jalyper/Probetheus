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

        // Act 1 — The Guided Minutes (LOOP_REDESIGN.md: prospect → chart →
        // tap → deliver). REBUILD.md §7: every step names the mechanic and the
        // why — the tutorial teaches the numbers that run the game (rate caps,
        // round-trip time, intake rate, decode rate), not just where to click.
        this.steps = [
            {
                id: 'select_hub',
                title: 'Your Hub',
                message: 'The gold hexagon is your Hub: every probe launches from it, and every load of cargo pays out at its dock. Click it to open Hub Operations.',
                checkCondition: () => !!(this.gameState.ui?.selectedHub ||
                    this.gameState.entities.reconHubs.some(h => h.selected)),
                completed: false
            },
            {
                id: 'deploy_probe',
                title: 'Scout',
                message: 'Click "Deploy Probe", then click out in the dark to set its route. As it flies, the probe pulses — any hidden deposit a pulse sweeps over raises a ping.',
                checkCondition: () => this.gameState.entities.probes.some(p =>
                    p.active && p.waypoints && p.waypoints.length > 0),
                completed: false
            },
            {
                id: 'chart_deposit',
                title: 'Chart',
                message: 'That ping marks a deposit — a permanent vein in the world. Click the ping to chart it; charted deposits never vanish and can be worked forever.',
                checkCondition: () => this.depositCharted === true,
                completed: false
            },
            {
                id: 'tap_deposit',
                title: 'Tap',
                message: 'Route a probe across a charted deposit and it extracts cargo on every pass. Each vein has a rate cap — stacking probes on one hits diminishing returns, so spread out. Enable Patrol Mode to loop the route.',
                checkCondition: () => this.depositTapped === true,
                completed: false
            },
            {
                id: 'cargo_return',
                title: 'Deliver',
                message: 'Cargo pays out at the hub dock. Your income is cargo per trip ÷ round-trip time — shorter loops from a well-placed hub literally earn more per minute.',
                checkCondition: () => this.cargoDelivered === true,
                completed: false
            },
            {
                id: 'release',
                title: 'The Loop',
                message: 'Chart, tap, route, tune. Your hub only processes so many deliveries per minute — when probes queue at the dock, that\'s a bottleneck you can fix. Richer veins lie further out, and so does the Probetheus.',
                checkCondition: () => this.releaseRead === true,
                completed: false
            }
        ];

        // Event tracking flags
        this.depositCharted = false;
        this.depositTapped = false;
        this.cargoDelivered = false;
        this.releaseRead = false;

        // Listen for relevant events
        this.eventBus.on('probe:deployed', this.checkStepCompletion.bind(this));
        this.eventBus.on('hub:selected', this.checkStepCompletion.bind(this));
        this.eventBus.on('entity:selected', this.checkStepCompletion.bind(this));
        this.eventBus.on('deposit:discovered', () => {
            this.depositCharted = true;
            this.checkStepCompletion();
        });
        this.eventBus.on('deposit:extracted', () => {
            this.depositTapped = true;
            this.checkStepCompletion();
        });
        this.eventBus.on('probe:cargoDelivered', () => {
            this.cargoDelivered = true;
            this.checkStepCompletion();
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

        on('uplink:built', 'tip_uplink_feed',
            'The Uplink streams your stored data into whichever protocol you pick. Decode speed is rate-capped — keep data flowing home and research never stalls.');
        on('uplink:decoded', 'tip_uplink_catalysts',
            'Protocol decoded. Deeper protocols also demand catalysts — artifacts and exotics that only exist in the outer rings.');
        on('probe:cargoDelivered', 'tip_full_cargo',
            'That probe came home stuffed — full cargo is slow cargo. Shorter routes pay faster.',
            (d) => (d?.capacityRatio || 0) >= 0.9);
        on('sector:discovered', 'tip_sector',
            'New sector. Different sectors favor different resources — check the Sector Survey.');
        on('foundry:built', 'tip_foundry',
            'The Foundry converts minerals into alloy at a fixed rate. Commission freighters to feed it — a starved forge idles, a full one backs up.');
        on('foundry:freighterBuilt', 'tip_freighter',
            'Freighter commissioned. It hauls minerals out and alloy home automatically — rate-match the legs and the forge never stops.');
        on('remnant:spawned', 'tip_remnant',
            'Something is out there, watching. Click it… if you like.');
        on('probe:destroyed', 'tip_probe_lost',
            'Probe lost. Asteroid fields are rich but deadly — route around them, or accept the trade.');
        on('combo:chain', 'tip_combo',
            'Combo! Chained discoveries ring up bonuses — sweep dense fields in one pass.');
        on('hub:intakeQueued', 'tip_intake',
            'A probe is waiting at the dock — this hub\'s intake is saturated. Spread routes to another hub, or accept the queue.');
        on('synthesis:triggered', 'tip_synthesis',
            'Exotic minerals became Probethium. Spend it with the Remnants — when you find them.');

        // Condition-polled tips (no event fires for these)
        this.tipPollInterval = setInterval(() => {
            const resources = this.gameState.getResources();
            if (resources.minerals >= 100 && this.gameState.entities.reconHubs.length === 1) {
                this.showTip('tip_second_hub',
                    '100 minerals banked. A second Hub extends your reach — build it on an outbound route.');
            }
            if (!this.gameState.uplink?.built && window.RECIPES &&
                window.RecipeUtils.canAfford(window.RECIPES.uplink, resources)) {
                this.showTip('tip_uplink_ready',
                    'You can afford the Uplink — the dish that decodes protocols from hauled data. Open it from the Uplink button.');
            }
            if (this.allTipsShown()) {
                clearInterval(this.tipPollInterval);
                this.tipPollInterval = null;
            }
        }, 2000);
    }

    allTipsShown() {
        return this.shownTips.includes('tip_second_hub') &&
               this.shownTips.includes('tip_uplink_ready');
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
            container.style.cssText = 'position: fixed; top: 50%; transform: translateY(-50%); right: 18px; width: 248px; z-index: 10002; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
            document.body.appendChild(container);
        }

        // The toast yields to the Uplink panel — both live on the right edge
        const uplinkPanel = document.getElementById('uplinkPanel');
        const uplinkOpen = uplinkPanel && uplinkPanel.style.display === 'block';
        container.style.right = uplinkOpen ? '380px' : '18px';

        const toast = document.createElement('div');
        toast.className = 'tip-toast';
        toast.style.cssText = `
            background: var(--panel);
            border: 1px solid var(--line-soft);
            border-left: 1px solid var(--fire);
            border-radius: 3px;
            padding: 13px 15px;
            font-family: var(--font-ui);
            box-shadow: 0 6px 22px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(6px);
            pointer-events: auto;
            opacity: 0;
            transition: opacity 0.3s var(--ease);
        `;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="display: flex; color: var(--fire);">${window.icon('flow', { size: 13 })}</span>
                <span style="font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--fire);">Tip</span>
                <button style="background:none;border:none;color:var(--mist);cursor:pointer;font-size:14px;line-height:1;padding:0;margin-left:auto;">×</button>
            </div>
            <div style="color: var(--mist); font-size: 11.5px; font-weight: 300; line-height: 1.5;">${text}</div>
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

        if (stepId === 'chart_deposit') {
            // Guaranteed pings over the starter deposits (LOOP_REDESIGN.md)
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

        // Step dots (handoff §5): active step gold, the rest hairline
        const dots = this.tutorialActive
            ? `<div style="display: flex; gap: 6px;">${this.steps.map((_, i) =>
                `<i style="width: 5px; height: 5px; border-radius: 50%; background: ${i === this.currentStep ? 'var(--fire)' : 'var(--line-soft)'};"></i>`
              ).join('')}</div>`
            : (autoClose
                ? '<span style="color: var(--fire); font-size: 10px; letter-spacing: 0.14em;">COMPLETE</span>'
                : '<div style="display: flex; align-items: center; gap: 7px;"><div class="tutorial-pulse"></div></div>');

        tutorialContent.innerHTML = `
            <div style="display: flex; align-items: center; gap: 9px; margin-bottom: 9px;">
                <span style="display: flex; color: var(--fire);">${window.icon('spark', { size: 14 })}</span>
                <h3 style="color: var(--fire); margin: 0; font-size: 12px; font-weight: 400; letter-spacing: 0.2em; text-transform: uppercase; white-space: nowrap;">
                    ${title}
                </h3>
                ${this.tutorialActive ? `<span style="margin-left: auto; color: var(--mist); font-family: var(--font-data); font-size: 10px; letter-spacing: 0.1em;">Step ${this.currentStep + 1} / ${this.steps.length}</span>` : ''}
            </div>
            <div style="color: var(--signal); font-size: 13px; font-weight: 300; letter-spacing: 0.02em; line-height: 1.6;">
                ${message}
            </div>
            <div style="display: flex; align-items: center; gap: 18px; margin-top: 13px;">
                ${dots}
                <button class="linkbtn" data-tutorial-dismiss style="margin-left: auto;">Dismiss</button>
            </div>
        `;

        const dismissBtn = tutorialContent.querySelector('[data-tutorial-dismiss]');
        if (dismissBtn) dismissBtn.addEventListener('click', () => this.closeTutorial());

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
            top: 84px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 430px;
            z-index: 10001;
            pointer-events: none;
        `;

        const tutorialContent = document.createElement('div');
        tutorialContent.style.cssText = `
            background: var(--panel);
            border: 1px solid var(--line);
            border-radius: 4px;
            padding: 16px 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            font-family: var(--font-ui);
            position: relative;
            overflow: hidden;
            pointer-events: auto;
        `;

        tutorialContent.innerHTML = '<div style="position: relative; z-index: 1;"></div>';

        tutorialPanel.appendChild(tutorialContent);

        document.body.appendChild(tutorialPanel);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes tutorialPulse {
                0%, 100% { opacity: 0.35; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.15); }
            }

            @keyframes tutorialHighlightPulse {
                0%, 100% {
                    border-color: rgba(212, 175, 55, 0.45);
                    box-shadow: 0 0 8px rgba(212, 175, 55, 0.25);
                }
                50% {
                    border-color: rgba(212, 175, 55, 0.9);
                    box-shadow: 0 0 14px rgba(212, 175, 55, 0.45);
                }
            }

            .tutorial-pulse {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: var(--fire);
                animation: tutorialPulse 2.4s ease-in-out infinite;
            }

            .tutorial-highlight {
                border: 1px solid rgba(212, 175, 55, 0.8) !important;
                animation: tutorialHighlightPulse 2.4s ease-in-out infinite;
                transition: border 0.3s var(--ease), box-shadow 0.3s var(--ease);
            }
        `;
        document.head.appendChild(style);
    }
}

// Export for use in other modules
window.TutorialManager = TutorialManager;
