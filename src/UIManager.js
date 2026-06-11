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
            buildPathHubBtnProbe: document.getElementById('buildPathHubBtnProbe'),
            equipmentSlotBoxes: document.getElementById('equipmentSlotBoxes')
        };

        // For animated connector line
        this.connectorLine = null;
        this.probeTrackingInterval = null;
        this.createConnectorLine();

        // Create singleton bonus tooltip
        this.createBonusTooltip();

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
        // Listen for tutorial system to trigger research unlock check
        this.eventBus.on('tutorial:checkResearchUnlock', this.checkResearchUnlock.bind(this));
    }

    /**
     * Create the SVG connector line element
     */
    createConnectorLine() {
        // Remove existing if present
        const existing = document.getElementById('probeConnectorLine');
        if (existing) existing.remove();

        // Create SVG element for the connector line
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'probeConnectorLine';
        svg.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999;
            display: none;
        `;

        // Create the line element
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.id = 'connectorLineElement';
        line.setAttribute('stroke', '#0ff');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.style.filter = 'drop-shadow(0 0 4px #0ff)';

        // Create animated pulse circle at probe end
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.id = 'connectorCircle';
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', '#0ff');
        circle.style.filter = 'drop-shadow(0 0 6px #0ff)';

        // Add animation
        const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animate.setAttribute('attributeName', 'r');
        animate.setAttribute('values', '3;6;3');
        animate.setAttribute('dur', '1.5s');
        animate.setAttribute('repeatCount', 'indefinite');
        circle.appendChild(animate);

        svg.appendChild(line);
        svg.appendChild(circle);
        document.body.appendChild(svg);

        this.connectorLine = svg;
    }

    /**
     * Update connector line position between panel and probe
     */
    updateConnectorLine(probe) {
        if (!this.connectorLine || !probe || !this.elements.probeDetailPanel) return;

        const line = document.getElementById('connectorLineElement');
        const circle = document.getElementById('connectorCircle');

        if (!line || !circle) return;

        // Get probe screen position (accounting for canvas position)
        const probeScreenPos = this.getProbeScreenPosition(probe);
        if (!probeScreenPos) return;

        // Get panel position (left edge, slightly below top)
        const panelRect = this.elements.probeDetailPanel.getBoundingClientRect();
        const panelLeftX = panelRect.left;
        const panelCenterY = panelRect.top + 30;

        // Line goes from probe to panel
        line.setAttribute('x1', probeScreenPos.x);
        line.setAttribute('y1', probeScreenPos.y);
        line.setAttribute('x2', panelLeftX);
        line.setAttribute('y2', panelCenterY);

        // Circle is centered directly on the probe
        circle.setAttribute('cx', probeScreenPos.x);
        circle.setAttribute('cy', probeScreenPos.y);
    }

    /**
     * Get probe's screen position (accounting for canvas offset and zoom)
     */
    getProbeScreenPosition(probe) {
        if (!probe) return null;

        const canvas = document.getElementById('galaxyCanvas');
        if (!canvas) return null;

        const canvasRect = canvas.getBoundingClientRect();
        const world = this.gameState.getWorld();

        // Probe position relative to canvas (accounting for zoom level)
        const probeCanvasX = (probe.current.x - world.viewOffset.x) * world.zoomLevel;
        const probeCanvasY = (probe.current.y - world.viewOffset.y) * world.zoomLevel;

        // Convert to screen position
        return {
            x: canvasRect.left + probeCanvasX,
            y: canvasRect.top + probeCanvasY
        };
    }

    /**
     * Start tracking probe position for panel updates
     */
    startProbeTracking(probe) {
        this.stopProbeTracking();

        // Show connector line
        if (this.connectorLine) {
            this.connectorLine.style.display = 'block';
        }

        // Update position immediately
        this.updateProbeDetailPanelPosition(probe);

        // Update position every frame
        this.probeTrackingInterval = setInterval(() => {
            if (this.gameState.ui.selectedProbe) {
                this.updateProbeDetailPanelPosition(this.gameState.ui.selectedProbe);
                this.updateConnectorLine(this.gameState.ui.selectedProbe);
            }
        }, 50);
    }

    /**
     * Stop tracking probe position
     */
    stopProbeTracking() {
        if (this.probeTrackingInterval) {
            clearInterval(this.probeTrackingInterval);
            this.probeTrackingInterval = null;
        }

        if (this.connectorLine) {
            this.connectorLine.style.display = 'none';
        }
    }

    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        // Close probe detail panel
        if (this.elements.closeProbeDetail) {
            this.elements.closeProbeDetail.addEventListener('click', () => {
                this.hideProbeDetails();
            });
        }

        // Patrol mode toggle
        if (this.elements.patrolModeCheckbox) {
            this.elements.patrolModeCheckbox.addEventListener('change', (e) => {
                const selectedProbe = this.gameState.ui.selectedProbe;
                if (selectedProbe) {
                    selectedProbe.patrolMode = e.target.checked;
                    this.eventBus.emit('ui:update');
                }
            });
        }

        // Camera lock toggle
        if (this.elements.cameraLockCheckbox) {
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
        }

        // Building buttons in probe detail panel
        if (this.elements.buildPathHubBtnProbe) {
            this.elements.buildPathHubBtnProbe.addEventListener('click', () => {
                this.startBuildingForProbe('reconHub');
            });
        }

        // Add mining facility button handler
        const buildPathMiningBtn = document.getElementById('buildPathMiningBtnProbe');
        if (buildPathMiningBtn) {
            buildPathMiningBtn.addEventListener('click', () => {
                this.startBuildingForProbe('miningFacility');
            });
        }

        // Manage Equipment button - opens equipment modal via DetailsPanel
        const manageEquipmentBtn = document.getElementById('manageEquipmentBtnOld');
        if (manageEquipmentBtn) {
            manageEquipmentBtn.addEventListener('click', () => {
                const selectedProbe = this.gameState.ui.selectedProbe;
                if (selectedProbe && window.game && window.game.detailsPanel) {
                    window.game.detailsPanel.showEquipmentModal(selectedProbe);
                }
            });
        }

        // Change Shell button - opens shell modal
        const changeShellBtn = document.getElementById('changeShellBtn');
        if (changeShellBtn) {
            changeShellBtn.addEventListener('click', () => {
                const selectedProbe = this.gameState.ui.selectedProbe;
                if (selectedProbe) {
                    this.showShellModal(selectedProbe);
                }
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

        // Update equipment slots display
        this.updateEquipmentSlots(probe);

        // Update shell section display
        this.updateShellSection(probe);

        // Show the panel
        if (this.elements.probeDetailPanel) {
            this.elements.probeDetailPanel.style.display = 'block';
        }

        // Start tracking probe position
        this.startProbeTracking(probe);

        // Show building panel if probe has a path
        this.updateBuildingPanel(probe);
    }

    /**
     * Hide probe details panel
     */
    hideProbeDetails() {
        // Stop tracking
        this.stopProbeTracking();

        // Hide panel
        if (this.elements.probeDetailPanel) {
            this.elements.probeDetailPanel.style.display = 'none';
        }

        this.gameState.ui.selectedProbe = null;

        // Unlock camera when closing probe details
        this.gameState.ui.cameraLocked = false;
        this.gameState.ui.lockedProbe = null;
        this.eventBus.emit('camera:lockToggled', {
            locked: false,
            probe: null
        });

        // Exit building mode if active
        if (this.buildingSystem && this.buildingSystem.isBuildingMode()) {
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
        if (this.elements.patrolModeCheckbox) {
            this.elements.patrolModeCheckbox.checked = probe.patrolMode !== false;
        }

        // Update camera lock checkbox
        if (this.elements.cameraLockCheckbox) {
            this.elements.cameraLockCheckbox.checked =
                this.gameState.ui.cameraLocked &&
                this.gameState.ui.lockedProbe === probe;
        }
    }

    /**
     * Update equipment slots visualization (2 available + 1 greyed/locked)
     */
    updateEquipmentSlots(probe) {
        const container = this.elements.equipmentSlotBoxes;
        if (!container) return;

        const equipmentArray = Array.isArray(probe.equipment) ? probe.equipment :
                              (probe.equipment ? [probe.equipment] : []);
        const maxSlots = probe.maxEquipmentSlots || 2;
        const usedSlots = equipmentArray.length;

        const icons = {
            'mineral_collector': '⛏️',
            'data_collector': '💾',
            'artifact_collector': '🏺',
            'universal_collector': '🌟'
        };

        let slotsHtml = '';

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
            " title="Locked - Upgrade via research">
                <span style="color: #666; font-size: 14px;">🔒</span>
            </div>
        `;

        container.innerHTML = slotsHtml;
    }

    /**
     * Update building panel visibility and buttons
     */
    updateBuildingPanel(probe) {
        const hasPath = probe.waypoints && probe.waypoints.length > 0;

        if (this.elements.probeBuildingPanel) {
            if (hasPath) {
                this.elements.probeBuildingPanel.style.display = 'block';
                this.updateBuildingButtons();
            } else {
                this.elements.probeBuildingPanel.style.display = 'none';
            }
        }
    }

    /**
     * Update building button states
     */
    updateBuildingButtons() {
        const resources = this.gameState.getResources();

        // Hub button
        if (this.elements.buildPathHubBtnProbe) {
            const canBuildHub = resources.minerals >= 100;
            this.elements.buildPathHubBtnProbe.disabled = !canBuildHub;
            this.elements.buildPathHubBtnProbe.classList.toggle('disabled', !canBuildHub);
        }

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
     * Update probe detail panel position (100px to right of probe)
     */
    updateProbeDetailPanelPosition(probe) {
        if (!probe || !this.elements.probeDetailPanel) return;

        // Get probe's actual screen position
        const probeScreenPos = this.getProbeScreenPosition(probe);
        if (!probeScreenPos) return;

        // Position panel 100px to the right of the probe
        const panelWidth = 280;
        const panelHeight = this.elements.probeDetailPanel.offsetHeight || 400;

        let panelX = probeScreenPos.x + 100;
        let panelY = probeScreenPos.y - (panelHeight / 2);

        // Keep panel on screen
        panelX = Math.min(panelX, window.innerWidth - panelWidth - 20);
        panelX = Math.max(20, panelX);
        panelY = Math.min(panelY, window.innerHeight - panelHeight - 20);
        panelY = Math.max(80, panelY);

        // Apply position using fixed positioning
        this.elements.probeDetailPanel.style.position = 'fixed';
        this.elements.probeDetailPanel.style.left = panelX + 'px';
        this.elements.probeDetailPanel.style.top = panelY + 'px';
        this.elements.probeDetailPanel.style.right = 'auto'; // Ensure right doesn't interfere
        this.elements.probeDetailPanel.style.right = 'auto';
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
     * Note: Equipment elements may not exist if using the new Manage Equipment modal
     * Supports both array-based equipment (new system) and single-object (legacy)
     */
    updateEquipmentDisplay(probe) {
        const equipmentSlot = document.getElementById('equipmentSlot');
        const equipmentInfo = document.getElementById('equipmentInfo');
        const equipmentActions = document.getElementById('equipmentActions');

        // Early return if equipment elements don't exist (using new modal system)
        if (!equipmentSlot) return;

        // Normalize equipment to array format
        const equipmentArray = Array.isArray(probe.equipment) ? probe.equipment :
                              (probe.equipment ? [probe.equipment] : []);
        const hasEquipment = equipmentArray.length > 0;
        const maxSlots = probe.maxEquipmentSlots || 2;

        if (hasEquipment) {
            // Show equipped items summary
            equipmentSlot.innerHTML = '<span style="color: #0ff; font-size: 16px;">🤖</span>';
            equipmentSlot.style.borderColor = '#0ff';
            equipmentSlot.style.background = 'rgba(0,255,255,0.1)';
            equipmentSlot.title = `${equipmentArray.length}/${maxSlots} slots used`;

            if (equipmentInfo) {
                // Combine all collection types from equipped items
                const allCollectionTypes = new Set();
                equipmentArray.forEach(eq => {
                    if (eq.collectionTypes) {
                        eq.collectionTypes.forEach(t => allCollectionTypes.add(t));
                    }
                });
                const collectionIcons = this.getCollectionTypeIcons(Array.from(allCollectionTypes));

                const equipmentNames = equipmentArray.map(eq => eq.name || eq.type).join(', ');
                equipmentInfo.innerHTML = `
                    <div style="color: #0ff; font-weight: bold; margin-bottom: 4px;">${equipmentArray.length} item(s)</div>
                    <div style="color: #aaa; font-size: 10px; margin-bottom: 4px;">Collecting: ${collectionIcons}</div>
                    <div style="color: #888; font-size: 9px;">${equipmentNames}</div>
                `;
            }

            if (equipmentActions) {
                equipmentActions.innerHTML = `
                    <button class="control-btn" style="font-size: 11px; padding: 6px 12px;"
                            onclick="window.game.detailsPanel.showEquipmentModal(window.game.gameState.entities.probes.find(p => p.id === '${probe.id}'))"
                            title="Manage probe equipment">
                        🔧 Manage Equipment
                    </button>
                `;
            }
        } else {
            // Show empty slot
            equipmentSlot.innerHTML = '<span style="color: #444; font-size: 12px;">Empty</span>';
            equipmentSlot.style.borderColor = '#444';
            equipmentSlot.style.background = 'rgba(0,0,0,0.3)';
            equipmentSlot.title = `0/${maxSlots} slots used`;

            if (equipmentInfo) {
                equipmentInfo.textContent = 'No equipment installed';
            }

            if (equipmentActions) {
                // Check if auto-collection research is unlocked
                const research = this.gameState.getResearchSystem();
                const hasAutoCollection = research.researched.has('auto_minerals') ||
                                        research.researched.has('auto_data') ||
                                        research.researched.has('auto_artifacts') ||
                                        research.researched.has('auto_all');

                if (hasAutoCollection) {
                    equipmentActions.innerHTML = `
                        <button class="control-btn" style="font-size: 11px; padding: 6px 12px;"
                                onclick="window.game.detailsPanel.showEquipmentModal(window.game.gameState.entities.probes.find(p => p.id === '${probe.id}'))"
                                title="Open equipment management">
                            🔧 Manage Equipment
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

        // Update equipment slots if probe panel is visible
        if (this.elements.probeDetailPanel &&
            this.elements.probeDetailPanel.style.display === 'block' &&
            this.gameState.ui.selectedProbe) {
            this.updateEquipmentSlots(this.gameState.ui.selectedProbe);
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
        
        // Round regular resources to nearest whole number
        document.getElementById('minerals').textContent = Math.floor(resources.minerals);
        document.getElementById('data').textContent = Math.floor(resources.data);
        document.getElementById('artifacts').textContent = Math.floor(resources.artifacts);
        document.getElementById('exoticMinerals').textContent = Math.floor(resources.exoticMinerals);
        
        // Probethium is a meaningful currency now (ECONOMY.md) — show 1 decimal,
        // whole numbers once large
        const probethiumElement = document.getElementById('probethium');
        if (probethiumElement) {
            if (probethium.current >= 100) {
                probethiumElement.textContent = Math.floor(probethium.current).toString();
            } else {
                probethiumElement.textContent = probethium.current.toFixed(1);
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
     * Research is gated by the tutorial system - it can only unlock after certain tutorial progress
     */
    checkResearchUnlock() {
        const research = this.gameState.getResearchSystem();

        // Always ensure unlocked trees are set if research is already unlocked
        if (research.unlocked && research.unlockedTrees.length === 0) {
            console.log('Research is unlocked but trees are not set, fixing...');
            research.unlockedTrees = ['collection', 'probe', 'alien'];
        }

        // Check if tutorial allows research access
        const tutorialManager = this.gameState.tutorialManager;
        const researchAccessAllowed = !tutorialManager || tutorialManager.isResearchAccessAllowed();

        // Check if research should be unlocked (player has points AND tutorial allows it)
        if (!research.unlocked && research.points > 0 && researchAccessAllowed) {
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

            // Emit event for tutorial system
            this.eventBus.emit('research:unlocked');

            // Show research unlocked message and automatically open research modal
            this.showResearchUnlockModal();
            console.log('Research system unlocked! All three trees and root nodes are now available.');
        }

        // Ensure research button is visible if research is already unlocked (e.g., after loading save)
        // But only if tutorial allows access
        if (research.unlocked && researchAccessAllowed) {
            const researchBtn = document.getElementById('researchBtn');
            if (researchBtn) {
                researchBtn.style.display = 'inline-block';
            }
        }

        // Show sector report button if any sectors are explored
        const world = this.gameState.getWorld();
        if (world && world.sectors) {
            let hasExplored = false;
            world.sectors.forEach(s => { if (s.explored) hasExplored = true; });
            if (hasExplored) {
                const sectorReportBtn = document.getElementById('sectorReportBtn');
                if (sectorReportBtn) sectorReportBtn.style.display = 'inline-block';
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
     * Equip auto-collector to probe (legacy method - redirects to modal)
     * Kept for backwards compatibility with old UI elements
     */
    equipAutoCollector(probeId) {
        const probe = this.gameState.entities.probes.find(p => p.id.toString() === probeId);
        if (!probe) return;

        // Open the equipment modal instead of directly equipping
        if (window.game && window.game.detailsPanel) {
            window.game.detailsPanel.showEquipmentModal(probe);
        }
    }

    /**
     * Remove equipment from probe (legacy method)
     * Supports both array-based and object-based equipment
     */
    removeEquipment(probeId) {
        const probe = this.gameState.entities.probes.find(p => p.id.toString() === probeId);
        if (!probe || !probe.equipment) return;

        // Handle array-based equipment (new system)
        if (Array.isArray(probe.equipment)) {
            if (probe.equipment.length === 0) return;
            const equipmentName = probe.equipment[0].name || 'Equipment';
            probe.equipment.shift();
            this.updateEquipmentDisplay(probe);
            this.showMessage({ text: `${equipmentName} removed from probe.`, type: 'info' });
        } else {
            // Legacy single-object equipment
            const equipmentName = probe.equipment.name;
            probe.equipment = [];
            this.updateEquipmentDisplay(probe);
            this.showMessage({ text: `${equipmentName} removed from probe.`, type: 'info' });
        }
    }

    /**
     * Handle probe destruction
     */
    onProbeDestroyed(data) {
        const { probe } = data;

        // Close details panel if destroyed probe was selected
        if (this.gameState.ui.selectedProbe === probe) {
            this.hideProbeDetails();
            this.eventBus.emit('details:close');
        }

        // Update UI to reflect probe removal
        this.updateUI();
    }

    /**
     * Update shell section in probe detail panel
     */
    updateShellSection(probe) {
        const previewBox = document.getElementById('currentShellPreview');
        const nameEl = document.getElementById('currentShellName');
        if (!previewBox || !nameEl) return;

        const shellSystem = window.game?.shellSystem;
        if (!shellSystem) {
            // ShellSystem not available, show default
            previewBox.innerHTML = '<span style="color: #0ff; font-size: 24px;">🛸</span>';
            nameEl.textContent = 'Default';
            return;
        }

        const shell = shellSystem.getProbeShell(probe);
        const shellColor = shell?.visual?.color || '#0ff';

        // Render shell preview
        previewBox.innerHTML = this.renderProbeShellPreview(shell);
        previewBox.style.borderColor = shellColor;
        previewBox.style.background = `rgba(${this.hexToRgb(shellColor)}, 0.1)`;
        nameEl.textContent = shell?.name || 'Default';
        nameEl.style.color = shellColor;

        // Attach tooltip handler to preview box
        this.attachTooltipHandlers(previewBox, shell);
    }

    /**
     * Render a small probe shell preview SVG
     */
    renderProbeShellPreview(shell) {
        const color = shell?.visual?.color || '#0ff';
        const glow = shell?.visual?.glow || color;

        return `
            <svg width="40" height="40" viewBox="0 0 40 40">
                <defs>
                    <filter id="shellGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"/>
                    </filter>
                </defs>
                <!-- Body -->
                <ellipse cx="20" cy="20" rx="8" ry="6" fill="${color}" filter="url(#shellGlow)"/>
                <!-- Wings -->
                <rect x="8" y="17" width="8" height="3" fill="${color}" opacity="0.8"/>
                <rect x="24" y="17" width="8" height="3" fill="${color}" opacity="0.8"/>
                <!-- Front -->
                <polygon points="20,10 17,16 23,16" fill="${glow}"/>
                <!-- Antenna -->
                <line x1="17" y1="12" x2="14" y2="8" stroke="${glow}" stroke-width="1"/>
                <line x1="23" y1="12" x2="26" y2="8" stroke="${glow}" stroke-width="1"/>
                <circle cx="14" cy="8" r="2" fill="${glow}"/>
                <circle cx="26" cy="8" r="2" fill="${glow}"/>
            </svg>
        `;
    }

    /**
     * Convert hex color to RGB values
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
        }
        return '0, 255, 255';
    }

    /**
     * Show shell selection modal
     */
    showShellModal(probe) {
        // Remove existing modal if present
        const existingModal = document.getElementById('shellModal');
        if (existingModal) existingModal.remove();

        const shellSystem = window.game?.shellSystem;
        if (!shellSystem) {
            this.showMessage({ text: 'Shell system not available', type: 'error' });
            return;
        }

        // Get owned shells
        const ownedShells = shellSystem.getOwnedShells('probes');
        const currentShellId = probe.shellId || this.gameState.cosmetics?.equippedShells?.probes || 'default';

        const modal = document.createElement('div');
        modal.id = 'shellModal';
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

        const rarityColors = {
            common: '#aaa',
            uncommon: '#0f0',
            rare: '#00f',
            epic: '#f0f',
            legendary: '#ffd700'
        };

        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 2px solid #9400d3; border-radius: 10px; padding: 20px; max-width: 450px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="color: #9400d3; margin: 0;">🎨 Equip Shell</h3>
                    <button id="closeShellModal" style="background: none; border: none; color: #888; font-size: 20px; cursor: pointer;">&times;</button>
                </div>

                <div style="color: #888; font-size: 12px; margin-bottom: 15px;">
                    Probe ${probe.id} | Current: ${ownedShells.find(s => s.id === currentShellId)?.name || 'Default'}
                </div>

                <div style="color: #9400d3; font-weight: bold; margin-bottom: 10px;">Available Shells:</div>

                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">
                    ${ownedShells.map(shell => {
                        const isSelected = shell.id === currentShellId;
                        const color = shell.visual?.color || '#0ff';
                        const rarityColor = rarityColors[shell.rarity] || '#aaa';

                        return `
                            <div
                                class="shell-option"
                                data-shell-id="${shell.id}"
                                style="
                                    background: ${isSelected ? 'rgba(148, 0, 211, 0.2)' : 'rgba(0,0,0,0.3)'};
                                    border: 2px solid ${isSelected ? '#9400d3' : color};
                                    border-radius: 8px;
                                    padding: 10px;
                                    cursor: pointer;
                                    text-align: center;
                                    transition: all 0.2s;
                                    ${isSelected ? 'box-shadow: 0 0 10px rgba(148, 0, 211, 0.5);' : ''}
                                "
                            >
                                ${this.renderProbeShellPreview(shell)}
                                <div style="color: ${color}; font-size: 11px; font-weight: bold; margin-top: 5px;">${shell.name}</div>
                                <div style="color: ${rarityColor}; font-size: 9px; text-transform: uppercase;">${shell.rarity || 'common'}</div>
                                ${isSelected ? '<div style="color: #0f8; font-size: 9px; margin-top: 3px;">✓ EQUIPPED</div>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>

                ${ownedShells.length <= 1 ? `
                    <div style="color: #888; text-align: center; padding: 20px; margin-top: 15px; background: rgba(0,0,0,0.2); border-radius: 5px;">
                        <div style="font-size: 24px; margin-bottom: 5px;">🛒</div>
                        <div>Visit a Remnant trader to purchase more shells!</div>
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(modal);

        // Store reference to this for callbacks
        const self = this;

        // Setup modal event handlers
        document.getElementById('closeShellModal').addEventListener('click', () => {
            if (self.bonusTooltip) self.bonusTooltip.style.display = 'none';
            modal.remove();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (self.bonusTooltip) self.bonusTooltip.style.display = 'none';
                modal.remove();
            }
        });

        // Setup shell option click handlers
        const shellOptions = modal.querySelectorAll('.shell-option');
        shellOptions.forEach(option => {
            // Find the matching shell object for tooltip
            const shellId = option.getAttribute('data-shell-id');
            const matchingShell = ownedShells.find(s => s.id === shellId);

            option.addEventListener('mouseenter', () => {
                option.style.transform = 'scale(1.05)';
            });
            option.addEventListener('mouseleave', () => {
                option.style.transform = 'scale(1)';
            });

            // Attach tooltip handlers
            if (matchingShell) {
                self.attachTooltipHandlers(option, matchingShell);
            }

            option.addEventListener('click', () => {
                const result = shellSystem.equipShellOnProbe(probe, shellId);

                if (result.success) {
                    self.eventBus.emit('ui:message', {
                        text: `Equipped ${ownedShells.find(s => s.id === shellId)?.name || 'shell'}!`,
                        type: 'success'
                    });
                    // Update the shell section display
                    self.updateShellSection(probe);
                    if (self.bonusTooltip) self.bonusTooltip.style.display = 'none';
                    modal.remove();
                } else {
                    self.eventBus.emit('ui:message', { text: result.error || 'Failed to equip shell', type: 'error' });
                }
            });
        });
    }

    /**
     * Create singleton bonus tooltip element
     */
    createBonusTooltip() {
        // Remove existing if present
        const existing = document.getElementById('bonusTooltip');
        if (existing) existing.remove();

        // Create tooltip container
        const tooltip = document.createElement('div');
        tooltip.id = 'bonusTooltip';
        tooltip.style.cssText = `
            position: fixed;
            display: none;
            pointer-events: none;
            z-index: 10001;
            background: rgba(20, 20, 40, 0.95);
            border: 1px solid rgba(0, 255, 255, 0.3);
            border-radius: 4px;
            padding: 8px 12px;
            color: #ccc;
            font-size: 11px;
            line-height: 1.6;
        `;

        // Create arrow pointer
        const arrow = document.createElement('div');
        arrow.id = 'tooltipArrow';
        arrow.style.cssText = `
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid rgba(20, 20, 40, 0.95);
        `;

        tooltip.appendChild(arrow);
        document.body.appendChild(tooltip);

        this.bonusTooltip = tooltip;
        this.tooltipArrow = arrow;
    }

    /**
     * Build tooltip HTML content from shell bonuses
     * Returns null if shell has no bonuses
     */
    buildTooltipContent(shell) {
        if (!shell || !shell.bonuses || Object.keys(shell.bonuses).length === 0) {
            return null;
        }

        const shellSystem = window.game?.shellSystem;
        if (!shellSystem) return null;

        const lines = [];
        for (const [bonusType, value] of Object.entries(shell.bonuses)) {
            const info = shellSystem.getBonusTypeInfo(bonusType);
            if (info) {
                lines.push(`${info.icon} ${info.label}: <span style="color: #0f0">+${value}${info.unit}</span>`);
            }
        }

        return lines.length > 0 ? lines.join('<br>') : null;
    }

    /**
     * Position tooltip above target element
     */
    positionTooltip(target) {
        if (!this.bonusTooltip || !target) return;

        const rect = target.getBoundingClientRect();

        // Show tooltip off-screen to measure it
        this.bonusTooltip.style.display = 'block';
        this.bonusTooltip.style.left = '-9999px';
        this.bonusTooltip.style.top = '-9999px';

        const tooltipWidth = this.bonusTooltip.offsetWidth;
        const tooltipHeight = this.bonusTooltip.offsetHeight;

        // Center horizontally above target
        let x = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        let y = rect.top - tooltipHeight - 8;

        // Bounds checking - keep on screen horizontally
        x = Math.max(10, Math.min(x, window.innerWidth - tooltipWidth - 10));

        // Check if tooltip would go off top of screen
        if (y < 10) {
            // Flip below target
            y = rect.bottom + 8;
            // Flip arrow to point up
            this.tooltipArrow.style.bottom = 'auto';
            this.tooltipArrow.style.top = '-6px';
            this.tooltipArrow.style.borderTop = 'none';
            this.tooltipArrow.style.borderBottom = '6px solid rgba(20, 20, 40, 0.95)';
        } else {
            // Arrow points down (default)
            this.tooltipArrow.style.bottom = '-6px';
            this.tooltipArrow.style.top = 'auto';
            this.tooltipArrow.style.borderTop = '6px solid rgba(20, 20, 40, 0.95)';
            this.tooltipArrow.style.borderBottom = 'none';
        }

        // Apply final position
        this.bonusTooltip.style.left = x + 'px';
        this.bonusTooltip.style.top = y + 'px';
    }

    /**
     * Attach tooltip handlers to an element
     */
    attachTooltipHandlers(element, shell) {
        if (!element || !this.bonusTooltip) return;

        element.addEventListener('mouseenter', () => {
            // Clear any existing timeout
            if (element._tooltipTimeout) {
                clearTimeout(element._tooltipTimeout);
            }

            // Set 300ms delay before showing tooltip
            element._tooltipTimeout = setTimeout(() => {
                const content = this.buildTooltipContent(shell);
                if (content) {
                    this.bonusTooltip.innerHTML = content;
                    // Re-add arrow (innerHTML cleared it)
                    this.bonusTooltip.appendChild(this.tooltipArrow);
                    this.positionTooltip(element);
                    this.bonusTooltip.style.display = 'block';
                }
            }, 300);
        });

        element.addEventListener('mouseleave', () => {
            // Clear timeout if mouse leaves before delay
            if (element._tooltipTimeout) {
                clearTimeout(element._tooltipTimeout);
                element._tooltipTimeout = null;
            }
            // Hide tooltip immediately
            if (this.bonusTooltip) {
                this.bonusTooltip.style.display = 'none';
            }
        });
    }
}

// Export for use in other modules
window.UIManager = UIManager;