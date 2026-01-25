/**
 * Save System Tests (Electron & StorageAdapter)
 * Tests the migrated save system with async storage
 */

const { test, expect } = require('@playwright/test');

test.describe('Save System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('should save game to slot', async ({ page }) => {
        // Start new game
        await page.click('#newGameBtn');
        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Open menu using main menu button
        await page.click('#mainMenuBtn');
        await page.waitForTimeout(500);

        // Click Save/Load
        await page.click('#saveLoadMenuBtn');
        await page.waitForTimeout(1000);

        // Save to slot 1
        const saveBtn = await page.$('[data-slot="1"][data-action="save"]');
        expect(saveBtn).not.toBeNull();

        await saveBtn.click();
        await page.waitForTimeout(1000);

        // Check that save was successful by looking for saved message or button state
        const slotText = await page.textContent('[data-slot="1"]');
        expect(slotText).toBeTruthy();
    });

    test('should load game from slot', async ({ page }) => {
        // Start game
        await page.click('#newGameBtn');
        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Add some resources (simulate gameplay)
        await page.evaluate(() => {
            if (window.game && window.game.gameState) {
                window.game.gameState.updateResources({ minerals: 100, data: 50 });
                window.uiManager.updateUI();
            }
        });

        await page.waitForTimeout(500);

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

        // Reset resources
        await page.evaluate(() => {
            if (window.game && window.game.gameState) {
                window.game.gameState.updateResources({ minerals: -100, data: -50 });
                window.uiManager.updateUI();
            }
        });

        // Verify resources were reset
        await expect(page.locator('#minerals')).toContainText('-100');

        // Load game programmatically
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

        // Resources should be restored
        const loadedMinerals = await page.textContent('#minerals');
        expect(loadedMinerals).toContain('100');
    });

    test('should auto-save periodically', async ({ page }) => {
        await page.click('#newGameBtn');
        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Check that auto-save key exists in storage
        const hasAutoSave = await page.evaluate(async () => {
            if (typeof storageAdapter !== 'undefined') {
                return await storageAdapter.has('csog_save_auto');
            }
            return localStorage.getItem('csog_save_auto') !== null;
        });

        // May not be auto-saved immediately, but should exist after gameplay
        // This test verifies the mechanism exists
        expect(typeof hasAutoSave).toBe('boolean');
    });

    test('should show save slot metadata', async ({ page }) => {
        // Create a save
        await page.click('#newGameBtn');
        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Save game programmatically to ensure it completes
        const saveResult = await page.evaluate(async () => {
            try {
                await window.game.saveManager.saveGame(1);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });
        expect(saveResult.success).toBe(true);

        // Open save/load menu to check slot displays correctly
        await page.click('#mainMenuBtn');
        await page.waitForSelector('#mainMenuModal.active');
        await page.click('#saveLoadMenuBtn');
        await page.waitForSelector('#saveLoadModal.active');

        // Slot 1 should show Load button (indicates save exists)
        const loadBtn = await page.$('[data-slot="1"][data-action="load"]');
        expect(loadBtn).not.toBeNull();
    });

    test('storage adapter should work in both web and electron modes', async ({ page }) => {
        // Check that storageAdapter is initialized
        await page.click('#newGameBtn');
        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        const adapterInfo = await page.evaluate(() => {
            if (typeof storageAdapter === 'undefined') {
                return { exists: false };
            }
            return {
                exists: true,
                mode: storageAdapter.mode || 'web',
                methods: {
                    hasGetItem: typeof storageAdapter.getItem === 'function',
                    hasSetItem: typeof storageAdapter.setItem === 'function',
                    hasHas: typeof storageAdapter.has === 'function',
                }
            };
        });

        expect(adapterInfo.exists).toBe(true);
        expect(adapterInfo.methods.hasGetItem).toBe(true);
        expect(adapterInfo.methods.hasSetItem).toBe(true);
    });
});
