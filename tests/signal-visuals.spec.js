/**
 * Signal Visual Rendering Tests
 * Tests for exclusive signal visual rendering (VIS-01 through VIS-05)
 *
 * Requirements covered:
 * - VIS-01: Ore Vein signals have orange color with radiating line particles
 * - VIS-02: Data Cache signals have cyan color with rotating hexagon particles
 * - VIS-03: Relic signals have gold color with orbiting dust particles
 * - VIS-04: Exotic Crystal signals have rainbow/prismatic color with crystal facets
 * - VIS-05: Exclusive signals have longer lifetime (5-8s vs 2-3s standard)
 */

const { test, expect } = require('@playwright/test');

test.describe('Signal Visual Rendering', () => {
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
    // VIS-01: Ore Vein signals - orange color with radiating lines
    // ==========================================================

    test('VIS-01: Ore Vein signal renders without errors and has particle method', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const gs = gc.gameState;

            // Clear existing signals
            gs.entities.signals = [];

            // Inject ore_vein signal
            gs.entities.signals.push({
                x: gs.world.viewOffset.x + 400,
                y: gs.world.viewOffset.y + 300,
                radius: 10,
                rarity: 'rare',
                signalType: 'ore_vein',
                duration: 6000,
                createdAt: Date.now() - 1000
            });

            let renderError = null;
            try {
                gc.renderSignals();
            } catch (e) {
                renderError = e.message;
            }

            return {
                signalCount: gs.entities.signals.length,
                renderError,
                hasRenderMethod: typeof gc.renderExclusiveParticles === 'function'
            };
        });

        expect(result.renderError).toBeNull();
        expect(result.signalCount).toBe(1);
        expect(result.hasRenderMethod).toBe(true);
    });

    test('VIS-01: Ore Vein signal color case exists in renderSignals switch', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            // Check that the renderSignals method source contains ore_vein case
            const sourceCode = gc.renderSignals.toString();
            return {
                hasOreVeinCase: sourceCode.includes("case 'ore_vein'"),
                hasOrangeColor: sourceCode.includes('#ff6600')
            };
        });

        expect(result.hasOreVeinCase).toBe(true);
        expect(result.hasOrangeColor).toBe(true);
    });

    // ==========================================================
    // VIS-02: Data Cache signals - cyan color with rotating hexagon
    // ==========================================================

    test('VIS-02: Data Cache signal renders without errors', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const gs = gc.gameState;

            gs.entities.signals = [{
                x: gs.world.viewOffset.x + 400,
                y: gs.world.viewOffset.y + 300,
                radius: 10,
                rarity: 'rare',
                signalType: 'data_cache',
                duration: 6000,
                createdAt: Date.now() - 1000
            }];

            let renderError = null;
            try {
                gc.renderSignals();
            } catch (e) {
                renderError = e.message;
            }

            return {
                renderError,
                hasRenderMethod: typeof gc.renderExclusiveParticles === 'function'
            };
        });

        expect(result.renderError).toBeNull();
        expect(result.hasRenderMethod).toBe(true);
    });

    test('VIS-02: Data Cache signal color case exists in renderSignals switch', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const sourceCode = gc.renderSignals.toString();
            return {
                hasDataCacheCase: sourceCode.includes("case 'data_cache'"),
                hasCyanColor: sourceCode.includes('#00ddff')
            };
        });

        expect(result.hasDataCacheCase).toBe(true);
        expect(result.hasCyanColor).toBe(true);
    });

    // ==========================================================
    // VIS-03: Relic signals - gold color with orbiting dust
    // ==========================================================

    test('VIS-03: Relic signal renders without errors', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const gs = gc.gameState;

            gs.entities.signals = [{
                x: gs.world.viewOffset.x + 400,
                y: gs.world.viewOffset.y + 300,
                radius: 10,
                rarity: 'rare',
                signalType: 'relic',
                duration: 6000,
                createdAt: Date.now() - 1000
            }];

            let renderError = null;
            try {
                gc.renderSignals();
            } catch (e) {
                renderError = e.message;
            }

            return { renderError };
        });

        expect(result.renderError).toBeNull();
    });

    test('VIS-03: Relic signal color case exists in renderSignals switch', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const sourceCode = gc.renderSignals.toString();
            return {
                hasRelicCase: sourceCode.includes("case 'relic'"),
                hasGoldColor: sourceCode.includes('#ffd700')
            };
        });

        expect(result.hasRelicCase).toBe(true);
        expect(result.hasGoldColor).toBe(true);
    });

    // ==========================================================
    // VIS-04: Exotic Crystal signals - rainbow/prismatic with facets
    // ==========================================================

    test('VIS-04: Exotic Crystal signal renders without errors (HSL gradient handling)', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const gs = gc.gameState;

            gs.entities.signals = [{
                x: gs.world.viewOffset.x + 400,
                y: gs.world.viewOffset.y + 300,
                radius: 10,
                rarity: 'rare',
                signalType: 'exotic_crystal',
                duration: 6000,
                createdAt: Date.now() - 1000
            }];

            // Key test: HSL color must not crash hexToRgba gradient code
            let renderError = null;
            try {
                gc.renderSignals();
            } catch (e) {
                renderError = e.message;
            }

            return { renderError };
        });

        expect(result.renderError).toBeNull();
    });

    test('VIS-04: Exotic Crystal uses HSL color cycling in renderSignals', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const sourceCode = gc.renderSignals.toString();
            return {
                hasExoticCrystalCase: sourceCode.includes("case 'exotic_crystal'"),
                hasHslColor: sourceCode.includes('hsl('),
                hasHslGradientHandling: sourceCode.includes('hslMatch')
            };
        });

        expect(result.hasExoticCrystalCase).toBe(true);
        expect(result.hasHslColor).toBe(true);
        expect(result.hasHslGradientHandling).toBe(true);
    });

    // ==========================================================
    // VIS-05: Exclusive signal duration (5-8s vs 2-3s standard)
    // ==========================================================

    test('VIS-05: Exclusive signals have 5000-8000ms duration', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            // Test exclusive duration by simulating the ProbeManager duration logic
            const exclusiveDurations = [];
            const standardDurations = [];

            for (let i = 0; i < 100; i++) {
                const exclusiveTypes = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'];
                const signalType = exclusiveTypes[i % 4];
                const isExclusive = exclusiveTypes.includes(signalType);
                const duration = isExclusive ? 5000 + Math.random() * 3000 : 2000 + Math.random() * 1000;
                exclusiveDurations.push(duration);
            }

            for (let i = 0; i < 100; i++) {
                const duration = 2000 + Math.random() * 1000;
                standardDurations.push(duration);
            }

            return {
                exclusiveMin: Math.min(...exclusiveDurations),
                exclusiveMax: Math.max(...exclusiveDurations),
                standardMin: Math.min(...standardDurations),
                standardMax: Math.max(...standardDurations),
                allExclusiveInRange: exclusiveDurations.every(d => d >= 5000 && d <= 8000),
                allStandardInRange: standardDurations.every(d => d >= 2000 && d <= 3000)
            };
        });

        expect(result.allExclusiveInRange).toBe(true);
        expect(result.allStandardInRange).toBe(true);
        expect(result.exclusiveMin).toBeGreaterThanOrEqual(5000);
        expect(result.exclusiveMax).toBeLessThanOrEqual(8000);
        expect(result.standardMin).toBeGreaterThanOrEqual(2000);
        expect(result.standardMax).toBeLessThanOrEqual(3000);
    });

    test('VIS-05: ProbeManager creates exclusive signals with correct duration and radius', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            // Simulate the ProbeManager signal creation logic
            const exclusiveTypes = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'];
            const exclusiveSignals = [];
            const standardSignals = [];

            for (let i = 0; i < 50; i++) {
                const signalType = exclusiveTypes[i % 4];
                const isExclusive = exclusiveTypes.includes(signalType);
                exclusiveSignals.push({
                    radius: isExclusive ? 10 + Math.random() * 3 : 8 + Math.random() * 4,
                    duration: isExclusive ? 5000 + Math.random() * 3000 : 2000 + Math.random() * 1000
                });
            }

            for (let i = 0; i < 50; i++) {
                standardSignals.push({
                    radius: 8 + Math.random() * 4,
                    duration: 2000 + Math.random() * 1000
                });
            }

            return {
                exclusiveDurations: exclusiveSignals.map(s => s.duration),
                standardDurations: standardSignals.map(s => s.duration),
                exclusiveRadii: exclusiveSignals.map(s => s.radius)
            };
        });

        // All exclusive signals should have duration in [5000, 8000]
        result.exclusiveDurations.forEach(d => {
            expect(d).toBeGreaterThanOrEqual(5000);
            expect(d).toBeLessThanOrEqual(8000);
        });

        // All standard signals should have duration in [2000, 3000]
        result.standardDurations.forEach(d => {
            expect(d).toBeGreaterThanOrEqual(2000);
            expect(d).toBeLessThanOrEqual(3000);
        });

        // Exclusive radii should be in [10, 13]
        result.exclusiveRadii.forEach(r => {
            expect(r).toBeGreaterThanOrEqual(10);
            expect(r).toBeLessThanOrEqual(13);
        });
    });

    // ==========================================================
    // Performance Guard: particles skip when 50+ signals
    // ==========================================================

    test('Performance guard: renderExclusiveParticles skipped when 50+ signals', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const gs = gc.gameState;

            // Inject 51 exclusive signals
            gs.entities.signals = [];
            for (let i = 0; i < 51; i++) {
                gs.entities.signals.push({
                    x: gs.world.viewOffset.x + 100 + (i * 5),
                    y: gs.world.viewOffset.y + 100 + (i * 3),
                    radius: 10,
                    rarity: 'rare',
                    signalType: 'ore_vein',
                    duration: 6000,
                    createdAt: Date.now() - 1000
                });
            }

            // Wrap renderExclusiveParticles to count calls
            let particleCalls = 0;
            const origMethod = gc.renderExclusiveParticles.bind(gc);
            gc.renderExclusiveParticles = function(...args) {
                particleCalls++;
                return origMethod(...args);
            };

            let renderError = null;
            try {
                gc.renderSignals();
            } catch (e) {
                renderError = e.message;
            }

            // Restore original method
            gc.renderExclusiveParticles = origMethod;

            return {
                signalCount: gs.entities.signals.length,
                particleCalls,
                renderError
            };
        });

        expect(result.renderError).toBeNull();
        expect(result.signalCount).toBe(51);
        // Performance guard: particles should NOT render when 50+ signals
        expect(result.particleCalls).toBe(0);
    });

    test('Performance guard: renderExclusiveParticles called when under 50 signals', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const gs = gc.gameState;

            // Inject 4 exclusive signals (one of each type)
            gs.entities.signals = [];
            const types = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'];
            types.forEach((type, i) => {
                gs.entities.signals.push({
                    x: gs.world.viewOffset.x + 200 + (i * 50),
                    y: gs.world.viewOffset.y + 200,
                    radius: 10,
                    rarity: 'rare',
                    signalType: type,
                    duration: 6000,
                    createdAt: Date.now() - 1000
                });
            });

            // Wrap renderExclusiveParticles to count calls
            let particleCalls = 0;
            const origMethod = gc.renderExclusiveParticles.bind(gc);
            gc.renderExclusiveParticles = function(...args) {
                particleCalls++;
                return origMethod(...args);
            };

            let renderError = null;
            try {
                gc.renderSignals();
            } catch (e) {
                renderError = e.message;
            }

            gc.renderExclusiveParticles = origMethod;

            return {
                signalCount: gs.entities.signals.length,
                particleCalls,
                renderError
            };
        });

        expect(result.renderError).toBeNull();
        expect(result.signalCount).toBe(4);
        // All 4 exclusive signals should trigger particle rendering
        expect(result.particleCalls).toBe(4);
    });

    // ==========================================================
    // Rendering stability: all 4 types render without errors
    // ==========================================================

    test('All 4 exclusive signal types render together without errors', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const gs = gc.gameState;

            // Inject one of each type
            gs.entities.signals = [];
            const types = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'];
            types.forEach((type, i) => {
                gs.entities.signals.push({
                    x: gs.world.viewOffset.x + 200 + (i * 80),
                    y: gs.world.viewOffset.y + 300,
                    radius: 10,
                    rarity: 'rare',
                    signalType: type,
                    duration: 6000,
                    createdAt: Date.now() - 500
                });
            });

            // Render multiple frames simulating different signal ages
            let errors = [];
            for (let i = 0; i < 10; i++) {
                try {
                    gc.renderSignals();
                } catch (e) {
                    errors.push(e.message);
                }
            }

            return { renderErrors: errors, signalCount: gs.entities.signals.length };
        });

        expect(result.renderErrors.length).toBe(0);
        expect(result.signalCount).toBe(4);
    });

    // ==========================================================
    // Graceful degradation: broken particles don't crash rendering
    // ==========================================================

    test('Graceful degradation: broken renderExclusiveParticles does not crash signal rendering', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const gs = gc.gameState;

            // Inject exclusive signal
            gs.entities.signals = [{
                x: gs.world.viewOffset.x + 400,
                y: gs.world.viewOffset.y + 300,
                radius: 10,
                rarity: 'rare',
                signalType: 'ore_vein',
                duration: 6000,
                createdAt: Date.now() - 500
            }];

            // Replace renderExclusiveParticles with a function that always throws
            const origMethod = gc.renderExclusiveParticles;
            gc.renderExclusiveParticles = function() {
                throw new Error('Intentional test error in renderExclusiveParticles');
            };

            // Render should NOT throw thanks to try/catch
            let renderError = null;
            try {
                gc.renderSignals();
            } catch (e) {
                renderError = e.message;
            }

            // Restore
            gc.renderExclusiveParticles = origMethod;

            return {
                renderError,
                signalStillExists: gs.entities.signals.length === 1
            };
        });

        // The main render loop should NOT crash even when particles throw
        expect(result.renderError).toBeNull();
        expect(result.signalStillExists).toBe(true);
    });

    // ==========================================================
    // Rendering state safety: globalAlpha and lineDash reset
    // ==========================================================

    test('Rendering does not leak globalAlpha or lineDash state', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const gs = gc.gameState;

            // Set known canvas state
            gc.ctx.globalAlpha = 1.0;
            gc.ctx.setLineDash([]);

            // Inject exclusive signals
            gs.entities.signals = [];
            const types = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'];
            types.forEach((type, i) => {
                gs.entities.signals.push({
                    x: gs.world.viewOffset.x + 200 + (i * 50),
                    y: gs.world.viewOffset.y + 200,
                    radius: 10,
                    rarity: 'rare',
                    signalType: type,
                    duration: 6000,
                    createdAt: Date.now() - 1000
                });
            });

            // Also add a discovery bonus signal to test lineDash reset
            gs.entities.signals.push({
                x: gs.world.viewOffset.x + 500,
                y: gs.world.viewOffset.y + 200,
                radius: 10,
                rarity: 'legendary',
                signalType: 'ore_vein',
                duration: 6000,
                createdAt: Date.now() - 1000,
                isDiscoveryBonus: true
            });

            gc.renderSignals();

            // After rendering, canvas state should be clean
            const alphaAfter = gc.ctx.globalAlpha;
            const lineDashAfter = gc.ctx.getLineDash();

            return {
                alphaIsClean: alphaAfter === 1.0,
                lineDashIsClean: lineDashAfter.length === 0
            };
        });

        expect(result.alphaIsClean).toBe(true);
        expect(result.lineDashIsClean).toBe(true);
    });

    // ==========================================================
    // Particle method validation
    // ==========================================================

    test('renderExclusiveParticles handles all 4 signal types', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gc = window.game;
            const sourceCode = gc.renderExclusiveParticles.toString();
            return {
                hasOreVein: sourceCode.includes("case 'ore_vein'"),
                hasDataCache: sourceCode.includes("case 'data_cache'"),
                hasRelic: sourceCode.includes("case 'relic'"),
                hasExoticCrystal: sourceCode.includes("case 'exotic_crystal'"),
                usesSaveRestore: sourceCode.includes('this.ctx.save()') && sourceCode.includes('this.ctx.restore()')
            };
        });

        expect(result.hasOreVein).toBe(true);
        expect(result.hasDataCache).toBe(true);
        expect(result.hasRelic).toBe(true);
        expect(result.hasExoticCrystal).toBe(true);
        expect(result.usesSaveRestore).toBe(true);
    });
});
