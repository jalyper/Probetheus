# Cargo Capacity System (Final - Clean Version)

## 🎯 Core Principle: Minimal Visual Clutter

**Cargo feedback through:**
1. ✅ **Speed penalty** (natural, animated feedback)
2. ✅ **Probe details panel** (detailed stats when clicked)
3. ❌ **NO visual indicators on map** (no dots, no colors, no blinks)

---

## 📦 Cargo System Basics

### Equal Weight for All Resources
```javascript
function getCargoUsed(probe) {
  return (
    probe.cargo.minerals +
    probe.cargo.data +
    probe.cargo.artifacts +
    probe.cargo.exoticMinerals
  );
}

function getCargoCapacity(probe) {
  let capacity = 100; // Base capacity
  
  // Check equipped modules
  if (probe.equipment) {
    if (probe.equipment.includes('cargo_expander_mk1')) capacity += 50;
    if (probe.equipment.includes('cargo_expander_mk2')) capacity += 100;
    if (probe.equipment.includes('cargo_expander_mk3')) capacity += 200;
  }
  
  return capacity;
}
```

### Capacity Levels
```
Base: 100 units
+ Mk.I Expander: 150 units
+ Mk.II Expander: 200 units
+ Mk.III Expander: 300 units
+ Echo Bonus (optional): +100 units
```

---

## 🏃 Speed-Based Feedback (Only Visual Indicator)

### Speed Penalty by Cargo Level

```javascript
function getProbeSpeed(probe) {
  const baseSpeed = probe.speed || 2.0;
  const cargoPercent = getCargoUsed(probe) / getCargoCapacity(probe);
  
  if (cargoPercent < 0.5) {
    return baseSpeed; // 0-50%: Full speed
  } else if (cargoPercent < 0.75) {
    return baseSpeed * 0.9; // 50-75%: 10% slower
  } else if (cargoPercent < 0.9) {
    return baseSpeed * 0.75; // 75-90%: 25% slower
  } else if (cargoPercent < 1.0) {
    return baseSpeed * 0.6; // 90-100%: 40% slower
  } else {
    return baseSpeed * 0.5; // 100%: 50% slower (FULL)
  }
}
```

### Speed Tiers
```
Cargo Level    →  Speed Modifier  →  Player Experience
────────────────────────────────────────────────────────
0-50%          →  100% speed      →  "Zippy, fast probe"
50-75%         →  90% speed       →  "Slightly sluggish"
75-90%         →  75% speed       →  "Noticeably slower"
90-100%        →  60% speed       →  "Heavy, dragging"
100% (FULL)    →  50% speed       →  "Crawling back!"
```

**Player Discovery:**
- Player doesn't realize cargo exists at first
- After a few routes: "Why is my probe moving slower?"
- Clicks probe → Sees cargo panel: "Oh! It's carrying 87/100!"
- Natural learning curve through gameplay

---

## 📊 Probe Details Panel

### Panel Layout (When Probe Clicked)

```
╔═══════════════════════════════════════════╗
║  PROBE: Explorer-7                        ║
╠═══════════════════════════════════════════╣
║  Status: Exploring                        ║
║  Position: Sector 234.567                 ║
║  Waypoint: 2 of 4                         ║
║                                           ║
║  ┌─────────────────────────────────────┐  ║
║  │  CARGO: 87 / 100                    │  ║
║  │  [████████░░] 87%                   │  ║
║  │                                     │  ║
║  │  Minerals:   45 units               │  ║
║  │  Data:       32 units               │  ║
║  │  Artifacts:  10 units               │  ║
║  │  Exotic:     0 units                │  ║
║  │                                     │  ║
║  │  ⚠️ Near capacity!                  │  ║
║  │  Speed reduced to 75%               │  ║
║  └─────────────────────────────────────┘  ║
║                                           ║
║  EQUIPMENT:                               ║
║  [Slot 1] Signal Amplifier                ║
║  [Slot 2] [Empty]                         ║
║  [Slot 3] [Empty]                         ║
║                                           ║
║  [Deploy] [Recall] [Upgrade]              ║
╚═══════════════════════════════════════════╝
```

### Dynamic Status Messages

**0-50% Cargo:**
```
Cargo: 35 / 100
[███░░░░░░░] 35%

Status: ✓ Plenty of space
```

**50-75% Cargo:**
```
Cargo: 63 / 100
[██████░░░░] 63%

Status: ⚠️ Getting full
Speed: 90% (slight slowdown)
```

**75-90% Cargo:**
```
Cargo: 82 / 100
[████████░░] 82%

Status: ⚠️ Nearly full!
Speed: 75% (noticeable slowdown)
Tip: Consider returning soon
```

**90-100% Cargo:**
```
Cargo: 97 / 100
[█████████░] 97%

Status: 🔴 Almost full!
Speed: 60% (heavy cargo)
Warning: May not fit next signal
```

**100% Full:**
```
Cargo: 100 / 100
[██████████] 100%

Status: 🚨 CARGO FULL!
Speed: 50% (maximum capacity)
Action Required: Return to hub or 
cannot collect more signals
```

### Hover Tooltip (Quick Info)

**When hovering over probe on map:**
```
┌──────────────────────┐
│ Explorer-7           │
│ Cargo: 87/100 (87%)  │
│ Speed: 75%           │
└──────────────────────┘
```

Simple, clean, informative.

---

## 🎮 Gameplay Flow

### Scenario: Player Route

**Start of Route:**
- Probe deployed, 0/100 cargo
- Moving at full speed
- Player doesn't think about cargo

**After 5 Common Signals (35 units):**
- Cargo: 35/100
- Speed: 100% (still fast)
- Player still doesn't notice

**After 10 Signals (78 units):**
- Cargo: 78/100
- Speed: 75% (slower)
- Player notices: "Hmm, probe seems slower..."
- Clicks probe → Sees cargo panel
- "Oh! It's 78% full!"

**After 12 Signals (94 units):**
- Cargo: 94/100
- Speed: 60% (very slow)
- Player: "Getting really slow, should check..."
- Clicks probe → Status: "🔴 Almost full!"
- Decision: "One more signal or return?"

**Encounters Legendary Signal (120 units):**
- Current: 94/100
- Legendary: 120 units
- Total would be: 214 units
- Capacity check: 214 > 100 ❌

**Message Popup:**
```
╔═════════════════════════════════════╗
║  CARGO FULL                         ║
╠═════════════════════════════════════╣
║  Probe cargo: 94/100 (full)         ║
║  Signal requires: 120 units         ║
║                                     ║
║  Cannot collect this signal.        ║
║                                     ║
║  Options:                           ║
║  • Return to hub and deploy again   ║
║  • Equip Cargo Expander module      ║
║  • Decode echo for +100 capacity    ║
║                                     ║
║  Signal will remain on map.         ║
║                                     ║
║  [OK]                               ║
╚═════════════════════════════════════╝
```

**Player Learns:**
- Cargo capacity matters
- Speed slowdown = cargo indicator
- Need to manage routes better
- Equipment choices matter

---

## 🛠️ Equipment Integration

### Cargo Expander Research

```
LOGISTICS BRANCH
├─ Cargo Expander Mk.I (50 RP)
│  Cost: 100 Minerals, 50 Data
│  Effect: +50 cargo capacity (100 → 150)
│
├─ Cargo Expander Mk.II (100 RP)
│  Cost: 200 Minerals, 100 Data, 50 Artifacts
│  Effect: +100 cargo capacity (100 → 200)
│  Requires: Mk.I
│
└─ Cargo Expander Mk.III (250 RP)
   Cost: 500 Minerals, 250 Data, 100 Artifacts
   Effect: +200 cargo capacity (100 → 300)
   Requires: Mk.II
```

### Equipment Slot Decision

**3 Equipment Slots, Choose:**

**Slot 1 Options:**
- Cargo Expander Mk.III (+200 capacity)
- Signal Amplifier (+50% detection range)
- Long-Range Antenna (+100% travel distance)

**Slot 2 Options:**
- Velocity Booster (+50% base speed)
- Shield Module (survive dangerous sectors)
- Scanner Module (reveals signal rarity before collecting)

**Slot 3 Options:**
- Resource Optimizer (20% chance double resources)
- Stealth Module (avoid void events)
- Auto-Return Module (returns when 90% full)

**Trade-offs:**
- More cargo = fewer slots for other upgrades
- Max cargo (3x expanders) = 400 capacity but no other bonuses
- Balanced loadout (1 expander + speed + scanner) = versatility

---

## 📈 Capacity Balance Examples

### 100 Base Capacity (No Expander)
```
Signal Type    Reward Range    How Many Fit
──────────────────────────────────────────
Common         5-10 units      10-20 signals
Uncommon       10-20 units     5-10 signals
Rare           20-40 units     2-5 signals
Epic           40-80 units     1-2 signals
Legendary      80-150 units    0-1 signals
```

### 200 Capacity (Mk.II Expander)
```
Signal Type    How Many Fit
──────────────────────────
Common         20-40 signals
Uncommon       10-20 signals
Rare           5-10 signals
Epic           2-5 signals
Legendary      1-2 signals
```

### 300 Capacity (Mk.III Expander)
```
Signal Type    How Many Fit
──────────────────────────
Common         30-60 signals
Uncommon       15-30 signals
Rare           7-15 signals
Epic           3-7 signals
Legendary      2-3 signals
```

### 400 Capacity (Mk.III + Echo Bonus)
```
Signal Type    How Many Fit
──────────────────────────
Common         40-80 signals
Uncommon       20-40 signals
Rare           10-20 signals
Epic           5-10 signals
Legendary      2-5 signals
```

---

## 🔧 Implementation Code

### ProbeManager.js - Speed Calculation

```javascript
updateProbe(probe, deltaTime) {
  // Calculate effective speed with cargo penalty
  const baseSpeed = probe.speed || 2.0;
  const cargoUsed = this.getCargoUsed(probe);
  const cargoCapacity = this.getCargoCapacity(probe);
  const cargoPercent = cargoUsed / cargoCapacity;
  
  let speedModifier = 1.0;
  if (cargoPercent >= 0.5 && cargoPercent < 0.75) {
    speedModifier = 0.9;
  } else if (cargoPercent >= 0.75 && cargoPercent < 0.9) {
    speedModifier = 0.75;
  } else if (cargoPercent >= 0.9 && cargoPercent < 1.0) {
    speedModifier = 0.6;
  } else if (cargoPercent >= 1.0) {
    speedModifier = 0.5;
  }
  
  const effectiveSpeed = baseSpeed * speedModifier * (deltaTime / 16.67);
  
  // Use effectiveSpeed for all movement calculations
  // ... rest of probe movement code ...
}

getCargoUsed(probe) {
  if (!probe.cargo) return 0;
  return (
    probe.cargo.minerals +
    probe.cargo.data +
    probe.cargo.artifacts +
    probe.cargo.exoticMinerals
  );
}

getCargoCapacity(probe) {
  let capacity = 100;
  
  if (probe.equipment) {
    probe.equipment.forEach(module => {
      if (module.id === 'cargo_expander_mk1') capacity += 50;
      if (module.id === 'cargo_expander_mk2') capacity += 100;
      if (module.id === 'cargo_expander_mk3') capacity += 200;
    });
  }
  
  // Check for echo bonus
  if (this.gameState.echoBonus?.cargoCapacity) {
    capacity += this.gameState.echoBonus.cargoCapacity;
  }
  
  return capacity;
}
```

### GameController.js - Capacity Check

```javascript
explore(mode) {
  // ... existing reward calculation code ...
  
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
    
    // Check capacity
    const cargoUsed = this.getCargoUsed(nearestProbe);
    const cargoCapacity = this.getCargoCapacity(nearestProbe);
    
    if (cargoUsed + rewardAmount > cargoCapacity) {
      // CARGO FULL - show detailed message
      this.showCargoFullMessage(nearestProbe, rewardAmount, signal);
      return; // Don't collect signal
    }
    
    // Has capacity - add to cargo
    nearestProbe.cargo[primaryReward] += rewardAmount;
    if (exoticBonus > 0) {
      nearestProbe.cargo.exoticMinerals += exoticBonus;
    }
    
    // Update UI
    this.eventBus.emit('probe:cargoUpdated', { 
      probe: nearestProbe,
      cargoUsed: cargoUsed + rewardAmount,
      cargoCapacity: cargoCapacity
    });
  }
}

showCargoFullMessage(probe, requiredSpace, signal) {
  const cargoUsed = this.getCargoUsed(probe);
  const cargoCapacity = this.getCargoCapacity(probe);
  
  this.eventBus.emit('ui:message', {
    text: `Probe ${probe.id} cargo full! (${cargoUsed}/${cargoCapacity})
           Cannot collect ${requiredSpace} units.
           Return to hub or equip Cargo Expander.`,
    type: 'warning',
    duration: 5000
  });
  
  console.log(`Cargo full: ${cargoUsed}/${cargoCapacity}, needed ${requiredSpace} more units`);
}
```

### DetailsPanel.js - Cargo Display

```javascript
showProbeDetails(probe) {
  // ... existing probe info ...
  
  // Add cargo section
  const cargoUsed = this.getCargoUsed(probe);
  const cargoCapacity = this.getCargoCapacity(probe);
  const cargoPercent = (cargoUsed / cargoCapacity * 100).toFixed(0);
  
  let cargoStatus = '✓ Plenty of space';
  let cargoWarning = '';
  
  if (cargoPercent >= 90) {
    cargoStatus = '🚨 CARGO FULL!';
    cargoWarning = 'Return to hub or cannot collect more signals';
  } else if (cargoPercent >= 75) {
    cargoStatus = '🔴 Nearly full!';
    cargoWarning = 'Consider returning soon';
  } else if (cargoPercent >= 50) {
    cargoStatus = '⚠️ Getting full';
    cargoWarning = `Speed reduced to ${this.getSpeedModifier(cargoPercent)}%`;
  }
  
  const cargoHTML = `
    <div style="border: 1px solid #444; border-radius: 5px; padding: 10px; margin: 10px 0;">
      <div style="color: #0ff; font-weight: bold; margin-bottom: 5px;">
        CARGO: ${cargoUsed} / ${cargoCapacity}
      </div>
      <div style="background: #222; height: 20px; border-radius: 3px; overflow: hidden; margin-bottom: 10px;">
        <div style="background: linear-gradient(90deg, #0ff, #0aa); height: 100%; width: ${cargoPercent}%;"></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 12px; color: #aaa;">
        <div>Minerals: ${probe.cargo.minerals}</div>
        <div>Data: ${probe.cargo.data}</div>
        <div>Artifacts: ${probe.cargo.artifacts}</div>
        <div>Exotic: ${probe.cargo.exoticMinerals || 0}</div>
      </div>
      ${cargoPercent >= 50 ? `
        <div style="margin-top: 10px; padding: 5px; background: rgba(255,100,0,0.2); border-radius: 3px; font-size: 11px;">
          <div style="color: #ffa500; font-weight: bold;">${cargoStatus}</div>
          ${cargoWarning ? `<div style="color: #aaa; margin-top: 3px;">${cargoWarning}</div>` : ''}
        </div>
      ` : ''}
    </div>
  `;
  
  // Insert cargo section into probe details panel
  // ... add to existing panel HTML ...
}
```

---

## 📋 Summary

### What the Player Sees:

**On Map:**
- Clean probes with cosmetic skins
- No cargo indicators
- Probes move slower when full (natural feedback)

**In Details Panel:**
- Clear cargo bar and numbers
- Status messages (Getting full, Nearly full, FULL)
- Speed impact shown
- Resource breakdown

**On Collection Attempt:**
- Message if cargo full
- Options explained clearly
- Signal remains collectible

### What Makes This Work:

✅ **Clean map** - No visual clutter
✅ **Natural feedback** - Speed tells the story
✅ **Detailed info** - Panel has everything
✅ **Strategic depth** - Equipment choices matter
✅ **Learning curve** - Discover through play
✅ **Cosmetic-friendly** - No conflicts with skins

---

This is the cleanest, most elegant solution! 🎯
