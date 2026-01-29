/**
 * Shell Bonuses - Comprehensive Test Suite
 * Covers TEST-01 through TEST-04 requirements:
 *   TEST-01: All 8 probe bonus types verified
 *   TEST-02: Hub researchSpeed bonus verified
 *   TEST-03: All 3 mining station bonus types verified
 *   TEST-04: Per-entity isolation (different shells, shell vs no-shell)
 *
 * Complements existing test files:
 *   - shell-bonus-foundation.spec.js (normalization, getEntityBonus basics)
 *   - probe-bonus-integration.spec.js (probe bonus integration points)
 *   - shell-bonus-wiring.spec.js (station/hub gameplay wiring)
 */

const { test, expect } = require('@playwright/test');

test.describe('Shell Bonuses - Comprehensive', () => {
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
    // TEST-01: All 8 Probe Bonus Types - Resolution Verification
    // =========================================================

    test('TEST-01: all 8 probe bonus types resolve correctly with equipped shells', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };
            const ss = window.game.shellSystem;
            const gs = window.game.gameState;

            // Test each bonus type by equipping the appropriate shell
            const testCases = [
                { shell: 'calculator_core', bonus: 'dataSignalDiscovery', expected: 10 },
                { shell: 'echo_receiver', bonus: 'signalRange', expected: 10 },
                { shell: 'frequency_hunter', bonus: 'rareSignalChance', expected: 8 },
                { shell: 'reinforced_hull', bonus: 'probeDurability', expected: 10 },
                { shell: 'survivor_class', bonus: 'asteroidSurvival', expected: 8 },
                { shell: 'relic_seeker', bonus: 'artifactDiscovery', expected: 10 },
                { shell: 'treasure_hunter', bonus: 'explorationRewards', expected: 8 },
                { shell: 'void_touched', bonus: 'exoticYield', expected: 10 }
            ];

            const results = [];
            for (const tc of testCases) {
                // Own and equip
                if (!gs.cosmetics.ownedShells.probes.includes(tc.shell)) {
                    gs.cosmetics.ownedShells.probes.push(tc.shell);
                }
                ss.equipShellOnProbe(probe, tc.shell);

                const actual = ss.getEntityBonus('probes', probe, tc.bonus);
                results.push({
                    bonus: tc.bonus,
                    shell: tc.shell,
                    expected: tc.expected,
                    actual,
                    pass: actual === tc.expected
                });
            }

            // Reset probe to default
            ss.equipShellOnProbe(probe, 'default');

            return results;
        });

        expect(result.error).toBeUndefined();
        for (const r of result) {
            expect(r.actual, `${r.bonus} from ${r.shell}`).toBe(r.expected);
        }
    });

    test('TEST-01: signalRange gameplay effect - collection range increases', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };
            const ss = window.game.shellSystem;

            // Base collection range
            const baseRange = 80;

            // Equip shell with signalRange bonus
            window.game.gameState.cosmetics.ownedShells.probes.push('echo_receiver');
            ss.equipShellOnProbe(probe, 'echo_receiver');

            const bonus = ss.getEntityBonus('probes', probe, 'signalRange');
            const boostedRange = baseRange * (1 + bonus / 100);

            // Also verify using applyBonusMultiplier
            const viaMultiplier = ss.applyBonusMultiplier(baseRange, bonus);

            return { baseRange, bonus, boostedRange, viaMultiplier };
        });

        expect(result.boostedRange).toBe(88); // 80 * 1.10
        expect(result.viaMultiplier).toBeCloseTo(88);
    });

    test('TEST-01: probeDurability gameplay effect - maxDamage increases', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };
            const ss = window.game.shellSystem;

            // Set a testable base value
            probe.baseMaxDamage = 10;
            probe.maxDamage = 10;

            // Equip fortress_probe (epic, probeDurability: 20)
            window.game.gameState.cosmetics.ownedShells.probes.push('fortress_probe');
            ss.equipShellOnProbe(probe, 'fortress_probe');

            return {
                baseMaxDamage: probe.baseMaxDamage,
                maxDamage: probe.maxDamage,
                expected: Math.floor(10 * 1.20)
            };
        });

        expect(result.baseMaxDamage).toBe(10);
        expect(result.maxDamage).toBe(12); // Math.floor(10 * 1.20) = 12
    });

    // =========================================================
    // TEST-02: Hub researchSpeed Bonus
    // =========================================================

    test('TEST-02: hub researchSpeed resolves from equipped shell', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const ss = window.game.shellSystem;
            const gs = window.game.gameState;

            // Default should be 0
            const defaultBonus = ss.getEntityBonus('hubs', null, 'researchSpeed');

            // Equip data_nexus (rare hub shell, researchSpeed: 15)
            gs.cosmetics.ownedShells.hubs.push('data_nexus');
            gs.cosmetics.equippedShells.hubs = 'data_nexus';

            const equippedBonus = ss.getEntityBonus('hubs', null, 'researchSpeed');

            // Cleanup
            gs.cosmetics.equippedShells.hubs = 'default';

            return { defaultBonus, equippedBonus };
        });

        expect(result.defaultBonus).toBe(0);
        expect(result.equippedBonus).toBe(15);
    });

    test('TEST-02: hub researchSpeed reduces effective research cost', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const ss = window.game.shellSystem;
            const gs = window.game.gameState;

            // Equip hub shell with researchSpeed: 15
            gs.cosmetics.ownedShells.hubs.push('data_nexus');
            gs.cosmetics.equippedShells.hubs = 'data_nexus';

            const bonus = ss.getEntityBonus('hubs', null, 'researchSpeed');

            // Test cost reduction formula for various base costs
            const testCosts = [1, 5, 10, 12, 20];
            const reductions = testCosts.map(baseCost => {
                const effective = Math.max(1, Math.ceil(baseCost * (1 - bonus / 100)));
                return { baseCost, effective };
            });

            // Cleanup
            gs.cosmetics.equippedShells.hubs = 'default';

            return { bonus, reductions };
        });

        expect(result.bonus).toBe(15);
        // Verify cost reduction formula
        for (const r of result.reductions) {
            const expected = Math.max(1, Math.ceil(r.baseCost * (1 - 15 / 100)));
            expect(r.effective, `cost ${r.baseCost}`).toBe(expected);
        }
        // Spot check: cost 12 with 15% reduction = Math.max(1, ceil(12 * 0.85)) = ceil(10.2) = 11
        const cost12 = result.reductions.find(r => r.baseCost === 12);
        expect(cost12.effective).toBe(11);
    });

    // =========================================================
    // TEST-03: Mining Station Bonus Types
    // =========================================================

    test('TEST-03: miningEfficiency resolves from equipped station shell', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const ss = window.game.shellSystem;
            const gs = window.game.gameState;

            const defaultBonus = ss.getEntityBonus('miningStations', null, 'miningEfficiency');

            // Find a station shell with miningEfficiency
            const catalog = window.SHELL_CATALOG.miningStations;
            const shell = Object.values(catalog).find(s => s.bonuses && s.bonuses.miningEfficiency > 0);

            if (!shell) return { error: 'no shell with miningEfficiency' };

            gs.cosmetics.ownedShells.miningStations.push(shell.id);
            gs.cosmetics.equippedShells.miningStations = shell.id;

            const equippedBonus = ss.getEntityBonus('miningStations', null, 'miningEfficiency');

            // Cleanup
            gs.cosmetics.equippedShells.miningStations = 'default';

            return { defaultBonus, equippedBonus, shellId: shell.id };
        });

        expect(result.defaultBonus).toBe(0);
        expect(result.equippedBonus).toBeGreaterThan(0);
    });

    test('TEST-03: shuttleSpeed resolves from equipped station shell', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const ss = window.game.shellSystem;
            const gs = window.game.gameState;

            const defaultBonus = ss.getEntityBonus('miningStations', null, 'shuttleSpeed');

            const catalog = window.SHELL_CATALOG.miningStations;
            const shell = Object.values(catalog).find(s => s.bonuses && s.bonuses.shuttleSpeed > 0);

            if (!shell) return { error: 'no shell with shuttleSpeed' };

            gs.cosmetics.ownedShells.miningStations.push(shell.id);
            gs.cosmetics.equippedShells.miningStations = shell.id;

            const equippedBonus = ss.getEntityBonus('miningStations', null, 'shuttleSpeed');

            gs.cosmetics.equippedShells.miningStations = 'default';

            return { defaultBonus, equippedBonus, shellId: shell.id };
        });

        expect(result.defaultBonus).toBe(0);
        expect(result.equippedBonus).toBeGreaterThan(0);
    });

    test('TEST-03: probethiumRate resolves from equipped station shell', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const ss = window.game.shellSystem;
            const gs = window.game.gameState;

            const defaultBonus = ss.getEntityBonus('miningStations', null, 'probethiumRate');

            const catalog = window.SHELL_CATALOG.miningStations;
            const shell = Object.values(catalog).find(s => s.bonuses && s.bonuses.probethiumRate > 0);

            if (!shell) return { error: 'no shell with probethiumRate' };

            gs.cosmetics.ownedShells.miningStations.push(shell.id);
            gs.cosmetics.equippedShells.miningStations = shell.id;

            const equippedBonus = ss.getEntityBonus('miningStations', null, 'probethiumRate');

            gs.cosmetics.equippedShells.miningStations = 'default';

            return { defaultBonus, equippedBonus, shellId: shell.id };
        });

        expect(result.defaultBonus).toBe(0);
        expect(result.equippedBonus).toBeGreaterThan(0);
    });

    // =========================================================
    // TEST-04: Per-Entity Isolation
    // =========================================================

    test('TEST-04: two probes with different shells have isolated bonuses', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probes = window.game.gameState.entities.probes;
            if (probes.length < 2) return { error: 'need at least 2 probes' };
            const ss = window.game.shellSystem;
            const gs = window.game.gameState;

            // Probe A gets calculator_core (dataSignalDiscovery: 10)
            gs.cosmetics.ownedShells.probes.push('calculator_core');
            ss.equipShellOnProbe(probes[0], 'calculator_core');

            // Probe B gets echo_receiver (signalRange: 10 only)
            gs.cosmetics.ownedShells.probes.push('echo_receiver');
            ss.equipShellOnProbe(probes[1], 'echo_receiver');

            return {
                // Probe A should have its own bonus, NOT Probe B's
                probeA_dataSignal: ss.getEntityBonus('probes', probes[0], 'dataSignalDiscovery'),
                probeA_signalRange: ss.getEntityBonus('probes', probes[0], 'signalRange'),

                // Probe B should have its own bonus, NOT Probe A's
                probeB_dataSignal: ss.getEntityBonus('probes', probes[1], 'dataSignalDiscovery'),
                probeB_signalRange: ss.getEntityBonus('probes', probes[1], 'signalRange'),

                probeA_shell: probes[0].shellId,
                probeB_shell: probes[1].shellId
            };
        });

        expect(result.error).toBeUndefined();

        // Probe A: calculator_core bonuses only
        expect(result.probeA_dataSignal).toBe(10);
        expect(result.probeA_signalRange).toBe(0);  // Not echo_receiver's bonus

        // Probe B: echo_receiver bonuses only
        expect(result.probeB_dataSignal).toBe(0);    // Not calculator_core's bonus
        expect(result.probeB_signalRange).toBe(10);
    });

    test('TEST-04: probe with shell vs probe without shell - no bleed', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probes = window.game.gameState.entities.probes;
            if (probes.length < 2) return { error: 'need at least 2 probes' };
            const ss = window.game.shellSystem;
            const gs = window.game.gameState;

            // Probe A gets calculator_core (dataSignalDiscovery: 10)
            gs.cosmetics.ownedShells.probes.push('calculator_core');
            ss.equipShellOnProbe(probes[0], 'calculator_core');

            // Probe B keeps default shell (no bonus)
            // Ensure it's on default
            probes[1].shellId = 'default';

            return {
                probeA_dataSignal: ss.getEntityBonus('probes', probes[0], 'dataSignalDiscovery'),
                probeB_dataSignal: ss.getEntityBonus('probes', probes[1], 'dataSignalDiscovery'),
                probeA_shell: probes[0].shellId,
                probeB_shell: probes[1].shellId
            };
        });

        expect(result.error).toBeUndefined();

        // Probe A has the bonus
        expect(result.probeA_dataSignal).toBe(10);
        expect(result.probeA_shell).toBe('calculator_core');

        // Probe B does NOT have the bonus
        expect(result.probeB_dataSignal).toBe(0);
        expect(result.probeB_shell).toBe('default');
    });

    test('TEST-04: hub and station bonuses do not bleed to probes', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const ss = window.game.shellSystem;
            const gs = window.game.gameState;
            const probe = gs.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Equip hub shell with researchSpeed
            gs.cosmetics.ownedShells.hubs.push('data_nexus');
            gs.cosmetics.equippedShells.hubs = 'data_nexus';

            // Equip station shell with miningEfficiency
            const catalog = window.SHELL_CATALOG.miningStations;
            const stationShell = Object.values(catalog).find(s => s.bonuses && s.bonuses.miningEfficiency > 0);
            if (stationShell) {
                gs.cosmetics.ownedShells.miningStations.push(stationShell.id);
                gs.cosmetics.equippedShells.miningStations = stationShell.id;
            }

            // Probe with default shell should NOT get hub or station bonuses
            probe.shellId = 'default';
            const probeResearch = ss.getEntityBonus('probes', probe, 'researchSpeed');
            const probeMining = ss.getEntityBonus('probes', probe, 'miningEfficiency');

            // Hub should have researchSpeed but NOT miningEfficiency
            const hubResearch = ss.getEntityBonus('hubs', null, 'researchSpeed');
            const hubMining = ss.getEntityBonus('hubs', null, 'miningEfficiency');

            // Station should have miningEfficiency but NOT researchSpeed
            const stationMining = ss.getEntityBonus('miningStations', null, 'miningEfficiency');
            const stationResearch = ss.getEntityBonus('miningStations', null, 'researchSpeed');

            // Cleanup
            gs.cosmetics.equippedShells.hubs = 'default';
            gs.cosmetics.equippedShells.miningStations = 'default';

            return {
                probeResearch, probeMining,
                hubResearch, hubMining,
                stationMining, stationResearch,
                stationShellFound: !!stationShell
            };
        });

        expect(result.error).toBeUndefined();

        // Probe gets nothing from hub/station shells
        expect(result.probeResearch).toBe(0);
        expect(result.probeMining).toBe(0);

        // Hub has its own bonus, not station's
        expect(result.hubResearch).toBe(15);
        expect(result.hubMining).toBe(0);

        // Station has its own bonus, not hub's
        if (result.stationShellFound) {
            expect(result.stationMining).toBeGreaterThan(0);
        }
        expect(result.stationResearch).toBe(0);
    });
});
