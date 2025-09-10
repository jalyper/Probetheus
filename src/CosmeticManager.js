/**
 * Cosmetic Manager
 * Handles complete probe skins purchasable with Probethium
 */
class CosmeticManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        
        // Initialize cosmetic data if not present
        if (!this.gameState.cosmetics) {
            this.gameState.cosmetics = {
                ownedSkins: ['default'], // Player always owns default skin
                activeSkin: 'default'
            };
        }
        
        // Define available skins catalog
        this.skinCatalog = this.createSkinCatalog();
        
        // Listen for events
        this.eventBus.on('cosmetic:purchase', this.purchaseSkin.bind(this));
        this.eventBus.on('cosmetic:equip', this.equipSkin.bind(this));
    }
    
    /**
     * Create the catalog of available complete skins
     */
    createSkinCatalog() {
        return {
            'default': {
                name: 'Standard Explorer',
                description: 'The classic probe design with cyan energy signatures',
                price: 0,
                unlocked: true,
                design: {
                    bodyColor: '#00ffff',
                    bodyRadius: 4,
                    wingColor: '#00ffff',
                    wingLength: 8,
                    wingWidth: 2,
                    wingGap: 2,
                    frontColor: '#00ffff',
                    frontSize: 4,
                    frontHeight: 2.5,
                    antennaColor: '#00ffff',
                    antennaLength: 6,
                    antennaWidth: 1,
                    antennaAngle: 15,
                    blinkSpeed: 1500,
                    trailEnabled: true,
                    trail: {
                        length: 15,
                        color: '#00ffff',
                        width: 3,
                        opacity: 0.9
                    }
                }
            },
            
            'crimson_explorer': {
                name: 'Crimson Explorer',
                description: 'A sleek design with deep red body, metallic sheen, and gold-trimmed wings',
                price: 250, // Probethium cost
                unlocked: false,
                design: {
                    bodyColor: '#dc143c', // Crimson red
                    bodyRadius: 4,
                    wingColor: '#ffd700', // Gold wings
                    wingLength: 8,
                    wingWidth: 2,
                    wingGap: 2,
                    frontColor: '#8b0000', // Dark red nose
                    frontSize: 4,
                    frontHeight: 2.5,
                    antennaColor: '#ffd700', // Gold antennas
                    antennaLength: 6,
                    antennaWidth: 1.5, // Slightly thicker for premium look
                    antennaAngle: 15,
                    blinkSpeed: 1200, // Faster blink for premium feel
                    trailEnabled: true,
                    trail: {
                        length: 18, // Longer trail
                        color: '#ff4500', // Orange-red trail
                        width: 4, // Wider trail
                        opacity: 0.85
                    }
                }
            }
        };
    }
    
    /**
     * Get all available skins for UI display
     */
    getAvailableSkins() {
        return Object.keys(this.skinCatalog).map(skinId => {
            const skin = this.skinCatalog[skinId];
            return {
                id: skinId,
                name: skin.name,
                description: skin.description,
                price: skin.price,
                owned: this.gameState.cosmetics.ownedSkins.includes(skinId),
                active: this.gameState.cosmetics.activeSkin === skinId,
                unlocked: skin.unlocked || this.gameState.cosmetics.ownedSkins.includes(skinId)
            };
        });
    }
    
    /**
     * Get the current active skin design
     */
    getActiveSkinDesign() {
        const activeSkinId = this.gameState.cosmetics.activeSkin;
        return this.skinCatalog[activeSkinId]?.design || this.skinCatalog['default'].design;
    }
    
    /**
     * Purchase a skin with Probethium
     */
    purchaseSkin(data) {
        const { skinId } = data;
        const skin = this.skinCatalog[skinId];
        
        if (!skin) {
            this.eventBus.emit('ui:message', { text: 'Skin not found!', type: 'error' });
            return false;
        }
        
        if (this.gameState.cosmetics.ownedSkins.includes(skinId)) {
            // Don't spam the same message - only show once per minute
            const now = Date.now();
            if (!this.lastOwnershipMessage || now - this.lastOwnershipMessage > 60000) {
                this.eventBus.emit('ui:message', { text: 'You already own this skin!', type: 'info' });
                this.lastOwnershipMessage = now;
            }
            return false;
        }
        
        const resources = this.gameState.getResources();
        if (resources.probethium < skin.price) {
            this.eventBus.emit('ui:message', { 
                text: `Not enough Probethium! Need ${skin.price}, have ${resources.probethium}`, 
                type: 'error' 
            });
            return false;
        }
        
        // Purchase the skin
        this.gameState.updateResources({ probethium: resources.probethium - skin.price }, this.eventBus);
        this.gameState.cosmetics.ownedSkins.push(skinId);
        
        this.eventBus.emit('ui:message', { 
            text: `Purchased ${skin.name} for ${skin.price} Probethium!`, 
            type: 'success' 
        });
        
        // Auto-equip purchased skin
        this.equipSkin({ skinId });
        
        this.eventBus.emit('ui:update');
        return true;
    }
    
    /**
     * Equip a skin (if owned)
     */
    equipSkin(data) {
        const { skinId } = data;
        const skin = this.skinCatalog[skinId];
        
        if (!skin) {
            this.eventBus.emit('ui:message', { text: 'Skin not found!', type: 'error' });
            return false;
        }
        
        if (!this.gameState.cosmetics.ownedSkins.includes(skinId)) {
            this.eventBus.emit('ui:message', { text: 'You do not own this skin!', type: 'error' });
            return false;
        }
        
        this.gameState.cosmetics.activeSkin = skinId;
        
        // Apply skin to all active probes
        this.applyActiveSkinToAllProbes();
        
        this.eventBus.emit('ui:message', { 
            text: `Equipped ${skin.name}!`, 
            type: 'success' 
        });
        
        this.eventBus.emit('ui:update');
        return true;
    }
    
    /**
     * Apply the active skin to all probes
     */
    applyActiveSkinToAllProbes() {
        const skinDesign = this.getActiveSkinDesign();
        
        this.gameState.entities.probes.forEach(probe => {
            probe.cosmetic = { ...skinDesign };
        });
    }
}

// Export for use in other modules
window.CosmeticManager = CosmeticManager;