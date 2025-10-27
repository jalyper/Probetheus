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
                message: 'Each Hub can support up to 5 probes. It\'s generally a good idea to have as many active probes as possible. Deploy two more probes. You can buy more from the Hub once you have the required materials!',
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
            }
            
            /* 
             * FUTURE TUTORIAL STEPS (v0.8.0+):
             * 
             * Step 7: Build Mining Facility
             * - Title: "Establish Mining Operations"
             * - Message: "Mining facilities generate Probetheum, the ultimate resource. Select a probe and build a Mining Facility (100M, 50D). Place it along an exploration route with lots of signals nearby!"
             * - Condition: At least 1 mining station built
             * 
             * Step 8: Build Shuttle
             * - Title: "Supply Your Mining Station"
             * - Message: "Mining stations need resources to operate. Click on a hub near your mining facility, then build a Shuttle (50M, 25D) to transport resources automatically!"
             * - Condition: At least 1 shuttle built
             * 
             * Step 9: Collect Probetheum
             * - Title: "Probetheum Production"
             * - Message: "Once supplied, mining stations produce Probetheum! This rare resource unlocks powerful upgrades and research. Wait for your station to generate 1 Probetheum."
             * - Condition: totalProbetheum >= 1
             * 
             * Step 10: Research Technology
             * - Title: "Unlock New Capabilities"
             * - Message: "Use the Research screen to unlock new technologies! Research improves probe efficiency, unlocks new buildings, and expands your capabilities."
             * - Condition: At least 1 tech researched
             * 
             * Step 11: Hub Upgrades
             * - Title: "Upgrade Your Hub"
             * - Message: "Hubs can be upgraded to support more probes (up to 8) and shuttles (up to 6). Click on a hub and choose 'Upgrade Hub' to expand its capabilities!"
             * - Condition: Hub upgrade purchased
             */
        ];
        
        // Additional tracking for specific events
        this.explorationActionChosen = false;
        this.signalClicked = false;
        
        // Listen for relevant events
        this.eventBus.on('probe:deployed', this.checkStepCompletion.bind(this));
        this.eventBus.on('probe:returned', this.checkStepCompletion.bind(this));
        this.eventBus.on('hub:built', this.checkStepCompletion.bind(this));
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
            
            // Wait a moment to let player see what they did
            setTimeout(() => {
                this.nextStep();
            }, 1500); // Increased from 1000ms to give player more time
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
        
        // Future: Add similar handling for mining facility tutorial step
        // if (stepId === 'build_mining_facility') {
        //     this.highlightMiningFacilityButton();
        // }
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
        
        // Future: Remove highlights from other elements as needed
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
        
        // Show panel with animation
        tutorialPanel.style.display = 'block';
        tutorialPanel.style.opacity = '0';
        tutorialPanel.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            tutorialPanel.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            tutorialPanel.style.opacity = '1';
            tutorialPanel.style.transform = 'translateY(0)';
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
            tutorialPanel.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                tutorialPanel.style.display = 'none';
            }, 400);
        }
    }

    /**
     * Create the tutorial panel HTML structure
     */
    createTutorialPanel() {
        // Find the canvas to position relative to it
        const canvas = document.getElementById('galaxyCanvas');
        const mapScreen = document.getElementById('mapScreen');
        
        // Create tutorial banner (positioned relative to canvas)
        const tutorialPanel = document.createElement('div');
        tutorialPanel.id = 'tutorialPanel';
        tutorialPanel.style.cssText = `
            display: none;
            position: fixed;
            top: 90px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 1200px;
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
        
        // Append to mapScreen instead of body so it's positioned relative to canvas
        mapScreen.appendChild(tutorialPanel);
        
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