/**
 * Mining Tutorial Tests
 * Tests for REQ-10 in .planning/tutorial-system-prd.md
 */

const { test, expect } = require('@playwright/test');

test.describe('Mining Operations Tutorial', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    async function startGameWithResources(page, minerals = 500, data = 200) {
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

        // Give resources
        await page.evaluate(({ minerals, data }) => {
            window.game.gameState.resources.minerals = minerals;
            window.game.gameState.resources.data = data;
            window.uiManager.updateUI();
        }, { minerals, data });
    }

    async function completePriorTutorialSteps(page) {
        // Mark all prior tutorial steps as completed so mining tutorial can trigger
        await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            if (tm && tm.steps) {
                // Complete all steps before mining tutorial
                tm.steps.forEach(step => {
                    if (['deploy_first_probe', 'click_signal', 'explore_planet',
                         'deploy_remaining_probes', 'gather_resources', 'place_hub',
                         'research_lab_unlocked', 'install_probe_equipment'].includes(step.id)) {
                        step.completed = true;
                    }
                });
            }
        });
    }

    test('mining station tutorial step exists', async ({ page }) => {
        await startGameWithResources(page);

        const stepExists = await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            return tm.steps.some(s => s.id === 'build_mining_station');
        });

        expect(stepExists).toBe(true);
    });

    test('shuttle tutorial step exists', async ({ page }) => {
        await startGameWithResources(page);

        const stepExists = await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            return tm.steps.some(s => s.id === 'build_shuttle');
        });

        expect(stepExists).toBe(true);
    });

    test('probetheum tutorial step exists', async ({ page }) => {
        await startGameWithResources(page);

        const stepExists = await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            return tm.steps.some(s => s.id === 'collect_probetheum');
        });

        expect(stepExists).toBe(true);
    });

    test('mining station tutorial triggers after having 2 hubs', async ({ page }) => {
        await startGameWithResources(page, 1000, 500);
        await completePriorTutorialSteps(page);

        // Add a second hub programmatically
        const result = await page.evaluate(() => {
            const gameState = window.game.gameState;

            // Create second hub
            const hub2 = {
                id: 'hub_test_2',
                x: 1000,
                y: 1000,
                sector: { x: 1, y: 0 },
                range: 300,
                maxProbes: 5,
                selected: false
            };
            gameState.entities.reconHubs.push(hub2);

            // Emit hub:built event
            window.game.eventBus.emit('hub:built', { hub: hub2 });

            // Check if mining tutorial is now the current step
            const tm = window.game.tutorialManager;
            const miningStepIndex = tm.steps.findIndex(s => s.id === 'build_mining_station');

            return {
                hubCount: gameState.entities.reconHubs.length,
                currentStep: tm.currentStep,
                miningStepIndex: miningStepIndex,
                isMiningStepCurrent: tm.currentStep === miningStepIndex
            };
        });

        expect(result.hubCount).toBeGreaterThanOrEqual(2);
        expect(result.isMiningStepCurrent).toBe(true);
    });

    test('shuttle tutorial triggers after building mining station', async ({ page }) => {
        await startGameWithResources(page, 1000, 500);
        await completePriorTutorialSteps(page);

        const result = await page.evaluate(() => {
            const tm = window.game.tutorialManager;

            // Mark mining station step as completed
            const miningStep = tm.steps.find(s => s.id === 'build_mining_station');
            if (miningStep) miningStep.completed = true;

            // Add a mining station
            if (!window.game.gameState.mining) {
                window.game.gameState.mining = { stations: [], shuttles: [] };
            }
            window.game.gameState.mining.stations.push({
                id: 'test_station_1',
                position: { x: 500, y: 500 },
                active: false
            });

            // Emit mining:stationBuilt event
            window.game.eventBus.emit('mining:stationBuilt', { station: window.game.gameState.mining.stations[0] });

            // Check if shuttle tutorial is now the current step
            const shuttleStepIndex = tm.steps.findIndex(s => s.id === 'build_shuttle');

            return {
                stationCount: window.game.gameState.mining.stations.length,
                currentStep: tm.currentStep,
                shuttleStepIndex: shuttleStepIndex,
                isShuttleStepCurrent: tm.currentStep === shuttleStepIndex
            };
        });

        expect(result.stationCount).toBe(1);
        expect(result.isShuttleStepCurrent).toBe(true);
    });

    test('probetheum tutorial triggers after completing shuttle step', async ({ page }) => {
        await startGameWithResources(page, 1000, 500);
        await completePriorTutorialSteps(page);

        // Set up the shuttle step state
        await page.evaluate(() => {
            const tm = window.game.tutorialManager;

            // Mark mining step as completed (prerequisite)
            const miningStep = tm.steps.find(s => s.id === 'build_mining_station');
            if (miningStep) miningStep.completed = true;

            // Set current step to shuttle step
            const shuttleStepIndex = tm.steps.findIndex(s => s.id === 'build_shuttle');
            tm.currentStep = shuttleStepIndex;
            tm.tutorialActive = true;

            // Add mining data
            if (!window.game.gameState.mining) {
                window.game.gameState.mining = { stations: [], shuttles: [] };
            }
            window.game.gameState.mining.stations.push({
                id: 'test_station_1',
                position: { x: 500, y: 500 },
                active: false
            });
            window.game.gameState.mining.shuttles.push({
                id: 'test_shuttle_1',
                stationId: 'test_station_1',
                status: 'loading'
            });

            // Simulate shuttle built event
            window.game.eventBus.emit('mining:shuttleBuilt', { shuttle: window.game.gameState.mining.shuttles[0] });

            // Simulate clicking on mining station (this completes the shuttle step)
            window.game.eventBus.emit('entity:selected', {
                entity: window.game.gameState.mining.stations[0],
                type: 'miningStation'
            });
        });

        // Wait for the 1500ms delay + 500ms buffer in nextStep() + some extra time
        await page.waitForTimeout(2500);

        // Now check if probetheum tutorial is the current step
        const result = await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            const shuttleStepIndex = tm.steps.findIndex(s => s.id === 'build_shuttle');
            const probetheumStepIndex = tm.steps.findIndex(s => s.id === 'collect_probetheum');

            return {
                shuttleCount: window.game.gameState.mining.shuttles.length,
                currentStep: tm.currentStep,
                probetheumStepIndex: probetheumStepIndex,
                isProbetheumStepCurrent: tm.currentStep === probetheumStepIndex,
                shuttleStepCompleted: tm.steps[shuttleStepIndex].completed
            };
        });

        expect(result.shuttleCount).toBe(1);
        expect(result.shuttleStepCompleted).toBe(true);
        expect(result.isProbetheumStepCurrent).toBe(true);
    });

    test('mining station tutorial completes when station is built', async ({ page }) => {
        await startGameWithResources(page, 1000, 500);
        await completePriorTutorialSteps(page);

        const result = await page.evaluate(() => {
            const tm = window.game.tutorialManager;

            // Set to mining station step
            const miningStepIndex = tm.steps.findIndex(s => s.id === 'build_mining_station');
            tm.currentStep = miningStepIndex;
            tm.tutorialActive = true;

            // Add a mining station
            if (!window.game.gameState.mining) {
                window.game.gameState.mining = { stations: [], shuttles: [] };
            }
            window.game.gameState.mining.stations.push({
                id: 'test_station_1',
                position: { x: 500, y: 500 },
                active: false
            });

            // Check step completion condition
            const step = tm.steps[miningStepIndex];
            const conditionMet = step.checkCondition();

            return {
                conditionMet: conditionMet,
                stationCount: window.game.gameState.mining.stations.length
            };
        });

        expect(result.conditionMet).toBe(true);
        expect(result.stationCount).toBe(1);
    });

    test('shuttle tutorial completes when shuttle is built AND mining station clicked', async ({ page }) => {
        await startGameWithResources(page, 1000, 500);

        const result = await page.evaluate(() => {
            const tm = window.game.tutorialManager;

            // Set to shuttle step
            const shuttleStepIndex = tm.steps.findIndex(s => s.id === 'build_shuttle');
            tm.currentStep = shuttleStepIndex;
            tm.tutorialActive = true;

            // Add a shuttle
            if (!window.game.gameState.mining) {
                window.game.gameState.mining = { stations: [], shuttles: [] };
            }
            window.game.gameState.mining.shuttles.push({
                id: 'test_shuttle_1',
                stationId: 'test_station_1',
                status: 'loading'
            });

            // Check step completion condition WITHOUT clicking mining station
            const step = tm.steps[shuttleStepIndex];
            const conditionMetWithoutClick = step.checkCondition();

            // Now simulate clicking on mining station after shuttle is built
            tm.miningStationClickedAfterShuttle = true;
            const conditionMetWithClick = step.checkCondition();

            return {
                conditionMetWithoutClick: conditionMetWithoutClick,
                conditionMetWithClick: conditionMetWithClick,
                shuttleCount: window.game.gameState.mining.shuttles.length
            };
        });

        // Should NOT complete with just shuttle built
        expect(result.conditionMetWithoutClick).toBe(false);
        // Should complete when shuttle built AND mining station clicked
        expect(result.conditionMetWithClick).toBe(true);
        expect(result.shuttleCount).toBe(1);
    });

    test('probetheum tutorial completes when probetheum is produced', async ({ page }) => {
        await startGameWithResources(page, 1000, 500);

        const result = await page.evaluate(() => {
            const tm = window.game.tutorialManager;

            // Set to probetheum step
            const probetheumStepIndex = tm.steps.findIndex(s => s.id === 'collect_probetheum');
            tm.currentStep = probetheumStepIndex;
            tm.tutorialActive = true;

            // Check condition without probetheum
            const step = tm.steps[probetheumStepIndex];
            const conditionMetWithoutProbetheum = step.checkCondition();

            // Add some probetheum
            window.game.gameState.probethium.current = 0.01;
            const conditionMetWithProbetheum = step.checkCondition();

            return {
                conditionMetWithoutProbetheum: conditionMetWithoutProbetheum,
                conditionMetWithProbetheum: conditionMetWithProbetheum,
                probetheum: window.game.gameState.probethium.current
            };
        });

        expect(result.conditionMetWithoutProbetheum).toBe(false);
        expect(result.conditionMetWithProbetheum).toBe(true);
        expect(result.probetheum).toBeGreaterThan(0);
    });

    test('shuttle tutorial does not auto-complete when triggered', async ({ page }) => {
        await startGameWithResources(page, 1000, 500);
        await completePriorTutorialSteps(page);

        const result = await page.evaluate(() => {
            const tm = window.game.tutorialManager;

            // Mark mining station step as completed
            const miningStep = tm.steps.find(s => s.id === 'build_mining_station');
            if (miningStep) miningStep.completed = true;

            // Add a mining station AND a shuttle (simulating they exist before tutorial)
            if (!window.game.gameState.mining) {
                window.game.gameState.mining = { stations: [], shuttles: [] };
            }
            window.game.gameState.mining.stations.push({
                id: 'test_station_1',
                position: { x: 500, y: 500 },
                active: false
            });
            window.game.gameState.mining.shuttles.push({
                id: 'test_shuttle_1',
                stationId: 'test_station_1',
                status: 'loading'
            });

            // Trigger shuttle tutorial
            window.game.eventBus.emit('mining:stationBuilt', { station: window.game.gameState.mining.stations[0] });

            // The shuttle step should be current but NOT completed
            const shuttleStepIndex = tm.steps.findIndex(s => s.id === 'build_shuttle');
            const shuttleStep = tm.steps[shuttleStepIndex];

            return {
                isShuttleStepCurrent: tm.currentStep === shuttleStepIndex,
                isShuttleStepCompleted: shuttleStep.completed,
                miningStationClickedAfterShuttle: tm.miningStationClickedAfterShuttle
            };
        });

        // Shuttle step should be current
        expect(result.isShuttleStepCurrent).toBe(true);
        // Shuttle step should NOT be auto-completed (needs mining station click)
        expect(result.isShuttleStepCompleted).toBe(false);
        // Flag should be reset
        expect(result.miningStationClickedAfterShuttle).toBe(false);
    });
});
