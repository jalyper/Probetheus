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
            
            ${this.renderCargoSection(probe)}
            ${this.renderSkinSelector(probe)}
        `;
        
        // Add probe control listeners
        this.setupProbeButtons(probe);
        this.setupSkinSelectors(probe);
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