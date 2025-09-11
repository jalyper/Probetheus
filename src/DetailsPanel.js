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
                    case 'm':
                        e.preventDefault();
                        this.triggerButtonClick('buildMiningBtn');
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
        if (!this.panel || !this.icon || !this.title || !this.content) {
            console.warn('DetailsPanel: Cannot show details, DOM elements not initialized');
            return;
        }
        
        const { entity, type } = data;
        this.currentEntity = entity;
        this.currentEntityType = type;
        
        // Update panel based on entity type
        switch(type) {
            case 'hub':
                this.showHubDetails(entity);
                break;
            case 'probe':
                this.showProbeDetails(entity);
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
        
        this.content.innerHTML = `
            <div style="background: rgba(0,255,128,0.05); border: 1px solid rgba(0,255,128,0.2); border-radius: 5px; padding: 10px; margin-bottom: 12px;">
                <div style="color: #0f8; font-size: 12px; font-weight: bold; margin-bottom: 6px;">📍 Hub Status</div>
                <div style="color: #ccc; font-size: 12px; line-height: 1.6;">
                    <div>ID: ${hub.id || 'Unknown'}</div>
                    <div>Position: (${Math.round(hub.x)}, ${Math.round(hub.y)})</div>
                    <div>Probes: ${probeCount}/${maxProbes}</div>
                    <div>Sector: [${hub.sectorX || 0}, ${hub.sectorY || 0}]</div>
                </div>
            </div>
            
            <div style="background: rgba(200,150,255,0.05); border: 1px solid rgba(200,150,255,0.2); border-radius: 5px; padding: 10px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                    <div style="font-size: 16px;">⚡</div>
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
                    <button id="buildMiningBtn" class="control-btn" style="font-size: 12px; padding: 8px 12px; width: 100%; display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink: 0;">
                            <!-- Octagonal mining station -->
                            <polygon points="8,2 11.3,3.7 13,7 11.3,10.3 8,12 4.7,10.3 3,7 4.7,3.7" fill="#aaa" stroke="#666" stroke-width="1"/>
                            <!-- Inner cross pattern -->
                            <line x1="5" y1="7" x2="11" y2="7" stroke="#666" stroke-width="0.8"/>
                            <line x1="8" y1="4" x2="8" y2="10" stroke="#666" stroke-width="0.8"/>
                            <!-- Diagonal lines -->
                            <line x1="6" y1="5" x2="10" y2="9" stroke="#666" stroke-width="0.8"/>
                            <line x1="10" y1="5" x2="6" y2="9" stroke="#666" stroke-width="0.8"/>
                        </svg>
                        <span style="text-decoration: underline;">M</span>ining Station (100M, 50D)
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
                </div>
            </div>
        `;
        
        // Add button listeners
        this.setupHubButtons(hub);
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
        const productionRate = station.active ? '0.001' : '0';
        
        // Get mining station type data
        const miningManager = this.gameState.miningManager;
        const fullStationType = miningManager ? miningManager.getStationTypes()[station.type] : null;
        
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
                    <div>Probetheum/min: ${productionRate}</div>
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
            
            <div style="color: #666; font-size: 10px; margin-top: 8px; line-height: 1.3;">
                ${!station.active ? '⚠️ Station needs resources to operate' : '✅ Station is producing Probetheum'}
            </div>
        `;
        
        // Add button listeners
        this.setupMiningStationButtons(station);
        
        // Update button states based on resources
        this.updateMiningStationButtonStates(station);
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
            
            ${probe.cargo && Object.keys(probe.cargo).length > 0 ? `
            <div style="background: rgba(255,255,0,0.05); border: 1px solid rgba(255,255,0,0.2); border-radius: 5px; padding: 10px;">
                <div style="color: #ff0; font-size: 12px; font-weight: bold; margin-bottom: 6px;">📦 Cargo</div>
                <div style="color: #ccc; font-size: 11px;">
                    ${Object.entries(probe.cargo).map(([res, amt]) => 
                        `<div>• ${res}: ${amt}</div>`
                    ).join('')}
                </div>
            </div>` : ''}
        `;
        
        // Add probe control listeners
        this.setupProbeButtons(probe);
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
        
        // Build Probe button (25 minerals)
        const buildProbeBtn = document.getElementById('buildProbeForHub');
        if (buildProbeBtn) {
            const canAfford = resources.minerals >= 25;
            const atCapacity = this.getActiveProbeCount(hub) >= hub.maxProbes;
            
            buildProbeBtn.classList.toggle('resource-button', true);
            buildProbeBtn.classList.toggle('insufficient', !canAfford || atCapacity);
            buildProbeBtn.disabled = !canAfford || atCapacity;
        }
        
        // Build Mining Station button (100 minerals, 50 data)
        const buildMiningBtn = document.getElementById('buildMiningBtn');
        if (buildMiningBtn) {
            const canAfford = resources.minerals >= 100 && resources.data >= 50;
            
            buildMiningBtn.classList.toggle('resource-button', true);
            buildMiningBtn.classList.toggle('insufficient', !canAfford);
            buildMiningBtn.disabled = !canAfford;
        }
        
        // Build Shuttle button (50 minerals, 25 data)
        const buildShuttleBtn = document.getElementById('buildShuttleBtn');
        if (buildShuttleBtn) {
            const canAfford = resources.minerals >= 50 && resources.data >= 25;
            
            buildShuttleBtn.classList.toggle('resource-button', true);
            buildShuttleBtn.classList.toggle('insufficient', !canAfford);
            buildShuttleBtn.disabled = !canAfford;
        }
    }
    
    /**
     * Get active probe count for hub (helper method)
     */
    getActiveProbeCount(hub) {
        return this.gameState.entities.probes.filter(probe => 
            probe.hubId === hub.id && probe.status !== 'destroyed'
        ).length;
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
        
        // Update button states based on resources
        this.updateButtonStates(hub);
        
        // Mining station button
        const buildMiningBtn = document.getElementById('buildMiningBtn');
        if (buildMiningBtn) {
            buildMiningBtn.addEventListener('click', () => {
                // Get game controller reference
                const gameController = window.game;
                if (gameController && gameController.buildingSystem) {
                    gameController.buildingSystem.enterBuildingMode({
                        structureType: 'miningFacility',
                        probe: null
                    });
                    
                    const canvas = document.getElementById('galaxyCanvas');
                    if (canvas) canvas.style.cursor = 'crosshair';
                    
                    const probeStatus = document.getElementById('probeStatus');
                    if (probeStatus) {
                        probeStatus.textContent = 'Click along exploration routes to place mining station...';
                    }
                    
                    this.hide(); // Close details panel
                }
            });
        }
        
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