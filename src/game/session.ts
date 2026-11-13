import { Emitter } from '../core/events.js';
import type { Grade, Layer } from '../core/types.js';
import type { LevelDef, SectionDef } from '../data/sections.js';
import { judgeTiming, timingWindows } from './beat.js';
import { wordLengthAt, wordSlots } from './chart.js';
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
  /**
   * `grade` is null for a wrong key, 'skipped' inside a missed word, and 'free' for an untimed
   * letter in word mode. `slot` is the judged grid slot (null when the key was not timed).
   */
  typed: { outcome: KeyOutcome; grade: Grade | 'skipped' | 'free' | null; points: number; deltaMs: number; slot: number | null };
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
  /** Word mode: the grid slot the current word started from, and the slot its space is due on. */
  anchorSlot = 0;
  dueSlot = 0;

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
    if (this.wordMode) {
      this.anchorSlot = COUNT_IN_BEATS * level.grid;
      this.dueSlot = this.anchorSlot + this.slotsForWordAt(0, 0);
    }
  }

  /** Word mode: only the space after each word is timed (see chart.ts). */
  get wordMode(): boolean {
    return this.level.mode === 'words';
  }

  /** Word mode: the beat the current word started from and the beat its space is due on. */
  get wordWindow(): { from: number; due: number } {
    return { from: this.anchorSlot / this.level.grid, due: this.dueSlot / this.level.grid };
  }

  private slotsForWordAt(line: number, index: number): number {
    const text = this.engine.lines[line] ?? '';
    return wordSlots(wordLengthAt(text, index), this.level.wpm ?? 30, this.section.bpm, this.level.grid);
  }

  /** Word mode: start the next word's timer from the slot nearest to when this space was pressed. */
  private resync(t: number): void {
    const interval = 60 / this.section.bpm / this.level.grid;
    this.anchorSlot = Math.round((t - this.startTime) / interval);
    if (!this.engine.finished) this.dueSlot = this.anchorSlot + this.slotsForWordAt(this.engine.line, this.engine.index);
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

    const t = audioTime - this.offsetSec;
    if (outcome.inMissedWord) {
      this.emit('typed', { outcome, grade: 'skipped', points: 0, deltaMs: 0, slot: null });
      if (this.wordMode && outcome.wordDone) this.resync(t);
    } else if (this.wordMode && !outcome.wordDone) {
      this.emit('typed', { outcome, grade: 'free', points: 0, deltaMs: 0, slot: null });
    } else if (this.wordMode) {
      // the space: judge it against when it was due, scored by the length of the word
      const { interval, goodMs, perfectMs } = timingWindows(this.section.bpm, this.level.grid, this.level.windowMs);
      const deltaMs = (t - (this.startTime + this.dueSlot * interval)) * 1000;
      const a = Math.abs(deltaMs);
      const grade: Grade = a <= perfectMs ? 'perfect' : a <= goodMs ? 'good' : 'off';
      const letters = Math.max(1, outcome.index - this.wordStart(outcome.line, outcome.index));
      this.counts[grade]++;
      const onBeat = grade !== 'off';
      const points = Math.round(BASE_POINTS[grade] * letters * (onBeat ? this.multiplier : 1));
      this.score += points;
      if (onBeat) this.registerOnBeat();
      const slot = this.dueSlot;
      this.resync(t);
      this.emit('typed', { outcome, grade, points, deltaMs, slot });
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

  /** Index of the first letter of the word whose space is at `spaceIndex`. */
  private wordStart(line: number, spaceIndex: number): number {
    const text = this.engine.lines[line] ?? '';
    const prev = text.lastIndexOf(' ', spaceIndex - 1);
    return prev + 1;
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
