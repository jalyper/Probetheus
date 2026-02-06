/**
 * SynthesisAnimationManager
 * Manages the visual animation for probethium synthesis at hubs
 * Renders a 3-second purple-to-gold transformation effect on the galaxy canvas
 */
class SynthesisAnimationManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.queue = [];
        this.currentAnimation = null;
        this.shakeOffset = { x: 0, y: 0 };

        // Listen for synthesis triggers
        this.eventBus.on('synthesis:triggered', (data) => {
            this.enqueueSynthesis(data.hub);
        });
    }

    /**
     * Add a synthesis animation to the queue
     */
    enqueueSynthesis(hub) {
        this.queue.push({
            hub: hub,
            elapsed: 0,
            duration: 3000, // 3 seconds total
            particles: []
        });

        // Start animation if none is active
        if (!this.currentAnimation) {
            this.startNextAnimation();
        }
    }

    /**
     * Start the next animation in the queue
     */
    startNextAnimation() {
        if (this.queue.length === 0) {
            this.currentAnimation = null;
            this.shakeOffset = { x: 0, y: 0 };
            return;
        }

        this.currentAnimation = this.queue.shift();
        this.initializeParticles();
    }

    /**
     * Initialize particles for the current animation
     */
    initializeParticles() {
        if (!this.currentAnimation) return;

        const hub = this.currentAnimation.hub;

        // Phase 1: 12 inward spiral particles (purple)
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            const distance = 80 + Math.random() * 40;

            this.currentAnimation.particles.push({
                phase: 1,
                x: hub.x + Math.cos(angle) * distance,
                y: hub.y + Math.sin(angle) * distance,
                startX: hub.x + Math.cos(angle) * distance,
                startY: hub.y + Math.sin(angle) * distance,
                targetX: hub.x,
                targetY: hub.y,
                angle: angle,
                speed: 0.8 + Math.random() * 0.4,
                size: 2 + Math.random() * 2
            });
        }

        // Phase 3: 16 outward drift particles (golden) - will be activated later
        for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
            const speed = 0.3 + Math.random() * 0.4;

            this.currentAnimation.particles.push({
                phase: 3,
                x: hub.x,
                y: hub.y,
                angle: angle,
                speed: speed,
                size: 1 + Math.random() * 2,
                alpha: 1
            });
        }
    }

    /**
     * Update animation state
     */
    update(deltaTime) {
        if (!this.currentAnimation) return;

        this.currentAnimation.elapsed += deltaTime;

        // Complete animation after 3 seconds
        if (this.currentAnimation.elapsed >= this.currentAnimation.duration) {
            this.startNextAnimation();
            return;
        }

        const elapsed = this.currentAnimation.elapsed;
        const hub = this.currentAnimation.hub;

        // Phase 1 (0-1000ms): Spiral inward
        if (elapsed < 1000) {
            const progress = elapsed / 1000;
            this.currentAnimation.particles.forEach(p => {
                if (p.phase === 1) {
                    // Spiral toward center
                    p.x = p.startX + (p.targetX - p.startX) * progress;
                    p.y = p.startY + (p.targetY - p.startY) * progress;
                    // Add spiral rotation
                    const spiralAngle = p.angle + progress * Math.PI * 4;
                    const spiralRadius = (1 - progress) * 80;
                    p.x = hub.x + Math.cos(spiralAngle) * spiralRadius;
                    p.y = hub.y + Math.sin(spiralAngle) * spiralRadius;
                }
            });
        }

        // Phase 2 (1000-1500ms): Flash and shake
        if (elapsed >= 1000 && elapsed < 1500) {
            const shakeProgress = (elapsed - 1000) / 300; // 300ms of shake
            if (shakeProgress < 1) {
                const shakeMagnitude = (1 - shakeProgress) * 3; // Decay over 300ms
                this.shakeOffset.x = (Math.random() - 0.5) * shakeMagnitude;
                this.shakeOffset.y = (Math.random() - 0.5) * shakeMagnitude;
            } else {
                this.shakeOffset.x = 0;
                this.shakeOffset.y = 0;
            }
        }

        // Phase 3 (1500-3000ms): Outward drift
        if (elapsed >= 1500) {
            const driftElapsed = elapsed - 1500;
            const driftDuration = 1500;
            const driftProgress = driftElapsed / driftDuration;

            this.currentAnimation.particles.forEach(p => {
                if (p.phase === 3) {
                    const distance = p.speed * driftElapsed * 0.1;
                    p.x = hub.x + Math.cos(p.angle) * distance;
                    p.y = hub.y + Math.sin(p.angle) * distance;
                    p.alpha = 1 - driftProgress; // Fade out
                }
            });
        }
    }

    /**
     * Render animation on canvas
     */
    render(ctx, viewOffset) {
        if (!this.currentAnimation) return;

        const elapsed = this.currentAnimation.elapsed;
        const hub = this.currentAnimation.hub;

        ctx.save();

        // World-to-screen transformation
        const screenX = hub.x - viewOffset.x;
        const screenY = hub.y - viewOffset.y;

        // Phase 1 (0-1000ms): Purple spiral particles
        if (elapsed < 1000) {
            this.currentAnimation.particles.forEach(p => {
                if (p.phase === 1) {
                    const particleScreenX = p.x - viewOffset.x;
                    const particleScreenY = p.y - viewOffset.y;

                    ctx.fillStyle = '#9400d3';
                    ctx.globalAlpha = 0.8;
                    ctx.beginPath();
                    ctx.arc(particleScreenX, particleScreenY, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Hub pulse glow
            const pulseProgress = (elapsed % 500) / 500;
            const pulseSize = 20 + pulseProgress * 30;
            const pulseAlpha = (1 - pulseProgress) * 0.5;

            ctx.fillStyle = '#9400d3';
            ctx.globalAlpha = pulseAlpha;
            ctx.beginPath();
            ctx.arc(screenX, screenY, pulseSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Phase 2 (1000-1500ms): White-to-gold flash and golden ring
        if (elapsed >= 1000 && elapsed < 1500) {
            const flashProgress = (elapsed - 1000) / 500;

            // Flash color transition: white -> gold
            const flashR = 255;
            const flashG = Math.floor(255 - flashProgress * 40);
            const flashB = Math.floor(255 * (1 - flashProgress));
            const flashAlpha = flashProgress < 0.2 ? 1 : (1 - (flashProgress - 0.2) / 0.8) * 0.8;

            ctx.fillStyle = `rgb(${flashR}, ${flashG}, ${flashB})`;
            ctx.globalAlpha = flashAlpha;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 40, 0, Math.PI * 2);
            ctx.fill();

            // Golden expanding ring
            if (flashProgress > 0.3) {
                const ringProgress = (flashProgress - 0.3) / 0.7;
                const ringRadius = 20 + ringProgress * 60;
                const ringAlpha = (1 - ringProgress) * 0.8;

                ctx.strokeStyle = '#ffd700';
                ctx.globalAlpha = ringAlpha;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(screenX, screenY, ringRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Phase 3 (1500-3000ms): Golden afterglow and drifting particles
        if (elapsed >= 1500) {
            const afterglowProgress = (elapsed - 1500) / 1500;

            // Golden afterglow fading
            const afterglowAlpha = (1 - afterglowProgress) * 0.6;
            ctx.fillStyle = '#ffd700';
            ctx.globalAlpha = afterglowAlpha;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 30, 0, Math.PI * 2);
            ctx.fill();

            // Drifting golden particles
            this.currentAnimation.particles.forEach(p => {
                if (p.phase === 3) {
                    const particleScreenX = p.x - viewOffset.x;
                    const particleScreenY = p.y - viewOffset.y;

                    ctx.fillStyle = '#ffd700';
                    ctx.globalAlpha = p.alpha * 0.7;
                    ctx.beginPath();
                    ctx.arc(particleScreenX, particleScreenY, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }

        ctx.restore();
    }

    /**
     * Get current shake offset for camera
     */
    getShakeOffset() {
        return this.shakeOffset;
    }
}
