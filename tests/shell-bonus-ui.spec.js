/**
 * Shell Bonus UI Tests
 * Tests tooltip display in shell selection modal and detail panels
 * Covers TEST-05, TEST-06 requirements (BUI-01 through BUI-05)
 */

const { test, expect } = require('@playwright/test');

test.describe('Shell Bonus UI - Tooltips', () => {
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

    // =========================================================
    // TEST-05 / BUI-01: Shell Selection Modal Tooltip
    // =========================================================

    test('BUI-01: shell selection modal shows bonus tooltip on hover', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(async () => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Find a shell with bonuses from SHELL_CATALOG
            const catalog = window.SHELL_CATALOG.probes;
            let shellWithBonuses = null;
            for (const shell of Object.values(catalog)) {
                if (shell.bonuses && Object.keys(shell.bonuses).length > 0) {
                    shellWithBonuses = shell;
                    break;
                }
            }
            if (!shellWithBonuses) return { error: 'no shell with bonuses found' };

            // Add to owned shells
            const gs = window.game.gameState;
            if (!gs.cosmetics.ownedShells.probes.includes(shellWithBonuses.id)) {
                gs.cosmetics.ownedShells.probes.push(shellWithBonuses.id);
            }

            // Open shell modal
            window.game.uiManager.showShellModal(probe);

            // Wait for modal to render
            await new Promise(resolve => setTimeout(resolve, 100));

            // Find the shell option element
            const shellOption = document.querySelector(`.shell-option[data-shell-id="${shellWithBonuses.id}"]`);
            if (!shellOption) return { error: 'shell option not found in modal' };

            // Dispatch mouseenter event
            const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
            shellOption.dispatchEvent(mouseEnterEvent);

            // Wait for tooltip delay (300ms) + buffer
            await new Promise(resolve => setTimeout(resolve, 400));

            // Check tooltip
            const tooltip = document.getElementById('bonusTooltip');
            if (!tooltip) return { error: 'tooltip element not found' };

            const isVisible = tooltip.style.display === 'block';
            const content = tooltip.innerHTML;
            const hasPlus = content.includes('+');
            const hasPercent = content.includes('%');

            return {
                isVisible,
                hasPlus,
                hasPercent,
                shellId: shellWithBonuses.id,
                content: content.substring(0, 200) // Truncate for assertion
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.isVisible).toBe(true);
        expect(result.hasPlus).toBe(true);
        expect(result.hasPercent).toBe(true);
    });

    test('BUI-05 / TEST-05: tooltip displays correct bonus label, icon, and percentage', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(async () => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Use a specific shell with known bonuses: echo_receiver (signalRange: 10)
            const shellId = 'echo_receiver';
            const shell = window.SHELL_CATALOG.probes[shellId];
            if (!shell) return { error: 'test shell not found' };

            const gs = window.game.gameState;
            if (!gs.cosmetics.ownedShells.probes.includes(shellId)) {
                gs.cosmetics.ownedShells.probes.push(shellId);
            }

            // Open shell modal
            window.game.uiManager.showShellModal(probe);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Trigger tooltip
            const shellOption = document.querySelector(`.shell-option[data-shell-id="${shellId}"]`);
            if (!shellOption) return { error: 'shell option not found' };

            shellOption.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 400));

            const tooltip = document.getElementById('bonusTooltip');
            if (!tooltip) return { error: 'tooltip not found' };

            const content = tooltip.innerHTML;

            // Check for expected content based on echo_receiver shell (signalRange: 10)
            const bonusTypes = window.game.shellSystem.constructor.BONUS_TYPES || window.BONUS_TYPES;
            const signalRangeInfo = bonusTypes?.signalRange;

            return {
                content,
                hasLabel: content.includes('Signal Range'),
                hasPercentage: content.includes('+10%'),
                hasIcon: signalRangeInfo ? content.includes(signalRangeInfo.icon) : null,
                isVisible: tooltip.style.display === 'block'
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.isVisible).toBe(true);
        expect(result.hasLabel).toBe(true);
        expect(result.hasPercentage).toBe(true);
        // Icon check is optional based on BONUS_TYPES availability
        if (result.hasIcon !== null) {
            expect(result.hasIcon).toBe(true);
        }
    });

    test('default shell shows no tooltip', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(async () => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Open shell modal
            window.game.uiManager.showShellModal(probe);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Find default shell option
            const defaultOption = document.querySelector('.shell-option[data-shell-id="default"]');
            if (!defaultOption) return { error: 'default shell option not found' };

            // Hover over default
            defaultOption.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 400));

            const tooltip = document.getElementById('bonusTooltip');
            if (!tooltip) return { error: 'tooltip element not found' };

            return {
                display: tooltip.style.display,
                content: tooltip.innerHTML
            };
        });

        expect(result.error).toBeUndefined();
        // Tooltip should remain hidden or have no content
        expect(result.display).toBe('none');
    });

    test('tooltip dismisses on mouseleave', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(async () => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Find shell with bonuses
            const catalog = window.SHELL_CATALOG.probes;
            const shell = Object.values(catalog).find(s => s.bonuses && Object.keys(s.bonuses).length > 0);
            if (!shell) return { error: 'no shell with bonuses' };

            const gs = window.game.gameState;
            if (!gs.cosmetics.ownedShells.probes.includes(shell.id)) {
                gs.cosmetics.ownedShells.probes.push(shell.id);
            }

            window.game.uiManager.showShellModal(probe);
            await new Promise(resolve => setTimeout(resolve, 100));

            const shellOption = document.querySelector(`.shell-option[data-shell-id="${shell.id}"]`);
            if (!shellOption) return { error: 'shell option not found' };

            // Show tooltip
            shellOption.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 400));

            const tooltip = document.getElementById('bonusTooltip');
            if (!tooltip) return { error: 'tooltip not found' };

            const wasVisible = tooltip.style.display === 'block';

            // Trigger mouseleave
            shellOption.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

            // Check immediately (no delay)
            const nowHidden = tooltip.style.display === 'none';

            return { wasVisible, nowHidden };
        });

        expect(result.error).toBeUndefined();
        expect(result.wasVisible).toBe(true);
        expect(result.nowHidden).toBe(true);
    });

    // =========================================================
    // TEST-06 / BUI-02: Probe Detail Panel Shell Preview Tooltip
    // =========================================================

    test('BUI-02 / TEST-06: probe detail panel shell preview shows tooltip', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(async () => {
            const probe = window.game.gameState.entities.probes[0];
            if (!probe) return { error: 'no probe' };

            // Equip a shell with bonuses
            const shellId = 'echo_receiver'; // signalRange: 10
            const gs = window.game.gameState;
            if (!gs.cosmetics.ownedShells.probes.includes(shellId)) {
                gs.cosmetics.ownedShells.probes.push(shellId);
            }
            window.game.shellSystem.equipShellOnProbe(probe, shellId);

            // Close any open panels first
            const detailsPanel = document.getElementById('detailsPanel');
            if (detailsPanel) detailsPanel.style.display = 'none';

            // Select the probe using the proper event pattern
            probe.selected = true;
            window.game.gameState.ui.selectedProbe = probe;
            window.game.eventBus.emit('ui:probeSelected', { probe });

            // Wait for panel render and tooltip handlers to attach
            await new Promise(resolve => setTimeout(resolve, 800));

            // Verify panel is visible
            const probeDetailPanel = document.getElementById('probeDetailPanel');
            if (!probeDetailPanel || probeDetailPanel.style.display === 'none') {
                return { error: `probeDetailPanel not visible (display: ${probeDetailPanel?.style.display || 'null'})` };
            }

            // Find currentShellPreview element
            const previewElement = document.getElementById('currentShellPreview');
            if (!previewElement) return { error: 'currentShellPreview element not found' };

            // Verify element is visible
            const previewVisible = previewElement.offsetParent !== null;
            if (!previewVisible) return { error: 'currentShellPreview not visible' };

            // Dispatch mouseenter
            previewElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 500));

            const tooltip = document.getElementById('bonusTooltip');
            if (!tooltip) return { error: 'tooltip not found' };

            const isVisible = tooltip.style.display === 'block';
            const content = tooltip.innerHTML;

            return {
                isVisible,
                hasBonus: content.includes('+') && content.includes('%'),
                hasSignalRange: content.includes('Signal Range')
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.isVisible).toBe(true);
        expect(result.hasBonus).toBe(true);
        expect(result.hasSignalRange).toBe(true);
    });

    // =========================================================
    // TEST-06 / BUI-03: Hub Detail Panel Shell Indicator Tooltip
    // =========================================================

    test('BUI-03 / TEST-06: hub detail panel shell indicator shows tooltip', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(async () => {
            const gs = window.game.gameState;

            // Find a hub shell with bonuses
            const catalog = window.SHELL_CATALOG.hubs;
            const hubShell = Object.values(catalog).find(s => s.bonuses && Object.keys(s.bonuses).length > 0);
            if (!hubShell) return { error: 'no hub shell with bonuses' };

            // Equip hub shell
            if (!gs.cosmetics.ownedShells.hubs.includes(hubShell.id)) {
                gs.cosmetics.ownedShells.hubs.push(hubShell.id);
            }
            gs.cosmetics.equippedShells.hubs = hubShell.id;

            // Select a hub
            const hub = gs.entities.reconHubs[0];
            if (!hub) return { error: 'no hub found' };

            hub.selected = true;
            window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });

            // Wait for detail panel render
            await new Promise(resolve => setTimeout(resolve, 200));

            // Find hubShellIndicator
            const indicator = document.getElementById('hubShellIndicator');
            if (!indicator) return { error: 'hubShellIndicator not found' };

            // Trigger tooltip
            indicator.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 400));

            const tooltip = document.getElementById('bonusTooltip');
            if (!tooltip) return { error: 'tooltip not found' };

            const isVisible = tooltip.style.display === 'block';
            const content = tooltip.innerHTML;

            return {
                isVisible,
                hasBonus: content.includes('+') && content.includes('%'),
                hasResearchSpeed: content.includes('Research Speed'), // Hub shells have researchSpeed
                shellId: hubShell.id
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.isVisible).toBe(true);
        expect(result.hasBonus).toBe(true);
        expect(result.hasResearchSpeed).toBe(true);
    });

    // =========================================================
    // TEST-06 / BUI-04: Mining Station Detail Panel Shell Indicator Tooltip
    // =========================================================

    test('BUI-04 / TEST-06: mining station detail panel shell indicator shows tooltip', async ({ page }) => {
        await startGame(page);

        const result = await page.evaluate(async () => {
            const gs = window.game.gameState;

            // Ensure mining.stations array exists and create a station if none exists
            if (!gs.mining) gs.mining = { stations: [], shuttles: [] };
            if (!gs.mining.stations) gs.mining.stations = [];

            if (gs.mining.stations.length === 0) {
                // Create a properly structured mining station
                const newStation = {
                    id: 'test-station-' + Date.now(),
                    type: 'basic',
                    position: { x: 100, y: 100 },
                    hubId: gs.entities.reconHubs[0]?.id || 'test-hub',
                    level: 1,
                    active: true,
                    efficiency: 1.0,
                    resourceBuffer: {},
                    stationInventory: { minerals: 0, data: 0 },
                    lastConsumption: Date.now(),
                    totalProduced: 0,
                    createdAt: Date.now()
                };
                gs.mining.stations.push(newStation);
            }

            // Find a station shell with bonuses
            const catalog = window.SHELL_CATALOG.miningStations;
            const stationShell = Object.values(catalog).find(s => s.bonuses && Object.keys(s.bonuses).length > 0);
            if (!stationShell) return { error: 'no station shell with bonuses' };

            // Equip station shell
            if (!gs.cosmetics.ownedShells.miningStations.includes(stationShell.id)) {
                gs.cosmetics.ownedShells.miningStations.push(stationShell.id);
            }
            gs.cosmetics.equippedShells.miningStations = stationShell.id;

            // Close any open panels first
            const probePanel = document.getElementById('probeDetailPanel');
            if (probePanel) probePanel.style.display = 'none';

            // Select the station
            const station = gs.mining.stations[0];
            station.selected = true;
            window.game.eventBus.emit('entity:selected', { entity: station, type: 'miningStation' });

            // Wait for detail panel render and tooltip handlers to attach
            await new Promise(resolve => setTimeout(resolve, 800));

            // Verify detailsPanel is visible
            const detailsPanel = document.getElementById('detailsPanel');
            if (!detailsPanel || detailsPanel.style.display === 'none') {
                return { error: `detailsPanel not visible (display: ${detailsPanel?.style.display || 'null'})` };
            }

            // Find stationShellIndicator
            const indicator = document.getElementById('stationShellIndicator');
            if (!indicator) return { error: 'stationShellIndicator not found' };

            // Trigger tooltip
            indicator.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(resolve => setTimeout(resolve, 400));

            const tooltip = document.getElementById('bonusTooltip');
            if (!tooltip) return { error: 'tooltip not found' };

            const isVisible = tooltip.style.display === 'block';
            const content = tooltip.innerHTML;

            // Station shells can have miningEfficiency, shuttleSpeed, or probethiumRate
            const hasStationBonus = content.includes('Mining Efficiency') ||
                                   content.includes('Shuttle Speed') ||
                                   content.includes('Probetheum Rate');

            return {
                isVisible,
                hasBonus: content.includes('+') && content.includes('%'),
                hasStationBonus,
                shellId: stationShell.id
            };
        });

        expect(result.error).toBeUndefined();
        expect(result.isVisible).toBe(true);
        expect(result.hasBonus).toBe(true);
        expect(result.hasStationBonus).toBe(true);
    });
});
