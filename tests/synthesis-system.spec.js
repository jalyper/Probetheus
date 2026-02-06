/**
 * Synthesis System Tests
 * Tests for probethium synthesis feature (Phase 8.5)
 */
import { test, expect } from '@playwright/test';

test.describe('Synthesis System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Start new game
    await page.evaluate(() => {
      window.game.startNewGame();
    });

    // Dismiss tutorial panel
    await page.evaluate(() => {
      const tutorialPanel = document.getElementById('tutorialPanel');
      if (tutorialPanel) tutorialPanel.style.display = 'none';
    });
  });

  test('SYNTH-01: Research node exists in alien tech tree', async ({ page }) => {
    const hasResearchNode = await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      return tree.probethium_synthesis !== undefined &&
             tree.probethium_synthesis.id === 'probethium_synthesis' &&
             tree.probethium_synthesis.parent === 'alien_tech';
    });

    expect(hasResearchNode).toBe(true);
  });

  test('SYNTH-02: Synthesis button only visible after research', async ({ page }) => {
    // Select hub before research
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      hub.selected = true;
      window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
    });

    await page.waitForTimeout(300);

    // Check button doesn't exist
    let buttonVisible = await page.evaluate(() => {
      return document.getElementById('synthesizeBtn') !== null;
    });

    expect(buttonVisible).toBe(false);

    // Unlock research
    await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      tree.alien_tech.researched = true;
      tree.probethium_synthesis.available = true;
      tree.probethium_synthesis.researched = true;
    });

    // Re-select hub to refresh panel
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      hub.selected = false;
      window.game.eventBus.emit('entity:deselected');
    });

    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      hub.selected = true;
      window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
    });

    await page.waitForTimeout(300);

    // Check button exists now
    buttonVisible = await page.evaluate(() => {
      return document.getElementById('synthesizeBtn') !== null;
    });

    expect(buttonVisible).toBe(true);
  });

  test('SYNTH-03: Synthesis converts 5 exotic minerals to 0.001 probethium per batch', async ({ page }) => {
    // Setup: unlock research and add resources
    await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      tree.alien_tech.researched = true;
      tree.probethium_synthesis.researched = true;

      const resources = window.game.gameState.getResources();
      resources.exoticMinerals = 15; // 3 batches
    });

    const beforeProbethium = await page.evaluate(() => {
      return window.game.gameState.probethium;
    });

    // Trigger synthesis
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      window.game.eventBus.emit('synthesis:triggered', { hub });
    });

    await page.waitForTimeout(100);

    const afterProbethium = await page.evaluate(() => {
      return window.game.gameState.probethium;
    });

    const afterExotics = await page.evaluate(() => {
      return window.game.gameState.getResources().exoticMinerals;
    });

    const probethiumGained = afterProbethium - beforeProbethium;

    expect(probethiumGained).toBeCloseTo(0.003, 4); // 3 batches * 0.001
    expect(afterExotics).toBe(0); // All 15 exotics consumed
  });

  test('SYNTH-04: Button disabled when insufficient exotic minerals', async ({ page }) => {
    // Unlock research
    await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      tree.alien_tech.researched = true;
      tree.probethium_synthesis.researched = true;

      const resources = window.game.gameState.getResources();
      resources.exoticMinerals = 3; // Less than 5
    });

    // Select hub
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      hub.selected = true;
      window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
    });

    await page.waitForTimeout(300);

    const isDisabled = await page.evaluate(() => {
      const btn = document.getElementById('synthesizeBtn');
      return btn?.disabled === true;
    });

    expect(isDisabled).toBe(true);
  });

  test('Button shows correct batch count', async ({ page }) => {
    // Unlock research and add resources
    await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      tree.alien_tech.researched = true;
      tree.probethium_synthesis.researched = true;

      const resources = window.game.gameState.getResources();
      resources.exoticMinerals = 17; // 3 batches (2 exotics leftover)
    });

    // Select hub
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      hub.selected = true;
      window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
    });

    await page.waitForTimeout(300);

    const buttonText = await page.evaluate(() => {
      const btn = document.getElementById('synthesizeBtn');
      return btn?.textContent || '';
    });

    expect(buttonText).toContain('3x batches');
  });

  test('Animation manager instantiated', async ({ page }) => {
    const hasAnimationManager = await page.evaluate(() => {
      return window.game?.synthesisAnimation !== undefined &&
             typeof window.game.synthesisAnimation.update === 'function' &&
             typeof window.game.synthesisAnimation.render === 'function';
    });

    expect(hasAnimationManager).toBe(true);
  });

  test('Multiple synthesis triggers queue animations', async ({ page }) => {
    // Unlock research and add resources
    await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      tree.alien_tech.researched = true;
      tree.probethium_synthesis.researched = true;

      const resources = window.game.gameState.getResources();
      resources.exoticMinerals = 10; // 2 batches
    });

    // Trigger two syntheses rapidly
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      window.game.eventBus.emit('synthesis:triggered', { hub });
      window.game.eventBus.emit('synthesis:triggered', { hub });
    });

    await page.waitForTimeout(100);

    const queueSize = await page.evaluate(() => {
      const anim = window.game.synthesisAnimation;
      return (anim.currentAnimation ? 1 : 0) + anim.queue.length;
    });

    expect(queueSize).toBe(2);
  });

  test('Animation completes after 3 seconds', async ({ page }) => {
    // Unlock research and add resources
    await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      tree.alien_tech.researched = true;
      tree.probethium_synthesis.researched = true;

      const resources = window.game.gameState.getResources();
      resources.exoticMinerals = 5;
    });

    // Trigger synthesis
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      window.game.eventBus.emit('synthesis:triggered', { hub });
    });

    await page.waitForTimeout(100);

    // Should have animation
    let hasAnimation = await page.evaluate(() => {
      return window.game.synthesisAnimation.currentAnimation !== null;
    });

    expect(hasAnimation).toBe(true);

    // Wait for animation to complete (3 seconds + buffer)
    await page.waitForTimeout(3200);

    // Should be cleared
    hasAnimation = await page.evaluate(() => {
      return window.game.synthesisAnimation.currentAnimation !== null;
    });

    expect(hasAnimation).toBe(false);
  });
});
