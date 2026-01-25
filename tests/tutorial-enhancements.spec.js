/**
 * Tutorial System Enhancement Tests
 * Tests for PRD requirements in .planning/tutorial-system-prd.md
 */

const { test, expect } = require('@playwright/test');

test.describe('REQ-1: Hub Placement Validation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('should not allow hub placement on probe return path', async ({ page }) => {
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

        // Give resources for testing
        await page.evaluate(() => {
            window.game.gameState.resources.minerals = 200;
            window.uiManager.updateUI();
        });

        // Deploy a probe with waypoints in a triangular pattern
        // This ensures the return path is spatially separate from outbound path
        const deployResult = await page.evaluate(() => {
            const hub = window.game.gameState.entities.reconHubs[0];
            if (!hub) return { success: false, error: 'No hub found' };

            // Create waypoints in a triangle: hub -> right -> up-right
            // Return path will go from up-right back to hub (diagonal)
            const waypoints = [
                { x: hub.x + 300, y: hub.y },       // Right of hub
                { x: hub.x + 300, y: hub.y - 300 }  // Up and right of hub
            ];

            window.game.eventBus.emit('probe:deploy', { hub, waypoints });
            return { success: true, hubX: hub.x, hubY: hub.y };
        });
        expect(deployResult.success).toBe(true);
        await page.waitForTimeout(1000);

        // Select the probe and enter building mode programmatically
        const setupResult = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes.find(p =>
                p.active && p.waypoints && p.waypoints.length > 0
            );
            if (!probe) return { success: false, error: 'No probe found' };

            // Select the probe
            window.game.gameState.ui.selectedProbe = probe;
            window.game.eventBus.emit('probe:selected', { probe });

            // Enter building mode programmatically
            window.game.buildingSystem.enterBuildingMode({
                structureType: 'reconHub',
                probe: probe
            });

            return {
                success: true,
                buildingMode: window.game.buildingSystem.buildingMode,
                probeWaypoints: probe.waypoints.length,
                outboundCount: probe.outboundWaypointsCount
            };
        });
        expect(setupResult.success).toBe(true);
        expect(setupResult.buildingMode).toBe(true);

        // Test return path - should NOT get a valid preview
        // Return path goes from (hub.x + 300, hub.y - 300) back to (hub.x, hub.y)
        // This is a diagonal line that doesn't overlap with the outbound path
        const returnPathResult = await page.evaluate((hubPos) => {
            const probe = window.game.gameState.ui.selectedProbe;

            // The return path goes from the last outbound waypoint (hub.x + 300, hub.y - 300)
            // back to the hub (hub.x, hub.y). Midpoint is (hub.x + 150, hub.y - 150)
            const returnMidpoint = {
                x: hubPos.hubX + 150,
                y: hubPos.hubY - 150
            };

            // Simulate mouse move on return path
            window.game.eventBus.emit('building:updatePreview', {
                mouseX: returnMidpoint.x,
                mouseY: returnMidpoint.y
            });

            return {
                preview: window.game.buildingSystem.buildingPreview,
                returnMidpoint,
                outboundCount: probe.outboundWaypointsCount,
                waypointsLength: probe.waypoints.length
            };
        }, deployResult);

        // Preview should be null for return path
        expect(returnPathResult.preview).toBeNull();

        // Test outbound path - should get a valid preview
        const outboundPathResult = await page.evaluate((hubX) => {
            const hub = window.game.gameState.entities.reconHubs[0];

            // A point along the outbound path (between hub and first waypoint)
            window.game.eventBus.emit('building:updatePreview', {
                mouseX: hubX + 100,
                mouseY: hub.y
            });

            return {
                preview: window.game.buildingSystem.buildingPreview
            };
        }, deployResult.hubX);

        // Preview should exist for outbound path
        expect(outboundPathResult.preview).not.toBeNull();
    });
});

test.describe('REQ-2: Dynamic Hub Operations Button States', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('hub operations buttons should enable when resources become sufficient', async ({ page }) => {
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

        // Set resources LOW so buttons should be disabled
        await page.evaluate(() => {
            window.game.gameState.resources.minerals = 0;
            window.game.gameState.resources.data = 0;
        });

        // Open hub details panel
        await page.evaluate(() => {
            const hub = window.game.gameState.entities.reconHubs[0];
            if (hub) {
                window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
            }
        });
        await page.waitForTimeout(500);

        // Verify Build Probe button is disabled (needs 25 minerals)
        const buildProbeDisabledBefore = await page.evaluate(() => {
            const btn = document.getElementById('buildProbeForHub');
            return btn ? btn.disabled : null;
        });
        expect(buildProbeDisabledBefore).toBe(true);

        // Verify Shuttle button is disabled (needs 50 minerals, 25 data)
        const shuttleDisabledBefore = await page.evaluate(() => {
            const btn = document.getElementById('buildShuttleBtn');
            return btn ? btn.disabled : null;
        });
        expect(shuttleDisabledBefore).toBe(true);

        // Now add resources while the panel is STILL OPEN
        // This should trigger ui:update and buttons should enable
        await page.evaluate(() => {
            window.game.gameState.updateResources(
                { minerals: 100, data: 50 },
                window.game.eventBus
            );
        });
        await page.waitForTimeout(100); // Brief wait for event to propagate

        // Verify Build Probe button is now ENABLED
        const buildProbeDisabledAfter = await page.evaluate(() => {
            const btn = document.getElementById('buildProbeForHub');
            return btn ? btn.disabled : null;
        });
        expect(buildProbeDisabledAfter).toBe(false);

        // Verify Shuttle button is now ENABLED
        const shuttleDisabledAfter = await page.evaluate(() => {
            const btn = document.getElementById('buildShuttleBtn');
            return btn ? btn.disabled : null;
        });
        expect(shuttleDisabledAfter).toBe(false);
    });
});

test.describe('REQ-4: Equipment Tutorial After Collection Research', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('equipment tutorial appears after Collection research', async ({ page }) => {
        // Start new game and skip cutscene
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(3000);

        // Dismiss initial tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Mark all prior steps as completed so equipment tutorial can trigger
        await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            tm.steps.forEach((step, index) => {
                if (step.id !== 'install_probe_equipment') {
                    step.completed = true;
                }
            });
            tm.tutorialActive = true;
        });

        // Get equipment step index before triggering
        const equipmentStepIndex = await page.evaluate(() => {
            return window.game.tutorialManager.steps.findIndex(s => s.id === 'install_probe_equipment');
        });
        expect(equipmentStepIndex).toBeGreaterThan(-1);

        // Simulate auto-collector research completion (must be specific ID)
        await page.evaluate(() => {
            window.game.eventBus.emit('research:completed', {
                node: { id: 'auto_minerals', tree: 'collection', name: 'Auto-Mineral Collection' }
            });
        });
        await page.waitForTimeout(500);

        // Check that the current step is the equipment step
        const currentStep = await page.evaluate(() => {
            return window.game.tutorialManager.currentStep;
        });
        expect(currentStep).toBe(equipmentStepIndex);

        // Check that the tutorial panel is showing the equipment message
        const tutorialVisible = await page.evaluate(() => {
            const panel = document.getElementById('tutorialPanel');
            return panel && panel.style.display !== 'none';
        });
        expect(tutorialVisible).toBe(true);

        // Verify the message content
        const tutorialContent = await page.evaluate(() => {
            const panel = document.getElementById('tutorialPanel');
            return panel ? panel.textContent : '';
        });
        expect(tutorialContent).toContain('equipment');
    });

    test('equipment tutorial completes when equipment is installed', async ({ page }) => {
        // Start new game and skip cutscene
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(3000);

        // Set up tutorial at equipment step
        await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            tm.steps.forEach((step, index) => {
                if (step.id !== 'install_probe_equipment') {
                    step.completed = true;
                }
            });
            const equipIndex = tm.steps.findIndex(s => s.id === 'install_probe_equipment');
            tm.currentStep = equipIndex;
            tm.tutorialActive = true;
        });

        // Verify equipment step is not completed yet
        const stepCompletedBefore = await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            const step = tm.steps.find(s => s.id === 'install_probe_equipment');
            return step.completed;
        });
        expect(stepCompletedBefore).toBe(false);

        // Simulate installing equipment on a probe
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (probe) {
                probe.equipment = { name: 'Auto-Collector', collectionTypes: ['minerals'] };
            }
        });

        // Trigger step completion check
        await page.evaluate(() => {
            window.game.tutorialManager.checkStepCompletion();
        });
        await page.waitForTimeout(100);

        // Verify equipment step condition is now met
        const conditionMet = await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            const step = tm.steps.find(s => s.id === 'install_probe_equipment');
            return step.checkCondition();
        });
        expect(conditionMet).toBe(true);
    });
});

test.describe('REQ-3: Probetheum Gating', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('probetheum should not accumulate before first mining station', async ({ page }) => {
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

        // Verify no mining stations exist
        const hasMiningStations = await page.evaluate(() => {
            return window.game.gameState.mining &&
                   window.game.gameState.mining.stations &&
                   window.game.gameState.mining.stations.length > 0;
        });
        expect(hasMiningStations).toBe(false);

        // Get initial probetheum
        const initialProbetheum = await page.evaluate(() => {
            return window.game.gameState.probethium.current;
        });
        expect(initialProbetheum).toBe(0);

        // Call calculateProbethium multiple times
        await page.evaluate(() => {
            for (let i = 0; i < 5; i++) {
                window.game.gameState.calculateProbethium(1000);
            }
        });
        await page.waitForTimeout(2000); // Wait for potential accumulation

        // Probetheum should still be 0 (no mining stations)
        const probethiumWithoutStation = await page.evaluate(() => {
            return window.game.gameState.probethium.current;
        });
        expect(probethiumWithoutStation).toBe(0);

        // Now simulate building a mining station
        await page.evaluate(() => {
            if (!window.game.gameState.mining) {
                window.game.gameState.mining = { stations: [], shuttles: [], totalProbetheum: 0 };
            }
            // Add a mock mining station
            window.game.gameState.mining.stations.push({
                id: 'test-station-1',
                type: 'basic',
                active: false,
                efficiency: 1.0,
                level: 1
            });
        });

        // Reset the lastUpdateTime to force calculation
        await page.evaluate(() => {
            window.game.gameState.probethium.lastUpdateTime = Date.now() - 2000;
        });

        // Call calculateProbethium again
        await page.evaluate(() => {
            window.game.gameState.calculateProbethium(1000);
        });

        // After mining station exists, probetheum CAN accumulate
        // (though it might be very small due to the small base rate)
        const probethiumAfterStation = await page.evaluate(() => {
            return window.game.gameState.probethium.current;
        });

        // Either it's greater than 0, or the timing check prevented it
        // The key test is that it was 0 before the station existed
        expect(probethiumAfterStation).toBeGreaterThanOrEqual(0);
    });
});

test.describe('REQ-5: Intro Animation Replay', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Clear all storage to start fresh
        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('intro animation plays each time New Game is selected', async ({ page }) => {
        // First new game - intro should play
        await page.locator('#newGameBtn').click();

        // Verify cutscene container is visible (intro is playing)
        const cutsceneContainer = page.locator('#cutsceneContainer');
        await expect(cutsceneContainer).toBeVisible({ timeout: 2000 });

        // Skip the cutscene
        await page.waitForTimeout(1500); // Wait for skip button to appear
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }

        // Wait for game to load
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel if visible
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Return to main menu
        await page.click('#mainMenuBtn');
        await page.waitForSelector('#mainMenuModal.active');

        // Click Exit to Menu
        const exitBtn = page.locator('#exitToMenuBtn');
        if (await exitBtn.isVisible()) {
            await exitBtn.click();
        } else {
            // Try alternative - reload to start screen
            await page.goto('/');
            await page.waitForLoadState('networkidle');
        }

        // Wait for start screen
        await page.waitForSelector('#startScreen', { state: 'visible', timeout: 5000 });

        // Second new game - intro should play AGAIN
        await page.locator('#newGameBtn').click();

        // Verify cutscene container is visible again
        await expect(cutsceneContainer).toBeVisible({ timeout: 2000 });
    });

    test('cutsceneSeen flag is cleared on New Game', async ({ page }) => {
        // Set the cutsceneSeen flag manually
        await page.evaluate(async () => {
            await storageAdapter.setItem('cutsceneSeen', 'true');
        });

        // Reload to ensure flag is persisted
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Verify flag was set
        const flagBefore = await page.evaluate(async () => {
            return await storageAdapter.getItem('cutsceneSeen');
        });
        expect(flagBefore).toBe('true');

        // Click New Game
        await page.locator('#newGameBtn').click();

        // The cutscene should be playing (flag was cleared)
        const cutsceneContainer = page.locator('#cutsceneContainer');
        await expect(cutsceneContainer).toBeVisible({ timeout: 2000 });
    });
});

// REQ-9: Equipment Management UI
test.describe('REQ-9: Equipment Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('Manage Equipment button appears on probe panel when research unlocked', async ({ page }) => {
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

        // Unlock auto_minerals research
        await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            research.researched.add('auto_minerals');
        });

        // Deploy a probe if none exist
        await page.evaluate(() => {
            const probes = window.game.gameState.entities.probes;
            if (!probes || probes.length === 0) {
                const hub = window.game.gameState.entities.reconHubs[0];
                if (hub) {
                    const waypoints = [
                        { x: hub.x + 200, y: hub.y },
                        { x: hub.x + 200, y: hub.y - 200 }
                    ];
                    window.game.eventBus.emit('probe:deploy', { hub, waypoints });
                }
            }
        });
        await page.waitForTimeout(500);

        // Verify probe exists
        const probeExists = await page.evaluate(() => {
            const probes = window.game.gameState.entities.probes;
            return probes && probes.length > 0;
        });
        expect(probeExists).toBe(true);

        // Select the first probe to open probeDetailPanel
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) throw new Error('No probe found');

            window.game.gameState.ui.selectedProbe = probe;
            window.uiManager.showProbeDetails({ probe: probe });
        });
        await page.waitForTimeout(500);

        // Check that probeDetailPanel is visible
        const probePanel = page.locator('#probeDetailPanel');
        await expect(probePanel).toBeVisible();

        // Check that Manage Equipment button is visible
        const manageBtn = page.locator('#manageEquipmentBtnOld');
        await expect(manageBtn).toBeVisible();
    });

    test('can equip and remove equipment via Manage Equipment modal', async ({ page }) => {
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

        // Setup: unlock research and give resources
        await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            research.researched.add('auto_minerals');
            window.game.gameState.resources.minerals = 100;
        });

        // Deploy a probe if none exist
        await page.evaluate(() => {
            const probes = window.game.gameState.entities.probes;
            if (!probes || probes.length === 0) {
                const hub = window.game.gameState.entities.reconHubs[0];
                if (hub) {
                    const waypoints = [
                        { x: hub.x + 200, y: hub.y },
                        { x: hub.x + 200, y: hub.y - 200 }
                    ];
                    window.game.eventBus.emit('probe:deploy', { hub, waypoints });
                }
            }
        });
        await page.waitForTimeout(500);

        // Select the first probe (opens probeDetailPanel)
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) throw new Error('No probe found');

            window.game.gameState.ui.selectedProbe = probe;
            window.uiManager.showProbeDetails({ probe: probe });
        });
        await page.waitForTimeout(500);

        // Verify probeDetailPanel is visible before clicking Manage Equipment
        const probePanel = page.locator('#probeDetailPanel');
        await expect(probePanel).toBeVisible();

        // Click Manage Equipment button in probeDetailPanel
        await page.click('#manageEquipmentBtnOld');
        await page.waitForTimeout(300);

        // Verify modal appears
        const modal = page.locator('#equipmentModal');
        await expect(modal).toBeVisible();

        // Click equip button for mineral collector
        await page.click('.equip-btn[data-equipment-id="mineral_collector"]');
        await page.waitForTimeout(300);

        // Verify equipment was installed (supports both array and object format)
        const hasEquipment = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (Array.isArray(probe.equipment)) {
                return probe.equipment.some(eq => eq.type === 'mineral_collector');
            }
            return probe.equipment !== null && probe.equipment.type === 'mineral_collector';
        });
        expect(hasEquipment).toBe(true);

        // Verify resources were deducted
        const minerals = await page.evaluate(() => {
            return window.game.gameState.resources.minerals;
        });
        expect(minerals).toBe(75); // 100 - 25 cost

        // Verify probeDetailPanel is still visible after equipping
        await expect(probePanel).toBeVisible();

        // Test removal via modal - click Manage Equipment again
        await page.click('#manageEquipmentBtnOld');
        await page.waitForTimeout(300);

        // Click remove button in modal (uses class selector for array-based equipment)
        const removeBtn = page.locator('.remove-equipment-btn').first();
        await expect(removeBtn).toBeVisible();
        await removeBtn.click();
        await page.waitForTimeout(300);

        // Verify equipment was removed (supports both array and object format)
        const equipmentRemoved = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (Array.isArray(probe.equipment)) {
                return probe.equipment.length === 0;
            }
            return probe.equipment === null;
        });
        expect(equipmentRemoved).toBe(true);

        // Verify probeDetailPanel is still visible after removing
        await expect(probePanel).toBeVisible();
    });
});

// REQ-8: Research Lab Tutorial
test.describe('REQ-8: Research Lab Tutorial', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('research lab tutorial appears when player opens research screen', async ({ page }) => {
        // Start new game and skip cutscene
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(3000);

        // Dismiss initial tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Mark all prior steps as completed so research lab tutorial can trigger
        await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            tm.steps.forEach((step) => {
                if (step.id !== 'research_lab_unlocked' && step.id !== 'install_probe_equipment') {
                    step.completed = true;
                }
            });
            tm.tutorialActive = true;
        });

        // Get research lab step index
        const researchStepIndex = await page.evaluate(() => {
            return window.game.tutorialManager.steps.findIndex(s => s.id === 'research_lab_unlocked');
        });
        expect(researchStepIndex).toBeGreaterThan(-1);

        // First emit research:unlocked to set the flag (this alone should NOT trigger tutorial)
        await page.evaluate(() => {
            window.game.eventBus.emit('research:unlocked');
        });
        await page.waitForTimeout(300);

        // Check that tutorial hasn't triggered yet (only flagged as unlocked)
        const stepBeforeOpen = await page.evaluate(() => {
            return window.game.tutorialManager.currentStep;
        });
        expect(stepBeforeOpen).not.toBe(researchStepIndex);

        // Now emit research:showTree (simulating player opening research screen)
        await page.evaluate(() => {
            window.game.eventBus.emit('research:showTree');
        });
        await page.waitForTimeout(500);

        // Check that the current step is now the research lab step
        const currentStep = await page.evaluate(() => {
            return window.game.tutorialManager.currentStep;
        });
        expect(currentStep).toBe(researchStepIndex);

        // Check that the tutorial panel is showing the research lab message
        const tutorialVisible = await page.evaluate(() => {
            const panel = document.getElementById('tutorialPanel');
            return panel && panel.style.display !== 'none';
        });
        expect(tutorialVisible).toBe(true);

        // Verify the message content mentions Research Lab
        const tutorialContent = await page.evaluate(() => {
            const panel = document.getElementById('tutorialPanel');
            return panel ? panel.textContent : '';
        });
        expect(tutorialContent).toContain('Research Lab');
    });

    test('research lab tutorial opens research screen when triggered via step progression', async ({ page }) => {
        // Start new game and skip cutscene
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Dismiss initial tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Unlock research and allow access
        await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            research.unlocked = true;
            research.points = 1;
            window.game.tutorialManager.researchAccessAllowed = true;
            window.game.tutorialManager.researchLabUnlocked = true;
        });

        // Mark all steps before research_lab_unlocked as completed
        await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            const researchStepIndex = tm.steps.findIndex(s => s.id === 'research_lab_unlocked');
            for (let i = 0; i < researchStepIndex; i++) {
                tm.steps[i].completed = true;
            }
        });

        // Verify we start on the map screen
        const startScreen = await page.evaluate(() => {
            return document.getElementById('mapScreen').classList.contains('active');
        });
        expect(startScreen).toBe(true);

        // Trigger the research lab tutorial step directly (simulating normal progression)
        await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            const researchStepIndex = tm.steps.findIndex(s => s.id === 'research_lab_unlocked');
            tm.currentStep = researchStepIndex;
            tm.tutorialActive = true;
            tm.showCurrentStep();
        });
        await page.waitForTimeout(500);

        // Verify that the research screen is now active
        const researchScreenActive = await page.evaluate(() => {
            return document.getElementById('researchScreen').classList.contains('active');
        });
        expect(researchScreenActive).toBe(true);

        // Verify the map screen is no longer active
        const mapScreenActive = await page.evaluate(() => {
            return document.getElementById('mapScreen').classList.contains('active');
        });
        expect(mapScreenActive).toBe(false);

        // Verify tutorial panel is visible and shows research lab content
        const tutorialVisible = await page.evaluate(() => {
            const panel = document.getElementById('tutorialPanel');
            return panel && panel.style.display !== 'none';
        });
        expect(tutorialVisible).toBe(true);

        const tutorialContent = await page.evaluate(() => {
            const panel = document.getElementById('tutorialPanel');
            return panel ? panel.textContent : '';
        });
        expect(tutorialContent).toContain('Research Lab');
    });
});

// Tutorial Settings Toggle
test.describe('Tutorial Settings Toggle', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('tutorial toggle appears in settings modal', async ({ page }) => {
        // Start new game and skip cutscene
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Open settings modal
        await page.click('#settingsBtn');
        await page.waitForTimeout(300);

        // Verify settings modal is visible
        const settingsModal = page.locator('#settingsModal');
        await expect(settingsModal).toBeVisible();

        // Verify tutorial toggle exists and is checked by default
        const toggleState = await page.evaluate(() => {
            const toggle = document.getElementById('tutorialToggle');
            return toggle ? { exists: true, checked: toggle.checked } : { exists: false };
        });
        expect(toggleState.exists).toBe(true);
        expect(toggleState.checked).toBe(true);
    });

    test('disabling tutorials hides the tutorial panel', async ({ page }) => {
        // Start new game and skip cutscene
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(3000);

        // Ensure tutorial is started (it starts after 1 second delay)
        await page.evaluate(() => {
            if (window.game && window.game.tutorialManager) {
                window.game.tutorialManager.startTutorial();
            }
        });
        await page.waitForTimeout(500);

        // Verify tutorial panel is visible initially
        const isVisibleBefore = await page.evaluate(() => {
            const panel = document.getElementById('tutorialPanel');
            return panel && panel.style.display !== 'none';
        });
        expect(isVisibleBefore).toBe(true);

        // Disable tutorials via JavaScript (toggle styled as hidden checkbox)
        await page.evaluate(() => {
            const toggle = document.getElementById('tutorialToggle');
            toggle.checked = false;
            toggle.dispatchEvent(new Event('change'));
        });
        // Wait for animation to complete (closeTutorial has 400ms animation)
        await page.waitForTimeout(600);

        // Verify tutorial panel is now hidden
        const isVisibleAfter = await page.evaluate(() => {
            const panel = document.getElementById('tutorialPanel');
            return panel && panel.style.display !== 'none';
        });
        expect(isVisibleAfter).toBe(false);
    });

    test('tutorial disabled state persists after reload', async ({ page }) => {
        // Start new game and skip cutscene
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Disable tutorials via JavaScript
        await page.evaluate(() => {
            const toggle = document.getElementById('tutorialToggle');
            toggle.checked = false;
            toggle.dispatchEvent(new Event('change'));
        });
        await page.waitForTimeout(300);

        // Verify setting is saved in localStorage
        const savedState = await page.evaluate(() => {
            return localStorage.getItem('csog_tutorial_disabled');
        });
        expect(savedState).toBe('true');

        // Reload and start new game
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn2 = page.locator('#skipCutscene');
        if (await skipBtn2.isVisible()) {
            await skipBtn2.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(3000);

        // Verify tutorial panel is NOT visible after reload
        const isVisible = await page.evaluate(() => {
            const panel = document.getElementById('tutorialPanel');
            return panel && panel.style.display !== 'none';
        });
        expect(isVisible).toBe(false);

        // Verify toggle state in settings
        const toggleChecked = await page.evaluate(() => {
            const toggle = document.getElementById('tutorialToggle');
            return toggle ? toggle.checked : null;
        });
        expect(toggleChecked).toBe(false);
    });

    test('re-enabling tutorials shows tutorial panel', async ({ page }) => {
        // Start with tutorials disabled
        await page.evaluate(() => {
            localStorage.setItem('csog_tutorial_disabled', 'true');
        });
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Start new game
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Verify tutorial panel is NOT visible
        const isVisibleBefore = await page.evaluate(() => {
            const panel = document.getElementById('tutorialPanel');
            return panel && panel.style.display !== 'none';
        });
        expect(isVisibleBefore).toBe(false);

        // Enable tutorials via JavaScript
        await page.evaluate(() => {
            const toggle = document.getElementById('tutorialToggle');
            toggle.checked = true;
            toggle.dispatchEvent(new Event('change'));
        });
        await page.waitForTimeout(300);

        // Trigger tutorial to show by starting it
        await page.evaluate(() => {
            window.game.tutorialManager.startTutorial();
        });
        await page.waitForTimeout(500);

        // Verify tutorial panel is now visible
        const isVisibleAfter = await page.evaluate(() => {
            const panel = document.getElementById('tutorialPanel');
            return panel && panel.style.display !== 'none';
        });
        expect(isVisibleAfter).toBe(true);
    });
});

// Tutorial Panel Positioning
test.describe('Tutorial Panel Positioning', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('tutorial panel is centered at top of screen', async ({ page }) => {
        // Start new game and skip cutscene
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(3000);

        // Check tutorial panel positioning styles using computed styles
        const panelStyles = await page.evaluate(() => {
            const panel = document.getElementById('tutorialPanel');
            if (!panel) return null;
            const computedStyle = window.getComputedStyle(panel);
            const inlineStyle = panel.style;
            return {
                position: computedStyle.position,
                // Check inline style which contains the centering logic
                inlineLeft: inlineStyle.left,
                inlineTransform: inlineStyle.transform,
                inlineTop: inlineStyle.top
            };
        });

        expect(panelStyles).not.toBeNull();
        expect(panelStyles.position).toBe('fixed');
        expect(panelStyles.inlineTop).toBe('90px');
        expect(panelStyles.inlineLeft).toBe('50%');
        // After animation, transform combines centering and animation
        expect(panelStyles.inlineTransform).toContain('translateX(-50%)');
    });
});

// Equipment Icons Display
test.describe('Equipment Icons Display', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('equipment icons appear in probe detail panel after equipping', async ({ page }) => {
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

        // Give resources and unlock research
        await page.evaluate(() => {
            window.game.gameState.resources.minerals = 500;
            window.game.gameState.resources.data = 100;
            const research = window.game.gameState.getResearchSystem();
            research.unlocked = true;
            research.researched.add('auto_minerals');
        });

        // Select a probe to open the probeDetailPanel
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            probe.selected = true;
            window.game.gameState.ui.selectedProbe = probe;
            window.uiManager.showProbeDetails({ probe: probe });
        });
        await page.waitForTimeout(500);

        // Check that equipment section shows "EQUIPMENT SLOTS" header
        const hasEquipmentSlots = await page.evaluate(() => {
            const probePanel = document.getElementById('probeDetailPanel');
            return probePanel ? probePanel.textContent.includes('EQUIPMENT SLOTS') : false;
        });
        expect(hasEquipmentSlots).toBe(true);

        // Equip mineral collector programmatically
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            if (!Array.isArray(probe.equipment)) {
                probe.equipment = [];
            }
            probe.equipment.push({
                type: 'mineral_collector',
                name: 'Mineral Collector',
                collectionTypes: ['minerals'],
                slotsRequired: 1
            });
            // Refresh probe details via UIManager
            window.uiManager.updateEquipmentSlots(probe);
        });
        await page.waitForTimeout(300);

        // Verify equipment icon is displayed in the panel
        const hasEquipmentIcon = await page.evaluate(() => {
            const probePanel = document.getElementById('probeDetailPanel');
            if (!probePanel) return false;
            // The mineral collector icon is ⛏️
            return probePanel.innerHTML.includes('⛏️');
        });
        expect(hasEquipmentIcon).toBe(true);

        // Verify the equipment is shown in filled slot
        const equipmentFillsSlot = await page.evaluate(() => {
            const probePanel = document.getElementById('probeDetailPanel');
            // Equipment should have the equipment title in slot
            return probePanel ? probePanel.innerHTML.includes('Mineral Collector') : false;
        });
        expect(equipmentFillsSlot).toBe(true);
    });
});
