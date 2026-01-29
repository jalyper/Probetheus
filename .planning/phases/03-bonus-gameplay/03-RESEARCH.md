# Phase 3: Bonus Gameplay - Research

**Researched:** 2026-01-28
**Domain:** Shell bonus system wiring into game mechanics
**Confidence:** HIGH

## Summary

This phase wires 12 shell bonus types (already defined in `ShellSystem.js`) into the actual game systems. The bonus infrastructure exists but is completely unused -- `getBonus()`, `applyBonus()`, and `getTotalBonuses()` are defined but never called by any game system. All 12 bonus types have label/icon definitions in `BONUS_TYPES`, and ~40 shells across probe/hub/miningStation categories already carry bonus values.

The primary work is: (1) normalize mismatched bonus values to the rarity scale, (2) build per-entity bonus resolution (currently `getTotalBonuses()` uses global equipped shell, not per-entity), (3) hook each bonus into the correct game system integration point, (4) build minimal researchSpeed system, (5) add inline stat display in detail panels.

**Primary recommendation:** Add a per-entity bonus resolver method to ShellSystem (e.g., `getEntityBonus(entity, category, bonusType)`) that looks up the shell equipped on that specific entity, then use this method at each integration point. Do NOT use the existing `getBonus()`/`applyBonus()` methods -- they aggregate across all categories (global), which violates the per-entity model.

## Current State Analysis

### ShellSystem Bonus Infrastructure (EXISTS, UNUSED)

**File:** `src/ShellSystem.js`

The following methods exist but are NEVER called by any game system:

| Method | Line | What It Does | Problem |
|--------|------|-------------|---------|
| `getTotalBonuses()` | 842 | Sums bonuses across ALL equipped shells (probes+hubs+stations) | Returns global aggregate, not per-entity |
| `getBonus(bonusType)` | 860 | Gets total bonus for a type | Calls getTotalBonuses(), same problem |
| `applyBonus(baseValue, bonusType)` | 869 | Applies `baseValue * (1 + bonus/100)` | Good formula, wrong data source |
| `getProbeShell(probe)` | 818 | Gets shell for specific probe via `probe.shellId` | CORRECT per-entity approach |
| `getEquippedShell(category)` | 826 | Gets global equipped shell for category | Category-level, not entity-level |

**Key insight:** Probes already have per-entity shell assignment via `probe.shellId` and `equipShellOnProbe()`. Hubs and mining stations use category-level equipped shell (`cosmetics.equippedShells.hubs` / `cosmetics.equippedShells.miningStations`). The bonus resolver must handle both patterns.

### Per-Entity Shell Assignment Model

| Entity Type | How Shell Is Assigned | Storage Location |
|-------------|----------------------|------------------|
| Probe | `equipShellOnProbe(probe, shellId)` sets `probe.shellId` | `probe.shellId` (per-entity) |
| Hub | `equipShell('hubs', shellId)` | `cosmetics.equippedShells.hubs` (global for all hubs) |
| Mining Station | `equipShell('miningStations', shellId)` | `cosmetics.equippedShells.miningStations` (global for all stations) |

**Implication for per-entity model:** Probes already support per-entity. For hubs and mining stations, either:
- A: Add `hub.shellId` / `station.shellId` property (requires SaveManager + UI changes)
- B: Use the category-level shell for all hubs/stations (simpler, same shell = same bonus for all hubs)

**Recommendation (Claude's Discretion):** Use approach B (category-level) for hubs and mining stations in this phase. Per-hub/per-station shell assignment is a Phase 4 concern. This keeps scope manageable while still providing meaningful bonuses.

## Bonus Value Audit

### Target Rarity Scale (from CONTEXT.md decisions)
| Rarity | Primary Bonus | Secondary Bonus |
|--------|--------------|-----------------|
| Common | 0% (no bonus) | 0% |
| Uncommon | 10% | 5% |
| Rare | 15% | 8% |
| Epic | 20% | 10% |
| Legendary | 25% | 12% |

### Current Shell Bonus Values vs Target

#### Probe Shells (20 with bonuses, 5 shared with none)

**Keth-Varn (Data & Math) - Primary: dataSignalDiscovery, Secondary: researchSpeed**
| Shell | Rarity | Current Primary | Target Primary | Current Secondary | Target Secondary | Needs Fix |
|-------|--------|----------------|----------------|-------------------|------------------|-----------|
| calculator_core | uncommon | 5 | 10 | 0 | 5 | YES |
| probability_engine | rare | 8 | 15 | 3 | 8 | YES |
| quantum_processor | epic | 12 | 20 | 6 | 10 | YES |
| infinity_calculator | legendary | 18 | 25 | 10 | 12 | YES |

**Whisperer (Signals) - Primary: signalRange, Secondary: rareSignalChance**
| Shell | Rarity | Current Primary | Target Primary | Current Secondary | Target Secondary | Needs Fix |
|-------|--------|----------------|----------------|-------------------|------------------|-----------|
| echo_receiver | uncommon | 5 | 10 | 0 | 5 | YES |
| frequency_hunter | rare | 8 | 15 | 3 | 8 | YES |
| cosmic_antenna | epic | 12 | 20 | 6 | 10 | YES |
| omniscient_listener | legendary | 18 | 25 | 10 | 12 | YES |

**Mira-Sol (Survival) - Primary: probeDurability, Secondary: asteroidSurvival**
| Shell | Rarity | Current Primary | Target Primary | Current Secondary | Target Secondary | Needs Fix |
|-------|--------|----------------|----------------|-------------------|------------------|-----------|
| reinforced_hull | uncommon | 5 | 10 | 0 | 5 | YES |
| survivor_class | rare | 8 | 15 | 3 | 8 | YES |
| fortress_probe | epic | 12 | 20 | 6 | 10 | YES |
| immortal_sentinel | legendary | 18 | 25 | 10 | 12 | YES |

**Archivist (Discovery) - Primary: artifactDiscovery, Secondary: explorationRewards**
| Shell | Rarity | Current Primary | Target Primary | Current Secondary | Target Secondary | Needs Fix |
|-------|--------|----------------|----------------|-------------------|------------------|-----------|
| relic_seeker | uncommon | 5 | 10 | 0 | 5 | YES |
| treasure_hunter | rare | 8 | 15 | 3 | 8 | YES |
| archaeologist_prime | epic | 12 | 20 | 6 | 10 | YES |
| eternal_curator | legendary | 18 | 25 | 10 | 12 | YES |

**Null (Exotic) - Primary: exoticYield, Secondary: probethiumRate**
| Shell | Rarity | Current Primary | Target Primary | Current Secondary | Target Secondary | Needs Fix |
|-------|--------|----------------|----------------|-------------------|------------------|-----------|
| void_touched | uncommon | 5 | 10 | 0 | 5 | YES |
| abyssal_harvester | rare | 8 | 15 | 3 | 8 | YES |
| entropy_engine | epic | 12 | 20 | 6 | 10 | YES |
| null_singularity | legendary | 18 | 25 | 10 | 12 | YES |

#### Hub Shells (12 with bonuses, 3 shared with none)

**NOTE:** Hub shells currently have probe-only bonuses like `probeDurability` and `asteroidSurvival` on Mira-Sol hubs. Per CONTEXT.md decision, these should be CLEANED UP (removed) since hubs don't take damage.

| Shell | Rarity | Bonuses | Valid for Hub? | Action |
|-------|--------|---------|----------------|--------|
| data_nexus | rare | dataSignalDiscovery:8, researchSpeed:4 | researchSpeed YES, dataSignal NO (probe bonus) | CLEAN: keep researchSpeed only |
| quantum_hub | epic | dataSignalDiscovery:15, researchSpeed:8 | researchSpeed YES, dataSignal NO | CLEAN: keep researchSpeed only |
| signal_amplifier | rare | signalRange:10, rareSignalChance:5 | NO (probe bonuses) | CLEAN: needs hub-appropriate bonuses or researchSpeed |
| echo_chamber | epic | signalRange:18, rareSignalChance:10 | NO (probe bonuses) | CLEAN: needs hub-appropriate bonuses or researchSpeed |
| shelter_station | rare | probeDurability:10, asteroidSurvival:5 | NO (probe bonuses) | CLEAN: needs hub-appropriate bonuses or researchSpeed |
| bastion_hub | epic | probeDurability:18, asteroidSurvival:10 | NO (probe bonuses) | CLEAN: needs hub-appropriate bonuses or researchSpeed |
| archive_vault | rare | artifactDiscovery:10, explorationRewards:5 | NO (probe bonuses) | CLEAN |
| museum_prime | epic | artifactDiscovery:18, explorationRewards:10 | NO (probe bonuses) | CLEAN |
| void_anchor | rare | exoticYield:10, probethiumRate:5 | probethiumRate YES, exoticYield NO | CLEAN: keep probethiumRate only |
| null_gate | epic | exoticYield:18, probethiumRate:10 | probethiumRate YES, exoticYield NO | CLEAN: keep probethiumRate only |

**Recommendation:** The only hub-appropriate bonus type is `researchSpeed`. All hub shells should have `researchSpeed` as their bonus (the one bonus type that makes sense for hubs). Normalize values:
- Rare hub shell: `researchSpeed: 15`
- Epic hub shell: `researchSpeed: 20`

#### Mining Station Shells (8 with bonuses, 2 shared)

| Shell | Rarity | Bonuses | Valid for Station? | Action |
|-------|--------|---------|-------------------|--------|
| industrial_complex | uncommon | miningEfficiency:5 | YES | Normalize to 10 |
| optimized_extractor | rare | miningEfficiency:10, researchSpeed:5 | miningEfficiency YES, researchSpeed NO | CLEAN: replace researchSpeed with shuttleSpeed or probethiumRate |
| calculation_mine | epic | miningEfficiency:18, researchSpeed:10 | miningEfficiency YES, researchSpeed NO | CLEAN |
| armored_rig | rare | shuttleSpeed:10, asteroidSurvival:8 | shuttleSpeed YES, asteroidSurvival NO | CLEAN: replace asteroidSurvival with miningEfficiency or probethiumRate |
| endurance_platform | epic | shuttleSpeed:18, asteroidSurvival:15 | shuttleSpeed YES, asteroidSurvival NO | CLEAN |
| excavation_site | rare | artifactDiscovery:12, explorationRewards:8 | NO (probe bonuses) | CLEAN: replace with miningEfficiency/probethiumRate |
| relic_foundry | epic | artifactDiscovery:20, explorationRewards:15 | NO (probe bonuses) | CLEAN |
| void_extractor | rare | exoticYield:15, probethiumRate:8 | probethiumRate YES, exoticYield NO | CLEAN: replace exoticYield with miningEfficiency |
| singularity_mine | legendary | exoticYield:25, probethiumRate:15 | probethiumRate YES, exoticYield NO | CLEAN |

**Valid mining station bonus types:** `miningEfficiency`, `shuttleSpeed`, `probethiumRate`

## Integration Points - Exact Code Locations

### PBON-01: dataSignalDiscovery (Probe)
**File:** `src/ProbeManager.js`, line 461
**Current code:** `if (Math.random() < 0.3)` -- 30% chance to generate signal
**Integration:** Replace `0.3` with `0.3 * (1 + bonus/100)`. A 20% bonus becomes `0.3 * 1.20 = 0.36` (36% chance).
**Bonus source:** `probe.shellId` -> lookup shell -> get `dataSignalDiscovery` value

### PBON-02: signalRange (Probe)
**File:** `src/ProbeManager.js`, line 660
**Current code:** `const collectionRange = 80;`
**Integration:** Replace `80` with `80 * (1 + bonus/100)`. A 20% bonus becomes `80 * 1.20 = 96px`.
**Also affects:** Radar pulse `maxRadius` at line 456 (`maxRadius: 80`) -- should scale together for visual consistency.
**Bonus source:** `probe.shellId`

### PBON-03: rareSignalChance (Probe)
**File:** `src/ProbeManager.js`, lines 514-532
**Current code:** Rarity thresholds: common <0.5, uncommon <0.75, rare <0.9, epic <0.98, legendary rest
**Integration:** Shift thresholds to favor rarer signals. Reduce common/uncommon thresholds proportionally. E.g., 20% bonus: multiply uncommon+ thresholds by `(1 + bonus/100)` capped at sensible limits. Or: reduce the common threshold by `bonus%` of its value, distributing probability upward.
**Recommendation:** Simplest approach -- reduce the "common" probability by `bonus%` and distribute that probability equally to rare+ tiers. E.g., 20% bonus: common drops from 50% to 40%, the freed 10% goes to uncommon(+3.3%), rare(+3.3%), epic(+3.3%).

### PBON-04: probeDurability (Probe)
**File:** `src/ProbeManager.js`, lines 104-105 (createNewProbe) and line 84-106 (buildProbe)
**Current code:** `maxDamage: 3` (upgradeable to 5 or 8 via research)
**Integration:** After setting `maxDamage` based on research, multiply by `(1 + bonus/100)` and floor. A 20% bonus on maxDamage 3 = floor(3.6) = 3. On maxDamage 5 = floor(6) = 6.
**Note:** This is multiplicative with research as specified. Research sets base maxDamage, shell multiplies it.
**Where research applies:** `src/GameController.js` `onResearchCompleted()` sets maxDamage on existing probes.

### PBON-05: asteroidSurvival (Probe)
**File:** `src/ProbeManager.js`, line 866
**Current code:** `if (Math.random() < currentSector.type.probeDestructionChance)` (10% per check)
**Integration:** Reduce destruction chance: `probeDestructionChance * (1 - bonus/100)`. A 20% bonus: `0.10 * 0.80 = 0.08` (8% chance).
**Bonus source:** `probe.shellId`

### PBON-06: artifactDiscovery (Probe)
**File:** `src/ProbeManager.js`, line 727
**Current code:** `artifacts: 1` / `artifacts: 2` / `artifacts: 5` / etc. in baseRewards
**Integration:** Multiply artifact rewards by `(1 + bonus/100)` and floor. E.g., 20% bonus on 5 artifacts = floor(6) = 6.
**Bonus source:** `probe.shellId`

### PBON-07: explorationRewards (Probe)
**File:** `src/ProbeManager.js`, lines 722-728
**Current code:** `baseRewards` object with minerals, data, artifacts per rarity
**Integration:** Multiply ALL reward values by `(1 + bonus/100)` and floor.
**Bonus source:** `probe.shellId`

### PBON-08: exoticYield (Probe)
**File:** `src/ProbeManager.js`, lines 774-782
**Current code:** Hardcoded exotic bonuses: rare=1, epic=3, legendary=10
**Integration:** Multiply by `(1 + bonus/100)` and floor. 20% on 10 = floor(12) = 12.
**Bonus source:** `probe.shellId`

### HBON-01: researchSpeed (Hub)
**File:** `src/ResearchManager.js`, line 375
**Current code:** `research.points -= node.cost;` -- instant research, no speed concept
**System status:** MISSING. Research is instant (spend points, done). No time-based research exists.
**Recommendation (Claude's Discretion):** Implement as **cost reduction**. Instead of `research.points -= node.cost`, use `research.points -= Math.ceil(node.cost * (1 - bonus/100))`. A 20% researchSpeed bonus on a 5-cost node = ceil(5 * 0.80) = ceil(4.0) = 4. Minimum cost of 1 to prevent free research.
**Alternative:** Could implement as "bonus research points on milestone" but cost reduction is simpler and more tangible.
**Bonus source:** `cosmetics.equippedShells.hubs` (category-level, applies to all research)

### MBON-01: miningEfficiency (Mining Station)
**File:** `src/MiningManager.js`, line 272
**Current code:** `stationType.output * station.level * station.efficiency * this.gameState.mining.efficiencyBonus * sectorBonus`
**Integration:** Add shell bonus multiplier: `* (1 + bonus/100)`. The `efficiencyBonus` field at line 16 is a global research multiplier (starts at 1.0). Shell bonus is per-station.
**Bonus source:** `cosmetics.equippedShells.miningStations`

### MBON-02: probethiumRate (Mining Station)
**File:** `src/GameState.js`, lines 759-808 (`calculateProbethium()`)
**Current code:** Complex multiplier chain: `baseRate * efficiency * exploration * research * endurance`
**Integration:** Add shell bonus as another multiplier in the chain: `* (1 + bonus/100)`
**Note:** This applies globally since probethium generation is a global system. The mining station shell bonus affects the rate.
**Bonus source:** `cosmetics.equippedShells.miningStations`

### MBON-03: shuttleSpeed (Mining Station)
**File:** `src/MiningManager.js`, line 373
**Current code:** `const moveDistance = shuttle.speed * shuttle.level * deltaTime;`
**Integration:** Add shell bonus: `shuttle.speed * shuttle.level * (1 + bonus/100) * deltaTime`
**Note:** `shuttle.speed` is 0.5 (set at line 190). Each shuttle belongs to a station via `shuttle.stationId`.
**Bonus source:** `cosmetics.equippedShells.miningStations`

## Architecture Patterns

### Per-Entity Bonus Resolution Pattern

New method needed in ShellSystem:

```javascript
/**
 * Get bonus value for a specific entity
 * @param {string} category - 'probes', 'hubs', 'miningStations'
 * @param {Object} entity - The entity (probe, hub, or station)
 * @param {string} bonusType - e.g. 'dataSignalDiscovery'
 * @returns {number} Bonus percentage (0 for no bonus)
 */
getEntityBonus(category, entity, bonusType) {
    let shellId;
    if (category === 'probes') {
        shellId = entity?.shellId || this.gameState.cosmetics?.equippedShells?.probes || 'default';
    } else {
        shellId = this.gameState.cosmetics?.equippedShells?.[category] || 'default';
    }
    const shell = this.getShell(category, shellId);
    return shell?.bonuses?.[bonusType] || 0;
}
```

### Integration Pattern at Each Hook Point

```javascript
// Pattern: get bonus, apply multiplicatively
const shellSystem = window.game?.shellSystem;
const bonus = shellSystem ? shellSystem.getEntityBonus('probes', probe, 'signalRange') : 0;
const collectionRange = 80 * (1 + bonus / 100);
```

### Inline Stat Display Pattern

```javascript
// In detail panel, show modified stat with green bonus text
const baseValue = 80;
const bonus = getEntityBonus('probes', probe, 'signalRange');
const displayText = bonus > 0
    ? `Range: ${Math.round(baseValue * (1 + bonus/100))} <span style="color:#0f8;">(+${bonus}%)</span>`
    : `Range: ${baseValue}`;
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bonus calculation formula | Custom math per integration point | Single `applyBonusMultiplier(base, bonus)` in ShellSystem | Ensures consistent `base * (1 + bonus/100)` everywhere |
| Shell lookup for entity | Inline shell catalog access | `getEntityBonus(category, entity, bonusType)` | Centralizes per-entity vs category-level logic |
| Rounding | Different rounding at each point | Consistent `Math.floor()` for integer values, raw float for percentages/rates | Prevents inconsistencies |

## Common Pitfalls

### Pitfall 1: Using Global getTotalBonuses() Instead of Per-Entity
**What goes wrong:** All probes get the same bonus regardless of which shell they have equipped
**Why it happens:** The existing `getBonus()` method aggregates across ALL categories
**How to avoid:** Always use the new `getEntityBonus(category, entity, bonusType)` method
**Warning signs:** Tests show all probes getting bonuses when only one has a bonus shell

### Pitfall 2: Additive Instead of Multiplicative Stacking
**What goes wrong:** Shell bonus + research bonus = too powerful or too weak
**Why it happens:** Adding percentages instead of multiplying
**How to avoid:** Research sets the base multiplier, shell multiplies the result: `base * researchMultiplier * (1 + shellBonus/100)`
**Example:** Mining efficiency: `output * level * efficiency * researchBonus * (1 + shellBonus/100)`

### Pitfall 3: Forgetting Floor on Integer Values
**What goes wrong:** Probe maxDamage becomes 3.6 instead of 3 or 4
**Why it happens:** Bonus produces fractional values on integer stats
**How to avoid:** Use `Math.floor()` for damage, reward amounts. Use raw float for rates/chances.

### Pitfall 4: Shell Bonus on Hubs Applied to Wrong System
**What goes wrong:** Hub shell with probeDurability bonus has no effect because hubs don't take damage
**Why it happens:** Shells have bonuses that don't match their entity type
**How to avoid:** The normalization task must clean up mismatched bonuses first

### Pitfall 5: Null/Undefined ShellSystem Access
**What goes wrong:** Game crashes when shellSystem hasn't loaded yet
**Why it happens:** ShellSystem is accessed before GameController finishes init
**How to avoid:** Always guard with `window.game?.shellSystem` and default bonus to 0

### Pitfall 6: researchSpeed on Probe and Station Shells
**What goes wrong:** researchSpeed appears on Keth-Varn probe shells AND mining station shells, but research is a global system
**Why it happens:** The original shell catalog put researchSpeed wherever Keth-Varn NPCs sell
**How to avoid:** During cleanup, remove researchSpeed from probe shells (probes don't research). Keep it only on hub shells where it makes sense. For mining station Keth-Varn shells, replace researchSpeed with a station-appropriate bonus.

## Integration Order (Recommended)

1. **Normalize bonus values** -- Update SHELL_CATALOG to match rarity scale and clean mismatched types
2. **Add `getEntityBonus()` method** -- Single new method in ShellSystem
3. **Wire probe bonuses** (8 types) -- All in ProbeManager.js, biggest bang for effort
4. **Wire mining bonuses** (3 types) -- MiningManager.js + GameState.js
5. **Build researchSpeed** -- Minimal system in ResearchManager.js
6. **Add inline stat display** -- UIManager.js probe detail panel + DetailsPanel.js station panel
7. **Tests** -- Verify each bonus type + per-entity isolation

## Testing Patterns

### Existing Test Pattern (from shell-system.spec.js)
```javascript
// Pattern: Start game, manipulate state via page.evaluate(), verify
test('bonus should apply', async ({ page }) => {
    await startGame(page);

    const result = await page.evaluate(() => {
        const probe = window.game.gameState.entities.probes[0];
        // Add shell, equip it
        window.game.gameState.cosmetics.ownedShells.probes.push('calculator_core');
        window.game.shellSystem.equipShellOnProbe(probe, 'calculator_core');

        // Check bonus resolved correctly
        const bonus = window.game.shellSystem.getEntityBonus('probes', probe, 'dataSignalDiscovery');
        return { bonus };
    });

    expect(result.bonus).toBe(10); // uncommon = 10%
});
```

### Per-Entity Isolation Test Pattern
```javascript
test('different probes should get different bonuses', async ({ page }) => {
    await startGame(page);

    const result = await page.evaluate(() => {
        const probes = window.game.gameState.entities.probes;
        // Own two shells
        window.game.gameState.cosmetics.ownedShells.probes.push('calculator_core', 'echo_receiver');
        // Equip different shells on different probes
        window.game.shellSystem.equipShellOnProbe(probes[0], 'calculator_core');
        window.game.shellSystem.equipShellOnProbe(probes[1], 'echo_receiver');

        const bonus0 = window.game.shellSystem.getEntityBonus('probes', probes[0], 'dataSignalDiscovery');
        const bonus1 = window.game.shellSystem.getEntityBonus('probes', probes[1], 'dataSignalDiscovery');
        const bonus1Signal = window.game.shellSystem.getEntityBonus('probes', probes[1], 'signalRange');

        return { bonus0, bonus1, bonus1Signal };
    });

    expect(result.bonus0).toBe(10); // calculator_core has dataSignalDiscovery
    expect(result.bonus1).toBe(0);  // echo_receiver has NO dataSignalDiscovery
    expect(result.bonus1Signal).toBe(10); // echo_receiver has signalRange
});
```

## Rounding Strategy (Claude's Discretion)

**Recommendation:**
- Integer stats (maxDamage, reward amounts like minerals/data/artifacts, exotic yield): `Math.floor()` -- rounds down, conservative
- Percentage/chance values (signal gen chance, destruction chance): Keep as float, no rounding needed
- Range values (collection range in pixels): Keep as float, distance math handles decimals fine
- Research cost reduction: `Math.ceil()` -- rounds up, minimum cost of 1

## Open Questions

1. **Hub shell bonus scope:** Since hubs use category-level shells (all hubs share one shell), should researchSpeed from the hub shell be applied once or per-hub? **Recommendation:** Once -- research is global.

2. **probethiumRate scope:** This appears on both probe (Null) and mining station (Null) shells. For probes, how should it apply? The probethium calc in GameState is global, not per-probe. **Recommendation:** Only apply probethiumRate from mining station shells (where it thematically fits). Remove from probe shells during cleanup, replace with exoticYield-only for Null probe shells.

3. **researchSpeed on probe shells:** Keth-Varn probe shells currently have researchSpeed bonuses. Probes don't research. **Recommendation:** During cleanup, replace researchSpeed on probe shells with dataSignalDiscovery-only (primary Keth-Varn bonus), adjusting values per rarity.

## Sources

### Primary (HIGH confidence)
- `src/ShellSystem.js` -- Full read, all 910 lines analyzed
- `src/ProbeManager.js` -- Full read, all integration points identified with line numbers
- `src/MiningManager.js` -- Full read, shuttle speed and efficiency integration points found
- `src/GameState.js` -- Full read, probethium calculation and research system analyzed
- `src/ResearchManager.js` -- Read research completion flow (instant, point-based)
- `src/UIManager.js` -- Read shell section display code
- `src/DetailsPanel.js` -- Full read, probe detail and station detail rendering
- `src/GameController.js` -- Read initialization and shellSystem wiring
- `tests/shell-system.spec.js` -- Read all 12 tests for testing patterns

## Metadata

**Confidence breakdown:**
- Bonus value audit: HIGH -- read every shell definition in SHELL_CATALOG
- Integration points: HIGH -- found exact line numbers in source code
- Per-entity model: HIGH -- traced shellId storage and lookup paths
- researchSpeed design: MEDIUM -- chose cost reduction based on existing instant-research pattern
- Cleanup decisions: MEDIUM -- based on thematic logic, but some shells may need UX review

**Research date:** 2026-01-28
**Valid until:** Indefinite (brownfield codebase, no external dependencies)
