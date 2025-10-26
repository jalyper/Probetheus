# Probetheus Design Notes & Future Ideas

## Entangled Hubs (Future Feature)

### Concept
Two hubs that share inventories despite being on opposite sides of the map, allowing shuttles to transfer exotic, far-away resources to their local network.

### Design Ideas

**Basic Mechanic:**
- "Entangle" two hubs together (requires research unlock?)
- Shared inventory between entangled hubs
- Resources collected at Hub A are immediately available at Hub B
- Both hubs act as one unit for resource purposes

**Use Cases:**
1. **Remote Resource Access**: Mine rare resources from distant sectors without complex supply chains
2. **Strategic Expansion**: Establish forward bases that feed resources back to main hub
3. **Trade Networks**: Create hub pairs for specific resource types

**Implementation Considerations:**

**Option 1: Quantum Entanglement (Limited Pairs)**
- Each hub can only be entangled with ONE other hub
- Requires "Quantum Entanglement" research
- Cost: 500 Minerals, 200 Data, 100 Artifacts
- Visual: Glowing purple connection line on minimap
- Limitation: Creates strategic choice of which hubs to link

**Option 2: Hub Network (Multiple Connections)**
- Hubs can join a shared network
- All networked hubs share resources
- More expensive research path
- Requires "Hub Network Protocol" tech
- Visual: Network graph overlay on map

**Option 3: Entanglement Gates (Advanced)**
- Build special "Entanglement Gate" structures
- Gates create portals between distant locations
- Shuttles can instantly travel through gates
- More interactive than passive sharing
- Visual: Animated portal effects

**Resource Considerations:**
- Should entangled hubs share ALL resources or just specific types?
- Option A: Share everything (simple, powerful)
- Option B: Share only exotic resources (artifacts, special ores)
- Option C: Configurable per-hub (complex but flexible)

**Balance Questions:**
- Does this make the game too easy?
- Should there be a maintenance cost (energy, data)?
- Should entanglement have a range limit?
- Should there be a resource transfer delay?

**Research Tree Integration:**
```
Advanced Logistics Branch:
├── Supply Shuttles (basic resource transport)
├── Automated Convoys (improved efficiency)
└── Quantum Entanglement (hub sharing)
    ├── Entanglement Stability (reduce cost)
    └── Multi-Hub Networks (more connections)
```

**Visual Design:**
- Entangled hubs glow with matching colors
- Pulsing connection line between hubs on map
- Special particle effects when resources transfer
- UI indicator showing entangled partner hub

**User Experience:**
1. Research "Quantum Entanglement"
2. Select first hub → "Entangle Hub" button appears
3. Click second hub → Confirmation dialog
4. Spend resources → Hubs become entangled
5. Visual feedback: Connection established
6. Resource panels update to show shared inventory

**Technical Implementation Notes:**
- Hub objects need `entangledWith` property (hub ID or null)
- Resource getters/setters check for entanglement
- Save/load system needs to preserve entanglement state
- UI needs to show entangled status in hub detail panel

---

## Other Future Ideas

### Advanced Probe Behaviors
- AI-controlled exploration patterns
- Swarm tactics (multiple probes coordinate)
- Dynamic route adjustment based on discoveries

### Resource Processing Chains
- Refineries convert raw materials to processed goods
- Multi-stage production lines
- Quality tiers (basic → refined → exotic)

### Diplomatic System
- Encounter alien races in distant sectors
- Trade agreements for unique resources
- Reputation system affecting prices/access

### Modular Probe Customization
- Hull types (scout, cargo, combat)
- Engine upgrades (speed, efficiency, range)
- Specialized equipment slots
- Visual customization (colors, decals)

### Challenge Modes
- Speedrun mode (reach X sectors in Y time)
- Limited resources (harder economy)
- Permadeath mode (probes lost permanently)
- Sector challenges (special objectives)

---

## Recently Removed Features

### Outpost Buildings
**Removed:** January 2025  
**Reason:** No clear use case or differentiation from hubs/facilities  
**Status:** Code remains in place but UI button removed  
**Future:** Could be repurposed for entanglement gates or specialized structures

---

## Development Philosophy

**Keep It Simple:**
- Focus on core gameplay loops
- Add complexity only when it enhances fun
- Every feature should have clear player benefit

**Performance Matters:**
- Game runs on Canvas 2D (no framework bloat)
- Smooth performance on modest hardware
- Efficient data structures and algorithms

**Player-Friendly:**
- Clear tutorials for new mechanics
- Visual feedback for all actions
- No hidden mechanics or unclear systems

**Steam-Ready:**
- Desktop app via Electron
- Reliable save system
- Professional UI/UX
- Achievement system integration
