# Probe Cargo Capacity System

## 🎯 Current State

**No Cargo Limit:**
- Probes can carry unlimited resources
- Line 1358 in GameController.js: `nearestProbe.cargo[primaryReward] += rewardAmount;`
- No check for capacity before adding
- Makes cargo meaningless strategically

## 📦 Proposed Cargo System

### Base Cargo Capacity

**Default Probe Stats:**
```javascript
probe: {
  cargo: {
    minerals: 0,
    data: 0,
    artifacts: 0,
    exoticMinerals: 0
  },
  cargoCapacity: 100, // NEW: Total capacity
  cargoUsed: 0        // NEW: Current cargo weight
}
```

**Cargo Weight System:**
- Each resource has weight:
  - Minerals: 1 weight per unit
  - Data: 1 weight per unit
  - Artifacts: 2 weight per unit (heavier)
  - Exotic Minerals: 3 weight per unit (very heavy)

**Capacity Calculation:**
```javascript
function getCargoUsed(probe) {
  return (
    probe.cargo.minerals * 1 +
    probe.cargo.data * 1 +
    probe.cargo.artifacts * 2 +
    probe.cargo.exoticMinerals * 3
  );
}

function getCargoCapacity(probe) {
  let capacity = 100; // Base capacity
  
  // Check equipped modules
  if (probe.equipment) {
    probe.equipment.forEach(module => {
      if (module === 'cargo_expander_mk1') capacity += 50;
      if (module === 'cargo_expander_mk2') capacity += 100;
      if (module === 'cargo_expander_mk3') capacity += 200;
    });
  }
  
  return capacity;
}
```

### Signal Collection with Capacity Check

**Modified explore() function:**
```javascript
explore(mode) {
  // ... existing code to calculate rewards ...
  
  const nearestProbe = this.findNearestActiveProbe(signal.x, signal.y);
  
  if (nearestProbe) {
    // Initialize cargo if needed
    if (!nearestProbe.cargo) {
      nearestProbe.cargo = {
        minerals: 0,
        data: 0,
        artifacts: 0,
        exoticMinerals: 0
      };
    }
    
    // NEW: Check if probe has capacity
    const currentWeight = this.getCargoUsed(nearestProbe);
    const maxCapacity = this.getCargoCapacity(nearestProbe);
    const rewardWeight = this.calculateResourceWeight(primaryReward, rewardAmount);
    
    if (currentWeight + rewardWeight > maxCapacity) {
      // CARGO FULL!
      this.eventBus.emit('ui:message', {
        text: `Probe ${nearestProbe.id} cargo full! (${currentWeight}/${maxCapacity}). Wait for return or equip Cargo Expander.`,
        type: 'warning'
      });
      
      // Don't add to cargo, signal remains (can collect later)
      return;
    }
    
    // Add to cargo (has capacity)
    nearestProbe.cargo[primaryReward] += rewardAmount;
    if (exoticBonus > 0) {
      nearestProbe.cargo.exoticMinerals += exoticBonus;
    }
    
    console.log(`Probe ${nearestProbe.id} cargo: ${currentWeight + rewardWeight}/${maxCapacity}`);
  }
}
```

### Visual Feedback

**Probe Detail Panel:**
```
═══════════════════════════════════
  PROBE: Explorer-7
═══════════════════════════════════
  Status: Exploring
  Position: Sector 234.567
  
  Cargo: 78 / 100
  [████████░░] 78%
  
  • Minerals: 45 (45 weight)
  • Data: 23 (23 weight)
  • Artifacts: 5 (10 weight)
  
  Equipment:
  [Slot 1] Signal Amplifier
  [Slot 2] [Empty]
  [Slot 3] [Empty]
═══════════════════════════════════
```

**Minimap Probe Icon:**
- Green: < 50% cargo
- Yellow: 50-90% cargo
- Red: > 90% cargo (almost full)
- Flashing red: 100% cargo (return now!)

### Strategic Gameplay

**Player Decisions:**
1. **Route Planning**: 
   - How many signals can probe collect before returning?
   - Should I send probe back early if high-value signal appears?

2. **Equipment Choices**:
   - Cargo Expander (+100 capacity) vs Speed Booster (+50% speed)?
   - Trade-off: Carry more vs travel faster

3. **Resource Prioritization**:
   - Artifacts weigh more (2x) - worth the capacity cost?
   - Should I skip artifact signals to save space for minerals?

4. **Return Timing**:
   - Probe at 90% cargo - continue route or return early?
   - Risk missing signals vs delivering what I have

### Equipment Module: Cargo Expander

**Research Path:**
```
Cargo Management Branch:
├── Cargo Expander Mk.I (50 RP)
│   +50 capacity (100 → 150)
│
├── Cargo Expander Mk.II (100 RP)
│   +100 capacity (100 → 200)
│
└── Cargo Expander Mk.III (250 RP)
    +200 capacity (100 → 300)
```

**Echo Benefit Integration:**
One of the echoes could unlock:
- **"Prometheus Cargo Hold"** - All probes gain +100 base capacity (permanent)
- Or: **"Efficient Packing Protocol"** - All resources weigh 50% less

### Auto-Collection with Capacity

**Behavior:**
- Auto-collection still works
- But probe must have capacity
- If full: Signal stays on map, probe ignores it
- Message: "Probe-3 cargo full, couldn't auto-collect signal"

**Smart Auto-Collect:**
- Research upgrade: "Priority Auto-Collection"
- Skips lower rarity signals if cargo getting full
- Saves space for rare/epic signals

## 📊 Balancing Numbers

### Base Capacity: 100 units

**Signal Rewards (Estimated):**
- Common: 5-10 resources (5-10 weight)
- Uncommon: 10-20 resources (10-20 weight)
- Rare: 20-40 resources (20-40 weight)
- Epic: 40-80 resources (40-80 weight)
- Legendary: 80-150 resources (80-150 weight)

**Probe Route Capacity:**
With 100 capacity, probe can collect:
- ~10 common signals (10 * 5-10 weight)
- ~5 uncommon signals
- ~2-3 rare signals
- ~1-2 epic signals

**With Cargo Expander Mk.III (300 capacity):**
- ~30 common signals
- ~15 uncommon signals
- ~7 rare signals
- ~5 epic signals

### Tuning Recommendations

**If players find it too restrictive:**
- Increase base capacity: 100 → 150
- Reduce artifact weight: 2 → 1.5
- Add more cargo expander tiers

**If players find it too generous:**
- Decrease base capacity: 100 → 75
- Increase legendary weight: 1 → 2 per resource
- Make expanders more expensive

## 🎮 Player Experience

### Early Game (No Expanders)
- Player learns capacity exists
- Must return to hub more frequently
- Creates rhythm: Deploy → Explore → Return → Deploy

### Mid Game (Expander Mk.I-II)
- Can stay out longer
- Still must manage capacity
- Strategic decisions matter

### Late Game (Expander Mk.III + Echo Bonus)
- 300-400 total capacity
- Can handle long routes
- Still caps on legendary signals (150 weight each)

## 🔧 Implementation Checklist

**Phase 1: Core System**
- [ ] Add `cargoCapacity` and `cargoUsed` to probe object
- [ ] Implement weight calculation function
- [ ] Add capacity check before adding to cargo
- [ ] Display cargo bar in probe detail panel
- [ ] Show warning when probe near capacity

**Phase 2: Visual Feedback**
- [ ] Color-code probe icons by cargo level
- [ ] Add cargo percentage to probe tooltip
- [ ] Flash red when probe at 100%
- [ ] Show "CARGO FULL" indicator on map

**Phase 3: Equipment**
- [ ] Create Cargo Expander Mk.I-III research nodes
- [ ] Implement equipment application to capacity
- [ ] Add equipment UI to probe detail panel
- [ ] Test balance with different capacities

**Phase 4: Auto-Collection Integration**
- [ ] Skip auto-collect if probe full
- [ ] Show message when skipped
- [ ] (Optional) Priority system for rare signals

**Phase 5: Echo Integration**
- [ ] Add cargo-related echo benefit
- [ ] Test with endgame progression
- [ ] Balance capacity with echo rewards

## ❓ Discussion Questions

1. **Base Capacity:** Is 100 units the right starting point?
2. **Artifact Weight:** Should artifacts be 2x heavier or same as minerals/data?
3. **Visual Feedback:** Color-coded probe icons helpful or cluttered?
4. **Equipment Slots:** If cargo expander takes 1 slot, is that worth it vs speed/range?
5. **Auto-Collection:** Should it skip signals when full or try to collect anyway?
6. **Echo Benefit:** Which is better - +100 base capacity OR resources weigh 50% less?
7. **Late Game:** With max upgrades, should capacity feel "solved" or still matter?

## 💡 Alternative: Unlimited Cargo with Speed Penalty

**Different Approach:**
- No hard capacity limit
- But: Cargo slows down probe
- Formula: `speed = baseSpeed * (1 - cargoUsed/1000)`
- Example: 500 cargo = 50% speed penalty

**Pros:**
- Never blocks collection
- Creates smooth tradeoff
- More forgiving for new players

**Cons:**
- Less strategic (no hard decisions)
- Slower return trips annoying
- Harder to balance

**Recommendation:** Start with hard capacity (more strategic), can soften if too punishing.

---

**Current Answer:** No cargo limit exists. Proposal above adds 100 base capacity with equipment-based expansion. Creates strategic decisions around resource collection and probe loadouts.
