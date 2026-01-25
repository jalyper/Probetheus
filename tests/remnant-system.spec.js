// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Remnant NPC System', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        // Wait for page to fully load
        await page.waitForLoadState('networkidle');

        // Start new game
        await page.locator('#newGameBtn').click();

        // Handle cutscene - click skip if visible
        try {
            const skipButton = page.locator('#skipCutscene');
            await skipButton.click({ timeout: 3000 });
        } catch (e) {
            // Cutscene might not be showing, continue
        }

        // Wait for game canvas
        await page.waitForSelector('#galaxyCanvas');

        // Wait for game systems to be ready
        await page.waitForTimeout(2000);

        // Dismiss tutorial panel
        await page.evaluate(() => {
            const tutorialPanel = document.getElementById('tutorialPanel');
            if (tutorialPanel) tutorialPanel.style.display = 'none';
        });

        // Ensure all core systems are loaded
        await page.waitForFunction(() => {
            return typeof window.game !== 'undefined' &&
                   window.game.gameState &&
                   window.game.remnantManager &&
                   window.game.dialogueSystem;
        }, { timeout: 10000 });
    });

    test('RemnantManager initializes correctly', async ({ page }) => {
        const remnantManager = await page.evaluate(() => {
            return {
                exists: !!window.game.remnantManager,
                activeRemnant: window.game.remnantManager?.getActiveRemnant(),
                spawnCooldown: window.game.remnantManager?.spawnCooldown
            };
        });

        expect(remnantManager.exists).toBe(true);
        expect(remnantManager.activeRemnant).toBeNull();
        expect(remnantManager.spawnCooldown).toBe(180000); // 3 minutes
    });

    test('DialogueSystem initializes correctly', async ({ page }) => {
        const dialogueSystem = await page.evaluate(() => {
            return {
                exists: !!window.game.dialogueSystem,
                isActive: window.game.dialogueSystem?.isActive(),
                containerExists: !!document.getElementById('dialogueContainer')
            };
        });

        expect(dialogueSystem.exists).toBe(true);
        expect(dialogueSystem.isActive).toBe(false);
        expect(dialogueSystem.containerExists).toBe(true);
    });

    test('dialogue container is hidden by default', async ({ page }) => {
        const containerStyle = await page.evaluate(() => {
            const container = document.getElementById('dialogueContainer');
            return container?.style.display;
        });

        expect(containerStyle).toBe('none');
    });

    test('remnant spawn conditions check correctly', async ({ page }) => {
        // Test that remnant doesn't spawn without meeting conditions
        const canSpawn = await page.evaluate(() => {
            const rm = window.game.remnantManager;

            // Check conditions before modification
            const exploredCount = rm.getExploredSectorCount();
            const lifetimeProbetheum = rm.getLifetimeProbetheum();

            return {
                exploredCount,
                lifetimeProbetheum,
                meetsExploredCondition: exploredCount >= 2,
                meetsProbethiumCondition: lifetimeProbetheum >= 10
            };
        });

        // New game shouldn't meet all spawn conditions
        // (typically starts with 1 explored sector and 0 probetheum)
        expect(canSpawn.exploredCount).toBeGreaterThanOrEqual(1);
        expect(canSpawn.lifetimeProbetheum).toBeLessThan(10);
    });

    test('forceSpawn creates an active remnant', async ({ page }) => {
        const result = await page.evaluate(() => {
            const rm = window.game.remnantManager;

            // Force spawn Keth-Varn (always available)
            rm.forceSpawn('keth_varn');

            const active = rm.getActiveRemnant();
            return {
                hasActive: !!active,
                type: active?.type?.id,
                name: active?.type?.name,
                hasPosition: typeof active?.x === 'number' && typeof active?.y === 'number'
            };
        });

        expect(result.hasActive).toBe(true);
        expect(result.type).toBe('keth_varn');
        expect(result.name).toBe('Keth-Varn');
        expect(result.hasPosition).toBe(true);
    });

    test('remnant emits spawn event', async ({ page }) => {
        const eventFired = await page.evaluate(() => {
            return new Promise((resolve) => {
                window.game.eventBus.on('remnant:spawned', (data) => {
                    resolve({
                        fired: true,
                        remnantId: data.remnantId,
                        hasPosition: !!data.position
                    });
                });

                window.game.remnantManager.forceSpawn('keth_varn');
            });
        });

        expect(eventFired.fired).toBe(true);
        expect(eventFired.remnantId).toBe('keth_varn');
        expect(eventFired.hasPosition).toBe(true);
    });

    test('despawnRemnant removes active remnant', async ({ page }) => {
        const result = await page.evaluate(() => {
            const rm = window.game.remnantManager;

            // Spawn then despawn
            rm.forceSpawn('keth_varn');
            const hadActive = !!rm.getActiveRemnant();

            rm.despawnRemnant('test');
            const stillActive = rm.getActiveRemnant();

            return {
                hadActive,
                stillActive: !!stillActive
            };
        });

        expect(result.hadActive).toBe(true);
        expect(result.stillActive).toBe(false);
    });

    test('remnant emits despawn event', async ({ page }) => {
        const events = await page.evaluate(() => {
            return new Promise((resolve) => {
                const result = { spawned: false, despawned: false, reason: null };

                window.game.eventBus.on('remnant:spawned', () => {
                    result.spawned = true;
                });

                window.game.eventBus.on('remnant:despawned', (data) => {
                    result.despawned = true;
                    result.reason = data.reason;
                    resolve(result);
                });

                window.game.remnantManager.forceSpawn('keth_varn');
                window.game.remnantManager.despawnRemnant('manual_test');
            });
        });

        expect(events.spawned).toBe(true);
        expect(events.despawned).toBe(true);
        expect(events.reason).toBe('manual_test');
    });

    test('dialogue starts when remnant is interacted with', async ({ page }) => {
        const result = await page.evaluate(() => {
            return new Promise((resolve) => {
                window.game.eventBus.on('dialogue:started', (data) => {
                    resolve({
                        dialogueStarted: true,
                        remnantId: data.remnantId,
                        containerVisible: document.getElementById('dialogueContainer')?.style.display !== 'none'
                    });
                });

                // Force spawn and interact
                window.game.remnantManager.forceSpawn('keth_varn');
                window.game.remnantManager.interact();
            });
        });

        expect(result.dialogueStarted).toBe(true);
        expect(result.remnantId).toBe('keth_varn');
        expect(result.containerVisible).toBe(true);
    });

    test('dialogue shows correct NPC name', async ({ page }) => {
        await page.evaluate(() => {
            window.game.remnantManager.forceSpawn('keth_varn');
            window.game.remnantManager.interact();
        });

        // Wait for dialogue to appear
        await page.waitForTimeout(100);

        const npcName = await page.evaluate(() => {
            return document.getElementById('dialogueNPCName')?.textContent;
        });

        expect(npcName).toContain('Keth-Varn');
        expect(npcName).toContain('The Mathematician');
    });

    test('dialogue close button works', async ({ page }) => {
        await page.evaluate(() => {
            window.game.remnantManager.forceSpawn('keth_varn');
            window.game.remnantManager.interact();
        });

        // Wait for dialogue
        await page.waitForTimeout(100);

        // Verify dialogue is visible
        let visible = await page.evaluate(() => {
            return document.getElementById('dialogueContainer')?.style.display !== 'none';
        });
        expect(visible).toBe(true);

        // Click close button
        await page.click('#dialogueCloseBtn');
        await page.waitForTimeout(300); // Wait for animation

        // Verify dialogue is hidden
        visible = await page.evaluate(() => {
            return document.getElementById('dialogueContainer')?.style.display !== 'none';
        });
        expect(visible).toBe(false);
    });

    test('different remnants have different eye colors', async ({ page }) => {
        const remnantTypes = await page.evaluate(() => {
            const rm = window.game.remnantManager;
            return {
                kethVarn: rm.remnantTypes.keth_varn.eyeColor,
                whisperer: rm.remnantTypes.whisperer.eyeColor,
                miraSol: rm.remnantTypes.mira_sol.eyeColor,
                archivist: rm.remnantTypes.archivist.eyeColor,
                null: rm.remnantTypes.null.eyeColor
            };
        });

        expect(remnantTypes.kethVarn).toBe('#00ffff');  // Cyan
        expect(remnantTypes.whisperer).toBe('#ffffff'); // White
        expect(remnantTypes.miraSol).toBe('#ffaa00');   // Amber
        expect(remnantTypes.archivist).toBe('#aa3333'); // Dim red
        expect(remnantTypes.null).toBe('#000000');      // Void black
    });

    test('remnant unlock conditions work correctly', async ({ page }) => {
        const unlockStatus = await page.evaluate(() => {
            const rm = window.game.remnantManager;

            // Keth-Varn should always be available
            const kethVarnUnlocked = rm.remnantTypes.keth_varn.unlockCondition();

            // Others should have specific conditions
            const whispererCondition = rm.getMiningStationCount() >= 3;
            const miraSolCondition = rm.hasAlienTechResearch();
            const archivistCondition = rm.getLifetimeProbetheum() >= 100;
            const nullCondition = rm.getPurchasedFragmentCount() >= 10;

            return {
                kethVarnUnlocked,
                whispererCondition,
                miraSolCondition,
                archivistCondition,
                nullCondition
            };
        });

        // Keth-Varn should always be unlocked
        expect(unlockStatus.kethVarnUnlocked).toBe(true);

        // Others should be locked at game start
        expect(unlockStatus.whispererCondition).toBe(false);
        expect(unlockStatus.miraSolCondition).toBe(false);
        expect(unlockStatus.archivistCondition).toBe(false);
        expect(unlockStatus.nullCondition).toBe(false);
    });

    test('story state can be saved and loaded', async ({ page }) => {
        const result = await page.evaluate(() => {
            const rm = window.game.remnantManager;

            // Modify story state
            rm.storyState.fragmentsPurchased.add('fragment_001');
            rm.storyState.fragmentsPurchased.add('fragment_002');
            rm.storyState.remnantsEncountered.add('keth_varn');
            rm.storyState.totalProbetheumSpentOnStory = 25;

            // Get state
            const savedState = rm.getStoryState();

            // Clear state
            rm.storyState.fragmentsPurchased.clear();
            rm.storyState.remnantsEncountered.clear();
            rm.storyState.totalProbetheumSpentOnStory = 0;

            // Restore state
            rm.setStoryState(savedState);

            // Verify restoration
            return {
                fragmentCount: rm.storyState.fragmentsPurchased.size,
                hasFragment001: rm.storyState.fragmentsPurchased.has('fragment_001'),
                hasFragment002: rm.storyState.fragmentsPurchased.has('fragment_002'),
                encounterCount: rm.storyState.remnantsEncountered.size,
                hasKethVarn: rm.storyState.remnantsEncountered.has('keth_varn'),
                totalSpent: rm.storyState.totalProbetheumSpentOnStory
            };
        });

        expect(result.fragmentCount).toBe(2);
        expect(result.hasFragment001).toBe(true);
        expect(result.hasFragment002).toBe(true);
        expect(result.encounterCount).toBe(1);
        expect(result.hasKethVarn).toBe(true);
        expect(result.totalSpent).toBe(25);
    });
});
