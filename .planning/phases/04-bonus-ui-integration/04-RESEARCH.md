# Phase 4: Bonus UI & Integration - Research Findings

**Date:** 2026-01-29
**Status:** Ready for Planning
**Objective:** Understand existing codebase capabilities to plan tooltip UI and integration testing

---

## Executive Summary

Phase 4 is ready for implementation. The bonus infrastructure (methods, data structures) is complete from Phase 3. The UI layer (DetailsPanel, UIManager, shell modals) is well-structured with existing patterns for dynamic content and event-driven updates. No architectural blockers exist. Integration testing can follow existing Playwright patterns from shell bonus tests.

**Key finding:** The bonus display helpers (`getBonusTypeInfo`, `formatBonus`) already exist in ShellSystem.js but are unused. These provide the foundation for tooltip content generation.

---

## Existing Infrastructure

### 1. Bonus Data & Formatting (ShellSystem.js)

**Location:** Lines 7-21, 927-937

The `BONUS_TYPES` constant defines all 12 bonus types with display metadata:

```javascript
const BONUS_TYPES = {
    dataSignalDiscovery: { label: 'Data Signal Discovery', unit: '%', icon: '📊' },
    researchSpeed: { label: 'Research Speed', unit: '%', icon: '🔬' },
    signalRange: { label: 'Signal Range', unit: '%', icon: '📡' },
    rareSignalChance: { label: 'Rare Signal Chance', unit: '%', icon: '✨' },
    probeDurability: { label: 'Probe Durability', unit: '%', icon: '🛡️' },
    asteroidSurvival: { label: 'Asteroid Survival', unit: '%', icon: '☄️' },
    artifactDiscovery: { label: 'Artifact Discovery', unit: '%', icon: '🏺' },
    explorationRewards: { label: 'Exploration Rewards', unit: '%', icon: '🎁' },
    exoticYield: { label: 'Exotic Mineral Yield', unit: '%', icon: '💎' },
    probethiumRate: { label: 'Probethium Rate', unit: '%', icon: '⚗️' },
    miningEfficiency: { label: 'Mining Efficiency', unit: '%', icon: '⛏️' },
    shuttleSpeed: { label: 'Shuttle Speed', unit: '%', icon: '🚀' }
};
```

**Helper methods available (unused):**

- `getBonusTypeInfo(bonusType)` - Returns label, unit, icon for a bonus type
- `formatBonus(bonusType, value)` - Returns formatted string: `"📊 +10% Data Signal Discovery"`

**Implementation note:** These methods exist but are never called. They were built in anticipation of Phase 4.

### 2. Shell Modal UI (UIManager.js)

**Location:** Lines 1533-1666 (`showShellModal` method)

The probe shell selection modal already exists with:
- Grid layout of owned shells
- Shell preview rendering (`renderProbeShellPreview`)
- Click handlers for equipping shells
- Rarity color borders
- "Current shell" indicator

**Key structure (line 1585-1614):**
```javascript
<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">
    ${ownedShells.map(shell => {
        // Shell option div with:
        // - data-shell-id attribute
        // - SVG preview
        // - Name, rarity, equipped status
    }).join('')}
</div>
```

**Missing:** Hover tooltips for bonus display

### 3. Detail Panels (DetailsPanel.js)

Three entity detail panels exist, all managed by DetailsPanel class:

**Hub Panel** (lines 150-240)
- Shows hub status, probe counts
- Buttons for operations
- Currently displays equipped hub shell info elsewhere

**Mining Station Panel** (lines 244-355)
- Shows station type, efficiency, production
- Resource requirements display
- Currently no shell info visible

**Probe Panel** (handled by UIManager.js)
- Shell section exists (lines 1463-1488 in UIManager)
- Shows current shell preview box
- "Change Shell" button opens modal
- Currently no bonus display on hover

**Pattern:** All panels use dynamic HTML generation with inline styles, event listeners attached after rendering.

### 4. Shell Equipping Flow

**Probes** (per-entity):
- `ShellSystem.equipShellOnProbe(probe, shellId)` - Updates probe.shellId, recalculates bonuses
- Per-probe shell selection modal via `UIManager.showShellModal(probe)`

**Hubs & Stations** (category-level):
- `ShellSystem.equipShell(category, shellId)` - Updates global equipped shell for category
- Shell selection UI not yet implemented for hubs/stations (tech debt from v1.1)

**Important:** Hub and station detail panels exist, but shell selection modals do not. Phase 4 must either:
1. Add tooltips only to probe shell modal (partial scope)
2. Build hub/station shell modals first, then add tooltips (expanded scope)

**Decision needed in planning:** Clarify tooltip scope for hubs/stations.

### 5. Bonus Calculation Integration

From Phase 3, all bonuses are wired and functional:

**Probe bonuses** (ProbeManager.js):
- `dataSignalDiscovery`, `signalRange`, `rareSignalChance` - Signal detection
- `probeDurability`, `asteroidSurvival` - Survival mechanics
- `artifactDiscovery`, `explorationRewards`, `exoticYield` - Exploration rewards

**Hub bonuses** (ResearchManager.js):
- `researchSpeed` - Research cost reduction

**Station bonuses** (MiningManager.js):
- `miningEfficiency` - Mining output multiplier
- `shuttleSpeed` - Shuttle movement speed
- `probethiumRate` - Probethium generation rate

**Integration points:** All use `shellSystem.getEntityBonus(category, entity, bonusType)` to retrieve bonus values.

### 6. Existing Hover Interactions

**Search results:**
- 9 occurrences of `title=` attributes (HTML tooltip fallback)
- 5 occurrences of `mouseenter`/`mouseover` events

**Notable examples:**

**UIManager.js** (lines 1641-1648):
```javascript
option.addEventListener('mouseenter', () => {
    option.style.transform = 'scale(1.05)';
});
option.addEventListener('mouseleave', () => {
    option.style.transform = 'scale(1)';
});
```

**Pattern:** Hover effects use `mouseenter`/`mouseleave` for visual feedback. No custom tooltip system exists yet.

### 7. Testing Infrastructure

**Existing shell bonus tests:**
- `tests/shell-bonus-foundation.spec.js` - 13 tests for bonus normalization and getEntityBonus()
- `tests/probe-bonus-integration.spec.js` - 9 tests for probe bonus integration
- `tests/shell-bonus-wiring.spec.js` - 8 tests for station and hub bonus wiring
- `tests/shell-bonuses.spec.js` - 11 tests for comprehensive bonus verification

**Test pattern for modals:**
```javascript
// Create probe, add shell to owned list
window.game.gameState.cosmetics.ownedShells.probes.push('solar_flare');

// Equip the shell
window.game.shellSystem.equipShellOnProbe(probe, 'solar_flare');

// Verify result
return {
    bodyColor: probe.cosmetic?.bodyColor,
    shellId: probe.shellId
};
```

**Test pattern for bonus verification:**
```javascript
const bonusValue = ss.getEntityBonus('miningStations', station, 'miningEfficiency');
// Apply bonus and measure effect
// Compare before/after values
```

**Test environment:**
- Playwright with Chromium browser
- `startGame()` helper dismisses tutorial panel
- Direct DOM manipulation and evaluate() for game state access

---

## Technical Patterns to Follow

### 1. Tooltip Creation Strategy

**Recommended approach:** Dynamic tooltip container

```javascript
// Create tooltip container (singleton, reused)
const tooltip = document.createElement('div');
tooltip.id = 'bonusTooltip';
tooltip.style.cssText = `
    position: fixed;
    background: rgba(20, 20, 40, 0.95);
    border: 1px solid rgba(0, 255, 255, 0.3);
    border-radius: 4px;
    padding: 8px 12px;
    color: #ccc;
    font-size: 11px;
    z-index: 10001;
    pointer-events: none;
    display: none;
`;
document.body.appendChild(tooltip);

// Show/hide with delay
let tooltipTimeout = null;
element.addEventListener('mouseenter', (e) => {
    tooltipTimeout = setTimeout(() => {
        tooltip.innerHTML = buildTooltipContent(shell);
        positionTooltip(tooltip, e.target);
        tooltip.style.display = 'block';
    }, 300);
});

element.addEventListener('mouseleave', () => {
    clearTimeout(tooltipTimeout);
    tooltip.style.display = 'none';
});
```

**Positioning logic:**
```javascript
function positionTooltip(tooltip, target) {
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    // Position above target, centered
    let x = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let y = rect.top - tooltipRect.height - 8; // 8px gap

    // Keep on screen
    x = Math.max(10, Math.min(x, window.innerWidth - tooltipRect.width - 10));
    if (y < 10) y = rect.bottom + 8; // Flip below if too high

    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}
```

### 2. Tooltip Content Generation

**Using existing helpers:**

```javascript
function buildTooltipContent(shell) {
    if (!shell.bonuses || Object.keys(shell.bonuses).length === 0) {
        return null; // No tooltip for bonus-less shells
    }

    const shellSystem = window.game.shellSystem;
    const lines = [];

    for (const [bonusType, value] of Object.entries(shell.bonuses)) {
        const info = shellSystem.getBonusTypeInfo(bonusType);
        // Format: "📡 Signal Range: +15%"
        lines.push(`${info.icon} ${info.label}: <span style="color: #0f0">+${value}${info.unit}</span>`);
    }

    return lines.join('<br>');
}
```

**Alternative (without icons, per context decision):**

```javascript
function buildTooltipContent(shell) {
    const lines = [];
    for (const [bonusType, value] of Object.entries(shell.bonuses)) {
        const info = shellSystem.getBonusTypeInfo(bonusType);
        lines.push(`${info.label}: <span style="color: #0f0">+${value}${info.unit}</span>`);
    }
    return lines.join('<br>');
}
```

### 3. Integration into Existing Modals

**Shell selection modal** (UIManager.js line 1585):

Add `data-shell` attribute to each shell option div:
```javascript
<div
    class="shell-option"
    data-shell-id="${shell.id}"
    data-shell='${JSON.stringify(shell)}'  // Add this
    style="..."
>
```

Then attach hover listeners after modal creation:
```javascript
const shellOptions = modal.querySelectorAll('.shell-option');
shellOptions.forEach(option => {
    const shellData = JSON.parse(option.getAttribute('data-shell'));
    attachTooltipHandlers(option, shellData);
});
```

**Detail panels** (DetailsPanel.js):

Similar pattern for hub/station panels if shell UI is added.

### 4. Testing Approach

**Tooltip display test structure:**

```javascript
test('BUI-01: Shell selection modal shows bonus tooltip on hover', async ({ page }) => {
    await startGame(page);

    const result = await page.evaluate(async () => {
        const probe = window.game.gameState.entities.probes[0];

        // Add a shell with bonus to owned list
        const shellWithBonus = Object.values(window.SHELL_CATALOG.probes)
            .find(s => s.bonuses && Object.keys(s.bonuses).length > 0);

        window.game.gameState.cosmetics.ownedShells.probes.push(shellWithBonus.id);

        // Open shell modal
        window.game.uiManager.showShellModal(probe);

        // Wait for modal to render
        await new Promise(resolve => setTimeout(resolve, 100));

        // Find the shell option element
        const shellOption = document.querySelector(`[data-shell-id="${shellWithBonus.id}"]`);
        if (!shellOption) return { error: 'Shell option not found' };

        // Simulate hover (dispatch mouseenter)
        shellOption.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

        // Wait for tooltip delay (300ms + buffer)
        await new Promise(resolve => setTimeout(resolve, 400));

        // Check if tooltip is visible
        const tooltip = document.getElementById('bonusTooltip');
        if (!tooltip) return { error: 'Tooltip element not found' };

        return {
            tooltipVisible: tooltip.style.display === 'block',
            tooltipContent: tooltip.innerHTML,
            expectedBonus: shellWithBonus.bonuses
        };
    });

    expect(result.error).toBeUndefined();
    expect(result.tooltipVisible).toBe(true);
    expect(result.tooltipContent).toContain('+'); // Verify bonus value shown
});
```

**Save/load integration test structure:**

```javascript
test('TEST-08: Save/load preserves bonuses and they remain functional', async ({ page }) => {
    await startGame(page);

    // Equip a shell with bonus, measure effect
    const beforeSave = await page.evaluate(() => {
        const probe = window.game.gameState.entities.probes[0];
        const shell = Object.values(window.SHELL_CATALOG.probes)
            .find(s => s.bonuses && s.bonuses.signalRange);

        window.game.gameState.cosmetics.ownedShells.probes.push(shell.id);
        window.game.shellSystem.equipShellOnProbe(probe, shell.id);

        const bonus = window.game.shellSystem.getEntityBonus('probes', probe, 'signalRange');

        // Save game
        window.game.saveManager.saveGame();

        return { shellId: shell.id, bonusValue: bonus };
    });

    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);

    // Load save and verify bonus still works
    const afterLoad = await page.evaluate(() => {
        window.game.saveManager.loadGame();

        const probe = window.game.gameState.entities.probes[0];
        const bonus = window.game.shellSystem.getEntityBonus('probes', probe, 'signalRange');

        return { shellId: probe.shellId, bonusValue: bonus };
    });

    expect(afterLoad.shellId).toBe(beforeSave.shellId);
    expect(afterLoad.bonusValue).toBe(beforeSave.bonusValue);
    expect(afterLoad.bonusValue).toBeGreaterThan(0);
});
```

---

## Knowledge Gaps & Clarifications Needed

### 1. Tooltip Scope for Hubs & Mining Stations

**Question:** Should Phase 4 include tooltips for hub and mining station shells?

**Context:**
- Hub and station shell selection UI does not exist yet (tech debt from v1.1)
- Detail panels exist for both entity types
- Bonuses are functional but invisible

**Options:**
1. **Probe-only scope:** Add tooltips only to probe shell modal (clear scope, quick implementation)
2. **All entities scope:** Build hub/station shell modals, then add tooltips (larger scope, complete feature)

**Recommendation:** Clarify with planning phase. Context document mentions "all entity detail panels" but modals don't exist yet for 2 of 3 entity types.

### 2. Tooltip Arrow Pointer

**Question:** How important is the downward-pointing arrow triangle?

**Context:**
- Context mentions "small arrow pointer triangle pointing down toward the shell icon"
- Arrow requires additional CSS/SVG rendering
- Arrow positioning is tricky with tooltip overflow/edge cases

**Options:**
1. **With arrow:** More polished, matches inventory tooltip aesthetic
2. **Without arrow:** Simpler, faster to implement, still functional

**Recommendation:** Start without arrow, add as polish if time allows. Arrow is cosmetic enhancement, not core functionality.

### 3. Unowned Shell Tooltips

**Question:** Should unowned shells in NPC vendor UI show tooltips?

**Context:**
- Context says "including unowned shells" show tooltips
- NPC vendor shell UI is part of Remnants story system (separate milestone)
- May not be in scope for Phase 4

**Options:**
1. **In scope:** Add tooltips everywhere shells appear (owned + vendor)
2. **Out of scope:** Add tooltips only to owned shell modal

**Recommendation:** Clarify vendor UI scope. If Remnants system is separate milestone, defer vendor tooltips.

### 4. Tooltip Emoji Icons

**Question:** Should tooltip bonus lines include emoji icons?

**Context:**
- Context lists this under "Claude's Discretion"
- BONUS_TYPES already defines icons for all bonus types
- `formatBonus()` includes icons: `"📊 +10% Data Signal Discovery"`

**Options:**
1. **With icons:** Use existing formatBonus() helper directly
2. **Without icons:** Strip icons for cleaner text-only display

**Recommendation:** Start with icons (easier, uses existing helper). Can remove if cluttered during testing.

---

## Implementation Risks & Mitigation

### Risk 1: Tooltip z-index conflicts

**Risk:** Modal backgrounds (z-index 10000) may obscure tooltip (needs z-index 10001+)

**Mitigation:** Test tooltip visibility inside modals early. Adjust z-index hierarchy if needed.

### Risk 2: Tooltip positioning edge cases

**Risk:** Tooltip may render off-screen near window edges

**Mitigation:** Implement bounds checking in `positionTooltip()` function. Flip tooltip below target if too high.

### Risk 3: Tooltip doesn't dismiss on shell swap

**Risk:** Context mentions "tooltip dismisses when shell is swapped"

**Mitigation:** Listen for `shell:equipped` event, hide tooltip immediately on event emission.

### Risk 4: Shell equip bugs affecting bonus display

**Risk:** If equipping shells is buggy, tooltips will show incorrect info

**Mitigation:** Verify Phase 3 tests all pass before starting Phase 4. Shell equipping is prerequisite functionality.

### Risk 5: Save/load test flakiness

**Risk:** Page reload + load game has timing issues in Playwright

**Mitigation:** Add generous `waitForTimeout()` calls. Use `page.waitForSelector()` for key elements before accessing game state.

---

## Recommended Implementation Order

1. **Create tooltip container and helpers** (1 hour)
   - Singleton tooltip div
   - `buildTooltipContent()` helper
   - `positionTooltip()` helper
   - `attachTooltipHandlers()` helper

2. **Add tooltips to probe shell modal** (2 hours)
   - Modify `UIManager.showShellModal()` to add data attributes
   - Attach hover listeners after modal creation
   - Test tooltip appears and dismisses correctly

3. **Add tooltips to probe detail panel** (1 hour)
   - Modify shell preview box in `UIManager.updateShellSection()`
   - Attach hover listener to preview box
   - Test tooltip shows current equipped shell bonus

4. **Write tooltip display tests** (2 hours)
   - BUI-01: Shell selection modal hover test
   - BUI-02: Probe detail panel hover test
   - TEST-05: Verify tooltip content matches shell bonuses

5. **Add tooltips to hub detail panel** (if in scope) (3 hours)
   - Build hub shell selection modal (new feature)
   - Add shell preview section to hub detail panel
   - Attach tooltip handlers
   - Write BUI-03 test

6. **Add tooltips to station detail panel** (if in scope) (3 hours)
   - Build station shell selection modal (new feature)
   - Add shell preview section to station detail panel
   - Attach tooltip handlers
   - Write BUI-04 test

7. **Write integration tests** (2 hours)
   - TEST-07: Equip shell, verify effect, swap shell, verify change
   - TEST-08: Save/load preserves bonuses and functionality

8. **Polish and bug fixes** (1-2 hours)
   - Tooltip positioning edge cases
   - Arrow pointer (if decided)
   - Tooltip styling refinements

**Total estimate:** 12-16 hours (probe-only scope) or 18-22 hours (all entities scope)

---

## Constraints & Boundaries

### Technical Constraints

1. **No framework dependencies** - Vanilla JS only (per CLAUDE.md)
2. **No breaking save changes** - Must support existing save files
3. **Playwright tests required** - All features must have test coverage

### Scope Boundaries

**In scope:**
- Tooltip UI system (container, positioning, content generation)
- Hover handlers on shell elements
- Bonus display in tooltips (labels, values, colors)
- Integration tests for equip/swap/save/load flows

**Out of scope (unless clarified):**
- Hub and mining station shell selection modals (may be separate task)
- NPC vendor shell tooltips (part of Remnants milestone)
- Tooltip arrow pointer (Claude's discretion, recommend defer)
- Animated tooltip transitions (context specifies "no animation")

### Success Criteria

Phase 4 is complete when:
1. ✅ Players can hover over any shell in the selection modal and see its bonuses
2. ✅ Players can hover over equipped shell preview and see its bonuses
3. ✅ Tooltips show human-readable labels, percentage values, and appropriate styling
4. ✅ Tooltips appear after 300ms hover delay and dismiss immediately on mouse leave
5. ✅ Default shells (no bonuses) show no tooltip
6. ✅ All tooltip tests pass (BUI-01 through BUI-05, TEST-05 through TEST-08)
7. ✅ Save/load preserves equipped shells and bonuses remain functional

---

## Questions for Planning Phase

1. **Hub/Station scope:** Should Phase 4 build shell selection modals for hubs and stations, or only add tooltips to existing probe modal?

2. **Arrow pointer:** Should tooltips include downward-pointing arrow triangle? (Recommend defer as polish)

3. **NPC vendor tooltips:** Are unowned shell tooltips in vendor UI in scope, or part of Remnants milestone?

4. **Icon display:** Should tooltip bonus lines include emoji icons (📡 Signal Range) or text-only (Signal Range)?

5. **Default shell tooltip:** Context says "no tooltip at all" for default shell. Should default shell show tooltip saying "No bonuses" or truly show nothing?

---

## Files to Modify

### Primary Files

1. **src/UIManager.js**
   - `showShellModal()` - Add tooltip handlers to shell options
   - `updateShellSection()` - Add tooltip to equipped shell preview
   - New: `createBonusTooltip()`, `attachTooltipHandlers()`, `positionTooltip()`

2. **src/DetailsPanel.js** (if hub/station scope)
   - `showHubDetails()` - Add shell section with tooltip
   - `showMiningStationDetails()` - Add shell section with tooltip

### Test Files

3. **tests/shell-bonus-ui.spec.js** (new file)
   - BUI-01: Shell selection modal tooltip test
   - BUI-02: Probe detail panel tooltip test
   - BUI-03: Hub detail panel tooltip test (if in scope)
   - BUI-04: Station detail panel tooltip test (if in scope)
   - BUI-05: Tooltip content format test
   - TEST-05: Multi-bonus tooltip test
   - TEST-06: Default shell no-tooltip test

4. **tests/shell-bonus-integration.spec.js** (new file)
   - TEST-07: Equip/swap/verify cycle test
   - TEST-08: Save/load bonus persistence test

---

## Conclusion

Phase 4 is technically straightforward with no architectural blockers. The bonus system is complete, the UI layer is modular and event-driven, and testing patterns are established. The main planning decision is scope clarification (probe-only vs. all entities). Implementation can proceed immediately once scope is defined.

**Recommended next step:** Move to planning phase with specific questions answered, then proceed with probe-only implementation first (lower risk, faster delivery). Hub and station tooltips can be added in follow-up if needed.
