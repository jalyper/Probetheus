class SpaceIdleGame {
    constructor() {
        this.canvas = document.getElementById('galaxyCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.planetCanvas = document.getElementById('planetCanvas');
        this.planetCtx = this.planetCanvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        this.stars = [];
        this.probes = [];
        this.signals = [];
        this.miningOutposts = [];
        this.miningFacilities = [];
        this.reconHubs = [];
        this.deployMode = false;
        this.buildingMode = false;
        this.selectedProbe = null;
        this.buildingPreview = null;
        this.cameraLocked = false;
        this.lockedProbe = null;
        this.deploymentPoints = [];
        this.selectedHub = null;
        this.hubPlacementMode = false;
        this.mousePosition = { x: 0, y: 0 };
        this.version = '0.3.1-pre-alpha';
        
        this.sectors = new Map();
        this.currentSector = { x: 0, y: 0 };
        this.viewOffset = { x: 0, y: 0 };
        this.standardSectorWidth = 1920;  // Fixed sector width
        this.standardSectorHeight = 1080; // Fixed sector height
        this.zoomLevel = 1.3;  // Zoomed out to see borders
        
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.lastViewOffset = { x: 0, y: 0 };
        
        this.resources = {
            probes: 0,  // Now managed per-hub
            minerals: 0,
            data: 0,
            artifacts: 0,
            exoticMinerals: 0
        };
        
        this.researchSystem = {
            points: 1, // Start with 1 research point
            unlocked: false,
            researched: new Set(),
            tree: {
                'collection': {
                    id: 'collection',
                    name: 'Collection Specialization',
                    description: 'Unlocks advanced resource collection technologies',
                    cost: 0, // Starting specialization
                    position: { x: 50, y: 200 },
                    researched: false,
                    available: true,
                    children: ['auto_minerals', 'auto_data', 'auto_artifacts']
                },
                'auto_minerals': {
                    id: 'auto_minerals',
                    name: 'Mineral Collection',
                    description: 'Auto-Collectors can gather minerals from common signals automatically',
                    cost: 1,
                    position: { x: 200, y: 100 },
                    researched: false,
                    available: false,
                    children: ['auto_all'],
                    parent: 'collection'
                },
                'auto_data': {
                    id: 'auto_data', 
                    name: 'Data Collection',
                    description: 'Auto-Collectors can gather data from common signals automatically',
                    cost: 1,
                    position: { x: 200, y: 200 },
                    researched: false,
                    available: false,
                    children: ['auto_all'],
                    parent: 'collection'
                },
                'auto_artifacts': {
                    id: 'auto_artifacts',
                    name: 'Artifact Collection', 
                    description: 'Auto-Collectors can gather artifacts from common signals automatically',
                    cost: 1,
                    position: { x: 200, y: 300 },
                    researched: false,
                    available: false,
                    children: ['auto_all'],
                    parent: 'collection'
                },
                'auto_all': {
                    id: 'auto_all',
                    name: 'Universal Collection',
                    description: 'Auto-Collectors automatically gather ALL resource types from any signal rarity',
                    cost: 2,
                    position: { x: 350, y: 200 },
                    researched: false,
                    available: false,
                    children: [],
                    parent: ['auto_minerals', 'auto_data', 'auto_artifacts']
                }
            }
        };
        
        this.sectorTypes = [
            { name: 'Mineral Rich', mineralBonus: 2, dataBonus: 0.5, artifactBonus: 0.5, color: '#4a7c59', borderColor: '#6fa77f' },
            { name: 'Data Stream', mineralBonus: 0.5, dataBonus: 2, artifactBonus: 0.5, color: '#3d5a80', borderColor: '#5d7aa0' },
            { name: 'Ancient Ruins', mineralBonus: 0.5, dataBonus: 0.5, artifactBonus: 2, color: '#8b5a3c', borderColor: '#ab7a5c' },
            { name: 'Balanced', mineralBonus: 1, dataBonus: 1, artifactBonus: 1, color: '#555', borderColor: '#777' },
            { name: 'Exotic', mineralBonus: 1.5, dataBonus: 1.5, artifactBonus: 1.5, color: '#8b3a8b', borderColor: '#ab5aab' },
            { name: 'Asteroid Field', mineralBonus: 4, dataBonus: 0.3, artifactBonus: 0.3, color: '#8b4513', borderColor: '#ff6b35', probeDestructionChance: 0.15 }
        ];
        
        this.sectorNamePrefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Theta', 'Sigma', 'Omega', 'Kappa'];
        this.sectorNameSuffixes = ['Prime', 'Major', 'Minor', 'Nexus', 'Void', 'Reach', 'Expanse', 'Cluster', 'Nebula', 'System'];
        
        // Structure types with upgrade levels
        this.structureTypes = {
            outpost: {
                name: 'Mining Outpost',
                resourceType: 'minerals',
                cost: { minerals: 50, data: 20 },
                levels: [
                    { range: 100, rate: 0.1, tier: ['common'] },
                    { range: 150, rate: 0.2, tier: ['common', 'uncommon'] },
                    { range: 200, rate: 0.3, tier: ['common', 'uncommon', 'rare'] }
                ]
            },
            facility: {
                name: 'Mining Facility',
                resourceType: 'exoticMinerals',
                cost: { minerals: 75, data: 30 },
                levels: [
                    { range: 120, rate: 0.05, tier: ['common'] },
                    { range: 180, rate: 0.1, tier: ['common', 'uncommon'] },
                    { range: 250, rate: 0.15, tier: ['common', 'uncommon', 'rare'] }
                ]
            }
        };
        
        this.signalRarity = {
            common: { chance: 0.5, lifespan: 10000, size: 20, value: 1 },
            uncommon: { chance: 0.3, lifespan: 8000, size: 25, value: 3 },
            rare: { chance: 0.15, lifespan: 6000, size: 30, value: 10 },
            epic: { chance: 0.04, lifespan: 4000, size: 35, value: 50 },
            legendary: { chance: 0.01, lifespan: 3000, size: 40, value: 200 }
        };
        
        this.rewards = {
            excavate: {
                common: ['Iron Ore', 'Copper Deposits', 'Silicon Crystals'],
                uncommon: ['Titanium Veins', 'Rare Earth Elements', 'Energy Crystals'],
                rare: ['Quantum Minerals', 'Dark Matter Residue', 'Neutronium'],
                epic: ['Exotic Matter', 'Zero-Point Crystals', 'Hyperdense Alloys'],
                legendary: ['Primordial Elements', 'Singularity Fragments', 'Cosmic Essence']
            },
            exterminate: {
                common: ['Space Parasites', 'Asteroid Worms', 'Crystal Beetles'],
                uncommon: ['Void Stalkers', 'Plasma Wraiths', 'Nebula Rays'],
                rare: ['Quantum Predators', 'Dark Energy Beings', 'Chronophages'],
                epic: ['Dimensional Horrors', 'Star Devourers', 'Entropy Spawns'],
                legendary: ['Ancient Leviathans', 'Cosmic Entities', 'Reality Weavers']
            },
            expedition: {
                common: ['Alien Flora', 'Microbial Colonies', 'Fossilized Remains'],
                uncommon: ['Ancient Ruins', 'Alien Technology', 'Bioluminescent Gardens'],
                rare: ['Precursor Artifacts', 'Living Cities', 'Sentient Ecosystems'],
                epic: ['Time-Lost Temples', 'Dyson Sphere Fragments', 'Consciousness Networks'],
                legendary: ['Origin Monoliths', 'Universal Codex', 'Creation Engines']
            }
        };
        
        this.planetTypes = [
            { name: 'Xerion Prime', desc: 'A desert world with ancient crystalline formations' },
            { name: 'Aquaria VII', desc: 'An ocean planet teeming with bioluminescent life' },
            { name: 'Necros Station', desc: 'An abandoned space station orbiting a dead star' },
            { name: 'Verdania', desc: 'A lush jungle world with towering bio-mechanical trees' },
            { name: 'Cryos Beta', desc: 'A frozen wasteland hiding thermal vents of exotic minerals' },
            { name: 'Machina Complex', desc: 'An artificial world built by an extinct civilization' },
            { name: 'Void\'s Edge', desc: 'A rogue planet drifting through dark space' },
            { name: 'Chronos Loop', desc: 'A temporal anomaly where time flows differently' }
        ];
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.initializeSector(0, 0, true);
        this.generateStars();
        this.setupEventListeners();
        console.log('Game initialized. Hubs:', this.reconHubs.length);
        this.reconHubs.forEach((hub, index) => {
            console.log(`Hub ${index}: x=${hub.x}, y=${hub.y}, probes=${this.getActiveProbeCountForHub(hub)}/${hub.maxProbes}, selected=${hub.selected}`);
        });
        this.updateUI();
        this.gameLoop();
        this.startPassiveGeneration();
    }
    
    initializeSector(x, y, discovered = false) {
        const key = `${x},${y}`;
        if (!this.sectors.has(key)) {
            const isStartingSector = (x === 0 && y === 0);
            const type = isStartingSector ? 
                this.sectorTypes[3] : 
                this.sectorTypes[Math.floor(Math.random() * this.sectorTypes.length)];
            
            const name = this.generateSectorName(x, y);
            
            this.sectors.set(key, {
                x: x,
                y: y,
                explored: isStartingSector || discovered,
                type: type,
                name: name,
                stars: (isStartingSector || discovered) ? this.generateSectorStars(x, y) : [],
                outposts: [],
                signals: [],
                hubs: []
            });
            
            if (discovered && !isStartingSector) {
                this.showSectorDiscovery(type, name);
            }
            
            // Add starting Recon Hub in center of starting sector
            if (isStartingSector) {
                const hub = {
                    id: 'hub_0_0',
                    x: this.standardSectorWidth / 2,
                    y: this.standardSectorHeight / 2,
                    sector: { x: 0, y: 0 },
                    range: this.standardSectorWidth / 3,
                    maxProbes: 5,
                    selected: false
                };
                this.reconHubs.push(hub);
                this.sectors.get('0,0').hubs.push(hub);
                
                // Create 3 starting probes at the hub
                for (let i = 0; i < 3; i++) {
                    const probe = {
                        id: `starting_probe_${i}`,
                        waypoints: [],
                        currentWaypoint: 0,
                        current: { x: hub.x, y: hub.y },
                        segmentProgress: 0,
                        speed: 0.0001,
                        pulseTimer: 0,
                        pulses: [],
                        radarPulses: [],
                        active: true,
                        hub: hub,
                        recoveryMode: false,
                        outboundWaypointsCount: 0,
                        returnSpeed: 0.0003,
                        patrolMode: false,
                        equipment: null,
                        status: 'ready',
                        returnedToHub: false
                    };
                    this.probes.push(probe);
                }
            }
        }
    }
    
    generateSectorName(x, y) {
        const seed = Math.abs(x * 1000 + y);
        const prefixIndex = seed % this.sectorNamePrefixes.length;
        const suffixIndex = (seed * 7) % this.sectorNameSuffixes.length;
        const number = ((seed * 13) % 900) + 100;
        return `${this.sectorNamePrefixes[prefixIndex]}-${number} ${this.sectorNameSuffixes[suffixIndex]}`;
    }
    
    generateSectorStars(sectorX, sectorY) {
        const stars = [];
        const starCount = 150 + Math.floor(Math.random() * 100);
        
        // Generate stars in world coordinates for this specific sector
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: sectorX * this.standardSectorWidth + Math.random() * this.standardSectorWidth,
                y: sectorY * this.standardSectorHeight + Math.random() * this.standardSectorHeight,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.5 + 0.5
            });
        }
        return stars;
    }
    
    showSectorDiscovery(sectorType, sectorName) {
        const modal = document.getElementById('sectorModal');
        document.getElementById('sectorName').textContent = sectorName;
        document.getElementById('sectorType').textContent = sectorType.name + ' Sector';
        let bonusHTML = `
            <p>Resource Bonuses:</p>
            <p>Minerals: x${sectorType.mineralBonus}</p>
            <p>Data: x${sectorType.dataBonus}</p>
            <p>Artifacts: x${sectorType.artifactBonus}</p>
        `;
        
        if (sectorType.probeDestructionChance) {
            bonusHTML += `<p style="color: #ff6b35;">⚠ WARNING: ${Math.floor(sectorType.probeDestructionChance * 100)}% probe destruction risk!</p>`;
        }
        
        document.getElementById('sectorBonus').innerHTML = bonusHTML;
        modal.classList.add('active');
        
        setTimeout(() => {
            modal.classList.remove('active');
        }, 4000);
    }
    
    setupCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.planetCanvas.width = this.planetCanvas.offsetWidth;
        this.planetCanvas.height = this.planetCanvas.offsetHeight;
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 200;
        
        window.addEventListener('resize', () => {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;
            this.planetCanvas.width = this.planetCanvas.offsetWidth;
            this.planetCanvas.height = this.planetCanvas.offsetHeight;
        });
    }
    
    generateStars() {
        // Collect all stars from all discovered sectors
        this.stars = [];
        this.sectors.forEach(sector => {
            if (sector.explored && sector.stars) {
                this.stars.push(...sector.stars);
            }
        });
    }
    
    setupEventListeners() {
        document.getElementById('deployProbeBtn').addEventListener('click', () => {
            if (this.selectedHub && this.getReadyProbeCountForHub(this.selectedHub) > 0 && !this.deployMode && !this.hubPlacementMode) {
                this.deployMode = true;
                this.hubPlacementMode = false;
                this.deploymentPoints = [];
                this.canvas.style.cursor = 'crosshair';
                document.getElementById('probeStatus').textContent = 'Click to set first waypoint...';
                this.updateProbePanel(); // Update to show right-click hint
            } else if (this.deployMode) {
                this.deployMode = false;
                this.deploymentPoints = [];
                this.canvas.style.cursor = 'grab';
                document.getElementById('probeStatus').textContent = '';
                this.updateProbePanel(); // Update to hide hint
            } else if (!this.selectedHub) {
                document.getElementById('probeStatus').textContent = 'Select a Recon Hub first!';
                setTimeout(() => {
                    document.getElementById('probeStatus').textContent = '';
                }, 2000);
            } else if (this.selectedHub.probes === 0) {
                document.getElementById('probeStatus').textContent = 'No probes available at selected hub!';
                setTimeout(() => {
                    document.getElementById('probeStatus').textContent = '';
                }, 2000);
            }
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (!this.deployMode) {
                this.isDragging = true;
                this.dragStart = { x: e.clientX, y: e.clientY };
                this.lastViewOffset = { ...this.viewOffset };
                this.canvas.style.cursor = 'grabbing';
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            // Update mouse position for deployment line preview
            const rect = this.canvas.getBoundingClientRect();
            this.mousePosition.x = e.clientX - rect.left + this.viewOffset.x;
            this.mousePosition.y = e.clientY - rect.top + this.viewOffset.y;
            
            // Update building preview if in building mode
            if (this.buildingMode && this.selectedProbe) {
                this.updateBuildingPreview(this.mousePosition.x, this.mousePosition.y);
            }
            
            if (this.isDragging) {
                const dx = e.clientX - this.dragStart.x;
                const dy = e.clientY - this.dragStart.y;
                
                this.viewOffset.x = this.lastViewOffset.x - dx;
                this.viewOffset.y = this.lastViewOffset.y - dy;
                
                // Calculate bounds based on discovered sectors with padding
                let minX = 0, maxX = 0, minY = 0, maxY = 0;
                let hasExplored = false;
                this.sectors.forEach(sector => {
                    if (sector.explored) {
                        if (!hasExplored) {
                            minX = maxX = sector.x;
                            minY = maxY = sector.y;
                            hasExplored = true;
                        } else {
                            minX = Math.min(minX, sector.x);
                            maxX = Math.max(maxX, sector.x);
                            minY = Math.min(minY, sector.y);
                            maxY = Math.max(maxY, sector.y);
                        }
                    }
                });
                
                // Add padding so we can see sector boundaries
                const padding = 0.3; // 30% padding beyond the explored area
                const worldMinX = (minX - padding) * this.standardSectorWidth;
                const worldMaxX = (maxX + 1 + padding) * this.standardSectorWidth;
                const worldMinY = (minY - padding) * this.standardSectorHeight;
                const worldMaxY = (maxY + 1 + padding) * this.standardSectorHeight;
                
                // Calculate view bounds to allow seeing the full explored world plus padding
                const minOffsetX = worldMinX - this.canvas.width / 2;
                const maxOffsetX = worldMaxX - this.canvas.width / 2;
                const minOffsetY = worldMinY - this.canvas.height / 2;
                const maxOffsetY = worldMaxY - this.canvas.height / 2;
                
                this.viewOffset.x = Math.max(minOffsetX, Math.min(maxOffsetX, this.viewOffset.x));
                this.viewOffset.y = Math.max(minOffsetY, Math.min(maxOffsetY, this.viewOffset.y));
            }
        });
        
        this.canvas.addEventListener('mouseup', (e) => {
            console.log('Mouse up event - isDragging:', this.isDragging, 'deployMode:', this.deployMode, 'hubPlacementMode:', this.hubPlacementMode, 'selectedHub:', !!this.selectedHub);
            
            // Check if this was actually a drag (mouse moved significantly) or just a click with tiny movement
            const dragDistance = Math.sqrt(
                (e.clientX - this.dragStart.x) ** 2 + (e.clientY - this.dragStart.y) ** 2
            );
            const wasDragging = this.isDragging && dragDistance > 5; // Only consider it a drag if moved more than 5 pixels
            
            console.log('Drag distance:', dragDistance, 'wasDragging:', wasDragging);
            
            if (wasDragging) {
                this.isDragging = false;
                this.canvas.style.cursor = this.deployMode || this.hubPlacementMode ? 'crosshair' : 'grab';
                console.log('Drag ended');
            } else if (this.hubPlacementMode) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left + this.viewOffset.x;
                const y = e.clientY - rect.top + this.viewOffset.y;
                console.log('Hub placement mode - coordinates:', x, y);
                this.placeReconHub(x, y);
            } else if (this.buildingMode) {
                // Building along probe path
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left + this.viewOffset.x;
                const y = e.clientY - rect.top + this.viewOffset.y;
                this.buildAlongPath(x, y);
            } else if (!this.deployMode && !this.hubPlacementMode) {
                // Reset drag state for clicks
                this.isDragging = false;
                this.canvas.style.cursor = 'grab';
                
                // Check if clicking on a hub to select it
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left + this.viewOffset.x;
                const y = e.clientY - rect.top + this.viewOffset.y;
                console.log('Normal click mode - attempting hub selection at:', x, y);
                this.selectHub(x, y);
            } else if (this.deployMode) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left + this.viewOffset.x;
                const y = e.clientY - rect.top + this.viewOffset.y;
                
                // Check if destination is within probe range from selected hub
                if (this.selectedHub) {
                    const hubX = this.selectedHub.x;
                    const hubY = this.selectedHub.y;
                    const distance = Math.sqrt((x - hubX) ** 2 + (y - hubY) ** 2);
                    
                    console.log(`Deployment check: hub at (${hubX}, ${hubY}), click at (${x}, ${y}), distance: ${distance}, range: ${this.selectedHub.range}`);
                    
                    if (distance > this.selectedHub.range) {
                        document.getElementById('probeStatus').textContent = 'Destination too far from Recon Hub!';
                        setTimeout(() => {
                            const statusText = this.deploymentPoints.length === 0 ? 'Click to set first waypoint...' : 
                                this.deploymentPoints.length === 1 ? 'Click second waypoint...' : 'Click third waypoint...';
                            document.getElementById('probeStatus').textContent = statusText;
                        }, 2000);
                        return;
                    }
                }
                
                this.deploymentPoints.push({ x, y });
                
                if (this.deploymentPoints.length === 1) {
                    document.getElementById('probeStatus').textContent = 'Click second destination (or right-click to deploy)...';
                } else if (this.deploymentPoints.length === 2) {
                    this.deployProbe(); // Auto-deploy after 2 destinations
                }
            }
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.canvas.style.cursor = this.deployMode ? 'crosshair' : 'grab';
        });
        
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.deployMode) {
                if (this.deploymentPoints.length === 0) {
                    // Cancel deployment mode if no points set
                    this.deployMode = false;
                    this.canvas.style.cursor = 'grab';
                    document.getElementById('probeStatus').textContent = 'Probe deployment cancelled';
                    this.updateProbePanel(); // Update to hide hint
                    setTimeout(() => {
                        document.getElementById('probeStatus').textContent = '';
                    }, 2000);
                } else if (this.deploymentPoints.length >= 1) {
                    // Deploy with current destinations
                    this.deployProbe();
                }
            } else if (this.buildingMode) {
                // Cancel building mode
                this.buildingMode = false;
                this.buildingStructureType = null;
                this.buildingPreview = null;
                this.canvas.style.cursor = 'grab';
                this.updateProbePanel(); // Update to hide hint
                document.getElementById('buildingStatus').textContent = 'Building cancelled';
                setTimeout(() => {
                    document.getElementById('buildingStatus').textContent = '';
                }, 2000);
            }
        });
        
        document.querySelectorAll('.explore-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.explore(mode);
            });
        });
        
        document.getElementById('returnToMap').addEventListener('click', () => {
            this.showScreen('mapScreen');
        });
        
        document.getElementById('collectReward').addEventListener('click', () => {
            document.getElementById('rewardModal').classList.remove('active');
        });
        
        document.getElementById('buildOutpostBtn').addEventListener('click', () => {
            this.buildMiningOutpost();
        });
        
        document.getElementById('buildHubBtn').addEventListener('click', () => {
            this.deployMode = false;
            this.deploymentPoints = [];
            this.canvas.style.cursor = 'crosshair';
            this.hubPlacementMode = true;
            document.getElementById('probeStatus').textContent = 'Click to place Recon Hub...';
        });
        
        document.getElementById('buildProbeBtn').addEventListener('click', () => {
            this.buildProbe();
        });
        
        document.getElementById('buildOutpostBtn').addEventListener('click', () => {
            this.startBuildingMode('outpost');
        });
        
        document.getElementById('buildMiningFacilityBtn').addEventListener('click', () => {
            this.startBuildingMode('facility');
        });
        
        document.getElementById('buildPathHubBtn').addEventListener('click', () => {
            this.startBuildingMode('hub');
        });
        
        // Old probe detail panel elements removed - now handled by DetailsPanel.js
        const closeProbeDetailBtn = document.getElementById('closeProbeDetail');
        if (closeProbeDetailBtn) {
            closeProbeDetailBtn.addEventListener('click', () => {
                const probeDetailPanel = document.getElementById('probeDetailPanel');
                if (probeDetailPanel) probeDetailPanel.style.display = 'none';
                this.selectedProbe = null;
                this.cameraLocked = false;
                this.lockedProbe = null;
                this.updateProbePanel();
            });
        }

        const patrolModeCheckbox = document.getElementById('patrolModeCheckbox');
        if (patrolModeCheckbox) patrolModeCheckbox.addEventListener('change', (e) => {
            if (this.selectedProbe) {
                this.selectedProbe.patrolMode = e.target.checked;
                this.updateProbePanel();
                console.log(`Probe patrol mode: ${e.target.checked ? 'enabled' : 'disabled'}`);
            }
        });
        
        document.getElementById('cameraLockCheckbox').addEventListener('change', (e) => {
            if (this.selectedProbe) {
                this.cameraLocked = e.target.checked;
                this.lockedProbe = e.target.checked ? this.selectedProbe : null;
                console.log(`Camera lock: ${e.target.checked ? 'enabled' : 'disabled'}`);
                
                if (this.cameraLocked) {
                    this.focusOnProbe(this.selectedProbe);
                }
            }
        });
        
        document.getElementById('researchBtn').addEventListener('click', () => {
            this.showScreen('researchScreen');
            this.renderResearchTree();
        });
        
        document.getElementById('returnToMapFromResearch').addEventListener('click', () => {
            this.showScreen('mapScreen');
        });
        
        document.getElementById('openResearchLab').addEventListener('click', () => {
            document.getElementById('researchUnlockModal').classList.remove('active');
            this.showScreen('researchScreen');
            this.renderResearchTree();
        });
        
        document.getElementById('researchLater').addEventListener('click', () => {
            document.getElementById('researchUnlockModal').classList.remove('active');
        });
        
        this.minimapCanvas.addEventListener('click', (e) => {
            const rect = this.minimapCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = this.minimapCanvas.width / 2;
            const centerY = this.minimapCanvas.height / 2;
            const scale = 50;
            
            const sectorX = Math.floor((x - centerX) / scale);
            const sectorY = Math.floor((y - centerY) / scale);
            
            const key = `${sectorX},${sectorY}`;
            if (this.sectors.has(key) && this.sectors.get(key).explored) {
                this.snapToSector(sectorX, sectorY);
            }
        });
        
        document.addEventListener('keydown', (e) => {
            let newX = this.currentSector.x;
            let newY = this.currentSector.y;
            
            if (e.key === 'ArrowUp') newY--;
            if (e.key === 'ArrowDown') newY++;
            if (e.key === 'ArrowLeft') newX--;
            if (e.key === 'ArrowRight') newX++;
            
            const key = `${newX},${newY}`;
            if (this.sectors.has(key) && this.sectors.get(key).explored) {
                this.changeSector(newX, newY);
            }
        });
    }
    
    deployProbe() {
        if (!this.selectedHub || this.getReadyProbeCountForHub(this.selectedHub) <= 0) return;
        
        // Build waypoints: Hub -> destinations -> back to Hub
        const hubPos = { x: this.selectedHub.x, y: this.selectedHub.y };
        const outboundWaypoints = [hubPos, ...this.deploymentPoints];
        const returnWaypoints = [...this.deploymentPoints].reverse().concat([hubPos]);
        const allWaypoints = outboundWaypoints.concat(returnWaypoints.slice(1)); // Avoid duplicate hub position
        
        // Calculate total distance for outbound journey (for speed calculation)
        let outboundDistance = 0;
        for (let i = 0; i < outboundWaypoints.length - 1; i++) {
            const dx = outboundWaypoints[i + 1].x - outboundWaypoints[i].x;
            const dy = outboundWaypoints[i + 1].y - outboundWaypoints[i].y;
            outboundDistance += Math.sqrt(dx * dx + dy * dy);
        }
        
        // Calculate reasonable speed - segmentProgress goes from 0 to 1, so speed is fraction per millisecond
        const baseSpeed = 0.0001; // Very slow: takes 10 seconds to complete one segment (0.0001 * 10000ms = 1.0)
        const outboundSpeed = baseSpeed; // Consistent speed regardless of distance
        const returnSpeed = baseSpeed * 3; // 3x faster return
        
        // Check if there's a ready probe to redeploy from this hub
        let probe = this.probes.find(p => 
            p.active &&
            p.hub === this.selectedHub && 
            p.status === 'ready' && 
            (!p.waypoints || p.waypoints.length === 0)
        );
        
        if (probe) {
            // Redeploy existing probe
            console.log(`Redeploying existing probe ${probe.id}`);
            probe.waypoints = allWaypoints;
            probe.currentWaypoint = 0;
            probe.current = { ...hubPos };
            probe.segmentProgress = 0;
            probe.speed = outboundSpeed;
            probe.returnSpeed = returnSpeed;
            probe.recoveryMode = false;
            probe.outboundWaypointsCount = outboundWaypoints.length;
            probe.status = 'exploring';
            probe.returnedToHub = false; // Reset flag for next return
            probe.pulseTimer = 0;
            probe.pulses = [];
            probe.radarPulses = [];
            probe.active = true; // Ensure probe remains active
        } else {
            // Check if we can actually create a new probe (hub not at capacity)
            const currentActiveProbes = this.getActiveProbeCountForHub(this.selectedHub);
            if (currentActiveProbes >= this.selectedHub.maxProbes) {
                console.warn('Cannot create new probe - hub at capacity');
                this.deployMode = false;
                this.deploymentPoints = [];
                this.canvas.style.cursor = 'grab';
                document.getElementById('probeStatus').textContent = 'Hub at maximum capacity!';
                return;
            }
            
            // Create new probe only if hub has capacity
            console.log(`Creating new probe for hub ${this.selectedHub.id}`);
            probe = {
                id: Date.now(),
                waypoints: allWaypoints,
                currentWaypoint: 0,
                current: { ...hubPos },
                segmentProgress: 0,
                speed: outboundSpeed,
                pulseTimer: 0,
                pulses: [],
                radarPulses: [],
                active: true,
                hub: this.selectedHub,
                recoveryMode: false,
                outboundWaypointsCount: outboundWaypoints.length,
                returnSpeed: returnSpeed,
                patrolMode: false,
                equipment: null,
                status: 'exploring',
                returnedToHub: false
            };
            this.probes.push(probe);
        }
        
        // No longer need to decrement hub.probes - using actual probe counts now
        this.deployMode = false;
        this.deploymentPoints = [];
        this.canvas.style.cursor = 'grab';
        document.getElementById('probeStatus').textContent = 'Probe deployed from hub!';
        this.updateUI();
        this.updateProbePanel();
        
        setTimeout(() => {
            document.getElementById('probeStatus').textContent = '';
        }, 2000);
    }
    
    updateProbes(deltaTime) {
        this.probes.forEach(probe => {
            if (!probe.active) return;
            
            // First, check if probe has no waypoints (ready at hub waiting for deployment)
            if (!probe.waypoints || probe.waypoints.length === 0) {
                if (probe.status !== 'ready') {
                    probe.status = 'ready';
                    this.updateProbePanel();
                }
                return;
            }
            
            // Check if probe has completed all waypoints (returned to hub)
            if (probe.currentWaypoint >= probe.waypoints.length - 1) {
                // Check if we're actually at the hub position
                const hubPos = probe.waypoints[probe.waypoints.length - 1];
                const distanceToHub = Math.sqrt(
                    (probe.current.x - hubPos.x) ** 2 + 
                    (probe.current.y - hubPos.y) ** 2
                );
                
                // Only mark as returned if actually at hub (within 5 pixels)
                if (distanceToHub < 5) {
                    if (probe.patrolMode) {
                        // Reset for patrol loop
                        probe.currentWaypoint = 0;
                        probe.segmentProgress = 0;
                        probe.recoveryMode = false;
                        probe.speed = probe.speed / 3; // Reset to outbound speed
                        probe.status = 'exploring';
                        this.updateProbePanel();
                        console.log('Probe starting patrol loop');
                    } else {
                        // Mark as ready at hub (only once)
                        if (probe.status !== 'ready') {
                            probe.status = 'ready';
                            probe.currentWaypoint = 0;
                            probe.current = { ...hubPos }; // Ensure positioned exactly at hub
                            probe.active = true; // Ensure probe stays active
                            
                            // No longer need to increment hub.probes - using actual probe counts now
                            if (!probe.returnedToHub) {
                                probe.returnedToHub = true; // Flag to prevent duplicate processing
                            }
                            
                            // Clear path for non-patrolling probes - force new deployment
                            probe.waypoints = [];
                            probe.segmentProgress = 0;
                            probe.recoveryMode = false;
                            
                            this.updateUI();
                            this.updateProbePanel();
                            console.log('Probe returned to hub (path cleared)');
                        }
                        return;
                    }
                }
            }
            
            // Check if probe should enter recovery mode (past outbound waypoints)
            if (!probe.recoveryMode && probe.currentWaypoint >= probe.outboundWaypointsCount - 1) {
                probe.recoveryMode = true;
                probe.speed = probe.returnSpeed;
                probe.status = 'returning';
                this.updateProbePanel();
                console.log('Probe entering recovery mode');
            }
            
            const start = probe.waypoints[probe.currentWaypoint];
            const end = probe.waypoints[probe.currentWaypoint + 1];
            
            probe.segmentProgress += probe.speed * deltaTime;
            
            if (probe.segmentProgress >= 1) {
                probe.currentWaypoint++;
                probe.segmentProgress = 0;
                
                if (probe.currentWaypoint >= probe.waypoints.length - 1) {
                    return;
                }
            }
            
            probe.current.x = start.x + (end.x - start.x) * probe.segmentProgress;
            probe.current.y = start.y + (end.y - start.y) * probe.segmentProgress;
            
            this.checkSectorBoundary(probe);
            
            // Initialize probe's last sector if not set
            if (probe.lastSectorX === undefined) {
                probe.lastSectorX = Math.floor(probe.current.x / this.standardSectorWidth);
                probe.lastSectorY = Math.floor(probe.current.y / this.standardSectorHeight);
            }
            
            const sector = this.sectors.get(`${this.currentSector.x},${this.currentSector.y}`);
            if (sector && sector.type.probeDestructionChance && Math.random() < sector.type.probeDestructionChance * 0.001 * deltaTime) {
                probe.active = false;
                this.showProbeDestruction(probe);
                return;
            }
            
            // Only pulse and detect signals when NOT in recovery mode
            if (!probe.recoveryMode) {
                probe.pulseTimer += deltaTime;
                if (probe.pulseTimer >= 3000) {
                    probe.pulseTimer = 0;
                    
                    probe.pulses.push({
                        x: probe.current.x,
                        y: probe.current.y,
                        radius: 5,
                        maxRadius: 8,
                        opacity: 1,
                        growthRate: 0.5
                    });
                    
                    probe.radarPulses.push({
                        x: probe.current.x,
                        y: probe.current.y,
                        radius: 10,
                        maxRadius: 80,
                        opacity: 0.8
                    });
                    
                    if (Math.random() < 0.3) {
                        this.spawnSignal(probe.current.x, probe.current.y);
                    }
                }
                
                // Auto-collect nearby signals if equipped
                if (probe.equipment && probe.equipment.type === 'auto_collector') {
                    this.autoCollectSignals(probe);
                }
            }
            
            probe.pulses = probe.pulses.filter(pulse => {
                if (pulse.radius < pulse.maxRadius) {
                    pulse.radius += deltaTime * pulse.growthRate * 0.01;
                    return true;
                }
                pulse.opacity -= deltaTime * 0.002;
                return pulse.opacity > 0;
            });
            
            probe.radarPulses = probe.radarPulses.filter(pulse => {
                pulse.radius += deltaTime * 0.05;
                pulse.opacity = 0.8 * (1 - (pulse.radius / pulse.maxRadius));
                return pulse.radius < pulse.maxRadius;
            });
        });
    }
    
    spawnSignal(x, y) {
        const rarityRoll = Math.random();
        let rarity = 'common';
        let accumulated = 0;
        
        for (const [key, value] of Object.entries(this.signalRarity)) {
            accumulated += value.chance;
            if (rarityRoll <= accumulated) {
                rarity = key;
                break;
            }
        }
        
        const signalData = this.signalRarity[rarity];
        const signal = {
            x: x + (Math.random() - 0.5) * 100,
            y: y + (Math.random() - 0.5) * 100,
            rarity: rarity,
            size: signalData.size,
            lifespan: signalData.lifespan,
            age: 0,
            value: signalData.value
        };
        
        this.signals.push(signal);
        this.addSignalToDOM(signal);
    }
    
    addSignalToDOM(signal) {
        const signalDiv = document.createElement('div');
        signalDiv.className = `signal ${signal.rarity}`;
        signalDiv.dataset.signalId = signal.x + '_' + signal.y;
        
        const updatePosition = () => {
            const screenX = signal.x - this.viewOffset.x;
            const screenY = signal.y - this.viewOffset.y;
            signalDiv.style.left = `${screenX - signal.size/2}px`;
            signalDiv.style.top = `${screenY - signal.size/2}px`;
        };
        
        updatePosition();
        signal.updatePosition = updatePosition;
        
        signalDiv.style.width = `${signal.size}px`;
        signalDiv.style.height = `${signal.size}px`;
        
        signalDiv.addEventListener('click', () => {
            this.collectSignal(signal);
            signalDiv.remove();
        });
        
        this.canvas.parentElement.appendChild(signalDiv);
        
        setTimeout(() => {
            signalDiv.style.opacity = '0';
            setTimeout(() => signalDiv.remove(), 300);
        }, signal.lifespan);
    }
    
    collectSignal(signal) {
        this.signals = this.signals.filter(s => s !== signal);
        this.currentSignal = signal;
        this.showExploreScreen();
    }
    
    showExploreScreen() {
        const planet = this.planetTypes[Math.floor(Math.random() * this.planetTypes.length)];
        document.getElementById('planetName').textContent = planet.name;
        document.getElementById('planetDesc').textContent = planet.desc;
        
        this.drawPlanet();
        this.showScreen('exploreScreen');
    }
    
    drawPlanet() {
        const ctx = this.planetCtx;
        const centerX = this.planetCanvas.width / 2;
        const centerY = this.planetCanvas.height / 2;
        const radius = 150;
        
        ctx.clearRect(0, 0, this.planetCanvas.width, this.planetCanvas.height);
        
        // Create deterministic colors based on signal position
        const signal = this.currentSignal;
        const seed = signal ? (signal.x * 1000 + signal.y) : 12345;
        
        // Simple seeded random function
        let currentSeed = seed;
        const seededRandom = () => {
            currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
            return currentSeed / 4294967296;
        };
        
        const colors = [
            ['#8B4513', '#D2691E', '#A0522D'],  // Brown/Orange
            ['#191970', '#4169E1', '#6495ED'],  // Blue
            ['#2F4F4F', '#708090', '#778899'],  // Gray
            ['#228B22', '#32CD32', '#90EE90'],  // Green
            ['#E0FFFF', '#B0E0E6', '#87CEEB'],  // Light Blue
            ['#8B008B', '#DA70D6', '#DDA0DD'],  // Purple
            ['#B22222', '#DC143C', '#F08080']   // Red
        ];
        
        const colorIndex = Math.floor(seededRandom() * colors.length);
        const colorSet = colors[colorIndex];
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, colorSet[0]);
        gradient.addColorStop(0.5, colorSet[1]);
        gradient.addColorStop(1, colorSet[2]);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add varied surface features
        const featureTypes = ['circles', 'stripes', 'dots', 'rings'];
        const featureType = featureTypes[Math.floor(seededRandom() * featureTypes.length)];
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        
        switch(featureType) {
            case 'circles':
                for (let i = 0; i < 8; i++) {
                    const x = centerX + (seededRandom() - 0.5) * radius * 1.5;
                    const y = centerY + (seededRandom() - 0.5) * radius * 1.5;
                    const r = seededRandom() * 30 + 10;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.stroke();
                    if (seededRandom() > 0.5) ctx.fill();
                }
                break;
            case 'stripes':
                for (let i = 0; i < 6; i++) {
                    const y = centerY - radius + (i * radius / 3);
                    ctx.beginPath();
                    ctx.moveTo(centerX - radius, y);
                    ctx.lineTo(centerX + radius, y);
                    ctx.stroke();
                }
                break;
            case 'dots':
                for (let i = 0; i < 15; i++) {
                    const x = centerX + (seededRandom() - 0.5) * radius * 1.5;
                    const y = centerY + (seededRandom() - 0.5) * radius * 1.5;
                    const r = seededRandom() * 8 + 3;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            case 'rings':
                for (let i = 1; i <= 3; i++) {
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius * (i / 4), 0, Math.PI * 2);
                    ctx.stroke();
                }
                break;
        }
    }
    
    explore(mode) {
        const rarity = this.currentSignal ? this.currentSignal.rarity : 'common';
        const rewardPool = this.rewards[mode][rarity];
        const reward = rewardPool[Math.floor(Math.random() * rewardPool.length)];
        const value = this.currentSignal ? this.currentSignal.value : 1;
        const sector = this.sectors.get(`${this.currentSector.x},${this.currentSector.y}`);
        
        let resourceGained = '';
        switch(mode) {
            case 'excavate':
                const mineralValue = Math.floor(value * sector.type.mineralBonus);
                this.resources.minerals += mineralValue;
                resourceGained = `+${mineralValue} Minerals`;
                if (Math.random() < 0.1) {
                    this.resources.exoticMinerals++;
                    resourceGained += ` +1 Exotic Mineral`;
                }
                break;
            case 'exterminate':
                const dataValue = Math.floor(value * sector.type.dataBonus);
                this.resources.data += dataValue;
                resourceGained = `+${dataValue} Data`;
                break;
            case 'expedition':
                const artifactValue = Math.floor(value * sector.type.artifactBonus);
                this.resources.artifacts += artifactValue;
                resourceGained = `+${artifactValue} Artifacts`;
                break;
        }
        
        this.showReward(reward, rarity, resourceGained);
        this.updateUI();
        this.showScreen('mapScreen');
    }
    
    showReward(reward, rarity, resourceGained) {
        document.getElementById('rewardTitle').textContent = `${rarity.toUpperCase()} Discovery!`;
        document.getElementById('rewardDetails').innerHTML = `
            <p style="color: #0ff; font-size: 20px; margin-bottom: 10px;">${reward}</p>
            <p style="color: #fff; font-size: 18px;">${resourceGained}</p>
        `;
        document.getElementById('rewardModal').classList.add('active');
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
    
    changeSector(x, y) {
        const key = `${x},${y}`;
        if (!this.sectors.has(key) || !this.sectors.get(key).explored) {
            return;
        }
        
        this.currentSector = { x, y };
        this.generateStars();
        this.viewOffset = { x: 0, y: 0 };
        this.updateUI();
    }
    
    snapToSector(sectorX, sectorY) {
        // Center the view on the clicked sector
        const sectorCenterX = sectorX * this.standardSectorWidth + this.standardSectorWidth / 2;
        const sectorCenterY = sectorY * this.standardSectorHeight + this.standardSectorHeight / 2;
        
        this.viewOffset.x = sectorCenterX - this.canvas.width / 2;
        this.viewOffset.y = sectorCenterY - this.canvas.height / 2;
        
        // Apply bounds to ensure we don't go outside the valid viewing area
        this.constrainViewOffset();
        
        this.updateUI();
    }
    
    constrainViewOffset() {
        // Recalculate bounds and apply them
        let minX = 0, maxX = 0, minY = 0, maxY = 0;
        let hasExplored = false;
        this.sectors.forEach(sector => {
            if (sector.explored) {
                if (!hasExplored) {
                    minX = maxX = sector.x;
                    minY = maxY = sector.y;
                    hasExplored = true;
                } else {
                    minX = Math.min(minX, sector.x);
                    maxX = Math.max(maxX, sector.x);
                    minY = Math.min(minY, sector.y);
                    maxY = Math.max(maxY, sector.y);
                }
            }
        });
        
        const padding = 0.3;
        const worldMinX = (minX - padding) * this.standardSectorWidth;
        const worldMaxX = (maxX + 1 + padding) * this.standardSectorWidth;
        const worldMinY = (minY - padding) * this.standardSectorHeight;
        const worldMaxY = (maxY + 1 + padding) * this.standardSectorHeight;
        
        const minOffsetX = worldMinX - this.canvas.width / 2;
        const maxOffsetX = worldMaxX - this.canvas.width / 2;
        const minOffsetY = worldMinY - this.canvas.height / 2;
        const maxOffsetY = worldMaxY - this.canvas.height / 2;
        
        this.viewOffset.x = Math.max(minOffsetX, Math.min(maxOffsetX, this.viewOffset.x));
        this.viewOffset.y = Math.max(minOffsetY, Math.min(maxOffsetY, this.viewOffset.y));
    }
    
    checkSectorBoundary(probe) {
        // Calculate which sector the probe is currently in (world coordinates)
        const currentSectorX = Math.floor(probe.current.x / this.standardSectorWidth);
        const currentSectorY = Math.floor(probe.current.y / this.standardSectorHeight);
        
        if (currentSectorX !== probe.lastSectorX || currentSectorY !== probe.lastSectorY) {
            this.discoverSector(currentSectorX, currentSectorY);
            probe.lastSectorX = currentSectorX;
            probe.lastSectorY = currentSectorY;
        }
    }
    
    discoverSector(x, y) {
        const key = `${x},${y}`;
        if (!this.sectors.has(key)) {
            this.initializeSector(x, y, true);
        } else {
            const sector = this.sectors.get(key);
            if (!sector.explored) {
                sector.explored = true;
                sector.stars = this.generateSectorStars(x, y);
                this.showSectorDiscovery(sector.type, sector.name);
            }
        }
        // Always regenerate all stars when a new sector is discovered
        this.generateStars();
    }
    
    buildMiningOutpost() {
        if (this.resources.minerals >= 50 && this.resources.data >= 20) {
            const outpost = {
                id: Date.now(),
                sector: { ...this.currentSector },
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                level: 1,
                productionRate: 0.1,
                specialResource: Math.random() < 0.3
            };
            
            this.miningOutposts.push(outpost);
            const sector = this.sectors.get(`${this.currentSector.x},${this.currentSector.y}`);
            if (sector) {
                sector.outposts.push(outpost);
            }
            
            this.resources.minerals -= 50;
            this.resources.data -= 20;
            this.updateUI();
        }
    }
    
    findNearbyHub(x, y) {
        return this.reconHubs.find(hub => {
            const distance = Math.sqrt((x - hub.x) ** 2 + (y - hub.y) ** 2);
            return distance <= hub.range;
        });
    }
    
    selectHub(x, y) {
        // Debug hub selection (commented out for cleaner console)
        // console.log('=== HUB SELECTION DEBUG ===');
        
        // Deselect all hubs first
        this.reconHubs.forEach(hub => hub.selected = false);
        
        // Find clicked hub with detailed logging
        const clickedHub = this.reconHubs.find(hub => {
            const distance = Math.sqrt((x - hub.x) ** 2 + (y - hub.y) ** 2);
            // Debug individual hub checks (commented out for cleaner console)
            // console.log(`Hub ${hub.id} at (${hub.x}, ${hub.y}), distance: ${distance}`);
            
            // Try with larger tolerance for testing
            const withinLargeTolerance = distance <= 50;
            
            return distance <= 15; // Click tolerance
        });
        
        // console.log('Clicked hub found:', !!clickedHub);
        
        if (clickedHub) {
            clickedHub.selected = true;
            this.selectedHub = clickedHub;
            // console.log('Hub selected:', clickedHub.id, 'with', clickedHub.probes, 'probes');
            document.getElementById('probeStatus').textContent = `Selected hub with ${clickedHub.probes} probes`;
            setTimeout(() => {
                document.getElementById('probeStatus').textContent = '';
            }, 2000);
        } else {
            this.selectedHub = null;
            // console.log('No hub selected - trying with larger tolerance...');
            
            // Try finding with larger tolerance for debugging
            const nearestHub = this.reconHubs.reduce((nearest, hub) => {
                const distance = Math.sqrt((x - hub.x) ** 2 + (y - hub.y) ** 2);
                if (!nearest || distance < nearest.distance) {
                    return { hub, distance };
                }
                return nearest;
            }, null);
            
            if (nearestHub) {
                // console.log(`Nearest hub is ${nearestHub.distance} pixels away at (${nearestHub.hub.x}, ${nearestHub.hub.y})`);
            }
        }
        
        // console.log('=== END HUB SELECTION DEBUG ===');
        this.updateUI();
        this.updateProbePanel();
    }
    
    buildProbe() {
        if (this.selectedHub && this.resources.minerals >= 25 && this.getActiveProbeCountForHub(this.selectedHub) < this.selectedHub.maxProbes) {
            // Create a new ready probe at the hub
            const probe = {
                id: Date.now(),
                waypoints: [],
                currentWaypoint: 0,
                current: { x: this.selectedHub.x, y: this.selectedHub.y },
                segmentProgress: 0,
                speed: 0.0001,
                pulseTimer: 0,
                pulses: [],
                radarPulses: [],
                active: true,
                hub: this.selectedHub,
                recoveryMode: false,
                outboundWaypointsCount: 0,
                returnSpeed: 0.0003,
                patrolMode: false,
                equipment: null,
                status: 'ready',
                returnedToHub: false
            };
            this.probes.push(probe);
            this.resources.minerals -= 25;
            document.getElementById('probeStatus').textContent = 'Probe built!';
            this.updateUI();
            setTimeout(() => {
                document.getElementById('probeStatus').textContent = '';
            }, 2000);
        }
    }
    
    placeReconHub(x, y) {
        if (this.resources.minerals >= 100) {
            const sectorX = Math.floor(x / this.standardSectorWidth);
            const sectorY = Math.floor(y / this.standardSectorHeight);
            const sector = this.sectors.get(`${sectorX},${sectorY}`);
            
            if (!sector || !sector.explored) {
                document.getElementById('probeStatus').textContent = 'Cannot build in unexplored sector!';
                setTimeout(() => {
                    document.getElementById('probeStatus').textContent = 'Click to place Recon Hub...';
                }, 2000);
                return;
            }
            
            const hub = {
                id: `hub_${sectorX}_${sectorY}_${Date.now()}`,
                x: x,
                y: y,
                sector: { x: sectorX, y: sectorY },
                range: this.standardSectorWidth / 3,
                maxProbes: 5,
                selected: false
            };
            
            this.reconHubs.push(hub);
            sector.hubs.push(hub);
            
            this.resources.minerals -= 100;
            this.hubPlacementMode = false;
            this.canvas.style.cursor = 'grab';
            document.getElementById('probeStatus').textContent = 'Recon Hub built!';
            this.updateUI();
            
            setTimeout(() => {
                document.getElementById('probeStatus').textContent = '';
            }, 2000);
        }
    }
    
    startPassiveGeneration() {
        setInterval(() => {
            // Update all structures
            this.miningOutposts.forEach(outpost => this.updateStructure(outpost));
            this.miningFacilities.forEach(facility => this.updateStructure(facility));
            this.updateUI();
        }, 1000);
    }
    
    updateStructure(structure) {
        const now = Date.now();
        const structureInfo = this.structureTypes[structure.type];
        const levelInfo = structureInfo.levels[structure.level - 1];
        
        structure.pingTimer += 1000;
        
        // Ping every 3 seconds to collect nearby signals
        if (structure.pingTimer >= 3000) {
            structure.pingTimer = 0;
            
            // Check for signals within range
            this.signals.forEach(signal => {
                const distance = Math.sqrt((signal.x - structure.x) ** 2 + (signal.y - structure.y) ** 2);
                if (distance <= levelInfo.range && levelInfo.tier.includes(signal.rarity)) {
                    // Collect the signal
                    const collectionAmount = levelInfo.rate * signal.value;
                    
                    if (structure.resourceType === 'minerals') {
                        this.resources.minerals += Math.floor(collectionAmount);
                    } else if (structure.resourceType === 'exoticMinerals') {
                        this.resources.exoticMinerals += Math.floor(collectionAmount * 0.1); // Smaller amounts
                    }
                    
                    // Remove the signal
                    this.signals = this.signals.filter(s => s !== signal);
                    
                    // Remove from DOM
                    const signalElement = document.querySelector(`[data-signal-id="${signal.x}_${signal.y}"]`);
                    if (signalElement) {
                        signalElement.remove();
                    }
                }
            });
        }
    }
    
    autoCollectSignals(probe) {
        // Auto-collect signals within 80 pixels (same as radar pulse range)
        const collectRange = 80;
        
        this.signals.forEach((signal, index) => {
            const distance = Math.sqrt(
                (signal.x - probe.current.x) ** 2 + 
                (signal.y - probe.current.y) ** 2
            );
            
            if (distance <= collectRange) {
                // Check what resources this specific auto-collector is configured to gather
                const equipment = probe.equipment;
                if (!equipment || !equipment.collectionTypes) return;
                
                const canCollectMinerals = equipment.collectionTypes.includes('minerals') || equipment.collectionTypes.includes('all');
                const canCollectData = equipment.collectionTypes.includes('data') || equipment.collectionTypes.includes('all');
                const canCollectArtifacts = equipment.collectionTypes.includes('artifacts') || equipment.collectionTypes.includes('all');
                const hasUniversal = equipment.collectionTypes.includes('all');
                
                // Get sector bonuses
                const sector = this.sectors.get(`${this.currentSector.x},${this.currentSector.y}`);
                if (!sector) return;
                
                const value = signal.value;
                let collected = false;
                let collectedResources = [];
                
                // Determine what to collect based on research and signal rarity
                if (hasUniversal) {
                    // Universal collection: collect all resource types from any rarity
                    const mineralValue = Math.floor(value * sector.type.mineralBonus);
                    const dataValue = Math.floor(value * sector.type.dataBonus); 
                    const artifactValue = Math.floor(value * sector.type.artifactBonus);
                    
                    this.resources.minerals += mineralValue;
                    this.resources.data += dataValue;
                    this.resources.artifacts += artifactValue;
                    
                    if (mineralValue > 0) collectedResources.push({ value: mineralValue, type: 'minerals' });
                    if (dataValue > 0) collectedResources.push({ value: dataValue, type: 'data' });
                    if (artifactValue > 0) collectedResources.push({ value: artifactValue, type: 'artifacts' });
                    
                    // Chance for exotic minerals on higher rarities
                    if (['epic', 'legendary'].includes(signal.rarity) && Math.random() < 0.15) {
                        this.resources.exoticMinerals++;
                        collectedResources.push({ value: 1, type: 'exotic' });
                    }
                    collected = true;
                } else {
                    // Specific collection: only collect from common signals, only specific resource types
                    if (signal.rarity === 'common') {
                        if (canCollectMinerals) {
                            const mineralValue = Math.floor(value * sector.type.mineralBonus);
                            this.resources.minerals += mineralValue;
                            if (mineralValue > 0) collectedResources.push({ value: mineralValue, type: 'minerals' });
                            collected = true;
                        }
                        if (canCollectData) {
                            const dataValue = Math.floor(value * sector.type.dataBonus);
                            this.resources.data += dataValue;
                            if (dataValue > 0) collectedResources.push({ value: dataValue, type: 'data' });
                            collected = true;
                        }
                        if (canCollectArtifacts) {
                            const artifactValue = Math.floor(value * sector.type.artifactBonus);
                            this.resources.artifacts += artifactValue;
                            if (artifactValue > 0) collectedResources.push({ value: artifactValue, type: 'artifacts' });
                            collected = true;
                        }
                    }
                }
                
                if (collected) {
                    // Show visual feedback for collection
                    this.showCollectionFeedback(signal.x, signal.y, collectedResources);
                    
                    // Mark signal for removal (we'll remove it after showing animation)
                    signal.collected = true;
                    signal.collectionTime = Date.now();
                }
            }
        });
        
        // Remove collected signals after showing animation (300ms delay)
        this.signals = this.signals.filter(signal => {
            if (signal.collected && Date.now() - signal.collectionTime > 300) {
                return false;
            }
            return true;
        });
    }
    
    showCollectionFeedback(x, y, resources) {
        if (!resources || resources.length === 0) return;
        
        // Resource type colors
        const colorMap = {
            'minerals': '#aaa',    // Gray
            'data': '#0af',       // Blue 
            'artifacts': '#fa0',  // Orange
            'exotic': '#f0f'      // Magenta
        };
        
        // Create floating text element
        const feedback = document.createElement('div');
        feedback.style.position = 'fixed';
        feedback.style.fontSize = '14px';
        feedback.style.fontWeight = 'bold';
        feedback.style.pointerEvents = 'none';
        feedback.style.zIndex = '9999';
        feedback.style.whiteSpace = 'nowrap';
        
        // Build colored text content
        let htmlContent = '';
        resources.forEach((resource, index) => {
            const color = colorMap[resource.type] || '#fff';
            htmlContent += `<span style="color: ${color};">+${resource.value}</span>`;
            if (index < resources.length - 1) {
                htmlContent += ' ';
            }
        });
        
        feedback.innerHTML = htmlContent;
        
        // Position relative to signal location on screen
        const canvasRect = this.canvas.getBoundingClientRect();
        const screenX = x - this.viewOffset.x + canvasRect.left;
        const screenY = y - this.viewOffset.y + canvasRect.top;
        
        feedback.style.left = `${screenX}px`;
        feedback.style.top = `${screenY - 20}px`;
        feedback.style.transform = 'translateX(-50%)';
        
        document.body.appendChild(feedback);
        
        // Simple fade-out animation
        let startTime = Date.now();
        const duration = 1000;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                feedback.remove();
                return;
            }
            
            // Just fade out, no movement
            const opacity = 1 - progress;
            feedback.style.opacity = opacity;
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }
    
    drawProbeCapacityIndicators(centerX, centerY, currentProbes, maxProbes) {
        const circleRadius = 4;
        const spacing = 10;
        const totalWidth = (maxProbes - 1) * spacing;
        const startX = centerX - totalWidth / 2;
        
        for (let i = 0; i < maxProbes; i++) {
            const x = startX + i * spacing;
            const y = centerY;
            
            // Determine circle appearance
            if (i < currentProbes) {
                // Filled circle for active probes
                this.ctx.fillStyle = '#00ff80';
                this.ctx.globalAlpha = 1.0;
            } else {
                // Empty circle for available slots
                this.ctx.fillStyle = '#00ff80';
                this.ctx.globalAlpha = 0.5;
            }
            
            // Draw circle
            this.ctx.beginPath();
            this.ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw border for empty slots
            if (i >= currentProbes) {
                this.ctx.strokeStyle = '#00ff80';
                this.ctx.globalAlpha = 0.5;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        
        // Reset alpha
        this.ctx.globalAlpha = 1.0;
    }
    
    renderMinimap() {
        const ctx = this.minimapCtx;
        const width = this.minimapCanvas.width;
        const height = this.minimapCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);
        
        const scale = 50;
        const centerX = width / 2;
        const centerY = height / 2;
        
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const sectorX = this.currentSector.x + dx;
                const sectorY = this.currentSector.y + dy;
                const key = `${sectorX},${sectorY}`;
                
                const x = centerX + dx * scale;
                const y = centerY + dy * scale;
                
                if (!this.sectors.has(key)) {
                    this.initializeSector(sectorX, sectorY, false);
                }
                
                if (this.sectors.has(key)) {
                    const sector = this.sectors.get(key);
                    
                    if (sector.explored) {
                        ctx.fillStyle = sector.type.color;
                        ctx.fillRect(x - scale/2 + 1, y - scale/2 + 1, scale - 2, scale - 2);
                        
                        ctx.save();
                        ctx.font = '8px monospace';
                        ctx.fillStyle = '#fff';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        const nameParts = sector.name.split(' ');
                        ctx.fillText(nameParts[0], x, y - 5);
                        if (nameParts[1]) {
                            ctx.fillText(nameParts[1], x, y + 5);
                        }
                        ctx.restore();
                        
                        if (sector.outposts.length > 0) {
                            ctx.fillStyle = '#ff0';
                            ctx.beginPath();
                            ctx.arc(x, y + 15, 3, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        
                        if (sector.type.probeDestructionChance) {
                            ctx.fillStyle = '#ff6b35';
                            ctx.font = '12px monospace';
                            ctx.fillText('⚠', x - 18, y - 18);
                        }
                    } else {
                        ctx.fillStyle = '#222';
                        ctx.fillRect(x - scale/2 + 1, y - scale/2 + 1, scale - 2, scale - 2);
                        
                        const gradient = ctx.createRadialGradient(x, y, 0, x, y, scale/2);
                        gradient.addColorStop(0, 'rgba(100, 100, 100, 0.3)');
                        gradient.addColorStop(1, 'rgba(100, 100, 100, 0)');
                        ctx.fillStyle = gradient;
                        ctx.fillRect(x - scale/2, y - scale/2, scale, scale);
                        
                        ctx.fillStyle = '#444';
                        ctx.font = '16px monospace';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('?', x, y);
                    }
                } 
                
                if (dx === 0 && dy === 0) {
                    ctx.strokeStyle = '#0ff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x - scale/2, y - scale/2, scale, scale);
                }
            }
        }
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
    }
    
    drawSectorBoundaries() {
        // Calculate which sectors are visible on screen
        const minVisibleSectorX = Math.floor(this.viewOffset.x / this.standardSectorWidth) - 1;
        const maxVisibleSectorX = Math.ceil((this.viewOffset.x + this.canvas.width) / this.standardSectorWidth) + 1;
        const minVisibleSectorY = Math.floor(this.viewOffset.y / this.standardSectorHeight) - 1;
        const maxVisibleSectorY = Math.ceil((this.viewOffset.y + this.canvas.height) / this.standardSectorHeight) + 1;
        
        // Draw all sectors in the visible range
        for (let sectorX = minVisibleSectorX; sectorX <= maxVisibleSectorX; sectorX++) {
            for (let sectorY = minVisibleSectorY; sectorY <= maxVisibleSectorY; sectorY++) {
                const key = `${sectorX},${sectorY}`;
                const sector = this.sectors.get(key);
                
                if (sector && sector.explored) {
                    const sectorScreenX = sectorX * this.standardSectorWidth - this.viewOffset.x;
                    const sectorScreenY = sectorY * this.standardSectorHeight - this.viewOffset.y;
                    
                    this.ctx.strokeStyle = sector.type.borderColor;
                    this.ctx.lineWidth = 3;
                    this.ctx.setLineDash([15, 8]);
                    
                    this.ctx.beginPath();
                    this.ctx.rect(sectorScreenX, sectorScreenY, this.standardSectorWidth, this.standardSectorHeight);
                    this.ctx.stroke();
                    
                    this.ctx.setLineDash([]);
                    
                    // Draw sector name if it's the center sector being viewed
                    const centerX = this.viewOffset.x + this.canvas.width / 2;
                    const centerY = this.viewOffset.y + this.canvas.height / 2;
                    const viewSectorX = Math.floor(centerX / this.standardSectorWidth);
                    const viewSectorY = Math.floor(centerY / this.standardSectorHeight);
                    
                    if (sectorX === viewSectorX && sectorY === viewSectorY) {
                        this.ctx.fillStyle = sector.type.borderColor;
                        this.ctx.font = 'bold 14px monospace';
                        this.ctx.fillText(sector.name, 10, 25);
                        
                        if (sector.type.probeDestructionChance) {
                            this.ctx.fillStyle = '#ff6b35';
                            this.ctx.fillText(`⚠ HAZARDOUS: ${Math.floor(sector.type.probeDestructionChance * 100)}% probe loss risk`, 10, 45);
                        }
                    }
                } else {
                    // Draw unexplored sector hint if it's adjacent to an explored one
                    const isAdjacent = this.isAdjacentToExplored(sectorX, sectorY);
                    if (isAdjacent) {
                        const sectorScreenX = sectorX * this.standardSectorWidth - this.viewOffset.x;
                        const sectorScreenY = sectorY * this.standardSectorHeight - this.viewOffset.y;
                        
                        // Only draw if visible
                        if (sectorScreenX + this.standardSectorWidth > -50 && sectorScreenX < this.canvas.width + 50 &&
                            sectorScreenY + this.standardSectorHeight > -50 && sectorScreenY < this.canvas.height + 50) {
                            
                            this.ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
                            this.ctx.fillRect(sectorScreenX, sectorScreenY, this.standardSectorWidth, this.standardSectorHeight);
                            
                            this.ctx.strokeStyle = '#333';
                            this.ctx.lineWidth = 2;
                            this.ctx.setLineDash([10, 5]);
                            this.ctx.beginPath();
                            this.ctx.rect(sectorScreenX, sectorScreenY, this.standardSectorWidth, this.standardSectorHeight);
                            this.ctx.stroke();
                            this.ctx.setLineDash([]);
                            
                            this.ctx.fillStyle = '#444';
                            this.ctx.font = '48px monospace';
                            this.ctx.textAlign = 'center';
                            this.ctx.textBaseline = 'middle';
                            this.ctx.fillText('?', sectorScreenX + this.standardSectorWidth/2, sectorScreenY + this.standardSectorHeight/2);
                            this.ctx.textAlign = 'left';
                            this.ctx.textBaseline = 'alphabetic';
                        }
                    }
                }
            }
        }
    }
    
    isAdjacentToExplored(sectorX, sectorY) {
        const adjacents = [
            { x: sectorX - 1, y: sectorY },
            { x: sectorX + 1, y: sectorY },
            { x: sectorX, y: sectorY - 1 },
            { x: sectorX, y: sectorY + 1 }
        ];
        
        return adjacents.some(adj => {
            const key = `${adj.x},${adj.y}`;
            const sector = this.sectors.get(key);
            return sector && sector.explored;
        });
    }
    
    startBuildingMode(structureType) {
        if (!this.selectedProbe) {
            document.getElementById('buildingStatus').textContent = 'Select a probe first!';
            setTimeout(() => {
                document.getElementById('buildingStatus').textContent = '';
            }, 2000);
            return;
        }
        
        this.buildingMode = true;
        this.buildingStructureType = structureType;
        this.deployMode = false;
        this.hubPlacementMode = false;
        this.canvas.style.cursor = 'crosshair';
        this.updateProbePanel(); // Update to show right-click hint
        document.getElementById('buildingStatus').textContent = `Click along probe path to build ${this.structureTypes[structureType]?.name || 'structure'}...`;
    }
    
    updateBuildingPreview(x, y) {
        if (!this.selectedProbe || !this.buildingStructureType) {
            this.buildingPreview = null;
            return;
        }
        
        // Find closest point on probe path
        const closestPoint = this.findClosestPointOnPath(this.selectedProbe, x, y);
        if (!closestPoint || closestPoint.distance > 50) {
            this.buildingPreview = null;
            return;
        }
        
        // Create preview object
        this.buildingPreview = {
            x: closestPoint.x,
            y: closestPoint.y,
            type: this.buildingStructureType,
            valid: closestPoint.distance <= 50
        };
    }
    
    buildAlongPath(x, y) {
        if (!this.selectedProbe || !this.buildingStructureType) return;
        
        // Find closest point on probe path
        const closestPoint = this.findClosestPointOnPath(this.selectedProbe, x, y);
        if (!closestPoint || closestPoint.distance > 50) {
            document.getElementById('buildingStatus').textContent = 'Too far from probe path!';
            setTimeout(() => {
                document.getElementById('buildingStatus').textContent = '';
            }, 2000);
            return;
        }
        
        // Check resources and build structure
        if (this.buildingStructureType === 'hub') {
            this.buildPathHub(closestPoint.x, closestPoint.y);
        } else {
            this.buildStructure(this.buildingStructureType, closestPoint.x, closestPoint.y);
        }
        
        this.buildingMode = false;
        this.buildingStructureType = null;
        this.buildingPreview = null;
        this.canvas.style.cursor = 'grab';
        document.getElementById('buildingStatus').textContent = '';
    }
    
    findClosestPointOnPath(probe, x, y) {
        let closestPoint = null;
        let minDistance = Infinity;
        
        // Check all segments of the probe path
        for (let i = 0; i < probe.waypoints.length - 1; i++) {
            const start = probe.waypoints[i];
            const end = probe.waypoints[i + 1];
            
            // Find closest point on this line segment
            const point = this.closestPointOnLineSegment(start, end, { x, y });
            const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = { ...point, distance };
            }
        }
        
        return closestPoint;
    }
    
    closestPointOnLineSegment(a, b, p) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = dx * dx + dy * dy;
        
        if (length === 0) return a;
        
        let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / length;
        t = Math.max(0, Math.min(1, t));
        
        return {
            x: a.x + t * dx,
            y: a.y + t * dy
        };
    }
    
    buildStructure(type, x, y) {
        const structureInfo = this.structureTypes[type];
        if (!structureInfo) return;
        
        const cost = structureInfo.cost;
        if (this.resources.minerals < cost.minerals || this.resources.data < cost.data) {
            document.getElementById('buildingStatus').textContent = 'Insufficient resources!';
            setTimeout(() => {
                document.getElementById('buildingStatus').textContent = '';
            }, 2000);
            return;
        }
        
        const structure = {
            id: Date.now(),
            type: type,
            x: x,
            y: y,
            level: 1,
            pingTimer: 0,
            lastCollection: Date.now(),
            resourceType: structureInfo.resourceType
        };
        
        if (type === 'outpost') {
            this.miningOutposts.push(structure);
        } else if (type === 'facility') {
            this.miningFacilities.push(structure);
        }
        
        this.resources.minerals -= cost.minerals;
        this.resources.data -= cost.data;
        
        document.getElementById('buildingStatus').textContent = `${structureInfo.name} built!`;
        this.updateUI();
    }
    
    buildPathHub(x, y) {
        if (this.resources.minerals < 100) {
            document.getElementById('buildingStatus').textContent = 'Need 100 minerals for Recon Hub!';
            setTimeout(() => {
                document.getElementById('buildingStatus').textContent = '';
            }, 2000);
            return;
        }
        
        const sectorX = Math.floor(x / this.standardSectorWidth);
        const sectorY = Math.floor(y / this.standardSectorHeight);
        const sector = this.sectors.get(`${sectorX},${sectorY}`);
        
        if (!sector || !sector.explored) {
            document.getElementById('buildingStatus').textContent = 'Cannot build in unexplored sector!';
            setTimeout(() => {
                document.getElementById('buildingStatus').textContent = '';
            }, 2000);
            return;
        }
        
        const hub = {
            id: `hub_${sectorX}_${sectorY}_${Date.now()}`,
            x: x,
            y: y,
            sector: { x: sectorX, y: sectorY },
            range: this.standardSectorWidth / 3,
            maxProbes: 5,
            selected: false
        };
        
        this.reconHubs.push(hub);
        sector.hubs.push(hub);
        
        this.resources.minerals -= 100;
        document.getElementById('buildingStatus').textContent = 'Recon Hub built!';
        this.updateUI();
    }
    
    updateProbePanel() {
        const panel = document.getElementById('probePanel');
        const probeList = document.getElementById('probeList');
        const buildingPanel = document.getElementById('buildingPanel');
        
        if (!this.selectedHub) {
            panel.style.display = 'none';
            return;
        }
        
        // Get active probes from this hub (including ready probes)
        const hubProbes = this.probes.filter(probe => probe.hub && probe.hub.id === this.selectedHub.id && probe.active);
        
        if (hubProbes.length === 0) {
            panel.style.display = 'none';
            return;
        }
        
        panel.style.display = 'block';
        
        // Update probe list
        probeList.innerHTML = '';
        hubProbes.forEach((probe, index) => {
            const probeDiv = document.createElement('div');
            probeDiv.className = 'probe-item';
            probeDiv.style.cssText = `
                padding: 5px 8px;
                margin: 2px 0;
                border: 1px solid ${probe === this.selectedProbe ? '#0ff' : '#333'};
                background: ${probe === this.selectedProbe ? 'rgba(0,255,255,0.1)' : 'rgba(0,0,0,0.3)'};
                cursor: pointer;
                border-radius: 3px;
                font-size: 11px;
            `;
            
            // Determine status and color
            let status, color;
            if (probe.status === 'ready') {
                status = 'Ready';
                color = '#0f0'; // Green for ready
            } else if (probe.status === 'returning') {
                status = 'Returning';
                color = '#ffa500'; // Orange for returning
            } else {
                status = 'Exploring';
                color = '#0ff'; // Cyan for exploring
            }
            
            if (probe.patrolMode && probe.status !== 'ready') {
                status += ' (Patrol)';
            }
            
            probeDiv.innerHTML = `<span style="color: ${color};">Probe ${index + 1}</span> - ${status}`;
            
            probeDiv.addEventListener('click', () => {
                this.selectedProbe = probe;
                this.focusOnProbe(probe);
                this.showProbeDetailPanel(probe);
                
                // Auto-enable camera lock when probe is selected
                this.cameraLocked = true;
                this.lockedProbe = probe;
                
                // Update the camera lock checkbox to reflect the state
                const cameraLockCheckbox = document.getElementById('cameraLockCheckbox');
                if (cameraLockCheckbox) {
                    cameraLockCheckbox.checked = true;
                }
                
                this.updateProbePanel();
                console.log('Probe clicked, camera locked, detail panel should be visible');
            });
            
            probeList.appendChild(probeDiv);
        });
        
        // Show/hide building panel based on probe selection
        buildingPanel.style.display = this.selectedProbe ? 'block' : 'none';
        
        // Show right-click hint during deployment mode
        let hintHTML = '';
        if (this.deployMode) {
            hintHTML = '<div style="color: #888; font-size: 10px; margin-top: 8px; text-align: center;">Right-click to cancel deployment</div>';
        } else if (this.buildingMode) {
            hintHTML = '<div style="color: #888; font-size: 10px; margin-top: 8px; text-align: center;">Right-click to cancel building</div>';
        }
        
        // Add hint after probe list or building panel
        const existingHint = panel.querySelector('.deployment-hint');
        if (existingHint) {
            existingHint.remove();
        }
        
        if (hintHTML) {
            const hintDiv = document.createElement('div');
            hintDiv.className = 'deployment-hint';
            hintDiv.innerHTML = hintHTML;
            panel.appendChild(hintDiv);
        }
    }
    
    focusOnProbe(probe) {
        // Center camera on probe's current location
        const targetX = probe.current.x - this.canvas.width / 2;
        const targetY = probe.current.y - this.canvas.height / 2;
        
        // Smooth camera transition
        this.viewOffset.x = targetX;
        this.viewOffset.y = targetY;
        
        // Apply bounds
        this.constrainViewOffset();
        
        console.log(`Camera focused on probe at (${probe.current.x}, ${probe.current.y})`);
    }
    
    showProbeDetailPanel(probe) {
        console.log('showProbeDetailPanel called for probe:', probe.id);
        // Emit event for UIManager to handle
        if (this.eventBus) {
            this.eventBus.emit('ui:probeSelected', { probe: probe });
        }
    }
    
    updateProbeDetailPanelPosition(probe) {
        // Panel positioning now handled by DetailsPanel.js
    }
    
    
    updateCameraLock() {
        if (this.cameraLocked && this.lockedProbe && this.lockedProbe.active) {
            // Smoothly track the probe
            const targetX = this.lockedProbe.current.x - this.canvas.width / 2;
            const targetY = this.lockedProbe.current.y - this.canvas.height / 2;
            
            // Smooth camera movement
            const lerpFactor = 0.1; // Adjust for smoother/snappier tracking
            this.viewOffset.x += (targetX - this.viewOffset.x) * lerpFactor;
            this.viewOffset.y += (targetY - this.viewOffset.y) * lerpFactor;
            
            // Apply bounds
            this.constrainViewOffset();
            
            // Update panel position
            this.updateProbeDetailPanelPosition(this.lockedProbe);
        }
    }
    
    checkResearchUnlock() {
        if (!this.researchSystem.unlocked) {
            const totalResources = this.resources.minerals + this.resources.data + 
                                 this.resources.artifacts + this.resources.exoticMinerals;
            
            if (totalResources >= 50) {
                this.researchSystem.unlocked = true;
                document.getElementById('researchBtn').style.display = 'inline-block';
                
                // Show grand research unlock modal
                this.showResearchUnlockModal();
            }
        }
    }
    
    showResearchUnlockModal() {
        const modal = document.getElementById('researchUnlockModal');
        modal.classList.add('active');
        
        // Add some dramatic effects
        setTimeout(() => {
            const modalContent = modal.querySelector('.modal-content');
            modalContent.style.animation = 'researchUnlock 1s ease-out';
        }, 100);
    }
    
    renderResearchTree() {
        const treeContainer = document.getElementById('researchTree');
        treeContainer.innerHTML = '';
        
        // Draw connection lines first
        Object.values(this.researchSystem.tree).forEach(node => {
            if (node.children) {
                node.children.forEach(childId => {
                    const childNode = this.researchSystem.tree[childId];
                    this.drawResearchConnection(treeContainer, node, childNode);
                });
            }
        });
        
        // Draw nodes on top of lines
        Object.values(this.researchSystem.tree).forEach(node => {
            this.createResearchNode(treeContainer, node);
        });
    }
    
    drawResearchConnection(container, fromNode, toNode) {
        const line = document.createElement('div');
        line.style.position = 'absolute';
        line.style.height = '2px';
        line.style.background = fromNode.researched && toNode.available ? '#0ff' : '#444';
        line.style.left = `${fromNode.position.x + 40}px`; // 40 = half node width
        line.style.top = `${fromNode.position.y + 40}px`; // 40 = half node height
        line.style.width = `${toNode.position.x - fromNode.position.x - 80}px`;
        line.style.transformOrigin = 'left center';
        
        container.appendChild(line);
    }
    
    createResearchNode(container, node) {
        const nodeDiv = document.createElement('div');
        nodeDiv.style.position = 'absolute';
        nodeDiv.style.left = `${node.position.x}px`;
        nodeDiv.style.top = `${node.position.y}px`;
        nodeDiv.style.width = '80px';
        nodeDiv.style.height = '80px';
        nodeDiv.style.border = `2px solid ${this.getNodeBorderColor(node)}`;
        nodeDiv.style.background = this.getNodeBackgroundColor(node);
        nodeDiv.style.borderRadius = '8px';
        nodeDiv.style.display = 'flex';
        nodeDiv.style.flexDirection = 'column';
        nodeDiv.style.alignItems = 'center';
        nodeDiv.style.justifyContent = 'center';
        nodeDiv.style.cursor = node.available ? 'pointer' : 'not-allowed';
        nodeDiv.style.textAlign = 'center';
        nodeDiv.style.padding = '5px';
        nodeDiv.style.fontSize = '10px';
        nodeDiv.style.color = node.available ? '#fff' : '#666';
        nodeDiv.style.transition = 'all 0.3s';
        
        // Node icon/symbol
        const icon = document.createElement('div');
        icon.style.fontSize = '20px';
        icon.style.marginBottom = '3px';
        icon.textContent = node.id === 'collection' ? '📦' : '🤖';
        nodeDiv.appendChild(icon);
        
        // Node name
        const name = document.createElement('div');
        name.style.fontSize = '8px';
        name.style.fontWeight = 'bold';
        name.textContent = node.name.replace(' ', '\n');
        nodeDiv.appendChild(name);
        
        // Cost indicator
        if (node.cost > 0) {
            const cost = document.createElement('div');
            cost.style.fontSize = '8px';
            cost.style.color = '#888';
            cost.style.marginTop = '2px';
            cost.textContent = `${node.cost} RP`;
            nodeDiv.appendChild(cost);
        }
        
        // Click handler
        if (node.available) {
            nodeDiv.addEventListener('click', () => this.showResearchDetails(node));
            nodeDiv.addEventListener('mouseenter', () => {
                nodeDiv.style.transform = 'scale(1.1)';
                nodeDiv.style.boxShadow = '0 0 20px rgba(0,255,255,0.5)';
            });
            nodeDiv.addEventListener('mouseleave', () => {
                nodeDiv.style.transform = 'scale(1)';
                nodeDiv.style.boxShadow = 'none';
            });
        }
        
        container.appendChild(nodeDiv);
    }
    
    getNodeBorderColor(node) {
        if (node.researched) return '#0f0';
        if (node.available) return '#0ff';
        return '#444';
    }
    
    getNodeBackgroundColor(node) {
        if (node.researched) return 'rgba(0,255,0,0.2)';
        if (node.available) return 'rgba(0,255,255,0.1)';
        return 'rgba(68,68,68,0.1)';
    }
    
    showResearchDetails(node) {
        const infoDiv = document.getElementById('researchInfo');
        const canResearch = !node.researched && this.researchSystem.points >= node.cost;
        
        infoDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                    <h3 style="color: #0ff; margin: 0 0 5px 0;">${node.name}</h3>
                    <div style="color: #888; font-size: 12px;">Cost: ${node.cost} Research Point${node.cost !== 1 ? 's' : ''}</div>
                </div>
                <button id="researchNodeBtn" class="control-btn" 
                    style="font-size: 12px; padding: 8px 16px; ${!canResearch ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                    ${!canResearch ? 'disabled' : ''}>
                    ${node.researched ? 'Researched ✓' : 'Research'}
                </button>
            </div>
            <div style="color: #fff; line-height: 1.4;">
                ${node.description}
            </div>
            ${node.researched ? '<div style="color: #0f0; margin-top: 10px; font-size: 12px;">✓ Research completed</div>' : ''}
        `;
        
        if (canResearch) {
            document.getElementById('researchNodeBtn').addEventListener('click', () => {
                this.researchNode(node);
            });
        }
    }
    
    researchNode(node) {
        if (node.researched || this.researchSystem.points < node.cost) return;
        
        // Spend research points
        this.researchSystem.points -= node.cost;
        
        // Mark as researched
        node.researched = true;
        this.researchSystem.researched.add(node.id);
        
        // Unlock children
        if (node.children) {
            node.children.forEach(childId => {
                const childNode = this.researchSystem.tree[childId];
                
                // Special case for auto_all: requires all three collection types
                if (childId === 'auto_all') {
                    const requiredParents = ['auto_minerals', 'auto_data', 'auto_artifacts'];
                    const allParentsResearched = requiredParents.every(parentId => 
                        this.researchSystem.researched.has(parentId)
                    );
                    childNode.available = allParentsResearched;
                } else {
                    childNode.available = true;
                }
            });
        }
        
        // Apply research effects
        this.applyResearchEffects(node);
        
        // Update displays
        this.renderResearchTree();
        this.showResearchDetails(node);
        this.updateUI();
        
        console.log(`Researched: ${node.name}`);
    }
    
    updateEquipmentSlot(probe) {
        const equipmentSlot = document.getElementById('equipmentSlot');
        const equipmentInfo = document.getElementById('equipmentInfo');
        const equipmentActions = document.getElementById('equipmentActions');
        
        if (!equipmentSlot || !equipmentActions) {
            return;
        }
        
        if (probe.equipment) {
            // Show equipped item
            equipmentSlot.innerHTML = '<span style="color: #0ff; font-size: 16px;">🤖</span>';
            equipmentSlot.style.borderColor = '#0ff';
            equipmentSlot.style.background = 'rgba(0,255,255,0.1)';
            equipmentSlot.title = probe.equipment.name;
            
            // Show equipment info if element exists
            if (equipmentInfo) {
                const collectionIcons = this.getCollectionTypeIcons(probe.equipment.collectionTypes);
                equipmentInfo.innerHTML = `
                    <div style="color: #0ff; font-weight: bold; margin-bottom: 4px;">${probe.equipment.name}</div>
                    <div style="color: #aaa; font-size: 10px; margin-bottom: 4px;">Collecting: ${collectionIcons}</div>
                    ${probe.equipment.availableTypes.length > 1 ? '<div style="color: #888; font-size: 9px;">Click icons to toggle</div>' : ''}
                `;
            }
            
            // Show configuration and remove buttons
            const hasMultipleTypes = probe.equipment.availableTypes.length > 1;
            equipmentActions.innerHTML = `
                ${hasMultipleTypes ? this.getCollectionConfigUI(probe) : ''}
                <button class="control-btn" style="font-size: 10px; padding: 4px 8px; width: 100%; background: rgba(255,100,100,0.2); border-color: #f88; ${hasMultipleTypes ? 'margin-top: 8px;' : ''}"
                        onclick="game.removeEquipment('${probe.id}')"
                        title="Remove this equipment from the probe">
                    🗑️ Remove Equipment
                </button>
            `;
        } else {
            // Show empty slot
            equipmentSlot.innerHTML = '<span style="color: #444; font-size: 12px;">Empty</span>';
            equipmentSlot.style.borderColor = '#444';
            equipmentSlot.style.background = 'rgba(0,0,0,0.3)';
            equipmentSlot.title = 'No equipment installed';
            
            // Show no equipment message if element exists
            if (equipmentInfo) {
                equipmentInfo.innerHTML = 'No equipment installed';
                equipmentInfo.style.color = '#888';
            }
            
            // Show available equipment options
            const hasAnyAutoCollect = this.researchSystem.researched.has('auto_minerals') || 
                                     this.researchSystem.researched.has('auto_data') || 
                                     this.researchSystem.researched.has('auto_artifacts') ||
                                     this.researchSystem.researched.has('auto_all');
            if (hasAnyAutoCollect) {
                const canAfford = this.resources.minerals >= 25;
                equipmentActions.innerHTML = `
                    <button class="control-btn" style="font-size: 10px; padding: 4px 8px; width: 100%; ${!canAfford ? 'opacity: 0.5;' : ''}"
                            onclick="game.equipAutoCollector('${probe.id}')" 
                            ${!canAfford ? 'disabled' : ''}
                            title="${canAfford ? 'Craft and equip Auto-Collector for automatic signal collection' : 'Need 25 Minerals to craft'}">
                        🤖 Craft Auto-Collector (25M)
                    </button>
                `;
            } else {
                equipmentActions.innerHTML = '<div style="color: #666; font-size: 10px; text-align: center; line-height: 1.3;">Research Auto-Collect technology to unlock equipment</div>';
            }
        }
    }
    
    getCollectionTypeIcons(collectionTypes) {
        const iconMap = {
            'minerals': '<span style="color: #aaa; font-size: 16px;" title="Minerals">⛏️</span>',
            'data': '<span style="color: #0af; font-size: 16px;" title="Data">📡</span>',
            'artifacts': '<span style="color: #fa0; font-size: 16px;" title="Artifacts">🏺</span>',
            'all': '<span style="color: #0ff; font-size: 16px;" title="All Resources">🌟</span>'
        };
        
        return collectionTypes.map(type => iconMap[type] || '❓').join(' ');
    }
    
    getCollectionConfigUI(probe) {
        const iconMap = {
            'minerals': '⛏️',
            'data': '📡', 
            'artifacts': '🏺',
            'all': '🌟'
        };
        
        let configHTML = '<div style="margin-bottom: 6px;">';
        
        probe.equipment.availableTypes.forEach(type => {
            const isActive = probe.equipment.collectionTypes.includes(type);
            const opacity = isActive ? '1' : '0.3';
            const bgColor = isActive ? 'rgba(0,255,255,0.2)' : 'rgba(100,100,100,0.1)';
            
            configHTML += `
                <button onclick="game.toggleCollectionType('${probe.id}', '${type}')"
                        style="background: ${bgColor}; border: 1px solid #666; border-radius: 3px; 
                               padding: 4px 6px; margin: 0 2px; opacity: ${opacity}; cursor: pointer; 
                               font-size: 14px; color: #fff;"
                        title="Toggle ${type} collection">
                    ${iconMap[type]}
                </button>
            `;
        });
        
        configHTML += '</div>';
        return configHTML;
    }
    
    toggleCollectionType(probeId, resourceType) {
        const probe = this.probes.find(p => p.id.toString() === probeId);
        if (!probe || !probe.equipment) return;
        
        const currentTypes = probe.equipment.collectionTypes;
        const index = currentTypes.indexOf(resourceType);
        
        if (index > -1) {
            // Remove if present (but ensure at least one type remains)
            if (currentTypes.length > 1) {
                currentTypes.splice(index, 1);
            }
        } else {
            // Add if not present
            currentTypes.push(resourceType);
        }
        
        // Update the display
        this.updateEquipmentSlot(probe);
    }
    
    equipAutoCollector(probeId) {
        const probe = this.probes.find(p => p.id.toString() === probeId);
        if (!probe || this.resources.minerals < 25 || probe.equipment) return;
        
        this.resources.minerals -= 25;
        
        // Determine what collection types are available
        const availableTypes = [];
        if (this.researchSystem.researched.has('auto_minerals')) availableTypes.push('minerals');
        if (this.researchSystem.researched.has('auto_data')) availableTypes.push('data');
        if (this.researchSystem.researched.has('auto_artifacts')) availableTypes.push('artifacts');
        if (this.researchSystem.researched.has('auto_all')) availableTypes.push('all');
        
        // Default to all available types if universal is unlocked, otherwise first available
        let defaultCollectionTypes;
        if (this.researchSystem.researched.has('auto_all')) {
            defaultCollectionTypes = ['all'];
        } else {
            defaultCollectionTypes = availableTypes.slice(); // Copy all available
        }
        
        probe.equipment = {
            type: 'auto_collector',
            name: 'Auto-Collector',
            description: 'Automatically collects signals the probe detects',
            collectionTypes: defaultCollectionTypes,
            availableTypes: availableTypes
        };
        
        this.updateEquipmentSlot(probe);
        this.updateUI();
        
        // Show success message
        this.showStatusMessage('Auto-Collector equipped! This probe will now collect signals automatically.', '#0f0');
    }
    
    removeEquipment(probeId) {
        const probe = this.probes.find(p => p.id.toString() === probeId);
        if (!probe || !probe.equipment) return;
        
        const equipmentName = probe.equipment.name;
        probe.equipment = null;
        this.updateEquipmentSlot(probe);
        
        // Show removal message
        this.showStatusMessage(`${equipmentName} removed from probe.`, '#ff0');
    }
    
    showStatusMessage(message, color = '#0ff') {
        const statusDiv = document.getElementById('probeStatus');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.style.color = color;
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 3000);
        }
    }
    
    applyResearchEffects(node) {
        switch(node.id) {
            case 'auto_minerals':
                this.showStatusMessage('Auto-Collectors can now gather minerals from common signals!', '#0f0');
                break;
            case 'auto_data':
                this.showStatusMessage('Auto-Collectors can now gather data from common signals!', '#0f0');
                break;
            case 'auto_artifacts':
                this.showStatusMessage('Auto-Collectors can now gather artifacts from common signals!', '#0f0');
                break;
            case 'auto_all':
                this.showStatusMessage('Universal Collection unlocked! Auto-Collectors now gather ALL resources from ANY signal rarity!', '#0ff');
                break;
        }
    }
    
    // Debug tool - add resources
    addDebugResources(minerals = 100, data = 50, artifacts = 25, exotic = 10) {
        this.resources.minerals += minerals;
        this.resources.data += data;
        this.resources.artifacts += artifacts;
        this.resources.exoticMinerals += exotic;
        this.updateUI();
        console.log(`Debug: Added ${minerals} Minerals, ${data} Data, ${artifacts} Artifacts, ${exotic} Exotic`);
    }
    
    // Debug tool - check game state
    debugGameState() {
        console.log('=== GAME STATE DEBUG ===');
        console.log('Total probes:', this.probes.length);
        console.log('Active probes:', this.probes.filter(p => p.active).length);
        console.log('Hub count:', this.reconHubs.length);
        console.log('Selected hub:', this.selectedHub ? this.selectedHub.id : 'none');
        
        console.log('\nPROBES:');
        this.probes.forEach((probe, i) => {
            console.log(`  Probe ${i}: status=${probe.status}, active=${probe.active}, waypoints=${probe.waypoints?.length || 0}, hub=${probe.hub?.id}`);
        });
        
        console.log('\nHUBS:');
        this.reconHubs.forEach((hub, i) => {
            console.log(`  Hub ${i}: id=${hub.id}, probes=${this.getActiveProbeCountForHub(hub)}/${hub.maxProbes}, selected=${hub.selected}`);
        });
        console.log('=== END DEBUG ===');
    }
    
    // Robust probe ledger system
    getActiveProbeCountForHub(hub) {
        // Count probes that belong to this hub and are active
        const activeProbes = this.probes.filter(probe => 
            probe.active && 
            probe.hub && 
            probe.hub.id === hub.id
        );
        return activeProbes.length;
    }
    
    getReadyProbeCountForHub(hub) {
        // Count probes that are ready at this hub
        const readyProbes = this.probes.filter(probe => 
            probe.active && 
            probe.hub && 
            probe.hub.id === hub.id && 
            probe.status === 'ready' &&
            (!probe.waypoints || probe.waypoints.length === 0)
        );
        return readyProbes.length;
    }
    
    
    getProbeStatus(hub) {
        const activeCount = this.getActiveProbeCountForHub(hub);
        const readyCount = this.getReadyProbeCountForHub(hub);
        const deployedCount = activeCount - readyCount;
        
        return {
            total: activeCount,
            ready: readyCount,
            deployed: deployedCount,
            maxProbes: hub.maxProbes
        };
    }
    
    updateUI() {
        const totalProbes = this.reconHubs.reduce((sum, hub) => sum + this.getActiveProbeCountForHub(hub), 0);
        document.getElementById('probeCount').textContent = totalProbes;
        document.getElementById('minerals').textContent = this.resources.minerals;
        document.getElementById('data').textContent = this.resources.data;
        document.getElementById('artifacts').textContent = this.resources.artifacts;
        document.getElementById('exoticMinerals').textContent = this.resources.exoticMinerals;
        document.getElementById('researchPoints').textContent = this.researchSystem.points;
        
        // Check if research should be unlocked
        this.checkResearchUnlock();
        document.getElementById('outpostCount').textContent = this.miningOutposts.length;
        document.getElementById('hubCount').textContent = this.reconHubs.length;
        
        // Update button states
        const deployBtn = document.getElementById('deployProbeBtn');
        const buildOutpostBtn = document.getElementById('buildOutpostBtn');
        const buildHubBtn = document.getElementById('buildHubBtn');
        const buildProbeBtn = document.getElementById('buildProbeBtn');
        
        // Deploy probe: need selected hub with ready probes
        const canDeploy = this.selectedHub && this.getReadyProbeCountForHub(this.selectedHub) > 0;
        // console.log('UI Update - selectedHub:', !!this.selectedHub, 'hub probes:', this.selectedHub?.probes, 'canDeploy:', canDeploy);
        deployBtn.disabled = !canDeploy;
        deployBtn.classList.toggle('disabled', !canDeploy);
        
        // Build outpost: need resources
        const canBuildOutpost = this.resources.minerals >= 50 && this.resources.data >= 20;
        buildOutpostBtn.disabled = !canBuildOutpost;
        buildOutpostBtn.classList.toggle('disabled', !canBuildOutpost);
        
        // Build hub: need minerals
        const canBuildHub = this.resources.minerals >= 100;
        buildHubBtn.disabled = !canBuildHub;
        buildHubBtn.classList.toggle('disabled', !canBuildHub);
        
        // Build probe: need selected hub, minerals, and space
        const canBuildProbe = this.selectedHub && this.resources.minerals >= 25 && this.getActiveProbeCountForHub(this.selectedHub) < this.selectedHub.maxProbes;
        buildProbeBtn.disabled = !canBuildProbe;
        buildProbeBtn.classList.toggle('disabled', !canBuildProbe);
        
        // Find the sector at the center of the current view
        const centerX = this.viewOffset.x + this.canvas.width / 2;
        const centerY = this.viewOffset.y + this.canvas.height / 2;
        const viewSectorX = Math.floor(centerX / this.standardSectorWidth);
        const viewSectorY = Math.floor(centerY / this.standardSectorHeight);
        
        const sector = this.sectors.get(`${viewSectorX},${viewSectorY}`);
        if (sector && sector.explored) {
            const warningIcon = sector.type.probeDestructionChance ? ' ⚠' : '';
            const hubInfo = this.selectedHub ? ` | Hub: ${this.getReadyProbeCountForHub(this.selectedHub)}/${this.selectedHub.maxProbes}` : '';
            document.getElementById('sectorInfo').textContent = `${sector.name}${warningIcon}${hubInfo}`;
        } else {
            const hubInfo = this.selectedHub ? ` | Hub: ${this.getReadyProbeCountForHub(this.selectedHub)}/${this.selectedHub.maxProbes}` : '';
            document.getElementById('sectorInfo').textContent = `Unexplored Space [${viewSectorX}, ${viewSectorY}]${hubInfo}`;
        }
    }
    
    showProbeDestruction(probe) {
        const modal = document.getElementById('probeDestroyedModal');
        if (!modal) {
            const newModal = document.createElement('div');
            newModal.id = 'probeDestroyedModal';
            newModal.className = 'modal';
            newModal.innerHTML = `
                <div class="modal-content" style="border-color: #ff6b35;">
                    <h2 style="color: #ff6b35;">Probe Destroyed!</h2>
                    <p>Your probe was destroyed by asteroid collision!</p>
                </div>
            `;
            document.body.appendChild(newModal);
        }
        
        const destroyedModal = document.getElementById('probeDestroyedModal');
        destroyedModal.classList.add('active');
        setTimeout(() => {
            destroyedModal.classList.remove('active');
        }, 2000);
    }
    
    render() {
        // Update camera lock before rendering
        this.updateCameraLock();

        // Panel positioning now handled by DetailsPanel.js

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawSectorBoundaries();
        
        this.stars.forEach(star => {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x - this.viewOffset.x, star.y - this.viewOffset.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Update signal positions
        this.signals.forEach(signal => {
            if (signal.updatePosition) {
                signal.updatePosition();
            }
        });
        
        // Draw Recon Hubs
        this.reconHubs.forEach(hub => {
            const screenX = hub.x - this.viewOffset.x;
            const screenY = hub.y - this.viewOffset.y;
            
            // Draw hub range (only if placing or deploying)
            if (this.deployMode || this.hubPlacementMode) {
                this.ctx.strokeStyle = 'rgba(0, 255, 128, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(screenX, screenY, hub.range, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            // Draw hub icon - hexagonal base
            this.ctx.strokeStyle = hub.selected ? '#ffff00' : '#00ff80';
            this.ctx.fillStyle = hub.selected ? '#404000' : '#004020';
            this.ctx.lineWidth = hub.selected ? 4 : 3;
            
            // Hexagon
            const size = 12;
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = screenX + Math.cos(angle) * size;
                const y = screenY + Math.sin(angle) * size;
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            // Central antenna/dish
            this.ctx.fillStyle = '#00ff80';
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Animated pulse
            const time = Date.now() * 0.002;
            const pulseRadius = 8 + Math.sin(time + hub.id.length) * 3;
            this.ctx.strokeStyle = `rgba(0, 255, 128, ${0.5 + Math.sin(time + hub.id.length) * 0.3})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, pulseRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Draw probe capacity indicators above hub based on actual probe counts
            const activeProbesAtHub = this.getActiveProbeCountForHub(hub);
            this.drawProbeCapacityIndicators(screenX, screenY - 30, activeProbesAtHub, hub.maxProbes);
        });
        
        // Draw all structures
        [...this.miningOutposts, ...this.miningFacilities].forEach(structure => {
            const x = structure.x - this.viewOffset.x;
            const y = structure.y - this.viewOffset.y;
            
            // Structure-specific colors and shapes
            if (structure.type === 'outpost') {
                // Mining Outpost - Yellow square
                this.ctx.strokeStyle = '#ff0';
                this.ctx.fillStyle = '#880';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.rect(x - 8, y - 8, 16, 16);
                this.ctx.fill();
                this.ctx.stroke();
                
                // Center dot
                this.ctx.fillStyle = '#ff0';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (structure.type === 'facility') {
                // Mining Facility - Purple diamond
                this.ctx.strokeStyle = '#a0a';
                this.ctx.fillStyle = '#505';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - 10);
                this.ctx.lineTo(x + 10, y);
                this.ctx.lineTo(x, y + 10);
                this.ctx.lineTo(x - 10, y);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                
                // Center crystal
                this.ctx.fillStyle = '#f0f';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Pulsing range indicator
            const structureInfo = this.structureTypes[structure.type];
            const levelInfo = structureInfo.levels[structure.level - 1];
            const pulseIntensity = Math.sin(Date.now() * 0.003 + structure.id * 0.001) * 0.5 + 0.5;
            const pulseColor = structure.type === 'outpost' ? 'rgba(255, 255, 0, 0.2)' : 'rgba(255, 0, 255, 0.2)';
            
            this.ctx.strokeStyle = pulseColor;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(x, y, levelInfo.range * pulseIntensity, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Level indicator
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`L${structure.level}`, x, y - 15);
            this.ctx.textAlign = 'left';
        });
        
        // Draw building preview
        if (this.buildingPreview) {
            const x = this.buildingPreview.x - this.viewOffset.x;
            const y = this.buildingPreview.y - this.viewOffset.y;
            const valid = this.buildingPreview.valid;
            
            // Set alpha for preview
            this.ctx.globalAlpha = valid ? 0.7 : 0.3;
            
            if (this.buildingPreview.type === 'outpost') {
                // Preview Mining Outpost - Yellow square
                this.ctx.strokeStyle = valid ? '#ff0' : '#f88';
                this.ctx.fillStyle = valid ? '#880' : '#844';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]); // Dashed for preview
                this.ctx.beginPath();
                this.ctx.rect(x - 8, y - 8, 16, 16);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                
                // Center dot
                this.ctx.fillStyle = valid ? '#ff0' : '#f88';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (this.buildingPreview.type === 'facility') {
                // Preview Mining Facility - Purple diamond
                this.ctx.strokeStyle = valid ? '#a0a' : '#a88';
                this.ctx.fillStyle = valid ? '#505' : '#544';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]); // Dashed for preview
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - 10);
                this.ctx.lineTo(x + 10, y);
                this.ctx.lineTo(x, y + 10);
                this.ctx.lineTo(x - 10, y);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                
                // Center crystal
                this.ctx.fillStyle = valid ? '#f0f' : '#f88';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            } else if (this.buildingPreview.type === 'hub') {
                // Preview Recon Hub - Hexagonal base
                this.ctx.strokeStyle = valid ? '#00ff80' : '#88ff80';
                this.ctx.fillStyle = valid ? '#004020' : '#004444';
                this.ctx.lineWidth = 3;
                this.ctx.setLineDash([5, 5]); // Dashed for preview
                
                // Hexagon
                const size = 12;
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3;
                    const hx = x + Math.cos(angle) * size;
                    const hy = y + Math.sin(angle) * size;
                    if (i === 0) {
                        this.ctx.moveTo(hx, hy);
                    } else {
                        this.ctx.lineTo(hx, hy);
                    }
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.setLineDash([]);
                
                // Central antenna/dish
                this.ctx.fillStyle = valid ? '#00ff80' : '#88ff80';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Reset alpha
            this.ctx.globalAlpha = 1.0;
        }
        
        // Draw deployment line from selected hub to mouse when in deploy mode
        if (this.deployMode && this.selectedHub) {
            const hubX = this.selectedHub.x - this.viewOffset.x;
            const hubY = this.selectedHub.y - this.viewOffset.y;
            const mouseX = this.mousePosition.x - this.viewOffset.x;
            const mouseY = this.mousePosition.y - this.viewOffset.y;
            
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([10, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(hubX, hubY);
            this.ctx.lineTo(mouseX, mouseY);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // Show range circle
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(hubX, hubY, this.selectedHub.range, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        if (this.deploymentPoints.length > 0) {
            this.ctx.strokeStyle = '#0ff';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([8, 4]);
            
            for (let i = 0; i < this.deploymentPoints.length; i++) {
                const x = this.deploymentPoints[i].x - this.viewOffset.x;
                const y = this.deploymentPoints[i].y - this.viewOffset.y;
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, 10, 0, Math.PI * 2);
                this.ctx.stroke();
                
                this.ctx.fillStyle = '#0ff';
                this.ctx.font = '12px monospace';
                this.ctx.fillText(i === 0 ? 'START' : `DEST ${i}`, 
                    x - 20, 
                    y - 15);
            }
            
            if (this.deploymentPoints.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.deploymentPoints[0].x - this.viewOffset.x, this.deploymentPoints[0].y - this.viewOffset.y);
                for (let i = 1; i < this.deploymentPoints.length; i++) {
                    this.ctx.lineTo(this.deploymentPoints[i].x - this.viewOffset.x, this.deploymentPoints[i].y - this.viewOffset.y);
                }
                this.ctx.stroke();
            }
            
            this.ctx.setLineDash([]);
        }
        
        this.probes.forEach(probe => {
            if (!probe.active) return;
            
            // Draw different path colors based on recovery mode
            if (probe.recoveryMode) {
                // Draw return path in orange
                this.ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([12, 8]);
            } else {
                // Draw outbound path in cyan
                this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([8, 4]);
            }
            
            this.ctx.beginPath();
            this.ctx.moveTo(probe.waypoints[0].x - this.viewOffset.x, probe.waypoints[0].y - this.viewOffset.y);
            for (let i = 1; i < probe.waypoints.length; i++) {
                this.ctx.lineTo(probe.waypoints[i].x - this.viewOffset.x, probe.waypoints[i].y - this.viewOffset.y);
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            probe.radarPulses.forEach(pulse => {
                const x = pulse.x - this.viewOffset.x;
                const y = pulse.y - this.viewOffset.y;
                
                this.ctx.strokeStyle = `rgba(0, 255, 255, ${pulse.opacity * 0.3})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(x, y, pulse.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                
                this.ctx.strokeStyle = `rgba(0, 255, 255, ${pulse.opacity * 0.5})`;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(x, y, pulse.radius * 0.7, 0, Math.PI * 2);
                this.ctx.stroke();
            });
            
            probe.pulses.forEach(pulse => {
                const x = pulse.x - this.viewOffset.x;
                const y = pulse.y - this.viewOffset.y;
                const pulseOpacity = pulse.opacity * (1 + 0.3 * Math.sin(Date.now() * 0.01));
                this.ctx.fillStyle = `rgba(0, 255, 255, ${pulseOpacity})`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, pulse.radius, 0, Math.PI * 2);
                this.ctx.fill();
            });
            
            const time = Date.now() * 0.001;
            const pulseSize = 5 + Math.sin(time * 3) * 2;
            const probeX = probe.current.x - this.viewOffset.x;
            const probeY = probe.current.y - this.viewOffset.y;
            
            // Different colors for recovery mode
            if (probe.recoveryMode) {
                this.ctx.fillStyle = '#ffa500'; // Orange for recovery
                this.ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
            } else {
                this.ctx.fillStyle = '#0ff'; // Cyan for exploring
                this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            }
            
            this.ctx.beginPath();
            this.ctx.arc(probeX, probeY, pulseSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(probeX, probeY, pulseSize + 3, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        
        // Probe detail panel connection line now handled by DetailsPanel.js
        
        // Draw version number in bottom right
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(`v${this.version}`, this.canvas.width - 5, this.canvas.height - 5);
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
    }
    
    gameLoop() {
        let lastTime = performance.now();
        
        const loop = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            
            this.updateProbes(deltaTime);
            this.render();
            this.renderMinimap();
            
            requestAnimationFrame(loop);
        };
        
        requestAnimationFrame(loop);
    }
}

const game = new SpaceIdleGame();
window.game = game; // Make globally accessible for HTML onclick handlers