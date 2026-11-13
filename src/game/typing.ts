export type KeyOutcome =
  | { kind: 'ignored' }
  | {
      kind: 'correct';
      char: string;
      line: number;
      index: number;
      /** This key finished a word (a space, or the last letter of the text). */
      wordDone: boolean;
      /** The word was already missed, so this key is typed "for free". */
      inMissedWord: boolean;
      lineDone: boolean;
      finished: boolean;
    }
  | { kind: 'wrong'; char: string; expected: string; line: number; index: number; firstMiss: boolean };

/**
 * Cursor and word-miss rules. No timing, no scoring.
 *  - Every line except the last ends with a space, so every word is finished by pressing space,
 *    except the very last word of the text. A word ends at its space, and the space belongs to it.
 *  - The first wrong key in a word marks the word as missed.
 *  - Wrong keys never advance the cursor; the player must type the correct key.
 */
export class TypingEngine {
  line = 0;
  index = 0;
  wordMissed = false;
  finished = false;
  typed = 0;

  /** The level's lines, each with its closing space. */
  readonly lines: string[];

  constructor(lines: string[]) {
    // every line but the last needs a closing space; the text itself ends on its last letter
    this.lines = lines.map((l, i) => (i === lines.length - 1 ? l.trimEnd() : l.endsWith(' ') ? l : `${l} `));
  }

  get total(): number {
    return this.lines.reduce((n, l) => n + l.length, 0);
  }

  get expected(): string {
    return this.finished ? '' : this.lines[this.line]![this.index]!;
  }

  /** Index (inclusive) of the last character of the word under the cursor. */
  wordEnd(): number {
    const s = this.lines[this.line] ?? '';
    let i = this.index;
    while (i < s.length - 1 && s[i] !== ' ') i++;
    return i;
  }

  handleKey(key: string): KeyOutcome {
    if (this.finished || key.length !== 1) return { kind: 'ignored' };
    const s = this.lines[this.line]!;
    const expected = s[this.index]!;
    const line = this.line;
    const index = this.index;

    if (key !== expected) {
      const firstMiss = !this.wordMissed;
      this.wordMissed = true;
      return { kind: 'wrong', char: key, expected, line, index, firstMiss };
    }

    const wordDone = key === ' ' || (line === this.lines.length - 1 && index === s.length - 1);
    const inMissedWord = this.wordMissed;
    if (wordDone) this.wordMissed = false;

    this.index++;
    this.typed++;
    const lineDone = this.index >= s.length;
    if (lineDone) {
      this.line++;
      this.index = 0;
      if (this.line >= this.lines.length) this.finished = true;
    }
    return { kind: 'correct', char: key, line, index, wordDone, inMissedWord, lineDone, finished: this.finished };
  }
}
