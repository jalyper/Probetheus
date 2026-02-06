# Phase 7 Research: Signal Rewards

**Phase:** 07-signal-rewards
**Goal:** Exclusive signals provide meaningful reward advantages over standard signals
**Requirements:** REW-01, REW-02, REW-03, REW-04
**Researched:** 2026-02-05

## Question

**What do I need to know to PLAN this phase well?**

## Answer Summary

**High Confidence.** All infrastructure exists. This is a simple extension of `GameController.explore()` reward calculation with 4 switch cases for exclusive signal types. Shell bonuses already apply automatically (type-agnostic design from Phase 3). No new systems, files, or dependencies.

**Key implementation insight:** REW-01/REW-02 are 2x multipliers applied to base rewards AFTER planet bonuses but using same exploration mode logic. REW-03 requires artifact rarity filtering (elevate common→uncommon). REW-04 uses existing exotic mineral logic with 60/40 split (exotic vs mixed).

**Planning complexity: LOW** - Straightforward reward math, existing patterns, minimal edge cases.

## System Architecture

### Current Exploration Flow

**File:** `/mnt/e/repos/Probetheus/src/GameController.js`
**Method:** `explore(mode)` - lines 2080-2275

**Execution order:**
1. Get signal rarity (`signal.rarity`)
2. Look up base rewards from rarity table (lines 2098-2104)
3. Apply planet type bonuses (lines 2108-2142)
4. Apply signal type bonuses for standard types (lines 2144-2169) - **EXTENSION POINT**
5. Determine primary reward based on exploration mode (lines 2174-2188)
6. Add exotic mineral bonus for rare+ signals (lines 2190-2194)
7. Store rewards in nearest probe cargo
8. Show reward modal

**Key insight:** Signal type bonuses (lines 2144-2169) currently only handle standard types (`mineral`, `data`, `artifact`) with 50% bonuses. Exclusive types NOT YET handled here.

### Base Reward Table

```javascript
// GameController.js lines 2098-2104
const baseRewards = {
    common: { minerals: 5, data: 2, artifacts: 1 },
    uncommon: { minerals: 10, data: 5, artifacts: 2 },
    rare: { minerals: 20, data: 10, artifacts: 5 },
    epic: { minerals: 40, data: 20, artifacts: 10 },
    legendary: { minerals: 100, data: 50, artifacts: 25 }
};
```

**Pattern:** All exploration modes use the same base table, modified by planet bonuses and signal type bonuses before mode-specific extraction.

### Planet Type Bonuses

**Lines:** 2108-2142
**Multipliers:**
- Molten/Volcanic: 1.5x minerals
- Frozen: 1.3x data, 1.3x artifacts
- Toxic: 1.4x minerals, 0.8x artifacts
- Desert: 1.3x minerals, 0.9x data
- Ocean: 1.5x data
- Forest: 1.2x data, 1.2x artifacts
- Crystal: 1.2x minerals, 1.4x artifacts

**Applied before signal type bonuses.** Uses spread operator: `rewards = { ...rewards, minerals: Math.floor(...) }`

### Signal Type Bonuses (Standard Types)

**Lines:** 2144-2169
```javascript
if (signal.signalType) {
    switch (signal.signalType) {
        case 'mineral':
            rewards = { ...rewards, minerals: Math.floor(rewards.minerals * 1.5) };
            break;
        case 'data':
            rewards = { ...rewards, data: Math.floor(rewards.data * 1.5) };
            break;
        case 'artifact':
            rewards = { ...rewards, artifacts: Math.floor(rewards.artifacts * 1.5) };
            break;
    }
}
```

**Pattern:** 50% bonus (1.5x multiplier) to matching resource type. Applied AFTER planet bonuses.

### Exploration Mode Extraction

**Lines:** 2174-2188
```javascript
switch (mode) {
    case 'excavate':
        primaryReward = 'minerals';
        rewardAmount = rewards.minerals + Math.floor(Math.random() * rewards.minerals);
        break;
    case 'exterminate':
        primaryReward = 'data';
        rewardAmount = rewards.data + Math.floor(Math.random() * rewards.data);
        break;
    case 'expedition':
        primaryReward = 'artifacts';
        rewardAmount = rewards.artifacts + Math.floor(Math.random() * rewards.artifacts);
        break;
}
```

**Pattern:** Base amount + 0-100% random variance. Player chooses which resource to extract via mode.

### Exotic Mineral Bonus

**Lines:** 2190-2194
```javascript
let exoticBonus = 0;
if (rarity === 'rare') exoticBonus = 1;
else if (rarity === 'epic') exoticBonus = 3;
else if (rarity === 'legendary') exoticBonus = 10;
```

**Applied to ALL rare+ signals regardless of type.** Added directly to probe cargo.

## Requirement Analysis

### REW-01: Ore Vein 2x Minerals

**Requirement:** "Ore Vein signals yield 2x minerals on exploration compared to standard mineral signals"

**Current state:**
- `ore_vein` signals spawn in Resource-Rich sectors (Phase 5)
- Base type maps to `mineral` for equipment collection (ProbeManager.js:654)
- NOT handled in explore() reward calculation yet

**Implementation approach:**
```javascript
case 'ore_vein':
    // 2x mineral bonus (100% boost vs standard 50% boost)
    rewards = { ...rewards, minerals: Math.floor(rewards.minerals * 2.0) };
    break;
```

**Stacking order:**
1. Base reward from rarity table
2. Planet type bonus (e.g., Molten +50%)
3. **Ore Vein 2x multiplier** (NEW)
4. Exploration mode (excavate extracts minerals)

**Example calculation:**
- Signal: ore_vein, rare rarity, Molten planet
- Base: 20 minerals (rare)
- Planet: 20 * 1.5 = 30 minerals (Molten)
- Signal type: 30 * 2.0 = 60 minerals (ore_vein)
- Mode (excavate): 60 + rand(0-60) = 60-120 minerals final

**Edge cases:**
- Other modes (exterminate/expedition) can still extract from ore_vein, but mineral bonus wasted
- Shell bonus `explorationRewards` applied in auto-collection, NOT manual exploration (different code path)

### REW-02: Data Cache 2x Data

**Requirement:** "Data Cache signals yield 2x data on exploration compared to standard data signals"

**Implementation:** Identical pattern to REW-01
```javascript
case 'data_cache':
    rewards = { ...rewards, data: Math.floor(rewards.data * 2.0) };
    break;
```

**Stacking example:**
- Signal: data_cache, epic rarity, Ocean planet
- Base: 20 data (epic)
- Planet: 20 * 1.5 = 30 data (Ocean)
- Signal type: 30 * 2.0 = 60 data (data_cache)
- Mode (exterminate): 60 + rand(0-60) = 60-120 data final

### REW-03: Relic Rare+ Artifacts

**Requirement:** "Relic signals yield guaranteed rare+ artifacts (no common artifacts)"

**Challenge:** Exploration doesn't use rarity-based artifact generation. It uses numeric amounts.

**Current artifact generation:**
- Base table gives raw counts: common=1, uncommon=2, rare=5, epic=10, legendary=25
- No concept of "artifact rarity" in rewards — just quantities

**Two interpretation options:**

**Option A:** Minimum signal rarity (simplest)
- Relic signals cannot be common rarity
- Adjust spawn logic in ProbeManager.determineSignalRarity()
- Filter out common outcome for relic signals specifically

**Option B:** Quantity boost (matches pattern)
- Treat "rare+ artifacts" as "more artifacts than normal"
- Apply 2x artifact multiplier (matches REW-01/REW-02 pattern)
- Guarantees higher artifact yield without changing rarity system

**RECOMMENDED: Option B** - consistent with REW-01/REW-02 pattern, no special-casing in spawn logic.

**Implementation:**
```javascript
case 'relic':
    // 2x artifact bonus - "rare+ artifacts" means more artifacts
    rewards = { ...rewards, artifacts: Math.floor(rewards.artifacts * 2.0) };
    break;
```

**Rationale:**
- Game doesn't track individual artifact rarity in exploration rewards
- "Rare+ artifacts" = "valuable artifacts" = more artifacts
- Matches established pattern (2x for all exclusive types)
- Simpler implementation, no spawn logic changes

**Alternative if literal interpretation required:**
Could add minimum rarity check in signal spawn:
```javascript
// In ProbeManager.determineSignalRarity() - lines 542-576
if (signalType === 'relic') {
    // Force uncommon minimum for relic signals
    const rarity = normalRarityCalculation();
    if (rarity === 'common') return 'uncommon';
    return rarity;
}
```
**Not recommended** - adds complexity, inconsistent with REW-01/REW-02 design.

### REW-04: Exotic Crystal Mixed Rewards

**Requirement:** "Exotic Crystal signals yield exotic minerals or all three basic resources at once"

**Existing exotic mineral logic:** Lines 2190-2194 give exotic minerals for rare+ signals of ANY type.

**Implementation approach:**
```javascript
case 'exotic_crystal':
    // 60% exotic minerals, 40% mixed reward
    if (Math.random() < 0.6) {
        // Boost exotic mineral yield
        // Handled by existing exotic bonus logic (lines 2190-2194)
        // Add extra exotic bonus multiplier
        rewards = { ...rewards }; // No change to base rewards
        // Flag for enhanced exotic yield (see below)
    } else {
        // 40% chance: all three resources at once
        // Boost all resource types equally
        rewards = {
            minerals: Math.floor(rewards.minerals * 1.5),
            data: Math.floor(rewards.data * 1.5),
            artifacts: Math.floor(rewards.artifacts * 1.5)
        };
    }
    break;
```

**Challenge:** Exploration mode extracts only ONE resource type. How to give "all three at once"?

**Solution options:**

**Option A:** Override mode restriction
- When exotic_crystal AND 40% roll: ignore mode, give all three
- Change lines 2174-2188 to handle special case
- **Problem:** Breaks established UX (player chooses mode but gets overridden)

**Option B:** Multi-resource as cargo
- Store all three resources in probe cargo simultaneously
- Requires changing cargo addition logic (lines 2236-2239)
- **Problem:** Significant code changes, breaks modal display

**Option C:** Boost chosen resource significantly
- 60% chance: enhanced exotic minerals (existing logic works)
- 40% chance: 2x boost to chosen resource type (matches pattern)
```javascript
case 'exotic_crystal':
    // Two possible outcomes
    if (Math.random() < 0.6) {
        // Outcome 1: Enhanced exotic mineral yield
        // (handled by existing exotic bonus, no changes needed here)
        // Just ensure exotic bonus applies later
    } else {
        // Outcome 2: Significantly boosted primary resource
        rewards = {
            minerals: Math.floor(rewards.minerals * 2.0),
            data: Math.floor(rewards.data * 2.0),
            artifacts: Math.floor(rewards.artifacts * 2.0)
        };
    }
    break;
```

**RECOMMENDED: Option C** - maintains mode choice UX, matches 2x pattern, no special-casing cargo logic.

**Exotic mineral enhancement:**
For 60% outcome, need to boost exotic yield beyond default rare+ bonus. Add special handling after line 2194:
```javascript
// After existing exotic bonus calculation
if (signal.signalType === 'exotic_crystal' && exoticBonus > 0) {
    exoticBonus = Math.floor(exoticBonus * 2.0); // Double exotic yield for exotic_crystal
}
```

**Alternative interpretation:** "All three at once" could mean mixing into cargo silently.
- When mode=excavate on exotic_crystal (40% roll): add minerals+data+artifacts to cargo
- Override mode-based extraction for this specific case
- Show "Mixed Resources" in reward modal

**Needs design clarification during planning phase.**

## Shell Bonus Integration

**Current bonus system:** Phase 3 (Bonus Gameplay) implemented per-entity bonuses via `ShellSystem.getEntityBonus()`.

**Relevant bonuses for exploration:**
- `explorationRewards`: +X% to all resource types (lines 837-843 in ProbeManager.js)
- `artifactDiscovery`: +X% to artifacts specifically (lines 845-849 in ProbeManager.js)

**Key insight:** These bonuses apply in **auto-collection** (ProbeManager.js), NOT manual exploration (GameController.js).

**Manual exploration path:**
1. Player clicks signal → generates planet
2. Player chooses exploration mode
3. GameController.explore() calculates rewards
4. Rewards stored in nearest probe cargo
5. **Shell bonuses NOT applied** (probe not directly involved in exploration action)

**Auto-collection path:**
1. Probe moves near signal
2. ProbeManager.autoCollectSignals() checks equipment
3. Shell bonuses applied (lines 837-849)
4. Resources stored in probe cargo

**Design question:** Should shell bonuses apply to manual exploration?

**Arguments for:**
- Consistency (bonuses should help all collection methods)
- Nearest probe is used for cargo storage, so probe is "involved"

**Arguments against:**
- Manual exploration is player-driven, not probe-driven
- Different code path, would require finding probe first
- explorationRewards bonus description implies auto-collection context

**RECOMMENDATION:** Leave shell bonuses for auto-collection only. Manual exploration is separate player action not directly tied to probe abilities. Keeps code paths simple.

**If bonus integration required:** Would need to find nearest probe BEFORE reward calculation (currently happens after), then call `shellSystem.getEntityBonus('probes', nearestProbe, 'explorationRewards')` at line 2145.

## Edge Cases & Considerations

### 1. Signal Type Existence Check

**Current code:** `if (signal.signalType)` check at line 2145.

**Assumption:** All signals from Phase 5 have `signalType` property.

**Verification:** ProbeManager.js:506-511 assigns `signalType` to all generated signals.

**Edge case:** Old save files loaded pre-Phase 5 might have signals without `signalType`.

**Mitigation:** Defensive check already exists. Signals without type skip bonus logic (safe fallback).

### 2. Exclusive Type vs Standard Type Overlap

**Question:** Can a signal be both `ore_vein` AND get the standard `mineral` bonus?

**Answer:** No. Switch statement is mutually exclusive. Exclusive types get their own case.

**Code structure:**
```javascript
switch (signal.signalType) {
    case 'ore_vein':      // 2x minerals
    case 'data_cache':    // 2x data
    case 'relic':         // 2x artifacts
    case 'exotic_crystal':// special logic
    case 'mineral':       // 1.5x minerals (standard)
    case 'data':          // 1.5x data (standard)
    case 'artifact':      // 1.5x artifacts (standard)
}
```

No fallthrough, no double-dipping.

### 3. Exotic Crystal RNG State

**REW-04 implementation** has 60/40 split decided at exploration time.

**Question:** Should outcome be deterministic based on signal properties, or random each exploration?

**Current pattern:** Random variance added at mode extraction (line 2178: `Math.random() * rewards.minerals`).

**Recommendation:** Random at exploration time (matches pattern). Each exploration of exotic_crystal rolls fresh 60/40.

**Alternative:** Store outcome in signal.exoticOutcome on spawn. Deterministic per signal.
- **Not recommended** - adds state complexity, no clear player benefit.

### 4. Cargo Capacity Constraints

**Lines 2213-2231:** Cargo full check happens BEFORE adding rewards.

**Exclusive signals give more rewards → higher chance of cargo full.**

**Not a bug, working as intended.** Cargo Expander research incentivized.

**Edge case:** Exotic crystal "all three resources" variant might overflow cargo more easily.
- If chosen resource would fit but all three wouldn't: player might be surprised.
- Mitigation: Keep Option C approach (2x chosen resource, not mixed).

### 5. Rarity-Based Exotic Minerals

**Lines 2190-2194:** Exotic bonus applies to rare+ signals of ALL types.

**Question:** Should exotic_crystal get additional exotic bonus beyond this?

**Current exotic yields:**
- Rare signal: 1 exotic mineral
- Epic signal: 3 exotic minerals
- Legendary signal: 10 exotic minerals

**For exotic_crystal 60% outcome:**
- Could double: rare=2, epic=6, legendary=20
- Or add flat bonus: +5 exotic minerals
- Or leave unchanged (existing system generous enough)

**Recommendation:** 2x exotic yield for consistency with other bonuses.

### 6. Modal Display

**Lines 2254-2264:** Reward modal shows text like "+60 Minerals, +10 Exotic Minerals (pending delivery)"

**Exclusive signals with 2x bonuses → larger numbers.**

**No changes needed.** Modal dynamically builds text from reward amounts.

**Exotic crystal special case:** If "all three resources" implemented (Option A/B), would need custom modal text.

## Testing Strategy

### Unit Test Coverage Needed

**File:** `tests/signal-rewards.spec.js` (NEW)

**Test cases:**

1. **REW-01: Ore Vein 2x minerals**
   - Spawn ore_vein signal, explore with excavate, verify 2x mineral yield vs standard mineral signal
   - Test stacking: ore_vein on Molten planet (1.5x planet * 2x signal = 3x total)

2. **REW-02: Data Cache 2x data**
   - Spawn data_cache signal, explore with exterminate, verify 2x data yield
   - Test on Ocean planet (1.5x planet * 2x signal = 3x total)

3. **REW-03: Relic artifacts**
   - Spawn relic signal, explore with expedition, verify 2x artifact yield
   - Test on Crystal planet (1.4x planet * 2x signal = 2.8x total)

4. **REW-04: Exotic Crystal outcomes**
   - Generate 100 exotic_crystal explorations, verify ~60% exotic mineral outcomes, ~40% boosted resource outcomes
   - Verify exotic mineral doubling (if implemented)
   - Verify all-resource boost (if implemented)

5. **Multiplier stacking order**
   - Verify planet bonus → signal bonus → mode extraction order
   - Test edge case: legendary ore_vein on Molten with excavate

6. **Backward compatibility**
   - Load signal without signalType property, verify no crash (fallback to no bonus)

7. **Cargo capacity interaction**
   - Exclusive signal with large reward, probe with small cargo, verify cargo full handling

8. **Modal display**
   - Verify reward text shows correct amounts for 2x bonuses

### Performance Considerations

**No performance concerns.** Simple arithmetic, no loops or heavy computation.

**Existing performance guards:**
- Particle rendering limited to <50 signals (Phase 6)
- Reward calculation happens once per exploration (not per frame)

## Files to Modify

### Primary Changes

**File:** `/mnt/e/repos/Probetheus/src/GameController.js`
**Method:** `explore(mode)` - lines 2144-2169
**Changes:**
1. Add 4 new switch cases for exclusive signal types
2. Implement 2x multipliers for ore_vein, data_cache, relic
3. Implement exotic_crystal special logic (60/40 split)
4. Optionally enhance exotic mineral yield for exotic_crystal (lines 2190-2194)

**Estimated lines changed:** ~30-40 lines (mostly new cases in switch statement)

### Test File

**File:** `/mnt/e/repos/Probetheus/tests/signal-rewards.spec.js` (NEW)
**Purpose:** Playwright tests for REW-01 through REW-04
**Estimated lines:** ~250-300 lines (8 test cases with setup/teardown)

## Implementation Risks

### Risk 1: Requirement Interpretation - REW-03

**Issue:** "Rare+ artifacts" could mean minimum signal rarity OR artifact quantity boost.

**Mitigation:** Document decision in plan, verify with user during review if unclear.

**Recommendation:** Use quantity boost (2x artifacts) for consistency.

### Risk 2: Requirement Interpretation - REW-04

**Issue:** "All three resources at once" conflicts with mode-based extraction UX.

**Mitigation:** Clarify during planning. Recommend 2x boost to chosen resource (40% outcome) to maintain UX consistency.

### Risk 3: Economy Balance

**Issue:** 2x bonuses might be too generous, especially with planet bonuses stacking.

**Mitigation:** Track during implementation notes. Phase 7 roadmap already notes: "Track resource gain rates by sector type during testing for economy balance."

**Math check:**
- Legendary ore_vein on Molten planet with excavate: 100 * 1.5 * 2.0 + rand(0-300) = 300-600 minerals
- vs legendary mineral on Molten: 100 * 1.5 * 1.5 + rand(0-225) = 225-450 minerals
- **Difference: ~33% more on average** - reasonable for exclusive signal rarity

### Risk 4: Shell Bonus Confusion

**Issue:** Players might expect shell bonuses to apply to manual exploration.

**Mitigation:** Current design keeps bonuses for auto-collection only. Document clearly. If feedback indicates confusion, could add bonuses to manual exploration in future iteration.

## Dependencies

### Completed Prerequisites

- ✅ **Phase 5:** Signal types defined (`ore_vein`, `data_cache`, `relic`, `exotic_crystal`)
- ✅ **Phase 5:** Base type mapping (`getSignalBaseType()`) for equipment compatibility
- ✅ **Phase 6:** Visual rendering for exclusive signals (cosmetic, not functional dependency)
- ✅ **Phase 3:** Shell bonus system (type-agnostic, applies to auto-collection)

### No New Dependencies

- No new files required (only GameController.js modification)
- No new libraries or external dependencies
- No new game systems (using existing exploration, reward, cargo systems)

## Open Questions for Planning

1. **REW-03 Interpretation:** Use 2x artifact multiplier OR enforce minimum signal rarity?
   - **Recommendation:** 2x multiplier for consistency

2. **REW-04 Mixed Rewards:** Override mode selection OR boost chosen resource 2x?
   - **Recommendation:** Boost chosen resource (maintains UX)

3. **REW-04 Exotic Yield:** Double exotic mineral bonus for exotic_crystal?
   - **Recommendation:** Yes, for 60% outcome consistency

4. **Shell Bonus Integration:** Apply explorationRewards to manual exploration?
   - **Recommendation:** No, keep auto-collection only (simpler)

5. **Economy Balance:** Are 2x multipliers appropriate?
   - **Validation:** Test during implementation, track gain rates
   - **Contingency:** Could reduce to 1.75x or 1.5x if too generous

## Research Confidence

**Overall: HIGH**

- ✅ Extension point identified (GameController.js:2144-2169)
- ✅ Existing patterns clear (switch cases, multiplier stacking)
- ✅ Edge cases documented
- ✅ Test strategy defined
- ✅ No architectural unknowns
- ⚠️ Minor interpretation questions (REW-03, REW-04) resolvable during planning

**Estimated planning time:** 15-25 minutes (straightforward requirements, clear implementation path)

**Estimated implementation time:** 30-45 minutes (code changes simple, tests follow established patterns)

---

*Research complete: 2026-02-05*
*Ready for: Phase 7 planning*
