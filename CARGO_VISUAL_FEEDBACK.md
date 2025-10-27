# Cargo Capacity System (Revised)

## 📦 Simplified Cargo Weight System

### Equal Weight for All Resources

**No Penalty for Rarity:**
- Minerals: 1 weight per unit
- Data: 1 weight per unit
- Artifacts: 1 weight per unit (NOT 2x)
- Exotic Minerals: 1 weight per unit (NOT 3x)

**Reasoning:**
✅ Rare items are already punishing enough (harder to find!)
✅ Simpler to understand
✅ No discouragement from collecting valuable artifacts
✅ Easier balancing

**Cargo Calculation:**
```javascript
function getCargoUsed(probe) {
  return (
    probe.cargo.minerals +
    probe.cargo.data +
    probe.cargo.artifacts +
    probe.cargo.exoticMinerals
  );
}
```

---

## 🎨 Cosmetic-Friendly Visual Feedback

### Problem with Color-Based System
❌ Conflicts with cosmetic probe skins
❌ Player-chosen colors override cargo indicators
❌ Limits visual customization

### Solution: Animation-Based Indicators

**Option 1: Speed-Based (Recommended)**
```
Cargo Level    →  Probe Speed Modifier
─────────────────────────────────────
0-50%          →  100% speed (normal)
50-75%         →  90% speed (slight slowdown)
75-90%         →  75% speed (noticeable slowdown)
90-100%        →  60% speed (heavy cargo!)
100% (FULL)    →  50% speed (crawling!)
```

**Visual Result:**
- Empty probe: Zips along route quickly
- Half-full probe: Slightly slower, barely noticeable
- Almost full probe: Noticeably sluggish
- Full probe: Crawls back to hub (incentive to return!)

**Code Implementation:**
```javascript
function getProbeSpeed(probe) {
  const baseSpeed = probe.speed || 2.0;
  const cargoPercent = probe.cargoUsed / probe.cargoCapacity;
  
  if (cargoPercent < 0.5) {
    return baseSpeed; // 0-50%: Full speed
  } else if (cargoPercent < 0.75) {
    return baseSpeed * 0.9; // 50-75%: 10% slower
  } else if (cargoPercent < 0.9) {
    return baseSpeed * 0.75; // 75-90%: 25% slower
  } else if (cargoPercent < 1.0) {
    return baseSpeed * 0.6; // 90-100%: 40% slower
  } else {
    return baseSpeed * 0.5; // 100%: 50% slower
  }
}
```

**Player Experience:**
- Natural feedback: "Why is my probe moving so slow? Oh, it's full!"
- Encourages timely returns
- No visual clutter
- Works with any cosmetic

---

**Option 2: Blinking Indicator (Alternative)**
```
Cargo Level    →  Visual Indicator
────────────────────────────────────
0-75%          →  Normal (no blink)
75-90%         →  Slow blink (1x per 2 sec)
90-100%        →  Fast blink (2x per sec)
100% (FULL)    →  Rapid blink (4x per sec) + pulsing glow
```

**Visual Result:**
- Small indicator dot on probe (doesn't affect main color)
- Blinks faster as cargo fills
- Works independently of cosmetic skins
- Clear urgency at high capacity

**Code Implementation:**
```javascript
function drawProbeCargoIndicator(ctx, probe, x, y) {
  const cargoPercent = probe.cargoUsed / probe.cargoCapacity;
  
  if (cargoPercent < 0.75) return; // Don't show if under 75%
  
  const currentTime = Date.now();
  let blinkSpeed, indicatorColor;
  
  if (cargoPercent < 0.9) {
    blinkSpeed = 2000; // Slow blink
    indicatorColor = '#ffaa00'; // Orange
  } else if (cargoPercent < 1.0) {
    blinkSpeed = 500; // Fast blink
    indicatorColor = '#ff4400'; // Red-orange
  } else {
    blinkSpeed = 250; // Rapid blink
    indicatorColor = '#ff0000'; // Red
  }
  
  // Blink on/off
  const isVisible = Math.floor(currentTime / blinkSpeed) % 2 === 0;
  
  if (isVisible) {
    // Draw small dot above probe
    ctx.beginPath();
    ctx.arc(x, y - 15, 3, 0, Math.PI * 2);
    ctx.fillStyle = indicatorColor;
    ctx.fill();
    
    // If 100%, add pulsing glow
    if (cargoPercent >= 1.0) {
      const pulseSize = Math.sin(currentTime / 200) * 2 + 5;
      ctx.beginPath();
      ctx.arc(x, y - 15, pulseSize, 0, Math.PI * 2);
      ctx.strokeStyle = indicatorColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }
}
```

**Player Experience:**
- Subtle dot appears when probe getting full
- Blinks faster = more urgent
- Pulsing glow at 100% = "Return NOW!"
- Doesn't interfere with cosmetics

---

**Option 3: Trail Effect (Creative)**
```
Cargo Level    →  Trail Behavior
────────────────────────────────────
0-50%          →  Short trail (light, zippy)
50-75%         →  Medium trail (normal)
75-90%         →  Long trail (heavy, dragging)
90-100%        →  Very long trail (struggling)
100% (FULL)    →  Thick, droplet trail (cargo spilling)
```

**Visual Result:**
- Probe leaves trail behind it as it moves
- Fuller cargo = longer, thicker trail
- Gives impression of weight/momentum
- Can still change probe colors independently

---

## 🎯 Recommended: Hybrid Approach

**Combine Speed + Blink:**

**0-75% Cargo:**
- Normal speed
- No indicator
- Player doesn't notice

**75-90% Cargo:**
- 10% slower
- Slow orange blink (warning)
- "Getting full..."

**90-100% Cargo:**
- 25% slower  
- Fast red-orange blink (urgent)
- "Almost full!"

**100% Cargo (FULL):**
- 50% slower
- Rapid red blink + pulse (critical!)
- "Return to hub immediately!"

**Benefits:**
✅ Speed penalty provides natural feedback
✅ Blink indicator adds visual urgency
✅ Both work with any cosmetic colors
✅ Clear escalation from warning to critical

---

## 📊 Updated Capacity Balance

### With Simplified Weights (All 1:1)

**100 Base Capacity:**
- ~10 common signals (5-10 resources each)
- ~5 uncommon signals (10-20 resources each)
- ~2-3 rare signals (20-40 resources each)
- ~1-2 epic signals (40-80 resources each)

**With Cargo Expander Mk.III (300 capacity):**
- ~30 common signals
- ~15 uncommon signals
- ~7 rare signals
- ~3-5 epic signals

**Legendary Signals:**
- Reward: 80-150 resources
- With 100 capacity: Can fit 1 legendary (barely!)
- With 300 capacity: Can fit 2-3 legendaries

---

## 🎮 Gameplay Flow Example

### Scenario: Player with 100 Capacity, No Expander

**Route Start:**
```
Probe: Explorer-7
Cargo: 0/100 (0%)
Speed: 100% (2.0 pixels/frame)
Indicator: None
```

**After 5 Common Signals (35 resources):**
```
Cargo: 35/100 (35%)
Speed: 100% (still fast)
Indicator: None
Status: ✓ Room for more
```

**After 10 Signals (78 resources):**
```
Cargo: 78/100 (78%)
Speed: 90% (slight slowdown)
Indicator: Slow orange blink
Status: ⚠️ Getting full
Player thinks: "Should I return or keep going?"
```

**After 12 Signals (94 resources):**
```
Cargo: 94/100 (94%)
Speed: 75% (noticeably slower)
Indicator: Fast red blink
Status: 🔴 Almost full!
Player thinks: "One more signal then return?"
```

**After Legendary Signal (94 + 120 = overload!):**
```
Attempt to collect: 120 resources
Capacity check: 94 + 120 = 214 > 100 ❌

Message: "Probe cargo full! (94/100)
Cannot collect this signal.
Return to hub or equip Cargo Expander."

Signal remains on map (uncollected)
```

**Player Decision:**
- Return now with 94 resources ✓
- OR ignore legendary signal (waste!)
- OR wait for probe to return, then come back for it

---

## 🔧 Implementation Code

### Probe Speed Modification

**In ProbeManager.js updateProbe():**
```javascript
updateProbe(probe, deltaTime) {
  // ... existing code ...
  
  // Calculate speed with cargo penalty
  const baseSpeed = probe.speed || 2.0;
  const cargoPercent = this.getCargoUsed(probe) / this.getCargoCapacity(probe);
  
  let speedModifier = 1.0;
  if (cargoPercent >= 0.5 && cargoPercent < 0.75) {
    speedModifier = 0.9; // 10% slower
  } else if (cargoPercent >= 0.75 && cargoPercent < 0.9) {
    speedModifier = 0.75; // 25% slower
  } else if (cargoPercent >= 0.9) {
    speedModifier = 0.6; // 40% slower
  }
  
  const effectiveSpeed = baseSpeed * speedModifier * (deltaTime / 16.67);
  
  // Use effectiveSpeed for movement calculations
  // ... rest of movement code ...
}

getCargoUsed(probe) {
  if (!probe.cargo) return 0;
  return probe.cargo.minerals + 
         probe.cargo.data + 
         probe.cargo.artifacts + 
         probe.cargo.exoticMinerals;
}

getCargoCapacity(probe) {
  let capacity = 100; // Base
  
  // Check equipment
  if (probe.equipment) {
    if (probe.equipment.includes('cargo_expander_mk1')) capacity += 50;
    if (probe.equipment.includes('cargo_expander_mk2')) capacity += 100;
    if (probe.equipment.includes('cargo_expander_mk3')) capacity += 200;
  }
  
  return capacity;
}
```

### Blink Indicator Rendering

**In GameController.js drawProbe():**
```javascript
drawProbe(ctx, probe) {
  // Draw probe body (existing code)
  // ... probe shape, cosmetics, etc ...
  
  // Draw cargo indicator if needed
  const cargoPercent = this.getCargoUsed(probe) / this.getCargoCapacity(probe);
  
  if (cargoPercent >= 0.75) {
    this.drawCargoIndicator(ctx, probe, probe.current.x, probe.current.y, cargoPercent);
  }
}

drawCargoIndicator(ctx, probe, x, y, cargoPercent) {
  const currentTime = Date.now();
  let blinkSpeed, color;
  
  if (cargoPercent < 0.9) {
    blinkSpeed = 2000; // Slow blink
    color = '#ffaa00'; // Orange
  } else if (cargoPercent < 1.0) {
    blinkSpeed = 500; // Fast blink
    color = '#ff4400'; // Red-orange
  } else {
    blinkSpeed = 250; // Rapid blink
    color = '#ff0000'; // Red
  }
  
  const isVisible = Math.floor(currentTime / blinkSpeed) % 2 === 0;
  
  if (isVisible) {
    // Small dot above probe
    ctx.beginPath();
    ctx.arc(x, y - 12, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    // Pulse effect at 100%
    if (cargoPercent >= 1.0) {
      const pulse = Math.sin(currentTime / 200) * 1.5 + 4;
      ctx.beginPath();
      ctx.arc(x, y - 12, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }
}
```

---

## 🎨 Cosmetic Compatibility

### How It Works with Skins

**Player Equips "Void Walker" Skin (Purple/Black):**
- Probe body: Purple/black (from cosmetic)
- Cargo indicator: Small orange/red dot above probe
- Speed penalty: Still applies (animated slower)
- Trail effect: Purple/black (from cosmetic)

**Visual Hierarchy:**
1. **Probe Body**: Player's chosen cosmetic (full creative freedom)
2. **Cargo Dot**: Functional indicator (small, unobtrusive)
3. **Speed**: Animated feedback (no visual change, just slower movement)

**Result:**
✅ Cosmetics look great
✅ Cargo status is clear
✅ No visual conflicts

---

## 📋 Summary of Changes

### From Original Proposal:
❌ ~~Color-coded probe icons (green/yellow/red)~~
❌ ~~Artifacts weigh 2x~~
❌ ~~Exotic minerals weigh 3x~~

### New System:
✅ **All resources weigh 1 unit each**
✅ **Speed penalty based on cargo % (50-100% speed)**
✅ **Small blinking indicator dot (75%+ cargo)**
✅ **Works with any cosmetic skin**
✅ **Natural, intuitive feedback**

---

## ❓ Final Confirmation

1. **Speed penalty** - Good feedback method? 50% speed at full cargo too harsh/lenient?
2. **Blink threshold** - Start at 75% cargo or earlier (50%)?
3. **Blink colors** - Orange/red ok, or different colors?
4. **Trail effect** - Worth adding as third indicator?
5. **100 base capacity** - Still feel right with equal weights?

Let me know and we can lock this in! 🚀
