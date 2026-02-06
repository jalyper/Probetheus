/**
 * Discovery Reveal Tests
 * Tests for sector discovery modal and bonus signals (DISC-01 through DISC-04)
 *
 * Requirements covered:
 * - DISC-01: Exclusive signal info displayed in modal for each non-Standard sector type
 * - DISC-02: Resource profile section with signal richness and probethium potential bars
 * - DISC-03: Guaranteed epic/legendary exclusive signal spawns for non-Standard sectors
 * - DISC-04: Standard sectors show Open Frequency messaging
 */

const { test, expect } = require('@playwright/test');

test.describe('Discovery Reveal System', () => {
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

    /**
     * Helper to trigger sector discovery programmatically
     */
    async function triggerSectorDiscovery(page, sectorTypeName, x, y, profileOverride) {
        return page.evaluate(({ typeName, sx, sy, profile }) => {
            const sm = window.game.sectorManager;
            const world = window.game.gameState.getWorld();

            // Get sector type definition by name
            const sectorTypes = [
                { name: 'Standard', color: 'rgba(100, 100, 255, 0.3)', borderColor: '#66f', mineralBonus: 1.0, dataBonus: 1.0, artifactBonus: 1.0, probeDestructionChance: 0 },
                { name: 'Resource-Rich', color: 'rgba(255, 200, 100, 0.3)', borderColor: '#fc8', mineralBonus: 2.0, dataBonus: 1.5, artifactBonus: 1.2, exclusiveSignalType: 'ore_vein', probeDestructionChance: 0 },
                { name: 'Data Haven', color: 'rgba(100, 255, 100, 0.3)', borderColor: '#6f6', mineralBonus: 0.8, dataBonus: 3.0, artifactBonus: 1.5, exclusiveSignalType: 'data_cache', probeDestructionChance: 0 },
                { name: 'Ancient', color: 'rgba(255, 100, 255, 0.3)', borderColor: '#f6f', mineralBonus: 1.2, dataBonus: 1.8, artifactBonus: 4.0, exclusiveSignalType: 'relic', probeDestructionChance: 0 },
                { name: 'Asteroid Field', color: 'rgba(255, 100, 100, 0.3)', borderColor: '#f66', mineralBonus: 3.0, dataBonus: 3.0, artifactBonus: 3.0, exclusiveSignalType: 'exotic_crystal', probeDestructionChance: 0.1 }
            ];
            const sectorType = sectorTypes.find(t => t.name === typeName);

            // Create sector at given coordinates
            const key = `${sx},${sy}`;
            const sector = {
                x: sx, y: sy,
                explored: true,
                type: sectorType,
                name: `Test ${typeName} Sector`,
                stars: [],
                outposts: [], facilities: [], hubs: [],
                resourceProfile: profile || { type: 'balanced', spawnRateMultiplier: 1.0 }
            };
            world.sectors.set(key, sector);

            // Trigger discovery modal
            sm.showSectorDiscovery(sectorType, sector.name, sector);

            return { key, sectorType: typeName };
        }, { typeName: sectorTypeName, sx: x, sy: y, profile: profileOverride || null });
    }

    // ==========================================================
    // DISC-01: Exclusive Signal Display
    // ==========================================================

    test('DISC-01: Resource-Rich sector shows Ore Vein signal info', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Resource-Rich', 5, 5);

        // Verify modal is visible
        const modal = page.locator('#sectorModal');
        await expect(modal).toHaveClass(/active/);

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();
        const html = await page.locator('#sectorModalContent').innerHTML();

        // Verify exclusive signal info
        expect(content).toContain('Ore Vein');
        expect(content).toContain('Dense mineral formations unique to Resource-Rich sectors');
        expect(content).toContain('Yields: 2x Minerals');
        expect(html).toContain('color: #ff6600'); // Orange color
    });

    test('DISC-01: Data Haven sector shows Data Cache signal info', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Data Haven', 5, 5);

        // Verify modal is visible
        const modal = page.locator('#sectorModal');
        await expect(modal).toHaveClass(/active/);

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();
        const html = await page.locator('#sectorModalContent').innerHTML();

        // Verify exclusive signal info
        expect(content).toContain('Data Cache');
        expect(content).toContain('Concentrated data streams unique to Data Haven sectors');
        expect(content).toContain('Yields: 2x Data');
        expect(html).toContain('color: #00ddff'); // Cyan color
    });

    test('DISC-01: Ancient sector shows Relic signal info', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Ancient', 5, 5);

        // Verify modal is visible
        const modal = page.locator('#sectorModal');
        await expect(modal).toHaveClass(/active/);

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();
        const html = await page.locator('#sectorModalContent').innerHTML();

        // Verify exclusive signal info
        expect(content).toContain('Relic');
        expect(content).toContain('Ancient technology fragments unique to Ancient sectors');
        expect(content).toContain('Yields: Guaranteed Rare+ Artifacts');
        expect(html).toContain('color: #ffd700'); // Gold color
    });

    test('DISC-01: Asteroid Field sector shows Exotic Crystal signal info', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Asteroid Field', 5, 5);

        // Verify modal is visible
        const modal = page.locator('#sectorModal');
        await expect(modal).toHaveClass(/active/);

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();
        const html = await page.locator('#sectorModalContent').innerHTML();

        // Verify exclusive signal info
        expect(content).toContain('Exotic Crystal');
        expect(content).toContain('Volatile crystalline deposits unique to Asteroid Fields');
        expect(content).toContain('Yields: Exotic Minerals or Mixed Resources');
        expect(html).toContain('color: #ee82ee'); // Violet color
    });

    // ==========================================================
    // DISC-02: Resource Profile Display
    // ==========================================================

    test('DISC-02: modal shows signal richness bar with multiplier', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Standard', 5, 5, {
            type: 'balanced',
            spawnRateMultiplier: 1.0
        });

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();

        // Verify signal richness display
        expect(content).toContain('Signal Richness:');
        expect(content).toContain('1x'); // Multiplier shown

        // Check for Unicode block characters (filled and empty)
        const html = await page.locator('#sectorModalContent').innerHTML();
        expect(html).toMatch(/█+░*/); // Should have both filled and empty blocks
    });

    test('DISC-02: modal shows probethium potential for probethium-rich profile', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Standard', 5, 5, {
            type: 'probethium-rich',
            spawnRateMultiplier: 1.0
        });

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();

        // Verify probethium potential display
        expect(content).toContain('Probethium Potential:');
        expect(content).toContain('Rich'); // Rich label

        // Check for 5 filled blocks
        const html = await page.locator('#sectorModalContent').innerHTML();
        expect(html).toContain('█████░░░░░'); // 5 filled, 0 empty (before any text)
    });

    test('DISC-02: modal shows probethium potential None for mineral-rich profile', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Standard', 5, 5, {
            type: 'mineral-rich',
            spawnRateMultiplier: 1.0
        });

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();

        // Verify probethium potential display
        expect(content).toContain('Probethium Potential:');
        expect(content).toContain('None'); // None label

        // Check for 0 filled blocks
        const html = await page.locator('#sectorModalContent').innerHTML();
        expect(html).toContain('░░░░░'); // 0 filled, 5 empty
    });

    test('DISC-02: modal handles missing resource profile gracefully', async ({ page }) => {
        await startGame(page);

        // Trigger discovery without providing a profile
        await page.evaluate(() => {
            const sm = window.game.sectorManager;
            const sectorType = {
                name: 'Standard',
                color: 'rgba(100, 100, 255, 0.3)',
                borderColor: '#66f',
                mineralBonus: 1.0,
                dataBonus: 1.0,
                artifactBonus: 1.0,
                probeDestructionChance: 0
            };

            const sector = {
                x: 5, y: 5,
                explored: true,
                type: sectorType,
                name: 'Test No Profile Sector',
                stars: [],
                outposts: [], facilities: [], hubs: []
                // NO resourceProfile property
            };

            sm.showSectorDiscovery(sectorType, sector.name, sector);
        });

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();

        // Should show fallback message without crashing
        expect(content).toContain('Profile data unavailable');
    });

    // ==========================================================
    // DISC-03: Guaranteed Exclusive Signal Spawning
    // ==========================================================

    test('DISC-03: non-Standard discovery spawns epic or legendary exclusive signal', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const sm = window.game.sectorManager;
            const gs = window.game.gameState;

            // Clear existing signals
            gs.entities.signals = [];

            // Get Resource-Rich sector type
            const sectorType = {
                name: 'Resource-Rich',
                color: 'rgba(255, 200, 100, 0.3)',
                borderColor: '#fc8',
                mineralBonus: 2.0,
                dataBonus: 1.5,
                artifactBonus: 1.2,
                exclusiveSignalType: 'ore_vein',
                probeDestructionChance: 0
            };

            // Spawn discovery bonus signals
            sm.spawnDiscoveryBonusSignals(5, 5, sectorType);

            // Check for exclusive signal
            const exclusiveSignal = gs.entities.signals.find(s => s.signalType === 'ore_vein');

            return {
                totalSignals: gs.entities.signals.length,
                hasExclusiveSignal: !!exclusiveSignal,
                exclusiveRarity: exclusiveSignal ? exclusiveSignal.rarity : null,
                allSignalTypes: gs.entities.signals.map(s => s.signalType)
            };
        });

        // Verify exclusive signal was spawned
        expect(result.hasExclusiveSignal).toBe(true);
        expect(['epic', 'legendary']).toContain(result.exclusiveRarity);
        expect(result.totalSignals).toBeGreaterThan(2); // Should have ore_vein + standard bonus signals
    });

    test('DISC-03: Standard sector does not spawn exclusive bonus signal', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const sm = window.game.sectorManager;
            const gs = window.game.gameState;

            // Clear existing signals
            gs.entities.signals = [];

            // Get Standard sector type
            const sectorType = {
                name: 'Standard',
                color: 'rgba(100, 100, 255, 0.3)',
                borderColor: '#66f',
                mineralBonus: 1.0,
                dataBonus: 1.0,
                artifactBonus: 1.0,
                probeDestructionChance: 0
                // NO exclusiveSignalType
            };

            // Spawn discovery bonus signals
            sm.spawnDiscoveryBonusSignals(5, 5, sectorType);

            const exclusiveTypes = ['ore_vein', 'data_cache', 'relic', 'exotic_crystal'];
            const hasAnyExclusive = gs.entities.signals.some(s => exclusiveTypes.includes(s.signalType));

            return {
                totalSignals: gs.entities.signals.length,
                hasAnyExclusive: hasAnyExclusive,
                allSignalTypes: gs.entities.signals.map(s => s.signalType)
            };
        });

        // Verify no exclusive signals were spawned
        expect(result.hasAnyExclusive).toBe(false);
        expect(result.totalSignals).toBe(1); // Standard gets 1 uncommon mixed signal
    });

    test('DISC-03: exclusive signal is additive to existing bonus signals', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const sm = window.game.sectorManager;
            const gs = window.game.gameState;

            // Compare Resource-Rich vs Standard signal counts
            gs.entities.signals = [];
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
            sm.spawnDiscoveryBonusSignals(5, 5, resourceRichType);
            const resourceRichCount = gs.entities.signals.length;

            gs.entities.signals = [];
            const standardType = {
                name: 'Standard',
                color: 'rgba(100, 100, 255, 0.3)',
                borderColor: '#66f',
                mineralBonus: 1.0,
                dataBonus: 1.0,
                artifactBonus: 1.0,
                probeDestructionChance: 0
            };
            sm.spawnDiscoveryBonusSignals(5, 5, standardType);
            const standardCount = gs.entities.signals.length;

            return {
                resourceRichCount,
                standardCount
            };
        });

        // Resource-Rich should have more signals (standard bonus + exclusive)
        // Resource-Rich: 1 rare mineral + 1 uncommon mixed + 1 epic/legendary ore_vein = 3
        // Standard: 1 uncommon mixed = 1
        expect(result.resourceRichCount).toBe(3);
        expect(result.standardCount).toBe(1);
        expect(result.resourceRichCount).toBeGreaterThan(result.standardCount);
    });

    // ==========================================================
    // DISC-04: Standard Sector Messaging
    // ==========================================================

    test('DISC-04: Standard sector shows Open Frequency messaging', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Standard', 5, 5);

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();
        const html = await page.locator('#sectorModalContent').innerHTML();

        // Verify Open Frequency messaging
        expect(content).toContain('Open Frequency');
        expect(content).toContain('All signal types can be detected here');
        expect(content).toContain('ideal for balanced resource gathering');
        expect(content).toContain('Yields: Standard rates across all types');

        // Check for cyan color (#0ff)
        expect(html).toContain('color: #0ff');
    });

    test('DISC-04: Standard sector does not show exclusive signal names', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Standard', 5, 5);

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();

        // Should NOT contain any exclusive signal names
        expect(content).not.toContain('Ore Vein');
        expect(content).not.toContain('Data Cache');
        expect(content).not.toContain('Relic');
        expect(content).not.toContain('Exotic Crystal');
    });

    // ==========================================================
    // General Discovery Modal Tests
    // ==========================================================

    test('discovery modal button says Continue', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Standard', 5, 5);

        // Get button text
        const buttonText = await page.locator('#sectorOkBtn').textContent();

        expect(buttonText).toBe('Continue');
    });

    test('discovery log shows explored sector count and type pips', async ({ page }) => {
        await startGame(page);

        // Create 3 explored sectors of different types
        await page.evaluate(() => {
            const world = window.game.gameState.getWorld();

            const sectorTypes = [
                { name: 'Standard', color: 'rgba(100, 100, 255, 0.3)', borderColor: '#66f', mineralBonus: 1.0, dataBonus: 1.0, artifactBonus: 1.0, probeDestructionChance: 0 },
                { name: 'Resource-Rich', color: 'rgba(255, 200, 100, 0.3)', borderColor: '#fc8', mineralBonus: 2.0, dataBonus: 1.5, artifactBonus: 1.2, exclusiveSignalType: 'ore_vein', probeDestructionChance: 0 },
                { name: 'Ancient', color: 'rgba(255, 100, 255, 0.3)', borderColor: '#f6f', mineralBonus: 1.2, dataBonus: 1.8, artifactBonus: 4.0, exclusiveSignalType: 'relic', probeDestructionChance: 0 }
            ];

            sectorTypes.forEach((type, idx) => {
                const sector = {
                    x: idx, y: 0,
                    explored: true,
                    type: type,
                    name: `Sector ${idx}`,
                    stars: [],
                    outposts: [], facilities: [], hubs: [],
                    resourceProfile: { type: 'balanced', spawnRateMultiplier: 1.0 }
                };
                world.sectors.set(`${idx},0`, sector);
            });
        });

        // Trigger discovery to see the log
        await triggerSectorDiscovery(page, 'Standard', 10, 10);

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();

        // Verify discovery log content
        expect(content).toContain('Sectors Explored:');
        expect(content).toContain('Types Found:');
        expect(content).toContain('3/5'); // 3 types found out of 5
    });

    test('discovery modal shows hazard warning for Asteroid Field', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Asteroid Field', 5, 5);

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();
        const html = await page.locator('#sectorModalContent').innerHTML();

        // Verify hazard warning
        expect(content).toContain('WARNING:');
        expect(content).toContain('10% probe destruction risk'); // 0.1 * 100 = 10%

        // Check for warning color (#ff6b35)
        expect(html).toContain('color: #ff6b35');
    });

    test('discovery modal header shows sector name and type', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Resource-Rich', 5, 5);

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();
        const html = await page.locator('#sectorModalContent').innerHTML();

        // Verify header
        expect(content).toContain('SECTOR SURVEY:');
        expect(content).toContain('Test Resource-Rich Sector');
        expect(content).toContain('Resource-Rich Sector');
        expect(content).toContain('from HQ'); // Distance text
    });

    test('discovery modal awards research point', async ({ page }) => {
        await startGame(page);

        await triggerSectorDiscovery(page, 'Standard', 5, 5);

        // Get modal content
        const content = await page.locator('#sectorModalContent').textContent();
        const html = await page.locator('#sectorModalContent').innerHTML();

        // Verify research award
        expect(content).toContain('+1 Research Point Awarded');

        // Check for green color (#0f0)
        expect(html).toContain('color: #0f0');
    });
});
