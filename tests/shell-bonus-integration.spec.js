/**
 * Shell Bonus Integration Tests
 * Tests equip/swap shell effects and save/load persistence
 * Covers TEST-07, TEST-08 requirements
 */

const { test, expect } = require('@playwright/test');

test.describe('Shell Bonus Integration', () => {
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
    }

    // =========================================================
    // TEST-07: Equip Shell → Verify Effect → Swap → Verify Change
    // =========================================================

    test('TEST-07: equip shell with bonus, verify effect, swap shell, verify change', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            const ss = window.game.shellSystem;
            const gs = window.game.gameState;

            // Find two shells with different signalRange bonus values
            const catalog = window.SHELL_CATALOG.probes;
            const shellsWithSignalRange = Object.values(catalog).filter(s =>
                s.bonuses && s.bonuses.signalRange > 0
            );

            if (shellsWithSignalRange.length < 2) {
                // Fallback: use one with bonus and default (no bonus)
                const shellWithBonus = shellsWithSignalRange[0];
                if (!shellWithBonus) return { error: 'no shells with signalRange bonus' };

                // Own and equip first shell
                if (!gs.cosmetics.ownedShells.probes.includes(shellWithBonus.id)) {
                    gs.cosmetics.ownedShells.probes.push(shellWithBonus.id);
                }
                ss.equipShellOnProbe(probe, shellWithBonus.id);
                const bonus1 = ss.getEntityBonus('probes', probe, 'signalRange');

                // Swap to default
                ss.equipShellOnProbe(probe, 'default');
                const bonus2 = ss.getEntityBonus('probes', probe, 'signalRange');

                return {
                    shell1: shellWithBonus.id,
                    bonus1,
                    shell2: 'default',
                    bonus2,
                    different: bonus1 !== bonus2
                };
            }

            // Use two different shells
            const shell1 = shellsWithSignalRange[0];
            const shell2 = shellsWithSignalRange[1];

            // Own both shells
            if (!gs.cosmetics.ownedShells.probes.includes(shell1.id)) {
                gs.cosmetics.ownedShells.probes.push(shell1.id);
            }
            if (!gs.cosmetics.ownedShells.probes.includes(shell2.id)) {
                gs.cosmetics.ownedShells.probes.push(shell2.id);
            }

            // Equip first shell
            ss.equipShellOnProbe(probe, shell1.id);
            const bonus1 = ss.getEntityBonus('probes', probe, 'signalRange');

            // Swap to second shell
            ss.equipShellOnProbe(probe, shell2.id);
            const bonus2 = ss.getEntityBonus('probes', probe, 'signalRange');

            return {
                shell1: shell1.id,
                bonus1,
                shell2: shell2.id,
                bonus2,
                different: bonus1 !== bonus2
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.bonus1).toBeGreaterThan(0);
        expect(result.different).toBe(true);
    });

    test('TEST-07 variant: swap to default removes bonus', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            const ss = window.game.shellSystem;
            const gs = window.game.gameState;

            // Find a shell with bonuses
            const catalog = window.SHELL_CATALOG.probes;
            const shell = Object.values(catalog).find(s => s.bonuses && Object.keys(s.bonuses).length > 0);
            if (!shell) return { error: 'no shell with bonuses' };

            // Get the first bonus type from the shell
            const bonusType = Object.keys(shell.bonuses)[0];

            // Own and equip shell
            if (!gs.cosmetics.ownedShells.probes.includes(shell.id)) {
                gs.cosmetics.ownedShells.probes.push(shell.id);
            }
            ss.equipShellOnProbe(probe, shell.id);
            const bonusWithShell = ss.getEntityBonus('probes', probe, bonusType);

            // Equip default shell
            ss.equipShellOnProbe(probe, 'default');
            const bonusWithDefault = ss.getEntityBonus('probes', probe, bonusType);

            return {
                shellId: shell.id,
                bonusType,
                bonusWithShell,
                bonusWithDefault
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.bonusWithShell).toBeGreaterThan(0);
        expect(result.bonusWithDefault).toBe(0);
    });

    // =========================================================
    // TEST-08: Save/Load Preserves Shell Bonuses
    // =========================================================

    test('TEST-08: save/load preserves shell bonuses and they remain functional', async ({ page }) => {
        await startGame(page);

        // Wait for game to be fully initialized
        await page.waitForFunction(() => {
            return window.game && window.game.gameState && window.game.gameState.entities && window.game.gameState.entities.probes;
        }, { timeout: 10000 });

        // First, set up game state with equipped shell and save
        const beforeSave = await page.evaluate(async () => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            const ss = window.game.shellSystem;
            const gs = window.game.gameState;

            // Use echo_receiver shell (signalRange: 10)
            const shellId = 'echo_receiver';
            if (!gs.cosmetics.ownedShells.probes.includes(shellId)) {
                gs.cosmetics.ownedShells.probes.push(shellId);
            }
            ss.equipShellOnProbe(probe, shellId);

            const bonusValue = ss.getEntityBonus('probes', probe, 'signalRange');

            // Verify shellId was set before saving
            if (probe.shellId !== shellId) {
                return { error: `equipShellOnProbe failed: shellId is ${probe.shellId}, expected ${shellId}` };
            }

            // Save game to slot 1
            await window.game.saveManager.saveGame(1);

            return {
                probeId: probe.id,
                shellId: probe.shellId,
                bonusValue
            };
        });

        expect(beforeSave.error).toBeUndefined();
        expect(beforeSave.shellId).toBe('echo_receiver');
        expect(beforeSave.bonusValue).toBe(10);

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Start new game, then load saved game
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(2000);

        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Wait for game object to be available after reload
        await page.waitForFunction(() => window.game && window.game.saveManager, { timeout: 10000 });

        // Load saved game from slot 1
        const afterLoad = await page.evaluate(async () => {
            await window.game.saveManager.loadGame(1);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const gs = window.game.gameState;
            const ss = window.game.shellSystem;

            if (!gs || !gs.entities || !gs.entities.probes) {
                return {
                    error: 'gameState or entities not loaded',
                    hasGameState: !!gs,
                    hasEntities: !!gs?.entities,
                    hasProbes: !!gs?.entities?.probes
                };
            }

            // Find the probe that had the shell equipped
            const probe = gs.entities.probes.find(p => p.shellId === 'echo_receiver');
            if (!probe) {
                const firstProbe = gs.entities.probes[0];
                return {
                    error: 'probe with echo_receiver not found',
                    totalProbes: gs.entities.probes.length,
                    probesShells: gs.entities.probes.map(p => ({ id: p.id, shellId: p.shellId })),
                    probeId: firstProbe?.id,
                    shellId: firstProbe?.shellId,
                    bonusValue: 0
                };
            }

            const bonusValue = ss.getEntityBonus('probes', probe, 'signalRange');

            return {
                probeId: probe.id,
                shellId: probe.shellId,
                bonusValue
            };
        });

        expect(afterLoad.error).toBeUndefined();
        expect(afterLoad.shellId).toBe(beforeSave.shellId);
        expect(afterLoad.bonusValue).toBe(beforeSave.bonusValue);
    });

    test('TEST-08 variant: hub and station shell bonuses survive save/load', async ({ page }) => {
        await startGame(page);

        // Set up hub and station shells with bonuses
        const beforeSave = await page.evaluate(async () => {
            const gs = window.game.gameState;
            const ss = window.game.shellSystem;

            // Find hub shell with researchSpeed
            const hubCatalog = window.SHELL_CATALOG.hubs;
            const hubShell = Object.values(hubCatalog).find(s => s.bonuses && s.bonuses.researchSpeed > 0);
            if (!hubShell) return { error: 'no hub shell with researchSpeed' };

            // Find station shell with bonuses
            const stationCatalog = window.SHELL_CATALOG.miningStations;
            const stationShell = Object.values(stationCatalog).find(s => s.bonuses && Object.keys(s.bonuses).length > 0);
            if (!stationShell) return { error: 'no station shell with bonuses' };

            // Get station's first bonus type
            const stationBonusType = Object.keys(stationShell.bonuses)[0];

            // Ensure cosmetics structure exists
            if (!gs.cosmetics) {
                gs.cosmetics = {
                    ownedShells: { probes: ['default'], hubs: ['default'], miningStations: ['default'] },
                    equippedShells: { probes: 'default', hubs: 'default', miningStations: 'default' }
                };
            }
            if (!gs.cosmetics.ownedShells) {
                gs.cosmetics.ownedShells = { probes: ['default'], hubs: ['default'], miningStations: ['default'] };
            }
            if (!gs.cosmetics.equippedShells) {
                gs.cosmetics.equippedShells = { probes: 'default', hubs: 'default', miningStations: 'default' };
            }

            // Equip shells
            if (!gs.cosmetics.ownedShells.hubs.includes(hubShell.id)) {
                gs.cosmetics.ownedShells.hubs.push(hubShell.id);
            }
            gs.cosmetics.equippedShells.hubs = hubShell.id;

            if (!gs.cosmetics.ownedShells.miningStations.includes(stationShell.id)) {
                gs.cosmetics.ownedShells.miningStations.push(stationShell.id);
            }
            gs.cosmetics.equippedShells.miningStations = stationShell.id;

            // Get bonus values
            const hubBonus = ss.getEntityBonus('hubs', null, 'researchSpeed');
            const stationBonus = ss.getEntityBonus('miningStations', null, stationBonusType);

            // Save game to slot 1
            await window.game.saveManager.saveGame(1);

            return {
                hubShellId: hubShell.id,
                hubBonus,
                stationShellId: stationShell.id,
                stationBonusType,
                stationBonus
            };
        });

        expect(beforeSave.error).toBeUndefined();
        expect(beforeSave.hubBonus).toBeGreaterThan(0);
        expect(beforeSave.stationBonus).toBeGreaterThan(0);

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Start new game, then load
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(2000);

        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Load saved game from slot 1
        const afterLoad = await page.evaluate(async () => {
            await window.game.saveManager.loadGame(1);
            await new Promise(resolve => setTimeout(resolve, 1000));

            const gs = window.game.gameState;
            const ss = window.game.shellSystem;

            // Get loaded shell IDs
            const hubShellId = gs.cosmetics.equippedShells.hubs;
            const stationShellId = gs.cosmetics.equippedShells.miningStations;

            // Get bonus values
            const hubBonus = ss.getEntityBonus('hubs', null, 'researchSpeed');

            // Need to get the station bonus type from the loaded shell
            const stationShell = window.SHELL_CATALOG.miningStations[stationShellId];
            const stationBonusType = stationShell && stationShell.bonuses ? Object.keys(stationShell.bonuses)[0] : null;
            const stationBonus = stationBonusType ? ss.getEntityBonus('miningStations', null, stationBonusType) : 0;

            return {
                hubShellId,
                hubBonus,
                stationShellId,
                stationBonus
            };
        });

        expect(afterLoad.hubShellId).toBe(beforeSave.hubShellId);
        expect(afterLoad.hubBonus).toBe(beforeSave.hubBonus);
        expect(afterLoad.stationShellId).toBe(beforeSave.stationShellId);
        expect(afterLoad.stationBonus).toBe(beforeSave.stationBonus);
    });
});
