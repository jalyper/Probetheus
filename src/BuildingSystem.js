/**
 * Building System
 * Handles building placement, preview, and construction along probe paths
 */
class BuildingSystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        this.buildingMode = false;
        this.buildingStructureType = null;
        this.buildingPreview = null;
        this.selectedProbe = null;

        // Listen for relevant events
        this.eventBus.on('building:enterMode', this.enterBuildingMode.bind(this));
        this.eventBus.on('building:exitMode', this.exitBuildingMode.bind(this));
        this.eventBus.on('building:place', this.placeBuilding.bind(this));
        this.eventBus.on('building:updatePreview', this.updateBuildingPreview.bind(this));
        this.eventBus.on('probe:selected', this.onProbeSelected.bind(this));
    }

    /**
     * Enter building mode for a specific structure type
     */
    enterBuildingMode(data) {
        const { structureType, probe } = data;
        
        // Mining facilities don't require a specific probe
        if (structureType === 'miningFacility') {
            // Check if there are any active probes with routes for mining facilities
            const hasActiveRoutes = this.gameState.entities.probes.some(p => 
                p.active && p.waypoints && p.waypoints.length >= 2
            );
            
            if (!hasActiveRoutes) {
                this.eventBus.emit('ui:message', { 
                    text: 'Deploy probes with routes first to place mining facilities', 
                    type: 'error' 
                });
                return;
            }
        } else if (!probe || !probe.waypoints || probe.waypoints.length === 0) {
            this.eventBus.emit('ui:message', { 
                text: 'No path available for building', 
                type: 'error' 
            });
            return;
        }

        this.buildingMode = true;
        this.buildingStructureType = structureType;
        this.selectedProbe = probe;
        this.buildingPreview = null;

        this.eventBus.emit('ui:buildingModeChanged', { 
            active: true, 
            structureType,
            probe 
        });
        
        this.eventBus.emit('ui:message', { 
            text: `Building mode: ${structureType}. Click along probe path to place.`, 
            type: 'info' 
        });
    }

    /**
     * Exit building mode
     */
    exitBuildingMode(wasPlaced = false) {
        this.buildingMode = false;
        this.buildingStructureType = null;
        this.buildingPreview = null;
        this.selectedProbe = null;

        this.eventBus.emit('ui:buildingModeChanged', { 
            active: false 
        });
        
        // Only show cancelled message if not placed
        if (!wasPlaced) {
            this.eventBus.emit('ui:message', { 
                text: 'Building mode cancelled', 
                type: 'info' 
            });
        }
    }

    /**
     * Update building preview based on mouse position
     */
    updateBuildingPreview(data) {
        if (!this.buildingMode) return;

        const { mouseX, mouseY } = data;
        
        // For mining facilities, check all routes; for others, use selected probe
        let closestPoint;
        if (this.buildingStructureType === 'miningFacility') {
            closestPoint = this.findClosestPointOnAnyExplorationRoute(mouseX, mouseY);
            if (!closestPoint) {
                console.log('No valid point found for mining facility placement');
            }
        } else {
            if (!this.selectedProbe) return;
            closestPoint = this.findClosestPointOnPath(
                this.selectedProbe.waypoints, 
                mouseX, 
                mouseY
            );
        }

        if (closestPoint) {
            this.buildingPreview = {
                x: closestPoint.x,
                y: closestPoint.y,
                type: this.buildingStructureType
            };

            this.eventBus.emit('ui:buildingPreviewUpdated', {
                preview: this.buildingPreview
            });
        } else {
            this.buildingPreview = null;
        }
    }

    /**
     * Place a building at the current preview location
     */
    placeBuilding() {
        console.log('placeBuilding called');
        console.log('buildingMode:', this.buildingMode);
        console.log('buildingPreview:', this.buildingPreview);
        console.log('buildingStructureType:', this.buildingStructureType);
        
        if (!this.buildingMode || !this.buildingPreview) {
            console.log('Early return: no building mode or preview');
            return;
        }
        
        // For mining facilities, we don't need a selected probe
        if (this.buildingStructureType !== 'miningFacility' && !this.selectedProbe) {
            console.log('Early return: not mining facility and no probe selected');
            return;
        }

        const structureType = this.buildingStructureType;
        const resources = this.gameState.getResources();
        console.log('Current resources:', resources);
        
        // Check resource requirements
        const requirements = this.getBuildingRequirements(structureType);
        console.log('Requirements:', requirements);
        
        if (!this.canAffordBuilding(requirements, resources)) {
            console.log('Cannot afford building');
            this.eventBus.emit('ui:message', { 
                text: 'Insufficient resources', 
                type: 'error' 
            });
            return;
        }

        // Handle mining facilities differently
        if (structureType === 'miningFacility') {
            console.log('Creating mining facility...');
            this.createMiningFacility(
                this.buildingPreview.x,
                this.buildingPreview.y,
                requirements
            );
        } else {
            // Create the building
            const building = this.createBuilding(
                structureType,
                this.buildingPreview.x,
                this.buildingPreview.y
            );

            // Add to appropriate collection
            this.addBuildingToGame(building);
        }

        // Deduct resources
        this.gameState.updateResources({
            minerals: resources.minerals - requirements.minerals,
            data: resources.data - requirements.data
        }, this.eventBus);

        this.eventBus.emit('ui:message', { 
            text: `${structureType} built!`, 
            type: 'success' 
        });
        
        this.eventBus.emit('ui:update');
        this.exitBuildingMode(true); // Pass true to indicate successful placement
    }

    /**
     * Handle probe selection
     */
    onProbeSelected(data) {
        const { probe } = data;
        this.selectedProbe = probe;
        
        // If in building mode and probe changed, update preview
        if (this.buildingMode) {
            this.buildingPreview = null;
            this.eventBus.emit('ui:buildingPreviewUpdated', { preview: null });
        }
    }

    /**
     * Find the closest point on a probe's path to given coordinates
     */
    findClosestPointOnPath(waypoints, mouseX, mouseY) {
        if (!waypoints || waypoints.length < 2) return null;

        let closestPoint = null;
        let minDistance = Infinity;

        // Check each segment of the path
        for (let i = 0; i < waypoints.length - 1; i++) {
            const start = waypoints[i];
            const end = waypoints[i + 1];

            // Find closest point on this segment
            const segmentPoint = this.closestPointOnSegment(
                start.x, start.y,
                end.x, end.y,
                mouseX, mouseY
            );

            const distance = Math.sqrt(
                Math.pow(segmentPoint.x - mouseX, 2) + 
                Math.pow(segmentPoint.y - mouseY, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = segmentPoint;
            }
        }

        // Only return point if it's reasonably close (within 100 pixels)
        return minDistance <= 100 ? closestPoint : null;
    }

    /**
     * Find the closest point on any probe's exploration route (not return path)
     */
    findClosestPointOnAnyExplorationRoute(mouseX, mouseY) {
        let closestPoint = null;
        let minDistance = Infinity;
        
        console.log(`Checking ${this.gameState.entities.probes.length} probes for valid routes`);
        
        // Check all active probes that have exploration routes
        this.gameState.entities.probes.forEach(probe => {
            if (!probe.waypoints || probe.waypoints.length < 2 || !probe.active) {
                console.log(`Probe skipped: waypoints=${probe.waypoints?.length}, active=${probe.active}`);
                return;
            }
            
            // Only consider probes that have actually moved (not just deployed)
            if (probe.status === 'ready' && probe.waypoints.length === 2) return;
            
            // Skip probes that are damaged or returning
            if (probe.status === 'returning' || probe.damage > 0) return;
            
            // Only consider the outbound (exploration) waypoints, not the return path
            const outboundCount = probe.outboundWaypointsCount || Math.ceil(probe.waypoints.length / 2);
            const outboundWaypoints = probe.waypoints.slice(0, outboundCount);
            
            console.log(`Probe ${probe.id}: total waypoints=${probe.waypoints.length}, outboundCount=${outboundCount}, using ${outboundWaypoints.length} waypoints`);
            
            if (outboundWaypoints.length < 2) {
                console.log(`Probe skipped: not enough outbound waypoints (${outboundWaypoints.length})`);
                return; // Need at least 2 points for a path
            }
            
            // Find closest point on this probe's exploration route
            const routePoint = this.findClosestPointOnPath(outboundWaypoints, mouseX, mouseY);
            
            if (routePoint) {
                const distance = Math.sqrt(
                    Math.pow(routePoint.x - mouseX, 2) + 
                    Math.pow(routePoint.y - mouseY, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = routePoint;
                }
            }
        });
        
        return closestPoint;
    }

    /**
     * Create mining facility using MiningManager
     */
    createMiningFacility(x, y, requirements) {
        console.log(`Creating mining facility at (${x}, ${y})`);
        
        // Find closest hub for the mining station
        let closestHub = null;
        let closestDistance = Infinity;
        
        // Check both reconHubs and hubs arrays (might be stored in either)
        const hubs = this.gameState.entities.reconHubs || this.gameState.entities.hubs || [];
        console.log(`Found ${hubs.length} hubs to check`);
        
        hubs.forEach(hub => {
            const distance = Math.sqrt(Math.pow(hub.x - x, 2) + Math.pow(hub.y - y, 2));
            if (distance < closestDistance) {
                closestDistance = distance;
                closestHub = hub;
            }
        });
        
        if (!closestHub) {
            console.error('No hubs found!');
            this.eventBus.emit('ui:message', { 
                text: 'No hubs available to supply mining station!', 
                type: 'error' 
            });
            return;
        }
        
        console.log(`Using hub at (${closestHub.x}, ${closestHub.y}) with id: ${closestHub.id}`);

        // Get MiningManager from game instance (bit of a hack, but works for now)
        const gameController = window.game;
        if (!gameController || !gameController.miningManager) {
            console.error('MiningManager not found on window.game:', gameController);
            this.eventBus.emit('ui:message', { 
                text: 'Mining system not available!', 
                type: 'error' 
            });
            return;
        }

        // Build the mining station
        console.log('Calling miningManager.buildMiningStation...');
        const station = gameController.miningManager.buildMiningStation({
            type: 'basic',
            position: { x: x, y: y },
            hubId: closestHub.id
        });
        
        if (station) {
            console.log('Mining station created successfully:', station);
            this.eventBus.emit('ui:message', { 
                text: 'Mining station built!', 
                type: 'success' 
            });
        } else {
            console.error('Failed to create mining station');
        }
    }

    /**
     * Find closest point on a line segment to a given point
     */
    closestPointOnSegment(x1, y1, x2, y2, px, py) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        if (lenSq === 0) {
            return { x: x1, y: y1 };
        }

        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param)); // Clamp to segment

        return {
            x: x1 + param * C,
            y: y1 + param * D
        };
    }

    /**
     * Get building requirements
     */
    getBuildingRequirements(structureType) {
        const requirements = {
            outpost: { minerals: 50, data: 20 },
            miningFacility: { minerals: 100, data: 50 },
            reconHub: { minerals: 100, data: 0 }
        };

        return requirements[structureType] || { minerals: 0, data: 0 };
    }

    /**
     * Check if player can afford building
     */
    canAffordBuilding(requirements, resources) {
        return resources.minerals >= requirements.minerals && 
               resources.data >= requirements.data;
    }

    /**
     * Create a building object
     */
    createBuilding(structureType, x, y) {
        const worldCoords = this.gameState.getWorld();
        const sectorX = Math.floor(x / worldCoords.standardSectorWidth);
        const sectorY = Math.floor(y / worldCoords.standardSectorHeight);

        const building = {
            id: Date.now(),
            type: structureType,
            x: x,
            y: y,
            sector: { x: sectorX, y: sectorY },
            active: true
        };

        // Add structure-specific properties
        if (structureType === 'outpost') {
            building.generationRate = 0.1; // Exotic minerals per second
            building.lastGeneration = Date.now();
        } else if (structureType === 'miningFacility') {
            building.generationRate = 0.2;
            building.lastGeneration = Date.now();
        } else if (structureType === 'reconHub') {
            building.range = worldCoords.standardSectorWidth / 3;
            building.maxProbes = 5;
            building.selected = false;
        }

        return building;
    }

    /**
     * Add building to appropriate game collection
     */
    addBuildingToGame(building) {
        const entities = this.gameState.getEntities();
        
        if (building.type === 'outpost') {
            entities.miningOutposts.push(building);
        } else if (building.type === 'miningFacility') {
            entities.miningFacilities.push(building);
        } else if (building.type === 'reconHub') {
            entities.reconHubs.push(building);
            
            // Also add to sector
            const world = this.gameState.getWorld();
            const sectorKey = `${building.sector.x},${building.sector.y}`;
            const sector = world.sectors.get(sectorKey);
            if (sector) {
                if (!sector.hubs) sector.hubs = [];
                sector.hubs.push(building);
            }
        }
    }

    /**
     * Check if currently in building mode
     */
    isBuildingMode() {
        return this.buildingMode;
    }

    /**
     * Get current building preview
     */
    getBuildingPreview() {
        return this.buildingPreview;
    }

    /**
     * Get selected probe for building
     */
    getSelectedProbe() {
        return this.selectedProbe;
    }
}

// Export for use in other modules
window.BuildingSystem = BuildingSystem;