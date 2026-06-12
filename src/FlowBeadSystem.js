/**
 * FlowBeadSystem - continuous cargo bead chains riding route filaments.
 *
 * Visual contract: docs/design/VISUAL_STYLE.md "Material flow — the conveyor
 * in space". The route IS the conveyor: an actively-worked route carries a
 * chain of type-colored beads whose density is proportional to that route's
 * delivered throughput. A starved route carries one lonely bead; a humming
 * route carries a glittering chain; past the bead cap the filament itself
 * brightens instead. This replaces the event-based CargoSparkSystem (v1 of
 * this grammar) — beads are persistent state, not fire-and-forget pulses.
 *
 * Listens:
 *   probe:cargoDelivered     { probe, cargo, total } - accrues per-route
 *       throughput + spawns a consumption pulse at the hub
 *   freighter:cargoDelivered { from, to, type }      - one-shot typed bead on
 *       the hub↔Foundry leg: copper minerals out, alloy home (REBUILD.md §2,
 *       the processor-port read — the flow visibly changes color through the
 *       building)
 *
 * Runs on sim-time (deltaTime already scaled by GameController), so the flow
 * freezes on pause and speeds up with the game clock.
 */
class FlowBeadSystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;

        this.WINDOW_MS = 90 * 1000;  // rolling sim-time window for route rates
        this.MIN_SPAN_MS = 5 * 1000; // don't inflate rates in the first seconds
        this.MAX_BEADS = 12;         // per route — beyond this the filament brightens
        this.RATE_PER_BEAD = 4;      // delivered units/min each bead represents
        this.BEAD_SPEED = 0.08;      // px per sim-ms along the filament
        this.BEAD_RADIUS = 2.5;      // VISUAL_STYLE: beads are 2-3px
        this.PULSE_DURATION = 700;   // ms sim-time, one-shot shuttle beads
        this.ARRIVAL_DURATION = 450; // ms sim-time, consumption ring at the hub
        this.MAX_PULSE_LEG = 220;    // px — keep one-shot runs reading as pulses

        this.simTime = 0;
        this.routes = new Map();     // probe.id -> { deliveries: [{t, byType, total}], flowPhase, loopLength }
        this.pulses = [];            // { from, to, t, duration } one-shot shuttle beads
        this.arrivals = [];          // { x, y, age, duration } consumption rings

        this.reducedMotion = typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        eventBus.on('probe:cargoDelivered', (data) => {
            if (data && data.probe) this.recordDelivery(data.probe, data.cargo || {}, data.total || 0);
        });
        eventBus.on('freighter:cargoDelivered', (data) => {
            if (data && data.from && data.to) this.spawnPulse(data.from, data.to, data.type);
        });
    }

    recordDelivery(probe, cargo, total) {
        if (probe.id === undefined || probe.id === null) return;
        const route = this.getRoute(probe.id);
        route.deliveries.push({
            t: this.simTime,
            byType: {
                minerals: cargo.minerals || 0,
                data: cargo.data || 0,
                artifacts: cargo.artifacts || 0,
                exoticMinerals: cargo.exoticMinerals || 0
            },
            total
        });

        // Consumption beat: a small gold breath where the hub swallowed the cargo
        if (probe.hub) {
            this.arrivals.push({
                x: probe.hub.x, y: probe.hub.y,
                age: 0,
                duration: this.ARRIVAL_DURATION * (this.reducedMotion ? 2 : 1)
            });
        }
    }

    getRoute(probeId) {
        let route = this.routes.get(probeId);
        if (!route) {
            route = { deliveries: [], flowPhase: 0, loopLength: 600 };
            this.routes.set(probeId, route);
        }
        return route;
    }

    pruneRoute(route) {
        const cutoff = this.simTime - this.WINDOW_MS;
        while (route.deliveries.length && route.deliveries[0].t < cutoff) route.deliveries.shift();
    }

    /** Delivered units/min on this probe's route over the rolling window (sim-time) */
    routeRate(probeId) {
        const route = this.routes.get(probeId);
        if (!route) return 0;
        this.pruneRoute(route);
        const span = Math.max(Math.min(this.simTime, this.WINDOW_MS), this.MIN_SPAN_MS);
        const sum = route.deliveries.reduce((s, d) => s + d.total, 0);
        return sum / (span / 60000);
    }

    /** Cargo-type proportions of the window's deliveries — drives bead striping */
    routeMix(probeId) {
        const route = this.routes.get(probeId);
        const mix = { minerals: 0, data: 0, artifacts: 0, exoticMinerals: 0 };
        if (!route) return mix;
        this.pruneRoute(route);
        let total = 0;
        for (const d of route.deliveries) {
            for (const type in mix) mix[type] += d.byType[type];
            total += d.byType.minerals + d.byType.data + d.byType.artifacts + d.byType.exoticMinerals;
        }
        if (total > 0) for (const type in mix) mix[type] /= total;
        return mix;
    }

    /** Bead count for a route rate: 0 if dead, 1 if starved-but-working, capped chain */
    beadCountFor(rate) {
        if (rate <= 0) return 0;
        return Math.min(this.MAX_BEADS, Math.max(1, Math.ceil(rate / this.RATE_PER_BEAD)));
    }

    /** Past the bead cap the chain stops growing — the filament brightens instead */
    isOverCapacity(rate) {
        return rate > this.MAX_BEADS * this.RATE_PER_BEAD;
    }

    /**
     * Deterministic stripe color for bead slot i of n: beads partition the
     * chain by the route's cargo mix, so a mixed-haul route reads as a stable
     * striped chain, not flickering confetti.
     */
    beadColor(mix, i, n) {
        const u = (i + 0.5) / n;
        let acc = 0;
        for (const type of ['minerals', 'data', 'artifacts', 'exoticMinerals']) {
            acc += mix[type];
            if (u <= acc && mix[type] > 0) return window.PALETTE.MATERIALS[type];
        }
        return window.PALETTE.FIRE; // no typed cargo in window (raw total only)
    }

    spawnPulse(from, to, materialType) {
        const dx = from.x - to.x;
        const dy = from.y - to.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return;
        if (dist > this.MAX_PULSE_LEG) {
            const k = this.MAX_PULSE_LEG / dist;
            from = { x: to.x + dx * k, y: to.y + dy * k };
        }

        if (this.reducedMotion) {
            // Motion becomes fades (VISUAL_STYLE accessibility rule)
            this.arrivals.push({ x: to.x, y: to.y, age: 0, duration: this.ARRIVAL_DURATION * 2 });
            return;
        }

        // Typed pulses ride in their material color (processor-port grammar);
        // untyped ones stay gold
        const color = (materialType && window.PALETTE.MATERIALS[materialType]) || null;
        this.pulses.push({ from, to, t: 0, duration: this.PULSE_DURATION, color });
    }

    /**
     * @param {number} deltaTime - sim-time ms (already time-scaled; 0 while paused)
     */
    update(deltaTime) {
        if (deltaTime <= 0) return;
        this.simTime += deltaTime;

        // March the bead chains (phase is a 0..1 position around the loop)
        if (!this.reducedMotion) {
            for (const route of this.routes.values()) {
                route.flowPhase = (route.flowPhase + deltaTime * this.BEAD_SPEED / route.loopLength) % 1;
            }
        }

        this.arrivals.forEach(a => { a.age += deltaTime; });
        this.arrivals = this.arrivals.filter(a => a.age < a.duration);

        const landed = [];
        this.pulses.forEach(p => {
            p.t += deltaTime / p.duration;
            if (p.t >= 1) landed.push(p);
        });
        if (landed.length > 0) {
            this.pulses = this.pulses.filter(p => p.t < 1);
            landed.forEach(p => {
                this.arrivals.push({ x: p.to.x, y: p.to.y, age: 0, duration: this.ARRIVAL_DURATION });
            });
        }

        // Forget routes whose probes are gone or long-idle
        if (this.routes.size > 0) {
            const live = new Set(this.gameState.entities.probes.map(p => p.id));
            for (const [id, route] of this.routes) {
                this.pruneRoute(route);
                if (!live.has(id) && route.deliveries.length === 0) this.routes.delete(id);
            }
        }
    }

    /** Cumulative arc-length table for a waypoint polyline */
    buildPath(waypoints) {
        const cumulative = [0];
        let length = 0;
        for (let i = 1; i < waypoints.length; i++) {
            const dx = waypoints[i].x - waypoints[i - 1].x;
            const dy = waypoints[i].y - waypoints[i - 1].y;
            length += Math.sqrt(dx * dx + dy * dy);
            cumulative.push(length);
        }
        return { cumulative, length };
    }

    /** World position at fraction t (0..1) along the polyline */
    pointAt(waypoints, path, t) {
        const target = t * path.length;
        let i = 1;
        while (i < path.cumulative.length - 1 && path.cumulative[i] < target) i++;
        const segStart = path.cumulative[i - 1];
        const segLen = path.cumulative[i] - segStart;
        const k = segLen > 0 ? (target - segStart) / segLen : 0;
        return {
            x: waypoints[i - 1].x + (waypoints[i].x - waypoints[i - 1].x) * k,
            y: waypoints[i - 1].y + (waypoints[i].y - waypoints[i - 1].y) * k
        };
    }

    render(ctx, viewOffset) {
        // Bead chains on every actively-worked route
        for (const probe of this.gameState.entities.probes) {
            if (!probe.active || !probe.waypoints || probe.waypoints.length < 2) continue;
            const rate = this.routeRate(probe.id);
            const count = this.beadCountFor(rate);
            if (count === 0) continue;

            const route = this.getRoute(probe.id);
            const path = this.buildPath(probe.waypoints);
            if (path.length < 1) continue;
            route.loopLength = path.length;

            // Over the cap the filament itself brightens — the belt-is-full read
            if (this.isOverCapacity(rate)) {
                ctx.save();
                ctx.strokeStyle = window.PALETTE.LINE;
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let i = 0; i < probe.waypoints.length; i++) {
                    const x = probe.waypoints[i].x - viewOffset.x;
                    const y = probe.waypoints[i].y - viewOffset.y;
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.restore();
            }

            const mix = this.routeMix(probe.id);
            for (let i = 0; i < count; i++) {
                const t = (route.flowPhase + i / count) % 1;
                const pos = this.pointAt(probe.waypoints, path, t);
                ctx.beginPath();
                ctx.arc(pos.x - viewOffset.x, pos.y - viewOffset.y, this.BEAD_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = this.beadColor(mix, i, count);
                ctx.globalAlpha = 0.9;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // One-shot freighter beads - a bright typed point with a short fading
        // tail (copper minerals outbound, alloy inbound; gold when untyped)
        for (const p of this.pulses) {
            const t = 1 - (1 - p.t) * (1 - p.t); // ease-out into the destination
            const x = p.from.x + (p.to.x - p.from.x) * t - viewOffset.x;
            const y = p.from.y + (p.to.y - p.from.y) * t - viewOffset.y;

            ctx.save();
            for (let g = 1; g <= 2; g++) {
                const gt = Math.max(0, t - g * 0.08);
                const gx = p.from.x + (p.to.x - p.from.x) * gt - viewOffset.x;
                const gy = p.from.y + (p.to.y - p.from.y) * gt - viewOffset.y;
                ctx.beginPath();
                ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
                ctx.fillStyle = p.color || window.PALETTE.FIRE;
                ctx.globalAlpha = 0.35 / g;
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = p.color || window.PALETTE.FIRE_BRIGHT;
            ctx.shadowColor = p.color || 'rgba(212, 175, 55, 0.8)';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
        }

        // Consumption rings - a soft gold breath where cargo was swallowed
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

window.FlowBeadSystem = FlowBeadSystem;
