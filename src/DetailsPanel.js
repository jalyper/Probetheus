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
                } else if (this.currentEntityType === 'station') {
                    this.updateMiningStationButtonStates(this.currentEntity);
                }
            }
        });
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
                    case 's':
                        e.preventDefault();
                        this.triggerButtonClick('buildShuttleBtn');
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
            case 'miningStation':
                this.showMiningStationDetails(entity);
                break;
            case 'shuttle':
                this.showShuttleDetails(entity);
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
        this.icon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24">
                <!-- Hub base structure -->
                <rect x="6" y="6" width="12" height="12" fill="#0f8" stroke="#0f8" stroke-width="1.5" rx="2"/>
                <!-- Inner grid pattern -->
                <line x1="9" y1="6" x2="9" y2="18" stroke="#333" stroke-width="1"/>
                <line x1="12" y1="6" x2="12" y2="18" stroke="#333" stroke-width="1"/>
                <line x1="15" y1="6" x2="15" y2="18" stroke="#333" stroke-width="1"/>
                <line x1="6" y1="9" x2="18" y2="9" stroke="#333" stroke-width="1"/>
                <line x1="6" y1="12" x2="18" y2="12" stroke="#333" stroke-width="1"/>
                <line x1="6" y1="15" x2="18" y2="15" stroke="#333" stroke-width="1"/>
                <!-- Central hub core -->
                <circle cx="12" cy="12" r="3" fill="#0f8" stroke="#fff" stroke-width="1"/>
            </svg>
        `;
        this.title.textContent = 'Recon Hub';
        this.title.style.color = '#0f8';
        
        const probeCount = hub.probes ? hub.probes.length : 0;
        const maxProbes = hub.maxProbes || 5;
        
        // Count available (ready) probes - built but not currently patrolling
        const availableProbes = this.getAvailableProbeCount(hub);
        const deployedProbes = probeCount - availableProbes;
        
        // Get shell information for equipped shell
        const equippedShellId = this.gameState.cosmetics?.equippedShells?.hubs || 'default';
        const shell = window.SHELL_CATALOG?.hubs?.[equippedShellId] || null;
        const shellColor = shell?.visual?.color || '#0f8';

        this.content.innerHTML = `
            <div style="background: rgba(0,255,128,0.05); border: 1px solid rgba(0,255,128,0.2); border-radius: 5px; padding: 10px; margin-bottom: 12px;">
                <div style="color: #0f8; font-size: 12px; font-weight: bold; margin-bottom: 6px;">📍 Hub Status</div>
                <div style="color: #ccc; font-size: 12px; line-height: 1.6;">
                    <div>ID: ${hub.id || 'Unknown'}</div>
                    <div>Position: (${Math.round(hub.x)}, ${Math.round(hub.y)})</div>
                    <div>Total Probes: ${probeCount}/${maxProbes}</div>
                    <div style="color: #0ff; font-weight: bold;">Available: ${availableProbes} | Deployed: ${deployedProbes}</div>
                    <div>Sector: [${hub.sectorX || 0}, ${hub.sectorY || 0}]</div>
                </div>
            </div>

            <div style="background: rgba(212,175,55,0.05); border: 1px solid var(--line); border-radius: 4px; padding: 10px; margin-bottom: 12px;">
                <div style="color: var(--fire); font-size: 12px; margin-bottom: 6px; letter-spacing: 0.08em; text-transform: uppercase;">Intake Bay</div>
                <div style="color: var(--mist); font-size: 12px; line-height: 1.6; margin-bottom: 8px;">
                    <span style="color: var(--signal); font-family: var(--font-data);">Lv ${hub.intakeLevel || 1}</span>
                    · processes <span style="color: var(--signal); font-family: var(--font-data);">${(window.GAME_CONSTANTS.HUB.INTAKE_PER_MIN_BASE) * (hub.intakeLevel || 1)}/min</span>
                </div>
                ${(hub.intakeLevel || 1) < window.GAME_CONSTANTS.HUB.MAX_INTAKE_LEVEL ? `
                <button id="upgradeIntakeBtn" class="control-btn" style="font-size: 12px; padding: 8px 12px; width: 100%;">
                    Upgrade Intake Bay (${window.RecipeUtils.format(window.RECIPES.intakeBay[(hub.intakeLevel || 1) + 1])})
                </button>
                ` : `
                <div style="color: rgba(139,132,163,0.6); font-size: 11px;">Maximum level</div>
                `}
            </div>

            <div style="background: rgba(200,150,255,0.05); border: 1px solid rgba(200,150,255,0.2); border-radius: 5px; padding: 10px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                    <div style="color: #c9f; font-size: 12px; font-weight: bold;">Hub Operations</div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <button id="deployFromHub" class="control-btn" style="font-size: 12px; padding: 8px 12px; width: 100%; display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink: 0;">
                            <!-- Probe Body (circular center) -->
                            <circle cx="8" cy="8" r="3" fill="#0ff" stroke="#0ff" stroke-width="0.5"/>
                            <!-- Wings (extending perpendicular) -->
                            <rect x="7" y="2" width="2" height="6" fill="rgba(0,255,255,0.8)" stroke="#0ff" stroke-width="0.5"/>
                            <rect x="7" y="12" width="2" height="2" fill="rgba(0,255,255,0.8)" stroke="#0ff" stroke-width="0.5"/>
                            <!-- Front (triangular nose) -->
                            <polygon points="11,8 14,6 14,10" fill="#0ff"/>
                            <!-- Antennas (angled lines) -->
                            <line x1="5" y1="7" x2="2" y2="5" stroke="rgba(0,255,255,0.8)" stroke-width="1"/>
                            <line x1="5" y1="9" x2="2" y2="11" stroke="rgba(0,255,255,0.8)" stroke-width="1"/>
                        </svg>
                        <span style="text-decoration: underline;">D</span>eploy Probe
                    </button>
                    <button id="buildProbeForHub" class="control-btn" style="font-size: 12px; padding: 8px 12px; width: 100%; display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink: 0;">
                            <!-- Probe Body (circular center) -->
                            <circle cx="8" cy="8" r="3" fill="#0ff" stroke="#0ff" stroke-width="0.5"/>
                            <!-- Wings (extending perpendicular) -->
                            <rect x="7" y="2" width="2" height="6" fill="rgba(0,255,255,0.8)" stroke="#0ff" stroke-width="0.5"/>
                            <rect x="7" y="12" width="2" height="2" fill="rgba(0,255,255,0.8)" stroke="#0ff" stroke-width="0.5"/>
                            <!-- Front (triangular nose) -->
                            <polygon points="11,8 14,6 14,10" fill="#0ff"/>
                            <!-- Antennas (angled lines) -->
                            <line x1="5" y1="7" x2="2" y2="5" stroke="rgba(0,255,255,0.8)" stroke-width="1"/>
                            <line x1="5" y1="9" x2="2" y2="11" stroke="rgba(0,255,255,0.8)" stroke-width="1"/>
                        </svg>
                        Build <span style="text-decoration: underline;">P</span>robe (25M)
                    </button>
                    <button id="buildShuttleBtn" class="control-btn" style="font-size: 12px; padding: 8px 12px; width: 100%; display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink: 0;">
                            <!-- Triangle shuttle pointing right -->
                            <polygon points="12,8 4,4 4,12" fill="#ff0" stroke="#fff" stroke-width="0.8"/>
                            <!-- Cargo indicator (small circle) -->
                            <circle cx="6" cy="8" r="1.5" fill="rgba(255,255,255,0.7)"/>
                        </svg>
                        <span style="text-decoration: underline;">S</span>huttle (50M, 25D)
                    </button>
                    ${this.gameState.hasProtocol('exotic_synthesis') ? `
                    <button id="synthesizeBtn" class="control-btn" style="font-size: 12px; padding: 8px 12px; width: 100%; display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #9400d3 0%, #ffd700 100%); color: #fff;">
                        <span style="font-size: 16px; flex-shrink: 0;">⚗️</span>
                        <span>Synthesize Probethium (5 Exotic)</span>
                    </button>
                    ` : ''}
                </div>
            </div>

            <div style="background: rgba(148,0,211,0.05); border: 1px solid rgba(148,0,211,0.2); border-radius: 5px; padding: 10px; margin-top: 12px;">
                <div style="color: #9400d3; font-size: 12px; font-weight: bold; margin-bottom: 6px;">🎨 Equipped Shell</div>
                <div id="hubShellIndicator" style="display: flex; align-items: center; gap: 8px; cursor: default;">
                    <div style="width: 24px; height: 24px; border-radius: 4px; background: ${shellColor}; border: 1px solid rgba(255,255,255,0.2);"></div>
                    <div>
                        <div style="color: ${shellColor}; font-size: 11px; font-weight: bold;">${shell?.name || 'Default'}</div>
                        <div style="color: #888; font-size: 9px; text-transform: uppercase;">${shell?.rarity || 'standard'}</div>
                    </div>
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
     * Show mining station details
     */
    showMiningStationDetails(station) {
        this.icon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24">
                <!-- Octagonal mining station -->
                <polygon points="12,3 16.95,5.55 19.5,10.5 16.95,15.45 12,18 7.05,15.45 4.5,10.5 7.05,5.55" fill="#aaa" stroke="#666" stroke-width="1.5"/>
                <!-- Inner cross pattern -->
                <line x1="7.5" y1="12" x2="16.5" y2="12" stroke="#666" stroke-width="1.2"/>
                <line x1="12" y1="6" x2="12" y2="18" stroke="#666" stroke-width="1.2"/>
                <!-- Diagonal lines -->
                <line x1="9" y1="8.5" x2="15" y2="14.5" stroke="#666" stroke-width="1.2"/>
                <line x1="15" y1="8.5" x2="9" y2="14.5" stroke="#666" stroke-width="1.2"/>
            </svg>
        `;
        this.title.textContent = 'Mining Station';
        this.title.style.color = '#c9f';
        
        const stationTypes = {
            basic: { name: 'Basic Mining Station', icon: '⛏️' },
            advanced: { name: 'Advanced Mining Station', icon: '🏭' },
            quantum: { name: 'Quantum Mining Station', icon: '💠' }
        };
        
        const stationType = stationTypes[station.type] || { name: 'Unknown', icon: '❓' };
        const efficiency = Math.round(station.efficiency * 100);
        const activeStatus = station.active ? '🟢 Active' : '🔴 Inactive';

        // Get mining station type data
        const miningManager = this.gameState.miningManager;
        const fullStationType = miningManager ? miningManager.getStationTypes()[station.type] : null;

        // PROF-06: Get station output resource based on sector profile
        const outputResource = miningManager ? miningManager.getStationOutputResource(station) : 'probethium';

        // Per-cycle output for display (ECONOMY.md: probethium and resources tuned separately)
        const baseOutput = fullStationType
            ? (outputResource === 'probethium' ? fullStationType.probethiumOutput : fullStationType.output)
            : 0;
        const productionRate = station.active ? (baseOutput * (station.level || 1)).toFixed(2) : '0';

        // Map output resource to display labels with icons
        const outputResourceLabels = {
            'probethium': { name: 'Probetheum', icon: '⚛️' },
            'minerals': { name: 'Minerals', icon: '⛽' },
            'data': { name: 'Data', icon: '📊' },
            'artifacts': { name: 'Artifacts', icon: '🏺' },
            'mixed': { name: 'Mixed Resources (reduced)', icon: '📦' }
        };

        const outputLabel = outputResourceLabels[outputResource] || { name: 'Unknown', icon: '❓' };
        
        // Resource requirements display
        let requirementsHtml = '';
        if (fullStationType && fullStationType.requirements) {
            requirementsHtml = '<div style="margin-top: 8px;"><div style="color: #ff9; font-size: 11px; font-weight: bold;">🔧 Resource Requirements:</div>';
            for (const [resource, required] of Object.entries(fullStationType.requirements)) {
                const currentInventory = station.stationInventory ? (station.stationInventory[resource] || 0) : 0;
                const hasEnough = currentInventory >= required;
                
                const resourceIcon = resource === 'minerals' ? '⛽' : resource === 'data' ? '📊' : resource === 'artifacts' ? '🏺' : '💎';
                const statusColor = hasEnough ? '#0f0' : '#f44';
                const statusText = hasEnough ? '✓' : '✗';
                
                requirementsHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 10px;">
                        <div style="color: #ccc; font-size: 10px;">${resourceIcon} ${resource}:</div>
                        <div style="color: ${statusColor}; font-size: 10px; font-weight: bold;">${statusText} ${Math.round(currentInventory)}/${required}</div>
                    </div>`;
            }
            requirementsHtml += '</div>';
        }
        
        // Calculate station inventory status  
        let inventoryHtml = '';
        if (station.stationInventory && Object.keys(station.stationInventory).length > 0) {
            inventoryHtml = '<div style="margin-top: 8px;"><div style="color: #888; font-size: 11px;">📦 Station Inventory:</div>';
            for (const [resource, amount] of Object.entries(station.stationInventory)) {
                inventoryHtml += `<div style="color: #aaa; font-size: 10px; padding-left: 10px;">• ${resource}: ${Math.round(amount)}</div>`;
            }
            inventoryHtml += '</div>';
        }
        
        // Find connected shuttles
        const connectedShuttles = this.gameState.mining?.shuttles?.filter(s => s.stationId === station.id) || [];

        // Get shell information for equipped shell
        const equippedStationShellId = this.gameState.cosmetics?.equippedShells?.miningStations || 'default';
        const stationShell = window.SHELL_CATALOG?.miningStations?.[equippedStationShellId] || null;
        const stationShellColor = stationShell?.visual?.color || '#c9f';

        this.content.innerHTML = `
            <div style="background: rgba(200,150,255,0.05); border: 1px solid rgba(200,150,255,0.2); border-radius: 5px; padding: 10px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <div style="font-size: 24px;">${stationType.icon}</div>
                    <div>
                        <div style="color: #c9f; font-size: 14px; font-weight: bold;">${stationType.name}</div>
                        <div style="color: #888; font-size: 10px;">Level ${station.level || 1}</div>
                    </div>
                </div>
                
                <div style="color: #ccc; font-size: 12px; line-height: 1.6;">
                    <div>Status: ${activeStatus}</div>
                    <div>Efficiency: ${efficiency}%</div>
                    <div>Position: (${Math.round(station.position.x)}, ${Math.round(station.position.y)})</div>
                    <div>Hub: ${station.hubId}</div>
                </div>
            </div>
            
            <div style="background: rgba(100,200,255,0.05); border: 1px solid rgba(100,200,255,0.2); border-radius: 5px; padding: 10px; margin-bottom: 12px;">
                <div style="color: #64c8ff; font-size: 12px; font-weight: bold; margin-bottom: 6px;">📊 Production</div>
                <div style="color: #ccc; font-size: 12px; line-height: 1.6;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span>${outputLabel.icon}</span>
                        <span>Mining Output: <span style="color: #0f8; font-weight: bold;">${outputLabel.name}</span></span>
                    </div>
                    <div>Production Rate: ${productionRate}/cycle</div>
                    <div>Total Produced: ${station.totalProduced?.toFixed(6) || '0.000000'}</div>
                    <div>Connected Shuttles: ${connectedShuttles.length}</div>
                </div>
                ${requirementsHtml}
                ${inventoryHtml}
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 6px;">
                <button id="upgradeStation" class="control-btn resource-button" style="font-size: 12px; padding: 8px 12px; width: 100%;" ${station.level >= 3 ? 'disabled' : ''}>
                    ⬆️ Upgrade Station (${50 * (station.level + 1)}M, ${20 * (station.level + 1)}D)
                </button>
            </div>

            <div style="background: rgba(148,0,211,0.05); border: 1px solid rgba(148,0,211,0.2); border-radius: 5px; padding: 10px; margin-top: 12px;">
                <div style="color: #9400d3; font-size: 12px; font-weight: bold; margin-bottom: 6px;">🎨 Equipped Shell</div>
                <div id="stationShellIndicator" style="display: flex; align-items: center; gap: 8px; cursor: default;">
                    <div style="width: 24px; height: 24px; border-radius: 4px; background: ${stationShellColor}; border: 1px solid rgba(255,255,255,0.2);"></div>
                    <div>
                        <div style="color: ${stationShellColor}; font-size: 11px; font-weight: bold;">${stationShell?.name || 'Default'}</div>
                        <div style="color: #888; font-size: 9px; text-transform: uppercase;">${stationShell?.rarity || 'standard'}</div>
                    </div>
                </div>
            </div>

            <div style="color: #666; font-size: 10px; margin-top: 8px; line-height: 1.3;">
                ${!station.active ? '⚠️ Station needs resources to operate' : `✅ Station is producing ${outputLabel.name}`}
            </div>
        `;
        
        // Add button listeners
        this.setupMiningStationButtons(station);

        // Update button states based on resources
        this.updateMiningStationButtonStates(station);

        // Attach tooltip handlers for shell indicator if shell has bonuses
        if (stationShell && stationShell.bonuses && Object.keys(stationShell.bonuses).length > 0) {
            const indicator = document.getElementById('stationShellIndicator');
            if (indicator && window.game?.uiManager?.attachTooltipHandlers) {
                window.game.uiManager.attachTooltipHandlers(indicator, stationShell);
            }
        }
    }
    
    /**
     * Show probe details
     */
    showProbeDetails(probe) {
        this.icon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24">
                <!-- Probe Body (circular center) -->
                <circle cx="12" cy="12" r="4.5" fill="#0ff" stroke="#0ff" stroke-width="0.8"/>
                <!-- Wings (extending perpendicular) -->
                <rect x="11" y="3" width="2" height="9" fill="rgba(0,255,255,0.8)" stroke="#0ff" stroke-width="0.8"/>
                <rect x="11" y="18" width="2" height="3" fill="rgba(0,255,255,0.8)" stroke="#0ff" stroke-width="0.8"/>
                <!-- Front (triangular nose) -->
                <polygon points="16.5,12 21,9 21,15" fill="#0ff"/>
                <!-- Antennas (angled lines) -->
                <line x1="7.5" y1="10.5" x2="3" y2="7.5" stroke="rgba(0,255,255,0.8)" stroke-width="1.5"/>
                <line x1="7.5" y1="13.5" x2="3" y2="16.5" stroke="rgba(0,255,255,0.8)" stroke-width="1.5"/>
            </svg>
        `;
        this.title.textContent = `Probe ${probe.id}`;
        this.title.style.color = '#0ff';
        
        const status = probe.status || 'Unknown';
        const statusColors = {
            'ready': '#0f0',
            'exploring': '#0ff',
            'returning': '#ff0',
            'damaged': '#f00'
        };
        
        this.content.innerHTML = `
            <div style="background: rgba(0,255,255,0.05); border: 1px solid rgba(0,255,255,0.2); border-radius: 5px; padding: 10px; margin-bottom: 12px;">
                <div style="color: #0ff; font-size: 12px; font-weight: bold; margin-bottom: 6px;">🛸 Probe Status</div>
                <div style="color: #ccc; font-size: 12px; line-height: 1.6;">
                    <div>Status: <span style="color: ${statusColors[status] || '#fff'}">${status}</span></div>
                    <div>Position: (${Math.round(probe.x)}, ${Math.round(probe.y)})</div>
                    <div>Speed: ${probe.speed || 1}</div>
                    <div>Patrol: ${probe.patrol ? 'Enabled' : 'Disabled'}</div>
                </div>
            </div>
            
            <div style="border-top: 1px solid #333; padding-top: 12px; margin-bottom: 12px;">
                <label style="color: #888; font-size: 12px; display: flex; align-items: center; cursor: pointer; margin-bottom: 8px;">
                    <input type="checkbox" id="patrolModeCheckbox" style="margin-right: 8px; cursor: pointer;" ${probe.patrol ? 'checked' : ''}>
                    <span>Patrol Mode (Loop Route)</span>
                </label>
                <label style="color: #888; font-size: 12px; display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" id="cameraLockCheckbox" style="margin-right: 8px; cursor: pointer;">
                    <span>🔒 Lock Camera to Probe</span>
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
     * Show shuttle details
     */
    showShuttleDetails(shuttle) {
        this.icon.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24">
                <!-- Triangle shuttle pointing right -->
                <polygon points="18,12 6,6 6,18" fill="#ff0" stroke="#fff" stroke-width="1.2"/>
                <!-- Cargo indicator (small circle) -->
                <circle cx="9" cy="12" r="2.25" fill="rgba(255,255,255,0.7)"/>
            </svg>
        `;
        this.title.textContent = 'Resource Shuttle';
        this.title.style.color = '#f90';
        
        const statusColors = {
            'loading': '#0ff',
            'delivering': '#0f0',
            'returning': '#ff0'
        };
        
        this.content.innerHTML = `
            <div style="background: rgba(255,150,0,0.05); border: 1px solid rgba(255,150,0,0.2); border-radius: 5px; padding: 10px; margin-bottom: 12px;">
                <div style="color: #f90; font-size: 12px; font-weight: bold; margin-bottom: 6px;">🚀 Shuttle Status</div>
                <div style="color: #ccc; font-size: 12px; line-height: 1.6;">
                    <div>Status: <span style="color: ${statusColors[shuttle.status] || '#fff'}">${shuttle.status}</span></div>
                    <div>Position: (${Math.round(shuttle.position.x)}, ${Math.round(shuttle.position.y)})</div>
                    <div>Level: ${shuttle.level || 1}</div>
                    <div>Capacity: ${shuttle.capacity || 50}</div>
                </div>
            </div>
            
            ${shuttle.cargo && Object.keys(shuttle.cargo).length > 0 ? `
            <div style="background: rgba(255,255,0,0.05); border: 1px solid rgba(255,255,0,0.2); border-radius: 5px; padding: 10px;">
                <div style="color: #ff0; font-size: 12px; font-weight: bold; margin-bottom: 6px;">📦 Cargo</div>
                <div style="color: #ccc; font-size: 11px;">
                    ${Object.entries(shuttle.cargo).map(([res, amt]) => 
                        `<div>• ${res}: ${amt}</div>`
                    ).join('')}
                </div>
            </div>` : '<div style="color: #888; font-size: 11px;">No cargo currently loaded</div>'}
        `;
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
        
        // Build Shuttle button (50 minerals, 25 data)
        const buildShuttleBtn = document.getElementById('buildShuttleBtn');
        if (buildShuttleBtn) {
            const canAfford = resources.minerals >= 50 && resources.data >= 25;

            buildShuttleBtn.classList.toggle('resource-button', true);
            buildShuttleBtn.classList.toggle('insufficient', !canAfford);
            buildShuttleBtn.disabled = !canAfford;
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
     * Update mining station button states based on resource availability
     */
    updateMiningStationButtonStates(station) {
        const resources = this.gameState.getResources();
        
        // Upgrade Station button
        const upgradeBtn = document.getElementById('upgradeStation');
        if (upgradeBtn) {
            const upgradeCost = {
                minerals: 50 * (station.level + 1),
                data: 20 * (station.level + 1)
            };
            const canAfford = resources.minerals >= upgradeCost.minerals && resources.data >= upgradeCost.data;
            const atMaxLevel = station.level >= 3;
            
            upgradeBtn.classList.toggle('insufficient', !canAfford || atMaxLevel);
            upgradeBtn.disabled = !canAfford || atMaxLevel;
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
        
        // Shuttle button
        const buildShuttleBtn = document.getElementById('buildShuttleBtn');
        if (buildShuttleBtn) {
            buildShuttleBtn.addEventListener('click', () => {
                if (!hub) {
                    this.eventBus.emit('ui:message', {
                        text: 'Select a hub first!',
                        type: 'error'
                    });
                    return;
                }

                console.log('Starting shuttle placement mode for hub:', hub.id);

                // Enter shuttle placement mode
                this.gameState.ui.shuttlePlacementMode = true;
                this.gameState.ui.selectedHub = hub;

                const canvas = document.getElementById('galaxyCanvas');
                if (canvas) canvas.style.cursor = 'crosshair';

                const probeStatus = document.getElementById('probeStatus');
                if (probeStatus) {
                    probeStatus.textContent = 'Click on a mining station to connect shuttle...';
                }

                this.hide(); // Close details panel
            });
        }

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
     * Setup mining station buttons
     */
    setupMiningStationButtons(station) {
        const upgradeBtn = document.getElementById('upgradeStation');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', () => {
                this.eventBus.emit('mining:upgradeStation', { stationId: station.id });
            });
        }
        
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

        const icons = {
            'minerals': '⛏️',
            'mineral_collector': '⛏️',
            'data': '💾',
            'data_collector': '💾',
            'artifacts': '🏺',
            'artifact_collector': '🏺',
            'all': '🌟',
            'universal_collector': '🌟'
        };

        // Build visual slot boxes (2 available + 1 greyed/locked)
        const renderSlotBoxes = () => {
            let slotsHtml = '<div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 10px;">';

            // Render available slots (maxSlots)
            for (let i = 0; i < maxSlots; i++) {
                const isEquipped = i < usedSlots;
                const equipment = isEquipped ? equipmentArray[i] : null;
                const icon = equipment ? (icons[equipment.type] || '❓') : '';

                if (isEquipped) {
                    // Filled slot with equipment icon
                    slotsHtml += `
                        <div style="
                            width: 44px;
                            height: 44px;
                            border: 2px solid #0f8;
                            border-radius: 6px;
                            background: rgba(0,255,128,0.15);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 0 8px rgba(0,255,128,0.3);
                        " title="${equipment.name || 'Equipment'}">
                            <span style="font-size: 22px;">${icon}</span>
                        </div>
                    `;
                } else {
                    // Empty available slot
                    slotsHtml += `
                        <div style="
                            width: 44px;
                            height: 44px;
                            border: 2px dashed #0f8;
                            border-radius: 6px;
                            background: rgba(0,255,128,0.05);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        " title="Empty slot">
                            <span style="color: #0f8; font-size: 18px; opacity: 0.5;">+</span>
                        </div>
                    `;
                }
            }

            // Add locked 3rd slot (greyed out)
            slotsHtml += `
                <div style="
                    width: 44px;
                    height: 44px;
                    border: 2px dashed #333;
                    border-radius: 6px;
                    background: rgba(50,50,50,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.5;
                " title="Locked - expand via Uplink protocols">
                    <span style="color: #666; font-size: 14px;">🔒</span>
                </div>
            `;

            slotsHtml += '</div>';
            return slotsHtml;
        };

        // If no auto-collector research, show locked message but still display slots
        if (!hasAnyAutoCollector) {
            return `
                <div style="border: 1px solid #444; border-radius: 5px; padding: 10px; margin-top: 12px; background: rgba(100,100,100,0.1);">
                    <div style="color: #666; font-weight: bold; font-size: 12px; margin-bottom: 8px; text-align: center;">
                        🔧 EQUIPMENT SLOTS
                    </div>
                    ${renderSlotBoxes()}
                    <div style="color: #888; font-size: 11px; text-align: center; padding: 5px;">
                        Decode the Harvest Lattice protocol at the Uplink to unlock equipment
                    </div>
                </div>
            `;
        }

        return `
            <div style="border: 1px solid #444; border-radius: 5px; padding: 10px; margin-top: 12px; background: rgba(0,255,128,0.02);">
                <div style="color: #0f8; font-weight: bold; font-size: 12px; margin-bottom: 8px; text-align: center;">
                    🔧 EQUIPMENT SLOTS
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
        const equipmentIcons = {
            'mineral_collector': '⛏️',
            'data_collector': '💾',
            'artifact_collector': '🏺',
            'universal_collector': '🌟'
        };

        if (typeof EQUIPMENT_TYPES !== 'undefined') {
            Object.values(EQUIPMENT_TYPES).forEach(eq => {
                if (this.gameState.hasProtocol(eq.requiredProtocol)) {
                    equipmentTypes.push({
                        ...eq,
                        icon: equipmentIcons[eq.id] || '❓'
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
            background: rgba(0,0,0,0.8);
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
                slotIndicators.push('<span style="color: #0f8;">[X]</span>');
            } else {
                slotIndicators.push('<span style="color: #444;">[ ]</span>');
            }
        }

        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 2px solid #0f8; border-radius: 10px; padding: 20px; max-width: 450px; width: 90%;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="color: #0f8; margin: 0;">🔧 Manage Equipment</h3>
                    <button id="closeEquipmentModal" style="background: none; border: none; color: #888; font-size: 20px; cursor: pointer;">&times;</button>
                </div>

                <div style="color: #888; font-size: 12px; margin-bottom: 15px;">
                    Probe ${probe.id} | Slots: ${slotIndicators.join(' ')} (${usedSlots}/${maxSlots}) | Minerals: ${resources.minerals}
                </div>

                ${usedSlots > 0 ? `
                    <div style="background: rgba(0,255,128,0.1); border: 1px solid rgba(0,255,128,0.3); border-radius: 5px; padding: 12px; margin-bottom: 15px;">
                        <div style="color: #0f8; font-weight: bold; margin-bottom: 8px;">Currently Equipped:</div>
                        ${equippedItems.map(eq => {
                            const icon = equipmentIcons[eq.type] || '❓';
                            return `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid rgba(0,255,128,0.2);">
                                    <div style="color: #fff;">
                                        <span style="font-size: 16px;">${icon}</span>
                                        <span style="margin-left: 8px;">${eq.name || eq.type}</span>
                                    </div>
                                    <button class="control-btn remove-equipment-btn" data-equipment-type="${eq.type}" style="font-size: 10px; padding: 4px 8px; background: rgba(255,68,68,0.2); border-color: #f44;">
                                        Remove
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                ` : ''}

                <div style="color: #0ff; font-weight: bold; margin-bottom: 10px;">Available Equipment:</div>

                <div style="max-height: 250px; overflow-y: auto;">
                    ${equipmentTypes.map(eq => {
                        const canAfford = resources.minerals >= eq.cost;
                        const alreadyEquipped = equippedTypes.has(eq.id);
                        const hasSlots = slotsAvailable >= eq.slotsRequired;
                        const canEquip = canAfford && !alreadyEquipped && hasSlots;

                        let statusMessage = '';
                        if (alreadyEquipped) {
                            statusMessage = '<div style="color: #0f8; font-size: 10px; margin-top: 3px;">Already equipped</div>';
                        } else if (!canAfford) {
                            statusMessage = '<div style="color: #f44; font-size: 10px; margin-top: 3px;">Insufficient minerals</div>';
                        } else if (!hasSlots) {
                            statusMessage = '<div style="color: #ff0; font-size: 10px; margin-top: 3px;">No slots available</div>';
                        }

                        return `
                            <div style="background: rgba(0,255,255,0.05); border: 1px solid ${canEquip ? 'rgba(0,255,255,0.3)' : 'rgba(100,100,100,0.3)'}; border-radius: 5px; padding: 10px; margin-bottom: 8px; opacity: ${canEquip ? 1 : 0.6};">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <span style="font-size: 18px;">${eq.icon}</span>
                                        <span style="color: ${canEquip ? '#0ff' : '#888'}; font-weight: bold; margin-left: 8px;">${eq.name}</span>
                                        <span style="color: #666; font-size: 10px; margin-left: 5px;">(${eq.slotsRequired} slot)</span>
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
                                <div style="color: #888; font-size: 11px; margin-top: 5px;">${eq.description}</div>
                                ${statusMessage}
                            </div>
                        `;
                    }).join('')}
                </div>

                ${equipmentTypes.length === 0 ? `
                    <div style="color: #888; text-align: center; padding: 20px;">
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
        let statusColor = '#0f0';
        let warningText = '';
        let speedMod = 100;
        
        if (cargoPercent >= 100) {
            statusText = '🚨 CARGO FULL!';
            statusColor = '#f00';
            warningText = 'Return to hub or cannot collect more signals';
            speedMod = 50;
        } else if (cargoPercent >= 90) {
            statusText = '🔴 Almost full!';
            statusColor = '#ff4400';
            warningText = 'May not fit next signal';
            speedMod = 60;
        } else if (cargoPercent >= 75) {
            statusText = '⚠️ Nearly full!';
            statusColor = '#ffa500';
            warningText = 'Consider returning soon';
            speedMod = 75;
        } else if (cargoPercent >= 50) {
            statusText = '⚠️ Getting full';
            statusColor = '#ffaa00';
            warningText = `Speed reduced to ${speedMod}%`;
            speedMod = 90;
        }
        
        return `
            <div style="border: 1px solid #444; border-radius: 5px; padding: 10px; margin-top: 12px; background: rgba(0,255,255,0.02);">
                <div style="color: #0ff; font-weight: bold; margin-bottom: 8px; font-size: 12px;">
                    📦 CARGO: ${cargoUsed} / ${cargoCapacity}
                </div>
                <div style="background: #222; height: 20px; border-radius: 3px; overflow: hidden; margin-bottom: 10px; border: 1px solid #444;">
                    <div style="background: linear-gradient(90deg, #0ff, #0aa); height: 100%; width: ${cargoPercent}%; transition: width 0.3s ease;"></div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px; color: #aaa; margin-bottom: 10px;">
                    <div>Minerals: ${probe.cargo.minerals || 0}</div>
                    <div>Data: ${probe.cargo.data || 0}</div>
                    <div>Artifacts: ${probe.cargo.artifacts || 0}</div>
                    <div>Exotic: ${probe.cargo.exoticMinerals || 0}</div>
                </div>
                ${cargoPercent >= 50 ? `
                    <div style="margin-top: 10px; padding: 8px; background: rgba(255,100,0,0.15); border-radius: 3px; border: 1px solid rgba(255,100,0,0.3);">
                        <div style="color: ${statusColor}; font-weight: bold; font-size: 11px; margin-bottom: 3px;">${statusText}</div>
                        ${warningText ? `<div style="color: #aaa; font-size: 10px;">${warningText}</div>` : ''}
                        ${cargoPercent >= 50 ? `<div style="color: #aaa; font-size: 10px; margin-top: 3px;">Speed: ${speedMod}%</div>` : ''}
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
            { id: 'default', name: 'Default', color: '#00ffff' },
            ...ownedSkins
        ];
        
        return `
            <div style="border: 1px solid #444; border-radius: 5px; padding: 10px; margin-top: 12px; background: rgba(148,0,211,0.02);">
                <div style="color: #9400d3; font-weight: bold; margin-bottom: 8px; font-size: 12px;">
                    🎨 PROBE SKIN
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
                                    border: 2px solid ${isSelected ? '#9400d3' : (isDefault ? '#666' : skin.color)};
                                    border-radius: 5px;
                                    background: ${isDefault ? '#222' : skin.color + '22'};
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    position: relative;
                                    opacity: ${isDefault ? 0.5 : 1};
                                    box-shadow: ${isSelected ? '0 0 10px ' + (isDefault ? '#9400d3' : skin.color) : 'none'};
                                "
                                title="${skin.name}"
                            >
                                ${isSelected ? '<div style="color: #fff; font-size: 20px;">✓</div>' : ''}
                                <div style="position: absolute; bottom: 2px; width: 100%; height: 4px; background: ${isDefault ? '#666' : skin.color}; opacity: 0.5;"></div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div style="color: #888; font-size: 10px; margin-top: 8px;">
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