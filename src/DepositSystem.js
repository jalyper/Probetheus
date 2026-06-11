/**
 * DepositSystem - persistent resource deposits; the world the network is built against.
 *
 * Loop contract: docs/design/LOOP_REDESIGN.md (Direction A, chosen 2026-06-11).
 * Resources come from PLACES, not probes. Deposits are generated per sector
 * (deterministic seed), discovered via prospecting pings, and extracted by
 * probes passing on routes - subject to a per-deposit rate cap so stacking
 * probes on one vein saturates and expansion is the growth verb.
 *
 * Listens:  signal:collected (with depositId) -> discovery
 * Emits:    deposit:discovered, deposit:extracted, resource:indicator
 */
class DepositSystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;

        if (!this.gameState.entities.deposits) {
            this.gameState.entities.deposits = [];
        }
        this.generatedSectors = new Set();

        this.EXTRACT_RANGE = 48;        // px - probe must pass this close to extract
        this.DETECT_RANGE_BONUS = 0;    // pings use the probe's pulse radius

        eventBus.on('signal:collected', (data) => {
            if (data && data.depositId) this.discover(data.depositId);
        });
    }

    deposits() {
        return this.gameState.entities.deposits;
    }

    // --- deterministic per-sector PRNG (same layout every run; only the
    // discovered flags are save-state) ------------------------------------
    rngFor(sectorX, sectorY) {
        let s = (sectorX * 374761393 + sectorY * 668265263) ^ 0x9E3779B9;
        return function () {
            s |= 0; s = (s + 0x6D2B79F5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /**
     * Lazily generate deposits for every initialized sector. Called each
     * frame; cheap because generated sectors are memoized.
     */
    update(deltaTime) {
        // Save/load handshake: a loaded game clears deposits, regenerates
        // them deterministically, then re-applies the charted flags
        if (this.gameState.depositsResetRequested) {
            this.gameState.entities.deposits = [];
            this.generatedSectors.clear();
            delete this.gameState.depositsResetRequested;
        }

        const world = this.gameState.getWorld();
        world.sectors.forEach((sector, key) => {
            if (!this.generatedSectors.has(key)) {
                const [sx, sy] = key.split(',').map(Number);
                this.generateForSector(sx, sy, sector);
                this.generatedSectors.add(key);
            }
        });

        if (this.gameState.pendingDiscoveredDeposits) {
            this.applyDiscoveredIds(this.gameState.pendingDiscoveredDeposits);
            delete this.gameState.pendingDiscoveredDeposits;
        }

        // Refill extraction-rate token buckets (sim-time)
        if (deltaTime > 0) {
            for (const d of this.deposits()) {
                d.tokens = Math.min(d.ratePerMin, d.tokens + (d.ratePerMin / 60000) * deltaTime);
            }
        }
    }

    generateForSector(sectorX, sectorY, sector) {
        // Skip if a save already restored this sector's deposits
        if (this.deposits().some(d => d.sectorKey === `${sectorX},${sectorY}`)) return;

        const world = this.gameState.getWorld();
        const rng = this.rngFor(sectorX, sectorY);
        const baseX = sectorX * world.standardSectorWidth;
        const baseY = sectorY * world.standardSectorHeight;
        const margin = 120;

        // Concentric rings (Valheim-style): difficulty and exoticness grow
        // with distance from home in ANY direction. ring = distance band.
        const dist = Math.sqrt(sectorX * sectorX + sectorY * sectorY);
        const ring = Math.floor(dist);
        const richnessMult = 1 + dist * 0.5;   // the frontier pull, made mechanical

        // Ring 2+ deposits can carry exotic materials — the further out,
        // the more likely. Exotics gate logistics upgrades (factory-first).
        const exoticChance = ring >= 2 ? Math.min(0.5, 0.15 * (ring - 1)) : 0;

        const typeName = sector?.type?.name || 'Standard';
        const typeWeights = {
            'Standard':      { minerals: 0.45, data: 0.35, artifacts: 0.20 },
            'Resource-Rich': { minerals: 0.75, data: 0.15, artifacts: 0.10 },
            'Data Haven':    { minerals: 0.15, data: 0.70, artifacts: 0.15 },
            'Ancient':       { minerals: 0.10, data: 0.25, artifacts: 0.65 },
            'Asteroid Field': { minerals: 0.50, data: 0.25, artifacts: 0.25 },
        }[typeName] || { minerals: 0.45, data: 0.35, artifacts: 0.20 };

        const makeDeposit = (x, y, type, richness, ratePerMin) => ({
            id: `dep_${sectorX}_${sectorY}_${this.deposits().length}_${Math.floor(rng() * 1e6)}`,
            x, y, type,
            richness: Math.round(richness),     // units per extraction pass
            ratePerMin: Math.round(ratePerMin), // extraction cap
            tokens: Math.round(ratePerMin),     // token bucket, starts full
            discovered: false,
            sectorKey: `${sectorX},${sectorY}`,
        });

        const pickType = () => {
            if (exoticChance > 0 && rng() < exoticChance) return 'exoticMinerals';
            const r = rng();
            if (r < typeWeights.minerals) return 'minerals';
            if (r < typeWeights.minerals + typeWeights.data) return 'data';
            return 'artifacts';
        };

        if (sectorX === 0 && sectorY === 0) {
            // Starter layout: hand-shaped so the first choice is real.
            // Home hub spawns near sector center (world center area).
            const cx = baseX + world.standardSectorWidth / 2;
            const cy = baseY + world.standardSectorHeight / 2;
            this.deposits().push(
                makeDeposit(cx - 260, cy - 140, 'minerals', 8, 24),  // decent, close
                makeDeposit(cx + 220, cy - 200, 'data', 7, 20),      // decent, close
                makeDeposit(cx - 120, cy + 280, 'minerals', 4, 10),  // visibly mediocre
                makeDeposit(cx + 420, cy + 320, 'artifacts', 12, 30) // better, farther
            );
            return;
        }

        const count = 2 + Math.floor(rng() * 3); // 2-4 per sector
        for (let i = 0; i < count; i++) {
            const x = baseX + margin + rng() * (world.standardSectorWidth - margin * 2);
            const y = baseY + margin + rng() * (world.standardSectorHeight - margin * 2);
            const richness = (5 + rng() * 10) * richnessMult;
            const ratePerMin = (12 + rng() * 24) * richnessMult;
            this.deposits().push(makeDeposit(x, y, pickType(), richness, ratePerMin));
        }
    }

    findUndiscoveredInRange(x, y, range) {
        return this.deposits().filter(d => {
            if (d.discovered) return false;
            const dx = d.x - x, dy = d.y - y;
            return dx * dx + dy * dy <= range * range;
        });
    }

    findDiscoveredInRange(x, y, range) {
        return this.deposits().filter(d => {
            if (!d.discovered) return false;
            const dx = d.x - x, dy = d.y - y;
            return dx * dx + dy * dy <= range * range;
        });
    }

    getById(id) {
        return this.deposits().find(d => d.id === id) || null;
    }

    discover(depositId) {
        const d = this.getById(depositId);
        if (!d || d.discovered) return;
        d.discovered = true;

        this.eventBus.emit('deposit:discovered', { deposit: d });
        this.eventBus.emit('ui:message', {
            text: `Deposit charted: ${d.type} · richness ${d.richness} · up to ${d.ratePerMin}/min`,
            type: 'success'
        });
        this.eventBus.emit('resource:indicator', {
            x: d.x, y: d.y, text: 'CHARTED', color: '#FFD700'
        });
    }

    /**
     * Try to extract from a deposit into a probe's cargo.
     * Returns units granted (0 if capped or cargo full).
     */
    tryExtract(probe, deposit, probeManager) {
        if (!deposit.discovered) return 0;

        const capacity = probeManager.getCargoCapacity(probe);
        const used = Object.values(probe.cargo || {}).reduce((s, v) => s + v, 0);
        const space = Math.max(0, capacity - used);
        if (space === 0) return 0;

        const granted = Math.min(deposit.richness, Math.floor(deposit.tokens), space);
        if (granted <= 0) return 0;

        deposit.tokens -= granted;
        const cargoKey = deposit.type; // 'minerals' | 'data' | 'artifacts'
        probe.cargo[cargoKey] = (probe.cargo[cargoKey] || 0) + granted;

        this.eventBus.emit('deposit:extracted', { probe, deposit, amount: granted });
        this.eventBus.emit('resource:indicator', {
            x: deposit.x, y: deposit.y - 14, text: `+${granted}`, color: '#D4AF37'
        });
        return granted;
    }

    /** Save/load support: only discovered flags are state */
    getDiscoveredIds() {
        return this.deposits().filter(d => d.discovered).map(d => d.id);
    }

    applyDiscoveredIds(ids) {
        const set = new Set(ids || []);
        this.deposits().forEach(d => { d.discovered = set.has(d.id); });
    }

    /** Render discovered deposits (undiscovered ones are invisible — that's the prospecting game) */
    render(ctx, viewOffset) {
        const time = Date.now() * 0.001;
        const colors = {
            minerals: '#C97B4A',        // copper
            data: '#5B8CFF',            // clear blue
            artifacts: '#B06BFF',       // rift violet
            exoticMinerals: '#E8E4F0',  // signal-white shimmer — the rare stuff
        };

        for (const d of this.deposits()) {
            if (!d.discovered) continue;
            const x = d.x - viewOffset.x;
            const y = d.y - viewOffset.y;

            const saturation = d.tokens / d.ratePerMin;            // 0 = capped out
            const breathe = 0.75 + 0.25 * Math.sin(time * 1.2 + d.x); // slow, gentle
            const size = 6 + Math.min(8, d.richness * 0.4);
            const color = colors[d.type] || '#8B84A3';

            // Diamond outline, alpha tracks remaining rate (a worked-dry vein dims)
            ctx.save();
            ctx.globalAlpha = (0.35 + 0.55 * saturation) * breathe;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size * 0.7, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x - size * 0.7, y);
            ctx.closePath();
            ctx.stroke();

            // Inner core dot
            ctx.beginPath();
            ctx.arc(x, y, 1.6, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            // Rate readout under the glyph (Plex Mono, mist)
            ctx.globalAlpha = 0.7;
            ctx.font = "9px 'IBM Plex Mono', monospace";
            ctx.textAlign = 'center';
            ctx.fillStyle = saturation < 0.15 ? '#E0524D' : '#8B84A3';
            ctx.fillText(`${Math.round(d.ratePerMin * (1 - saturation))}/${d.ratePerMin}`, x, y + size + 12);
            ctx.restore();
        }
    }
}

window.DepositSystem = DepositSystem;
