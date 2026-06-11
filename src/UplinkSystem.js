/**
 * UplinkSystem — research as a flow problem (REBUILD.md §1).
 *
 * Replaces the Research Lab. There is no tree, no points, no separate
 * screen. The player CRAFTS an Uplink at the home hub (factory-first,
 * RECIPES.uplink), picks ONE protocol from window.PROTOCOLS, and the
 * Uplink streams stored data into it at a capped rate
 * (UPLINK.DECODE_PER_MIN_BASE × level). Progress is data actually
 * consumed — a starved data network stalls research; a humming one
 * finishes it fast. Deep protocols also demand catalysts (artifacts /
 * exotic minerals), consumed once when decoding begins.
 *
 * State lives in gameState.uplink:
 *   { built, level, active, progress: {id: streamed}, paid: Set, decoded: Set }
 *
 * Per-protocol progress persists across switches — abandoning a decode
 * never loses work (calm surface; the game never undoes your effort).
 *
 * Emits:  uplink:built, uplink:decodeStarted {id}, uplink:decoded {id}
 * Runs on sim-time like FlowBeadSystem: paused game = frozen decode.
 */
class UplinkSystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;

        this.dishAngle = 0;          // rotating arc on the home hub while decoding
        this.panelOpen = false;
        this.panelRefreshMs = 0;

        this.bindUI();
    }

    // ---------------------------------------------------------------- state

    getState() {
        return this.gameState.uplink;
    }

    decodeRatePerMin() {
        const base = window.GAME_CONSTANTS.UPLINK.DECODE_PER_MIN_BASE * this.getState().level;
        // Shell researchSpeed bonuses now accelerate decoding
        const bonus = window.game?.shellSystem
            ? window.game.shellSystem.getEntityBonus('hubs', null, 'researchSpeed') : 0;
        return base * (1 + bonus / 100);
    }

    homeHub() {
        return this.gameState.entities.reconHubs[0] || null;
    }

    /** Construct the Uplink from RECIPES.uplink. Returns true on success. */
    build() {
        const state = this.getState();
        if (state.built) return false;
        const recipe = window.RECIPES.uplink;
        if (!window.RecipeUtils.canAfford(recipe, this.gameState.getResources())) return false;
        window.RecipeUtils.spend(recipe, this.gameState, this.eventBus);
        state.built = true;
        this.eventBus.emit('uplink:built', {});
        this.eventBus.emit('ui:message', { text: 'Uplink constructed — select a protocol to decode', type: 'success' });
        return true;
    }

    /** Upgrade decode rate. Returns true on success. */
    upgrade() {
        const state = this.getState();
        const next = state.level + 1;
        if (!state.built || next > window.GAME_CONSTANTS.UPLINK.MAX_LEVEL) return false;
        const recipe = window.RECIPES.uplinkLevel[next];
        if (!recipe || !window.RecipeUtils.canAfford(recipe, this.gameState.getResources())) return false;
        window.RecipeUtils.spend(recipe, this.gameState, this.eventBus);
        state.level = next;
        this.eventBus.emit('uplink:upgraded', { level: next });
        return true;
    }

    /**
     * Select a protocol to decode. Catalysts are charged once, on first
     * start; switching targets later neither refunds nor re-charges them.
     */
    startDecode(id) {
        const state = this.getState();
        const proto = window.PROTOCOLS[id];
        if (!state.built || !proto || state.decoded.has(id) || state.active === id) return false;

        if (proto.catalysts && !state.paid.has(id)) {
            if (!window.RecipeUtils.canAfford(proto.catalysts, this.gameState.getResources())) return false;
            window.RecipeUtils.spend(proto.catalysts, this.gameState, this.eventBus);
            state.paid.add(id);
        }

        state.active = id;
        this.eventBus.emit('uplink:decodeStarted', { id });
        return true;
    }

    /** Sim-time tick: stream stored data into the active protocol. */
    update(deltaTime) {
        const state = this.getState();

        if (state.active && deltaTime > 0) {
            const proto = window.PROTOCOLS[state.active];
            const streamed = state.progress[state.active] || 0;
            const want = this.decodeRatePerMin() * deltaTime / 60000;
            const consumed = Math.min(want, this.gameState.resources.data, proto.data - streamed);

            if (consumed > 0) {
                this.gameState.resources.data -= consumed;
                state.progress[state.active] = streamed + consumed;
                this.dishAngle += deltaTime * 0.0012;

                if (state.progress[state.active] >= proto.data - 1e-9) {
                    const id = state.active;
                    state.decoded.add(id);
                    state.active = null;
                    this.eventBus.emit('uplink:decoded', { id });
                    this.eventBus.emit('ui:message', { text: `Protocol decoded: ${proto.name}`, type: 'success' });
                    this.eventBus.emit('ui:update');
                }
            }
        }

        // Keep the panel honest while it's open (rates, reserves, progress)
        if (this.panelOpen) {
            this.panelRefreshMs += Math.max(deltaTime, 16);
            if (this.panelRefreshMs > 400) {
                this.panelRefreshMs = 0;
                this.renderPanel();
            }
        }
    }

    // --------------------------------------------------------------- canvas

    /**
     * The Uplink dish (handoff §8): a small gold dish bowl with a bright
     * feed dot orbiting the home hub, rotation speed ∝ decoding, plus a
     * faint orbit guide. Streaming progress adds a data-blue arc.
     */
    render(ctx, viewOffset) {
        const state = this.getState();
        if (!state.built) return;
        const hub = this.homeHub();
        if (!hub) return;

        const x = hub.x - viewOffset.x;
        const y = hub.y - viewOffset.y;
        const dataColor = window.PALETTE.MATERIALS.data;
        const orbit = 26;

        // Idle dish drifts slowly; an active decode spins it up
        if (!state.active) this.dishAngle += 0.0035;
        const rot = this.dishAngle;
        const cx = x + Math.cos(rot) * orbit;
        const cy = y + Math.sin(rot) * orbit;

        ctx.save();

        // faint orbit guide
        ctx.beginPath();
        ctx.arc(x, y, orbit, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.07)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // data-blue stream arc while decoding
        if (state.active) {
            ctx.beginPath();
            ctx.arc(x, y, orbit, rot - Math.PI * 0.5, rot - Math.PI * 0.1);
            ctx.strokeStyle = dataColor;
            ctx.globalAlpha = 0.55;
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // dish bowl + bright feed dot
        ctx.translate(cx, cy);
        ctx.rotate(rot + Math.PI / 2);
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 6, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = state.active ? window.PALETTE.FIRE_BRIGHT : window.PALETTE.FIRE;
        ctx.fill();

        ctx.restore();
    }

    // ------------------------------------------------------------------ ui

    bindUI() {
        const btn = document.getElementById('uplinkBtn');
        if (btn) btn.addEventListener('click', () => this.togglePanel());
        const panel = document.getElementById('uplinkPanel');
        if (panel) {
            panel.addEventListener('click', (e) => {
                const target = e.target.closest('[data-uplink-action]');
                if (!target) return;
                const action = target.dataset.uplinkAction;
                if (action === 'close') this.togglePanel(false);
                if (action === 'build') { this.build(); this.renderPanel(); }
                if (action === 'upgrade') { this.upgrade(); this.renderPanel(); }
                if (action === 'decode') { this.startDecode(target.dataset.protocol); this.renderPanel(); }
            });
        }
    }

    togglePanel(force) {
        const panel = document.getElementById('uplinkPanel');
        if (!panel) return;
        this.panelOpen = force !== undefined ? force : !this.panelOpen;
        panel.style.display = this.panelOpen ? 'block' : 'none';
        if (this.panelOpen) this.renderPanel();
    }

    catalystLabel(catalysts) {
        if (!catalysts) return '';
        return ' + ' + window.RecipeUtils.format(catalysts);
    }

    renderPanel() {
        const panel = document.getElementById('uplinkPanel');
        if (!panel) return;
        const state = this.getState();
        const resources = this.gameState.getResources();

        let body;
        if (!state.built) {
            const recipe = window.RECIPES.uplink;
            const missing = window.RecipeUtils.missingFor(recipe, resources);
            body = `
                <p class="uplink-intro">Everything your probes can learn is out there, scrambled in
                the data they haul home. Build an Uplink and feed it: decoding speed is your data
                network's throughput.</p>
                <button class="cta uplink-build-btn" data-uplink-action="build"
                    ${missing.length ? 'disabled' : ''}>
                    Construct Uplink · ${window.RecipeUtils.format(recipe)}
                </button>
                ${missing.length ? `<div class="uplink-shortfall">Need ${missing.map(m => `${m.need - Math.floor(m.have)} more ${m.key}`).join(', ')}</div>` : ''}`;
        } else {
            const rows = Object.entries(window.PROTOCOLS).map(([id, proto]) => {
                const streamed = state.progress[id] || 0;
                const pct = Math.min(100, streamed / proto.data * 100);
                const decoded = state.decoded.has(id);
                const active = state.active === id;
                const canPayCatalysts = !proto.catalysts || state.paid.has(id) ||
                    window.RecipeUtils.canAfford(proto.catalysts, resources);

                let stateTag, foot;
                if (decoded) {
                    stateTag = `<span class="uplink-state uplink-state-done">Decoded</span>`;
                    foot = `<span style="font-size:10px;color:var(--mist);font-family:var(--font-data)">${proto.data} data streamed</span>`;
                } else if (active) {
                    stateTag = `<span class="uplink-state uplink-state-active">Decoding</span>`;
                    foot = `<div class="uplink-bar"><div class="uplink-bar-fill" style="width:${pct}%"></div></div>` +
                           `<span class="uplink-pct">${Math.round(pct)}%</span>`;
                } else {
                    stateTag = `<span class="uplink-state uplink-state-available">Available</span>`;
                    foot = `<div class="uplink-bar" style="${streamed > 0 ? '' : 'visibility:hidden;'}"><div class="uplink-bar-fill" style="width:${pct}%;box-shadow:none;"></div></div>` +
                           `<button class="uplink-decode-btn" data-uplink-action="decode"
                            data-protocol="${id}" ${canPayCatalysts ? '' : 'disabled'}
                            title="${canPayCatalysts ? 'Stream stored data into this protocol' : 'Insufficient catalysts'}">Decode</button>`;
                }

                return `
                <div class="uplink-protocol ${decoded ? 'is-decoded' : ''} ${active ? 'is-active' : ''}">
                    <div class="uplink-protocol-head">
                        <span class="uplink-protocol-name">${proto.name}</span>
                        ${stateTag}
                    </div>
                    <div class="uplink-protocol-lore">${proto.lore}</div>
                    <div class="uplink-protocol-effect">${proto.effect}</div>
                    <div class="uplink-protocol-cost"><span class="c-data">${proto.data} data streamed</span>${this.catalystLabel(proto.catalysts)}</div>
                    <div class="uplink-protocol-foot">${foot}</div>
                </div>`;
            }).join('');

            const next = state.level + 1;
            const upgradeRecipe = window.RECIPES.uplinkLevel[next];
            body = `
                <div class="uplink-stats">
                    <div class="uplink-stat"><div class="k">Array</div><div class="v">Level ${state.level}</div></div>
                    <div class="uplink-stat"><div class="k">Decode Rate</div><div class="v">${this.decodeRatePerMin().toFixed(0)} u/min</div></div>
                    <div class="uplink-stat"><div class="k">Data in Store</div><div class="v data">${Math.floor(resources.data)}</div></div>
                </div>
                ${upgradeRecipe ? `
                <button class="cta uplink-upgrade-btn" data-uplink-action="upgrade"
                    ${window.RecipeUtils.canAfford(upgradeRecipe, resources) ? '' : 'disabled'}>
                    Upgrade Array · ${window.RecipeUtils.format(upgradeRecipe)}
                </button>` : ''}
                <div class="uplink-protocols">${rows}</div>`;
        }

        panel.innerHTML = `
            <div class="uplink-header">
                <span class="title">${window.icon('uplink', { size: 16 })}<span class="uplink-title">UPLINK</span></span>
                <button class="uplink-close" data-uplink-action="close">${window.icon('close', { size: 14 })}</button>
            </div>
            ${body}`;
    }
}

window.UplinkSystem = UplinkSystem;
