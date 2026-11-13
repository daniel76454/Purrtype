import { Emitter } from '../core/events.js';
import type { Grade, Layer } from '../core/types.js';
import type { LevelDef, SectionDef } from '../data/sections.js';
import { judgeTiming } from './beat.js';
import { TypingEngine, type KeyOutcome } from './typing.js';

// ---- Tunables ---------------------------------------------------------------
export const HEARTS = 5;
export const RECOVER_BASS = 4; // on-beat keys after a miss before the bass returns
export const RECOVER_FULL = 8; // ...before everything returns
export const COUNT_IN_BEATS = 4;
export const BASE_POINTS: Record<Grade, number> = { perfect: 100, good: 60, off: 20 };
export const YARN_PER_SCORE = 1 / 200;
export const FAIL_YARN_FACTOR = 0.5;
export const STAR_2_RATIO = 0.65; // share of keys that must be on-beat
export const STAR_3_RATIO = 0.85;
export const STAR_3_MIN_HEARTS = 4;
// -----------------------------------------------------------------------------

export interface LevelResult {
  levelId: string;
  completed: boolean;
  score: number;
  maxCombo: number;
  perfect: number;
  good: number;
  off: number;
  wordsMissed: number;
  heartsLeft: number;
  onBeatRatio: number;
  stars: number;
  yarn: number;
}

export interface SessionEvents {
  /** `slot` is the judged grid slot (null when the key was not timed). */
  typed: { outcome: KeyOutcome; grade: Grade | 'skipped' | null; points: number; deltaMs: number; slot: number | null };
  combo: { combo: number; multiplier: number };
  miss: { hearts: number };
  /** Music layer targets changed. `fast` = drop quickly (a miss), otherwise ease back in. */
  music: { layers: Record<Layer, number>; fast: boolean };
  recovered: void;
  finished: LevelResult;
}

export class GameSession extends Emitter<SessionEvents> {
  readonly engine: TypingEngine;
  hearts = HEARTS;
  score = 0;
  combo = 0;
  maxCombo = 0;
  comboSinceMiss = 0;
  recovering = false;
  over = false;
  private counts = { perfect: 0, good: 0, off: 0 };
  private wordsMissed = 0;

  /**
   * @param startTime audio-clock time of beat 0 (the grid origin)
   * @param offsetSec latency compensation subtracted from key times
   */
  constructor(
    readonly level: LevelDef,
    readonly section: SectionDef,
    readonly startTime: number,
    readonly offsetSec = 0,
  ) {
    super();
    this.engine = new TypingEngine(level.lines);
  }

  get multiplier(): number {
    return 1 + Math.min(6, Math.floor(this.combo / 10)) * 0.5;
  }

  /** True while the current word was already missed (wrong keys are free until the word ends). */
  get invulnerable(): boolean {
    return this.engine.wordMissed;
  }

  /** Target gain (0..1) for each music stem given the current recovery state. */
  layers(): Record<Layer, number> {
    if (!this.recovering) return { melody: 1, pad: 1, bass: 1, drums: 1 };
    const s = this.comboSinceMiss;
    return {
      melody: 1,
      bass: s >= RECOVER_BASS ? 1 : 0,
      pad: s >= RECOVER_FULL ? 1 : 0,
      drums: s >= RECOVER_FULL ? 1 : 0,
    };
  }

  /** @param audioTime the key time in audio-clock seconds */
  handleKey(key: string, audioTime: number): void {
    if (this.over) return;
    const outcome = this.engine.handleKey(key);
    if (outcome.kind === 'ignored') return;

    if (outcome.kind === 'wrong') {
      if (outcome.firstMiss) this.registerMiss();
      this.emit('typed', { outcome, grade: null, points: 0, deltaMs: 0, slot: null });
      return;
    }

    if (outcome.inMissedWord) {
      this.emit('typed', { outcome, grade: 'skipped', points: 0, deltaMs: 0, slot: null });
    } else {
      const j = judgeTiming(audioTime - this.offsetSec, this.startTime, this.section.bpm, this.level.grid, this.level.windowMs);
      this.counts[j.grade]++;
      const onBeat = j.grade !== 'off';
      const points = Math.round(BASE_POINTS[j.grade] * (onBeat ? this.multiplier : 1));
      this.score += points;
      if (onBeat) this.registerOnBeat();
      this.emit('typed', { outcome, grade: j.grade, points, deltaMs: j.deltaMs, slot: j.slot });
    }

    if (outcome.finished) this.finish(true);
  }

  private registerOnBeat(): void {
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.emit('combo', { combo: this.combo, multiplier: this.multiplier });
    if (!this.recovering) return;
    this.comboSinceMiss++;
    if (this.comboSinceMiss === RECOVER_BASS) {
      this.emit('music', { layers: this.layers(), fast: false });
    } else if (this.comboSinceMiss >= RECOVER_FULL) {
      this.recovering = false;
      this.emit('music', { layers: this.layers(), fast: false });
      this.emit('recovered');
    }
  }

  private registerMiss(): void {
    this.hearts--;
    this.wordsMissed++;
    this.combo = 0;
    this.comboSinceMiss = 0;
    this.recovering = true;
    this.emit('combo', { combo: 0, multiplier: this.multiplier });
    this.emit('miss', { hearts: this.hearts });
    this.emit('music', { layers: this.layers(), fast: true });
    if (this.hearts <= 0) this.finish(false);
  }

  private finish(completed: boolean): void {
    if (this.over) return;
    this.over = true;
    const { perfect, good, off } = this.counts;
    const total = perfect + good + off;
    const onBeatRatio = total ? (perfect + good) / total : 0;
    let stars = 0;
    if (completed) {
      stars = 1;
      if (onBeatRatio >= STAR_2_RATIO) stars = 2;
      if (onBeatRatio >= STAR_3_RATIO && this.hearts >= STAR_3_MIN_HEARTS) stars = 3;
    }
    const yarn = Math.round(this.score * YARN_PER_SCORE * (completed ? 1 : FAIL_YARN_FACTOR));
    this.emit('finished', {
      levelId: this.level.id,
      completed,
      score: this.score,
      maxCombo: this.maxCombo,
      perfect,
      good,
      off,
      wordsMissed: this.wordsMissed,
      heartsLeft: Math.max(0, this.hearts),
      onBeatRatio,
      stars,
      yarn,
    });
  }
}
