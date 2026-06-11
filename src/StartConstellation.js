/**
 * StartConstellation - the living constellation behind the start menu.
 *
 * Visual contract: docs/design/VISUAL_STYLE.md "Motion language".
 * A drifting network of faint nodes joined by hairline gold lines, with a
 * spark occasionally traveling one of the lines - the game's core verb
 * (value moving through a network you built) rendered as ambience.
 *
 * Respects prefers-reduced-motion: drift slows to near-still and traveling
 * sparks become stationary fades at the nodes.
 */
class StartConstellation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.nodes = [];
        this.stars = [];
        this.sparks = [];
        this.edges = [];

        this.running = false;
        this.rafId = null;
        this.pauseTimer = null;
        this.lastTime = 0;
        this.nextSparkIn = 1.2; // first spark arrives quickly so the screen feels alive

        this.reducedMotion = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.LINK_DIST = 190;
        this.LINE_RGB = '212, 175, 55';     // --fire
        this.NODE_COLOR = '#8B84A3';        // --mist
        this.SPARK_COLOR = '#D4AF37';       // --fire

        this.onResize = () => this.resize();
        window.addEventListener('resize', this.onResize);
        this.resize();
        this.seed();
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.width = this.canvas.clientWidth || window.innerWidth;
        this.height = this.canvas.clientHeight || window.innerHeight;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    seed() {
        const area = this.width * this.height;
        const nodeCount = Math.max(18, Math.min(40, Math.round(area / 42000)));
        const starCount = Math.round(area / 14000);
        const driftScale = this.reducedMotion ? 0.15 : 1;

        this.nodes = [];
        for (let i = 0; i < nodeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (2 + Math.random() * 3) * driftScale; // px/sec - minutes per crossing
            this.nodes.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: 0.8 + Math.random() * 1.2,
                phase: Math.random() * Math.PI * 2,
            });
        }

        this.stars = [];
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                r: 0.4 + Math.random() * 0.7,
                alpha: 0.06 + Math.random() * 0.18,
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.rafId = requestAnimationFrame((t) => this.frame(t));
    }

    stop() {
        this.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        if (this.pauseTimer) clearTimeout(this.pauseTimer);
        this.rafId = null;
        this.pauseTimer = null;
    }

    isVisible() {
        const screen = document.getElementById('startScreen');
        return !!screen && screen.style.display !== 'none' && screen.offsetParent !== null;
    }

    frame(now) {
        if (!this.running) return;

        if (!this.isVisible()) {
            // Start screen hidden (game running) - poll cheaply until it returns
            this.pauseTimer = setTimeout(() => {
                if (!this.running) return;
                this.lastTime = performance.now();
                this.rafId = requestAnimationFrame((t) => this.frame(t));
            }, 500);
            return;
        }

        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt, now / 1000);
        this.render(now / 1000);

        this.rafId = requestAnimationFrame((t) => this.frame(t));
    }

    update(dt, time) {
        for (const n of this.nodes) {
            n.x += n.vx * dt;
            n.y += n.vy * dt;
            // wrap with margin so lines don't pop at the border
            const m = 40;
            if (n.x < -m) n.x = this.width + m;
            if (n.x > this.width + m) n.x = -m;
            if (n.y < -m) n.y = this.height + m;
            if (n.y > this.height + m) n.y = -m;
        }

        // Rebuild edge list (n is small; O(n^2) is fine)
        this.edges = [];
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const a = this.nodes[i], b = this.nodes[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < this.LINK_DIST) {
                    this.edges.push({ a, b, alpha: (1 - d / this.LINK_DIST) * 0.28 });
                }
            }
        }

        // Spawn sparks on a gentle cadence
        this.nextSparkIn -= dt;
        if (this.nextSparkIn <= 0 && this.edges.length > 0) {
            const edge = this.edges[Math.floor(Math.random() * this.edges.length)];
            this.sparks.push({
                a: edge.a, b: edge.b,
                t: 0,
                duration: this.reducedMotion ? 2.4 : 1.4 + Math.random() * 0.9,
            });
            this.nextSparkIn = 2.5 + Math.random() * 3.5;
        }

        for (const s of this.sparks) s.t += dt / s.duration;
        this.sparks = this.sparks.filter((s) => s.t < 1);
    }

    render(time) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // backdrop stars, breathing slowly
        for (const st of this.stars) {
            const a = st.alpha * (0.7 + 0.3 * Math.sin(time * 0.4 + st.phase));
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(139, 132, 163, ${a.toFixed(3)})`;
            ctx.fill();
        }

        // hairline gold network
        ctx.lineWidth = 1;
        for (const e of this.edges) {
            ctx.beginPath();
            ctx.moveTo(e.a.x, e.a.y);
            ctx.lineTo(e.b.x, e.b.y);
            ctx.strokeStyle = `rgba(${this.LINE_RGB}, ${e.alpha.toFixed(3)})`;
            ctx.stroke();
        }

        // nodes - faint, breathing on 3-4s cycles
        for (const n of this.nodes) {
            const a = 0.35 + 0.2 * Math.sin(time * 1.6 + n.phase);
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(139, 132, 163, ${a.toFixed(3)})`;
            ctx.fill();
        }

        // sparks: gold points traveling a line (reduced motion: fade in place)
        for (const s of this.sparks) {
            const fade = Math.sin(s.t * Math.PI); // ease in and out of existence
            let x, y;
            if (this.reducedMotion) {
                x = s.a.x;
                y = s.a.y;
            } else {
                x = s.a.x + (s.b.x - s.a.x) * s.t;
                y = s.a.y + (s.b.y - s.a.y) * s.t;
            }
            ctx.beginPath();
            ctx.arc(x, y, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(212, 175, 55, ${(0.95 * fade).toFixed(3)})`;
            ctx.shadowColor = 'rgba(212, 175, 55, 0.8)';
            ctx.shadowBlur = 8 * fade;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}

window.StartConstellation = StartConstellation;
