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
        // Calculate divider positions based on updated node positions
        // Collection tree: highest node at y:20, lowest at y:200 (+ 80px height = 280px bottom)
        // Probe tree: highest node at y:350, lowest at y:530 (+ 80px height = 610px bottom)  
        // Alien tree: highest node at y:650, lowest at y:830 (+ 80px height = 910px bottom)
        
        // Divider between Collection and Probe trees (mid-gap at ~330px)
        const divider1 = document.createElement('div');
        divider1.style.cssText = `
            position: absolute;
            left: 0;
            top: 320px;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, #0ff 20%, #0ff 80%, transparent 100%);
            opacity: 0.4;
            z-index: 10;
            box-shadow: 0 0 6px rgba(0, 255, 255, 0.3);
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

        // Divider between Probe and Alien trees (mid-gap at ~630px)
        const divider2 = document.createElement('div');
        divider2.style.cssText = `
            position: absolute;
            left: 0;
            top: 630px;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, #4f4 20%, #4f4 80%, transparent 100%);
            opacity: 0.4;
            z-index: 10;
            box-shadow: 0 0 6px rgba(68, 255, 68, 0.3);
        `;
        container.appendChild(divider2);

        // Tree label for Probe Technology
        const probeLabel = document.createElement('div');
        probeLabel.style.cssText = `
            position: absolute;
            left: 10px;
            top: 330px;
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
            top: 640px;
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
        const contentHeight = Math.max(maxY + 50, 950); // 50px bottom padding, minimum 950px for alien tree
        
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
     * Draw connection line between research nodes (family tree style)
     */
    drawResearchConnection(container, fromNode, toNode) {
        const fromCenterX = fromNode.position.x + 90; // Right edge of source node
        const fromCenterY = fromNode.position.y + 40; // Vertical center of source node
        const toCenterX = toNode.position.x; // Left edge of target node
        const toCenterY = toNode.position.y + 40; // Vertical center of target node
        
        // Connection should light up if both nodes are researched or if parent is researched and child is available
        const connectionActive = fromNode.researched && (toNode.researched || toNode.available);
        const lineColor = connectionActive ? '#0ff' : '#444';
        const lineOpacity = connectionActive ? '1' : '0.5';
        const glowEffect = connectionActive ? '0 0 8px rgba(0, 255, 255, 0.6)' : 'none';
        
        // Create horizontal line from parent to child
        if (fromCenterX < toCenterX) {
            // Horizontal connector line
            const horizontalLine = document.createElement('div');
            horizontalLine.style.cssText = `
                position: absolute;
                left: ${fromCenterX}px;
                top: ${fromCenterY - 1}px;
                width: ${toCenterX - fromCenterX}px;
                height: 2px;
                background: ${lineColor};
                opacity: ${lineOpacity};
                box-shadow: ${glowEffect};
                z-index: 10;
                pointer-events: none;
                transition: all 0.3s ease;
            `;
            container.appendChild(horizontalLine);
            
            // Add vertical connector if nodes are at different heights
            if (Math.abs(fromCenterY - toCenterY) > 5) {
                const verticalLine = document.createElement('div');
                const verticalTop = Math.min(fromCenterY, toCenterY);
                const verticalHeight = Math.abs(fromCenterY - toCenterY);
                
                verticalLine.style.cssText = `
                    position: absolute;
                    left: ${toCenterX - 1}px;
                    top: ${verticalTop - 1}px;
                    width: 2px;
                    height: ${verticalHeight + 2}px;
                    background: ${lineColor};
                    opacity: ${lineOpacity};
                    box-shadow: ${glowEffect};
                    z-index: 10;
                    pointer-events: none;
                    transition: all 0.3s ease;
                `;
                container.appendChild(verticalLine);
            }
        }
    }

    /**
     * Create a research node element
     */
    createResearchNode(container, node) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'research-node';
        
        // Determine node styling based on state
        const borderColor = node.researched ? '#0f0' : node.available ? '#0ff' : '#666';
        const backgroundColor = node.researched ? 'rgba(0,255,0,0.15)' : node.available ? 'rgba(0,255,255,0.15)' : 'rgba(0,0,0,0.4)';
        const boxShadow = node.researched ? '0 0 25px rgba(0,255,0,0.6), inset 0 0 15px rgba(0,255,0,0.1)' : 
                         node.available ? '0 0 15px rgba(0,255,255,0.4), inset 0 0 10px rgba(0,255,255,0.1)' : 
                         '0 0 5px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.2)';
        
        nodeDiv.style.cssText = `
            position: absolute;
            left: ${node.position.x}px;
            top: ${node.position.y}px;
            width: 90px;
            height: 80px;
            border: 3px solid ${borderColor};
            border-radius: 12px;
            background: ${backgroundColor};
            backdrop-filter: blur(2px);
            cursor: ${node.available ? 'pointer' : 'not-allowed'};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: ${boxShadow};
            z-index: 50;
            overflow: hidden;
        `;
        
        // Add rigid perimeter with double border effect
        const innerBorder = document.createElement('div');
        innerBorder.style.cssText = `
            position: absolute;
            top: 2px;
            left: 2px;
            right: 2px;
            bottom: 2px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            pointer-events: none;
        `;
        
        nodeDiv.innerHTML = `
            <div style="font-size: 20px; margin-bottom: 2px; position: relative; z-index: 10;">${node.icon}</div>
            <div style="font-size: 9px; color: #fff; text-align: center; line-height: 1.1; position: relative; z-index: 10;">${node.name}</div>
            <div style="font-size: 8px; color: #888; margin-top: 2px; position: relative; z-index: 10;">${node.cost}RP</div>
        `;
        
        // Add the inner border
        nodeDiv.appendChild(innerBorder);
        
        if (node.available) {
            nodeDiv.addEventListener('click', () => {
                this.showResearchDetails(node);
            });
            
            nodeDiv.addEventListener('mouseenter', () => {
                nodeDiv.style.transform = 'scale(1.05)';
                nodeDiv.style.boxShadow = node.researched ? 
                    '0 0 35px rgba(0,255,0,0.8), inset 0 0 20px rgba(0,255,0,0.15)' : 
                    '0 0 25px rgba(0,255,255,0.6), inset 0 0 15px rgba(0,255,255,0.15)';
            });
            
            nodeDiv.addEventListener('mouseleave', () => {
                nodeDiv.style.transform = 'scale(1)';
                nodeDiv.style.boxShadow = node.researched ? 
                    '0 0 25px rgba(0,255,0,0.6), inset 0 0 15px rgba(0,255,0,0.1)' : 
                    '0 0 15px rgba(0,255,255,0.4), inset 0 0 10px rgba(0,255,255,0.1)';
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
                <button id="researchNodeBtn" class="control-btn resource-button ${!canResearch ? 'insufficient' : ''}" 
                    style="font-size: 12px; padding: 8px 16px;"
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