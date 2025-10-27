# Revised Endgame: Resource-Driven Echo Discovery

## 🎯 Core Design Changes

### Key Simplifications
1. ❌ **No hub-specific inventory** - Single global inventory only
2. ✅ **Equipment/Module system** - Research unlocks equippable items
3. ✅ **Resource-specific research paths** - Separate trees for minerals/data/artifacts
4. ✅ **Echo discovery via milestones** - 100k of each resource type reveals echo
5. ✅ **Fewer echoes required** - Only 5 needed to unlock portal coordinates

---

## 📊 Revised Research Tree: Auto-Collection

### Current Problem
- "Universal Collector" is redundant (just having all 3 unlocks the same thing)
- Catch-all rarities (uncommon, rare, exotic) are vague
- Not specific enough to resource types

### New Structure: Resource-Specific Paths

```
AUTO-COLLECTION RESEARCH TREE
═════════════════════════════════════════════════════════════

MINERALS PATH (Top):
┌──────────────────────────────────────────────────────────┐
│ Auto-Collect     Auto-Collect      Auto-Collect         │
│ Common     →     Uncommon     →    Rare          →      │
│ Minerals         Minerals          Minerals             │
│ (10 RP)          (25 RP)           (50 RP)              │
│                                                          │
│ Auto-Collect     Auto-Collect                           │
│ Epic        →    Legendary                              │
│ Minerals         Minerals                               │
│ (100 RP)         (250 RP)                               │
└──────────────────────────────────────────────────────────┘

DATA PATH (Middle):
┌──────────────────────────────────────────────────────────┐
│ Auto-Collect     Auto-Collect      Auto-Collect         │
│ Common     →     Uncommon     →    Rare          →      │
│ Data             Data              Data                 │
│ (10 RP)          (25 RP)           (50 RP)              │
│                                                          │
│ Auto-Collect     Auto-Collect                           │
│ Epic        →    Legendary                              │
│ Data             Data                                   │
│ (100 RP)         (250 RP)                               │
└──────────────────────────────────────────────────────────┘

ARTIFACTS PATH (Bottom):
┌──────────────────────────────────────────────────────────┐
│ Auto-Collect     Auto-Collect      Auto-Collect         │
│ Common     →     Uncommon     →    Rare          →      │
│ Artifacts        Artifacts         Artifacts            │
│ (10 RP)          (25 RP)           (50 RP)              │
│                                                          │
│ Auto-Collect     Auto-Collect                           │
│ Epic        →    Legendary                              │
│ Artifacts        Artifacts                              │
│ (100 RP)         (250 RP)                               │
└──────────────────────────────────────────────────────────┘

Total RP to max all: 1,305 (435 per path)
```

### Benefits
- ✅ Clear progression per resource type
- ✅ Player can focus on one resource first
- ✅ No redundant "universal" node
- ✅ Each unlock is meaningful
- ✅ Specific equipment items per research

---

## 🎛️ Equipment/Module System

### How It Works

**Research unlocks equipment items that must be equipped to work**

**Example Flow:**
1. Player researches "Auto-Collect Common Minerals" (10 RP)
2. Equipment item created: **"Mineral Scanner Module Mk.I"**
3. Player equips it on probes (or globally?)
4. Probes now auto-collect common mineral signals

**Equipment Types:**

**Auto-Collection Modules:**
- Mineral Scanner Mk.I through Mk.V (common → legendary)
- Data Scanner Mk.I through Mk.V
- Artifact Scanner Mk.I through Mk.V

**Probe Upgrades:**
- Signal Amplifier (+50% signal detection range)
- Long-Range Antenna (+100% probe travel range)
- Cargo Expander (+50% resource capacity)
- Velocity Booster (+50% movement speed)

**Hub Upgrades:**
- Probe Dock Expansion (5 → 8 probes)
- Shuttle Dock Expansion (3 → 6 shuttles)
- Signal Beacon (+100% signal spawn in sector)
- Command Relay (all probes get +25% stats)

**Mining Station Upgrades:**
- Efficiency Catalyst (+50% Probethium production)
- Deep Core Drill (+100% mining speed)
- Resource Optimizer (-25% supply cost)

### Global vs Individual Equipment

**Option A: Global Equipment (Simpler)**
- Research unlocked = automatically applied to all entities
- No management needed
- Just unlock and forget

**Option B: Per-Entity Equipment (More Strategic)**
- Each probe/hub can equip limited modules
- 3 slots per entity
- Strategic choices: Speed vs cargo vs collection

**Recommendation: Option A for auto-collection, Option B for upgrades**
- Auto-collection: Global (once researched, all probes get it)
- Upgrades: Per-entity (choose which probes get speed boost, which get range)

---

## 📡 Revised Echo System

### Discovery Mechanism

**Milestone-Based Discovery:**
- Collect 100,000 Minerals → **Mineral Echo appears on map**
- Collect 100,000 Data → **Data Echo appears on map**
- Collect 100,000 Artifacts → **Artifact Echo appears on map**

**Each milestone can trigger multiple echoes:**
- 3 echoes per resource type
- 9 total echoes available
- Only 5 required to unlock portal coordinates

### Echo Pool (9 Echoes, Pick 5)

#### MINERAL ECHOES (Triggered by 100k Minerals)

**Echo Alpha: The Mining Directive**
- **Cost**: 200 Probethium
- **Benefit**: **Deep Mining Protocol**
  - Mining stations produce 50% more Probethium
  - Unlock "Probethium Vein" signal (rare, 10P instant)
- **Lore**: Science officer's logs about Probethium's nature
- **Coordinate Fragment**: `█ 4 7 . █ █ █ █`

**Echo Beta: The Hull Integrity Report**
- **Cost**: 250 Probethium
- **Benefit**: **Structural Reinforcement**
  - Probes can travel 25% further before returning
  - Shuttles carry 50% more cargo
- **Lore**: Engineering reports on ship damage
- **Coordinate Fragment**: `6 █ █ . 2 █ █ █`

**Echo Gamma: The Resource Manifest**
- **Cost**: 300 Probethium
- **Benefit**: **Salvage Operations**
  - 25% chance to get double resources from signals
  - Unlock "Resource Cache" signal (uncommon, guaranteed high yield)
- **Lore**: Cargo bay logs listing Prometheus supplies
- **Coordinate Fragment**: `█ █ █ . █ 9 3 4`

---

#### DATA ECHOES (Triggered by 100k Data)

**Echo Delta: The Navigation Logs**
- **Cost**: 250 Probethium
- **Benefit**: **Quantum Navigation**
  - All probes move 50% faster
  - Probe routes auto-optimize for efficiency
- **Lore**: Captain's navigation charts showing the rift
- **Coordinate Fragment**: `█ █ 7 . 2 █ █ █`

**Echo Epsilon: The Research Archives**
- **Cost**: 300 Probethium
- **Benefit**: **Knowledge Synthesis**
  - Gain 50% more Research Points from all sources
  - Unlock "Data Trove" signal (rare, high RP reward)
- **Lore**: Dr. Chen's research on the void
- **Coordinate Fragment**: `6 4 █ . █ █ █ █`

**Echo Zeta: The Communication Protocols**
- **Cost**: 350 Probethium
- **Benefit**: **Network Synchronization**
  - All hubs share signal detection (see signals from any hub)
  - +25% signal spawn rate globally
- **Lore**: Communication officer's attempts to contact Hub-7
- **Coordinate Fragment**: `█ █ █ . █ █ 3 █`

---

#### ARTIFACT ECHOES (Triggered by 100k Artifacts)

**Echo Eta: The Crew Manifest**
- **Cost**: 300 Probethium
- **Benefit**: **Legacy Protocols**
  - Probes named after Prometheus crew members
  - Each probe gains specialization: Scout/Hauler/Guardian
  - Crew morale system: Long-running probes get bonus stats
- **Lore**: Personnel files showing 847 souls aboard
- **Coordinate Fragment**: `█ █ █ . 2 9 █ █`

**Echo Theta: The Quantum Engine Schematics**
- **Cost**: 350 Probethium
- **Benefit**: **Quantum Acceleration**
  - Probes move 100% faster
  - Shuttles move 150% faster
  - Unlock "Temporal Anomaly" signal (epic, reality-bending rewards)
- **Lore**: Chief Engineer's final entry about quantum drive
- **Coordinate Fragment**: `6 █ 7 . █ █ █ 4`

**Echo Iota: The Captain's Final Message**
- **Cost**: 400 Probethium
- **Benefit**: **Captain's Authority**
  - Unlock all hub specializations simultaneously
  - Buildings construct 50% faster
  - Unlock "Distress Beacon" signal (legendary, massive rewards)
- **Lore**: Captain Martinez's farewell and coordinates hint
- **Coordinate Fragment**: `█ 4 █ . █ 9 █ █`

---

### Coordinate Assembly

**Complete Coordinates:** `647.2934`

**How It Works:**
- Each echo reveals 4 digits (some are blanks: █)
- Need exactly 5 echoes to fill in all 8 digits
- Different combinations of 5 echoes complete the puzzle
- System checks if all 8 positions have at least one non-blank

**Example Combinations:**

**Combo 1: Alpha + Delta + Epsilon + Eta + Theta**
```
█ 4 7 . █ █ █ █  (Alpha)
█ █ 7 . 2 █ █ █  (Delta)
6 4 █ . █ █ █ █  (Epsilon)
█ █ █ . 2 9 █ █  (Eta)
6 █ 7 . █ █ █ 4  (Theta)
─────────────────
6 4 7 . 2 9 3 4  ✓ COMPLETE
```

**Combo 2: Beta + Zeta + Gamma + Iota + Epsilon**
```
6 █ █ . 2 █ █ █  (Beta)
█ █ █ . █ █ 3 █  (Zeta)
█ █ █ . █ 9 3 4  (Gamma)
█ 4 █ . █ 9 █ █  (Iota)
6 4 █ . █ █ █ █  (Epsilon)
─────────────────
6 4 7 . 2 9 3 4  ✓ COMPLETE
```

**System Logic:**
```javascript
function checkCoordinatesComplete(decodedEchoes) {
  const fragments = {
    alpha:   [null, 4, 7, null, null, null, null, null],
    beta:    [6, null, null, 2, null, null, null, null],
    gamma:   [null, null, null, null, 9, 3, 4, null],
    delta:   [null, null, 7, 2, null, null, null, null],
    epsilon: [6, 4, null, null, null, null, null, null],
    zeta:    [null, null, null, null, null, 3, null, null],
    eta:     [null, null, null, 2, 9, null, null, null],
    theta:   [6, null, 7, null, null, null, 4, null],
    iota:    [null, 4, null, null, 9, null, null, null]
  };
  
  const combined = [null, null, null, null, null, null, null, null];
  
  decodedEchoes.forEach(echoName => {
    const fragment = fragments[echoName];
    fragment.forEach((digit, index) => {
      if (digit !== null) {
        combined[index] = digit;
      }
    });
  });
  
  // Check if all positions filled
  return combined.every(digit => digit !== null);
}
```

**UI Display:**
```
═══════════════════════════════════════
  PROMETHEUS COORDINATES
═══════════════════════════════════════
  
  Status: INCOMPLETE (3/5 Echoes)
  
  Current Fragment:
  
  6 4 7 . 2 █ █ █
  
  Need: 2 more echoes
  
  Echoes Decoded:
  ✓ Alpha - Mining Directive
  ✓ Delta - Navigation Logs
  ✓ Epsilon - Research Archives
  
  Available to Decode:
  • Beta - Hull Integrity (250P)
  • Gamma - Resource Manifest (300P)
  • Zeta - Communication (350P)
  ...
═══════════════════════════════════════
```

---

## 🎯 Progression Flow

### Early Game (Hours 1-10)
- Focus on building probe network
- Auto-collect common resources
- Resources accumulate naturally

### Mid Game (Hours 10-20)
- Reach 100k minerals → First echo ping appears!
- "SIGNAL DETECTED: Unusual transmission nearby..."
- Navigate to echo location, decode for 200-300P
- Immediate benefit + coordinate fragment
- Continue accumulating other resources

### Late Mid Game (Hours 20-30)
- Reach 100k data → Second resource milestone
- 2-3 more echoes available
- Reach 100k artifacts → Third resource milestone
- More echoes available
- Player chooses which echoes to decode based on benefits

### Late Game (Hours 30-35)
- Player has decoded 5 echoes
- Coordinate assembly complete: **647.2934**
- Golden waypoint appears on map
- "They're waiting for you..."
- Begin journey to portal

### Endgame (Hours 35-40)
- Build hub network toward coordinates
- Reach portal location
- Supply portal with shuttles
- Activation sequence → Reunion → Credits

---

## 💡 Key Benefits of This Design

### Resource Milestones
✅ Predictable discovery (100k thresholds)
✅ Rewards natural progression
✅ All three resources equally important
✅ Can't rush by focusing one resource

### Flexible Echo System
✅ 9 echoes available, only 5 needed
✅ Player choice in which to decode
✅ Multiple valid paths to completion
✅ Replayability (try different echo combos)

### Equipment/Module System
✅ Research unlocks are meaningful
✅ Auto-collection works globally (no micromanagement)
✅ Upgrades allow strategic customization
✅ Clear progression path

### Simplified Research Tree
✅ No redundant nodes
✅ Clear resource-specific paths
✅ Each unlock is impactful
✅ Easy to understand

---

## 🔧 Implementation Notes

### Echo Discovery System

**Tracking Resource Milestones:**
```javascript
class EchoDiscoverySystem {
  constructor(gameState, eventBus) {
    this.gameState = gameState;
    this.eventBus = eventBus;
    
    this.milestones = {
      minerals: { threshold: 100000, echoes: ['alpha', 'beta', 'gamma'], discovered: false },
      data: { threshold: 100000, echoes: ['delta', 'epsilon', 'zeta'], discovered: false },
      artifacts: { threshold: 100000, echoes: ['eta', 'theta', 'iota'], discovered: false }
    };
    
    this.discoveredEchoes = [];
  }
  
  checkMilestones() {
    const totalCollected = this.gameState.getTotalResourcesCollected();
    
    Object.entries(this.milestones).forEach(([resource, data]) => {
      if (!data.discovered && totalCollected[resource] >= data.threshold) {
        this.discoverEchos(resource, data.echoes);
        data.discovered = true;
      }
    });
  }
  
  discoverEchos(resourceType, echoIds) {
    console.log(`Milestone reached: 100k ${resourceType}!`);
    
    // Pick 1-3 random echoes from this resource type
    const count = Math.floor(Math.random() * 2) + 1; // 1-3 echoes
    const selectedEchoes = this.shuffleArray(echoIds).slice(0, count);
    
    selectedEchoes.forEach(echoId => {
      this.spawnEchoOnMap(echoId);
    });
    
    this.eventBus.emit('ui:message', {
      text: `Prometheus Signal Detected! ${count} echo(s) appeared on the map.`,
      type: 'important'
    });
  }
  
  spawnEchoOnMap(echoId) {
    // Spawn echo signal near player's network (not too far)
    const nearestHub = this.gameState.getNearestHub();
    const angle = Math.random() * Math.PI * 2;
    const distance = 500 + Math.random() * 1000; // 500-1500 units away
    
    const echo = {
      id: echoId,
      x: nearestHub.x + Math.cos(angle) * distance,
      y: nearestHub.y + Math.sin(angle) * distance,
      type: 'prometheus_echo',
      decoded: false,
      cost: this.getEchoCost(echoId)
    };
    
    this.gameState.entities.prometheusEchoes.push(echo);
    this.discoveredEchoes.push(echoId);
  }
}
```

### Equipment System

**Global Auto-Collection:**
```javascript
// Once researched, auto-collection is always on
function handleSignalCollection(signal, probe) {
  const autoCollectionLevel = gameState.research.autoCollection[signal.resourceType];
  
  // Check if this rarity is auto-collectable
  const rarityLevels = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const signalRarityIndex = rarityLevels.indexOf(signal.rarity);
  
  if (signalRarityIndex <= autoCollectionLevel) {
    // Auto-collect!
    autoCollectSignal(signal, probe);
  } else {
    // Manual click required
    showSignalPrompt(signal);
  }
}
```

**Per-Probe Equipment:**
```javascript
class ProbeEquipment {
  constructor(probe) {
    this.probe = probe;
    this.slots = [null, null, null]; // 3 equipment slots
    this.availableModules = [
      'signal_amplifier',
      'long_range_antenna',
      'cargo_expander',
      'velocity_booster'
    ];
  }
  
  equipModule(slotIndex, moduleId) {
    if (slotIndex < 0 || slotIndex > 2) return false;
    
    // Remove from other slot if already equipped
    this.slots = this.slots.map(slot => slot === moduleId ? null : slot);
    
    // Equip to new slot
    this.slots[slotIndex] = moduleId;
    
    // Apply benefits
    this.updateProbeStats();
  }
  
  updateProbeStats() {
    // Reset to base stats
    this.probe.resetStats();
    
    // Apply each equipped module's benefits
    this.slots.forEach(moduleId => {
      if (moduleId) {
        this.applyModuleBenefits(moduleId);
      }
    });
  }
}
```

---

## ❓ Questions for You

1. **Echo Count**: Is 5 echoes required the right amount? Too few? Too many?
2. **Resource Milestones**: 100k feel achievable? Should it be lower/higher?
3. **Echo Costs**: 200-400P appropriate for echo decoding?
4. **Equipment Slots**: 3 slots per probe too limiting? Too many?
5. **Auto-Collection**: Should it be global or per-probe?
6. **Echo Spawns**: Should echoes spawn close (500-1500 units) or can be anywhere?
7. **Multiple Echoes**: Should milestones spawn 1 echo or 1-3 random echoes?
8. **Research Tree**: Is the resource-specific path clear enough?

---

## 🎯 Summary

**Cleaner Design:**
- ✅ No hub inventory complexity
- ✅ Equipment makes research meaningful
- ✅ Resource milestones create clear goals
- ✅ Fewer echoes (5 vs 7) is more achievable
- ✅ Player choice in which echoes to pursue

**Better Gameplay:**
- ✅ Natural progression through resource collection
- ✅ Strategic decisions (which echoes? which equipment?)
- ✅ Clear upgrade paths (minerals → data → artifacts)
- ✅ Replayability (different echo combinations)

**Simpler Implementation:**
- ✅ Milestone tracking is straightforward
- ✅ Echo spawning reuses signal system
- ✅ Equipment system is modular
- ✅ Research tree is resource-specific

This is much more focused and achievable! What do you think? 🚀
