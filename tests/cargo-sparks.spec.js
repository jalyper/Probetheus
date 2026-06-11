import { test, expect } from '@playwright/test';

/**
 * Cargo spark tests (docs/design/VISUAL_STYLE.md "Motion language")
 * Sparks travel routes when value moves through the network: probe deliveries
 * into hubs and shuttle deliveries into stations. Sim-time driven, so they
 * respect pause and time scale.
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

test.describe('Cargo sparks', () => {

  test('system is loaded and wired into the game', async ({ page }) => {
    await startNewGame(page);
    const wired = await page.evaluate(() => ({
      classLoaded: typeof window.CargoSparkSystem === 'function',
      instance: !!window.game.cargoSparkSystem
    }));
    expect(wired.classLoaded).toBe(true);
    expect(wired.instance).toBe(true);
  });

  test('probe cargo delivery spawns a spark on the final return leg', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0; // freeze sim so the game loop doesn't advance the spark
      const hub = game.gameState.entities.reconHubs[0];
      const probe = {
        hub,
        current: { x: hub.x, y: hub.y },
        waypoints: [
          { x: hub.x, y: hub.y },
          { x: hub.x + 300, y: hub.y + 100 },
          { x: hub.x, y: hub.y }
        ]
      };
      game.eventBus.emit('probe:cargoDelivered', {
        probe, cargo: { minerals: 5 }, total: 5, capacityRatio: 0.5
      });
      const spawned = game.cargoSparkSystem.sparks.length;
      const spark = game.cargoSparkSystem.sparks[0];
      return {
        spawned,
        endsAtHub: spark && spark.to.x === hub.x && spark.to.y === hub.y
      };
    });
    expect(result.spawned).toBe(1);
    expect(result.endsAtHub).toBe(true);
  });

  test('spark travels, lands as an arrival ring, and expires', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0;
      const sys = game.cargoSparkSystem;
      sys.sparks = [];
      sys.arrivals = [];
      sys.spawn({ x: 0, y: 0 }, { x: 100, y: 0 });

      const afterSpawn = sys.sparks.length;
      sys.update(sys.SPARK_DURATION + 50); // run past the travel duration
      const landed = { sparks: sys.sparks.length, arrivals: sys.arrivals.length };
      sys.update(sys.ARRIVAL_DURATION + 50); // run past the ring duration
      const expired = { sparks: sys.sparks.length, arrivals: sys.arrivals.length };

      return { afterSpawn, landed, expired };
    });
    expect(result.afterSpawn).toBe(1);
    expect(result.landed).toEqual({ sparks: 0, arrivals: 1 });
    expect(result.expired).toEqual({ sparks: 0, arrivals: 0 });
  });

  test('sparks freeze while the game is paused (sim-time)', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(async () => {
      const game = window.game;
      const sys = game.cargoSparkSystem;
      sys.sparks = [];
      sys.arrivals = [];
      game.timeScale = 0; // pause -> gameLoop passes deltaTime 0
      sys.spawn({ x: 0, y: 0 }, { x: 100, y: 0 });
      const t0 = sys.sparks[0].t;
      await new Promise(r => setTimeout(r, 600)); // real time passes, sim time doesn't
      return { t0, t1: sys.sparks.length ? sys.sparks[0].t : -1 };
    });
    expect(result.t0).toBe(0);
    expect(result.t1).toBe(0);
  });

  test('shuttle delivery to a station emits a spark', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0;
      const sys = game.cargoSparkSystem;
      sys.sparks = [];
      sys.arrivals = [];

      const hub = game.gameState.entities.reconHubs[0];
      const station = { id: 'test-station', position: { x: hub.x + 150, y: hub.y + 150 } };
      const shuttle = { hubId: hub.id, cargo: { minerals: 50 } };
      game.miningManager.deliverToStation(shuttle, station);

      const spark = sys.sparks[0];
      return {
        spawned: sys.sparks.length,
        endsAtStation: spark && spark.to.x === station.position.x && spark.to.y === station.position.y,
        cargoCleared: Object.keys(shuttle.cargo).length === 0
      };
    });
    expect(result.spawned).toBe(1);
    expect(result.endsAtStation).toBe(true);
    expect(result.cargoCleared).toBe(true);
  });

  test('long routes are capped so sparks stay quick pulses', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const sys = window.game.cargoSparkSystem;
      sys.sparks = [];
      sys.spawn({ x: 0, y: 0 }, { x: 2000, y: 0 });
      const s = sys.sparks[0];
      const dist = Math.sqrt((s.from.x - s.to.x) ** 2 + (s.from.y - s.to.y) ** 2);
      return { dist, max: sys.MAX_LEG };
    });
    expect(result.dist).toBeLessThanOrEqual(result.max + 0.001);
  });
});
