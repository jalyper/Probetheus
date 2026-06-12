/**
 * Details Panel Manager
 * Unified system for displaying details about any clicked entity
 */
class DetailsPanel {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.currentEntity = null;
        this.currentEntityType = null;

        // Cache DOM elements (with error checking)
        this.panel = document.getElementById('detailsPanel');
        this.icon = document.getElementById('detailsIcon');
        this.title = document.getElementById('detailsTitle');
        this.content = document.getElementById('detailsContent');
        this.closeBtn = document.getElementById('closeDetailsBtn');

        // Check if elements exist
        if (!this.panel || !this.icon || !this.title || !this.content) {
            console.warn('DetailsPanel: Some DOM elements not found during initialization');
            return;
        }

        // Set up event listeners
        this.setupEventListeners();

        // Listen for entity selection events
        this.eventBus.on('entity:selected', this.showEntityDetails.bind(this));
        this.eventBus.on('details:close', this.hide.bind(this));
        
        // Listen for resource changes to update button states
        this.eventBus.on('ui:update', () => {
            if (this.currentEntity) {
                if (this.currentEntityType === 'hub') {
                    this.updateButtonStates(this.currentEntity);
                } else if (this.currentEntityType === 'foundry') {
                    this.updateFoundryButtonStates(this.currentEntity);
                }
            }
        });

        // Live foundry telemetry — keep buffers/status honest while watched
        this.eventBus.on('foundry:tick', () => {
            if (this.currentEntityType === 'foundry' && this.currentEntity &&
                this.panel.style.display !== 'none') {
                this.refreshFoundryStats(this.currentEntity);
            }
        });
    }

    /**
     * IconKit glyph name for an equipment type/id (VISUAL_STYLE.md — no emoji)
     */
    getEquipmentGlyph(type) {
        const glyphs = {
            'mineral_collector': 'deposit-mineral',
            'data_collector': 'deposit-data',
            'artifact_collector': 'deposit-artifact',
            'universal_collector': 'slot'
        };
        return glyphs[type] || 'slot';
    }

    setupEventListeners() {
        // Close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // ESC key to close
            if (e.key === 'Escape' && this.panel.style.display !== 'none') {
                this.hide();
                return;
            }
            
            // Hub panel shortcuts - only when hub panel is visible and a hub is selected
            if (this.panel.style.display !== 'none' && this.currentEntityType === 'hub') {
                const key = e.key.toLowerCase();
                
                switch (key) {
                    case 'd':
                        e.preventDefault();
                        this.triggerButtonClick('deployFromHub');
                        break;
                    case 'p':
                        e.preventDefault();
                        this.triggerButtonClick('buildProbeForHub');
                        break;
                }
            }
        });
    }
    
    /**
     * Helper method to trigger button clicks programmatically
     */
    triggerButtonClick(buttonId) {
        const button = document.getElementById(buttonId);
        if (button && !button.disabled && !button.classList.contains('insufficient')) {
            // Add brief visual feedback
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = '';
            }, 100);
            
            // Trigger the click
            button.click();
        }
    }
    
    /**
     * Show details for a selected entity
     */
    showEntityDetails(data) {
        console.log('DetailsPanel.showEntityDetails called with:', data);
        
        if (!this.panel || !this.icon || !this.title || !this.content) {
            console.error('DetailsPanel: Cannot show details, DOM elements not initialized');
            console.log('Panel exists:', !!this.panel);
            console.log('Icon exists:', !!this.icon);
            console.log('Title exists:', !!this.title);
            console.log('Content exists:', !!this.content);
            return;
        }
        
        const { entity, type } = data;
        this.currentEntity = entity;
        this.currentEntityType = type;
        
        console.log('DetailsPanel: Showing', type, 'details for entity:', entity.id || entity);

        // Probes are handled by UIManager's probeDetailPanel, skip DetailsPanel for probes
        if (type === 'probe') {
            console.log('DetailsPanel: Probes handled by probeDetailPanel, skipping');
            return;
        }

        // Update panel based on entity type
        switch(type) {
            case 'hub':
                this.showHubDetails(entity);
                break;
            case 'foundry':
                this.showFoundryDetails(entity);
                break;
            case 'signal':
                this.showSignalDetails(entity);
                break;
            default:
                console.warn('Unknown entity type:', type);
                return;
        }

        // Show the panel
        console.log('DetailsPanel: Setting display to block');
        this.panel.style.display = 'block';
    }
    
    /**
     * Show hub details
     */
    showHubDetails(hub) {
        this.icon.innerHTML = `<span style="color: var(--fire); display: flex;">${window.icon('hub', { size: 18 })}</span>`;
        this.title.textContent = 'Recon Hub · Ops';
        this.title.style.color = 'var(--fire)';

        const maxProbes = hub.maxProbes || 5;

        // Count available (ready) probes - built but not currently patrolling
        const availableProbes = this.getAvailableProbeCount(hub);
        const activeProbes = this.getActiveProbeCount(hub) - availableProbes;

        // Hub-owned logistics (handoff §2 stat grid)
        const isHomeHub = this.gameState.entities.reconHubs[0] === hub;
        const hubFoundries = this.gameState.foundry?.foundries?.filter(f => f.hubId === hub.id) || [];
        const hubFreighters = this.gameState.foundry?.freighters?.filter(f => f.hubId === hub.id) || [];

        // Intake Bay
        const intakeLevel = hub.intakeLevel || 1;
        const maxIntake = window.GAME_CONSTANTS.HUB.MAX_INTAKE_LEVEL;
        const intakeRate = window.GAME_CONSTANTS.HUB.INTAKE_PER_MIN_BASE * intakeLevel;
        const nextIntakeRecipe = intakeLevel < maxIntake ? window.RECIPES.intakeBay[intakeLevel + 1] : null;

        // Get shell information for equipped shell
        const equippedShellId = this.gameState.cosmetics?.equippedShells?.hubs || 'default';
        const shell = window.SHELL_CATALOG?.hubs?.[equippedShellId] || null;
        const shellColor = shell?.visual?.color || 'var(--violet)';

        this.content.innerHTML = `
            <div class="ho-status">
                <span class="ho-dot"></span>
                <span class="t">Online</span>
                <span class="m">${isHomeHub ? 'home hub' : (hub.id || 'hub')}</span>
            </div>

            <div class="ho-grid">
                <div class="ho-cell"><span class="k">Ready Probes</span><span class="v">${availableProbes} / ${maxProbes}</span></div>
                <div class="ho-cell"><span class="k">Active Probes</span><span class="v">${activeProbes}</span></div>
                <div class="ho-cell"><span class="k">Foundries</span><span class="v">${hubFoundries.length}</span></div>
                <div class="ho-cell"><span class="k">Freighters</span><span class="v">${hubFreighters.length}</span></div>
            </div>

            <div class="ho-block">
                <div class="row">
                    <span class="name">${window.icon('foundry', { size: 15 })}Intake Bay</span>
                    <span class="lvl">Level ${intakeLevel}</span>
                </div>
                <div class="ho-rate">${intakeRate.toFixed(1)} <span class="u">deliveries / min</span></div>
                <div class="cap-bar"><div class="cap-fill" style="width: ${Math.round(intakeLevel / maxIntake * 100)}%"></div></div>
                ${nextIntakeRecipe ? `
                <button id="upgradeIntakeBtn" class="cta">
                    ${window.icon('upgrade', { size: 14 })}Upgrade to Level ${intakeLevel + 1} · ${window.RecipeUtils.format(nextIntakeRecipe)}
                </button>
                ` : `
                <button class="cta disabled" disabled>${window.icon('check', { size: 14 })}Intake Bay at maximum</button>
                `}
            </div>

            <div class="ho-section-lbl">Operations</div>
            <div class="ho-actions">
                <button id="deployFromHub" class="tbtn">
                    ${window.icon('probe', { size: 16 })}<span>Deploy Probe</span><span class="key">D</span>
                </button>
                <button id="buildProbeForHub" class="tbtn">
                    ${window.icon('plus', { size: 16 })}<span>Build Probe · 25 M</span><span class="key">P</span>
                </button>
                ${this.gameState.hasProtocol('exotic_synthesis') ? `
                <button id="synthesizeBtn" class="tbtn">
                    ${window.icon('spark', { size: 16 })}<span>Synthesize Probethium (5 Exotic)</span>
                </button>
                ` : ''}
            </div>

            <div class="ho-foot">
                <div class="shell-chip" style="border-color: ${shellColor};">
                    <span style="color: ${shellColor}; display: flex;">${window.icon('hub', { size: 16 })}</span>
                </div>
                <div class="sh-txt" id="hubShellIndicator" style="cursor: default;">
                    <span class="k">Equipped Shell</span>
                    <span class="v">${shell?.name || 'Default'}</span>
                </div>
            </div>
        `;

        // Add button listeners
        this.setupHubButtons(hub);

        // Attach tooltip handlers for shell indicator if shell has bonuses
        if (shell && shell.bonuses && Object.keys(shell.bonuses).length > 0) {
            const indicator = document.getElementById('hubShellIndicator');
            if (indicator && window.game?.uiManager?.attachTooltipHandlers) {
                window.game.uiManager.attachTooltipHandlers(indicator, shell);
            }
        }
    }
    
    /**
     * Show Foundry details (REBUILD.md §2) — the rate-matching readout:
     * input buffer (copper), output buffer (alloy), and a status the player
     * can act on. Freighters are commissioned from here.
     */
    showFoundryDetails(foundry) {
        this.icon.innerHTML = `<span style="color: var(--fire); display: flex;">${window.icon('foundry', { size: 18 })}</span>`;
        this.title.textContent = 'Foundry';
        this.title.style.color = 'var(--fire)';

        const C = window.GAME_CONSTANTS.FOUNDRY;
        const foundrySystem = window.game?.foundrySystem;
        const ratePerMin = foundrySystem ? foundrySystem.consumeRatePerMin(foundry) : C.MINERALS_PER_MIN_BASE * foundry.level;

        const freighters = this.gameState.foundry?.freighters?.filter(f => f.foundryId === foundry.id) || [];
        const freighterRows = freighters.map((f, i) => {
            const load = f.cargo.minerals ? `${Math.round(f.cargo.minerals)} minerals out`
                : f.cargo.alloy ? `${f.cargo.alloy.toFixed(1)} alloy home`
                : f.status === 'idle' ? 'docked' : 'running empty';
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0;">
                    <span style="color: var(--mist); font-size: 10px;">Freighter ${i + 1} · ${load}</span>
                    <button class="linkbtn fd-del-freighter" data-freighter-id="${f.id}" style="font-size: 9px;">Decommission</button>
                </div>`;
        }).join('');

        // Shell (cosmetics keep the legacy 'miningStations' key)
        const equippedShellId = this.gameState.cosmetics?.equippedShells?.miningStations || 'default';
        const shell = window.SHELL_CATALOG?.miningStations?.[equippedShellId] || null;
        const shellColor = shell?.visual?.color || '#D4AF37';

        const nextLevel = foundry.level + 1;
        const upgradeRecipe = nextLevel <= C.MAX_LEVEL ? window.RECIPES.foundryLevel[nextLevel] : null;

        this.content.innerHTML = `
            <div style="background: var(--panel); border: 1px solid var(--line-soft); border-radius: 4px; padding: 10px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                    <div style="color: var(--signal); font-size: 14px; letter-spacing: 0.08em;">Foundry · Level ${foundry.level}</div>
                    <span id="foundryStatusTag"></span>
                </div>
                <div style="color: var(--mist); font-size: 11px; line-height: 1.6;">
                    <div>Converts <span style="color: var(--mat-min, #C97B4A);">${ratePerMin.toFixed(0)} minerals/min</span>
                        into <span style="color: #E8A33D;">${(ratePerMin / C.CONVERT_RATIO).toFixed(1)} alloy/min</span></div>
                    <div>Lifetime forged: <span id="foundryForged" style="color: var(--signal); font-family: var(--font-data);">${foundry.converted.toFixed(1)}</span> alloy</div>
                </div>
            </div>

            <div style="background: var(--panel); border: 1px solid var(--line-soft); border-radius: 4px; padding: 10px; margin-bottom: 12px;">
                <div style="color: var(--mist); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px;">Buffers</div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--mist); margin-bottom: 3px;">
                    <span>Minerals in</span><span id="foundryInputVal" style="font-family: var(--font-data);">${Math.round(foundry.input)} / ${C.INPUT_CAP}</span>
                </div>
                <div class="cap-bar"><div id="foundryInputBar" class="cap-fill" style="width: ${Math.round(foundry.input / C.INPUT_CAP * 100)}%; background: #C97B4A;"></div></div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--mist); margin: 8px 0 3px;">
                    <span>Alloy out</span><span id="foundryOutputVal" style="font-family: var(--font-data);">${foundry.output.toFixed(1)} / ${C.OUTPUT_CAP}</span>
                </div>
                <div class="cap-bar"><div id="foundryOutputBar" class="cap-fill" style="width: ${Math.round(foundry.output / C.OUTPUT_CAP * 100)}%; background: #E8A33D;"></div></div>
            </div>

            <div style="background: var(--panel); border: 1px solid var(--line-soft); border-radius: 4px; padding: 10px; margin-bottom: 12px;">
                <div style="color: var(--mist); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px;">Freighters · ${freighters.length}/${C.MAX_FREIGHTERS_PER_HUB}</div>
                ${freighterRows || '<div style="color: var(--mist); font-size: 10px;">None — this Foundry is unsupplied.</div>'}
                <button id="commissionFreighterBtn" class="cta" style="margin-top: 8px;">
                    ${window.icon('shuttle', { size: 14 })}Commission Freighter · ${window.RecipeUtils.format(window.RECIPES.freighter)}
                </button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px;">
                ${upgradeRecipe ? `
                <button id="upgradeFoundryBtn" class="cta">
                    ${window.icon('upgrade', { size: 14 })}Upgrade to Level ${nextLevel} · ${window.RecipeUtils.format(upgradeRecipe)}
                </button>` : `
                <button class="cta disabled" disabled>${window.icon('check', { size: 14 })}Foundry at maximum</button>`}
                <button id="deleteFoundryBtn" class="linkbtn" style="color: var(--danger);">Decommission Foundry</button>
            </div>

            <div style="background: var(--panel); border: 1px solid var(--line-soft); border-radius: 4px; padding: 10px; margin-top: 12px;">
                <div style="color: var(--mist); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px;">Equipped Shell</div>
                <div id="stationShellIndicator" style="display: flex; align-items: center; gap: 8px; cursor: default;">
                    <div style="width: 24px; height: 24px; border-radius: 4px; background: ${shellColor}; border: 1px solid var(--line-soft);"></div>
                    <div>
                        <div style="color: ${shellColor}; font-size: 11px;">${shell?.name || 'Default'}</div>
                        <div style="color: var(--mist); font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em;">${shell?.rarity || 'standard'}</div>
                    </div>
                </div>
            </div>

            <div id="foundryHint" style="color: var(--mist); font-size: 10px; margin-top: 8px; line-height: 1.4;"></div>
        `;

        this.setupFoundryButtons(foundry);
        this.refreshFoundryStats(foundry);
        this.updateFoundryButtonStates(foundry);

        if (shell && shell.bonuses && Object.keys(shell.bonuses).length > 0) {
            const indicator = document.getElementById('stationShellIndicator');
            if (indicator && window.game?.uiManager?.attachTooltipHandlers) {
                window.game.uiManager.attachTooltipHandlers(indicator, shell);
            }
        }
    }

    /**
     * Light DOM refresh for the live foundry numbers (no innerHTML rebuild,
     * so buttons keep their hover/focus state)
     */
    refreshFoundryStats(foundry) {
        const C = window.GAME_CONSTANTS.FOUNDRY;

        const tags = {
            running: '<span style="color: var(--fire); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;">Running</span>',
            starved: '<span style="color: #C97B4A; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;">Starved</span>',
            backed: '<span style="color: #E8A33D; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;">Backed Up</span>'
        };
        const hints = {
            running: 'The forge is rate-matched: minerals in, alloy out.',
            starved: 'Input ran dry — commission freighters or route more minerals to its hub.',
            backed: 'Alloy has nowhere to go — freighters must haul the output away.'
        };

        const set = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };
        set('foundryStatusTag', el => { el.innerHTML = tags[foundry.status] || ''; });
        set('foundryHint', el => { el.textContent = hints[foundry.status] || ''; });
        set('foundryForged', el => { el.textContent = foundry.converted.toFixed(1); });
        set('foundryInputVal', el => { el.textContent = `${Math.round(foundry.input)} / ${C.INPUT_CAP}`; });
        set('foundryOutputVal', el => { el.textContent = `${foundry.output.toFixed(1)} / ${C.OUTPUT_CAP}`; });
        set('foundryInputBar', el => { el.style.width = `${Math.round(foundry.input / C.INPUT_CAP * 100)}%`; });
        set('foundryOutputBar', el => { el.style.width = `${Math.round(foundry.output / C.OUTPUT_CAP * 100)}%`; });
    }
    
    /**
     * Show probe details
     */
    showProbeDetails(probe) {
        this.icon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24">
                <!-- Probe Body (circular center) -->
                <circle cx="12" cy="12" r="4.5" fill="#E8E4F0" stroke="#E8E4F0" stroke-width="0.8"/>
                <!-- Wings (extending perpendicular) -->
                <rect x="11" y="3" width="2" height="9" fill="rgba(232,228,240,0.7)" stroke="#E8E4F0" stroke-width="0.8"/>
                <rect x="11" y="18" width="2" height="3" fill="rgba(232,228,240,0.7)" stroke="#E8E4F0" stroke-width="0.8"/>
                <!-- Front (triangular nose) -->
                <polygon points="16.5,12 21,9 21,15" fill="#E8E4F0"/>
                <!-- Antennas (angled lines) -->
                <line x1="7.5" y1="10.5" x2="3" y2="7.5" stroke="rgba(232,228,240,0.7)" stroke-width="1.5"/>
                <line x1="7.5" y1="13.5" x2="3" y2="16.5" stroke="rgba(232,228,240,0.7)" stroke-width="1.5"/>
            </svg>
        `;
        this.title.textContent = `Probe ${probe.id}`;
        this.title.style.color = 'var(--fire)';

        const status = probe.status || 'Unknown';
        const statusColors = {
            'ready': 'var(--fire)',
            'exploring': 'var(--signal)',
            'returning': 'var(--mist)',
            'damaged': 'var(--danger)'
        };

        this.content.innerHTML = `
            <div style="background: var(--panel); border: 1px solid var(--line-soft); border-radius: 4px; padding: 10px; margin-bottom: 12px;">
                <div style="color: var(--mist); font-size: 12px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px;">Probe Status</div>
                <div style="color: var(--mist); font-size: 12px; line-height: 1.6;">
                    <div>Status: <span style="color: ${statusColors[status] || 'var(--signal)'}">${status}</span></div>
                    <div>Position: (${Math.round(probe.x)}, ${Math.round(probe.y)})</div>
                    <div>Speed: ${probe.speed || 1}</div>
                    <div>Patrol: ${probe.patrol ? 'Enabled' : 'Disabled'}</div>
                </div>
            </div>

            <div style="border-top: 1px solid var(--line-soft); padding-top: 12px; margin-bottom: 12px;">
                <label style="color: var(--mist); font-size: 12px; display: flex; align-items: center; cursor: pointer; margin-bottom: 8px;">
                    <input type="checkbox" id="patrolModeCheckbox" style="margin-right: 8px; cursor: pointer;" ${probe.patrol ? 'checked' : ''}>
                    <span>Patrol Mode (Loop Route)</span>
                </label>
                <label style="color: var(--mist); font-size: 12px; display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="cameraLockCheckbox" style="margin-right: 8px; cursor: pointer;">
                    <span>Lock Camera to Probe</span>
                </label>
            </div>
            
            ${this.renderEquipmentSection(probe)}
            ${this.renderCargoSection(probe)}
            ${this.renderSkinSelector(probe)}
        `;

        // Add probe control listeners
        this.setupProbeButtons(probe);
        this.setupSkinSelectors(probe);
        this.setupEquipmentButtons(probe);
    }
    
    /**
     * Update button states based on resource availability
     */
    updateButtonStates(hub) {
        const resources = this.gameState.getResources();
        
        // Deploy Probe button (needs at least one available probe)
        const deployBtn = document.getElementById('deployFromHub');
        if (deployBtn) {
            const availableProbes = this.getAvailableProbeCount(hub);
            const hasAvailableProbes = availableProbes > 0;
            
            deployBtn.classList.toggle('insufficient', !hasAvailableProbes);
            deployBtn.disabled = !hasAvailableProbes;
            
            // Update button text to show count
            const btnText = deployBtn.querySelector('span') || deployBtn;
            if (hasAvailableProbes) {
                deployBtn.title = `Deploy one of ${availableProbes} available probe(s)`;
            } else {
                deployBtn.title = 'No probes available - build a probe first!';
            }
        }
        
        // Build Probe button (25 minerals)
        const buildProbeBtn = document.getElementById('buildProbeForHub');
        if (buildProbeBtn) {
            const canAfford = resources.minerals >= 25;
            const atCapacity = this.getActiveProbeCount(hub) >= hub.maxProbes;
            
            buildProbeBtn.classList.toggle('resource-button', true);
            buildProbeBtn.classList.toggle('insufficient', !canAfford || atCapacity);
            buildProbeBtn.disabled = !canAfford || atCapacity;
        }
        
        // Synthesize Probethium button (5 exotic minerals)
        const synthesizeBtn = document.getElementById('synthesizeBtn');
        if (synthesizeBtn) {
            const canAfford = resources.exoticMinerals >= 5;
            const batchCount = Math.floor(resources.exoticMinerals / 5);

            synthesizeBtn.classList.toggle('resource-button', true);
            synthesizeBtn.classList.toggle('insufficient', !canAfford);
            synthesizeBtn.disabled = !canAfford;

            // Update button text to show batch count
            if (canAfford) {
                const textSpan = synthesizeBtn.querySelector('span:last-child');
                if (textSpan) {
                    textSpan.textContent = `Synthesize Probethium (${batchCount}x batches)`;
                }
                synthesizeBtn.title = `Convert ${batchCount * window.GAME_CONSTANTS.SYNTHESIS.EXOTIC_PER_BATCH} exotic minerals to ${batchCount * window.GAME_CONSTANTS.SYNTHESIS.PROBETHIUM_PER_BATCH} probethium`;
            } else {
                const textSpan = synthesizeBtn.querySelector('span:last-child');
                if (textSpan) {
                    textSpan.textContent = 'Synthesize Probethium (5 Exotic)';
                }
                synthesizeBtn.title = 'Not enough exotic minerals (need 5)';
            }
        }
    }
    
    /**
     * Get active probe count for hub (helper method)
     */
    getActiveProbeCount(hub) {
        return this.gameState.entities.probes.filter(probe => {
            // Check hubId or hub.id for compatibility with old and new probe formats
            const probeHubId = probe.hubId || (probe.hub && probe.hub.id);
            return probeHubId === hub.id && probe.status !== 'destroyed';
        }).length;
    }
    
    /**
     * Get available probe count for hub
     * Available = built but not currently deployed (no waypoints or status is 'ready')
     */
    getAvailableProbeCount(hub) {
        return this.gameState.entities.probes.filter(probe => {
            // Check hubId or hub.id for compatibility with old and new probe formats
            const probeHubId = probe.hubId || (probe.hub && probe.hub.id);
            
            // Must belong to this hub and not be destroyed
            if (probeHubId !== hub.id || probe.status === 'destroyed') {
                return false;
            }
            
            // Check if probe is available (not patrolling)
            const isPatrolling = probe.waypoints && probe.waypoints.length > 0;
            const isActive = probe.active === true;
            
            // Probe is available if it's NOT patrolling (no waypoints or not active)
            return !isPatrolling || !isActive;
        }).length;
    }
    
    /**
     * Update Foundry button states based on resource availability
     */
    updateFoundryButtonStates(foundry) {
        const resources = this.gameState.getResources();
        const C = window.GAME_CONSTANTS.FOUNDRY;

        const upgradeBtn = document.getElementById('upgradeFoundryBtn');
        if (upgradeBtn) {
            const recipe = window.RECIPES.foundryLevel[foundry.level + 1];
            const canAfford = recipe && window.RecipeUtils.canAfford(recipe, resources);
            upgradeBtn.classList.toggle('insufficient', !canAfford);
            upgradeBtn.disabled = !canAfford;
        }

        const freighterBtn = document.getElementById('commissionFreighterBtn');
        if (freighterBtn) {
            const hubFreighters = this.gameState.foundry?.freighters?.filter(f => f.hubId === foundry.hubId) || [];
            const canAfford = window.RecipeUtils.canAfford(window.RECIPES.freighter, resources);
            const atCap = hubFreighters.length >= C.MAX_FREIGHTERS_PER_HUB;
            freighterBtn.classList.toggle('insufficient', !canAfford || atCap);
            freighterBtn.disabled = !canAfford || atCap;
            if (atCap) freighterBtn.title = 'Hub freighter dock is full';
        }
    }
    
    /**
     * Hide the details panel
     */
    hide() {
        this.panel.style.display = 'none';
        this.currentEntity = null;
        this.currentEntityType = null;

        // Also close equipment modal if open
        const equipmentModal = document.getElementById('equipmentModal');
        if (equipmentModal) {
            equipmentModal.remove();
        }

        this.eventBus.emit('details:hidden');
    }
    
    /**
     * Setup hub-specific buttons
     */
    setupHubButtons(hub) {
        // Deploy probe button
        const deployBtn = document.getElementById('deployFromHub');
        if (deployBtn) {
            deployBtn.addEventListener('click', () => {
                // Start deployment mode
                this.gameState.ui.deployMode = true;
                this.gameState.ui.selectedHub = hub;
                this.gameState.ui.deploymentPoints = [];
                
                // Get canvas and set cursor
                const canvas = document.getElementById('galaxyCanvas');
                if (canvas) canvas.style.cursor = 'crosshair';
                
                // Update status
                const probeStatus = document.getElementById('probeStatus');
                if (probeStatus) {
                    probeStatus.textContent = 'Click first destination for probe...';
                }
                
                this.hide(); // Close details panel
            });
        }
        
        const buildProbeBtn = document.getElementById('buildProbeForHub');
        if (buildProbeBtn) {
            buildProbeBtn.addEventListener('click', () => {
                this.eventBus.emit('probe:build', { hub });
            });
        }

        // Intake Bay upgrade — the fix for a saturated dock (LOOP_REDESIGN.md)
        const upgradeIntakeBtn = document.getElementById('upgradeIntakeBtn');
        if (upgradeIntakeBtn) {
            upgradeIntakeBtn.addEventListener('click', () => {
                const nextLevel = (hub.intakeLevel || 1) + 1;
                const recipe = window.RECIPES.intakeBay[nextLevel];
                if (!recipe || nextLevel > window.GAME_CONSTANTS.HUB.MAX_INTAKE_LEVEL) return;

                const resources = this.gameState.getResources();
                if (!window.RecipeUtils.canAfford(recipe, resources)) {
                    const missing = window.RecipeUtils.missingFor(recipe, resources)
                        .map(m => `${m.need - m.have} more ${m.key}`).join(', ');
                    this.eventBus.emit('ui:message', {
                        text: `Intake Bay needs ${missing}.`,
                        type: 'error'
                    });
                    return;
                }

                window.RecipeUtils.spend(recipe, this.gameState, this.eventBus);
                hub.intakeLevel = nextLevel;
                this.eventBus.emit('hub:intakeUpgraded', { hub, level: nextLevel });
                this.eventBus.emit('ui:message', {
                    text: `Intake Bay upgraded — ${window.GAME_CONSTANTS.HUB.INTAKE_PER_MIN_BASE * nextLevel} deliveries/min.`,
                    type: 'success'
                });
                this.showHubDetails(hub); // refresh the panel
            });
        }
        
        // Update button states based on resources
        this.updateButtonStates(hub);

        // Synthesis button
        const synthesizeBtn = document.getElementById('synthesizeBtn');
        if (synthesizeBtn) {
            synthesizeBtn.addEventListener('click', () => {
                const resources = this.gameState.getResources();

                if (resources.exoticMinerals < 5) {
                    this.eventBus.emit('ui:message', {
                        text: 'Not enough exotic minerals! Need 5 exotic minerals to synthesize.',
                        type: 'error'
                    });
                    return;
                }

                this.eventBus.emit('synthesis:triggered', { hub });
            });
        }
    }
    
    /**
     * Setup Foundry panel buttons
     */
    setupFoundryButtons(foundry) {
        const upgradeBtn = document.getElementById('upgradeFoundryBtn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                this.eventBus.emit('foundry:upgrade', { foundryId: foundry.id });
                this.showFoundryDetails(foundry); // refresh rate/level readouts
            });
        }

        const freighterBtn = document.getElementById('commissionFreighterBtn');
        if (freighterBtn) {
            freighterBtn.addEventListener('click', () => {
                this.eventBus.emit('foundry:buildFreighter', { foundryId: foundry.id });
                this.showFoundryDetails(foundry); // refresh the freighter list
            });
        }

        const deleteBtn = document.getElementById('deleteFoundryBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.eventBus.emit('foundry:delete', { foundryId: foundry.id });
                this.hide();
            });
        }

        this.content.querySelectorAll('.fd-del-freighter').forEach(btn => {
            btn.addEventListener('click', () => {
                this.eventBus.emit('foundry:deleteFreighter', { freighterId: btn.dataset.freighterId });
                this.showFoundryDetails(foundry); // refresh the freighter list
            });
        });
    }
    
    /**
     * Render equipment section for probe
     */
    renderEquipmentSection(probe) {
        // Collector modules unlock via Uplink protocols (REBUILD.md §1)
        const hasAnyAutoCollector = this.gameState.hasProtocol('harvest_lattice') ||
                                    this.gameState.hasProtocol('universal_lattice');

        // Get equipment array (handle both array and legacy object formats)
        const equipmentArray = Array.isArray(probe.equipment) ? probe.equipment :
                              (probe.equipment ? [probe.equipment] : []);
        const maxSlots = probe.maxEquipmentSlots || 2;
        const usedSlots = equipmentArray.length;

        // Type-colored markers (PALETTE.MATERIALS) — thin glyphs, no emoji
        const slotColors = {
            'minerals': '#C97B4A',
            'mineral_collector': '#C97B4A',
            'data': '#5B8CFF',
            'data_collector': '#5B8CFF',
            'artifacts': '#B06BFF',
            'artifact_collector': '#B06BFF',
            'all': '#E8E4F0',
            'universal_collector': '#E8E4F0'
        };

        // Build visual slot boxes (2 available + 1 greyed/locked)
        const renderSlotBoxes = () => {
            let slotsHtml = '<div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 10px;">';

            // Render available slots (maxSlots)
            for (let i = 0; i < maxSlots; i++) {
                const isEquipped = i < usedSlots;
                const equipment = isEquipped ? equipmentArray[i] : null;
                const slotColor = equipment ? (slotColors[equipment.type] || 'var(--mist)') : '';

                if (isEquipped) {
                    // Filled slot with type-colored marker
                    slotsHtml += `
                        <div style="
                            width: 44px;
                            height: 44px;
                            border: 1px solid var(--fire);
                            border-radius: 4px;
                            background: rgba(212,175,55,0.05);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        " title="${equipment.name || 'Equipment'}">
                            <span style="color: ${slotColor}; display: flex;">${window.icon(this.getEquipmentGlyph(equipment.type), { size: 18 })}</span>
                        </div>
                    `;
                } else {
                    // Empty available slot
                    slotsHtml += `
                        <div style="
                            width: 44px;
                            height: 44px;
                            border: 1px dashed var(--line);
                            border-radius: 4px;
                            background: var(--panel);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        " title="Empty slot">
                            <span style="color: var(--mist); font-size: 18px; opacity: 0.5;">+</span>
                        </div>
                    `;
                }
            }

            // Add locked 3rd slot (greyed out)
            slotsHtml += `
                <div style="
                    width: 44px;
                    height: 44px;
                    border: 1px dashed rgba(139,132,163,0.3);
                    border-radius: 4px;
                    background: var(--panel);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.5;
                " title="Locked - expand via Uplink protocols">
                    <span style="color: var(--mist); font-size: 14px;">×</span>
                </div>
            `;

            slotsHtml += '</div>';
            return slotsHtml;
        };

        // If no auto-collector research, show locked message but still display slots
        if (!hasAnyAutoCollector) {
            return `
                <div style="border: 1px solid var(--line-soft); border-radius: 4px; padding: 10px; margin-top: 12px; background: var(--panel);">
                    <div style="color: var(--mist); font-weight: 400; letter-spacing: 0.08em; font-size: 12px; margin-bottom: 8px; text-align: center; opacity: 0.7;">
                        EQUIPMENT SLOTS
                    </div>
                    ${renderSlotBoxes()}
                    <div style="color: var(--mist); font-size: 11px; text-align: center; padding: 5px;">
                        Decode the Harvest Lattice protocol at the Uplink to unlock equipment
                    </div>
                </div>
            `;
        }

        return `
            <div style="border: 1px solid var(--line-soft); border-radius: 4px; padding: 10px; margin-top: 12px; background: var(--panel);">
                <div style="color: var(--mist); font-weight: 400; letter-spacing: 0.08em; font-size: 12px; margin-bottom: 8px; text-align: center;">
                    EQUIPMENT SLOTS
                </div>
                ${renderSlotBoxes()}
                <button id="manageEquipmentBtn" class="control-btn" style="font-size: 10px; padding: 6px 10px; width: 100%;">
                    Manage Equipment
                </button>
            </div>
        `;
    }

    /**
     * Setup equipment button handlers
     */
    setupEquipmentButtons(probe) {
        const manageBtn = document.getElementById('manageEquipmentBtn');
        if (manageBtn) {
            manageBtn.addEventListener('click', () => {
                this.showEquipmentModal(probe);
            });
        }

        const removeBtn = document.getElementById('removeEquipmentBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removeEquipment(probe);
            });
        }
    }

    /**
     * Show equipment management modal
     */
    showEquipmentModal(probe) {
        // Remove existing modal if present
        const existingModal = document.getElementById('equipmentModal');
        if (existingModal) existingModal.remove();

        const resources = this.gameState.getResources();

        // Build available equipment list from EQUIPMENT_TYPES
        const equipmentTypes = [];
        // Type colors (PALETTE.MATERIALS) for the thin ◇ markers — no emoji
        const equipmentColors = {
            'mineral_collector': '#C97B4A',
            'data_collector': '#5B8CFF',
            'artifact_collector': '#B06BFF',
            'universal_collector': '#E8E4F0'
        };

        if (typeof EQUIPMENT_TYPES !== 'undefined') {
            Object.values(EQUIPMENT_TYPES).forEach(eq => {
                if (this.gameState.hasProtocol(eq.requiredProtocol)) {
                    equipmentTypes.push({
                        ...eq,
                        markerColor: equipmentColors[eq.id] || 'var(--mist)'
                    });
                }
            });
        }

        const modal = document.createElement('div');
        modal.id = 'equipmentModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(7,6,11,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        // Calculate slots
        const equippedItems = Array.isArray(probe.equipment) ? probe.equipment : [];
        const usedSlots = equippedItems.length;
        const maxSlots = probe.maxEquipmentSlots || 2;
        const slotsAvailable = maxSlots - usedSlots;

        // Check which equipment is already installed
        const equippedTypes = new Set(equippedItems.map(eq => eq.type));

        // Build slot visualization
        const slotIndicators = [];
        for (let i = 0; i < maxSlots; i++) {
            if (i < usedSlots) {
                slotIndicators.push('<span style="color: var(--fire);">[X]</span>');
            } else {
                slotIndicators.push('<span style="color: rgba(139,132,163,0.4);">[ ]</span>');
            }
        }

        modal.innerHTML = `
            <div style="background: var(--panel); border: 1px solid var(--line); border-radius: 4px; box-shadow: 0 4px 14px rgba(0,0,0,0.5); padding: 20px; max-width: 450px; width: 90%;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="color: var(--fire); margin: 0; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase;">Manage Equipment</h3>
                    <button id="closeEquipmentModal" style="background: none; border: none; color: var(--mist); font-size: 20px; cursor: pointer;">&times;</button>
                </div>

                <div style="color: var(--mist); font-size: 12px; margin-bottom: 15px;">
                    Probe ${probe.id} | Slots: ${slotIndicators.join(' ')} (${usedSlots}/${maxSlots}) | Minerals: ${resources.minerals}
                </div>

                ${usedSlots > 0 ? `
                    <div style="background: var(--panel); border: 1px solid var(--line-soft); border-radius: 4px; padding: 12px; margin-bottom: 15px;">
                        <div style="color: var(--mist); font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px; margin-bottom: 8px;">Currently Equipped</div>
                        ${equippedItems.map(eq => {
                            const markerColor = equipmentColors[eq.type] || 'var(--mist)';
                            return `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--line-soft);">
                                    <div style="color: var(--signal); display: flex; align-items: center;">
                                        <span style="color: ${markerColor}; display: flex;">${window.icon(this.getEquipmentGlyph(eq.type), { size: 14 })}</span>
                                        <span style="margin-left: 8px;">${eq.name || eq.type}</span>
                                    </div>
                                    <button class="control-btn remove-equipment-btn" data-equipment-type="${eq.type}" style="font-size: 10px; padding: 4px 8px; border-color: var(--danger); color: var(--danger);">
                                        Remove
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : ''}

                <div style="color: var(--mist); font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px; margin-bottom: 10px;">Available Equipment</div>

                <div style="max-height: 250px; overflow-y: auto;">
                    ${equipmentTypes.map(eq => {
                        const canAfford = resources.minerals >= eq.cost;
                        const alreadyEquipped = equippedTypes.has(eq.id);
                        const hasSlots = slotsAvailable >= eq.slotsRequired;
                        const canEquip = canAfford && !alreadyEquipped && hasSlots;

                        let statusMessage = '';
                        if (alreadyEquipped) {
                            statusMessage = '<div style="color: var(--fire); font-size: 10px; margin-top: 3px;">Already equipped</div>';
                        } else if (!canAfford) {
                            statusMessage = '<div style="color: var(--danger); font-size: 10px; margin-top: 3px;">Insufficient minerals</div>';
                        } else if (!hasSlots) {
                            statusMessage = '<div style="color: var(--mist); font-size: 10px; margin-top: 3px;">No slots available</div>';
                        }

                        return `
                            <div style="background: var(--panel); border: 1px solid ${canEquip ? 'var(--line)' : 'var(--line-soft)'}; border-radius: 4px; padding: 10px; margin-bottom: 8px; opacity: ${canEquip ? 1 : 0.6};">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="display: flex; align-items: center;">
                                        <span style="color: ${eq.markerColor}; display: flex;">${window.icon(this.getEquipmentGlyph(eq.id), { size: 14 })}</span>
                                        <span style="color: ${canEquip ? 'var(--signal)' : 'var(--mist)'}; font-weight: 400; margin-left: 8px;">${eq.name}</span>
                                        <span style="color: var(--mist); font-size: 10px; margin-left: 5px; opacity: 0.7;">(${eq.slotsRequired} slot)</span>
                                    </div>
                                    <button
                                        class="control-btn equip-btn"
                                        data-equipment-id="${eq.id}"
                                        style="font-size: 11px; padding: 5px 12px;"
                                        ${!canEquip ? 'disabled' : ''}
                                    >
                                        Equip (${eq.cost}M)
                                    </button>
                                </div>
                                <div style="color: var(--mist); font-size: 11px; margin-top: 5px;">${eq.description}</div>
                                ${statusMessage}
                            </div>
                        `;
                    }).join('')}
                </div>

                ${equipmentTypes.length === 0 ? `
                    <div style="color: var(--mist); text-align: center; padding: 20px;">
                        No equipment available. Decode collector protocols at the Uplink first.
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(modal);

        // Store reference to this for callbacks
        const self = this;

        // Setup modal event handlers
        document.getElementById('closeEquipmentModal').addEventListener('click', () => {
            modal.remove();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Setup equip buttons
        const equipBtns = modal.querySelectorAll('.equip-btn');
        equipBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const equipmentId = btn.getAttribute('data-equipment-id');
                self.equipEquipment(probe, equipmentId, equipmentTypes);
                modal.remove();
                // Refresh probe details panel
                self.showProbeDetails(probe);
            });
        });

        // Setup remove buttons for equipped items
        const removeBtns = modal.querySelectorAll('.remove-equipment-btn');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const equipmentType = btn.getAttribute('data-equipment-type');
                self.removeEquipmentByType(probe, equipmentType);
                modal.remove();
                // Refresh probe details panel
                self.showProbeDetails(probe);
            });
        });
    }

    /**
     * Equip equipment to probe (array-based equipment system)
     */
    equipEquipment(probe, equipmentId, equipmentTypes) {
        const equipment = equipmentTypes.find(e => e.id === equipmentId);
        if (!equipment) return;

        const resources = this.gameState.getResources();
        if (resources.minerals < equipment.cost) {
            this.eventBus.emit('ui:message', { text: 'Insufficient minerals!', type: 'error' });
            return;
        }

        // Initialize equipment array if needed
        if (!Array.isArray(probe.equipment)) {
            probe.equipment = [];
        }

        // Check slot availability
        const usedSlots = probe.equipment.length;
        const maxSlots = probe.maxEquipmentSlots || 2;
        const slotsRequired = equipment.slotsRequired || 1;

        if (usedSlots + slotsRequired > maxSlots) {
            this.eventBus.emit('ui:message', { text: 'Not enough equipment slots!', type: 'error' });
            return;
        }

        // Check if already equipped (no stacking)
        if (probe.equipment.some(eq => eq.type === equipmentId)) {
            this.eventBus.emit('ui:message', { text: 'Already equipped!', type: 'error' });
            return;
        }

        // Deduct resources
        this.gameState.resources.minerals -= equipment.cost;

        // Add equipment to array
        probe.equipment.push({
            type: equipment.id,
            name: equipment.name,
            collectionTypes: equipment.collectionTypes || [equipment.type],
            installedAt: Date.now()
        });

        this.eventBus.emit('ui:message', { text: `${equipment.name} equipped!`, type: 'success' });
        this.eventBus.emit('ui:update');
    }

    /**
     * Remove equipment from probe (by type for array-based system)
     */
    removeEquipmentByType(probe, equipmentType) {
        if (!Array.isArray(probe.equipment)) return;

        const index = probe.equipment.findIndex(eq => eq.type === equipmentType);
        if (index === -1) return;

        const equipmentName = probe.equipment[index].name || equipmentType;
        probe.equipment.splice(index, 1);

        this.eventBus.emit('ui:message', { text: `${equipmentName} removed.`, type: 'info' });
        this.eventBus.emit('ui:update');
    }

    /**
     * Remove equipment from probe (legacy support - removes first item)
     */
    removeEquipment(probe) {
        if (!probe.equipment) return;

        // Handle array-based equipment
        if (Array.isArray(probe.equipment)) {
            if (probe.equipment.length === 0) return;
            const equipmentName = probe.equipment[0].name || 'Equipment';
            probe.equipment.shift();
            this.eventBus.emit('ui:message', { text: `${equipmentName} removed.`, type: 'info' });
        } else {
            // Legacy object-based equipment
            const equipmentName = probe.equipment.name;
            probe.equipment = [];
            this.eventBus.emit('ui:message', { text: `${equipmentName} removed.`, type: 'info' });
        }

        this.eventBus.emit('ui:update');

        // Refresh the panel
        this.showProbeDetails(probe);
    }

    /**
     * Render cargo section for probe
     */
    renderCargoSection(probe) {
        if (!probe.cargo) return '';
        
        const cargoUsed = (probe.cargo.minerals || 0) + (probe.cargo.data || 0) + 
                         (probe.cargo.artifacts || 0) + (probe.cargo.exoticMinerals || 0);
        
        // Get capacity from ProbeManager
        const probeManager = this.gameState.probeManager;
        const cargoCapacity = probeManager ? probeManager.getCargoCapacity(probe) : 100;
        const cargoPercent = Math.min(100, Math.round((cargoUsed / cargoCapacity) * 100));
        
        // Determine status and warning
        let statusText = '✓ Plenty of space';
        let statusColor = 'var(--fire)';
        let warningText = '';
        let speedMod = 100;

        if (cargoPercent >= 100) {
            statusText = 'CARGO FULL';
            statusColor = 'var(--danger)';
            warningText = 'Return to hub or cannot collect more signals';
            speedMod = 50;
        } else if (cargoPercent >= 90) {
            statusText = 'Almost full';
            statusColor = 'var(--danger)';
            warningText = 'May not fit next signal';
            speedMod = 60;
        } else if (cargoPercent >= 75) {
            statusText = 'Nearly full';
            statusColor = 'var(--signal)';
            warningText = 'Consider returning soon';
            speedMod = 75;
        } else if (cargoPercent >= 50) {
            statusText = 'Getting full';
            statusColor = 'var(--mist)';
            warningText = `Speed reduced to ${speedMod}%`;
            speedMod = 90;
        }

        return `
            <div style="border: 1px solid var(--line-soft); border-radius: 4px; padding: 10px; margin-top: 12px; background: var(--panel);">
                <div style="color: var(--mist); font-weight: 400; letter-spacing: 0.08em; margin-bottom: 8px; font-size: 12px;">
                    CARGO: <span style="color: var(--signal); font-family: var(--font-data);">${cargoUsed} / ${cargoCapacity}</span>
                </div>
                <div style="background: rgba(232,228,240,0.06); height: 20px; border-radius: 3px; overflow: hidden; margin-bottom: 10px; border: 1px solid var(--line-soft);">
                    <div style="background: var(--fire); height: 100%; width: ${cargoPercent}%; transition: width 0.3s ease;"></div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px; margin-bottom: 10px;">
                    <div style="color: #C97B4A;">Minerals: ${probe.cargo.minerals || 0}</div>
                    <div style="color: #5B8CFF;">Data: ${probe.cargo.data || 0}</div>
                    <div style="color: #B06BFF;">Artifacts: ${probe.cargo.artifacts || 0}</div>
                    <div style="color: #E8E4F0;">Exotic: ${probe.cargo.exoticMinerals || 0}</div>
                </div>
                ${cargoPercent >= 50 ? `
                    <div style="margin-top: 10px; padding: 8px; background: var(--panel); border-radius: 3px; border: 1px solid var(--line-soft);">
                        <div style="color: ${statusColor}; font-weight: 400; font-size: 11px; margin-bottom: 3px;">${statusText}</div>
                        ${warningText ? `<div style="color: var(--mist); font-size: 10px;">${warningText}</div>` : ''}
                        ${cargoPercent >= 50 ? `<div style="color: var(--mist); font-size: 10px; margin-top: 3px;">Speed: ${speedMod}%</div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Render skin selector for probe customization
     */
    renderSkinSelector(probe) {
        // Get owned skins
        const ownedSkins = this.gameState.ownedCosmetics?.probeSkins || [];
        const currentSkin = probe.customSkin || 'default';
        
        // Default skin + owned skins
        const allSkins = [
            { id: 'default', name: 'Default', color: '#E8E4F0' },
            ...ownedSkins
        ];

        return `
            <div style="border: 1px solid var(--line-soft); border-radius: 4px; padding: 10px; margin-top: 12px; background: var(--panel);">
                <div style="color: var(--mist); font-weight: 400; letter-spacing: 0.08em; margin-bottom: 8px; font-size: 12px;">
                    PROBE SKIN
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${allSkins.map(skin => {
                        const isSelected = (skin.id === currentSkin);
                        const isDefault = skin.id === 'default';

                        return `
                            <div
                                data-skin-id="${skin.id}"
                                data-probe-id="${probe.id}"
                                class="skin-selector-box"
                                style="
                                    width: 40px;
                                    height: 40px;
                                    border: 1px solid ${isSelected ? 'var(--fire)' : (isDefault ? 'var(--line-soft)' : skin.color)};
                                    border-radius: 4px;
                                    background: ${isDefault ? 'rgba(232,228,240,0.06)' : skin.color + '22'};
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    position: relative;
                                    opacity: ${isDefault ? 0.5 : 1};
                                "
                                title="${skin.name}"
                            >
                                ${isSelected ? '<div style="color: var(--signal); font-size: 20px;">✓</div>' : ''}
                                <div style="position: absolute; bottom: 2px; width: 100%; height: 4px; background: ${isDefault ? 'var(--mist)' : skin.color}; opacity: 0.5;"></div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div style="color: var(--mist); font-size: 10px; margin-top: 8px;">
                    Click a color to equip skin
                </div>
            </div>
        `;
    }
    
    /**
     * Setup probe buttons
     */
    setupProbeButtons(probe) {
        const patrolCheckbox = document.getElementById('patrolModeCheckbox');
        if (patrolCheckbox) {
            patrolCheckbox.addEventListener('change', (e) => {
                this.eventBus.emit('probe:togglePatrol', { 
                    probe, 
                    enabled: e.target.checked 
                });
            });
        }
        
        const cameraCheckbox = document.getElementById('cameraLockCheckbox');
        if (cameraCheckbox) {
            cameraCheckbox.addEventListener('change', (e) => {
                this.eventBus.emit('camera:toggleLock', { 
                    probe, 
                    locked: e.target.checked 
                });
            });
        }
    }
    
    /**
     * Setup skin selector click handlers
     */
    setupSkinSelectors(probe) {
        const skinBoxes = document.querySelectorAll('.skin-selector-box');
        skinBoxes.forEach(box => {
            box.addEventListener('click', () => {
                const skinId = box.getAttribute('data-skin-id');
                const probeId = box.getAttribute('data-probe-id');
                
                // Find probe and update skin
                const targetProbe = this.gameState.entities.probes.find(p => p.id === probeId);
                if (targetProbe) {
                    targetProbe.customSkin = skinId;
                    
                    // Refresh panel to show updated selection
                    this.showProbeDetails(targetProbe);
                    
                    this.eventBus.emit('ui:message', {
                        text: `Skin ${skinId === 'default' ? 'Default' : skinId} equipped!`,
                        type: 'success'
                    });
                }
            });
        });
    }
    
    /**
     * Update the panel if showing current entity
     */
    update() {
        if (this.currentEntity && this.currentEntityType) {
            // Refresh the display with updated entity data
            this.showEntityDetails({
                entity: this.currentEntity,
                type: this.currentEntityType
            });
        }
    }
}

// Export for use
window.DetailsPanel = DetailsPanel;