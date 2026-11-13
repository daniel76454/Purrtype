import { QUOTES } from '../data/quotes.js';

/**
 * Practice mode (pure): free typing with no rhythm and no hearts, like a typing race: one famous
 * public-domain passage (fantasy, sci-fi and classics), or a ~80-word cozy story.
 *
 *  - Mistakes must be fixed with Backspace before you can move on (Ctrl+Backspace deletes a word).
 *  - A word typed with no mistakes adds to the combo; the first mistake in a word resets it.
 *  - At the end: WPM, accuracy and a score that rewards both (see practiceScore).
 */

// ---- text ------------------------------------------------------------------------------
const SENTENCES = [
  'The rain taps softly on the window.',
  'Mochi curls up on the warm windowsill.',
  'A cup of tea is cooling on the desk.',
  'The lamp hums, and the room glows orange.',
  'Somewhere outside, a car drives slowly past.',
  'Mochi watches a moth dance near the light.',
  'Her tail flicks once, then twice.',
  'The radio plays a quiet, dusty song.',
  'Books lean against each other on the shelf.',
  'A blanket hangs over the back of the chair.',
  'The clock ticks, but nobody is in a hurry.',
  'Little paws pad across the wooden floor.',
  'The plant by the window has a new leaf.',
  'Mochi finds a ball of yarn under the bed.',
  'She bats it once and it rolls away.',
  'The city lights blink like sleepy stars.',
  'A train hums far away in the dark.',
  'The kettle clicks off with a tiny sigh.',
  'Steam curls up from the mug like a ribbon.',
  'Mochi yawns and stretches every toe.',
  'The keyboard clicks in a gentle rhythm.',
  'Words appear on the screen, one by one.',
  'A soft breeze moves the curtains.',
  'The moon peeks out from behind a cloud.',
  'Mochi purrs, a low and happy rumble.',
  'Her whiskers twitch at a sound in the hall.',
  'It was only the fridge, humming to itself.',
  'The fairy lights glow pink and gold.',
  'A notebook lies open, full of little drawings.',
  'Mochi sits on the notebook, of course.',
  'Nothing is more important than a nap.',
  'The night is long, quiet, and kind.',
  'Rain makes the street shine like glass.',
  'A neighbor waters plants on a dark balcony.',
  'Mochi blinks slowly, which means she trusts you.',
  'The music loops, and nobody minds.',
  'Somewhere, a dog barks once and goes to sleep.',
  'The heater ticks as it warms the room.',
  'A paper crane sits on top of the monitor.',
  'Mochi tries to catch the cursor on the screen.',
  'She misses, but she looks very proud anyway.',
  'Outside, the first bird of morning is practicing.',
  'Just one more page, and then off to bed.',
  'The tea is cold now, but that is fine.',
];

const MAX_LINE = 42;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Split text into short lines (the engine works line by line; the screen shows it as a paragraph). */
function wrap(words: string[]): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > MAX_LINE) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Pick whole passages, in shuffled order, until the text is about `target` words long.
 * Passages that would overshoot `max` are skipped.
 */
function pick<T>(items: T[], words: (t: T) => number, rnd: () => number, target: number, max: number): T[] {
  const chosen: T[] = [];
  let count = 0;
  for (const it of shuffle(items, rnd)) {
    if (count >= target) break;
    const n = words(it);
    if (count + n > max) continue;
    chosen.push(it);
    count += n;
  }
  return chosen;
}

const wordCount = (s: string) => s.split(' ').length;

/** A shuffled little cozy story of about `words` words. */
export function generatePractice(seed: number, words = 80): string[] {
  const rnd = mulberry32(seed);
  return wrap(pick(SENTENCES, wordCount, rnd, words, words + 15).join(' ').split(' '));
}

export interface PracticeText {
  kind: 'story' | 'quotes';
  lines: string[];
  /** Where the quotes come from, in order (quotes only). */
  sources: string[];
}

/** Shortest passage worth a practice run. */
export const MIN_PASSAGE_WORDS = 25;

/** A practice text: usually one famous public-domain passage (it ends where it ends), sometimes a cozy story. */
export function practiceText(seed: number, words = 80): PracticeText {
  const rnd = mulberry32(seed);
  const passages = QUOTES.filter((q) => wordCount(q.text) >= MIN_PASSAGE_WORDS);
  if (rnd() < 0.25 || !passages.length) return { kind: 'story', lines: generatePractice(seed + 1, words), sources: [] };
  const q = passages[Math.floor(rnd() * passages.length)]!;
  return { kind: 'quotes', lines: wrap(q.text.split(' ')), sources: [q.source] };
}

// ---- scoring ---------------------------------------------------------------------------
/** Overall score: speed, weighted hard by accuracy (90% accuracy keeps ~73% of the points). */
export function practiceScore(wpm: number, accuracy: number): number {
  return Math.round(wpm * accuracy ** 3 * 10);
}

export interface PracticeResult {
  wpm: number;
  accuracy: number; // 0..1
  seconds: number;
  words: number;
  errors: number;
  maxCombo: number;
  score: number;
}

export type PracticeEvent =
  | { kind: 'ignored' }
  | { kind: 'typed'; correct: boolean; firstErrorInWord: boolean }
  | { kind: 'word'; clean: boolean }
  | { kind: 'deleted' };

/** Most wrong characters you can pile up before you have to fix them. */
export const MAX_ERRORS = 8;

export class PracticeEngine {
  readonly lines: string[];
  line = 0;
  /** What's typed on the current line (may include wrong characters at the end). */
  typed = '';
  /** Can't delete back past this index: the end of the last word completed correctly. */
  locked = 0;
  finished = false;
  combo = 0;
  maxCombo = 0;
  keystrokes = 0;
  correctKeystrokes = 0;
  errors = 0;
  wordsDone = 0;
  startTime: number | null = null;
  endTime: number | null = null;
  private wordDirty = false;

  constructor(lines: string[]) {
    // every word is finished with a space, except the very last word of the text
    this.lines = lines.map((l, i) => (i === lines.length - 1 ? l.trimEnd() : l.endsWith(' ') ? l : `${l} `));
  }

  get target(): string {
    return this.lines[this.line] ?? '';
  }

  /** Length of the correct prefix of what's typed on this line. */
  get correctLength(): number {
    const t = this.target;
    let i = 0;
    while (i < this.typed.length && this.typed[i] === t[i]) i++;
    return i;
  }

  get hasErrors(): boolean {
    return this.correctLength < this.typed.length;
  }

  get totalWords(): number {
    return this.lines.reduce((n, l) => n + l.trim().split(/\s+/).length, 0);
  }

  /** @param now ms timestamp of the key press */
  key(ch: string, now: number): PracticeEvent {
    if (this.finished || ch.length !== 1) return { kind: 'ignored' };
    const t = this.target;
    if (this.typed.length >= t.length) return { kind: 'ignored' };
    if (this.typed.length - this.correctLength >= MAX_ERRORS) return { kind: 'ignored' };
    this.startTime ??= now;
    const ok = !this.hasErrors && t[this.typed.length] === ch;
    this.typed += ch;
    this.keystrokes++;
    if (!ok) {
      this.errors++;
      const first = !this.wordDirty;
      this.wordDirty = true;
      this.combo = 0;
      return { kind: 'typed', correct: false, firstErrorInWord: first };
    }
    this.correctKeystrokes++;
    const lastLetter = this.line === this.lines.length - 1 && this.typed === t;
    if (ch !== ' ' && !lastLetter) return { kind: 'typed', correct: true, firstErrorInWord: false };

    // a correct space (or the text's final letter) completes a word
    const clean = !this.wordDirty;
    this.wordDirty = false;
    this.wordsDone++;
    this.locked = this.typed.length;
    if (clean) {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
    }
    if (this.typed === t) {
      this.line++;
      this.typed = '';
      this.locked = 0;
      if (this.line >= this.lines.length) {
        this.finished = true;
        this.endTime = now;
      }
    }
    return { kind: 'word', clean };
  }

  /** Delete one character, or back to the start of the word with `word`. */
  backspace(word = false): PracticeEvent {
    if (this.finished || this.typed.length <= this.locked) return { kind: 'ignored' };
    if (!word) this.typed = this.typed.slice(0, -1);
    else {
      let i = this.typed.length;
      while (i > this.locked && this.typed[i - 1] === ' ') i--;
      while (i > this.locked && this.typed[i - 1] !== ' ') i--;
      this.typed = this.typed.slice(0, i);
    }
    return { kind: 'deleted' };
  }

  /** Live words per minute (1 word = 5 characters typed correctly). */
  wpm(now: number): number {
    if (this.startTime === null) return 0;
    const mins = Math.max(1 / 60, ((this.endTime ?? now) - this.startTime) / 60000);
    const done = this.lines.slice(0, this.line).reduce((n, l) => n + l.length, 0) + this.correctLength;
    return done / 5 / mins;
  }

  get accuracy(): number {
    return this.keystrokes ? this.correctKeystrokes / this.keystrokes : 1;
  }

  result(): PracticeResult {
    const end = this.endTime ?? this.startTime ?? 0;
    const wpm = Math.round(this.wpm(end));
    const accuracy = this.accuracy;
    return {
      wpm,
      accuracy,
      seconds: Math.round((end - (this.startTime ?? end)) / 1000),
      words: this.wordsDone,
      errors: this.errors,
      maxCombo: this.maxCombo,
      score: practiceScore(wpm, accuracy),
    };
  }
}
