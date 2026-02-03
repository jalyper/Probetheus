# Domain Pitfalls: Sector-Specific Signal/Loot Systems

**Domain:** Adding zone-exclusive content to existing space exploration idle game
**Researched:** 2026-02-02
**Context:** Probetheus milestone adding sector-exclusive signal types to existing signal/collection system

## Critical Pitfalls

Mistakes that cause rewrites, save corruption, or major gameplay issues.

### Pitfall 1: Save Migration Breaking Existing Signals
**What goes wrong:** Adding new signal properties (like `sectorExclusive: true` or `sectorType: 'Ancient'`) to spawned signals breaks old saves when they try to filter/process signals without those properties.

**Why it happens:**
- Signals are ephemeral (2-6 second lifetime) but can be in flight during save
- Old save files have signals without new properties
- Code assumes all signals have the new properties (`if (signal.sectorType === 'Ancient')` crashes on undefined)
- Array methods like `.filter()` or `.find()` fail silently or produce wrong results

**Consequences:**
- Load-game crashes with "Cannot read property of undefined"
- Signals spawn in wrong locations after load
- Auto-collection picks up wrong signals
- Players lose progress or save files become unloadable

**Prevention:**
```javascript
// BAD - assumes property exists
const ancientSignals = signals.filter(s => s.sectorType === 'Ancient');

// GOOD - defensive check with fallback
const ancientSignals = signals.filter(s => s.sectorType === 'Ancient' || (!s.sectorType && s.signalType === 'artifact'));
```

**Detection:**
- Test loading saves created before the feature
- Add migration tests that load JSON saves without new properties
- Check console for "undefined property" errors during load

**Phase to address:** Phase 1 (Foundation) - add migration logic before any signal spawning

---

### Pitfall 2: Rarity and Sector-Type Conflicts
**What goes wrong:** System has BOTH signal type (`mineral/data/artifact`) and sector type (`Ancient/Resource-Rich`). Adding sector-EXCLUSIVE signals creates ambiguity: "Can an Ancient relic signal spawn in Resource-Rich sectors? What rarity can it be?"

**Why it happens:**
- Original system: `determineSignalType(sector)` based on sector probabilities (60% mineral in Resource-Rich)
- New system: Sector-exclusive signals ONLY spawn in specific sectors
- Two conflicting spawn tables: probability-based vs exclusive-based
- Shell bonuses (`rareSignalChance`) apply to both, creating unexpected behavior

**Consequences:**
- Sector-exclusive signals spawn everywhere (defeats purpose)
- Common sector signals stop spawning in their home sectors (diluted by exclusives)
- Rarity upgrades (uncommon→rare research) break exclusive signals
- Players expect Ancient sectors to have relics + normal artifacts, but get only relics

**Prevention:**
1. **Separate spawn pools:**
   ```javascript
   // First roll: sector-exclusive or normal?
   const isExclusive = shouldSpawnExclusive(currentSector);
   if (isExclusive) {
       spawnSectorExclusiveSignal(currentSector.type);
   } else {
       spawnNormalSignal(currentSector); // Existing logic
   }
   ```

2. **Clear naming convention:**
   - Signal type: `mineral`, `data`, `artifact`, `mixed` (existing)
   - Sector signal: `relic`, `crystalline`, `dataCache`, `astralEcho`, `asteroidChunk` (NEW, exclusive)
   - Never overload `signalType` with sector names

3. **Explicit exclusivity flag:**
   ```javascript
   const signal = {
       signalType: 'relic',           // What reward it gives
       sectorExclusive: 'Ancient',    // ONLY spawns here
       isSectorSpecial: true          // Flag for UI/logic
   };
   ```

**Detection:**
- Log signal spawns by sector: "Ancient sector spawned: 2 relics, 5 artifacts, 3 minerals"
- If non-exclusive signals stop appearing, spawn pools are conflicting
- Test shell bonus interaction: Does `rareSignalChance` affect sector-exclusives?

**Phase to address:** Phase 1 (Foundation) - define spawn logic architecture before implementation

---

### Pitfall 3: Auto-Collection Ignoring Sector-Exclusive Signals
**What goes wrong:** Equipment system filters by `collectionTypes: ['minerals', 'data', 'artifacts', 'all']`. Sector-exclusive signals have NEW types (`relic`, `crystalline`) that aren't in any collector's type list. Result: Probes fly over valuable exclusives without collecting them.

**Why it happens:**
- Equipment filters: `canCollectMinerals = collectionTypes.has('minerals')`
- New signal types: `signalType: 'relic'` doesn't match `'minerals'` or `'artifacts'`
- Code path: `autoCollectSignals()` checks `signal.signalType` against allowed types, fails match, skips signal
- No error thrown - silent failure

**Consequences:**
- Players equip collectors but don't get sector-exclusive rewards
- Manual clicking still works, so bug is confusing ("sometimes auto-collect works?")
- Exclusive signals clutter screen (60% spawn rate in home sector)
- Perceived as broken feature, players stop exploring new sectors

**Prevention:**
1. **Map exclusive types to base types:**
   ```javascript
   const SIGNAL_TYPE_MAPPING = {
       'relic': 'artifacts',      // Relics count as artifacts for collection
       'crystalline': 'minerals', // Crystalline counts as minerals
       'dataCache': 'data',       // Data caches count as data
       'astralEcho': 'all',       // Special: collected by universal only
       'asteroidChunk': 'minerals'
   };

   function getBaseType(signalType) {
       return SIGNAL_TYPE_MAPPING[signalType] || signalType;
   }
   ```

2. **Update collection logic:**
   ```javascript
   // In autoCollectSignals()
   const baseType = getBaseType(signal.signalType);
   const canCollectMineralsAtRarity = canCollectMinerals &&
       (baseType === 'minerals' || baseType === 'all');
   ```

3. **Add explicit tests:**
   - "Mineral collector picks up crystalline signals in Resource-Rich"
   - "Artifact collector picks up relic signals in Ancient"
   - "Universal collector picks up astral echoes in Asteroid Field"

**Detection:**
- Watch probe with equipment fly through sector-exclusive signals
- Check cargo after patrol: "Did we collect 0 relics in Ancient sector?"
- Console log: "Signal [relic] skipped by collector [artifacts]"

**Phase to address:** Phase 2 (Signals & Visuals) - update collection filter logic when adding new signal types

---

### Pitfall 4: Discovery Modal Showing Wrong Sector Specialty
**What goes wrong:** Discovery modal says "Ancient Sector: 60% Artifact bonus" but player sees relics (NEW) + normal artifacts (OLD). Messaging doesn't explain that relics are EXCLUSIVE and MORE valuable. Players think exclusive signals are just reskinned normal signals.

**Why it happens:**
- Discovery modal hardcoded: `"Artifacts: x4.0"` from sector type definition
- No mention of sector-exclusive content
- UI doesn't differentiate between "This sector has more artifacts" vs "This sector has UNIQUE artifacts"
- Relic signals use artifact rewards (5/10/20/40/100 by rarity) so they LOOK like artifacts

**Consequences:**
- Players don't understand sector value proposition
- "Why explore Ancient sectors if I can get artifacts anywhere?"
- Exclusive signals feel like reskins, not progression
- Tutorial fails to teach sector specialization

**Prevention:**
1. **Update discovery modal structure:**
   ```javascript
   bonusHTML = `
       <p><strong>Sector Specialty:</strong> ${sectorType.specialty}</p>
       <p><em>${sectorType.exclusiveSignal} signals only spawn here!</em></p>
       <hr>
       <p>Resource Bonuses:</p>
       <p>Minerals: x${sectorType.mineralBonus}</p>
   `;
   ```

2. **Add sector type definitions:**
   ```javascript
   {
       name: 'Ancient',
       specialty: 'Archaeological Relics',
       exclusiveSignal: 'Relic',
       exclusiveDescription: 'Ancient technology fragments with unique properties',
       ...
   }
   ```

3. **Show exclusive signal in discovery rewards:**
   - Spawn 1 guaranteed sector-exclusive signal on discovery (already happens with bonus signals)
   - Modal explicitly calls out: "✨ Relic Signal detected nearby!"

**Detection:**
- User testing: "What makes Ancient sectors special?"
- If players can't explain sector exclusivity, modal failed
- Track if players revisit sector types after discovery

**Phase to address:** Phase 3 (Discovery UI) - update modal when implementing sector descriptions

---

### Pitfall 5: Performance Degradation from Signal Type Checks
**What goes wrong:** Adding per-sector spawn logic in `updateProbePulses()` (called 60fps) creates hotspot. Every frame, every probe checks `getCurrentSector()` → sector map lookup → RNG for exclusive spawn → performance tanks with 20+ probes.

**Why it happens:**
- Original: Simple RNG check `if (Math.random() < 0.3)` once per probe pulse (every 3 seconds)
- New: `getCurrentSector()` → `sector.type.name === 'Ancient'` → `shouldSpawnExclusive()` → `determineExclusiveType()` → RNG
- Called per-probe per-pulse (3 second intervals × 20 probes = frequent)
- Sector lookup: `world.sectors.get(key)` is Map lookup, cheap but adds up
- Compounded by shell bonus calculations (every signal spawn checks equipped shells)

**Consequences:**
- Frame drops when many probes exploring
- Worse on lower-end devices
- Players avoid deploying many probes (defeats idle game loop)
- Save/load stutters (needs to process all probe states)

**Prevention:**
1. **Cache sector lookups:**
   ```javascript
   // In probe object
   probe.cachedSector = null;
   probe.lastSectorUpdate = 0;

   function getCachedSector(probe) {
       const now = Date.now();
       if (!probe.cachedSector || now - probe.lastSectorUpdate > 1000) {
           probe.cachedSector = getCurrentSector(probe);
           probe.lastSectorUpdate = now;
       }
       return probe.cachedSector;
   }
   ```

2. **Batch spawn decisions:**
   ```javascript
   // Pre-calculate spawn tables per sector type
   const SPAWN_TABLES = {
       'Ancient': { exclusive: 0.6, normal: 0.4, exclusiveType: 'relic' },
       'Resource-Rich': { exclusive: 0.5, normal: 0.5, exclusiveType: 'crystalline' },
       // ...
   };

   // Simple lookup instead of complex logic
   const spawnTable = SPAWN_TABLES[sector.type.name] || DEFAULT_SPAWN;
   ```

3. **Profile before implementing:**
   - Baseline: Current FPS with 20 probes
   - After: FPS with sector-exclusive logic
   - Target: <5% regression

**Detection:**
- Chrome DevTools Performance tab: Look for `updateProbePulses` taking >10% of frame time
- Console log frame times: `if (deltaTime > 32) console.warn('Frame drop:', deltaTime)`
- Test with 30 probes in Asteroid Field (worst case: highest probe damage checks)

**Phase to address:** Phase 2 (Signals & Visuals) - implement caching when adding spawn logic

---

## Moderate Pitfalls

Mistakes that cause delays, confusion, or technical debt.

### Pitfall 6: Inconsistent Visual Coding Between Sector Types
**What goes wrong:** Each sector-exclusive signal needs distinct visual (color, radius, glow). Developers pick colors ad-hoc: Relic is purple, Crystalline is blue, but Astral Echo is... also blue? Overlapping visuals make signals indistinguishable.

**Why it happens:**
- No visual design guide for sector signals
- Colors picked to "look cool" without considering existing palette
- Canvas rendering uses alpha blending - similar colors blend together
- Colorblind players can't distinguish purple/blue signals

**Prevention:**
1. **Define visual palette upfront:**
   ```javascript
   const SECTOR_SIGNAL_VISUALS = {
       'relic': { color: '#9370DB', glow: '#DDA0DD', radius: 10, icon: '🏛️' },
       'crystalline': { color: '#00CED1', glow: '#40E0D0', radius: 12, icon: '💠' },
       'dataCache': { color: '#32CD32', glow: '#98FB98', radius: 9, icon: '📦' },
       'astralEcho': { color: '#FF1493', glow: '#FF69B4', radius: 14, icon: '🌟' },
       'asteroidChunk': { color: '#8B4513', glow: '#D2691E', radius: 8, icon: '☄️' }
   };
   ```

2. **Use distinct hue ranges:**
   - Relic: Purple (270°)
   - Crystalline: Cyan (180°)
   - Data Cache: Green (120°)
   - Astral Echo: Magenta (300°)
   - Asteroid Chunk: Orange (30°)
   - Minimum 60° separation for colorblind accessibility

3. **Test in monochrome:**
   - Convert canvas to grayscale (CSS filter)
   - Signals should still be distinguishable by size/glow intensity

**Detection:**
- Screenshot sector with 10+ signals, send to colorblind simulator
- User feedback: "Can't tell which signals are which"
- Compare signal colors to existing rarity colors (don't overlap)

**Phase to address:** Phase 2 (Signals & Visuals) - define palette before implementing visuals

---

### Pitfall 7: Sector Discovery Message Overload
**What goes wrong:** Discovery modal shows bonus signals, sector type, specialty, AND new tutorial about exclusives. 5+ messages on screen: "Sector discovered! +1 RP! Relic signals found! Ancient sector has artifacts! Click relics to collect!" Player overwhelmed, clicks through without reading.

**Why it happens:**
- Each system (sector, tutorial, signals, research) emits its own message
- No message priority or queuing
- Discovery is rare (exciting moment) so devs want to explain everything
- Messages overlap: sector modal + tutorial panel + event log

**Prevention:**
1. **Message queue system:**
   ```javascript
   class MessageQueue {
       constructor() {
           this.queue = [];
           this.showing = false;
       }

       enqueue(message, priority = 0) {
           this.queue.push({ message, priority });
           this.queue.sort((a, b) => b.priority - a.priority);
           this.showNext();
       }

       showNext() {
           if (this.showing || this.queue.length === 0) return;
           // Show top message, set timeout to show next
       }
   }
   ```

2. **Consolidate discovery messages:**
   - Sector modal: Sector name, type, specialty, bonus signals (ONE modal)
   - Tutorial: Only show if first time discovering THIS sector type
   - Event log: Single line "Ancient Sector discovered: Relics available"

3. **Priority hierarchy:**
   - P1: Critical errors (save failed)
   - P2: Discovery modals (sector found)
   - P3: Tutorial messages (how to collect)
   - P4: Event log (resources gained)

**Detection:**
- Count messages shown in 5 seconds after discovery
- If >3, consolidate
- User testing: "Did you read the sector discovery message?" If no, too much info

**Phase to address:** Phase 3 (Discovery UI) - consolidate messages when implementing reveal

---

### Pitfall 8: Forgetting to Update Reward Calculations
**What goes wrong:** Sector-exclusive signals give normal rewards (5/10/20/40/100 by rarity). But they're RARER (only spawn in 1 sector type). Players get same rewards for more effort = feels unrewarding. Or devs boost rewards too much, breaking economy (legendary relics give 1000 artifacts).

**Why it happens:**
- Copied reward structure from normal signals without thinking
- "It's just a reskin" mentality
- No economic model for exclusive vs normal signal value
- Exotic minerals already exist for rare rewards, but aren't used for exclusives

**Prevention:**
1. **Value exclusives higher than normal:**
   ```javascript
   const SIGNAL_REWARDS = {
       // Normal signals (spawn anywhere)
       'mineral': { common: 5, uncommon: 10, rare: 20, epic: 40, legendary: 100 },

       // Sector-exclusive signals (1.5x multiplier)
       'relic': { common: 8, uncommon: 15, rare: 30, epic: 60, legendary: 150 },
       'crystalline': { common: 8, uncommon: 15, rare: 30, epic: 60, legendary: 150 },
   };
   ```

2. **Add unique reward types:**
   - Relics give artifacts + exotic minerals
   - Crystalline gives minerals + data (hybrid)
   - Data Caches give data + research points
   - Asteroid Chunks give minerals + damage probe (risk/reward)

3. **Playtest economy:**
   - Track time to gather 100 artifacts: Normal sectors vs Ancient sectors
   - If Ancient is 2x slower for same rewards, boost exclusives
   - Goal: 20-30% faster in specialized sectors

**Prevention:**
- Spreadsheet: Resource gain per hour by sector type
- If variance >50%, economy is broken
- Test with and without shell bonuses (shouldn't break progression)

**Phase to address:** Phase 2 (Signals & Visuals) - balance rewards during implementation

---

### Pitfall 9: Tutorial Doesn't Teach Sector Specialization
**What goes wrong:** Player discovers Ancient sector, sees "Relics available!" but doesn't understand: What are relics? How do I get them? Do I need special equipment? Why should I care? Explores randomly, misses sector optimization strategy.

**Why it happens:**
- Tutorial teaches initial mechanics (deploy probes, collect signals) but not advanced strategy
- Sector specialization is mid-game feature (after 2-3 sectors explored)
- No explicit "Sector Strategy 101" tutorial step
- Assumes players read discovery modal (they don't)

**Prevention:**
1. **Add sector specialization tutorial step:**
   ```javascript
   tutorialSteps.push({
       id: 'sector_specialization',
       trigger: 'First non-Standard sector discovered',
       message: `
           <h3>🎯 Sector Specialization</h3>
           <p>Each sector type has <strong>unique signals</strong> that only spawn there!</p>
           <p>Ancient sectors have <strong>Relic</strong> signals (purple). These give bonus artifacts!</p>
           <p>💡 Tip: Return to specialized sectors to farm exclusive resources.</p>
       `,
       dismissable: true
   });
   ```

2. **Show first exclusive signal capture:**
   - When player collects first relic, pause game briefly
   - Show tooltip: "✨ You collected a Relic! These are exclusive to Ancient sectors."
   - Link to sector map: "Mark Ancient sectors for repeat visits"

3. **Add sector legend to minimap:**
   - Color code sectors by type on minimap
   - Hover tooltip: "Ancient Sector - Relics (artifacts)"
   - Visual reminder of where to go for specific resources

**Detection:**
- User testing: "How would you farm artifacts quickly?"
- If answer doesn't mention Ancient sectors, tutorial failed
- Track player behavior: Do they revisit specialized sectors?

**Phase to address:** Phase 3 (Discovery UI) - add tutorial when implementing reveal system

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 10: Sector-Exclusive Signals Spawning at Sector Borders
**What goes wrong:** Probe pulse at edge of Ancient sector (coords: 1919, 540) spawns signal at (1950, 560) = next sector over (Standard type). Relic signal appears in Standard sector, breaking immersion and causing confusion.

**Why it happens:**
- Signal spawn: `signalX = probe.x + (Math.random() - 0.5) * 160`
- Pulse radius: 80 pixels, signal spawn radius: 160 pixels
- Sector border: x=1920 (sector 1|2 boundary)
- Probe at 1919 can spawn signal up to 1919+80 = 1999 (next sector)

**Prevention:**
```javascript
function spawnSectorExclusiveSignal(probe, sectorType) {
    const sector = getCurrentSector(probe);
    const sectorBounds = getSectorBounds(sector);

    let signalX, signalY;
    let attempts = 0;

    // Try up to 10 times to spawn within sector bounds
    do {
        signalX = probe.current.x + (Math.random() - 0.5) * 160;
        signalY = probe.current.y + (Math.random() - 0.5) * 160;
        attempts++;
    } while (!isPointInSector(signalX, signalY, sector) && attempts < 10);

    // If all attempts failed, clamp to sector bounds
    if (!isPointInSector(signalX, signalY, sector)) {
        signalX = Math.max(sectorBounds.minX, Math.min(sectorBounds.maxX, signalX));
        signalY = Math.max(sectorBounds.minY, Math.min(sectorBounds.maxY, signalY));
    }

    // Spawn signal...
}
```

**Detection:**
- Visual test: Fly probe along sector border, watch signal spawns
- Log signal coords vs sector coords: "Relic spawned at (1950, 540) - Sector (1, 0) bounds (0-1920)"
- User reports: "Found relic in Standard sector, is this a bug?"

**Phase to address:** Phase 2 (Signals & Visuals) - add bounds checking during spawn

---

### Pitfall 11: No Feedback When Collector Can't Gather Exclusive
**What goes wrong:** Player has mineral collector (no artifact collection). Flies through Ancient sector, relics ignored. No message, no visual cue. Player thinks auto-collect is broken or relics are bugged.

**Why it happens:**
- Auto-collect filters silently: `if (!canCollect) return;`
- No "Cannot collect [signal]" message
- Player expects collectors to show SOME feedback
- Visual: Probe flies through signal with no effect (looks like bug)

**Prevention:**
1. **Visual cue for incompatible signals:**
   ```javascript
   // In rendering, dim signals the probe can't collect
   if (probeHasCollector && !canCollectThisSignal) {
       ctx.globalAlpha = 0.3; // Dim incompatible signals
       ctx.strokeStyle = '#ff0000'; // Red outline
   }
   ```

2. **Show tooltip on hover:**
   - Hover signal: "Relic (Artifact) - Requires: Artifact Collector or Universal Collector"
   - Player learns what equipment is needed

3. **One-time message:**
   - First time probe ignores exclusive signal: "💡 Your probe can't collect Relics. Equip an Artifact Collector!"
   - Only show once per signal type (don't spam)

**Detection:**
- User confusion: "Why isn't my probe collecting these purple signals?"
- Check UI for any indication of collection requirements
- Test with various collector combinations

**Phase to address:** Phase 4 (Polish) - add during final feedback pass

---

### Pitfall 12: Signals Despawn Before Sector Discovery Completes
**What goes wrong:** Sector discovery modal appears (pauses time), bonus signals spawn, player reads modal for 10 seconds, clicks OK. Bonus signals already despawned (4 second duration). Player sees "Signals detected!" but screen is empty.

**Why it happens:**
- Discovery modal doesn't pause signal timers
- Bonus signals spawn when sector explored (timestamp: now)
- Player reads modal (10 seconds)
- Signals check `Date.now() - createdAt > duration` → expired
- Cleared from array before player can collect

**Prevention:**
1. **Pause signal timers during modals:**
   ```javascript
   // When modal opens
   gameState.signals.forEach(signal => {
       signal.pausedAt = Date.now();
   });

   // When modal closes
   gameState.signals.forEach(signal => {
       if (signal.pausedAt) {
           const pauseDuration = Date.now() - signal.pausedAt;
           signal.createdAt += pauseDuration; // Extend lifetime
           delete signal.pausedAt;
       }
   });
   ```

2. **Longer duration for discovery bonuses:**
   ```javascript
   const signal = {
       // ...
       duration: 10000, // 10 seconds instead of 4
       isDiscoveryBonus: true
   };
   ```

3. **Spawn after modal closes:**
   ```javascript
   // Instead of spawning during discoverSector()
   this.eventBus.on('modal:closed', (data) => {
       if (data.modalType === 'sectorDiscovery') {
           spawnDiscoveryBonusSignals(data.sector);
       }
   });
   ```

**Detection:**
- Test: Discover sector, wait 15 seconds in modal, check if signals still visible
- User reports: "Got signal notification but nothing on screen"
- Console log: "Cleared [signal] - expired"

**Phase to address:** Phase 3 (Discovery UI) - fix when implementing modal

---

## Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| Phase 1 | Foundation | Save migration breaks old signals | Add defensive checks, test old saves |
| Phase 1 | Foundation | Spawn logic conflicts (exclusive vs normal) | Define architecture first, separate spawn pools |
| Phase 2 | Signals & Visuals | Auto-collection ignores new types | Map exclusive types to base types |
| Phase 2 | Signals & Visuals | Performance from sector checks | Cache sector lookups, batch spawn tables |
| Phase 2 | Signals & Visuals | Inconsistent visual design | Define palette upfront, test colorblind |
| Phase 2 | Signals & Visuals | Reward economy broken | Playtest values, track resource gain rates |
| Phase 3 | Discovery UI | Discovery modal overload | Consolidate messages, priority queue |
| Phase 3 | Discovery UI | Wrong sector specialty shown | Update modal with exclusive details |
| Phase 3 | Discovery UI | Tutorial doesn't teach strategy | Add sector specialization step |
| Phase 3 | Discovery UI | Bonus signals despawn during modal | Pause signal timers or spawn after modal |
| Phase 4 | Polish | No feedback for incompatible collectors | Dim signals, show tooltip with requirements |
| Phase 4 | Polish | Signals spawn outside sector bounds | Add bounds checking, clamp to sector |

---

## Integration Pitfalls Specific to Probetheus

### Shell Bonus Interactions
**Risk:** `rareSignalChance` and `dataSignalDiscovery` shell bonuses were designed for normal signal system. Do they apply to sector-exclusives? If yes, do they break spawn rates?

**Mitigation:**
- Decide: Should shell bonuses affect sector-exclusives?
- Option A: No bonus (exclusives are raw sector property)
- Option B: Bonus applies (makes shells more valuable)
- Document decision in code comments

**Where:** Phase 2 - when implementing spawn logic

---

### Equipment System Edge Cases
**Risk:** Equipment slots limited to 2 (upgradeable to 3). If player needs artifact collector for relics + universal collector for everything else, slots become limiting. Creates "collector swapping" meta (unfun).

**Mitigation:**
- Ensure exclusive signals map to base types (relic = artifact)
- Universal collector should work on exclusives out-of-box
- Test 2-slot equipment can handle all signal types in a sector

**Where:** Phase 2 - validate equipment system compatibility

---

### Research Tree Unlocks
**Risk:** Rarity research (`minerals_uncommon`, `data_rare`, etc.) gates auto-collection. Do sector-exclusives follow same gating? Can common relic be collected with base artifact collector, or does it need `artifacts_uncommon`?

**Mitigation:**
- Sector-exclusives should follow same rarity gating as base types
- Relic (common) requires artifact collector + common unlock
- Relic (rare) requires artifact collector + `artifacts_rare` research
- No NEW research required (simplicity)

**Where:** Phase 1 - define during architecture planning

---

## Sources

- **Architecture analysis:** ProbeManager.js (signal generation logic lines 431-532)
- **Save system:** SaveManager.js (migration patterns lines 529-546)
- **Sector system:** SectorManager.js (discovery and bonus spawning lines 511-582)
- **Signal types:** ProbeManager.js (determineSignalType lines 577-619)
- **Auto-collection:** ProbeManager.js (collection filtering lines 666-883)
- **Equipment system:** ProbeManager.js (equipment array handling lines 100, 132, 179-185)
- **Shell bonuses:** ShellSystem.js (bonus type definitions lines 8-21)
- **Research gating:** GameState.js (research tree structure lines 62-528)
- **Existing patterns:** 21 test files analyzed for error handling and edge case coverage

**Confidence:** HIGH - based on direct codebase analysis, existing system architecture, and patterns from 181 passing tests
