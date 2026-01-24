import { test, expect } from '@playwright/test';

/**
 * Tests for rarity color coding in planet descriptions
 */

test.describe('Rarity Display', () => {

  test('getRarityColor returns correct colors for all rarities', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('#newGameBtn').click();
    await page.waitForSelector('#galaxyCanvas');
    await page.waitForTimeout(1000);

    // Test all rarity colors
    const rarityColors = await page.evaluate(() => {
      const game = window.game;
      return {
        common: game.getRarityColor('common'),
        uncommon: game.getRarityColor('uncommon'),
        rare: game.getRarityColor('rare'),
        epic: game.getRarityColor('epic'),
        legendary: game.getRarityColor('legendary'),
        unknown: game.getRarityColor('unknown')
      };
    });

    expect(rarityColors.common).toBe('#aaaaaa');
    expect(rarityColors.uncommon).toBe('#00ff00');
    expect(rarityColors.rare).toBe('#0088ff');
    expect(rarityColors.epic).toBe('#ff00ff');
    expect(rarityColors.legendary).toBe('#ffd700');
    expect(rarityColors.unknown).toBe('#ffffff'); // Default fallback
  });

  test('planet description shows colored rarity text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('#newGameBtn').click();
    await page.waitForSelector('#galaxyCanvas');
    await page.waitForTimeout(1000);

    // Create a mock planet with known rarity and show exploration screen
    const hasColoredRarity = await page.evaluate(() => {
      const game = window.game;

      // Create test planet
      const testPlanet = {
        name: 'Test Planet',
        type: 'Forest',
        rarity: 'rare',
        description: 'A forest world with rare potential for discovery.'
      };

      // Create test signal
      const testSignal = {
        id: 'test-signal',
        rarity: 'rare',
        x: 100,
        y: 100
      };

      // Show exploration screen
      game.showExplorationScreen(testPlanet, testSignal);

      // Check if the planetDesc element contains a colored span
      const planetDescEl = document.getElementById('planetDesc');
      if (!planetDescEl) return { found: false, error: 'planetDesc element not found' };

      const html = planetDescEl.innerHTML;
      const hasSpan = html.includes('<span');
      const hasColor = html.includes('color:');
      const hasBold = html.includes('font-weight: bold');
      const hasRarityWord = html.includes('>rare<');

      return {
        found: true,
        html: html,
        hasSpan: hasSpan,
        hasColor: hasColor,
        hasBold: hasBold,
        hasRarityWord: hasRarityWord
      };
    });

    expect(hasColoredRarity.found).toBe(true);
    expect(hasColoredRarity.hasSpan).toBe(true);
    expect(hasColoredRarity.hasColor).toBe(true);
    expect(hasColoredRarity.hasBold).toBe(true);
    expect(hasColoredRarity.hasRarityWord).toBe(true);
  });

  test('legendary rarity shows gold color', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('#newGameBtn').click();
    await page.waitForSelector('#galaxyCanvas');
    await page.waitForTimeout(1000);

    const legendaryColor = await page.evaluate(() => {
      const game = window.game;

      const testPlanet = {
        name: 'Legendary World',
        type: 'Crystal',
        rarity: 'legendary',
        description: 'A crystal world with legendary potential for discovery.'
      };

      const testSignal = { id: 'test', rarity: 'legendary', x: 100, y: 100 };
      game.showExplorationScreen(testPlanet, testSignal);

      const planetDescEl = document.getElementById('planetDesc');
      return planetDescEl ? planetDescEl.innerHTML : '';
    });

    // Gold color for legendary
    expect(legendaryColor).toContain('#ffd700');
    expect(legendaryColor).toContain('legendary');
  });

});
