/**
 * Shell Bonus Foundation Tests
 * Tests for normalized bonus values and getEntityBonus() resolver
 */

const { test, expect } = require('@playwright/test');

test.describe('Shell Bonus Foundation', () => {
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

    // === Bonus Value Normalization Tests ===

    test('probe shells should follow rarity bonus scale', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const catalog = window.SHELL_CATALOG.probes;
            // Check Keth-Varn probe shells (dataSignalDiscovery only, no researchSpeed)
            return {
                calculator_core: catalog.calculator_core.bonuses,
                probability_engine: catalog.probability_engine.bonuses,
                quantum_processor: catalog.quantum_processor.bonuses,
                infinity_calculator: catalog.infinity_calculator.bonuses
            };
        });

        // Uncommon: primary 10, no secondary (researchSpeed removed)
        expect(result.calculator_core).toEqual({ dataSignalDiscovery: 10 });
        // Rare: primary 15, no secondary
        expect(result.probability_engine).toEqual({ dataSignalDiscovery: 15 });
        // Epic: primary 20, no secondary
        expect(result.quantum_processor).toEqual({ dataSignalDiscovery: 20 });
        // Legendary: primary 25, no secondary
        expect(result.infinity_calculator).toEqual({ dataSignalDiscovery: 25 });
    });

    test('probe shells should not have researchSpeed or probethiumRate', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeShells = window.SHELL_CATALOG.probes;
            const violations = [];
            for (const [id, shell] of Object.entries(probeShells)) {
                if (shell.bonuses?.researchSpeed) {
                    violations.push(`${id} has researchSpeed`);
                }
                if (shell.bonuses?.probethiumRate) {
                    violations.push(`${id} has probethiumRate`);
                }
            }
            return violations;
        });

        expect(result).toEqual([]);
    });

    test('hub shells should only have researchSpeed bonus', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const hubShells = window.SHELL_CATALOG.hubs;
            const violations = [];
            for (const [id, shell] of Object.entries(hubShells)) {
                const bonusKeys = Object.keys(shell.bonuses || {});
                for (const key of bonusKeys) {
                    if (key !== 'researchSpeed') {
                        violations.push(`${id} has non-researchSpeed bonus: ${key}`);
                    }
                }
            }
            return violations;
        });

        expect(result).toEqual([]);
    });

    test('foundry shells (legacy miningStations key) should only have valid bonuses', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            // Foundry era: miningEfficiency ('Forge Rate') and shuttleSpeed
            // ('Freighter Speed') are read live by FoundrySystem;
            // probethiumRate is dormant but stays valid so owned shells work.
            const stationShells = window.SHELL_CATALOG.miningStations;
            const validBonuses = ['miningEfficiency', 'shuttleSpeed', 'probethiumRate'];
            const violations = [];
            for (const [id, shell] of Object.entries(stationShells)) {
                const bonusKeys = Object.keys(shell.bonuses || {});
                for (const key of bonusKeys) {
                    if (!validBonuses.includes(key)) {
                        violations.push(`${id} has invalid bonus: ${key}`);
                    }
                }
            }
            return violations;
        });

        expect(result).toEqual([]);
    });

    test('all bonus values should match rarity scale', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const rarityPrimaryValues = {
                common: 0, uncommon: 10, rare: 15, epic: 20, legendary: 25
            };
            const raritySecondaryValues = {
                common: 0, uncommon: 5, rare: 8, epic: 10, legendary: 12
            };
            const validValues = new Set([0, 5, 8, 10, 12, 15, 20, 25]);
            const violations = [];

            for (const [cat, shells] of Object.entries(window.SHELL_CATALOG)) {
                for (const [id, shell] of Object.entries(shells)) {
                    for (const [bonusType, value] of Object.entries(shell.bonuses || {})) {
                        if (!validValues.has(value)) {
                            violations.push(`${cat}/${id}: ${bonusType}=${value} not in rarity scale`);
                        }
                    }
                }
            }
            return violations;
        });

        expect(result).toEqual([]);
    });

    // === getEntityBonus() Tests ===

    test('getEntityBonus should exist on ShellSystem', async ({ page }) => {
        await startGame(page);

        const exists = await page.evaluate(() => {
            return typeof window.game.shellSystem.getEntityBonus === 'function';
        });

        expect(exists).toBe(true);
    });

    test('getEntityBonus should return 0 for default shell', async ({ page }) => {
        await startGame(page);

        const bonus = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            return window.game.shellSystem.getEntityBonus('probes', probe, 'dataSignalDiscovery');
        });

        expect(bonus).toBe(0);
    });

    test('getEntityBonus should return correct bonus for equipped probe shell', async ({ page }) => {
        await startGame(page);

        const bonus = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            window.game.gameState.cosmetics.ownedShells.probes.push('calculator_core');
            window.game.shellSystem.equipShellOnProbe(probe, 'calculator_core');
            return window.game.shellSystem.getEntityBonus('probes', probe, 'dataSignalDiscovery');
        });

        expect(bonus).toBe(10);
    });

    test('different probes should get different bonuses', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probes = window.game.gameState.entities.probes;
            if (probes.length < 2) return { skip: true };

            window.game.gameState.cosmetics.ownedShells.probes.push('calculator_core', 'echo_receiver');
            window.game.shellSystem.equipShellOnProbe(probes[0], 'calculator_core');
            window.game.shellSystem.equipShellOnProbe(probes[1], 'echo_receiver');

            return {
                probe0DataSignal: window.game.shellSystem.getEntityBonus('probes', probes[0], 'dataSignalDiscovery'),
                probe1DataSignal: window.game.shellSystem.getEntityBonus('probes', probes[1], 'dataSignalDiscovery'),
                probe1SignalRange: window.game.shellSystem.getEntityBonus('probes', probes[1], 'signalRange')
            };
        });

        if (result.skip) {
            test.skip();
            return;
        }

        expect(result.probe0DataSignal).toBe(10);
        expect(result.probe1DataSignal).toBe(0);
        expect(result.probe1SignalRange).toBe(10);
    });

    test('getEntityBonus should resolve hub bonus from category-level shell', async ({ page }) => {
        await startGame(page);

        const bonus = await page.evaluate(() => {
            window.game.gameState.cosmetics.ownedShells.hubs.push('data_nexus');
            window.game.shellSystem.equipShell('hubs', 'data_nexus');
            return window.game.shellSystem.getEntityBonus('hubs', {}, 'researchSpeed');
        });

        expect(bonus).toBe(15);
    });

    test('getEntityBonus should resolve foundry bonus from category-level shell (legacy miningStations key)', async ({ page }) => {
        await startGame(page);

        const bonus = await page.evaluate(() => {
            window.game.gameState.cosmetics.ownedShells.miningStations.push('optimized_extractor');
            window.game.shellSystem.equipShell('miningStations', 'optimized_extractor');
            return window.game.shellSystem.getEntityBonus('miningStations', {}, 'miningEfficiency');
        });

        expect(bonus).toBe(15);
    });

    // === applyBonusMultiplier() Tests ===

    test('applyBonusMultiplier should exist on ShellSystem', async ({ page }) => {
        await startGame(page);

        const exists = await page.evaluate(() => {
            return typeof window.game.shellSystem.applyBonusMultiplier === 'function';
        });

        expect(exists).toBe(true);
    });

    test('applyBonusMultiplier should correctly apply percentage', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const ss = window.game.shellSystem;
            return {
                noBonus: ss.applyBonusMultiplier(100, 0),
                tenPercent: ss.applyBonusMultiplier(100, 10),
                twentyPercent: ss.applyBonusMultiplier(80, 20)
            };
        });

        expect(result.noBonus).toBeCloseTo(100);
        expect(result.tenPercent).toBeCloseTo(110);
        expect(result.twentyPercent).toBeCloseTo(96);
    });

    // === Foundry-era live read points (REBUILD.md §2) ===

    test('FoundrySystem exposes the shell bonus read points with foundry-era labels', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const fs = window.game.foundrySystem;
            return {
                hasConsumeRate: typeof fs.consumeRatePerMin === 'function',
                hasFreighterSpeed: typeof fs.freighterSpeed === 'function',
                miningEfficiencyLabel: window.BONUS_TYPES.miningEfficiency.label,
                shuttleSpeedLabel: window.BONUS_TYPES.shuttleSpeed.label,
                probethiumRateDefined: !!window.BONUS_TYPES.probethiumRate
            };
        });

        expect(result.hasConsumeRate).toBe(true);
        expect(result.hasFreighterSpeed).toBe(true);
        expect(result.miningEfficiencyLabel).toBe('Forge Rate');
        expect(result.shuttleSpeedLabel).toBe('Freighter Speed');
        // Dormant but must remain defined so owned shells keep rendering
        expect(result.probethiumRateDefined).toBe(true);
    });
});
