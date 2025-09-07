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
                
                // Award research point for sector discovery
                const research = this.gameState.getResearchSystem();
                research.points += 1;
                console.log(`Research point awarded for discovering ${sector.name}! Total points: ${research.points}`);
                
                // Update Probethium stats
                this.gameState.updateProbethiumStats('sector_discovered');
                
                // Emit event to trigger research unlock check
                this.eventBus.emit('research:pointAwarded', { source: 'sector_discovery' });
                
                this.showSectorDiscovery(sector.type, sector.name);
                
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
                color: 'rgba(100, 100, 255, 0.3)', 
                borderColor: '#66f',
                mineralBonus: 1.0, 
                dataBonus: 1.0, 
                artifactBonus: 1.0,
                probeDestructionChance: 0
            },
            { 
                name: 'Resource-Rich', 
                color: 'rgba(255, 200, 100, 0.3)', 
                borderColor: '#fc8',
                mineralBonus: 2.0, 
                dataBonus: 1.5, 
                artifactBonus: 1.2,
                probeDestructionChance: 0
            },
            { 
                name: 'Data Haven', 
                color: 'rgba(100, 255, 100, 0.3)', 
                borderColor: '#6f6',
                mineralBonus: 0.8, 
                dataBonus: 3.0, 
                artifactBonus: 1.5,
                probeDestructionChance: 0
            },
            { 
                name: 'Ancient', 
                color: 'rgba(255, 100, 255, 0.3)', 
                borderColor: '#f6f',
                mineralBonus: 1.2, 
                dataBonus: 1.8, 
                artifactBonus: 4.0,
                probeDestructionChance: 0
            },
            { 
                name: 'Asteroid Field', 
                color: 'rgba(255, 100, 100, 0.3)', 
                borderColor: '#f66',
                mineralBonus: 3.0, 
                dataBonus: 0.5, 
                artifactBonus: 0.8,
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
        
        // Generate sector name
        const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega'];
        const suffixes = ['Sector', 'Zone', 'Region', 'Quadrant', 'Expanse', 'Domain', 'Territory'];
        
        const name = prefixes[Math.floor(Math.random() * prefixes.length)] + ' ' + 
                    suffixes[Math.floor(Math.random() * suffixes.length)];
        
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
        
        world.sectors.set(`${x},${y}`, sector);
        
        if (discovered) {
            // Award research point for sector discovery
            const research = this.gameState.getResearchSystem();
            research.points += 1;
            console.log(`Research point awarded for discovering new ${name}! Total points: ${research.points}`);
            
            // Emit event to trigger research unlock check
            this.eventBus.emit('research:pointAwarded', { source: 'sector_discovery' });
            
            this.showSectorDiscovery(selectedType, name);
        }
        
        return sector;
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
    showSectorDiscovery(sectorType, sectorName) {
        const modal = document.getElementById('sectorModal');
        if (!modal) {
            console.error('Sector modal not found!');
            return;
        }
        
        console.log(`Showing sector discovery modal for ${sectorName} (${sectorType.name} Sector)`);
        
        const sectorNameElement = document.getElementById('sectorName');
        const sectorTypeElement = document.getElementById('sectorType');
        const sectorBonusElement = document.getElementById('sectorBonus');
        
        if (sectorNameElement) sectorNameElement.textContent = sectorName;
        if (sectorTypeElement) sectorTypeElement.textContent = sectorType.name + ' Sector';
        
        let bonusHTML = `
            <p style="color: #0f0; font-weight: bold; margin-bottom: 10px;">🎯 +1 Research Point Awarded</p>
            <p>Resource Bonuses:</p>
            <p>Minerals: x${sectorType.mineralBonus}</p>
            <p>Data: x${sectorType.dataBonus}</p>
            <p>Artifacts: x${sectorType.artifactBonus}</p>
        `;
        
        if (sectorType.probeDestructionChance) {
            bonusHTML += `<p style="color: #ff6b35;">⚠ WARNING: ${Math.floor(sectorType.probeDestructionChance * 100)}% probe destruction risk!</p>`;
        }
        
        if (sectorBonusElement) sectorBonusElement.innerHTML = bonusHTML;
        
        modal.classList.add('active');
        console.log('Modal should now be visible with class "active"');
        
        // Add click handler for OK button
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
        
        ctx.fillStyle = '#111';
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
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.rect(x - scale/2, y - scale/2, scale, scale);
                ctx.stroke();
                
                // Highlight current sector
                if (dx === 0 && dy === 0) {
                    ctx.strokeStyle = '#0ff';
                    ctx.lineWidth = 3;
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
                        
                        // Draw outpost indicators
                        if (sector.outposts && sector.outposts.length > 0) {
                            ctx.fillStyle = '#ff0';
                            ctx.beginPath();
                            ctx.arc(x, y + 15, 3, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        
                        // Draw hub indicators
                        if (sector.hubs && sector.hubs.length > 0) {
                            ctx.fillStyle = '#0ff';
                            ctx.beginPath();
                            ctx.arc(x, y - 15, 3, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    } else {
                        // Unexplored but initialized
                        ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
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
}

// Export for use in other modules
window.SectorManager = SectorManager;