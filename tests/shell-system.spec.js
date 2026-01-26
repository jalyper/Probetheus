/**
 * Shell System Tests
 * Tests for shell equipping functionality on probes
 */

const { test, expect } = require('@playwright/test');

test.describe('Shell System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    async function startGame(page) {
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

    test('ShellSystem should be initialized with game', async ({ page }) => {
        await startGame(page);

        const hasShellSystem = await page.evaluate(() => {
            return window.game?.shellSystem !== null && window.game?.shellSystem !== undefined;
        });

        expect(hasShellSystem).toBe(true);
    });

    test('GameState should have cosmetics with shell properties', async ({ page }) => {
        await startGame(page);

        const cosmetics = await page.evaluate(() => {
            return {
                hasCosmetics: !!window.game.gameState.cosmetics,
                hasOwnedShells: !!window.game.gameState.cosmetics?.ownedShells,
                hasEquippedShells: !!window.game.gameState.cosmetics?.equippedShells,
                defaultProbeOwned: window.game.gameState.cosmetics?.ownedShells?.probes?.includes('default')
            };
        });

        expect(cosmetics.hasCosmetics).toBe(true);
        expect(cosmetics.hasOwnedShells).toBe(true);
        expect(cosmetics.hasEquippedShells).toBe(true);
        expect(cosmetics.defaultProbeOwned).toBe(true);
    });

    test('probe details panel should have shell section', async ({ page }) => {
        await startGame(page);

        // Select a probe to show details panel
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            window.game.gameState.ui.selectedProbe = probe;
            window.game.eventBus.emit('ui:probeSelected', { probe });
        });

        await page.waitForTimeout(500);

        // Check that shell section elements exist
        const shellSection = await page.locator('#shellSection').isVisible();
        const changeShellBtn = await page.locator('#changeShellBtn').isVisible();

        expect(shellSection).toBe(true);
        expect(changeShellBtn).toBe(true);
    });

    test('clicking change shell button should open shell modal', async ({ page }) => {
        await startGame(page);

        // Select a probe to show details panel
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            window.game.gameState.ui.selectedProbe = probe;
            window.game.eventBus.emit('ui:probeSelected', { probe });
        });

        await page.waitForTimeout(500);

        // Click change shell button
        await page.locator('#changeShellBtn').click();

        await page.waitForTimeout(300);

        // Check modal appeared
        const modalVisible = await page.locator('#shellModal').isVisible();
        expect(modalVisible).toBe(true);
    });

    test('shell modal should show owned shells', async ({ page }) => {
        await startGame(page);

        // Select a probe to show details panel
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            window.game.gameState.ui.selectedProbe = probe;
            window.game.eventBus.emit('ui:probeSelected', { probe });
        });

        await page.waitForTimeout(500);

        // Click change shell button
        await page.locator('#changeShellBtn').click();

        await page.waitForTimeout(300);

        // Check that at least one shell option exists (default)
        const shellOptions = await page.locator('.shell-option').count();
        expect(shellOptions).toBeGreaterThanOrEqual(1);
    });

    test('clicking on shell option should equip it to probe', async ({ page }) => {
        await startGame(page);

        // Add a second shell to owned shells so we can switch
        await page.evaluate(() => {
            // Add a second shell for testing
            window.game.gameState.cosmetics.ownedShells.probes.push('quantum_phase');
        });

        // Select a probe to show details panel
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            window.game.gameState.ui.selectedProbe = probe;
            window.game.eventBus.emit('ui:probeSelected', { probe });
        });

        await page.waitForTimeout(500);

        // Click change shell button
        await page.locator('#changeShellBtn').click();
        await page.waitForTimeout(300);

        // Count shells before clicking
        const shellOptionsBefore = await page.locator('.shell-option').count();

        // If there's more than one shell, click the second one
        if (shellOptionsBefore > 1) {
            await page.locator('.shell-option').nth(1).click();
            await page.waitForTimeout(500);

            // Check that the probe has the new shell ID
            const probeShellId = await page.evaluate(() => {
                return window.game.gameState.entities.probes[0].shellId;
            });

            expect(probeShellId).not.toBe('default');
        }
    });

    test('shell modal should close when clicking outside', async ({ page }) => {
        await startGame(page);

        // Select a probe to show details panel
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            window.game.gameState.ui.selectedProbe = probe;
            window.game.eventBus.emit('ui:probeSelected', { probe });
        });

        await page.waitForTimeout(500);

        // Click change shell button
        await page.locator('#changeShellBtn').click();
        await page.waitForTimeout(300);

        // Click on the modal background (outside the content)
        await page.locator('#shellModal').click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(300);

        // Modal should be closed
        const modalExists = await page.locator('#shellModal').count();
        expect(modalExists).toBe(0);
    });

    test('ShellSystem.getProbeShell should return correct shell for probe', async ({ page }) => {
        await startGame(page);

        const shellData = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            const shell = window.game.shellSystem.getProbeShell(probe);
            return {
                hasShell: !!shell,
                shellId: shell?.id
            };
        });

        expect(shellData.hasShell).toBe(true);
        expect(shellData.shellId).toBe('default');
    });

    test('ShellSystem.equipShellOnProbe should set shellId on probe', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // First add a shell to owned
            window.game.gameState.cosmetics.ownedShells.probes.push('quantum_phase');

            // Equip it
            const equipResult = window.game.shellSystem.equipShellOnProbe(probe, 'quantum_phase');

            return {
                success: equipResult.success,
                probeShellId: probe.shellId
            };
        });

        expect(result.success).toBe(true);
        expect(result.probeShellId).toBe('quantum_phase');
    });

    test('ShellSystem.equipShellOnProbe should fail for unowned shell', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // Try to equip an unowned shell
            const equipResult = window.game.shellSystem.equipShellOnProbe(probe, 'nonexistent_shell');

            return {
                success: equipResult.success,
                error: equipResult.error
            };
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Shell not owned');
    });

    test('shell section should display current shell name', async ({ page }) => {
        await startGame(page);

        // Select a probe to show details panel
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            window.game.gameState.ui.selectedProbe = probe;
            window.game.eventBus.emit('ui:probeSelected', { probe });
        });

        await page.waitForTimeout(500);

        // Check that shell name is displayed
        const shellName = await page.locator('#currentShellName').textContent();
        expect(shellName).toBe('Standard Issue');
    });

    test('shell section should update after equipping new shell', async ({ page }) => {
        await startGame(page);

        // Add quantum shell to owned
        await page.evaluate(() => {
            window.game.gameState.cosmetics.ownedShells.probes.push('quantum_phase');
        });

        // Select a probe
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            window.game.gameState.ui.selectedProbe = probe;
            window.game.eventBus.emit('ui:probeSelected', { probe });
        });

        await page.waitForTimeout(500);

        // Get initial shell name
        const initialShellName = await page.locator('#currentShellName').textContent();
        expect(initialShellName).toBe('Standard Issue');

        // Equip a different shell
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            window.game.shellSystem.equipShellOnProbe(probe, 'quantum_phase');
            window.uiManager.updateShellSection(probe);
        });

        await page.waitForTimeout(300);

        // Shell name should have updated
        const newShellName = await page.locator('#currentShellName').textContent();
        expect(newShellName).toBe('Quantum Phase');
    });
});
