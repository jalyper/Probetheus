# Phase 10: Testing & Integration - Research

**Researched:** 2026-02-06
**Domain:** Integration Testing with Playwright
**Confidence:** HIGH

## Summary

Phase 10 validates the complete player progression journey from new game to probethium synthesis through comprehensive integration testing. This is the final validation phase for v1.3 milestone, ensuring all exclusive signal features (Phases 5-9) work together correctly in player-facing scenarios.

The research reveals a mature test infrastructure already in place with Playwright, proven patterns for game state manipulation, and clear precedents for both prerequisite gating tests and statistical validation. The project has 27 existing test files with sophisticated helpers for game initialization, tutorial dismissal, and programmatic state setup.

**Primary recommendation:** Split integration tests into 3 focused files using existing proven patterns: progression-gates.spec.js (prerequisite validation), happy-path-integration.spec.js (end-to-end flows), and statistical-validation.spec.js (RNG distribution verification).

## User Constraints (from CONTEXT.md)

### Locked Decisions
1. **Test Organization** — Split into 2-3 files: progression-gates.spec.js, happy-path-integration.spec.js, statistical-validation.spec.js
2. **Player Progression Gate Tests** — Heavy emphasis on "can't do X before Y" gating tests with ~20-30 gate tests
3. **Happy Path Flows** — 4-6 major end-to-end flows testing cross-system integration
4. **Statistical Validation** — Large sample tests (500+ signals, 200+ sectors, 100+ samples) for RNG
5. **No Backward Compatibility Testing** — Drop all pre-v1.3 save loading tests
6. **Don't Re-Test Unit Behavior** — Integration tests combine features, don't duplicate per-phase tests

### Claude's Discretion
- Test helper implementation details (use proven patterns from existing tests)
- Specific test assertion thresholds (within documented ranges)
- Helper function naming and organization
- Test timeout values (match existing patterns)

### Deferred Ideas (OUT OF SCOPE)
- Backward compatibility with pre-v1.3 saves
- Performance/FPS benchmarking
- Visual regression testing (screenshot comparison)
- Tutorial text content validation

## Standard Stack

The project uses Playwright for end-to-end testing with a proven infrastructure:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Playwright | ^1.40.0 | E2E browser testing | Industry standard for modern web testing, excellent API for browser automation |
| Python HTTP Server | Built-in | Test web server | Zero dependencies, reliable for test environment |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js (test runner) | Built-in | Test execution | Playwright's default test runner with parallel execution |

**Installation:**
```bash
npm install --save-dev @playwright/test
npx playwright install  # Install browser binaries
```

**Test execution:**
```bash
npm test                      # Run all tests
npm run test:headed          # Run with visible browser
npm run test:debug           # Run with debugger
npx playwright test --project=chromium  # Chromium only (faster)
```

## Architecture Patterns

### Recommended Test File Structure
```
tests/
├── progression-gates.spec.js        # 20-30 prerequisite gating tests
├── happy-path-integration.spec.js   # 4-6 end-to-end flow tests
└── statistical-validation.spec.js   # 3-5 large-sample RNG tests
```

### Pattern 1: Game Initialization Helper
**What:** Reusable helper for starting game and dismissing tutorial
**When to use:** Every test that needs a clean game state
**Example:**
```javascript
// Source: tests/discovery-reveal.spec.js:22-38
async function startGame(page) {
    await page.locator('#newGameBtn').click();
    await page.waitForTimeout(1500);
    const skipBtn = page.locator('#skipCutscene');
    if (await skipBtn.isVisible()) {
        await skipBtn.click();
    }
    await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Dismiss tutorial panel
    await page.evaluate(() => {
        const tutorialPanel = document.getElementById('tutorialPanel');
        if (tutorialPanel) tutorialPanel.style.display = 'none';
    });
}
```

### Pattern 2: Programmatic Game State Setup
**What:** Direct manipulation of game state via page.evaluate() for deterministic tests
**When to use:** Setting up specific scenarios, bypassing RNG, testing gates
**Example:**
```javascript
// Source: tests/research-gating.spec.js:121-131
await page.evaluate(() => {
    const research = window.game.gameState.getResearchSystem();
    research.points = 3;
    research.unlocked = true;
    research.researched.add('auto_minerals');

    window.game.tutorialManager.researchAccessAllowed = true;
    window.uiManager.updateUI();
});
```

### Pattern 3: Gate Testing Pattern
**What:** Test prerequisite by attempting action before and after meeting requirement
**When to use:** All progression gate tests
**Example:**
```javascript
// Source: tests/research-gating.spec.js:39-60
test('research access is blocked before tutorial gate', async ({ page }) => {
    await startGame(page);

    // Check that researchAccessAllowed is false initially
    const accessAllowed = await page.evaluate(() => {
        return window.game.tutorialManager.isResearchAccessAllowed();
    });
    expect(accessAllowed).toBe(false);

    // Attempt to access research - should fail
    // ... validation ...

    // Meet prerequisite (build hub, etc.)
    // ... setup ...

    // Verify access now allowed
    const afterGate = await page.evaluate(() => {
        return window.game.tutorialManager.isResearchAccessAllowed();
    });
    expect(afterGate).toBe(true);
});
```

### Pattern 4: Programmatic Sector Creation
**What:** Create sectors with specific types/profiles for deterministic integration tests
**When to use:** Testing sector-specific features without RNG
**Example:**
```javascript
// Source: tests/discovery-reveal.spec.js:43-76
async function triggerSectorDiscovery(page, sectorTypeName, x, y, profileOverride) {
    return page.evaluate(({ typeName, sx, sy, profile }) => {
        const sm = window.game.sectorManager;
        const world = window.game.gameState.getWorld();

        const sectorType = { /* sector type definition */ };
        const sector = {
            x: sx, y: sy,
            explored: true,
            type: sectorType,
            name: `Test ${typeName} Sector`,
            resourceProfile: profile || { type: 'balanced', spawnRateMultiplier: 1.0 }
        };
        world.sectors.set(`${sx},${sy}`, sector);

        // Trigger discovery modal
        sm.showSectorDiscovery(sectorType, sector.name, sector);
    }, { typeName: sectorTypeName, sx: x, sy: y, profile: profileOverride || null });
}
```

### Pattern 5: Statistical Sampling with Isolation
**What:** Run large sample tests with signal/entity array isolation
**When to use:** Testing RNG distributions and spawn rates
**Example:**
```javascript
// Source: tests/exclusive-signals.spec.js:83-100
const result = await page.evaluate(() => {
    const probeManager = window.game.probeManager;

    // Clear signals for isolation
    window.game.gameState.entities.signals = [];

    let oreVeinCount = 0;
    const samples = 1000;

    for (let i = 0; i < samples; i++) {
        const signalType = probeManager.determineSignalType(sector, null);
        if (signalType === 'ore_vein') oreVeinCount++;
    }

    return {
        oreVeinCount,
        oreVeinRate: (oreVeinCount / samples) * 100
    };
});

// Verify with tolerance
expect(result.oreVeinRate).toBeGreaterThan(15);  // 15-30% expected
expect(result.oreVeinRate).toBeLessThan(30);
```

### Pattern 6: Programmatic Save/Load for Reliability
**What:** Use saveManager API directly instead of UI clicks
**When to use:** Save/load tests and cross-session state validation
**Example:**
```javascript
// Source: tests/save-system.spec.js:172-180
const saveResult = await page.evaluate(async () => {
    try {
        await window.game.saveManager.saveGame(1);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});
expect(saveResult.success).toBe(true);
```

### Anti-Patterns to Avoid
- **UI-based save/load in integration tests:** Use programmatic API for reliability (saves don't always trigger UI updates consistently)
- **Relying on resource updates via updateResources():** For test setup, directly assign `gameState.resources.minerals = X` (updateResources can have side effects)
- **Not dismissing tutorial panel:** Tutorial panel blocks UI interactions and must be hidden in tests
- **Ignoring cutscene handling:** Always check for and skip cutscene with timeout to prevent hanging tests
- **Checking strict boolean values:** Use `!!value` or truthy checks for game systems (some return undefined instead of false)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser automation | Custom WebDriver wrapper | Playwright | Mature API, auto-waiting, parallel execution, built-in test runner |
| Game state setup | Manual UI clicking | page.evaluate() direct state manipulation | Deterministic, faster, no flakiness from UI timing |
| Test isolation | Manual localStorage clearing | beforeEach with evaluate(() => localStorage.clear()) | Proven pattern, prevents test pollution |
| Async timing issues | Fixed timeouts | page.waitForFunction() for state conditions | Robust, handles varying CI speeds |
| Resource verification | Polling UI text | page.evaluate() to check gameState directly | Accurate, no parsing issues |

**Key insight:** Playwright's page.evaluate() allows direct access to game internals, eliminating need for custom test harnesses or complex UI automation. The existing codebase demonstrates this pattern extensively.

## Common Pitfalls

### Pitfall 1: Tutorial Panel Blocking Interactions
**What goes wrong:** Tests fail with "element not visible" or clicks don't register
**Why it happens:** Tutorial panel has high z-index and overlays UI elements
**How to avoid:** Always dismiss tutorial panel in startGame() helper
**Warning signs:** Tests pass when run individually but fail in suite

### Pitfall 2: localStorage Key Naming
**What goes wrong:** Save/load tests can't find save files or create them in wrong location
**Why it happens:** Game uses `csog_save_*` prefix, not `probetheus_save_*`
**How to avoid:** Use correct prefixes: `csog_save_slot_1`, `csog_save_auto`
**Warning signs:** localStorage operations succeed but game can't load saves

### Pitfall 3: Research Gating Dual Requirements
**What goes wrong:** Tests unlock research but button stays hidden
**Why it happens:** Research requires BOTH research points AND tutorial gate clearance
**How to avoid:** Set both `research.unlocked = true` and `tutorialManager.researchAccessAllowed = true`
**Warning signs:** research.unlocked is true but UI doesn't update

### Pitfall 4: Equipment Array vs Object Format
**What goes wrong:** Equipment tests fail on new probes
**Why it happens:** v1.3 changed from single equipment object to equipment array
**How to avoid:** Always check `Array.isArray(probe.equipment)` and use array methods
**Warning signs:** Tests pass on old saves but fail on new game

### Pitfall 5: Floating Point Resource Comparisons
**What goes wrong:** Mining station "has resources" checks fail at exactly 100.0 minerals
**Why it happens:** JavaScript floating point precision issues
**How to avoid:** Use tolerance: `currentAmount < required - 0.001` instead of strict `<`
**Warning signs:** Resource checks fail inconsistently with "exact" values

### Pitfall 6: Probe Equipment Auto-Collection Timing
**What goes wrong:** Equipment installed but auto-collection doesn't trigger
**Why it happens:** Equipment check happens before game loop update
**How to avoid:** Use waitForTimeout() or waitForFunction() after equipping to allow game loop tick
**Warning signs:** Manual testing works but automated tests show no collection

### Pitfall 7: Statistical Test Variance
**What goes wrong:** RNG tests fail intermittently with "within expected range" assertions
**Why it happens:** Small sample sizes or tight tolerance bands
**How to avoid:** Use 500-1000 samples minimum, tolerance ranges of 5-10%
**Warning signs:** Tests fail 1-5% of runs, especially in CI

### Pitfall 8: Sector Creation Without Resource Profiles
**What goes wrong:** Discovery modal crashes or shows "Profile data unavailable"
**Why it happens:** Programmatically created sectors missing resourceProfile property
**How to avoid:** Always include `resourceProfile: { type: 'balanced', spawnRateMultiplier: 1.0 }` in sector setup
**Warning signs:** Modal display tests fail but modal opens successfully

## Code Examples

Verified patterns from existing tests:

### Complete startGame Helper
```javascript
// Source: tests/discovery-reveal.spec.js:22-38
// Use this in all integration tests
async function startGame(page) {
    await page.locator('#newGameBtn').click();
    await page.waitForTimeout(1500);
    const skipBtn = page.locator('#skipCutscene');
    if (await skipBtn.isVisible()) {
        await skipBtn.click();
    }
    await page.waitForSelector('#galaxyCanvas', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // CRITICAL: Dismiss tutorial panel
    await page.evaluate(() => {
        const tutorialPanel = document.getElementById('tutorialPanel');
        if (tutorialPanel) tutorialPanel.style.display = 'none';
    });
}
```

### Gate Test Template
```javascript
// Pattern for all progression gate tests
test('feature X is blocked before prerequisite Y', async ({ page }) => {
    await startGame(page);

    // 1. Verify initial blocked state
    const beforeState = await page.evaluate(() => {
        // Check game state - feature should be inaccessible
        return { canAccess: /* check condition */ };
    });
    expect(beforeState.canAccess).toBe(false);

    // 2. Attempt action - should fail
    const attemptResult = await page.evaluate(() => {
        // Try to use feature
        // Return success/failure
    });
    expect(attemptResult.success).toBe(false);

    // 3. Meet prerequisite
    await page.evaluate(() => {
        // Set up prerequisite condition
        // e.g., add resources, research node, build structure
    });

    // 4. Verify feature now accessible
    const afterState = await page.evaluate(() => {
        // Check game state again
        return { canAccess: /* check condition */ };
    });
    expect(afterState.canAccess).toBe(true);

    // 5. Attempt action again - should succeed
    const retryResult = await page.evaluate(() => {
        // Try to use feature again
    });
    expect(retryResult.success).toBe(true);
});
```

### End-to-End Flow Template
```javascript
// Pattern for happy path integration tests
test('complete feature pipeline from A to Z', async ({ page }) => {
    await startGame(page);

    // Step 1: Setup - give initial resources
    await page.evaluate(() => {
        const gs = window.game.gameState;
        gs.resources.minerals = 200;
        gs.resources.data = 100;
        window.uiManager.updateUI();
    });

    // Step 2: Trigger feature A
    const resultA = await page.evaluate(() => {
        // Perform action A
        // Return state
    });
    expect(resultA.success).toBe(true);

    // Step 3: Verify intermediate state
    const midState = await page.evaluate(() => {
        // Check that A created expected state
    });
    expect(midState.valueX).toBe(expectedX);

    // Step 4: Trigger feature B (depends on A)
    const resultB = await page.evaluate(() => {
        // Perform action B
    });
    expect(resultB.success).toBe(true);

    // Step 5: Verify final state across multiple systems
    const finalState = await page.evaluate(() => {
        return {
            systemA: /* check system A */,
            systemB: /* check system B */,
            systemC: /* check system C */
        };
    });
    expect(finalState.systemA).toMatchObject({ /* expected */ });
    expect(finalState.systemB).toBe(expectedB);
    expect(finalState.systemC).toContain(expectedC);
});
```

### Statistical Validation Template
```javascript
// Pattern for large-sample RNG tests
test('feature distribution matches expected probabilities', async ({ page }) => {
    await startGame(page);

    const result = await page.evaluate(() => {
        const samples = 500;  // Minimum for statistical confidence
        const outcomes = { typeA: 0, typeB: 0, typeC: 0 };

        // Clear state for isolation
        window.game.gameState.entities.signals = [];

        // Run many samples
        for (let i = 0; i < samples; i++) {
            const outcome = /* call RNG function */;
            outcomes[outcome]++;
        }

        // Calculate percentages
        return {
            typeAPercent: (outcomes.typeA / samples) * 100,
            typeBPercent: (outcomes.typeB / samples) * 100,
            typeCPercent: (outcomes.typeC / samples) * 100,
            totalSamples: samples
        };
    });

    // Verify with tolerance (5-10% range typical)
    expect(result.typeAPercent).toBeGreaterThan(15);  // Expected: 20% ± 5%
    expect(result.typeAPercent).toBeLessThan(25);

    expect(result.typeBPercent).toBeGreaterThan(45);  // Expected: 50% ± 5%
    expect(result.typeBPercent).toBeLessThan(55);

    expect(result.typeCPercent).toBeGreaterThan(25);  // Expected: 30% ± 5%
    expect(result.typeCPercent).toBeLessThan(35);
});
```

### Programmatic Sector Creation for Integration
```javascript
// Source: tests/discovery-reveal.spec.js:43-76
// Use this to create deterministic sectors for cross-system tests
async function createTestSector(page, typeName, x, y, profileType = 'balanced') {
    return page.evaluate(({ type, sx, sy, profile }) => {
        const world = window.game.gameState.getWorld();

        const sectorTypes = {
            'Standard': {
                name: 'Standard',
                color: 'rgba(100, 100, 255, 0.3)',
                borderColor: '#66f',
                mineralBonus: 1.0, dataBonus: 1.0, artifactBonus: 1.0
            },
            'Resource-Rich': {
                name: 'Resource-Rich',
                color: 'rgba(255, 200, 100, 0.3)',
                borderColor: '#fc8',
                mineralBonus: 2.0, dataBonus: 1.5, artifactBonus: 1.2,
                exclusiveSignalType: 'ore_vein'
            },
            'Data Haven': {
                name: 'Data Haven',
                color: 'rgba(100, 255, 100, 0.3)',
                borderColor: '#6f6',
                mineralBonus: 0.8, dataBonus: 3.0, artifactBonus: 1.5,
                exclusiveSignalType: 'data_cache'
            },
            // ... other types
        };

        const sector = {
            x: sx, y: sy,
            explored: true,
            type: sectorTypes[type],
            name: `Test ${type} Sector`,
            stars: [],
            outposts: [], facilities: [], hubs: [],
            resourceProfile: {
                type: profile,
                spawnRateMultiplier: profile === 'sparse' ? 0.5 : 1.0
            }
        };

        world.sectors.set(`${sx},${sy}`, sector);
        return { success: true, sectorKey: `${sx},${sy}` };
    }, { type: typeName, sx: x, sy: y, profile: profileType });
}
```

### Save/Load Round-Trip Test
```javascript
// Source: tests/save-system.spec.js:172-212
// Pattern for testing state persistence
test('complex state survives save/load cycle', async ({ page }) => {
    await startGame(page);

    // Setup complex state
    await page.evaluate(() => {
        const gs = window.game.gameState;
        gs.resources.minerals = 500;
        gs.resources.data = 300;

        const research = gs.getResearchSystem();
        research.unlocked = true;
        research.points = 10;
        research.researched.add('auto_minerals');

        // Add custom entities, etc.
    });

    // Save programmatically (more reliable than UI)
    const saveResult = await page.evaluate(async () => {
        try {
            await window.game.saveManager.saveGame(1);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });
    expect(saveResult.success).toBe(true);

    // Modify state after saving
    await page.evaluate(() => {
        window.game.gameState.resources.minerals = 0;
        window.game.gameState.getResearchSystem().points = 0;
    });

    // Verify state changed
    const modified = await page.evaluate(() => ({
        minerals: window.game.gameState.resources.minerals
    }));
    expect(modified.minerals).toBe(0);

    // Load programmatically
    const loadResult = await page.evaluate(async () => {
        try {
            await window.game.saveManager.loadGame(1);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    });
    expect(loadResult.success).toBe(true);
    await page.waitForTimeout(500);  // Allow state to settle

    // Verify original state restored
    const restored = await page.evaluate(() => {
        const gs = window.game.gameState;
        return {
            minerals: gs.resources.minerals,
            data: gs.resources.data,
            researchPoints: gs.getResearchSystem().points,
            researchedNodes: Array.from(gs.getResearchSystem().researched)
        };
    });

    expect(restored.minerals).toBe(500);
    expect(restored.data).toBe(300);
    expect(restored.researchPoints).toBe(10);
    expect(restored.researchedNodes).toContain('auto_minerals');
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| UI-based save/load | Programmatic saveManager API | v1.3 (save-system tests) | More reliable, no UI timing issues |
| Fixed wait times | waitForFunction() state checks | v1.3 (game-smoke tests) | Faster, more robust in CI |
| Single equipment object | Equipment array per probe | v1.3 (equipment-slots) | Must use Array methods, check isArray |
| Manual test setup | Reusable startGame() helper | v1.3 (discovery-reveal) | Consistent, reduces boilerplate |
| Global localStorage clear | Per-test beforeEach isolation | v1.3 (all tests) | Prevents test pollution |

**Deprecated/outdated:**
- `probetheus_save_*` localStorage keys: Changed to `csog_save_*` in v1.3
- Single hub/station cosmetic objects: Changed to shell system in v1.2
- Tutorial text hardcoded validation: Now handled by tutorial system tests, not integration tests

## Open Questions

1. **Test timeout values for large statistical samples**
   - What we know: Standard tests use 10000ms (10s) timeout
   - What's unclear: Whether 1000-sample RNG tests need longer timeout in CI
   - Recommendation: Start with default, increase to 30000ms (30s) only if CI fails

2. **Tolerance ranges for distance-based distributions**
   - What we know: Probethium-rich sectors increase from ~2% near origin to ~10% far out
   - What's unclear: Exact tolerance for "near" vs "far" boundary
   - Recommendation: Use 200+ sector samples with ±3% tolerance for robustness

3. **Cross-browser testing necessity**
   - What we know: Config has only Chromium project, not Firefox/WebKit
   - What's unclear: Whether integration tests should run on multiple browsers
   - Recommendation: Chromium-only is sufficient (game is single-browser, not web app)

4. **Test file size limits**
   - What we know: Existing test files range from 200-700 lines
   - What's unclear: Whether 40-50 tests in one file (progression-gates.spec.js) is too large
   - Recommendation: Keep at 40-50 tests, split only if file exceeds 1000 lines

## Sources

### Primary (HIGH confidence)
- `tests/game-smoke.spec.js` - Core test infrastructure patterns
- `tests/research-gating.spec.js` - Gate testing pattern with dual requirements
- `tests/save-system.spec.js` - Save/load patterns and localStorage keys
- `tests/discovery-reveal.spec.js` - Sector creation and modal testing
- `tests/exclusive-signals.spec.js` - Statistical sampling patterns
- `tests/sector-profiles.spec.js` - Distance-based distribution testing
- `tests/tutorial-enhancements.spec.js` - Helper patterns and beforeEach setup
- `tests/equipment-slots.spec.js` - Equipment array patterns
- `playwright.config.js` - Test configuration and web server setup
- `package.json` - Test commands and Playwright version

### Secondary (MEDIUM confidence)
- `.planning/phases/10-testing-integration/10-CONTEXT.md` - User requirements and test organization decisions
- `.planning/milestones/v1.2-ROADMAP.md` - Historical context on equipment system changes
- `CLAUDE.md` - Project testing standards and development commands

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Playwright is documented, version-locked, actively used
- Architecture: HIGH - 27 existing test files demonstrate proven patterns extensively
- Pitfalls: HIGH - Multiple issues discovered and documented in existing tests (localStorage keys, tutorial panel, equipment format)
- Test organization: HIGH - User decisions in CONTEXT.md are clear and specific

**Research date:** 2026-02-06
**Valid until:** 30 days (2026-03-08) - stable test infrastructure, unlikely to change rapidly
