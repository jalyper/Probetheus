// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Research Gating Tests
 *
 * These tests verify that research access is properly gated by the tutorial system
 * to prevent research from interrupting the early game tutorial flow.
 */

test.describe('Research Gating System', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('research button is hidden at game start', async ({ page }) => {
        await page.locator('#newGameBtn').click();

        // Handle cutscene
        try {
            await page.locator('#skipCutscene').click({ timeout: 3000 });
        } catch (e) { /* cutscene might not show */ }

        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(1000);

        // Research button should be hidden initially
        const researchBtnVisible = await page.evaluate(() => {
            const btn = document.getElementById('researchBtn');
            return btn && btn.style.display !== 'none';
        });
        expect(researchBtnVisible).toBe(false);
    });

    test('research access is blocked before tutorial gate', async ({ page }) => {
        await page.locator('#newGameBtn').click();

        try {
            await page.locator('#skipCutscene').click({ timeout: 3000 });
        } catch (e) { /* cutscene might not show */ }

        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(1500);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Check that researchAccessAllowed is false initially
        const accessAllowed = await page.evaluate(() => {
            return window.game.tutorialManager.isResearchAccessAllowed();
        });
        expect(accessAllowed).toBe(false);
    });

    test('research points accumulate but dont unlock research before gate', async ({ page }) => {
        await page.locator('#newGameBtn').click();

        try {
            await page.locator('#skipCutscene').click({ timeout: 3000 });
        } catch (e) { /* cutscene might not show */ }

        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Manually award research points (simulating sector discovery)
        await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            research.points = 5; // Give 5 research points
        });

        // Call checkResearchUnlock
        await page.evaluate(() => {
            window.uiManager.checkResearchUnlock();
        });
        await page.waitForTimeout(500);

        // Research should NOT be unlocked yet (tutorial hasn't passed gate)
        const state = await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            const btn = document.getElementById('researchBtn');
            return {
                unlocked: research.unlocked,
                points: research.points,
                buttonVisible: btn && btn.style.display !== 'none',
                accessAllowed: window.game.tutorialManager.isResearchAccessAllowed()
            };
        });

        expect(state.points).toBe(5);
        expect(state.unlocked).toBe(false);
        expect(state.buttonVisible).toBe(false);
        expect(state.accessAllowed).toBe(false);
    });

    test('research unlocks after tutorial gate is passed', async ({ page }) => {
        await page.locator('#newGameBtn').click();

        try {
            await page.locator('#skipCutscene').click({ timeout: 3000 });
        } catch (e) { /* cutscene might not show */ }

        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Setup: Give research points and pass the tutorial gate
        await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            research.points = 3;

            // Simulate passing the tutorial gate (as if player built first hub)
            window.game.tutorialManager.researchAccessAllowed = true;
        });

        // Trigger the research unlock check
        await page.evaluate(() => {
            window.game.eventBus.emit('tutorial:checkResearchUnlock');
        });
        await page.waitForTimeout(500);

        // Research should now be unlocked
        const state = await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            const btn = document.getElementById('researchBtn');
            return {
                unlocked: research.unlocked,
                buttonVisible: btn && btn.style.display !== 'none'
            };
        });

        expect(state.unlocked).toBe(true);
        expect(state.buttonVisible).toBe(true);
    });

    test('building hub passes the research gate', async ({ page }) => {
        await page.locator('#newGameBtn').click();

        try {
            await page.locator('#skipCutscene').click({ timeout: 3000 });
        } catch (e) { /* cutscene might not show */ }

        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Check gate is closed initially
        const beforeGate = await page.evaluate(() => {
            return window.game.tutorialManager.isResearchAccessAllowed();
        });
        expect(beforeGate).toBe(false);

        // Simulate building a second hub (first hub exists at start)
        await page.evaluate(() => {
            // Add a second hub to entities
            const hub = {
                id: Date.now(),
                x: 500,
                y: 500,
                selected: false,
                level: 1,
                maxProbes: 5
            };
            window.game.gameState.entities.reconHubs.push(hub);

            // Emit hub:built event
            window.game.eventBus.emit('hub:built', { hub });
        });
        await page.waitForTimeout(500);

        // Check gate is now open
        const afterGate = await page.evaluate(() => {
            return window.game.tutorialManager.isResearchAccessAllowed();
        });
        expect(afterGate).toBe(true);
    });

    test('research unlock modal shows when gate passes with pending points', async ({ page }) => {
        await page.locator('#newGameBtn').click();

        try {
            await page.locator('#skipCutscene').click({ timeout: 3000 });
        } catch (e) { /* cutscene might not show */ }

        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Give research points first (before gate is open)
        await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            research.points = 2;
        });

        // Now pass the gate by building a hub
        await page.evaluate(() => {
            const hub = {
                id: Date.now(),
                x: 500,
                y: 500,
                selected: false,
                level: 1,
                maxProbes: 5
            };
            window.game.gameState.entities.reconHubs.push(hub);
            window.game.eventBus.emit('hub:built', { hub });
        });
        await page.waitForTimeout(1000);

        // Research unlock modal should have appeared
        const modalState = await page.evaluate(() => {
            const modal = document.getElementById('researchUnlockModal');
            return {
                exists: !!modal,
                active: modal?.classList.contains('active')
            };
        });

        expect(modalState.exists).toBe(true);
        expect(modalState.active).toBe(true);
    });

    test('tutorials disabled allows research access immediately', async ({ page }) => {
        await page.locator('#newGameBtn').click();

        try {
            await page.locator('#skipCutscene').click({ timeout: 3000 });
        } catch (e) { /* cutscene might not show */ }

        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Disable tutorials
        await page.evaluate(() => {
            window.game.tutorialManager.tutorialsDisabled = true;
        });

        // Check research access is now allowed
        const accessAllowed = await page.evaluate(() => {
            return window.game.tutorialManager.isResearchAccessAllowed();
        });
        expect(accessAllowed).toBe(true);
    });

    test('completing place_hub tutorial step allows research access', async ({ page }) => {
        await page.locator('#newGameBtn').click();

        try {
            await page.locator('#skipCutscene').click({ timeout: 3000 });
        } catch (e) { /* cutscene might not show */ }

        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Mark the place_hub step as completed
        await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            const placeHubStep = tm.steps.find(s => s.id === 'place_hub');
            if (placeHubStep) {
                placeHubStep.completed = true;
            }
            // Trigger gate check
            tm.checkResearchAccessGate();
        });
        await page.waitForTimeout(300);

        // Check research access is now allowed
        const accessAllowed = await page.evaluate(() => {
            return window.game.tutorialManager.isResearchAccessAllowed();
        });
        expect(accessAllowed).toBe(true);
    });

    test('sector discovery awards points but doesnt unlock research before gate', async ({ page }) => {
        await page.locator('#newGameBtn').click();

        try {
            await page.locator('#skipCutscene').click({ timeout: 3000 });
        } catch (e) { /* cutscene might not show */ }

        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Get initial state
        const before = await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            return {
                points: research.points,
                unlocked: research.unlocked
            };
        });

        // Simulate sector discovery (this awards a research point)
        await page.evaluate(() => {
            window.game.eventBus.emit('research:pointAwarded', { source: 'sector_discovery' });
        });
        await page.waitForTimeout(500);

        // Research should still not be unlocked (gate not passed)
        const after = await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            return {
                unlocked: research.unlocked,
                accessAllowed: window.game.tutorialManager.isResearchAccessAllowed()
            };
        });

        expect(after.unlocked).toBe(false);
        expect(after.accessAllowed).toBe(false);
    });

    test('full tutorial flow - research unlocks at correct time', async ({ page }) => {
        await page.locator('#newGameBtn').click();

        try {
            await page.locator('#skipCutscene').click({ timeout: 3000 });
        } catch (e) { /* cutscene might not show */ }

        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Simulate the tutorial flow:
        // 1. Award research points (from sector discovery)
        await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            research.points = 3;
        });

        // 2. Verify research is NOT unlocked yet
        let state = await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            return { unlocked: research.unlocked };
        });
        expect(state.unlocked).toBe(false);

        // 3. Complete early tutorial steps
        await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            ['deploy_first_probe', 'click_signal', 'explore_planet', 'deploy_remaining_probes', 'gather_resources'].forEach(stepId => {
                const step = tm.steps.find(s => s.id === stepId);
                if (step) step.completed = true;
            });
        });

        // 4. Still not unlocked (need to place hub)
        state = await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            return { unlocked: research.unlocked };
        });
        expect(state.unlocked).toBe(false);

        // 5. Complete place_hub step and add second hub
        await page.evaluate(() => {
            const tm = window.game.tutorialManager;
            const step = tm.steps.find(s => s.id === 'place_hub');
            if (step) step.completed = true;

            // Add second hub
            const hub = { id: Date.now(), x: 500, y: 500, level: 1, maxProbes: 5 };
            window.game.gameState.entities.reconHubs.push(hub);

            // Emit hub:built to trigger gate check
            window.game.eventBus.emit('hub:built', { hub });
        });
        await page.waitForTimeout(1000);

        // 6. NOW research should be unlocked
        state = await page.evaluate(() => {
            const research = window.game.gameState.getResearchSystem();
            const btn = document.getElementById('researchBtn');
            return {
                unlocked: research.unlocked,
                buttonVisible: btn && btn.style.display !== 'none',
                accessAllowed: window.game.tutorialManager.isResearchAccessAllowed()
            };
        });
        expect(state.unlocked).toBe(true);
        expect(state.buttonVisible).toBe(true);
        expect(state.accessAllowed).toBe(true);
    });
});
