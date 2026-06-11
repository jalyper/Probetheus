/* ============================================================================
   Probetheus — in-game UI wiring
   ============================================================================ */
(function () {
  /* ---- icon injection --------------------------------------------------- */
  document.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon');
    const sz = parseFloat(el.getAttribute('data-sz')) || 16;
    el.innerHTML = window.icon(name, { size: sz });
  });

  /* ---- playfield -------------------------------------------------------- */
  const pf = new window.Playfield(document.getElementById('playfield'));
  pf.start();
  if (pf.render) pf.render(); // force one paint in case rAF is throttled while hidden
  window.pf = pf;

  /* ---- protocol catalog (mirrors GameConstants PROTOCOLS) --------------- */
  const PROTOCOLS = [
    { id: 'swift', name: 'Swift Carriage', data: 40,
      effect: 'Probes travel 25% faster on every leg.',
      lore: 'A drive cadence recovered from the wreck-songs of the first fleet.',
      done: true },
    { id: 'deep', name: 'Deep Resonance', data: 60,
      effect: 'Prospecting pulses sweep 40% further.',
      lore: 'The void answers louder when you ask in its own frequency.',
      done: true },
    { id: 'harvest', name: 'Harvest Lattice', data: 80, cat: { artifacts: 2 },
      effect: 'Unlocks collector modules for probe equipment bays.',
      lore: "Cargo geometry folded from a derelict's hold.",
      active: true, progress: 0.58 },
    { id: 'extraction', name: 'Extraction Harmonics', data: 120, cat: { artifacts: 4 },
      effect: '+1 yield on every deposit extraction pass.',
      lore: 'Veins give more to those who take in rhythm.' },
    { id: 'universal', name: 'Universal Lattice', data: 150, cat: { artifacts: 6 },
      effect: 'Unlocks the Universal Collector — one module, every cargo type.',
      lore: 'All matter is one lattice, sampled at different angles.' },
    { id: 'exotic', name: 'Exotic Synthesis', data: 200, cat: { exoticMinerals: 4 },
      effect: 'Unlocks Probethium synthesis from exotic minerals at hubs.',
      lore: 'What the outer rings hoard, the Probetheus once burned for fuel.' },
    { id: 'remnant', name: 'Remnant Protocols', data: 250, cat: { artifacts: 8, exoticMinerals: 4 },
      effect: 'Opens deep trade with the Remnants.',
      lore: 'They will speak plainly only to machines that remember.',
      locked: true },
  ];
  const STORE = { data: 318, artifacts: 47, exoticMinerals: 12 };
  const MAT_LABEL = { artifacts: 'artifacts', exoticMinerals: 'exotic' };

  function costLine(p) {
    const parts = ['<span class="c-data">' + p.data + ' data</span>'];
    if (p.cat) for (const k in p.cat) parts.push(p.cat[k] + ' ' + MAT_LABEL[k]);
    return parts.join('<span style="opacity:.4">·</span> ');
  }
  function affordable(p) {
    if (STORE.data < p.data) return false;
    if (p.cat) for (const k in p.cat) if ((STORE[k] || 0) < p.cat[k]) return false;
    return true;
  }
  function anyActive() { return PROTOCOLS.some(p => p.active); }

  const listEl = document.getElementById('protoList');
  function renderProtocols() {
    const busy = anyActive();
    listEl.innerHTML = PROTOCOLS.map(p => {
      let cls = 'proto', state = '', foot = '';
      if (p.done) {
        cls += ' done';
        state = '<span class="proto-state s-done">Decoded</span>';
        foot = '<span style="font-size:10px;color:var(--mist);font-family:var(--font-data)">' +
               p.data + ' data streamed</span>';
      } else if (p.active) {
        cls += ' active';
        state = '<span class="proto-state s-active">Decoding</span>';
        const pct = Math.round(p.progress * 100);
        foot = '<div class="up-bar"><div class="up-bar-fill" data-fill="' + p.id + '" style="width:' +
               pct + '%"></div></div><span class="up-pct" data-pct="' + p.id + '">' + pct + '%</span>';
      } else if (p.locked) {
        cls += ' locked';
        state = '<span class="proto-state s-locked">' + window.icon('lock', { size: 11 }) + 'Locked</span>';
        foot = '<span class="proto-cost">' + costLine(p) + '</span>' +
               '<span style="font-size:9px;color:var(--mist);letter-spacing:.1em">Decode Remnant access first</span>';
      } else {
        const can = affordable(p) && !busy;
        state = '<span class="proto-state" style="color:var(--mist)">Available</span>';
        foot = '<span class="proto-cost">' + costLine(p) + '</span>' +
               '<button class="decode-btn" data-decode="' + p.id + '"' + (can ? '' : ' disabled') +
               ' title="' + (busy ? 'One protocol decodes at a time' : (affordable(p) ? 'Begin decode' : 'Insufficient data')) +
               '">Decode</button>';
      }
      return '<div class="' + cls + '">' +
        '<div class="proto-head"><span class="proto-name">' + p.name + '</span>' + state + '</div>' +
        '<div class="proto-lore">' + p.lore + '</div>' +
        '<div class="proto-effect">' + p.effect + '</div>' +
        '<div class="proto-foot">' + foot + '</div></div>';
    }).join('');

    listEl.querySelectorAll('[data-decode]').forEach(b => {
      b.addEventListener('click', () => {
        const p = PROTOCOLS.find(x => x.id === b.getAttribute('data-decode'));
        if (!p || !affordable(p) || anyActive()) return;
        p.active = true; p.progress = 0;
        renderProtocols();
      });
    });
  }
  renderProtocols();

  // live decode progress
  let lastT = performance.now();
  function tickDecode(now) {
    const dt = Math.min((now - lastT) / 1000, 0.1); lastT = now;
    const p = PROTOCOLS.find(x => x.active);
    if (p) {
      p.progress += dt * 0.014;
      if (p.progress >= 1) {
        p.progress = 1; p.active = false; p.done = true;
        pf.setDecoding(false);
        renderProtocols();
      } else {
        const fill = listEl.querySelector('[data-fill="' + p.id + '"]');
        const pct = listEl.querySelector('[data-pct="' + p.id + '"]');
        const v = Math.round(p.progress * 100);
        if (fill) fill.style.width = v + '%';
        if (pct) pct.textContent = v + '%';
      }
    }
    requestAnimationFrame(tickDecode);
  }
  requestAnimationFrame(tickDecode);
  tickDecode(performance.now());

  /* ---- dark market shells ----------------------------------------------- */
  const SHELLS = [
    { name: 'Void Walker Shell', ds: 'A mysterious violet shell drawn from the deep void.', price: 120, icon: 'probe' },
    { name: 'Solar Flare Shell', ds: 'Burns a faint corona along the probe\'s outbound legs.', price: 95, icon: 'shuttle' },
    { name: 'Quantum Phase Shell', ds: 'Flickers between positions — never quite where charted.', price: 160, icon: 'spark' },
    { name: 'Driftglass Shell', ds: 'Refracts the nebula it passes through into hairline light.', price: 110, icon: 'hub' },
  ];
  document.getElementById('marketShells').innerHTML = SHELLS.map(s =>
    '<div class="mk-item"><span class="mk-swatch" style="color:var(--violet)">' +
    window.icon(s.icon, { size: 22 }) + '</span>' +
    '<div class="info"><div class="nm">' + s.name + '</div><div class="ds">' + s.ds + '</div>' +
    '<div class="buy"><span class="mk-price">' + window.icon('spark', { size: 14 }) + s.price +
    '</span><button class="mk-buy">Acquire</button></div></div></div>'
  ).join('');

  /* ---- connector + floater tracking ------------------------------------- */
  const scene = document.getElementById('scene');
  const floater = document.getElementById('floater');
  const connLine = document.getElementById('conn-line');
  const connDot = document.getElementById('conn-dot');
  const uplink = document.getElementById('uplink');

  function trackFloater() {
    if (floater.classList.contains('hidden')) {
      document.getElementById('connector').style.display = 'none';
    } else {
      document.getElementById('connector').style.display = 'block';
      const a = pf.getProbeAnchor();
      const fw = floater.offsetWidth, fh = floater.offsetHeight;
      const vw = scene.clientWidth, vh = scene.clientHeight;
      const upLeft = uplink.classList.contains('hidden') ? vw - 18 : uplink.getBoundingClientRect().left;
      let fx = a.x + 84;
      fx = Math.min(fx, upLeft - fw - 14);
      fx = Math.max(fx, 360);
      let fy = a.y - fh / 2;
      fy = Math.max(150, Math.min(fy, vh - fh - 80));
      floater.style.left = fx + 'px';
      floater.style.top = fy + 'px';
      // connector from probe anchor to floater left-center
      connDot.setAttribute('cx', a.x); connDot.setAttribute('cy', a.y);
      connLine.setAttribute('x1', a.x); connLine.setAttribute('y1', a.y);
      connLine.setAttribute('x2', fx); connLine.setAttribute('y2', fy + 30);
    }
    requestAnimationFrame(trackFloater);
  }
  trackFloater(); // position synchronously now, then keep tracking via rAF

  /* ---- time controls ---------------------------------------------------- */
  pf.timeScale = 1;
  const timeEl = document.getElementById('time');
  timeEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.tbn'); if (!btn) return;
    if (btn.dataset.act === 'pause') {
      const paused = btn.classList.toggle('paused');
      const ic = btn.querySelector('svg');
      btn.innerHTML = window.icon(paused ? 'play' : 'pause', { size: 13 });
      pf.timeScale = paused ? 0 : currentScale();
      return;
    }
    if (btn.dataset.scale) {
      timeEl.querySelectorAll('[data-scale]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pb = timeEl.querySelector('[data-act="pause"]');
      pb.classList.remove('paused'); pb.innerHTML = window.icon('pause', { size: 13 });
      pf.timeScale = parseFloat(btn.dataset.scale);
    }
  });
  function currentScale() {
    const a = timeEl.querySelector('[data-scale].active');
    return a ? parseFloat(a.dataset.scale) : 1;
  }

  /* ---- panel toggles + persistence -------------------------------------- */
  const KEY = 'probetheus_ui_v1';
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function applyVis(id, on, btn) {
    const el = document.getElementById(id);
    el.classList.toggle('hidden', !on);
    if (btn) btn.classList.toggle('active', on);
  }
  // restore + defaults. Uplink is closed by default for a calm hero; the
  // right-edge toast tip yields to the Uplink panel whenever it is open.
  const toastEl = document.getElementById('toast');
  function syncUplink(on) {
    applyVis('uplink', on, document.getElementById('toggleUplink'));
    toastEl.classList.toggle('hidden', on);
  }
  syncUplink(state.uplink === true);
  if (state.tutorial === false) document.getElementById('tutorial').classList.add('hidden');
  if (state.floater === false) document.getElementById('floater').classList.add('hidden');

  document.getElementById('toggleUplink').addEventListener('click', () => {
    const on = document.getElementById('uplink').classList.contains('hidden');
    syncUplink(on);
    state.uplink = on; persist();
  });
  document.querySelectorAll('[data-close]').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-close');
      if (id === 'market') { document.getElementById('market-scrim').classList.remove('open'); return; }
      document.getElementById(id).classList.add('hidden');
      if (id === 'uplink') { syncUplink(false); state.uplink = false; persist(); }
      if (id === 'tutorial') { state.tutorial = false; persist(); }
      if (id === 'floater') { state.floater = false; persist(); }
    });
  });

  // hubops collapse
  document.querySelector('#hubops .x').addEventListener('click', () => {
    document.getElementById('hubops').classList.add('hidden');
  });

  /* ---- dark market open -------------------------------------------------- */
  const scrim = document.getElementById('market-scrim');
  document.getElementById('openMarket').addEventListener('click', () => scrim.classList.add('open'));
  scrim.addEventListener('click', (e) => { if (e.target === scrim) scrim.classList.remove('open'); });

  /* ---- floater toggles -------------------------------------------------- */
  document.querySelectorAll('#floater [data-tog]').forEach(t => {
    t.addEventListener('click', () => t.classList.toggle('on'));
  });

  /* ---- intake upgrade --------------------------------------------------- */
  const intake = document.getElementById('intakeUpgrade');
  intake.addEventListener('click', () => {
    if (intake.classList.contains('disabled')) return;
    intake.classList.add('disabled');
    intake.innerHTML = window.icon('upgrade', { size: 14 }) + 'Upgrading…';
    setTimeout(() => {
      document.querySelector('#hubops .lvl').textContent = 'Level 3';
      document.querySelector('#hubops .ho-rate').innerHTML = '24.0 <span class="u">deliveries / min</span>';
      document.querySelector('#hubops .cap-fill').style.width = '48%';
      intake.innerHTML = window.icon('check', { size: 14 }) + 'Intake Bay at maximum';
    }, 720);
  });

  /* ---- keyboard hints (D/B/M/S, Space, 1/2/3) --------------------------- */
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    const map = { d: 'deploy', b: 'hub', m: 'mining', s: 'shuttle' };
    const k = e.key.toLowerCase();
    if (map[k]) {
      const btn = document.querySelector('#hubops [data-act="' + map[k] + '"]');
      if (btn) { btn.style.color = 'var(--fire)'; setTimeout(() => btn.style.color = '', 320); }
    }
    if (e.key === ' ') { e.preventDefault(); timeEl.querySelector('[data-act="pause"]').click(); }
    if (e.key === '1' || e.key === '2' || e.key === '3') {
      const s = e.key === '3' ? '4' : e.key;
      const b = timeEl.querySelector('[data-scale="' + s + '"]'); if (b) b.click();
    }
  });
})();
