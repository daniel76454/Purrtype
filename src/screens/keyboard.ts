import { h } from '../core/dom.js';

/**
 * A compact on-screen keyboard: highlights the next key, softly tints keys by the finger that
 * usually presses them, and marks the F and J bumps. Optionally, two holographic hands rest on the
 * home row and the finger for the next key reaches over and lights up.
 * It's shown on the first levels only, so players later settle into whatever feels comfortable.
 */

/** Finger index 0..7: left pinky → right pinky. 8 and 9 are the left and right thumbs. */
const ROWS: [string, number][][] = [
  [['q', 0], ['w', 1], ['e', 2], ['r', 3], ['t', 3], ['y', 4], ['u', 4], ['i', 5], ['o', 6], ['p', 7]],
  [['a', 0], ['s', 1], ['d', 2], ['f', 3], ['g', 3], ['h', 4], ['j', 4], ['k', 5], ['l', 6], [';', 7], ["'", 7]],
  [['⇧L', 0], ['z', 0], ['x', 1], ['c', 2], ['v', 3], ['b', 3], ['n', 4], ['m', 4], [',', 5], ['.', 6], ['/', 7], ['⇧R', 7]],
];

/** Where each finger rests. */
const HOME = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];

/** Characters typed with Shift on a US layout, mapped to their base key. */
const SHIFTED: Record<string, string> = { '?': '/', ':': ';', '"': "'", '<': ',', '>': '.' };

const SVG = 'http://www.w3.org/2000/svg';

interface Pt {
  x: number;
  y: number;
}

export class KeyboardGuide {
  readonly el: HTMLElement;
  private keys = new Map<string, HTMLElement>();
  private fingerOf = new Map<HTMLElement, number>();
  private lit: HTMLElement[] = [];
  private backspace: HTMLElement;
  private space: HTMLElement;
  private svg: SVGSVGElement | null = null;

  constructor(withHands = false) {
    this.backspace = h('span', { class: 'kb-key wide f7', text: '⌫' });
    this.fingerOf.set(this.backspace, 7);
    const rows = ROWS.map((row, r) =>
      h(
        'div',
        { class: `kb-row r${r}` },
        ...row.map(([k, finger]) => {
          const shift = k.startsWith('⇧');
          const el = h('span', { class: `kb-key f${finger}${shift ? ' wide' : ''}${k === 'f' || k === 'j' ? ' bump' : ''}`, text: shift ? 'shift' : k });
          this.keys.set(k, el);
          this.fingerOf.set(el, finger);
          return el;
        }),
      ),
    );
    this.space = h('span', { class: 'kb-key space', text: 'space' });
    this.keys.set(' ', this.space);
    rows[0]!.append(this.backspace);
    this.el = h('div', { class: 'kb', attrs: { 'aria-hidden': 'true' } }, ...rows, h('div', { class: 'kb-row' }, this.space));
    if (withHands) {
      this.svg = document.createElementNS(SVG, 'svg');
      this.svg.classList.add('kb-hands');
      this.el.append(this.svg);
    }
  }

  /** Highlight the key (and Shift, for capitals) needed for `ch`; '\b' highlights Backspace. */
  show(ch: string): void {
    this.lit.forEach((k) => k.classList.remove('next'));
    this.lit = [];
    if (ch === '\b') this.lit.push(this.backspace);
    else if (ch) {
      let base = ch.toLowerCase();
      let shift = ch !== base;
      if (SHIFTED[ch]) {
        base = SHIFTED[ch]!;
        shift = true;
      }
      const key = this.keys.get(base);
      if (key) {
        // ('!' lives on the number row, which isn't drawn)
        this.lit.push(key);
        if (shift) {
          // the opposite hand holds Shift
          const sh = this.keys.get((this.fingerOf.get(key) ?? 0) < 4 ? '⇧R' : '⇧L');
          if (sh) this.lit.push(sh);
        }
      }
    }
    this.lit.forEach((k) => k.classList.add('next'));
    if (this.svg) requestAnimationFrame(() => this.drawHands());
  }

  // ---- holographic hands --------------------------------------------------------
  private center(el: HTMLElement): Pt {
    return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
  }

  private drawHands(): void {
    const svg = this.svg;
    if (!svg || !this.el.isConnected || !this.el.offsetWidth) return;
    const W = this.el.offsetWidth;
    const H = this.el.offsetHeight;
    svg.setAttribute('viewBox', `0 0 ${W} ${H + 40}`);
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H + 40));

    // which fingers move, and to which key
    const reach = new Map<number, HTMLElement>();
    for (const k of this.lit) {
      if (k === this.space) {
        reach.set(8, k);
        reach.set(9, k);
      } else {
        const f = this.fingerOf.get(k);
        if (f !== undefined) reach.set(f, k);
      }
    }

    const home = HOME.map((k) => this.center(this.keys.get(k)!));
    const sp = this.center(this.space);
    const parts: string[] = [];
    for (const side of [0, 1] as const) {
      const fingers = side === 0 ? [0, 1, 2, 3] : [4, 5, 6, 7];
      const xs = fingers.map((f) => home[f]!.x);
      const palm = {
        x: (Math.min(...xs) + Math.max(...xs)) / 2 + (side === 0 ? 8 : -8),
        y: sp.y + 26,
        w: Math.max(...xs) - Math.min(...xs) + 34,
        h: 44,
      };
      parts.push(this.palm(palm.x, palm.y, palm.w, palm.h));
      for (const f of fingers) {
        const rest = home[f]!;
        const knuckle = { x: rest.x * 0.8 + palm.x * 0.2, y: palm.y - palm.h / 2 + 6 };
        const target = reach.get(f);
        const tip = target ? this.center(target) : rest;
        parts.push(this.finger(knuckle, tip, f === 0 || f === 7 ? 5 : 6, !!target));
      }
      // thumb: from the inner side of the palm to the space bar
      const thumb = side === 0 ? 8 : 9;
      const inner = side === 0 ? 1 : -1;
      const base = { x: palm.x + inner * (palm.w / 2 - 8), y: palm.y - 4 };
      const tip = { x: sp.x - inner * 34, y: sp.y + (reach.has(thumb) ? 0 : 3) };
      parts.push(this.finger(base, tip, 6, reach.has(thumb)));
    }
    svg.innerHTML = parts.join('');
  }

  private palm(cx: number, cy: number, w: number, hgt: number): string {
    return `<rect class="holo" x="${cx - w / 2}" y="${cy - hgt / 2}" width="${w}" height="${hgt}" rx="18" />`;
  }

  /** A finger as a capsule outline from the knuckle to the fingertip. */
  private finger(a: Pt, b: Pt, r: number, active: boolean): string {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * r;
    const ny = (dx / len) * r;
    const f = (n: number) => n.toFixed(1);
    const d =
      `M${f(a.x + nx)},${f(a.y + ny)} L${f(b.x + nx)},${f(b.y + ny)} ` +
      `A${r},${r} 0 0 0 ${f(b.x - nx)},${f(b.y - ny)} L${f(a.x - nx)},${f(a.y - ny)} ` +
      `A${r},${r} 0 0 0 ${f(a.x + nx)},${f(a.y + ny)} Z`;
    const tip = active ? `<circle class="tip" cx="${f(b.x)}" cy="${f(b.y)}" r="${r - 1}" />` : '';
    return `<path class="holo${active ? ' on' : ''}" d="${d}" />${tip}`;
  }
}
