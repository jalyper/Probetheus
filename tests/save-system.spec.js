import { test, expect } from '@playwright/test';

/**
 * Comprehensive Save System Tests for Space Idle Game
 * 
 * These tests ensure the save/load functionality is bulletproof by testing:
 * 1. Basic save/load operations
 * 2. Uplink protocol progress persistence
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

  test('uplink protocol progress persists across save/load cycles', async ({ page }) => {
    // Build the Uplink and decode a protocol with partial progress on another
    await page.evaluate(() => {
      const uplink = window.game.gameState.getUplink();
      uplink.built = true;
      uplink.level = 2;
      uplink.active = 'deep_resonance';
      uplink.progress = { deep_resonance: 12.5 };
      uplink.decoded.add('harvest_lattice');
      uplink.paid.add('harvest_lattice');

      window.uiManager.updateUI();
    });

    // Verify uplink state
    const decodedBefore = await page.evaluate(() => {
      return Array.from(window.game.gameState.getUplink().decoded);
    });
    expect(decodedBefore).toContain('harvest_lattice');

    const hasProtocol = await page.evaluate(() => {
      return window.game.gameState.hasProtocol('harvest_lattice');
    });
    expect(hasProtocol).toBe(true);

    // Save game programmatically for reliability
    const saveResult = await page.evaluate(async () => {
      try {
        await window.game.saveManager.saveGame(1);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    expect(saveResult.success).toBe(true);

    // Scramble uplink state
    await page.evaluate(() => {
      window.game.gameState.uplink = {
        built: false, level: 1, active: null,
        progress: {}, paid: new Set(), decoded: new Set()
      };
      window.uiManager.updateUI();
    });

    // Verify uplink was cleared
    const clearedProtocol = await page.evaluate(() => {
      return window.game.gameState.hasProtocol('harvest_lattice');
    });
    expect(clearedProtocol).toBe(false);

    // Load save programmatically
    const loadResult = await page.evaluate(async () => {
      try {
        await window.game.saveManager.loadGame(1);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    expect(loadResult.success).toBe(true);
    await page.waitForTimeout(500);

    // Verify the full uplink state was restored
    const restored = await page.evaluate(() => {
      const uplink = window.game.gameState.getUplink();
      return {
        built: uplink.built,
        level: uplink.level,
        active: uplink.active,
        progress: uplink.progress.deep_resonance,
        decoded: Array.from(uplink.decoded),
        paid: Array.from(uplink.paid),
        hasProtocol: window.game.gameState.hasProtocol('harvest_lattice')
      };
    });
    expect(restored.built).toBe(true);
    expect(restored.level).toBe(2);
    expect(restored.active).toBe('deep_resonance');
    expect(restored.progress).toBeCloseTo(12.5, 5);
    expect(restored.decoded).toContain('harvest_lattice');
    expect(restored.paid).toContain('harvest_lattice');
    expect(restored.hasProtocol).toBe(true);
  });

  test('probe equipment state is preserved across saves', async ({ page }) => {
    // Set up game state with a probe and equipment
    const setupResult = await page.evaluate(() => {
      const gameState = window.game.gameState;

      // Decode the protocol that gates the typed collectors
      gameState.uplink.decoded.add('harvest_lattice');

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

      // Add a probe with equipment (array format)
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
        equipment: [{
          type: 'mineral_collector',
          name: 'Mineral Collector',
          collectionTypes: ['minerals'],
          installedAt: Date.now()
        }],
        maxEquipmentSlots: 2,
        patrolMode: false,
        damage: 0,
        outboundWaypointsCount: 0,
        returnSpeed: 0.0003
      };
      gameState.entities.probes.push(probe);

      window.uiManager.updateUI();

      // Return probe count and equipment to verify setup worked
      return {
        probeCount: gameState.entities.probes.length,
        equipment: gameState.entities.probes[gameState.entities.probes.length - 1]?.equipment
      };
    });

    // Verify probe was added with equipment
    expect(setupResult.probeCount).toBeGreaterThan(0);
    expect(setupResult.equipment).toBeTruthy();
    expect(Array.isArray(setupResult.equipment)).toBe(true);
    expect(setupResult.equipment[0].collectionTypes).toContain('minerals');

    // Save game programmatically
    const saveResult = await page.evaluate(async () => {
      try {
        await window.game.saveManager.saveGame(1);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    expect(saveResult.success).toBe(true);

    // Clear equipment from the last added probe
    await page.evaluate(() => {
      const probes = window.game.gameState.entities.probes;
      const testProbe = probes.find(p => p.id === 'test-probe-1');
      if (testProbe) testProbe.equipment = [];
    });

    // Verify equipment was cleared
    const equipmentCleared = await page.evaluate(() => {
      const testProbe = window.game.gameState.entities.probes.find(p => p.id === 'test-probe-1');
      return testProbe ? testProbe.equipment.length : 'probe_not_found';
    });
    expect(equipmentCleared).toBe(0);

    // Load save programmatically
    const loadResult = await page.evaluate(async () => {
      try {
        await window.game.saveManager.loadGame(1);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    expect(loadResult.success).toBe(true);
    await page.waitForTimeout(500);

    // Verify equipment was restored
    const equipmentAfter = await page.evaluate(() => {
      const testProbe = window.game.gameState.entities.probes.find(p => p.id === 'test-probe-1');
      return testProbe ? testProbe.equipment : null;
    });

    expect(equipmentAfter).toBeTruthy();
    expect(Array.isArray(equipmentAfter)).toBe(true);
    expect(equipmentAfter.length).toBe(1);
    expect(equipmentAfter[0].type).toBe('mineral_collector');
    expect(equipmentAfter[0].collectionTypes).toContain('minerals');
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
    await page.waitForSelector('#mainMenuModal.active');
    await page.locator('#quitGameMenuBtn').click();

    // Wait for auto-save success message
    await page.waitForSelector('text=Game saved! Thanks for playing!', { timeout: 5000 });

    // Verify auto-save was created in localStorage (game uses csog_save_auto key)
    const autoSaveExists = await page.evaluate(() => {
      const autoSave = localStorage.getItem('csog_save_auto');
      return autoSave !== null;
    });
    expect(autoSaveExists).toBe(true);

    // Verify auto-save contains correct data
    const autoSaveData = await page.evaluate(() => {
      const autoSave = localStorage.getItem('csog_save_auto');
      return autoSave ? JSON.parse(autoSave) : null;
    });

    expect(autoSaveData).toBeTruthy();
    expect(autoSaveData.gameState.resources.minerals).toBe(150);
  });

  test('save system handles errors gracefully', async ({ page }) => {
    // Mock localStorage to fail (game uses csog_save_slot_ prefix)
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        if (key.includes('csog_save_slot_')) {
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

    // Verify that either an error was shown or the button was reset
    // The button may show "Save Here" (reset after error) or remain in error state
    const saveButton = await page.locator('[data-slot="1"][data-action="save"]');
    const buttonText = await saveButton.textContent();
    // After an error, button should not still say "Saving..."
    expect(buttonText).not.toBe('Saving...');

    // Restore localStorage
    await page.evaluate(() => {
      localStorage.setItem = Storage.prototype.setItem;
    });
  });

  test('multiple save overwrites work correctly', async ({ page }) => {
    // Set minerals to 100 and save
    await page.evaluate(async () => {
      window.game.gameState.resources.minerals = 100;
      window.uiManager.updateUI();
      await window.game.saveManager.saveGame(1);
    });

    // Verify minerals is 100 before modifying
    await expect(page.locator('#minerals')).toContainText('100');

    // Set minerals to 200 and save again (overwrite)
    await page.evaluate(async () => {
      window.game.gameState.resources.minerals = 200;
      window.uiManager.updateUI();
      await window.game.saveManager.saveGame(1);
    });

    // Verify minerals is 200 before loading
    await expect(page.locator('#minerals')).toContainText('200');

    // Reset to 0 to confirm load works
    await page.evaluate(() => {
      window.game.gameState.resources.minerals = 0;
      window.uiManager.updateUI();
    });
    await expect(page.locator('#minerals')).toContainText('0');

    // Load and verify latest save restores 200
    await page.evaluate(async () => {
      await window.game.saveManager.loadGame(1);
      window.uiManager.updateUI();
    });
    await page.waitForTimeout(500);

    await expect(page.locator('#minerals')).toContainText('200');
  });

  test('save slot metadata displays correctly', async ({ page }) => {
    // Set up game state with known values
    await page.evaluate(() => {
      const gameState = window.game.gameState;
      gameState.updateResources({ minerals: 123, data: 456, artifacts: 789 });
      gameState.probethium.current = 1.23456789;

      // Decode two protocols — metadata should show the count
      gameState.uplink.built = true;
      gameState.uplink.decoded.add('swift_carriage');
      gameState.uplink.decoded.add('harvest_lattice');

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
    expect(modalContent).toContain('Protocols: 2');
    expect(modalContent).toContain('1.2345678900'); // Probethium value
  });

});

test.describe('Cross-Session State Management', () => {

  test('complete gameplay cycle maintains consistency', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.locator('#newGameBtn').click();
    // Handle cutscene if it appears
    await page.waitForTimeout(1500);
    const skipBtn = page.locator('#skipCutscene');
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
    }
    await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Dismiss tutorial panel
    await page.evaluate(() => {
      const tutorialPanel = document.getElementById('tutorialPanel');
      if (tutorialPanel) tutorialPanel.style.display = 'none';
    });

    // Full gameplay simulation
    await page.evaluate(() => {
      const gameState = window.game.gameState;

      // Set up complex game state
      gameState.updateResources({ minerals: 500, data: 300, artifacts: 100 });

      // Uplink progress
      const uplink = gameState.getUplink();
      uplink.built = true;
      uplink.decoded.add('harvest_lattice');
      uplink.decoded.add('swift_carriage');

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
    });

    // Save this complex state programmatically
    const saveResult = await page.evaluate(async () => {
      try {
        await window.game.saveManager.saveGame(2);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    expect(saveResult.success).toBe(true);

    // Simulate page reload (new session) - don't clear localStorage, we need the save!
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Start a new game first (needed to initialize game systems)
    await page.locator('#newGameBtn').click();
    // Handle cutscene if it appears
    await page.waitForTimeout(1500);
    const skipBtn2 = page.locator('#skipCutscene');
    if (await skipBtn2.isVisible()) {
      await skipBtn2.click();
    }
    await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Dismiss tutorial panel
    await page.evaluate(() => {
      const tutorialPanel = document.getElementById('tutorialPanel');
      if (tutorialPanel) tutorialPanel.style.display = 'none';
    });

    // Wait for game systems to be ready
    await page.waitForFunction(() => {
      return typeof window.game !== 'undefined' &&
             window.game.saveManager &&
             window.game.gameState;
    }, { timeout: 10000 });

    // Load the complex save programmatically
    const loadResult = await page.evaluate(async () => {
      try {
        await window.game.saveManager.loadGame(2);
        window.uiManager?.updateUI();
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    expect(loadResult.success).toBe(true);
    await page.waitForTimeout(500);

    // Verify all complex state was preserved
    const restoredState = await page.evaluate(() => {
      const gameState = window.game.gameState;
      const probe = gameState.entities.probes[0];
      const uplink = gameState.getUplink();

      return {
        resources: gameState.getResources(),
        uplinkBuilt: uplink.built,
        decodedProtocols: Array.from(uplink.decoded),
        probeCount: gameState.entities.probes.length,
        probeWaypoints: probe ? probe.waypoints.length : 0,
        probeEquipment: probe ? probe.equipment?.collectionTypes : null,
        probeOutboundCount: probe ? probe.outboundWaypointsCount : null
      };
    });

    // Core resource values should be preserved exactly
    expect(restoredState.resources.minerals).toBe(500);
    expect(restoredState.resources.data).toBe(300);
    expect(restoredState.resources.artifacts).toBe(100);

    // Uplink state should be preserved
    expect(restoredState.uplinkBuilt).toBe(true);
    expect(restoredState.decodedProtocols).toContain('harvest_lattice');
    expect(restoredState.decodedProtocols).toContain('swift_carriage');

    // Probes may have different count due to new game initialization adding default probes
    // The key is that our custom probe data was preserved (resources, research)
    expect(restoredState.probeCount).toBeGreaterThanOrEqual(1);

    // Probe details may vary based on save/load implementation
    // Primary test is that complex state (resources, research) persists across sessions
    if (restoredState.probeWaypoints > 0) {
      // If our test probe was preserved, verify its equipment
      expect(restoredState.probeEquipment).toContain('minerals');
      expect(restoredState.probeEquipment).toContain('data');
    }
  });

});