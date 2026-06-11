/**
 * Offline Progression Manager
 * Calculates and applies resources gained while the player was away
 */
class OfflineManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        
        // Offline progression configuration
        this.config = {
            maxOfflineHours: 24, // Maximum hours of offline progression
            probeEfficiencyReduction: 0.3, // 30% efficiency while offline
            miningStructureEfficiency: 1.0, // Full efficiency for mining structures
            probethiumOfflineRate: 0.1, // 10% of normal Probethium rate
        };
    }

    /**
     * Calculate and apply offline progression
     */
    async processOfflineProgress(lastSaveTime) {
        const currentTime = Date.now();
        const offlineTimeMs = currentTime - lastSaveTime;
        const offlineHours = offlineTimeMs / (1000 * 60 * 60);
        
        // Only process if offline for more than 30 seconds
        if (offlineTimeMs < 30000) {
            console.log('Short offline period, skipping offline progression');
            return null;
        }
        
        // Cap offline progression to maximum hours
        const cappedOfflineHours = Math.min(offlineHours, this.config.maxOfflineHours);
        const cappedOfflineMs = cappedOfflineHours * 60 * 60 * 1000;
        
        console.log(`Processing offline progression: ${cappedOfflineHours.toFixed(1)} hours`);
        
        const offlineResults = {
            timeOffline: cappedOfflineMs,
            timeOfflineFormatted: this.formatTime(cappedOfflineMs),
            resources: {
                minerals: 0,
                data: 0,
                artifacts: 0,
                exoticMinerals: 0
            },
            probethium: 0,
            probesWorked: 0,
            structuresWorked: 0,
            details: []
        };
        
        // Calculate passive mining structure generation
        await this.calculatePassiveMining(cappedOfflineMs, offlineResults);
        
        // Calculate probe-based offline progression
        await this.calculateProbeProgression(cappedOfflineMs, offlineResults);
        
        // Calculate offline Probethium accumulation
        await this.calculateOfflineProbethium(cappedOfflineMs, offlineResults);
        
        // Apply the calculated resources
        this.applyOfflineResults(offlineResults);
        
        return offlineResults;
    }

    /**
     * Calculate passive mining structure generation while offline
     */
    async calculatePassiveMining(offlineTimeMs, results) {
        const structures = [
            ...this.gameState.entities.miningOutposts,
            ...this.gameState.entities.miningFacilities
        ];
        
        let structureCount = 0;
        structures.forEach(structure => {
            if (structure.generationRate && structure.generationRate > 0) {
                const totalGenerated = (structure.generationRate * offlineTimeMs) / 1000;
                results.resources.exoticMinerals += totalGenerated;
                structureCount++;
            }
        });
        
        if (structureCount > 0) {
            results.structuresWorked = structureCount;
            results.details.push(
                `${structureCount} mining structures worked continuously, generating ${results.resources.exoticMinerals.toFixed(1)} Exotic Minerals`
            );
        }
    }

    /**
     * Calculate probe-based offline progression
     */
    async calculateProbeProgression(offlineTimeMs, results) {
        const activeProbes = this.gameState.entities.probes.filter(probe => 
            probe.active && probe.status === 'exploring' && probe.waypoints && probe.waypoints.length > 0
        );
        
        if (activeProbes.length === 0) return;
        
        // Calculate average resources per hour based on current probe activity
        const baseResourcesPerHour = this.estimateProbeResourceRate();
        const offlineHours = offlineTimeMs / (1000 * 60 * 60);
        
        // Apply offline efficiency reduction
        const offlineResourcesPerHour = {
            minerals: baseResourcesPerHour.minerals * this.config.probeEfficiencyReduction,
            data: baseResourcesPerHour.data * this.config.probeEfficiencyReduction,
            artifacts: baseResourcesPerHour.artifacts * this.config.probeEfficiencyReduction,
            exoticMinerals: baseResourcesPerHour.exoticMinerals * this.config.probeEfficiencyReduction
        };
        
        // Calculate total offline resources from probes
        Object.keys(offlineResourcesPerHour).forEach(resourceType => {
            const generated = offlineResourcesPerHour[resourceType] * offlineHours;
            results.resources[resourceType] += generated;
        });
        
        results.probesWorked = activeProbes.length;
        results.details.push(
            `${activeProbes.length} probes worked at ${(this.config.probeEfficiencyReduction * 100)}% efficiency`
        );
        
        // Add some randomization for more interesting offline results
        this.addRandomOfflineEvents(offlineHours, results);
    }

    /**
     * Estimate hourly resource generation rate from current probe activity
     */
    estimateProbeResourceRate() {
        // Base estimates for probe resource gathering (per hour)
        // These are conservative estimates based on typical signal collection
        return {
            minerals: 50,    // ~1 signal per minute with 5 minerals average
            data: 20,        // ~1 signal per minute with 2 data average  
            artifacts: 10,   // ~1 signal per minute with 1 artifact average
            exoticMinerals: 5 // Bonus from rare signals
        };
    }

    /**
     * Add random offline events for variety
     */
    addRandomOfflineEvents(offlineHours, results) {
        const events = [];
        
        // Lucky discovery events (rare)
        if (Math.random() < 0.1 && offlineHours > 1) {
            const bonusMinerals = Math.floor(Math.random() * 100) + 50;
            results.resources.minerals += bonusMinerals;
            events.push(`Lucky discovery: +${bonusMinerals} bonus minerals`);
        }
        
        // Data cache found
        if (Math.random() < 0.15 && offlineHours > 2) {
            const bonusData = Math.floor(Math.random() * 50) + 25;
            results.resources.data += bonusData;
            events.push(`Data cache discovered: +${bonusData} data`);
        }
        
        // Ancient artifact uncovered
        if (Math.random() < 0.05 && offlineHours > 4) {
            const bonusArtifacts = Math.floor(Math.random() * 10) + 5;
            results.resources.artifacts += bonusArtifacts;
            events.push(`Ancient site explored: +${bonusArtifacts} artifacts`);
        }
        
        if (events.length > 0) {
            results.details.push(`Bonus events: ${events.join(', ')}`);
        }
    }

    /**
     * Calculate offline Probethium accumulation
     */
    async calculateOfflineProbethium(offlineTimeMs, results) {
        // ECONOMY.md: offline Probethium comes from mining stations in
        // probethium-rich sectors, limited by the supplies they were left with.
        const miningManager = this.gameState.miningManager || window.game?.miningManager;
        const stations = this.gameState.mining?.stations || [];
        results.probethium = 0;
        if (!stations.length || !miningManager) return;

        const stationTypes = miningManager.getStationTypes();
        let total = 0;

        stations.forEach(station => {
            if (!station.active) return;
            if (miningManager.getStationOutputResource(station) !== 'probethium') return;
            const type = stationTypes[station.type];
            if (!type || !type.probethiumOutput) return;

            const timeCycles = offlineTimeMs / type.operationDuration;
            // Each cycle consumes the station's full requirements — production
            // stops when the inventory it was left with runs out
            let supplyCycles = Infinity;
            Object.entries(type.requirements).forEach(([resource, amt]) => {
                if (amt > 0) {
                    const inv = station.stationInventory?.[resource] || 0;
                    supplyCycles = Math.min(supplyCycles, inv / amt);
                }
            });

            const cycles = Math.min(timeCycles, supplyCycles);
            if (!isFinite(cycles) || cycles <= 0) return;

            total += type.probethiumOutput * (station.level || 1) * cycles;

            // Consume the simulated supplies
            Object.entries(type.requirements).forEach(([resource, amt]) => {
                if (station.stationInventory && station.stationInventory[resource] !== undefined) {
                    station.stationInventory[resource] = Math.max(0, station.stationInventory[resource] - amt * cycles);
                }
            });
        });

        results.probethium = total;
        if (total > 0.05) {
            results.details.push(`Mining stations produced +${total.toFixed(1)} Probethium`);
        }
    }

    /**
     * Apply offline results to game state
     */
    applyOfflineResults(results) {
        // Apply resource gains
        const currentResources = this.gameState.getResources();
        const newResources = { ...currentResources };
        
        Object.keys(results.resources).forEach(resourceType => {
            if (results.resources[resourceType] > 0) {
                newResources[resourceType] += Math.floor(results.resources[resourceType]);
            }
        });
        
        this.gameState.updateResources(newResources, this.eventBus);
        
        // Apply Probethium gains
        if (results.probethium > 0) {
            this.gameState.probethium.current += results.probethium;
            this.gameState.probethium.totalAccumulated += results.probethium;
        }
        
        // Update last offline processing time
        this.gameState.lastOfflineProcessTime = Date.now();
        
        console.log('Offline progression applied:', results);
    }

    /**
     * Format time for display
     */
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Show offline progress summary modal
     */
    showOfflineProgressSummary(offlineResults) {
        const modal = document.getElementById('offlineProgressModal');
        if (!modal) {
            this.createOfflineProgressModal();
        }
        
        this.populateOfflineProgressModal(offlineResults);
        document.getElementById('offlineProgressModal').classList.add('active');
    }

    /**
     * Create offline progress modal HTML
     */
    createOfflineProgressModal() {
        const modalHTML = `
            <div id="offlineProgressModal" class="modal">
                <div class="modal-content" style="max-width: 600px;">
                    <h2 style="color: #0ff; margin-bottom: 20px; text-align: center;">⏰ Welcome Back!</h2>
                    
                    <div style="background: rgba(0,255,255,0.1); border: 1px solid rgba(0,255,255,0.3); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <div style="color: #0ff; font-size: 18px; margin-bottom: 10px;">
                            You were away for: <span id="offlineTimeDisplay" style="color: #ff0; font-weight: bold;"></span>
                        </div>
                        <div style="color: #aaa; font-size: 14px;">
                            Your cosmic empire continued working while you were gone!
                        </div>
                    </div>
                    
                    <div id="offlineResourceGains" style="margin-bottom: 20px;">
                        <!-- Resource gains will be populated here -->
                    </div>
                    
                    <div id="offlineDetails" style="background: rgba(0,0,0,0.3); border-radius: 5px; padding: 15px; margin-bottom: 20px; max-height: 200px; overflow-y: auto;">
                        <!-- Details will be populated here -->
                    </div>
                    
                    <div style="text-align: center;">
                        <button id="collectOfflineRewards" class="control-btn" style="font-size: 16px; padding: 12px 24px;">
                            🚀 Continue Exploring
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add close event listener
        document.getElementById('collectOfflineRewards').addEventListener('click', () => {
            document.getElementById('offlineProgressModal').classList.remove('active');
        });
    }

    /**
     * Populate offline progress modal with results
     */
    populateOfflineProgressModal(results) {
        // Set time display
        document.getElementById('offlineTimeDisplay').textContent = results.timeOfflineFormatted;
        
        // Populate resource gains
        const resourceGainsElement = document.getElementById('offlineResourceGains');
        let resourceHTML = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">';
        
        const resourceIcons = {
            minerals: '⛏️',
            data: '📊', 
            artifacts: '🏺',
            exoticMinerals: '💎'
        };
        
        const resourceNames = {
            minerals: 'Minerals',
            data: 'Data',
            artifacts: 'Artifacts', 
            exoticMinerals: 'Exotic Minerals'
        };
        
        Object.keys(results.resources).forEach(resourceType => {
            const amount = Math.floor(results.resources[resourceType]);
            if (amount > 0) {
                resourceHTML += `
                    <div style="background: rgba(0,255,0,0.1); border: 1px solid rgba(0,255,0,0.3); border-radius: 5px; padding: 10px; text-align: center;">
                        <div style="font-size: 24px; margin-bottom: 5px;">${resourceIcons[resourceType]}</div>
                        <div style="color: #0f0; font-size: 16px; font-weight: bold;">+${amount}</div>
                        <div style="color: #aaa; font-size: 12px;">${resourceNames[resourceType]}</div>
                    </div>
                `;
            }
        });
        
        // Add Probethium if gained
        if (results.probethium > 0.05) {
            resourceHTML += `
                <div style="background: rgba(201,255,201,0.1); border: 1px solid rgba(201,255,201,0.3); border-radius: 5px; padding: 10px; text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 5px;">🎯</div>
                    <div style="color: #c9f; font-size: 16px; font-weight: bold;">+${results.probethium.toFixed(1)}</div>
                    <div style="color: #aaa; font-size: 12px;">Probethium</div>
                </div>
            `;
        }
        
        resourceHTML += '</div>';
        resourceGainsElement.innerHTML = resourceHTML;
        
        // Populate details
        const detailsElement = document.getElementById('offlineDetails');
        let detailsHTML = '<div style="color: #0ff; font-size: 14px; margin-bottom: 10px;">Activity Summary:</div>';
        
        results.details.forEach(detail => {
            detailsHTML += `<div style="color: #aaa; font-size: 12px; margin-bottom: 5px; padding-left: 15px;">• ${detail}</div>`;
        });
        
        if (results.details.length === 0) {
            detailsHTML += '<div style="color: #666; font-size: 12px; text-align: center;">No significant activity while away</div>';
        }
        
        detailsElement.innerHTML = detailsHTML;
    }
}

// Export for use in other modules
window.OfflineManager = OfflineManager;