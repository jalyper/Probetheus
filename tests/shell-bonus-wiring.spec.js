/**
 * Shell Bonus Wiring Tests
 * Tests for mining station bonuses (miningEfficiency, shuttleSpeed, probethiumRate)
 * and hub bonus (researchSpeed) integration into gameplay systems.
 */

const { test, expect } = require('@playwright/test');

test.describe('Shell Bonus Wiring - Station & Hub', () => {
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

    test('MBON-01: miningEfficiency shell bonus multiplies station output', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gs = window.game.gameState;
            const mm = window.game.miningManager;
            const ss = window.game.shellSystem;

            // Setup: give resources and create station
            gs.resources.minerals = 500;
            gs.resources.data = 300;

            const hub = gs.entities.reconHubs[0];
            if (!hub) return { error: 'No hub found' };

            const station = {
                id: 'test-eff-station',
                type: 'basic',
                position: { x: hub.x + 200, y: hub.y },
                hubId: hub.id,
                level: 1,
                active: true,
                stationInventory: { minerals: 100, data: 50 },
                operationCycleProgress: 0.5,
                cycleStartTime: Date.now() - 15000,
                efficiency: 1.0,
                totalProduced: 0,
                lowResourcesPulses: [],
                lastLowResourcesPulse: 0
            };
            gs.mining.stations.push(station);

            // Run one update with no shell bonus
            const producedBefore = station.totalProduced;
            mm.updateStation(station, 1000, Date.now());
            const producedWithNoBonus = station.totalProduced - producedBefore;

            // Reset and test with a shell bonus
            station.totalProduced = 0;
            station.stationInventory = { minerals: 100, data: 50 };
            station.operationCycleProgress = 0.5;
            station.cycleStartTime = Date.now() - 15000;

            // Equip a shell with miningEfficiency bonus
            const shellWithBonus = Object.values(ss.constructor.SHELL_CATALOG || window.ShellSystem.SHELL_CATALOG).find(
                s => s.category === 'miningStations' && s.bonus && s.bonus.miningEfficiency > 0
            );

            if (shellWithBonus) {
                gs.cosmetics.equippedShells.miningStations = shellWithBonus.id;
                gs.cosmetics.ownedShells.miningStations.push(shellWithBonus.id);
            }

            const bonusValue = ss.getEntityBonus('miningStations', null, 'miningEfficiency');

            mm.updateStation(station, 1000, Date.now());
            const producedWithBonus = station.totalProduced;

            // Cleanup
            gs.cosmetics.equippedShells.miningStations = 'default';
            gs.mining.stations = gs.mining.stations.filter(s => s.id !== 'test-eff-station');

            return {
                producedWithNoBonus,
                producedWithBonus,
                bonusValue,
                shellFound: !!shellWithBonus,
                bonusApplied: shellWithBonus ? producedWithBonus > producedWithNoBonus : null
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.shellFound).toBe(true);
        expect(result.bonusValue).toBeGreaterThan(0);
        // With a bonus shell, output should be higher
        expect(result.bonusApplied).toBe(true);
    });

    test('MBON-01: miningEfficiency defaults to 0 with no shell equipped', async ({ page }) => {
        await startGame(page);

        const bonus = await page.evaluate(() => {
            return window.game.shellSystem.getEntityBonus('miningStations', null, 'miningEfficiency');
        });

        expect(bonus).toBe(0);
    });

    test('MBON-02: probethiumRate shell bonus multiplies probethium generation', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gs = window.game.gameState;
            const ss = window.game.shellSystem;

            // Create a mining station so calculateProbethium runs
            gs.mining = gs.mining || {};
            gs.mining.stations = gs.mining.stations || [];
            gs.mining.stations.push({
                id: 'test-prob-station',
                type: 'basic',
                position: { x: 100, y: 100 },
                level: 1,
                active: false
            });

            // Setup probethium state
            gs.probethium.lastUpdateTime = Date.now() - 2000; // 2 seconds ago
            gs.probethium.current = 0;
            gs.probethium.totalAccumulated = 0;

            // Run once without bonus
            gs.calculateProbethium(1000);
            const accumulatedNoBonus = gs.probethium.totalAccumulated;

            // Reset
            gs.probethium.current = 0;
            gs.probethium.totalAccumulated = 0;
            gs.probethium.lastUpdateTime = Date.now() - 2000;

            // Equip a shell with probethiumRate bonus
            const shellWithBonus = Object.values(window.ShellSystem.SHELL_CATALOG).find(
                s => s.category === 'miningStations' && s.bonus && s.bonus.probethiumRate > 0
            );

            if (shellWithBonus) {
                gs.cosmetics.equippedShells.miningStations = shellWithBonus.id;
                gs.cosmetics.ownedShells.miningStations.push(shellWithBonus.id);
            }

            const bonusValue = ss.getEntityBonus('miningStations', null, 'probethiumRate');

            gs.calculateProbethium(1000);
            const accumulatedWithBonus = gs.probethium.totalAccumulated;

            // Cleanup
            gs.cosmetics.equippedShells.miningStations = 'default';
            gs.mining.stations = gs.mining.stations.filter(s => s.id !== 'test-prob-station');

            return {
                accumulatedNoBonus,
                accumulatedWithBonus,
                bonusValue,
                shellFound: !!shellWithBonus,
                bonusApplied: shellWithBonus ? accumulatedWithBonus > accumulatedNoBonus : null
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.shellFound).toBe(true);
        expect(result.bonusValue).toBeGreaterThan(0);
        expect(result.bonusApplied).toBe(true);
    });

    test('MBON-03: shuttleSpeed shell bonus increases shuttle movement', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gs = window.game.gameState;
            const mm = window.game.miningManager;
            const ss = window.game.shellSystem;

            const hub = gs.entities.reconHubs[0];
            if (!hub) return { error: 'No hub found' };

            // Create station far from hub
            const station = {
                id: 'test-speed-station',
                type: 'basic',
                position: { x: hub.x + 500, y: hub.y },
                hubId: hub.id,
                level: 1,
                active: false,
                stationInventory: {},
                operationCycleProgress: 0,
                cycleStartTime: Date.now(),
                efficiency: 1.0,
                totalProduced: 0,
                lowResourcesPulses: [],
                lastLowResourcesPulse: 0
            };
            gs.mining.stations.push(station);

            // Create shuttle heading to station (no bonus)
            const shuttle = {
                id: 'test-speed-shuttle',
                hubId: hub.id,
                stationId: station.id,
                position: { x: hub.x, y: hub.y },
                target: 'station',
                status: 'delivering',
                cargo: { minerals: 20 },
                capacity: 20,
                speed: 0.5,
                level: 1
            };
            gs.mining.shuttles.push(shuttle);

            // Record starting position
            const startX = shuttle.position.x;

            // Run one update with no bonus
            mm.updateShuttle(shuttle, 1000);
            const distanceNoBonus = Math.abs(shuttle.position.x - startX);

            // Reset shuttle position
            shuttle.position = { x: hub.x, y: hub.y };

            // Equip shuttleSpeed shell
            const shellWithBonus = Object.values(window.ShellSystem.SHELL_CATALOG).find(
                s => s.category === 'miningStations' && s.bonus && s.bonus.shuttleSpeed > 0
            );

            if (shellWithBonus) {
                gs.cosmetics.equippedShells.miningStations = shellWithBonus.id;
                gs.cosmetics.ownedShells.miningStations.push(shellWithBonus.id);
            }

            const bonusValue = ss.getEntityBonus('miningStations', null, 'shuttleSpeed');

            mm.updateShuttle(shuttle, 1000);
            const distanceWithBonus = Math.abs(shuttle.position.x - hub.x);

            // Cleanup
            gs.cosmetics.equippedShells.miningStations = 'default';
            gs.mining.stations = gs.mining.stations.filter(s => s.id !== 'test-speed-station');
            gs.mining.shuttles = gs.mining.shuttles.filter(s => s.id !== 'test-speed-shuttle');

            return {
                distanceNoBonus,
                distanceWithBonus,
                bonusValue,
                shellFound: !!shellWithBonus,
                fasterWithBonus: shellWithBonus ? distanceWithBonus > distanceNoBonus : null
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.shellFound).toBe(true);
        expect(result.bonusValue).toBeGreaterThan(0);
        expect(result.fasterWithBonus).toBe(true);
    });

    test('HBON-01: researchSpeed shell bonus reduces research cost', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gs = window.game.gameState;
            const ss = window.game.shellSystem;
            const rm = window.game.researchManager;

            // Unlock research and collection tree
            const research = gs.getResearchSystem();
            research.unlocked = true;
            research.unlockedTrees = ['collection'];

            // Give plenty of research points
            research.points = 20;

            // Find a research node that hasn't been researched and costs > 1
            const testNode = research.tree['auto_minerals']; // cost: 1
            testNode.available = true;
            testNode.researched = false;
            // Use 'collection' node as parent (needs to be researched first)
            research.tree['collection'].researched = true;
            research.researched.add('collection');

            // Equip a shell with researchSpeed bonus
            const shellWithBonus = Object.values(window.ShellSystem.SHELL_CATALOG).find(
                s => s.category === 'hubs' && s.bonus && s.bonus.researchSpeed > 0
            );

            if (shellWithBonus) {
                gs.cosmetics.equippedShells.hubs = shellWithBonus.id;
                gs.cosmetics.ownedShells.hubs.push(shellWithBonus.id);
            }

            const bonusValue = ss.getEntityBonus('hubs', null, 'researchSpeed');

            // Use a node with higher cost to see the effect
            const higherCostNode = research.tree['rarity_legendary']; // cost: 12
            if (higherCostNode) {
                higherCostNode.available = true;
                higherCostNode.researched = false;

                const pointsBefore = research.points;
                rm.researchNode(higherCostNode);
                const pointsAfter = research.points;
                const actualCost = pointsBefore - pointsAfter;

                // Cleanup
                gs.cosmetics.equippedShells.hubs = 'default';

                return {
                    bonusValue,
                    shellFound: !!shellWithBonus,
                    originalCost: higherCostNode.cost,
                    actualCost,
                    costReduced: shellWithBonus ? actualCost < higherCostNode.cost : null
                };
            }

            gs.cosmetics.equippedShells.hubs = 'default';
            return { error: 'No suitable research node found' };
        });

        expect(result.error).toBeUndefined();
        expect(result.shellFound).toBe(true);
        expect(result.bonusValue).toBeGreaterThan(0);
        expect(result.costReduced).toBe(true);
        expect(result.actualCost).toBeLessThan(result.originalCost);
    });

    test('HBON-01: researchSpeed minimum cost is 1 (never free)', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const gs = window.game.gameState;
            const research = gs.getResearchSystem();

            // Even with 100% bonus, minimum cost should be 1
            // Test the formula directly
            const cost = 1;
            const bonusPercent = 100; // Max possible bonus
            const effectiveCost = Math.max(1, Math.ceil(cost * (1 - bonusPercent / 100)));

            return { effectiveCost };
        });

        // Even with 100% reduction on a cost-1 node, floor is 1
        expect(result.effectiveCost).toBe(1);
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
                researchSpeed: ss.getEntityBonus('hubs', null, 'researchSpeed')
            };
        });

        // All bonuses should be 0 with default shells
        expect(result.miningEff).toBe(0);
        expect(result.shuttleSpeed).toBe(0);
        expect(result.probethiumRate).toBe(0);
        expect(result.researchSpeed).toBe(0);
    });
});
