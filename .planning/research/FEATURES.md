# Feature Landscape: Sector-Specific Signals

**Domain:** Space exploration idle games, roguelike zone systems, incremental discovery mechanics
**Researched:** 2026-02-02
**Confidence:** HIGH (based on codebase analysis and established patterns from roguelikes/incremental games)

## Executive Summary

Sector-specific signal systems in space exploration and idle games create meaningful differentiation between zones by providing **exclusive content per location type**. The key patterns are:

1. **Zone-exclusive loot** - certain items/resources only appear in specific biomes
2. **Visual distinction** - unique appearances make exclusive content instantly recognizable
3. **Discovery reveal** - "treasure map" moment showing what's special about a new zone
4. **Progression gating** - rare content encourages exploring dangerous/difficult zones

The existing Probetheus signal system (5 types, 5 rarities, sector discovery bonuses, themed colors) provides a **strong foundation**. The gap: no signals are truly exclusive to sector types. All signal types can spawn anywhere, diminishing sector identity.

---

## Table Stakes

Features users expect from zone-specific loot systems. Missing these = system feels incomplete.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Exclusive signal types per sector** | Core promise — "Ancient sectors have relics only found there" | **Medium** | New signal type definitions; sector-to-signal mapping |
| **Visual distinction for exclusive signals** | Must be instantly recognizable as "that's the Ancient sector signal!" | **Low** | Existing signal rendering; new color schemes/particle effects |
| **Discovery reveal UI** | Players need to know what's special about a sector when discovering it | **Low** | Existing sector discovery modal (already exists) |
| **Signal spawn weighting** | Exclusive signals should be reasonably common in their home sector | **Low** | Existing signal generation in ProbeManager.js |
| **Sector-appropriate theming** | Signal names/visuals match sector identity (relics in Ancient, ore in Resource-Rich) | **Low** | Signal definitions; naming conventions |
| **Backward compatibility** | Existing mixed/mineral/data/artifact signals continue working | **Low** | Keep existing signal types; add new ones alongside |

**MVP Recommendation:** All table stakes features are essential. Without exclusive signal types, the feature doesn't exist. Without visual distinction, exclusivity isn't meaningful. Without discovery reveal, players don't understand the system.

---

## Differentiators

Features that make this system stand out beyond baseline expectations.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Sector-exclusive signals remain harvestable anywhere** | Collect relic signal in Ancient sector, then click to harvest later — portable discovery | **Low** | Existing signal collection supports this; just clarify in UI |
| **Tiered exclusivity** | Some signals "prefer" a sector (2x spawn rate) vs "exclusive" (only spawn there) | **Medium** | Adds depth without all-or-nothing design; rewards sector specialization |
| **Cross-sector synergies** | "Ancient + Resource-Rich adjacent sectors spawn Fusion Cores" | **High** | Complex; likely out of scope for v1 |
| **Signal type affects exploration rewards** | Relic signals yield more artifacts on planet exploration | **Medium** | Ties signals to existing exploration system; clear player value |
| **Cosmetic flair for discovery bonuses** | First discovery signals have unique particle effects (sparkles exist, expand) | **Low** | Existing `isDiscoveryBonus` flag; enhance visual treatment |
| **Sector streak bonuses** | "Discovered 3 Ancient sectors → +10% relic signal spawn chance" | **Medium** | Progression mechanic; may conflict with "no new progression" constraint |
| **Signal rarity influenced by sector danger** | Asteroid Field exclusive signals have higher base rarity (more rare/epic) | **Low** | Existing rarity system; adjust probabilities per sector |

**Recommendation:** Prioritize **tiered exclusivity** and **signal type affects exploration rewards** as highest-value differentiators. These create gameplay depth without adding complexity. Defer cross-sector synergies and streak bonuses to future milestones.

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in zone-specific systems.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Perfect exclusivity for common signals** | Frustrating — "I need minerals but I'm in Ancient sector, must leave" | Make basic resources (mineral/data/artifact) available everywhere; only exotic signals are exclusive |
| **Too many exclusive signal types** | Dilutes identity — if every sector has 10 unique signals, none feel special | 1-2 exclusive signals per sector type (5 sectors → 5-10 total new types) |
| **Hidden mechanics** | Players shouldn't need to wiki-dive to learn "Fusion Signals only spawn in Resource-Rich" | Discovery reveal UI shows exclusives; tooltips/hints reinforce |
| **Exclusive signals gated behind research** | Breaks discovery flow — "You discovered an Ancient sector but can't see relics until you research it" | Signals spawn immediately; collection may require research (like existing collectors) |
| **Sector-specific equipment required** | Tedious inventory management — "Swap to Ancient Scanner before entering Ancient sectors" | Use existing universal equipment system; bonuses may amplify sector signals |
| **Exclusive signals replace discovery bonuses** | Reduces immediate reward — discovering new sector should feel generous, not stingy | Stack exclusives ON TOP of existing discovery bonuses (sector discovery still gives guaranteed signals) |
| **Overly similar visuals** | If all exclusive signals look nearly identical, distinction is meaningless | Each sector type needs distinct color palette + particle pattern |

**Critical:** Avoid **perfect exclusivity** for basic resources. Players need minerals/data/artifacts for core progression. Only premium/exotic signals should be fully exclusive.

---

## Feature Dependencies

How sector-specific signals interact with existing systems.

### Signal Generation (ProbeManager.js)
**Current:** `determineSignalType()` weights signals per sector (60% mineral in Resource-Rich, etc.)
**Required:** Add sector-exclusive logic: "If sector === Ancient, 20% chance for relic signal instead of mixed"

### Signal Rendering (GameController.js)
**Current:** `renderSignals()` has color themes per type (mineral=orange, data=green, artifact=purple)
**Required:** Add new color schemes for exclusive signals; consider particle effects (sparkles, rings)

### Sector Discovery (SectorManager.js)
**Current:** Discovery modal shows bonuses, `spawnDiscoveryBonusSignals()` creates guaranteed signals
**Required:** Update modal to list exclusive signals available in sector; possibly spawn 1 exclusive as bonus

### Exploration System (GameController.js)
**Current:** Planet exploration yields resources based on planet type + rarity
**Optional:** Tie exclusive signal type to exploration rewards (e.g., relic signal → +50% artifact yield)

### Shell Bonuses (ShellSystem.js)
**Current:** `dataSignalDiscovery`, `rareSignalChance`, `signalRange` bonuses affect signal spawning
**Required:** Verify bonuses apply to exclusive signals (should work automatically if signals use same structure)

### Save System (SaveManager.js)
**Current:** Signals cleared on save/load (not persisted, regenerate on exploration)
**Required:** No changes needed; exclusive signals behave like existing signals (ephemeral)

---

## Sector-Specific Signal Suggestions

Based on existing 5 sector types, here are natural exclusive signal candidates:

### Standard Sector
**Exclusive Signal:** None (intentionally generic)
**Rationale:** Standard sectors are baseline; they shouldn't have premium content to avoid penalizing early exploration

### Resource-Rich Sector
**Exclusive Signal:** **Ore Vein** (rich mineral deposits)
- **Visual:** Bright orange core with radiating lines (mining laser aesthetic)
- **Reward:** Yields 2x minerals on collection vs standard mineral signals
- **Spawn Rate:** 15% of signals in Resource-Rich (replaces some mixed signals)

### Data Haven Sector
**Exclusive Signal:** **Data Cache** (encrypted archives)
- **Visual:** Bright cyan with rotating hexagon rings (digital aesthetic)
- **Reward:** Yields 2x data on collection vs standard data signals
- **Spawn Rate:** 15% of signals in Data Haven

### Ancient Sector
**Exclusive Signal:** **Relic** (archaeological artifacts)
- **Visual:** Soft gold glow with orbiting dust particles (ancient aesthetic)
- **Reward:** Yields guaranteed rare+ artifacts (no common artifacts)
- **Spawn Rate:** 10% of signals in Ancient (lower rate but higher value)

### Asteroid Field Sector
**Exclusive Signal:** **Exotic Mineral** (rare crystalline compounds)
- **Visual:** Prismatic rainbow shimmer with sharp crystal facets
- **Reward:** Yields exotic minerals (existing resource) OR all three basic resources at once
- **Spawn Rate:** 10% of signals in Asteroid Field

**Alternative approach:** Instead of doubling existing resources, exclusive signals could introduce **new exploration options** when clicked (e.g., relic signals open "Archaeological Survey" mini-game). This adds depth but increases complexity significantly.

---

## Discovery Reveal Implementation

When player discovers a new sector, the existing modal should highlight what's special.

### Current Modal Content (SectorManager.js:277-323)
- Sector name and type
- Resource bonuses (Minerals x2.0, Data x1.5, etc.)
- Probe destruction warning (Asteroid Field only)
- Discovery bonus message

### Proposed Enhancement
Add section to modal:

```
EXCLUSIVE SIGNALS DETECTED:
🔶 Ore Veins - Rich mineral deposits (2x yield)
   "Concentrated mineral veins only found in resource-rich regions"
```

**Visual treatment:**
- Use signal color scheme (orange for Ore Veins)
- Icon representing signal type
- Brief description of benefit

**Standard sector exception:**
```
SECTOR ANALYSIS:
📊 Balanced exploration opportunities
   "Standard sectors provide reliable mixed-resource signals"
```

This sets expectation that Standard is baseline, not inferior.

---

## Integration with Existing Shell Bonuses

Existing bonuses that interact with sector-specific signals:

| Bonus Type | How It Applies | Example |
|------------|---------------|---------|
| `dataSignalDiscovery` | Increases chance of ANY data-themed signal (Data Cache + standard data) | Probe with +20% discovers Data Caches more often in Data Haven |
| `rareSignalChance` | Shifts rarity distribution for exclusive signals same as mixed signals | Relic signals more likely to be epic/legendary |
| `signalRange` | Detection radius applies to exclusive signals identically | No special handling needed |
| `artifactDiscovery` | Affects artifact yield from exploration (if exclusive signals boost exploration) | Relic signal → planet exploration → artifact bonus stacks |

**Critical:** Exclusive signals should **respect existing bonuses**. Don't create parallel systems. Use same `rarity` and `signalType` structure so ProbeManager.js logic applies uniformly.

---

## Phasing Strategy

How to roll out sector-specific signals across development phases:

### Phase 1: Foundation (Required for v1)
- Define exclusive signal types (5 new types)
- Update `determineSignalType()` to spawn exclusives in appropriate sectors
- Add visual rendering for new signal types (colors, particles)
- Update sector discovery modal to show exclusive signals

**Deliverable:** Sector-specific signals spawn and look distinct

### Phase 2: Polish (Nice-to-have for v1)
- Tie exclusive signal types to exploration rewards (relic signal → +artifact yield)
- Enhanced particle effects for exclusive signals (orbiting elements, unique pulses)
- Sector discovery bonus includes 1 guaranteed exclusive signal (in addition to existing bonuses)

**Deliverable:** Exclusive signals feel mechanically integrated, not just cosmetic

### Phase 3: Depth (Post-v1)
- Tiered exclusivity (some signals "prefer" sectors, not fully exclusive)
- Sector streak bonuses (discover multiple Ancient sectors → more relics)
- Cross-sector synergies (adjacent sector effects)

**Deliverable:** Long-term engagement through mastery

---

## Complexity Assessment

| Feature Category | Implementation Effort | Risk Level |
|------------------|----------------------|------------|
| Signal definitions | 2-4 hours | **Low** — extend existing structure |
| Visual rendering | 4-6 hours | **Low** — extend existing rendering logic |
| Spawn logic | 2-3 hours | **Low** — modify `determineSignalType()` |
| Discovery reveal UI | 2-3 hours | **Low** — extend existing modal |
| Exploration integration | 3-5 hours | **Medium** — ties two systems together |
| Testing | 4-6 hours | **Medium** — verify spawn rates, visuals, bonuses |

**Total estimate:** 17-27 hours for Phase 1+2 (full v1 implementation)

**Risk factors:**
- Balancing spawn rates (too rare = frustrating, too common = not special)
- Visual distinction at a glance (signals are small on screen, must be recognizable)
- Avoiding feature creep (easy to add "just one more signal type")

---

## Open Questions

Questions that couldn't be fully resolved through codebase analysis:

1. **Should exclusive signals have longer lifetimes?**
   - Current signals last 2-6 seconds
   - Exclusive signals being rarer might justify 5-8 seconds (more time to notice/collect)
   - Risk: clutters screen if too many persist

2. **Should Standard sectors have a unique signal?**
   - Pro: Every sector feels special
   - Con: Dilutes "Standard" identity as baseline
   - Recommendation: Skip for v1, consider if players complain Standard feels boring

3. **Should dark market signals remain universal or become sector-exclusive?**
   - Current: Dark market signals spawn anywhere with low probability
   - Alternative: Dark market signals only in specific sectors (e.g., Asteroid Field as lawless zone)
   - Recommendation: Keep universal — dark market is its own system, not sector-tied

4. **How to handle signals that spawn near sector boundaries?**
   - Exclusive signal spawns 50 pixels inside Ancient sector, drifts toward Resource-Rich border
   - Should collection region check matter? Or just spawn location?
   - Recommendation: Spawn location determines type (simpler, already how discovery bonuses work)

---

## Success Criteria

How to know if sector-specific signals succeed:

### Player Behavior
- **Exploration diversity increases:** Players visit multiple sector types, not just farming one optimal sector
- **Sector discovery feels rewarding:** "Oh, Ancient sectors have relics! I want to find more Ancient sectors."
- **Visual recognition:** Players can identify sector type by signal colors at a glance

### Technical Metrics
- Exclusive signals spawn at expected rates (10-15% of sector signals)
- Shell bonuses apply correctly to exclusive signals (verified in tests)
- No save/load bugs with new signal types
- Performance remains stable (rendering 50+ signals with new effects)

### Qualitative Feel
- Sectors feel differentiated (not just palette swaps)
- Discovery moment is exciting (seeing new exclusive signal type)
- Exclusive signals feel premium, not gimmicky

---

## Sources

**Codebase Analysis (HIGH confidence):**
- `src/ProbeManager.js` — signal generation, type determination, rarity system
- `src/GameController.js` — signal rendering, colors, visual effects
- `src/SectorManager.js` — sector discovery, bonus signal spawning, discovery modal
- `src/ShellSystem.js` — bonus system that must integrate with new signals
- Existing system already supports signal theming (`signalType`), rarity tiers, discovery bonuses

**Domain Knowledge (MEDIUM confidence — from Claude training data, Jan 2025 cutoff):**
- Roguelike biome-specific loot patterns (Hades, Slay the Spire, Risk of Rain)
- Idle game zone differentiation (Antimatter Dimensions, Realm Grinder, NGU Idle)
- Space exploration genre conventions (Stellaris, Out There, Star Traders)

**Patterns observed:**
- Zone-exclusive loot is table stakes in modern roguelikes (not optional)
- Visual distinction is critical for player agency (must recognize at a glance)
- Discovery reveal is standard onboarding pattern (tooltip/modal on first encounter)
- Tiered exclusivity > perfect exclusivity (avoids frustration of "wrong zone")

**No external sources consulted** (WebSearch unavailable). Recommendations based entirely on:
1. Existing Probetheus codebase structure
2. Established patterns in similar game genres (as of training cutoff)
3. Analysis of current signal system capabilities and constraints
