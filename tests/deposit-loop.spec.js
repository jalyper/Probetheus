import { test, expect } from '@playwright/test';

/**
 * Deposit loop tests (docs/design/LOOP_REDESIGN.md, Direction A + rings)
 * Resources come from persistent places: prospect -> tap -> route -> tune.
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
    window.game.timeScale = 0; // freeze sim; tests drive updates manually
    window.game.depositSystem.update(0); // force lazy generation now
  });
  await page.waitForTimeout(300);
}

test.describe('Deposit loop — the world has structure', () => {

  test('home sector generates the starter deposit layout, undiscovered', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const deps = window.game.depositSystem.deposits().filter(d => d.sectorKey === '0,0');
      return {
        count: deps.length,
        anyDiscovered: deps.some(d => d.discovered),
        types: [...new Set(deps.map(d => d.type))].sort(),
        richnessSpread: Math.max(...deps.map(d => d.richness)) - Math.min(...deps.map(d => d.richness))
      };
    });
    expect(result.count).toBe(4);
    expect(result.anyDiscovered).toBe(false);
    expect(result.types.length).toBeGreaterThanOrEqual(2); // mixed types
    expect(result.richnessSpread).toBeGreaterThanOrEqual(4); // quality visibly varies
  });

  test('probes no longer generate loot signals from themselves', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      // Park a probe far from any deposit, pulse many times
      const probe = game.gameState.entities.probes[0];
      probe.active = true;
      probe.status = 'exploring';
      probe.current = { x: 99999, y: 99999 }; // nowhere near deposits
      probe.waypoints = [{ x: 99999, y: 99999 }, { x: 99999, y: 99500 }];
      probe.radarPulses = [];
      game.gameState.entities.signals = [];
      for (let i = 0; i < 20; i++) {
        probe.pulseTimer = 3000;
        game.probeManager.updateProbePulses(probe, 0);
      }
      // Only dark-market event pings are possible (rare); no standard loot
      return game.gameState.entities.signals.filter(s => s.signalType !== 'dark_market').length;
    });
    expect(result).toBe(0);
  });

  test('prospecting: a pulse near an undiscovered deposit raises a discovery ping', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const dep = game.depositSystem.deposits().find(d => d.sectorKey === '0,0');
      const probe = game.gameState.entities.probes[0];
      probe.active = true;
      probe.status = 'exploring';
      probe.current = { x: dep.x - 30, y: dep.y };
      probe.waypoints = [{ x: dep.x - 100, y: dep.y }, { x: dep.x + 100, y: dep.y }];
      probe.outboundWaypointsCount = 2; // mark as on the outbound leg (pulse gate)
      probe.currentWaypoint = 0;
      probe.radarPulses = [];
      game.gameState.entities.signals = [];
      probe.pulseTimer = 3000;
      game.probeManager.updateProbePulses(probe, 0);
      const ping = game.gameState.entities.signals.find(s => s.depositId === dep.id);
      return { hasPing: !!ping, type: ping?.signalType, nearDeposit: ping ? Math.abs(ping.x - dep.x) < 40 : false };
    });
    expect(result.hasPing).toBe(true);
    expect(result.type).toBe('discovery');
    expect(result.nearDeposit).toBe(true);
  });

  test('collecting a discovery ping charts the deposit', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const dep = game.depositSystem.deposits().find(d => d.sectorKey === '0,0');
      game.eventBus.emit('signal:collected', { manual: true, rarity: 'uncommon', x: dep.x, y: dep.y, depositId: dep.id });
      return dep.discovered;
    });
    expect(result).toBe(true);
  });

  test('extraction: a probe passing a charted deposit loads cargo, capped by rate tokens', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const dep = game.depositSystem.deposits().find(d => d.sectorKey === '0,0' && d.type === 'minerals');
      dep.discovered = true;
      const probe = game.gameState.entities.probes[0];
      probe.active = true;
      probe.status = 'exploring';
      probe.current = { x: dep.x, y: dep.y };
      probe.waypoints = [{ x: dep.x - 100, y: dep.y }, { x: dep.x + 100, y: dep.y }];
      probe.cargo = { minerals: 0, data: 0, artifacts: 0, exoticMinerals: 0 };
      probe.extractTimers = {};

      game.probeManager.checkDepositExtraction(probe);
      const firstHaul = probe.cargo.minerals;
      const tokensAfter = dep.tokens;

      // Cooldown: immediate second check extracts nothing
      game.probeManager.checkDepositExtraction(probe);
      const afterCooldownCheck = probe.cargo.minerals;

      // Rate cap: drain tokens, clear cooldown -> still nothing
      dep.tokens = 0;
      probe.extractTimers = {};
      game.probeManager.checkDepositExtraction(probe);
      const afterDrained = probe.cargo.minerals;

      return { firstHaul, tokensDropped: tokensAfter < dep.ratePerMin, afterCooldownCheck, afterDrained };
    });
    expect(result.firstHaul).toBeGreaterThan(0);
    expect(result.tokensDropped).toBe(true);
    expect(result.afterCooldownCheck).toBe(result.firstHaul);
    expect(result.afterDrained).toBe(result.firstHaul);
  });

  test('hub intake gate: a saturated dock queues the probe, then delivers when free', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const pm = game.probeManager;
      const hub = game.gameState.entities.reconHubs[0];
      const probe = game.gameState.entities.probes[0];

      probe.active = true;
      probe.hub = hub;
      probe.status = 'returning';
      probe.returnedToHub = false;
      probe.patrolMode = false;
      probe.cargo = { minerals: 25, data: 0, artifacts: 0, exoticMinerals: 0 };
      probe.waypoints = [{ x: hub.x, y: hub.y }, { x: hub.x + 100, y: hub.y }, { x: hub.x, y: hub.y }];
      probe.currentWaypoint = probe.waypoints.length - 1; // arrived
      probe.current = { x: hub.x, y: hub.y };

      // Saturate the dock
      pm.simNow = 10000;
      hub.intakeBusyUntil = 20000;
      const before = game.gameState.getResources().minerals;
      pm.updateProbeMovement(probe, 0);
      const queued = { status: probe.status, delivered: game.gameState.getResources().minerals - before };

      // Dock frees up
      pm.simNow = 21000;
      pm.updateProbeMovement(probe, 0);
      const after = { delivered: game.gameState.getResources().minerals - before, busyAgain: hub.intakeBusyUntil > 21000 };

      return { queued, after };
    });
    expect(result.queued.status).toBe('queued');
    expect(result.queued.delivered).toBe(0);
    expect(result.after.delivered).toBe(25);
    expect(result.after.busyAgain).toBe(true); // processing window claimed
  });

  test('rings: distant sectors are richer and can carry exotic deposits', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const ds = window.game.depositSystem;
      // Generate a sweep of ring-3/4 sectors directly (deterministic seeds)
      const far = [];
      [[4, 0], [0, 4], [3, 3], [-4, 1], [2, -4], [5, 2]].forEach(([sx, sy]) => {
        ds.generateForSector(sx, sy, null);
        far.push(...ds.deposits().filter(d => d.sectorKey === `${sx},${sy}`));
      });
      const home = ds.deposits().filter(d => d.sectorKey === '0,0');
      const avg = a => a.reduce((s, d) => s + d.richness, 0) / a.length;
      return {
        farCount: far.length,
        homeAvg: avg(home),
        farAvg: avg(far),
        hasExotic: far.some(d => d.type === 'exoticMinerals')
      };
    });
    expect(result.farCount).toBeGreaterThan(0);
    expect(result.farAvg).toBeGreaterThan(result.homeAvg * 1.5); // frontier pays
    expect(result.hasExotic).toBe(true); // exotics live in the outer rings
  });
});
