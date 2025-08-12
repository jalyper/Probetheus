/**
 * Research Management System
 * Handles research tree rendering, node interactions, and unlocking
 */
class ResearchManager {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;
        
        // Listen for relevant events
        this.eventBus.on('research:showTree', this.renderResearchTree.bind(this));
    }

    /**
     * Render the research tree
     */
    renderResearchTree() {
        const treeContainer = document.getElementById('researchTree');
        if (!treeContainer) return;
        
        treeContainer.innerHTML = '';
        
        const research = this.gameState.getResearchSystem();
        
        // Update research points display
        const researchPointsElement = document.getElementById('researchPoints');
        if (researchPointsElement) {
            researchPointsElement.textContent = research.points;
        }
        
        console.log('Rendering research tree. Unlocked trees:', research.unlockedTrees);
        console.log('Research unlocked status:', research.unlocked);
        
        // If research isn't unlocked yet, don't show any nodes
        if (!research.unlocked) {
            console.log('Research not unlocked yet, showing no nodes');
            return;
        }
        
        // Filter nodes to only show unlocked trees
        const visibleNodes = Object.values(research.tree).filter(node => {
            // Always show nodes from unlocked trees
            if (research.unlockedTrees.includes(node.tree)) {
                return true;
            }
            return false;
        });
        
        console.log(`Showing ${visibleNodes.length} nodes from trees:`, [...new Set(visibleNodes.map(n => n.tree))]);
        
        // Add dividers between tech trees
        this.drawTreeDividers(treeContainer);
        
        // Draw connection lines first (only for visible nodes)
        visibleNodes.forEach(node => {
            if (node.children) {
                node.children.forEach(childId => {
                    const childNode = research.tree[childId];
                    if (childNode && research.unlockedTrees.includes(childNode.tree)) {
                        this.drawResearchConnection(treeContainer, node, childNode);
                    }
                });
            }
        });
        
        // Draw nodes on top of lines (only visible nodes)
        visibleNodes.forEach(node => {
            this.createResearchNode(treeContainer, node);
        });
        
        // Ensure container has proper height for scrolling
        this.ensureScrollableHeight(treeContainer, visibleNodes);
    }

    /**
     * Draw dividers between tech trees
     */
    drawTreeDividers(container) {
        // Calculate divider positions based on actual node positions
        // Collection tree: highest node at y:20, lowest at y:200 (+ 80px height + 5px margin = 285px bottom)
        // Probe tree: highest node at y:290, lowest at y:470 (+ 80px height + 5px margin = 555px bottom)
        // Alien tree: highest node at y:560, lowest at y:740
        
        // Divider between Collection and Probe trees (after collection tree ends)
        const divider1 = document.createElement('div');
        divider1.style.cssText = `
            position: absolute;
            left: 0;
            top: 250px;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, #0ff 20%, #0ff 80%, transparent 100%);
            opacity: 0.3;
            z-index: 10;
        `;
        container.appendChild(divider1);

        // Tree label for Collection
        const collectionLabel = document.createElement('div');
        collectionLabel.style.cssText = `
            position: absolute;
            left: 10px;
            top: 5px;
            color: #0ff;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 0 0 10px #0ff;
            z-index: 50;
        `;
        collectionLabel.textContent = '📦 COLLECTION SPECIALIZATION';
        container.appendChild(collectionLabel);

        // Divider between Probe and Alien trees (after probe tree ends)
        const divider2 = document.createElement('div');
        divider2.style.cssText = `
            position: absolute;
            left: 0;
            top: 520px;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, #4f4 20%, #4f4 80%, transparent 100%);
            opacity: 0.3;
            z-index: 10;
        `;
        container.appendChild(divider2);

        // Tree label for Probe Technology
        const probeLabel = document.createElement('div');
        probeLabel.style.cssText = `
            position: absolute;
            left: 10px;
            top: 260px;
            color: #4f4;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 0 0 10px #4f4;
            z-index: 50;
        `;
        probeLabel.textContent = '🛸 PROBE TECHNOLOGY';
        container.appendChild(probeLabel);

        // Tree label for Alien Technology
        const alienLabel = document.createElement('div');
        alienLabel.style.cssText = `
            position: absolute;
            left: 10px;
            top: 530px;
            color: #f4f;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 0 0 10px #f4f;
            z-index: 50;
        `;
        alienLabel.textContent = '👽 ALIEN TECHNOLOGY';
        container.appendChild(alienLabel);
    }

    /**
     * Ensure container has proper height for scrolling
     */
    ensureScrollableHeight(container, visibleNodes) {
        // Find the lowest node position
        let maxY = 0;
        visibleNodes.forEach(node => {
            const nodeBottom = node.position.y + 80; // node height
            if (nodeBottom > maxY) {
                maxY = nodeBottom;
            }
        });
        
        // Add padding and set minimum content height
        const contentHeight = Math.max(maxY + 50, 850); // 50px bottom padding, minimum 850px
        
        // Create invisible spacer element to ensure scroll area
        const spacer = document.createElement('div');
        spacer.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: 1px;
            height: ${contentHeight}px;
            pointer-events: none;
            opacity: 0;
            z-index: 1;
        `;
        container.appendChild(spacer);
        
        console.log(`Research tree content height set to: ${contentHeight}px`);
    }

    /**
     * Draw connection line between research nodes
     */
    drawResearchConnection(container, fromNode, toNode) {
        const line = document.createElement('div');
        line.style.position = 'absolute';
        line.style.height = '2px';
        line.style.background = fromNode.researched && toNode.available ? '#0ff' : '#444';
        line.style.left = `${fromNode.position.x + 40}px`; // 40 = half node width
        line.style.top = `${fromNode.position.y + 40}px`; // 40 = half node height
        line.style.width = `${toNode.position.x - fromNode.position.x - 80}px`;
        line.style.transformOrigin = 'left center';
        line.style.zIndex = '30';
        line.style.pointerEvents = 'none'; // Don't interfere with clicks
        
        container.appendChild(line);
    }

    /**
     * Create a research node element
     */
    createResearchNode(container, node) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'research-node';
        nodeDiv.style.cssText = `
            position: absolute;
            left: ${node.position.x}px;
            top: ${node.position.y}px;
            width: 80px;
            height: 80px;
            border: 2px solid ${node.researched ? '#0f0' : node.available ? '#0ff' : '#666'};
            border-radius: 10px;
            background: ${node.researched ? 'rgba(0,255,0,0.1)' : node.available ? 'rgba(0,255,255,0.1)' : 'rgba(0,0,0,0.3)'};
            cursor: ${node.available ? 'pointer' : 'not-allowed'};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            box-shadow: ${node.researched ? '0 0 20px rgba(0,255,0,0.5)' : node.available ? '0 0 10px rgba(0,255,255,0.3)' : 'none'};
            margin: 5px;
            z-index: 100;
        `;
        
        nodeDiv.innerHTML = `
            <div style="font-size: 20px; margin-bottom: 2px;">${node.icon}</div>
            <div style="font-size: 9px; color: #fff; text-align: center; line-height: 1.1;">${node.name}</div>
            <div style="font-size: 8px; color: #888; margin-top: 2px;">${node.cost}RP</div>
        `;
        
        if (node.available) {
            nodeDiv.addEventListener('click', () => {
                this.showResearchDetails(node);
            });
            
            nodeDiv.addEventListener('mouseenter', () => {
                nodeDiv.style.transform = 'scale(1.05)';
            });
            
            nodeDiv.addEventListener('mouseleave', () => {
                nodeDiv.style.transform = 'scale(1)';
            });
        }
        
        container.appendChild(nodeDiv);
    }

    /**
     * Show research details and allow researching
     */
    showResearchDetails(node) {
        const infoDiv = document.getElementById('researchInfo');
        if (!infoDiv) return;
        
        const research = this.gameState.getResearchSystem();
        const canResearch = !node.researched && research.points >= node.cost;
        
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
        `;
        
        const researchBtn = document.getElementById('researchNodeBtn');
        if (researchBtn && canResearch) {
            researchBtn.addEventListener('click', () => {
                this.researchNode(node);
            });
        }
    }

    /**
     * Research a node
     */
    researchNode(node) {
        const research = this.gameState.getResearchSystem();
        
        if (node.researched || research.points < node.cost) return;
        
        // Spend research points
        research.points -= node.cost;
        
        // Mark as researched
        node.researched = true;
        research.researched.add(node.id);
        
        // Unlock children
        if (node.children) {
            node.children.forEach(childId => {
                const childNode = research.tree[childId];
                
                // Special case for auto_all: requires all three collection types
                if (childId === 'auto_all') {
                    const requiredParents = ['auto_minerals', 'auto_data', 'auto_artifacts'];
                    const allParentsResearched = requiredParents.every(parentId => 
                        research.researched.has(parentId)
                    );
                    childNode.available = allParentsResearched;
                } else {
                    childNode.available = true;
                }
            });
        }
        
        // Emit research completed event
        this.eventBus.emit('research:completed', { node });
        
        // Re-render tree and update UI
        this.renderResearchTree();
        this.showResearchDetails(node);
        this.eventBus.emit('ui:update');
        
        console.log(`Researched: ${node.name}`);
    }
}

// Export for use in other modules
window.ResearchManager = ResearchManager;