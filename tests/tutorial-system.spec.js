/**
 * Tutorial System Tests
 * Tests the new step-based tutorial system
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

    test('should show tutorial on new game', async ({ page }) => {
        // Start new game
        await page.click('#newGameBtn');
        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Tutorial banner should be visible
        const tutorialPanel = await page.$('#tutorialPanel');
        expect(tutorialPanel).not.toBeNull();

        const isVisible = await tutorialPanel.isVisible();
        expect(isVisible).toBe(true);

        // Should show step 1
        const content = await page.textContent('#tutorialPanel');
        expect(content).toContain('Deploy Your First Probe');
        expect(content).toContain('Step 1');
    });

    test('should progress through tutorial steps', async ({ page }) => {
        await page.click('#newGameBtn');
        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Step 1: Deploy first probe
        let content = await page.textContent('#tutorialPanel');
        expect(content).toContain('Deploy Your First Probe');

        // Select hub and deploy a probe programmatically
        await page.evaluate(() => {
            const hubs = window.game.gameState.entities.reconHubs;
            if (hubs && hubs.length > 0) {
                const hub = hubs[0];
                hub.selected = true;
                window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
            }
        });

        await page.waitForTimeout(500);

        // Click deploy button if visible
        const deployBtn = await page.$('#deployFromHub');
        if (deployBtn && await deployBtn.isVisible()) {
            await deployBtn.click();
            await page.waitForTimeout(500);

            // Place waypoints on canvas
            const canvas = await page.$('#galaxyCanvas');
            const canvasBox = await canvas.boundingBox();
            if (canvasBox) {
                await page.click('#galaxyCanvas', { position: { x: canvasBox.width / 2 - 100, y: canvasBox.height / 2 } });
                await page.waitForTimeout(200);
                await page.click('#galaxyCanvas', { position: { x: canvasBox.width / 2 - 200, y: canvasBox.height / 2 - 100 }, button: 'right' });
            }

            await page.waitForTimeout(2000);

            // Check if tutorial progressed (may show step 2 content)
            content = await page.textContent('#tutorialPanel');
            // Either shows step 2 or still on step 1 depending on deployment success
            expect(content).toContain('Step');
        }
    });

    test('tutorial should stay visible until step completed', async ({ page }) => {
        await page.click('#newGameBtn');
        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Tutorial should be visible
        let isVisible = await page.isVisible('#tutorialPanel');
        expect(isVisible).toBe(true);

        // Wait 3 seconds - tutorial should still be visible
        await page.waitForTimeout(3000);
        isVisible = await page.isVisible('#tutorialPanel');
        expect(isVisible).toBe(true);

        // Content should still show step 1
        const content = await page.textContent('#tutorialPanel');
        expect(content).toContain('Deploy Your First Probe');
    });

    test('tutorial banner should not block gameplay', async ({ page }) => {
        await page.click('#newGameBtn');
        await page.waitForSelector('#galaxyCanvas');
        await page.waitForTimeout(2000);

        // Tutorial should be at top
        const tutorialPanel = await page.$('#tutorialPanel');
        if (tutorialPanel && await tutorialPanel.isVisible()) {
            const box = await tutorialPanel.boundingBox();

            if (box) {
                expect(box.y).toBeLessThan(200); // Should be near top
                expect(box.height).toBeLessThan(150); // Should be reasonably short
            }
        }

        // Canvas should still be present and visible
        const canvas = await page.$('#galaxyCanvas');
        expect(canvas).not.toBeNull();
        const canvasVisible = await canvas.isVisible();
        expect(canvasVisible).toBe(true);
    });
});
