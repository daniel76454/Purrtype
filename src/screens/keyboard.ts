import { h } from '../core/dom.js';

/**
 * A compact on-screen keyboard: highlights the next key, softly tints keys by the finger that
 * usually presses them, and marks the F and J bumps. It's a suggestion, not a rule.
 */

/** Finger index 0..7: left pinky → right pinky. */
const ROWS: [string, number][][] = [
  [['q', 0], ['w', 1], ['e', 2], ['r', 3], ['t', 3], ['y', 4], ['u', 4], ['i', 5], ['o', 6], ['p', 7]],
  [['a', 0], ['s', 1], ['d', 2], ['f', 3], ['g', 3], ['h', 4], ['j', 4], ['k', 5], ['l', 6], [';', 7], ["'", 7]],
  [['⇧L', 0], ['z', 0], ['x', 1], ['c', 2], ['v', 3], ['b', 3], ['n', 4], ['m', 4], [',', 5], ['.', 6], ['/', 7], ['⇧R', 7]],
];

/** Characters typed with Shift on a US layout, mapped to their base key. */
const SHIFTED: Record<string, string> = { '?': '/', ':': ';', '"': "'", '<': ',', '>': '.' };

export class KeyboardGuide {
  readonly el: HTMLElement;
  private keys = new Map<string, HTMLElement>();
  private lit: HTMLElement[] = [];
  private backspace: HTMLElement;

  constructor() {
    this.backspace = h('span', { class: 'kb-key wide f7', text: '⌫' });
    const rows = ROWS.map((row, r) =>
      h(
        'div',
        { class: `kb-row r${r}` },
        ...row.map(([k, finger]) => {
          const shift = k.startsWith('⇧');
          const el = h('span', { class: `kb-key f${finger}${shift ? ' wide' : ''}${k === 'f' || k === 'j' ? ' bump' : ''}`, text: shift ? 'shift' : k });
          this.keys.set(k, el);
          return el;
        }),
      ),
    );
    const space = h('span', { class: 'kb-key space', text: 'space' });
    this.keys.set(' ', space);
    rows[0]!.append(this.backspace);
    this.el = h('div', { class: 'kb', attrs: { 'aria-hidden': 'true' } }, ...rows, h('div', { class: 'kb-row' }, space));
  }

  /** Highlight the key (and Shift, for capitals) needed for `ch`; '\b' highlights Backspace. */
  show(ch: string): void {
    this.lit.forEach((k) => k.classList.remove('next'));
    this.lit = [];
    if (!ch) return;
    if (ch === '\b') {
      this.backspace.classList.add('next');
      this.lit.push(this.backspace);
      return;
    }
    let base = ch.toLowerCase();
    let shift = ch !== base;
    if (SHIFTED[ch]) {
      base = SHIFTED[ch]!;
      shift = true;
    }
    const key = this.keys.get(base);
    if (!key) return; // e.g. '!' lives on the number row, which isn't drawn
    this.lit.push(key);
    if (shift) {
      // the opposite hand holds Shift
      const leftHand = key.className.match(/f([0-3])\b/);
      const sh = this.keys.get(leftHand ? '⇧R' : '⇧L');
      if (sh) this.lit.push(sh);
    }
    this.lit.forEach((k) => k.classList.add('next'));
  }
}
