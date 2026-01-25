# Equipment Slots System PRD

**Version:** 1.0
**Date:** January 2026
**Status:** Planning

---

## Overview

This PRD outlines a new equipment slot system for probes that constrains the number of equipment pieces a probe can carry, introduces individual resource collectors, and adds a Universal Collector as a premium upgrade option.

---

## Requirements

### REQ-1: Equipment Slot Constraint

**Priority:** High
**Type:** Core Mechanic Change

**Description:**
Probes should have a limited number of equipment slots (default: 2) that can be upgraded to 3 through research or other means.

**Current Behavior:**
- Equipment is stored as a single object (`probe.equipment`)
- No limit on what equipment can be installed
- Equipment is either present or null

**Expected Behavior:**
- Each probe has an `equipmentSlots` property (default: 2, max: 3)
- Equipment is stored as an array of equipment objects
- Players cannot install more equipment than available slots
- UI shows available/used slots clearly
- Research tree includes "Expanded Cargo Bay" upgrade (2 → 3 slots)

**Implementation Notes:**
- Location: `src/ProbeManager.js`, `src/UIManager.js`
- Migrate `probe.equipment` from object to array
- Add `probe.maxEquipmentSlots` property (default: 2)
- Update SaveManager serialization for equipment arrays
- Update all code that checks `probe.equipment` object to use array methods

**Data Structure:**
```javascript
probe = {
    ...existingProps,
    maxEquipmentSlots: 2,  // upgradeable to 3
    equipment: [
        { type: 'mineral_collector', name: 'Mineral Collector', slot: 0 },
        { type: 'data_collector', name: 'Data Collector', slot: 1 }
    ]
}
```

**Test Specification:**
```javascript
test('probe should not accept more equipment than available slots', async ({ page }) => {
    // Setup: Deploy probe, equip 2 items
    // Verify: Both items equipped
    // Action: Try to equip third item
    // Verify: Equipment rejected, error message shown
});

test('probe equipment slots can be upgraded to 3', async ({ page }) => {
    // Setup: Research "Expanded Cargo Bay"
    // Verify: Probe maxEquipmentSlots increased to 3
    // Action: Equip 3 items
    // Verify: All 3 items equipped successfully
});
```

---

### REQ-2: Individual Resource Collectors

**Priority:** High
**Type:** New Feature

**Description:**
Create separate collector equipment items for each resource type. Each collector takes one equipment slot and only collects its specific resource type.

**Current Behavior:**
- Single "Auto-Collector" handles all resource types
- Collection types determined by research unlocks
- No slot cost concept

**Expected Behavior:**
- Three individual collectors:
  - **Mineral Collector** - Collects minerals only (1 slot)
  - **Data Collector** - Collects data only (1 slot)
  - **Artifact Collector** - Collects artifacts only (1 slot)
- Each collector unlocked through corresponding research
- Players must choose which resources to prioritize based on slots
- Multiple collectors of the same type should NOT stack

**Implementation Notes:**
- Location: `src/UIManager.js`, `src/ProbeManager.js`
- Create equipment definitions for each collector type
- Update equipment UI to show available collectors
- Each collector has `collectionTypes: ['minerals']` etc.
- Collection logic checks all equipped collectors

**Equipment Definitions:**
```javascript
const EQUIPMENT_TYPES = {
    mineral_collector: {
        id: 'mineral_collector',
        name: 'Mineral Collector',
        description: 'Automatically collects mineral signals',
        collectionTypes: ['minerals'],
        slotsRequired: 1,
        requiredResearch: 'auto_minerals'
    },
    data_collector: {
        id: 'data_collector',
        name: 'Data Collector',
        description: 'Automatically collects data signals',
        collectionTypes: ['data'],
        slotsRequired: 1,
        requiredResearch: 'auto_data'
    },
    artifact_collector: {
        id: 'artifact_collector',
        name: 'Artifact Collector',
        description: 'Automatically collects artifact signals',
        collectionTypes: ['artifacts'],
        slotsRequired: 1,
        requiredResearch: 'auto_artifacts'
    }
};
```

**Test Specification:**
```javascript
test('mineral collector only collects minerals', async ({ page }) => {
    // Setup: Equip mineral collector on probe
    // Action: Probe encounters mineral and data signals
    // Verify: Only mineral collected, data ignored
});

test('multiple individual collectors can be equipped', async ({ page }) => {
    // Setup: Equip mineral and data collectors
    // Verify: Both take slots, both collection types active
});
```

---

### REQ-3: Universal Collector

**Priority:** High
**Type:** New Feature

**Description:**
Create a premium "Universal Collector" equipment item that collects all resource types but only requires one equipment slot. This should be unlocked through advanced research.

**Current Behavior:**
- "all" collection type exists but is tied to research, not equipment

**Expected Behavior:**
- Universal Collector is a single equipment item
- Takes only 1 equipment slot
- Collects minerals, data, AND artifacts
- Requires completion of all individual collector research
- Higher research cost to unlock
- Trade-off: saves slots but requires more research investment

**Implementation Notes:**
- Location: `src/UIManager.js`, `src/ProbeManager.js`, research tree
- Add new research node: "Universal Collection Technology"
- Requires: auto_minerals, auto_data, auto_artifacts
- Equipment has `collectionTypes: ['all']`

**Equipment Definition:**
```javascript
universal_collector: {
    id: 'universal_collector',
    name: 'Universal Collector',
    description: 'Collects all resource types in one efficient package',
    collectionTypes: ['all'],
    slotsRequired: 1,
    requiredResearch: 'auto_all',
    tier: 'advanced'
}
```

**Test Specification:**
```javascript
test('universal collector collects all resource types', async ({ page }) => {
    // Setup: Equip universal collector
    // Action: Probe encounters minerals, data, and artifacts
    // Verify: All resources collected
});

test('universal collector only takes one slot', async ({ page }) => {
    // Setup: Equip universal collector
    // Verify: Only 1 slot used
    // Action: Equip additional item in remaining slot
    // Verify: Both equipped successfully
});
```

---

### REQ-4: Equipment UI Updates

**Priority:** High
**Type:** UI Enhancement

**Description:**
Update the equipment management UI to support the new slot-based system with clear visual feedback.

**Current Behavior:**
- Simple equipment on/off display
- No slot indicator

**Expected Behavior:**
- Show slots as visual indicators (e.g., [X] [X] [ ] for 2/3 used)
- List available equipment based on research
- Show which equipment is installed in each slot
- Allow removing equipment from specific slots
- Gray out equipment options when slots are full
- Show "Upgrade Slots" option when research available

**Implementation Notes:**
- Location: `src/UIManager.js`
- Redesign equipment panel in probe details
- Add slot visualization component
- Filter available equipment by research unlocks
- Disable equip buttons when slots full

**Test Specification:**
```javascript
test('equipment UI shows correct slot count', async ({ page }) => {
    // Setup: Open probe equipment panel
    // Verify: Shows 0/2 slots used for default probe
    // Action: Equip item
    // Verify: Shows 1/2 slots used
});
```

---

## Task Breakdown

### Phase 1: Data Structure Migration
- [ ] **Task 1.1**: Update probe creation to include `maxEquipmentSlots: 2`
- [ ] **Task 1.2**: Convert `probe.equipment` from object to array
- [ ] **Task 1.3**: Update SaveManager to serialize/deserialize equipment arrays
- [ ] **Task 1.4**: Update all code checking `probe.equipment` object format
- [ ] **Task 1.5**: Write migration logic for existing saves

### Phase 2: Equipment Definitions
- [ ] **Task 2.1**: Create `EQUIPMENT_TYPES` constant with all equipment definitions
- [ ] **Task 2.2**: Implement mineral_collector equipment
- [ ] **Task 2.3**: Implement data_collector equipment
- [ ] **Task 2.4**: Implement artifact_collector equipment
- [ ] **Task 2.5**: Implement universal_collector equipment

### Phase 3: Slot Management Logic
- [ ] **Task 3.1**: Implement `canEquip(probe, equipment)` validation
- [ ] **Task 3.2**: Implement `equipItem(probe, equipmentType)` method
- [ ] **Task 3.3**: Implement `unequipItem(probe, slotIndex)` method
- [ ] **Task 3.4**: Update collection logic to iterate equipment array

### Phase 4: Research Tree Updates
- [ ] **Task 4.1**: Add "Expanded Cargo Bay" research node (2→3 slots)
- [ ] **Task 4.2**: Ensure individual collector research gates equipment
- [ ] **Task 4.3**: Add "Universal Collection Technology" research requiring all collectors
- [ ] **Task 4.4**: Wire research completion to unlock equipment

### Phase 5: UI Implementation
- [ ] **Task 5.1**: Create slot visualization component
- [ ] **Task 5.2**: Update equipment panel to show all available equipment
- [ ] **Task 5.3**: Add equip/unequip buttons per slot
- [ ] **Task 5.4**: Add visual feedback for full slots
- [ ] **Task 5.5**: Add "Upgrade Slots" button when research available

### Phase 6: Testing
- [ ] **Task 6.1**: Write test for slot constraint enforcement
- [ ] **Task 6.2**: Write test for slot upgrade research
- [ ] **Task 6.3**: Write test for individual collector behavior
- [ ] **Task 6.4**: Write test for universal collector behavior
- [ ] **Task 6.5**: Write test for equipment UI slot display

---

## Success Criteria

1. Probes have 2 equipment slots by default
2. Equipment slots can be upgraded to 3 through research
3. Individual collectors (mineral, data, artifact) each use 1 slot
4. Universal collector collects all types using only 1 slot
5. UI clearly shows available slots and equipped items
6. Cannot equip more items than available slots
7. All equipment persists through save/load
8. All 5 Playwright tests pass

---

## Related Files

- `src/ProbeManager.js` - Probe creation and equipment handling
- `src/UIManager.js` - Equipment panel UI
- `src/GameState.js` - Resource collection logic
- `src/SaveManager.js` - Save/load serialization
- `src/ResearchTree.js` - Research node definitions (if exists)
- `tests/equipment-slots.spec.js` - New test file

---

## Technical Considerations

### Backward Compatibility
- Existing saves with `probe.equipment` as object must be migrated
- Migration should convert single equipment object to array with one element
- Add version check in save loading

### Performance
- Equipment array iteration happens every frame during collection
- Keep arrays small (max 3 items) to minimize overhead
- Consider caching combined collection types

### Edge Cases
- What happens if player has 3 items equipped and loses slot upgrade?
- Handle gracefully: keep items but prevent new equips until under limit
- Show warning in UI about over-capacity
