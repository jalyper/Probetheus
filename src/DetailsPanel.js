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
    }
    
    setupEventListeners() {
        // Close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }
        
        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.panel.style.display !== 'none') {
                this.hide();
            }
        });
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
        this.icon.textContent = '🏗️';
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
                    <button id="deployFromHub" class="control-btn" style="font-size: 12px; padding: 8px 12px; width: 100%;">
                        🚀 Deploy Probe
                    </button>
                    <button id="buildProbeForHub" class="control-btn" style="font-size: 12px; padding: 8px 12px; width: 100%;">
                        🛠️ Build Probe (25M)
                    </button>
                    <button id="buildMiningBtn" class="control-btn" style="font-size: 12px; padding: 8px 12px; width: 100%;">
                        ⛏️ Build Mining Station (100M, 50D)
                    </button>
                    <button id="buildShuttleBtn" class="control-btn" style="font-size: 12px; padding: 8px 12px; width: 100%;">
                        🚀 Build Shuttle (50M, 25D)
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
        this.icon.textContent = '⛏️';
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
                <button id="upgradeStation" class="control-btn" style="font-size: 12px; padding: 8px 12px; width: 100%;" ${station.level >= 3 ? 'disabled' : ''}>
                    ⬆️ Upgrade Station (${50 * (station.level + 1)}M, ${20 * (station.level + 1)}D)
                </button>
            </div>
            
            <div style="color: #666; font-size: 10px; margin-top: 8px; line-height: 1.3;">
                ${!station.active ? '⚠️ Station needs resources to operate' : '✅ Station is producing Probetheum'}
            </div>
        `;
        
        // Add button listeners
        this.setupMiningStationButtons(station);
    }
    
    /**
     * Show probe details
     */
    showProbeDetails(probe) {
        this.icon.textContent = '🛸';
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
        this.icon.textContent = '🚀';
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