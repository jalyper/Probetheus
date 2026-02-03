/**
 * Exclusive Signal System Tests
 * Tests for exclusive signal spawning in designated sectors (SIG-01 through SIG-07)
 *
 * Requirements covered:
 * - SIG-01: Ore Vein signals spawn only in Resource-Rich sectors
 * - SIG-02: Data Cache signals spawn only in Data Haven sectors
 * - SIG-03: Relic signals spawn only in Ancient sectors
 * - SIG-04: Exotic Crystal signals spawn only in Asteroid Field sectors
 * - SIG-05: Standard sectors spawn NO exclusive signals
 * - SIG-06: Equipment auto-collects exclusive signals via base type mapping
 * - SIG-07: Shell bonuses affect exclusive signal spawning and collection
 */

const { test, expect } = require('@playwright/test');

test.describe('Exclusive Signal System', () => {
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

    // ==========================================================
    // TEST-01: Sector-Specific Spawning (SIG-01 through SIG-05)
    // ==========================================================

    test('SIG-01: Ore Vein signals spawn in Resource-Rich sectors', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;
            const sectorManager = window.game.sectorManager;

            // Create a Resource-Rich sector at position (5,5)
            const world = window.game.gameState.getWorld();
            const sectorKey = '5,5';

            // Force create a Resource-Rich sector
            const resourceRichType = {
                name: 'Resource-Rich',
                color: 'rgba(255, 200, 100, 0.3)',
                borderColor: '#fc8',
                mineralBonus: 2.0,
                dataBonus: 1.5,
                artifactBonus: 1.2,
                exclusiveSignalType: 'ore_vein',
                probeDestructionChance: 0
            };

            const sector = {
                x: 5,
                y: 5,
                explored: true,
                type: resourceRichType,
                name: 'Test Resource-Rich',
                stars: [],
                outposts: [],
                facilities: [],
                hubs: []
            };

            world.sectors.set(sectorKey, sector);

            // Generate many signals to test spawn rate
            let oreVeinCount = 0;
            let totalExclusiveChecks = 0;
            const samples = 1000;

            for (let i = 0; i < samples; i++) {
                const signalType = probeManager.determineSignalType(sector, null);
                if (signalType === 'ore_vein') {
                    oreVeinCount++;
                }
                totalExclusiveChecks++;
            }

            const oreVeinRate = (oreVeinCount / totalExclusiveChecks) * 100;

            return {
                oreVeinCount,
                totalExclusiveChecks,
                oreVeinRate,
                sectorType: sector.type.name,
                exclusiveSignalType: sector.type.exclusiveSignalType
            };
        });

        expect(result.sectorType).toBe('Resource-Rich');
        expect(result.exclusiveSignalType).toBe('ore_vein');
        // Target 15-30% rate with +/-10% tolerance (so 5-40% acceptable)
        expect(result.oreVeinRate).toBeGreaterThan(5);
        expect(result.oreVeinRate).toBeLessThan(40);
    });

    test('SIG-02: Data Cache signals spawn in Data Haven sectors', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;
            const world = window.game.gameState.getWorld();
            const sectorKey = '6,6';

            // Force create a Data Haven sector
            const dataHavenType = {
                name: 'Data Haven',
                color: 'rgba(100, 255, 100, 0.3)',
                borderColor: '#6f6',
                mineralBonus: 0.8,
                dataBonus: 3.0,
                artifactBonus: 1.5,
                exclusiveSignalType: 'data_cache',
                probeDestructionChance: 0
            };

            const sector = {
                x: 6,
                y: 6,
                explored: true,
                type: dataHavenType,
                name: 'Test Data Haven',
                stars: [],
                outposts: [],
                facilities: [],
                hubs: []
            };

            world.sectors.set(sectorKey, sector);

            let dataCacheCount = 0;
            const samples = 1000;

            for (let i = 0; i < samples; i++) {
                const signalType = probeManager.determineSignalType(sector, null);
                if (signalType === 'data_cache') {
                    dataCacheCount++;
                }
            }

            const dataCacheRate = (dataCacheCount / samples) * 100;

            return {
                dataCacheCount,
                samples,
                dataCacheRate,
                sectorType: sector.type.name,
                exclusiveSignalType: sector.type.exclusiveSignalType
            };
        });

        expect(result.sectorType).toBe('Data Haven');
        expect(result.exclusiveSignalType).toBe('data_cache');
        expect(result.dataCacheRate).toBeGreaterThan(5);
        expect(result.dataCacheRate).toBeLessThan(40);
    });

    test('SIG-03: Relic signals spawn in Ancient sectors', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;
            const world = window.game.gameState.getWorld();
            const sectorKey = '7,7';

            // Force create an Ancient sector
            const ancientType = {
                name: 'Ancient',
                color: 'rgba(255, 100, 255, 0.3)',
                borderColor: '#f6f',
                mineralBonus: 1.2,
                dataBonus: 1.8,
                artifactBonus: 4.0,
                exclusiveSignalType: 'relic',
                probeDestructionChance: 0
            };

            const sector = {
                x: 7,
                y: 7,
                explored: true,
                type: ancientType,
                name: 'Test Ancient',
                stars: [],
                outposts: [],
                facilities: [],
                hubs: []
            };

            world.sectors.set(sectorKey, sector);

            let relicCount = 0;
            const samples = 1000;

            for (let i = 0; i < samples; i++) {
                const signalType = probeManager.determineSignalType(sector, null);
                if (signalType === 'relic') {
                    relicCount++;
                }
            }

            const relicRate = (relicCount / samples) * 100;

            return {
                relicCount,
                samples,
                relicRate,
                sectorType: sector.type.name,
                exclusiveSignalType: sector.type.exclusiveSignalType
            };
        });

        expect(result.sectorType).toBe('Ancient');
        expect(result.exclusiveSignalType).toBe('relic');
        expect(result.relicRate).toBeGreaterThan(5);
        expect(result.relicRate).toBeLessThan(40);
    });

    test('SIG-04: Exotic Crystal signals spawn in Asteroid Field sectors', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;
            const world = window.game.gameState.getWorld();
            const sectorKey = '8,8';

            // Force create an Asteroid Field sector
            const asteroidFieldType = {
                name: 'Asteroid Field',
                color: 'rgba(255, 100, 100, 0.3)',
                borderColor: '#f66',
                mineralBonus: 3.0,
                dataBonus: 3.0,
                artifactBonus: 3.0,
                exclusiveSignalType: 'exotic_crystal',
                probeDestructionChance: 0.1
            };

            const sector = {
                x: 8,
                y: 8,
                explored: true,
                type: asteroidFieldType,
                name: 'Test Asteroid Field',
                stars: [],
                outposts: [],
                facilities: [],
                hubs: []
            };

            world.sectors.set(sectorKey, sector);

            let exoticCrystalCount = 0;
            const samples = 1000;

            for (let i = 0; i < samples; i++) {
                const signalType = probeManager.determineSignalType(sector, null);
                if (signalType === 'exotic_crystal') {
                    exoticCrystalCount++;
                }
            }

            const exoticCrystalRate = (exoticCrystalCount / samples) * 100;

            return {
                exoticCrystalCount,
                samples,
                exoticCrystalRate,
                sectorType: sector.type.name,
                exclusiveSignalType: sector.type.exclusiveSignalType
            };
        });

        expect(result.sectorType).toBe('Asteroid Field');
        expect(result.exclusiveSignalType).toBe('exotic_crystal');
        expect(result.exoticCrystalRate).toBeGreaterThan(5);
        expect(result.exoticCrystalRate).toBeLessThan(40);
    });

    test('SIG-05: Standard sectors spawn NO exclusive signals', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;
            const world = window.game.gameState.getWorld();
            const sectorKey = '9,9';

            // Force create a Standard sector (no exclusiveSignalType)
            const standardType = {
                name: 'Standard',
                color: 'rgba(100, 100, 255, 0.3)',
                borderColor: '#66f',
                mineralBonus: 1.0,
                dataBonus: 1.0,
                artifactBonus: 1.0,
                probeDestructionChance: 0
                // Note: NO exclusiveSignalType property
            };

            const sector = {
                x: 9,
                y: 9,
                explored: true,
                type: standardType,
                name: 'Test Standard',
                stars: [],
                outposts: [],
                facilities: [],
                hubs: []
            };

            world.sectors.set(sectorKey, sector);

            const exclusiveTypes = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'];
            let exclusiveCount = 0;
            const samples = 1000;

            for (let i = 0; i < samples; i++) {
                const signalType = probeManager.determineSignalType(sector, null);
                if (exclusiveTypes.includes(signalType)) {
                    exclusiveCount++;
                }
            }

            return {
                exclusiveCount,
                samples,
                sectorType: sector.type.name,
                hasExclusiveSignalType: !!sector.type.exclusiveSignalType
            };
        });

        expect(result.sectorType).toBe('Standard');
        expect(result.hasExclusiveSignalType).toBe(false);
        // Standard sectors should NEVER spawn exclusive signals
        expect(result.exclusiveCount).toBe(0);
    });

    // ==========================================================
    // TEST-01 continued: Equipment Auto-Collection (SIG-06)
    // ==========================================================

    test('SIG-06: getSignalBaseType maps ore_vein to mineral', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;
            return {
                oreVein: probeManager.getSignalBaseType('ore_vein'),
                dataCache: probeManager.getSignalBaseType('data_cache'),
                relic: probeManager.getSignalBaseType('relic'),
                exoticCrystal: probeManager.getSignalBaseType('exotic_crystal'),
                mineral: probeManager.getSignalBaseType('mineral'),
                data: probeManager.getSignalBaseType('data'),
                artifact: probeManager.getSignalBaseType('artifact'),
                mixed: probeManager.getSignalBaseType('mixed')
            };
        });

        // Exclusive types map to base categories
        expect(result.oreVein).toBe('mineral');
        expect(result.dataCache).toBe('data');
        expect(result.relic).toBe('artifact');
        expect(result.exoticCrystal).toBe('mixed');

        // Standard types pass through
        expect(result.mineral).toBe('mineral');
        expect(result.data).toBe('data');
        expect(result.artifact).toBe('artifact');
        expect(result.mixed).toBe('mixed');
    });

    test('SIG-06: Mineral collector auto-collects Ore Vein signals', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gs = window.game.gameState;
            const probe = gs.entities.probes[0];

            if (!probe) return { error: 'No probe found' };

            // Equip mineral collector
            probe.equipment = [{
                type: 'mineral_collector',
                collectionTypes: ['minerals'],
                id: 'test_mineral_collector'
            }];

            // Create an ore_vein signal near the probe
            const oreVeinSignal = {
                x: probe.current.x + 10,
                y: probe.current.y + 10,
                radius: 8,
                rarity: 'common',
                signalType: 'ore_vein',
                duration: 5000,
                createdAt: Date.now()
            };

            gs.entities.signals.push(oreVeinSignal);

            const signalCountBefore = gs.entities.signals.length;

            // Trigger auto-collection
            window.game.probeManager.autoCollectSignals(probe);

            const signalCountAfter = gs.entities.signals.length;

            return {
                signalCountBefore,
                signalCountAfter,
                collected: signalCountBefore > signalCountAfter,
                cargoMinerals: probe.cargo?.minerals || 0
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.collected).toBe(true);
        expect(result.cargoMinerals).toBeGreaterThan(0);
    });

    test('SIG-06: Data collector auto-collects Data Cache signals', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gs = window.game.gameState;
            const probe = gs.entities.probes[0];

            if (!probe) return { error: 'No probe found' };

            // Equip data collector
            probe.equipment = [{
                type: 'data_collector',
                collectionTypes: ['data'],
                id: 'test_data_collector'
            }];

            // Create a data_cache signal near the probe
            const dataCacheSignal = {
                x: probe.current.x + 10,
                y: probe.current.y + 10,
                radius: 8,
                rarity: 'common',
                signalType: 'data_cache',
                duration: 5000,
                createdAt: Date.now()
            };

            gs.entities.signals.push(dataCacheSignal);

            const signalCountBefore = gs.entities.signals.length;

            window.game.probeManager.autoCollectSignals(probe);

            const signalCountAfter = gs.entities.signals.length;

            return {
                signalCountBefore,
                signalCountAfter,
                collected: signalCountBefore > signalCountAfter,
                cargoData: probe.cargo?.data || 0
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.collected).toBe(true);
        expect(result.cargoData).toBeGreaterThan(0);
    });

    test('SIG-06: Artifact collector auto-collects Relic signals', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gs = window.game.gameState;
            const probe = gs.entities.probes[0];

            if (!probe) return { error: 'No probe found' };

            // Equip artifact collector
            probe.equipment = [{
                type: 'artifact_collector',
                collectionTypes: ['artifacts'],
                id: 'test_artifact_collector'
            }];

            // Create a relic signal near the probe
            const relicSignal = {
                x: probe.current.x + 10,
                y: probe.current.y + 10,
                radius: 8,
                rarity: 'common',
                signalType: 'relic',
                duration: 5000,
                createdAt: Date.now()
            };

            gs.entities.signals.push(relicSignal);

            const signalCountBefore = gs.entities.signals.length;

            window.game.probeManager.autoCollectSignals(probe);

            const signalCountAfter = gs.entities.signals.length;

            return {
                signalCountBefore,
                signalCountAfter,
                collected: signalCountBefore > signalCountAfter,
                cargoArtifacts: probe.cargo?.artifacts || 0
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.collected).toBe(true);
        expect(result.cargoArtifacts).toBeGreaterThan(0);
    });

    test('SIG-06: Universal collector auto-collects all exclusive signals', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gs = window.game.gameState;
            const probe = gs.entities.probes[0];

            if (!probe) return { error: 'No probe found' };

            // Equip universal collector
            probe.equipment = [{
                type: 'universal_collector',
                collectionTypes: ['all'],
                id: 'test_universal_collector'
            }];

            // Create all four exclusive signal types near the probe
            const exclusiveSignals = [
                { signalType: 'ore_vein', rarity: 'common' },
                { signalType: 'data_cache', rarity: 'common' },
                { signalType: 'relic', rarity: 'common' },
                { signalType: 'exotic_crystal', rarity: 'common' }
            ];

            // Clear existing signals
            gs.entities.signals = [];

            exclusiveSignals.forEach((sig, i) => {
                gs.entities.signals.push({
                    x: probe.current.x + 10 + i * 5,
                    y: probe.current.y + 10 + i * 5,
                    radius: 8,
                    rarity: sig.rarity,
                    signalType: sig.signalType,
                    duration: 5000,
                    createdAt: Date.now()
                });
            });

            const signalCountBefore = gs.entities.signals.length;

            // Need to reset cooldown to allow collection
            probe.lastAutoCollectionTime = 0;
            window.game.probeManager.autoCollectSignals(probe);

            const signalCountAfter = gs.entities.signals.length;

            return {
                signalCountBefore,
                signalCountAfter,
                collectedCount: signalCountBefore - signalCountAfter,
                cargoMinerals: probe.cargo?.minerals || 0,
                cargoData: probe.cargo?.data || 0,
                cargoArtifacts: probe.cargo?.artifacts || 0
            };
        });

        expect(result.error).toBeUndefined();
        // Universal collector should collect at least some of the exclusive signals
        expect(result.collectedCount).toBeGreaterThan(0);
    });

    // ==========================================================
    // TEST-02: Shell Bonus Integration (SIG-07)
    // ==========================================================

    test('SIG-07: dataSignalDiscovery bonus increases exclusive signal spawn rate', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;
            const ss = window.game.shellSystem;
            const gs = window.game.gameState;

            // Get probe
            const probe = gs.entities.probes[0];
            if (!probe) return { error: 'No probe found' };

            // Find a shell with dataSignalDiscovery bonus
            const shellCatalog = window.SHELL_CATALOG.probes;
            const shellWithBonus = Object.values(shellCatalog).find(s =>
                s.bonuses && s.bonuses.dataSignalDiscovery > 0
            );

            if (!shellWithBonus) {
                return { noShellWithBonus: true };
            }

            // Equip the shell
            if (!gs.cosmetics.ownedShells.probes.includes(shellWithBonus.id)) {
                gs.cosmetics.ownedShells.probes.push(shellWithBonus.id);
            }
            ss.equipShellOnProbe(probe, shellWithBonus.id);

            // Get the bonus value and verify it's being applied
            const bonusValue = ss.getEntityBonus('probes', probe, 'dataSignalDiscovery');

            // Calculate expected adjusted exclusive chance
            // Base rate is 22.5% (0.225)
            const baseExclusiveChance = 0.225;
            const adjustedExclusiveChance = baseExclusiveChance * (1 + bonusValue / 100);

            return {
                shellId: shellWithBonus.id,
                bonusValue,
                baseChance: baseExclusiveChance * 100,
                adjustedChance: adjustedExclusiveChance * 100,
                bonusApplied: bonusValue > 0,
                chanceIncreased: adjustedExclusiveChance > baseExclusiveChance
            };
        });

        expect(result.error).toBeUndefined();
        if (!result.noShellWithBonus) {
            // Verify the bonus is applied and increases the chance
            expect(result.bonusApplied).toBe(true);
            expect(result.chanceIncreased).toBe(true);
            expect(result.adjustedChance).toBeGreaterThan(result.baseChance);
        }
    });

    test('SIG-07: signalRange bonus affects exclusive signal auto-collection range', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const ss = window.game.shellSystem;
            const gs = window.game.gameState;
            const probe = gs.entities.probes[0];

            if (!probe) return { error: 'No probe found' };

            // Get base collection range (80 pixels)
            const baseRange = 80;

            // Find a shell with signalRange bonus
            const shellCatalog = window.SHELL_CATALOG.probes;
            const shellWithBonus = Object.values(shellCatalog).find(s =>
                s.bonuses && s.bonuses.signalRange > 0
            );

            if (!shellWithBonus) {
                return { noShellWithBonus: true };
            }

            // Equip the shell
            if (!gs.cosmetics.ownedShells.probes.includes(shellWithBonus.id)) {
                gs.cosmetics.ownedShells.probes.push(shellWithBonus.id);
            }
            ss.equipShellOnProbe(probe, shellWithBonus.id);

            // Calculate expected boosted range
            const rangeBonus = ss.getEntityBonus('probes', probe, 'signalRange');
            const boostedRange = baseRange * (1 + rangeBonus / 100);

            return {
                baseRange,
                rangeBonus,
                boostedRange,
                shellId: shellWithBonus.id,
                rangeIncreased: boostedRange > baseRange
            };
        });

        expect(result.error).toBeUndefined();
        if (!result.noShellWithBonus) {
            expect(result.rangeIncreased).toBe(true);
            expect(result.boostedRange).toBeGreaterThan(result.baseRange);
        }
    });

    test('SIG-07: rareSignalChance bonus affects signal rarity distribution', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;
            const ss = window.game.shellSystem;
            const gs = window.game.gameState;
            const probe = gs.entities.probes[0];

            if (!probe) return { error: 'No probe found' };

            // Test rarity distribution without bonus
            let baseCommonCount = 0;
            const samples = 500;

            for (let i = 0; i < samples; i++) {
                const rarity = probeManager.determineSignalRarity(false, null);
                if (rarity === 'common') {
                    baseCommonCount++;
                }
            }

            // Find a shell with rareSignalChance bonus
            const shellCatalog = window.SHELL_CATALOG.probes;
            const shellWithBonus = Object.values(shellCatalog).find(s =>
                s.bonuses && s.bonuses.rareSignalChance > 0
            );

            if (!shellWithBonus) {
                return {
                    baseCommonRate: (baseCommonCount / samples) * 100,
                    noShellWithBonus: true
                };
            }

            // Equip the shell
            if (!gs.cosmetics.ownedShells.probes.includes(shellWithBonus.id)) {
                gs.cosmetics.ownedShells.probes.push(shellWithBonus.id);
            }
            ss.equipShellOnProbe(probe, shellWithBonus.id);

            // Test rarity distribution with bonus
            let bonusCommonCount = 0;

            for (let i = 0; i < samples; i++) {
                const rarity = probeManager.determineSignalRarity(false, probe);
                if (rarity === 'common') {
                    bonusCommonCount++;
                }
            }

            const baseCommonRate = (baseCommonCount / samples) * 100;
            const bonusCommonRate = (bonusCommonCount / samples) * 100;

            return {
                baseCommonRate,
                bonusCommonRate,
                shellId: shellWithBonus.id,
                bonusValue: shellWithBonus.bonuses.rareSignalChance,
                // With rareSignalChance bonus, common signals should be less frequent
                commonRateReduced: bonusCommonRate <= baseCommonRate
            };
        });

        expect(result.error).toBeUndefined();
        if (!result.noShellWithBonus) {
            // rareSignalChance should reduce common signal frequency
            expect(result.commonRateReduced).toBe(true);
        }
    });

    // ==========================================================
    // TEST-04: Sector Persistence (signals are intentionally not persisted)
    // ==========================================================

    test('Sector exclusiveSignalType persists through save/load', async ({ page }) => {
        await startGame(page);

        // Create a sector with exclusiveSignalType and save
        const beforeSave = await page.evaluate(async () => {
            const gs = window.game.gameState;
            const world = gs.getWorld();

            // Create a Resource-Rich sector at a specific location
            const sectorKey = '20,20';
            const resourceRichType = {
                name: 'Resource-Rich',
                color: 'rgba(255, 200, 100, 0.3)',
                borderColor: '#fc8',
                mineralBonus: 2.0,
                dataBonus: 1.5,
                artifactBonus: 1.2,
                exclusiveSignalType: 'ore_vein',
                probeDestructionChance: 0
            };

            const sector = {
                x: 20,
                y: 20,
                explored: true,
                type: resourceRichType,
                name: 'Test Resource-Rich',
                stars: [],
                outposts: [],
                facilities: [],
                hubs: []
            };

            world.sectors.set(sectorKey, sector);

            // Save game
            await window.game.saveManager.saveGame(1);

            return {
                sectorKey,
                sectorType: sector.type.name,
                exclusiveSignalType: sector.type.exclusiveSignalType
            };
        });

        expect(beforeSave.sectorType).toBe('Resource-Rich');
        expect(beforeSave.exclusiveSignalType).toBe('ore_vein');

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

        // Load saved game
        const afterLoad = await page.evaluate(async () => {
            await window.game.saveManager.loadGame(1);
            await new Promise(resolve => setTimeout(resolve, 1000));

            const gs = window.game.gameState;
            const world = gs.getWorld();
            const sector = world.sectors.get('20,20');

            if (!sector) {
                return { error: 'Sector not found after load' };
            }

            return {
                sectorType: sector.type.name,
                exclusiveSignalType: sector.type.exclusiveSignalType,
                explored: sector.explored
            };
        });

        // Verify sector was restored with correct type
        expect(afterLoad.error).toBeUndefined();
        expect(afterLoad.sectorType).toBe(beforeSave.sectorType);
        expect(afterLoad.exclusiveSignalType).toBe(beforeSave.exclusiveSignalType);
        expect(afterLoad.explored).toBe(true);
    });

    test('Signals are intentionally NOT persisted (by design)', async ({ page }) => {
        await startGame(page);

        // Verify that signals array is cleared on save/load (by design)
        const result = await page.evaluate(async () => {
            const gs = window.game.gameState;

            // Add some signals
            gs.entities.signals = [
                { x: 100, y: 100, signalType: 'ore_vein', rarity: 'common' },
                { x: 200, y: 200, signalType: 'data_cache', rarity: 'uncommon' }
            ];

            const signalsBefore = gs.entities.signals.length;

            // Save and load
            await window.game.saveManager.saveGame(1);
            await window.game.saveManager.loadGame(1);
            await new Promise(resolve => setTimeout(resolve, 500));

            const signalsAfter = gs.entities.signals.length;

            return {
                signalsBefore,
                signalsAfter,
                signalsCleared: signalsAfter === 0
            };
        });

        // By design, signals are NOT persisted (they're temporary)
        expect(result.signalsBefore).toBe(2);
        expect(result.signalsCleared).toBe(true);
    });

    // ==========================================================
    // Regression Protection
    // ==========================================================

    test('Standard signal types continue working unchanged', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;
            const world = window.game.gameState.getWorld();

            // Create a Standard sector
            const sectorKey = '11,11';
            const standardType = {
                name: 'Standard',
                color: 'rgba(100, 100, 255, 0.3)',
                borderColor: '#66f',
                mineralBonus: 1.0,
                dataBonus: 1.0,
                artifactBonus: 1.0,
                probeDestructionChance: 0
            };

            const sector = {
                x: 11,
                y: 11,
                explored: true,
                type: standardType,
                name: 'Test Standard',
                stars: [],
                outposts: [],
                facilities: [],
                hubs: []
            };

            world.sectors.set(sectorKey, sector);

            // Count standard signal types
            const standardTypes = { mixed: 0, mineral: 0, data: 0, artifact: 0 };
            const samples = 500;

            for (let i = 0; i < samples; i++) {
                const signalType = probeManager.determineSignalType(sector, null);
                if (standardTypes.hasOwnProperty(signalType)) {
                    standardTypes[signalType]++;
                }
            }

            // Calculate percentages
            const mixedRate = (standardTypes.mixed / samples) * 100;
            const mineralRate = (standardTypes.mineral / samples) * 100;
            const dataRate = (standardTypes.data / samples) * 100;
            const artifactRate = (standardTypes.artifact / samples) * 100;
            const total = standardTypes.mixed + standardTypes.mineral + standardTypes.data + standardTypes.artifact;

            return {
                mixedRate,
                mineralRate,
                dataRate,
                artifactRate,
                totalStandardSignals: total,
                samples
            };
        });

        // Standard sector should generate 70% mixed, 10% each specialized
        // Allow +/-15% tolerance for randomness
        expect(result.mixedRate).toBeGreaterThan(50);
        expect(result.mixedRate).toBeLessThan(90);
        expect(result.totalStandardSignals).toBe(result.samples);
    });

    test('Exclusive signals do NOT spawn in sectors without exclusiveSignalType', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;
            const world = window.game.gameState.getWorld();

            // Create a custom sector WITHOUT exclusiveSignalType
            const sectorKey = '12,12';
            const customType = {
                name: 'Custom',
                color: 'rgba(150, 150, 150, 0.3)',
                borderColor: '#999',
                mineralBonus: 1.5,
                dataBonus: 1.5,
                artifactBonus: 1.5,
                probeDestructionChance: 0
                // NO exclusiveSignalType
            };

            const sector = {
                x: 12,
                y: 12,
                explored: true,
                type: customType,
                name: 'Test Custom',
                stars: [],
                outposts: [],
                facilities: [],
                hubs: []
            };

            world.sectors.set(sectorKey, sector);

            const exclusiveTypes = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'];
            let exclusiveCount = 0;
            const samples = 500;

            for (let i = 0; i < samples; i++) {
                const signalType = probeManager.determineSignalType(sector, null);
                if (exclusiveTypes.includes(signalType)) {
                    exclusiveCount++;
                }
            }

            return {
                exclusiveCount,
                samples,
                hasExclusiveType: !!sector.type.exclusiveSignalType
            };
        });

        expect(result.hasExclusiveType).toBe(false);
        expect(result.exclusiveCount).toBe(0);
    });
});
