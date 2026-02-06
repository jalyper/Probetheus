# Phase 9 Context: Discovery Reveal

## Design Direction

Transform the sector discovery modal from a bare stat dump into a **Sector Survey Report** — a mini discovery journal entry. Each discovery should feel like your probe just filed a field report that players are excited to pore over.

Key principles:
- Detailed without being overwhelming (clear sections, visual hierarchy)
- Collection elements that create "gotta find them all" drive
- Every sector type feels valuable (Standard = versatile, not consolation)
- Micromanagement-friendly (exact numbers, visual bars)

## Decisions

### 1. Modal Layout — "Sector Survey Report"

**Structure (top to bottom):**

1. **Header**: `SECTOR SURVEY: [Name]` with `[Type] Sector · [Distance] from HQ`
2. **Research Award**: `+1 Research Point Awarded` (existing, keep as-is)
3. **Exclusive Signal Section**: Signal name, flavor text, yield summary (color-coded)
4. **Resource Profile Section**: Profile type, signal richness bar, probethium potential bar
5. **Sector Bonuses**: Mineral/Data/Artifact multipliers (existing data, reformatted)
6. **Discovery Log**: Sectors explored counter + types found tracker (M/5 with lit/dim pips)
7. **Hazard Warning**: Probe destruction chance (if applicable, existing)
8. **Button**: "Continue" (not "OK")

**Exclusive Signal section per sector type:**
- Resource-Rich: `⛏️ Ore Vein` — orange text — "Dense mineral formations unique to Resource-Rich sectors" — "Yields: 2x Minerals"
- Data Haven: `📡 Data Cache` — cyan text — "Concentrated data streams unique to Data Haven sectors" — "Yields: 2x Data"
- Ancient: `🏛️ Relic` — gold text — "Ancient technology fragments unique to Ancient sectors" — "Yields: Guaranteed Rare+ Artifacts"
- Asteroid Field: `💎 Exotic Crystal` — rainbow/prismatic text — "Volatile crystalline deposits unique to Asteroid Fields" — "Yields: Exotic Minerals or Mixed Resources"
- Standard: See "Standard sector messaging" below

**Resource Profile section:**
- Show profile type name (e.g., "Mineral-Rich", "Balanced", "Probethium-Rich")
- Signal Richness: visual bar (5 segments) + multiplier number (e.g., `████░ 1.5x`)
- Probethium Potential: visual bar (5 segments) + label (None / Low / Moderate / High / Rich)
  - Probethium-rich profile = "Rich", balanced = "Low", others = "None"
  - This tells micromanagers exactly what the sector is worth for probethium

**Discovery Log section (collection element):**
- Line 1: `Sectors Explored: N` (running total)
- Line 2: `Types Found: M/5` with small colored pips for each sector type
  - Found types: lit up in sector's border color
  - Unfound types: dim/grey
  - Types: Standard, Resource-Rich, Data Haven, Ancient, Asteroid Field
- Compact: 2-3 lines total, doesn't dominate the modal
- Data source: count from `world.sectors` Map (explored + type tracking)

### 2. Bonus Signal Spawn (DISC-03)

- **Timing**: Signal spawns immediately on discovery (while modal is open)
- When player closes modal, the epic+ exclusive signal is already on the map waiting
- **Rarity distribution**: 80% Epic, 20% Legendary
- **Position**: Near sector center (same pattern as existing `spawnDiscoveryBonusSignals`)
- **Additive**: This is IN ADDITION to existing discovery bonus signals, not replacing them
- **Standard sectors**: No exclusive bonus signal (they have no exclusive type) — keep existing uncommon mixed signal
- **Implementation**: Add to existing `spawnDiscoveryBonusSignals()` method — push one more signal with exclusive type and epic/legendary rarity

### 3. Standard Sector Messaging (DISC-04)

Instead of "Balanced exploration opportunities" (which sounds like consolation), the exclusive signal section becomes:

```
── SIGNAL ENVIRONMENT ──
🌐 Open Frequency
"All signal types can be detected here —
 ideal for balanced resource gathering"
Yields: Standard rates across all types
```

Framing:
- "Open Frequency" sounds like a feature, not a limitation
- "Ideal for balanced resource gathering" positions as strategic choice
- Standard is where universal collectors shine (all types available)
- Discovery log pip still lights up — finding Standard still counts as collection progress

### 4. Existing Functionality Preserved

- Research point award stays
- Existing sector bonus multipliers stay (reformatted into cleaner layout)
- Existing discovery bonus signals continue spawning
- Probe destruction warning stays (for Asteroid Field)
- Modal open/close behavior stays (OK button → "Continue" button)

## Scope Boundaries

**In scope:**
- Extend `showSectorDiscovery()` with new sections
- Update modal HTML structure in index.html
- Add discovery log tracking (count explored sectors, track found types)
- Add guaranteed epic+ exclusive signal to discovery bonus spawning
- Playwright tests for all 4 DISC requirements

**Out of scope:**
- Persistent discovery journal (separate screen/UI) — that's a separate feature
- Achievement system for discovering all types — possible future phase
- Sector tooltips on the galaxy map — separate from modal
- Sound effects for discovery — separate concern

## Technical Notes

- `showSectorDiscovery()` already receives `sectorType` and `sectorName` — need to also pass `sector` object for resourceProfile access
- Discovery log data: iterate `world.sectors` Map to count explored + unique types
- Signal richness bar maps `spawnRateMultiplier`: 0.8=1bar, 1.0=2bars, 1.5=4bars, etc.
- Probethium potential maps from profile type: probethium-rich=5bars, balanced=1bar, others=0bars
- Exclusive signal color coding should match Phase 6 visual colors (orange/cyan/gold/prismatic)
