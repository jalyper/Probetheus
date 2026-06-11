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

    /** A slow data-blue arc around the home hub while the network thinks. */
    render(ctx, viewOffset) {
        const state = this.getState();
        if (!state.built) return;
        const hub = this.homeHub();
        if (!hub) return;

        const x = hub.x - viewOffset.x;
        const y = hub.y - viewOffset.y;
        const color = window.PALETTE.MATERIALS.data;

        ctx.save();
        if (state.active) {
            ctx.beginPath();
            ctx.arc(x, y, 26, this.dishAngle, this.dishAngle + Math.PI * 0.6);
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            // Idle dish: a faint full ring — built but listening to nothing
            ctx.beginPath();
            ctx.arc(x, y, 26, 0, Math.PI * 2);
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.18;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------ ui

    bindUI() {
        const btn = document.getElementById('uplinkBtn');
        if (btn) btn.addEventListener('click', () => this.togglePanel());
        const panel = document.getElementById('uplinkPanel');
        if (panel) {
            panel.addEventListener('click', (e) => {
                const action = e.target.dataset && e.target.dataset.uplinkAction;
                if (!action) return;
                if (action === 'close') this.togglePanel(false);
                if (action === 'build') { this.build(); this.renderPanel(); }
                if (action === 'upgrade') { this.upgrade(); this.renderPanel(); }
                if (action === 'decode') { this.startDecode(e.target.dataset.protocol); this.renderPanel(); }
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
                <button class="control-btn uplink-build-btn" data-uplink-action="build"
                    ${missing.length ? 'disabled' : ''}>
                    Construct Uplink — ${window.RecipeUtils.format(recipe)}
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

                let control;
                if (decoded) control = `<span class="uplink-state uplink-state-done">DECODED</span>`;
                else if (active) control = `<span class="uplink-state uplink-state-active">DECODING</span>`;
                else control = `<button class="control-btn uplink-decode-btn" data-uplink-action="decode"
                        data-protocol="${id}" ${canPayCatalysts ? '' : 'disabled'}>Decode</button>`;

                return `
                <div class="uplink-protocol ${decoded ? 'is-decoded' : ''} ${active ? 'is-active' : ''}">
                    <div class="uplink-protocol-head">
                        <span class="uplink-protocol-name">${proto.name}</span>
                        ${control}
                    </div>
                    <div class="uplink-protocol-lore">${proto.lore}</div>
                    <div class="uplink-protocol-effect">${proto.effect}</div>
                    <div class="uplink-protocol-cost">${proto.data} data streamed${this.catalystLabel(proto.catalysts)}</div>
                    ${decoded ? '' : `<div class="uplink-bar"><div class="uplink-bar-fill" style="width:${pct}%"></div></div>`}
                </div>`;
            }).join('');

            const next = state.level + 1;
            const upgradeRecipe = window.RECIPES.uplinkLevel[next];
            body = `
                <div class="uplink-stats">
                    <span><label>ARRAY</label> Level ${state.level}</span>
                    <span><label>DECODE</label> ${this.decodeRatePerMin().toFixed(0)} data/min</span>
                    <span><label>RESERVE</label> ${Math.floor(resources.data)} data</span>
                </div>
                ${upgradeRecipe ? `
                <button class="control-btn uplink-upgrade-btn" data-uplink-action="upgrade"
                    ${window.RecipeUtils.canAfford(upgradeRecipe, resources) ? '' : 'disabled'}>
                    Upgrade Array — ${window.RecipeUtils.format(upgradeRecipe)}
                </button>` : ''}
                <div class="uplink-protocols">${rows}</div>`;
        }

        panel.innerHTML = `
            <div class="uplink-header">
                <span class="uplink-title">UPLINK</span>
                <button class="uplink-close" data-uplink-action="close">×</button>
            </div>
            ${body}`;
    }
}

window.UplinkSystem = UplinkSystem;
