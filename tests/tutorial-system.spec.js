/**
 * Tutorial System Tests
 * Tests the new step-based tutorial system
 */

const { test, expect } = require('@playwright/test');

test.describe('Tutorial System', () => {
    test.beforeEach(async ({ page }) => {
        // Clear storage to ensure clean state
        await page.goto('http://localhost:3000');
        await page.evaluate(() => {
            localStorage.clear();
        });
    });

    test('should show tutorial on new game', async ({ page }) => {
        await page.goto('http://localhost:3000');
        
        // Start new game
        await page.click('#newGameBtn');
        
        // Wait for cutscene to complete or skip it
        await page.waitForTimeout(2000);
        const skipBtn = await page.$('button:has-text("Skip")');
        if (skipBtn) {
            await skipBtn.click();
        }
        
        // Wait for game to initialize
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
        await page.goto('http://localhost:3000');
        await page.click('#newGameBtn');
        
        // Skip cutscene
        await page.waitForTimeout(2000);
        const skipBtn = await page.$('button:has-text("Skip")');
        if (skipBtn) await skipBtn.click();
        await page.waitForTimeout(2000);
        
        // Step 1: Deploy first probe
        let content = await page.textContent('#tutorialPanel');
        expect(content).toContain('Deploy Your First Probe');
        
        // Deploy a probe
        await page.click('canvas', { position: { x: 960, y: 540 } }); // Click hub
        await page.waitForTimeout(500);
        
        // Click deploy button if visible
        const deployBtn = await page.$('button:has-text("Deploy Probe")');
        if (deployBtn) {
            await deployBtn.click();
            await page.waitForTimeout(500);
            
            // Place waypoints
            await page.click('canvas', { position: { x: 800, y: 400 } });
            await page.waitForTimeout(200);
            await page.click('canvas', { position: { x: 700, y: 300 }, button: 'right' });
            
            await page.waitForTimeout(2000);
            
            // Should progress to step 2
            content = await page.textContent('#tutorialPanel');
            expect(content).toContain('Deploy All Your Probes');
            expect(content).toContain('Step 2');
        }
    });

    test('tutorial should stay visible until step completed', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.click('#newGameBtn');
        
        await page.waitForTimeout(2000);
        const skipBtn = await page.$('button:has-text("Skip")');
        if (skipBtn) await skipBtn.click();
        await page.waitForTimeout(2000);
        
        // Tutorial should be visible
        let isVisible = await page.isVisible('#tutorialPanel');
        expect(isVisible).toBe(true);
        
        // Wait 5 seconds - tutorial should still be visible
        await page.waitForTimeout(5000);
        isVisible = await page.isVisible('#tutorialPanel');
        expect(isVisible).toBe(true);
        
        // Content should still show step 1
        const content = await page.textContent('#tutorialPanel');
        expect(content).toContain('Deploy Your First Probe');
    });

    test('tutorial banner should not block gameplay', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.click('#newGameBtn');
        
        await page.waitForTimeout(2000);
        const skipBtn = await page.$('button:has-text("Skip")');
        if (skipBtn) await skipBtn.click();
        await page.waitForTimeout(2000);
        
        // Tutorial should be at top
        const tutorialPanel = await page.$('#tutorialPanel');
        const box = await tutorialPanel.boundingBox();
        
        expect(box.y).toBeLessThan(200); // Should be near top
        expect(box.height).toBeLessThan(100); // Should be short
        
        // Canvas should still be clickable below
        const canvas = await page.$('canvas');
        const canvasBox = await canvas.boundingBox();
        
        // Canvas should be below tutorial
        expect(canvasBox.y).toBeGreaterThan(box.y + box.height);
    });
});
