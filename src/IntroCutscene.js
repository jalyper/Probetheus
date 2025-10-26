/**
 * Intro Cutscene System
 * Displays a cinematic intro on first playthrough showing a ship encountering a black hole
 */
class IntroCutscene {
    constructor() {
        this.container = document.getElementById('cutsceneContainer');
        this.canvas = document.getElementById('cutsceneCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.skipBtn = document.getElementById('skipCutscene');
        
        this.isPlaying = false;
        this.animationFrameId = null;
        this.timeline = null;
        
        // Animation state
        this.ship = {
            x: this.canvas ? this.canvas.width / 2 : 960,  // Dead center horizontally
            y: 0,  // Will be set to center vertically
            baseY: 0,  // Base Y position for floating
            rotation: 0,
            scale: 1,
            thrusterGlow: 0,  // Thruster intensity
            // Ragdoll physics
            velocityX: 0,
            velocityY: 0,
            angularVelocity: 0,
            ragdollMode: false
        };
        
        this.starVelocity = 3;   // Start slow and build up gradually
        
        this.hubs = [
            { x: -20, y: -15, attached: true, rotation: 0, scale: 1, opacity: 1 },
            { x: 20, y: -15, attached: true, rotation: 0, scale: 1, opacity: 1 },
            { x: -20, y: 15, attached: true, rotation: 0, scale: 1, opacity: 1 },
            { x: 20, y: 15, attached: true, rotation: 0, scale: 1, opacity: 1 }
        ];
        
        this.separatedHub = {
            worldX: 0,
            worldY: 0,
            rotation: 0,
            scale: 1,
            opacity: 0,
            visible: false,
            spinSpeed: 0,  // Manual spin control
            startTime: 0   // When spinning started
        };
        
        this.blackHole = {
            x: 0,  // Will be positioned on right side
            y: 0,  // Center vertically
            radius: 0,
            rotation: 0,
            warpRotation: 0,
            opacity: 0
        };
        
        this.stars = [];
        this.particles = [];
        
        // Camera system for zoom effects
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            targetZoom: 1
        };
        
        // Fade overlay
        this.fadeOverlay = {
            opacity: 1,  // Start with black screen
            color: '#000'
        };
        
        this.setupCanvas();
        this.generateStarfield();
        this.setupSkipButton();
    }
    
    setupCanvas() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    generateStarfield() {
        // Generate stars spread across a wider area for rushing effect
        for (let i = 0; i < 300; i++) {
            this.stars.push({
                x: Math.random() * (this.canvas.width + 400) - 200,  // Wider spread
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random(),
                originalX: 0  // Will store original position
            });
        }
        
        // Store original positions
        this.stars.forEach(star => {
            star.originalX = star.x;
        });
    }
    
    setupSkipButton() {
        this.skipBtn.addEventListener('click', () => {
            this.end();
        });
    }
    
    async play(onComplete) {
        // Check if cutscene has been seen before
        const cutsceneSeen = await storageAdapter.getItem('cutsceneSeen');
        if (cutsceneSeen === 'true') {
            onComplete();
            return;
        }
        
        this.onComplete = onComplete;
        this.container.style.display = 'block';
        this.isPlaying = true;
        
        // Show skip button after 1 second
        setTimeout(() => {
            this.skipBtn.style.display = 'block';
        }, 1000);
        
        this.createTimeline();
        this.animate();
    }
    
    createTimeline() {
        // Set initial positions
        this.ship.x = this.canvas.width / 2;
        this.ship.y = 0;  // Will be translated to center in render
        this.blackHole.x = this.canvas.width * 0.85;  // Right side
        this.blackHole.y = 0;  // Will be translated to center
        
        // Create simplified timeline
        this.timeline = anime.timeline({
            easing: 'easeInOutQuad',
            complete: () => this.end()
        });
        
        this.timeline
            // Scene 0: Fade in from black (0-1000ms)
            .add({
                targets: this.fadeOverlay,
                opacity: 0,
                duration: 1000,
                easing: 'easeOutQuad'
            })
            // Scene 1a: Gentle cruising - stars build up speed (1000-3000ms) 
            .add({
                targets: this,
                starVelocity: 25,  // Build up to moderate speed
                duration: 2000,
                easing: 'easeOutQuad'
            }, 1000)
            // Scene 1b: Stars rush fast then slow down (3000-5500ms)
            .add({
                targets: this,
                starVelocity: 1,  // Peak then decelerate as black hole appears
                duration: 2500,
                easing: 'easeInQuad'
            }, 3000)
            // Scene 2: Black hole grows (4500-5500ms) - later appearance
            .add({
                targets: this.blackHole,
                radius: [0, 120],
                opacity: [0, 0.9],
                duration: 1000,
                easing: 'easeOutExpo'
            }, 4500)
            // Black hole rotation (continuous)
            .add({
                targets: this.blackHole,
                rotation: 360,
                duration: 8000,
                easing: 'linear',
                loop: true
            }, 4500)
            // Scene 3: Ship starts rotating away from black hole with accelerating shaking (5500ms)
            .add({
                targets: this.ship,
                rotation: [-3, -6, -10, -15, -20],  // Progressive rotation increase
                baseY: [0, -5, -10, -5, 0],  // Override floating with shake
                duration: 1200,
                easing: 'easeInQuad'
            }, 5500)
            // Accelerating shake - starts mild, gets violent
            .add({
                targets: this.ship,
                x: [
                    { value: this.canvas.width / 2 - 2, duration: 250 },   // Gentle start
                    { value: this.canvas.width / 2 + 2, duration: 250 },
                    { value: this.canvas.width / 2 - 5, duration: 200 },   // Getting worse
                    { value: this.canvas.width / 2 + 5, duration: 200 },
                    { value: this.canvas.width / 2 - 10, duration: 150 },  // More violent
                    { value: this.canvas.width / 2 + 10, duration: 150 },
                    { value: this.canvas.width / 2 - 18, duration: 100 },   // Very violent
                    { value: this.canvas.width / 2 + 18, duration: 100 },
                    { value: this.canvas.width / 2 - 25, duration: 50 },    // Extreme
                    { value: this.canvas.width / 2 + 25, duration: 50 }
                ],
                duration: 1200,
                easing: 'linear'
            }, 5500)
            // Scene 4: Hub separation and immediate centering (6700ms)
            .add({
                duration: 1,
                complete: () => {
                    // Separate the hub and position it at screen center immediately
                    this.separatedHub.worldX = this.canvas.width / 2;
                    this.separatedHub.worldY = this.canvas.height / 2;
                    this.separatedHub.opacity = 1;
                    this.separatedHub.visible = true;
                    this.separatedHub.rotation = 0;
                    this.separatedHub.scale = 1;
                    this.separatedHub.spinSpeed = 180;  // Start spinning (180 degrees per second)
                    this.separatedHub.startTime = performance.now();
                    
                    // Completely hide the attached hub
                    this.hubs[3].attached = false;
                    this.hubs[3].opacity = 0;
                    
                    // Activate ragdoll physics on ship after hub loss
                    this.ship.ragdollMode = true;
                    this.ship.velocityX = -8;  // Kick backward from hub loss
                    this.ship.velocityY = -2;  // Slight upward
                    this.ship.angularVelocity = 15;  // Start spinning chaotically
                }
            }, 6700)
            // Scene 5: Pause moment (6700-7200ms) - hold the moment
            .add({
                targets: this,
                starVelocity: 0,  // Complete stop
                duration: 500
            }, 6700)
            // Scene 6: Thruster tries to compensate but fails (7200ms)
            .add({
                targets: this.ship,
                thrusterGlow: [0, 1.5],  // Thrusters fire frantically
                duration: 800,
                easing: 'easeInExpo',
                complete: () => {
                    // Boost the ragdoll physics when thrusters fire
                    this.ship.velocityX += -12;  // More backward thrust
                    this.ship.velocityY += -8;   // More upward
                    this.ship.angularVelocity += 25;  // Even more chaotic spin
                }
            }, 7200)
            // Scene 7: Black hole moves to center behind hub (7500ms)
            .add({
                targets: this.blackHole,
                x: this.canvas.width / 2,  // Center behind hub
                y: 0,  // Center vertically
                radius: [120, 400],  // Grow much larger
                duration: 1500,
                easing: 'easeInOutQuad'
            }, 7500)
            // Scene 8: Pause on spinning hub over black hole (9000-10500ms)
            .add({
                duration: 1500  // 1.5 second pause to watch hub spinning on black hole
            }, 9000)
            // Scene 9: Smooth accelerating zoom into black hole center (10500ms)
            .add({
                targets: this.camera,
                x: 0,  // Keep camera centered on black hole center
                y: 0,
                zoom: 25,  // Single smooth target, not array of steps
                duration: 2000,  // Longer duration for smooth acceleration
                easing: 'easeInCubic'  // Smooth curve, not jarring
            }, 10500)
            // Scene 10: Fade to black during final zoom phase (12000ms)
            .add({
                targets: this.fadeOverlay,
                opacity: 1,
                duration: 500,
                easing: 'easeInQuad'
            }, 12000);
    }
    
    createWarpEffect() {
        // Generate particles for warp effect
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            this.particles.push({
                x: this.blackHole.x + Math.cos(angle) * 50,
                y: this.blackHole.y + Math.sin(angle) * 50,
                vx: Math.cos(angle) * 5,
                vy: Math.sin(angle) * 5,
                life: 1,
                size: Math.random() * 3 + 1
            });
        }
    }
    
    animate() {
        if (!this.isPlaying) return;
        
        // Apply camera transformations
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(-1000, -1000, this.canvas.width + 2000, this.canvas.height + 2000);
        
        // Draw starfield
        this.drawStars();
        
        // Draw black hole
        if (this.blackHole.opacity > 0) {
            this.drawBlackHole();
        }
        
        // Update ship physics if in ragdoll mode
        if (this.ship.ragdollMode) {
            this.ship.x += this.ship.velocityX;
            this.ship.y += this.ship.velocityY;
            this.ship.rotation += this.ship.angularVelocity;
            
            // Add some damping
            this.ship.velocityX *= 0.99;
            this.ship.velocityY *= 0.99;
            this.ship.angularVelocity *= 0.98;
        } else {
            // Add gentle floating motion when not in ragdoll mode
            this.ship.y = this.ship.baseY + Math.sin(performance.now() * 0.001) * 8;
        }
        
        // Draw ship and attached hubs
        if (this.ship.x > -200 && this.ship.x < this.canvas.width + 200) {
            this.drawShip();
        }
        
        // Draw separated hub with glow effect and manual spinning
        if (this.separatedHub && this.separatedHub.visible && this.separatedHub.opacity > 0) {
            // Update rotation based on spin speed
            if (this.separatedHub.spinSpeed > 0) {
                const elapsed = performance.now() - this.separatedHub.startTime;
                this.separatedHub.rotation = (elapsed * this.separatedHub.spinSpeed * 0.001) % 360;
            }
            
            this.drawHub(
                this.separatedHub.worldX, 
                this.separatedHub.worldY, 
                this.separatedHub.scale,
                this.separatedHub.rotation,
                this.separatedHub.opacity,
                true  // Enable glow for separated hub
            );
        }
        
        // Update and draw particles
        this.updateParticles();
        
        this.ctx.restore();
        
        // Draw fade overlay on top (not affected by camera)
        if (this.fadeOverlay.opacity > 0) {
            this.ctx.fillStyle = this.fadeOverlay.color;
            this.ctx.globalAlpha = this.fadeOverlay.opacity;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.globalAlpha = 1;
        }
        
        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }
    
    drawStars() {
        this.ctx.fillStyle = '#fff';
        this.stars.forEach(star => {
            // Simple, smooth star movement - no rubber-banding
            if (!star.currentX) {
                star.currentX = star.originalX;
            }
            
            // Move star smoothly based on current velocity
            star.currentX -= this.starVelocity * 0.5;  // Consistent movement per frame
            
            // Wrap around when off screen
            if (star.currentX < -100) {
                star.currentX = this.canvas.width + 50;
                star.originalX = star.currentX;
            }
            
            // Draw star with appropriate effect
            this.ctx.globalAlpha = star.brightness * 0.8;
            
            if (this.starVelocity > 15) {
                // Fast streaks
                const streakLength = Math.min(this.starVelocity * 1.2, 60);
                this.ctx.fillRect(star.currentX, star.y, streakLength, star.size);
            } else if (this.starVelocity > 5) {
                // Medium streaks
                const streakLength = this.starVelocity * 0.6;
                this.ctx.fillRect(star.currentX, star.y, streakLength, star.size);
            } else {
                // Dots when slow/stopped
                this.ctx.fillRect(star.currentX, star.y, star.size, star.size);
            }
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawBlackHole() {
        this.ctx.save();
        this.ctx.translate(this.blackHole.x, this.blackHole.y + this.canvas.height / 2);
        this.ctx.rotate((this.blackHole.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = this.blackHole.opacity;
        
        // Draw black center
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.blackHole.radius * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw rotating jagged white ring
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        
        const points = 12;
        for (let i = 0; i <= points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const radiusVariation = this.blackHole.radius + Math.sin(angle * 3 + this.blackHole.warpRotation) * 10;
            const x = Math.cos(angle) * radiusVariation;
            const y = Math.sin(angle) * radiusVariation;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw gravitational distortion effect
        const gradient = this.ctx.createRadialGradient(0, 0, this.blackHole.radius * 0.5, 0, 0, this.blackHole.radius * 2);
        gradient.addColorStop(0, 'rgba(128, 0, 255, 0.4)');
        gradient.addColorStop(0.5, 'rgba(128, 0, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(128, 0, 255, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.blackHole.radius * 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawShip() {
        const shipY = this.ship.y + this.canvas.height / 2;
        
        this.ctx.save();
        this.ctx.translate(this.ship.x, shipY);
        this.ctx.rotate((this.ship.rotation * Math.PI) / 180);
        this.ctx.scale(this.ship.scale, this.ship.scale);
        
        // Draw enhanced thruster glow first (behind ship)
        if (this.ship.thrusterGlow > 0) {
            const glowIntensity = this.ship.thrusterGlow;
            const glowSize = 30 + (glowIntensity * 40);
            
            // In ragdoll mode, make thruster glow chaotic/unstable
            let glowOffset = 0;
            if (this.ship.ragdollMode) {
                glowOffset = Math.sin(performance.now() * 0.02) * 5; // Flickering effect
            }
            
            const glowGradient = this.ctx.createRadialGradient(-60 + glowOffset, 0, 0, -60 + glowOffset, 0, glowSize);
            glowGradient.addColorStop(0, `rgba(0, 255, 255, ${0.9 * glowIntensity})`);
            glowGradient.addColorStop(0.5, `rgba(0, 150, 255, ${0.6 * glowIntensity})`);
            glowGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(-60 + glowOffset, 0, glowSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // In ragdoll mode, add erratic thrust trail
            if (this.ship.ragdollMode && glowIntensity > 1) {
                const trailGradient = this.ctx.createLinearGradient(-60, 0, -200, glowOffset);
                trailGradient.addColorStop(0, `rgba(0, 255, 255, ${0.8 * glowIntensity})`);
                trailGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
                this.ctx.fillStyle = trailGradient;
                this.ctx.fillRect(-200, -8, 140, 16);
            }
        }
        
        // Draw ship body (elongated hexagon)
        this.ctx.fillStyle = '#2a4a6a';
        this.ctx.strokeStyle = '#0ff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-60, 0);
        this.ctx.lineTo(-40, -20);
        this.ctx.lineTo(40, -20);
        this.ctx.lineTo(60, 0);
        this.ctx.lineTo(40, 20);
        this.ctx.lineTo(-40, 20);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw normal engine glow (when not in shooting star mode)
        if (this.ship.thrusterGlow <= 1) {
            const engineGradient = this.ctx.createRadialGradient(-60, 0, 0, -60, 0, 20);
            engineGradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
            engineGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            this.ctx.fillStyle = engineGradient;
            this.ctx.beginPath();
            this.ctx.arc(-60, 0, 20, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
        
        // Draw attached hubs (in world space, accounting for ship rotation)
        this.hubs.forEach((hub, index) => {
            if (hub.attached && hub.opacity > 0) {
                // Calculate hub position relative to rotated ship
                const angle = (this.ship.rotation * Math.PI) / 180;
                const rotatedX = hub.x * Math.cos(angle) - hub.y * Math.sin(angle);
                const rotatedY = hub.x * Math.sin(angle) + hub.y * Math.cos(angle);
                
                this.drawHub(
                    this.ship.x + rotatedX, 
                    shipY + rotatedY,
                    hub.scale,
                    hub.rotation + this.ship.rotation,
                    hub.opacity
                );
            }
        });
    }
    
    drawHub(x, y, scale = 1, rotation = 0, opacity = 1, isGlowing = false) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate((rotation * Math.PI) / 180);
        this.ctx.scale(scale, scale);
        this.ctx.globalAlpha = opacity;
        
        // Add glow effect for separated hub
        if (isGlowing) {
            const glowGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 25);
            glowGradient.addColorStop(0, 'rgba(0, 255, 128, 0.6)');
            glowGradient.addColorStop(0.5, 'rgba(0, 255, 128, 0.3)');
            glowGradient.addColorStop(1, 'rgba(0, 255, 128, 0)');
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 25, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw hexagonal hub (matching game's design)
        const size = 15;
        this.ctx.fillStyle = '#0a5';
        this.ctx.strokeStyle = '#0f8';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
            const px = Math.cos(angle) * size;
            const py = Math.sin(angle) * size;
            
            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw center dot
        this.ctx.fillStyle = '#0ff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            
            if (particle.life > 0) {
                this.ctx.save();
                this.ctx.globalAlpha = particle.life;
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
                this.ctx.restore();
                return true;
            }
            return false;
        });
    }
    
    end() {
        this.isPlaying = false;
        
        if (this.timeline) {
            this.timeline.pause();
        }
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // Mark cutscene as seen
        await storageAdapter.setItem('cutsceneSeen', 'true');
        
        // Start transition to game
        this.transitionToGame();
    }
    
    transitionToGame() {
        // Fade in from black
        anime({
            targets: this.fadeOverlay,
            opacity: 0,
            duration: 1000,
            easing: 'easeOutQuad',
            complete: () => {
                // Hide cutscene container
                this.container.style.display = 'none';
                
                // Show game container
                document.getElementById('gameContainer').style.display = 'block';
                
                // Initialize game
                if (this.onComplete) {
                    this.onComplete();
                }
                
                // Show title and tutorial after a brief delay
                setTimeout(() => {
                    this.showTitleAndTutorial();
                }, 500);
            }
        });
    }
    
    showTitleAndTutorial() {
        // Create title overlay
        const titleOverlay = document.createElement('div');
        titleOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding-top: 200px;
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-family: 'Courier New', 'Lucida Console', monospace;
            font-size: 56px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #0ff;
            text-shadow: 
                0 0 5px rgba(0,255,255,1),
                0 0 10px rgba(0,255,255,0.8),
                0 0 20px rgba(0,255,255,0.6),
                0 0 40px rgba(0,255,255,0.4),
                2px 2px 0px rgba(0,255,255,0.3);
            opacity: 0;
            transform: translateY(-20px);
            border: 2px solid rgba(0,255,255,0.3);
            padding: 20px 30px;
            background: rgba(0,20,30,0.8);
            backdrop-filter: blur(2px);
        `;
        title.textContent = 'PROBETHEUS';
        
        const subtitle = document.createElement('div');
        subtitle.style.cssText = `
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: normal;
            letter-spacing: 4px;
            color: #0aa;
            text-shadow: 0 0 10px rgba(0,170,170,0.8);
            margin-top: 15px;
            opacity: 0;
            transform: translateY(-10px);
            text-transform: uppercase;
        `;
        subtitle.textContent = 'Probe the Unknown';
        
        titleOverlay.appendChild(title);
        titleOverlay.appendChild(subtitle);
        document.body.appendChild(titleOverlay);
        
        // Animate titles in with TRON-style effects
        anime({
            targets: title,
            opacity: 1,
            translateY: 0,
            duration: 800,
            easing: 'easeOutQuad',
            complete: () => {
                // Add subtle pulsing effect
                anime({
                    targets: title,
                    textShadow: [
                        '0 0 5px rgba(0,255,255,1), 0 0 10px rgba(0,255,255,0.8), 0 0 20px rgba(0,255,255,0.6), 0 0 40px rgba(0,255,255,0.4), 2px 2px 0px rgba(0,255,255,0.3)',
                        '0 0 8px rgba(0,255,255,1), 0 0 15px rgba(0,255,255,0.9), 0 0 30px rgba(0,255,255,0.7), 0 0 60px rgba(0,255,255,0.5), 2px 2px 0px rgba(0,255,255,0.4)',
                        '0 0 5px rgba(0,255,255,1), 0 0 10px rgba(0,255,255,0.8), 0 0 20px rgba(0,255,255,0.6), 0 0 40px rgba(0,255,255,0.4), 2px 2px 0px rgba(0,255,255,0.3)'
                    ],
                    duration: 2000,
                    easing: 'easeInOutSine',
                    loop: true
                });
            }
        });
        
        anime({
            targets: subtitle,
            opacity: 1,
            translateY: 0,
            duration: 800,
            delay: 2000, // Full 2 second delay after main title
            easing: 'easeOutQuad'
        });
        
        // Add neon shimmer effect after a beat
        setTimeout(() => {
            this.addNeonShimmerEffect(title, subtitle);
        }, 3000); // Wait 3 seconds then start shimmer
        
        // Fade out titles after 6 seconds (longer duration for cool effects)
        setTimeout(() => {
            anime({
                targets: [title, subtitle],
                opacity: 0,
                translateY: -20,
                duration: 600,
                easing: 'easeInQuad',
                complete: () => {
                    titleOverlay.remove();
                    this.showTutorial();
                }
            });
        }, 6000);
    }
    
    addNeonShimmerEffect(title, subtitle) {
        // Create a pulsing neon shimmer effect
        anime({
            targets: title,
            textShadow: [
                '0 0 5px rgba(0,255,255,1), 0 0 10px rgba(0,255,255,0.8), 0 0 20px rgba(0,255,255,0.6), 0 0 40px rgba(0,255,255,0.4), 2px 2px 0px rgba(0,255,255,0.3)',
                '0 0 10px rgba(0,255,255,1), 0 0 20px rgba(0,255,255,1), 0 0 40px rgba(0,255,255,0.8), 0 0 80px rgba(0,255,255,0.6), 0 0 120px rgba(0,255,255,0.4), 2px 2px 0px rgba(0,255,255,0.5)',
                '0 0 15px rgba(255,255,255,1), 0 0 30px rgba(0,255,255,1), 0 0 60px rgba(0,255,255,0.9), 0 0 100px rgba(0,255,255,0.7), 0 0 140px rgba(0,255,255,0.5), 2px 2px 0px rgba(255,255,255,0.6)',
                '0 0 5px rgba(0,255,255,1), 0 0 10px rgba(0,255,255,0.8), 0 0 20px rgba(0,255,255,0.6), 0 0 40px rgba(0,255,255,0.4), 2px 2px 0px rgba(0,255,255,0.3)'
            ],
            duration: 2000,
            easing: 'easeInOutSine',
            loop: 2 // Shimmer effect cycles twice
        });
        
        // Add subtle shimmer to subtitle
        anime({
            targets: subtitle,
            textShadow: [
                '0 0 10px rgba(0,170,170,0.8)',
                '0 0 20px rgba(0,200,200,1), 0 0 40px rgba(0,170,170,0.8)',
                '0 0 15px rgba(255,255,255,0.9), 0 0 30px rgba(0,200,200,0.9)',
                '0 0 10px rgba(0,170,170,0.8)'
            ],
            duration: 2000,
            easing: 'easeInOutSine',
            loop: 2
        });
        
        // Add a subtle scale pulse during shimmer
        anime({
            targets: title,
            scale: [1, 1.02, 1.01, 1],
            duration: 2000,
            easing: 'easeInOutSine',
            loop: 2
        });
    }
    
    showTutorial() {
        // Trigger the game's tutorial system after cutscene and titles
        if (window.game && window.game.showGameTips) {
            console.log('Triggering tutorial after cutscene and titles');
            window.game.showGameTips();
        } else {
            console.warn('Game not initialized yet, delaying tutorial...');
            // Retry after a short delay if game isn't ready
            setTimeout(() => {
                if (window.game && window.game.showGameTips) {
                    window.game.showGameTips();
                }
            }, 500);
        }
    }
}

// Export for use in game
window.IntroCutscene = IntroCutscene;