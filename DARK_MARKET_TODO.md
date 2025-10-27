# Dark Market Implementation - Continuation Tasks

## ✅ Completed:
- DarkMarketSystem.js class created
- UI modal in index.html
- Probe skin selector in DetailsPanel
- Test panel button added

## 🚧 Next Steps:

### 1. GameController Integration
Need to add Dark Market system initialization:
```javascript
// In GameController constructor
this.darkMarket = new DarkMarketSystem(this.gameState, this.eventBus);
```

### 2. Test Button Handler (UIManager.js)
```javascript
document.getElementById('testSpawnDarkMarket').addEventListener('click', () => {
    game.spawnDarkMarketSignal();
});
```

### 3. Dark Market Signal Spawning (GameController.js)
Add method to spawn special signal:
```javascript
spawnDarkMarketSignal() {
    const nearestHub = this.gameState.entities.reconHubs[0];
    const angle = Math.random() * Math.PI * 2;
    const distance = 300 + Math.random() * 200;
    
    const signal = {
        id: `dark_market_${Date.now()}`,
        x: nearestHub.x + Math.cos(angle) * distance,
        y: nearestHub.y + Math.sin(angle) * distance,
        type: 'dark_market',
        radius: 15, // Larger than normal
        discovered: false,
        createdAt: Date.now()
    };
    
    this.gameState.entities.signals.push(signal);
}
```

### 4. Dark Market Signal Rendering (GameController.js)
Special animation in drawSignals():
```javascript
if (signal.type === 'dark_market') {
    // Pulsing purple effect
    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
    const size = signal.radius * pulse;
    
    // Outer glow
    ctx.beginPath();
    ctx.arc(screenX, screenY, size + 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(148,0,211,0.3)';
    ctx.fill();
    
    // Main circle
    ctx.beginPath();
    ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
    ctx.fillStyle = '#9400d3';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Rotating particles
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const angle = (Date.now() / 1000 + i * Math.PI / 4) % (Math.PI * 2);
        const px = screenX + Math.cos(angle) * (size + 10);
        const py = screenY + Math.sin(angle) * (size + 10);
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
}
```

### 5. Dark Market Click Handler (GameController.js)
In handleCanvasClick():
```javascript
const clickedSignal = this.findSignalAt(worldX, worldY);
if (clickedSignal) {
    if (clickedSignal.type === 'dark_market') {
        this.openDarkMarket(clickedSignal);
        return;
    }
    // ... existing signal handling
}
```

### 6. Open Dark Market Method (GameController.js)
```javascript
openDarkMarket(signal) {
    // Remove signal
    const index = this.gameState.entities.signals.indexOf(signal);
    if (index > -1) {
        this.gameState.entities.signals.splice(index, 1);
    }
    
    // Generate inventory
    const inventory = this.darkMarket.generateMarketInventory();
    
    // Populate UI
    this.populateDarkMarketUI(inventory);
    
    // Show modal
    document.getElementById('darkMarketModal').style.display = 'flex';
}
```

### 7. Populate Dark Market UI (GameController.js)
```javascript
populateDarkMarketUI(inventory) {
    const container = document.getElementById('darkMarketInventory');
    let html = '';
    
    // Special reward
    const special = inventory.specialReward;
    html += `
        <div style="border: 2px solid #ff0; border-radius: 8px; padding: 15px; background: rgba(255,255,0,0.05);">
            <div style="color: #ff0; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
                ⭐ Special Offer
            </div>
            <div style="color: #fff; font-size: 14px; margin-bottom: 5px;">${special.name}</div>
            <div style="color: #aaa; font-size: 12px; margin-bottom: 10px;">${special.description}</div>
            <button class="dark-market-buy-btn" data-item-id="${special.id}" style="background: #ff0; color: #000; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                Buy for ${special.cost} Probethium
            </button>
        </div>
    `;
    
    // Cosmetics
    inventory.cosmetics.forEach(cosmetic => {
        html += `
            <div style="border: 2px solid ${cosmetic.color}; border-radius: 8px; padding: 15px; background: ${cosmetic.color}11;">
                <div style="color: ${cosmetic.color}; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
                    ${cosmetic.name}
                </div>
                <div style="width: 80px; height: 80px; margin: 10px auto; display: flex; align-items: center; justify-content: center;">
                    ${this.renderProbeSkinPreview(cosmetic.color)}
                </div>
                <div style="color: #aaa; font-size: 12px; margin-bottom: 10px;">${cosmetic.description}</div>
                <button class="dark-market-buy-btn" data-item-id="${cosmetic.id}" style="background: ${cosmetic.color}; color: #000; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    Buy for ${cosmetic.cost} Probethium
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add purchase event listeners
    document.querySelectorAll('.dark-market-buy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const itemId = btn.getAttribute('data-item-id');
            this.purchaseDarkMarketItem(itemId);
        });
    });
}
```

### 8. Probe Skin Preview Rendering
```javascript
renderProbeSkinPreview(color) {
    return `
        <svg width="60" height="60" viewBox="0 0 60 60" style="transform: rotate(45deg);">
            <circle cx="30" cy="30" r="10" fill="${color}" stroke="#fff" stroke-width="2"/>
            <rect x="28" y="10" width="4" height="15" fill="${color}99" stroke="${color}" stroke-width="1"/>
            <rect x="28" y="45" width="4" height="5" fill="${color}99"/>
            <polygon points="40,30 50,25 50,35" fill="${color}"/>
            <line x1="22" y1="27" x2="15" y2="22" stroke="${color}99" stroke-width="2"/>
            <line x1="22" y1="33" x2="15" y2="38" stroke="${color}99" stroke-width="2"/>
        </svg>
    `;
}
```

### 9. Purchase Handler (GameController.js)
```javascript
purchaseDarkMarketItem(itemId) {
    const success = this.darkMarket.purchaseItem(itemId);
    if (success) {
        // Refresh UI to show purchase
        const inventory = this.darkMarket.currentMarketInventory;
        this.populateDarkMarketUI(inventory);
    }
}
```

### 10. Apply Custom Skin to Probe Rendering
In drawProbe() method, check for customSkin:
```javascript
drawProbe(ctx, probe) {
    // Get color from custom skin or default
    let probeColor = '#00ffff'; // Default cyan
    
    if (probe.customSkin && probe.customSkin !== 'default') {
        const ownedSkins = this.gameState.ownedCosmetics?.probeSkins || [];
        const skin = ownedSkins.find(s => s.id === probe.customSkin);
        if (skin) {
            probeColor = skin.color;
        }
    }
    
    // Use probeColor for all probe drawing
    ctx.fillStyle = probeColor;
    // ... rest of probe rendering
}
```

### 11. Close Modal Handler (UIManager.js or GameController.js)
```javascript
document.getElementById('closeDarkMarket').addEventListener('click', () => {
    document.getElementById('darkMarketModal').style.display = 'none';
});
```

### 12. Prevent Auto-Collection of Dark Market Signals
In ProbeManager where auto-collection happens:
```javascript
if (signal.type === 'dark_market') {
    return; // Cannot auto-collect dark market signals
}
```

---

## Testing Checklist:
- [ ] Click "Spawn Dark Market" button
- [ ] Dark market signal appears with special animation
- [ ] Click signal opens Dark Market modal
- [ ] Modal shows special offer + cosmetics
- [ ] Purchase with enough Probethium works
- [ ] Purchase without enough Probethium shows error
- [ ] Probe skin appears in probe details panel
- [ ] Click skin checkbox equips it
- [ ] Equipped skin shows checkmark
- [ ] Probe renders with custom color
- [ ] Close modal button works

---

## Future Enhancements:
- Echo rewards in dark market
- Equipment packs fully functional
- Multiple dark market themes/traders
- Dark market spawn rate research upgrade
- Animated entrance/exit for modal
- Sound effects for purchases
