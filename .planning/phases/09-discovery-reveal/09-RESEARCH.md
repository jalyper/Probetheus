# Phase 9: Discovery Reveal - Research

**Researched:** 2026-02-05
**Domain:** UI modal enhancement, discovery UX, visual information design
**Confidence:** HIGH

## Summary

Phase 9 transforms the sector discovery modal from a basic stat dump into a comprehensive "Sector Survey Report" that instantly communicates sector value through visual hierarchy, collection tracking, and detailed resource information. This is a **UI extension pattern** — the modal structure exists in `index.html` (lines 399-407), the display logic exists in `SectorManager.showSectorDiscovery()` (lines 341-387), and the signal spawning exists in `spawnDiscoveryBonusSignals()` (lines 574-646).

The implementation extends existing modal content with new sections, adds one epic/legendary exclusive signal to the discovery bonus spawning (which already creates 1-2 signals per discovery), and implements discovery tracking by iterating the `world.sectors` Map to count explored sectors and unique types found. All infrastructure is in place: sector types have `exclusiveSignalType` fields (Phase 5), sectors have `resourceProfile` objects with `spawnRateMultiplier` (Phase 8), and signal colors are established (Phase 6).

This phase delivers a "mini discovery journal entry" feel by combining existing data into a structured report format with visual bars (Unicode block characters), color-coded text (inline styles matching signal colors), and collection pips (colored divs for found/unfound types). The user experience shifts from "OK, got a research point" to "Here's what I discovered and how valuable this sector is."

**Primary recommendation:** Extend `showSectorDiscovery()` to build comprehensive HTML with 8 sections (header, research award, exclusive signal, resource profile, sector bonuses, discovery log, hazard warning, button), modify `spawnDiscoveryBonusSignals()` to add one guaranteed epic/legendary exclusive signal for non-Standard sectors, and add discovery tracking utility methods to count explored sectors and track found types.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**1. Modal Layout — "Sector Survey Report" Structure**

Eight sections in specific order (top to bottom):
1. Header: `SECTOR SURVEY: [Name]` with `[Type] Sector · [Distance] from HQ`
2. Research Award: `+1 Research Point Awarded` (existing, keep as-is)
3. Exclusive Signal Section: Signal name, flavor text, yield summary (color-coded)
4. Resource Profile Section: Profile type, signal richness bar, probethium potential bar
5. Sector Bonuses: Mineral/Data/Artifact multipliers (existing data, reformatted)
6. Discovery Log: Sectors explored counter + types found tracker (M/5 with lit/dim pips)
7. Hazard Warning: Probe destruction chance (if applicable, existing)
8. Button: "Continue" (not "OK")

**Exclusive Signal Section Content by Sector Type:**

| Sector Type | Signal | Color | Flavor Text | Yield |
|-------------|--------|-------|-------------|-------|
| Resource-Rich | ⛏️ Ore Vein | Orange (#ff6600) | Dense mineral formations unique to Resource-Rich sectors | Yields: 2x Minerals |
| Data Haven | 📡 Data Cache | Cyan (#00ddff) | Concentrated data streams unique to Data Haven sectors | Yields: 2x Data |
| Ancient | 🏛️ Relic | Gold (#ffd700) | Ancient technology fragments unique to Ancient sectors | Yields: Guaranteed Rare+ Artifacts |
| Asteroid Field | 💎 Exotic Crystal | Prismatic/cycling HSL | Volatile crystalline deposits unique to Asteroid Fields | Yields: Exotic Minerals or Mixed Resources |
| Standard | 🌐 Open Frequency | N/A | All signal types can be detected here — ideal for balanced resource gathering | Yields: Standard rates across all types |

**Resource Profile Section Requirements:**
- Show profile type name (e.g., "Mineral-Rich", "Balanced", "Probethium-Rich")
- Signal Richness: visual bar (5 segments) + multiplier number (e.g., `████░ 1.5x`)
- Probethium Potential: visual bar (5 segments) + label (None / Low / Moderate / High / Rich)
  - Probethium-rich profile = "Rich" (5 bars)
  - Balanced profile = "Low" (1 bar)
  - Other profiles = "None" (0 bars)
- Micromanagement-friendly: exact numbers, not just qualitative descriptions

**Discovery Log Section Requirements:**
- Line 1: `Sectors Explored: N` (running total)
- Line 2: `Types Found: M/5` with small colored pips for each sector type
  - Found types: lit up in sector's border color
  - Unfound types: dim/grey (#444)
  - Types: Standard (#66f), Resource-Rich (#fc8), Data Haven (#6f6), Ancient (#f6f), Asteroid Field (#f66)
- Compact: 2-3 lines total, doesn't dominate the modal
- Data source: iterate `world.sectors` Map, count explored sectors and track unique types

**2. Bonus Signal Spawn (DISC-03)**

- **Timing:** Signal spawns immediately on discovery (while modal is open)
- When player closes modal, epic+ exclusive signal already on map waiting
- **Rarity distribution:** 80% Epic, 20% Legendary (random weighted selection)
- **Position:** Near sector center (same pattern as existing discovery bonus signals)
- **Additive:** IN ADDITION to existing discovery bonus signals, not replacing them
- **Standard sectors:** No exclusive bonus signal (they have no exclusiveSignalType) — keep existing uncommon mixed signal
- **Implementation:** Add to existing `spawnDiscoveryBonusSignals()` method — push one more signal with exclusive type and epic/legendary rarity

**3. Standard Sector Messaging (DISC-04)**

Instead of "Balanced exploration opportunities" (consolation prize framing), exclusive signal section becomes:

```
── SIGNAL ENVIRONMENT ──
🌐 Open Frequency
"All signal types can be detected here —
 ideal for balanced resource gathering"
Yields: Standard rates across all types
```

Framing positions Standard as strategic choice (universal collectors shine here) rather than limitation. Discovery log pip still lights up — finding Standard counts as collection progress.

**4. Existing Functionality Preserved**

- Research point award stays (line 358)
- Existing sector bonus multipliers stay (reformatted into cleaner layout)
- Existing discovery bonus signals continue spawning (1-2 signals per sector)
- Probe destruction warning stays (for Asteroid Field, line 366)
- Modal open/close behavior stays (OK button → "Continue" button)

### Claude's Discretion

**Open design areas requiring decisions during planning:**

1. **Visual bar character choice:** Use Unicode block characters (█ ░) vs inline SVG vs CSS progress bars for signal richness/probethium potential display
2. **Discovery log pip sizing:** Small inline colored spans vs larger div boxes with borders for sector type indicators
3. **Distance calculation display:** Round to integer vs show decimal (e.g., "12" vs "12.3 sectors from HQ")
4. **Color coding precision:** Use exact Phase 6 signal colors (#ff6600, #00ddff, #ffd700) vs sector border colors (#fc8, #6f6, #f6f) for consistency
5. **Modal width adjustment:** Keep current max-width 500px or expand to 600px for richer content

**Recommendation priorities:**
- Visual clarity > technical elegance (Unicode blocks are readable, don't require CSS)
- Consistency with established patterns (use signal colors from Phase 6, not new palette)
- Performance > polish (simple DOM updates, no animation loops for visual bars)

### Deferred Ideas (OUT OF SCOPE)

- Persistent discovery journal (separate screen/UI accessed from main menu) — separate feature
- Achievement system for discovering all types — possible future phase
- Sector tooltips on galaxy map showing profile/type — separate from modal
- Sound effects for discovery — separate concern
- Discovery history log (previous discoveries accessible) — separate feature
- Tutorial step for first non-Standard sector — mentioned in ROADMAP but not in CONTEXT.md locked decisions

## Standard Stack

The existing infrastructure handles this feature via UI extension and data aggregation:

### Core Infrastructure (Already Present)
| Component | Location | Purpose | Why It's Sufficient |
|-----------|----------|---------|---------------------|
| Sector discovery modal | index.html:399-407 | HTML structure for discovery UI | Simple modal-content div, easily extended with new sections |
| showSectorDiscovery() | SectorManager.js:341-387 | Modal display logic | Receives sectorType and sectorName, builds HTML dynamically |
| spawnDiscoveryBonusSignals() | SectorManager.js:574-646 | Discovery bonus spawning | Switch statement per sector type, easily extended with exclusive signal |
| Sector storage | GameState.js world.sectors Map | Explored sector tracking | All discovered sectors stored with type and explored flag |
| Exclusive signal types | SectorManager.js:176,186,196,206 | exclusiveSignalType fields | Phase 5 infrastructure ready for display |
| Resource profiles | Sector.resourceProfile object | spawnRateMultiplier, type | Phase 8 infrastructure ready for display |
| Signal colors | GameController.js:3328-3344 | Color definitions for visuals | Phase 6 established orange/cyan/gold/prismatic colors |

### Pattern Reference

**Existing modal extension pattern:**
- Research unlock modal (index.html:409-418) shows dynamic content with styled sections
- Sector discovery modal (index.html:399-407) currently shows basic 3-section layout
- Pattern: Build HTML string in manager method, inject via `element.innerHTML`, add event listeners

**This phase follows identical pattern:**
- Build comprehensive HTML string in `showSectorDiscovery()`
- Use inline styles for color-coding (existing pattern at line 358, 355, 366)
- Inject via `sectorBonusElement.innerHTML` (existing at line 369)
- Backward compatible: if sector missing resourceProfile or type fields, gracefully degrade

### No New Libraries Needed

All functionality uses:
- Vanilla JavaScript string templating (template literals)
- DOM manipulation (`getElementById`, `innerHTML`, `addEventListener`)
- CSS styling via inline styles and existing .modal classes
- Unicode characters for visual bars (█ U+2588, ░ U+2591)
- Array iteration (`world.sectors.forEach`) for discovery tracking

## Architecture Patterns

### Recommended Modification Points
```
src/
  SectorManager.js     # showSectorDiscovery() - build 8-section HTML
                       # spawnDiscoveryBonusSignals() - add epic/legendary exclusive signal
                       # NEW: getDiscoveryStats() - count explored sectors and types
index.html            # Sector modal structure (minimal changes - maybe increase max-width)
tests/
  discovery-reveal.spec.js  # NEW - test all 4 DISC requirements
```

### Pattern 1: Comprehensive Modal HTML Construction

**What:** Build multi-section HTML string with inline styles for color-coding
**When to use:** In `showSectorDiscovery()` to replace current simple layout (lines 357-369)
**Example:**
```javascript
// Current implementation (SectorManager.js:341-387)
showSectorDiscovery(sectorType, sectorName) {
    const modal = document.getElementById('sectorModal');
    if (!modal) return;

    // Build comprehensive HTML instead of simple 3-line format
    let html = `
        <div style="text-align: left; max-width: 550px; margin: 0 auto;">
            <!-- Header Section -->
            <h2 style="color: #ff0; text-align: center; margin-bottom: 5px;">
                SECTOR SURVEY: ${sectorName}
            </h2>
            <p style="color: #aaa; text-align: center; margin-bottom: 20px;">
                ${sectorType.name} Sector · ${this.calculateDistance(sectorX, sectorY)} from HQ
            </p>

            <!-- Research Award (existing content) -->
            <p style="color: #0f0; font-weight: bold; margin-bottom: 15px; text-align: center;">
                🎯 +1 Research Point Awarded
            </p>

            <!-- Exclusive Signal Section -->
            <div style="border-top: 1px solid #444; padding-top: 15px; margin-bottom: 15px;">
                <p style="color: #888; text-align: center; margin-bottom: 8px; font-size: 12px; letter-spacing: 2px;">
                    ── SIGNAL ENVIRONMENT ──
                </p>
                ${this.buildExclusiveSignalSection(sectorType)}
            </div>

            <!-- Resource Profile Section -->
            <div style="border-top: 1px solid #444; padding-top: 15px; margin-bottom: 15px;">
                <p style="color: #888; margin-bottom: 8px; font-weight: bold;">Resource Profile:</p>
                ${this.buildResourceProfileSection(sector)}
            </div>

            <!-- Sector Bonuses (existing data, reformatted) -->
            <div style="border-top: 1px solid #444; padding-top: 15px; margin-bottom: 15px;">
                <p style="color: #888; margin-bottom: 8px; font-weight: bold;">Exploration Bonuses:</p>
                <p style="line-height: 1.8;">
                    Minerals: x${sectorType.mineralBonus} ·
                    Data: x${sectorType.dataBonus} ·
                    Artifacts: x${sectorType.artifactBonus}
                </p>
            </div>

            <!-- Discovery Log -->
            <div style="border-top: 1px solid #444; padding-top: 15px; margin-bottom: 15px;">
                ${this.buildDiscoveryLogSection()}
            </div>

            <!-- Hazard Warning (conditional) -->
            ${sectorType.probeDestructionChance ? `
                <p style="color: #ff6b35; font-weight: bold; text-align: center;">
                    ⚠ WARNING: ${Math.floor(sectorType.probeDestructionChance * 100)}% probe destruction risk!
                </p>
            ` : ''}
        </div>
    `;

    const contentDiv = modal.querySelector('.modal-content');
    contentDiv.innerHTML = html;

    // Update button text
    const okBtn = document.getElementById('sectorOkBtn');
    if (okBtn) okBtn.textContent = 'Continue';

    modal.classList.add('active');
}
```

**Why this works:**
- Template literals allow multi-line readable HTML construction
- Inline styles ensure visual consistency without CSS class dependencies
- Conditional sections (hazard warning) use ternary operators
- Section dividers (border-top) create visual hierarchy
- Centralized in one method, easy to iterate on layout

### Pattern 2: Visual Bar Rendering with Unicode

**What:** Use Unicode block characters (█ filled, ░ empty) to create 5-segment visual bars
**When to use:** For signal richness and probethium potential display in resource profile section
**Example:**
```javascript
// Helper method to build resource profile section
buildResourceProfileSection(sector) {
    if (!sector.resourceProfile) {
        return '<p style="color: #666;">Profile data unavailable</p>';
    }

    const profile = sector.resourceProfile;
    const profileNames = {
        'mineral-rich': 'Mineral-Rich',
        'data-rich': 'Data-Rich',
        'artifact-rich': 'Artifact-Rich',
        'probethium-rich': 'Probethium-Rich',
        'balanced': 'Balanced'
    };

    // Map spawn rate multiplier to 5-segment bar
    // 0.8 = 4 segments, 1.0 = 5 segments, 1.5 = 5 segments (maxed)
    const richnessSegments = Math.min(5, Math.ceil(profile.spawnRateMultiplier * 5));
    const richnessBar = '█'.repeat(richnessSegments) + '░'.repeat(5 - richnessSegments);

    // Map profile type to probethium potential
    let probethiumSegments = 0;
    let probethiumLabel = 'None';
    if (profile.type === 'probethium-rich') {
        probethiumSegments = 5;
        probethiumLabel = 'Rich';
    } else if (profile.type === 'balanced') {
        probethiumSegments = 1;
        probethiumLabel = 'Low';
    }
    const probethiumBar = '█'.repeat(probethiumSegments) + '░'.repeat(5 - probethiumSegments);

    return `
        <p style="margin-bottom: 5px;">
            <strong>${profileNames[profile.type] || 'Unknown'}</strong>
        </p>
        <p style="line-height: 1.8; font-family: monospace;">
            Signal Richness: <span style="color: #0ff; letter-spacing: 2px;">${richnessBar}</span>
            ${profile.spawnRateMultiplier}x
        </p>
        <p style="line-height: 1.8; font-family: monospace;">
            Probethium Potential: <span style="color: #ffd700; letter-spacing: 2px;">${probethiumBar}</span>
            ${probethiumLabel}
        </p>
    `;
}
```

**Why this works:**
- Unicode block characters work in all browsers, no CSS or SVG needed
- Monospace font ensures consistent bar width alignment
- Letter-spacing makes individual segments visually distinct
- Color-coding (cyan for richness, gold for probethium) matches signal themes
- String repeat method (`'█'.repeat(n)`) is efficient and readable

### Pattern 3: Exclusive Signal Section Content

**What:** Display exclusive signal info with emoji, color-coded text, and flavor description
**When to use:** In `showSectorDiscovery()` for all sector types including Standard
**Example:**
```javascript
buildExclusiveSignalSection(sectorType) {
    const exclusiveInfo = {
        'ore_vein': {
            emoji: '⛏️',
            name: 'Ore Vein',
            color: '#ff6600',
            description: 'Dense mineral formations unique to Resource-Rich sectors',
            yields: 'Yields: 2x Minerals'
        },
        'data_cache': {
            emoji: '📡',
            name: 'Data Cache',
            color: '#00ddff',
            description: 'Concentrated data streams unique to Data Haven sectors',
            yields: 'Yields: 2x Data'
        },
        'relic': {
            emoji: '🏛️',
            name: 'Relic',
            color: '#ffd700',
            description: 'Ancient technology fragments unique to Ancient sectors',
            yields: 'Yields: Guaranteed Rare+ Artifacts'
        },
        'exotic_crystal': {
            emoji: '💎',
            name: 'Exotic Crystal',
            color: 'hsl(180, 100%, 70%)', // Example static color (actual game cycles)
            description: 'Volatile crystalline deposits unique to Asteroid Fields',
            yields: 'Yields: Exotic Minerals or Mixed Resources'
        }
    };

    const exclusiveType = sectorType.exclusiveSignalType;

    if (!exclusiveType) {
        // Standard sector - "Open Frequency" messaging
        return `
            <p style="text-align: center; margin-bottom: 8px; font-size: 18px;">
                🌐 <span style="color: #0ff; font-weight: bold;">Open Frequency</span>
            </p>
            <p style="color: #aaa; text-align: center; line-height: 1.6; font-size: 14px; font-style: italic;">
                "All signal types can be detected here —<br>
                ideal for balanced resource gathering"
            </p>
            <p style="color: #888; text-align: center; margin-top: 8px; font-size: 13px;">
                Yields: Standard rates across all types
            </p>
        `;
    }

    const info = exclusiveInfo[exclusiveType];
    if (!info) return '<p style="color: #666;">Unknown signal type</p>';

    return `
        <p style="text-align: center; margin-bottom: 8px; font-size: 18px;">
            ${info.emoji} <span style="color: ${info.color}; font-weight: bold;">${info.name}</span>
        </p>
        <p style="color: #aaa; text-align: center; line-height: 1.6; font-size: 14px; font-style: italic;">
            "${info.description}"
        </p>
        <p style="color: #888; text-align: center; margin-top: 8px; font-size: 13px;">
            ${info.yields}
        </p>
    `;
}
```

**Why this works:**
- Lookup table pattern (exclusiveInfo object) centralizes all signal data
- Standard sector gets special "Open Frequency" treatment (positive framing)
- Color-coding uses exact Phase 6 signal colors for consistency
- Italic flavor text + emoji creates "field report" aesthetic
- Fallback handling for unknown types (defensive coding)

### Pattern 4: Discovery Log Tracking

**What:** Count explored sectors and track unique sector types found
**When to use:** Build discovery log section showing "Sectors Explored: N" and "Types Found: M/5" with colored pips
**Example:**
```javascript
buildDiscoveryLogSection() {
    const world = this.gameState.getWorld();

    // Count explored sectors
    let exploredCount = 0;
    const foundTypes = new Set();

    world.sectors.forEach(sector => {
        if (sector.explored) {
            exploredCount++;
            foundTypes.add(sector.type.name);
        }
    });

    // Define sector types with colors (from SectorManager.js type definitions)
    const sectorTypes = [
        { name: 'Standard', color: '#66f' },
        { name: 'Resource-Rich', color: '#fc8' },
        { name: 'Data Haven', color: '#6f6' },
        { name: 'Ancient', color: '#f6f' },
        { name: 'Asteroid Field', color: '#f66' }
    ];

    // Build pips HTML
    const pipsHtml = sectorTypes.map(type => {
        const found = foundTypes.has(type.name);
        const bgColor = found ? type.color : '#444';
        const opacity = found ? '1' : '0.3';

        return `
            <div style="
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: ${bgColor};
                opacity: ${opacity};
                display: inline-block;
                margin: 0 3px;
                box-shadow: ${found ? `0 0 6px ${type.color}` : 'none'};
            " title="${type.name}${found ? ' (found)' : ''}"></div>
        `;
    }).join('');

    return `
        <p style="color: #888; margin-bottom: 8px; font-weight: bold;">Discovery Progress:</p>
        <p style="line-height: 1.8;">
            Sectors Explored: <span style="color: #0ff; font-weight: bold;">${exploredCount}</span>
        </p>
        <p style="line-height: 1.8;">
            Types Found: <span style="color: #0ff; font-weight: bold;">${foundTypes.size}/5</span>
            <span style="margin-left: 10px;">${pipsHtml}</span>
        </p>
    `;
}
```

**Why this works:**
- Set data structure automatically deduplicates sector types
- `forEach` over Map is efficient for sector counting
- Inline divs with border-radius create clean circular pips
- Found pips get glow effect (box-shadow) for visual pop
- Title attributes provide hover tooltips for accessibility

### Pattern 5: Guaranteed Exclusive Signal Spawning

**What:** Add one epic/legendary exclusive signal to discovery bonus for non-Standard sectors
**When to use:** In `spawnDiscoveryBonusSignals()` after existing signal spawning (line 614)
**Example:**
```javascript
// In spawnDiscoveryBonusSignals() after existing switch statement (line 584-612)
spawnDiscoveryBonusSignals(sectorX, sectorY, sectorType) {
    const world = this.gameState.getWorld();
    const sectorCenterX = sectorX * world.standardSectorWidth + world.standardSectorWidth / 2;
    const sectorCenterY = sectorY * world.standardSectorHeight + world.standardSectorHeight / 2;

    let bonusSignals = [];

    // Existing switch statement for sector-specific bonus signals (lines 584-612)
    switch (sectorType.name) {
        case 'Standard':
            bonusSignals.push({ rarity: 'uncommon', type: 'mixed' });
            break;
        case 'Resource-Rich':
            bonusSignals.push({ rarity: 'rare', type: 'mineral' });
            bonusSignals.push({ rarity: 'uncommon', type: 'mixed' });
            break;
        // ... other cases
    }

    // NEW: Add guaranteed epic/legendary exclusive signal (DISC-03)
    if (sectorType.exclusiveSignalType) {
        // 80% epic, 20% legendary
        const rarity = Math.random() < 0.8 ? 'epic' : 'legendary';
        bonusSignals.push({
            rarity: rarity,
            type: sectorType.exclusiveSignalType // ore_vein, data_cache, relic, exotic_crystal
        });
    }

    // Existing signal spawning loop (lines 615-635)
    bonusSignals.forEach((signalInfo, index) => {
        const angle = (Math.PI * 2 * index) / bonusSignals.length;
        const distance = 100 + Math.random() * 200;

        const signalX = sectorCenterX + Math.cos(angle) * distance;
        const signalY = sectorCenterY + Math.sin(angle) * distance;

        const signal = {
            x: signalX,
            y: signalY,
            radius: 8 + Math.random() * 4,
            rarity: signalInfo.rarity,
            signalType: signalInfo.type, // Now includes exclusive types
            duration: 4000 + Math.random() * 2000,
            createdAt: Date.now(),
            isDiscoveryBonus: true
        };

        this.gameState.entities.signals.push(signal);
    });

    console.log(`Spawned ${bonusSignals.length} discovery bonus signals in ${sectorType.name} sector [${sectorX}, ${sectorY}]`);
}
```

**Why this works:**
- Additive: pushes one more signal to `bonusSignals` array, doesn't modify existing logic
- Conditional: only adds if `sectorType.exclusiveSignalType` exists (Standard sectors skip)
- Weighted rarity: `Math.random() < 0.8` gives 80% epic, 20% legendary
- Spawns with existing loop: no separate spawning code needed
- Signal already on map when modal opens: player sees it immediately on closing modal

### Anti-Patterns to Avoid

- **Dynamic distance calculation on every render:** Don't recalculate sector distance from origin on modal show. Cache it or calculate once.
- **Sector profile mutation:** Don't modify `sector.resourceProfile` during modal display. It's read-only display logic.
- **CSS class dependencies:** Don't create new CSS classes for discovery modal sections. Use inline styles to avoid CSS conflicts.
- **Nested template literals:** Don't build HTML with deeply nested template literals. Extract subsections to helper methods.
- **Synchronous sector iteration in render:** Discovery log iterates `world.sectors` Map on modal show. Fine for <100 sectors, but don't add complex filtering logic here.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Visual progress bars | CSS-based progress elements with animation | Unicode block characters (█ ░) with string repeat | No CSS dependencies, works in all contexts, simpler |
| Discovery tracking database | Separate data structure for discovered types | Iterate world.sectors Map with Set for deduplication | Data already exists, avoid duplication |
| Signal color lookup | Separate color mapping system | Reference Phase 6 colors from GameController.js:3328-3344 | Single source of truth, no drift |
| Distance formatting | Complex unit conversion or precision logic | Math.round() or toFixed(1) on Euclidean distance | Simple, readable, matches game scale |
| Modal state management | Custom modal manager with open/close/update API | Existing pattern: add/remove 'active' class | Already works, proven in production |

**Key insight:** This phase is **data aggregation and display**, not system architecture. All required data exists in memory (`sector.type`, `sector.resourceProfile`, `world.sectors` Map), all visual patterns exist (inline styles, template literals, Unicode symbols), and all spawning patterns exist (discovery bonus signals). Don't create new systems — orchestrate existing ones.

## Common Pitfalls

### Pitfall 1: Modal Content Overload
**What goes wrong:** Trying to fit too much information makes modal overwhelming and hard to scan
**Why it happens:** Enthusiasm for showing all available data without visual hierarchy
**How to avoid:** Use section dividers (border-top), spacing (margin-bottom), and font size hierarchy (12-18px range)
**Warning signs:**
- Modal feels cluttered or hard to read
- Players skip reading and just click "Continue"
- Important info (exclusive signal, profile) buried in wall of text

**Prevention pattern:**
```javascript
// GOOD: Clear visual hierarchy with spacing and dividers
<div style="border-top: 1px solid #444; padding-top: 15px; margin-bottom: 15px;">
    <p style="color: #888; font-size: 12px;">SECTION HEADER</p>
    <p style="font-size: 16px;">Primary content</p>
    <p style="font-size: 13px; color: #aaa;">Secondary details</p>
</div>

// BAD: Everything same size and spacing
<p>Section Header</p>
<p>Primary content</p>
<p>Secondary details</p>
```

### Pitfall 2: Inconsistent Color Usage
**What goes wrong:** Using different colors for same concept across sections
**Why it happens:** Not referencing established color schemes from Phase 6
**How to avoid:** Create color constants at top of method, reference Phase 6 signal colors exactly
**Warning signs:**
- Ore Vein shows as orange in one section, yellow-orange in another
- Probethium potential bar uses different gold than Relic signal color
- Discovery pips use sector background colors instead of border colors

**Prevention pattern:**
```javascript
// GOOD: Reference Phase 6 signal colors exactly
const SIGNAL_COLORS = {
    ore_vein: '#ff6600',      // Orange - matches GameController.js:3329
    data_cache: '#00ddff',    // Cyan - matches GameController.js:3333
    relic: '#ffd700',         // Gold - matches GameController.js:3337
    exotic_crystal: 'hsl(180, 100%, 70%)'  // Prismatic (static example)
};

// BAD: Hardcoding slightly different colors
color: '#ff8800'  // Not quite orange, introduces inconsistency
```

### Pitfall 3: Missing Sector Data Handling
**What goes wrong:** Code assumes all sectors have `resourceProfile` and crashes on old saves
**Why it happens:** Phase 8 added profiles, but old sectors may lack them
**How to avoid:** Always use optional chaining (`sector?.resourceProfile`) and provide fallback UI
**Warning signs:**
- Modal shows "undefined" or blank sections
- JavaScript errors in console: "Cannot read property 'type' of undefined"
- Old saves break discovery modal

**Prevention pattern:**
```javascript
// GOOD: Defensive checks with fallback
buildResourceProfileSection(sector) {
    if (!sector || !sector.resourceProfile) {
        return '<p style="color: #666;">Profile data unavailable (legacy sector)</p>';
    }

    const profile = sector.resourceProfile;
    // ... build section
}

// BAD: Assumes data exists
const profileType = sector.resourceProfile.type; // Crash if undefined
```

### Pitfall 4: Discovery Log Performance
**What goes wrong:** Iterating large sector Maps on every modal show causes lag
**Why it happens:** Discovery log counts explored sectors by iterating `world.sectors` Map
**How to avoid:** Current implementation is fine for <200 sectors. If performance issues appear, cache discovery stats in GameState and update on sector discovery.
**Warning signs:**
- Modal takes >100ms to open (noticeable delay)
- Game stutters when opening discovery modal
- Performance degrades as player explores more sectors

**Prevention pattern:**
```javascript
// CURRENT: Direct iteration (fine for <200 sectors)
buildDiscoveryLogSection() {
    let exploredCount = 0;
    world.sectors.forEach(sector => {
        if (sector.explored) exploredCount++;
    });
    // ... rest of logic
}

// OPTIMIZATION (if needed later): Cache in GameState
// In GameState.js:
this.discoveryStats = {
    exploredCount: 0,
    foundTypes: new Set()
};

// Update in SectorManager.discoverSector():
sector.explored = true;
this.gameState.discoveryStats.exploredCount++;
this.gameState.discoveryStats.foundTypes.add(sector.type.name);

// Then modal just reads cached values (O(1) instead of O(n))
```

### Pitfall 5: Button Text Update Forgetting
**What goes wrong:** Modal still shows "OK" button instead of "Continue"
**Why it happens:** Forgetting to update button text after replacing modal content
**How to avoid:** Always update button text after setting `innerHTML` on modal content
**Warning signs:**
- Button says "OK" when spec requires "Continue"
- Button element undefined due to being replaced by innerHTML

**Prevention pattern:**
```javascript
// GOOD: Update button after content injection
const contentDiv = modal.querySelector('.modal-content');
contentDiv.innerHTML = html; // This replaces existing content including button

// Re-select button and update text
const okBtn = document.getElementById('sectorOkBtn');
if (okBtn) {
    okBtn.textContent = 'Continue';
    // Re-attach event listeners if needed
}

// BAD: Updating button before innerHTML replaces it
const okBtn = document.getElementById('sectorOkBtn');
okBtn.textContent = 'Continue'; // This button element gets destroyed
contentDiv.innerHTML = html; // Replaces button, text update lost
```

## Code Examples

Verified patterns from codebase analysis:

### Sector Distance Calculation
```javascript
// Pattern: Calculate Euclidean distance from origin (0,0) to sector coordinates
// Source: Derived from Phase 8 pattern (SectorManager.js:269-271)
calculateDistance(sectorX, sectorY) {
    return Math.sqrt(sectorX * sectorX + sectorY * sectorY).toFixed(1);
}

// Usage in header section:
<p style="color: #aaa; text-align: center;">
    ${sectorType.name} Sector · ${this.calculateDistance(sectorX, sectorY)} sectors from HQ
</p>
```

### Sector Type Border Colors Lookup
```javascript
// Pattern: Reference sector border colors for discovery log pips
// Source: SectorManager.js:162-213 sector type definitions
const SECTOR_BORDER_COLORS = {
    'Standard': '#66f',           // Line 168
    'Resource-Rich': '#fc8',      // Line 177
    'Data Haven': '#6f6',         // Line 187
    'Ancient': '#f6f',            // Line 197
    'Asteroid Field': '#f66'      // Line 207
};

// Usage in discovery log pips:
const color = SECTOR_BORDER_COLORS[type.name] || '#666';
```

### Modal HTML Injection Pattern
```javascript
// Pattern: Replace modal content with comprehensive HTML, then add event listeners
// Source: Existing pattern at SectorManager.js:341-387
showSectorDiscovery(sectorType, sectorName, sector) {
    const modal = document.getElementById('sectorModal');
    if (!modal) {
        console.error('Sector modal not found!');
        return;
    }

    // Build comprehensive HTML
    const html = this.buildSectorSurveyHTML(sectorType, sectorName, sector);

    // Inject into modal (existing pattern from line 342-369)
    const contentDiv = modal.querySelector('.modal-content');
    if (!contentDiv) {
        console.error('Modal content div not found!');
        return;
    }
    contentDiv.innerHTML = html;

    // Update button (existing pattern from lines 374-386)
    const okBtn = document.getElementById('sectorOkBtn');
    if (okBtn) {
        okBtn.textContent = 'Continue'; // Changed from "OK"

        // Remove old listeners, add new one (existing pattern)
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);

        newOkBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            console.log('Sector discovery modal closed by user');
        });
    }

    // Show modal (existing pattern from line 371)
    modal.classList.add('active');
    console.log(`Showing sector survey for ${sectorName} (${sectorType.name})`);
}
```

### Signal Richness Bar Mapping
```javascript
// Pattern: Map spawn rate multiplier to 5-segment visual bar
// Source: Phase 8 profile multipliers (SectorManager.js:274-280)
// 0.8x = 4 segments (probethium-rich)
// 1.0x = 5 segments (balanced)
// 1.5x = 5 segments (specialized profiles - maxed out)

function buildRichnessBar(spawnRateMultiplier) {
    // Scale to 1-5 range, with multiplier >1.0 maxing at 5
    const segments = Math.min(5, Math.max(1, Math.ceil(spawnRateMultiplier * 5)));
    const filled = '█'.repeat(segments);
    const empty = '░'.repeat(5 - segments);

    return `
        <span style="color: #0ff; letter-spacing: 2px; font-family: monospace;">
            ${filled}${empty}
        </span>
        <span style="margin-left: 8px;">${spawnRateMultiplier}x</span>
    `;
}

// Example outputs:
// 0.8x → ████░ 0.8x
// 1.0x → █████ 1.0x
// 1.5x → █████ 1.5x
```

### Probethium Potential Mapping
```javascript
// Pattern: Map profile type to probethium mining potential visual bar
// Source: Phase 8 profile types (SectorManager.js:274-280)
function buildProbethiumPotentialBar(profileType) {
    let segments = 0;
    let label = 'None';

    if (profileType === 'probethium-rich') {
        segments = 5;
        label = 'Rich';
    } else if (profileType === 'balanced') {
        segments = 1;
        label = 'Low';
    }
    // Other profiles (mineral/data/artifact-rich) remain 0 segments, "None"

    const filled = '█'.repeat(segments);
    const empty = '░'.repeat(5 - segments);

    return `
        <span style="color: #ffd700; letter-spacing: 2px; font-family: monospace;">
            ${filled}${empty}
        </span>
        <span style="margin-left: 8px;">${label}</span>
    `;
}

// Example outputs:
// mineral-rich → ░░░░░ None
// balanced → █░░░░ Low
// probethium-rich → █████ Rich
```

### Discovery Bonus Signal Spawning
```javascript
// Pattern: Add epic/legendary exclusive signal to existing bonus signal array
// Source: SectorManager.js:574-646 (spawnDiscoveryBonusSignals)
spawnDiscoveryBonusSignals(sectorX, sectorY, sectorType) {
    const world = this.gameState.getWorld();
    const sectorCenterX = sectorX * world.standardSectorWidth + world.standardSectorWidth / 2;
    const sectorCenterY = sectorY * world.standardSectorHeight + world.standardSectorHeight / 2;

    let bonusSignals = [];

    // Existing sector-specific bonus signals (lines 584-612)
    switch (sectorType.name) {
        case 'Standard':
            bonusSignals.push({ rarity: 'uncommon', type: 'mixed' });
            break;
        case 'Resource-Rich':
            bonusSignals.push({ rarity: 'rare', type: 'mineral' });
            bonusSignals.push({ rarity: 'uncommon', type: 'mixed' });
            break;
        case 'Data Haven':
            bonusSignals.push({ rarity: 'rare', type: 'data' });
            bonusSignals.push({ rarity: 'uncommon', type: 'data' });
            break;
        case 'Ancient':
            bonusSignals.push({ rarity: 'epic', type: 'artifact' });
            bonusSignals.push({ rarity: 'rare', type: 'mixed' });
            break;
        case 'Asteroid Field':
            bonusSignals.push({ rarity: 'legendary', type: 'mixed' });
            bonusSignals.push({ rarity: 'epic', type: 'mixed' });
            break;
    }

    // NEW: Add guaranteed epic/legendary exclusive signal (DISC-03)
    if (sectorType.exclusiveSignalType) {
        const isLegendary = Math.random() < 0.2; // 20% legendary, 80% epic
        bonusSignals.push({
            rarity: isLegendary ? 'legendary' : 'epic',
            type: sectorType.exclusiveSignalType
        });
    }

    // Spawn all bonus signals (existing loop from lines 615-635)
    bonusSignals.forEach((signalInfo, index) => {
        const angle = (Math.PI * 2 * index) / bonusSignals.length;
        const distance = 100 + Math.random() * 200;

        const signalX = sectorCenterX + Math.cos(angle) * distance;
        const signalY = sectorCenterY + Math.sin(angle) * distance;

        const signal = {
            x: signalX,
            y: signalY,
            radius: 8 + Math.random() * 4,
            rarity: signalInfo.rarity,
            signalType: signalInfo.type,
            duration: 4000 + Math.random() * 2000,
            createdAt: Date.now(),
            isDiscoveryBonus: true
        };

        this.gameState.entities.signals.push(signal);
    });

    console.log(`Spawned ${bonusSignals.length} discovery bonus signals in ${sectorType.name} sector`);
}
```

## State of the Art

| Current Approach | New Approach | Impact |
|------------------|--------------|--------|
| Simple 3-section modal (name, type, bonuses) | 8-section comprehensive survey report | Discovery feels like a significant event, not just an interruption |
| Discovery bonus spawns standard signals | Discovery bonus includes guaranteed epic/legendary exclusive signal | Exclusive signal types feel rewarding immediately on discovery |
| No discovery tracking UI | Discovery log with sectors explored count + type collection pips | Creates "gotta find them all" drive, tracks exploration progress |
| Resource profile data hidden | Signal richness and probethium potential displayed visually | Micromanagers can optimize sector choice based on exact data |
| Standard sectors feel like "nothing special" | "Open Frequency" positive framing | Standard sectors positioned as strategic choice, not consolation |

**No deprecated patterns:** All existing modal functionality preserved. Button click closes modal, research point awarded, existing discovery bonus signals spawn unchanged. This is purely additive UI enhancement.

## Open Questions

Questions requiring design decisions during planning:

### 1. Modal Width Adjustment
**What we know:** Current modal max-width is 500px (styles.css:288)
**What's unclear:** Should modal expand to accommodate richer content?
**Options:**
- **A) Keep 500px:** Content wraps, potentially taller modal
- **B) Expand to 600px:** More horizontal space for visual bars and pips
- **C) Dynamic width:** Adjust based on content sections present

**Recommendation:** Option B (expand to 600px). Visual bars (signal richness, probethium potential) benefit from horizontal space, discovery log pips fit better on one line. Update styles.css or use inline `max-width: 600px` on modal-content div.

### 2. Distance Display Precision
**What we know:** Euclidean distance calculated as `Math.sqrt(x*x + y*y)`
**What's unclear:** Show as integer or decimal?
**Options:**
- **A) Integer:** "12 sectors from HQ" (round to nearest)
- **B) One decimal:** "12.3 sectors from HQ" (fixed(1))
- **C) Contextual:** Show decimal if <10, integer if >=10

**Recommendation:** Option B (one decimal). Provides precise information for micromanagers without overwhelming. Matches existing pattern from Phase 8 research (assignedDistance stored as decimal).

### 3. Pip Style Choice
**What we know:** Discovery log shows 5 sector type indicators (found/unfound)
**What's unclear:** What visual style for pips?
**Options:**
- **A) Small circles:** 12px diameter, minimal visual weight
- **B) Squares with rounded corners:** 14px boxes, more visible
- **C) Larger circles with borders:** 16px with 2px border, prominent

**Recommendation:** Option A (small circles). Compact, doesn't dominate the discovery log section. Glow effect on found pips (box-shadow) provides sufficient visual distinction.

### 4. Exclusive Signal Section Fallback
**What we know:** Old sectors (pre-Phase 5) may lack `exclusiveSignalType` field
**What's unclear:** How to display exclusive signal section for legacy sectors?
**Options:**
- **A) Hide section entirely:** Don't show if no exclusiveSignalType
- **B) Show "Unknown" placeholder:** Display section with "Signal data unavailable"
- **C) Treat as Standard:** Show "Open Frequency" messaging

**Recommendation:** Option C (treat as Standard). Most legacy sectors are Standard anyway. Provides consistent UI structure across all discoveries. Use pattern: `const exclusiveType = sectorType.exclusiveSignalType || null;` then show Open Frequency if null.

## Sources

### Primary (HIGH confidence)
- `src/SectorManager.js` lines 341-387 - showSectorDiscovery() method, read directly from codebase
- `src/SectorManager.js` lines 574-646 - spawnDiscoveryBonusSignals() method, read directly
- `src/SectorManager.js` lines 164-214 - Sector type definitions with exclusiveSignalType and border colors
- `src/GameState.js` world.sectors Map - Sector storage pattern verified
- `index.html` lines 399-407 - Sector modal HTML structure, read directly
- `styles.css` lines 266-291 - Modal styling and max-width, read directly
- `src/GameController.js` lines 3328-3344 - Signal color definitions from Phase 6
- `src/UIManager.js` lines 353-409 - Equipment slot visualization pattern (inline styles, Unicode)
- Phase 8 RESEARCH.md - Resource profile structure and spawn rate multipliers documented

### Secondary (MEDIUM confidence)
- Phase 5 VERIFICATION.md - Exclusive signal type infrastructure confirmed working
- Phase 6 RESEARCH.md - Signal visual rendering patterns and color accessibility
- CONTEXT.md decisions - User-specified modal layout, sections, and requirements

### Tertiary (LOW confidence)
None - all findings based on direct codebase analysis and prior phase documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All infrastructure exists (modal, signals, sectors, profiles)
- Architecture: HIGH - UI extension pattern proven in equipment slots, existing modals
- Pitfalls: HIGH - Identified from defensive coding needs (optional chaining, fallbacks)
- Open questions: MEDIUM - Design decisions require UX testing and visual polish

**Research date:** 2026-02-05
**Valid until:** 30 days (stable UI systems, unlikely to change)

**Critical dependencies:**
- SectorManager.showSectorDiscovery() - Modal HTML construction and display
- SectorManager.spawnDiscoveryBonusSignals() - Guaranteed exclusive signal spawning
- world.sectors Map iteration - Discovery log tracking (count explored, track types)
- Phase 5 exclusiveSignalType fields - Exclusive signal section content
- Phase 6 signal colors - Color-coded text consistency
- Phase 8 resourceProfile objects - Signal richness and probethium potential display
