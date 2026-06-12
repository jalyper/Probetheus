import { test, expect } from '@playwright/test';

/**
 * Flow bead tests (docs/design/VISUAL_STYLE.md "Material flow — the conveyor
 * in space"). Actively-worked routes carry continuous bead chains: density
 * proportional to per-route delivered throughput, type-colored by cargo mix,
 * capped at 12 with a filament-brighten overflow. Sim-time driven, so the
 * flow respects pause and time scale. Replaces the event-based cargo sparks.
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

test.describe('Flow beads', () => {

  test('system is loaded and wired into the game', async ({ page }) => {
    await startNewGame(page);
    const wired = await page.evaluate(() => ({
      classLoaded: typeof window.FlowBeadSystem === 'function',
      instance: !!window.game.flowBeadSystem,
      sparkGone: typeof window.CargoSparkSystem === 'undefined'
    }));
    expect(wired.classLoaded).toBe(true);
    expect(wired.instance).toBe(true);
    expect(wired.sparkGone).toBe(true);
  });

  test('deliveries accrue per-route throughput and spawn a consumption ring at the hub', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0;
      const sys = game.flowBeadSystem;
      sys.arrivals = [];
      const hub = game.gameState.entities.reconHubs[0];
      const probe = { id: 'bead-probe', hub };

      game.eventBus.emit('probe:cargoDelivered', {
        probe, cargo: { minerals: 5 }, total: 5
      });
      game.eventBus.emit('probe:cargoDelivered', {
        probe, cargo: { minerals: 3, data: 2 }, total: 5
      });

      return {
        rate: sys.routeRate('bead-probe'),
        rings: sys.arrivals.length,
        ringAtHub: sys.arrivals[0] && sys.arrivals[0].x === hub.x && sys.arrivals[0].y === hub.y
      };
    });
    // 10 units over the 5s minimum span = 120/min
    expect(result.rate).toBeCloseTo(120, 1);
    expect(result.rings).toBe(2);
    expect(result.ringAtHub).toBe(true);
  });

  test('bead density is proportional to throughput: starved=1, humming=more, capped at 12', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const sys = window.game.flowBeadSystem;
      return {
        dead: sys.beadCountFor(0),
        starved: sys.beadCountFor(0.5),
        humming: sys.beadCountFor(20),
        capped: sys.beadCountFor(500),
        overCapLow: sys.isOverCapacity(20),
        overCapHigh: sys.isOverCapacity(500)
      };
    });
    expect(result.dead).toBe(0);
    expect(result.starved).toBe(1);
    expect(result.humming).toBeGreaterThan(1);
    expect(result.humming).toBeLessThan(12);
    expect(result.capped).toBe(12);
    expect(result.overCapLow).toBe(false);
    expect(result.overCapHigh).toBe(true);
  });

  test('beads are type-colored by the route cargo mix (striped chain)', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0;
      const sys = game.flowBeadSystem;
      const probe = { id: 'mix-probe', hub: null };

      // 50/50 minerals/data over the window
      game.eventBus.emit('probe:cargoDelivered', { probe, cargo: { minerals: 10 }, total: 10 });
      game.eventBus.emit('probe:cargoDelivered', { probe, cargo: { data: 10 }, total: 10 });

      const mix = sys.routeMix('mix-probe');
      const colors = [0, 1, 2, 3].map(i => sys.beadColor(mix, i, 4));
      return { mix, colors, M: window.PALETTE.MATERIALS };
    });
    expect(result.mix.minerals).toBeCloseTo(0.5, 5);
    expect(result.mix.data).toBeCloseTo(0.5, 5);
    // First half of the chain copper, second half blue — stable stripes
    expect(result.colors).toEqual([
      result.M.minerals, result.M.minerals, result.M.data, result.M.data
    ]);
  });

  test('bead flow freezes while the game is paused (sim-time)', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(async () => {
      const game = window.game;
      const sys = game.flowBeadSystem;
      game.timeScale = 0; // pause -> gameLoop passes deltaTime 0
      const route = sys.getRoute('pause-probe');
      const phase0 = route.flowPhase;
      const sim0 = sys.simTime;
      await new Promise(r => setTimeout(r, 600)); // real time passes, sim time doesn't
      return { phase0, phase1: route.flowPhase, sim0, sim1: sys.simTime };
    });
    expect(result.phase1).toBe(result.phase0);
    expect(result.sim1).toBe(result.sim0);
  });

  test('beads march along the route as sim time advances', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0;
      const sys = game.flowBeadSystem;
      const route = sys.getRoute('march-probe');
      const phase0 = route.flowPhase;
      sys.update(1000);
      return { phase0, phase1: route.flowPhase };
    });
    expect(result.phase1).toBeGreaterThan(result.phase0);
  });

  test('old deliveries fall out of the rolling window so a stopped route starves', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0;
      const sys = game.flowBeadSystem;
      const probe = { id: 'window-probe', hub: null };
      game.eventBus.emit('probe:cargoDelivered', { probe, cargo: { minerals: 5 }, total: 5 });
      const rateBefore = sys.routeRate('window-probe');
      sys.update(sys.WINDOW_MS + 1000); // sail past the rolling window
      const rateAfter = sys.routeRate('window-probe');
      return { rateBefore, rateAfter };
    });
    expect(result.rateBefore).toBeGreaterThan(0);
    expect(result.rateAfter).toBe(0);
  });

  test('freighter delivery to a foundry emits a typed one-shot bead pulse', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0;
      const sys = game.flowBeadSystem;
      sys.pulses = [];
      sys.arrivals = [];

      const hub = game.gameState.entities.reconHubs[0];
      const foundry = {
        id: 'test-foundry', hubId: hub.id, level: 1,
        position: { x: hub.x + 150, y: hub.y + 150 },
        input: 0, output: 0, status: 'starved', converted: 0,
        vaneAngle: 0, portGlow: { in: 0, out: 0 }
      };
      game.gameState.foundry.foundries.push(foundry);
      const freighter = {
        id: 'test-freighter', hubId: hub.id, foundryId: foundry.id,
        capacity: 20, cargo: { minerals: 20 },
        position: { ...foundry.position }, status: 'outbound'
      };
      game.foundrySystem.arriveAtFoundry(freighter, foundry, hub);

      const pulse = sys.pulses[0];
      return {
        spawned: sys.pulses.length,
        endsAtFoundry: pulse && pulse.to.x === foundry.position.x && pulse.to.y === foundry.position.y,
        typedCopper: pulse && pulse.color === window.PALETTE.MATERIALS.minerals,
        inputFed: foundry.input === 20,
        headingHome: freighter.status === 'inbound'
      };
    });
    expect(result.spawned).toBe(1);
    expect(result.endsAtFoundry).toBe(true);
    expect(result.typedCopper).toBe(true);
    expect(result.inputFed).toBe(true);
    expect(result.headingHome).toBe(true);
  });

  test('pulse travels, lands as a consumption ring, and expires', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0;
      const sys = game.flowBeadSystem;
      sys.pulses = [];
      sys.arrivals = [];
      sys.spawnPulse({ x: 0, y: 0 }, { x: 100, y: 0 });

      const afterSpawn = sys.pulses.length;
      sys.update(sys.PULSE_DURATION + 50);
      const landed = { pulses: sys.pulses.length, arrivals: sys.arrivals.length };
      sys.update(sys.ARRIVAL_DURATION + 50);
      const expired = { pulses: sys.pulses.length, arrivals: sys.arrivals.length };

      return { afterSpawn, landed, expired };
    });
    expect(result.afterSpawn).toBe(1);
    expect(result.landed).toEqual({ pulses: 0, arrivals: 1 });
    expect(result.expired).toEqual({ pulses: 0, arrivals: 0 });
  });

  test('long pulse legs are capped so they stay quick pulses', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const sys = window.game.flowBeadSystem;
      sys.pulses = [];
      sys.spawnPulse({ x: 0, y: 0 }, { x: 2000, y: 0 });
      const p = sys.pulses[0];
      const dist = Math.sqrt((p.from.x - p.to.x) ** 2 + (p.from.y - p.to.y) ** 2);
      return { dist, max: sys.MAX_PULSE_LEG };
    });
    expect(result.dist).toBeLessThanOrEqual(result.max + 0.001);
  });

  test('beads render on an actively-worked route polyline', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.timeScale = 0;
      const sys = game.flowBeadSystem;
      const hub = game.gameState.entities.reconHubs[0];

      // A live probe with a patrol loop and recent deliveries
      const probe = game.gameState.entities.probes[0];
      probe.active = true;
      probe.waypoints = [
        { x: hub.x, y: hub.y },
        { x: hub.x + 300, y: hub.y },
        { x: hub.x, y: hub.y }
      ];
      game.eventBus.emit('probe:cargoDelivered', { probe, cargo: { minerals: 20 }, total: 20 });

      // Geometry helpers place beads on the route
      const path = sys.buildPath(probe.waypoints);
      const mid = sys.pointAt(probe.waypoints, path, 0.25);

      // And a real render pass doesn't throw
      const ctx = document.getElementById('galaxyCanvas').getContext('2d');
      sys.render(ctx, game.gameState.world.viewOffset);

      return {
        loopLength: path.length,
        midOnOutboundLeg: Math.abs(mid.y - hub.y) < 0.001 && mid.x > hub.x,
        beadCount: sys.beadCountFor(sys.routeRate(probe.id))
      };
    });
    expect(result.loopLength).toBe(600);
    expect(result.midOnOutboundLeg).toBe(true);
    expect(result.beadCount).toBeGreaterThan(0);
  });
});
