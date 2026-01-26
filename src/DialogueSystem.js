/**
 * Dialogue System
 * RPG-style dialogue UI for Remnant NPC interactions
 */
class DialogueSystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;

        // Dialogue state
        this.active = false;
        this.currentRemnant = null;
        this.dialogueQueue = [];
        this.currentDialogueIndex = 0;
        this.displayedText = '';
        this.isTyping = false;
        this.typewriterTimer = null;

        // Typewriter settings
        this.typewriterConfig = {
            baseSpeed: 30,           // ms per character
            punctuationPause: 200,   // extra pause for . ! ?
            commaPause: 100,         // extra pause for ,
            skipOnClick: true
        };

        // Portrait settings
        this.portraitConfig = {
            size: 150,
            eyePulseSpeed: 1500,     // ms per pulse cycle
            eyeBlinkChance: 0.002    // chance per frame to blink
        };

        // Animation state
        this.eyePulsePhase = 0;
        this.isBlinking = false;
        this.blinkTimer = 0;

        // Create DOM elements
        this.createDialogueUI();

        // Listen for events
        this.eventBus.on('dialogue:started', this.startDialogue.bind(this));
        this.eventBus.on('dialogue:close', this.closeDialogue.bind(this));
        this.eventBus.on('game:update', this.update.bind(this));
    }

    /**
     * Create dialogue UI elements
     */
    createDialogueUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'dialogueContainer';
        this.container.style.cssText = `
            display: none;
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            max-width: 900px;
            height: 200px;
            background: linear-gradient(180deg, rgba(10, 10, 30, 0.95) 0%, rgba(5, 5, 20, 0.98) 100%);
            border: 1px solid rgba(107, 45, 139, 0.6);
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.2), inset 0 0 30px rgba(0, 0, 0, 0.5);
            z-index: 1001;
            font-family: 'Courier New', monospace;
            color: #fff;
            padding: 15px;
            box-sizing: border-box;
        `;

        // Create inner layout
        this.container.innerHTML = `
            <div style="display: flex; height: 100%;">
                <!-- Portrait Section -->
                <div id="dialoguePortrait" style="
                    width: 150px;
                    height: 150px;
                    margin-right: 20px;
                    flex-shrink: 0;
                    border: 2px solid rgba(0, 255, 255, 0.5);
                    border-radius: 4px;
                    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
                    background: #0a0a0f;
                    position: relative;
                    overflow: hidden;
                ">
                    <canvas id="portraitCanvas" width="150" height="150"></canvas>
                </div>

                <!-- Message Section -->
                <div style="flex-grow: 1; display: flex; flex-direction: column;">
                    <!-- NPC Name -->
                    <div id="dialogueNPCName" style="
                        font-size: 18px;
                        font-weight: bold;
                        color: #00ffff;
                        text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
                        margin-bottom: 5px;
                    ">Remnant Name</div>

                    <!-- Divider -->
                    <div style="
                        height: 1px;
                        background: linear-gradient(90deg, rgba(0, 255, 255, 0.5), transparent);
                        margin-bottom: 10px;
                    "></div>

                    <!-- Message Text -->
                    <div id="dialogueText" style="
                        flex-grow: 1;
                        font-size: 14px;
                        line-height: 1.5;
                        color: #ccc;
                        overflow-y: auto;
                    "></div>

                    <!-- Buttons -->
                    <div style="
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        margin-top: 10px;
                    ">
                        <button id="dialogueContinueBtn" class="dialogue-btn" style="
                            padding: 8px 20px;
                            background: linear-gradient(180deg, #2a2a4a, #1a1a3a);
                            border: 1px solid rgba(0, 255, 255, 0.5);
                            border-radius: 4px;
                            color: #0ff;
                            cursor: pointer;
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            transition: all 0.2s;
                        ">Continue</button>
                        <button id="dialogueTradeBtn" class="dialogue-btn" style="
                            padding: 8px 20px;
                            background: linear-gradient(180deg, #2a2a4a, #1a1a3a);
                            border: 1px solid rgba(255, 170, 0, 0.5);
                            border-radius: 4px;
                            color: #ffa500;
                            cursor: pointer;
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            transition: all 0.2s;
                        ">Trade</button>
                        <button id="dialogueCloseBtn" class="dialogue-btn" style="
                            padding: 8px 20px;
                            background: linear-gradient(180deg, #3a2a2a, #2a1a1a);
                            border: 1px solid rgba(255, 100, 100, 0.5);
                            border-radius: 4px;
                            color: #ff6666;
                            cursor: pointer;
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            transition: all 0.2s;
                        ">X</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);

        // Get references
        this.portraitCanvas = document.getElementById('portraitCanvas');
        this.portraitCtx = this.portraitCanvas.getContext('2d');
        this.npcNameEl = document.getElementById('dialogueNPCName');
        this.textEl = document.getElementById('dialogueText');
        this.continueBtn = document.getElementById('dialogueContinueBtn');
        this.tradeBtn = document.getElementById('dialogueTradeBtn');
        this.closeBtn = document.getElementById('dialogueCloseBtn');

        // Add event listeners
        this.continueBtn.addEventListener('click', () => this.handleContinue());
        this.tradeBtn.addEventListener('click', () => this.handleTrade());
        this.closeBtn.addEventListener('click', () => this.closeDialogue());

        // Click on text to skip typewriter
        this.textEl.addEventListener('click', () => {
            if (this.isTyping && this.typewriterConfig.skipOnClick) {
                this.skipTypewriter();
            }
        });

        // Add hover effects
        const buttons = this.container.querySelectorAll('.dialogue-btn');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.05)';
                btn.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.5)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = 'none';
            });
        });
    }

    /**
     * Start dialogue with a remnant
     */
    startDialogue(data) {
        const { remnantId, remnantType } = data;

        this.currentRemnant = remnantType;
        this.active = true;

        // Set NPC name with title
        this.npcNameEl.textContent = `${remnantType.name} - ${remnantType.title}`;
        this.npcNameEl.style.color = remnantType.eyeColor || '#00ffff';

        // Update portrait border color
        const portrait = document.getElementById('dialoguePortrait');
        if (portrait) {
            portrait.style.borderColor = `${remnantType.eyeColor}88`;
            portrait.style.boxShadow = `0 0 10px ${remnantType.eyeColor}44`;
        }

        // Set initial greeting dialogue
        this.dialogueQueue = this.getGreetingDialogue(remnantType);
        this.currentDialogueIndex = 0;

        // Show container with animation
        this.container.style.display = 'block';
        this.container.style.opacity = '0';
        this.container.style.transform = 'translateX(-50%) translateY(20px)';

        requestAnimationFrame(() => {
            this.container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            this.container.style.opacity = '1';
            this.container.style.transform = 'translateX(-50%) translateY(0)';
        });

        // Start first message
        this.showCurrentMessage();

        console.log(`Dialogue started with ${remnantType.name}`);
    }

    /**
     * Get greeting dialogue for a remnant type
     */
    getGreetingDialogue(remnantType) {
        const greetings = {
            'keth_varn': [
                "Ah, another variable in the equation. How... interesting.",
                "I am Keth-Varn. I deal in patterns and probabilities.",
                "You seek knowledge? Or perhaps... escape?"
            ],
            'whisperer': [
                "I have seen you before. In futures that may yet come to pass.",
                "They call me the Whisperer. I speak of things yet to be.",
                "Listen carefully. The threads of fate are... tangled here."
            ],
            'mira_sol': [
                "You're human. Or... you were. Like me.",
                "Don't be afraid. I'm here to help. We're not so different.",
                "I'm Mira-Sol. I remember what it was like to hope."
            ],
            'archivist': [
                "Another... visitor. The records... will note your arrival.",
                "I am... the Archivist. I have watched... for eons.",
                "Your story... is not yet written. But I know... how most end."
            ],
            'null': [
                "You see me. Interesting. Most cannot perceive what I am.",
                "I have no name that you could pronounce. Call me Null.",
                "I know why you came through the wormhole. Do you?"
            ]
        };

        return greetings[remnantType.id] || [
            "Greetings, traveler.",
            "I am a Remnant of what came before.",
            "We have much to discuss."
        ];
    }

    /**
     * Show current message with typewriter effect
     */
    showCurrentMessage() {
        if (this.currentDialogueIndex >= this.dialogueQueue.length) {
            // End of dialogue
            this.continueBtn.textContent = 'Farewell';
            return;
        }

        const message = this.dialogueQueue[this.currentDialogueIndex];
        this.displayedText = '';
        this.textEl.textContent = '';
        this.isTyping = true;

        let charIndex = 0;

        const typeNext = () => {
            if (!this.active) {
                this.isTyping = false;
                return;
            }

            if (charIndex < message.length) {
                const char = message[charIndex];
                this.displayedText += char;
                this.textEl.textContent = this.displayedText;
                charIndex++;

                // Determine delay for next character
                let delay = this.typewriterConfig.baseSpeed;
                if (['.', '!', '?'].includes(char)) {
                    delay += this.typewriterConfig.punctuationPause;
                } else if (char === ',') {
                    delay += this.typewriterConfig.commaPause;
                }

                this.typewriterTimer = setTimeout(typeNext, delay);
            } else {
                this.isTyping = false;
            }
        };

        typeNext();
    }

    /**
     * Skip typewriter effect
     */
    skipTypewriter() {
        if (this.typewriterTimer) {
            clearTimeout(this.typewriterTimer);
            this.typewriterTimer = null;
        }

        const message = this.dialogueQueue[this.currentDialogueIndex];
        this.displayedText = message;
        this.textEl.textContent = message;
        this.isTyping = false;
    }

    /**
     * Handle continue button
     */
    handleContinue() {
        if (this.isTyping) {
            this.skipTypewriter();
            return;
        }

        this.currentDialogueIndex++;

        if (this.currentDialogueIndex >= this.dialogueQueue.length) {
            // Dialogue complete
            this.closeDialogue();
        } else {
            this.showCurrentMessage();
            this.continueBtn.textContent = 'Continue';
        }
    }

    /**
     * Handle trade button - opens Dark Market for current NPC
     */
    handleTrade() {
        console.log('Opening trade with', this.currentRemnant?.name);

        // Emit event to open Dark Market with NPC-specific inventory
        this.eventBus.emit('darkmarket:openForNPC', {
            npcId: this.currentRemnant?.id,
            npcType: this.currentRemnant
        });

        // Show loading text while market opens
        this.textEl.textContent = "Opening my wares for you...";
    }

    /**
     * Close dialogue
     */
    closeDialogue() {
        if (!this.active) return;

        // Clear typewriter
        if (this.typewriterTimer) {
            clearTimeout(this.typewriterTimer);
            this.typewriterTimer = null;
        }

        // Animate out
        this.container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        this.container.style.opacity = '0';
        this.container.style.transform = 'translateX(-50%) translateY(20px)';

        setTimeout(() => {
            this.container.style.display = 'none';
            this.active = false;
            this.currentRemnant = null;
            this.dialogueQueue = [];
            this.currentDialogueIndex = 0;

            this.eventBus.emit('dialogue:ended', {
                remnantId: this.currentRemnant?.id
            });
        }, 200);
    }

    /**
     * Update loop for animations
     */
    update(data) {
        if (!this.active) return;

        const deltaTime = data?.deltaTime || 16;

        // Update eye pulse
        this.eyePulsePhase = (this.eyePulsePhase + deltaTime) % this.portraitConfig.eyePulseSpeed;

        // Random blink
        if (!this.isBlinking && Math.random() < this.portraitConfig.eyeBlinkChance) {
            this.isBlinking = true;
            this.blinkTimer = 150; // 150ms blink
        }

        if (this.isBlinking) {
            this.blinkTimer -= deltaTime;
            if (this.blinkTimer <= 0) {
                this.isBlinking = false;
            }
        }

        // Render portrait
        this.renderPortrait();
    }

    /**
     * Render the hooded figure portrait
     */
    renderPortrait() {
        if (!this.portraitCtx || !this.currentRemnant) return;

        const ctx = this.portraitCtx;
        const w = this.portraitCanvas.width;
        const h = this.portraitCanvas.height;

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);

        // Draw hood (dark shape)
        ctx.fillStyle = '#0a0a0f';
        ctx.beginPath();
        ctx.moveTo(w * 0.1, h * 0.9);
        ctx.quadraticCurveTo(w * 0.1, h * 0.3, w * 0.5, h * 0.1);
        ctx.quadraticCurveTo(w * 0.9, h * 0.3, w * 0.9, h * 0.9);
        ctx.lineTo(w * 0.1, h * 0.9);
        ctx.fill();

        // Draw face area (slightly lighter)
        ctx.fillStyle = '#151520';
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.55, w * 0.25, h * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Calculate eye glow intensity
        const pulseProgress = this.eyePulsePhase / this.portraitConfig.eyePulseSpeed;
        let glowIntensity = 0.8 + 0.2 * Math.sin(pulseProgress * Math.PI * 2);

        // Apply blink
        if (this.isBlinking) {
            glowIntensity *= 0.1;
        }

        // Draw eyes
        const eyeColor = this.currentRemnant.eyeColor || '#00ffff';
        const eyeY = h * 0.5;
        const eyeSpacing = w * 0.15;
        const eyeSize = 8;

        // Left eye
        this.drawEye(ctx, w * 0.5 - eyeSpacing, eyeY, eyeSize, eyeColor, glowIntensity);

        // Right eye
        this.drawEye(ctx, w * 0.5 + eyeSpacing, eyeY, eyeSize, eyeColor, glowIntensity);

        // Special effect for Null (void eyes)
        if (this.currentRemnant.id === 'null') {
            // Draw inverted glow effect
            ctx.globalCompositeOperation = 'destination-out';
            this.drawEye(ctx, w * 0.5 - eyeSpacing, eyeY, eyeSize * 0.5, '#ffffff', 0.5);
            this.drawEye(ctx, w * 0.5 + eyeSpacing, eyeY, eyeSize * 0.5, '#ffffff', 0.5);
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    /**
     * Draw a glowing eye
     */
    drawEye(ctx, x, y, size, color, intensity) {
        // Outer glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.3, `${color}88`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.globalAlpha = intensity;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    /**
     * Check if dialogue is active
     */
    isActive() {
        return this.active;
    }

    /**
     * Set dialogue queue (for story fragments)
     */
    setDialogue(messages) {
        this.dialogueQueue = messages;
        this.currentDialogueIndex = 0;
        this.showCurrentMessage();
    }
}

// Export for use in other modules
window.DialogueSystem = DialogueSystem;
