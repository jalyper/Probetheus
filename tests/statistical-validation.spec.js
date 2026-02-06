/**
 * Statistical Validation Tests
 * Large-sample RNG validation for Phase 10 Integration Testing
 *
 * Purpose: Verify that RNG-dependent features produce expected distributions
 * over many samples. These tests use 200-1000+ samples to confirm spawn rates,
 * distance distributions, and rarity distributions are within expected tolerances.
 *
 * Tests cover:
 * - Exclusive signal spawn rates (15-30% target with wide tolerance)
 * - Distance-based profile distributions (balanced near, specialized far)
 * - Rarity distributions for discovery bonus signals (~80/20 epic/legendary)
 * - Standard signal rarity curve (common most frequent)
 */

const { test, expect } = require('@playwright/test');

test.describe('Statistical Validation', () => {
    // Set longer timeout for statistical tests that run many iterations
    test.setTimeout(30000);

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
    // Exclusive Signal Spawn Rate Tests (3 tests)
    // ==========================================================

    test('exclusive signal spawn rate is 15-30% in designated sectors (1000 samples)', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;

            // Create a Resource-Rich sector
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

            // Clear signals for isolation
            window.game.gameState.entities.signals = [];

            // Generate 1000 signal types
            let oreVeinCount = 0;
            const samples = 1000;

            for (let i = 0; i < samples; i++) {
                const signalType = probeManager.determineSignalType(sector, null);
                if (signalType === 'ore_vein') {
                    oreVeinCount++;
                }
            }

            const oreVeinRate = (oreVeinCount / samples) * 100;

            // Verify ALL ore_vein signals map to 'mineral' base type
            const baseType = probeManager.getSignalBaseType('ore_vein');

            return {
                oreVeinCount,
                samples,
                oreVeinRate,
                baseType,
                sectorType: sector.type.name,
                exclusiveSignalType: sector.type.exclusiveSignalType
            };
        });

        expect(result.sectorType).toBe('Resource-Rich');
        expect(result.exclusiveSignalType).toBe('ore_vein');
        expect(result.samples).toBe(1000);

        // Target 15-30% with wide tolerance (10-35% acceptable)
        expect(result.oreVeinRate).toBeGreaterThan(10);
        expect(result.oreVeinRate).toBeLessThan(35);

        // Verify base type mapping
        expect(result.baseType).toBe('mineral');
    });

    test('Standard sectors produce exactly 0% exclusive signals over large sample', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;

            // Create a Standard sector (no exclusiveSignalType)
            const standardType = {
                name: 'Standard',
                color: 'rgba(100, 100, 255, 0.3)',
                borderColor: '#66f',
                mineralBonus: 1.0,
                dataBonus: 1.0,
                artifactBonus: 1.0,
                probeDestructionChance: 0
                // No exclusiveSignalType property
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

            // Clear signals for isolation
            window.game.gameState.entities.signals = [];

            // Generate 1000 signal types
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
        expect(result.samples).toBe(1000);

        // Standard sectors should NEVER spawn exclusive signals (exactly 0%)
        expect(result.exclusiveCount).toBe(0);
    });

    test('each exclusive type has consistent spawn rate across sectors', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;

            // Define all 4 non-Standard sector types
            const sectorTypes = [
                {
                    name: 'Resource-Rich',
                    exclusiveSignalType: 'ore_vein',
                    color: 'rgba(255, 200, 100, 0.3)',
                    borderColor: '#fc8',
                    mineralBonus: 2.0,
                    dataBonus: 1.5,
                    artifactBonus: 1.2,
                    probeDestructionChance: 0
                },
                {
                    name: 'Data Haven',
                    exclusiveSignalType: 'data_cache',
                    color: 'rgba(100, 255, 100, 0.3)',
                    borderColor: '#6f6',
                    mineralBonus: 0.8,
                    dataBonus: 3.0,
                    artifactBonus: 1.5,
                    probeDestructionChance: 0
                },
                {
                    name: 'Ancient',
                    exclusiveSignalType: 'relic',
                    color: 'rgba(255, 100, 255, 0.3)',
                    borderColor: '#f6f',
                    mineralBonus: 1.2,
                    dataBonus: 1.8,
                    artifactBonus: 4.0,
                    probeDestructionChance: 0
                },
                {
                    name: 'Asteroid Field',
                    exclusiveSignalType: 'exotic_crystal',
                    color: 'rgba(255, 100, 100, 0.3)',
                    borderColor: '#f66',
                    mineralBonus: 3.0,
                    dataBonus: 3.0,
                    artifactBonus: 3.0,
                    probeDestructionChance: 0.1
                }
            ];

            // Test Standard sector as baseline
            const standardType = {
                name: 'Standard',
                color: 'rgba(100, 100, 255, 0.3)',
                borderColor: '#66f',
                mineralBonus: 1.0,
                dataBonus: 1.0,
                artifactBonus: 1.0,
                probeDestructionChance: 0
            };

            const rates = {};
            const samples = 500;

            // Test each non-Standard sector type
            sectorTypes.forEach((sectorType, index) => {
                const sector = {
                    x: 10 + index,
                    y: 10,
                    explored: true,
                    type: sectorType,
                    name: `Test ${sectorType.name}`,
                    stars: [],
                    outposts: [],
                    facilities: [],
                    hubs: []
                };

                let exclusiveCount = 0;

                for (let i = 0; i < samples; i++) {
                    const signalType = probeManager.determineSignalType(sector, null);
                    if (signalType === sectorType.exclusiveSignalType) {
                        exclusiveCount++;
                    }
                }

                rates[sectorType.name] = (exclusiveCount / samples) * 100;
            });

            // Test Standard sector
            const standardSector = {
                x: 20,
                y: 20,
                explored: true,
                type: standardType,
                name: 'Test Standard',
                stars: [],
                outposts: [],
                facilities: [],
                hubs: []
            };

            const exclusiveTypes = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'];
            let standardExclusiveCount = 0;

            for (let i = 0; i < samples; i++) {
                const signalType = probeManager.determineSignalType(standardSector, null);
                if (exclusiveTypes.includes(signalType)) {
                    standardExclusiveCount++;
                }
            }

            rates['Standard'] = (standardExclusiveCount / samples) * 100;

            return { rates, samples };
        });

        expect(result.samples).toBe(500);

        // All 4 non-Standard types should have spawn rates between 10-35%
        expect(result.rates['Resource-Rich']).toBeGreaterThan(10);
        expect(result.rates['Resource-Rich']).toBeLessThan(35);

        expect(result.rates['Data Haven']).toBeGreaterThan(10);
        expect(result.rates['Data Haven']).toBeLessThan(35);

        expect(result.rates['Ancient']).toBeGreaterThan(10);
        expect(result.rates['Ancient']).toBeLessThan(35);

        expect(result.rates['Asteroid Field']).toBeGreaterThan(10);
        expect(result.rates['Asteroid Field']).toBeLessThan(35);

        // Standard should be exactly 0%
        expect(result.rates['Standard']).toBe(0);
    });

    // ==========================================================
    // Distance-Based Profile Distribution Tests (2 tests)
    // ==========================================================

    test('close sectors are predominantly balanced profiles (300 samples)', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const sectorManager = window.game.sectorManager;

            // Generate 300 sectors at distance < 5 from origin
            const profileCounts = {
                'balanced': 0,
                'mineral-rich': 0,
                'data-rich': 0,
                'artifact-rich': 0,
                'probethium-rich': 0
            };
            const samples = 300;

            for (let i = 0; i < samples; i++) {
                // Create sectors in a circle of radius < 5
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * 4.5; // < 5
                const x = Math.round(radius * Math.cos(angle));
                const y = Math.round(radius * Math.sin(angle));

                const sector = sectorManager.initializeSector(x, y, true);
                const profileType = sector.resourceProfile.type;
                profileCounts[profileType]++;
            }

            const balancedPercent = (profileCounts['balanced'] / samples) * 100;
            const probethiumRichPercent = (profileCounts['probethium-rich'] / samples) * 100;

            return {
                samples,
                profileCounts,
                balancedPercent,
                probethiumRichPercent
            };
        });

        expect(result.samples).toBe(300);

        // Balanced should be > 35% at close range (target ~60%, wide tolerance)
        expect(result.balancedPercent).toBeGreaterThan(35);

        // Probethium-rich should be < 15% at close range (target ~2%, wide tolerance)
        expect(result.probethiumRichPercent).toBeLessThan(15);
    });

    test('far sectors have more specialized profiles than close sectors', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const sectorManager = window.game.sectorManager;

            // Generate 300 far sectors (distance 10-15)
            const farProfileCounts = {
                'balanced': 0,
                'mineral-rich': 0,
                'data-rich': 0,
                'artifact-rich': 0,
                'probethium-rich': 0
            };

            for (let i = 0; i < 300; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = 10 + Math.random() * 5; // 10-15
                const x = Math.round(radius * Math.cos(angle));
                const y = Math.round(radius * Math.sin(angle));

                const sector = sectorManager.initializeSector(x, y, true);
                const profileType = sector.resourceProfile.type;
                farProfileCounts[profileType]++;
            }

            // Generate 300 close sectors (distance < 5)
            const closeProfileCounts = {
                'balanced': 0,
                'mineral-rich': 0,
                'data-rich': 0,
                'artifact-rich': 0,
                'probethium-rich': 0
            };

            for (let i = 0; i < 300; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * 4.5; // < 5
                const x = Math.round(radius * Math.cos(angle));
                const y = Math.round(radius * Math.sin(angle));

                const sector = sectorManager.initializeSector(x, y, true);
                const profileType = sector.resourceProfile.type;
                closeProfileCounts[profileType]++;
            }

            const farBalancedPercent = (farProfileCounts['balanced'] / 300) * 100;
            const closeBalancedPercent = (closeProfileCounts['balanced'] / 300) * 100;

            const farProbethiumPercent = (farProfileCounts['probethium-rich'] / 300) * 100;
            const closeProbethiumPercent = (closeProfileCounts['probethium-rich'] / 300) * 100;

            return {
                farBalancedPercent,
                closeBalancedPercent,
                farProbethiumPercent,
                closeProbethiumPercent,
                farProfileCounts,
                closeProfileCounts
            };
        });

        // Far sectors should have lower balanced % than close sectors
        expect(result.farBalancedPercent).toBeLessThan(result.closeBalancedPercent);

        // Far sectors should have higher probethium-rich % than close sectors
        expect(result.farProbethiumPercent).toBeGreaterThan(result.closeProbethiumPercent);
    });

    // ==========================================================
    // Rarity Distribution Tests (2 tests)
    // ==========================================================

    test('discovery bonus exclusive signals are ~80% epic, ~20% legendary over 150 samples', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;
            const gs = window.game.gameState;

            // Create a Resource-Rich sector
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

            const rarityCounts = {
                'common': 0,
                'uncommon': 0,
                'rare': 0,
                'epic': 0,
                'legendary': 0
            };
            const samples = 150;

            for (let i = 0; i < samples; i++) {
                // Clear signals before each spawn
                gs.entities.signals = [];

                // Spawn discovery bonus signals
                probeManager.spawnDiscoveryBonusSignals(5, 5, resourceRichType);

                // Find the exclusive signal (ore_vein)
                const exclusiveSignal = gs.entities.signals.find(s => s.signalType === 'ore_vein');

                if (exclusiveSignal) {
                    rarityCounts[exclusiveSignal.rarity]++;
                }
            }

            const epicPercent = (rarityCounts['epic'] / samples) * 100;
            const legendaryPercent = (rarityCounts['legendary'] / samples) * 100;

            return {
                samples,
                rarityCounts,
                epicPercent,
                legendaryPercent
            };
        });

        expect(result.samples).toBe(150);

        // Epic should be between 55-95% (target ~80%, wide tolerance)
        expect(result.epicPercent).toBeGreaterThan(55);
        expect(result.epicPercent).toBeLessThan(95);

        // Legendary should be between 5-45% (target ~20%, wide tolerance)
        expect(result.legendaryPercent).toBeGreaterThan(5);
        expect(result.legendaryPercent).toBeLessThan(45);

        // Zero common/uncommon/rare exclusive signals
        expect(result.rarityCounts['common']).toBe(0);
        expect(result.rarityCounts['uncommon']).toBe(0);
        expect(result.rarityCounts['rare']).toBe(0);
    });

    test('standard signal rarity distribution has common as most frequent', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probeManager = window.game.probeManager;

            const rarityCounts = {
                'common': 0,
                'uncommon': 0,
                'rare': 0,
                'epic': 0,
                'legendary': 0
            };
            const samples = 500;

            // Generate 500 signal rarities (no discovery bonus, no probe)
            for (let i = 0; i < samples; i++) {
                const rarity = probeManager.determineSignalRarity(false, null);
                rarityCounts[rarity]++;
            }

            const percentages = {};
            Object.keys(rarityCounts).forEach(rarity => {
                percentages[rarity] = (rarityCounts[rarity] / samples) * 100;
            });

            // Find most and least frequent
            let mostFrequent = 'common';
            let leastFrequent = 'common';
            let maxCount = rarityCounts['common'];
            let minCount = rarityCounts['common'];

            Object.keys(rarityCounts).forEach(rarity => {
                if (rarityCounts[rarity] > maxCount) {
                    maxCount = rarityCounts[rarity];
                    mostFrequent = rarity;
                }
                if (rarityCounts[rarity] < minCount) {
                    minCount = rarityCounts[rarity];
                    leastFrequent = rarity;
                }
            });

            return {
                samples,
                rarityCounts,
                percentages,
                mostFrequent,
                leastFrequent
            };
        });

        expect(result.samples).toBe(500);

        // Common should be the most frequent (> 40% of samples)
        expect(result.mostFrequent).toBe('common');
        expect(result.percentages['common']).toBeGreaterThan(40);

        // Legendary should be the least frequent (< 10% of samples)
        expect(result.leastFrequent).toBe('legendary');
        expect(result.percentages['legendary']).toBeLessThan(10);
    });
});
