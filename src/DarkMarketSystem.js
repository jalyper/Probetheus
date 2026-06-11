/**
 * Dark Market System
 * Special rare signal that opens a mysterious shop
 * Now with NPC-specific inventories and shell bonuses
 */

// NPC Inventory Configuration
const NPC_INVENTORY = {
    keth_varn: {
        theme: 'Data & Calculation',
        color: '#B06BFF',
        description: 'Specializes in data processing and research acceleration',
        sharedCount: 2,  // Number of random shared shells to include
        specialReward: {
            id: 'data_cache',
            name: 'Keth-Varn\'s Data Cache',
            type: 'resources',
            cost: 150,
            contents: { data: 100, artifacts: 25 },
            description: 'A compressed archive of calculated insights'
        }
    },
    whisperer: {
        theme: 'Signals & Detection',
        color: '#B06BFF',
        description: 'Specializes in signal enhancement and rare discoveries',
        sharedCount: 2,
        specialReward: {
            id: 'signal_beacon',
            name: 'Whisperer\'s Signal Beacon',
            type: 'resources',
            cost: 150,
            contents: { data: 50, exoticMinerals: 30 },
            description: 'A device that attracts distant signals'
        }
    },
    mira_sol: {
        theme: 'Survival & Durability',
        color: '#B06BFF',
        description: 'Specializes in probe protection and endurance',
        sharedCount: 3,
        specialReward: {
            id: 'repair_kit',
            name: 'Mira-Sol\'s Repair Kit',
            type: 'resources',
            cost: 125,
            contents: { minerals: 150, data: 25 },
            description: 'Emergency repair supplies for damaged probes'
        }
    },
    archivist: {
        theme: 'Discovery & Artifacts',
        color: '#B06BFF',
        description: 'Specializes in artifact discovery and exploration',
        sharedCount: 2,
        specialReward: {
            id: 'artifact_map',
            name: 'Archivist\'s Relic Map',
            type: 'resources',
            cost: 175,
            contents: { artifacts: 75, exoticMinerals: 15 },
            description: 'Ancient coordinates to hidden relics'
        }
    },
    null: {
        theme: 'Exotic & Void',
        color: '#B06BFF',
        description: 'Specializes in exotic materials and Probethium',
        sharedCount: 1,
        specialReward: {
            id: 'void_essence',
            name: 'Null\'s Void Essence',
            type: 'probethium_boost',
            cost: 200,
            boost: 0.5,  // Adds 0.5 Probethium directly
            description: 'Concentrated essence of the void itself'
        }
    }
};

class DarkMarketSystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;

        // Dark Market spawn rate
        this.baseSpawnChance = 0.002; // 0.2% per signal generation
        this.boostedSpawnChance = 0.01; // 1% with research

        // Track available items in current market
        this.currentMarketInventory = null;
        this.lastMarketGeneration = null;
        this.currentNPC = null;

        // Legacy cosmetics (kept for backwards compatibility)
        this.availableCosmetics = {
            probe_shell_void: {
                id: 'probe_shell_void',
                name: 'Void Walker Shell',
                type: 'probe_shell',
                cost: 150,
                color: '#9400d3',
                description: 'A mysterious purple shell from the void'
            },
            probe_shell_solar: {
                id: 'probe_shell_solar',
                name: 'Solar Flare Shell',
                type: 'probe_shell',
                cost: 175,
                color: '#ff4500',
                description: 'Burning bright like a solar flare'
            },
            probe_shell_quantum: {
                id: 'probe_shell_quantum',
                name: 'Quantum Phase Shell',
                type: 'probe_shell',
                cost: 200,
                color: '#00ffaa',
                description: 'Shifts between dimensional phases'
            }
        };

        // Special rewards pool (legacy, used for random market)
        this.specialRewards = [
            {
                id: 'resource_bundle',
                name: 'Exotic Resource Cache',
                type: 'resources',
                cost: 100,
                contents: { exoticMinerals: 50, artifacts: 25 },
                description: 'A bundle of rare resources'
            },
            {
                id: 'equipment_pack',
                name: 'Advanced Equipment Pack',
                type: 'equipment',
                cost: 250,
                contents: ['signal_amplifier', 'cargo_expander_mk1', 'velocity_booster'],
                description: 'Three random equipment modules'
            }
        ];
    }

    /**
     * Check if dark market signal should spawn
     */
    shouldSpawnDarkMarket() {
        const hasResearch = this.gameState.research?.researched?.has('dark_market_frequency');
        const chance = hasResearch ? this.boostedSpawnChance : this.baseSpawnChance;
        return Math.random() < chance;
    }

    /**
     * Generate dark market inventory for a specific NPC
     */
    generateNPCInventory(npcId) {
        this.lastMarketGeneration = Date.now();
        this.currentNPC = npcId;

        const npcConfig = NPC_INVENTORY[npcId];
        if (!npcConfig) {
            console.error('Unknown NPC:', npcId);
            return this.generateMarketInventory(); // Fallback to random
        }

        const shellSystem = this.getShellSystem();
        if (!shellSystem) {
            console.warn('ShellSystem not available');
            return this.generateMarketInventory();
        }

        // Get NPC's unique shells
        const npcShells = shellSystem.getShellsByNPC(npcId);
        const sharedShells = shellSystem.getSharedShells();

        // Build inventory
        const inventory = {
            npcId: npcId,
            npcConfig: npcConfig,
            specialReward: npcConfig.specialReward,
            shells: {
                probes: [],
                hubs: [],
                miningStations: []
            },
            generatedAt: this.lastMarketGeneration
        };

        // Add all unowned NPC-unique shells
        ['probes', 'hubs', 'miningStations'].forEach(category => {
            npcShells[category].forEach(shell => {
                if (!shellSystem.ownsShell(category, shell.id)) {
                    inventory.shells[category].push({
                        ...shell,
                        category: category,
                        isUnique: true
                    });
                }
            });
        });

        // Add random shared shells (not owned)
        const sharedToAdd = npcConfig.sharedCount || 2;
        let addedShared = 0;

        ['probes', 'hubs', 'miningStations'].forEach(category => {
            const available = sharedShells[category].filter(
                shell => !shellSystem.ownsShell(category, shell.id)
            );

            // Shuffle and pick
            const shuffled = available.sort(() => Math.random() - 0.5);
            for (const shell of shuffled) {
                if (addedShared >= sharedToAdd) break;
                inventory.shells[category].push({
                    ...shell,
                    category: category,
                    isUnique: false
                });
                addedShared++;
            }
        });

        this.currentMarketInventory = inventory;
        return inventory;
    }

    /**
     * Generate random dark market inventory (legacy/signal spawn)
     */
    generateMarketInventory() {
        this.lastMarketGeneration = Date.now();
        this.currentNPC = null;

        // Pick 1 special reward
        const specialReward = this.specialRewards[Math.floor(Math.random() * this.specialRewards.length)];

        // Pick 2-3 random cosmetics
        const cosmeticKeys = Object.keys(this.availableCosmetics);
        const numCosmetics = 2 + Math.floor(Math.random() * 2);
        const selectedCosmetics = [];

        while (selectedCosmetics.length < numCosmetics && cosmeticKeys.length > 0) {
            const idx = Math.floor(Math.random() * cosmeticKeys.length);
            const key = cosmeticKeys.splice(idx, 1)[0];
            selectedCosmetics.push(this.availableCosmetics[key]);
        }

        this.currentMarketInventory = {
            specialReward: specialReward,
            cosmetics: selectedCosmetics,
            generatedAt: this.lastMarketGeneration
        };

        return this.currentMarketInventory;
    }

    /**
     * Get the ShellSystem instance
     */
    getShellSystem() {
        return window.game?.shellSystem || null;
    }

    /**
     * Purchase a shell from the market
     */
    purchaseShell(category, shellId) {
        const shellSystem = this.getShellSystem();
        if (!shellSystem) {
            this.eventBus.emit('ui:message', {
                text: 'Shell system not available',
                type: 'error'
            });
            return false;
        }

        const result = shellSystem.purchaseShell(category, shellId);

        if (result.success) {
            this.eventBus.emit('ui:message', {
                text: `Purchased ${result.shell.name}!`,
                type: 'success'
            });

            // Remove from current inventory display
            if (this.currentMarketInventory?.shells?.[category]) {
                this.currentMarketInventory.shells[category] =
                    this.currentMarketInventory.shells[category].filter(s => s.id !== shellId);
            }

            return true;
        } else {
            this.eventBus.emit('ui:message', {
                text: result.error || 'Purchase failed',
                type: 'error'
            });
            return false;
        }
    }

    /**
     * Purchase special reward item
     */
    purchaseSpecialReward() {
        const item = this.currentMarketInventory?.specialReward;
        if (!item) {
            this.eventBus.emit('ui:message', {
                text: 'No special reward available',
                type: 'error'
            });
            return false;
        }

        const currentProbethium = this.gameState.probethium?.current || 0;
        if (currentProbethium < item.cost) {
            this.eventBus.emit('ui:message', {
                text: `Not enough Probethium! Need ${item.cost}P`,
                type: 'error'
            });
            return false;
        }

        // Deduct Probethium
        this.gameState.probethium.current -= item.cost;

        // Apply item effects based on type
        if (item.type === 'resources') {
            const resources = this.gameState.getResources();
            Object.entries(item.contents).forEach(([res, amt]) => {
                resources[res] = (resources[res] || 0) + amt;
            });
            this.gameState.updateResources(resources, this.eventBus);

            this.eventBus.emit('ui:message', {
                text: `Received ${Object.entries(item.contents).map(([r, a]) => `${a} ${r}`).join(', ')}!`,
                type: 'success'
            });
        } else if (item.type === 'probethium_boost') {
            this.gameState.probethium.current += item.boost;
            this.gameState.probethium.totalAccumulated += item.boost;

            this.eventBus.emit('ui:message', {
                text: `Received +${item.boost} Probethium!`,
                type: 'success'
            });
        }

        // Mark as purchased
        this.currentMarketInventory.specialReward = null;
        this.eventBus.emit('ui:update');

        return true;
    }

    /**
     * Purchase item from dark market (legacy method)
     */
    purchaseItem(itemId) {
        const resources = this.gameState.getResources();

        // Find item in current inventory
        let item = null;
        let itemCost = 0;

        if (this.currentMarketInventory.specialReward?.id === itemId) {
            item = this.currentMarketInventory.specialReward;
            itemCost = item.cost;
        } else {
            item = this.currentMarketInventory.cosmetics?.find(c => c.id === itemId);
            if (item) itemCost = item.cost;
        }

        if (!item) {
            console.error('Item not found in market:', itemId);
            return false;
        }

        // Check if player has enough Probethium
        const currentProbethium = this.gameState.probethium?.current || 0;
        if (currentProbethium < itemCost) {
            this.eventBus.emit('ui:message', {
                text: `Not enough Probethium! Need ${itemCost}P, have ${currentProbethium.toFixed(2)}P`,
                type: 'error'
            });
            return false;
        }

        // Deduct Probethium
        this.gameState.probethium.current -= itemCost;

        // Apply item effects
        if (item.type === 'probe_shell') {
            // Add to owned cosmetics
            if (!this.gameState.ownedCosmetics) {
                this.gameState.ownedCosmetics = { probeShells: [] };
            }
            if (!this.gameState.ownedCosmetics.probeShells) {
                this.gameState.ownedCosmetics.probeShells = [];
            }
            this.gameState.ownedCosmetics.probeShells.push(item);

            this.eventBus.emit('ui:message', {
                text: `Purchased ${item.name}! Check probe details to equip.`,
                type: 'success'
            });
        } else if (item.type === 'resources') {
            // Add resources
            Object.entries(item.contents).forEach(([res, amt]) => {
                resources[res] = (resources[res] || 0) + amt;
            });
            this.gameState.updateResources(resources, this.eventBus);

            this.eventBus.emit('ui:message', {
                text: `Received ${Object.entries(item.contents).map(([r, a]) => `${a} ${r}`).join(', ')}!`,
                type: 'success'
            });
        } else if (item.type === 'equipment') {
            this.eventBus.emit('ui:message', {
                text: `Received equipment pack! (Equipment system coming soon)`,
                type: 'success'
            });
        }

        this.eventBus.emit('ui:update');
        return true;
    }

    /**
     * Get current NPC inventory config
     */
    getNPCConfig(npcId) {
        return NPC_INVENTORY[npcId] || null;
    }

    /**
     * Get all flat shell items from current inventory for display
     */
    getAllShellsFromInventory() {
        if (!this.currentMarketInventory?.shells) return [];

        const allShells = [];
        ['probes', 'hubs', 'miningStations'].forEach(category => {
            const shells = this.currentMarketInventory.shells[category] || [];
            shells.forEach(shell => {
                allShells.push({ ...shell, category });
            });
        });

        return allShells;
    }

    /**
     * Filter shells by category
     */
    getShellsByCategory(category) {
        if (!this.currentMarketInventory?.shells) return [];
        return this.currentMarketInventory.shells[category] || [];
    }
}

// Export for use in GameController
window.DarkMarketSystem = DarkMarketSystem;
window.NPC_INVENTORY = NPC_INVENTORY;
