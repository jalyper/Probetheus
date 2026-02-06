/**
 * Probethium Synthesis Tests
 * Tests for Phase 8.5 - Probethium Synthesis (SYNTH-01 through SYNTH-04)
 *
 * Requirements:
 * - SYNTH-01: Hub synthesis button with batch conversion
 * - SYNTH-02: Research unlock gates synthesis access
 * - SYNTH-03: Animation queue processes syntheses sequentially
 * - SYNTH-04: Synthesis provides viable probethium source
 */
import { test, expect } from '@playwright/test';

test.describe('Probethium Synthesis System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

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

  test('SYNTH-02: Research node exists in alien tech tree', async ({ page }) => {
    const researchNode = await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      return {
        exists: tree.probethium_synthesis !== undefined,
        id: tree.probethium_synthesis?.id,
        cost: tree.probethium_synthesis?.cost,
        parent: tree.probethium_synthesis?.parent,
        tree: tree.probethium_synthesis?.tree,
        icon: tree.probethium_synthesis?.icon
      };
    });

    expect(researchNode.exists).toBe(true);
    expect(researchNode.id).toBe('probethium_synthesis');
    expect(researchNode.cost).toBe(3);
    expect(researchNode.parent).toBe('alien_tech');
    expect(researchNode.tree).toBe('alien');
    expect(researchNode.icon).toContain('⚗️');

    // Verify it's in parent's children array
    const isInParentChildren = await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      return tree.alien_tech.children?.includes('probethium_synthesis');
    });

    expect(isInParentChildren).toBe(true);
  });

  test('SYNTH-02: Synthesis button hidden when research not unlocked', async ({ page }) => {
    // Select hub before unlocking research
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      hub.selected = true;
      window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
    });

    await page.waitForTimeout(300);

    // Check button does not exist in DOM
    const buttonCount = await page.locator('#synthesizeBtn').count();
    expect(buttonCount).toBe(0);
  });

  test('SYNTH-01: Synthesis button appears after research unlock', async ({ page }) => {
    // Unlock research
    await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      tree.alien_tech.researched = true;
      tree.probethium_synthesis.available = true;
      tree.probethium_synthesis.researched = true;

      const resources = window.game.gameState.getResources();
      resources.exoticMinerals = 10;
    });

    // Select hub to trigger panel update
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      hub.selected = true;
      window.game.eventBus.emit('entity:selected', { entity: hub, type: 'hub' });
    });

    await page.waitForTimeout(300);

    // Button should now exist
    const synthesizeBtn = page.locator('#synthesizeBtn');
    await expect(synthesizeBtn).toBeVisible();

    const buttonText = await synthesizeBtn.textContent();
    expect(buttonText).toContain('Synthesize');
  });

  test('SYNTH-01: Button disabled when exotic minerals < 5', async ({ page }) => {
    // Unlock research but set insufficient resources
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

    const synthesizeBtn = page.locator('#synthesizeBtn');
    await expect(synthesizeBtn).toBeVisible();

    // Verify button is disabled
    const isDisabled = await synthesizeBtn.isDisabled();
    expect(isDisabled).toBe(true);

    // Verify button has insufficient class
    const hasInsufficientClass = await page.evaluate(() => {
      const btn = document.getElementById('synthesizeBtn');
      return btn?.classList.contains('insufficient');
    });
    expect(hasInsufficientClass).toBe(true);
  });

  test('SYNTH-01/SYNTH-04: Conversion math - single batch (5 exotics)', async ({ page }) => {
    // Setup: unlock research and add exactly 5 exotic minerals
    await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      tree.alien_tech.researched = true;
      tree.probethium_synthesis.researched = true;

      const resources = window.game.gameState.getResources();
      resources.exoticMinerals = 5;
    });

    // Record initial probethium
    const initialProbethium = await page.evaluate(() => {
      return window.game.gameState.probethium;
    });

    // Trigger synthesis
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      window.game.eventBus.emit('synthesis:triggered', { hub });
    });

    await page.waitForTimeout(100);

    // Check resources after synthesis
    const afterState = await page.evaluate(() => {
      return {
        exoticMinerals: window.game.gameState.getResources().exoticMinerals,
        probethium: window.game.gameState.probethium
      };
    });

    expect(afterState.exoticMinerals).toBe(0); // All 5 consumed
    expect(afterState.probethium - initialProbethium).toBeCloseTo(0.001, 5); // Gained exactly 0.001
  });

  test('SYNTH-01/SYNTH-04: Conversion math - multiple batches with remainder', async ({ page }) => {
    // Setup: 12 exotic minerals = 2 batches, 2 remainder
    await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      tree.alien_tech.researched = true;
      tree.probethium_synthesis.researched = true;

      const resources = window.game.gameState.getResources();
      resources.exoticMinerals = 12;
    });

    const initialProbethium = await page.evaluate(() => {
      return window.game.gameState.probethium;
    });

    // Trigger synthesis
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      window.game.eventBus.emit('synthesis:triggered', { hub });
    });

    await page.waitForTimeout(100);

    const afterState = await page.evaluate(() => {
      return {
        exoticMinerals: window.game.gameState.getResources().exoticMinerals,
        probethium: window.game.gameState.probethium
      };
    });

    expect(afterState.exoticMinerals).toBe(2); // 12 - 10 consumed = 2 remainder
    expect(afterState.probethium - initialProbethium).toBeCloseTo(0.002, 5); // 2 batches * 0.001
  });

  test('SYNTH-01: Insufficient exotics rejected (< 5)', async ({ page }) => {
    // Setup: only 3 exotic minerals
    await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      tree.alien_tech.researched = true;
      tree.probethium_synthesis.researched = true;

      const resources = window.game.gameState.getResources();
      resources.exoticMinerals = 3;
    });

    const beforeState = await page.evaluate(() => {
      return {
        exoticMinerals: window.game.gameState.getResources().exoticMinerals,
        probethium: window.game.gameState.probethium
      };
    });

    // Attempt synthesis (should not proceed)
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      window.game.eventBus.emit('synthesis:triggered', { hub });
    });

    await page.waitForTimeout(100);

    const afterState = await page.evaluate(() => {
      return {
        exoticMinerals: window.game.gameState.getResources().exoticMinerals,
        probethium: window.game.gameState.probethium
      };
    });

    // Resources should be unchanged
    expect(afterState.exoticMinerals).toBe(beforeState.exoticMinerals);
    expect(afterState.probethium).toBe(beforeState.probethium);
  });

  test('SYNTH-03: Animation queue accepts synthesis events', async ({ page }) => {
    // Setup: enough resources for multiple batches
    await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      tree.alien_tech.researched = true;
      tree.probethium_synthesis.researched = true;

      const resources = window.game.gameState.getResources();
      resources.exoticMinerals = 20; // 4 batches
    });

    // Trigger 3 syntheses rapidly
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      for (let i = 0; i < 3; i++) {
        window.game.eventBus.emit('synthesis:triggered', { hub });
      }
    });

    await page.waitForTimeout(100);

    // Check animation manager state
    const animationState = await page.evaluate(() => {
      const anim = window.game.synthesisAnimation;
      return {
        hasManager: anim !== undefined,
        hasUpdate: typeof anim?.update === 'function',
        hasRender: typeof anim?.render === 'function',
        currentAnimation: anim?.currentAnimation !== null,
        queueLength: anim?.queue?.length || 0,
        totalAnimations: (anim?.currentAnimation ? 1 : 0) + (anim?.queue?.length || 0)
      };
    });

    expect(animationState.hasManager).toBe(true);
    expect(animationState.hasUpdate).toBe(true);
    expect(animationState.hasRender).toBe(true);
    expect(animationState.totalAnimations).toBe(3); // All 3 syntheses queued/active
  });

  test('SYNTH-03: Animation completes after 3 seconds', async ({ page }) => {
    // Setup: one synthesis
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

    // Should have active animation
    const hasAnimationBefore = await page.evaluate(() => {
      return window.game.synthesisAnimation?.currentAnimation !== null;
    });
    expect(hasAnimationBefore).toBe(true);

    // Wait for animation to complete (3 seconds + buffer)
    await page.waitForTimeout(3500);

    // Animation should be cleared
    const animationAfter = await page.evaluate(() => {
      const anim = window.game.synthesisAnimation;
      return {
        currentAnimation: anim?.currentAnimation,
        queueEmpty: anim?.queue?.length === 0
      };
    });

    expect(animationAfter.currentAnimation).toBeNull();
    expect(animationAfter.queueEmpty).toBe(true);
  });

  test('SYNTH-04: Probethium actually increases (viable source)', async ({ page }) => {
    // Setup: large batch to verify viability
    await page.evaluate(() => {
      const tree = window.game.gameState.researchSystem.tree;
      tree.alien_tech.researched = true;
      tree.probethium_synthesis.researched = true;

      const resources = window.game.gameState.getResources();
      resources.exoticMinerals = 50; // 10 batches
    });

    const initialProbethium = await page.evaluate(() => {
      return window.game.gameState.probethium;
    });

    // Trigger synthesis
    await page.evaluate(() => {
      const hub = window.game.gameState.entities.reconHubs[0];
      window.game.eventBus.emit('synthesis:triggered', { hub });
    });

    await page.waitForTimeout(100);

    const finalState = await page.evaluate(() => {
      return {
        probethium: window.game.gameState.probethium,
        exoticsRemaining: window.game.gameState.getResources().exoticMinerals
      };
    });

    const probethiumGained = finalState.probethium - initialProbethium;
    const expectedGain = Math.floor(50 / 5) * 0.001; // 10 batches * 0.001

    expect(probethiumGained).toBeCloseTo(expectedGain, 5);
    expect(probethiumGained).toBeGreaterThan(0); // Viable source
    expect(finalState.exoticsRemaining).toBe(0); // All 50 consumed
  });

  test('Button shows correct batch count', async ({ page }) => {
    // Setup: resources for multiple batches
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

    const buttonText = await page.locator('#synthesizeBtn').textContent();
    expect(buttonText).toContain('3x batches'); // 17 / 5 = 3 batches
  });
});
