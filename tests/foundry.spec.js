import { test, expect } from '@playwright/test';

/**
 * Foundry tests (docs/design/REBUILD.md §2 — transformation you can watch).
 * The Foundry replaces mining stations: it consumes a mineral flow and emits
 * an alloy flow at FOUNDRY.CONVERT_RATIO, fed by freighters working the
 * hub↔Foundry legs. Rate-matching states (starved/running/backed) must be
 * mechanically real, sim-time driven, and survive save/load.
 */

async function startNewGame(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('#newGameBtn').click();
  await page.waitForSelector('#galaxyCanvas');
  await page.waitForFunction(() => !!(window.game && window.game.gameState), { timeout: 10000 });
  await page.evaluate(() => {
    const skip = document.getElementById('skipCutsceneBtn');
    if (skip) skip.click();
    const tutorialPanel = document.getElementById('tutorialPanel');
    if (tutorialPanel) tutorialPanel.style.display = 'none';
  });
  await page.waitForTimeout(500);
}

/** Build a foundry near the home hub via the real build path (pays the recipe) */
async function buildTestFoundry(page) {
  return page.evaluate(() => {
    const game = window.game;
    const r = game.gameState.getResources();
    game.gameState.updateResources({ ...r, minerals: 1000, data: 1000 }, game.eventBus);
    const hub = game.gameState.entities.reconHubs[0];
    return game.foundrySystem.build({
      position: { x: hub.x + 200, y: hub.y + 120 },
      hubId: hub.id
    });
  });
}

test.describe('The Foundry', () => {

  test('system is loaded and the mining era is demolished', async ({ page }) => {
    await startNewGame(page);
    const wired = await page.evaluate(() => ({
      classLoaded: typeof window.FoundrySystem === 'function',
      instance: !!window.game.foundrySystem,
      state: !!window.game.gameState.foundry,
      miningGone: typeof window.MiningManager === 'undefined',
      miningStateGone: window.game.gameState.mining === undefined,
      alloyInWallet: typeof window.game.gameState.resources.alloy === 'number',
      alloyColor: !!window.PALETTE.MATERIALS.alloy
    }));
    expect(wired.classLoaded).toBe(true);
    expect(wired.instance).toBe(true);
    expect(wired.state).toBe(true);
    expect(wired.miningGone).toBe(true);
    expect(wired.miningStateGone).toBe(true);
    expect(wired.alloyInWallet).toBe(true);
    expect(wired.alloyColor).toBe(true);
  });

  test('building a foundry pays RECIPES.foundry and registers it to a hub', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const r = game.gameState.getResources();
      game.gameState.updateResources({ ...r, minerals: 1000, data: 1000 }, game.eventBus);
      const before = game.gameState.getResources();
      const hub = game.gameState.entities.reconHubs[0];
      const foundry = game.foundrySystem.build({
        position: { x: hub.x + 200, y: hub.y + 120 }, hubId: hub.id
      });
      const after = game.gameState.getResources();
      return {
        built: !!foundry,
        registered: game.gameState.foundry.foundries.length === 1,
        hubLinked: foundry && foundry.hubId === hub.id,
        mineralsSpent: before.minerals - after.minerals,
        dataSpent: before.data - after.data,
        startsStarved: foundry && foundry.status === 'starved'
      };
    });
    expect(result.built).toBe(true);
    expect(result.registered).toBe(true);
    expect(result.hubLinked).toBe(true);
    expect(result.mineralsSpent).toBe(120);
    expect(result.dataSpent).toBe(40);
    expect(result.startsStarved).toBe(true);
  });

  test('per-hub foundry cap is enforced', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const r = game.gameState.getResources();
      game.gameState.updateResources({ ...r, minerals: 5000, data: 5000 }, game.eventBus);
      const hub = game.gameState.entities.reconHubs[0];
      const C = window.GAME_CONSTANTS.FOUNDRY;
      const built = [];
      for (let i = 0; i <= C.MAX_PER_HUB; i++) {
        built.push(!!game.foundrySystem.build({
          position: { x: hub.x + 150 + i * 60, y: hub.y + 150 }, hubId: hub.id
        }));
      }
      return { built, max: C.MAX_PER_HUB, count: game.gameState.foundry.foundries.length };
    });
    expect(result.built.slice(0, result.max).every(Boolean)).toBe(true);
    expect(result.built[result.max]).toBe(false); // one past the cap is refused
    expect(result.count).toBe(result.max);
  });

  test('conversion: minerals in, alloy out at CONVERT_RATIO, sim-time driven', async ({ page }) => {
    await startNewGame(page);
    await buildTestFoundry(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0; // we drive the tick by hand
      const C = window.GAME_CONSTANTS.FOUNDRY;
      const foundry = game.gameState.foundry.foundries[0];
      foundry.input = 50;

      // One simulated minute of forge time
      game.foundrySystem.update(60000);

      const expectedConsumed = Math.min(C.MINERALS_PER_MIN_BASE, 50);
      return {
        status: foundry.status,
        input: foundry.input,
        output: foundry.output,
        expectedInput: 50 - expectedConsumed,
        expectedOutput: expectedConsumed / C.CONVERT_RATIO,
        converted: foundry.converted
      };
    });
    expect(result.status).toBe('running');
    expect(result.input).toBeCloseTo(result.expectedInput, 5);
    expect(result.output).toBeCloseTo(result.expectedOutput, 5);
    expect(result.converted).toBeCloseTo(result.expectedOutput, 5);
  });

  test('rate-matching states: starved when dry, backed when output is full', async ({ page }) => {
    await startNewGame(page);
    await buildTestFoundry(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0;
      const C = window.GAME_CONSTANTS.FOUNDRY;
      const foundry = game.gameState.foundry.foundries[0];

      foundry.input = 0;
      foundry.output = 0;
      game.foundrySystem.update(1000);
      const starved = foundry.status;

      foundry.input = C.INPUT_CAP;
      foundry.output = C.OUTPUT_CAP; // nowhere to put alloy
      game.foundrySystem.update(1000);
      const backed = foundry.status;
      const inputUntouched = foundry.input === C.INPUT_CAP;

      return { starved, backed, inputUntouched };
    });
    expect(result.starved).toBe('starved');
    expect(result.backed).toBe('backed');
    expect(result.inputUntouched).toBe(true); // a stalled forge consumes nothing
  });

  test('freighter loop: hauls minerals out, brings alloy home to the wallet', async ({ page }) => {
    await startNewGame(page);
    await buildTestFoundry(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0;
      const C = window.GAME_CONSTANTS.FOUNDRY;
      const foundry = game.gameState.foundry.foundries[0];
      const freighter = game.foundrySystem.buildFreighter({ foundryId: foundry.id });
      if (!freighter) return { failed: 'no freighter' };

      foundry.output = 10; // alloy already waiting
      const mineralsBefore = game.gameState.resources.minerals;
      const alloyBefore = game.gameState.resources.alloy;

      // Drive the sim until the freighter completes a full out-and-back leg
      let trips = 0;
      for (let i = 0; i < 600 && trips === 0; i++) {
        game.foundrySystem.update(100);
        if (game.gameState.resources.alloy > alloyBefore) trips = 1;
      }

      return {
        commissioned: true,
        loadedMinerals: mineralsBefore - game.gameState.resources.minerals > 0 ||
                        foundry.input > 0, // minerals left the hub for the forge
        alloyDelivered: game.gameState.resources.alloy - alloyBefore,
        freighterHome: freighter.status === 'idle' || freighter.status === 'outbound'
      };
    });
    expect(result.commissioned).toBe(true);
    expect(result.loadedMinerals).toBe(true);
    expect(result.alloyDelivered).toBeGreaterThan(0);
  });

  test('decommissioning a foundry refunds buffers and dissolves its freighters', async ({ page }) => {
    await startNewGame(page);
    await buildTestFoundry(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const foundry = game.gameState.foundry.foundries[0];
      game.foundrySystem.buildFreighter({ foundryId: foundry.id });
      foundry.input = 40;
      foundry.output = 5;

      const before = game.gameState.getResources();
      game.foundrySystem.deleteFoundry({ foundryId: foundry.id });
      const after = game.gameState.getResources();

      return {
        foundriesLeft: game.gameState.foundry.foundries.length,
        freightersLeft: game.gameState.foundry.freighters.length,
        mineralsBack: after.minerals - before.minerals,
        alloyBack: after.alloy - before.alloy
      };
    });
    expect(result.foundriesLeft).toBe(0);
    expect(result.freightersLeft).toBe(0);
    expect(result.mineralsBack).toBeGreaterThanOrEqual(40); // buffer + 50% refunds
    expect(result.alloyBack).toBeCloseTo(5, 5);
  });

  test('foundry network survives save/load', async ({ page }) => {
    await startNewGame(page);
    await buildTestFoundry(page);
    const result = await page.evaluate(async () => {
      const game = window.game;
      game.timeScale = 0; // freeze the forge so buffers don't drift during the save
      const foundry = game.gameState.foundry.foundries[0];
      game.foundrySystem.buildFreighter({ foundryId: foundry.id });
      foundry.input = 33;
      foundry.output = 4.5;
      foundry.level = 2;
      game.gameState.resources.alloy = 7;

      await game.saveManager.saveGame(1);

      // Wipe live state, then load
      game.gameState.foundry = { foundries: [], freighters: [] };
      game.gameState.resources.alloy = 0;
      await game.saveManager.loadGame(1);

      const restored = game.gameState.foundry.foundries[0];
      return {
        foundries: game.gameState.foundry.foundries.length,
        freighters: game.gameState.foundry.freighters.length,
        input: restored?.input,
        output: restored?.output,
        level: restored?.level,
        alloy: game.gameState.resources.alloy
      };
    });
    expect(result.foundries).toBe(1);
    expect(result.freighters).toBe(1);
    expect(result.input).toBeCloseTo(33, 5);
    expect(result.output).toBeCloseTo(4.5, 5);
    expect(result.level).toBe(2);
    expect(result.alloy).toBeCloseTo(7, 5);
  });

  test('legacy mining saves migrate: stations dissolve into a materials refund', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(async () => {
      const game = window.game;
      game.timeScale = 0; // exact-refund assertions need a frozen economy
      await game.saveManager.saveGame(1);

      // Rewrite the slot as a pre-Foundry save: mining block, no foundry block
      const key = `${game.saveManager.savePrefix}slot_1`;
      const data = JSON.parse(await window.storageAdapter.getItem(key));
      delete data.gameState.foundry;
      data.gameState.mining = {
        stations: [{ id: 's1', hubId: 'h', type: 'basic' }, { id: 's2', hubId: 'h', type: 'basic' }],
        shuttles: [{ id: 'sh1', hubId: 'h' }],
        totalProbetheum: 0
      };
      data.gameState.resources.minerals = 10;
      data.gameState.resources.data = 10;
      delete data.gameState.resources.alloy;
      await window.storageAdapter.setItem(key, JSON.stringify(data));

      await game.saveManager.loadGame(1);
      return {
        foundryState: !!game.gameState.foundry,
        foundries: game.gameState.foundry.foundries.length,
        // 2 stations × (100M/50D) + 1 shuttle × (50M/25D) refunded on top of 10/10
        minerals: game.gameState.resources.minerals,
        data: game.gameState.resources.data,
        alloyDefaulted: game.gameState.resources.alloy === 0
      };
    });
    expect(result.foundryState).toBe(true);
    expect(result.foundries).toBe(0);
    expect(result.minerals).toBe(10 + 250);
    expect(result.data).toBe(10 + 125);
    expect(result.alloyDefaulted).toBe(true);
  });

  test('foundry details panel shows live buffers and freighter commissioning', async ({ page }) => {
    await startNewGame(page);
    await buildTestFoundry(page);
    await page.evaluate(() => {
      const foundry = window.game.gameState.foundry.foundries[0];
      window.game.eventBus.emit('entity:selected', { entity: foundry, type: 'foundry' });
    });
    await expect(page.locator('#detailsPanel')).toBeVisible();
    await expect(page.locator('#detailsTitle')).toHaveText('Foundry');
    await expect(page.locator('#foundryInputBar')).toBeAttached();
    await expect(page.locator('#foundryOutputBar')).toBeAttached();
    await expect(page.locator('#foundryStatusTag')).toContainText(/starved/i);
    await expect(page.locator('#commissionFreighterBtn')).toBeEnabled();

    // Commission a freighter through the real button
    await page.locator('#commissionFreighterBtn').click();
    const count = await page.evaluate(() => window.game.gameState.foundry.freighters.length);
    expect(count).toBe(1);
  });

  test('alloy readout is in the HUD and updates', async ({ page }) => {
    await startNewGame(page);
    await expect(page.locator('#alloy')).toBeAttached();
    const text = await page.evaluate(() => {
      window.game.gameState.resources.alloy = 12.7;
      window.game.uiManager.updateResourceDisplay();
      return document.getElementById('alloy').textContent;
    });
    expect(text).toBe('12');
  });

  test('network score reads foundry uptime and freighter activity', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const sm = window.game.statsManager;
      const gs = window.game.gameState;
      const empty = { uptime: sm.foundryUptime(), activity: sm.freighterActivity() };
      gs.foundry.foundries.push({ id: 'f1', status: 'running' }, { id: 'f2', status: 'starved' });
      gs.foundry.freighters.push({ id: 'fr1', status: 'outbound' }, { id: 'fr2', status: 'idle' });
      return {
        empty,
        uptime: sm.foundryUptime(),
        activity: sm.freighterActivity(),
        score: sm.networkScore()
      };
    });
    expect(result.empty.uptime).toBeNull();      // unscored until foundries exist
    expect(result.empty.activity).toBeNull();
    expect(result.uptime).toBeCloseTo(0.5, 5);
    expect(result.activity).toBeCloseTo(0.5, 5);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
