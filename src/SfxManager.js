/**
 * SfxManager — procedural sound effects via WebAudio (no audio assets)
 * Design: docs/design/CORE_LOOP.md "Sound design" — every loop event gets a
 * sound within 100ms. Synthesized tones keep the build asset-free; can be
 * swapped for recorded SFX later without changing call sites.
 */
class SfxManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.audioCtx = null;
        this.master = null;
        this.enabled = localStorage.getItem('csog_sfx_enabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('csog_sfx_volume') || '0.5');
        this.lastWarnTime = 0;

        // Browsers require a user gesture before audio can start
        const unlock = () => {
            this.ensureContext();
            document.removeEventListener('pointerdown', unlock);
            document.removeEventListener('keydown', unlock);
        };
        document.addEventListener('pointerdown', unlock);
        document.addEventListener('keydown', unlock);

        this.subscribe();
    }

    ensureContext() {
        if (!this.audioCtx) {
            try {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return;
                this.audioCtx = new Ctx();
                this.master = this.audioCtx.createGain();
                this.master.gain.value = this.volume;
                this.master.connect(this.audioCtx.destination);
            } catch (e) {
                console.warn('SfxManager: WebAudio unavailable', e);
                return;
            }
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    setVolume(v) {
        this.volume = Math.max(0, Math.min(1, v));
        localStorage.setItem('csog_sfx_volume', String(this.volume));
        if (this.master) this.master.gain.value = this.volume;
    }

    setEnabled(enabled) {
        this.enabled = !!enabled;
        localStorage.setItem('csog_sfx_enabled', String(this.enabled));
    }

    /**
     * Play a single tone with an exponential decay envelope.
     */
    tone({ freq = 440, freqEnd = null, type = 'sine', dur = 0.12, vol = 0.4, delay = 0 } = {}) {
        if (!this.enabled || !this.audioCtx || this.audioCtx.state !== 'running') return;
        const t0 = this.audioCtx.currentTime + delay;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (freqEnd) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
        }
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
    }

    /**
     * Short filtered-noise burst (probe destruction, impacts).
     */
    noise({ dur = 0.25, vol = 0.3, delay = 0 } = {}) {
        if (!this.enabled || !this.audioCtx || this.audioCtx.state !== 'running') return;
        const t0 = this.audioCtx.currentTime + delay;
        const length = Math.floor(this.audioCtx.sampleRate * dur);
        const buffer = this.audioCtx.createBuffer(1, length, this.audioCtx.sampleRate);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            channel[i] = (Math.random() * 2 - 1) * (1 - i / length);
        }
        const src = this.audioCtx.createBufferSource();
        src.buffer = buffer;
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        src.connect(gain);
        gain.connect(this.master);
        src.start(t0);
    }

    subscribe() {
        const bus = this.eventBus;

        // Collection blip — pitch rises with rarity; epic+ gets a chime layer
        const raritySemitones = { common: 0, uncommon: 3, rare: 5, epic: 7, legendary: 12 };
        bus.on('signal:collected', (data) => {
            const semis = raritySemitones[data?.rarity] ?? 0;
            const freq = 440 * Math.pow(2, semis / 12);
            this.tone({ freq, type: 'sine', dur: 0.09, vol: 0.35 });
            if (data?.rarity === 'epic' || data?.rarity === 'legendary') {
                this.tone({ freq: freq * 2, type: 'triangle', dur: 0.25, vol: 0.25, delay: 0.05 });
            }
        });

        // Combo chain — escalating arpeggio steps
        bus.on('combo:chain', (data) => {
            const step = Math.min((data?.chain || 3) - 3, 12);
            const freq = 523.25 * Math.pow(2, step / 12);
            this.tone({ freq, type: 'square', dur: 0.08, vol: 0.22 });
            this.tone({ freq: freq * 1.5, type: 'square', dur: 0.08, vol: 0.15, delay: 0.04 });
        });

        // Probe deploy — rising whoosh
        bus.on('probe:deployed', () => {
            this.tone({ freq: 220, freqEnd: 660, type: 'sawtooth', dur: 0.25, vol: 0.15 });
        });

        // Cargo delivery — thunk + coin tick; >=90% full load gets a flourish
        bus.on('probe:cargoDelivered', (data) => {
            this.tone({ freq: 110, type: 'triangle', dur: 0.1, vol: 0.4 });
            this.tone({ freq: 880, type: 'sine', dur: 0.06, vol: 0.25, delay: 0.07 });
            if ((data?.capacityRatio || 0) >= 0.9) {
                this.tone({ freq: 1174.66, type: 'sine', dur: 0.18, vol: 0.25, delay: 0.13 });
            }
        });

        // Construction thuds
        bus.on('mining:stationBuilt', () => {
            this.tone({ freq: 80, freqEnd: 50, type: 'triangle', dur: 0.2, vol: 0.45 });
        });
        bus.on('mining:shuttleBuilt', () => {
            this.tone({ freq: 140, freqEnd: 90, type: 'triangle', dur: 0.15, vol: 0.35 });
        });

        // Uplink protocol decoded — three-note fanfare
        bus.on('uplink:decoded', () => {
            this.tone({ freq: 523.25, type: 'triangle', dur: 0.12, vol: 0.3 });
            this.tone({ freq: 659.25, type: 'triangle', dur: 0.12, vol: 0.3, delay: 0.1 });
            this.tone({ freq: 783.99, type: 'triangle', dur: 0.22, vol: 0.3, delay: 0.2 });
        });

        // Sector discovered — wide pad swell
        bus.on('sector:discovered', () => {
            this.tone({ freq: 261.63, type: 'sine', dur: 0.6, vol: 0.2 });
            this.tone({ freq: 329.63, type: 'sine', dur: 0.6, vol: 0.15, delay: 0.05 });
            this.tone({ freq: 392.0, type: 'sine', dur: 0.7, vol: 0.15, delay: 0.1 });
        });

        // Probe destroyed — muffled crack + static
        bus.on('probe:destroyed', () => {
            this.tone({ freq: 90, freqEnd: 40, type: 'sawtooth', dur: 0.3, vol: 0.4 });
            this.noise({ dur: 0.3, vol: 0.25, delay: 0.05 });
        });

        // Remnant / Dark Market arrival — eerie detuned shimmer
        bus.on('remnant:spawned', () => {
            this.tone({ freq: 440, type: 'sine', dur: 1.2, vol: 0.12 });
            this.tone({ freq: 446, type: 'sine', dur: 1.2, vol: 0.12 });
        });

        // Synthesis — shimmer to match the existing screen-shake animation
        bus.on('synthesis:triggered', () => {
            this.tone({ freq: 660, freqEnd: 1320, type: 'sine', dur: 0.4, vol: 0.2 });
            this.tone({ freq: 990, freqEnd: 1980, type: 'sine', dur: 0.4, vol: 0.12, delay: 0.08 });
        });

        // Errors/warnings — low pulse, rate-limited so it never nags
        bus.on('ui:message', (data) => {
            if (data?.type !== 'error' && data?.type !== 'warning') return;
            const now = Date.now();
            if (now - this.lastWarnTime < 2000) return;
            this.lastWarnTime = now;
            this.tone({ freq: 130, type: 'sine', dur: 0.25, vol: 0.25 });
        });

        // Time controls — tiny tick feedback
        bus.on('time:scaleChanged', () => {
            this.tone({ freq: 700, type: 'sine', dur: 0.04, vol: 0.15 });
        });
    }
}

window.SfxManager = SfxManager;
