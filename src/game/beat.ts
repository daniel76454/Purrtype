import type { Grade } from '../core/types.js';

export interface Judgement {
  grade: Grade;
  /** Signed offset from the nearest slot in ms. Negative = early, positive = late. */
  deltaMs: number;
  /** Index of the nearest grid slot. */
  slot: number;
}

export interface TimingWindows {
  /** Seconds between judged slots. */
  interval: number;
  /** Half-width of the "good" window in ms. */
  goodMs: number;
  /** Half-width of the "perfect" window in ms. */
  perfectMs: number;
}

/**
 * The windows a level is judged with.
 * The good window never exceeds 30% of the slot interval, so faster grids stay meaningful.
 */
export function timingWindows(bpm: number, grid: number, windowMs: number): TimingWindows {
  const interval = 60 / bpm / grid;
  const goodMs = Math.min(windowMs, interval * 1000 * 0.3);
  return { interval, goodMs, perfectMs: goodMs * 0.5 };
}

/** Compare a key time (audio-clock seconds) with the nearest grid slot. */
export function judgeTiming(
  timeSec: number,
  startTime: number,
  bpm: number,
  grid: number,
  windowMs: number,
): Judgement {
  const { interval, goodMs, perfectMs } = timingWindows(bpm, grid, windowMs);
  const slot = Math.round((timeSec - startTime) / interval);
  const deltaMs = (timeSec - startTime - slot * interval) * 1000;
  const a = Math.abs(deltaMs);
  const grade: Grade = a <= perfectMs ? 'perfect' : a <= goodMs ? 'good' : 'off';
  return { grade, deltaMs, slot };
}
