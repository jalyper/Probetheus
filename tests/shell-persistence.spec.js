/**
 * Shell Persistence Tests
 * Tests for shell visual persistence through save/load cycles
 */

const { test, expect } = require('@playwright/test');

test.describe('Shell Persistence', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    async function startGame(page) {
        // Start new game and skip cutscene
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(3000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Wait for game systems to be ready
        await page.waitForFunction(() => {
            return typeof window.game !== 'undefined' &&
                   window.game.gameState &&
                   window.game.saveManager &&
                   window.game.shellSystem;
        }, { timeout: 10000 });
    }

    test('single probe shell persists through save/load', async ({ page }) => {
        await startGame(page);

        // Equip solar_flare shell on first probe
        const setupResult = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // Add solar_flare to owned shells
            if (!window.game.gameState.cosmetics.ownedShells.probes.includes('solar_flare')) {
                window.game.gameState.cosmetics.ownedShells.probes.push('solar_flare');
            }

            // Equip the shell
            window.game.shellSystem.equipShellOnProbe(probe, 'solar_flare');

            return {
                shellId: probe.shellId,
                bodyColor: probe.cosmetic?.bodyColor,
                glow: probe.cosmetic?.glow
            };
        });

        // Verify shell was equipped
        expect(setupResult.shellId).toBe('solar_flare');
        expect(setupResult.bodyColor).toBe('#ff4500');
        expect(setupResult.glow).toBe(true);

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

        // Clear probe cosmetics to simulate fresh state
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            probe.shellId = 'default';
            probe.cosmetic = null;
        });

        // Verify cosmetic was cleared
        const clearedResult = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            return {
                shellId: probe.shellId,
                cosmetic: probe.cosmetic
            };
        });
        expect(clearedResult.shellId).toBe('default');
        expect(clearedResult.cosmetic).toBe(null);

        // Load save
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
        const restoredResult = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            return {
                shellId: probe.shellId,
                bodyColor: probe.cosmetic?.bodyColor,
                glow: probe.cosmetic?.glow
            };
        });

        expect(restoredResult.shellId).toBe('solar_flare');
        expect(restoredResult.bodyColor).toBe('#ff4500');
        expect(restoredResult.glow).toBe(true);
    });

    test('multiple probes with different shells persist', async ({ page }) => {
        await startGame(page);

        // Deploy 2 more probes and equip different shells
        const setupResult = await page.evaluate(() => {
            const gameState = window.game.gameState;
            const hub = gameState.entities.reconHubs[0];

            // Add owned shells
            if (!gameState.cosmetics.ownedShells.probes.includes('void_walker')) {
                gameState.cosmetics.ownedShells.probes.push('void_walker');
            }
            if (!gameState.cosmetics.ownedShells.probes.includes('solar_flare')) {
                gameState.cosmetics.ownedShells.probes.push('solar_flare');
            }

            // Create additional test probes if needed
            while (gameState.entities.probes.length < 3) {
                const probe = {
                    id: 'test-probe-' + gameState.entities.probes.length,
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
                };
                gameState.entities.probes.push(probe);
            }

            // Equip different shells on each probe
            const probes = gameState.entities.probes;

            // Probe 0: default (no change)
            window.game.shellSystem.equipShellOnProbe(probes[0], 'default');

            // Probe 1: void_walker
            window.game.shellSystem.equipShellOnProbe(probes[1], 'void_walker');

            // Probe 2: solar_flare
            window.game.shellSystem.equipShellOnProbe(probes[2], 'solar_flare');

            return {
                probeCount: probes.length,
                shells: [probes[0].shellId, probes[1].shellId, probes[2].shellId],
                colors: [
                    probes[0].cosmetic?.bodyColor,
                    probes[1].cosmetic?.bodyColor,
                    probes[2].cosmetic?.bodyColor
                ]
            };
        });

        // Verify shells were equipped
        expect(setupResult.probeCount).toBe(3);
        expect(setupResult.shells[0]).toBe('default');
        expect(setupResult.shells[1]).toBe('void_walker');
        expect(setupResult.shells[2]).toBe('solar_flare');
        expect(setupResult.colors[0]).toBe('#00ffff'); // default cyan
        expect(setupResult.colors[1]).toBe('#9400d3'); // void_walker
        expect(setupResult.colors[2]).toBe('#ff4500'); // solar_flare

        // Save game
        const saveResult = await page.evaluate(async () => {
            try {
                await window.game.saveManager.saveGame(1);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });
        expect(saveResult.success).toBe(true);

        // Clear all probe cosmetics
        await page.evaluate(() => {
            window.game.gameState.entities.probes.forEach(probe => {
                probe.shellId = 'default';
                probe.cosmetic = null;
            });
        });

        // Load save
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

        // Verify all shells were restored
        const restoredResult = await page.evaluate(() => {
            const probes = window.game.gameState.entities.probes;
            return {
                probeCount: probes.length,
                shells: [probes[0].shellId, probes[1].shellId, probes[2].shellId],
                colors: [
                    probes[0].cosmetic?.bodyColor,
                    probes[1].cosmetic?.bodyColor,
                    probes[2].cosmetic?.bodyColor
                ],
                glows: [
                    probes[0].cosmetic?.glow,
                    probes[1].cosmetic?.glow,
                    probes[2].cosmetic?.glow
                ]
            };
        });

        expect(restoredResult.probeCount).toBe(3);
        expect(restoredResult.shells[0]).toBe('default');
        expect(restoredResult.shells[1]).toBe('void_walker');
        expect(restoredResult.shells[2]).toBe('solar_flare');
        expect(restoredResult.colors[0]).toBe('#00ffff');
        expect(restoredResult.colors[1]).toBe('#9400d3');
        expect(restoredResult.colors[2]).toBe('#ff4500');
        expect(restoredResult.glows[0]).toBe(false);  // default has no glow
        expect(restoredResult.glows[1]).toBe(true);   // void_walker has glow
        expect(restoredResult.glows[2]).toBe(true);   // solar_flare has glow
    });

    test('probe without shellId gets default cosmetic after load', async ({ page }) => {
        await startGame(page);

        // Verify probes exist and have default setup
        const setupResult = await page.evaluate(() => {
            const probes = window.game.gameState.entities.probes;
            // Clear shellId and cosmetic to simulate old save format
            probes.forEach(probe => {
                delete probe.shellId;
                probe.cosmetic = null;
            });
            return probes.length;
        });
        expect(setupResult).toBeGreaterThan(0);

        // Save game (will save shellId as 'default' due to || 'default' fallback)
        const saveResult = await page.evaluate(async () => {
            try {
                await window.game.saveManager.saveGame(1);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });
        expect(saveResult.success).toBe(true);

        // Clear cosmetics completely
        await page.evaluate(() => {
            window.game.gameState.entities.probes.forEach(probe => {
                probe.cosmetic = null;
            });
        });

        // Load save
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

        // Verify probes have default cosmetic applied
        const restoredResult = await page.evaluate(() => {
            const probes = window.game.gameState.entities.probes;
            return {
                probeCount: probes.length,
                firstProbe: {
                    shellId: probes[0]?.shellId,
                    bodyColor: probes[0]?.cosmetic?.bodyColor,
                    glow: probes[0]?.cosmetic?.glow
                }
            };
        });

        expect(restoredResult.probeCount).toBeGreaterThan(0);
        expect(restoredResult.firstProbe.shellId).toBe('default');
        expect(restoredResult.firstProbe.bodyColor).toBe('#00ffff'); // default cyan
        expect(restoredResult.firstProbe.glow).toBe(false); // default has no glow
    });

    test('shell trail properties persist through save/load', async ({ page }) => {
        await startGame(page);

        // Equip a shell with specific trail properties
        const setupResult = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // Add solar_flare to owned shells (has trail: '#ff8800')
            if (!window.game.gameState.cosmetics.ownedShells.probes.includes('solar_flare')) {
                window.game.gameState.cosmetics.ownedShells.probes.push('solar_flare');
            }

            window.game.shellSystem.equipShellOnProbe(probe, 'solar_flare');

            return {
                trailColor: probe.cosmetic?.trail?.color,
                trailWidth: probe.cosmetic?.trail?.width,
                trailOpacity: probe.cosmetic?.trail?.opacity,
                trailEnabled: probe.cosmetic?.trailEnabled
            };
        });

        expect(setupResult.trailColor).toBe('#ff8800');
        expect(setupResult.trailWidth).toBe(4); // glow shells have width 4
        expect(setupResult.trailOpacity).toBe(0.95); // glow shells have opacity 0.95
        expect(setupResult.trailEnabled).toBe(true);

        // Save game
        const saveResult = await page.evaluate(async () => {
            try {
                await window.game.saveManager.saveGame(1);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });
        expect(saveResult.success).toBe(true);

        // Clear cosmetic
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            probe.cosmetic = null;
        });

        // Load save
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

        // Verify trail properties were restored
        const restoredResult = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            return {
                trailColor: probe.cosmetic?.trail?.color,
                trailWidth: probe.cosmetic?.trail?.width,
                trailOpacity: probe.cosmetic?.trail?.opacity,
                trailEnabled: probe.cosmetic?.trailEnabled
            };
        });

        expect(restoredResult.trailColor).toBe('#ff8800');
        expect(restoredResult.trailWidth).toBe(4);
        expect(restoredResult.trailOpacity).toBe(0.95);
        expect(restoredResult.trailEnabled).toBe(true);
    });
});
