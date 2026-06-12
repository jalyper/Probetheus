/**
 * StatsManager — network throughput dashboard
 * Design: docs/design/PROBE_NETWORKS.md §1 — "optimization is only fun when
 * it's measurable." Aggregates existing EventBus events into rolling rates;
 * renders a header readout (resources/min + trend) and an expandable panel.
 */
class StatsManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;

        this.WINDOW_MS = 60 * 1000;       // headline rolling window
        this.LONG_WINDOW_MS = 10 * 60 * 1000;
        this.startTime = Date.now();

        // Rolling logs, pruned to LONG_WINDOW_MS
        this.deliveries = [];   // { time, minerals, data, artifacts, exoticMinerals, total }
        this.roundTrips = [];   // { time, durationMs }
        this.panelVisible = false;

        this.eventBus.on('probe:cargoDelivered', (data) => {
            const c = data?.cargo || {};
            this.deliveries.push({
                time: Date.now(),
                minerals: c.minerals || 0,
                data: c.data || 0,
                artifacts: c.artifacts || 0,
                exoticMinerals: c.exoticMinerals || 0,
                total: data?.total || 0
            });
        });

        this.setupDom();
        this.updateInterval = setInterval(() => this.updateDom(), 1000);
    }

    prune() {
        const cutoff = Date.now() - this.LONG_WINDOW_MS;
        while (this.deliveries.length && this.deliveries[0].time < cutoff) this.deliveries.shift();
        while (this.roundTrips.length && this.roundTrips[0].time < cutoff) this.roundTrips.shift();
    }

    /**
     * Delivered resources/minute over a window ending now (offset shifts the
     * window back — used for the trend comparison).
     */
    ratePerMin(type, windowMs = this.WINDOW_MS, offsetMs = 0) {
        const now = Date.now();
        const end = now - offsetMs;
        const start = end - windowMs;
        // Don't deflate rates in the first seconds of a session
        const effectiveStart = Math.max(start, this.startTime);
        const span = Math.max(end - effectiveStart, 5000);

        let sum = 0;
        for (const d of this.deliveries) {
            if (d.time >= effectiveStart && d.time <= end) {
                sum += type === 'total' ? d.total : (d[type] || 0);
            }
        }
        return sum / (span / 60000);
    }

    /** % of active probes currently out working (vs ready/benched at hubs) */
    probeUtilization() {
        const probes = this.gameState.entities.probes.filter(p => p.active);
        if (!probes.length) return 0;
        const busy = probes.filter(p => p.waypoints && p.waypoints.length > 0).length;
        return busy / probes.length;
    }

    /** % of Foundries currently running (not starved/backed up) */
    foundryUptime() {
        const foundries = this.gameState.foundry?.foundries || [];
        if (!foundries.length) return null; // no foundries yet — not scored
        return foundries.filter(f => f.status === 'running').length / foundries.length;
    }

    /** % of freighters hauling (outbound/inbound vs docked) */
    freighterActivity() {
        const freighters = this.gameState.foundry?.freighters || [];
        if (!freighters.length) return null;
        const busy = freighters.filter(f => f.status === 'outbound' || f.status === 'inbound').length;
        return busy / freighters.length;
    }

    /**
     * Network score 0-100 (PROBE_NETWORKS.md): one number for the
     * session-over-session "am I better?" feeling. Transparent weights:
     * throughput 40%, probe utilization 30%, foundry uptime 20%, freighters 10%.
     * Missing subsystems redistribute their weight.
     */
    networkScore() {
        const parts = [];
        // Log curve: 60/min ≈ mid, 240/min ≈ max
        const rate = this.ratePerMin('total');
        parts.push({ w: 0.4, v: Math.min(1, Math.log10(1 + rate) / Math.log10(241)) });
        parts.push({ w: 0.3, v: this.probeUtilization() });
        const uptime = this.foundryUptime();
        if (uptime !== null) parts.push({ w: 0.2, v: uptime });
        const freighter = this.freighterActivity();
        if (freighter !== null) parts.push({ w: 0.1, v: freighter });

        const totalW = parts.reduce((s, p) => s + p.w, 0);
        const score = parts.reduce((s, p) => s + p.w * p.v, 0) / totalW;
        return Math.round(score * 100);
    }

    setupDom() {
        const headerValue = document.getElementById('throughputValue');
        const stat = document.getElementById('throughputStat');
        if (stat) {
            stat.style.cursor = 'pointer';
            stat.addEventListener('click', () => this.togglePanel());
        }

        // Build the expandable panel
        this.panel = document.createElement('div');
        this.panel.id = 'statsPanel';
        this.panel.style.display = 'none';
        document.body.appendChild(this.panel);

        // Close button — delegated (updateDom rebuilds innerHTML every second)
        // and on pointerdown so the 1s rebuild can't swallow a click pair
        this.panel.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.stats-close')) this.togglePanel();
        });
    }

    togglePanel() {
        this.panelVisible = !this.panelVisible;
        this.panel.style.display = this.panelVisible ? 'block' : 'none';
        if (this.panelVisible) this.updateDom();
    }

    updateDom() {
        this.prune();

        const valueEl = document.getElementById('throughputValue');
        if (valueEl) {
            const current = this.ratePerMin('total');
            const previous = this.ratePerMin('total', this.WINDOW_MS, this.WINDOW_MS);
            const arrow = current > previous * 1.05 ? '↑' : current < previous * 0.95 ? '↓' : '─';
            const arrowColor = arrow === '↑' ? 'var(--mat-data)' : arrow === '↓' ? 'var(--danger)' : 'var(--mist)';
            valueEl.innerHTML = `${current.toFixed(1)}<span class="trend" style="color:${arrowColor}">/min ${arrow}</span>`;
        }

        if (!this.panelVisible) return;

        const fmt = (v) => v === null ? '—' : `${Math.round(v * 100)}%`;
        const rateRow = (glyph, color, label, type) =>
            `<div class="stats-row"><span style="display:flex;align-items:center;gap:7px;">` +
            `<span style="color:${color};display:flex;">${window.icon(glyph, { size: 12 })}</span>${label}</span>` +
            `<span>${this.ratePerMin(type).toFixed(1)}/min</span></div>`;

        this.panel.innerHTML = `
            <div class="stats-title"><span>NETWORK THROUGHPUT</span>
                <button class="stats-close" title="Close">${window.icon('close', { size: 12 })}</button></div>
            ${rateRow('deposit-mineral', 'var(--mat-min)', 'Minerals', 'minerals')}
            ${rateRow('deposit-data', 'var(--mat-data)', 'Data', 'data')}
            ${rateRow('deposit-artifact', 'var(--mat-art)', 'Artifacts', 'artifacts')}
            ${rateRow('deposit-exotic', 'var(--mat-exo)', 'Exotic', 'exoticMinerals')}
            <div class="stats-divider"></div>
            <div class="stats-row"><span>Probe utilization</span><span>${fmt(this.probeUtilization())}</span></div>
            <div class="stats-row"><span>Foundry uptime</span><span>${fmt(this.foundryUptime())}</span></div>
            <div class="stats-row"><span>Freighter activity</span><span>${fmt(this.freighterActivity())}</span></div>
            <div class="stats-divider"></div>
            <div class="stats-row stats-score"><span>NETWORK SCORE</span><span>${this.networkScore()}</span></div>
        `;
    }
}

window.StatsManager = StatsManager;
