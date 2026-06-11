/**
 * ComboSystem — collection combo chains (docs/design/CORE_LOOP.md "Juice")
 *
 * Collecting 3+ signals within the chain window links a combo: each link past
 * the second adds +10% bonus to that collection's value, capped at +50%.
 * Rewards dense routing through signal clusters — the system quietly teaches
 * good route placement.
 */
class ComboSystem {
    constructor(gameState, eventBus) {
        this.gameState = gameState;
        this.eventBus = eventBus;

        this.windowMs = 2000;       // max gap between collections to keep the chain
        this.bonusPerLinkPct = 10;  // per link past the 2nd
        this.maxBonusPct = 50;

        this.chain = 0;
        this.lastCollectTime = 0;

        this.eventBus.on('signal:collected', (data) => this.onCollected(data));
    }

    onCollected(data) {
        const now = Date.now();
        if (now - this.lastCollectTime <= this.windowMs) {
            this.chain++;
        } else {
            this.chain = 1;
        }
        this.lastCollectTime = now;

        if (this.chain < 3) return;

        const bonusPct = Math.min((this.chain - 2) * this.bonusPerLinkPct, this.maxBonusPct);

        // Bonus resources land in the collecting probe's cargo (auto-collections).
        // Manual clicks still extend the chain but carry no cargo to boost.
        if (data?.probe && data.amount > 0 && data.primaryResourceType) {
            const bonus = Math.max(1, Math.floor(data.amount * bonusPct / 100));
            data.probe.cargo = data.probe.cargo || { minerals: 0, data: 0, artifacts: 0, exoticMinerals: 0 };
            data.probe.cargo[data.primaryResourceType] = (data.probe.cargo[data.primaryResourceType] || 0) + bonus;

            this.eventBus.emit('resource:indicator', {
                x: data.x,
                y: data.y - 20,
                amount: bonus,
                resourceType: data.primaryResourceType,
                pending: true,
                label: `COMBO ×${this.chain}  +${bonusPct}%`,
                color: '#ffd700'
            });
        } else if (data?.x !== undefined) {
            this.eventBus.emit('resource:indicator', {
                x: data.x,
                y: data.y - 20,
                amount: 0,
                resourceType: 'all',
                label: `COMBO ×${this.chain}`,
                color: '#ffd700'
            });
        }

        this.eventBus.emit('combo:chain', {
            chain: this.chain,
            bonusPct,
            x: data?.x,
            y: data?.y
        });
    }
}

window.ComboSystem = ComboSystem;
