import { store } from '../core/storage.js';

/** Owns the AudioContext and the three buses: master → (music, sfx). */
class AudioEngine {
  ctx!: AudioContext;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  noise!: AudioBuffer;
  ready = false;

  /** Must be called from a user gesture the first time. */
  init(): void {
    if (this.ready) return;
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    this.ready = true;
    this.applySettings();
  }

  async resume(): Promise<void> {
    this.init();
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  /** Call after any volume setting changes. Volumes are squared for a more natural slider feel. */
  applySettings(): void {
    if (!this.ready) return;
    const s = store.data.settings;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.master ** 2, t, 0.02);
    this.musicBus.gain.setTargetAtTime(s.music ** 2, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(s.sfx ** 2, t, 0.02);
  }

  /** The audio-clock time the player is hearing *right now* (accounts for output latency where supported). */
  heardTime(): number {
    // The output timestamp only updates every audio callback, so extrapolate to "now" the same
    // way keyTimeToCtx does; otherwise visuals lag the judge by up to one callback.
    const ts = this.ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime && ts.performanceTime && this.ctx.state === 'running') {
      return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    }
    return ts && ts.contextTime ? ts.contextTime : this.ctx.currentTime;
  }

  /** Convert a keyboard event's timestamp to audio-clock time. */
  keyTimeToCtx(ev: KeyboardEvent): number {
    const ts = this.ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime && ts.performanceTime) {
      return ts.contextTime + (ev.timeStamp - ts.performanceTime) / 1000;
    }
    return this.ctx.currentTime;
  }
}

export const audio = new AudioEngine();
