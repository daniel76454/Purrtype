/** CSS pixels per slider pixel. The canvas is upscaled with `image-rendering: pixelated`. */
const PX = 4;
const H = 9;
const L = 3; // left end of the track (knob centre at -1)

const COL = {
  track: '#2a2550',
  edge: '#140f22',
  good: '#3f7f73',
  perfect: '#c99b3e',
  knob: '#f3e6d0',
  hot: '#ffd36b',
};

/**
 * A small pixel slider that sits above the letter you're on.
 * The knob glides at a steady speed from one end to the other, arriving at an end exactly on
 * each judged slot. The coloured zones at the ends are the real scoring windows (gold = perfect,
 * teal = good), so a key pressed while the knob is inside a zone scores.
 */
export class TimingSlider {
  readonly el: HTMLCanvasElement;
  private c: CanvasRenderingContext2D;
  private goodPx: number;
  private w: number;
  private r: number;
  private perfectPx: number;

  /**
   * @param grid judged slots per beat (one full glide per slot)
   * @param goodFrac / perfectFrac half-widths of the windows as a share of the slot interval
   */
  constructor(
    private grid: number,
    goodFrac: number,
    perfectFrac: number,
  ) {
    this.w = 31;
    this.r = this.w - 4; // right end of the track
    this.el = document.createElement('canvas');
    this.el.className = 'slider';
    this.el.width = this.w;
    this.el.height = H;
    this.el.style.width = `${this.w * PX}px`;
    this.el.style.height = `${H * PX}px`;
    this.c = this.el.getContext('2d')!;
    const span = this.r - L;
    this.goodPx = Math.max(1, Math.round(goodFrac * span));
    this.perfectPx = Math.max(1, Math.round(perfectFrac * span));
  }

  /** @param beat the beat the player is hearing right now (latency-corrected) */
  draw(beat: number): void {
    const c = this.c;
    c.clearRect(0, 0, this.w, H);
    const mid = H >> 1;

    // Ping-pong at constant speed: the knob reaches an end exactly on each slot.
    const ph = Math.max(0, beat) * this.grid;
    const slot = Math.floor(ph);
    const f = ph - slot;
    const fromLeft = slot % 2 === 0;
    const t = beat < 0 ? 0 : fromLeft ? f : 1 - f; // 0 = left end, 1 = right end
    const x = Math.round(L + t * (this.r - L));
    const nearEnd = Math.min(x - L, this.r - x);
    const hot = beat >= 0 && nearEnd <= this.perfectPx;

    // track with its scoring zones at both ends
    c.fillStyle = COL.edge;
    c.fillRect(L - 2, mid - 2, this.r - L + 5, 5);
    c.fillStyle = COL.track;
    c.fillRect(L - 1, mid - 1, this.r - L + 3, 3);
    for (const end of [L, this.r]) {
      const dir = end === L ? 1 : -1;
      const gx = dir > 0 ? end - 1 : end - this.goodPx + 1;
      c.fillStyle = COL.good;
      c.fillRect(gx, mid - 1, this.goodPx + 1, 3);
      const px = dir > 0 ? end - 1 : end - this.perfectPx + 1;
      c.fillStyle = COL.perfect;
      c.fillRect(px, mid - 1, this.perfectPx + 1, 3);
    }
    // end posts light up as the knob arrives
    for (const end of [L - 2, this.r + 2]) {
      const lit = hot && Math.abs(end - x) <= this.perfectPx + 2;
      c.fillStyle = lit ? COL.hot : COL.edge;
      c.fillRect(end, mid - 3, 1, 7);
    }

    this.knob(x, hot);
  }

  private knob(x: number, hot: boolean): void {
    const c = this.c;
    c.fillStyle = COL.edge;
    c.fillRect(x - 2, 0, 5, H);
    c.fillStyle = hot ? COL.hot : COL.knob;
    c.fillRect(x - 1, 1, 3, H - 2);
  }
}

