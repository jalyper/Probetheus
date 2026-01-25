# The Remnants - Story & NPC System PRD

**Version:** 1.0
**Date:** January 2026
**Status:** Planning

---

## Executive Summary

This PRD outlines the implementation of a Lovecraftian narrative system delivered through rare NPC encounters called "The Remnants." Players discover fragments of a cosmic horror mystery while working toward an endgame goal: reopening the wormhole that brought them to this region of space.

---

## Core Design Principles

1. **Mystery over Exposition** - Never explain everything; let players piece together the truth
2. **Dread through Implication** - What's unsaid is scarier than what's revealed
3. **Integrated Gameplay** - Story progression tied to resource gathering and exploration
4. **Visual Polish** - RPG-style dialogue system that feels premium and immersive
5. **Replayability** - Multiple endings encourage different playthroughs

---

## Part 1: The Remnant NPCs

### 1.1 Spawning System

**Spawn Conditions:**
- Player has explored at least 2 sectors
- Player has accumulated at least 10 Probetheum total (lifetime)
- Minimum 10 minutes since last Remnant spawn
- Maximum 1 Remnant active at a time

**Spawn Frequency:**
- Base chance: 0.5% per minute when conditions met
- Increases by 0.1% for each sector explored (max +2%)
- Increases by 0.5% if player has unspent Probetheum > 50

**Spawn Location:**
- Appears at edge of explored space
- Travels slowly across explored sectors
- Despawns after 5 minutes if not interacted with
- Emits event when spawning: `remnant:spawned`
- Emits event when despawning: `remnant:despawned`

### 1.2 Visual Design

**The Remnant Ship:**
- Small, mysterious vessel distinct from player assets
- Ethereal glow effect (pulsing opacity: 0.6 → 1.0 → 0.6)
- Subtle particle trail as it moves
- Moves at 20% of probe speed
- Clickable - cursor changes to indicate interactability

**Color Palette:**
- Primary: Deep purple (#6b2d8b)
- Glow: Soft cyan (#00ffff) with 50% opacity
- Trail particles: Fading purple/cyan gradient

**Animation:**
```javascript
// Glow animation parameters
{
    glowMin: 0.6,
    glowMax: 1.0,
    glowSpeed: 2000, // ms per cycle
    trailParticles: 5,
    trailFadeTime: 1000
}
```

### 1.3 The Five Remnants

Each Remnant has unique characteristics but shares the same interaction system.

#### Remnant 1: Keth-Varn (The Mathematician)
- **Appearance:** Crystalline/geometric ship
- **Portrait:** Hooded figure with blue crystalline eyes
- **Voice Style:** Precise, numerical, speaks in patterns
- **Specialty:** Technical hints, research guidance
- **Unlock Condition:** Default (can appear from start)

#### Remnant 2: The Whisperer (The Prophet)
- **Appearance:** Ship that flickers in and out of visibility
- **Portrait:** Hooded figure with white glowing eyes
- **Voice Style:** Cryptic, speaks of futures and possibilities
- **Specialty:** Warnings, prophecies
- **Unlock Condition:** Player has 3+ mining stations

#### Remnant 3: Mira-Sol (The Human)
- **Appearance:** Damaged but recognizable human ship
- **Portrait:** Hooded figure with warm amber eyes
- **Voice Style:** Familiar, comforting, slightly off
- **Specialty:** Hope, hints about escape
- **Unlock Condition:** Player has researched any alien tech

#### Remnant 4: The Archivist (The Ancient)
- **Appearance:** Massive, ancient vessel covered in glyphs
- **Portrait:** Hooded figure with dim red eyes
- **Voice Style:** Slow, fragmented, impossibly old
- **Specialty:** Deep lore, historical records
- **Unlock Condition:** Player has 100+ lifetime Probetheum

#### Remnant 5: Null (The Void-Touched)
- **Appearance:** Absence of light in ship shape
- **Portrait:** Hooded figure with void-black eyes (darker than background)
- **Voice Style:** Unsettling, knows things it shouldn't
- **Specialty:** Forbidden knowledge, endgame hints
- **Unlock Condition:** Player has purchased 10+ story fragments

---

## Part 2: Dialogue System UI

### 2.1 Layout Specification

**Dialogue Container:**
- Position: Bottom center of screen
- Width: 80% of viewport (max 900px)
- Height: 200px
- Background: Semi-transparent dark gradient
- Border: 1px subtle glow matching NPC color

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────┐                                                    │
│  │         │   NPC NAME                                         │
│  │ PORTRAIT│   ─────────────────────────────────────────────   │
│  │         │   "Dialogue text appears here, with a typewriter  │
│  │         │   effect that reveals the message gradually..."    │
│  └─────────┘                                                    │
│                                        [Continue]  [Trade]  [X] │
└─────────────────────────────────────────────────────────────────┘
```

**Portrait Section:**
- Position: Left side
- Size: 150px × 150px
- Border: 2px with NPC's signature color glow
- Contains: Hooded figure with glowing eyes

**Message Section:**
- Position: Right of portrait
- NPC name at top (colored text with glow)
- Divider line
- Message area with typewriter effect
- Font: Monospace or sci-fi themed

**Button Section:**
- Position: Bottom right of container
- Buttons: "Continue", "Trade", "Close"
- Styled to match game UI

### 2.2 Portrait Design (Phase 1 - Placeholder)

**Base Hooded Figure:**
- Canvas: 150px × 150px
- Hood: Solid black (#0a0a0f) curved shape
- Face area: Slightly lighter black (#151520)
- Eyes: Two glowing orbs, color varies by NPC
- Subtle inner shadow for depth

**Eye Colors by NPC:**
- Keth-Varn: Cyan (#00ffff)
- The Whisperer: White (#ffffff)
- Mira-Sol: Amber (#ffaa00)
- The Archivist: Dim red (#aa3333)
- Null: Void black (#000000) with inverted glow

**Eye Animation:**
- Subtle pulse (scale 1.0 → 1.1 → 1.0)
- Occasional blink (opacity fade)
- Glow intensity varies with speech

### 2.3 Typewriter Effect

```javascript
{
    baseSpeed: 30,        // ms per character
    punctuationPause: 200, // extra pause for . ! ?
    commaPause: 100,       // extra pause for ,
    skipOnClick: true,     // click to show full text
    soundEnabled: true,    // subtle tick sound per character
}
```

### 2.4 Dialogue Flow

1. Player clicks Remnant ship
2. Game pauses (or slows significantly)
3. Dialogue container slides up from bottom
4. Portrait fades in with glow effect
5. NPC name appears
6. Greeting message types out
7. Player can: Continue (next message), Trade (open shop), Close (end interaction)
8. On close, container slides down, game resumes

---

## Part 3: Story Content

### 3.1 Story Fragment Structure

```javascript
{
    id: 'fragment_001',
    title: 'The Arrival Pattern',
    act: 1,
    cost: 5, // Probetheum
    prerequisites: [], // Other fragment IDs required first
    remnant: 'any', // Which NPC can sell this, or 'any'
    dialogue: [
        "You're not the first to come through a wormhole into this place.",
        "The pattern is always the same. A civilization reaches for the stars...",
        "...and something reaches back."
    ],
    loreUnlock: 'arrival_pattern', // Adds to player's lore journal
}
```

### 3.2 Act 1: Orientation (Fragments 1-5)

**Fragment 1: "The Calling"**
- Cost: 1 Probetheum
- Remnant: Any
- Dialogue:
  - "Ah, another arrival. The wormhole that brought you here... you think it malfunctioned?"
  - "It didn't. It was *called*. Something in this region of space reaches out across the void."
  - "It whispers to technology. To ambition. To the desperate need to explore."
  - "And when it calls... ships answer."

**Fragment 2: "The Remnants"**
- Cost: 2 Probetheum
- Remnant: Any
- Dialogue:
  - "We call ourselves the Remnants. Appropriate, don't you think?"
  - "We're what's left of civilizations that came before yours."
  - "Some of us remember our worlds. Some have forgotten everything but the void."
  - "In time, you may join us. Or you may escape. Few have managed the latter."

**Fragment 3: "Tears of the Forgotten"**
- Cost: 3 Probetheum
- Remnant: Keth-Varn
- Dialogue:
  - "Probetheum. Such a clinical name for something so..."
  - "The ancients called it *Tears of the Forgotten*."
  - "It forms when consciousness dies in the void. Every gram carries memories."
  - "You mine it so eagerly. Have you ever wondered what you're really collecting?"

**Fragment 4: "The Signals"**
- Cost: 3 Probetheum
- Remnant: The Whisperer
- Dialogue:
  - "The signals you chase across the stars... learn to tell the real from the echoes."
  - "Some are natural. Planets, resources, the ordinary fabric of space."
  - "Others are echoes of the dead. Civilizations that screamed into the void as they fell."
  - "And some... some are invitations. Something *wants* to be found."

**Fragment 5: "First Count"**
- Cost: 5 Probetheum
- Remnant: The Archivist
- Dialogue:
  - "You want numbers? I have numbers."
  - "Twenty-three civilizations before yours have entered this region."
  - "I have recorded them all. Their hopes. Their discoveries. Their endings."
  - "Twenty-three arrivals. Twenty-three... failures. Will you be the twenty-fourth?"

### 3.3 Act 2: Investigation (Fragments 6-12)

**Fragment 6: "The Pattern"**
- Cost: 10 Probetheum
- Prerequisites: ['fragment_001', 'fragment_005']
- Remnant: Keth-Varn
- Dialogue:
  - "I've analyzed the data from every civilization that's come before."
  - "There's a pattern in the mining. The more you extract, the more attention you attract."
  - "Probetheum isn't just valuable. It's... connected. To something larger."
  - "Every gram you take, something *notices*."

**Fragment 7: "The Gifts"**
- Cost: 10 Probetheum
- Prerequisites: ['fragment_003']
- Remnant: Mira-Sol
- Dialogue:
  - "The alien technology you find out there... the research you do..."
  - "You assume it belonged to someone who died here."
  - "What if it was left for you? On purpose?"
  - "What if you're being... equipped? For something?"

**Fragment 8: "The Watcher"**
- Cost: 15 Probetheum
- Prerequisites: ['fragment_006']
- Remnant: The Whisperer
- Dialogue:
  - "There's something in the void between stars."
  - "It doesn't move. It doesn't need to. It's... everywhere. And nowhere."
  - "We call it the Watcher. We don't know what it calls itself."
  - "It watches. It waits. It *cultivates*."

**Fragment 9: "The Harvest"**
- Cost: 20 Probetheum
- Prerequisites: ['fragment_008']
- Remnant: Null
- Dialogue:
  - "You think you're prey? No. Prey is hunted."
  - "You're not prey. You're a *crop*."
  - "The Watcher doesn't chase. It plants. It tends. It reaps."
  - "What do you think happens to civilizations that grow too strong?"

**Fragment 10: "The Escapees"**
- Cost: 20 Probetheum
- Prerequisites: ['fragment_002']
- Remnant: Mira-Sol
- Dialogue:
  - "Some have escaped. I need you to know that. It IS possible."
  - "I've seen the records. Ships that made it through the wormhole. Went home."
  - "But the records are... incomplete. About what they left behind."
  - "About what it cost."

**Fragment 11: "The Bait"**
- Cost: 25 Probetheum
- Prerequisites: ['fragment_004', 'fragment_007']
- Remnant: The Archivist
- Dialogue:
  - "I've catalogued every signal type that appears in this region."
  - "Natural signals follow predictable patterns. Stars, planets, asteroids."
  - "But some signals appear only after a civilization reaches a certain... threshold."
  - "Almost as if they're being revealed. As if something is showing you exactly what you need to grow stronger."

**Fragment 12: "The Memory"**
- Cost: 25 Probetheum
- Prerequisites: ['fragment_003']
- Remnant: Any
- Dialogue:
  - "I tried to stop mining Probetheum once. When I learned what it was."
  - "But the memories it carries... they're not just noise."
  - "Sometimes, if you're quiet, you can hear them. Feel them."
  - "They tried to escape too. They were so close. So close..."

### 3.4 Act 3: Revelation (Fragments 13-17)

**Fragment 13: "The Truth of Probetheum"**
- Cost: 50 Probetheum
- Prerequisites: ['fragment_006', 'fragment_012']
- Remnant: The Archivist
- Dialogue:
  - "You've mined enough now. You deserve to know."
  - "Probetheum forms when conscious beings die in this region of space."
  - "Not their bodies. Their *awareness*. Their thoughts, hopes, fears."
  - "Crystallized into something you can hold. Something you can spend."
  - "Every civilization that failed here... became the Probetheum the next civilization would mine."

**Fragment 14: "The Cycle"**
- Cost: 50 Probetheum
- Prerequisites: ['fragment_009', 'fragment_010']
- Remnant: The Whisperer
- Dialogue:
  - "The cycle is elegant in its horror."
  - "Civilizations arrive. They mine. They grow strong on the remains of the fallen."
  - "When they're strong enough... when they have enough Probetheum..."
  - "They can open the wormhole. They can escape."
  - "But opening the wormhole sends a new call. A new invitation. Into a new civilization's dreams."

**Fragment 15: "The Gate's Price"**
- Cost: 75 Probetheum
- Prerequisites: ['fragment_014']
- Remnant: Mira-Sol
- Dialogue:
  - "I've seen the wormhole reopen. Once."
  - "A civilization called the Veth-kai. Brilliant. Determined. They gathered everything they needed."
  - "They powered the gate. Stepped through."
  - "But not all of them. The gate... it takes a portion. A toll."
  - "The lucky ones went home. The others became the Probetheum you've been mining."

**Fragment 16: "The Watcher's Nature"**
- Cost: 100 Probetheum
- Prerequisites: ['fragment_008', 'fragment_013']
- Remnant: Null
- Dialogue:
  - "You want to understand the Watcher? You can't. Not really."
  - "It's not evil. It doesn't understand evil. It simply *is*."
  - "Like gravity. Like entropy. Like hunger."
  - "It exists in the space between thoughts. It feeds on consciousness. On ending."
  - "And it is *patient*. It has been patient for longer than your species has existed."

**Fragment 17: "The Other Option"**
- Cost: 100 Probetheum
- Prerequisites: ['fragment_014', 'fragment_015']
- Remnant: The Archivist
- Dialogue:
  - "There's another way. I've seen it in the records. Once. Only once."
  - "A civilization that refused to escape. That refused to continue the cycle."
  - "They collapsed the void pocket. Sealed the region forever."
  - "Nothing comes in. Nothing goes out. Including them."
  - "They're still there. Guarding. Warning. For eternity."

### 3.5 Act 4: The Path Home (Fragments 18-20)

**Fragment 18: "The Wormhole Protocol"**
- Cost: 200 Probetheum
- Prerequisites: ['fragment_015', 'fragment_017']
- Remnant: Keth-Varn
- Dialogue:
  - "You want to know how to escape? Here's the mathematics."
  - "The wormhole requires 500 units of Probetheum to power."
  - "It requires knowledge - alien technology that can interface with the gate."
  - "And it requires a beacon. A structure to focus the energy."
  - "Build the beacon. Power the gate. Make your choice."

**Fragment 19: "The True Choice"**
- Cost: 250 Probetheum
- Prerequisites: ['fragment_018']
- Remnant: The Whisperer
- Dialogue:
  - "When you stand at the gate, you'll have four paths."
  - "Escape - and doom another civilization to take your place."
  - "Sacrifice - collapse the void and end the cycle forever. With you inside."
  - "Surrender - offer yourself to the Watcher. Become part of something vast and terrible."
  - "Or remain - become a Remnant. Guide the next arrivals. Forever."

**Fragment 20: "The Final Truth"**
- Cost: 500 Probetheum
- Prerequisites: All other fragments
- Remnant: Null
- Dialogue:
  - "You've learned everything. You understand the horror of this place."
  - "But there's one more truth. The worst truth."
  - "The Watcher doesn't need to trap you. The cycle could end any time."
  - "It continues because civilizations *choose* to escape. They *choose* to call the next victims."
  - "The real monster was never the Watcher."
  - "It was always you. Every civilization that put their survival above all others."
  - "So. What will you choose?"

---

## Part 4: Trade System

### 4.1 Remnant Shop Interface

When player selects "Trade," show a shop interface:

```
┌─────────────────────────────────────────────────────────────────┐
│  THE REMNANT'S OFFERINGS                       Probetheum: 127  │
│  ═══════════════════════════════════════════════════════════════│
│                                                                 │
│  📜 STORY FRAGMENTS                                             │
│  ├─ The Calling .......................... 1P  [PURCHASED]     │
│  ├─ The Pattern ......................... 10P  [BUY]           │
│  └─ The Truth of Probetheum ............ 50P  [LOCKED]         │
│                                                                 │
│  🛒 DARK MARKET                                                 │
│  ├─ Rare Signal Map .................... 25P  [BUY]            │
│  ├─ Probe Speed Boost .................. 15P  [BUY]            │
│  └─ Mining Efficiency Module ........... 40P  [BUY]            │
│                                                                 │
│                                               [Close]           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Story Fragment States

- **Available:** Can be purchased, shows cost
- **Purchased:** Already owned, greyed out
- **Locked:** Prerequisites not met, shows requirements on hover

### 4.3 Dark Market Integration

Remnants also provide access to Dark Market items, consolidating the shopping experience.

---

## Part 5: Endgame - The Wormhole Protocol

### 5.1 Prerequisites to Trigger Endgame

1. **Probetheum:** 500+ accumulated
2. **Story Fragments:** At least 15 of 20 purchased
3. **Alien Research:** "Void Navigation" tree complete (new research branch)
4. **Structure:** Wormhole Beacon built (new building type)

### 5.2 Wormhole Beacon

**Building Requirements:**
- Cost: 200 Minerals, 150 Data, 100 Artifacts, 50 Probetheum
- Must be built on a hub
- Takes 5 minutes to construct
- Once built, emits `endgame:beaconReady` event

**Visual:**
- Large structure with swirling energy effect
- Pulses when ready to activate
- Color shifts based on accumulated Probetheum

### 5.3 The Final Choice

When player activates the beacon with sufficient resources:

**Cinematic Sequence:**
1. Screen darkens, stars fade
2. Wormhole aperture appears (callback to intro animation)
3. Four options presented:

**Option A: Escape**
- "Step through the gate. Return home. Leave this nightmare behind."
- "The gate will call a new civilization to take your place."
- Ending: Bittersweet - you survive, cycle continues

**Option B: Break the Cycle**
- "Collapse the void pocket. End the cycle forever."
- "You will be trapped here. But no one else will ever suffer this fate."
- Ending: Heroic sacrifice - you're trapped but save countless futures

**Option C: Embrace the Void**
- "Offer yourself to the Watcher. Become part of something infinite."
- "You will cease to exist as you know it. But you will *understand*."
- Ending: Cosmic horror - you merge with the entity (bad ending?)

**Option D: Become a Remnant**
- "Stay behind. Guide those who come after."
- "You cannot go home. But you can help others find their way."
- Ending: Hopeful - you become an NPC for future players (meta)

### 5.4 Ending Sequences

Each ending has unique:
- Cinematic sequence (30-60 seconds)
- Epilogue text
- Achievement unlock
- Credits variant

---

## Part 6: Technical Implementation

### 6.1 New Files Required

```
src/
├── RemnantManager.js      # NPC spawning, movement, interaction
├── DialogueSystem.js      # RPG dialogue UI component
├── StoryManager.js        # Story state, fragments, progression
├── EndgameManager.js      # Wormhole beacon, endings
└── LoreJournal.js         # Player's collected lore (optional)

assets/
├── portraits/
│   ├── remnant_base.png       # Base hooded figure
│   ├── eyes_cyan.png          # Keth-Varn eyes
│   ├── eyes_white.png         # Whisperer eyes
│   ├── eyes_amber.png         # Mira-Sol eyes
│   ├── eyes_red.png           # Archivist eyes
│   └── eyes_void.png          # Null eyes
├── ships/
│   └── remnant_ship.png       # Remnant vessel sprite
└── audio/
    ├── dialogue_tick.wav      # Typewriter sound
    ├── remnant_ambient.wav    # Ambient during dialogue
    └── remnant_spawn.wav      # NPC appearance sound
```

### 6.2 State Management

```javascript
// GameState additions
{
    story: {
        fragmentsPurchased: Set(), // IDs of purchased fragments
        remnantsEncountered: Set(), // Which NPCs player has met
        totalProbetheumSpentOnStory: 0,
        endgameUnlocked: false,
        endingChosen: null, // 'escape', 'sacrifice', 'embrace', 'remnant'
    },
    remnant: {
        active: null, // Currently spawned remnant
        lastSpawnTime: 0,
        spawnCooldown: 600000, // 10 minutes
    }
}
```

### 6.3 Event System

```javascript
// New events
'remnant:spawned'        // { remnantId, position }
'remnant:despawned'      // { remnantId, reason }
'remnant:interacted'     // { remnantId }
'dialogue:started'       // { remnantId }
'dialogue:ended'         // { remnantId }
'story:fragmentPurchased' // { fragmentId, cost }
'story:actCompleted'     // { actNumber }
'endgame:beaconBuilt'    // {}
'endgame:activated'      // {}
'endgame:choiceMade'     // { choice }
'endgame:complete'       // { ending }
```

---

## Part 7: Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create RemnantManager.js - basic spawning and movement
- [ ] Create remnant ship sprite (placeholder)
- [ ] Implement click detection and interaction trigger
- [ ] Add glow/fade animation to remnant ship
- [ ] Create DialogueSystem.js - basic UI container
- [ ] Design hooded figure portrait (placeholder with glowing eyes)

### Phase 2: Dialogue System (Week 2)
- [ ] Implement typewriter effect
- [ ] Add portrait section with eye color variations
- [ ] Implement Continue/Trade/Close buttons
- [ ] Add slide-in/slide-out animations
- [ ] Create ambient audio during dialogue
- [ ] Polish visual effects (glow, borders, backgrounds)

### Phase 3: Story Content (Week 3)
- [ ] Create StoryManager.js
- [ ] Implement all 20 story fragments
- [ ] Add prerequisite checking system
- [ ] Implement fragment purchase flow
- [ ] Create trade interface UI
- [ ] Integrate Dark Market into Remnant trade

### Phase 4: Endgame (Week 4)
- [ ] Create EndgameManager.js
- [ ] Implement Wormhole Beacon building
- [ ] Add "Void Navigation" research branch
- [ ] Create final choice interface
- [ ] Implement 4 ending sequences
- [ ] Add ending cinematics (basic)

### Phase 5: Polish & Testing (Week 5)
- [ ] Create unique portraits for each Remnant
- [ ] Add sound effects
- [ ] Implement Lore Journal (optional)
- [ ] Balance Probetheum costs
- [ ] Integration testing
- [ ] Playtest full story flow

---

## Part 8: Testing Requirements

### 8.1 Unit Tests

```javascript
// RemnantManager tests
- 'remnant spawns when conditions are met'
- 'remnant does not spawn during cooldown'
- 'remnant despawns after timeout'
- 'remnant is clickable and triggers interaction'
- 'correct remnant type spawns based on unlock conditions'

// DialogueSystem tests
- 'dialogue container appears on interaction'
- 'typewriter effect displays text correctly'
- 'buttons are functional'
- 'dialogue closes properly'

// StoryManager tests
- 'fragments unlock based on prerequisites'
- 'purchased fragments are tracked'
- 'probetheum is deducted on purchase'
- 'act completion is detected'

// EndgameManager tests
- 'beacon cannot be built without requirements'
- 'beacon build completes successfully'
- 'ending choice is recorded'
- 'correct ending sequence plays'
```

### 8.2 Integration Test: Full Playthrough

**Test Name:** `complete-story-playthrough.spec.js`

**Purpose:** Validate entire story experience from fresh start to ending.

```javascript
test.describe('Complete Story Playthrough', () => {

    test('player can experience full story from start to ending', async ({ page }) => {
        // === SETUP ===
        // Start new game, skip intro
        // Fast-forward time and resources for testing

        // === ACT 1: FIRST REMNANT ENCOUNTER ===
        // Verify remnant spawns after conditions met
        // Interact with remnant
        // Verify dialogue system displays correctly
        // Purchase first story fragment
        // Verify fragment is recorded in state
        // Verify Probetheum was deducted

        // === ACT 2: STORY PROGRESSION ===
        // Grant resources to purchase more fragments
        // Verify prerequisite system works
        // Purchase fragments 1-12
        // Verify Act 1 and Act 2 completion events

        // === ACT 3: REVELATION ===
        // Verify expensive fragments are available
        // Purchase fragments 13-17
        // Verify player state reflects progress

        // === ACT 4: ENDGAME PREPARATION ===
        // Grant sufficient Probetheum (500+)
        // Complete Void Navigation research
        // Build Wormhole Beacon
        // Verify endgame:beaconReady event

        // === FINAL CHOICE ===
        // Purchase final fragments
        // Activate beacon
        // Verify choice interface appears
        // Make ending choice
        // Verify ending sequence plays
        // Verify endgame:complete event with correct ending

        // === VALIDATION ===
        // Check all story events were emitted in correct order
        // Verify final game state
        // Confirm resources match expected values
    });

    test('story fragments respect prerequisites', async ({ page }) => {
        // Try to purchase fragment with unmet prerequisites
        // Verify purchase is blocked
        // Purchase prerequisite fragment
        // Verify originally locked fragment is now available
    });

    test('remnant encounters match player progression', async ({ page }) => {
        // Early game: Only basic remnants appear
        // Mid game: Whisperer unlocks after mining stations
        // Late game: Null unlocks after 10+ fragments
    });

    test('all four endings are achievable', async ({ page }) => {
        // Test each ending path
        for (const ending of ['escape', 'sacrifice', 'embrace', 'remnant']) {
            // Setup game state for ending
            // Make choice
            // Verify correct ending sequence
        }
    });

    test('dialogue system displays all content correctly', async ({ page }) => {
        // For each fragment:
        // Trigger dialogue
        // Verify all lines display
        // Verify typewriter effect works
        // Verify portrait matches remnant
    });
});
```

### 8.3 Test Utilities

```javascript
// test-utils/story-helpers.js

async function grantResources(page, { minerals, data, artifacts, probetheum }) {
    await page.evaluate(({ m, d, a, p }) => {
        const gs = window.game.gameState;
        gs.resources.minerals = m;
        gs.resources.data = d;
        gs.resources.artifacts = a;
        gs.probethium.current = p;
    }, { m: minerals, d: data, a: artifacts, p: probetheum });
}

async function purchaseFragment(page, fragmentId) {
    await page.evaluate((id) => {
        window.game.storyManager.purchaseFragment(id);
    }, fragmentId);
}

async function spawnRemnant(page, remnantId) {
    await page.evaluate((id) => {
        window.game.remnantManager.forceSpawn(id);
    }, remnantId);
}

async function completeResearch(page, researchId) {
    await page.evaluate((id) => {
        const research = window.game.gameState.getResearchSystem();
        research.researched.add(id);
    }, researchId);
}

async function buildBeacon(page) {
    await page.evaluate(() => {
        window.game.endgameManager.buildBeacon();
    });
}
```

---

## Part 9: Visual Reference

### 9.1 Portrait Mockup (ASCII)

```
     ████████████████████
   ██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██
  █▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█
 █▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█
█▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█
█▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█
█▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█
█▓▓▓▓▓▓▓▓░░░░▓▓▓▓░░░░▓▓▓▓▓▓▓▓█  <- Glowing eyes
█▓▓▓▓▓▓▓▓░██░▓▓▓▓░██░▓▓▓▓▓▓▓▓█
█▓▓▓▓▓▓▓▓░░░░▓▓▓▓░░░░▓▓▓▓▓▓▓▓█
█▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█
█▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█
 █▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█
  █▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█
   ██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓██
     ████████████████████

█ = Hood (solid black #0a0a0f)
▓ = Face shadow (#151520)
░ = Eye glow (color varies)
```

### 9.2 Dialogue Box Mockup

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ┌──────────────┐                                                            ║
║  │              │    KETH-VARN                                               ║
║  │    ░░  ░░    │    ═══════════════════════════════════════════════════════ ║
║  │              │                                                            ║
║  │  [PORTRAIT]  │    "You've mined enough now. You deserve to know.          ║
║  │              │    Probetheum forms when conscious beings die in this      ║
║  │              │    region of space. Not their bodies. Their awareness."    ║
║  └──────────────┘                                                            ║
║                                                                              ║
║                                           [ Continue ]  [ Trade ]  [ ✕ ]    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Part 10: Success Criteria

1. **Remnants spawn reliably** when conditions are met
2. **Dialogue system is visually polished** and feels RPG-quality
3. **All 20 story fragments** are purchasable and display correctly
4. **Story progression is gated** by prerequisites and Probetheum
5. **Endgame is achievable** and all 4 endings work
6. **Integration test passes** validating complete playthrough
7. **Player engagement** - story creates desire to mine more Probetheum
8. **Mystery is preserved** - players discuss theories, not explanations

---

## Appendix A: Dialogue Style Guide

### Keth-Varn (The Mathematician)
- Precise, measured speech
- References numbers, patterns, calculations
- Slightly condescending but helpful
- Example: "The probability of your survival is... non-zero. Interesting."

### The Whisperer (The Prophet)
- Cryptic, speaks in riddles
- References time, futures, possibilities
- Unsettling certainty about uncertain things
- Example: "I've seen this moment. All versions of it. You're in one of the better ones."

### Mira-Sol (The Human)
- Warm, familiar, slightly too perfect
- Offers hope but avoids specifics
- Something is off but hard to pinpoint
- Example: "Don't worry. Your species makes it. Some of you. Isn't that enough?"

### The Archivist (The Ancient)
- Slow, fragmented, impossibly old
- Speaks of records, history, cycles
- Detached, observational
- Example: "I have... recorded... eight hundred... forty seven... cycles. Yours is... interesting."

### Null (The Void-Touched)
- Unsettling, knows things it shouldn't
- Speaks uncomfortable truths
- May or may not be trustworthy
- Example: "You want to see what's really out there? I can show you. But you cannot unsee."

---

## Appendix B: Probetheum Economy Balance

**Expected Probetheum Earning Rate:**
- Early game: 0.5-1 per hour
- Mid game (1 mining station): 2-3 per hour
- Late game (3+ mining stations): 5-10 per hour

**Total Story Cost:**
- Act 1 (5 fragments): 14 Probetheum
- Act 2 (7 fragments): 125 Probetheum
- Act 3 (5 fragments): 375 Probetheum
- Act 4 (3 fragments): 950 Probetheum
- **Total: ~1,464 Probetheum**

**Plus Endgame:**
- Wormhole Beacon: 50 Probetheum
- Gate Power: 500 Probetheum
- **Total for full completion: ~2,000 Probetheum**

**Expected Time to Complete:**
- Casual player: 20-30 hours
- Dedicated player: 10-15 hours
- Speedrun potential: 5-8 hours (with optimal mining)
