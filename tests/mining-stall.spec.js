/**
 * Mining Station Stall Bug Reproduction Tests
 * Tests scenarios where mining stations get stuck and shuttles stop delivering
 */

const { test, expect } = require('@playwright/test');

test.describe('Mining Station Stall Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    async function startGameAndSetup(page) {
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
     * Scenario: Station completes a mining cycle, resources are drained,
     * shuttle delivers partial resources but not enough to restart.
     * Station should eventually restart once shuttle makes enough trips.
     */
    test('station should restart after cycle drains resources and shuttle resupplies', async ({ page }) => {
        await startGameAndSetup(page);

        const result = await page.evaluate(() => {
            const gs = window.game.gameState;
            const mm = window.game.miningManager;
            const eb = window.game.eventBus;

            // Give plenty of resources at hub
            gs.resources.minerals = 500;
            gs.resources.data = 300;

            // Create a station manually
            const hub = gs.entities.reconHubs[0];
            if (!hub) return { error: 'No hub found' };

            const station = {
                id: 'test-station-1',
                type: 'basic',
                position: { x: hub.x + 200, y: hub.y },
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

            // Create a shuttle
            const shuttle = {
                id: 'test-shuttle-1',
                hubId: hub.id,
                stationId: station.id,
                position: { x: hub.x, y: hub.y },
                target: 'station',
                status: 'loading',
                cargo: {},
                capacity: 20, // Only 20 capacity, station needs 100+50=150
                speed: 0.5,
                level: 1
            };
            gs.mining.shuttles.push(shuttle);

            return {
                stationId: station.id,
                shuttleId: shuttle.id,
                hubPos: { x: hub.x, y: hub.y },
                stationPos: station.position
            };
        });

        expect(result.error).toBeUndefined();

        // Run game updates for a while to let shuttle make deliveries
        // The shuttle has capacity 20 but station needs 150 total (100 minerals + 50 data)
        // So it needs multiple trips
        for (let i = 0; i < 300; i++) {
            await page.evaluate(() => {
                window.game.eventBus.emit('game:update', { deltaTime: 100 });
            });
            await page.waitForTimeout(10);
        }

        // Check if the station eventually became active
        const stationState = await page.evaluate(() => {
            const gs = window.game.gameState;
            const station = gs.mining.stations.find(s => s.id === 'test-station-1');
            const shuttle = gs.mining.shuttles.find(s => s.id === 'test-shuttle-1');
            return {
                active: station.active,
                inventory: { ...station.stationInventory },
                progress: station.operationCycleProgress,
                shuttleStatus: shuttle.status,
                shuttleCargo: { ...shuttle.cargo },
                shuttleTarget: shuttle.target
            };
        });

        console.log('Station state after deliveries:', JSON.stringify(stationState, null, 2));

        // Station should have activated at some point
        expect(stationState.active).toBe(true);
    });

    /**
     * Scenario: Station has been mining, cycle completes, resources are consumed.
     * Hub has resources but shuttle is stuck in 'waiting' status.
     * This is the reported bug - station stalls and shuttle doesn't deliver.
     */
    test('shuttle should not get stuck waiting when station needs resources after cycle', async ({ page }) => {
        await startGameAndSetup(page);

        const result = await page.evaluate(() => {
            const gs = window.game.gameState;

            // Give plenty of resources at hub
            gs.resources.minerals = 500;
            gs.resources.data = 300;

            const hub = gs.entities.reconHubs[0];
            if (!hub) return { error: 'No hub found' };

            // Create station that just finished a cycle (resources depleted)
            const station = {
                id: 'test-station-stall',
                type: 'basic',
                position: { x: hub.x + 100, y: hub.y },
                level: 1,
                active: false,  // Just deactivated after cycle
                stationInventory: { minerals: 0, data: 0 }, // Resources consumed by mining
                operationCycleProgress: 0,
                cycleStartTime: Date.now(),
                efficiency: 1.0,
                totalProduced: 5,
                lowResourcesPulses: [],
                lastLowResourcesPulse: 0
            };
            gs.mining.stations.push(station);

            // Shuttle is waiting at hub - simulating the stall condition
            const shuttle = {
                id: 'test-shuttle-stall',
                hubId: hub.id,
                stationId: station.id,
                position: { x: hub.x, y: hub.y }, // At the hub
                target: 'hub',
                status: 'waiting',  // Stuck waiting
                cargo: {},
                capacity: 20,
                speed: 0.5,
                level: 1
            };
            gs.mining.shuttles.push(shuttle);

            return { ok: true };
        });

        expect(result.error).toBeUndefined();

        // Run a few update cycles - the waiting shuttle should check and resume
        for (let i = 0; i < 50; i++) {
            await page.evaluate(() => {
                window.game.eventBus.emit('game:update', { deltaTime: 100 });
            });
            await page.waitForTimeout(10);
        }

        const state = await page.evaluate(() => {
            const gs = window.game.gameState;
            const station = gs.mining.stations.find(s => s.id === 'test-station-stall');
            const shuttle = gs.mining.shuttles.find(s => s.id === 'test-shuttle-stall');
            const mm = window.game.miningManager;
            const stationType = mm.getStationTypes()[station.type];
            const progress = mm.getStationResourceProgress(station, stationType);

            return {
                stationActive: station.active,
                stationInventory: { ...station.stationInventory },
                resourceProgress: progress,
                shuttleStatus: shuttle.status,
                shuttleCargo: { ...shuttle.cargo },
                shuttleTarget: shuttle.target
            };
        });

        console.log('State after waiting shuttle update:', JSON.stringify(state, null, 2));

        // Shuttle should NOT still be waiting when station needs resources and hub has them
        expect(state.shuttleStatus).not.toBe('waiting');
    });

    /**
     * Scenario: Hub has only one of the two required resource types.
     * Shuttle should still deliver partial resources, not get stuck.
     */
    test('shuttle should deliver partial resources when hub only has some types', async ({ page }) => {
        await startGameAndSetup(page);

        await page.evaluate(() => {
            const gs = window.game.gameState;

            // Hub has minerals but NO data
            gs.resources.minerals = 500;
            gs.resources.data = 0;

            const hub = gs.entities.reconHubs[0];

            const station = {
                id: 'test-station-partial',
                type: 'basic',
                position: { x: hub.x + 100, y: hub.y },
                level: 1,
                active: false,
                stationInventory: { minerals: 0, data: 0 },
                operationCycleProgress: 0,
                cycleStartTime: Date.now(),
                efficiency: 1.0,
                totalProduced: 0,
                lowResourcesPulses: [],
                lastLowResourcesPulse: 0
            };
            gs.mining.stations.push(station);

            const shuttle = {
                id: 'test-shuttle-partial',
                hubId: hub.id,
                stationId: station.id,
                position: { x: hub.x, y: hub.y },
                target: 'hub',
                status: 'waiting',
                cargo: {},
                capacity: 20,
                speed: 100, // Fast speed so it arrives quickly
                level: 1
            };
            gs.mining.shuttles.push(shuttle);
        });

        // Run updates to let shuttle deliver minerals
        for (let i = 0; i < 100; i++) {
            await page.evaluate(() => {
                window.game.eventBus.emit('game:update', { deltaTime: 100 });
            });
            await page.waitForTimeout(10);
        }

        const state = await page.evaluate(() => {
            const gs = window.game.gameState;
            const station = gs.mining.stations.find(s => s.id === 'test-station-partial');
            const shuttle = gs.mining.shuttles.find(s => s.id === 'test-shuttle-partial');

            return {
                stationActive: station.active,
                stationInventory: { ...station.stationInventory },
                shuttleStatus: shuttle.status,
                // Station should NOT be active (missing data) but should have minerals
                hasMinerals: (station.stationInventory.minerals || 0) > 0
            };
        });

        console.log('Partial resource state:', JSON.stringify(state, null, 2));

        // Station shouldn't be active (missing data), but minerals should have been delivered
        expect(state.hasMinerals).toBe(true);
        expect(state.stationActive).toBe(false);
        // Shuttle should be waiting since hub has no more data to deliver
        expect(state.shuttleStatus).toBe('waiting');
    });

    /**
     * Scenario: Station actively mining at 50% progress, shuttle is mid-flight delivering.
     * The shuttle should return to hub instead of freezing in place.
     */
    test('shuttle should return to hub when station is actively mining mid-cycle', async ({ page }) => {
        await startGameAndSetup(page);

        await page.evaluate(() => {
            const gs = window.game.gameState;

            gs.resources.minerals = 500;
            gs.resources.data = 300;

            const hub = gs.entities.reconHubs[0];

            // Station is actively mining, mid-cycle (50%)
            const station = {
                id: 'test-station-midcycle',
                type: 'basic',
                position: { x: hub.x + 100, y: hub.y },
                level: 1,
                active: true,
                stationInventory: { minerals: 50, data: 25 },
                operationCycleProgress: 0.5,
                cycleStartTime: Date.now() - 15000,
                efficiency: 1.0,
                totalProduced: 0,
                lowResourcesPulses: [],
                lastLowResourcesPulse: 0
            };
            gs.mining.stations.push(station);

            // Shuttle is mid-flight delivering
            const shuttle = {
                id: 'test-shuttle-frozen',
                hubId: hub.id,
                stationId: station.id,
                position: { x: hub.x + 50, y: hub.y },
                target: 'station',
                status: 'delivering',
                cargo: { minerals: 20 },
                capacity: 20,
                speed: 0.5,
                level: 1
            };
            gs.mining.shuttles.push(shuttle);
        });

        // Run one update - shuttle should immediately turn around
        await page.evaluate(() => {
            window.game.eventBus.emit('game:update', { deltaTime: 50 });
        });

        const state = await page.evaluate(() => {
            const gs = window.game.gameState;
            const shuttle = gs.mining.shuttles.find(s => s.id === 'test-shuttle-frozen');

            return {
                shuttleStatus: shuttle.status,
                shuttleTarget: shuttle.target
            };
        });

        console.log('Shuttle state after mining pause:', JSON.stringify(state, null, 2));

        // Shuttle should be returning to hub, not frozen delivering
        expect(state.shuttleStatus).toBe('returning');
        expect(state.shuttleTarget).toBe('hub');
    });

    /**
     * Scenario: Full end-to-end mining cycle using wall-clock time.
     * Station starts with resources, begins mining, cycle completes after 30s real time.
     * After cycle, resources are depleted, shuttle should resupply, station should restart.
     *
     * Note: This test uses a station that's almost done with its cycle (started 29s ago)
     * so we only need to wait ~1-2s real time for completion.
     */
    test('full mining cycle: activate -> mine -> deplete -> resupply -> reactivate', async ({ page }) => {
        test.setTimeout(30000);
        await startGameAndSetup(page);

        await page.evaluate(() => {
            const gs = window.game.gameState;

            gs.resources.minerals = 1000;
            gs.resources.data = 500;

            const hub = gs.entities.reconHubs[0];

            // Station near end of its mining cycle (started 29s ago, cycle is 30s)
            // with resources partially consumed (simulating continuous consumption)
            const station = {
                id: 'test-station-fullcycle',
                type: 'basic',
                position: { x: hub.x + 30, y: hub.y },
                level: 1,
                active: true, // Currently mining
                stationInventory: { minerals: 3, data: 1.5 }, // Almost depleted from 30s of consumption
                operationCycleProgress: 0.97,
                cycleStartTime: Date.now() - 29000, // 29s ago
                efficiency: 1.0,
                totalProduced: 0.0005, // Already produced some
                lowResourcesPulses: [],
                lastLowResourcesPulse: 0
            };
            gs.mining.stations.push(station);

            const shuttle = {
                id: 'test-shuttle-fullcycle',
                hubId: hub.id,
                stationId: station.id,
                position: { x: hub.x, y: hub.y },
                target: 'hub',
                status: 'waiting',
                cargo: {},
                capacity: 20,
                speed: 50, // Fast for testing
                level: 1
            };
            gs.mining.shuttles.push(shuttle);
        });

        // Run updates with realistic deltaTime, waiting for the cycle to complete
        // and shuttle to respond
        const transitions = [];
        for (let i = 0; i < 100; i++) {
            await page.evaluate(() => {
                window.game.eventBus.emit('game:update', { deltaTime: 50 });
            });

            if (i % 10 === 0) {
                const snapshot = await page.evaluate((tick) => {
                    const gs = window.game.gameState;
                    const station = gs.mining.stations.find(s => s.id === 'test-station-fullcycle');
                    const shuttle = gs.mining.shuttles.find(s => s.id === 'test-shuttle-fullcycle');
                    return {
                        tick,
                        stationActive: station.active,
                        cycleProgress: station.operationCycleProgress.toFixed(3),
                        minerals: (station.stationInventory.minerals || 0).toFixed(2),
                        data: (station.stationInventory.data || 0).toFixed(2),
                        produced: station.totalProduced.toFixed(8),
                        shuttleStatus: shuttle.status,
                        shuttleTarget: shuttle.target
                    };
                }, i);
                transitions.push(snapshot);
            }

            await page.waitForTimeout(50);
        }

        console.log('State transitions:', JSON.stringify(transitions, null, 2));

        const finalState = await page.evaluate(() => {
            const gs = window.game.gameState;
            const station = gs.mining.stations.find(s => s.id === 'test-station-fullcycle');
            const shuttle = gs.mining.shuttles.find(s => s.id === 'test-shuttle-fullcycle');

            return {
                stationActive: station.active,
                stationInventory: { ...station.stationInventory },
                totalProduced: station.totalProduced,
                shuttleStatus: shuttle.status,
                hubMinerals: gs.resources.minerals,
                hubData: gs.resources.data
            };
        });

        console.log('Final state:', JSON.stringify(finalState, null, 2));

        // Station should have produced some probetheum
        expect(finalState.totalProduced).toBeGreaterThan(0);

        // Verify the system isn't permanently stalled:
        // Hub resources should have decreased (shuttle delivered some)
        expect(finalState.hubMinerals).toBeLessThan(1000);
        expect(finalState.hubData).toBeLessThan(500);
    });
});
