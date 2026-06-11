/* ============================================================================
   Probetheus — Living Playfield
   The in-world canvas: the player's network rendered as the start screen's
   constellation, authored by them. Gold hexagon hubs with breathing cores,
   hairline route filaments, type-colored cargo beads (chain density =
   throughput), deposit glyphs that pulse when charted, a rotating Uplink
   dish, and patrolling probes with soft violet-white trails.
   Contract: docs/design/VISUAL_STYLE.md ("Playfield rendering" + "Material flow")
   ============================================================================ */
(function () {
  const PAL = {
    void: '#07060B', rift: '#1A1030',
    fire: '#D4AF37', fireBright: '#FFD700',
    signal: '#E8E4F0', mist: '#8B84A3',
    lineRGB: '212, 175, 55', signalRGB: '232, 228, 240', mistRGB: '139, 132, 163',
    mat: { minerals: '#C97B4A', data: '#5B8CFF', artifacts: '#B06BFF', exotic: '#E8E4F0' },
  };

  // Authored network, laid out in a virtual 1280×720 "camera" space.
  const HUBS = {
    home: { x: 452, y: 392, r: 26, home: true, name: 'Hearthfall' },
    arc:  { x: 792, y: 246, r: 19, name: 'Arc Relay' },
    drift:{ x: 905, y: 540, r: 19, name: 'Drift Yard' },
    edge: { x: 236, y: 566, r: 15, name: 'Edge Post' },
  };
  const DEPOSITS = [
    { id: 'm1', type: 'minerals', x: 168, y: 248 },
    { id: 'm2', type: 'minerals', x: 1066, y: 392 },
    { id: 'd1', type: 'data', x: 1004, y: 150 },
    { id: 'd2', type: 'data', x: 612, y: 612 },
    { id: 'a1', type: 'artifacts', x: 1138, y: 632 },
    { id: 'x1', type: 'exotic', x: 1186, y: 110 },
  ];
  // Routes: filaments carrying cargo beads. flow = load factor (0..1).
  const ROUTES = [
    { a: ['hub', 'home'], b: ['dep', 'm1'], type: 'minerals', flow: 0.85 },
    { a: ['hub', 'home'], b: ['hub', 'arc'], type: 'data', flow: 0.6 },
    { a: ['hub', 'arc'], b: ['dep', 'd1'], type: 'data', flow: 0.95 },
    { a: ['hub', 'arc'], b: ['dep', 'x1'], type: 'exotic', flow: 0.32 },
    { a: ['hub', 'home'], b: ['hub', 'drift'], type: 'data', flow: 0.5 },
    { a: ['hub', 'drift'], b: ['dep', 'm2'], type: 'minerals', flow: 0.72 },
    { a: ['hub', 'drift'], b: ['dep', 'a1'], type: 'artifacts', flow: 0.55 },
    { a: ['hub', 'home'], b: ['hub', 'edge'], type: 'minerals', flow: 0.4 },
    { a: ['hub', 'edge'], b: ['dep', 'd2'], type: 'data', flow: 0.45 },
  ];

  class Playfield {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.running = false;
      this.rafId = null;
      this.lastTime = 0;
      this.time = 0;       // ambient clock — drift, breathing (never pauses)
      this.simTime = 0;   // sim clock — beads, probes (scales with time controls)
      this.timeScale = 1;
      this.decoding = true;
      this.reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // resolve node positions
      this._node = (ref) => ref[0] === 'hub' ? HUBS[ref[1]]
        : DEPOSITS.find(d => d.id === ref[1]);
      ROUTES.forEach(r => { r._a = this._node(r.a); r._b = this._node(r.b); });

      // The selected probe — patrols a slow loop near the home hub.
      this.selProbe = { loopT: 0.12, type: 'patrol' };
      // ambient probes traveling routes
      this.probes = [
        { route: 1, t: 0.3, dir: 1, speed: 0.045 },
        { route: 6, t: 0.7, dir: -1, speed: 0.038 },
      ];

      this.stars = [];
      this.onResize = () => this.resize();
      window.addEventListener('resize', this.onResize);
      this.resize();
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const cw = this.canvas.clientWidth || window.innerWidth;
      const ch = this.canvas.clientHeight || window.innerHeight;
      this.cw = cw; this.ch = ch;
      this.canvas.width = cw * dpr;
      this.canvas.height = ch * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // cover-scale the 1280×720 camera into the viewport, overscanned slightly
      this.scale = Math.max(cw / 1280, ch / 720) * 1.04;
      this.baseOX = (cw - 1280 * this.scale) / 2;
      this.baseOY = (ch - 720 * this.scale) / 2;
      this.seedStars();
    }

    seedStars() {
      const n = Math.round((this.cw * this.ch) / 9000);
      this.stars = [];
      for (let i = 0; i < n; i++) {
        this.stars.push({
          x: Math.random() * this.cw,
          y: Math.random() * this.ch,
          r: 0.4 + Math.random() * 0.9,
          a: 0.05 + Math.random() * 0.22,
          tier: Math.random() < 0.5 ? 0.4 : 1,
          ph: Math.random() * Math.PI * 2,
        });
      }
    }

    drift() {
      const d = this.reduced ? 0.15 : 1;
      return {
        x: Math.sin(this.time * 0.021) * 14 * d,
        y: Math.cos(this.time * 0.017) * 10 * d,
      };
    }

    w2s(x, y, dr) {
      dr = dr || this.drift();
      return {
        x: x * this.scale + this.baseOX + dr.x,
        y: y * this.scale + this.baseOY + dr.y,
      };
    }

    // Position along the home-hub patrol loop (an ellipse) in world space.
    loopPoint(t) {
      const h = HUBS.home;
      const ang = t * Math.PI * 2;
      return { x: h.x + Math.cos(ang) * 132, y: h.y + Math.sin(ang) * 96 };
    }

    // Screen-space anchor of the selected probe (for the detail floater).
    getProbeAnchor() {
      const p = this.loopPoint(this.selProbe.loopT);
      return this.w2s(p.x, p.y);
    }

    setDecoding(v) { this.decoding = v; }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame((t) => this.frame(t));
    }
    stop() {
      this.running = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    frame(now) {
      if (!this.running) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      if (!this.reduced) this.time += dt;
      else this.time += dt * 0.2;
      this.simTime += dt * (this.reduced ? 0.25 : 1) * this.timeScale;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame((t) => this.frame(t));
    }

    update(dt) {
      const sp = (this.reduced ? 0.25 : 1) * this.timeScale;
      this.selProbe.loopT = (this.selProbe.loopT + dt * 0.018 * sp) % 1;
      this.probes.forEach(p => {
        p.t += p.dir * p.speed * dt * sp;
        if (p.t > 1) p.t -= 1;
        if (p.t < 0) p.t += 1;
      });
    }

    /* ---- render ------------------------------------------------------- */
    render() {
      const ctx = this.ctx, t = this.time, dr = this.drift();
      ctx.clearRect(0, 0, this.cw, this.ch);

      // ground + nebula rising from the lower-right sector the camera faces
      ctx.fillStyle = PAL.void;
      ctx.fillRect(0, 0, this.cw, this.ch);
      const g = ctx.createRadialGradient(
        this.cw * 0.72, this.ch * 1.05, 0,
        this.cw * 0.72, this.ch * 1.05, Math.max(this.cw, this.ch) * 0.9);
      g.addColorStop(0, 'rgba(26, 16, 48, 0.55)');
      g.addColorStop(0.5, 'rgba(26, 16, 48, 0.16)');
      g.addColorStop(1, 'rgba(26, 16, 48, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.cw, this.ch);

      // stars, two parallax tiers, breathing
      for (const st of this.stars) {
        const a = st.a * (0.65 + 0.35 * Math.sin(t * 0.4 + st.ph));
        const x = st.x + dr.x * st.tier * 0.5;
        const y = st.y + dr.y * st.tier * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, st.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${PAL.mistRGB}, ${a.toFixed(3)})`;
        ctx.fill();
      }

      // routes (filaments) — drawn first, beneath everything
      ROUTES.forEach(r => this.drawRoute(r, dr));
      // cargo beads riding each filament
      ROUTES.forEach(r => this.drawBeads(r, dr));
      // deposits
      DEPOSITS.forEach(d => this.drawDeposit(d, dr));
      // hubs (gold) — on top of filaments
      Object.values(HUBS).forEach(h => this.drawHub(h, dr));
      // probes + selected probe
      this.probes.forEach(p => this.drawProbe(p, dr));
      this.drawSelectedProbe(dr);
    }

    drawRoute(r, dr) {
      const ctx = this.ctx;
      const a = this.w2s(r._a.x, r._a.y, dr), b = this.w2s(r._b.x, r._b.y, dr);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(${PAL.lineRGB}, ${(0.10 + r.flow * 0.16).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    drawBeads(r, dr) {
      const ctx = this.ctx;
      const a = this.w2s(r._a.x, r._a.y, dr), b = this.w2s(r._b.x, r._b.y, dr);
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const spacing = 30;
      const count = Math.max(1, Math.round(r.flow * len / spacing));
      const col = PAL.mat[r.type];
      const phase = (this.simTime * (0.04 + r.flow * 0.05)) % (1 / count);
      for (let i = 0; i < count; i++) {
        let f = i / count + phase;
        if (f > 1) f -= 1;
        const x = a.x + dx * f, y = a.y + dy * f;
        // dock consumption: bead brightens as it reaches hub end (f→1)
        const near = f > 0.9 ? (f - 0.9) / 0.1 : 0;
        ctx.beginPath();
        ctx.arc(x, y, 2.4 + near * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = col;
        if (near > 0) {
          ctx.shadowColor = col;
          ctx.shadowBlur = 8 * near;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    drawDeposit(d, dr) {
      const ctx = this.ctx;
      const p = this.w2s(d.x, d.y, dr);
      const pulse = 0.6 + 0.4 * Math.sin(this.time * 0.9 + d.x);
      const col = PAL.mat[d.type];
      const s = 9 * this.scale * (0.92 + pulse * 0.12);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.5 + pulse * 0.4;
      ctx.lineWidth = 1.1;
      ctx.lineJoin = 'round';
      if (d.type === 'minerals') {
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.78, 0);
        ctx.lineTo(0, s); ctx.lineTo(-s * 0.78, 0); ctx.closePath();
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 0.78, 0); ctx.lineTo(s * 0.78, 0); ctx.stroke();
      } else if (d.type === 'data') {
        ctx.beginPath();
        ctx.arc(-s * 0.2, 0, s * 0.7, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
        ctx.beginPath();
        ctx.arc(-s * 0.55, 0, s * 0.95, -Math.PI / 2.4, Math.PI / 2.4); ctx.stroke();
      } else if (d.type === 'artifacts') {
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.85, s * 0.7);
        ctx.lineTo(-s * 0.85, s * 0.7); ctx.closePath(); ctx.stroke();
      } else { // exotic — shimmer star
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(0, s);
        ctx.moveTo(-s * 0.86, -s * 0.5); ctx.lineTo(s * 0.86, s * 0.5);
        ctx.moveTo(s * 0.86, -s * 0.5); ctx.lineTo(-s * 0.86, s * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawHub(h, dr) {
      const ctx = this.ctx;
      const p = this.w2s(h.x, h.y, dr);
      const r = h.r * this.scale;
      const breathe = 0.5 + 0.5 * Math.sin(this.time * 0.7 + h.x * 0.01);

      // hexagon stroke (gold)
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = -Math.PI / 2 + i * Math.PI / 3;
        const x = p.x + Math.cos(ang) * r, y = p.y + Math.sin(ang) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(${PAL.lineRGB}, ${(0.55 + breathe * 0.35).toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // intake ring (thin inner ring)
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.52, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${PAL.lineRGB}, 0.22)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // breathing core
      ctx.beginPath();
      ctx.arc(p.x, p.y, (2.2 + breathe * 1.6) * (this.scale * 0.9), 0, Math.PI * 2);
      ctx.fillStyle = PAL.fire;
      ctx.shadowColor = 'rgba(212,175,55,0.7)';
      ctx.shadowBlur = 10 + breathe * 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (h.home) this.drawUplinkDish(p, r);
    }

    // Rotating Uplink dish arc orbiting the home hub while decoding.
    drawUplinkDish(p, r) {
      const ctx = this.ctx;
      const rot = this.time * (this.decoding ? 0.9 : 0.18);
      const orbit = r * 1.5;
      const cx = p.x + Math.cos(rot) * orbit;
      const cy = p.y + Math.sin(rot) * orbit;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot + Math.PI / 2);
      ctx.strokeStyle = `rgba(${PAL.lineRGB}, 0.8)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 6 * this.scale, Math.PI * 0.15, Math.PI * 0.85); // dish bowl
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 1.4 * this.scale, 0, Math.PI * 2); // feed
      ctx.fillStyle = PAL.fireBright;
      ctx.fill();
      ctx.restore();
      // faint orbit guide
      ctx.beginPath();
      ctx.arc(p.x, p.y, orbit, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${PAL.lineRGB}, 0.07)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    drawProbe(p, dr) {
      const r = ROUTES[p.route];
      const a = this.w2s(r._a.x, r._a.y, dr), b = this.w2s(r._b.x, r._b.y, dr);
      const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
      const ang = Math.atan2((b.y - a.y) * p.dir, (b.x - a.x) * p.dir);
      this.paintProbeBody(x, y, ang, 4.2 * this.scale, false);
    }

    drawSelectedProbe(dr) {
      const wp = this.loopPoint(this.selProbe.loopT);
      const p = this.w2s(wp.x, wp.y, dr);
      const ahead = this.loopPoint((this.selProbe.loopT + 0.01) % 1);
      const pa = this.w2s(ahead.x, ahead.y, dr);
      const ang = Math.atan2(pa.y - p.y, pa.x - p.x);
      // gold breathing selection ring
      const breathe = 0.5 + 0.5 * Math.sin(this.time * 1.4);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, (11 + breathe * 3) * this.scale * 0.7, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(${PAL.lineRGB}, ${(0.4 + breathe * 0.3).toFixed(3)})`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      this.paintProbeBody(p.x, p.y, ang, 5 * this.scale, true);
    }

    paintProbeBody(x, y, ang, size, sel) {
      const ctx = this.ctx;
      // trail
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const grad = ctx.createLinearGradient(-size * 5, 0, 0, 0);
      grad.addColorStop(0, 'rgba(232,228,240,0)');
      grad.addColorStop(1, 'rgba(232,228,240,0.35)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-size * 5, 0);
      ctx.lineTo(-size * 0.6, 0);
      ctx.stroke();
      // body — small signal-white diamond
      ctx.beginPath();
      ctx.moveTo(size, 0); ctx.lineTo(0, size * 0.7);
      ctx.lineTo(-size * 0.7, 0); ctx.lineTo(0, -size * 0.7);
      ctx.closePath();
      ctx.fillStyle = PAL.signal;
      if (sel) { ctx.shadowColor = 'rgba(232,228,240,0.6)'; ctx.shadowBlur = 8; }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  window.Playfield = Playfield;
})();
