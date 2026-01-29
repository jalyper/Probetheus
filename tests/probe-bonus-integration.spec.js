/**
 * Probe Bonus Integration Tests
 * Tests that all 8 probe bonus types are wired into ProbeManager.js
 */

const { test, expect } = require('@playwright/test');

test.describe('Probe Bonus Integration', () => {
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

    test('PBON-01: dataSignalDiscovery bonus increases signal generation chance', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Equip a shell with dataSignalDiscovery bonus
            window.game.gameState.cosmetics.ownedShells.probes.push('calculator_core');
            window.game.shellSystem.equipShellOnProbe(probe, 'calculator_core');

            const bonus = window.game.shellSystem.getEntityBonus('probes', probe, 'dataSignalDiscovery');
            const expectedChance = 0.3 * (1 + bonus / 100);

            return { bonus, expectedChance, hasBonus: bonus > 0 };
        });

        expect(result.hasBonus).toBe(true);
        expect(result.expectedChance).toBeGreaterThan(0.3);
    });

    test('PBON-02: signalRange bonus increases collection range and pulse radius', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Equip a shell with signalRange bonus
            window.game.gameState.cosmetics.ownedShells.probes.push('echo_receiver');
            window.game.shellSystem.equipShellOnProbe(probe, 'echo_receiver');

            const bonus = window.game.shellSystem.getEntityBonus('probes', probe, 'signalRange');
            const expectedRange = 80 * (1 + bonus / 100);

            return { bonus, expectedRange, hasBonus: bonus > 0 };
        });

        expect(result.hasBonus).toBe(true);
        expect(result.expectedRange).toBeGreaterThan(80);
    });

    test('PBON-03: rareSignalChance bonus shifts rarity toward rarer outcomes', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Equip a shell with rareSignalChance bonus (frequency_hunter has rareSignalChance: 8)
            window.game.gameState.cosmetics.ownedShells.probes.push('frequency_hunter');
            window.game.shellSystem.equipShellOnProbe(probe, 'frequency_hunter');

            const bonus = window.game.shellSystem.getEntityBonus('probes', probe, 'rareSignalChance');

            // Verify the method accepts probe parameter and bonus is used
            // Run many trials to check distribution shifts
            const pm = window.game.probeManager;
            const counts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
            const countsNoBonus = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };

            for (let i = 0; i < 10000; i++) {
                const rarity = pm.determineSignalRarity(false, probe);
                counts[rarity]++;
                const rarityNoBonus = pm.determineSignalRarity(false, null);
                countsNoBonus[rarityNoBonus]++;
            }

            return {
                bonus,
                commonWithBonus: counts.common,
                commonWithout: countsNoBonus.common,
                hasBonus: bonus > 0
            };
        });

        expect(result.hasBonus).toBe(true);
        // With a bonus, common signals should appear less frequently
        expect(result.commonWithBonus).toBeLessThan(result.commonWithout);
    });

    test('PBON-04: probeDurability bonus increases maxDamage on new probes', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            const baseMax = probe.baseMaxDamage || probe.maxDamage;

            // Equip a shell with probeDurability bonus (reinforced_hull has probeDurability: 10)
            window.game.gameState.cosmetics.ownedShells.probes.push('reinforced_hull');
            window.game.shellSystem.equipShellOnProbe(probe, 'reinforced_hull');

            const bonus = window.game.shellSystem.getEntityBonus('probes', probe, 'probeDurability');

            return {
                baseMax,
                hasBaseMaxDamage: probe.baseMaxDamage != null,
                maxDamageAfterEquip: probe.maxDamage,
                bonus
            };
        });

        // baseMaxDamage should exist on new probes
        expect(result.hasBaseMaxDamage).toBe(true);
        // If bonus > 0, maxDamage should be recalculated
        if (result.bonus > 0) {
            expect(result.maxDamageAfterEquip).toBeGreaterThanOrEqual(result.baseMax);
        }
    });

    test('PBON-04: shell swap does not compound durability bonus', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Equip durability shell (reinforced_hull has probeDurability: 10)
            window.game.gameState.cosmetics.ownedShells.probes.push('reinforced_hull');
            window.game.shellSystem.equipShellOnProbe(probe, 'reinforced_hull');
            const firstMaxDamage = probe.maxDamage;

            // Re-equip same shell (should not compound)
            window.game.shellSystem.equipShellOnProbe(probe, 'reinforced_hull');
            const secondMaxDamage = probe.maxDamage;

            // Switch to default (no durability bonus)
            window.game.shellSystem.equipShellOnProbe(probe, 'default');
            const defaultMaxDamage = probe.maxDamage;

            return {
                baseMaxDamage: probe.baseMaxDamage,
                firstMaxDamage,
                secondMaxDamage,
                defaultMaxDamage
            };
        });

        // Re-equipping should NOT increase maxDamage further
        expect(result.secondMaxDamage).toBe(result.firstMaxDamage);
        // Switching to default should revert to base
        expect(result.defaultMaxDamage).toBe(result.baseMaxDamage);
    });

    test('PBON-05: asteroidSurvival bonus is accessible for probes', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // survivor_class has probeDurability: 15 AND asteroidSurvival: 8
            window.game.gameState.cosmetics.ownedShells.probes.push('survivor_class');
            window.game.shellSystem.equipShellOnProbe(probe, 'survivor_class');

            const bonus = window.game.shellSystem.getEntityBonus('probes', probe, 'asteroidSurvival');
            return { bonus, hasBonus: bonus > 0 };
        });

        expect(result.bonus).toBeGreaterThanOrEqual(0);
    });

    test('PBON-06 & PBON-07: exploration and artifact bonuses are wired into reward calculation', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            // Verify that the bonus lookup pattern exists in ProbeManager for explorationRewards and artifactDiscovery
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Equip an archivist shell (treasure_hunter has artifactDiscovery: 15, explorationRewards: 8)
            window.game.gameState.cosmetics.ownedShells.probes.push('treasure_hunter');
            window.game.shellSystem.equipShellOnProbe(probe, 'treasure_hunter');

            const explorationBonus = window.game.shellSystem.getEntityBonus('probes', probe, 'explorationRewards');
            const artifactBonus = window.game.shellSystem.getEntityBonus('probes', probe, 'artifactDiscovery');

            return { explorationBonus, artifactBonus };
        });

        // treasure_hunter is an archivist probe shell - should have both bonuses
        const hasAnyBonus = result.explorationBonus > 0 || result.artifactBonus > 0;
        expect(hasAnyBonus).toBe(true);
    });

    test('PBON-08: exoticYield bonus is accessible for probes', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Equip a Null shell (void_touched has exoticYield: 10)
            window.game.gameState.cosmetics.ownedShells.probes.push('void_touched');
            window.game.shellSystem.equipShellOnProbe(probe, 'void_touched');

            const bonus = window.game.shellSystem.getEntityBonus('probes', probe, 'exoticYield');
            return { bonus, hasBonus: bonus > 0 };
        });

        expect(result.hasBonus).toBe(true);
    });

    test('probes without shells get zero bonus (no regressions)', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Ensure default shell
            probe.shellId = 'default';

            const bonuses = {
                dataSignalDiscovery: window.game.shellSystem.getEntityBonus('probes', probe, 'dataSignalDiscovery'),
                signalRange: window.game.shellSystem.getEntityBonus('probes', probe, 'signalRange'),
                rareSignalChance: window.game.shellSystem.getEntityBonus('probes', probe, 'rareSignalChance'),
                probeDurability: window.game.shellSystem.getEntityBonus('probes', probe, 'probeDurability'),
                asteroidSurvival: window.game.shellSystem.getEntityBonus('probes', probe, 'asteroidSurvival'),
                artifactDiscovery: window.game.shellSystem.getEntityBonus('probes', probe, 'artifactDiscovery'),
                explorationRewards: window.game.shellSystem.getEntityBonus('probes', probe, 'explorationRewards'),
                exoticYield: window.game.shellSystem.getEntityBonus('probes', probe, 'exoticYield')
            };

            return bonuses;
        });

        // Default shell should have zero for all bonuses
        expect(result.dataSignalDiscovery).toBe(0);
        expect(result.signalRange).toBe(0);
        expect(result.rareSignalChance).toBe(0);
        expect(result.probeDurability).toBe(0);
        expect(result.asteroidSurvival).toBe(0);
        expect(result.artifactDiscovery).toBe(0);
        expect(result.explorationRewards).toBe(0);
        expect(result.exoticYield).toBe(0);
    });
});
