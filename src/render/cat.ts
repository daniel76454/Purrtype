import type { Grade, Outfit } from '../core/types.js';
import type { Theme } from '../data/sections.js';
import { itemById } from '../data/shop.js';

/*
 * Pixel-art renderer for the background room, the cat and its toy.
 *
 * Everything is drawn at a low resolution (about 180 px tall) with whole-pixel rectangles,
 * then scaled up by an integer factor with smoothing off, so every shape is crisp pixel art.
 * Nothing is loaded from files: sprites are either small string grids or pixel ellipses.
 *
 * The static room is cached in `room` and only redrawn when the size, theme, layout or decor changes.
 */

type Ctx = CanvasRenderingContext2D;
type RGB = [number, number, number];
type ToyMode = 'rest' | 'loose' | 'return';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: 'spark' | 'dust' | 'heart';
  color: string;
}

const OUTLINE = '#140f22';
const EYE = '#c6e86b';
const PINK = '#f29bb0';
const WHITE = '#fffaf0';
const ROPE = '#d8c3a5';
const TOY_GAP = 24; // how far in front of the cat its toy rests
const TARGET_ROWS = 180; // low-res height the scene is designed for

const DEFAULT_OUTFIT: Outfit = {
  hat: 'hat.none',
  collar: 'collar.none',
  toy: 'toy.yarn',
  fur: 'fur.orange',
  decor: 'decor.none',
};

export const DEFAULT_THEME: Theme = {
  wall: '#2b2347',
  wallDark: '#17122b',
  floor: '#4a3442',
  floorDark: '#22172a',
  skyTop: '#090c24',
  skyBottom: '#3a3f7e',
  glow: '#ffb35c',
  accent: '#f2a65a',
};

// ---- small helpers -----------------------------------------------------------
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

function rgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(lerp(a[0], b[0], t)),
  Math.round(lerp(a[1], b[1], t)),
  Math.round(lerp(a[2], b[2], t)),
];

/** Mix a #rrggbb colour toward white (amt > 0) or black (amt < 0). */
export function shade(hex: string, amt: number): string {
  return css(mixRGB(rgb(hex), amt < 0 ? [0, 0, 0] : [255, 255, 255], Math.abs(amt)));
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 4×4 ordered-dither thresholds. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function px(c: Ctx, x: number, y: number, col: string, w = 1, h = 1): void {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
}

/** Filled ellipse made of whole-pixel rows. */
function ellipse(c: Ctx, cx: number, cy: number, rx: number, ry: number, col: string): void {
  c.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2)));
    c.fillRect(cx - hw, cy + y, hw * 2 + 1, 1);
  }
}

type Sprite = readonly string[];

/** Draw a string-grid sprite. '.' is transparent; other characters look up `pal`. */
function stamp(c: Ctx, spr: Sprite, pal: Record<string, string>, x: number, y: number, flip = false, outline: string | null = OUTLINE): void {
  const w = spr[0]!.length;
  const each = (fn: (px: number, py: number, ch: string) => void) => {
    spr.forEach((row, j) => {
      for (let i = 0; i < w; i++) {
        const ch = row[i]!;
        if (ch !== '.') fn(x + (flip ? w - 1 - i : i), y + j, ch);
      }
    });
  };
  if (outline) {
    c.fillStyle = outline;
    each((a, b) => {
      c.fillRect(a - 1, b, 3, 1);
      c.fillRect(a, b - 1, 1, 3);
    });
  }
  each((a, b, ch) => px(c, a, b, pal[ch] ?? '#f0f'));
}

// ---- sprites -----------------------------------------------------------------
const YARN: Sprite[] = [
  ['..rrr..', '.rRrrr.', 'rrrRrrr', 'rRrrRrr', 'rrRrrRr', '.rrrRr.', '..rrr..'],
  ['..rrr..', '.rrRrr.', 'rRrrRrr', 'rrRrrRr', 'rrrRrrr', '.rRrrr.', '..rrr..'],
];
const YARN_PAL = { r: '#e8667a', R: '#a83a55' };

const MOUSE: Sprite = ['......pp...', '....ggpPp..', '..gggggpp..', '.gggggggkg.', 'tgggggggggn', 't.ggggggg..'];
const MOUSE_PAL = { g: '#b8b2c8', p: PINK, P: '#d9708a', k: OUTLINE, n: PINK, t: PINK };

const FEATHER: Sprite = ['..t..', '.ttt.', '.tTt.', 'ttTtt', 'ttTtt', 'ttTtt', '.tTt.', '.tTt.', '..b..', '..b..', '..b..'];
const FEATHER_PAL = { t: '#5fc8bd', T: '#2f8f88', b: '#8a6a52' };

const FISH: Sprite = ['....bbbb...', 'b..bbbbbbb.', 'bbbbbbbwkb.', 'bbbbbbbbbbb', 'b..bBbBbbb.', '....bbbb...'];
const FISH_PAL = { b: '#6cb4e8', B: '#3f7fb8', w: WHITE, k: OUTLINE };

const HEART: Sprite = ['pp.pp', 'ppppp', '.ppp.', '..p..'];

function toySprite(id: string, frame: number): [Sprite, Record<string, string>] {
  switch (id) {
    case 'toy.mouse':
      return [MOUSE, MOUSE_PAL];
    case 'toy.feather':
      return [FEATHER, FEATHER_PAL];
    case 'toy.fish':
      return [FISH, FISH_PAL];
    default:
      return [YARN[frame & 1]!, YARN_PAL];
  }
}

// ---- the cat -----------------------------------------------------------------
/** Cat sprite buffer size and the origin (the floor point under the body centre, facing right). */
const CAT_W = 64;
const CAT_H = 60;
const OX = 32;
const OY = 57;

interface CatPose {
  fur: string;
  outfit: Outfit;
  /** Whole-body offset in px (negative = up, for hops). */
  bob: number;
  /** Beat squash: 0..1 (wider and shorter for a moment). */
  squash: number;
  /** Paw raised to bat the toy: 0..1. */
  swat: number;
  tailSway: number;
  mood: number;
  eyes: 'open' | 'blink' | 'joy' | 'sleepy' | 'wide';
  /** Eyes shift toward what the cat is watching: -1..1. */
  lookX: number;
  /** Ear droop 0..2. */
  ears: number;
  mouth: 'happy' | 'neutral' | 'sad';
  blush: boolean;
}

const IDLE_POSE = (fur: string, outfit: Outfit): CatPose => ({
  fur,
  outfit,
  bob: 0,
  squash: 0,
  swat: 0,
  tailSway: 2,
  mood: 0,
  eyes: 'open',
  lookX: 0,
  ears: 0,
  mouth: 'happy',
  blush: true,
});

/** Relative luminance-ish of a #rrggbb colour, 0..1. */
function lum(hex: string): number {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Body shape: a soft, squarish blob (superellipse), like a rice cake. */
const BLOB_N = 2.6;
const blobHalfWidth = (y: number, rx: number, ry: number) =>
  Math.round(rx * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(y) / (ry + 0.5), BLOB_N)), 1 / BLOB_N));

/** Geometry shared by the sprite and its accessories. */
function catGeo(p: CatPose) {
  const rx = 14 + (p.squash > 0.5 ? 1 : 0);
  const ry = 12 - (p.squash > 0.5 ? 1 : 0);
  const cy = -ry - 1 + p.bob; // body centre; the bottom row sits on the floor
  return { rx, ry, cy, top: cy - ry, face: cy - 2 };
}

/**
 * Draw the cat's fills (no outline) into a CAT_W×CAT_H buffer.
 * A chubby front-facing loaf: little corner ears, small dot eyes, blush, side stripes and toe lines.
 */
function drawCatSprite(c: Ctx, p: CatPose): void {
  const fur = p.fur;
  const dark = shade(fur, -0.32);
  const soft = shade(fur, -0.16);
  const light = shade(fur, 0.35);
  const darkFur = lum(fur) < 0.3;
  const ink = darkFur ? EYE : OUTLINE;
  const mouthCol = darkFur ? shade(fur, 0.45) : shade(fur, -0.5);
  const P = (x: number, y: number, col: string, w = 1, h = 1) => px(c, OX + x, OY + y, col, w, h);
  const { rx, ry, cy, top, face } = catGeo(p);
  const hw = (y: number) => blobHalfWidth(y - cy, rx, ry);

  // tail curling along the floor from the back corner, tip flicking up
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const lift = t > 0.55 ? ((t - 0.55) / 0.45) * 7 * (1 - 0.6 * p.mood) : 0;
    const x = Math.round(-10 - 9 * t);
    const y = Math.round(-3 + p.bob * (1 - t) - lift + p.tailSway * t * t * 0.5);
    P(x, y, t > 0.75 ? dark : fur, 2, 2);
  }

  // ears sit on the top corners and reach down into the body (which covers their base)
  const R = Math.max(2, 6 - 2 * p.ears);
  for (const side of [-1, 1]) {
    for (let k = 0; k < R + 4; k++) {
      const w = Math.min(7, 1 + Math.round((k * 5) / Math.max(1, R - 1)));
      const outer = side * (rx - 3);
      const x0 = side < 0 ? outer : outer - w + 1;
      const y = top - R + k;
      P(x0, y, fur, w, 1);
      if (k >= 2 && k < R && w >= 3) P(x0 + 1, y, PINK, w - 2, 1);
    }
  }

  // the body
  c.fillStyle = fur;
  for (let y = -ry; y <= ry; y++) {
    const w = blobHalfWidth(y, rx, ry);
    c.fillRect(OX - w, OY + cy + y, w * 2 + 1, 1);
  }
  c.globalCompositeOperation = 'source-atop';
  ellipse(c, OX, OY + cy + 6, 7, 4, light); // chest
  c.globalCompositeOperation = 'source-over';

  // forehead stripes, side stripes, toe lines
  P(-2, top + 1, soft, 1, 2);
  P(0, top, soft, 1, 3);
  P(2, top + 1, soft, 1, 2);
  for (const y of [face + 4, face + 6]) {
    const w = hw(y);
    P(-w, y, soft, 3, 1);
    P(w - 2, y, soft, 3, 1);
  }
  for (const x of [-7, -4, 4, 7]) P(x, cy + ry - 2, soft, 1, 3);

  // eyes
  for (const side of [-1, 1]) {
    const ex = side * 5 + clamp(Math.round(p.lookX), -1, 1);
    const ey = face - 2;
    switch (p.eyes) {
      case 'joy':
        P(ex - 1, ey + 1, OUTLINE);
        P(ex, ey, OUTLINE);
        P(ex + 1, ey + 1, OUTLINE);
        break;
      case 'blink':
      case 'sleepy':
        P(side < 0 ? ex - 1 : ex, ey + 1, OUTLINE, 2, 1);
        break;
      case 'wide':
        P(ex, ey - 1, ink, 1, 3);
        break;
      default:
        P(ex, ey, ink, 1, 2);
    }
  }

  // blush, nose, mouth
  const blush = p.blush ? PINK : '#f6c4cf';
  P(-10, face + 1, blush, 2, 1);
  P(9, face + 1, blush, 2, 1);
  P(0, face + 1, PINK);
  if (p.mouth === 'happy') {
    P(-2, face + 2, mouthCol, 2, 1);
    P(1, face + 2, mouthCol, 2, 1);
  } else if (p.mouth === 'sad') {
    P(-1, face + 3, mouthCol);
    P(0, face + 2, mouthCol);
    P(1, face + 3, mouthCol);
  } else {
    P(-1, face + 2, mouthCol);
    P(1, face + 2, mouthCol);
  }

  // a paw reaching out to bat the toy
  if (p.swat > 0.12) {
    const s = Math.sin(Math.PI * (1 - p.swat));
    const x = rx - 3 + Math.round(5 * s);
    const y = cy + ry - 4 - Math.round(5 * s);
    P(x, y, fur, 4, 3);
    P(x + 1, y + 2, light, 2, 1);
  }

  drawCollar(c, p);
  drawHat(c, p);
}

function drawCollar(c: Ctx, pose: CatPose): void {
  const { cy } = catGeo(pose);
  const P = (x: number, y: number, col: string, w = 1, h = 1) => px(c, OX + x, OY + y, col, w, h);
  const id = pose.outfit.collar;
  if (id === 'collar.bell') {
    P(-6, cy + 3, '#d9455f', 13, 2);
    P(-6, cy + 3, '#f07a8e', 13, 1);
    P(-1, cy + 5, '#f2c14e', 3, 2);
    P(0, cy + 6, '#a77d1b');
  } else if (id === 'collar.bow') {
    const B = '#5b7fd1';
    const D = '#3a5aa0';
    P(-4, cy + 2, B, 3, 3);
    P(2, cy + 2, B, 3, 3);
    P(-1, cy + 3, D, 3, 1);
    P(-4, cy + 3, D);
    P(4, cy + 3, D);
  }
}

function drawHat(c: Ctx, pose: CatPose): void {
  const { top } = catGeo(pose);
  const P = (x: number, y: number, col: string, w = 1, h = 1) => px(c, OX + x, OY + top + y, col, w, h);
  const id = pose.outfit.hat;
  if (id === 'hat.beanie') {
    const A = '#5fb3a8';
    const D = '#3f8a80';
    P(-3, -4, A, 7, 1);
    P(-5, -3, A, 11, 1);
    P(-6, -2, A, 13, 1);
    P(-7, -1, A, 15, 1);
    for (const x of [-4, 0, 4]) P(x, -3, D, 1, 3);
    P(-8, 0, D, 17, 2);
    P(-1, -7, '#f4efe3', 3, 3);
  } else if (id === 'hat.party') {
    for (let k = 0; k <= 12; k++) {
      const w = 1 + 2 * Math.round((k * 4) / 12);
      const col = Math.floor(k / 3) % 2 ? '#fff0c8' : '#f2a64e';
      P(-Math.floor(w / 2), -13 + k, col, w, 1);
    }
    P(-1, -16, PINK, 3, 3);
  } else if (id === 'hat.crown') {
    const G = '#f2c14e';
    P(-5, -3, G, 11, 3);
    P(-5, -6, G, 2, 3);
    P(-1, -7, G, 3, 4);
    P(4, -6, G, 2, 3);
    P(-5, -3, '#fff0a8', 11, 1);
    P(0, -2, '#e8455f');
  }
}

/** Fill `sil` with the silhouette of `src` in the outline colour. */
function silhouette(sil: Ctx, src: HTMLCanvasElement): void {
  sil.clearRect(0, 0, sil.canvas.width, sil.canvas.height);
  sil.drawImage(src, 0, 0);
  sil.globalCompositeOperation = 'source-in';
  sil.fillStyle = OUTLINE;
  sil.fillRect(0, 0, sil.canvas.width, sil.canvas.height);
  sil.globalCompositeOperation = 'source-over';
}

const OUTLINE_OFFSETS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

// ---- room props (shared by the scene and the shop icons) --------------------------
function drawRug(c: Ctx, cx: number, cy: number, rx: number, accent: string): void {
  ellipse(c, cx, cy, rx + 1, 5, OUTLINE);
  ellipse(c, cx, cy, rx, 4, shade(accent, -0.35));
  ellipse(c, cx, cy, rx - 4, 3, shade(accent, -0.1));
  ellipse(c, cx, cy, rx - 9, 2, shade(accent, -0.35));
  ellipse(c, cx, cy, rx - 14, 1, shade(accent, 0.25));
  for (let i = -1; i <= 1; i++) {
    px(c, cx - rx - 3, cy + i * 2, shade(accent, 0.3), 2, 1);
    px(c, cx + rx + 2, cy + i * 2, shade(accent, 0.3), 2, 1);
  }
}

/** A potted monstera standing on `baseY`, centred on `x`. */
function drawPlant(c: Ctx, x: number, baseY: number): void {
  const pot = '#b8664a';
  px(c, x - 6, baseY - 10, OUTLINE, 13, 11);
  px(c, x - 5, baseY - 9, pot, 11, 9);
  px(c, x - 6, baseY - 11, OUTLINE, 13, 3);
  px(c, x - 5, baseY - 10, shade('#b8664a', 0.2), 11, 1);
  const leaf = (lx: number, ly: number, rx: number, ry: number, col: string) => {
    ellipse(c, lx, ly, rx + 1, ry + 1, OUTLINE);
    ellipse(c, lx, ly, rx, ry, col);
    px(c, lx, ly - ry + 1, shade(col, -0.3), 1, ry * 2 - 1);
  };
  px(c, x, baseY - 22, '#3f7a4c', 1, 11);
  px(c, x - 3, baseY - 17, '#3f7a4c', 1, 6);
  px(c, x + 3, baseY - 18, '#3f7a4c', 1, 7);
  leaf(x - 6, baseY - 19, 4, 3, '#4f9a5c');
  leaf(x + 6, baseY - 21, 4, 3, '#5aa866');
  leaf(x - 1, baseY - 26, 4, 4, '#62b36e');
  leaf(x + 3, baseY - 14, 3, 2, '#4f9a5c');
}

/** A tall paper floor lamp with its light. */
function drawFloorLamp(c: Ctx, x: number, baseY: number, h: number, glow: string, withGlow = true): void {
  const top = baseY - h;
  if (withGlow) {
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.07;
    for (const [rx, ry] of [
      [18, 14],
      [30, 24],
      [44, 36],
    ] as const)
      ellipse(c, x, top + 6, rx, ry, glow);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
  px(c, x - 5, baseY - 2, OUTLINE, 11, 3);
  px(c, x - 4, baseY - 1, '#3a2d3a', 9, 1);
  px(c, x - 1, top + 10, OUTLINE, 3, h - 10);
  px(c, x, top + 10, '#4a3a48', 1, h - 11);
  px(c, x - 6, top - 1, OUTLINE, 13, 12);
  px(c, x - 5, top, '#f6dfae', 11, 10);
  px(c, x - 5, top, '#fff3d0', 11, 2);
  px(c, x - 5, top + 9, shade(glow, 0.2), 11, 1);
  for (const lx of [-3, 0, 3]) px(c, x + lx, top + 2, '#ecd09a', 1, 7);
}

// ---- the scene -----------------------------------------------------------------
interface Geo {
  win: { x: number; y: number; w: number; h: number };
  stars: { x: number; y: number; p: number }[];
  bulbs: { x: number; y: number; col: string }[];
  screen: { x: number; y: number; w: number; h: number } | null;
  mug: { x: number; y: number } | null;
  antenna: { x: number; y: number } | null;
}

/**
 * The cozy background: a late-night room, a cat, and a toy on a string.
 *
 * Inputs (set from outside):  beatSource / bpm, combo, heartsFrac, recovering, outfit, theme, layout
 * Events:                     hit(grade), miss(), recovered()
 *
 * Simulation and drawing both use low-res pixel coordinates.
 */
export class CatScene {
  outfit: Outfit = { ...DEFAULT_OUTFIT };
  theme: Theme = DEFAULT_THEME;
  bpm = 72;
  combo = 12;
  heartsFrac = 1;
  recovering = false;
  reducedMotion = false;
  /** Where the cat lives on screen: 'right' leaves room for a left-hand menu panel; 'center' (play) raises the floor for the typing panel. */
  layout: 'center' | 'right' = 'right';
  /** Return the current fractional beat. When null the scene runs on its own idle clock. */
  beatSource: (() => number) | null = null;

  private c: CanvasRenderingContext2D;
  private buf = document.createElement('canvas');
  private b: Ctx;
  private room = document.createElement('canvas');
  private roomKey = '';
  private catBuf = document.createElement('canvas');
  private catCtx: Ctx;
  private silBuf = document.createElement('canvas');
  private silCtx: Ctx;
  private geo: Geo = { win: { x: 0, y: 0, w: 1, h: 1 }, stars: [], bulbs: [], screen: null, mug: null, antenna: null };

  /** Device pixels per scene pixel. */
  private P = 4;
  private lw = 1;
  private lh = 1;
  private floorY = 0;
  private footY = 0;
  private homeX = 0;

  private clock = 0;
  private beat = 0;
  private lastBeatInt = -1;
  private beatPulse = 0;
  private raf = 0;
  private last = 0;

  private toy = { x: 0, y: 0, vx: 0, vy: 0, roll: 0, mode: 'rest' as ToyMode, pop: 0, retT: 0, fromX: 0, fromY: 0 };
  private nudgeT = 0.8;

  private cat = {
    x: 0,
    vx: 0,
    facing: 1,
    run: 0,
    phase: 0,
    swat: 0,
    swatCd: 0,
    joy: 0,
    startle: 0,
    look: 0,
    lookX: 0,
    blink: 0,
    nextBlink: 2,
    tail: 0,
    placed: false,
  };

  private particles: Particle[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.c = canvas.getContext('2d')!;
    this.b = this.buf.getContext('2d')!;
    this.catBuf.width = this.silBuf.width = CAT_W;
    this.catBuf.height = this.silBuf.height = CAT_H;
    this.catCtx = this.catBuf.getContext('2d')!;
    this.silCtx = this.silBuf.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  // ---- public API ----------------------------------------------------------
  start(): void {
    if (this.raf) return;
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** Back to the relaxed idle look. Called on every screen change. */
  reset(): void {
    this.beatSource = null;
    this.bpm = 72;
    this.combo = 12;
    this.heartsFrac = 1;
    this.recovering = false;
    this.layout = 'right';
    this.theme = DEFAULT_THEME;
    this.toy.mode = 'rest';
    this.place();
  }

  /** The player hit a key on the beat: the cat bats the toy and it hops. */
  hit(grade: Grade): void {
    const t = this.toy;
    if (t.mode !== 'rest' || grade === 'off') return;
    t.pop = 1;
    this.cat.swat = 1;
    if (grade === 'perfect') {
      t.vy = -(70 + Math.min(40, this.combo));
      t.vx += (Math.random() - 0.3) * 30;
      this.cat.joy = 1;
      this.burst(t.x, t.y, 'spark', this.reducedMotion ? 2 : 5);
    } else {
      t.vy = -45;
      this.burst(t.x, t.y, 'spark', 2);
    }
  }

  /** First wrong key of a word: the cat bats too hard and the toy rolls away. */
  miss(): void {
    const t = this.toy;
    if (t.mode === 'loose') return;
    t.mode = 'loose';
    const dir = Math.random() < 0.5 ? -1 : 1;
    t.vx = dir * (100 + Math.random() * 35);
    t.vy = -120;
    this.cat.swat = 1;
    this.cat.startle = 1;
    this.nudgeT = 1;
    this.burst(t.x, t.y, 'dust', 8);
  }

  /** Combo is back: the toy comes home to the cat. */
  recovered(): void {
    const t = this.toy;
    if (t.mode !== 'loose') return;
    t.mode = 'return';
    t.retT = 0;
    t.fromX = t.x;
    t.fromY = t.y;
    this.burst(this.cat.x, this.footY - 34, 'heart', this.reducedMotion ? 2 : 6);
  }

  // ---- layout --------------------------------------------------------------
  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const devW = Math.max(1, Math.round(r.width * dpr));
    const devH = Math.max(1, Math.round(r.height * dpr));
    this.canvas.width = devW;
    this.canvas.height = devH;
    this.P = Math.max(2, Math.round(devH / TARGET_ROWS));
    this.lw = Math.ceil(devW / this.P);
    this.lh = Math.ceil(devH / this.P);
    this.buf.width = this.lw;
    this.buf.height = this.lh;
    this.roomKey = '';
    this.place();
  }

  private place(): void {
    const { lw, lh } = this;
    this.placedLayout = this.layout;
    // In play the floor is raised so the typing panel can sit on it below the cat.
    this.floorY = Math.round(lh * (this.layout === 'center' ? 0.6 : 0.8));
    this.footY = this.floorY + 6;
    this.homeX = Math.round(clamp(lw * (this.layout === 'right' ? 0.6 : 0.42), 40, Math.max(40, lw - 90)));
    if (!this.cat.placed) {
      this.cat.x = this.homeX;
      this.toy.x = this.homeX + TOY_GAP;
      this.toy.y = this.footY - 4;
      this.cat.placed = true;
    }
  }

  private toyHalfHeight(): number {
    const [spr] = toySprite(this.outfit.toy, 0);
    return Math.ceil(spr.length / 2);
  }

  // ---- simulation ----------------------------------------------------------
  private placedLayout = '';

  private update(dt: number): void {
    if (this.layout !== this.placedLayout) this.place();
    this.clock += dt;
    this.beat = this.beatSource ? this.beatSource() : (this.clock * this.bpm) / 60;
    const toy = this.toy;
    const cat = this.cat;
    const bi = Math.floor(this.beat);
    if (bi !== this.lastBeatInt) {
      this.lastBeatInt = bi;
      this.beatPulse = 1;
      // with a good combo going, the toy bounces along with the music
      if (toy.mode === 'rest' && this.combo >= 10 && !this.recovering && !this.reducedMotion && toy.vy === 0)
        toy.vy = -(22 + Math.min(30, this.combo * 0.5));
    }
    this.beatPulse = Math.max(0, this.beatPulse - dt * 4);

    const home = this.homeX + TOY_GAP;
    const fy = this.footY - this.toyHalfHeight();
    const r = 4;
    if (toy.mode === 'return') {
      toy.retT += dt / 0.8;
      const t = ease(clamp(toy.retT, 0, 1));
      toy.x = lerp(toy.fromX, home, t);
      toy.y = lerp(toy.fromY, fy, t) - Math.sin(Math.PI * t) * 24;
      toy.roll += dt * 8 * (1 - t);
      if (toy.retT >= 1) {
        toy.mode = 'rest';
        toy.vx = 0;
        toy.vy = 0;
      }
    } else {
      toy.vy += 500 * dt;
      if (toy.mode === 'rest') toy.vx += ((home - toy.x) * 14 - toy.vx * 5) * dt; // drifts back in front of the cat
      toy.x += toy.vx * dt;
      toy.y += toy.vy * dt;
      toy.roll += (toy.vx * dt) / r;
      if (toy.y >= fy) {
        toy.y = fy;
        toy.vy = Math.abs(toy.vy) > 40 ? -toy.vy * 0.4 : 0;
        toy.vx *= Math.exp(-2 * dt);
      }
      if (toy.x < r + 5) {
        toy.x = r + 5;
        toy.vx = Math.abs(toy.vx) * 0.7;
      }
      if (toy.x > this.lw - r - 5) {
        toy.x = this.lw - r - 5;
        toy.vx = -Math.abs(toy.vx) * 0.7;
      }
      // loose and at rest: give it a little kick so the chase continues
      if (toy.mode === 'loose' && toy.vy === 0 && Math.abs(toy.vx) < 6) {
        this.nudgeT -= dt;
        if (this.nudgeT <= 0) {
          this.nudgeT = 0.7 + Math.random() * 0.8;
          toy.vx = (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 40);
          toy.vy = -(70 + Math.random() * 50);
        }
      }
    }

    // Cat: sits by the toy, chases it while it's loose.
    let targetX = this.homeX;
    let maxSpeed = 60;
    if (toy.mode === 'loose') {
      const dx = toy.x - cat.x;
      targetX = toy.x - Math.sign(dx || 1) * 22;
      maxSpeed = 140;
      cat.swatCd -= dt;
      if (Math.abs(dx) < 28 && toy.y > fy - 12 && cat.swatCd <= 0) {
        cat.swatCd = 0.55 + Math.random() * 0.4;
        cat.swat = 1;
        toy.vx = Math.sign(dx || 1) * (90 + Math.random() * 70);
        toy.vy = -(90 + Math.random() * 70);
        this.burst(toy.x, toy.y, 'spark', 3);
      }
    }
    targetX = clamp(targetX, 24, this.lw - 30);
    const want = clamp((targetX - cat.x) * 5, -maxSpeed, maxSpeed);
    cat.vx += (want - cat.vx) * Math.min(1, dt * 9);
    cat.x += cat.vx * dt;
    const speed = Math.abs(cat.vx);
    cat.run = lerp(cat.run, clamp(speed / 30, 0, 1), Math.min(1, dt * 10));
    cat.phase += dt * (5 + speed / 10);

    if (Math.abs(toy.x - cat.x) > 6) cat.facing = Math.sign(toy.x - cat.x);
    cat.lookX = Math.abs(toy.x - cat.x) > 10 ? 1 : 0;

    cat.swat = Math.max(0, cat.swat - dt * 4.5);
    cat.joy = Math.max(0, cat.joy - dt * 2.5);
    cat.startle = Math.max(0, cat.startle - dt * 1.2);
    toy.pop = Math.max(0, toy.pop - dt * 5);
    cat.tail += dt * (2 + (this.recovering ? 0 : this.combo / 25));
    cat.nextBlink -= dt;
    if (cat.nextBlink <= 0) {
      cat.blink = 1;
      cat.nextBlink = 2 + Math.random() * 3;
    }
    cat.blink = Math.max(0, cat.blink - dt * 7);

    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.kind === 'heart' ? -8 : 100) * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private burst(x: number, y: number, kind: Particle['kind'], n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (kind === 'heart' ? 10 : 30) * (0.4 + Math.random());
      this.particles.push({
        x: x + (kind === 'heart' ? (Math.random() - 0.5) * 16 : 0),
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - (kind === 'heart' ? 15 : 30),
        life: 0.6 + Math.random() * 0.5,
        kind,
        color: kind === 'dust' ? '#b9aec8' : kind === 'heart' ? '#ef7b8f' : '#ffe08a',
      });
    }
  }

  // ---- drawing -------------------------------------------------------------
  private furColor(): string {
    return itemById(this.outfit.fur)?.color ?? '#e8955a';
  }

  private draw(): void {
    const key = `${this.lw}x${this.lh}|${JSON.stringify(this.theme)}|${this.outfit.decor}|${this.layout}`;
    if (key !== this.roomKey) {
      this.roomKey = key;
      this.renderRoom();
    }
    const b = this.b;
    b.drawImage(this.room, 0, 0);
    this.drawLive();
    this.drawCat();
    this.drawToy();
    this.drawParticles();

    const c = this.c;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(this.buf, 0, 0, this.lw * this.P, this.lh * this.P);
  }

  /** The static part of the room, cached until something it depends on changes. */
  private renderRoom(): void {
    const { lw, lh, floorY: fy, theme: th } = this;
    this.room.width = lw;
    this.room.height = lh;
    const r = this.room.getContext('2d')!;
    const rnd = mulberry32(7);

    // window geometry
    const ww = Math.round(clamp(lw * 0.26, 56, 110));
    const wh = Math.round(lh * 0.4);
    const wx = Math.round(lw * 0.3 - ww / 2);
    const wy = Math.round(lh * 0.1);
    this.geo = { win: { x: wx, y: wy, w: ww, h: wh }, stars: [], bulbs: [], screen: null, mug: null, antenna: null };

    // dithered gradients for wall, sky and floor, written straight into pixels
    const ramp = (a: string, b: string, n: number) => Array.from({ length: n }, (_, i) => mixRGB(rgb(a), rgb(b), i / (n - 1)));
    const wallR = ramp(th.wallDark, th.wall, 4);
    const skyR = ramp(th.skyTop, th.skyBottom, 5);
    const floorR = ramp(th.floor, th.floorDark, 3);
    const img = r.createImageData(lw, lh);
    const d = img.data;
    const pick = (R: RGB[], t: number, x: number, y: number) => {
      const s = clamp(t, 0, 1) * (R.length - 1);
      let lo = Math.floor(s);
      if (s - lo > (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16) lo++;
      return R[Math.min(lo, R.length - 1)]!;
    };
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        let col: RGB;
        if (y >= fy) col = pick(floorR, (y - fy) / Math.max(1, lh - fy), x, y);
        else if (x >= wx && x < wx + ww && y >= wy && y < wy + wh) col = pick(skyR, (y - wy) / wh, x, y);
        else col = pick(wallR, y / (fy * 0.85), x, y);
        const i = (y * lw + x) * 4;
        d[i] = col[0];
        d[i + 1] = col[1];
        d[i + 2] = col[2];
        d[i + 3] = 255;
      }
    }
    r.putImageData(img, 0, 0);

    this.renderWindow(r, rnd);
    this.renderWallStuff(r, rnd);

    // floor planks and the skirting board
    r.fillStyle = shade(th.floorDark, -0.15);
    for (let row = 0, y = fy + 4; y < lh; row++, y += 5 + row) {
      r.fillRect(0, y, lw, 1);
      for (let x = (row * 23) % 41; x < lw; x += 41) r.fillRect(x, y - 4 - row, 1, 4 + row);
    }
    px(r, 0, fy - 4, shade(th.wall, 0.1), lw, 1);
    px(r, 0, fy - 3, shade(th.wallDark, -0.1), lw, 3);
    px(r, 0, fy, OUTLINE, lw, 1);

    // moonlight falling through the window onto the floor
    r.globalAlpha = 0.1;
    r.fillStyle = shade(th.skyBottom, 0.6);
    for (let y = fy + 1; y < Math.min(lh, fy + 20); y++) {
      const k = y - fy;
      r.fillRect(wx + Math.round(k * 0.8), y, ww + Math.round(k * 0.6), 1);
    }
    r.globalAlpha = 1;

    this.renderDesk(r);
    this.renderDecor(r);
  }

  private renderWindow(r: Ctx, rnd: () => number): void {
    const th = this.theme;
    const { x: wx, y: wy, w: ww, h: wh } = this.geo.win;

    // stars and moon
    for (let i = 0; i < 16; i++) {
      const s = { x: wx + 2 + Math.floor(rnd() * (ww - 4)), y: wy + 2 + Math.floor(rnd() * wh * 0.55), p: rnd() * 6.28 };
      this.geo.stars.push(s);
      px(r, s.x, s.y, shade(th.skyBottom, 0.35));
    }
    const mx = wx + Math.round(ww * 0.72);
    const my = wy + Math.round(wh * 0.24);
    r.globalAlpha = 0.12;
    ellipse(r, mx, my, 9, 9, '#f4ecc8');
    r.globalAlpha = 1;
    ellipse(r, mx, my, 5, 5, '#f4ecc8');
    px(r, mx - 2, my - 1, '#d9cfa8', 2, 2);
    px(r, mx + 2, my + 2, '#d9cfa8');
    px(r, mx + 1, my - 3, '#d9cfa8');

    // two layers of city skyline with lit windows
    const far = shade(th.skyTop, 0.12);
    const near = shade(th.skyTop, -0.3);
    const base = wy + wh;
    let tallest = { x: 0, y: base };
    for (const [col, minH, maxH, lit] of [
      [far, 0.2, 0.42, 0.12],
      [near, 0.12, 0.32, 0.28],
    ] as const) {
      let x = wx - Math.floor(rnd() * 6);
      while (x < wx + ww) {
        const bw = 6 + Math.floor(rnd() * 9);
        const bh = Math.round(wh * (minH + rnd() * (maxH - minH)));
        const top = base - bh;
        px(r, x, top, col, bw, bh);
        if (col === near && top < tallest.y) tallest = { x: x + Math.floor(bw / 2), y: top };
        for (let yy = top + 2; yy < base - 1; yy += 3)
          for (let xx = x + 1; xx < x + bw - 1; xx += 2) if (rnd() < lit) px(r, xx, yy, rnd() < 0.7 ? '#ffd27a' : '#ff9f6b');
        x += bw + (rnd() < 0.3 ? 1 : 0);
      }
    }
    if (tallest.y < base) {
      px(r, tallest.x, tallest.y - 4, near, 1, 4);
      this.geo.antenna = { x: tallest.x, y: tallest.y - 5 };
    }
    // re-cover the skyline that spilled past the window sides
    const wallSide = shade(th.wallDark, 0.05);
    px(r, wx - 8, wy, wallSide, 8, wh);
    px(r, wx + ww, wy, wallSide, 8, wh);

    // frame, panes, sill
    const wood = '#4a3344';
    const woodHi = '#6a4a5c';
    px(r, wx - 3, wy - 3, OUTLINE, ww + 6, 3);
    px(r, wx - 3, wy + wh, OUTLINE, ww + 6, 2);
    px(r, wx - 3, wy, OUTLINE, 3, wh);
    px(r, wx + ww, wy, OUTLINE, 3, wh);
    px(r, wx - 2, wy - 2, wood, ww + 4, 2);
    px(r, wx - 2, wy, wood, 2, wh);
    px(r, wx + ww, wy, wood, 2, wh);
    px(r, wx - 2, wy - 2, woodHi, ww + 4, 1);
    const mxp = wx + Math.floor(ww / 2) - 1;
    px(r, mxp, wy, wood, 2, wh);
    px(r, wx, wy + Math.floor(wh * 0.45), wood, ww, 2);
    px(r, mxp, wy, woodHi, 1, wh);
    px(r, wx - 7, wy + wh + 1, OUTLINE, ww + 14, 5);
    px(r, wx - 6, wy + wh + 2, woodHi, ww + 12, 1);
    px(r, wx - 6, wy + wh + 3, wood, ww + 12, 2);

    // curtains on a rod
    const cloth = shade(th.accent, -0.5);
    const clothHi = shade(th.accent, -0.3);
    px(r, wx - 10, wy - 7, OUTLINE, ww + 20, 3);
    px(r, wx - 9, wy - 6, '#8a6a52', ww + 18, 1);
    for (const [cx, w] of [
      [wx - 9, 9],
      [wx + ww, 9],
    ] as const) {
      px(r, cx - 1, wy - 4, OUTLINE, w + 2, wh + 12);
      px(r, cx, wy - 4, cloth, w, wh + 11);
      for (let k = 1; k < w; k += 3) px(r, cx + k, wy - 4, clothHi, 1, wh + 11);
    }

    // a little succulent and a candle on the sill
    const sx = wx + 4;
    const sy = wy + wh + 1;
    px(r, sx - 1, sy - 6, OUTLINE, 7, 7);
    px(r, sx, sy - 5, '#c97b5a', 5, 5);
    px(r, sx, sy - 9, '#6fbf73', 1, 4);
    px(r, sx + 2, sy - 10, '#6fbf73', 1, 5);
    px(r, sx + 4, sy - 9, '#6fbf73', 1, 4);
  }

  private renderWallStuff(r: Ctx, rnd: () => number): void {
    const { lw, lh, theme: th } = this;

    // fairy lights hung in swags across the top of the wall
    const span = 64;
    const wire = shade(th.wallDark, -0.4);
    for (let x = 0; x < lw; x++) {
      const y = 3 + Math.round(7 * Math.sin((Math.PI * (x % span)) / span));
      px(r, x, y, wire);
      if (x % 11 === 5) {
        const cols = ['#ffcf6b', '#ff9fb2', '#ffb35c', '#ffe7a8'];
        this.geo.bulbs.push({ x, y: y + 1, col: cols[this.geo.bulbs.length % cols.length]! });
      }
    }

    // framed poster: a moon over hills
    const qx = Math.round(lw * 0.52);
    const qy = Math.round(lh * 0.14);
    px(r, qx - 1, qy - 1, OUTLINE, 20, 26);
    px(r, qx, qy, '#e8d6b0', 18, 24);
    px(r, qx + 2, qy + 2, shade(th.skyTop, 0.2), 14, 20);
    ellipse(r, qx + 11, qy + 8, 2, 2, '#f4ecc8');
    ellipse(r, qx + 6, qy + 21, 6, 4, shade(th.accent, -0.2));
    ellipse(r, qx + 13, qy + 22, 5, 3, shade(th.accent, -0.4));

    // shelf with books and a trailing pothos
    const shw = 40;
    const shx = Math.min(lw - shw - 4, Math.round(lw * 0.8));
    const shy = Math.round(lh * 0.24);
    let bx = shx + 2;
    const bookCols = ['#b5576a', '#5b7fd1', '#e0b25a', '#6aa8a0', '#9b7bd0', '#d9825b'];
    while (bx < shx + 24) {
      const w = 2 + Math.floor(rnd() * 2);
      const h = 7 + Math.floor(rnd() * 4);
      px(r, bx, shy - h, OUTLINE, w + 1, h);
      px(r, bx, shy - h + 1, bookCols[Math.floor(rnd() * bookCols.length)]!, w, h - 1);
      bx += w + 1;
    }
    px(r, shx + 28, shy - 6, OUTLINE, 8, 6);
    px(r, shx + 29, shy - 5, '#d4c4a8', 6, 5);
    const vine = ['#5aa866', '#4f9a5c', '#62b36e'];
    for (let v = 0; v < 4; v++) {
      const len = 6 + Math.floor(rnd() * 14);
      for (let k = 0; k < len; k++) {
        const vx = shx + 29 + v * 2 + Math.round(Math.sin(k * 0.6 + v) * 1);
        px(r, vx, shy - 7 + (k < 3 ? -k : k - 4), vine[(k + v) % 3]!, k % 3 === 0 ? 2 : 1, 1);
      }
    }
    px(r, shx - 1, shy, OUTLINE, shw + 2, 4);
    px(r, shx, shy, '#7a5650', shw, 1);
    px(r, shx, shy + 1, '#5a3d3a', shw, 2);
    px(r, shx + 4, shy + 4, OUTLINE, 2, 3);
    px(r, shx + shw - 6, shy + 4, OUTLINE, 2, 3);

  }

  private renderDesk(r: Ctx): void {
    const { lw, floorY: fy, theme: th } = this;
    const dx = Math.round(lw * 0.76);
    const dw = Math.min(72, lw - dx - 2);
    if (dw < 40) return;
    const top = fy - 22;
    const wood = '#5a3d3a';
    const woodHi = '#7a5650';

    // lamp light first so the props sit in it
    const lampX = dx + 6;
    r.globalCompositeOperation = 'lighter';
    r.globalAlpha = 0.06;
    for (const [rx, ry] of [
      [14, 10],
      [26, 18],
      [40, 30],
      [56, 42],
    ] as const)
      ellipse(r, lampX + 6, top - 6, rx, ry, th.glow);
    r.globalAlpha = 1;
    r.globalCompositeOperation = 'source-over';

    // legs, top, drawer
    px(r, dx + 2, top, OUTLINE, 4, fy - top + 5);
    px(r, dx + dw - 6, top, OUTLINE, 4, fy - top + 5);
    px(r, dx + 3, top, wood, 2, fy - top + 4);
    px(r, dx + dw - 5, top, wood, 2, fy - top + 4);
    px(r, dx + dw - 26, top + 3, OUTLINE, 22, 10);
    px(r, dx + dw - 25, top + 3, wood, 20, 9);
    px(r, dx + dw - 16, top + 7, '#d9b77a', 3, 1);
    px(r, dx - 1, top - 1, OUTLINE, dw + 2, 5);
    px(r, dx, top, woodHi, dw, 1);
    px(r, dx, top + 1, wood, dw, 2);

    // desk lamp: base, arm, shade, light
    px(r, lampX - 3, top - 3, OUTLINE, 9, 3);
    px(r, lampX - 2, top - 2, '#3a2d3a', 7, 1);
    for (let k = 0; k < 10; k++) px(r, lampX + Math.round(k * 0.4), top - 4 - k, '#3a2d3a');
    const shx = lampX + 2;
    const shy = top - 20;
    px(r, shx - 1, shy - 1, OUTLINE, 11, 7);
    px(r, shx, shy, th.accent, 9, 5);
    px(r, shx, shy, shade(th.accent, 0.3), 9, 1);
    px(r, shx + 1, shy + 5, '#fff3c0', 7, 1);

    // monitor (its screen is animated in drawLive)
    const mx = dx + 18;
    px(r, mx - 1, top - 20, OUTLINE, 28, 18);
    px(r, mx, top - 19, '#2a2540', 26, 16);
    const scr = { x: mx + 2, y: top - 17, w: 22, h: 12 };
    px(r, scr.x, scr.y, '#18203d', scr.w, scr.h);
    this.geo.screen = scr;
    px(r, mx + 12, top - 3, OUTLINE, 3, 3);
    px(r, mx + 8, top - 2, OUTLINE, 11, 2);
    px(r, mx + 9, top - 2, '#3a3550', 9, 1);
    // its glow on the wall
    r.globalCompositeOperation = 'lighter';
    r.globalAlpha = 0.05;
    ellipse(r, mx + 13, top - 11, 24, 16, '#7fa8ff');
    r.globalAlpha = 1;
    r.globalCompositeOperation = 'source-over';

    // mug, books
    const gx = dx + 48;
    if (gx + 6 < dx + dw) {
      px(r, gx - 1, top - 7, OUTLINE, 7, 7);
      px(r, gx, top - 6, '#e8d8c0', 5, 6);
      px(r, gx, top - 6, '#6b4a3a', 5, 1);
      px(r, gx + 5, top - 5, OUTLINE, 2, 3);
      px(r, gx + 5, top - 4, '#e8d8c0', 1, 1);
      this.geo.mug = { x: gx + 1, y: top - 7 };
    }
    const kx = dx + 57;
    if (kx + 12 < dx + dw) {
      const cols = ['#5b7fd1', '#b5576a', '#e0b25a'];
      cols.forEach((col, i) => {
        px(r, kx - 1 + i, top - 3 - i * 3, OUTLINE, 13, 4);
        px(r, kx + i, top - 2 - i * 3, col, 11, 2);
      });
    }
  }

  private renderDecor(r: Ctx): void {
    const id = this.outfit.decor;
    if (id === 'decor.rug') drawRug(r, this.homeX + 4, this.footY + 2, 34, this.theme.accent);
    else if (id === 'decor.plant') drawPlant(r, Math.max(10, this.homeX - 40), this.floorY + 4);
    else if (id === 'decor.lamp') drawFloorLamp(r, Math.max(10, this.homeX - 44), this.floorY + 4, Math.round(this.lh * 0.42), this.theme.glow);
  }

  /** Animated bits of the room: twinkling stars, rain, fairy lights on the beat, the monitor, steam. */
  private drawLive(): void {
    const b = this.b;
    const g = this.geo;
    const t = this.clock;

    for (const s of g.stars) {
      const v = Math.sin(t * 1.3 + s.p * 3);
      if (v < 0.5) continue;
      px(b, s.x, s.y, '#fffbe0');
      if (v > 0.93) {
        b.globalAlpha = 0.5;
        px(b, s.x - 1, s.y, '#fffbe0', 3, 1);
        px(b, s.x, s.y - 1, '#fffbe0', 1, 3);
        b.globalAlpha = 1;
      }
    }
    if (g.antenna && t % 1.6 < 0.5) px(b, g.antenna.x, g.antenna.y, '#ff5a6e');

    if (this.theme.rain) {
      const w = g.win;
      b.save();
      b.beginPath();
      b.rect(w.x, w.y, w.w, w.h);
      b.clip();
      b.fillStyle = 'rgba(170, 190, 255, 0.4)';
      const speed = this.reducedMotion ? 0.5 : 1.4;
      for (let i = 0; i < 40; i++) {
        const ph = (hash(i) + t * speed * (0.8 + (i % 3) * 0.15)) % 1;
        const y = Math.round(w.y - 4 + ph * (w.h + 6));
        const x = Math.round(w.x + ((i * 53) % w.w) + ph * 4);
        b.fillRect(x, y, 1, 3);
      }
      b.restore();
    }

    // fairy lights: every fourth bulb flares on each beat, the flare walking along the string
    const bi = Math.floor(this.beat);
    g.bulbs.forEach((bl, i) => {
      const hot = (((i - bi) % 4) + 4) % 4 === 0;
      b.globalAlpha = hot ? 0.2 + 0.45 * this.beatPulse : 0.1;
      px(b, bl.x - 2, bl.y - 1, bl.col, 6, 4);
      px(b, bl.x - 1, bl.y - 2, bl.col, 4, 6);
      b.globalAlpha = 1;
      px(b, bl.x, bl.y, hot && this.beatPulse > 0.4 ? '#fffbe8' : bl.col, 2, 2);
    });

    // equaliser bars on the monitor bounce with the music
    if (g.screen) {
      const s = g.screen;
      const step = Math.floor(this.beat * 2);
      const frac = this.beat * 2 - step;
      for (let i = 0; i * 3 + 2 < s.w; i++) {
        const v = hash(i * 7 + step * 13);
        const h = 1 + Math.round(v * (s.h - 3) * (1 - frac * 0.6));
        px(b, s.x + 1 + i * 3, s.y + s.h - 1 - h, i % 2 ? this.theme.accent : shade(this.theme.accent, 0.35), 2, h);
      }
    }

    if (g.mug) {
      b.globalAlpha = 0.5;
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.5 + k / 3) % 1;
        const x = g.mug.x + 1 + Math.round(Math.sin(t * 2 + k * 2 + ph * 6));
        b.globalAlpha = 0.5 * (1 - ph);
        px(b, x, g.mug.y - 1 - Math.round(ph * 9), '#e8e0f0');
      }
      b.globalAlpha = 1;
    }
  }

  private drawToy(): void {
    const t = this.toy;
    const [spr, pal] = toySprite(this.outfit.toy, Math.floor(t.roll));
    const w = spr[0]!.length;
    const h = spr.length;
    const grow = t.pop > 0.5 ? 1 : 0;
    const flip = t.vx < -5;
    const air = this.footY - this.toyHalfHeight() - t.y;
    this.b.globalAlpha = clamp(0.4 - air / 80, 0.1, 0.4);
    ellipse(this.b, Math.round(t.x), this.footY, Math.max(2, Math.round(w / 2) - 1), 0, '#0a0614');
    this.b.globalAlpha = 1;
    stamp(this.b, spr, pal, Math.round(t.x - w / 2), Math.round(t.y - h / 2) - grow, flip);
  }

  private drawParticles(): void {
    const b = this.b;
    for (const p of this.particles) {
      b.globalAlpha = clamp(p.life / 0.4, 0, 1);
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      if (p.kind === 'heart') stamp(b, HEART, { p: p.color }, x - 2, y - 2, false, null);
      else if (p.kind === 'dust') px(b, x, y, p.color, 2, 2);
      else {
        px(b, x, y, p.color);
        if (p.life > 0.6) {
          px(b, x - 1, y, p.color, 3, 1);
          px(b, x, y - 1, p.color, 1, 3);
        }
      }
    }
    b.globalAlpha = 1;
  }

  private pose(): CatPose {
    const k = this.cat;
    const mood = 1 - this.heartsFrac;
    return {
      fur: this.furColor(),
      outfit: this.outfit,
      bob: k.run > 0.15 ? -Math.round(Math.abs(Math.sin(k.phase)) * 3 * k.run) : 0,
      squash: this.reducedMotion || k.run > 0.15 ? 0 : this.beatPulse,
      swat: k.swat,
      tailSway: Math.sin(k.tail) * (3 + 3 * (1 - mood)),
      mood,
      eyes: k.joy > 0.3 ? 'joy' : k.startle > 0.4 ? 'wide' : k.blink > 0.5 ? 'blink' : mood > 0.55 ? 'sleepy' : 'open',
      lookX: k.lookX,
      ears: clamp(Math.round(mood * 1.6 + k.startle * 2), 0, 2),
      mouth: this.recovering ? 'sad' : this.combo >= 10 ? 'happy' : 'neutral',
      blush: k.joy > 0 || this.combo >= 10,
    };
  }

  private drawCat(): void {
    const b = this.b;
    const k = this.cat;
    const x = Math.round(k.x);

    b.globalAlpha = 0.45;
    ellipse(b, x - 1, this.footY, 16, 1, '#0a0614');
    b.globalAlpha = 1;

    this.catCtx.clearRect(0, 0, CAT_W, CAT_H);
    drawCatSprite(this.catCtx, this.pose());
    silhouette(this.silCtx, this.catBuf);

    b.save();
    b.translate(x, this.footY - OY);
    b.scale(k.facing < 0 ? -1 : 1, 1);
    for (const [ox, oy] of OUTLINE_OFFSETS) b.drawImage(this.silBuf, -OX + ox, oy);
    b.drawImage(this.catBuf, -OX, 0);
    b.restore();
  }
}

// ---- shop icons -------------------------------------------------------------------
/**
 * A small pixel-art preview of a shop item, as a canvas scaled up with CSS.
 * Hats, collars and fur show the cat's head wearing the item.
 */
export function itemIcon(id: string, furId = 'fur.orange'): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.className = 'icon-canvas';
  const c = cv.getContext('2d')!;
  const [cat] = id.split('.');

  if (cat === 'hat' || cat === 'collar' || cat === 'fur') {
    const outfit = { ...DEFAULT_OUTFIT, [cat]: id };
    const fur = itemById(cat === 'fur' ? id : furId)?.color ?? '#e8955a';
    const src = document.createElement('canvas');
    src.width = CAT_W;
    src.height = CAT_H;
    const sc = src.getContext('2d')!;
    drawCatSprite(sc, IDLE_POSE(fur, outfit));
    const sil = document.createElement('canvas');
    sil.width = CAT_W;
    sil.height = CAT_H;
    silhouette(sil.getContext('2d')!, src);
    const full = document.createElement('canvas');
    full.width = CAT_W;
    full.height = CAT_H;
    const fc = full.getContext('2d')!;
    for (const [ox, oy] of OUTLINE_OFFSETS) fc.drawImage(sil, ox, oy);
    fc.drawImage(src, 0, 0);
    // crop around the head (and collar)
    const x0 = OX - 21;
    const y0 = OY - 44;
    cv.width = 40;
    cv.height = 45;
    c.drawImage(full, x0, y0, 40, 45, 0, 0, 40, 45);
    return cv;
  }

  cv.width = 32;
  cv.height = 32;
  if (cat === 'toy') {
    const [spr, pal] = toySprite(id, 0);
    const w = spr[0]!.length;
    const h = spr.length;
    px(c, 15, 0, ROPE, 1, Math.max(1, 16 - Math.ceil(h / 2) - 1));
    stamp(c, spr, pal, 16 - Math.ceil(w / 2), 16 - Math.ceil(h / 2));
  } else if (id === 'decor.rug') {
    drawRug(c, 16, 20, 11, DEFAULT_THEME.accent);
  } else if (id === 'decor.plant') {
    drawPlant(c, 16, 30);
  } else if (id === 'decor.lamp') {
    drawFloorLamp(c, 16, 31, 28, DEFAULT_THEME.glow, false);
  } else {
    // bare floor: a few planks
    for (let i = 0; i < 4; i++) {
      px(c, 4, 12 + i * 4, i % 2 ? '#4a3442' : '#3e2b38', 24, 4);
      px(c, 4 + ((i * 9) % 20), 12 + i * 4, '#22172a', 1, 4);
    }
    px(c, 4, 12, OUTLINE, 24, 1);
  }
  return cv;
}
