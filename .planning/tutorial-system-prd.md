# Tutorial System Enhancement PRD

**Version:** 1.0
**Date:** January 2026
**Status:** Active Development

---

## Overview

This PRD outlines five key improvements to the Probetheus tutorial system and related game mechanics. Each requirement includes implementation details and test specifications.

---

## Requirements

### REQ-1: Disable Hub Placement on Probe Return Path

**Priority:** High
**Type:** Bug Fix / Game Logic

**Description:**
Players should not be able to place a hub along a probe's return path (the segment from the last waypoint back to the hub). Hubs should only be placed along the outbound exploration route.

**Current Behavior:**
Hubs can be placed anywhere along a probe's route, including the return segment.

**Expected Behavior:**
- When in hub placement mode, clicking on the return path segment should be rejected
- Visual feedback should indicate the return path is not a valid placement zone
- Only waypoints on the outbound path should be valid hub placement locations

**Implementation Notes:**
- Location: `src/GameController.js` around line 966 (hub placement handling)
- Need to distinguish between outbound waypoints and the return segment
- The return segment is typically the line from `waypoints[waypoints.length-1]` back to `probe.hub`

**Test Specification:**
```javascript
test('should not allow hub placement on probe return path', async ({ page }) => {
    // Setup: Deploy a probe with waypoints
    // Attempt: Try to place hub on return path segment
    // Verify: Hub placement is rejected, no new hub created
});
```

---

### REQ-2: Dynamic Hub Operations Button States

**Priority:** High
**Type:** UX Enhancement

**Description:**
The Hub Operations menu (Deploy Probe, Build Probe, Shuttle) should dynamically enable/disable actions based on current resource availability. Currently, buttons may remain disabled even after the player has gathered sufficient resources.

**Current Behavior:**
Button states are set when the menu opens but don't update in real-time.

**Expected Behavior:**
- Buttons should update enabled/disabled state when resources change
- Use event listener on resource changes to trigger UI update
- Visual feedback should clearly show which actions are affordable

**Implementation Notes:**
- Location: `src/UIManager.js` or hub menu rendering code
- Listen to resource change events from `GameState`
- Update button classes/states dynamically
- Consider debouncing updates to avoid excessive DOM manipulation

**Test Specification:**
```javascript
test('hub operations buttons should enable when resources become sufficient', async ({ page }) => {
    // Setup: Start game with insufficient resources
    // Verify: Build Probe button is disabled
    // Action: Add resources programmatically
    // Verify: Build Probe button becomes enabled without menu close/reopen
});
```

---

### REQ-3: Delay Probetheum Gathering Until Mining Station Built

**Priority:** Medium
**Type:** Game Balance

**Description:**
Probetheum should not be gathered automatically until the player builds their first mining station and begins actively mining. This ensures players learn the mining mechanic rather than passively accumulating probetheum.

**Current Behavior:**
Probetheum may accumulate before player builds mining infrastructure.

**Expected Behavior:**
- Probetheum generation is disabled until first mining station is built
- Once first mining station exists, normal probetheum mechanics apply
- Tutorial should guide player toward building mining stations

**Implementation Notes:**
- Location: `src/MiningManager.js` or resource generation logic
- Add flag: `miningUnlocked` or check for `entities.miningStations.length > 0`
- Gate probetheum accumulation behind this check

**Test Specification:**
```javascript
test('probetheum should not accumulate before first mining station', async ({ page }) => {
    // Setup: Start new game, play for a while
    // Verify: Probetheum remains at 0
    // Action: Build mining station
    // Verify: Probetheum can now accumulate
});
```

---

### REQ-4: Probe Equipment Tutorial Step

**Priority:** High
**Type:** Tutorial Enhancement

**Description:**
Add a new tutorial step that teaches players about installing equipment on probes (like auto-collectors). This step should trigger after the player completes their first Collection research.

**Current Behavior:**
No tutorial guidance exists for probe equipment installation.

**Expected Behavior:**
- After completing a research in the Collection lane, a new tutorial step appears
- Tutorial explains how to open probe details and install equipment
- Tutorial highlights the equipment installation UI
- Step completes when player installs any equipment on a probe

**Implementation Notes:**
- Location: `src/TutorialManager.js`
- Add new step after existing steps (or insert at appropriate position)
- Listen for `research:completed` event with category check
- New step ID: `install_probe_equipment`
- Need to track when equipment is installed via `probe:equipmentInstalled` event

**Tutorial Step Definition:**
```javascript
{
    id: 'install_probe_equipment',
    title: 'Upgrade Your Probes',
    message: 'You\'ve unlocked probe equipment! Select an active probe and click "Manage Equipment" to install upgrades like the Auto-Collector. Equipment helps probes gather resources automatically!',
    checkCondition: () => {
        return this.gameState.entities.probes.some(p =>
            p.equipment && p.equipment.length > 0
        );
    },
    triggerAfter: 'collection_research_completed',
    completed: false
}
```

**Test Specification:**
```javascript
test('equipment tutorial appears after Collection research', async ({ page }) => {
    // Setup: Start game, research a Collection tech
    // Verify: Equipment tutorial step appears
    // Action: Install equipment on probe
    // Verify: Tutorial step completes
});
```

---

### REQ-5: Intro Animation Plays on Each New Game

**Priority:** Medium
**Type:** Bug Fix

**Description:**
The intro animation should play every time the player starts a New Game, not just on first playthrough.

**Current Behavior:**
The intro cutscene checks `cutsceneSeen` flag and skips if already viewed.

**Expected Behavior:**
- Starting a New Game should always play the intro
- The `cutsceneSeen` flag should be cleared when New Game is selected
- Skip button should still be available

**Implementation Notes:**
- Location: `src/IntroCutscene.js` line 118-122 (cutsceneSeen check)
- Clear the flag in the New Game handler before calling `introCutscene.play()`
- Alternative: Add a `forcePlay` parameter to bypass the check

**Test Specification:**
```javascript
test('intro animation plays each time New Game is selected', async ({ page }) => {
    // Setup: Start new game, let intro play or skip
    // Action: Return to menu, start another new game
    // Verify: Intro animation plays again (cutscene container visible)
});
```

---

## Task Breakdown

### Phase 1: Hub Placement Validation
- [ ] **Task 1.1**: Identify return path segment in probe route data
- [ ] **Task 1.2**: Add validation logic to reject hub placement on return path
- [ ] **Task 1.3**: Add visual feedback for invalid placement zones
- [ ] **Task 1.4**: Write Playwright test for hub placement restriction

### Phase 2: Dynamic Hub Menu
- [ ] **Task 2.1**: Add resource change event listener to hub menu
- [ ] **Task 2.2**: Implement button state update function
- [ ] **Task 2.3**: Add debouncing for performance
- [ ] **Task 2.4**: Write Playwright test for dynamic button states

### Phase 3: Probetheum Gating
- [ ] **Task 3.1**: Add mining unlock flag to game state
- [ ] **Task 3.2**: Gate probetheum accumulation behind flag
- [ ] **Task 3.3**: Set flag when first mining station built
- [ ] **Task 3.4**: Write Playwright test for probetheum gating

### Phase 4: Equipment Tutorial
- [ ] **Task 4.1**: Add event listener for Collection research completion
- [ ] **Task 4.2**: Create new tutorial step definition
- [ ] **Task 4.3**: Add equipment installation tracking event
- [ ] **Task 4.4**: Implement step completion condition
- [ ] **Task 4.5**: Write Playwright test for equipment tutorial flow

### Phase 5: Intro Animation Fix
- [ ] **Task 5.1**: Modify New Game handler to clear cutsceneSeen flag
- [ ] **Task 5.2**: Ensure intro plays on subsequent New Game clicks
- [ ] **Task 5.3**: Write Playwright test for intro replay behavior

---

## Success Criteria

1. Hub placement on return paths is blocked with visual feedback
2. Hub menu buttons update dynamically as resources change
3. Probetheum cannot accumulate until first mining station built
4. Equipment tutorial appears after Collection research and completes when equipment installed
5. Intro animation plays every time New Game is selected
6. All 5 new Playwright tests pass

---

## Related Files

- `src/GameController.js` - Hub placement logic
- `src/TutorialManager.js` - Tutorial step definitions
- `src/IntroCutscene.js` - Intro animation playback
- `src/MiningManager.js` - Probetheum generation
- `src/UIManager.js` - Hub menu rendering
- `tests/tutorial-system.spec.js` - New test file (to be created)

---

## Phase 2 Requirements (Jan 2026)

### REQ-6: Research Screen Button Positioning

**Priority:** Medium
**Type:** UI Fix
**Status:** COMPLETE

**Description:**
The "Return to Galaxy" button on the Research Laboratory screen was being covered by the tutorial message panel.

**Solution:**
Moved the button from the right side of the header to the left side, before the title.

**Implementation:**
- Location: `index.html` line 326-335
- Restructured header layout to place button on left

---

### REQ-7: Equipment Tutorial Trigger Refinement

**Priority:** High
**Type:** Bug Fix
**Status:** COMPLETE

**Description:**
The equipment tutorial was triggering after ANY Collection tree research. It should only trigger after the specific auto-collector research nodes are unlocked.

**Expected Behavior:**
- Equipment tutorial ONLY appears after researching: `auto_minerals`, `auto_data`, or `auto_artifacts`
- Does NOT appear after researching other Collection tree nodes

**Implementation:**
- Location: `src/TutorialManager.js` line 154-162
- Changed trigger check from `data.node.tree === 'collection'` to checking specific node IDs

---

### REQ-8: Research Laboratory Unlock Tutorial

**Priority:** High
**Type:** New Feature
**Status:** COMPLETE

**Description:**
Add a tutorial step that appears when the player first unlocks the Research Laboratory.

**Trigger Condition:**
- Player earns their first research point
- `research:unlocked` event is emitted

**Tutorial Message:**
"You've unlocked the Research Laboratory! Research new tech to greatly improve the capabilities of your probes. Click the 'Research Lab' button to begin!"

**Completion Condition:**
- Player researches anything beyond the 3 auto-unlocked root nodes

**Implementation:**
- Location: `src/TutorialManager.js` - Added `research_lab_unlocked` step
- Location: `src/UIManager.js` line 753 - Added `research:unlocked` event emission
- Added `triggerResearchLabTutorial()` method

---

### REQ-9: Manage Equipment Button on Probe Menu

**Priority:** High
**Type:** New Feature
**Status:** COMPLETE

**Description:**
Add a "Manage Equipment" button to the probe details panel that allows players to add and remove equipment from probes.

**Features:**
- Equipment section shows current equipment status and slot usage
- "Manage Equipment" button opens a modal for equipment management
- Modal displays available equipment based on research unlocks
- Each equipment type shows cost and description
- Can equip new equipment (deducts minerals)
- Can remove equipment with confirmation
- Locked message when no auto-collector research unlocked

**Equipment Types:**
- Mineral Collector (25M) - requires `auto_minerals` research
- Data Collector (25M) - requires `auto_data` research
- Artifact Collector (25M) - requires `auto_artifacts` research
- Universal Collector (50M) - requires `auto_all` research

**Implementation:**
- Location: `src/DetailsPanel.js`
- Added `renderEquipmentSection(probe)` method
- Added `setupEquipmentButtons(probe)` method
- Added `showEquipmentModal(probe)` method
- Added `equipEquipment(probe, equipmentId, equipmentTypes)` method
- Added `removeEquipment(probe)` method

**Test Specification:**
- Test: "Manage Equipment button appears on probe panel when research unlocked"
- Test: "can equip and remove equipment via Manage Equipment modal"

---

### REQ-10: Mining Operations Tutorial

**Priority:** High
**Type:** New Feature
**Status:** COMPLETE

**Description:**
Add tutorial steps to guide players through the mining operations workflow: building a mining station, building a shuttle to transport resources, and understanding when mining stations become active.

**Tutorial Flow:**

1. **Build Mining Station Step** (after hub placement tutorial)
   - Trigger: Player has built 2+ hubs
   - Message: "Mining stations produce Probetheum, a valuable resource. Select a probe and click 'Build Mining Facility' to place one along an exploration route."
   - Completion: Player builds first mining station

2. **Build Shuttle Step**
   - Trigger: First mining station built
   - Message: "Your mining station needs resources to operate! Click on a Hub near the station and build a Shuttle (50M, 25D). Then click on the mining station to connect the shuttle."
   - Completion: Player builds and connects first shuttle

3. **Mining Station Resources Step**
   - Trigger: Shuttle connected to station
   - Message: "The shuttle will transport resources from your hub to the mining station. Once the station has enough resources, it will begin producing Probetheum automatically!"
   - Completion: Mining station reaches full resources and begins production

**Mining Station Resource Events:**

The mining station should emit events when it needs resources:
- `miningStation:needsResources` - Emitted when station inventory is at 0
- `miningStation:partialResources` - Emitted when station has some but not full resources
- `miningStation:ready` - Emitted when station has full resources and can begin mining

**Mining Station Activation Logic:**
- Mining stations should NOT produce Probetheum until fully stocked
- Station shows visual indicator when waiting for resources
- Station shows "Mining" status when actively producing

**Implementation Notes:**
- Location: `src/TutorialManager.js` - Add mining tutorial steps
- Location: `src/MiningManager.js` - Add resource requirement events
- Location: `src/DetailsPanel.js` - Update mining station details to show resource status

**Test Specification:**
```javascript
test('mining tutorial appears after building mining station', async ({ page }) => {
    // Setup: Build mining station
    // Verify: Shuttle tutorial step appears
});

test('mining station emits needsResources event when empty', async ({ page }) => {
    // Setup: Build mining station with no resources
    // Verify: Event is emitted
});
```

---

### REQ-11: Equipment Modal UX Improvements

**Priority:** Medium
**Type:** UX Fix
**Status:** COMPLETE

**Description:**
Several UX improvements to the Manage Equipment modal:

1. Modal closes on background click (standard modal behavior)
2. Probe details panel automatically updates after equipment change
3. "Manage Equipment" button added to old probeDetailPanel (replaces Craft Auto-Collector)

**Implementation:**
- Background click closes modal (standard behavior)
- Equipment modal does NOT call showProbeDetails - panels are independent
- Added `manageEquipmentBtnOld` button in `index.html`
- Added click handler in `UIManager.js` to open equipment modal

**Panel Architecture:**
- **probeDetailPanel** (index.html / UIManager.js): Main probe panel with build buttons, patrol options, "Manage Equipment" button
- **Equipment Modal** (DetailsPanel.js): Overlay modal for equipping/removing equipment only
- Both panels can be open simultaneously
- Each closes independently
- Tutorial panel positioned on LEFT with lower z-index to avoid covering right-side panels
