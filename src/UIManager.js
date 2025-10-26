/**
 * UI Manager
 * Handles all user interface interactions and updates
 */
class UIManager {
    constructor(gameState, eventBus, probeManager, buildingSystem) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.probeManager = probeManager;
        this.buildingSystem = buildingSystem;
        
        // Cache DOM elements
        this.elements = {
            probeDetailPanel: document.getElementById('probeDetailPanel'),
            probeBuildingPanel: document.getElementById('probeBuildingPanel'),
            probeBuildingStatus: document.getElementById('probeBuildingStatus'),
            patrolModeCheckbox: document.getElementById('patrolModeCheckbox'),
            cameraLockCheckbox: document.getElementById('cameraLockCheckbox'),
            closeProbeDetail: document.getElementById('closeProbeDetail'),
            buildPathHubBtnProbe: document.getElementById('buildPathHubBtnProbe')
        };

        this.setupEventListeners();
        
        // Listen for game events
        this.eventBus.on('ui:probeSelected', this.showProbeDetails.bind(this));
        this.eventBus.on('ui:update', this.updateUI.bind(this));
        this.eventBus.on('ui:message', this.showMessage.bind(this));
        this.eventBus.on('ui:buildingModeChanged', this.onBuildingModeChanged.bind(this));
        this.eventBus.on('probe:statusChanged', this.updateProbePanel.bind(this));
        this.eventBus.on('ui:probeDestroyed', this.onProbeDestroyed.bind(this));
        this.eventBus.on('research:milestone', this.onMilestoneAchieved.bind(this));
        this.eventBus.on('research:pointAwarded', this.onResearchPointAwarded.bind(this));
    }

    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        // Close probe detail panel
        this.elements.closeProbeDetail.addEventListener('click', () => {
            this.hideProbeDetails();
        });

        // Patrol mode toggle
        this.elements.patrolModeCheckbox.addEventListener('change', (e) => {
            const selectedProbe = this.gameState.ui.selectedProbe;
            if (selectedProbe) {
                selectedProbe.patrolMode = e.target.checked;
                this.eventBus.emit('ui:update');
            }
        });

        // Camera lock toggle
        this.elements.cameraLockCheckbox.addEventListener('change', (e) => {
            const selectedProbe = this.gameState.ui.selectedProbe;
            if (selectedProbe) {
                this.gameState.ui.cameraLocked = e.target.checked;
                this.gameState.ui.lockedProbe = e.target.checked ? selectedProbe : null;
                this.eventBus.emit('camera:lockToggled', {
                    locked: e.target.checked,
                    probe: selectedProbe
                });
            }
        });

        // Building buttons in probe detail panel
        this.elements.buildPathHubBtnProbe.addEventListener('click', () => {
            this.startBuildingForProbe('reconHub');
        });
        
        // Add mining facility button handler
        const buildPathMiningBtn = document.getElementById('buildPathMiningBtnProbe');
        if (buildPathMiningBtn) {
            buildPathMiningBtn.addEventListener('click', () => {
                this.startBuildingForProbe('miningFacility');
            });
        }
    }

    /**
     * Show probe details panel
     */
    showProbeDetails(data) {
        const { probe } = data;
        if (!probe) return;

        // Lock camera to probe by default when selecting
        this.gameState.ui.cameraLocked = true;
        this.gameState.ui.lockedProbe = probe;
        this.eventBus.emit('camera:lockToggled', {
            locked: true,
            probe: probe
        });

        // Update probe detail content
        this.updateProbeDetailContent(probe);
        
        // Show the panel
        this.elements.probeDetailPanel.style.display = 'block';
        
        // Update panel position
        this.updateProbeDetailPanelPosition(probe);
        
        // Show building panel if probe has a path
        this.updateBuildingPanel(probe);
    }

    /**
     * Hide probe details panel
     */
    hideProbeDetails() {
        this.elements.probeDetailPanel.style.display = 'none';
        this.gameState.ui.selectedProbe = null;
        
        // Unlock camera when closing probe details
        this.gameState.ui.cameraLocked = false;
        this.gameState.ui.lockedProbe = null;
        this.eventBus.emit('camera:lockToggled', {
            locked: false,
            probe: null
        });
        
        // Exit building mode if active
        if (this.buildingSystem.isBuildingMode()) {
            this.buildingSystem.exitBuildingMode();
        }
    }

    /**
     * Update probe detail panel content
     */
    updateProbeDetailContent(probe) {
        // Update status text
        const statusText = document.getElementById('probeStatusText');
        if (statusText) {
            statusText.textContent = this.getProbeStatusText(probe);
        }

        // Update patrol mode checkbox (defaults to true if not set)
        this.elements.patrolModeCheckbox.checked = probe.patrolMode !== false;
        
        // Update camera lock checkbox
        this.elements.cameraLockCheckbox.checked = 
            this.gameState.ui.cameraLocked && 
            this.gameState.ui.lockedProbe === probe;

        // Update equipment display
        this.updateEquipmentDisplay(probe);
    }

    /**
     * Update building panel visibility and buttons
     */
    updateBuildingPanel(probe) {
        const hasPath = probe.waypoints && probe.waypoints.length > 0;
        
        if (hasPath) {
            this.elements.probeBuildingPanel.style.display = 'block';
            this.updateBuildingButtons();
        } else {
            this.elements.probeBuildingPanel.style.display = 'none';
        }
    }

    /**
     * Update building button states
     */
    updateBuildingButtons() {
        const resources = this.gameState.getResources();
        
        // Hub button
        const canBuildHub = resources.minerals >= 100;
        this.elements.buildPathHubBtnProbe.disabled = !canBuildHub;
        this.elements.buildPathHubBtnProbe.classList.toggle('disabled', !canBuildHub);
        
        // Mining facility button  
        const buildPathMiningBtn = document.getElementById('buildPathMiningBtnProbe');
        if (buildPathMiningBtn) {
            const canBuildMining = resources.minerals >= 100 && resources.data >= 50;
            buildPathMiningBtn.disabled = !canBuildMining;
            buildPathMiningBtn.classList.toggle('disabled', !canBuildMining);
        }
    }

    /**
     * Start building mode for selected probe
     */
    startBuildingForProbe(structureType) {
        const selectedProbe = this.gameState.ui.selectedProbe;
        if (!selectedProbe) return;

        this.buildingSystem.enterBuildingMode({
            structureType,
            probe: selectedProbe
        });
    }

    /**
     * Update probe detail panel position
     */
    updateProbeDetailPanelPosition(probe) {
        if (!probe || !this.elements.probeDetailPanel) return;

        const world = this.gameState.getWorld();
        
        // Convert world coordinates to screen coordinates
        const screenX = probe.current.x - world.viewOffset.x;
        const screenY = probe.current.y - world.viewOffset.y;
        
        // Position panel to the right of the probe
        const panelWidth = 280;
        const panelX = Math.min(screenX + 50, window.innerWidth - panelWidth - 20);
        const panelY = Math.max(20, Math.min(screenY - 100, window.innerHeight - 400));
        
        this.elements.probeDetailPanel.style.left = panelX + 'px';
        this.elements.probeDetailPanel.style.top = panelY + 'px';
    }

    /**
     * Get probe status text
     */
    getProbeStatusText(probe) {
        let status = '';
        
        if (!probe.waypoints || probe.waypoints.length === 0) {
            status = 'Ready';
        } else if (probe.currentWaypoint < probe.outboundWaypointsCount - 1) {
            status = 'Exploring';
        } else {
            status = 'Returning';
        }
        
        // Add damage indicator
        if (probe.damage > 0) {
            status += ` (${probe.damage}/${probe.maxDamage} DMG)`;
        }
        
        return status;
    }

    /**
     * Update equipment display
     */
    updateEquipmentDisplay(probe) {
        const equipmentSlot = document.getElementById('equipmentSlot');
        const equipmentInfo = document.getElementById('equipmentInfo');
        const equipmentActions = document.getElementById('equipmentActions');
        
        if (probe.equipment) {
            // Show equipped auto-collector
            equipmentSlot.innerHTML = '<span style="color: #0ff; font-size: 16px;">🤖</span>';
            equipmentSlot.style.borderColor = '#0ff';
            equipmentSlot.style.background = 'rgba(0,255,255,0.1)';
            equipmentSlot.title = probe.equipment.name;
            
            if (equipmentInfo) {
                const collectionIcons = this.getCollectionTypeIcons(probe.equipment.collectionTypes);
                equipmentInfo.innerHTML = `
                    <div style="color: #0ff; font-weight: bold; margin-bottom: 4px;">${probe.equipment.name}</div>
                    <div style="color: #aaa; font-size: 10px; margin-bottom: 4px;">Collecting: ${collectionIcons}</div>
                    ${probe.equipment.availableTypes.length > 1 ? '<div style="color: #888; font-size: 9px;">Click icons to toggle</div>' : ''}
                `;
            }
            
            if (equipmentActions) {
                equipmentActions.innerHTML = `
                    <button class="control-btn" style="font-size: 11px; padding: 6px 12px; background: #822;" 
                            onclick="game.removeEquipment('${probe.id}')" 
                            title="Remove this equipment from the probe">
                        🗑️ Remove Equipment
                    </button>
                `;
            }
        } else {
            // Show empty slot
            equipmentSlot.innerHTML = '<span style="color: #444; font-size: 12px;">Empty</span>';
            equipmentSlot.style.borderColor = '#444';
            equipmentSlot.style.background = 'rgba(0,0,0,0.3)';
            equipmentSlot.title = 'No equipment installed';
            
            if (equipmentInfo) {
                equipmentInfo.textContent = 'No equipment installed';
            }
            
            if (equipmentActions) {
                // Check if auto-collection research is unlocked
                const research = this.gameState.getResearchSystem();
                const hasAutoCollection = research.researched.has('auto_minerals') || 
                                        research.researched.has('auto_data') || 
                                        research.researched.has('auto_artifacts');
                
                if (hasAutoCollection) {
                    const resources = this.gameState.getResources();
                    const canAfford = resources.minerals >= 25;
                    
                    equipmentActions.innerHTML = `
                        <button class="control-btn" style="font-size: 11px; padding: 6px 12px; ${!canAfford ? 'opacity: 0.5; cursor: not-allowed; background: #333; color: #666;' : ''}" 
                                onclick="window.uiManager.equipAutoCollector('${probe.id}')" 
                                ${!canAfford ? 'disabled' : ''}
                                title="${canAfford ? 'Craft and equip Auto-Collector for automatic signal collection' : 'Need 25 Minerals to craft'}">
                            🤖 Craft Auto-Collector (25M)
                        </button>
                    `;
                } else {
                    equipmentActions.innerHTML = '<div style="color: #666; font-size: 10px; text-align: center; line-height: 1.3;">Research Auto-Collect technology to unlock equipment</div>';
                }
            }
        }
    }

    /**
     * Get equipment description
     */
    getEquipmentDescription(equipment) {
        if (!equipment) return 'No equipment installed';
        
        const types = [];
        if (equipment.collectMinerals) types.push('Minerals');
        if (equipment.collectData) types.push('Data');
        if (equipment.collectArtifacts) types.push('Artifacts');
        
        return `Auto-Collector: ${types.join(', ')}`;
    }

    /**
     * Handle building mode changes
     */
    onBuildingModeChanged(data) {
        const { active, structureType } = data;
        
        if (active) {
            this.elements.probeBuildingStatus.textContent = 
                `Building mode: ${structureType}. Click along path to place.`;
        } else {
            this.elements.probeBuildingStatus.textContent = '';
        }
    }

    /**
     * Show a message to the user
     */
    showMessage(data) {
        const { text, type } = data;
        console.log(`[${type}] ${text}`);
        
        // You could implement a toast notification system here
        // For now, we'll use the existing status display
        const statusElement = document.getElementById('probeStatus');
        if (statusElement) {
            statusElement.textContent = text;
            setTimeout(() => {
                statusElement.textContent = '';
            }, 2000);
        }
    }

    /**
     * Show alert message in the dedicated alert area
     */
    showAlert(text, type = 'info', duration = 3000) {
        const alertElement = document.getElementById('alertMessages');
        if (!alertElement) return;
        
        // Set color based on type
        const colors = {
            'success': '#0f0',
            'warning': '#ff0', 
            'error': '#f00',
            'info': '#0ff'
        };
        
        alertElement.style.color = colors[type] || colors.info;
        alertElement.textContent = text;
        
        // Add pulsing animation for important alerts
        if (type === 'success' || type === 'warning') {
            alertElement.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                alertElement.style.animation = '';
            }, 500);
        }
        
        // Clear alert after duration
        setTimeout(() => {
            if (alertElement.textContent === text) { // Only clear if it's still the same message
                alertElement.textContent = '';
            }
        }, duration);
        
        console.log(`[ALERT ${type}] ${text}`);
    }

    /**
     * Update all UI elements
     */
    updateUI() {
        this.updateResourceDisplay();
        this.updateProbeCountDisplay();
        this.updateControlButtons();
        this.updateSectorInfo();
        this.updateProbePanel();
        this.checkResearchUnlock();
        
        // Update building buttons if probe detail panel is open
        if (this.elements.probeDetailPanel.style.display === 'block') {
            this.updateBuildingButtons();
        }
    }

    /**
     * Update control button states
     */
    updateControlButtons() {
        const selectedHub = this.gameState.ui.selectedHub;
        const resources = this.gameState.getResources();
        
        // Deploy and build probe buttons removed - now handled in hub panel
        
        // Update hub panel
        this.updateHubPanel();
        
        // Build hub button removed - now handled in probe building panel
    }

    /**
     * Update sector information display
     */
    updateSectorInfo() {
        const selectedHub = this.gameState.ui.selectedHub;
        const world = this.gameState.getWorld();
        
        // Find current sector
        const centerX = world.viewOffset.x + window.innerWidth / 2;
        const centerY = world.viewOffset.y + (window.innerHeight - 100) / 2;
        const viewSectorX = Math.floor(centerX / world.standardSectorWidth);
        const viewSectorY = Math.floor(centerY / world.standardSectorHeight);
        
        const sector = world.sectors.get(`${viewSectorX},${viewSectorY}`);
        let sectorText = '';
        
        if (sector && sector.explored) {
            sectorText = `${sector.name}`;
        } else {
            sectorText = `Unexplored Space [${viewSectorX}, ${viewSectorY}]`;
        }
        
        // Add hub info if selected
        if (selectedHub) {
            const readyCount = this.probeManager.getReadyProbeCountForHub(selectedHub);
            sectorText += ` | Hub: ${readyCount}/${selectedHub.maxProbes}`;
        }
        
        document.getElementById('sectorInfo').textContent = sectorText;
    }

    /**
     * Update resource display in header
     */
    updateResourceDisplay() {
        const resources = this.gameState.getResources();
        const probethium = this.gameState.getProbethium();
        
        document.getElementById('minerals').textContent = resources.minerals;
        document.getElementById('data').textContent = resources.data;
        document.getElementById('artifacts').textContent = resources.artifacts;
        document.getElementById('exoticMinerals').textContent = resources.exoticMinerals;
        
        // Update Probethium display with appropriate precision
        const probethiumElement = document.getElementById('probethium');
        if (probethiumElement) {
            if (probethium.current >= 1) {
                probethiumElement.textContent = probethium.current.toFixed(6);
            } else {
                probethiumElement.textContent = probethium.current.toFixed(10);
            }
        }
    }

    /**
     * Update probe count display
     */
    updateProbeCountDisplay() {
        const entities = this.gameState.getEntities();
        const totalProbes = entities.reconHubs.reduce(
            (sum, hub) => sum + this.probeManager.getActiveProbeCountForHub(hub), 
            0
        );
        document.getElementById('probeCount').textContent = totalProbes;
    }

    /**
     * Update probe panel when hub is selected
     */
    updateProbePanel() {
        // Note: This method is kept for compatibility but probePanel no longer exists
        // Probe details are now handled by the DetailsPanel system
        const panel = document.getElementById('probePanel');
        const probeList = document.getElementById('probeList');
        
        // If old panel doesn't exist, skip this update
        if (!panel) return;
        const buildingPanel = document.getElementById('buildingPanel'); // This might not exist in new version
        
        const selectedHub = this.gameState.ui.selectedHub;
        
        if (!selectedHub) {
            panel.style.display = 'none';
            return;
        }
        
        // Get active probes from this hub (including ready probes)
        const hubProbes = this.gameState.entities.probes.filter(probe => 
            probe.hub && probe.hub.id === selectedHub.id && probe.active
        );
        
        if (hubProbes.length === 0) {
            panel.style.display = 'none';
            return;
        }
        
        panel.style.display = 'block';
        
        // Update probe list
        probeList.innerHTML = '';
        hubProbes.forEach((probe, index) => {
            const probeDiv = document.createElement('div');
            probeDiv.className = 'probe-item';
            probeDiv.style.cssText = `
                padding: 10px 12px;
                border: 2px solid ${probe === this.gameState.ui.selectedProbe ? '#0ff' : 'rgba(0,255,255,0.3)'};
                background: ${probe === this.gameState.ui.selectedProbe ? 'rgba(0,255,255,0.15)' : 'rgba(0,255,255,0.05)'};
                cursor: pointer;
                border-radius: 6px;
                transition: all 0.3s ease;
                font-size: 12px;
                color: #fff;
                box-shadow: ${probe === this.gameState.ui.selectedProbe ? '0 0 15px rgba(0,255,255,0.4)' : '0 0 5px rgba(0,0,0,0.3)'};
                backdrop-filter: blur(2px);
            `;
            
            // Add hover effects
            probeDiv.addEventListener('mouseenter', () => {
                if (probe !== this.gameState.ui.selectedProbe) {
                    probeDiv.style.borderColor = '#0ff';
                    probeDiv.style.background = 'rgba(0,255,255,0.1)';
                    probeDiv.style.boxShadow = '0 0 10px rgba(0,255,255,0.3)';
                }
            });
            
            probeDiv.addEventListener('mouseleave', () => {
                if (probe !== this.gameState.ui.selectedProbe) {
                    probeDiv.style.borderColor = 'rgba(0,255,255,0.3)';
                    probeDiv.style.background = 'rgba(0,255,255,0.05)';
                    probeDiv.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
                }
            });
            
            // Determine status display
            let statusText = 'Ready';
            let statusColor = '#0ff';
            
            if (probe.waypoints && probe.waypoints.length > 0) {
                if (probe.currentWaypoint < probe.outboundWaypointsCount - 1) {
                    statusText = 'Exploring';
                    statusColor = '#0f0';
                } else {
                    statusText = 'Returning';
                    statusColor = '#ff0';
                }
            }
            
            // Check damage status
            const hasDamage = probe.damage > 0;
            
            probeDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 14px;">🛸</span>
                        <span style="font-weight: bold;">Probe ${index + 1}</span>
                    </div>
                    <span style="color: ${statusColor}; font-size: 11px; font-weight: bold; padding: 2px 6px; background: rgba(0,0,0,0.3); border-radius: 3px;">${statusText}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #888;">
                    ${probe.patrolMode ? '<span style="color: #0f8;">🔄 Patrol Mode</span>' : '<span>Manual Control</span>'}
                    ${hasDamage ? `<span style="color: #ff0;">⚠️ ${probe.damage}/${probe.maxDamage} Damage</span>` : '<span style="color: #0f8;">✓ Operational</span>'}
                </div>
            `;
            
            // Add click handler to select probe
            probeDiv.addEventListener('click', () => {
                this.eventBus.emit('probe:select', { probe });
            });
            
            probeList.appendChild(probeDiv);
        });
        
        // Show/hide building panel if it exists in old probe panel
        if (buildingPanel) {
            buildingPanel.style.display = this.gameState.ui.selectedProbe ? 'block' : 'none';
        }
        
        // Show right-click hint during deployment mode
        this.updateProbeListHints(panel);
        
        // Position probe panel dynamically below hub panel
        this.positionProbePanel();
    }

    /**
     * Update hints in probe panel
     */
    updateProbeListHints(panel) {
        // Remove existing hint
        const existingHint = panel.querySelector('.deployment-hint');
        if (existingHint) {
            existingHint.remove();
        }

        let hintHTML = '';
        if (this.gameState.ui.deployMode) {
            hintHTML = '<div style="color: #888; font-size: 10px; margin-top: 8px; text-align: center;">Right-click to cancel deployment</div>';
        } else if (this.buildingSystem.isBuildingMode()) {
            hintHTML = '<div style="color: #888; font-size: 10px; margin-top: 8px; text-align: center;">Right-click to cancel building</div>';
        }
        
        if (hintHTML) {
            const hintDiv = document.createElement('div');
            hintDiv.className = 'deployment-hint';
            hintDiv.innerHTML = hintHTML;
            panel.appendChild(hintDiv);
        }
    }

    /**
     * Update hub panel when hub is selected
     */
    updateHubPanel() {
        // Note: This method is kept for compatibility but hubPanel no longer exists
        // Hub details are now handled by the DetailsPanel system
        const hubPanel = document.getElementById('hubPanel');
        const hubInfo = document.getElementById('hubInfo');
        
        // If old panel doesn't exist, skip this update
        if (!hubPanel) return;
        
        const selectedHub = this.gameState.ui.selectedHub;
        const resources = this.gameState.getResources();
        
        if (!selectedHub) {
            hubPanel.style.display = 'none';
            return;
        }
        
        hubPanel.style.display = 'block';
        
        // Update hub info with more detailed vertical layout
        const readyCount = this.probeManager.getReadyProbeCountForHub(selectedHub);
        const totalCount = this.probeManager.getActiveProbeCountForHub(selectedHub);
        const hubStations = this.gameState.mining && this.gameState.mining.stations ? 
            this.gameState.mining.stations.filter(s => s.hubId === selectedHub.id).length : 0;
        const hubShuttles = this.gameState.mining && this.gameState.mining.shuttles ?
            this.gameState.mining.shuttles.filter(s => s.hubId === selectedHub.id).length : 0;
        
        hubInfo.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Ready Probes:</span>
                <span style="color: #0ff;">${readyCount}/${selectedHub.maxProbes}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Active Probes:</span>
                <span style="color: #0ff;">${totalCount}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Mining Stations:</span>
                <span style="color: #c9f;">${hubStations}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Shuttles:</span>
                <span style="color: #c9f;">${hubShuttles}</span>
            </div>
        `;
        
        // Update mining station button
        const buildMiningBtn = document.getElementById('buildMiningBtn');
        const canBuildMining = resources.minerals >= 100 && resources.data >= 50;
        buildMiningBtn.disabled = !canBuildMining;
        buildMiningBtn.classList.toggle('disabled', !canBuildMining);
        
        // Update shuttle button
        const buildShuttleBtn = document.getElementById('buildShuttleBtn');
        const hasStations = this.gameState.mining && this.gameState.mining.stations && this.gameState.mining.stations.length > 0;
        const canBuildShuttle = hasStations && resources.minerals >= 50 && resources.data >= 25;
        buildShuttleBtn.disabled = !canBuildShuttle;
        buildShuttleBtn.classList.toggle('disabled', !canBuildShuttle);
        
        // Position probe panel dynamically below hub panel
        this.positionProbePanel();
    }

    /**
     * Position probe panel dynamically based on hub panel height
     */
    positionProbePanel() {
        // Note: This method is kept for compatibility but panels are now handled by DetailsPanel system
        // Old panels are positioned at fixed locations to avoid conflicts
        return;
    }

    /**
     * Check if research should be unlocked based on having research points
     */
    checkResearchUnlock() {
        const research = this.gameState.getResearchSystem();
        
        // Always ensure unlocked trees are set if research is unlocked
        if (research.unlocked && research.unlockedTrees.length === 0) {
            console.log('Research is unlocked but trees are not set, fixing...');
            research.unlockedTrees = ['collection', 'probe', 'alien'];
        }
        
        // Check if research should be unlocked (player has at least 1 research point)
        if (!research.unlocked && research.points > 0) {
            research.unlocked = true;
            
            // Unlock ALL three trees at once
            research.unlockedTrees = ['collection', 'probe', 'alien'];
            
            // Auto-research all three root nodes
            const rootNodes = ['collection', 'probe_tech', 'alien_tech'];
            rootNodes.forEach(rootId => {
                const rootNode = research.tree[rootId];
                if (rootNode && !rootNode.researched) {
                    rootNode.researched = true;
                    research.researched.add(rootId);
                    
                    // Unlock children
                    if (rootNode.children) {
                        rootNode.children.forEach(childId => {
                            const childNode = research.tree[childId];
                            if (childNode) childNode.available = true;
                        });
                    }
                    console.log(`Auto-researched root node: ${rootId}`);
                }
            });
            
            // Show research button
            const researchBtn = document.getElementById('researchBtn');
            if (researchBtn) {
                researchBtn.style.display = 'inline-block';
            }
            
            // Show research unlocked message and automatically open research modal
            this.showResearchUnlockModal();
            console.log('Research system unlocked! All three trees and root nodes are now available.');
        }
        
        // Ensure research button is visible if research is already unlocked (e.g., after loading save)
        if (research.unlocked) {
            const researchBtn = document.getElementById('researchBtn');
            if (researchBtn) {
                researchBtn.style.display = 'inline-block';
                console.log('Research already unlocked, ensuring button is visible');
            }
        }
    }


    /**
     * Animate research points display
     */
    animateResearchPoints() {
        const researchPointsElement = document.getElementById('researchPoints');
        if (researchPointsElement) {
            researchPointsElement.textContent = this.gameState.getResearchSystem().points;
            // Add visual flourish
            researchPointsElement.style.animation = 'none';
            setTimeout(() => {
                researchPointsElement.style.animation = 'pulse 0.5s ease-in-out';
            }, 10);
        }
    }

    /**
     * Handle milestone achievement event
     */
    onMilestoneAchieved(data) {
        const { resourceType, threshold } = data;
        
        // Update research points display
        this.animateResearchPoints();
        
        // Check if research should be unlocked (first research point)
        this.checkResearchUnlock();
        
        // Update UI to show new research points
        this.updateUI();
        
        console.log(`Milestone event handled: ${resourceType} ${threshold}`);
    }

    /**
     * Handle research point awarded event
     */
    onResearchPointAwarded(data) {
        const { source } = data;
        
        // Update research points display
        this.animateResearchPoints();
        
        // Show alert for research point earned with context
        let alertText = '🎯 +1 Research Point!';
        if (source === 'sector_discovery') {
            alertText = '🎯 +1 Research Point! (Sector Discovery)';
        } else if (source === 'milestone') {
            alertText = '🎯 +1 Research Point! (Milestone)';
        } else if (source === 'tree_unlock') {
            alertText = '🎯 +1 Research Point! (New Research Tree)';
        }
        this.showAlert(alertText, 'success');
        
        // Check if research should be unlocked (first research point)
        this.checkResearchUnlock();
        
        // Update UI to show new research points
        this.updateUI();
        
        console.log(`Research point awarded from: ${source}`);
    }

    /**
     * Unlock a specific research tree
     */
    unlockResearchTree(treeType, treeName, treeIcon, isPrimary = true) {
        const research = this.gameState.getResearchSystem();
        
        // Add the tree to unlocked trees
        if (!research.unlockedTrees.includes(treeType)) {
            research.unlockedTrees.push(treeType);
        }
        
        if (!research.unlocked) {
            // First research unlock
            research.unlocked = true;
            research.points = 1; // Award 1 research point for first unlock
            
            // Automatically research the root node of the primary tree
            const rootNodeId = this.getRootNodeId(treeType);
            if (rootNodeId) {
                research.researched.add(rootNodeId);
                const rootNode = research.tree[rootNodeId];
                if (rootNode) {
                    rootNode.researched = true;
                    // Unlock child nodes
                    this.unlockChildNodes(rootNode, research);
                }
                console.log(`Auto-researched root node: ${rootNodeId}`);
            }
            
            const researchBtn = document.getElementById('researchBtn');
            if (researchBtn) {
                researchBtn.style.display = 'inline-block';
            }
            
            console.log(`Research unlocked: ${treeName} tree (${treeType}) - Primary unlock`);
            
            // Show specialized research unlock modal for primary unlock
            this.showResearchUnlockModal(treeType, treeName, treeIcon);
        } else if (!isPrimary) {
            // Additional tree unlock
            research.points += 1; // Award 1 research point for additional tree
            
            // Emit research point awarded event for alert display
            this.eventBus.emit('research:pointAwarded', { source: 'tree_unlock' });
            
            // Automatically research the root node of the additional tree
            const rootNodeId = this.getRootNodeId(treeType);
            if (rootNodeId) {
                research.researched.add(rootNodeId);
                const rootNode = research.tree[rootNodeId];
                if (rootNode) {
                    rootNode.researched = true;
                    // Unlock child nodes
                    this.unlockChildNodes(rootNode, research);
                }
                console.log(`Auto-researched root node: ${rootNodeId}`);
            }
            
            console.log(`Additional research tree unlocked: ${treeName} tree (${treeType})`);
            
            // Show notification for additional tree unlock
            this.eventBus.emit('ui:message', { 
                text: `New Research Tree Unlocked: ${treeName} (+1 RP)`, 
                type: 'success' 
            });
            
            // Optional: Show brief notification modal or update research points display
            const researchPointsElement = document.getElementById('researchPoints');
            if (researchPointsElement) {
                researchPointsElement.textContent = research.points;
                // Add visual flourish
                researchPointsElement.style.animation = 'none';
                setTimeout(() => {
                    researchPointsElement.style.animation = 'pulse 0.5s ease-in-out';
                }, 10);
            }
        }
    }

    /**
     * Get the root node ID for a research tree type
     */
    getRootNodeId(treeType) {
        const treeRootMapping = {
            'collection': 'collection',
            'probe': 'probe_tech',
            'alien': 'alien_tech'
        };
        return treeRootMapping[treeType];
    }

    /**
     * Unlock child nodes when parent is researched
     */
    unlockChildNodes(parentNode, research) {
        if (parentNode.children) {
            parentNode.children.forEach(childId => {
                const childNode = research.tree[childId];
                if (childNode) {
                    // Special case for auto_all which requires all three parents
                    if (childId === 'auto_all') {
                        const requiredParents = ['auto_minerals', 'auto_data', 'auto_artifacts'];
                        const allParentsResearched = requiredParents.every(parentId => 
                            research.researched.has(parentId)
                        );
                        childNode.available = allParentsResearched;
                    } else {
                        childNode.available = true;
                    }
                }
            });
        }
    }

    /**
     * Show research unlock modal
     */
    showResearchUnlockModal() {
        const modal = document.getElementById('researchUnlockModal');
        if (!modal) return;
        
        // Update modal content to show all three trees
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            const descriptions = {
                'collection': {
                    subtitle: 'Automated Resource Collection',
                    description: 'Master the art of automated resource gathering.',
                    icon: '📦',
                    color: '#0ff'
                },
                'probe': {
                    subtitle: 'Advanced Probe Engineering', 
                    description: 'Push the boundaries of probe technology.',
                    icon: '🛸',
                    color: '#4f4'
                },
                'alien': {
                    subtitle: 'Reverse-Engineered Alien Tech',
                    description: 'Unlock the mysteries of alien artifacts.',
                    icon: '👽',
                    color: '#f4f'
                }
            };
            
            modalContent.innerHTML = `
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 48px; margin-bottom: 15px;">🔬</div>
                    <h1 style="color: #0ff; margin: 0 0 10px 0; font-size: 28px; text-shadow: 0 0 20px #0ff80;">
                        RESEARCH LABORATORY
                    </h1>
                    <h2 style="color: #ff0; margin: 0 0 5px 0; font-size: 20px;">UNLOCKED!</h2>
                    <div style="color: #888; font-size: 14px;">Three Specialization Trees Now Available</div>
                </div>
                
                <div style="background: rgba(0,255,255,0.05); border: 1px solid rgba(0,255,255,0.3); border-radius: 10px; padding: 20px; margin-bottom: 25px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                        <div style="color: #0ff; font-size: 16px; font-weight: bold;">🎯 Research Points Awarded</div>
                        <div style="color: #0f0; font-size: 20px; font-weight: bold;">+1 RP</div>
                    </div>
                    <div style="color: #aaa; font-size: 13px; line-height: 1.4;">
                        Your scientific breakthrough has unlocked three distinct research paths. Choose your specializations wisely!
                    </div>
                </div>
                
                <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 15px; margin-bottom: 25px;">
                    <div style="color: #0ff; font-size: 14px; font-weight: bold; margin-bottom: 15px;">Available Research Trees:</div>
                    
                    <!-- Collection Tree -->
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px;">
                        <div style="width: 40px; height: 40px; border: 2px solid ${descriptions.collection.color}; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: ${descriptions.collection.color}20;">
                            <span style="font-size: 16px;">${descriptions.collection.icon}</span>
                        </div>
                        <div style="flex: 1;">
                            <div style="color: #fff; font-size: 13px; font-weight: bold;">Collection Specialization</div>
                            <div style="color: #888; font-size: 11px;">${descriptions.collection.description}</div>
                        </div>
                    </div>
                    
                    <!-- Probe Tree -->
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px;">
                        <div style="width: 40px; height: 40px; border: 2px solid ${descriptions.probe.color}; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: ${descriptions.probe.color}20;">
                            <span style="font-size: 16px;">${descriptions.probe.icon}</span>
                        </div>
                        <div style="flex: 1;">
                            <div style="color: #fff; font-size: 13px; font-weight: bold;">Probe Technology</div>
                            <div style="color: #888; font-size: 11px;">${descriptions.probe.description}</div>
                        </div>
                    </div>
                    
                    <!-- Alien Tree -->
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 40px; height: 40px; border: 2px solid ${descriptions.alien.color}; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: ${descriptions.alien.color}20;">
                            <span style="font-size: 16px;">${descriptions.alien.icon}</span>
                        </div>
                        <div style="flex: 1;">
                            <div style="color: #fff; font-size: 13px; font-weight: bold;">Alien Technology</div>
                            <div style="color: #888; font-size: 11px;">${descriptions.alien.description}</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="openResearchLab" class="control-btn" style="background: linear-gradient(135deg, #0ff 0%, #0ff80 100%); border-color: #0ff; font-size: 14px; padding: 12px 24px; text-shadow: 0 0 10px #0ff80;">
                        🔬 Enter Research Lab
                    </button>
                    <button id="researchLater" class="control-btn" style="font-size: 14px; padding: 12px 24px;">
                        Continue Exploring
                    </button>
                </div>
            `;
        }
        
        modal.classList.add('active');
        
        // Add event listeners to the new buttons
        setTimeout(() => {
            const openResearchLabBtn = document.getElementById('openResearchLab');
            const researchLaterBtn = document.getElementById('researchLater');
            
            if (openResearchLabBtn) {
                openResearchLabBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                    this.eventBus.emit('ui:switchScreen', { screen: 'research' });
                });
            }
            
            if (researchLaterBtn) {
                researchLaterBtn.addEventListener('click', () => {
                    modal.classList.remove('active');
                });
            }
            
            // Add some dramatic effects
            if (modalContent) {
                modalContent.style.animation = 'researchUnlock 1s ease-out';
            }
        }, 100);
    }

    /**
     * Get collection type icons
     */
    getCollectionTypeIcons(collectionTypes) {
        const icons = {
            'minerals': '⛏️',
            'data': '💾',
            'artifacts': '🏺',
            'all': '🌟'
        };
        
        return collectionTypes.map(type => icons[type] || '❓').join(' ');
    }

    /**
     * Equip auto-collector to probe
     */
    equipAutoCollector(probeId) {
        const probe = this.gameState.entities.probes.find(p => p.id.toString() === probeId);
        if (!probe) return;
        
        const resources = this.gameState.getResources();
        if (resources.minerals < 25 || probe.equipment) return;
        
        // Spend resources
        this.gameState.updateResources({ minerals: resources.minerals - 25 }, this.eventBus);
        
        // Determine what collection types are available
        const research = this.gameState.getResearchSystem();
        console.log('Research status:', Array.from(research.researched));
        
        const availableTypes = [];
        if (research.researched.has('auto_minerals')) availableTypes.push('minerals');
        if (research.researched.has('auto_data')) availableTypes.push('data');
        if (research.researched.has('auto_artifacts')) availableTypes.push('artifacts');
        
        console.log('Available collection types:', availableTypes);
        
        // Start with all available types if universal collection is researched
        let collectionTypes = [...availableTypes];
        if (research.researched.has('auto_all')) {
            collectionTypes = ['all'];
        }
        
        // Create equipment
        probe.equipment = {
            type: 'auto_collector',
            name: 'Auto-Collector',
            collectionTypes: collectionTypes,
            availableTypes: availableTypes
        };
        
        console.log('Equipment created for probe', probe.id, ':', probe.equipment);
        
        // Update UI
        this.updateEquipmentDisplay(probe);
        this.eventBus.emit('ui:update');
        
        this.showMessage({ text: 'Auto-Collector equipped! This probe will now collect signals automatically.', type: 'success' });
    }

    /**
     * Remove equipment from probe
     */
    removeEquipment(probeId) {
        const probe = this.gameState.entities.probes.find(p => p.id.toString() === probeId);
        if (!probe || !probe.equipment) return;
        
        const equipmentName = probe.equipment.name;
        probe.equipment = null;
        
        this.updateEquipmentDisplay(probe);
        this.showMessage({ text: `${equipmentName} removed from probe.`, type: 'info' });
    }

    /**
     * Handle probe destruction
     */
    onProbeDestroyed(data) {
        const { probe } = data;
        
        // Hide probe detail panel if destroyed probe was selected
        if (this.gameState.ui.selectedProbe === probe) {
            this.hideProbeDetails();
        }
        
        // Update UI to reflect probe removal
        this.updateUI();
    }
}

// Export for use in other modules
window.UIManager = UIManager;