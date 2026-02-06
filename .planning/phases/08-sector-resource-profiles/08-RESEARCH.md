# Phase 8: Sector Resource Profiles - Research

**Researched:** 2026-02-05
**Domain:** Game economy, sector generation, mining systems
**Confidence:** HIGH

## Summary

Phase 8 introduces resource profiles that determine sector mining output and signal spawn rates. This is a **data extension** pattern building on existing sector infrastructure - sectors already have types (Standard, Resource-Rich, etc.) which determine signal types, and now gain **profiles** (mineral-rich, data-rich, artifact-rich, probethium-rich, balanced) which determine mining output and signal richness.

The architecture is in place: sectors are generated in `SectorManager.initializeSector()`, mining stations produce resources in `MiningManager.updateStation()`, and signal spawn rates use probe pulse timers in `ProbeManager.updateProbeRadar()`. The implementation adds a `resourceProfile` property to sectors and modifies mining logic to check this property.

This is a **fundamental economy rework**: mining stations currently always produce probethium (lines 49, 58, 67 in MiningManager.js), but will change to produce the sector's specialty resource. Probethium-rich sectors become rare discoveries, making probethium earned rather than passively accumulated.

**Primary recommendation:** Extend sector data with `resourceProfile` property, modify mining output logic to check profile, apply profile-based spawn rate multipliers to signal generation, and implement distance-weighted RNG for profile assignment during sector discovery.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Mining Station Rework (PROF-05, PROF-06):**
- Mining stations mine the sector's specialty resource, NOT probethium by default
- Mineral-rich sector → station produces minerals
- Data-rich sector → station produces data
- Artifact-rich sector → station produces artifacts
- Probethium-rich sector → station produces probethium (ONLY direct mining path)
- Balanced sector → TBD during planning (likely mixed resources or player choice)

**Probethium-Rich Sectors (PROF-06):**
- Rare occurrence: ~5-10% of sectors
- ONLY way to directly mine probethium
- Distance-weighted: more likely farther from start, but early lucky finds possible
- Represents a major discovery moment for players

**Sector Profile Types:**
- Five profiles: mineral-rich, data-rich, artifact-rich, probethium-rich, balanced
- Profiles are SEPARATE from sector types (Standard, Resource-Rich, etc.)
- A sector has BOTH type (determines signals) AND profile (determines mining/spawn rates)
- Example: Resource-Rich sector (Ore Vein signals) can be data-rich profile (mining produces data)

### Claude's Discretion

**Open Questions to Resolve During Planning:**
1. **Balanced sector mining output** - What does a mining station produce in balanced sectors? Options: nothing, reduced mixed resources, player chooses, or cycles through types
2. **Save migration strategy** - Existing mining stations produce probethium. Assign profiles to existing sectors retroactively? Grandfather old stations? Clear guidance needed
3. **Profile/type relationship** - Should profiles align with types (Resource-Rich = mineral-rich) or stay independent? Independence provides variety, alignment provides clarity
4. **Mining station UI updates** - Panel currently shows probethium output only. Needs to display current resource being mined (minerals/data/artifacts/probethium)

### Deferred Ideas (OUT OF SCOPE)

None - all discussed features fit within Phase 8 scope.

## Standard Stack

The existing infrastructure handles this feature via data extension:

### Core Infrastructure (Already Present)
| Component | Location | Purpose | Why It's Sufficient |
|-----------|----------|---------|---------------------|
| SectorManager.js | src/SectorManager.js:155-255 | Sector type generation with weighted RNG | Lines 211-222 show weighted random selection - extend for profiles |
| MiningManager.js | src/MiningManager.js:43-72 | Station output configuration | Lines 49, 58, 67 hardcode probethium output - modify to check sector profile |
| ProbeManager.js | src/ProbeManager.js:457-461 | Signal spawn via pulse timer (3s intervals) | Line 460 triggers spawning - apply profile multipliers here |
| GameState.js | src/GameState.js:532-539 | World/sector storage | Sectors stored in Map (line 533) - profiles persist automatically |
| SaveManager.js | src/SaveManager.js:239-274 | Sector serialization | Lines 249-266 serialize all sector properties - profiles save with no changes |

### Pattern Reference
**Existing extension pattern (Phase 5 - Signal Types):**
- Added `exclusiveSignalType` field to sector types (SectorManager.js:176, 186, 196, 206)
- ProbeManager.js:601-616 checks field, falls back to standard logic if undefined
- No breaking changes - old sectors work without field

**This phase follows identical pattern:**
- Add `resourceProfile` field to sectors (generated in `initializeSector()`)
- MiningManager checks `sector.resourceProfile`, falls back to probethium if undefined
- ProbeManager applies spawn multipliers based on profile
- Backward compatible via defensive checks

### No New Libraries Needed
All functionality exists in vanilla JavaScript using Math.random() for weighted RNG and existing manager classes for logic integration.

## Architecture Patterns

### Recommended Data Structure

**Sector object extension:**
```javascript
// In SectorManager.initializeSector() around line 228
const sector = {
    x: x,
    y: y,
    explored: discovered,
    type: selectedType,           // Existing: determines signals
    name: name,
    resourceProfile: {             // NEW: determines mining/spawn rates
        type: 'mineral-rich',      // One of: mineral-rich, data-rich, artifact-rich, probethium-rich, balanced
        spawnRateMultiplier: 1.5,  // Signal spawn rate modifier (0.5-2.0)
        assignedDistance: 12.3     // Distance from origin when assigned (for debugging)
    },
    stars: discovered ? this.generateSectorStars(x, y) : [],
    outposts: [],
    facilities: [],
    hubs: []
};
```

### Pattern 1: Distance-Weighted Profile Assignment

**What:** RNG that favors better profiles farther from origin, with low-probability early finds
**When to use:** During sector discovery in `SectorManager.initializeSector()` or `discoverSector()`
**Example:**
```javascript
// Calculate sector distance from origin (0,0)
const distance = Math.sqrt(x * x + y * y);

// Base weights for close sectors (<5 distance)
// [balanced, mineral, data, artifact, probethium]
let weights = [60, 20, 10, 8, 2]; // 2% probethium chance early

// Adjust weights based on distance (farther = better profiles)
if (distance > 10) {
    weights = [30, 25, 20, 15, 10]; // 10% probethium chance far out
} else if (distance > 5) {
    weights = [45, 25, 15, 10, 5];  // 5% probethium chance mid-range
}

// Weighted random selection
const totalWeight = weights.reduce((sum, w) => sum + w, 0);
let random = Math.random() * totalWeight;

const profiles = ['balanced', 'mineral-rich', 'data-rich', 'artifact-rich', 'probethium-rich'];
let selectedProfile = profiles[0];

for (let i = 0; i < profiles.length; i++) {
    random -= weights[i];
    if (random <= 0) {
        selectedProfile = profiles[i];
        break;
    }
}
```

**Why this works:**
- Early sectors (distance < 5): 60% balanced, 2% probethium (rare lucky find satisfies PROF-04)
- Mid sectors (5-10): 45% balanced, 5% probethium (moderate chance)
- Far sectors (10+): 30% balanced, 10% probethium (rewarding exploration)
- Linear distance calculation prevents clustering around cardinal directions

### Pattern 2: Profile-Based Mining Output

**What:** Mining stations check sector profile to determine output resource
**When to use:** In `MiningManager.updateStation()` where production occurs (line 275)
**Example:**
```javascript
// In updateStation() around line 275 where production happens
updateStation(station, deltaTime, currentTime) {
    const stationType = this.getStationTypes()[station.type];
    if (!stationType) return;

    // Determine sector profile
    const world = this.gameState.getWorld();
    const sectorX = Math.floor(station.position.x / world.standardSectorWidth);
    const sectorY = Math.floor(station.position.y / world.standardSectorHeight);
    const key = `${sectorX},${sectorY}`;
    const sector = world.sectors.get(key);

    // Backward compatibility: default to probethium if no profile
    const profile = sector?.resourceProfile?.type || 'probethium-rich';

    // Map profile to output resource
    let outputResource = 'probethium'; // Default
    switch (profile) {
        case 'mineral-rich':
            outputResource = 'minerals';
            break;
        case 'data-rich':
            outputResource = 'data';
            break;
        case 'artifact-rich':
            outputResource = 'artifacts';
            break;
        case 'probethium-rich':
            outputResource = 'probethium';
            break;
        case 'balanced':
            // Option 1: Cycle through resources
            // Option 2: Reduced mixed output
            // Option 3: Nothing (requires probethium-rich to mine)
            outputResource = 'mixed'; // Planner decides implementation
            break;
    }

    // Continuous production logic (existing lines 276-292)
    const productionPerMs = (stationType.output * station.level * station.efficiency) / stationType.operationDuration;
    const continuousProduction = productionPerMs * deltaTime;

    // Add to appropriate resource
    if (outputResource === 'probethium') {
        this.gameState.mining.totalProbetheum += continuousProduction;
        this.gameState.probethium.current += continuousProduction;
    } else if (outputResource === 'mixed') {
        // Balanced sector implementation TBD
    } else {
        const resources = this.gameState.getResources();
        resources[outputResource] += continuousProduction;
        this.gameState.updateResources(resources, this.eventBus);
    }
}
```

### Pattern 3: Profile-Based Spawn Rate Multipliers

**What:** Apply signal spawn frequency modifier based on sector profile
**When to use:** In `ProbeManager.updateProbeRadar()` where signals are created (line 460)
**Example:**
```javascript
// In updateProbeRadar() around line 460 where pulseTimer triggers spawn
if (probe.pulseTimer >= 3000) {
    probe.pulseTimer = 0;

    // Determine current sector
    const world = this.gameState.getWorld();
    const sectorX = Math.floor(probe.current.x / world.standardSectorWidth);
    const sectorY = Math.floor(probe.current.y / world.standardSectorHeight);
    const key = `${sectorX},${sectorY}`;
    const sector = world.sectors.get(key);

    // Get spawn rate multiplier from profile (default 1.0)
    const spawnMultiplier = sector?.resourceProfile?.spawnRateMultiplier || 1.0;

    // Base spawn chance (current implementation seems implicit)
    const baseSpawnChance = 0.5; // Example: 50% chance per pulse
    const adjustedChance = baseSpawnChance * spawnMultiplier;

    if (Math.random() < adjustedChance) {
        // Existing signal creation code (lines 465-535)
        this.createSignal(probe, sector);
    }
}
```

**Multiplier values by profile:**
- `balanced`: 1.0 (baseline)
- `mineral-rich`: 1.5 (50% more signals, mineral-weighted)
- `data-rich`: 1.5 (50% more signals, data-weighted)
- `artifact-rich`: 1.5 (50% more signals, artifact-weighted)
- `probethium-rich`: 0.8 (fewer signals, but probethium mining compensates)

### Anti-Patterns to Avoid

- **Profile/type coupling:** Don't assume Resource-Rich sectors are mineral-rich profiles. Keep them independent for variety.
- **Retroactive profile assignment on load:** Don't assign profiles to existing sectors from saves - breaks reproducibility. Use defensive fallback (default to balanced or probethium-rich).
- **Signal type confusion:** Profiles affect spawn RATES, not signal TYPES. Signal types determined by sector type (exclusiveSignalType), profiles only adjust frequency.
- **Hardcoded distance thresholds:** Use continuous distance scaling, not step functions, to avoid sudden behavior changes at boundaries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weighted random selection | Custom loop with cumulative probability | Existing pattern from SectorManager.js:211-222 | Already proven in production, handles edge cases |
| Distance calculation | Manhattan distance, custom formulas | `Math.sqrt(x*x + y*y)` Euclidean distance | Standard, predictable, avoids diagonal bias |
| Save migration | Complex versioning system | Defensive property checks with fallbacks (`sector?.resourceProfile || defaultProfile`) | SaveManager.js already uses this pattern (lines 512-546 for equipment migration) |
| Sector lookup | Linear array search | Map with string key `${x},${y}` | O(1) lookup, already used (GameState.js:533) |

**Key insight:** The codebase uses **extension pattern with defensive fallbacks** throughout. Adding `resourceProfile` to sectors follows the same pattern as `exclusiveSignalType` (Phase 5) and `equipment` array migration (Phase 4). Don't invent new patterns.

## Common Pitfalls

### Pitfall 1: Breaking Existing Saves with Required Properties
**What goes wrong:** Code assumes all sectors have `resourceProfile`, crashes on load with old saves
**Why it happens:** New property added without backward compatibility check
**How to avoid:** Always use optional chaining and fallback values
**Warning signs:**
- `Cannot read property 'type' of undefined` errors on load
- Mining stations stop working after save/load
- Tests pass but production saves fail

**Prevention pattern:**
```javascript
// BAD - assumes property exists
const profile = sector.resourceProfile.type;

// GOOD - defensive check with fallback
const profile = sector?.resourceProfile?.type || 'balanced';
```

### Pitfall 2: Forgetting Probethium Accumulation System
**What goes wrong:** Changing mining to produce resources breaks probethium scoring
**Why it happens:** Probethium serves dual purpose: currency AND score (GameState.js:706-812)
**How to avoid:** Probethium-rich sectors still need to accumulate `probethium.current` for scoring, not just mining.totalProbetheum
**Warning signs:**
- Probethium score stops increasing
- End-game metric broken
- `calculateProbethium()` no longer called

**Prevention pattern:**
```javascript
// Mining production (MiningManager.js) updates BOTH:
this.gameState.mining.totalProbetheum += production; // Display value
this.gameState.probethium.current += production;     // Score tracking

// Ensure GameState.calculateProbethium() still runs (line 759)
```

### Pitfall 3: Profile/Type Naming Confusion
**What goes wrong:** Developers confuse "Resource-Rich sector" (type) with "mineral-rich sector" (profile)
**Why it happens:** Similar terminology for different concepts
**How to avoid:** Clear naming convention and documentation
**Warning signs:**
- Code checks `sector.type.name === 'Resource-Rich'` when it should check `sector.resourceProfile.type === 'mineral-rich'`
- Tests fail intermittently due to randomness

**Prevention pattern:**
```javascript
// CLEAR: sector.type determines signal types
if (sector.type.exclusiveSignalType === 'ore_vein') { /* spawn Ore Vein signal */ }

// CLEAR: sector.resourceProfile determines mining/spawn rates
if (sector.resourceProfile.type === 'mineral-rich') { /* produce minerals */ }

// BAD: mixing concepts
if (sector.type.name === 'Resource-Rich') { /* produce minerals */ } // Wrong!
```

### Pitfall 4: Shuttle Logic Breaking with New Resource Types
**What goes wrong:** Shuttles hardcoded to deliver minerals/data/artifacts, can't handle probethium as station requirement
**Why it happens:** MiningManager shuttle logic (lines 514-589) checks specific resource types
**How to avoid:** Probethium-rich sectors should NOT require probethium as station input (circular dependency)
**Warning signs:**
- Shuttles get stuck in "waiting" state at probethium mining stations
- Station never starts mining despite having resources

**Prevention pattern:**
```javascript
// Station requirements (lines 48, 57, 66) stay as minerals/data/artifacts
// Only OUTPUT changes based on profile
// Probethium is NEVER a station input requirement
```

## Code Examples

Verified patterns from codebase analysis:

### Distance Calculation (Sector Discovery)
```javascript
// Pattern: Calculate distance from origin for weighted RNG
// Source: Derived from existing sector coordinate system (SectorManager.js:83-85)
discoverSector(x, y) {
    const world = this.gameState.getWorld();
    const key = `${x},${y}`;

    if (!world.sectors.has(key)) {
        // Calculate distance from origin (0,0) for profile weighting
        const distance = Math.sqrt(x * x + y * y);
        this.initializeSector(x, y, true, distance);
    }
    // ... rest of discovery logic
}
```

### Profile Assignment (Weighted RNG)
```javascript
// Pattern: Weighted random selection with distance scaling
// Source: Adapted from SectorManager.js:211-222 (sector type selection)
assignResourceProfile(x, y, distance) {
    // Distance-based weight adjustment
    let weights;
    if (distance < 5) {
        // Close to origin: mostly balanced, rare probethium
        weights = [60, 20, 10, 8, 2]; // [balanced, mineral, data, artifact, probethium]
    } else if (distance < 10) {
        // Mid-range: more variety
        weights = [45, 25, 15, 10, 5];
    } else {
        // Far from origin: richer profiles
        weights = [30, 25, 20, 15, 10];
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    const profiles = [
        { type: 'balanced', spawnRateMultiplier: 1.0 },
        { type: 'mineral-rich', spawnRateMultiplier: 1.5 },
        { type: 'data-rich', spawnRateMultiplier: 1.5 },
        { type: 'artifact-rich', spawnRateMultiplier: 1.5 },
        { type: 'probethium-rich', spawnRateMultiplier: 0.8 }
    ];

    for (let i = 0; i < profiles.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return {
                ...profiles[i],
                assignedDistance: distance
            };
        }
    }

    return profiles[0]; // Fallback to balanced
}
```

### Mining Output (Resource Production)
```javascript
// Pattern: Sector lookup and output resource mapping
// Source: MiningManager.js:673-688 (getStationSectorBonus pattern)
updateStation(station, deltaTime, currentTime) {
    // ... existing validation code ...

    // Determine sector and profile
    const world = this.gameState.getWorld();
    const sectorX = Math.floor(station.position.x / world.standardSectorWidth);
    const sectorY = Math.floor(station.position.y / world.standardSectorHeight);
    const sector = world.sectors.get(`${sectorX},${sectorY}`);

    // Backward compatible: fallback to probethium for old saves
    const profileType = sector?.resourceProfile?.type || 'probethium-rich';

    // Map profile to output resource
    const resourceMap = {
        'mineral-rich': 'minerals',
        'data-rich': 'data',
        'artifact-rich': 'artifacts',
        'probethium-rich': 'probethium',
        'balanced': 'mixed' // Implementation TBD by planner
    };

    const outputResource = resourceMap[profileType] || 'probethium';

    // Production calculation (existing logic from lines 273-292)
    if (station.active) {
        const stationType = this.getStationTypes()[station.type];
        const productionPerMs = (stationType.output * station.level * station.efficiency) / stationType.operationDuration;
        const continuousProduction = productionPerMs * deltaTime;

        // Add to appropriate resource pool
        if (outputResource === 'probethium') {
            station.totalProduced += continuousProduction;
            this.gameState.mining.totalProbetheum += continuousProduction;
            this.gameState.probethium.current += continuousProduction;
        } else if (outputResource === 'mixed') {
            // Balanced sector: distribute across all three (example implementation)
            const perResource = continuousProduction / 3;
            const resources = this.gameState.getResources();
            resources.minerals += perResource;
            resources.data += perResource;
            resources.artifacts += perResource;
            this.gameState.updateResources(resources, this.eventBus);
        } else {
            const resources = this.gameState.getResources();
            resources[outputResource] += continuousProduction;
            this.gameState.updateResources(resources, this.eventBus);
        }
    }

    // ... rest of station update logic ...
}
```

### Spawn Rate Multiplier (Signal Generation)
```javascript
// Pattern: Profile-based spawn frequency adjustment
// Source: ProbeManager.js:457-461 (pulse timer spawn trigger)
updateProbeRadar(probe, deltaTime) {
    if (!probe.active || probe.status === 'returning') {
        return;
    }

    probe.pulseTimer += deltaTime;

    // Generate radar pulse every 3 seconds (existing pattern)
    if (probe.pulseTimer >= 3000) {
        probe.pulseTimer = 0;

        // Determine current sector
        const world = this.gameState.getWorld();
        const sectorX = Math.floor(probe.current.x / world.standardSectorWidth);
        const sectorY = Math.floor(probe.current.y / world.standardSectorHeight);
        const sector = world.sectors.get(`${sectorX},${sectorY}`);

        // Get spawn rate multiplier (default 1.0 for backward compatibility)
        const spawnMultiplier = sector?.resourceProfile?.spawnRateMultiplier || 1.0;

        // Base spawn chance per pulse (example: 50%)
        const baseSpawnChance = 0.5;
        const adjustedChance = baseSpawnChance * spawnMultiplier;

        // Random check with adjusted probability
        if (Math.random() < adjustedChance) {
            // Existing signal creation logic (lines 465-535)
            // ... create signal ...
        }

        // ... existing radar pulse animation code ...
    }
}
```

## State of the Art

| Current Approach | New Approach | Impact |
|------------------|--------------|--------|
| Mining stations always produce probethium (MiningManager.js:49, 58, 67) | Mining stations produce sector's specialty resource | Fundamental economy change - probethium becomes rare/earned |
| All sectors have same signal spawn rates (implicit baseline) | Sectors have spawn rate multipliers (0.8-1.5x) based on profile | Richer sectors feel more rewarding to explore |
| Sector type determines only signal types (exclusiveSignalType) | Sector profile determines mining output + spawn rates | Two-dimensional sector variety (type + profile) |
| Probethium accumulates passively via mining stations | Probethium only accumulates from rare probethium-rich sectors | Makes probethium discovery a major game moment |
| Save migration via fallback values (SaveManager.js:512-546) | Continue using fallback pattern for resourceProfile | No breaking changes to existing saves |

**No deprecated patterns:** All existing infrastructure remains valid. This is purely additive via data extension.

## Open Questions

Questions that require design decisions during planning:

### 1. Balanced Sector Mining Output
**What we know:** Mining stations in balanced sectors need an output behavior
**What's unclear:** Which implementation best serves game balance?
**Options:**
- **A) Nothing:** Station requires probethium-rich sector to function (forces exploration)
- **B) Reduced mixed:** Produces minerals/data/artifacts at 0.3x rate each (total 0.9x effective rate)
- **C) Cycling:** Rotates output resource every N seconds (player can time shuttle deliveries)
- **D) Player choice:** UI button to select output resource (max flexibility, more complex)

**Recommendation:** Option B (reduced mixed) - simple implementation, avoids dead sectors, maintains probethium-rich value. Total output slightly lower than specialized sectors incentivizes finding better profiles.

### 2. Save Migration for Existing Mining Stations
**What we know:** Current saves have mining stations in sectors without profiles
**What's unclear:** How to handle on load?
**Options:**
- **A) Assign profiles retroactively:** Run profile generation on sector discovery date (breaks reproducibility)
- **B) Default to probethium-rich:** All old stations continue producing probethium (grandfather clause)
- **C) Default to balanced:** Old stations produce mixed resources (forces adaptation)
- **D) Assign profiles on first load:** Use current distance for weighting (one-time migration)

**Recommendation:** Option B (default to probethium-rich) - least disruptive, maintains player progress, uses fallback pattern already in codebase (`sector?.resourceProfile?.type || 'probethium-rich'`). Document as intentional backward compatibility.

### 3. Profile/Type Independence
**What we know:** Profiles and types serve different purposes (mining vs signals)
**What's unclear:** Should they align or stay independent?
**Tradeoffs:**
- **Independent (current decision):** Resource-Rich sector can be data-rich profile. Max variety, can be confusing.
- **Aligned:** Resource-Rich sector always mineral-rich profile. Clear expectations, less variety, limits emergent gameplay.

**Recommendation:** Stay independent (as specified in CONTEXT.md) but add UI clarity. Sector discovery modal should show BOTH type (for signals) and profile (for mining) explicitly. Example: "Ancient Sector (Artifact-Rich Profile)".

### 4. UI Updates for Mining Station Panel
**What we know:** Current panel shows only probethium output
**What's unclear:** How detailed should resource display be?
**Options:**
- **A) Simple icon:** Change ⛏️ to 💎/💾/🏺/⚛️ based on output resource
- **B) Text display:** "Mining: Minerals" / "Mining: Data" / "Mining: Artifacts" / "Mining: Probethium"
- **C) Resource counter:** Show accumulated output with icon (like probethium counter but per-resource)
- **D) No change:** Players infer from sector profile in discovery modal

**Recommendation:** Option B (text display) - clear, simple, uses existing UI patterns. Add one line to station panel: "Output: [Resource Name]" where resource name reflects current production. Minimal code change to DetailsPanel.js or UIManager.js.

## Sources

### Primary (HIGH confidence)
- `src/SectorManager.js` lines 155-255 - Sector generation with weighted RNG, read directly from codebase
- `src/MiningManager.js` lines 43-72, 236-332 - Mining station types and update logic, read directly
- `src/ProbeManager.js` lines 457-461, 591-656 - Signal spawning via pulse timer and signal type determination, read directly
- `src/GameState.js` lines 532-539, 706-812 - World/sector storage and probethium system, read directly
- `src/SaveManager.js` lines 239-274, 423-546 - Sector serialization and restoration patterns, read directly

### Secondary (MEDIUM confidence)
- Phase 5 implementation (signal type system) - Verified `exclusiveSignalType` extension pattern as architecture reference
- Equipment system migration (Phase 4) - Verified defensive fallback pattern in SaveManager for new properties

### Tertiary (LOW confidence)
None - all findings based on direct codebase analysis.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All infrastructure exists, no new libraries needed
- Architecture: HIGH - Extension pattern proven in Phase 5, sector generation pattern clear
- Pitfalls: HIGH - Identified from codebase analysis (probethium dual-purpose, shuttle logic, save compatibility)
- Open questions: MEDIUM - Design decisions require gameplay balance testing

**Research date:** 2026-02-05
**Valid until:** 30 days (stable systems, unlikely to change)

**Critical dependencies:**
- SectorManager.initializeSector() - Profile assignment during sector creation
- MiningManager.updateStation() - Output resource mapping based on profile
- ProbeManager.updateProbeRadar() - Spawn rate multipliers during signal generation
- SaveManager serialization - Automatic persistence of profile data (no changes needed)
