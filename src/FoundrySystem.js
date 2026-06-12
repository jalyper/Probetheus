/**
 * FoundrySystem — transformation you can watch (REBUILD.md §2).
 *
 * Replaces the mining station system. "Mining" belongs to deposits now; the
 * Foundry is the network's first true PROCESSOR: it consumes a mineral flow
 * and emits an alloy flow at a fixed conversion rate (FOUNDRY.CONVERT_RATIO).
 * Freighters (the shuttle recast) work the hub↔Foundry legs — minerals out,
 * alloy home. Alloy is the recipe currency for tier-2+ logistics: you cannot
 * find it, only forge it.
 *
 * Rate-matching is the game, and every state is diagnosable at a glance
 * (VISUAL_STYLE "Material flow", step 3 — processor ports):
 *   starved — input buffer empty, vane crawls, input port dark
 *   running — vane spins (2–4s period), ports glow their material colors
 *   backed  — output buffer full, conversion stalls, output port pulses
 *
 * State lives in gameState.foundry: { foundries: [], freighters: [] }.
 * Runs on sim-time (game:update deltaTime is already time-scaled), so a
 * paused game freezes the forge.
 *
 * Emits: foundry:built {foundry}, foundry:upgraded, foundry:deleted,
 *        foundry:freighterBuilt {freighter},
 *        freighter:cargoDelivered {from, to, type} — typed bead pulses
 */
class FoundrySystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;

        if (!this.gameState.foundry) {
            this.gameState.foundry = { foundries: [], freighters: [] };
        }

        this.eventBus.on('game:update', (data) => this.update(data.deltaTime));
        this.eventBus.on('foundry:build', (data) => this.build(data));
        this.eventBus.on('foundry:buildFreighter', (data) => this.buildFreighter(data));
        this.eventBus.on('foundry:upgrade', (data) => this.upgrade(data));
        this.eventBus.on('foundry:delete', (data) => this.deleteFoundry(data));
        this.eventBus.on('foundry:deleteFreighter', (data) => this.deleteFreighter(data));
    }

    constants() {
        return window.GAME_CONSTANTS.FOUNDRY;
    }

    foundries() {
        return this.gameState.foundry.foundries;
    }

    freighters() {
        return this.gameState.foundry.freighters;
    }

    findFoundry(id) {
        return this.foundries().find(f => f.id === id) || null;
    }

    findHub(id) {
        return this.gameState.entities.reconHubs.find(h => h.id === id) || null;
    }

    // ---------------------------------------------------------------- build

    /** Place a Foundry near a hub. data: { position: {x,y}, hubId } */
    build(data) {
        const { position, hubId } = data;
        const C = this.constants();

        const hubFoundries = this.foundries().filter(f => f.hubId === hubId);
        if (hubFoundries.length >= C.MAX_PER_HUB) {
            this.eventBus.emit('ui:message', {
                text: `This hub already feeds ${C.MAX_PER_HUB} Foundries`, type: 'error'
            });
            return null;
        }

        const recipe = window.RECIPES.foundry;
        if (!window.RecipeUtils.canAfford(recipe, this.gameState.getResources())) {
            this.eventBus.emit('ui:message', { text: 'Insufficient materials for a Foundry', type: 'error' });
            return null;
        }
        window.RecipeUtils.spend(recipe, this.gameState, this.eventBus);

        const foundry = {
            id: `foundry_${Date.now()}_${this.foundries().length}`,
            position: { x: position.x, y: position.y },
            hubId,
            level: 1,
            input: 0,            // buffered minerals (freighter-fed)
            output: 0,           // buffered alloy (freighter-hauled)
            status: 'starved',   // 'starved' | 'running' | 'backed'
            converted: 0,        // lifetime alloy forged
            vaneAngle: 0,
            portGlow: { in: 0, out: 0 }  // ms remaining on port consumption flashes
        };
        this.foundries().push(foundry);

        this.eventBus.emit('ui:message', { text: 'Foundry constructed — feed it minerals', type: 'success' });
        this.eventBus.emit('foundry:built', { foundry });
        this.eventBus.emit('ui:update');
        return foundry;
    }

    /** Commission a freighter serving a foundry from its supply hub. data: { foundryId } */
    buildFreighter(data) {
        const foundry = this.findFoundry(data.foundryId);
        if (!foundry) return null;
        const hub = this.findHub(foundry.hubId);
        if (!hub) return null;
        const C = this.constants();

        const hubFreighters = this.freighters().filter(f => f.hubId === foundry.hubId);
        if (hubFreighters.length >= C.MAX_FREIGHTERS_PER_HUB) {
            this.eventBus.emit('ui:message', {
                text: `This hub can dock only ${C.MAX_FREIGHTERS_PER_HUB} freighters`, type: 'error'
            });
            return null;
        }

        const recipe = window.RECIPES.freighter;
        if (!window.RecipeUtils.canAfford(recipe, this.gameState.getResources())) {
            this.eventBus.emit('ui:message', { text: 'Insufficient materials for a freighter', type: 'error' });
            return null;
        }
        window.RecipeUtils.spend(recipe, this.gameState, this.eventBus);

        const freighter = {
            id: `freighter_${Date.now()}_${this.freighters().length}`,
            hubId: foundry.hubId,
            foundryId: foundry.id,
            capacity: C.FREIGHTER_CAPACITY,
            cargo: {},                       // { minerals } outbound, { alloy } inbound
            position: { x: hub.x, y: hub.y },
            status: 'idle'                   // 'idle' (at hub) | 'outbound' | 'inbound'
        };
        this.freighters().push(freighter);

        this.eventBus.emit('ui:message', {
            text: `Freighter commissioned (${hubFreighters.length + 1}/${C.MAX_FREIGHTERS_PER_HUB} at hub)`, type: 'success'
        });
        this.eventBus.emit('foundry:freighterBuilt', { freighter });
        this.eventBus.emit('ui:update');
        return freighter;
    }

    upgrade(data) {
        const foundry = this.findFoundry(data.foundryId);
        if (!foundry) return false;
        const next = foundry.level + 1;
        if (next > this.constants().MAX_LEVEL) {
            this.eventBus.emit('ui:message', { text: 'Foundry at maximum level', type: 'warning' });
            return false;
        }
        const recipe = window.RECIPES.foundryLevel[next];
        if (!recipe || !window.RecipeUtils.canAfford(recipe, this.gameState.getResources())) {
            this.eventBus.emit('ui:message', { text: 'Insufficient materials for upgrade', type: 'error' });
            return false;
        }
        window.RecipeUtils.spend(recipe, this.gameState, this.eventBus);
        foundry.level = next;
        this.eventBus.emit('ui:message', { text: `Foundry forged to level ${next}`, type: 'success' });
        this.eventBus.emit('foundry:upgraded', { foundry });
        this.eventBus.emit('ui:update');
        return true;
    }

    deleteFoundry(data) {
        const index = this.foundries().findIndex(f => f.id === data.foundryId);
        if (index === -1) return false;
        const foundry = this.foundries()[index];

        // Buffers come home; half the build cost is recovered
        const resources = this.gameState.getResources();
        resources.minerals += foundry.input;
        resources.alloy = (resources.alloy || 0) + foundry.output;
        Object.entries(window.RECIPES.foundry).forEach(([key, amount]) => {
            resources[key] = (resources[key] || 0) + Math.floor(amount * 0.5);
        });

        // Its freighters return cargo and dissolve (half refund each)
        const served = this.freighters().filter(f => f.foundryId === foundry.id);
        served.forEach(fr => {
            resources.minerals += (fr.cargo.minerals || 0);
            resources.alloy += (fr.cargo.alloy || 0);
            Object.entries(window.RECIPES.freighter).forEach(([key, amount]) => {
                resources[key] = (resources[key] || 0) + Math.floor(amount * 0.5);
            });
        });
        this.gameState.foundry.freighters = this.freighters().filter(f => f.foundryId !== foundry.id);

        this.foundries().splice(index, 1);
        this.gameState.updateResources(resources, this.eventBus);
        this.eventBus.emit('ui:message', { text: 'Foundry decommissioned — buffers recovered', type: 'success' });
        this.eventBus.emit('foundry:deleted', { foundryId: data.foundryId });
        this.eventBus.emit('ui:update');
        return true;
    }

    deleteFreighter(data) {
        const index = this.freighters().findIndex(f => f.id === data.freighterId);
        if (index === -1) return false;
        const freighter = this.freighters()[index];

        const resources = this.gameState.getResources();
        resources.minerals += (freighter.cargo.minerals || 0);
        resources.alloy = (resources.alloy || 0) + (freighter.cargo.alloy || 0);
        Object.entries(window.RECIPES.freighter).forEach(([key, amount]) => {
            resources[key] = (resources[key] || 0) + Math.floor(amount * 0.5);
        });

        this.freighters().splice(index, 1);
        this.gameState.updateResources(resources, this.eventBus);
        this.eventBus.emit('ui:message', { text: 'Freighter decommissioned', type: 'success' });
        this.eventBus.emit('ui:update');
        return true;
    }

    // ----------------------------------------------------------------- tick

    /** Mineral units/min this foundry consumes while running */
    consumeRatePerMin(foundry) {
        const C = this.constants();
        // Shell bonus survives the recast: miningEfficiency speeds the forge
        const bonus = window.game?.shellSystem
            ? window.game.shellSystem.getEntityBonus('miningStations', null, 'miningEfficiency') : 0;
        return C.MINERALS_PER_MIN_BASE * foundry.level * (1 + bonus / 100);
    }

    freighterSpeed() {
        const C = this.constants();
        const bonus = window.game?.shellSystem
            ? window.game.shellSystem.getEntityBonus('miningStations', null, 'shuttleSpeed') : 0;
        return C.FREIGHTER_SPEED * (1 + bonus / 100);
    }

    update(deltaTime) {
        if (!deltaTime || deltaTime <= 0) return;
        this.foundries().forEach(f => this.updateFoundry(f, deltaTime));
        this.freighters().forEach(f => this.updateFreighter(f, deltaTime));

        // Telemetry beat for open panels (DetailsPanel live buffers)
        if (this.foundries().length > 0) {
            this.tickAccum = (this.tickAccum || 0) + deltaTime;
            if (this.tickAccum >= 400) {
                this.tickAccum = 0;
                this.eventBus.emit('foundry:tick', {});
            }
        }
    }

    updateFoundry(foundry, deltaTime) {
        const C = this.constants();
        const EPS = 1e-9;

        const want = this.consumeRatePerMin(foundry) * deltaTime / 60000;
        const outputRoom = Math.max(0, C.OUTPUT_CAP - foundry.output);
        const consumed = Math.min(want, foundry.input, outputRoom * C.CONVERT_RATIO);

        if (consumed > EPS) {
            foundry.input -= consumed;
            const forged = consumed / C.CONVERT_RATIO;
            foundry.output += forged;
            foundry.converted += forged;
            foundry.status = 'running';
        } else if (foundry.input > EPS && outputRoom <= EPS) {
            foundry.status = 'backed';   // fed but nowhere to put alloy — haul it away
        } else {
            foundry.status = 'starved';  // input ran dry — feed the machine
        }

        // One rotating interior vane, speed ∝ uptime (≈3s period while running)
        const vaneRate = foundry.status === 'running' ? 0.0021 : 0.0003;
        foundry.vaneAngle = (foundry.vaneAngle + deltaTime * vaneRate) % (Math.PI * 2);

        foundry.portGlow.in = Math.max(0, foundry.portGlow.in - deltaTime);
        foundry.portGlow.out = Math.max(0, foundry.portGlow.out - deltaTime);
    }

    updateFreighter(freighter, deltaTime) {
        const foundry = this.findFoundry(freighter.foundryId);
        const hub = this.findHub(freighter.hubId);
        if (!foundry || !hub) return;

        if (freighter.status === 'idle') {
            this.dispatchFreighter(freighter, foundry, hub);
            return;
        }

        const target = freighter.status === 'outbound'
            ? foundry.position : { x: hub.x, y: hub.y };
        const dx = target.x - freighter.position.x;
        const dy = target.y - freighter.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            const step = Math.min(this.freighterSpeed() * deltaTime / distance, 1);
            freighter.position.x += dx * step;
            freighter.position.y += dy * step;
            return;
        }

        if (freighter.status === 'outbound') {
            this.arriveAtFoundry(freighter, foundry, hub);
        } else {
            this.arriveAtHub(freighter, foundry, hub);
        }
    }

    /** At the hub: load minerals if the foundry has room, or run empty to fetch alloy */
    dispatchFreighter(freighter, foundry, hub) {
        const C = this.constants();
        const resources = this.gameState.getResources();
        const inputRoom = Math.max(0, C.INPUT_CAP - foundry.input);
        const toLoad = Math.min(freighter.capacity, inputRoom, resources.minerals || 0);

        if (toLoad >= 1) {
            resources.minerals -= toLoad;
            this.gameState.updateResources(resources, this.eventBus);
            freighter.cargo = { minerals: toLoad };
            freighter.status = 'outbound';
        } else if (foundry.output >= 1) {
            freighter.cargo = {};
            freighter.status = 'outbound'; // empty run — alloy is waiting
        }
        // else: nothing to haul either way; stay docked
    }

    arriveAtFoundry(freighter, foundry, hub) {
        const C = this.constants();

        // Unload minerals into the input port (clamped — competing freighters)
        const delivered = Math.min(freighter.cargo.minerals || 0, Math.max(0, C.INPUT_CAP - foundry.input));
        if (delivered > 0) {
            foundry.input += delivered;
            foundry.portGlow.in = 600;
            this.eventBus.emit('freighter:cargoDelivered', {
                from: { x: hub.x, y: hub.y },
                to: { x: foundry.position.x, y: foundry.position.y },
                type: 'minerals'
            });
        }
        const leftover = (freighter.cargo.minerals || 0) - delivered;

        // Take on alloy for the home leg
        const alloy = Math.min(freighter.capacity, foundry.output);
        if (alloy > 0) {
            foundry.output -= alloy;
            foundry.portGlow.out = 600;
        }

        freighter.cargo = {};
        if (leftover > 0) freighter.cargo.minerals = leftover;
        if (alloy > 0) freighter.cargo.alloy = alloy;
        freighter.status = 'inbound';
    }

    arriveAtHub(freighter, foundry, hub) {
        const resources = this.gameState.getResources();
        const alloy = freighter.cargo.alloy || 0;
        if (alloy > 0) {
            resources.alloy = (resources.alloy || 0) + alloy;
            this.eventBus.emit('freighter:cargoDelivered', {
                from: { x: foundry.position.x, y: foundry.position.y },
                to: { x: hub.x, y: hub.y },
                type: 'alloy'
            });
        }
        // Minerals that found no room at the foundry come home too
        const minerals = freighter.cargo.minerals || 0;
        if (minerals > 0) resources.minerals += minerals;
        if (alloy > 0 || minerals > 0) this.gameState.updateResources(resources, this.eventBus);

        freighter.cargo = {};
        freighter.status = 'idle';
    }

    // --------------------------------------------------------------- canvas

    /**
     * Processor grammar (VISUAL_STYLE "Material flow", step 3): a hex body
     * with one copper input port facing its hub, one alloy output port
     * opposite, and a single thin-stroke rotating vane whose speed reads as
     * uptime. Buffer fill is drawn as two half-arcs in the material colors.
     */
    render(ctx, viewOffset) {
        const C = this.constants();

        // Supply legs first, under everything
        ctx.save();
        for (const foundry of this.foundries()) {
            const hub = this.findHub(foundry.hubId);
            if (!hub) continue;
            ctx.beginPath();
            ctx.moveTo(hub.x - viewOffset.x, hub.y - viewOffset.y);
            ctx.lineTo(foundry.position.x - viewOffset.x, foundry.position.y - viewOffset.y);
            ctx.strokeStyle = window.PALETTE.LINE_SOFT;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 6]);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();

        for (const foundry of this.foundries()) {
            this.renderFoundry(ctx, viewOffset, foundry, C);
        }
        for (const freighter of this.freighters()) {
            this.renderFreighter(ctx, viewOffset, freighter);
        }
    }

    renderFoundry(ctx, viewOffset, foundry, C) {
        const x = foundry.position.x - viewOffset.x;
        const y = foundry.position.y - viewOffset.y;
        const size = 14 + foundry.level * 3;
        const running = foundry.status === 'running';

        const hub = this.findHub(foundry.hubId);
        const hubAngle = hub ? Math.atan2(hub.y - foundry.position.y, hub.x - foundry.position.x) : Math.PI;

        ctx.save();

        // Hex body — near-black glass, gold only while the forge earns it
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = hubAngle + Math.PI / 6 + i * Math.PI / 3;
            const px = x + Math.cos(a) * size;
            const py = y + Math.sin(a) * size;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = running ? 'rgba(26, 16, 48, 0.6)' : 'rgba(10, 8, 18, 0.7)';
        ctx.fill();
        ctx.strokeStyle = running ? window.PALETTE.FIRE : 'rgba(212, 175, 55, 0.35)';
        ctx.lineWidth = running ? 1.5 : 1;
        ctx.stroke();

        // The rotating vane — one thin-stroke arc pair, speed ∝ uptime
        ctx.beginPath();
        ctx.arc(x, y, size * 0.55, foundry.vaneAngle, foundry.vaneAngle + Math.PI * 0.6);
        ctx.arc(x, y, size * 0.55, foundry.vaneAngle + Math.PI, foundry.vaneAngle + Math.PI * 1.6);
        ctx.strokeStyle = running ? 'rgba(232, 163, 61, 0.85)' : 'rgba(139, 132, 163, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Input port (faces the hub) — copper, brightness = buffer + landing flash
        const inX = x + Math.cos(hubAngle) * size;
        const inY = y + Math.sin(hubAngle) * size;
        const inFill = Math.min(1, foundry.input / C.INPUT_CAP);
        const inFlash = foundry.portGlow.in > 0 ? foundry.portGlow.in / 600 : 0;
        ctx.beginPath();
        ctx.arc(inX, inY, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = window.PALETTE.MATERIALS.minerals;
        ctx.globalAlpha = 0.25 + inFill * 0.5 + inFlash * 0.25;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Output port (opposite) — alloy, pulses hard when backed up
        const outX = x - Math.cos(hubAngle) * size;
        const outY = y - Math.sin(hubAngle) * size;
        const outFill = Math.min(1, foundry.output / C.OUTPUT_CAP);
        const outFlash = foundry.portGlow.out > 0 ? foundry.portGlow.out / 600 : 0;
        const backedPulse = foundry.status === 'backed'
            ? 0.25 + 0.25 * Math.sin(foundry.vaneAngle * 8) : 0;
        ctx.beginPath();
        ctx.arc(outX, outY, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = window.PALETTE.MATERIALS.alloy;
        ctx.globalAlpha = Math.min(1, 0.25 + outFill * 0.5 + outFlash * 0.25 + backedPulse);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Buffer fill arcs: copper on the hub-facing half, alloy opposite
        if (inFill > 0.01) {
            ctx.beginPath();
            ctx.arc(x, y, size + 4, hubAngle - Math.PI * 0.4 * inFill, hubAngle + Math.PI * 0.4 * inFill);
            ctx.strokeStyle = window.PALETTE.MATERIALS.minerals;
            ctx.globalAlpha = 0.6;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        if (outFill > 0.01) {
            const oa = hubAngle + Math.PI;
            ctx.beginPath();
            ctx.arc(x, y, size + 4, oa - Math.PI * 0.4 * outFill, oa + Math.PI * 0.4 * outFill);
            ctx.strokeStyle = window.PALETTE.MATERIALS.alloy;
            ctx.globalAlpha = 0.6;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Starved: a dim copper breath asking to be fed
        if (foundry.status === 'starved') {
            const breath = 0.5 + 0.5 * Math.sin(foundry.vaneAngle * 4);
            ctx.beginPath();
            ctx.arc(x, y, size + 8 + breath * 3, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(201, 123, 74, ${0.12 + breath * 0.12})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Level pips
        for (let i = 0; i < foundry.level; i++) {
            ctx.beginPath();
            ctx.arc(x - (foundry.level - 1) * 3 + i * 6, y - size - 7, 1.4, 0, Math.PI * 2);
            ctx.fillStyle = window.PALETTE.FIRE;
            ctx.globalAlpha = 0.8;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    renderFreighter(ctx, viewOffset, freighter) {
        const x = freighter.position.x - viewOffset.x;
        const y = freighter.position.y - viewOffset.y;

        let color = window.PALETTE.MIST;                              // empty / docked
        if (freighter.cargo.minerals) color = window.PALETTE.MATERIALS.minerals;
        else if (freighter.cargo.alloy) color = window.PALETTE.MATERIALS.alloy;

        ctx.save();
        ctx.translate(x, y);

        // Heading
        const foundry = this.findFoundry(freighter.foundryId);
        const hub = this.findHub(freighter.hubId);
        if (foundry && hub) {
            const target = freighter.status === 'outbound' ? foundry.position : { x: hub.x, y: hub.y };
            ctx.rotate(Math.atan2(target.y - freighter.position.y, target.x - freighter.position.x));
        }

        // Long diamond — reads heavier than a probe
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-3, 3.5);
        ctx.lineTo(-1.5, 0);
        ctx.lineTo(-3, -3.5);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = freighter.status === 'idle' ? 0.5 : 0.95;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();
    }
}

window.FoundrySystem = FoundrySystem;
