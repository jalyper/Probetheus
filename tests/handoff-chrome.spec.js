import { test, expect } from '@playwright/test';

/**
 * Handoff chrome tests (docs/design/handoff/README.md) — the hi-fi prototype
 * ported into the live modules: icon kit, HUD header band, merged Hub Ops
 * panel, Uplink stat tiles, probe floater pill switches, and the rift-violet
 * Dark Market.
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

async function selectHomeHub(page) {
  await page.evaluate(() => {
    const hub = window.game.gameState.entities.reconHubs[0];
    hub.selected = true;
    window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
  });
}

test.describe('Icon kit', () => {

  test('window.icon renders thin-line SVG glyphs from the 27-glyph library', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const svg = window.icon('hub', { size: 18 });
      return {
        isSvg: svg.startsWith('<svg'),
        hasViewBox: svg.includes('viewBox="0 0 24 24"'),
        strokeWidth: svg.includes('stroke-width="1.25"'),
        size: svg.includes('width="18"'),
        glyphCount: Object.keys(window.ICONS).length,
        unknownIsEmpty: !window.icon('not-a-glyph').includes('<path')
      };
    });
    expect(result.isSvg).toBe(true);
    expect(result.hasViewBox).toBe(true);
    expect(result.strokeWidth).toBe(true);
    expect(result.size).toBe(true);
    expect(result.glyphCount).toBeGreaterThanOrEqual(27);
    expect(result.unknownIsEmpty).toBe(true);
  });

  test('the HUD header carries SVG glyphs, not emoji', async ({ page }) => {
    await startNewGame(page);
    // data-icon markup was injected on DOMContentLoaded
    expect(await page.locator('#header svg.ic').count()).toBeGreaterThanOrEqual(8);
    const headerText = await page.locator('#header').innerText();
    expect(headerText).not.toMatch(/[\u{1F300}-\u{1FAFF}☀-⛿⏸⏻]/u);
  });
});

test.describe('HUD header band', () => {

  test('shows the seven readouts, probethium score, flow trend, and time controls', async ({ page }) => {
    await startNewGame(page);
    // five materials (incl. alloy, REBUILD.md §2) + probes + hubs
    await expect(page.locator('#header .readouts .rd')).toHaveCount(7);
    await expect(page.locator('#header .rd.flow')).toBeVisible();
    await expect(page.locator('#header .score #probethium')).toBeVisible();
    await expect(page.locator('#header .sector .lbl')).toHaveText(/sector/i);
    await expect(page.locator('#timeControls .time-btn')).toHaveCount(4);
    // built readouts (probes/hubs) tint gold via .built
    await expect(page.locator('#header .rd.built')).toHaveCount(2);
  });

  test('sector readout keeps name and mono coordinate apart', async ({ page }) => {
    await startNewGame(page);
    await page.waitForTimeout(600); // let updateSectorInfo run
    const coord = await page.locator('#sectorInfo .coord').innerText();
    expect(coord).toMatch(/\[-?\d+, -?\d+\]/);
  });
});

test.describe('Hub Operations panel (merged)', () => {

  test('renders the status row, 2x2 stat grid, intake block, and operation rows', async ({ page }) => {
    await startNewGame(page);
    await selectHomeHub(page);
    await expect(page.locator('#detailsPanel')).toBeVisible();
    await expect(page.locator('#detailsPanel .ho-status .t')).toHaveText(/online/i);
    await expect(page.locator('#detailsPanel .ho-status .m')).toHaveText('home hub');
    await expect(page.locator('#detailsPanel .ho-cell')).toHaveCount(4);
    await expect(page.locator('#detailsPanel .ho-block .lvl')).toHaveText(/level \d/i);
    await expect(page.locator('#detailsPanel #upgradeIntakeBtn')).toBeVisible();
    // text-first operation rows with key chips (Deploy + Build Probe;
    // freighters are commissioned from the Foundry panel now)
    await expect(page.locator('#detailsPanel .ho-actions .tbtn')).toHaveCount(2);
    await expect(page.locator('#deployFromHub .key')).toHaveText('D');
    // equipped shell footer
    await expect(page.locator('#detailsPanel .ho-foot .shell-chip')).toBeVisible();
  });

  test('the stat grid counts hub-owned foundries and freighters', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      window.game.gameState.foundry.foundries.push({ id: 'fd_test', hubId: hub.id });
      window.game.gameState.foundry.freighters.push({ id: 'fr_test', hubId: hub.id });
    });
    await selectHomeHub(page);
    const cells = await page.locator('#detailsPanel .ho-cell .v').allInnerTexts();
    expect(cells[2]).toBe('1'); // foundries
    expect(cells[3]).toBe('1'); // freighters
  });

  test('the old probe operations panel is merged away', async ({ page }) => {
    await startNewGame(page);
    expect(await page.locator('#probePanel').count()).toBe(0);
  });
});

test.describe('Uplink panel chrome', () => {

  test('shows stat tiles and data-blue cost lines once built', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      window.game.gameState.resources.minerals = 100;
      window.game.gameState.resources.data = 100;
      window.game.uplinkSystem.build();
    });
    await page.locator('#uplinkBtn').click();
    await expect(page.locator('#uplinkPanel .uplink-stat')).toHaveCount(3);
    await expect(page.locator('#uplinkPanel .uplink-stat .v.data')).toBeVisible();
    expect(await page.locator('#uplinkPanel .uplink-protocol-cost .c-data').count()).toBeGreaterThanOrEqual(7);
    // glyph-led header
    await expect(page.locator('#uplinkPanel .uplink-header svg.ic-uplink')).toBeVisible();
  });

  test('an active decode shows the data-blue bar with a mono percent', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      window.game.gameState.resources.minerals = 100;
      window.game.gameState.resources.data = 200;
      window.game.uplinkSystem.build();
      window.game.uplinkSystem.startDecode('swift_carriage');
      window.game.uplinkSystem.togglePanel(true);
    });
    await expect(page.locator('.uplink-protocol.is-active .uplink-bar-fill')).toBeVisible();
    await expect(page.locator('.uplink-protocol.is-active .uplink-pct')).toHaveText(/\d+%/);
    await expect(page.locator('.uplink-protocol.is-active .uplink-state-active')).toHaveText(/decoding/i);
  });
});

test.describe('Probe detail floater', () => {

  test('pill switches drive patrol mode and camera follow', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      const probe = window.game.gameState.entities.probes[0];
      window.game.gameState.ui.selectedProbe = probe;
      window.game.uiManager.showProbeDetails({ probe });
    });
    await expect(page.locator('#probeDetailPanel')).toBeVisible();
    await expect(page.locator('#probeDetailPanel .fl-badge')).toBeVisible();
    await expect(page.locator('#probeDetailPanel .tog .sw')).toHaveCount(2);

    // toggling the patrol pill flips the probe's patrolMode
    const before = await page.evaluate(() => window.game.gameState.entities.probes[0].patrolMode !== false);
    await page.locator('#probeDetailPanel .tog').first().click();
    const after = await page.evaluate(() => window.game.gameState.entities.probes[0].patrolMode);
    expect(after).toBe(!before);
  });
});

test.describe('Dark Market (rift violet)', () => {

  test('the NPC market speaks the mk- grammar: portrait, eyebrow, greeting, cards', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      window.game.openDarkMarketForNPC('keth_varn', window.NPC_THEMES.keth_varn);
    });
    await expect(page.locator('#darkMarketModal')).toBeVisible();
    await expect(page.locator('.mk-head .mk-portrait')).toBeVisible();
    await expect(page.locator('.mk-titles .ey')).toHaveText(/encrypted channel/i);
    await expect(page.locator('.mk-titles h2')).toHaveText('Keth-Varn');
    await expect(page.locator('.mk-greet')).toBeVisible();
    expect(await page.locator('.mk-item').count()).toBeGreaterThan(0);
    await expect(page.locator('.mk-special')).toBeVisible();
    // gold spark price + violet acquire on each card
    expect(await page.locator('.mk-item .mk-price svg.ic-spark').count()).toBeGreaterThan(0);
    await expect(page.locator('.mk-wallet .amt')).toHaveText(/P$/);
  });

  test('market filters toggle card visibility by category', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      window.game.openDarkMarketForNPC('keth_varn', window.NPC_THEMES.keth_varn);
    });
    await page.locator('.mk-filter[data-filter="special"]').click();
    await expect(page.locator('.market-item-card[data-category="special"]')).toBeVisible();
    const probesVisible = await page.locator('.market-item-card[data-category="probes"]:visible').count();
    expect(probesVisible).toBe(0);
    await page.locator('.mk-filter[data-filter="all"]').click();
    expect(await page.locator('.market-item-card:visible').count()).toBeGreaterThan(1);
  });
});
