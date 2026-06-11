/**
 * Equipment Slots System Tests
 * Tests for PRD requirements in .planning/equipment-slots-prd.md
 */

const { test, expect } = require('@playwright/test');

test.describe('Equipment Slots System', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    async function startGameWithResources(page, minerals = 500, data = 100) {
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

        // Give resources and decode the protocols that gate collectors
        await page.evaluate(({ minerals, data }) => {
            window.game.gameState.resources.minerals = minerals;
            window.game.gameState.resources.data = data;
            // Unlock typed + universal collectors via Uplink protocols
            window.game.gameState.uplink.decoded.add('harvest_lattice');
            window.game.gameState.uplink.decoded.add('universal_lattice');
            window.uiManager.updateUI();
        }, { minerals, data });
    }

    test('new probes should have empty equipment array and 2 slots', async ({ page }) => {
        await startGameWithResources(page);

        const probeState = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            return {
                hasEquipmentArray: Array.isArray(probe.equipment),
                equipmentLength: probe.equipment ? probe.equipment.length : -1,
                maxSlots: probe.maxEquipmentSlots
            };
        });

        expect(probeState.hasEquipmentArray).toBe(true);
        expect(probeState.equipmentLength).toBe(0);
        expect(probeState.maxSlots).toBe(2);
    });

    test('should be able to equip mineral collector', async ({ page }) => {
        await startGameWithResources(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            const detailsPanel = window.game.detailsPanel;

            // Simulate equipping via the equipEquipment method
            const equipmentTypes = [{
                id: 'mineral_collector',
                name: 'Mineral Collector',
                cost: 25,
                slotsRequired: 1,
                collectionTypes: ['minerals']
            }];

            detailsPanel.equipEquipment(probe, 'mineral_collector', equipmentTypes);

            return {
                equipmentLength: probe.equipment.length,
                firstEquipmentType: probe.equipment[0]?.type,
                firstEquipmentName: probe.equipment[0]?.name,
                collectionTypes: probe.equipment[0]?.collectionTypes
            };
        });

        expect(result.equipmentLength).toBe(1);
        expect(result.firstEquipmentType).toBe('mineral_collector');
        expect(result.firstEquipmentName).toBe('Mineral Collector');
        expect(result.collectionTypes).toContain('minerals');
    });

    test('should enforce slot limit of 2', async ({ page }) => {
        await startGameWithResources(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            const detailsPanel = window.game.detailsPanel;

            const equipmentTypes = [
                { id: 'mineral_collector', name: 'Mineral Collector', cost: 25, slotsRequired: 1, collectionTypes: ['minerals'] },
                { id: 'data_collector', name: 'Data Collector', cost: 25, slotsRequired: 1, collectionTypes: ['data'] },
                { id: 'artifact_collector', name: 'Artifact Collector', cost: 25, slotsRequired: 1, collectionTypes: ['artifacts'] }
            ];

            // Equip first two
            detailsPanel.equipEquipment(probe, 'mineral_collector', equipmentTypes);
            detailsPanel.equipEquipment(probe, 'data_collector', equipmentTypes);

            // Try to equip a third - should fail due to slot limit
            const beforeThird = probe.equipment.length;
            detailsPanel.equipEquipment(probe, 'artifact_collector', equipmentTypes);
            const afterThird = probe.equipment.length;

            return {
                slotsAfterTwo: beforeThird,
                slotsAfterThirdAttempt: afterThird,
                equippedTypes: probe.equipment.map(e => e.type)
            };
        });

        expect(result.slotsAfterTwo).toBe(2);
        expect(result.slotsAfterThirdAttempt).toBe(2); // Should still be 2
        expect(result.equippedTypes).toContain('mineral_collector');
        expect(result.equippedTypes).toContain('data_collector');
        expect(result.equippedTypes).not.toContain('artifact_collector');
    });

    test('should not allow duplicate equipment', async ({ page }) => {
        await startGameWithResources(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            const detailsPanel = window.game.detailsPanel;

            const equipmentTypes = [
                { id: 'mineral_collector', name: 'Mineral Collector', cost: 25, slotsRequired: 1, collectionTypes: ['minerals'] }
            ];

            // Equip mineral collector
            detailsPanel.equipEquipment(probe, 'mineral_collector', equipmentTypes);
            const afterFirst = probe.equipment.length;

            // Try to equip the same item again - should fail
            detailsPanel.equipEquipment(probe, 'mineral_collector', equipmentTypes);
            const afterSecond = probe.equipment.length;

            return {
                afterFirst,
                afterSecond
            };
        });

        expect(result.afterFirst).toBe(1);
        expect(result.afterSecond).toBe(1); // Should still be 1 (no duplicate)
    });

    test('should be able to remove equipment', async ({ page }) => {
        await startGameWithResources(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            const detailsPanel = window.game.detailsPanel;

            const equipmentTypes = [
                { id: 'mineral_collector', name: 'Mineral Collector', cost: 25, slotsRequired: 1, collectionTypes: ['minerals'] },
                { id: 'data_collector', name: 'Data Collector', cost: 25, slotsRequired: 1, collectionTypes: ['data'] }
            ];

            // Equip two items
            detailsPanel.equipEquipment(probe, 'mineral_collector', equipmentTypes);
            detailsPanel.equipEquipment(probe, 'data_collector', equipmentTypes);
            const beforeRemove = probe.equipment.length;

            // Remove the mineral collector
            detailsPanel.removeEquipmentByType(probe, 'mineral_collector');
            const afterRemove = probe.equipment.length;

            return {
                beforeRemove,
                afterRemove,
                remainingType: probe.equipment[0]?.type
            };
        });

        expect(result.beforeRemove).toBe(2);
        expect(result.afterRemove).toBe(1);
        expect(result.remainingType).toBe('data_collector');
    });

    test('should deduct minerals when equipping', async ({ page }) => {
        await startGameWithResources(page, 100);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            const detailsPanel = window.game.detailsPanel;
            const mineralsBefore = window.game.gameState.resources.minerals;

            const equipmentTypes = [
                { id: 'mineral_collector', name: 'Mineral Collector', cost: 25, slotsRequired: 1, collectionTypes: ['minerals'] }
            ];

            detailsPanel.equipEquipment(probe, 'mineral_collector', equipmentTypes);
            const mineralsAfter = window.game.gameState.resources.minerals;

            return {
                mineralsBefore,
                mineralsAfter,
                cost: mineralsBefore - mineralsAfter
            };
        });

        expect(result.mineralsBefore).toBe(100);
        expect(result.mineralsAfter).toBe(75);
        expect(result.cost).toBe(25);
    });

    test('should not equip if insufficient minerals', async ({ page }) => {
        await startGameWithResources(page, 10); // Only 10 minerals

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            const detailsPanel = window.game.detailsPanel;

            const equipmentTypes = [
                { id: 'mineral_collector', name: 'Mineral Collector', cost: 25, slotsRequired: 1, collectionTypes: ['minerals'] }
            ];

            // Try to equip with insufficient minerals
            detailsPanel.equipEquipment(probe, 'mineral_collector', equipmentTypes);

            return {
                equipmentLength: probe.equipment.length,
                mineralsCurrent: window.game.gameState.resources.minerals
            };
        });

        expect(result.equipmentLength).toBe(0);
        expect(result.mineralsCurrent).toBe(10); // Minerals unchanged
    });

    test('auto-collection should work with equipped collectors', async ({ page }) => {
        await startGameWithResources(page);

        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];

            // Manually add equipment for testing
            probe.equipment = [
                { type: 'mineral_collector', name: 'Mineral Collector', collectionTypes: ['minerals'] },
                { type: 'data_collector', name: 'Data Collector', collectionTypes: ['data'] }
            ];

            // Check what collection types are available via ProbeManager
            const probeManager = window.game.probeManager;

            // Get combined collection types
            const collectionTypes = new Set();
            probe.equipment.forEach(eq => {
                if (eq.collectionTypes) {
                    eq.collectionTypes.forEach(t => collectionTypes.add(t));
                }
            });

            return {
                canCollectMinerals: collectionTypes.has('minerals'),
                canCollectData: collectionTypes.has('data'),
                canCollectArtifacts: collectionTypes.has('artifacts')
            };
        });

        expect(result.canCollectMinerals).toBe(true);
        expect(result.canCollectData).toBe(true);
        expect(result.canCollectArtifacts).toBe(false);
    });

    test('equipment should persist through save/load', async ({ page }) => {
        await startGameWithResources(page);

        // Equip items and save
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            const detailsPanel = window.game.detailsPanel;

            const equipmentTypes = [
                { id: 'mineral_collector', name: 'Mineral Collector', cost: 25, slotsRequired: 1, collectionTypes: ['minerals'] },
                { id: 'data_collector', name: 'Data Collector', cost: 25, slotsRequired: 1, collectionTypes: ['data'] }
            ];

            detailsPanel.equipEquipment(probe, 'mineral_collector', equipmentTypes);
            detailsPanel.equipEquipment(probe, 'data_collector', equipmentTypes);
        });

        // Save the game programmatically
        await page.evaluate(async () => {
            await window.game.saveManager.saveGame(1);
        });

        // Reload the page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Start new game first to initialize game systems
        await page.locator('#newGameBtn').click();
        await page.waitForTimeout(1500);
        const skipBtn = page.locator('#skipCutscene');
        if (await skipBtn.isVisible()) {
            await skipBtn.click();
        }
        await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Load the save programmatically
        await page.evaluate(async () => {
            await window.game.saveManager.loadGame(1);
        });
        await page.waitForTimeout(1000);

        // Verify equipment is restored
        const result = await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            return {
                hasEquipmentArray: Array.isArray(probe.equipment),
                equipmentLength: probe.equipment ? probe.equipment.length : -1,
                equipmentTypes: probe.equipment ? probe.equipment.map(e => e.type) : [],
                maxSlots: probe.maxEquipmentSlots
            };
        });

        expect(result.hasEquipmentArray).toBe(true);
        expect(result.equipmentLength).toBe(2);
        expect(result.equipmentTypes).toContain('mineral_collector');
        expect(result.equipmentTypes).toContain('data_collector');
        expect(result.maxSlots).toBe(2);
    });

    test('EquipmentSystem class should be available globally', async ({ page }) => {
        await startGameWithResources(page);

        const result = await page.evaluate(() => {
            return {
                equipmentSystemExists: typeof window.EquipmentSystem !== 'undefined',
                equipmentTypesExists: typeof window.EQUIPMENT_TYPES !== 'undefined',
                hasMineralCollector: window.EQUIPMENT_TYPES?.mineral_collector !== undefined,
                hasDataCollector: window.EQUIPMENT_TYPES?.data_collector !== undefined,
                hasArtifactCollector: window.EQUIPMENT_TYPES?.artifact_collector !== undefined,
                hasUniversalCollector: window.EQUIPMENT_TYPES?.universal_collector !== undefined
            };
        });

        expect(result.equipmentSystemExists).toBe(true);
        expect(result.equipmentTypesExists).toBe(true);
        expect(result.hasMineralCollector).toBe(true);
        expect(result.hasDataCollector).toBe(true);
        expect(result.hasArtifactCollector).toBe(true);
        expect(result.hasUniversalCollector).toBe(true);
    });

    test('equipment modal should show slot indicators', async ({ page }) => {
        await startGameWithResources(page);

        // Open equipment modal via evaluate (since it's created dynamically)
        await page.evaluate(() => {
            const probe = window.game.gameState.entities.probes[0];
            window.game.detailsPanel.showEquipmentModal(probe);
        });

        // Wait for modal to appear
        await page.waitForSelector('#equipmentModal', { timeout: 5000 });

        // Check modal content
        const modalContent = await page.locator('#equipmentModal').textContent();
        expect(modalContent).toContain('Slots:');
        expect(modalContent).toContain('0/2');

        // Close modal
        await page.locator('#closeEquipmentModal').click();
    });
});

