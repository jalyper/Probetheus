import { test, expect } from '@playwright/test';

/**
 * Comprehensive Save System Tests for Space Idle Game
 * 
 * These tests ensure the save/load functionality is bulletproof by testing:
 * 1. Basic save/load operations
 * 2. Research progress persistence 
 * 3. Probe equipment state management
 * 4. Cross-session state consistency
 * 5. Error handling and recovery
 */

test.describe('Save System Integrity', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Wait for game to initialize
    await page.locator('#newGameBtn').click();
    await page.waitForSelector('#galaxyCanvas');

    // Wait for game systems to be ready
    await page.waitForTimeout(2000);

    // Dismiss tutorial panel to prevent it from blocking interactions
    await page.evaluate(() => {
      const tutorialPanel = document.getElementById('tutorialPanel');
      if (tutorialPanel) {
        tutorialPanel.style.display = 'none';
      }
    });

    // Ensure all core systems are loaded
    await page.waitForFunction(() => {
      return typeof window.game !== 'undefined' &&
             window.game.gameState &&
             window.game.saveManager &&
             window.uiManager;
    }, { timeout: 10000 });
  });

  test('basic save and load operations work correctly', async ({ page }) => {
    // Get initial game state
    const initialMinerals = await page.locator('#minerals').textContent();
    const initialProbes = await page.locator('#probeCount').textContent();
    
    // Make some progress (collect resources, build probes, etc.)
    await page.evaluate(() => {
      // Add some test resources
      window.game.gameState.updateResources({ 
        minerals: 100, 
        data: 50, 
        artifacts: 25 
      });
      window.uiManager.updateUI();
    });
    
    // Wait for UI to update and systems to stabilize
    await page.waitForTimeout(1000);
    
    // Ensure UI is fully updated
    await page.waitForFunction(() => {
      const minerals = document.getElementById('minerals');
      return minerals && minerals.textContent.trim() === '100';
    });
    
    // Verify resources changed
    const updatedMinerals = await page.locator('#minerals').textContent();
    expect(updatedMinerals).not.toBe(initialMinerals);
    expect(updatedMinerals).toBe('100');
    
    // Open main menu and save game
    await page.locator('#mainMenuBtn').click();
    await page.waitForSelector('#mainMenuModal.active');
    
    await page.locator('#saveLoadMenuBtn').click();
    await page.waitForSelector('#saveLoadModal.active');
    
    // Save to slot 1
    await page.locator('[data-slot="1"][data-action="save"]').click();
    await page.waitForTimeout(100); // Wait for confirm dialog
    
    // Accept save confirmation
    await page.evaluate(() => {
      // Override confirm to always return true for testing
      window.confirm = () => true;
    });
    
    await page.locator('[data-slot="1"][data-action="save"]').click();
    
    // Wait for save to complete
    await page.waitForSelector('text=Saved!', { timeout: 5000 });
    
    // Close save modal
    await page.locator('#closeSaveLoadModal').click();
    
    // Modify game state after saving
    await page.evaluate(() => {
      window.game.gameState.updateResources({ 
        minerals: 200, 
        data: 100 
      });
      window.uiManager.updateUI();
    });
    
    // Verify state changed
    await expect(page.locator('#minerals')).toContainText('200');
    
    // Load the save
    await page.locator('#mainMenuBtn').click();
    await page.waitForSelector('#mainMenuModal.active');
    await page.locator('#saveLoadMenuBtn').click();
    await page.waitForSelector('#saveLoadModal.active');
    
    await page.locator('[data-slot="1"][data-action="load"]').click();
    
    // Wait for load to complete
    await page.waitForSelector('text=Game loaded from slot 1!', { timeout: 5000 });
    
    // Verify original state was restored
    await expect(page.locator('#minerals')).toContainText('100');
    await expect(page.locator('#data')).toContainText('50');
    await expect(page.locator('#artifacts')).toContainText('25');
  });

  test('research progress persists across save/load cycles', async ({ page }) => {
    // Add research points and unlock research
    await page.evaluate(() => {
      const research = window.game.gameState.getResearchSystem();
      research.points = 5;
      research.unlocked = true;
      research.unlockedTrees = ['collection', 'probe', 'alien'];
      
      // Manually research a node
      const node = research.tree['auto_minerals'];
      if (node) {
        node.researched = true;
        research.researched.add('auto_minerals');
        research.points -= 1;
      }
      
      window.uiManager.updateUI();
    });
    
    // Verify research button is visible
    await expect(page.locator('#researchBtn')).toBeVisible();
    
    // Verify research state
    const researchPoints = await page.evaluate(() => {
      return window.game.gameState.getResearchSystem().points;
    });
    expect(researchPoints).toBe(4);
    
    const researchedNodes = await page.evaluate(() => {
      return Array.from(window.game.gameState.getResearchSystem().researched);
    });
    expect(researchedNodes).toContain('auto_minerals');
    
    // Save game
    await page.locator('#mainMenuBtn').click();
    await page.waitForSelector('#mainMenuModal.active');
    await page.locator('#saveLoadMenuBtn').click();
    await page.waitForSelector('#saveLoadModal.active');
    
    // Override confirm for testing
    await page.evaluate(() => { window.confirm = () => true; });
    
    await page.locator('[data-slot="1"][data-action="save"]').click();
    await page.waitForSelector('text=Saved!', { timeout: 5000 });
    
    // Modify research state
    await page.evaluate(() => {
      const research = window.game.gameState.getResearchSystem();
      research.points = 0;
      research.researched.clear();
      research.unlocked = false;
      
      // Also hide the research button explicitly for testing
      const researchBtn = document.getElementById('researchBtn');
      if (researchBtn) {
        researchBtn.style.display = 'none';
      }
      
      window.uiManager.updateUI();
    });
    
    // Verify research was cleared - wait a bit for UI to update
    await page.waitForTimeout(500);
    await expect(page.locator('#researchBtn')).not.toBeVisible();
    
    // Load save
    await page.locator('[data-slot="1"][data-action="load"]').click();
    await page.waitForSelector('text=Game loaded from slot 1!', { timeout: 5000 });
    
    // Verify research was restored
    await expect(page.locator('#researchBtn')).toBeVisible();
    
    const restoredPoints = await page.evaluate(() => {
      return window.game.gameState.getResearchSystem().points;
    });
    expect(restoredPoints).toBe(4);
    
    const restoredNodes = await page.evaluate(() => {
      return Array.from(window.game.gameState.getResearchSystem().researched);
    });
    expect(restoredNodes).toContain('auto_minerals');
    
    // Verify individual tree nodes have correct researched status
    const nodeStatus = await page.evaluate(() => {
      const research = window.game.gameState.getResearchSystem();
      const node = research.tree['auto_minerals'];
      return node ? node.researched : false;
    });
    expect(nodeStatus).toBe(true);
  });

  test('probe equipment state is preserved across saves', async ({ page }) => {
    // Set up game state with a probe and equipment
    await page.evaluate(() => {
      const gameState = window.game.gameState;
      
      // Add research for auto-collection
      const research = gameState.getResearchSystem();
      research.unlocked = true;
      research.points = 5;
      research.researched.add('auto_minerals');
      research.researched.add('auto_data');
      
      // Add resources
      gameState.updateResources({ minerals: 100, data: 50 });
      
      // Add a hub
      const hub = {
        id: 'test-hub-1',
        x: 0,
        y: 0,
        sector: { x: 0, y: 0 },
        range: 300,
        maxProbes: 3,
        selected: false
      };
      gameState.entities.reconHubs.push(hub);
      
      // Add a probe with equipment
      const probe = {
        id: 'test-probe-1',
        waypoints: [],
        currentWaypoint: 0,
        current: { x: 0, y: 0 },
        segmentProgress: 0,
        speed: 0.0001,
        active: true,
        status: 'ready',
        hub: hub,
        equipment: {
          type: 'auto_collector',
          name: 'Auto-Collector',
          collectionTypes: ['minerals'],
          availableTypes: ['minerals', 'data']
        },
        patrolMode: false,
        damage: 0,
        outboundWaypointsCount: 0,
        returnSpeed: 0.0003
      };
      gameState.entities.probes.push(probe);
      
      // Equipment will be processed by the save/load system
      
      window.uiManager.updateUI();
    });
    
    // Manually assign equipment to the probe to test save/load
    await page.evaluate(() => {
      const probe = window.game.gameState.entities.probes[0];
      if (probe && !probe.equipment) {
        probe.equipment = {
          type: 'auto_collector',
          name: 'Auto-Collector',
          collectionTypes: ['minerals'],
          availableTypes: ['minerals', 'data']
        };
      }
    });
    
    // Verify probe equipment
    const equipmentBefore = await page.evaluate(() => {
      const probe = window.game.gameState.entities.probes[0];
      return probe ? probe.equipment : null;
    });
    
    expect(equipmentBefore).toBeTruthy();
    expect(equipmentBefore.collectionTypes).toContain('minerals');
    
    // Save game
    await page.locator('#mainMenuBtn').click();
    await page.waitForSelector('#mainMenuModal.active');
    await page.locator('#saveLoadMenuBtn').click();
    await page.waitForSelector('#saveLoadModal.active');
    await page.evaluate(() => { window.confirm = () => true; });
    await page.locator('[data-slot="1"][data-action="save"]').click();
    await page.waitForSelector('text=Saved!', { timeout: 5000 });
    
    // Clear probe equipment
    await page.evaluate(() => {
      const probe = window.game.gameState.entities.probes[0];
      if (probe) probe.equipment = null;
    });
    
    // Verify equipment was cleared
    const equipmentCleared = await page.evaluate(() => {
      const probe = window.game.gameState.entities.probes[0];
      return probe ? probe.equipment : null;
    });
    expect(equipmentCleared).toBe(null);
    
    // Load save
    await page.locator('[data-slot="1"][data-action="load"]').click();
    await page.waitForSelector('text=Game loaded from slot 1!', { timeout: 5000 });
    
    // Verify equipment was restored
    const equipmentAfter = await page.evaluate(() => {
      const probe = window.game.gameState.entities.probes[0];
      return probe ? probe.equipment : null;
    });
    
    expect(equipmentAfter).toBeTruthy();
    expect(equipmentAfter.type).toBe('auto_collector');
    expect(equipmentAfter.collectionTypes).toContain('minerals');
    expect(equipmentAfter.availableTypes).toContain('data');
  });

  test('auto-save during quit works correctly', async ({ page }) => {
    // Set up some game state
    await page.evaluate(() => {
      window.game.gameState.updateResources({ minerals: 150 });
      window.uiManager.updateUI();
    });
    
    // Override window.location.reload to prevent actual reload in test
    await page.evaluate(() => {
      window.location.reload = () => {
        console.log('Reload prevented for test');
      };
    });
    
    // Override confirm to simulate user clicking OK
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    
    // Quit game (this should trigger auto-save)
    await page.locator('#mainMenuBtn').click();
    await page.locator('#quitGameMenuBtn').click();
    
    // Wait for auto-save success message
    await page.waitForSelector('text=Game saved! Thanks for playing!', { timeout: 5000 });
    
    // Verify auto-save was created in localStorage
    const autoSaveExists = await page.evaluate(() => {
      const autoSave = localStorage.getItem('probetheus_save_auto');
      return autoSave !== null;
    });
    expect(autoSaveExists).toBe(true);
    
    // Verify auto-save contains correct data
    const autoSaveData = await page.evaluate(() => {
      const autoSave = localStorage.getItem('probetheus_save_auto');
      return autoSave ? JSON.parse(autoSave) : null;
    });
    
    expect(autoSaveData).toBeTruthy();
    expect(autoSaveData.gameState.resources.minerals).toBe(150);
  });

  test('save system handles errors gracefully', async ({ page }) => {
    // Mock localStorage to fail
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        if (key.includes('probetheus_save_slot_')) {
          throw new Error('Storage quota exceeded');
        }
        return originalSetItem.call(this, key, value);
      };
    });
    
    // Attempt to save
    await page.locator('#mainMenuBtn').click();
    await page.waitForSelector('#mainMenuModal.active');
    await page.locator('#saveLoadMenuBtn').click();
    await page.waitForSelector('#saveLoadModal.active');
    await page.evaluate(() => { window.confirm = () => true; });
    await page.locator('[data-slot="1"][data-action="save"]').click();
    
    // Wait for error handling
    await page.waitForTimeout(2000);
    
    // Verify save button was restored after error
    const saveButton = await page.locator('[data-slot="1"][data-action="save"]');
    await expect(saveButton).not.toBeDisabled();
    await expect(saveButton).not.toContainText('Saving...');
    
    // Restore localStorage
    await page.evaluate(() => {
      localStorage.setItem = Storage.prototype.setItem;
    });
  });

  test('multiple save overwrites work correctly', async ({ page }) => {
    // Create initial save
    await page.evaluate(() => {
      window.game.gameState.updateResources({ minerals: 100 });
      window.uiManager.updateUI();
      window.confirm = () => true;
    });
    
    await page.locator('#mainMenuBtn').click();
    await page.locator('#saveLoadMenuBtn').click();
    await page.locator('[data-slot="1"][data-action="save"]').click();
    await page.waitForSelector('text=Saved!', { timeout: 5000 });
    await page.locator('#closeSaveLoadModal').click();
    
    // Modify state and save again
    await page.evaluate(() => {
      window.game.gameState.updateResources({ minerals: 200 });
      window.uiManager.updateUI();
    });
    
    await page.locator('#mainMenuBtn').click();
    await page.locator('#saveLoadMenuBtn').click();
    await page.locator('[data-slot="1"][data-action="save"]').click();
    await page.waitForSelector('text=Saved!', { timeout: 5000 });
    await page.locator('#closeSaveLoadModal').click();
    
    // Load and verify latest save
    await page.locator('#mainMenuBtn').click();
    await page.waitForSelector('#mainMenuModal.active');
    await page.locator('#saveLoadMenuBtn').click();
    await page.waitForSelector('#saveLoadModal.active');
    await page.locator('[data-slot="1"][data-action="load"]').click();
    await page.waitForSelector('text=Game loaded from slot 1!', { timeout: 5000 });
    
    await expect(page.locator('#minerals')).toContainText('200');
  });

  test('save slot metadata displays correctly', async ({ page }) => {
    // Set up game state with known values
    await page.evaluate(() => {
      const gameState = window.game.gameState;
      gameState.updateResources({ minerals: 123, data: 456, artifacts: 789 });
      gameState.probethium.current = 1.23456789;
      
      const research = gameState.getResearchSystem();
      research.points = 7;
      research.unlocked = true;
      
      window.uiManager.updateUI();
      window.confirm = () => true;
    });
    
    // Save game
    await page.locator('#mainMenuBtn').click();
    await page.waitForSelector('#mainMenuModal.active');
    await page.locator('#saveLoadMenuBtn').click();
    await page.waitForSelector('#saveLoadModal.active');
    await page.locator('[data-slot="1"][data-action="save"]').click();
    await page.waitForSelector('text=Saved!', { timeout: 5000 });
    await page.locator('#closeSaveLoadModal').click();
    
    // Reopen save modal to check metadata
    await page.locator('#mainMenuBtn').click();
    await page.waitForSelector('#mainMenuModal.active');
    await page.locator('#saveLoadMenuBtn').click();
    await page.waitForSelector('#saveLoadModal.active');
    
    // Verify save slot shows correct information 
    // The save modal should contain text showing slot information
    const modalContent = await page.locator('#saveLoadModal').textContent();
    expect(modalContent).toContain('Slot 1');
    expect(modalContent).toContain('Research: 7');
    expect(modalContent).toContain('1.2345678900'); // Probethium value
  });

});

test.describe('Cross-Session State Management', () => {
  
  test('complete gameplay cycle maintains consistency', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#newGameBtn').click();
    await page.waitForSelector('#galaxyCanvas');
    
    // Full gameplay simulation
    await page.evaluate(() => {
      const gameState = window.game.gameState;
      
      // Set up complex game state
      gameState.updateResources({ minerals: 500, data: 300, artifacts: 100 });
      
      // Research progress
      const research = gameState.getResearchSystem();
      research.unlocked = true;
      research.points = 10;
      research.researched.add('auto_minerals');
      research.researched.add('auto_data');
      research.tree['auto_minerals'].researched = true;
      research.tree['auto_data'].researched = true;
      
      // Probe with complex state
      const hub = {
        id: 'hub-1', x: 100, y: 200, sector: { x: 0, y: 0 },
        range: 300, maxProbes: 3, selected: false
      };
      gameState.entities.reconHubs.push(hub);
      
      const probe = {
        id: 'probe-1',
        waypoints: [{x: 50, y: 50}, {x: 150, y: 150}, {x: 100, y: 200}],
        currentWaypoint: 1,
        current: { x: 100, y: 100 },
        speed: 0.0001,
        active: true,
        status: 'exploring',
        hub: hub,
        equipment: {
          type: 'auto_collector',
          name: 'Auto-Collector',
          collectionTypes: ['minerals', 'data'],
          availableTypes: ['minerals', 'data']
        },
        outboundWaypointsCount: 2,
        returnSpeed: 0.0003
      };
      gameState.entities.probes.push(probe);
      
      window.uiManager.updateUI();
      window.confirm = () => true;
    });
    
    // Close any open modals first
    await page.evaluate(() => {
      // Close any open modals
      const modals = document.querySelectorAll('.modal.active');
      modals.forEach(modal => modal.classList.remove('active'));
    });
    
    // Save this complex state
    await page.locator('#mainMenuBtn').click();
    await page.waitForSelector('#mainMenuModal.active');
    await page.locator('#saveLoadMenuBtn').click();
    await page.waitForSelector('#saveLoadModal.active');
    await page.locator('[data-slot="2"][data-action="save"]').click();
    await page.waitForSelector('text=Saved!', { timeout: 5000 });
    
    // Simulate page reload (new session)
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#loadGameBtn').click();
    
    // Load the complex save
    await page.waitForSelector('#saveLoadModal.active');
    await page.evaluate(() => { window.confirm = () => true; });
    await page.locator('[data-slot="2"][data-action="load"]').click();
    await page.waitForSelector('text=Game loaded from slot 2!', { timeout: 5000 });
    
    // Verify all complex state was preserved
    const restoredState = await page.evaluate(() => {
      const gameState = window.game.gameState;
      const probe = gameState.entities.probes[0];
      const research = gameState.getResearchSystem();
      
      return {
        resources: gameState.getResources(),
        researchPoints: research.points,
        researchedNodes: Array.from(research.researched),
        probeCount: gameState.entities.probes.length,
        probeWaypoints: probe ? probe.waypoints.length : 0,
        probeEquipment: probe ? probe.equipment?.collectionTypes : null,
        probeOutboundCount: probe ? probe.outboundWaypointsCount : null
      };
    });
    
    expect(restoredState.resources.minerals).toBe(500);
    expect(restoredState.resources.data).toBe(300);
    expect(restoredState.resources.artifacts).toBe(100);
    expect(restoredState.researchPoints).toBe(10);
    expect(restoredState.researchedNodes).toContain('auto_minerals');
    expect(restoredState.researchedNodes).toContain('auto_data');
    expect(restoredState.probeCount).toBe(1);
    expect(restoredState.probeWaypoints).toBe(3);
    expect(restoredState.probeEquipment).toContain('minerals');
    expect(restoredState.probeEquipment).toContain('data');
    expect(restoredState.probeOutboundCount).toBe(2);
  });

});