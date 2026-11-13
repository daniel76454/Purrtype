/**
 * Tap-along latency calibration (pure).
 *
 * The player taps along to clicks they can hear. Each tap is paired with the nearest click, and
 * the median difference is how late (positive) or early (negative) they hear and react on this
 * device. That becomes the audio offset subtracted from key times during play.
 */
export interface Calibration {
  /** Suggested audio offset in ms, rounded to 5 ms. */
  offsetMs: number;
  /** Middle-half spread of the taps in ms: a rough "how steady were you". */
  spreadMs: number;
  taps: number;
}

export const CALIBRATION_MIN_TAPS = 6;
export const CALIBRATION_MAX_MS = 250;

/**
 * @param taps tap times (seconds, audio clock)
 * @param clicks click times (seconds, audio clock), evenly spaced
 * @returns null when there aren't enough usable taps
 */
export function calibrationOffset(taps: number[], clicks: number[]): Calibration | null {
  if (clicks.length < 2) return null;
  const interval = clicks[1]! - clicks[0]!;
  const deltas: number[] = [];
  for (const t of taps) {
    let best = Infinity;
    for (const c of clicks) if (Math.abs(t - c) < Math.abs(best)) best = t - c;
    // ignore stray taps that weren't really aimed at a click
    if (Math.abs(best) <= interval * 0.4) deltas.push(best * 1000);
  }
  if (deltas.length < CALIBRATION_MIN_TAPS) return null;
  deltas.sort((a, b) => a - b);
  const q = (f: number) => deltas[Math.min(deltas.length - 1, Math.floor(f * deltas.length))]!;
  const n = deltas.length;
  const median = n % 2 ? deltas[(n - 1) / 2]! : (deltas[n / 2 - 1]! + deltas[n / 2]!) / 2;
  const offsetMs = Math.max(-CALIBRATION_MAX_MS, Math.min(CALIBRATION_MAX_MS, Math.round(median / 5) * 5));
  return { offsetMs, spreadMs: Math.round(q(0.75) - q(0.25)), taps: deltas.length };
}
