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
        expect(content).toContain('Step 1');
    });

    test('selecting the hub completes step 1', async ({ page }) => {
        await startGameAndTutorial(page);

        await page.evaluate(() => {
            const hub = window.game.gameState.entities.reconHubs[0];
            hub.selected = true;
            window.game.eventBus.emit('hub:selected', { hub });
        });

        // Step advance has a 1.5s feedback delay
        await page.waitForTimeout(2500);

        const state = await page.evaluate(() => ({
            step1Done: window.game.tutorialManager.steps[0].completed,
            currentStep: window.game.tutorialManager.currentStep
        }));
        expect(state.step1Done).toBe(true);
        expect(state.currentStep).toBeGreaterThanOrEqual(1);
    });

    test('collect_signals step pings the starter deposits (LOOP_REDESIGN)', async ({ page }) => {
        await startGameAndTutorial(page);

        const result = await page.evaluate(() => {
            // Fake a deployed probe so the fallback path also has a target
            const probe = window.game.gameState.entities.probes[0];
            probe.waypoints = [{ x: 900, y: 500 }, { x: 1100, y: 520 }, { x: 900, y: 500 }];
            probe.outboundWaypointsCount = 2;

            const before = window.game.gameState.entities.signals.length;
            window.game.tutorialManager.handleStepActions('collect_signals');
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
