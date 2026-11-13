/**
 * Word-mode charting (pure).
 *
 * In word mode only the space that ends each word is judged. Each word gets a number of grid
 * slots proportional to its length at the level's target speed, so short words get less time
 * than long ones and the player keeps a natural typing pace.
 *
 * Typing speed uses the standard definition: one "word" = 5 characters, so at `wpm` the player
 * types wpm × 5 characters per minute (the space counts as a character).
 */

/** Seconds a word of `chars` characters (including its space) should take at `wpm`. */
export function wordSeconds(chars: number, wpm: number): number {
  return (chars * 12) / wpm;
}

/**
 * How many grid slots a word gets: its ideal duration rounded to the nearest slot, at least one.
 * @param chars letters in the word plus its closing space
 * @param grid slots per beat
 */
export function wordSlots(chars: number, wpm: number, bpm: number, grid: number): number {
  const slotSec = 60 / bpm / grid;
  return Math.max(1, Math.round(wordSeconds(chars, wpm) / slotSec));
}

/** Characters from `start` up to and including the next space in `line` (lines end with a space). */
export function wordLengthAt(line: string, start: number): number {
  const sp = line.indexOf(' ', start);
  return (sp < 0 ? line.length : sp + 1) - start;
}
