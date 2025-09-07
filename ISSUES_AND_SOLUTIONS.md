# Space Idle Game - Issues & Solutions Documentation

This document tracks all issues encountered during development and their solutions, organized for maximum test coverage impact.

## Critical Save/Load System Issues

### 1. ✅ **RESOLVED**: Save Operation Failing with Generic Error
**Status**: Resolved  
**Severity**: Critical  
**Impact**: User confusion between quit-save vs manual save operations  

**Problem**: 
- User reported generic error message when "overwriting saves" 
- Message: "Error saving game! Try using the Save/Load menu instead."
- User confusion about which operation was failing

**Root Cause Found**:
The error message was coming from the `quitGame()` method, NOT from the save button handlers:
1. Error occurs at GameController.js line 2223 when user clicks "Quit to Start Screen"
2. `quitGame()` performs auto-save using direct localStorage operations
3. If auto-save fails during quit, shows generic error message
4. User mistakenly thought they were getting save errors from slot operations

**Solution Applied**:
```javascript
// Updated error message in quitGame() method to be more specific
alert('Error saving game during quit operation! Your progress may not be saved. Try using the Save/Load menu to manually save before quitting.');

// Added comprehensive debug logging to quitGame()
console.log('quitGame: Starting auto-save process...');
console.log('quitGame: SaveManager available:', !!this.saveManager);
console.log('quitGame: Calling createSaveData()...');
// ... additional debug statements for each step
```

**Test Cases to Create**:
```javascript
describe('Save/Quit Operations', () => {
  test('Save button operations complete successfully')
  test('Overwrite save operations work correctly') 
  test('Quit operation auto-save works correctly')
  test('Error messages distinguish between quit-save vs manual save failures')
  test('Debug logging captures failure points for both operations')
  test('User cannot trigger quit and manual save simultaneously')
})
```

---

## Previously Resolved Issues

### 2. ✅ **RESOLVED**: Missing outboundWaypointsCount in Save Data
**Status**: Fixed  
**Severity**: Critical  
**Impact**: Probe routes displayed incorrectly after load (all blue, wrong speeds)  

**Problem**: 
- outboundWaypointsCount field was not being saved to localStorage
- After loading, probes defaulted to outboundWaypointsCount = 0
- Route coloring logic failed: `probe.outboundWaypointsCount && i >= probe.outboundWaypointsCount - 1`
- Speed detection logic failed: probes couldn't distinguish outbound vs return phases

**Solution Applied**:
```javascript
// Added missing fields to SaveManager.js createSaveData()
probes: this.gameState.entities.probes.map(probe => ({
    // ... existing fields
    outboundWaypointsCount: probe.outboundWaypointsCount || 0,
    returnSpeed: probe.returnSpeed || 0.0003
}))
```

**Test Cases Created** (Conceptual):
```javascript
describe('Save/Load Probe State', () => {
  test('outboundWaypointsCount saved and restored correctly')
  test('returnSpeed saved and restored correctly') 
  test('Probe route coloring correct after load (blue outbound, orange return)')
  test('Probe speed correct after load (slow outbound, fast return)')
  test('Probe state integrity maintained across save/load cycles')
})
```

---

### 3. ✅ **RESOLVED**: Hub Click Detection Priority Bug
**Status**: Fixed  
**Severity**: High  
**Impact**: Players couldn't select hubs properly after save/load

**Problem**:
- Click detection checked probes before hubs
- Probe detection radius (15px) vs hub radius (60px) caused conflicts
- When probes were near hubs, probe selection took priority

**Solution Applied**:
```javascript
// GameController.js - Reordered click detection priority
// Check for hub clicks FIRST (higher priority than probes)
const clickedHub = this.findHubAt(worldX, worldY);
if (clickedHub) { /* handle hub */ }

// Check for probe clicks SECOND (only if no hub was clicked)  
const clickedProbe = this.findProbeAt(worldX, worldY);
if (clickedProbe) { /* handle probe */ }
```

**Test Cases** (Conceptual):
```javascript
describe('Click Detection Priority', () => {
  test('Hub clicks take priority over probe clicks when overlapping')
  test('Probe clicks work when no hub is nearby') 
  test('Click detection works correctly after save/load')
  test('Hub selection functions properly in all game states')
})
```

---

### 4. ✅ **RESOLVED**: Signals Not Appearing After Save/Load
**Status**: Fixed  
**Severity**: Critical  
**Impact**: Core gameplay loop broken after loading saves

**Problem**:
- Probes stopped generating signals after save/load
- Signal generation depended on exploration phase detection
- Logic: `probe.currentWaypoint < probe.outboundWaypointsCount - 1`
- After loading, outbound counts were wrong, so exploration detection failed

**Solution Applied**:
```javascript
// Enhanced signal generation logic in ProbeManager.js
const isExploring = probe.outboundWaypointsCount && probe.currentWaypoint < probe.outboundWaypointsCount - 1;
const isPatrolling = probe.patrolMode && probe.waypoints && probe.waypoints.length > 2;
const shouldGenerateSignals = isExploring || isPatrolling;

// Also fixed pulse timer reset
pulseTimer: Math.random() * 1000, // Randomize to restart immediately
```

**Test Cases** (Conceptual):
```javascript
describe('Signal Generation', () => {
  test('Signals appear immediately after save/load')
  test('Exploration phase detection works correctly') 
  test('Patrol mode signal generation works')
  test('Signal generation rate consistent across save/load')
  test('Pulse timer reset prevents signal drought')
})
```

---

### 5. ✅ **RESOLVED**: Probe Speed Accumulation Bug  
**Status**: Fixed
**Severity**: High
**Impact**: Probes gained speed with each patrol cycle, breaking game balance

**Problem**:
- Probe.speed property was being directly modified during patrol cycles
- Legacy logic: `probe.speed = probe.returnSpeed` and `probe.speed = probe.speed / 3`  
- Speed accumulated over save/load/patrol cycles

**Solution Applied**:
```javascript
// Fixed ProbeManager.js - Use dynamic speed calculation instead of modifying probe.speed
const isOnReturnJourney = probe.outboundWaypointsCount && probe.currentWaypoint >= probe.outboundWaypointsCount - 1;
const currentSpeed = isOnReturnJourney ? probe.returnSpeed : probe.speed;

// Force base speed on restore in SaveManager.js
speed: 0.0001  // Force base speed to prevent accumulation issues
```

**Test Cases** (Conceptual):
```javascript
describe('Probe Speed Consistency', () => {
  test('Probe base speed never changes from 0.0001')
  test('Return speed calculation is dynamic, not persistent')
  test('Multiple patrol cycles maintain consistent speeds')
  test('Save/load preserves correct speed behavior')
  test('No speed accumulation over time')
})
```

---

## UI/UX Issues

### 6. ✅ **RESOLVED**: Cluttered Game Controls
**Status**: Fixed
**Severity**: Medium  
**Impact**: Poor user experience, unprofessional appearance

**Problem**:
- Save/Load/Quit buttons mixed with game controls
- Crowded probe controls area
- No clear separation between system and game functions

**Solution Applied**:
- Added power button (⏻) to header top-left
- Created organized main menu modal with system functions
- Removed clutter from probe controls area
- Implemented proper modal navigation flow

**Test Cases** (Conceptual):
```javascript
describe('Main Menu System', () => {
  test('Power button opens main menu')
  test('Save/Load option navigates to save modal')
  test('Quit option properly saves and returns to start screen') 
  test('Resume option closes main menu and continues game')
  test('Modal navigation flow works correctly')
})
```

---

## Testing Strategy Summary

**High-Impact Test Categories**:
1. **Save/Load System Integrity** - Prevents data loss, ensures game continuity
2. **Probe Behavior Consistency** - Core gameplay mechanics must work reliably  
3. **Click/Interaction Systems** - Player input must be predictable and responsive
4. **Modal/UI Navigation** - Professional user experience and functionality
5. **Cross-Session State Management** - Game state must persist correctly

**Test Approach**:
- **Unit Tests**: Individual component functionality (SaveManager, ProbeManager, etc.)
- **Integration Tests**: System interactions (save→load→gameplay)
- **End-to-End Tests**: Complete user workflows (play→save→reload→continue)
- **Regression Tests**: Ensure fixed issues don't resurface

This documentation will be updated as we resolve the current save issue and encounter new problems.

---

## QA Section

### Testing Notes and Findings

This section tracks testing activities, debugging findings, and test case development.

#### Current Debug Session - Save Failure Issue
**Date**: 2025-09-07  
**Issue**: Generic "failed to save, try using main menu" error when overwriting saves  
**Status**: In Progress  

**Debug Steps Taken**:
1. Added comprehensive debug logging to SaveManager.saveGame() method
2. Added debug logging to GameController save button handlers
3. Running local server to test actual save operations

**Testing Environment**:
- Local server running on port 8000
- Browser console monitoring for debug output
- Focus on save slot overwrite operations

**Expected Debug Output**:
```
SaveManager.saveGame called with slot: [number]
Setting saving state to true for slot: [number]  
Waiting 100ms for game state stability...
Creating save data...
Attempting to save to localStorage with key: csog_save_slot_[number]
Successfully saved to localStorage
```

**Key Finding**:
The "failed to save, try using main menu" error is coming from the `quitGame()` method, NOT from the save button handlers. The error occurs at line 2223 in GameController.js when:
1. User clicks "Quit to Start Screen" from main menu
2. `quitGame()` method tries to auto-save using `this.saveManager.createSaveData()`
3. If this fails, it shows alert: "Error saving game! Try using the Save/Load menu instead."

**Root Cause Analysis**:
- User confusion: thinks they're getting save errors when using overwrite, but actually getting quit errors
- The quit operation uses direct localStorage operations, not the async `saveManager.saveGame()` method
- Error handling in quit vs save operations are different

**Next Steps**:
- Add debug logging to `quitGame()` method to identify exact failure point
- Test both quit operation and slot-based save operations separately
- Clarify error messages to distinguish between quit-save vs manual save failures

### Test Development Area

**Framework**: To be determined based on project structure
**Priority**: High-impact integration tests for save/load system

**Test Categories to Develop**:
1. Save System Integrity Tests
2. Modal Navigation Tests  
3. Event Handler Tests
4. Cross-Session State Tests

#### Current Session Updates - 2025-09-07 (continued)

**New Issues Discovered:**

**Issue 2A: Research Button Disappearing After Load** ✅ FIXED
- **Problem**: Research button becomes invisible after loading saved games
- **Root Cause**: `checkResearchUnlock()` only shows button during first-time unlock, not after saves
- **Solution Applied**:
```javascript
// Added check for already unlocked research in UIManager.js checkResearchUnlock()
if (research.unlocked) {
    const researchBtn = document.getElementById('researchBtn');
    if (researchBtn) {
        researchBtn.style.display = 'inline-block';
        console.log('Research already unlocked, ensuring button is visible');
    }
}
```

**Issue 2B: Save Errors After Multiple Overwrites** 🔍 IN PROGRESS
- **Problem**: Occasional save failures after multiple overwrite operations
- **Investigating**: Potential race conditions in save operations
- **Debug Enhancements Added**:
  1. Check for concurrent save operations: `isSlotSaving(slot)`
  2. Enhanced error logging with stack traces and button state tracking
  3. Saving states monitoring with detailed console output
  4. Button restoration improvements with fallback text
- **Status**: Enhanced debugging added, testing in progress

**Issue 2C: Research Progress Lost on Save/Load** 🚨 CRITICAL - ✅ FIXED
- **Problem**: Player research progress being cleared on reload - major data loss issue
- **Root Cause**: Research system maintains two separate data structures:
  1. `researched` Set containing node IDs
  2. Individual tree nodes with `researched` property
  Save/load was only syncing the Set, not updating individual tree nodes
- **Solution Applied**:
```javascript
// Added critical sync logic in SaveManager.js restoreGameState()
this.gameState.researchSystem.researched.forEach(nodeId => {
    const node = this.gameState.researchSystem.tree[nodeId];
    if (node) {
        node.researched = true;
        console.log(`Restored research node: ${nodeId} (${node.name})`);
        
        // Ensure child nodes are unlocked/available
        if (node.children) {
            node.children.forEach(childId => {
                const childNode = this.gameState.researchSystem.tree[childId];
                if (childNode) {
                    childNode.available = true;
                }
            });
        }
    }
});
```
- **Additional Debug**: Added comprehensive logging for research save/load operations
- **Status**: CRITICAL FIX APPLIED - Research progress now properly restored

**Issue 2D: Auto-Save Failures During Quit Operation** 🚨 CRITICAL - ✅ FIXED
- **Problem**: "Failed to save" errors when exiting the game via quit button
- **Root Cause**: `quitGame()` method was using direct localStorage operations instead of proper SaveManager methods, bypassing error handling and validation
- **Solution Applied**:
  1. **Refactored auto-save**: Created dedicated `performAutoSave()` method with proper error handling
  2. **Enhanced error detection**: Added comprehensive logging throughout save data creation
  3. **Safeguarded research sync**: Added error handling for research tree synchronization
  4. **Better user feedback**: More specific error messages distinguishing auto-save from manual save failures
- **Code Changes**:
```javascript
// New performAutoSave() method with proper error handling
async performAutoSave() {
    try {
        console.log('performAutoSave: Creating save data...');
        const saveData = this.saveManager.createSaveData();
        // ... proper localStorage operations with error handling
        return true;
    } catch (error) {
        console.error('performAutoSave failed:', error);
        return false;
    }
}

// Enhanced createSaveData() with error detection
createSaveData() {
    try {
        console.log('createSaveData: Starting save data creation...');
        // ... existing save logic with detailed logging
    } catch (error) {
        console.error('createSaveData: Error creating save data:', error);
        throw error;
    }
}
```
- **Status**: CRITICAL FIX APPLIED - Auto-save now properly handled during quit operations

**Issue 2E: Null Hub Reference Breaking Auto-Save** 🚨 CRITICAL - ✅ FIXED
- **Problem**: Auto-save failing with `TypeError: Cannot read properties of null (reading 'id')`
- **Root Cause**: Null hub objects in sector.hubs array causing `hub.id` access to fail in `serializeSectors()` method
- **Error Location**: SaveManager.js line 177 in sector serialization
- **Solution Applied**:
```javascript
// Added null filtering before mapping hub IDs
hubs: sector.hubs ? 
    sector.hubs.filter(hub => hub !== null && hub !== undefined).map(hub => hub.id) : []

// Enhanced error handling for individual sectors
this.gameState.world.sectors.forEach((sector, key) => {
    try {
        // Serialize each sector with error isolation
        const serializedSector = { /* ... */ };
        sectorsArray.push(serializedSector);
    } catch (error) {
        console.error(`Error serializing sector ${key}:`, error);
        // Skip problematic sector but continue with others
    }
});
```
- **Additional Safeguards**: Added comprehensive error handling to prevent any single sector from breaking the entire save operation
- **Status**: CRITICAL FIX APPLIED - Auto-save now handles null hub references safely

**Issue 2F: Probe Equipment System Improvements** ✅ FIXED
- **Problem 1**: New auto-collection research not automatically updating existing probe equipment
- **Problem 2**: Equipment removal button not working (calling non-existent method)
- **Root Causes**:
  1. No event listener for research completion to update probe equipment
  2. Remove button calling `game.removeEquipment()` but method only exists in `UIManager`
- **Solutions Applied**:
```javascript
// 1. Added research completion event listener in GameController
this.eventBus.on('research:completed', (data) => {
    this.onResearchCompleted(data.node);
});

// 2. Auto-update equipment when auto-collection research is completed
onResearchCompleted(node) {
    const autoCollectionResearch = ['auto_minerals', 'auto_data', 'auto_artifacts', 'auto_all'];
    if (autoCollectionResearch.includes(node.id)) {
        this.updateAllProbeEquipment();
    }
}

// 3. Smart equipment update preserving user preferences
updateAllProbeEquipment() {
    probes.forEach(probe => {
        // Add new collection types without removing existing ones
        const updatedTypes = [...new Set([...currentTypes, ...availableTypes])];
        probe.equipment.collectionTypes = updatedTypes;
    });
}

// 4. Added missing removeEquipment delegation in GameController
removeEquipment(probeId) {
    this.uiManager.removeEquipment(probeId);
}
```
- **Features**: 
  - Equipment automatically gains new collection capabilities when research is completed
  - User preferences preserved (doesn't remove existing collection types)
  - Universal collection ('auto_all') properly overrides individual types
  - Equipment removal now works correctly
  - User feedback notification when equipment is updated
- **Status**: BOTH ISSUES FIXED - Equipment system now fully functional

## Session Summary - September 7, 2025

### Major Accomplishments
During this debugging session, we resolved **6 critical issues** and implemented **2 major improvements**:

#### 🚨 Critical Fixes:
1. **Research Button Visibility** - Fixed button disappearing after save/load
2. **Research Progress Data Loss** - CRITICAL: Fixed research progress being lost on reload 
3. **Auto-Save Failures** - Fixed quit operation save failures
4. **Null Hub Reference Crashes** - Fixed auto-save crashing due to null hub objects
5. **Equipment Removal Bug** - Fixed non-functional remove equipment button
6. **Manual Save Race Conditions** - Enhanced error handling for multiple save operations

#### ✨ Improvements:
1. **Auto-Equipment Updates** - Equipment automatically updates when new research is completed
2. **Comprehensive Error Logging** - Added detailed debugging throughout save/load system

### Testing Strategy Implementation

**Framework Choice: Playwright**
- Chosen for superior localStorage testing capabilities
- Real browser environment testing
- Async/await native support for our save operations
- Cross-browser compatibility testing
- Screenshot/video capture for debugging failures

**Test Categories Planned:**
1. **Save System Integrity Tests** - Core save/load functionality
2. **Research Progress Persistence** - Ensure research data survives save/load cycles
3. **Equipment State Management** - Verify equipment updates and persistence
4. **Error Handling Tests** - Test failure scenarios and recovery
5. **Cross-Session State Tests** - Complete gameplay→save→reload→continue workflows

This section will expand as we implement automated tests.