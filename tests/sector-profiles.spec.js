/**
 * Sector Resource Profiles Tests
 * Tests for sector resource profiles (PROF-01 through PROF-06)
 *
 * Requirements covered:
 * - PROF-01: Resource profile assignment on sector discovery
 * - PROF-02: Profile affects spawn rates via multipliers
 * - PROF-03: Distance-weighted distribution (balanced near, specialized far)
 * - PROF-04: Lucky early probethium-rich finds possible
 * (PROF-05/PROF-06 — mining station output by profile — retired with the
 *  mining system; the Foundry is profile-agnostic. See tests/foundry.spec.js.)
 */

const { test, expect } = require('@playwright/test');

test.describe('Sector Resource Profiles', () => {
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
    // PROF-01: Profile assignment on discovery
    // ==========================================================

    test('PROF-01: newly discovered sector receives a resourceProfile', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const game = window.game;
            const sectorManager = game.sectorManager;

            // Create a new sector via initializeSector
            const sector = sectorManager.initializeSector(5, 5, true);

            return {
                hasProfile: !!sector.resourceProfile,
                hasType: !!sector.resourceProfile?.type,
                hasSpawnRateMultiplier: typeof sector.resourceProfile?.spawnRateMultiplier === 'number',
                hasAssignedDistance: typeof sector.resourceProfile?.assignedDistance === 'number',
                profileType: sector.resourceProfile?.type,
                spawnRateMultiplier: sector.resourceProfile?.spawnRateMultiplier
            };
        });

        expect(result.hasProfile).toBe(true);
        expect(result.hasType).toBe(true);
        expect(result.hasSpawnRateMultiplier).toBe(true);
        expect(result.hasAssignedDistance).toBe(true);
        expect(['balanced', 'mineral-rich', 'data-rich', 'artifact-rich', 'probethium-rich']).toContain(result.profileType);
    });

    test('PROF-01: resourceProfile type is one of the five valid types', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const game = window.game;
            const sectorManager = game.sectorManager;
            const validTypes = ['balanced', 'mineral-rich', 'data-rich', 'artifact-rich', 'probethium-rich'];

            // Generate 20 sectors to test variety
            const profiles = [];
            for (let i = 0; i < 20; i++) {
                const x = Math.floor(Math.random() * 20) - 10;
                const y = Math.floor(Math.random() * 20) - 10;
                const sector = sectorManager.initializeSector(x, y, true);
                profiles.push(sector.resourceProfile.type);
            }

            return {
                allValid: profiles.every(type => validTypes.includes(type)),
                profiles: profiles,
                uniqueTypes: [...new Set(profiles)]
            };
        });

        expect(result.allValid).toBe(true);
        expect(result.uniqueTypes.length).toBeGreaterThan(1); // Should have variety
    });

    test('PROF-01: existing sector without profile gets one on discovery', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const game = window.game;
            const world = game.gameState.getWorld();
            const sectorManager = game.sectorManager;

            // Manually create a sector without resourceProfile
            const x = 10, y = 10;
            const key = `${x},${y}`;
            const sectorWithoutProfile = {
                x, y,
                explored: false,
                type: 'Standard',
                name: 'Test Sector',
                stars: [],
                outposts: [],
                facilities: [],
                hubs: []
                // Intentionally no resourceProfile
            };
            world.sectors.set(key, sectorWithoutProfile);

            // Trigger discovery (which should assign a profile)
            sectorManager.discoverSector(x, y);

            // Check if profile was assigned
            const sector = world.sectors.get(key);
            return {
                hadProfileBefore: false, // We know it didn't
                hasProfileAfter: !!sector.resourceProfile,
                profileType: sector.resourceProfile?.type
            };
        });

        expect(result.hadProfileBefore).toBe(false);
        expect(result.hasProfileAfter).toBe(true);
        expect(['balanced', 'mineral-rich', 'data-rich', 'artifact-rich', 'probethium-rich']).toContain(result.profileType);
    });

    // ==========================================================
    // PROF-02: Profile affects spawn rates
    // ==========================================================

    test('PROF-02: spawn rate multiplier is correct for each profile type', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const game = window.game;
            const sectorManager = game.sectorManager;

            // Generate sectors and collect profiles with their multipliers
            const profileMultipliers = {};

            // Generate many sectors to ensure we get all types
            for (let i = 0; i < 100; i++) {
                const x = Math.floor(Math.random() * 30) - 15;
                const y = Math.floor(Math.random() * 30) - 15;
                const sector = sectorManager.initializeSector(x, y, true);
                const type = sector.resourceProfile.type;
                const multiplier = sector.resourceProfile.spawnRateMultiplier;

                if (!profileMultipliers[type]) {
                    profileMultipliers[type] = multiplier;
                }
            }

            return { profileMultipliers };
        });

        // Verify correct multipliers for each type
        expect(result.profileMultipliers['balanced']).toBe(1.0);
        expect(result.profileMultipliers['mineral-rich']).toBe(1.5);
        expect(result.profileMultipliers['data-rich']).toBe(1.5);
        expect(result.profileMultipliers['artifact-rich']).toBe(1.5);
        expect(result.profileMultipliers['probethium-rich']).toBe(0.8);
    });

    // ==========================================================
    // PROF-03: Distance-weighted distribution
    // ==========================================================

    test('PROF-03: close sectors are mostly balanced', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const game = window.game;
            const sectorManager = game.sectorManager;

            // Generate 200 sectors at distance < 5
            const profiles = [];
            for (let i = 0; i < 200; i++) {
                // Create sectors in a circle of radius < 5
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * 4.5; // < 5
                const x = Math.round(radius * Math.cos(angle));
                const y = Math.round(radius * Math.sin(angle));

                const sector = sectorManager.initializeSector(x, y, true);
                profiles.push(sector.resourceProfile.type);
            }

            // Count each type
            const counts = {};
            profiles.forEach(type => {
                counts[type] = (counts[type] || 0) + 1;
            });

            return {
                total: profiles.length,
                counts: counts,
                balancedPercent: (counts['balanced'] || 0) / profiles.length * 100
            };
        });

        // Balanced should be > 40% at close range (weight is 60%, but RNG)
        expect(result.balancedPercent).toBeGreaterThan(40);
        expect(result.total).toBe(200);
    });

    test('PROF-03: far sectors have more specialized profiles', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const game = window.game;
            const sectorManager = game.sectorManager;

            // Generate 200 sectors at distance > 10
            const profiles = [];
            for (let i = 0; i < 200; i++) {
                // Create sectors in a ring between radius 10-15
                const angle = Math.random() * 2 * Math.PI;
                const radius = 10 + Math.random() * 5; // 10-15
                const x = Math.round(radius * Math.cos(angle));
                const y = Math.round(radius * Math.sin(angle));

                const sector = sectorManager.initializeSector(x, y, true);
                profiles.push(sector.resourceProfile.type);
            }

            // Count each type
            const counts = {};
            profiles.forEach(type => {
                counts[type] = (counts[type] || 0) + 1;
            });

            return {
                total: profiles.length,
                counts: counts,
                balancedPercent: (counts['balanced'] || 0) / profiles.length * 100,
                specializedPercent: ((counts['mineral-rich'] || 0) +
                                     (counts['data-rich'] || 0) +
                                     (counts['artifact-rich'] || 0) +
                                     (counts['probethium-rich'] || 0)) / profiles.length * 100
            };
        });

        // Balanced should be < 50% at far range (weight is 30%, but RNG)
        expect(result.balancedPercent).toBeLessThan(50);
        // Specialized types should dominate
        expect(result.specializedPercent).toBeGreaterThan(50);
        expect(result.total).toBe(200);
    });

    // ==========================================================
    // PROF-04: Lucky early finds
    // ==========================================================

    test('PROF-04: probethium-rich sectors possible at any distance', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const game = window.game;
            const sectorManager = game.sectorManager;

            // Generate 500 sectors at distance < 5 (where probethium-rich is 2% weight)
            const profiles = [];
            for (let i = 0; i < 500; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const radius = Math.random() * 4.5; // < 5
                const x = Math.round(radius * Math.cos(angle));
                const y = Math.round(radius * Math.sin(angle));

                const sector = sectorManager.initializeSector(x, y, true);
                profiles.push(sector.resourceProfile.type);
            }

            // Count probethium-rich
            const probethiumRichCount = profiles.filter(type => type === 'probethium-rich').length;

            return {
                total: profiles.length,
                probethiumRichCount: probethiumRichCount,
                probethiumRichPercent: probethiumRichCount / profiles.length * 100
            };
        });

        // At least 1 probethium-rich sector should spawn (2% weight)
        expect(result.probethiumRichCount).toBeGreaterThan(0);
        expect(result.total).toBe(500);
    });


    // PROF-05/PROF-06 (mining station output by sector profile) were retired
    // with the mining station system - the Foundry (REBUILD.md \xc2\xa72) converts
    // minerals to alloy regardless of sector. See tests/foundry.spec.js.
});
