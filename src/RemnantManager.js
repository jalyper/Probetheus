/**
 * Remnant NPC Management System
 * Handles the spawning, movement, and interaction of Remnant NPCs
 * Part of The Remnants story system
 */
class RemnantManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;

        // Remnant state
        this.activeRemnant = null;
        this.lastSpawnTime = 0;
        this.spawnCooldown = 180000; // 3 minutes in ms
        this.despawnTimeout = 300000; // 5 minutes in ms

        // Animation state
        this.glowPhase = 0;
        this.glowSpeed = 2000; // ms per glow cycle

        // Visual constants
        this.shipSize = 20;
        this.colors = {
            primary: '#6b2d8b',      // Deep purple
            glow: '#00ffff',          // Soft cyan
            glowAlpha: 0.5
        };

        // The five Remnants
        this.remnantTypes = {
            'keth_varn': {
                id: 'keth_varn',
                name: 'Keth-Varn',
                title: 'The Mathematician',
                eyeColor: '#00ffff',  // Cyan
                shipStyle: 'crystalline',
                unlockCondition: () => true // Default, always available
            },
            'whisperer': {
                id: 'whisperer',
                name: 'The Whisperer',
                title: 'The Prophet',
                eyeColor: '#ffffff',  // White
                shipStyle: 'flickering',
                unlockCondition: () => this.getMiningStationCount() >= 3
            },
            'mira_sol': {
                id: 'mira_sol',
                name: 'Mira-Sol',
                title: 'The Human',
                eyeColor: '#ffaa00',  // Amber
                shipStyle: 'damaged',
                unlockCondition: () => this.hasAlienTechResearch()
            },
            'archivist': {
                id: 'archivist',
                name: 'The Archivist',
                title: 'The Ancient',
                eyeColor: '#aa3333',  // Dim red
                shipStyle: 'ancient',
                unlockCondition: () => this.getExploredSectorCount() >= 5
            },
            'null': {
                id: 'null',
                name: 'Null',
                title: 'The Void-Touched',
                eyeColor: '#000000',  // Void black
                shipStyle: 'void',
                unlockCondition: () => this.getPurchasedFragmentCount() >= 10
            }
        };

        // Story state (will be moved to StoryManager later)
        this.storyState = {
            fragmentsPurchased: new Set(),
            remnantsEncountered: new Set(),
            totalProbetheumSpentOnStory: 0
        };

        // Listen for events
        this.eventBus.on('game:update', this.update.bind(this));
        // Note: render() is called directly from GameController.render()
    }

    /**
     * Main update loop
     */
    update(data) {
        const deltaTime = data?.deltaTime || 16;

        // Check for spawn conditions
        if (!this.activeRemnant) {
            this.checkSpawnConditions();
        } else {
            // Update active remnant
            this.updateRemnant(deltaTime);

            // Check for despawn
            if (Date.now() - this.activeRemnant.spawnTime > this.despawnTimeout) {
                this.despawnRemnant('timeout');
            }
        }

        // Update glow animation
        this.glowPhase = (this.glowPhase + deltaTime) % this.glowSpeed;
    }

    /**
     * Check if spawn conditions are met
     */
    checkSpawnConditions() {
        const now = Date.now();

        // Check cooldown
        if (now - this.lastSpawnTime < this.spawnCooldown) {
            return;
        }

        // Only check once per second (not every frame)
        if (!this.lastSpawnCheck) this.lastSpawnCheck = 0;
        if (now - this.lastSpawnCheck < 1000) {
            return;
        }
        this.lastSpawnCheck = now;

        // Check minimum requirements:
        // - At least 2 explored sectors
        // - At least one mining station built (gates probetheum accumulation)
        const exploredSectors = this.getExploredSectorCount();
        const hasMiningStation = this.getMiningStationCount() > 0;

        if (exploredSectors < 2 || !hasMiningStation) {
            return;
        }

        // Calculate spawn chance (now per second since we throttle above)
        let spawnChance = 0.01; // Base 1% per second

        // Increase by 0.5% per explored sector (max +5%)
        spawnChance += Math.min(exploredSectors * 0.005, 0.05);

        // Increase by 1% if player has any Probetheum
        const currentProbetheum = this.gameState.probethium?.current || 0;
        if (currentProbetheum > 0) {
            spawnChance += 0.01;
        }

        // Roll for spawn
        if (Math.random() < spawnChance) {
            this.spawnRemnant();
        }
    }

    /**
     * Spawn a remnant NPC
     */
    spawnRemnant(forceType = null) {
        // Get available remnant types
        const availableTypes = Object.values(this.remnantTypes).filter(r => r.unlockCondition());

        if (availableTypes.length === 0) {
            return;
        }

        // Select remnant type
        let selectedType;
        if (forceType && this.remnantTypes[forceType]) {
            selectedType = this.remnantTypes[forceType];
        } else {
            selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        }

        // Find spawn position at edge of explored space
        const spawnPos = this.getSpawnPosition();
        if (!spawnPos) {
            return;
        }

        // Calculate travel destination (another point in explored space)
        const destPos = this.getDestinationPosition(spawnPos);

        // Create remnant
        this.activeRemnant = {
            type: selectedType,
            x: spawnPos.x,
            y: spawnPos.y,
            destX: destPos.x,
            destY: destPos.y,
            speed: 0.00002, // Very slow - 20% of probe base speed
            spawnTime: Date.now(),
            interacted: false
        };

        this.lastSpawnTime = Date.now();

        console.log(`Remnant spawned: ${selectedType.name} at (${spawnPos.x}, ${spawnPos.y})`);

        this.eventBus.emit('remnant:spawned', {
            remnantId: selectedType.id,
            position: { x: spawnPos.x, y: spawnPos.y }
        });
    }

    /**
     * Force spawn a specific remnant (for testing)
     */
    forceSpawn(remnantId) {
        if (this.activeRemnant) {
            this.despawnRemnant('forced');
        }
        this.spawnRemnant(remnantId);
    }

    /**
     * Get spawn position at edge of explored space
     */
    getSpawnPosition() {
        const world = this.gameState.getWorld();
        const exploredSectors = [];

        world.sectors.forEach((sector, key) => {
            if (sector.explored) {
                exploredSectors.push(sector);
            }
        });

        if (exploredSectors.length === 0) {
            return null;
        }

        // Pick a random explored sector
        const sector = exploredSectors[Math.floor(Math.random() * exploredSectors.length)];

        // Spawn at edge of sector
        const sectorCenterX = sector.x * world.standardSectorWidth + world.standardSectorWidth / 2;
        const sectorCenterY = sector.y * world.standardSectorHeight + world.standardSectorHeight / 2;

        // Pick a random edge
        const edge = Math.floor(Math.random() * 4);
        let x, y;

        switch (edge) {
            case 0: // Top
                x = sectorCenterX + (Math.random() - 0.5) * world.standardSectorWidth * 0.8;
                y = sector.y * world.standardSectorHeight + 50;
                break;
            case 1: // Right
                x = (sector.x + 1) * world.standardSectorWidth - 50;
                y = sectorCenterY + (Math.random() - 0.5) * world.standardSectorHeight * 0.8;
                break;
            case 2: // Bottom
                x = sectorCenterX + (Math.random() - 0.5) * world.standardSectorWidth * 0.8;
                y = (sector.y + 1) * world.standardSectorHeight - 50;
                break;
            case 3: // Left
                x = sector.x * world.standardSectorWidth + 50;
                y = sectorCenterY + (Math.random() - 0.5) * world.standardSectorHeight * 0.8;
                break;
        }

        return { x, y };
    }

    /**
     * Get destination position for remnant travel
     */
    getDestinationPosition(startPos) {
        const world = this.gameState.getWorld();
        const exploredSectors = [];

        world.sectors.forEach((sector, key) => {
            if (sector.explored) {
                exploredSectors.push(sector);
            }
        });

        // Pick a different sector or opposite edge
        const sector = exploredSectors[Math.floor(Math.random() * exploredSectors.length)];
        const sectorCenterX = sector.x * world.standardSectorWidth + world.standardSectorWidth / 2;
        const sectorCenterY = sector.y * world.standardSectorHeight + world.standardSectorHeight / 2;

        // Pick destination away from start
        const angle = Math.atan2(sectorCenterY - startPos.y, sectorCenterX - startPos.x);
        const distance = world.standardSectorWidth; // Travel roughly one sector

        return {
            x: startPos.x + Math.cos(angle) * distance,
            y: startPos.y + Math.sin(angle) * distance
        };
    }

    /**
     * Update remnant position and state
     */
    updateRemnant(deltaTime) {
        if (!this.activeRemnant) return;

        const r = this.activeRemnant;

        // Calculate direction to destination
        const dx = r.destX - r.x;
        const dy = r.destY - r.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            // Move towards destination
            const moveSpeed = r.speed * deltaTime;
            r.x += (dx / distance) * moveSpeed;
            r.y += (dy / distance) * moveSpeed;
        } else {
            // Reached destination - pick new one or despawn
            const newDest = this.getDestinationPosition({ x: r.x, y: r.y });
            r.destX = newDest.x;
            r.destY = newDest.y;
        }
    }

    /**
     * Despawn the active remnant
     */
    despawnRemnant(reason = 'unknown') {
        if (!this.activeRemnant) return;

        const remnantId = this.activeRemnant.type.id;

        console.log(`Remnant despawned: ${this.activeRemnant.type.name} (reason: ${reason})`);

        this.eventBus.emit('remnant:despawned', {
            remnantId: remnantId,
            reason: reason
        });

        this.activeRemnant = null;
    }

    /**
     * Check if click hits the remnant
     */
    checkClick(worldX, worldY) {
        if (!this.activeRemnant) return false;

        const r = this.activeRemnant;
        const dx = worldX - r.x;
        const dy = worldY - r.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Click detection radius
        const clickRadius = this.shipSize * 2;

        if (distance <= clickRadius) {
            this.interact();
            return true;
        }

        return false;
    }

    /**
     * Handle interaction with remnant
     */
    interact() {
        if (!this.activeRemnant || this.activeRemnant.interacted) return;

        this.activeRemnant.interacted = true;

        // Record encounter
        this.storyState.remnantsEncountered.add(this.activeRemnant.type.id);

        console.log(`Interacting with ${this.activeRemnant.type.name}`);

        this.eventBus.emit('remnant:interacted', {
            remnantId: this.activeRemnant.type.id
        });

        this.eventBus.emit('dialogue:started', {
            remnantId: this.activeRemnant.type.id,
            remnantType: this.activeRemnant.type
        });
    }

    /**
     * Render the remnant
     */
    render(ctx) {
        if (!this.activeRemnant) return;

        const r = this.activeRemnant;
        const world = this.gameState.getWorld();

        // Convert world coordinates to screen coordinates
        const screenX = r.x - world.viewOffset.x;
        const screenY = r.y - world.viewOffset.y;

        // Check if on screen
        if (screenX < -50 || screenX > window.innerWidth + 50 ||
            screenY < -50 || screenY > window.innerHeight + 50) {
            return;
        }

        // Calculate glow intensity (0.6 to 1.0)
        const glowProgress = this.glowPhase / this.glowSpeed;
        const glowIntensity = 0.6 + 0.4 * Math.sin(glowProgress * Math.PI * 2);

        ctx.save();
        ctx.translate(screenX, screenY);

        // Draw glow effect
        const glowRadius = this.shipSize * 2.5;
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
        glowGradient.addColorStop(0, `rgba(0, 255, 255, ${0.3 * glowIntensity})`);
        glowGradient.addColorStop(0.5, `rgba(107, 45, 139, ${0.2 * glowIntensity})`);
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw ship body (diamond shape)
        ctx.fillStyle = this.colors.primary;
        ctx.strokeStyle = `rgba(0, 255, 255, ${glowIntensity})`;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(0, -this.shipSize);  // Top
        ctx.lineTo(this.shipSize * 0.7, 0);  // Right
        ctx.lineTo(0, this.shipSize * 0.8);  // Bottom
        ctx.lineTo(-this.shipSize * 0.7, 0);  // Left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw inner glow (eyes-like center)
        const eyeGlow = ctx.createRadialGradient(0, -5, 0, 0, -5, 8);
        const eyeColor = r.type.eyeColor || this.colors.glow;
        eyeGlow.addColorStop(0, eyeColor);
        eyeGlow.addColorStop(0.5, `${eyeColor}88`);
        eyeGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = eyeGlow;
        ctx.beginPath();
        ctx.arc(0, -5, 8 * glowIntensity, 0, Math.PI * 2);
        ctx.fill();

        // Draw particle trail
        this.renderTrail(ctx, glowIntensity);

        ctx.restore();
    }

    /**
     * Render particle trail behind remnant
     */
    renderTrail(ctx, glowIntensity) {
        if (!this.activeRemnant) return;

        const r = this.activeRemnant;

        // Calculate movement direction
        const dx = r.destX - r.x;
        const dy = r.destY - r.y;
        const angle = Math.atan2(dy, dx);

        // Draw trail particles
        for (let i = 0; i < 5; i++) {
            const trailDist = 20 + i * 15;
            const trailX = -Math.cos(angle) * trailDist;
            const trailY = -Math.sin(angle) * trailDist;
            const trailAlpha = (1 - i / 5) * 0.5 * glowIntensity;
            const trailSize = (1 - i / 5) * 4;

            ctx.fillStyle = `rgba(0, 255, 255, ${trailAlpha})`;
            ctx.beginPath();
            ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Check if cursor is over remnant (for cursor change)
     */
    isMouseOver(worldX, worldY) {
        if (!this.activeRemnant) return false;

        const r = this.activeRemnant;
        const dx = worldX - r.x;
        const dy = worldY - r.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance <= this.shipSize * 2;
    }

    // ==================== Helper Methods ====================

    /**
     * Get number of explored sectors
     */
    getExploredSectorCount() {
        const world = this.gameState.getWorld();
        let count = 0;
        world.sectors.forEach(sector => {
            if (sector.explored) count++;
        });
        return count;
    }

    /**
     * Get lifetime probetheum (total ever collected)
     */
    getLifetimeProbetheum() {
        return this.gameState.probethium?.totalAccumulated || 0;
    }

    /**
     * Get current probetheum
     */
    getCurrentProbetheum() {
        return this.gameState.probethium?.current || 0;
    }

    /**
     * Get number of mining stations
     */
    getMiningStationCount() {
        const entities = this.gameState.getEntities();
        return (entities.miningOutposts?.length || 0) + (entities.miningFacilities?.length || 0);
    }

    /**
     * Check if player has any alien tech research
     */
    hasAlienTechResearch() {
        const research = this.gameState.getResearchSystem();
        // Check for alien-related research nodes
        const alienResearch = ['universal_collector', 'rarity_uncommon', 'rarity_rare'];
        return alienResearch.some(r => research.researched.has(r));
    }

    /**
     * Get number of purchased story fragments
     */
    getPurchasedFragmentCount() {
        return this.storyState.fragmentsPurchased.size;
    }

    /**
     * Get active remnant (for external access)
     */
    getActiveRemnant() {
        return this.activeRemnant;
    }

    /**
     * Get story state (for save/load)
     */
    getStoryState() {
        return {
            fragmentsPurchased: Array.from(this.storyState.fragmentsPurchased),
            remnantsEncountered: Array.from(this.storyState.remnantsEncountered),
            totalProbetheumSpentOnStory: this.storyState.totalProbetheumSpentOnStory
        };
    }

    /**
     * Set story state (for save/load)
     */
    setStoryState(state) {
        if (state) {
            this.storyState.fragmentsPurchased = new Set(state.fragmentsPurchased || []);
            this.storyState.remnantsEncountered = new Set(state.remnantsEncountered || []);
            this.storyState.totalProbetheumSpentOnStory = state.totalProbetheumSpentOnStory || 0;
        }
    }
}

// Export for use in other modules
window.RemnantManager = RemnantManager;
