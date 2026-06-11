import { test, expect } from '@playwright/test';

/**
 * M1 "Feels Alive" redesign tests (docs/design/EA_ROADMAP.md)
 * Covers: tempo constants, time controls, Probethium economy rebalance,
 * combo system, throughput stats, and the new onboarding structure.
 */

async function startNewGame(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('#newGameBtn').click();
  await page.waitForSelector('#galaxyCanvas');
  await page.waitForFunction(() => !!(window.game && window.game.gameState), { timeout: 10000 });
  // Skip intro cutscene if present
  await page.evaluate(() => {
    const skip = document.getElementById('skipCutsceneBtn');
    if (skip) skip.click();
  });
  // Dismiss tutorial panel so it doesn't block UI
  await page.evaluate(() => {
    const tutorialPanel = document.getElementById('tutorialPanel');
    if (tutorialPanel) tutorialPanel.style.display = 'none';
  });
  await page.waitForTimeout(500);
}

test.describe('M1 redesign — tempo, economy, juice, stats', () => {

  test('game constants and new modules are loaded', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loaded = await page.evaluate(() => ({
      constants: !!window.GAME_CONSTANTS,
      baseSpeed: window.GAME_CONSTANTS?.PROBE?.BASE_SPEED,
      synthesis: window.GAME_CONSTANTS?.SYNTHESIS?.PROBETHIUM_PER_BATCH,
      sfx: typeof window.SfxManager === 'function',
      combo: typeof window.ComboSystem === 'function',
      stats: typeof window.StatsManager === 'function'
    }));

    expect(loaded.constants).toBe(true);
    expect(loaded.baseSpeed).toBe(0.00025);
    expect(loaded.synthesis).toBe(1);
    expect(loaded.sfx).toBe(true);
    expect(loaded.combo).toBe(true);
    expect(loaded.stats).toBe(true);
  });

  test('starting probes use new tempo speeds', async ({ page }) => {
    await startNewGame(page);

    const speeds = await page.evaluate(() => {
      const probe = window.game.gameState.entities.probes[0];
      return { speed: probe.speed, returnSpeed: probe.returnSpeed };
    });

    expect(speeds.speed).toBeCloseTo(0.00025, 6);
    expect(speeds.returnSpeed).toBeCloseTo(0.000375, 6);
  });

  test('time controls: scale buttons and pause work', async ({ page }) => {
    await startNewGame(page);

    // Default 1x
    let scale = await page.evaluate(() => window.game.timeScale);
    expect(scale).toBe(1);

    // 2x via UI button
    await page.locator('.time-scale-btn[data-scale="2"]').click();
    scale = await page.evaluate(() => window.game.timeScale);
    expect(scale).toBe(2);
    await expect(page.locator('.time-scale-btn[data-scale="2"]')).toHaveClass(/active/);

    // Pause via button toggles to 0 and back
    await page.locator('#timePauseBtn').click();
    scale = await page.evaluate(() => window.game.timeScale);
    expect(scale).toBe(0);
    await expect(page.locator('#timePauseBtn')).toHaveClass(/paused/);

    await page.locator('#timePauseBtn').click();
    scale = await page.evaluate(() => window.game.timeScale);
    expect(scale).toBe(2); // resumes at pre-pause speed

    // 4x via keyboard ('3')
    await page.keyboard.press('3');
    scale = await page.evaluate(() => window.game.timeScale);
    expect(scale).toBe(4);

    // Space pauses
    await page.keyboard.press(' ');
    scale = await page.evaluate(() => window.game.timeScale);
    expect(scale).toBe(0);
  });

  test('paused game does not advance signal ages', async ({ page }) => {
    await startNewGame(page);

    const aged = await page.evaluate(async () => {
      window.game.setTimeScale(1);
      window.game.gameState.entities.signals.push({
        x: 100, y: 100, radius: 10, rarity: 'common', signalType: 'standard',
        duration: 999999, createdAt: Date.now(), age: 0
      });
      window.game.togglePause();
      const signal = window.game.gameState.entities.signals[window.game.gameState.entities.signals.length - 1];
      const before = signal.age;
      await new Promise(r => setTimeout(r, 600));
      return { before, after: signal.age };
    });

    expect(aged.after).toBe(aged.before);
  });

  test('exotic synthesis yields 1 Probethium per 5 exotic (ECONOMY.md)', async ({ page }) => {
    await startNewGame(page);

    const result = await page.evaluate(() => {
      // gameState.resources is the live object (getResources() returns a copy)
      window.game.gameState.resources.exoticMinerals = 12;
      window.game.gameState.probethium.current = 0;
      window.game.eventBus.emit('synthesis:triggered', {});
      return {
        probethium: window.game.gameState.probethium.current,
        exoticLeft: window.game.gameState.resources.exoticMinerals
      };
    });

    expect(result.probethium).toBe(2);   // 2 full batches
    expect(result.exoticLeft).toBe(2);   // 12 - 10
  });

  test('wall-clock Probethium trickle is removed', async ({ page }) => {
    await startNewGame(page);

    const result = await page.evaluate(() => {
      window.game.gameState.probethium.current = 0;
      window.game.gameState.calculateProbethium(60000);
      return window.game.gameState.probethium.current;
    });

    expect(result).toBe(0);
  });

  test('station types have separated probethium and resource outputs', async ({ page }) => {
    await startNewGame(page);

    const types = await page.evaluate(() => window.game.miningManager.getStationTypes());

    expect(types.basic.probethiumOutput).toBeCloseTo(0.085, 3);
    expect(types.advanced.probethiumOutput).toBeCloseTo(0.17, 3);
    expect(types.quantum.probethiumOutput).toBeCloseTo(2.5, 3);
    expect(types.basic.output).toBeGreaterThan(1); // resources now meaningful
  });

  test('probethium header shows meaningful precision', async ({ page }) => {
    await startNewGame(page);

    const text = await page.evaluate(() => {
      window.game.gameState.probethium.current = 12.34;
      window.game.uiManager.updateResourceDisplay();
      return document.getElementById('probethium').textContent;
    });

    expect(text).toBe('12.3');
  });

  test('combo system grants bonus cargo on chained collections', async ({ page }) => {
    await startNewGame(page);

    const result = await page.evaluate(() => {
      const probe = window.game.gameState.entities.probes[0];
      probe.cargo = { minerals: 0, data: 0, artifacts: 0, exoticMinerals: 0 };

      let lastChainEvent = null;
      window.game.eventBus.on('combo:chain', (d) => { lastChainEvent = d; });

      // 4 rapid collections of 10 minerals each
      for (let i = 0; i < 4; i++) {
        window.game.eventBus.emit('signal:collected', {
          probe,
          rarity: 'common',
          amount: 10,
          primaryResourceType: 'minerals',
          x: 100, y: 100
        });
      }

      return { cargo: probe.cargo.minerals, chain: lastChainEvent?.chain, bonusPct: lastChainEvent?.bonusPct };
    });

    expect(result.chain).toBe(4);
    expect(result.bonusPct).toBe(20);
    // Chain 3 → +1 (10% of 10), chain 4 → +2 (20% of 10)
    expect(result.cargo).toBe(3);
  });

  test('stats manager tracks throughput and computes a network score', async ({ page }) => {
    await startNewGame(page);

    const result = await page.evaluate(() => {
      window.game.eventBus.emit('probe:cargoDelivered', {
        probe: window.game.gameState.entities.probes[0],
        cargo: { minerals: 60, data: 12, artifacts: 3, exoticMinerals: 1 },
        total: 76,
        capacityRatio: 0.76
      });
      const stats = window.game.statsManager;
      return {
        rate: stats.ratePerMin('total'),
        mineralsRate: stats.ratePerMin('minerals'),
        score: stats.networkScore()
      };
    });

    expect(result.rate).toBeGreaterThan(0);
    expect(result.mineralsRate).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('throughput readout is visible in header', async ({ page }) => {
    await startNewGame(page);
    await expect(page.locator('#throughputStat')).toBeVisible();
    await expect(page.locator('#throughputValue')).toContainText('/min');
  });

  test('onboarding teaches the deposit loop (LOOP_REDESIGN.md)', async ({ page }) => {
    await startNewGame(page);

    const tutorial = await page.evaluate(() => ({
      ids: window.game.tutorialManager.steps.map(s => s.id)
    }));

    expect(tutorial.ids).toEqual([
      'select_hub', 'deploy_probe', 'chart_deposit', 'tap_deposit', 'cargo_return', 'release'
    ]);
    // The Uplink replaced the gated Research Lab — its button is open from the start
    await expect(page.locator('#uplinkBtn')).toBeVisible();
  });
});
