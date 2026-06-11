/**
 * Sector Management System
 * Handles sector discovery, minimap rendering, and sector navigation
 */
class SectorManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        
        // Minimap canvas
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
        
        // Setup minimap if it exists
        if (this.minimapCanvas) {
            this.minimapCanvas.width = 200;
            this.minimapCanvas.height = 200;
            this.setupMinimapListeners();
        }
        
        // Listen for events
        this.eventBus.on('probe:moved', this.checkSectorDiscovery.bind(this));
        this.eventBus.on('game:render', this.renderMinimap.bind(this));
    }

    /**
     * Setup minimap click listeners
     */
    setupMinimapListeners() {
        this.minimapCanvas.addEventListener('click', (e) => {
            const rect = this.minimapCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = this.minimapCanvas.width / 2;
            const centerY = this.minimapCanvas.height / 2;
            const scale = 50;
            
            // Calculate which sector was clicked
            const world = this.gameState.getWorld();
            const centerSectorX = Math.floor((world.viewOffset.x + window.innerWidth / 2) / world.standardSectorWidth);
            const centerSectorY = Math.floor((world.viewOffset.y + (window.innerHeight - 100) / 2) / world.standardSectorHeight);
            
            const clickedSectorX = centerSectorX + Math.floor((x - centerX) / scale);
            const clickedSectorY = centerSectorY + Math.floor((y - centerY) / scale);
            
            const sectorKey = `${clickedSectorX},${clickedSectorY}`;
            if (world.sectors.has(sectorKey) && world.sectors.get(sectorKey).explored) {
                this.snapToSector(clickedSectorX, clickedSectorY);
            }
        });
        
        // Arrow key navigation
        document.addEventListener('keydown', (e) => {
            const world = this.gameState.getWorld();
            const centerX = world.viewOffset.x + window.innerWidth / 2;
            const centerY = world.viewOffset.y + (window.innerHeight - 100) / 2;
            const currentSectorX = Math.floor(centerX / world.standardSectorWidth);
            const currentSectorY = Math.floor(centerY / world.standardSectorHeight);
            
            let newX = currentSectorX;
            let newY = currentSectorY;
            
            if (e.key === 'ArrowUp') newY--;
            if (e.key === 'ArrowDown') newY++;
            if (e.key === 'ArrowLeft') newX--;
            if (e.key === 'ArrowRight') newX++;
            
            const key = `${newX},${newY}`;
            if (world.sectors.has(key) && world.sectors.get(key).explored) {
                this.snapToSector(newX, newY);
            }
        });
    }

    /**
     * Check if probe movement should discover new sectors
     */
    checkSectorDiscovery(data) {
        const { probe } = data;
        if (!probe || !probe.active) return;
        
        const world = this.gameState.getWorld();
        const currentSectorX = Math.floor(probe.current.x / world.standardSectorWidth);
        const currentSectorY = Math.floor(probe.current.y / world.standardSectorHeight);
        
        // Check if probe has moved to a new sector
        if (probe.lastSectorX === undefined || probe.lastSectorY === undefined) {
            probe.lastSectorX = currentSectorX;
            probe.lastSectorY = currentSectorY;
            // Also discover the starting sector if not already discovered
            this.discoverSector(currentSectorX, currentSectorY);
            return;
        }
        
        if (probe.lastSectorX !== currentSectorX || probe.lastSectorY !== currentSectorY) {
            console.log(`Probe ${probe.id} moved to new sector [${currentSectorX}, ${currentSectorY}] from [${probe.lastSectorX}, ${probe.lastSectorY}]`);
            this.discoverSector(currentSectorX, currentSectorY);
            probe.lastSectorX = currentSectorX;
            probe.lastSectorY = currentSectorY;
        }
    }

    /**
     * Discover a sector
     */
    discoverSector(x, y) {
        const world = this.gameState.getWorld();
        const key = `${x},${y}`;
        
        console.log(`Discovering sector [${x}, ${y}]...`);
        
        if (!world.sectors.has(key)) {
            console.log(`Creating new sector [${x}, ${y}]`);
            this.initializeSector(x, y, true);
        } else {
            const sector = world.sectors.get(key);
            if (!sector.explored) {
                console.log(`Exploring existing sector [${x}, ${y}]: ${sector.name}`);
                sector.explored = true;
                sector.stars = this.generateSectorStars(x, y);

                // Ensure sector has required arrays
                if (!sector.outposts) sector.outposts = [];
                if (!sector.facilities) sector.facilities = [];
                if (!sector.hubs) sector.hubs = [];

                // PROF-01: Backward compatibility - assign profile if missing
                if (!sector.resourceProfile) {
                    sector.resourceProfile = this.assignResourceProfile(x, y);
                }
                
                // Update Probethium stats (research points died with the Lab —
                // discovery's reward is the territory itself)
                this.gameState.updateProbethiumStats('sector_discovered');

                // Canonical discovery event (SFX, dashboard, future completion tracking)
                this.eventBus.emit('sector:discovered', { sector, x, y });

                this.showSectorDiscovery(sector.type, sector.name, sector);

                // Show sector report button
                const sectorReportBtn = document.getElementById('sectorReportBtn');
                if (sectorReportBtn) sectorReportBtn.style.display = 'inline-block';

                // Spawn discovery bonus signals
                this.spawnDiscoveryBonusSignals(x, y, sector.type);
                
                // Regenerate all visible stars
                this.eventBus.emit('world:generateStars');
            } else {
                console.log(`Sector [${x}, ${y}] already explored: ${sector.name}`);
            }
        }
    }

    /**
     * Initialize a new sector
     */
    initializeSector(x, y, discovered = false) {
        const world = this.gameState.getWorld();
        
        // Generate sector type
        const sectorTypes = [
            {
                name: 'Standard',
                color: 'rgba(139, 132, 163, 0.08)',
                borderColor: 'rgba(139, 132, 163, 0.35)',
                mineralBonus: 1.0, 
                dataBonus: 1.0, 
                artifactBonus: 1.0,
                probeDestructionChance: 0
            },
            {
                name: 'Resource-Rich',
                color: 'rgba(201, 123, 74, 0.07)',
                borderColor: 'rgba(201, 123, 74, 0.45)',
                mineralBonus: 2.0,
                dataBonus: 1.5,
                artifactBonus: 1.2,
                exclusiveSignalType: 'ore_vein',
                probeDestructionChance: 0
            },
            {
                name: 'Data Haven',
                color: 'rgba(91, 140, 255, 0.06)',
                borderColor: 'rgba(91, 140, 255, 0.45)',
                mineralBonus: 0.8,
                dataBonus: 3.0,
                artifactBonus: 1.5,
                exclusiveSignalType: 'data_cache',
                probeDestructionChance: 0
            },
            {
                name: 'Ancient',
                color: 'rgba(176, 107, 255, 0.06)',
                borderColor: 'rgba(176, 107, 255, 0.45)',
                mineralBonus: 1.2,
                dataBonus: 1.8,
                artifactBonus: 4.0,
                exclusiveSignalType: 'relic',
                probeDestructionChance: 0
            },
            {
                name: 'Asteroid Field',
                color: 'rgba(224, 82, 77, 0.06)',
                borderColor: 'rgba(224, 82, 77, 0.5)',
                mineralBonus: 3.0,
                dataBonus: 3.0,
                artifactBonus: 3.0,
                exclusiveSignalType: 'exotic_crystal',
                probeDestructionChance: 0.1
            }
        ];
        
        const weights = [50, 25, 15, 5, 5]; // Standard is most common
        let totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;
        
        let selectedType = sectorTypes[0];
        for (let i = 0; i < sectorTypes.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                selectedType = sectorTypes[i];
                break;
            }
        }
        
        // Generate sector name using advanced name generator
        const nameGen = new NameGenerator();
        const name = nameGen.generateSectorName(selectedType.name);
        
        const sector = {
            x: x,
            y: y,
            explored: discovered,
            type: selectedType,
            name: name,
            stars: discovered ? this.generateSectorStars(x, y) : [],
            outposts: [],
            facilities: [],
            hubs: []
        };

        // PROF-01: Assign resource profile on sector creation
        sector.resourceProfile = this.assignResourceProfile(x, y);

        world.sectors.set(`${x},${y}`, sector);
        
        if (discovered) {
            this.showSectorDiscovery(selectedType, name, sector);
            this.spawnDiscoveryBonusSignals(x, y, selectedType);
        }

        return sector;
    }

    /**
     * Assign resource profile to a sector based on distance from origin
     * PROF-01, PROF-03, PROF-04: Distance-weighted profile assignment
     */
    assignResourceProfile(x, y) {
        // Calculate distance from origin
        const distance = Math.sqrt(x * x + y * y);

        // Define profile types and their spawn rate multipliers
        const profileTypes = [
            { type: 'balanced', spawnRateMultiplier: 1.0 },
            { type: 'mineral-rich', spawnRateMultiplier: 1.5 },
            { type: 'data-rich', spawnRateMultiplier: 1.5 },
            { type: 'artifact-rich', spawnRateMultiplier: 1.5 },
            { type: 'probethium-rich', spawnRateMultiplier: 0.8 }
        ];

        // Distance-based weight tables (PROF-03, PROF-04)
        let weights;
        if (distance < 5) {
            // Near origin: mostly balanced, rare probethium-rich (~2%)
            weights = [60, 20, 10, 8, 2];
        } else if (distance < 10) {
            // Mid-range: more variety, ~5% probethium-rich
            weights = [45, 25, 15, 10, 5];
        } else {
            // Far from origin: rich profiles common, ~10% probethium-rich
            weights = [30, 25, 20, 15, 10];
        }

        // Weighted random selection (same pattern as sector type selection)
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;

        let selectedProfile = profileTypes[0];
        for (let i = 0; i < profileTypes.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                selectedProfile = profileTypes[i];
                break;
            }
        }

        console.log(`[PROF-01] Assigned ${selectedProfile.type} profile to sector [${x}, ${y}] (distance: ${distance.toFixed(1)})`);

        return {
            type: selectedProfile.type,
            spawnRateMultiplier: selectedProfile.spawnRateMultiplier,
            assignedDistance: distance
        };
    }

    /**
     * Generate stars for a sector
     */
    generateSectorStars(sectorX, sectorY) {
        const world = this.gameState.getWorld();
        const stars = [];
        const starCount = 50 + Math.floor(Math.random() * 30);
        
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: sectorX * world.standardSectorWidth + Math.random() * world.standardSectorWidth,
                y: sectorY * world.standardSectorHeight + Math.random() * world.standardSectorHeight,
                size: Math.random() * 2 + 1,
                brightness: Math.random() * 0.7 + 0.3,
                color: Math.random() < 0.1 ? '#ff6' : '#fff'
            });
        }
        
        return stars;
    }

    /**
     * Show sector discovery modal
     */
    showSectorDiscovery(sectorType, sectorName, sector) {
        const modal = document.getElementById('sectorModal');
        if (!modal) {
            console.error('Sector modal not found!');
            return;
        }

        console.log(`Showing sector discovery modal for ${sectorName} (${sectorType.name} Sector)`);

        // Calculate distance from origin
        const distance = Math.sqrt(sector.x * sector.x + sector.y * sector.y).toFixed(1);

        // Build comprehensive "Sector Survey Report" HTML
        let surveyHTML = `
            <h2 style="color: #ff0; text-align: center; margin-bottom: 5px;">SECTOR SURVEY: ${sectorName}</h2>
            <p style="color: #aaa; text-align: center; margin-bottom: 20px;">${sectorType.name} Sector &middot; ${distance} sectors from HQ</p>

            <p style="color: #0f0; font-weight: bold; margin-bottom: 15px; text-align: center;">+1 Research Point Awarded</p>

            <div style="border-top: 1px solid #444; padding-top: 15px; margin-bottom: 15px;">
                <p style="color: #888; text-align: center; margin-bottom: 8px; font-size: 12px; letter-spacing: 2px;">── SIGNAL ENVIRONMENT ──</p>
                ${this.buildExclusiveSignalSection(sectorType)}
            </div>

            <div style="border-top: 1px solid #444; padding-top: 15px; margin-bottom: 15px;">
                ${this.buildResourceProfileSection(sector)}
            </div>

            <div style="border-top: 1px solid #444; padding-top: 15px; margin-bottom: 15px;">
                <p style="color: #888; margin-bottom: 8px; font-weight: bold;">Exploration Bonuses:</p>
                <p style="line-height: 1.8;">
                    Minerals: x${sectorType.mineralBonus} &middot;
                    Data: x${sectorType.dataBonus} &middot;
                    Artifacts: x${sectorType.artifactBonus}
                </p>
            </div>

            <div style="border-top: 1px solid #444; padding-top: 15px; margin-bottom: 15px;">
                ${this.buildDiscoveryLogSection()}
            </div>
        `;

        // Add hazard warning if applicable
        if (sectorType.probeDestructionChance > 0) {
            surveyHTML += `
                <p style="color: #ff6b35; font-weight: bold; text-align: center; margin-top: 10px;">
                    WARNING: ${Math.floor(sectorType.probeDestructionChance * 100)}% probe destruction risk!
                </p>
            `;
        }

        // Inject content into modal
        const modalContent = document.getElementById('sectorModalContent');
        if (modalContent) {
            // Find or create wrapper div for survey content
            let surveyDiv = document.getElementById('sectorSurveyContent');
            if (!surveyDiv) {
                surveyDiv = document.createElement('div');
                surveyDiv.id = 'sectorSurveyContent';
                // Insert before the button
                const okBtn = document.getElementById('sectorOkBtn');
                modalContent.insertBefore(surveyDiv, okBtn);
            }
            surveyDiv.innerHTML = surveyHTML;
        }

        modal.classList.add('active');
        console.log('Modal should now be visible with class "active"');

        // Add click handler for Continue button
        const okBtn = document.getElementById('sectorOkBtn');
        if (okBtn) {
            // Remove any existing listeners to prevent duplicates
            const newOkBtn = okBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newOkBtn, okBtn);

            // Add new click listener
            newOkBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                console.log('Sector discovery modal closed by user');
            });
        }
    }

    /**
     * Build exclusive signal section for sector survey
     */
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
                color: '#ee82ee',
                description: 'Volatile crystalline deposits unique to Asteroid Fields',
                yields: 'Yields: Exotic Minerals or Mixed Resources'
            }
        };

        const exclusiveType = sectorType.exclusiveSignalType;

        if (!exclusiveType) {
            // Standard sector - "Open Frequency" messaging (DISC-04)
            return `
                <p style="text-align: center; margin-bottom: 8px; font-size: 18px;">
                    🌐 <span style="color: #0ff; font-weight: bold;">Open Frequency</span>
                </p>
                <p style="color: #aaa; text-align: center; line-height: 1.6; font-size: 14px; font-style: italic;">
                    "All signal types can be detected here &mdash;<br>
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

    /**
     * Build resource profile section for sector survey
     */
    buildResourceProfileSection(sector) {
        if (!sector || !sector.resourceProfile) {
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

        // Signal richness: map spawnRateMultiplier to 5-segment bar
        // 0.8x = 4 segments, 1.0x = 5 segments, 1.5x = 5 (capped)
        const richnessSegments = Math.min(5, Math.max(1, Math.ceil(profile.spawnRateMultiplier * 5)));
        const richnessBar = '█'.repeat(richnessSegments) + '░'.repeat(5 - richnessSegments);

        // Probethium potential: map profile type to bar and label
        let probSegments = 0;
        let probLabel = 'None';
        if (profile.type === 'probethium-rich') {
            probSegments = 5;
            probLabel = 'Rich';
        } else if (profile.type === 'balanced') {
            probSegments = 1;
            probLabel = 'Low';
        }
        const probBar = '█'.repeat(probSegments) + '░'.repeat(5 - probSegments);

        return `
            <p style="color: #888; margin-bottom: 8px; font-weight: bold;">Resource Profile:</p>
            <p style="margin-bottom: 5px;">
                <strong>${profileNames[profile.type] || 'Unknown'}</strong>
            </p>
            <p style="line-height: 1.8; font-family: monospace;">
                Signal Richness: <span style="color: #0ff; letter-spacing: 2px;">${richnessBar}</span>
                <span style="margin-left: 8px;">${profile.spawnRateMultiplier}x</span>
            </p>
            <p style="line-height: 1.8; font-family: monospace;">
                Probethium Potential: <span style="color: #ffd700; letter-spacing: 2px;">${probBar}</span>
                <span style="margin-left: 8px;">${probLabel}</span>
            </p>
        `;
    }

    /**
     * Build discovery log section for sector survey
     */
    buildDiscoveryLogSection() {
        const world = this.gameState.getWorld();

        let exploredCount = 0;
        const foundTypes = new Set();

        world.sectors.forEach(sector => {
            if (sector.explored) {
                exploredCount++;
                foundTypes.add(sector.type.name);
            }
        });

        const sectorTypes = [
            { name: 'Standard', color: '#66f' },
            { name: 'Resource-Rich', color: '#fc8' },
            { name: 'Data Haven', color: '#6f6' },
            { name: 'Ancient', color: '#f6f' },
            { name: 'Asteroid Field', color: '#f66' }
        ];

        const pipsHtml = sectorTypes.map(type => {
            const found = foundTypes.has(type.name);
            return `<div style="
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: ${found ? type.color : '#444'};
                opacity: ${found ? '1' : '0.3'};
                display: inline-block;
                margin: 0 3px;
                vertical-align: middle;
                box-shadow: ${found ? `0 0 6px ${type.color}` : 'none'};
            " title="${type.name}${found ? ' (found)' : ''}"></div>`;
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

    /**
     * Snap camera to a sector
     */
    snapToSector(sectorX, sectorY) {
        const world = this.gameState.getWorld();
        
        // Center the view on the clicked sector
        const sectorCenterX = sectorX * world.standardSectorWidth + world.standardSectorWidth / 2;
        const sectorCenterY = sectorY * world.standardSectorHeight + world.standardSectorHeight / 2;
        
        world.viewOffset.x = sectorCenterX - window.innerWidth / 2;
        world.viewOffset.y = sectorCenterY - (window.innerHeight - 100) / 2;
        
        // Apply bounds to ensure we don't go outside the valid viewing area
        this.constrainViewOffset();
    }

    /**
     * Constrain view offset to explored areas
     */
    constrainViewOffset() {
        const world = this.gameState.getWorld();
        
        // Find bounds of all explored sectors
        let minX = 0, maxX = 0, minY = 0, maxY = 0;
        let hasExplored = false;
        
        world.sectors.forEach(sector => {
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
        
        if (!hasExplored) return;
        
        const padding = 0.3;
        const worldMinX = (minX - padding) * world.standardSectorWidth;
        const worldMaxX = (maxX + 1 + padding) * world.standardSectorWidth;
        const worldMinY = (minY - padding) * world.standardSectorHeight;
        const worldMaxY = (maxY + 1 + padding) * world.standardSectorHeight;
        
        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight - 100;
        
        const minOffsetX = worldMinX - canvasWidth / 2;
        const maxOffsetX = worldMaxX - canvasWidth / 2;
        const minOffsetY = worldMinY - canvasHeight / 2;
        const maxOffsetY = worldMaxY - canvasHeight / 2;
        
        world.viewOffset.x = Math.max(minOffsetX, Math.min(maxOffsetX, world.viewOffset.x));
        world.viewOffset.y = Math.max(minOffsetY, Math.min(maxOffsetY, world.viewOffset.y));
    }

    /**
     * Render minimap
     */
    renderMinimap() {
        if (!this.minimapCtx) return;
        
        const ctx = this.minimapCtx;
        const width = this.minimapCanvas.width;
        const height = this.minimapCanvas.height;
        const world = this.gameState.getWorld();
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.fillStyle = window.PALETTE ? window.PALETTE.VOID : '#07060B';
        ctx.fillRect(0, 0, width, height);
        
        const scale = 50;
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Get current viewing sector
        const viewCenterX = world.viewOffset.x + window.innerWidth / 2;
        const viewCenterY = world.viewOffset.y + (window.innerHeight - 100) / 2;
        const currentSectorX = Math.floor(viewCenterX / world.standardSectorWidth);
        const currentSectorY = Math.floor(viewCenterY / world.standardSectorHeight);
        
        // Draw 5x5 grid centered on current sector
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const sectorX = currentSectorX + dx;
                const sectorY = currentSectorY + dy;
                const key = `${sectorX},${sectorY}`;
                
                const x = centerX + dx * scale;
                const y = centerY + dy * scale;
                
                // Draw grid lines
                ctx.strokeStyle = 'rgba(139, 132, 163, 0.2)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.rect(x - scale/2, y - scale/2, scale, scale);
                ctx.stroke();

                // Highlight current sector — gold hairline
                if (dx === 0 && dy === 0) {
                    ctx.strokeStyle = window.PALETTE ? window.PALETTE.FIRE : '#D4AF37';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.rect(x - scale/2, y - scale/2, scale, scale);
                    ctx.stroke();
                }
                
                const sector = world.sectors.get(key);
                if (sector) {
                    // Ensure sector has required arrays (backward compatibility)
                    if (!sector.outposts) sector.outposts = [];
                    if (!sector.facilities) sector.facilities = [];
                    if (!sector.hubs) sector.hubs = [];
                    
                    if (sector.explored) {
                        // Fill with sector type color
                        ctx.fillStyle = sector.type.color;
                        ctx.fillRect(x - scale/2 + 1, y - scale/2 + 1, scale - 2, scale - 2);
                        
                        // Draw sector name
                        ctx.save();
                        ctx.font = "8px 'IBM Plex Mono', monospace";
                        ctx.fillStyle = 'rgba(232, 228, 240, 0.85)';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        const nameParts = sector.name.split(' ');
                        ctx.fillText(nameParts[0], x, y - 5);
                        if (nameParts[1]) {
                            ctx.fillText(nameParts[1], x, y + 5);
                        }
                        ctx.restore();
                        
                        // Draw outpost indicators — built = gold
                        if (sector.outposts && sector.outposts.length > 0) {
                            ctx.fillStyle = window.PALETTE ? window.PALETTE.FIRE : '#D4AF37';
                            ctx.beginPath();
                            ctx.arc(x, y + 15, 2, 0, Math.PI * 2);
                            ctx.fill();
                        }

                        // Draw hub indicators — built = gold, brighter
                        if (sector.hubs && sector.hubs.length > 0) {
                            ctx.fillStyle = window.PALETTE ? window.PALETTE.FIRE_BRIGHT : '#FFD700';
                            ctx.beginPath();
                            ctx.arc(x, y - 15, 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    } else {
                        // Unexplored but initialized
                        ctx.fillStyle = 'rgba(26, 16, 48, 0.5)';
                        ctx.fillRect(x - scale/2 + 1, y - scale/2 + 1, scale - 2, scale - 2);
                    }
                }
            }
        }
    }

    /**
     * Check if sector is adjacent to explored sector
     */
    isAdjacentToExplored(x, y) {
        const world = this.gameState.getWorld();
        const adjacentOffsets = [
            [-1, -1], [0, -1], [1, -1],
            [-1,  0],          [1,  0],
            [-1,  1], [0,  1], [1,  1]
        ];
        
        return adjacentOffsets.some(([dx, dy]) => {
            const key = `${x + dx},${y + dy}`;
            const sector = world.sectors.get(key);
            return sector && sector.explored;
        });
    }

    /**
     * Spawn discovery bonus signals when a new sector is discovered
     */
    spawnDiscoveryBonusSignals(sectorX, sectorY, sectorType) {
        const world = this.gameState.getWorld();
        const sectorCenterX = sectorX * world.standardSectorWidth + world.standardSectorWidth / 2;
        const sectorCenterY = sectorY * world.standardSectorHeight + world.standardSectorHeight / 2;
        
        // Determine bonus signals based on sector type
        let bonusSignals = [];
        
        switch (sectorType.name) {
            case 'Standard':
                // 1 guaranteed uncommon signal
                bonusSignals.push({ rarity: 'uncommon', type: 'mixed' });
                break;
                
            case 'Resource-Rich':
                // 1 rare mineral signal + 1 uncommon mixed
                bonusSignals.push({ rarity: 'rare', type: 'mineral' });
                bonusSignals.push({ rarity: 'uncommon', type: 'mixed' });
                break;
                
            case 'Data Haven':
                // 1 rare data signal + 1 uncommon data
                bonusSignals.push({ rarity: 'rare', type: 'data' });
                bonusSignals.push({ rarity: 'uncommon', type: 'data' });
                break;
                
            case 'Ancient':
                // 1 epic artifact signal + 1 rare mixed
                bonusSignals.push({ rarity: 'epic', type: 'artifact' });
                bonusSignals.push({ rarity: 'rare', type: 'mixed' });
                break;
                
            case 'Asteroid Field':
                // 1 legendary mixed + 1 epic mixed (high risk, high reward)
                bonusSignals.push({ rarity: 'legendary', type: 'mixed' });
                bonusSignals.push({ rarity: 'epic', type: 'mixed' });
                break;
        }

        // DISC-03: Add guaranteed epic/legendary exclusive signal for non-Standard sectors
        if (sectorType.exclusiveSignalType) {
            const rarity = Math.random() < 0.8 ? 'epic' : 'legendary';
            bonusSignals.push({
                rarity: rarity,
                type: sectorType.exclusiveSignalType
            });
        }

        // Spawn the bonus signals
        bonusSignals.forEach((signalInfo, index) => {
            // Spread signals around the sector center
            const angle = (Math.PI * 2 * index) / bonusSignals.length;
            const distance = 100 + Math.random() * 200; // 100-300 pixels from center
            
            const signalX = sectorCenterX + Math.cos(angle) * distance;
            const signalY = sectorCenterY + Math.sin(angle) * distance;
            
            const signal = {
                x: signalX,
                y: signalY,
                radius: 8 + Math.random() * 4,
                rarity: signalInfo.rarity,
                signalType: signalInfo.type, // New property for themed signals
                duration: 4000 + Math.random() * 2000, // Longer duration for discovery bonuses
                createdAt: Date.now(),
                isDiscoveryBonus: true // Mark as special discovery signal
            };
            
            this.gameState.entities.signals.push(signal);
        });
        
        console.log(`Spawned ${bonusSignals.length} discovery bonus signals in ${sectorType.name} sector [${sectorX}, ${sectorY}]`);
        
        // Show discovery bonus message
        const bonusMessage = this.getDiscoveryBonusMessage(sectorType.name, bonusSignals.length);
        this.eventBus.emit('ui:message', { 
            text: bonusMessage, 
            type: 'discovery',
            duration: 4000
        });
    }

    /**
     * Get discovery bonus message for sector type
     */
    getDiscoveryBonusMessage(sectorTypeName, signalCount) {
        const messages = {
            'Standard': '🔍 Sector analyzed! Detected energy signatures.',
            'Resource-Rich': '⛏️ Rich deposits detected! Mineral veins located.',
            'Data Haven': '📡 Data streams identified! Information caches found.',
            'Ancient': '🏛️ Ancient technology detected! Artifact sites located.',
            'Asteroid Field': '💎 Volatile deposits found! High-value signals detected.'
        };
        
        return messages[sectorTypeName] || `${signalCount} discovery signals detected!`;
    }
}

// Export for use in other modules
window.SectorManager = SectorManager;