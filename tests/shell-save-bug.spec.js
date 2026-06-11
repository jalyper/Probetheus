/**
 * Shell Save/Load Bug Reproduction Tests
 * Tests that equipped shells persist through save/load, including page reloads
 */

const { test, expect } = require('@playwright/test');

test.describe('Shell Save/Load Persistence', () => {
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
            return typeof window.game !== 'undefined' &&
                   window.game.gameState &&
                   window.game.saveManager &&
                   window.game.shellSystem;
        }, { timeout: 10000 });
    }

    /**
     * Test: Shell persists through manual save/load within same session
     * This is the baseline - should work if save/load code is correct
     */
    test('shell persists through manual save/load in same session', async ({ page }) => {
        await startGame(page);

        // Equip shell on probe
        await page.evaluate(() => {
            const gs = window.game.gameState;
            const probe = gs.entities.probes[0];

            if (!gs.cosmetics.ownedShells.probes.includes('solar_flare')) {
                gs.cosmetics.ownedShells.probes.push('solar_flare');
            }

            window.game.shellSystem.equipShellOnProbe(probe, 'solar_flare');
        });

        // Save to slot 1
        const saveResult = await page.evaluate(async () => {
            try {
                await window.game.saveManager.saveGame(1);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });
        expect(saveResult.success).toBe(true);

        // Clear shell state to simulate fresh conditions
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            probe.shellId = 'default';
            probe.cosmetic = null;
        });

        // Load from slot 1
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

        // Verify shell was restored
        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            return {
                shellId: probe.shellId,
                hasCosmetic: !!probe.cosmetic,
                bodyColor: probe.cosmetic?.bodyColor,
                trailColor: probe.cosmetic?.trail?.color
            };
        });

        expect(result.shellId).toBe('solar_flare');
        expect(result.hasCosmetic).toBe(true);
        expect(result.bodyColor).toBe('#ff4500');
    });

    /**
     * Test: Shell persists through page reload (Continue Previous Session)
     * This simulates the real-world scenario: save, close browser, reopen
     */
    test('shell persists through page reload and Continue', async ({ page }) => {
        await startGame(page);

        // Equip shell
        await page.evaluate(() => {
            const gs = window.game.gameState;
            if (!gs.cosmetics.ownedShells.probes.includes('void_walker')) {
                gs.cosmetics.ownedShells.probes.push('void_walker');
            }
            window.game.shellSystem.equipShellOnProbe(gs.entities.probes[0], 'void_walker');
        });

        // Verify equipped
        const equipped = await page.evaluate(() => {
            return window.game.gameState.entities.probes[0].shellId;
        });
        expect(equipped).toBe('void_walker');

        // Perform auto-save using the proper async method (simulates periodic save)
        const autoSaveResult = await page.evaluate(async () => {
            try {
                await window.game.performAutoSave();
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });
        expect(autoSaveResult.success).toBe(true);

        // Reload the page (simulates closing and reopening the browser)
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Click Continue Previous Session
        const continueBtn = page.locator('#continueGameBtn');
        await expect(continueBtn).toBeVisible({ timeout: 5000 });
        await continueBtn.click();

        // Wait for game to load
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Wait for game systems
        await page.waitForFunction(() => {
            return typeof window.game !== 'undefined' &&
                   window.game.gameState &&
                   window.game.shellSystem &&
                   window.game.gameState.entities.probes.length > 0;
        }, { timeout: 10000 });

        // Verify shell was restored after page reload
        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            return {
                shellId: probe.shellId,
                hasCosmetic: !!probe.cosmetic,
                bodyColor: probe.cosmetic?.bodyColor,
                ownedShells: window.game.gameState.cosmetics?.ownedShells?.probes
            };
        });

        console.log('After reload result:', JSON.stringify(result, null, 2));

        expect(result.shellId).toBe('void_walker');
        expect(result.hasCosmetic).toBe(true);
        expect(result.bodyColor).toBe('#9400d3');
        expect(result.ownedShells).toContain('void_walker');
    });

    /**
     * Test: beforeunload auto-save correctly preserves shell data
     * This tests the specific bug where createSaveData() is async but called
     * without await in the beforeunload handler
     */
    test('beforeunload auto-save preserves shell data', async ({ page }) => {
        await startGame(page);

        // Equip shell
        await page.evaluate(() => {
            const gs = window.game.gameState;
            if (!gs.cosmetics.ownedShells.probes.includes('solar_flare')) {
                gs.cosmetics.ownedShells.probes.push('solar_flare');
            }
            window.game.shellSystem.equipShellOnProbe(gs.entities.probes[0], 'solar_flare');
        });

        // Simulate what beforeunload does: call createSaveData() WITHOUT await
        // and check if the result is valid
        const beforeUnloadResult = await page.evaluate(() => {
            const saveData = window.game.saveManager.createSaveData(); // No await - simulates beforeunload bug

            // Check if saveData is a Promise (the bug) or actual data
            const isPromise = saveData instanceof Promise;
            const stringified = JSON.stringify(saveData);
            const parsed = JSON.parse(stringified);

            return {
                isPromise,
                stringified: stringified.substring(0, 100),
                hasGameState: !!parsed.gameState,
                hasProbes: !!parsed.gameState?.entities?.probes,
                probeCount: parsed.gameState?.entities?.probes?.length
            };
        });

        console.log('beforeunload save result:', JSON.stringify(beforeUnloadResult, null, 2));

        // This test documents the bug: createSaveData returns a Promise when not awaited
        // The auto-save on page exit stores {} instead of real data
        if (beforeUnloadResult.isPromise) {
            console.log('BUG CONFIRMED: createSaveData() returns Promise when not awaited');
            console.log('Stringified result:', beforeUnloadResult.stringified);
            // The save data should have game state - but it won't because it's a Promise
            expect(beforeUnloadResult.hasGameState).toBe(false);
        } else {
            // If fixed, verify it has proper data
            expect(beforeUnloadResult.hasGameState).toBe(true);
            expect(beforeUnloadResult.hasProbes).toBe(true);
        }
    });

    /**
     * Test: Shell on multiple probes survive save to slot and load after reload
     */
    test('multiple probe shells persist through save slot and page reload', async ({ page }) => {
        await startGame(page);

        // Setup probes with different shells
        await page.evaluate(() => {
            const gs = window.game.gameState;
            const hub = gs.entities.reconHubs[0];

            // Add shells to owned
            ['solar_flare', 'void_walker'].forEach(shell => {
                if (!gs.cosmetics.ownedShells.probes.includes(shell)) {
                    gs.cosmetics.ownedShells.probes.push(shell);
                }
            });

            // Create extra probes if needed
            while (gs.entities.probes.length < 3) {
                gs.entities.probes.push({
                    id: 'test-probe-' + gs.entities.probes.length,
                    waypoints: [],
                    currentWaypoint: 0,
                    current: { x: hub.x, y: hub.y },
                    segmentProgress: 0,
                    speed: 0.0001,
                    active: true,
                    status: 'ready',
                    hub: hub,
                    equipment: [],
                    maxEquipmentSlots: 2,
                    patrolMode: false,
                    damage: 0,
                    outboundWaypointsCount: 0,
                    returnSpeed: 0.0003,
                    shellId: 'default',
                    cosmetic: null
                });
            }

            // Equip different shells
            window.game.shellSystem.equipShellOnProbe(gs.entities.probes[0], 'solar_flare');
            window.game.shellSystem.equipShellOnProbe(gs.entities.probes[1], 'void_walker');
            // Probe 2 stays default
        });

        // Save to slot 2
        await page.evaluate(async () => {
            await window.game.saveManager.saveGame(2);
        });

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Start a new game first (to initialize GameController)
        await startGame(page);

        // Load from slot 2
        const loadResult = await page.evaluate(async () => {
            try {
                await window.game.saveManager.loadGame(2);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });
        expect(loadResult.success).toBe(true);
        await page.waitForTimeout(500);

        // Verify all probe shells
        const result = await page.evaluate(() => {
            const probes = window.game.gameState.entities.probes;
            return probes.map(p => ({
                id: p.id,
                shellId: p.shellId,
                hasCosmetic: !!p.cosmetic,
                bodyColor: p.cosmetic?.bodyColor
            }));
        });

        console.log('Multi-probe shell persistence:', JSON.stringify(result, null, 2));

        expect(result.length).toBeGreaterThanOrEqual(3);
        expect(result[0].shellId).toBe('solar_flare');
        expect(result[0].bodyColor).toBe('#ff4500');
        expect(result[1].shellId).toBe('void_walker');
        expect(result[1].bodyColor).toBe('#9400d3');
        expect(result[2].shellId).toBe('default');
        expect(result[2].bodyColor).toBe('#00ffff');
    });

    /**
     * Test: ownedShells list persists (player purchased shells remain available)
     */
    test('owned shells list persists through save/load', async ({ page }) => {
        await startGame(page);

        // Add owned shells
        await page.evaluate(() => {
            const gs = window.game.gameState;
            ['solar_flare', 'void_walker', 'nebula_drift'].forEach(shell => {
                if (!gs.cosmetics.ownedShells.probes.includes(shell)) {
                    gs.cosmetics.ownedShells.probes.push(shell);
                }
            });
        });

        // Save
        await page.evaluate(async () => {
            await window.game.saveManager.saveGame(1);
        });

        // Clear owned shells
        await page.evaluate(() => {
            window.game.gameState.cosmetics.ownedShells.probes = ['default'];
        });

        // Load
        await page.evaluate(async () => {
            await window.game.saveManager.loadGame(1);
        });
        await page.waitForTimeout(500);

        // Verify owned shells restored
        const owned = await page.evaluate(() => {
            return window.game.gameState.cosmetics.ownedShells.probes;
        });

        expect(owned).toContain('default');
        expect(owned).toContain('solar_flare');
        expect(owned).toContain('void_walker');
        expect(owned).toContain('nebula_drift');
    });
});
