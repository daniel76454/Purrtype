import { audio } from './engine.js';
import type { Grade } from '../core/types.js';

function blip(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slideTo?: number): void {
  if (!audio.ready) return;
  const c = audio.ctx;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.sfxBus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Small synthesised effects. All are no-ops until the audio engine is initialised. */
export const sfx = {
  /** Metronome / count-in tick scheduled at an exact audio time. */
  tick(time: number, accent: boolean): void {
    if (!audio.ready) return;
    const c = audio.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.value = accent ? 1500 : 1000;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.18, time + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    o.connect(g).connect(audio.sfxBus);
    o.start(time);
    o.stop(time + 0.08);
  },
  hit(grade: Grade, combo: number): void {
    if (grade === 'off') return blip(300, 0.05, 'sine', 0.05);
    const base = 520 + Math.min(combo, 30) * 12;
    blip(base, 0.09, 'triangle', grade === 'perfect' ? 0.16 : 0.1);
    if (grade === 'perfect') blip(base * 2, 0.12, 'sine', 0.06, 0.01);
  },
  miss(): void {
    blip(220, 0.22, 'sawtooth', 0.12, 0, 90);
  },
  click(): void {
    blip(660, 0.05, 'triangle', 0.1);
  },
  buy(): void {
    blip(660, 0.08, 'triangle', 0.14);
    blip(990, 0.14, 'triangle', 0.14, 0.07);
  },
  win(): void {
    [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.25, 'triangle', 0.14, i * 0.11));
  },
  /** A soft, calm purr: rumbly noise pulsing ~23 times a second. */
  purr(dur = 1.8): void {
    if (!audio.ready) return;
    const c = audio.ctx;
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = audio.noise;
    src.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 240;
    lp.Q.value = 0.8;
    const pulse = c.createGain();
    pulse.gain.value = 0.5;
    const lfo = c.createOscillator();
    lfo.type = 'triangle';
    lfo.frequency.setValueAtTime(23, t);
    lfo.frequency.linearRampToValueAtTime(20, t + dur);
    const depth = c.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(pulse.gain);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.5, t + 0.35);
    env.gain.setValueAtTime(0.5, t + dur - 0.6);
    env.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(lp).connect(pulse).connect(env).connect(audio.sfxBus);
    src.start(t, Math.random() * 0.5);
    lfo.start(t);
    src.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  },
  /** A small, soft "mew": a gliding voice through two formant filters. */
  meow(): void {
    if (!audio.ready) return;
    const c = audio.ctx;
    const t = c.currentTime;
    const base = 0.92 + Math.random() * 0.16;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(430 * base, t);
    o.frequency.linearRampToValueAtTime(720 * base, t + 0.14);
    o.frequency.linearRampToValueAtTime(470 * base, t + 0.5);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.09, t + 0.06);
    env.gain.setValueAtTime(0.09, t + 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    const mix = c.createGain();
    for (const [f, q] of [
      [900, 3],
      [1900, 5],
    ] as const) {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(f * 0.8, t);
      bp.frequency.linearRampToValueAtTime(f, t + 0.15);
      bp.Q.value = q;
      o.connect(bp).connect(mix);
    }
    const soft = c.createBiquadFilter();
    soft.type = 'lowpass';
    soft.frequency.value = 2600;
    mix.connect(soft).connect(env).connect(audio.sfxBus);
    o.start(t);
    o.stop(t + 0.6);
  },
  lose(): void {
    [392, 330, 262].forEach((f, i) => blip(f, 0.3, 'triangle', 0.12, i * 0.16));
  },
};
