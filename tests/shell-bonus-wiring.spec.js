/**
 * Shell Bonus Wiring Tests
 * Tests for foundry bonuses (miningEfficiency → 'Forge Rate', shuttleSpeed →
 * 'Freighter Speed') and hub bonus (researchSpeed) integration into gameplay
 * systems.
 *
 * Foundry era (REBUILD.md §2): mining stations and shuttles are gone. The
 * cosmetics category key stays 'miningStations' for save compatibility, but
 * the live reads moved to FoundrySystem.consumeRatePerMin() and
 * FoundrySystem.freighterSpeed(). probethiumRate has no live consumer
 * anymore (dormant) but must stay defined so owned shells aren't broken.
 */

const { test, expect } = require('@playwright/test');

test.describe('Shell Bonus Wiring - Foundry & Hub', () => {
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

    test('MBON-01: miningEfficiency (Forge Rate) shell bonus multiplies foundry conversion', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const game = window.game;
            const gs = game.gameState;
            const ss = game.shellSystem;
            const fs = game.foundrySystem;

            const hub = gs.entities.reconHubs[0];
            if (!hub) return { error: 'No hub found' };

            // Fund and build a foundry
            const r = gs.getResources();
            gs.updateResources({ ...r, minerals: 1000, data: 1000 }, game.eventBus);
            const foundry = fs.build({ position: { x: hub.x + 200, y: hub.y + 120 }, hubId: hub.id });
            if (!foundry) return { error: 'foundry build failed' };

            const baseRate = fs.consumeRatePerMin(foundry);

            // One sim-minute of forging with no bonus
            foundry.input = 100;
            fs.updateFoundry(foundry, 60000);
            const forgedNoBonus = foundry.converted;

            // Equip a shell with miningEfficiency bonus
            const shellWithBonus = Object.values(window.SHELL_CATALOG.miningStations).find(
                s => s.bonuses && s.bonuses.miningEfficiency > 0
            );
            if (shellWithBonus) {
                gs.cosmetics.ownedShells.miningStations.push(shellWithBonus.id);
                gs.cosmetics.equippedShells.miningStations = shellWithBonus.id;
            }

            const bonusValue = ss.getEntityBonus('miningStations', null, 'miningEfficiency');
            const boostedRate = fs.consumeRatePerMin(foundry);

            // The same sim-minute with the bonus equipped
            foundry.input = 100;
            foundry.output = 0;
            foundry.converted = 0;
            fs.updateFoundry(foundry, 60000);
            const forgedWithBonus = foundry.converted;

            // Cleanup
            gs.cosmetics.equippedShells.miningStations = 'default';
            fs.deleteFoundry({ foundryId: foundry.id });

            return {
                baseRate,
                boostedRate,
                bonusValue,
                forgedNoBonus,
                forgedWithBonus,
                shellFound: !!shellWithBonus
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.shellFound).toBe(true);
        expect(result.bonusValue).toBeGreaterThan(0);
        // Consumption rate (and therefore alloy output rate) scales by (1 + bonus/100)
        expect(result.boostedRate).toBeCloseTo(result.baseRate * (1 + result.bonusValue / 100), 5);
        // And a real forge tick actually produces more alloy
        expect(result.forgedWithBonus).toBeGreaterThan(result.forgedNoBonus);
        expect(result.forgedWithBonus).toBeCloseTo(result.forgedNoBonus * (1 + result.bonusValue / 100), 5);
    });

    test('MBON-01: miningEfficiency defaults to 0 with no shell equipped', async ({ page }) => {
        await startGame(page);

        const bonus = await page.evaluate(() => {
            return window.game.shellSystem.getEntityBonus('miningStations', null, 'miningEfficiency');
        });

        expect(bonus).toBe(0);
    });

    test('MBON-02: probethiumRate bonus type remains defined but dormant (no live consumer)', async ({ page }) => {
        await startGame(page);

        // Mining stations were probethiumRate's only consumer; in the foundry
        // era nothing reads it. The bonus type and catalog entries must still
        // exist so already-owned shells keep resolving and rendering.
        const result = await page.evaluate(() => {
            const gs = window.game.gameState;
            const ss = window.game.shellSystem;

            const typeInfo = window.BONUS_TYPES?.probethiumRate || null;

            const shellWithBonus = Object.values(window.SHELL_CATALOG.miningStations).find(
                s => s.bonuses && s.bonuses.probethiumRate > 0
            );

            const defaultBonus = ss.getEntityBonus('miningStations', null, 'probethiumRate');

            let equippedBonus = 0;
            if (shellWithBonus) {
                gs.cosmetics.ownedShells.miningStations.push(shellWithBonus.id);
                gs.cosmetics.equippedShells.miningStations = shellWithBonus.id;
                equippedBonus = ss.getEntityBonus('miningStations', null, 'probethiumRate');
                gs.cosmetics.equippedShells.miningStations = 'default';
            }

            return {
                typeInfo,
                shellFound: !!shellWithBonus,
                defaultBonus,
                equippedBonus
            };
        });

        expect(result.typeInfo).not.toBeNull();
        expect(result.typeInfo.unit).toBe('%');
        expect(result.shellFound).toBe(true);
        expect(result.defaultBonus).toBe(0);
        // Resolution still works for owned shells, even with no live read
        expect(result.equippedBonus).toBeGreaterThan(0);
    });

    test('MBON-03: shuttleSpeed (Freighter Speed) shell bonus increases freighter movement', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const game = window.game;
            const gs = game.gameState;
            const ss = game.shellSystem;
            const fs = game.foundrySystem;

            const hub = gs.entities.reconHubs[0];
            if (!hub) return { error: 'No hub found' };

            // Fund and build a foundry far from the hub so a freighter
            // cannot arrive within a single tick
            const r = gs.getResources();
            gs.updateResources({ ...r, minerals: 2000, data: 2000 }, game.eventBus);
            const foundry = fs.build({ position: { x: hub.x + 5000, y: hub.y }, hubId: hub.id });
            if (!foundry) return { error: 'foundry build failed' };

            const freighter = fs.buildFreighter({ foundryId: foundry.id });
            if (!freighter) return { error: 'freighter build failed' };

            const baseSpeed = fs.freighterSpeed();

            // Leg 1: outbound with no bonus
            freighter.status = 'outbound';
            freighter.cargo = { minerals: 20 };
            freighter.position = { x: hub.x, y: hub.y };
            fs.updateFreighter(freighter, 100);
            const distanceNoBonus = Math.abs(freighter.position.x - hub.x);

            // Equip a shell with shuttleSpeed bonus
            const shellWithBonus = Object.values(window.SHELL_CATALOG.miningStations).find(
                s => s.bonuses && s.bonuses.shuttleSpeed > 0
            );
            if (shellWithBonus) {
                gs.cosmetics.ownedShells.miningStations.push(shellWithBonus.id);
                gs.cosmetics.equippedShells.miningStations = shellWithBonus.id;
            }

            const bonusValue = ss.getEntityBonus('miningStations', null, 'shuttleSpeed');
            const boostedSpeed = fs.freighterSpeed();

            // Leg 2: the same trip with the bonus
            freighter.status = 'outbound';
            freighter.cargo = { minerals: 20 };
            freighter.position = { x: hub.x, y: hub.y };
            fs.updateFreighter(freighter, 100);
            const distanceWithBonus = Math.abs(freighter.position.x - hub.x);

            // Cleanup (deleteFoundry dissolves its freighters too)
            gs.cosmetics.equippedShells.miningStations = 'default';
            fs.deleteFoundry({ foundryId: foundry.id });

            return {
                baseSpeed,
                boostedSpeed,
                bonusValue,
                distanceNoBonus,
                distanceWithBonus,
                FREIGHTER_SPEED: window.GAME_CONSTANTS.FOUNDRY.FREIGHTER_SPEED,
                shellFound: !!shellWithBonus
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.shellFound).toBe(true);
        expect(result.bonusValue).toBeGreaterThan(0);
        // freighterSpeed() multiplies FREIGHTER_SPEED by (1 + bonus/100)
        expect(result.baseSpeed).toBeCloseTo(result.FREIGHTER_SPEED, 5);
        expect(result.boostedSpeed).toBeCloseTo(result.FREIGHTER_SPEED * (1 + result.bonusValue / 100), 5);
        // And the freighter actually covers more ground per tick
        expect(result.distanceWithBonus).toBeGreaterThan(result.distanceNoBonus);
        expect(result.distanceWithBonus).toBeCloseTo(result.distanceNoBonus * (1 + result.bonusValue / 100), 3);
    });

    test('HBON-01: researchSpeed shell bonus accelerates Uplink decoding', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gs = window.game.gameState;
            const ss = window.game.shellSystem;
            const sys = window.game.uplinkSystem;

            // Baseline decode rate with default shells
            const baseRate = sys.decodeRatePerMin();

            // Equip a shell with researchSpeed bonus
            const catalog = window.SHELL_CATALOG;
            const shellWithBonus = Object.values(catalog.hubs).find(
                s => s.bonuses && s.bonuses.researchSpeed > 0
            );

            if (shellWithBonus) {
                gs.cosmetics.equippedShells.hubs = shellWithBonus.id;
                gs.cosmetics.ownedShells.hubs.push(shellWithBonus.id);
            }

            const bonusValue = ss.getEntityBonus('hubs', null, 'researchSpeed');
            const boostedRate = sys.decodeRatePerMin();

            // Cleanup
            gs.cosmetics.equippedShells.hubs = 'default';

            return {
                baseRate,
                boostedRate,
                bonusValue,
                shellFound: !!shellWithBonus
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.shellFound).toBe(true);
        expect(result.bonusValue).toBeGreaterThan(0);
        // Decode rate multiplied by (1 + bonus/100)
        expect(result.boostedRate).toBeCloseTo(result.baseRate * (1 + result.bonusValue / 100), 5);
        expect(result.boostedRate).toBeGreaterThan(result.baseRate);
    });

    test('HBON-01: researchSpeed defaults to 0 with no shell equipped', async ({ page }) => {
        await startGame(page);

        const bonus = await page.evaluate(() => {
            return window.game.shellSystem.getEntityBonus('hubs', null, 'researchSpeed');
        });

        expect(bonus).toBe(0);
    });

    test('default shells produce identical behavior (no bonus effect)', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const ss = window.game.shellSystem;
            return {
                miningEff: ss.getEntityBonus('miningStations', null, 'miningEfficiency'),
                shuttleSpeed: ss.getEntityBonus('miningStations', null, 'shuttleSpeed'),
                probethiumRate: ss.getEntityBonus('miningStations', null, 'probethiumRate'),
                researchSpeed: ss.getEntityBonus('hubs', null, 'researchSpeed'),
                baseFreighterSpeed: window.game.foundrySystem.freighterSpeed(),
                FREIGHTER_SPEED: window.GAME_CONSTANTS.FOUNDRY.FREIGHTER_SPEED
            };
        });

        // All bonuses should be 0 with default shells
        expect(result.miningEff).toBe(0);
        expect(result.shuttleSpeed).toBe(0);
        expect(result.probethiumRate).toBe(0);
        expect(result.researchSpeed).toBe(0);
        // And freighterSpeed() returns the unmodified base constant
        expect(result.baseFreighterSpeed).toBeCloseTo(result.FREIGHTER_SPEED, 5);
    });
});
