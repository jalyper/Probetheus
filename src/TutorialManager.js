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
        this.tutorialsDisabled = false;
        
        // Step tracking
        this.steps = [
            {
                id: 'deploy_first_probe',
                title: 'Deploy Your First Probe',
                message: 'Click on your Recon Hub (green hexagon), then click "Deploy Probe" and place waypoints to explore!',
                checkCondition: () => this.gameState.entities.probes.some(p => p.active),
                completed: false
            },
            {
                id: 'deploy_all_probes',
                title: 'Deploy All Your Probes',
                message: 'Try deploying all the probes in your hub. Your hubs can hold up to 5 probes each. Deploy 2 more probes to fill your starting hub!',
                checkCondition: () => {
                    const startingHub = this.gameState.world.hubs[0];
                    return startingHub && startingHub.currentProbes === 0; // All 3 probes deployed
                },
                completed: false
            }
        ];
        
        // Listen for relevant events
        this.eventBus.on('probe:deployed', this.checkStepCompletion.bind(this));
        this.eventBus.on('probe:returned', this.checkStepCompletion.bind(this));
        
        this.createTutorialPanel();
    }
    
    /**
     * Start the tutorial from the beginning
     */
    startTutorial() {
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
        
        if (currentStepData.checkCondition()) {
            console.log(`Tutorial step ${this.currentStep} completed: ${currentStepData.id}`);
            currentStepData.completed = true;
            
            // Wait a moment to let player see what they did
            setTimeout(() => {
                this.nextStep();
            }, 1000);
        }
    }
    
    /**
     * Show the current tutorial step
     */
    showCurrentStep() {
        const stepData = this.steps[this.currentStep];
        if (!stepData) {
            this.completeTutorial();
            return;
        }
        
        this.showTutorialMessage(stepData.title, stepData.message);
    }
    
    /**
     * Move to next step
     */
    nextStep() {
        this.closeTutorial();
        
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
     * Create the tutorial panel HTML structure
     */
    createTutorialPanel() {
        // Create tutorial overlay
        const tutorialPanel = document.createElement('div');
        tutorialPanel.id = 'tutorialPanel';
        tutorialPanel.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 9999;
            backdrop-filter: blur(3px);
        `;
        
        // Create tutorial content container
        const tutorialContent = document.createElement('div');
        tutorialContent.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(0, 20, 40, 0.95), rgba(0, 10, 25, 0.98));
            border: 2px solid #0ff;
            border-radius: 12px;
            padding: 30px;
            max-width: 600px;
            width: 90%;
            box-shadow: 0 0 40px rgba(0, 255, 255, 0.4);
            font-family: 'Courier New', monospace;
        `;
        
        tutorialContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 25px;">
                <div style="font-size: 36px; margin-bottom: 15px;">🎯</div>
                <h2 style="color: #0ff; margin: 0 0 10px 0; font-size: 24px; text-shadow: 0 0 15px rgba(0,255,255,0.6);">
                    MISSION BRIEFING
                </h2>
                <div style="color: #888; font-size: 14px;">First Probe Deployment Tutorial</div>
            </div>
            
            <div style="background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                <div style="color: #0ff; font-size: 16px; font-weight: bold; margin-bottom: 15px;">🛸 First Probe Deployed!</div>
                <div style="color: #fff; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                    Excellent work! Your probe will follow the route you've drawn and automatically scan the area for signals. 
                    When signals appear, you can collect them by <strong style="color: #0ff;">clicking directly on them</strong>.
                </div>
                
                <div style="color: #0ff; font-size: 14px; font-weight: bold; margin-bottom: 12px;">📡 Example Signals:</div>
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 15px;">
                    <div style="text-align: center;">
                        <div class="example-signal" data-rarity="common" style="width: 40px; height: 40px; border-radius: 50%; margin: 0 auto 5px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid; animation: signalPulse 2s infinite;">💎</div>
                        <div style="color: #fff; font-size: 11px;">Common</div>
                        <div style="color: #888; font-size: 9px;">5M, 2D, 1A</div>
                    </div>
                    <div style="text-align: center;">
                        <div class="example-signal" data-rarity="uncommon" style="width: 40px; height: 40px; border-radius: 50%; margin: 0 auto 5px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid; animation: signalPulse 2s infinite;">⚡</div>
                        <div style="color: #fff; font-size: 11px;">Uncommon</div>
                        <div style="color: #888; font-size: 9px;">10M, 5D, 2A</div>
                    </div>
                    <div style="text-align: center;">
                        <div class="example-signal" data-rarity="rare" style="width: 40px; height: 40px; border-radius: 50%; margin: 0 auto 5px; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid; animation: signalPulse 2s infinite;">🌟</div>
                        <div style="color: #fff; font-size: 11px;">Rare</div>
                        <div style="color: #888; font-size: 9px;">20M, 10D, 5A</div>
                    </div>
                </div>
                <div style="color: #888; font-size: 12px; text-align: center; font-style: italic;">
                    Click the colored signals when they appear near your probe!
                </div>
            </div>
            
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 6px; padding: 15px; margin-bottom: 25px;">
                <div style="color: #ff0; font-size: 12px; font-weight: bold; margin-bottom: 8px;">💡 Pro Tips:</div>
                <div style="color: #ccc; font-size: 12px; line-height: 1.5;">
                    • Resources are stored in your probe's cargo hold until it returns to the hub<br>
                    • Enable "Patrol Mode" in the probe panel for continuous exploration<br>
                    • Research new technologies to unlock auto-collection equipment
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <label style="color: #888; font-size: 12px; display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="disableTutorials" style="margin-right: 8px; cursor: pointer;">
                    <span>Don't show tutorials again</span>
                </label>
                
                <button id="closeTutorial" class="control-btn" style="font-size: 14px; padding: 10px 20px; background: linear-gradient(135deg, #0ff 0%, #08a 100%); border-color: #0ff;">
                    Roger That! 🚀
                </button>
            </div>
        `;
        
        tutorialPanel.appendChild(tutorialContent);
        document.body.appendChild(tutorialPanel);
        
        // Add CSS for signal animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes signalPulse {
                0%, 100% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.1); opacity: 1; }
            }
            
            .example-signal[data-rarity="common"] {
                background: rgba(0, 255, 255, 0.1);
                border-color: #0ff !important;
                box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
            }
            
            .example-signal[data-rarity="uncommon"] {
                background: rgba(0, 255, 0, 0.1);
                border-color: #0f0 !important;
                box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
            }
            
            .example-signal[data-rarity="rare"] {
                background: rgba(255, 255, 0, 0.1);
                border-color: #ff0 !important;
                box-shadow: 0 0 15px rgba(255, 255, 0, 0.4);
            }
        `;
        document.head.appendChild(style);
        
        // Set up event handlers
        this.setupTutorialEventHandlers();
    }

    /**
     * Set up event handlers for tutorial panel
     */
    setupTutorialEventHandlers() {
        const closeTutorialBtn = document.getElementById('closeTutorial');
        const disableTutorialsCheckbox = document.getElementById('disableTutorials');
        const tutorialPanel = document.getElementById('tutorialPanel');
        
        if (closeTutorialBtn) {
            closeTutorialBtn.addEventListener('click', () => {
                this.closeTutorial();
            });
        }
        
        if (disableTutorialsCheckbox) {
            disableTutorialsCheckbox.checked = this.tutorialsDisabled;
            disableTutorialsCheckbox.addEventListener('change', (e) => {
                this.tutorialsDisabled = e.target.checked;
                localStorage.setItem('tutorial_disabled', this.tutorialsDisabled.toString());
            });
        }
        
        // Close tutorial when clicking outside the content
        if (tutorialPanel) {
            tutorialPanel.addEventListener('click', (e) => {
                if (e.target === tutorialPanel) {
                    this.closeTutorial();
                }
            });
        }
    }

    /**
     * Handle probe deployment events
     */
    // Now handled by checkStepCompletion via event listener
}

// Export for use in other modules
window.TutorialManager = TutorialManager;
window.TutorialManager = TutorialManager;