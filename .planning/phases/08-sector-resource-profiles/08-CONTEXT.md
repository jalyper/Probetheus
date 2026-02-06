# Phase 8 Context: Sector Resource Profiles

**Created:** 2026-02-05
**Source:** User discussion session

## Design Decisions

### Mining Station Rework (PROF-05, PROF-06)

**Decision:** Mining stations mine the sector's specialty resource, not probethium by default.

**Current behavior:** Mining stations only mine probethium regardless of sector type.

**New behavior:** Mining stations produce whatever the sector is rich in:
- Mineral-rich sector → mining station produces minerals
- Data-rich sector → mining station produces data
- Artifact-rich sector → mining station produces artifacts
- Probethium-rich sector → mining station produces probethium (ONLY way to directly mine probethium)
- Balanced sector → TBD during planning (likely reduced yield of mixed resources, or player choice)

**Rationale:** Makes probethium feel earned rather than passively mined. Finding a probethium-rich sector becomes a major discovery. Gives meaning to sector specialization beyond just signal types.

**Impact:** This is a fundamental economy change. MiningManager.js needs rework to check sector profile before determining output resource.

### Probethium-Rich Sectors (PROF-06)

**Decision:** Probethium-rich sectors are rare and the ONLY way to directly mine probethium.

**Key points:**
- Rarity: ~5-10% of sectors (exact tuning during planning)
- Finding one is a significant game moment
- Distance-weighted: more likely farther from start, but early lucky finds possible (PROF-04)
- Players who haven't found one yet rely on synthesis (Phase 8.5) as alternative

### Sector Profile Types

**Decision:** Sectors are categorized by specialty resource on discovery.

**Types identified:**
- Mineral-rich
- Data-rich
- Artifact-rich
- Probethium-rich (rare)
- Balanced (no specialty — default/common)

**Note:** These are resource profiles, separate from sector types (Resource-Rich, Data Haven, Ancient, Asteroid Field, Standard) which determine exclusive signal types. A sector has BOTH a type (determines signals) and a profile (determines mining output and signal richness).

### Exotic Materials as Probethium Currency (Phase 8.5)

**Decision:** Exotic materials can be converted to probethium via hub synthesis.

**This is Phase 8.5 scope, captured here for context:**
- "Synthesize Probethium" button on hub menu
- Research-gated (must unlock via research tree)
- Hub plays synthesis animation during conversion
- Gives exotic materials a clear purpose in the economy
- Alternative path to probethium for players who haven't found probethium-rich sectors

## Open Questions (for researcher/planner)

1. **Balanced sector mining output** — What does a mining station in a balanced sector produce? Reduced mixed resources? Player chooses? Nothing?
2. **Existing save migration** — Current mining stations all produce probethium. How do we handle saves where stations exist in non-probethium sectors?
3. **Sector profile vs sector type relationship** — Can a Resource-Rich sector (Ore Vein signals) be data-rich (mining produces data)? Or should profile align with type?
4. **Mining station UI** — Does the mining station panel need to show what it's mining? Currently it just shows probethium output.

## Deferred Ideas

None — all ideas from discussion fit within Phase 8 and 8.5 scope.

---
*Context gathered: 2026-02-05*
