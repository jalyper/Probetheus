import { test, expect } from '@playwright/test';

/**
 * Basic smoke tests to ensure the game loads and core systems work
 */

test.describe('Game Startup and Basic Functionality', () => {
  
  test('game loads successfully and shows start screen', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Verify start screen elements (use first h1 to avoid strict mode violation)
    await expect(page.locator('h1').first()).toContainText('Probetheus');
    await expect(page.locator('#newGameBtn')).toBeVisible();
    await expect(page.locator('#loadGameBtn')).toBeVisible();
    
    // Wait for scripts to load and check that game classes are available
    await page.waitForFunction(() => {
      return typeof window.GameController !== 'undefined' && 
             typeof window.GameState !== 'undefined' && 
             typeof window.SaveManager !== 'undefined';
    }, { timeout: 10000 });
    
    const gameLoaded = await page.evaluate(() => {
      return typeof GameController !== 'undefined' && 
             typeof GameState !== 'undefined' && 
             typeof SaveManager !== 'undefined';
    });
    expect(gameLoaded).toBe(true);
  });

  test('new game initializes correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.locator('#newGameBtn').click();
    
    // Wait for game to initialize
    await page.waitForSelector('#galaxyCanvas');
    await expect(page.locator('#gameContainer')).toBeVisible();
    
    // Wait a bit for systems to initialize
    await page.waitForTimeout(1000);
    
    // Check initial game state
    await expect(page.locator('#minerals')).toContainText('0');
    await expect(page.locator('#probeCount')).toContainText('3');
    await expect(page.locator('#hubCount')).toContainText('1');
    
    // Verify core systems are initialized (check for truthiness, not exact boolean)
    const systemsReady = await page.evaluate(() => {
      return !!(window.game && 
                window.game.gameState && 
                window.game.saveManager && 
                window.uiManager);
    });
    expect(systemsReady).toBe(true);
  });

  test('main menu navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('#newGameBtn').click();
    await page.waitForSelector('#galaxyCanvas');
    await page.waitForTimeout(1500);

    // Dismiss tutorial if it's blocking
    await page.evaluate(() => {
      const tutorialPanel = document.getElementById('tutorialPanel');
      if (tutorialPanel) {
        tutorialPanel.style.display = 'none';
      }
    });

    // Open and close main menu
    const mainMenuBtn = page.locator('#mainMenuBtn');
    await expect(mainMenuBtn).toBeVisible();
    await mainMenuBtn.click();
    await expect(page.locator('#mainMenuModal')).toHaveClass(/active/);

    // Close main menu with Resume Game button
    await page.locator('#closeMainMenu').click();
    await expect(page.locator('#mainMenuModal')).not.toHaveClass(/active/);

    // Open main menu again and test save/load sub-menu
    await mainMenuBtn.click();
    await expect(page.locator('#mainMenuModal')).toHaveClass(/active/);

    await page.locator('#saveLoadMenuBtn').click();
    await expect(page.locator('#saveLoadModal')).toHaveClass(/active/);

    // Close save/load modal
    await page.locator('#closeSaveLoadModal').click();
    await expect(page.locator('#saveLoadModal')).not.toHaveClass(/active/);
  });

  test('uplink system initializes correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('#newGameBtn').click();
    await page.waitForSelector('#galaxyCanvas');
    await page.waitForTimeout(1500);

    // Dismiss tutorial if it's blocking
    await page.evaluate(() => {
      const tutorialPanel = document.getElementById('tutorialPanel');
      if (tutorialPanel) {
        tutorialPanel.style.display = 'none';
      }
    });

    // Uplink button is always visible from the start
    await expect(page.locator('#uplinkBtn')).toBeVisible();

    // Build the Uplink (grant materials, then craft it)
    await page.evaluate(() => {
      window.game.gameState.resources.minerals = 100;
      window.game.gameState.resources.data = 100;
      window.game.uplinkSystem.build();
    });

    // Click the Uplink button — the panel opens as an overlay over the map
    await page.locator('#uplinkBtn').click();
    await expect(page.locator('#uplinkPanel')).toBeVisible();

    // The protocol catalog is shown once built
    await expect(page.locator('#uplinkPanel .uplink-protocol')).toHaveCount(7);

    // The map stays underneath — this is an overlay, not a screen switch
    await expect(page.locator('#galaxyCanvas')).toBeVisible();
  });

  test('probe deployment basic functionality', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('#newGameBtn').click();
    await page.waitForSelector('#galaxyCanvas');
    await page.waitForTimeout(1500);

    // Select the starting hub programmatically to open the details panel
    await page.evaluate(() => {
      const hubs = window.game.gameState.entities.reconHubs;
      if (hubs && hubs.length > 0) {
        const hub = hubs[0];
        hub.selected = true;
        // Emit entity:selected event to open the DetailsPanel
        window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
      }
    });

    // Wait for details panel to show
    await page.waitForTimeout(500);

    // The deploy button should be visible in the hub details panel
    const deployBtn = page.locator('#deployFromHub');
    await expect(deployBtn).toBeVisible();

    // Click deploy to start deployment mode
    await deployBtn.click();

    // Verify deployment mode is active (probe status should show instructions)
    await page.waitForTimeout(300);
    const probeStatus = await page.locator('#probeStatus').textContent();
    expect(probeStatus).toBeTruthy();
  });

});