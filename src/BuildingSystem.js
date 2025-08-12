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
        
        if (!probe || !probe.waypoints || probe.waypoints.length === 0) {
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
    exitBuildingMode() {
        this.buildingMode = false;
        this.buildingStructureType = null;
        this.buildingPreview = null;
        this.selectedProbe = null;

        this.eventBus.emit('ui:buildingModeChanged', { 
            active: false 
        });
        
        this.eventBus.emit('ui:message', { 
            text: 'Building mode cancelled', 
            type: 'info' 
        });
    }

    /**
     * Update building preview based on mouse position
     */
    updateBuildingPreview(data) {
        if (!this.buildingMode || !this.selectedProbe) return;

        const { mouseX, mouseY } = data;
        const closestPoint = this.findClosestPointOnPath(
            this.selectedProbe.waypoints, 
            mouseX, 
            mouseY
        );

        if (closestPoint) {
            this.buildingPreview = {
                x: closestPoint.x,
                y: closestPoint.y,
                type: this.buildingStructureType
            };

            this.eventBus.emit('ui:buildingPreviewUpdated', {
                preview: this.buildingPreview
            });
        }
    }

    /**
     * Place a building at the current preview location
     */
    placeBuilding() {
        if (!this.buildingMode || !this.buildingPreview || !this.selectedProbe) return;

        const structureType = this.buildingStructureType;
        const resources = this.gameState.getResources();
        
        // Check resource requirements
        const requirements = this.getBuildingRequirements(structureType);
        if (!this.canAffordBuilding(requirements, resources)) {
            this.eventBus.emit('ui:message', { 
                text: 'Insufficient resources', 
                type: 'error' 
            });
            return;
        }

        // Create the building
        const building = this.createBuilding(
            structureType,
            this.buildingPreview.x,
            this.buildingPreview.y
        );

        // Add to appropriate collection
        this.addBuildingToGame(building);

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
        this.exitBuildingMode();
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
            miningFacility: { minerals: 75, data: 30 },
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