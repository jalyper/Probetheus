# Architecture Patterns: Sector-Specific Signals

**Domain:** Space exploration game with sector-based signal generation
**Researched:** 2026-02-02
**Confidence:** HIGH

## Executive Summary

Sector-specific signal types integrate into the existing signal generation pipeline through **extension, not modification**. The current architecture already has 95% of the necessary infrastructure in place:

- **Signal type determination** (ProbeManager.js:577-619) already exists with sector-aware logic
- **Signal type rendering** (GameController.js:3167-3218) already has color theming by signalType
- **Sector type definitions** (SectorManager.js:159-205) already exist with bonuses
- **Discovery bonus system** (SectorManager.js:510-582) already spawns typed signals

**Key insight:** This milestone extends existing patterns rather than introducing new architectural components. The signal pipeline is **type-aware but sector-agnostic**. Adding sector-exclusive types requires **data additions** (new sector types, new signal type definitions) and **conditional logic** (spawn rules, visual variants), not new systems.

## Current Signal Pipeline

### 1. Signal Generation (ProbeManager.js)

**Method:** `updateProbePulses(probe, deltaTime)` → Lines 431-532

**Flow:**
```
Every 3 seconds:
1. Check probe location → getCurrentSector(probe) → Line 492
2. Determine signal type → determineSignalType(sector) → Line 500
3. Determine rarity → determineSignalRarity(isInAsteroidField, probe) → Line 507
4. Create signal entity → Lines 503-511
5. Push to gameState.entities.signals → Line 513
```

**Existing sector-aware logic (Lines 577-619):**
```javascript
determineSignalType(sector) {
    if (!sector || !sector.type) return 'mixed';

    const sectorName = sector.type.name;
    const random = Math.random();

    switch (sectorName) {
        case 'Resource-Rich': // 60% mineral, 25% mixed
        case 'Data Haven':     // 60% data, 25% mixed
        case 'Ancient':        // 60% artifact, 25% mixed
        case 'Asteroid Field': // 40% mineral, 30% mixed, chaotic
        case 'Standard':       // 70% mixed
    }
}
```

**Current signal types:**
- `mineral` (orange theme)
- `data` (green/cyan theme)
- `artifact` (purple theme)
- `mixed` (standard rarity colors)
- `dark_market` (special case)

### 2. Signal Storage (GameState.js)

**Data structure:**
```javascript
gameState.entities.signals = [
    {
        x: number,
        y: number,
        radius: number,
        rarity: 'common'|'uncommon'|'rare'|'epic'|'legendary',
        signalType: 'mineral'|'data'|'artifact'|'mixed'|'dark_market',
        duration: number,
        createdAt: timestamp,
        isDiscoveryBonus: boolean
    }
]
```

### 3. Signal Rendering (GameController.js)

**Method:** `renderSignals()` → Lines 3130-3280

**Existing type-based rendering (Lines 3167-3218):**
```javascript
if (signal.signalType) {
    switch (signal.signalType) {
        case 'mineral':
            // Orange/amber gradient by rarity
            const mineralColors = {
                common: '#ff8c00',
                uncommon: '#ffa500',
                rare: '#ff6b00',
                epic: '#ff4500',
                legendary: '#ff2500'
            };
            break;

        case 'data':
            // Green/cyan gradient

        case 'artifact':
            // Purple gradient

        case 'dark_market':
            // Dark violet with enhanced pulsing
    }
}
```

**Visual features:**
- Base radius: 8-12px
- Pulsing effect via `Math.sin(age * 0.005)`
- Radial gradient glow (2x radius)
- Rarity ring for uncommon+
- Discovery bonus sparkle effects (Lines 3263-3278)
- Age-based fade starting at 50% lifetime

### 4. Signal Collection (GameController.js)

**Manual collection:** `collectSignal(signal)` → Lines 1182-1197
```
1. Emit events for tutorial
2. Remove from entities.signals
3. Call showExplorationModal(signal)
```

**Auto-collection:** `ProbeManager.autoCollectSignals(probe)` → Lines 666-883
```
1. Check equipment types
2. Find signals in range (80px * signalRange bonus)
3. Check rarity limits per type
4. Calculate rewards
5. Store in probe.cargo
6. Remove signal
7. Emit resource:indicator event
```

**Both paths lead to:** `showExplorationModal(signal)` → Line 1814

### 5. Exploration Modal & Rewards (GameController.js)

**Method:** `showExplorationModal(signal)` → Lines 1814-1909

**Flow:**
```
1. generatePlanet(signal) → creates planet data with signal.rarity
2. showExplorationScreen(planet, signal) → displays UI
3. Player chooses action → explore(mode)
```

**Method:** `explore(mode)` → Lines 2080-2275

**Reward calculation (Lines 2098-2169):**
```javascript
// Base rewards by rarity
const baseRewards = {
    common: { minerals: 5, data: 2, artifacts: 1 },
    uncommon: { minerals: 10, data: 5, artifacts: 2 },
    rare: { minerals: 20, data: 10, artifacts: 5 },
    epic: { minerals: 40, data: 20, artifacts: 10 },
    legendary: { minerals: 100, data: 50, artifacts: 25 }
};

// Apply planet type bonuses (Molten +50% minerals, Ocean +50% data, etc.)

// Apply signal type bonuses (Lines 2145-2169)
if (signal.signalType) {
    switch (signal.signalType) {
        case 'mineral': rewards.minerals *= 1.5; break;
        case 'data': rewards.data *= 1.5; break;
        case 'artifact': rewards.artifacts *= 1.5; break;
    }
}
```

### 6. Discovery Bonus System (SectorManager.js)

**Method:** `spawnDiscoveryBonusSignals(sectorX, sectorY, sectorType)` → Lines 510-582

**Existing sector-typed signals:**
```javascript
switch (sectorType.name) {
    case 'Standard':
        // 1 guaranteed uncommon mixed
        bonusSignals.push({ rarity: 'uncommon', type: 'mixed' });
        break;

    case 'Resource-Rich':
        // 1 rare mineral + 1 uncommon mixed
        bonusSignals.push({ rarity: 'rare', type: 'mineral' });
        bonusSignals.push({ rarity: 'uncommon', type: 'mixed' });
        break;

    case 'Data Haven':
        // 1 rare data + 1 uncommon data

    case 'Ancient':
        // 1 epic artifact + 1 rare mixed

    case 'Asteroid Field':
        // 1 legendary mixed + 1 epic mixed
}
```

**Signal spawning (Lines 551-571):**
```javascript
const signal = {
    x: signalX,
    y: signalY,
    radius: 8 + Math.random() * 4,
    rarity: signalInfo.rarity,
    signalType: signalInfo.type,  // ← Type assignment
    duration: 4000 + Math.random() * 2000,
    createdAt: Date.now(),
    isDiscoveryBonus: true
};

this.gameState.entities.signals.push(signal);
```

## Integration Points for Sector-Exclusive Signals

### NEW: Sector Types with Exclusive Signal Types

**Location:** SectorManager.js:159-205 (initializeSector)

**Current sector types:**
- Standard (70% mixed, 10% each specialized)
- Resource-Rich (60% mineral focused)
- Data Haven (60% data focused)
- Ancient (60% artifact focused)
- Asteroid Field (40% mineral, chaotic mix)

**Integration approach:**
```javascript
// Add new sector type definitions
const sectorTypes = [
    // ... existing types ...

    {
        name: 'Nebula',
        color: 'rgba(150, 100, 255, 0.3)',
        borderColor: '#96f',
        mineralBonus: 0.5,
        dataBonus: 2.0,
        artifactBonus: 1.5,
        probeDestructionChance: 0,
        exclusiveSignalType: 'nebula_data'  // NEW
    },

    {
        name: 'Derelict',
        color: 'rgba(120, 120, 120, 0.3)',
        borderColor: '#888',
        mineralBonus: 1.0,
        dataBonus: 1.5,
        artifactBonus: 3.0,
        probeDestructionChance: 0.05,
        exclusiveSignalType: 'derelict_artifact'  // NEW
    }
];
```

**No breaking changes:** Existing sectors without `exclusiveSignalType` continue using current logic.

### MODIFIED: Signal Type Determination

**Location:** ProbeManager.js:577-619 (determineSignalType)

**Extension pattern:**
```javascript
determineSignalType(sector) {
    if (!sector || !sector.type) return 'mixed';

    // NEW: Check for exclusive signal type first
    if (sector.type.exclusiveSignalType) {
        const random = Math.random();
        // 30% chance for exclusive type
        if (random < 0.3) {
            return sector.type.exclusiveSignalType;
        }
        // Fall through to existing distribution
    }

    // EXISTING: Current sector-based distribution
    const sectorName = sector.type.name;
    switch (sectorName) {
        // ... existing cases ...
    }
}
```

**No breaking changes:** Existing sector types continue using current switch statement.

### NEW: Signal Type Visual Definitions

**Location:** GameController.js:3167-3218 (renderSignals)

**Extension pattern:**
```javascript
// Existing type theming
if (signal.signalType) {
    switch (signal.signalType) {
        case 'mineral':
        case 'data':
        case 'artifact':
        case 'dark_market':
            // EXISTING cases
            break;

        // NEW: Exclusive signal type visuals
        case 'nebula_data':
            // Purple-blue gradient, enhanced glow
            const nebulaColors = {
                common: '#8888ff',
                uncommon: '#9999ff',
                rare: '#aaaaff',
                epic: '#bbbbff',
                legendary: '#ccccff'
            };
            color = nebulaColors[signal.rarity] || '#8888ff';

            // Enhanced glow rendering (Lines 3221-3243)
            // Increase gradient radius for nebula effect
            break;

        case 'derelict_artifact':
            // Gray-rust gradient, flickering effect
            // Use age calculation for flicker timing
            break;
    }
}
```

**No breaking changes:** Default case continues using standard rarity colors.

### MODIFIED: Reward Calculation

**Location:** GameController.js:2145-2169 (explore method)

**Extension pattern:**
```javascript
// Apply signal type bonuses
if (signal.signalType) {
    switch (signal.signalType) {
        // EXISTING cases
        case 'mineral':
        case 'data':
        case 'artifact':
            // Existing 50% bonus logic
            break;

        // NEW: Exclusive type bonuses
        case 'nebula_data':
            // 75% data bonus + small artifact bonus
            rewards = {
                ...rewards,
                data: Math.floor(rewards.data * 1.75),
                artifacts: Math.floor(rewards.artifacts * 1.25)
            };
            break;

        case 'derelict_artifact':
            // 100% artifact bonus + small data bonus
            rewards = {
                ...rewards,
                artifacts: Math.floor(rewards.artifacts * 2.0),
                data: Math.floor(rewards.data * 1.2)
            };
            break;
    }
}
```

**No breaking changes:** Existing types unaffected.

### MODIFIED: Discovery Bonus Spawning

**Location:** SectorManager.js:510-582 (spawnDiscoveryBonusSignals)

**Extension pattern:**
```javascript
spawnDiscoveryBonusSignals(sectorX, sectorY, sectorType) {
    let bonusSignals = [];

    // NEW: Check for exclusive signal type first
    if (sectorType.exclusiveSignalType) {
        switch (sectorType.name) {
            case 'Nebula':
                // 1 epic nebula_data + 1 rare data
                bonusSignals.push({
                    rarity: 'epic',
                    type: sectorType.exclusiveSignalType
                });
                bonusSignals.push({ rarity: 'rare', type: 'data' });
                break;

            case 'Derelict':
                // 1 legendary derelict_artifact + 1 epic artifact
                bonusSignals.push({
                    rarity: 'legendary',
                    type: sectorType.exclusiveSignalType
                });
                bonusSignals.push({ rarity: 'epic', type: 'artifact' });
                break;
        }
    } else {
        // EXISTING: Current sector types
        switch (sectorType.name) {
            // ... existing cases ...
        }
    }

    // EXISTING: Signal spawning logic (Lines 551-571)
}
```

**No breaking changes:** Existing sector types use existing switch.

### NEW: Discovery Reveal Moment

**Location:** SectorManager.js:139-142 (showSectorDiscovery)

**Current implementation:**
```javascript
this.showSectorDiscovery(sector.type, sector.name);
```

**Enhancement:** Modal already shows sector type and bonuses. Add exclusive signal notification.

**Extension:**
```javascript
// In showSectorDiscovery (Lines 277-323)
let bonusHTML = `...existing HTML...`;

// NEW: Add exclusive signal notice
if (sectorType.exclusiveSignalType) {
    bonusHTML += `
        <p style="color: #ff0; font-weight: bold; margin-top: 10px;">
            ⚡ Unique Signal Type Detected!
        </p>
        <p style="color: #fff;">
            This sector contains exclusive ${sectorType.exclusiveSignalType.replace('_', ' ')} signals.
        </p>
    `;
}
```

**No breaking changes:** Addition to existing HTML.

## Component Boundaries

| Component | Responsibility | Integration Points |
|-----------|---------------|-------------------|
| **SectorManager.js** | Sector type definitions, discovery events, bonus signal spawning | - Add `exclusiveSignalType` to sector type definitions<br>- Modify discovery bonus switch<br>- Update discovery modal HTML |
| **ProbeManager.js** | Signal generation during probe pulses | - Add exclusive type check in `determineSignalType()`<br>- No changes to auto-collection (type-agnostic) |
| **GameController.js** | Signal rendering, exploration modal, reward calculation | - Add exclusive type cases to render switch<br>- Add exclusive type reward bonuses<br>- No changes to modal generation (uses signal.rarity) |
| **GameState.js** | Signal entity storage | - No changes (signalType already string field) |
| **SaveManager.js** | Persistence | - No changes (signals not persisted, only discovered sectors) |

## Data Flow Changes

### Current Flow
```
ProbeManager.updateProbePulses()
  → getCurrentSector(probe)
  → determineSignalType(sector)           ← Sector-aware
  → determineSignalRarity()
  → Create signal with type
  → Push to entities.signals

GameController.renderSignals()
  → For each signal
    → Check signal.signalType             ← Type-aware rendering
    → Apply color theme
    → Draw with effects

GameController.collectSignal()
  → showExplorationModal(signal)
  → generatePlanet(signal)                ← Uses signal.rarity
  → explore(mode)
    → Check signal.signalType             ← Type-aware rewards
    → Calculate bonuses
```

### Changes for Exclusive Types
```
SectorManager.initializeSector()
  → Define sector with exclusiveSignalType  ← NEW FIELD

ProbeManager.determineSignalType()
  → if (sector.exclusiveSignalType)         ← NEW CHECK
    → 30% chance return exclusive type
  → else existing logic

GameController.renderSignals()
  → case 'nebula_data':                     ← NEW CASE
  → case 'derelict_artifact':               ← NEW CASE
    → Custom color gradients
    → Enhanced visual effects

GameController.explore()
  → case 'nebula_data':                     ← NEW CASE
  → case 'derelict_artifact':               ← NEW CASE
    → Custom reward multipliers

SectorManager.spawnDiscoveryBonusSignals()
  → if (sector.exclusiveSignalType)         ← NEW CHECK
    → Spawn exclusive type signals
  → else existing logic
```

**Key insight:** All changes are **additive cases** in existing switch statements or **optional field checks**. No existing code paths change behavior.

## Shell Bonus Compatibility

**Current bonuses affecting signals:**
- `dataSignalDiscovery`: +X% signal generation chance (Line 481)
- `signalRange`: +X% to detection radius (Lines 467, 701)
- `rareSignalChance`: Shifts rarity probabilities (Lines 541-571)
- `artifactDiscovery`: +X% artifact rewards (Line 784)
- `explorationRewards`: +X% all rewards (Line 777)
- `exoticYield`: +X% exotic mineral yield (Line 838)

**All bonuses are type-agnostic:**
- Signal generation chance applies to all types
- Signal range applies to all types
- Rarity shifting applies to all types
- Reward bonuses multiply final values regardless of source type

**No changes required:** Exclusive signal types automatically benefit from existing bonuses.

**Example:**
```javascript
// Nebula sector, probe with dataSignalDiscovery +15%
const signalChance = 0.3 * (1 + 0.15);  // 34.5% chance

// Nebula_data signal with rare rarity
const baseRewards = { data: 10 };
// Signal type bonus (new)
rewards.data *= 1.75;  // 17.5
// explorationRewards bonus (existing)
rewards.data *= 1.25;  // 21.875 → 21
```

## Suggested Build Order

### Phase 1: Data Definitions
**What:** Add new sector types and exclusive signal type definitions
**Why first:** Establishes data model without affecting existing behavior
**Files:**
- SectorManager.js: Add 2-3 new sector types with `exclusiveSignalType` field
- (Optional) constants file for signal type definitions

**Depends on:** Nothing
**Risk:** Low — additive data only

### Phase 2: Generation Logic
**What:** Modify signal type determination to use exclusive types
**Why second:** Enables exclusive types to spawn, but rendering falls back to default
**Files:**
- ProbeManager.js: `determineSignalType()` — add exclusive type check
- SectorManager.js: `spawnDiscoveryBonusSignals()` — add exclusive type cases

**Depends on:** Phase 1
**Risk:** Low — graceful degradation to default rendering

### Phase 3: Visual Rendering
**What:** Add exclusive type visual variants
**Why third:** Makes exclusive types visually distinct
**Files:**
- GameController.js: `renderSignals()` — add exclusive type color/effect cases

**Depends on:** Phase 2
**Risk:** Low — isolated to rendering switch

### Phase 4: Reward Calculation
**What:** Add exclusive type reward bonuses
**Why fourth:** Differentiates exclusive types mechanically
**Files:**
- GameController.js: `explore()` — add exclusive type reward cases

**Depends on:** Phase 2
**Risk:** Low — isolated to reward calculation

### Phase 5: Discovery UI Enhancement
**What:** Show exclusive signal notification in sector discovery modal
**Why last:** Polish, non-critical to functionality
**Files:**
- SectorManager.js: `showSectorDiscovery()` — add exclusive type notification HTML

**Depends on:** Phase 1
**Risk:** Very Low — HTML addition only

### Phase 6: Testing
**What:** Playwright tests for exclusive signal pipeline
**Why always:** Required per CLAUDE.md
**Files:**
- New test file: `tests/sector-exclusive-signals.spec.js`

**Test coverage:**
- Sector with exclusive type spawns that type
- Exclusive type renders with correct colors
- Exclusive type awards correct rewards
- Discovery bonus includes exclusive type
- Existing sectors unaffected
- Shell bonuses apply to exclusive types

**Depends on:** Phases 1-5
**Risk:** Low — test-only code

## Architecture Anti-Patterns to Avoid

### Anti-Pattern 1: Centralized Signal Type Registry
**What:** Creating a SignalTypeManager with all type definitions and behaviors
**Why bad:** Adds unnecessary indirection; signal types are data, not behavior
**Instead:** Keep type definitions in sector type config, rendering/rewards in existing switches

### Anti-Pattern 2: Signal Type Inheritance Hierarchy
**What:** Creating classes for MineralSignal, DataSignal, NebulaSignal, etc.
**Why bad:** Vanilla JS game with plain objects; OOP introduces complexity without benefit
**Instead:** Use plain signal objects with `signalType` string field + switch statements

### Anti-Pattern 3: Breaking Signal Entity Schema
**What:** Adding `exclusiveTypeData` object to signal entities
**Why bad:** Signals are ephemeral (2-5 second lifetime); complex schema unnecessary
**Instead:** Use existing `signalType` string field; rendering/rewards derive from type

### Anti-Pattern 4: Sector-Signal Coupling
**What:** Storing sector reference on signal entity for later lookup
**Why bad:** Signals move/fade independent of sector; stale references risk bugs
**Instead:** Signal type determined at spawn time; sector context not needed later

### Anti-Pattern 5: Dynamic Signal Type String Generation
**What:** `signalType = sector.name + '_' + resourceType` (e.g., "Nebula_data")
**Why bad:** Hard to debug, error-prone, breaks switch statements
**Instead:** Use explicit `exclusiveSignalType` field in sector definition

## Scalability Considerations

| Concern | Current State | With Exclusive Types | Future (10+ Types) |
|---------|---------------|---------------------|-------------------|
| **Signal entity count** | ~20-50 active signals | Same (spawn rate unchanged) | Same |
| **Render performance** | Single pass, <1ms/frame | +2 switch cases, negligible | Switch → lookup table if >20 types |
| **Memory footprint** | Signals ~100 bytes each | +8 bytes (longer string) | Consider string interning |
| **Code complexity** | 5 signal types, 5 sector types | +2-3 types each | Extract type config to JSON |
| **Test coverage** | Signal tests cover type logic | +1 test file for exclusive types | Parameterized tests per type |

**Recommendation for this milestone:** Current switch-based approach is optimal for 2-3 new types. Refactor to data-driven approach only if exceeding 10 total signal types.

## Sector Type Extensibility Pattern

**Current approach:** Hardcoded sector type array in `SectorManager.initializeSector()`

**Extensible pattern:**
```javascript
// Future-proof: Extract to config/constants
const SECTOR_TYPE_DEFINITIONS = [
    {
        name: 'Standard',
        color: 'rgba(100, 100, 255, 0.3)',
        borderColor: '#66f',
        bonuses: { mineral: 1.0, data: 1.0, artifact: 1.0 },
        destructionChance: 0,
        signalDistribution: { mixed: 0.7, mineral: 0.1, data: 0.1, artifact: 0.1 }
        // NO exclusiveSignalType
    },
    {
        name: 'Nebula',
        color: 'rgba(150, 100, 255, 0.3)',
        borderColor: '#96f',
        bonuses: { mineral: 0.5, data: 2.0, artifact: 1.5 },
        destructionChance: 0,
        exclusiveSignalType: 'nebula_data',
        signalDistribution: {
            nebula_data: 0.3,  // NEW
            data: 0.4,
            mixed: 0.2,
            artifact: 0.1
        }
    }
];
```

**Benefits:**
- Declarative sector definitions
- Easy to add new sectors without code changes
- Signal distribution explicit per sector
- Could move to JSON file for modding support

**Scope:** Out of scope for this milestone (3-5 new sectors max), but pattern established for future.

## Summary

**Sector-exclusive signals integrate via:**

1. **Data extension:** Add `exclusiveSignalType` field to sector type definitions
2. **Conditional logic:** Check for exclusive type before fallback to existing distribution
3. **Switch case additions:** Add rendering/reward cases for new types
4. **UI enhancement:** Add discovery notification for exclusive types

**No new architectural components required.** All integration points are existing extension points designed for this use case.

**Confidence level: HIGH** — Architecture research complete, integration points verified, build order clear.
