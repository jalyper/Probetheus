import { test, expect } from '@playwright/test';

/**
 * Intake Bay upgrade + material recipes (LOOP_REDESIGN.md factory-first).
 * The bottleneck must be fixable in-game, and upgrades must be MADE from
 * found materials — with exotics gating the top tier.
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
    window.game.timeScale = 0;
  });
  await page.waitForTimeout(300);
}

async function openHubDetails(page) {
  await page.evaluate(() => {
    // Dismiss any modal (research unlock fires when resources jump)
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    const hub = window.game.gameState.entities.reconHubs[0];
    hub.selected = true;
    window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
  });
  await page.waitForSelector('#upgradeIntakeBtn', { timeout: 5000 });
}

async function clickUpgrade(page) {
  // Click via JS — modals/overlays must not flake the interaction
  await page.evaluate(() => document.getElementById('upgradeIntakeBtn').click());
}

test.describe('Intake Bay + recipes', () => {

  test('recipe table exists and alloy gates the top intake tier', async ({ page }) => {
    await startNewGame(page);
    const recipes = await page.evaluate(() => window.RECIPES);
    expect(recipes.probe.minerals).toBeGreaterThan(0);
    expect(recipes.intakeBay['2']).toBeTruthy();
    expect(recipes.intakeBay['2'].alloy).toBeUndefined();      // tier 2: home materials
    expect(recipes.intakeBay['3'].alloy).toBeGreaterThan(0);   // tier 3: forged at the Foundry (REBUILD.md §2)
  });

  test('upgrade spends the recipe and doubles intake throughput', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      const r = window.game.gameState.getResources();
      window.game.gameState.updateResources(
        { ...r, minerals: 500, data: 500 }, window.game.eventBus);
    });
    await openHubDetails(page);
    await clickUpgrade(page);
    await page.waitForTimeout(200);

    const result = await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      const r = window.game.gameState.getResources();
      return {
        level: hub.intakeLevel,
        minerals: r.minerals,
        data: r.data,
        intakeMs: window.game.probeManager.getHubIntakeMs(hub)
      };
    });
    expect(result.level).toBe(2);
    expect(result.minerals).toBe(500 - 150);
    expect(result.data).toBe(500 - 60);
    expect(result.intakeMs).toBeCloseTo(60000 / 16, 1); // 16/min at level 2
  });

  test('upgrade is refused without the materials', async ({ page }) => {
    await startNewGame(page);
    await page.evaluate(() => {
      const r = window.game.gameState.getResources();
      window.game.gameState.updateResources(
        { ...r, minerals: 0, data: 0 }, window.game.eventBus);
    });
    await openHubDetails(page);
    await clickUpgrade(page);
    await page.waitForTimeout(200);

    const level = await page.evaluate(() =>
      window.game.gameState.entities.reconHubs[0].intakeLevel || 1);
    expect(level).toBe(1);
  });

  test('intake level persists through save serialization', async ({ page }) => {
    await startNewGame(page);
    const serialized = await page.evaluate(async () => {
      const hub = window.game.gameState.entities.reconHubs[0];
      hub.intakeLevel = 2;
      await window.game.saveManager.saveGame(1);
      const raw = await window.storageAdapter.getItem('probetheus_save_slot_1');
      if (!raw) return { error: 'save key not found' };
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { level: data.gameState.entities.reconHubs[0].intakeLevel };
    });
    expect(serialized.level).toBe(2);
  });
});
