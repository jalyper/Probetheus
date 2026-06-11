import { test, expect } from '@playwright/test';

/**
 * Uplink tests (docs/design/REBUILD.md §1) — research as a flow problem.
 * The Research Lab (screen, tree, points) is deleted. The Uplink is crafted
 * from materials, streams stored data into ONE active protocol at a capped
 * rate (DECODE_PER_MIN_BASE × level), and deep protocols consume catalysts
 * up front. Decoded protocols gate equipment, synthesis, and Remnant trade.
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

test.describe('The Uplink', () => {

  test('research lab is demolished and the Uplink stands in its place', async ({ page }) => {
    await startNewGame(page);
    const state = await page.evaluate(() => ({
      researchManagerGone: typeof window.ResearchManager === 'undefined',
      researchScreenGone: !document.getElementById('researchScreen'),
      researchModalGone: !document.getElementById('researchUnlockModal'),
      researchSystemGone: window.game.gameState.researchSystem === undefined,
      uplinkClass: typeof window.UplinkSystem === 'function',
      uplinkInstance: !!window.game.uplinkSystem,
      uplinkState: window.game.gameState.uplink,
      protocolCount: Object.keys(window.PROTOCOLS).length
    }));
    expect(state.researchManagerGone).toBe(true);
    expect(state.researchScreenGone).toBe(true);
    expect(state.researchModalGone).toBe(true);
    expect(state.researchSystemGone).toBe(true);
    expect(state.uplinkClass).toBe(true);
    expect(state.uplinkInstance).toBe(true);
    expect(state.uplinkState.built).toBe(false);
    expect(state.protocolCount).toBeGreaterThanOrEqual(7);
    await expect(page.locator('#uplinkBtn')).toBeVisible();
  });

  test('the Uplink is crafted from materials — no resources, no dish', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const sys = game.uplinkSystem;
      game.gameState.resources.minerals = 0;
      game.gameState.resources.data = 0;
      const refused = sys.build();

      game.gameState.resources.minerals = 100;
      game.gameState.resources.data = 100;
      const built = sys.build();
      const again = sys.build();

      return {
        refused, built, again,
        state: game.gameState.uplink.built,
        mineralsLeft: game.gameState.resources.minerals,
        dataLeft: game.gameState.resources.data
      };
    });
    expect(result.refused).toBe(false);
    expect(result.built).toBe(true);
    expect(result.again).toBe(false); // only one Uplink
    expect(result.state).toBe(true);
    expect(result.mineralsLeft).toBe(100 - 60);
    expect(result.dataLeft).toBe(100 - 25);
  });

  test('decoding streams stored data at the capped rate — and stalls when starved', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const sys = game.uplinkSystem;
      game.timeScale = 0; // freeze the main loop; we drive update() by hand
      game.gameState.uplink.built = true;

      const beforeBuilt = game.gameState.uplink.active;
      sys.startDecode('swift_carriage');

      game.gameState.resources.data = 100;
      // One minute of sim time at level 1 = DECODE_PER_MIN_BASE units
      sys.update(60000);
      const afterMinute = game.gameState.uplink.progress.swift_carriage;
      const dataAfterMinute = game.gameState.resources.data;

      // Starve the reserve: no data, no progress
      game.gameState.resources.data = 0;
      sys.update(60000);
      const afterStarved = game.gameState.uplink.progress.swift_carriage;

      return { beforeBuilt, afterMinute, dataAfterMinute, afterStarved,
               rate: window.GAME_CONSTANTS.UPLINK.DECODE_PER_MIN_BASE };
    });
    expect(result.beforeBuilt).toBe(null);
    expect(result.afterMinute).toBeCloseTo(result.rate, 1);
    expect(result.dataAfterMinute).toBeCloseTo(100 - result.rate, 1);
    expect(result.afterStarved).toBeCloseTo(result.afterMinute, 5); // stalled, not lost
  });

  test('a finished decode completes the protocol, fires the event, and frees the dish', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const sys = game.uplinkSystem;
      game.timeScale = 0;
      game.gameState.uplink.built = true;

      let decodedEvent = null;
      game.eventBus.on('uplink:decoded', (d) => { decodedEvent = d.id; });

      sys.startDecode('swift_carriage');
      game.gameState.resources.data = 1000;
      // 40 data needed; stream plenty of sim-minutes
      sys.update(5 * 60000);

      return {
        decodedEvent,
        hasProtocol: game.gameState.hasProtocol('swift_carriage'),
        active: game.gameState.uplink.active,
        restartRefused: sys.startDecode('swift_carriage')
      };
    });
    expect(result.decodedEvent).toBe('swift_carriage');
    expect(result.hasProtocol).toBe(true);
    expect(result.active).toBe(null);
    expect(result.restartRefused).toBe(false); // can't re-decode a finished protocol
  });

  test('deep protocols charge catalysts once, up front — switching never recharges', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const sys = game.uplinkSystem;
      game.timeScale = 0;
      game.gameState.uplink.built = true;

      // harvest_lattice demands 2 artifacts
      game.gameState.resources.artifacts = 0;
      const refused = sys.startDecode('harvest_lattice');

      game.gameState.resources.artifacts = 5;
      const started = sys.startDecode('harvest_lattice');
      const artifactsAfterStart = game.gameState.resources.artifacts;

      // Switch away and back: catalysts must NOT be charged again
      sys.startDecode('swift_carriage');
      sys.startDecode('harvest_lattice');
      const artifactsAfterSwitch = game.gameState.resources.artifacts;

      return { refused, started, artifactsAfterStart, artifactsAfterSwitch };
    });
    expect(result.refused).toBe(false);
    expect(result.started).toBe(true);
    expect(result.artifactsAfterStart).toBe(3);
    expect(result.artifactsAfterSwitch).toBe(3);
  });

  test('switching protocols keeps each one\'s streamed progress', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const sys = game.uplinkSystem;
      game.timeScale = 0;
      game.gameState.uplink.built = true;
      game.gameState.resources.data = 1000;

      sys.startDecode('swift_carriage');
      sys.update(60000); // ~12 units in
      const partial = game.gameState.uplink.progress.swift_carriage;

      sys.startDecode('deep_resonance');
      sys.update(60000);
      sys.startDecode('swift_carriage');

      return { partial, kept: game.gameState.uplink.progress.swift_carriage };
    });
    expect(result.partial).toBeGreaterThan(0);
    expect(result.kept).toBeCloseTo(result.partial, 5);
  });

  test('decoded protocols gate real mechanics: collectors, extraction, synthesis', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const equipment = new window.EquipmentSystem(game.gameState, game.eventBus);

      const lockedCount = equipment.getAvailableEquipment().length;
      game.gameState.uplink.decoded.add('harvest_lattice');
      const harvestCount = equipment.getAvailableEquipment().length;
      game.gameState.uplink.decoded.add('universal_lattice');
      const universalCount = equipment.getAvailableEquipment().length;

      // Extraction Harmonics: +1 per pass on a charted deposit
      const deposit = { id: 'test_dep', x: 0, y: 0, type: 'minerals',
                        richness: 3, ratePerMin: 30, tokens: 30, discovered: true };
      const probe = { cargo: {} };
      const before = game.depositSystem.tryExtract(probe, deposit, game.probeManager);
      game.gameState.uplink.decoded.add('extraction_harmonics');
      probe.cargo = {};
      const after = game.depositSystem.tryExtract(probe, deposit, game.probeManager);

      return {
        lockedCount, harvestCount, universalCount, before, after,
        synthesisGate: game.gameState.hasProtocol('exotic_synthesis')
      };
    });
    expect(result.lockedCount).toBe(0);
    expect(result.harvestCount).toBe(3);
    expect(result.universalCount).toBe(4);
    expect(result.before).toBe(3);
    expect(result.after).toBe(4);
    expect(result.synthesisGate).toBe(false);
  });

  test('uplink state survives save and load', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(async () => {
      const game = window.game;
      game.gameState.uplink.built = true;
      game.gameState.uplink.level = 2;
      game.gameState.uplink.active = 'deep_resonance';
      game.gameState.uplink.progress = { deep_resonance: 17.5 };
      game.gameState.uplink.decoded.add('swift_carriage');
      game.gameState.uplink.paid.add('deep_resonance');

      await game.saveManager.saveGame(2);

      // Scramble, then load back
      game.gameState.uplink = { built: false, level: 1, active: null,
                                progress: {}, paid: new Set(), decoded: new Set() };
      await game.saveManager.loadGame(2);

      const u = game.gameState.uplink;
      return {
        built: u.built, level: u.level, active: u.active,
        progress: u.progress.deep_resonance,
        decoded: Array.from(u.decoded), paid: Array.from(u.paid)
      };
    });
    expect(result.built).toBe(true);
    expect(result.level).toBe(2);
    expect(result.active).toBe('deep_resonance');
    expect(result.progress).toBeCloseTo(17.5, 5);
    expect(result.decoded).toContain('swift_carriage');
    expect(result.paid).toContain('deep_resonance');
  });

  test('legacy research saves migrate onto protocols', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(async () => {
      const game = window.game;
      // A pre-Uplink save: researchSystem instead of uplink
      await game.saveManager.restoreGameState({
        resources: { probes: 0, minerals: 50, data: 10, artifacts: 0, exoticMinerals: 0 },
        probethium: { current: 0, totalAccumulated: 0, stats: {}, multipliers: {} },
        researchSystem: {
          points: 4,
          unlocked: true,
          researched: ['collection', 'auto_minerals', 'auto_all', 'probethium_synthesis', 'minerals_rare'],
          unlockedTrees: ['collection'],
          milestones: { minerals: [50], data: [], artifacts: [], exoticMinerals: [] }
        },
        world: { currentSector: { x: 0, y: 0 }, viewOffset: { x: 0, y: 0 }, zoomLevel: 1, sectors: [] },
        entities: { probes: [], reconHubs: [], miningOutposts: [], miningFacilities: [], signals: [] }
      });
      const u = game.gameState.uplink;
      return { built: u.built, decoded: Array.from(u.decoded) };
    });
    expect(result.built).toBe(true);
    expect(result.decoded).toContain('harvest_lattice');
    expect(result.decoded).toContain('universal_lattice');
    expect(result.decoded).toContain('exotic_synthesis');
    expect(result.decoded).not.toContain('minerals_rare'); // dead ladder stays dead
  });

  test('the Uplink panel opens on the map and shows the protocol catalog', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      window.game.gameState.resources.minerals = 100;
      window.game.gameState.resources.data = 100;
      window.game.uplinkSystem.build();
    });
    await page.locator('#uplinkBtn').click();
    await expect(page.locator('#uplinkPanel')).toBeVisible();
    await expect(page.locator('#uplinkPanel .uplink-protocol')).toHaveCount(7);
    await expect(page.locator('#uplinkPanel .uplink-title')).toHaveText('UPLINK');
    // The map stays underneath — this is an overlay, not a screen switch
    await expect(page.locator('#galaxyCanvas')).toBeVisible();

    // Decode from the panel
    await page.locator('.uplink-protocol', { hasText: 'Swift Carriage' })
      .locator('button[data-uplink-action="decode"]').click();
    const active = await page.evaluate(() => window.game.gameState.uplink.active);
    expect(active).toBe('swift_carriage');
  });

  test('shell researchSpeed bonuses now accelerate decoding', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      const base = game.uplinkSystem.decodeRatePerMin();
      const original = game.shellSystem.getEntityBonus.bind(game.shellSystem);
      game.shellSystem.getEntityBonus = (cat, ent, key) =>
        key === 'researchSpeed' ? 50 : original(cat, ent, key);
      const boosted = game.uplinkSystem.decodeRatePerMin();
      game.shellSystem.getEntityBonus = original;
      return { base, boosted };
    });
    expect(result.boosted).toBeCloseTo(result.base * 1.5, 5);
  });
});
