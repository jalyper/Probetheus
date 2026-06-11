/**
 * CargoSparkSystem - gold points traveling along routes when value moves.
 *
 * Visual contract: docs/design/VISUAL_STYLE.md "Motion language": "Sparks
 * travel. Whenever value moves through the network, a spark shows it."
 * The spark is throughput made visible - a well-fed hub receives a steady
 * gentle pulse of gold; a starved one goes dark. Legibility, not decoration.
 *
 * Listens:
 *   probe:cargoDelivered   { probe }            - spark runs the final return leg into the hub
 *   shuttle:cargoDelivered { from, to }         - spark runs the shuttle's leg into the station/hub
 *
 * Runs on sim-time (deltaTime already scaled by GameController), so sparks
 * pause and speed up with the game clock.
 */
class CargoSparkSystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;

        this.sparks = [];   // { from, to, t, duration }
        this.arrivals = []; // { x, y, age, duration } - soft ring where a spark lands

        this.MAX_LEG = 220;          // px - cap the visible run so long routes stay snappy
        this.SPARK_DURATION = 700;   // ms sim-time
        this.ARRIVAL_DURATION = 450; // ms sim-time
        this.MAX_SPARKS = 80;        // safety cap for huge networks

        this.reducedMotion = typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        eventBus.on('probe:cargoDelivered', (data) => {
            if (data && data.probe) this.spawnForProbe(data.probe);
        });
        eventBus.on('shuttle:cargoDelivered', (data) => {
            if (data && data.from && data.to) this.spawn(data.from, data.to);
        });
    }

    spawnForProbe(probe) {
        if (!probe.hub) return;
        const to = { x: probe.hub.x, y: probe.hub.y };

        // Final return leg: second-to-last waypoint -> hub (waypoints are
        // still intact when probe:cargoDelivered fires)
        let from = null;
        if (probe.waypoints && probe.waypoints.length >= 2) {
            const wp = probe.waypoints[probe.waypoints.length - 2];
            from = { x: wp.x, y: wp.y };
        }
        if (!from || (from.x === to.x && from.y === to.y)) return;

        this.spawn(from, to);
    }

    spawn(from, to) {
        if (this.sparks.length >= this.MAX_SPARKS) return;

        // Cap the run length so sparks read as quick pulses, not slow crawls
        const dx = from.x - to.x;
        const dy = from.y - to.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return;
        if (dist > this.MAX_LEG) {
            const k = this.MAX_LEG / dist;
            from = { x: to.x + dx * k, y: to.y + dy * k };
        }

        if (this.reducedMotion) {
            // Sparks become fades (VISUAL_STYLE accessibility rule)
            this.arrivals.push({ x: to.x, y: to.y, age: 0, duration: this.ARRIVAL_DURATION * 2 });
            return;
        }

        this.sparks.push({ from, to, t: 0, duration: this.SPARK_DURATION });
    }

    /**
     * @param {number} deltaTime - sim-time ms (already time-scaled; 0 while paused)
     */
    update(deltaTime) {
        if (deltaTime <= 0) return;

        // Age arrivals first so a spark landing this tick still shows its ring
        this.arrivals.forEach(a => { a.age += deltaTime; });
        this.arrivals = this.arrivals.filter(a => a.age < a.duration);

        const landed = [];
        this.sparks.forEach(s => {
            s.t += deltaTime / s.duration;
            if (s.t >= 1) landed.push(s);
        });
        if (landed.length > 0) {
            this.sparks = this.sparks.filter(s => s.t < 1);
            landed.forEach(s => {
                this.arrivals.push({ x: s.to.x, y: s.to.y, age: 0, duration: this.ARRIVAL_DURATION });
            });
        }
    }

    render(ctx, viewOffset) {
        // Traveling sparks - bright gold point with a short fading tail
        for (const s of this.sparks) {
            // Ease-out: the spark decelerates as it arrives home
            const t = 1 - (1 - s.t) * (1 - s.t);
            const x = s.from.x + (s.to.x - s.from.x) * t - viewOffset.x;
            const y = s.from.y + (s.to.y - s.from.y) * t - viewOffset.y;

            // Tail: two ghost points trailing behind along the line
            for (let g = 1; g <= 2; g++) {
                const gt = Math.max(0, t - g * 0.08);
                const gx = s.from.x + (s.to.x - s.from.x) * gt - viewOffset.x;
                const gy = s.from.y + (s.to.y - s.from.y) * gt - viewOffset.y;
                ctx.beginPath();
                ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(212, 175, 55, ${0.35 / g})`;
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
            ctx.shadowColor = 'rgba(212, 175, 55, 0.8)';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Arrival rings - a soft gold breath where the cargo landed
        for (const a of this.arrivals) {
            const p = a.age / a.duration;
            const radius = 5 + p * 12;
            ctx.beginPath();
            ctx.arc(a.x - viewOffset.x, a.y - viewOffset.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(212, 175, 55, ${0.55 * (1 - p)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

window.CargoSparkSystem = CargoSparkSystem;
