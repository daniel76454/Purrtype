import { audio } from './engine.js';
import { sfx } from './sfx.js';
import { store } from '../core/storage.js';
import { LAYERS, type Layer } from '../core/types.js';
import type { MusicDef, SectionDef } from '../data/sections.js';

/** Base mix level of each stem. */
const LAYER_BASE: Record<Layer, number> = { melody: 0.55, pad: 0.32, bass: 0.7, drums: 0.6 };
const LOOKAHEAD = 0.25; // seconds scheduled ahead
const PUMP_MS = 25;

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function degreeToMidi(m: MusicDef, deg: number): number {
  const n = m.scale.length;
  const oct = Math.floor(deg / n);
  const i = ((deg % n) + n) % n;
  return m.rootMidi + m.scale[i]! + 12 * oct;
}

/**
 * Plays the section's music as four synced stems and exposes the beat clock.
 * Stems are either real audio files (`music.stems`) or a procedural placeholder.
 * Every stem always plays; layers are muted/unmuted with gains so they never drift apart.
 */
export class MusicDirector {
  bpm = 80;
  /** Audio-clock time of beat 0. */
  startTime = 0;
  running = false;

  private gains = {} as Record<Layer, GainNode>;
  private out!: GainNode;
  private timer = 0;
  private stepTime = 0;
  private step = 0;
  private section!: SectionDef;
  private melody: (number | null)[][] = [];
  private sources: AudioBufferSourceNode[] = [];
  private crackle: AudioBuffer | null = null;

  /** Two seconds of sparse vinyl pops over a faint hiss (made once, then looped). */
  private crackleBuffer(): AudioBuffer {
    if (this.crackle) return this.crackle;
    const c = audio.ctx;
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    const rnd = mulberry32(99);
    let lp = 0;
    for (let i = 0; i < d.length; i++) {
      lp += ((rnd() * 2 - 1) - lp) * 0.08;
      d[i] = lp * 0.05;
      if (rnd() < 0.0004) {
        const amp = 0.15 + rnd() * 0.35;
        const len = 20 + Math.floor(rnd() * 60);
        for (let k = 0; k < len && i + k < d.length; k++) d[i + k]! += (rnd() * 2 - 1) * amp * (1 - k / len);
      }
    }
    this.crackle = buf;
    return buf;
  }

  get secondsPerBeat(): number {
    return 60 / this.bpm;
  }

  /** Fractional beat the player is currently hearing. Beat 0 = first note. */
  currentBeat(): number {
    return (audio.heardTime() - this.startTime) / this.secondsPerBeat;
  }

  async start(section: SectionDef, leadIn = 0.3): Promise<void> {
    await audio.resume();
    this.stop(0);
    this.section = section;
    this.bpm = section.bpm;
    const c = audio.ctx;

    // Lofi treatment: everything goes through a warm low-pass, with a quiet vinyl crackle on top.
    this.out = c.createGain();
    const warm = c.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = 3200;
    warm.Q.value = 0.5;
    this.out.connect(warm).connect(audio.musicBus);
    const crackle = c.createBufferSource();
    crackle.buffer = this.crackleBuffer();
    crackle.loop = true;
    const cg = c.createGain();
    cg.gain.value = 0.22;
    crackle.connect(cg).connect(this.out);
    crackle.start();
    this.sources.push(crackle);
    for (const l of LAYERS) {
      const g = c.createGain();
      g.gain.value = LAYER_BASE[l];
      g.connect(this.out);
      this.gains[l] = g;
    }

    const stems = section.music.stems;
    if (stems && Object.keys(stems).length) await this.loadStems(stems);
    else this.buildMelody(section.music);

    this.startTime = c.currentTime + leadIn;
    this.running = true;

    if (stems && Object.keys(stems).length) {
      for (const s of this.sources) if (s.buffer !== this.crackle) s.start(this.startTime);
      // Metronome / count-in still comes from the scheduler below.
    }
    this.step = 0;
    this.stepTime = this.startTime;
    this.timer = window.setInterval(() => this.pump(), PUMP_MS);
    this.pump();
  }

  /** Set stem gains (0..1 of each stem's base level). `fade` is the approximate transition time. */
  setLayers(levels: Record<Layer, number>, fade = 0.3): void {
    if (!audio.ready || !this.running) return;
    const t = audio.ctx.currentTime;
    for (const l of LAYERS) this.gains[l].gain.setTargetAtTime(levels[l] * LAYER_BASE[l], t, fade / 3);
  }

  stop(fade = 0.6): void {
    clearInterval(this.timer);
    this.timer = 0;
    this.running = false;
    if (!audio.ready || !this.out) return;
    const out = this.out;
    const srcs = this.sources;
    this.sources = [];
    out.gain.setTargetAtTime(0, audio.ctx.currentTime, Math.max(0.005, fade / 3));
    window.setTimeout(() => {
      srcs.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      });
      out.disconnect();
    }, fade * 1000 + 300);
  }

  // ---- scheduling ----------------------------------------------------------
  private pump(): void {
    const c = audio.ctx;
    while (this.stepTime < c.currentTime + LOOKAHEAD) {
      this.scheduleStep(this.step, this.stepTime);
      this.stepTime += this.secondsPerBeat / 4;
      this.step++;
    }
  }

  private scheduleStep(i: number, t: number): void {
    const m = this.section.music;
    const bar = Math.floor(i / 16);
    const s = i % 16;
    const beat = Math.floor(i / 4);

    // Count-in (first bar) and optional metronome.
    if (s % 4 === 0 && (beat < 4 || store.data.settings.metronome)) sfx.tick(t, s === 0);

    if (this.section.music.stems && Object.keys(this.section.music.stems).length) return;

    const chordDeg = m.progression[bar % m.progression.length]!;
    const spb = this.secondsPerBeat;

    // drums
    if (s === 0 || s === 8 || (s === 10 && bar % 2 === 1)) this.kick(t, s === 0 ? 0.9 : 0.7);
    if (s === 4 || s === 12) this.snare(t);
    if (s % 2 === 0) this.hat(t, (s % 4 === 0 ? 0.55 : 0.85) * (0.8 + 0.2 * Math.random()));

    // bass
    const bassRoot = degreeToMidi(m, chordDeg) - 24;
    if (s === 0) this.bass(t, bassRoot, spb * 1.4);
    if (s === 6) this.bass(t, bassRoot, spb * 0.8, 0.7);
    if (s === 10) this.bass(t, degreeToMidi(m, chordDeg + 4) - 24, spb * 0.9, 0.8);

    // pad
    if (s === 0) {
      const notes = [chordDeg, chordDeg + 2, chordDeg + 4, chordDeg + 6].map((d) => degreeToMidi(m, d));
      this.pad(t, notes, spb * 4);
    }

    // melody
    const note = this.melody[bar % this.melody.length]?.[s];
    if (note !== null && note !== undefined) this.pluck(t, degreeToMidi(m, note) + 12, spb * 1.2);
  }

  private buildMelody(m: MusicDef): void {
    const rnd = mulberry32(m.seed);
    this.melody = [];
    let prev = m.progression[0]! + 2;
    for (const chord of m.progression) {
      const tones = [chord, chord + 2, chord + 4, chord + 7];
      const bar: (number | null)[] = new Array(16).fill(null);
      for (let s = 0; s < 16; s += 2) {
        const strong = s % 4 === 0;
        if (rnd() > (strong ? 0.85 : 0.45)) continue;
        let d: number;
        if (s === 0) d = tones[Math.floor(rnd() * 3)]!;
        else if (rnd() < 0.6) d = prev + (rnd() < 0.5 ? -1 : 1);
        else d = tones[Math.floor(rnd() * tones.length)]!;
        d = Math.max(0, Math.min(9, d));
        bar[s] = d;
        prev = d;
      }
      this.melody.push(bar);
    }
  }

  private async loadStems(stems: Partial<Record<Layer, string>>): Promise<void> {
    const c = audio.ctx;
    await Promise.all(
      (Object.entries(stems) as [Layer, string][]).map(async ([layer, url]) => {
        const res = await fetch(url);
        const buf = await c.decodeAudioData(await res.arrayBuffer());
        const src = c.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(this.gains[layer]);
        this.sources.push(src);
      }),
    );
  }

  // ---- placeholder instruments --------------------------------------------
  private env(g: GainNode, t: number, peak: number, attack: number, dur: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private kick(t: number, v: number): void {
    const c = audio.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    this.env(g, t, v * 0.9, 0.006, 0.32);
    o.connect(g).connect(this.gains.drums);
    o.start(t);
    o.stop(t + 0.35);
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, vol: number, dur: number): void {
    const c = audio.ctx;
    const src = c.createBufferSource();
    src.buffer = audio.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    this.env(g, t, vol, 0.002, dur);
    src.connect(f).connect(g).connect(this.gains.drums);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  /** A soft, dusty snare: band-passed noise with a lazy tail. */
  private snare(t: number): void {
    this.noiseHit(t, 'bandpass', 1300, 0.3, 0.2);
  }

  private hat(t: number, v: number): void {
    this.noiseHit(t, 'highpass', 6500, 0.09 * v, 0.035);
  }

  private bass(t: number, midi: number, dur: number, v = 1): void {
    const c = audio.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.value = mtof(midi);
    this.env(g, t, 0.55 * v, 0.015, dur);
    o.connect(g).connect(this.gains.bass);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private pad(t: number, midis: number[], dur: number): void {
    const c = audio.ctx;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const trem = c.createGain();
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = 4.2;
    depth.gain.value = 0.25;
    trem.gain.value = 0.75;
    lfo.connect(depth).connect(trem.gain);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
    f.connect(g).connect(trem).connect(this.gains.pad);
    for (const m of midis) {
      for (const det of [-4, 4]) {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = mtof(m);
        o.detune.value = det;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    }
  }

  /** Soft keys pluck. */
  private pluck(t: number, midi: number, dur: number): void {
    const c = audio.ctx;
    const g = c.createGain();
    this.env(g, t, 0.4, 0.006, dur);
    g.connect(this.gains.melody);
    for (const [mult, type, vol] of [
      [1, 'sine', 1],
      [2, 'triangle', 0.25],
    ] as [number, OscillatorType, number][]) {
      const o = c.createOscillator();
      const og = c.createGain();
      og.gain.value = vol;
      o.type = type;
      o.frequency.value = mtof(midi) * mult;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }
}
