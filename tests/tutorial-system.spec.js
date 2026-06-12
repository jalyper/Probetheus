/**
 * Tutorial System Tests — the Guided Minute (docs/design/ONBOARDING.md)
 * Rewritten 2026-06-10 for the 5-step Act-1 onboarding + just-in-time tips.
 */

const { test, expect } = require('@playwright/test');

test.describe('Tutorial System', () => {
    test.beforeEach(async ({ page }) => {
        // Clear storage to ensure clean state
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
        });
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    async function startGameAndTutorial(page) {
        await page.click('#newGameBtn');
        await page.waitForSelector('#galaxyCanvas');
        await page.waitForFunction(() => !!(window.game && window.game.tutorialManager), { timeout: 10000 });
        await page.evaluate(() => {
            window.game.tutorialManager.startTutorial();
        });
        await page.waitForTimeout(500);
    }

    test('should show the Guided Minute step 1 on new game', async ({ page }) => {
        await startGameAndTutorial(page);

        const tutorialPanel = await page.$('#tutorialPanel');
        expect(tutorialPanel).not.toBeNull();
        expect(await tutorialPanel.isVisible()).toBe(true);

        const content = await page.textContent('#tutorialPanel');
        expect(content).toContain('Your Hub');
        // Void Premium tutorial panel shows a mono "1 / 6" counter instead of "Step 1"
        expect(content).toContain('1 / 6');
    });

    test('selecting the hub completes step 1 and unlocks Next — no timed advance', async ({ page }) => {
        await startGameAndTutorial(page);

        // Before completion, Next is disabled
        await expect(page.locator('#tutorialPanel [data-tutorial-next]')).toBeDisabled();

        await page.evaluate(() => {
            const hub = window.game.gameState.entities.reconHubs[0];
            hub.selected = true;
            window.game.eventBus.emit('hub:selected', { hub });
        });

        // Completion lights the Next button but does NOT auto-advance
        await expect(page.locator('#tutorialPanel [data-tutorial-next]')).toBeEnabled();
        await page.waitForTimeout(2000);
        let state = await page.evaluate(() => ({
            step1Done: window.game.tutorialManager.steps[0].completed,
            currentStep: window.game.tutorialManager.currentStep
        }));
        expect(state.step1Done).toBe(true);
        expect(state.currentStep).toBe(0); // still on slide 1 until the player turns the page

        // The player turns the page
        await page.locator('#tutorialPanel [data-tutorial-next]').click();
        state = await page.evaluate(() => ({
            currentStep: window.game.tutorialManager.currentStep
        }));
        expect(state.currentStep).toBe(1);
    });

    test('Back re-reads earlier slides without disturbing progression', async ({ page }) => {
        await startGameAndTutorial(page);

        // Complete step 1 and advance to slide 2
        await page.evaluate(() => {
            const hub = window.game.gameState.entities.reconHubs[0];
            hub.selected = true;
            window.game.eventBus.emit('hub:selected', { hub });
        });
        await page.locator('#tutorialPanel [data-tutorial-next]').click();
        await expect(page.locator('#tutorialPanel')).toContainText('Scout');

        // Back shows slide 1 again, read-only
        await page.locator('#tutorialPanel [data-tutorial-back]').click();
        await expect(page.locator('#tutorialPanel')).toContainText('Your Hub');
        let state = await page.evaluate(() => ({
            currentStep: window.game.tutorialManager.currentStep,
            viewStep: window.game.tutorialManager.viewStep
        }));
        expect(state.currentStep).toBe(1);  // progression untouched
        expect(state.viewStep).toBe(0);

        // Back is disabled on the first slide; Next walks forward again
        await expect(page.locator('#tutorialPanel [data-tutorial-back]')).toBeDisabled();
        await page.locator('#tutorialPanel [data-tutorial-next]').click();
        await expect(page.locator('#tutorialPanel')).toContainText('Scout');
        state = await page.evaluate(() => ({
            viewStep: window.game.tutorialManager.viewStep
        }));
        expect(state.viewStep).toBeNull(); // back to following the live step
    });

    test('the send-off slide finishes on click, never on a timer', async ({ page }) => {
        await startGameAndTutorial(page);

        const result = await page.evaluate(async () => {
            const tm = window.game.tutorialManager;
            // Jump to the last slide
            tm.steps.forEach((s, i) => { if (i < tm.steps.length - 1) s.completed = true; });
            tm.currentStep = tm.steps.length - 1;
            tm.viewStep = null;
            tm.showCurrentStep();

            // Wait well past the old 5s auto-dismiss window
            await new Promise(r => setTimeout(r, 5600));
            return {
                stillActive: tm.tutorialActive,
                panelVisible: document.getElementById('tutorialPanel').style.display !== 'none',
                finishLabel: document.querySelector('#tutorialPanel [data-tutorial-next]')?.textContent.trim()
            };
        });
        expect(result.stillActive).toBe(true);     // no timer ended it
        expect(result.panelVisible).toBe(true);
        expect(result.finishLabel).toBe('Finish ›');

        await page.locator('#tutorialPanel [data-tutorial-next]').click();
        const done = await page.evaluate(() => window.game.tutorialManager.tutorialActive);
        expect(done).toBe(false);
    });

    test('chart_deposit step pings the starter deposits (LOOP_REDESIGN)', async ({ page }) => {
        await startGameAndTutorial(page);

        const result = await page.evaluate(() => {
            // Fake a deployed probe so the fallback path also has a target
            const probe = window.game.gameState.entities.probes[0];
            probe.waypoints = [{ x: 900, y: 500 }, { x: 1100, y: 520 }, { x: 900, y: 500 }];
            probe.outboundWaypointsCount = 2;

            const before = window.game.gameState.entities.signals.length;
            window.game.tutorialManager.handleStepActions('chart_deposit');
            const spawned = window.game.gameState.entities.signals.slice(before);
            return {
                count: spawned.length,
                discoveryPings: spawned.filter(s => s.signalType === 'discovery' && s.depositId).length
            };
        });

        // Guided Minute now teaches prospecting: pings over the starter deposits
        expect(result.count).toBeGreaterThanOrEqual(3);
        expect(result.discoveryPings).toBe(result.count);
    });

    test('just-in-time tips fire once and persist as shown', async ({ page }) => {
        await startGameAndTutorial(page);

        const result = await page.evaluate(async () => {
            const tm = window.game.tutorialManager;
            tm.showTip('tip_test_once', 'Test tip body.');
            tm.showTip('tip_test_once', 'Test tip body.'); // second call should no-op
            await new Promise(r => setTimeout(r, 100));
            const container = document.getElementById('tipToastContainer');
            return {
                toastCount: container ? container.children.length : 0,
                persisted: JSON.parse(localStorage.getItem('csog_tips_shown') || '[]').includes('tip_test_once')
            };
        });

        expect(result.toastCount).toBe(1);
        expect(result.persisted).toBe(true);
    });

    test('tutorial disabled setting suppresses steps and tips', async ({ page }) => {
        await page.click('#newGameBtn');
        await page.waitForSelector('#galaxyCanvas');
        await page.waitForFunction(() => !!(window.game && window.game.tutorialManager), { timeout: 10000 });

        const result = await page.evaluate(async () => {
            const tm = window.game.tutorialManager;
            tm.setTutorialEnabled(false);
            tm.startTutorial();
            tm.showTip('tip_disabled_check', 'Should not appear.');
            await new Promise(r => setTimeout(r, 100));
            const container = document.getElementById('tipToastContainer');
            return {
                active: tm.tutorialActive,
                toasts: container ? container.children.length : 0
            };
        });

        expect(result.active).toBe(false);
        expect(result.toasts).toBe(0);
    });
});
