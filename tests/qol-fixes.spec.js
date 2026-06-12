import { test, expect } from '@playwright/test';

/**
 * Quality-of-life fixes (2026-06-11):
 * 1. Time controls must lay out horizontally — the alloy readout widened the
 *    HUD band and was wrapping the speed buttons into a vertical stack.
 * 2. resource:indicator must honor the `text` field (DepositSystem emits
 *    'CHARTED' / '+N') — it was rendering "+undefined" on every signal click
 *    and deposit extraction.
 * 3. The network throughput panel needs a working close button (its innerHTML
 *    rebuilds every second, which could swallow click pairs).
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

test.describe('QoL fixes', () => {

  test('time controls sit in one horizontal row inside the header', async ({ page }) => {
    await startNewGame(page);
    const layout = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('#timeControls .time-btn')];
      const header = document.getElementById('header').getBoundingClientRect();
      const rects = buttons.map(b => b.getBoundingClientRect());
      const centers = rects.map(r => (r.top + r.bottom) / 2);
      return {
        count: buttons.length,
        display: getComputedStyle(document.getElementById('timeControls')).display,
        // same row: every button's vertical center within 2px of the first
        // (the icon pause button is a different height than the text buttons)
        sameRow: centers.every(c => Math.abs(c - centers[0]) <= 2),
        // horizontal order: lefts strictly increase — no vertical stacking
        ordered: rects.every((r, i) => i === 0 || r.left > rects[i - 1].left),
        allInsideHeader: rects.every(r => r.bottom <= header.bottom + 1 && r.top >= header.top - 1)
      };
    });
    expect(layout.count).toBe(4); // pause + 1x/2x/4x
    expect(layout.display).toBe('flex');
    expect(layout.sameRow).toBe(true);
    expect(layout.ordered).toBe(true);
    expect(layout.allInsideHeader).toBe(true);
  });

  test('resource indicators honor the text field — no more "+undefined"', async ({ page }) => {
    await startNewGame(page);
    const result = await page.evaluate(() => {
      const game = window.game;
      game.resourceIndicators = [];

      // DepositSystem's two emissions: charting and extraction
      game.eventBus.emit('resource:indicator', { x: 0, y: 0, text: 'CHARTED', color: '#FFD700' });
      game.eventBus.emit('resource:indicator', { x: 0, y: 0, text: '+5', color: '#D4AF37' });
      // amount-based path still works (probe auto-collection)
      game.eventBus.emit('resource:indicator', { x: 0, y: 0, amount: 12, resourceType: 'minerals', pending: true });

      return game.resourceIndicators.map(i => i.text);
    });
    expect(result[0]).toBe('CHARTED');
    expect(result[1]).toBe('+5');
    expect(result[2]).toBe('+12 (pending)');
    expect(result.join(' ')).not.toContain('undefined');
  });

  test('throughput panel opens from the Flow chip and closes via its close button', async ({ page }) => {
    await startNewGame(page);
    await page.locator('#throughputStat').click();
    await expect(page.locator('#statsPanel')).toBeVisible();
    await expect(page.locator('#statsPanel .stats-close')).toBeVisible();

    // dispatchEvent(pointerdown) — the handler listens on pointerdown so the
    // panel's 1s innerHTML rebuild can't swallow the interaction
    await page.locator('#statsPanel .stats-close').dispatchEvent('pointerdown');
    await expect(page.locator('#statsPanel')).toBeHidden();
  });
});
