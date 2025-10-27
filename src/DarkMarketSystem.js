/**
 * Dark Market System
 * Special rare signal that opens a mysterious shop
 */

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
        
        // Available cosmetics
        this.availableCosmetics = {
            probe_skin_void: {
                id: 'probe_skin_void',
                name: 'Void Walker Skin',
                type: 'probe_skin',
                cost: 150,
                color: '#9400d3', // Dark purple
                description: 'A mysterious purple skin from the void'
            },
            probe_skin_solar: {
                id: 'probe_skin_solar',
                name: 'Solar Flare Skin',
                type: 'probe_skin',
                cost: 175,
                color: '#ff4500', // Orange-red
                description: 'Burning bright like a solar flare'
            },
            probe_skin_quantum: {
                id: 'probe_skin_quantum',
                name: 'Quantum Phase Skin',
                type: 'probe_skin',
                cost: 200,
                color: '#00ffaa', // Bright teal
                description: 'Shifts between dimensional phases'
            }
        };
        
        // Special rewards pool
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
            // Echo rewards would go here in future
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
     * Generate dark market inventory
     */
    generateMarketInventory() {
        this.lastMarketGeneration = Date.now();
        
        // Pick 1 special reward
        const specialReward = this.specialRewards[Math.floor(Math.random() * this.specialRewards.length)];
        
        // Pick 2-3 random cosmetics
        const cosmeticKeys = Object.keys(this.availableCosmetics);
        const numCosmetics = 2 + Math.floor(Math.random() * 2); // 2-3 items
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
     * Purchase item from dark market
     */
    purchaseItem(itemId) {
        const resources = this.gameState.getResources();
        
        // Find item in current inventory
        let item = null;
        let itemCost = 0;
        
        if (this.currentMarketInventory.specialReward.id === itemId) {
            item = this.currentMarketInventory.specialReward;
            itemCost = item.cost;
        } else {
            item = this.currentMarketInventory.cosmetics.find(c => c.id === itemId);
            if (item) itemCost = item.cost;
        }
        
        if (!item) {
            console.error('Item not found in market:', itemId);
            return false;
        }
        
        // Check if player has enough Probethium
        if (resources.probethium < itemCost) {
            this.eventBus.emit('ui:message', {
                text: `Not enough Probethium! Need ${itemCost}P, have ${resources.probethium}P`,
                type: 'error'
            });
            return false;
        }
        
        // Deduct Probethium
        resources.probethium -= itemCost;
        this.gameState.updateResources(resources, this.eventBus);
        
        // Apply item effects
        if (item.type === 'probe_skin') {
            // Add to owned cosmetics
            if (!this.gameState.ownedCosmetics) {
                this.gameState.ownedCosmetics = { probeSkins: [] };
            }
            if (!this.gameState.ownedCosmetics.probeSkins) {
                this.gameState.ownedCosmetics.probeSkins = [];
            }
            this.gameState.ownedCosmetics.probeSkins.push(item);
            
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
            // Add equipment to inventory
            // (Equipment system to be implemented)
            this.eventBus.emit('ui:message', {
                text: `Received equipment pack! (Equipment system coming soon)`,
                type: 'success'
            });
        }
        
        return true;
    }
}

// Export for use in GameController
window.DarkMarketSystem = DarkMarketSystem;
