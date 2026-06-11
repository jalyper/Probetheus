/**
 * Equipment System
 * Defines equipment types and handles equipment slot management
 */

// Collector modules unlock via Uplink protocols (REBUILD.md §1):
// Harvest Lattice opens the typed collectors; Universal Lattice the universal.
const EQUIPMENT_TYPES = {
    mineral_collector: {
        id: 'mineral_collector',
        name: 'Mineral Collector',
        description: 'Automatically collects mineral signals',
        collectionTypes: ['minerals'],
        slotsRequired: 1,
        cost: 25,
        requiredProtocol: 'harvest_lattice'
    },
    data_collector: {
        id: 'data_collector',
        name: 'Data Collector',
        description: 'Automatically collects data signals',
        collectionTypes: ['data'],
        slotsRequired: 1,
        cost: 25,
        requiredProtocol: 'harvest_lattice'
    },
    artifact_collector: {
        id: 'artifact_collector',
        name: 'Artifact Collector',
        description: 'Automatically collects artifact signals',
        collectionTypes: ['artifacts'],
        slotsRequired: 1,
        cost: 25,
        requiredProtocol: 'harvest_lattice'
    },
    universal_collector: {
        id: 'universal_collector',
        name: 'Universal Collector',
        description: 'Collects all resource types in one efficient package',
        collectionTypes: ['all'],
        slotsRequired: 1,
        cost: 50,
        requiredProtocol: 'universal_lattice',
        tier: 'advanced'
    }
};

class EquipmentSystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
    }

    /**
     * Get all equipment types
     */
    static getEquipmentTypes() {
        return EQUIPMENT_TYPES;
    }

    /**
     * Get a specific equipment definition
     */
    static getEquipmentDef(equipmentId) {
        return EQUIPMENT_TYPES[equipmentId] || null;
    }

    /**
     * Get available equipment based on decoded Uplink protocols
     */
    getAvailableEquipment() {
        return Object.values(EQUIPMENT_TYPES).filter(equipment =>
            this.gameState.hasProtocol(equipment.requiredProtocol)
        );
    }

    /**
     * Check if equipment can be installed on probe
     */
    canEquip(probe, equipmentId) {
        const equipment = EQUIPMENT_TYPES[equipmentId];
        if (!equipment) {
            return { canEquip: false, reason: 'Unknown equipment type' };
        }

        // Check protocol unlock
        if (!this.gameState.hasProtocol(equipment.requiredProtocol)) {
            return { canEquip: false, reason: 'Uplink protocol required' };
        }

        // Check slot availability
        const usedSlots = this.getUsedSlots(probe);
        const maxSlots = probe.maxEquipmentSlots || 2;
        if (usedSlots + equipment.slotsRequired > maxSlots) {
            return { canEquip: false, reason: 'Not enough equipment slots' };
        }

        // Check if already equipped (no stacking)
        if (this.hasEquipment(probe, equipmentId)) {
            return { canEquip: false, reason: 'Already equipped' };
        }

        // Check resources
        const resources = this.gameState.getResources();
        if (resources.minerals < equipment.cost) {
            return { canEquip: false, reason: `Need ${equipment.cost} minerals` };
        }

        return { canEquip: true, reason: null };
    }

    /**
     * Get number of used equipment slots
     */
    getUsedSlots(probe) {
        if (!probe.equipment || !Array.isArray(probe.equipment)) {
            return 0;
        }
        return probe.equipment.reduce((total, eq) => {
            const def = EQUIPMENT_TYPES[eq.type];
            return total + (def ? def.slotsRequired : 1);
        }, 0);
    }

    /**
     * Check if probe has specific equipment
     */
    hasEquipment(probe, equipmentId) {
        if (!probe.equipment || !Array.isArray(probe.equipment)) {
            return false;
        }
        return probe.equipment.some(eq => eq.type === equipmentId);
    }

    /**
     * Equip an item on a probe
     */
    equipItem(probe, equipmentId) {
        const check = this.canEquip(probe, equipmentId);
        if (!check.canEquip) {
            return { success: false, reason: check.reason };
        }

        const equipment = EQUIPMENT_TYPES[equipmentId];

        // Deduct cost
        this.gameState.resources.minerals -= equipment.cost;

        // Initialize equipment array if needed
        if (!probe.equipment || !Array.isArray(probe.equipment)) {
            probe.equipment = [];
        }

        // Add equipment
        probe.equipment.push({
            type: equipmentId,
            name: equipment.name,
            collectionTypes: equipment.collectionTypes,
            installedAt: Date.now()
        });

        this.eventBus.emit('probe:equipmentChanged', { probe, added: equipmentId });
        this.eventBus.emit('ui:update');

        return { success: true };
    }

    /**
     * Remove equipment from a probe
     */
    unequipItem(probe, equipmentId) {
        if (!probe.equipment || !Array.isArray(probe.equipment)) {
            return { success: false, reason: 'No equipment to remove' };
        }

        const index = probe.equipment.findIndex(eq => eq.type === equipmentId);
        if (index === -1) {
            return { success: false, reason: 'Equipment not found' };
        }

        probe.equipment.splice(index, 1);

        this.eventBus.emit('probe:equipmentChanged', { probe, removed: equipmentId });
        this.eventBus.emit('ui:update');

        return { success: true };
    }

    /**
     * Get combined collection types for a probe
     */
    getCollectionTypes(probe) {
        if (!probe.equipment || !Array.isArray(probe.equipment)) {
            return [];
        }

        const types = new Set();
        probe.equipment.forEach(eq => {
            if (eq.collectionTypes) {
                eq.collectionTypes.forEach(t => types.add(t));
            }
        });

        // If 'all' is present, return all types
        if (types.has('all')) {
            return ['minerals', 'data', 'artifacts', 'all'];
        }

        return Array.from(types);
    }

    /**
     * Check if probe can collect a specific resource type
     */
    canCollect(probe, resourceType) {
        const collectionTypes = this.getCollectionTypes(probe);
        return collectionTypes.includes('all') || collectionTypes.includes(resourceType);
    }

    /**
     * Migrate old equipment format to new array format
     */
    static migrateEquipment(probe) {
        // If equipment is already an array, no migration needed
        if (Array.isArray(probe.equipment)) {
            return;
        }

        // If equipment is null/undefined, initialize empty array
        if (!probe.equipment) {
            probe.equipment = [];
            probe.maxEquipmentSlots = probe.maxEquipmentSlots || 2;
            return;
        }

        // If equipment is an object (old format), migrate to array
        if (typeof probe.equipment === 'object') {
            const oldEquipment = probe.equipment;
            probe.equipment = [];
            probe.maxEquipmentSlots = probe.maxEquipmentSlots || 2;

            // Convert old auto_collector to appropriate new format
            if (oldEquipment.type === 'auto_collector') {
                // Check what it was collecting
                const collectionTypes = oldEquipment.collectionTypes || [];

                if (collectionTypes.includes('all') || collectionTypes.length >= 3) {
                    // Had all types - give universal collector
                    probe.equipment.push({
                        type: 'universal_collector',
                        name: 'Universal Collector',
                        collectionTypes: ['all'],
                        installedAt: Date.now()
                    });
                } else {
                    // Convert individual types
                    if (collectionTypes.includes('minerals')) {
                        probe.equipment.push({
                            type: 'mineral_collector',
                            name: 'Mineral Collector',
                            collectionTypes: ['minerals'],
                            installedAt: Date.now()
                        });
                    }
                    if (collectionTypes.includes('data')) {
                        probe.equipment.push({
                            type: 'data_collector',
                            name: 'Data Collector',
                            collectionTypes: ['data'],
                            installedAt: Date.now()
                        });
                    }
                    if (collectionTypes.includes('artifacts')) {
                        probe.equipment.push({
                            type: 'artifact_collector',
                            name: 'Artifact Collector',
                            collectionTypes: ['artifacts'],
                            installedAt: Date.now()
                        });
                    }
                }
            }
        }
    }
}

// Make available globally
window.EquipmentSystem = EquipmentSystem;
window.EQUIPMENT_TYPES = EQUIPMENT_TYPES;
