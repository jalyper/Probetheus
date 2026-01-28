/**
 * Shell Visuals Tests
 * Tests for shell visual application on probes (body color, trail color, glow effect)
 */

const { test, expect } = require('@playwright/test');

test.describe('Shell Visuals', () => {
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
    }

    test('ShellSystem should have buildCosmeticFromShell method', async ({ page }) => {
        await startGame(page);

        const hasMethod = await page.evaluate(() => {
            return typeof window.game.shellSystem.buildCosmeticFromShell === 'function';
        });

        expect(hasMethod).toBe(true);
    });

    test('buildCosmeticFromShell should return valid cosmetic object', async ({ page }) => {
        await startGame(page);

        const cosmetic = await page.evaluate(() => {
            const shell = window.SHELL_CATALOG.probes.solar_flare;
            return window.game.shellSystem.buildCosmeticFromShell(shell);
        });

        expect(cosmetic.trailEnabled).toBe(true);
        expect(cosmetic.trail).toBeDefined();
        expect(cosmetic.bodyColor).toBe('#ff4500');
        expect(cosmetic.wingColor).toBe('#ff4500');
        expect(cosmetic.frontColor).toBe('#ff4500');
        expect(cosmetic.antennaColor).toBe('#ff4500');
        expect(cosmetic.glow).toBe(true);
        expect(cosmetic.blinkSpeed).toBe(1500);
    });

    test('equipping shell should update probe.cosmetic.bodyColor', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // Add solar_flare to owned shells
            window.game.gameState.cosmetics.ownedShells.probes.push('solar_flare');

            // Equip the shell
            window.game.shellSystem.equipShellOnProbe(probe, 'solar_flare');

            return {
                bodyColor: probe.cosmetic?.bodyColor,
                shellId: probe.shellId
            };
        });

        expect(result.shellId).toBe('solar_flare');
        expect(result.bodyColor).toBe('#ff4500');
    });

    test('equipping shell should update probe.cosmetic.trail.color', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // Add void_walker to owned shells
            window.game.gameState.cosmetics.ownedShells.probes.push('void_walker');

            // Equip the shell
            window.game.shellSystem.equipShellOnProbe(probe, 'void_walker');

            return {
                trailColor: probe.cosmetic?.trail?.color,
                shellId: probe.shellId
            };
        });

        expect(result.shellId).toBe('void_walker');
        expect(result.trailColor).toBe('#9400d3');
    });

    test('shell with glow:true should set probe.cosmetic.glow to true', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // Add solar_flare (has glow:true) to owned shells
            window.game.gameState.cosmetics.ownedShells.probes.push('solar_flare');

            // Equip the shell
            window.game.shellSystem.equipShellOnProbe(probe, 'solar_flare');

            return probe.cosmetic?.glow;
        });

        expect(result).toBe(true);
    });

    test('default shell should set probe.cosmetic.glow to false', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // First equip a shell with glow
            window.game.gameState.cosmetics.ownedShells.probes.push('solar_flare');
            window.game.shellSystem.equipShellOnProbe(probe, 'solar_flare');

            // Now switch back to default
            window.game.shellSystem.equipShellOnProbe(probe, 'default');

            return {
                glow: probe.cosmetic?.glow,
                shellId: probe.shellId
            };
        });

        expect(result.shellId).toBe('default');
        expect(result.glow).toBe(false);
    });

    test('refreshProbeCosmetic should re-apply cosmetic from shellId', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // Add quantum_phase to owned shells
            window.game.gameState.cosmetics.ownedShells.probes.push('quantum_phase');

            // Set shellId directly (simulating a save/load scenario)
            probe.shellId = 'quantum_phase';

            // Clear cosmetic
            probe.cosmetic = null;

            // Refresh cosmetic
            window.game.shellSystem.refreshProbeCosmetic(probe);

            return {
                bodyColor: probe.cosmetic?.bodyColor,
                glow: probe.cosmetic?.glow
            };
        });

        // quantum_phase has color: '#00ffaa' and glow: true
        expect(result.bodyColor).toBe('#00ffaa');
        expect(result.glow).toBe(true);
    });

    test('trail width should be 4 for glow shells and 3 for non-glow shells', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // Add both shells to owned
            window.game.gameState.cosmetics.ownedShells.probes.push('solar_flare'); // glow:true
            window.game.gameState.cosmetics.ownedShells.probes.push('reinforced_hull'); // glow:false

            // Test glow shell (solar_flare)
            window.game.shellSystem.equipShellOnProbe(probe, 'solar_flare');
            const glowWidth = probe.cosmetic?.trail?.width;

            // Test non-glow shell (reinforced_hull)
            window.game.shellSystem.equipShellOnProbe(probe, 'reinforced_hull');
            const nonGlowWidth = probe.cosmetic?.trail?.width;

            // Test default shell (glow:false)
            window.game.shellSystem.equipShellOnProbe(probe, 'default');
            const defaultWidth = probe.cosmetic?.trail?.width;

            return { glowWidth, nonGlowWidth, defaultWidth };
        });

        expect(result.glowWidth).toBe(4);
        expect(result.nonGlowWidth).toBe(3);
        expect(result.defaultWidth).toBe(3);
    });

    test('trail opacity should be 0.95 for glow shells and 0.9 for non-glow shells', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // Add shells to owned
            window.game.gameState.cosmetics.ownedShells.probes.push('void_walker'); // glow:true

            // Test glow shell
            window.game.shellSystem.equipShellOnProbe(probe, 'void_walker');
            const glowOpacity = probe.cosmetic?.trail?.opacity;

            // Test default shell (glow:false)
            window.game.shellSystem.equipShellOnProbe(probe, 'default');
            const defaultOpacity = probe.cosmetic?.trail?.opacity;

            return { glowOpacity, defaultOpacity };
        });

        expect(result.glowOpacity).toBe(0.95);
        expect(result.defaultOpacity).toBe(0.9);
    });

    test('shell with separate trail color should use trail color', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // Add solar_flare which has different color and trail values
            window.game.gameState.cosmetics.ownedShells.probes.push('solar_flare');

            // Equip the shell
            window.game.shellSystem.equipShellOnProbe(probe, 'solar_flare');

            return {
                bodyColor: probe.cosmetic?.bodyColor,
                trailColor: probe.cosmetic?.trail?.color
            };
        });

        // solar_flare has color: '#ff4500', trail: '#ff8800'
        expect(result.bodyColor).toBe('#ff4500');
        expect(result.trailColor).toBe('#ff8800');
    });

    test('buildCosmeticFromShell should handle null/undefined shell', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const cosmetic = window.game.shellSystem.buildCosmeticFromShell(null);
            return {
                hasCosmetic: !!cosmetic,
                bodyColor: cosmetic?.bodyColor,
                glow: cosmetic?.glow
            };
        });

        // Should return default cyan values
        expect(result.hasCosmetic).toBe(true);
        expect(result.bodyColor).toBe('#00ffff');
        expect(result.glow).toBe(false);
    });
});
