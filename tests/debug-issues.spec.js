/**
 * Debug tests for shell save/load and probethium button issues
 */
const { test, expect } = require('@playwright/test');

test.describe('Debug: Shell Save/Load and Probethium', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    async function startGame(page) {
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(3000);
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });
        await page.waitForFunction(() => {
            return window.game && window.game.gameState && window.game.shellSystem && window.game.saveManager;
        }, { timeout: 10000 });
    }

    test('probethium button adds 100 and updates display', async ({ page }) => {
        await startGame(page);

        // Get initial values
        const before = await page.evaluate(() => ({
            memoryValue: window.game.gameState.probethium.current,
            displayValue: document.getElementById('probethium')?.textContent,
            buttonExists: !!document.getElementById('testAddProbetheum'),
        }));
        console.log('Before click:', JSON.stringify(before));

        // Click the probethium button
        await page.locator('#testAddProbetheum').click();
        await page.waitForTimeout(500);

        // Check both memory and display
        const after = await page.evaluate(() => ({
            miningTotal: window.game.gameState.mining.totalProbetheum,
            probethiumCurrent: window.game.gameState.probethium.current,
            displayValue: document.getElementById('probethium')?.textContent,
        }));
        console.log('After click:', JSON.stringify(after));

        // The mining total (displayed value) should have increased by 100
        expect(after.miningTotal).toBeGreaterThanOrEqual(100);
        // The display should reflect the new value
        expect(parseFloat(after.displayValue)).toBeGreaterThanOrEqual(100);
    });

    test('shell persists through quit and continue flow', async ({ page }) => {
        await startGame(page);

        // Equip a shell
        await page.evaluate(() => {
            const gs = window.game.gameState;
            if (!gs.cosmetics.ownedShells.probes.includes('solar_flare')) {
                gs.cosmetics.ownedShells.probes.push('solar_flare');
            }
            window.game.shellSystem.equipShellOnProbe(gs.entities.probes[0], 'solar_flare');
        });

        // Verify equipped
        const equipped = await page.evaluate(() => window.game.gameState.entities.probes[0].shellId);
        expect(equipped).toBe('solar_flare');

        // Simulate quit: performAutoSave then reload
        await page.evaluate(async () => {
            await window.game.performAutoSave();
        });

        // Verify auto-save data contains shellId
        const savedShellId = await page.evaluate(() => {
            const saved = JSON.parse(localStorage.getItem('csog_save_auto'));
            return saved?.gameState?.entities?.probes?.[0]?.shellId;
        });
        console.log('Saved shellId in auto-save:', savedShellId);
        expect(savedShellId).toBe('solar_flare');

        // Reload page (simulates closing browser)
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Click Continue
        await expect(page.locator('#continueGameBtn')).toBeVisible({ timeout: 5000 });
        await page.locator('#continueGameBtn').click();

        // Wait for game to fully load
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(3000);
        await page.waitForFunction(() => {
            return window.game && window.game.gameState &&
                   window.game.gameState.entities.probes.length > 0;
        }, { timeout: 10000 });

        // Check shell was restored
        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            return {
                shellId: probe.shellId,
                hasCosmetic: !!probe.cosmetic,
                bodyColor: probe.cosmetic?.bodyColor,
                probeCount: window.game.gameState.entities.probes.length,
                ownedShells: window.game.gameState.cosmetics?.ownedShells?.probes
            };
        });

        console.log('After continue:', JSON.stringify(result, null, 2));

        expect(result.shellId).toBe('solar_flare');
        expect(result.ownedShells).toContain('solar_flare');
    });

    test('shell persists through manual save/load via slot UI flow', async ({ page }) => {
        await startGame(page);

        // Equip shell
        await page.evaluate(() => {
            const gs = window.game.gameState;
            if (!gs.cosmetics.ownedShells.probes.includes('void_walker')) {
                gs.cosmetics.ownedShells.probes.push('void_walker');
            }
            window.game.shellSystem.equipShellOnProbe(gs.entities.probes[0], 'void_walker');
        });

        // Save to slot 1
        await page.evaluate(async () => {
            await window.game.saveManager.saveGame(1);
        });

        // Verify save data
        const savedData = await page.evaluate(() => {
            const key = 'probetheus_save_slot_1';
            const data = JSON.parse(localStorage.getItem(key));
            const probe = data?.gameState?.entities?.probes?.[0];
            return {
                shellId: probe?.shellId,
                cosmetics: data?.gameState?.cosmetics
            };
        });
        console.log('Saved data:', JSON.stringify(savedData, null, 2));
        expect(savedData.shellId).toBe('void_walker');
        expect(savedData.cosmetics.ownedShells.probes).toContain('void_walker');

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Start new game first
        await startGame(page);

        // Load from slot 1
        await page.evaluate(async () => {
            await window.game.saveManager.loadGame(1);
        });
        await page.waitForTimeout(1000);

        // Check
        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            return {
                shellId: probe.shellId,
                bodyColor: probe.cosmetic?.bodyColor,
                ownedShells: window.game.gameState.cosmetics?.ownedShells?.probes,
                equippedShells: window.game.gameState.cosmetics?.equippedShells
            };
        });

        console.log('After load:', JSON.stringify(result, null, 2));
        expect(result.shellId).toBe('void_walker');
        expect(result.ownedShells).toContain('void_walker');
    });
});
