# Phase 3: Bonus Gameplay - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire all 12 shell bonus types into game systems so equipped shells actually affect entity behavior. Per-entity model — each shell's bonus only affects the entity it's equipped on. Includes normalizing bonus values across all shells to follow a rarity-based scale, and building minimal systems where none exist.

</domain>

<decisions>
## Implementation Decisions

### Bonus Magnitudes
- Rarity scales bonus power: Common 5%, Uncommon 10%, Rare 15%, Epic 20%, Legendary 25%
- Normalize ALL existing shell bonus values to match this rarity curve
- Bonuses multiply with research upgrades (multiplicative stacking, not additive)
  - Example: 2x research multiplier * 1.15 shell bonus = 2.3x total

### Bonus Behaviors
- **signalRange**: Widens the probe's detection area (wider net catches more signals). NOT increased signal frequency — the detectable space expands. Collection range at ProbeManager:660 is the integration point (currently 80px)
- **probeDurability**: EXISTS — maxDamage system already in place with research upgrades. Multiply maxDamage by bonus
- **asteroidSurvival**: EXISTS — destruction chance system in asteroid fields. Reduce destruction chance by bonus percentage
- **miningEfficiency**: EXISTS — efficiencyBonus multiplier already wired in MiningManager
- **shuttleSpeed**: EXISTS — shuttle.speed used in update loop
- **researchSpeed**: MISSING — no speed modifier exists. Build minimal system (likely cost reduction or progress multiplier)
- **dataSignalDiscovery**: PARTIAL — 30% signal gen chance at ProbeManager:461, apply modifier
- **rareSignalChance**: PARTIAL — rarity probabilities exist at ProbeManager:514-532, shift thresholds
- **artifactDiscovery**: PARTIAL — artifact rewards at ProbeManager:727, apply multiplier
- **explorationRewards**: PARTIAL — baseRewards object at ProbeManager:722-728, multiply all values
- **exoticYield**: PARTIAL — hardcoded exotic bonuses at ProbeManager:774-782, apply multiplier
- **probethiumRate**: PARTIAL — generation system at GameState:759-808, integrate into multiplier chain

### Bonus Feedback
- Show modified stats inline in detail panels when a bonus is active
- Format: "Range: 96 (+20%)" where the (+20%) portion is green text
- Only show bonus indicator when a bonus is actually active (no display for default/no-bonus shells)
- Show combined total only — don't break down by source (research vs shell)

### Edge Cases
- Shell swap takes effect immediately (consistent with cosmetic swap behavior)
- Default shell has no bonuses — bonuses are a reward for acquiring shells
- Clean up shell definitions: remove any bonuses that don't apply to the shell's entity type (e.g., no probeDurability on hub shells)

### Claude's Discretion
- Exact implementation of researchSpeed system (cost reduction vs progress multiplier)
- How to handle rounding when bonus produces fractional values
- Specific integration approach for each bonus (where exactly to hook into game loop)

</decisions>

<specifics>
## Specific Ideas

- Signal range mental model: "the whole sector has a set signal spawn rate, more or less evenly dispersed. Signal range lets a probe detect a wider area" — bigger net, same fish density
- "More frequent signals could potentially be a separate type of bonus" — noted but not in scope for this phase

</specifics>

<deferred>
## Deferred Ideas

- Signal frequency bonus (separate from signal range) — potential future bonus type
- Bonus comparison UI when swapping shells (show +/- difference) — Phase 4 or future

</deferred>

---

*Phase: 03-bonus-gameplay*
*Context gathered: 2026-01-28*
