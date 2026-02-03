# Technology Stack for Sector-Specific Signals

**Project:** Probetheus v1.3 - Sector-Specific Signals
**Researched:** 2026-02-02

## Executive Summary

No new libraries or frameworks needed. This feature extends the existing vanilla JavaScript signal generation and rendering pipeline with sector-aware type determination and discovery reveal events. All additions integrate with the established EventBus pattern, Canvas rendering system, and data structure conventions already proven in ShellSystem and EquipmentSystem.

## Stack Status: No Changes Required

| Layer | Current | Change Required | Rationale |
|-------|---------|-----------------|-----------|
| Core Language | Vanilla JavaScript | None | Signal generation logic fits existing ProbeManager patterns |
| Rendering | HTML5 Canvas | None | Signal visuals already canvas-rendered with color/effect variations |
| Event System | EventBus (emit/on pattern) | None | Discovery reveals use same pattern as sector discovery |
| Data Structures | Plain JS objects with typed properties | None | Signal definitions follow EQUIPMENT_TYPES/SHELL_CATALOG pattern |
| State Management | GameState centralized store | None | Sector-specific signals stored in existing `entities.signals` array |

**Why no new dependencies:** The existing codebase already handles:
- Complex visual effects (shell trails, glow, discovery bonus sparkles)
- Sector-aware generation (ProbeManager.determineSignalType checks sector type)
- Event-driven reveals (SectorManager emits discovery events with modal display)
- Typed resource systems (EquipmentSystem collectionTypes, ShellSystem bonuses)

## Recommended Patterns for Implementation

### 1. Signal Type Definition Pattern

**Where:** New file `src/SignalTypeDefinitions.js` (follows `EquipmentSystem.js` pattern)

**Structure:**
```javascript
const SECTOR_SIGNAL_TYPES = {
    // Resource-Rich exclusive
    mineral_vein: {
        id: 'mineral_vein',
        name: 'Mineral Vein',
        sectorType: 'Resource-Rich',
        baseRewards: { minerals: 30, data: 5, artifacts: 0 },
        visualConfig: {
            baseColor: '#ff8c00',
            glowIntensity: 1.3,
            pulseSpeed: 0.8,
            particleEffect: 'crystalline'
        },
        spawnWeight: 0.15  // 15% of signals in Resource-Rich sectors
    },

    // Data Haven exclusive
    data_cache: {
        id: 'data_cache',
        name: 'Data Cache',
        sectorType: 'Data Haven',
        baseRewards: { minerals: 0, data: 35, artifacts: 3 },
        visualConfig: {
            baseColor: '#00ffcc',
            glowIntensity: 1.5,
            pulseSpeed: 1.2,
            particleEffect: 'matrix'
        },
        spawnWeight: 0.20
    },

    // Ancient exclusive
    artifact_site: {
        id: 'artifact_site',
        name: 'Artifact Site',
        sectorType: 'Ancient',
        baseRewards: { minerals: 5, data: 10, artifacts: 20 },
        visualConfig: {
            baseColor: '#ccaaff',
            glowIntensity: 1.8,
            pulseSpeed: 0.5,
            particleEffect: 'runic'
        },
        spawnWeight: 0.18
    },

    // Asteroid Field exclusive
    volatile_deposit: {
        id: 'volatile_deposit',
        name: 'Volatile Deposit',
        sectorType: 'Asteroid Field',
        baseRewards: { minerals: 15, data: 15, artifacts: 15, exoticMinerals: 5 },
        visualConfig: {
            baseColor: '#ff4444',
            glowIntensity: 2.0,
            pulseSpeed: 1.5,
            particleEffect: 'explosive'
        },
        spawnWeight: 0.12
    }
};

class SignalTypeSystem {
    static getSignalTypesForSector(sectorTypeName) {
        return Object.values(SECTOR_SIGNAL_TYPES)
            .filter(st => st.sectorType === sectorTypeName);
    }

    static getSignalTypeDef(signalTypeId) {
        return SECTOR_SIGNAL_TYPES[signalTypeId] || null;
    }

    static shouldSpawnSectorSignal(sectorTypeName, rand = Math.random()) {
        const types = this.getSignalTypesForSector(sectorTypeName);
        let cumulativeWeight = 0;

        for (const type of types) {
            cumulativeWeight += type.spawnWeight;
            if (rand < cumulativeWeight) {
                return type.id;
            }
        }

        return null; // Falls through to standard signal types
    }
}

window.SignalTypeSystem = SignalTypeSystem;
window.SECTOR_SIGNAL_TYPES = SECTOR_SIGNAL_TYPES;
```

**Rationale:**
- Follows exact pattern from `EquipmentSystem.js` (const definitions + class with static methods)
- `spawnWeight` replaces hardcoded percentages in `determineSignalType`
- `visualConfig` encapsulates rendering parameters (avoids switch statement bloat in GameController)
- `baseRewards` separate from rarity multipliers (rarity applies on top)
- Global exports match `window.EQUIPMENT_TYPES` convention

**Integration point:** ProbeManager.determineSignalType calls `SignalTypeSystem.shouldSpawnSectorSignal(sector.type.name)` before falling back to mixed/mineral/data/artifact.

### 2. Discovery Reveal Event Pattern

**Where:** SectorManager.js (existing file)

**Extension to existing `discoverSector` method:**
```javascript
discoverSector(x, y) {
    // ... existing sector initialization ...

    if (!sector.explored) {
        sector.explored = true;

        // NEW: Emit detailed discovery event with sector-specific signals
        this.eventBus.emit('sector:discovered', {
            sector: sector,
            sectorX: x,
            sectorY: y,
            signalTypes: this.getDiscoveryRevealSignals(sector.type.name)
        });

        this.showSectorDiscovery(sector.type, sector.name);
        this.spawnDiscoveryBonusSignals(x, y, sector.type);
    }
}

getDiscoveryRevealSignals(sectorTypeName) {
    // Returns array of sector-specific signal type IDs for this sector
    const signalTypes = window.SignalTypeSystem?.getSignalTypesForSector(sectorTypeName) || [];
    return signalTypes.map(st => ({
        id: st.id,
        name: st.name,
        description: `Found in ${sectorTypeName} sectors`
    }));
}
```

**Rationale:**
- Uses existing EventBus pattern (no new mechanism)
- Piggybacks on proven `discoverSector` flow
- Event payload includes signals for UI consumption (modal or notification)
- Separation of concerns: SectorManager emits, UIManager/DialogueSystem handles display

**Integration point:** Listen with `eventBus.on('sector:discovered', data => { /* show reveal UI */ })` in GameController or new RevealUIManager.

### 3. Canvas Rendering Extension Pattern

**Where:** GameController.js `renderSignals()` method

**Existing structure supports extension:**
```javascript
renderSignals() {
    this.gameState.entities.signals.forEach(signal => {
        // ... existing fade/pulse calculations ...

        // CURRENT: Checks signal.signalType for mineral/data/artifact/dark_market
        // ADDITION: Check for sector-specific types first

        const signalTypeDef = window.SignalTypeSystem?.getSignalTypeDef(signal.signalType);

        if (signalTypeDef && signalTypeDef.visualConfig) {
            // Use sector-specific visual config
            color = signalTypeDef.visualConfig.baseColor;
            const glowRadius = radius * signalTypeDef.visualConfig.glowIntensity;

            // Apply particle effects if defined
            if (signalTypeDef.visualConfig.particleEffect) {
                this.renderSignalParticles(signal, signalTypeDef.visualConfig.particleEffect);
            }
        } else {
            // Fall back to existing mineral/data/artifact/mixed theming
            // ... existing switch statement ...
        }

        // ... existing gradient/glow/center rendering ...
    });
}

renderSignalParticles(signal, effectType) {
    // NEW helper method for particle effects
    switch (effectType) {
        case 'crystalline':
            // Sharp geometric particles radiating outward
            break;
        case 'matrix':
            // Flowing data streams circling signal
            break;
        case 'runic':
            // Slow-rotating ancient symbols
            break;
        case 'explosive':
            // Chaotic sparks with random bursts
            break;
    }
}
```

**Rationale:**
- Extends existing rendering without refactoring
- `visualConfig` pattern already proven in ShellSystem (shell.visual properties)
- Particle effects are additive layer (can skip if performance issue)
- Falls back to current behavior if SignalTypeSystem not loaded

**Integration point:** Signal objects created in ProbeManager.updateProbePulses get `signalType` property set to sector-specific ID.

### 4. Reward Calculation Pattern

**Where:** ProbeManager.js `autoCollectSignals()` method

**Extension to existing reward logic:**
```javascript
autoCollectSignals(probe) {
    signalsInRange.forEach(signal => {
        // ... existing rarity checks ...

        // CURRENT: Uses baseRewards lookup table by rarity
        const baseRewards = {
            common: { minerals: 5, data: 2, artifacts: 1 },
            uncommon: { minerals: 10, data: 5, artifacts: 2 },
            // ...
        };

        let rewards = { ...(baseRewards[signal.rarity] || baseRewards.common) };

        // NEW: Override with sector-specific base rewards if applicable
        const signalTypeDef = window.SignalTypeSystem?.getSignalTypeDef(signal.signalType);
        if (signalTypeDef && signalTypeDef.baseRewards) {
            // Sector signals have fixed base rewards, then rarity multiplies
            const rarityMultiplier = RARITY[signal.rarity]?.multiplier || 1.0;
            rewards = {
                minerals: Math.floor(signalTypeDef.baseRewards.minerals * rarityMultiplier),
                data: Math.floor(signalTypeDef.baseRewards.data * rarityMultiplier),
                artifacts: Math.floor(signalTypeDef.baseRewards.artifacts * rarityMultiplier)
            };

            // Add exotic minerals if defined
            if (signalTypeDef.baseRewards.exoticMinerals) {
                rewards.exoticMinerals = Math.floor(signalTypeDef.baseRewards.exoticMinerals * rarityMultiplier);
            }
        }

        // ... existing shell bonus application (explorationRewards, artifactDiscovery, exoticYield) ...
        // ... existing cargo storage ...
    });
}
```

**Rationale:**
- Sector-specific rewards replace standard lookup, but rarity multiplier still applies
- Shell bonuses (PBON-06, PBON-07, PBON-08) stack on top (no changes needed to bonus system)
- Exotic minerals already supported in cargo system (line 829 in ProbeManager.js)
- Falls back to standard rewards if SignalTypeSystem not available

**Integration point:** Rewards display in resource indicators already handles variable amounts (no UI changes needed).

### 5. Signal Generation Integration Pattern

**Where:** ProbeManager.js `updateProbePulses()` method

**Extension at line 500 (signal type determination):**
```javascript
updateProbePulses(probe, deltaTime) {
    if (Math.random() < signalChance) {
        const currentSector = this.getCurrentSector(probe);

        // Check for dark market (existing)
        const isDarkMarket = darkMarketSystem && darkMarketSystem.shouldSpawnDarkMarket();
        if (isDarkMarket) {
            signalType = 'dark_market';
        } else {
            // NEW: Check for sector-specific signal first
            const sectorSignalType = window.SignalTypeSystem?.shouldSpawnSectorSignal(
                currentSector?.type.name,
                Math.random()
            );

            if (sectorSignalType) {
                signalType = sectorSignalType; // 'mineral_vein', 'data_cache', etc.
            } else {
                // Fall back to existing determineSignalType logic
                signalType = this.determineSignalType(currentSector);
            }
        }

        // Signal creation proceeds with signalType (existing code)
        const signal = {
            x: signalX,
            y: signalY,
            radius: 8 + Math.random() * 4,
            rarity: this.determineSignalRarity(isInAsteroidField, probe),
            signalType: signalType,  // Now includes sector-specific types
            duration: 3000,
            createdAt: Date.now()
        };

        this.gameState.entities.signals.push(signal);
    }
}
```

**Rationale:**
- Priority order: dark_market > sector_specific > standard (prevents breaking existing special signals)
- `shouldSpawnSectorSignal` returns null when random roll misses (clean fallback)
- No changes to signal object structure (signalType already exists for mineral/data/artifact)
- Standard sector weighting (60% standard type, 15-20% sector-specific) achieved via spawnWeight tuning

**Integration point:** Rarity determination unchanged (works with any signal type). Collection type filtering unchanged (equipment checks baseRewards composition).

## Data Flow Architecture

```
Probe Movement (ProbeManager)
  └─> updateProbePulses()
        └─> Check sector type (getCurrentSector)
             └─> SignalTypeSystem.shouldSpawnSectorSignal(sectorType)
                  ├─> Returns sector-specific type ID (15-20% chance)
                  └─> Returns null (falls back to determineSignalType)
                       └─> Creates signal object with signalType property
                            └─> Stored in gameState.entities.signals

Game Loop Render (GameController)
  └─> renderSignals()
        └─> For each signal:
             └─> SignalTypeSystem.getSignalTypeDef(signal.signalType)
                  ├─> Found: Use visualConfig for color/glow/particles
                  └─> Not found: Use existing mineral/data/artifact theming

Probe Collection (ProbeManager)
  └─> autoCollectSignals()
        └─> For each collected signal:
             └─> SignalTypeSystem.getSignalTypeDef(signal.signalType)
                  ├─> Found: Use baseRewards × rarity multiplier
                  └─> Not found: Use standard baseRewards lookup
                       └─> Apply shell bonuses (explorationRewards, etc.)
                            └─> Store in probe.cargo

Sector Discovery (SectorManager)
  └─> discoverSector()
        └─> Emit 'sector:discovered' event with signalTypes array
             └─> GameController listens, shows reveal UI
                  └─> "New signals available: Mineral Vein, Volatile Deposit"
```

## Configuration Approach

### Signal Type Spawn Weights

**Problem:** How to balance sector-specific signal frequency?

**Solution:** Tunable spawn weights in signal definitions (0.0 to 1.0 scale)

**Example tuning:**
```javascript
// Resource-Rich sector: 100 signals spawn during exploration
// - 60 standard mineral signals (existing determineSignalType logic)
// - 15 Mineral Vein signals (spawnWeight: 0.15)
// - 10 Geode Cluster signals (spawnWeight: 0.10)
// - 15 mixed/data/artifact (existing fallback)

// Total sector-specific signals: 25% (feels special without dominating)
```

**Rationale:**
- No hardcoded percentages in generation code
- Designers adjust weights in SignalTypeDefinitions.js
- Sum of weights < 1.0 ensures fallback to standard types
- Independent per sector type (Resource-Rich can be 25%, Ancient can be 18%)

### Visual Effect Performance

**Problem:** Particle effects may impact frame rate with many signals.

**Solution:** Conditional rendering based on signal count

```javascript
renderSignals() {
    const enableParticles = this.gameState.entities.signals.length < 50;

    this.gameState.entities.signals.forEach(signal => {
        // ... standard glow/pulse rendering ...

        if (enableParticles && signalTypeDef?.visualConfig.particleEffect) {
            this.renderSignalParticles(signal, signalTypeDef.visualConfig.particleEffect);
        }
    });
}
```

**Rationale:**
- Degrades gracefully under load (standard glow still visible)
- 50 signal threshold based on existing performance (game handles 100+ signals at 60fps currently)
- Optional: Add settings toggle later

### Discovery Reveal UI Approach

**Option A: Extend Sector Modal (Recommended)**

Modify existing `showSectorDiscovery()` in SectorManager:
```javascript
showSectorDiscovery(sectorType, sectorName) {
    // ... existing modal display ...

    // NEW: Add signal reveal section
    const signalTypes = this.getDiscoveryRevealSignals(sectorType.name);
    if (signalTypes.length > 0) {
        const signalHTML = signalTypes.map(st =>
            `<span style="color: ${st.color};">${st.name}</span>`
        ).join(', ');

        bonusHTML += `<p style="color: #ffd700; margin-top: 10px;">
            🔍 New Signal Types: ${signalHTML}
        </p>`;
    }
}
```

**Rationale:**
- Uses existing modal infrastructure (no new UI component)
- Discovery info presented together (sector type + bonus signals)
- Consistent with current reveal flow (players already expect modal)

**Option B: Separate Signal Codex**

New persistent UI panel showing discovered signal types:
```javascript
// Menu button: "Signal Codex" (like Research Lab)
// Shows grid of discovered signal types with:
// - Icon/color preview
// - Name and description
// - Sector type where found
// - Reward breakdown by rarity
```

**Rationale:**
- Reference material for players (educates on signal types)
- Completionist goal (discover all signal types)
- Deferred to later milestone (not blocking v1.3 MVP)

## Integration Checklist

### File Changes Required

| File | Change Type | Complexity |
|------|-------------|------------|
| `src/SignalTypeDefinitions.js` | NEW | Low - follows EquipmentSystem pattern |
| `src/ProbeManager.js` | EXTEND | Low - 2 method additions (shouldSpawnSectorSignal call, baseRewards override) |
| `src/GameController.js` | EXTEND | Medium - renderSignalParticles helper, visualConfig lookup |
| `src/SectorManager.js` | EXTEND | Low - emit sector:discovered event, getDiscoveryRevealSignals method |
| `index.html` | ADD SCRIPT | Trivial - `<script src="src/SignalTypeDefinitions.js"></script>` |

### Event Integration Points

| Event | Producer | Consumer | Data |
|-------|----------|----------|------|
| `sector:discovered` | SectorManager | GameController (new listener) | { sector, sectorX, sectorY, signalTypes } |
| `signal:collected` | ProbeManager (optional new) | AchievementSystem (future) | { signalType, rarity } |

### Backward Compatibility Strategy

**Save file compatibility:**
- Signal objects saved with `signalType` property (already exists for mineral/data/artifact)
- Old saves have signalType values: 'mineral', 'data', 'artifact', 'mixed', 'dark_market'
- New saves add: 'mineral_vein', 'data_cache', 'artifact_site', 'volatile_deposit', etc.
- Rendering/collection code checks for SignalTypeSystem availability (graceful fallback)

**Migration approach:**
```javascript
// In SaveManager.loadGame():
loadedGameState.entities.signals.forEach(signal => {
    // No migration needed - unknown signalTypes render with fallback color
    // Collectors check baseRewards which defaults to standard lookup
});
```

**Rationale:** Additive changes only. Old signal types work unchanged. New types degrade to standard rendering if definitions missing.

## Testing Strategy

### Unit Test Patterns (Playwright)

```javascript
// tests/sector-signals.spec.js

test('Resource-Rich sector spawns mineral_vein signals', async ({ page }) => {
    // Deploy probe to Resource-Rich sector
    // Wait for signals to generate
    // Verify some signals have signalType: 'mineral_vein'
});

test('mineral_vein signal rewards higher minerals', async ({ page }) => {
    // Spawn test signal with signalType: 'mineral_vein', rarity: 'rare'
    // Collect with probe
    // Verify minerals > standard rare signal rewards
});

test('sector discovery reveals signal types in modal', async ({ page }) => {
    // Discover new Ancient sector
    // Verify modal shows "Artifact Site" signal type
});

test('sector-specific signals render with correct color', async ({ page }) => {
    // Create signal with signalType: 'data_cache'
    // Capture canvas rendering
    // Verify color matches visualConfig.baseColor (#00ffcc)
});

test('shell bonuses apply to sector-specific signals', async ({ page }) => {
    // Equip shell with explorationRewards: 20%
    // Collect mineral_vein signal
    // Verify rewards include 20% bonus
});
```

**Rationale:**
- Follows existing test patterns (spawn entities, verify state, check rendering)
- Covers generation, collection, rendering, and bonus interaction
- Integration tests ensure end-to-end flow works

### Performance Benchmarks

**Acceptance criteria:**
- 100 signals on screen: maintain 60fps (current baseline)
- 50 signals with particle effects: maintain 45fps minimum
- Signal generation: < 0.1ms per pulse check (negligible vs existing cost)

**Measurement approach:**
```javascript
// In GameController.renderSignals():
const renderStart = performance.now();
// ... rendering logic ...
const renderTime = performance.now() - renderStart;
if (renderTime > 5) console.warn('Signal rendering slow:', renderTime);
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Particle effects tank frame rate | High - unplayable | Conditional rendering (< 50 signals), settings toggle |
| Signal spawn weights feel wrong | Medium - balance issues | Tunable weights in definitions file, easy to adjust |
| Players don't notice sector-specific signals | Medium - wasted feature | Discovery reveal modal highlights new types clearly |
| Shell bonuses break with new reward calculation | High - gameplay regression | Test coverage for bonus application, fallback to standard rewards |
| Save file migration issues | High - data loss | Additive approach (old types unchanged), validation tests |

## Open Questions

**Q: Should sector-specific signals have different durations?**
- Current: All signals fade after 2-3 seconds
- Option: Sector signals last 5-7 seconds (more impactful)
- Recommendation: Start with standard duration, iterate based on feedback

**Q: Should discovery bonus signals include sector-specific types?**
- Current: Discovery bonuses spawn mineral/data/artifact/mixed by sector
- Option: Spawn 1 sector-specific signal guaranteed on discovery
- Recommendation: Yes - reinforces "this sector has unique signals" immediately

**Q: Should signal codex track discovery stats?**
- Current: No persistent tracking of collected signal types
- Option: Track first discovery time, total collected per type
- Recommendation: Defer to future milestone (not blocking v1.3)

## Rationale Summary

**Why this approach succeeds:**
1. **Zero new dependencies** - Uses proven vanilla JS patterns already in codebase
2. **Minimal surface area** - 4 file changes, 1 new file following established pattern
3. **Backward compatible** - Additive changes only, old signals unchanged
4. **Performance safe** - Conditional particle rendering, same signal count limits
5. **Designer friendly** - Spawn weights and rewards tunable in definitions file
6. **Testable** - Follows existing Playwright test patterns
7. **Extensible** - Easy to add more sector types or signal types later

**Why alternatives were rejected:**
- External particle library (PixiJS): Overkill for 4 simple effects, breaks vanilla JS constraint
- Separate signal manager class: Unnecessary abstraction, ProbeManager already owns signal lifecycle
- SVG rendering for signals: Canvas already handles complex effects (shell trails, discovery sparkles)
- JSON configuration files: JS object literals are configuration, no build step needed

## Sources

**HIGH Confidence - Direct Codebase Analysis:**
- ProbeManager.js lines 484-522 (signal generation with sector-aware type determination)
- GameController.js lines 3130-3294 (signal rendering with color/effect variations)
- SectorManager.js lines 107-150 (sector discovery with modal and bonus signals)
- EquipmentSystem.js lines 6-44 (EQUIPMENT_TYPES pattern with static methods)
- ShellSystem.js lines 8-79 (bonus type definitions, NPC themes, visual configs)

**MEDIUM Confidence - Established Patterns:**
- EventBus emit/on pattern (used throughout codebase for entity:selected, probe:moved, etc.)
- Canvas rendering performance (existing game handles 100+ signals at 60fps per CLAUDE.md)
- Save compatibility approach (EquipmentSystem migration pattern, ShellSystem cosmetic persistence)

**Validation Status:**
- All file paths verified to exist in C:\Users\keato\repos\Probetheus\src\
- All referenced methods confirmed in codebase (determineSignalType, getCurrentSector, renderSignals)
- All integration points map to existing event listeners and system interfaces
