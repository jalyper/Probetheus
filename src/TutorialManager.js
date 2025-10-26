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
                id: 'deploy_all_starting_probes',
                title: 'Deploy All Starting Probes',
                message: 'Deploy your 2 remaining probes. Each hub starts with 3 probes and can hold up to 5 total (you can build more later).',
                checkCondition: () => {
                    const startingHub = this.gameState.world.hubs[0];
                    return startingHub && startingHub.currentProbes === 0; // All 3 starting probes deployed
                },
                completed: false
            },
            {
                id: 'build_hub',
                title: 'Expand Your Network',
                message: 'Select an active probe, then click "Build Hub" to place a new Recon Hub along its route. Hubs extend your exploration range!',
                checkCondition: () => {
                    return this.gameState.world.hubs.length >= 2; // Built at least one additional hub
                },
                completed: false
            }
        ];
        
        // Listen for relevant events
        this.eventBus.on('probe:deployed', this.checkStepCompletion.bind(this));
        this.eventBus.on('probe:returned', this.checkStepCompletion.bind(this));
        this.eventBus.on('hub:built', this.checkStepCompletion.bind(this));
        
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
        // Create tutorial banner (top of screen, non-blocking)
        const tutorialPanel = document.createElement('div');
        tutorialPanel.id = 'tutorialPanel';
        tutorialPanel.style.cssText = `
            display: none;
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 1200px;
            z-index: 8888;
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
            
            .tutorial-pulse {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #0ff;
                animation: tutorialPulse 2s ease-in-out infinite;
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