import { h } from '../core/dom.js';
import type { Navigator, Screen } from '../core/screens.js';
import { store } from '../core/storage.js';
import type { Grade } from '../core/types.js';
import { nextLevel, type LevelDef, type SectionDef } from '../data/sections.js';
import { audio } from '../audio/engine.js';
import { MusicDirector } from '../audio/music.js';
import { sfx } from '../audio/sfx.js';
import { COUNT_IN_BEATS, GameSession, HEARTS, type LevelResult } from '../game/session.js';
import { TimingSlider } from '../render/slider.js';
import { KeyboardGuide } from './keyboard.js';
import { timingWindows } from '../game/beat.js';
import { button, icon, leaderboardBox, starRow } from './ui.js';
import { LevelSelectScreen } from './levels.js';

type State = 'loading' | 'countin' | 'playing' | 'paused' | 'done';
type CharClass = 'pending' | Grade | 'skipped';

/** One character of the story. The line's closing space gets a marker. */
function charSpan(ch: string, last = false): HTMLElement {
  const attrs: Record<string, string> = {};
  if (ch === ' ') attrs['data-sp'] = last ? 'end' : '';
  return h('span', { class: 'ch', text: ch === ' ' ? ' ' : ch, attrs });
}

export class PlayScreen implements Screen {
  private music = new MusicDirector();
  private session!: GameSession;
  private state: State = 'loading';
  private raf = 0;
  private disposed = false;
  private offs: (() => void)[] = [];

  // DOM refs
  private root!: HTMLElement;
  private panel!: HTMLElement;
  private curLine!: HTMLElement;
  private nextLine!: HTMLElement;
  /** The line after next: small and faint, a hint that more is coming. */
  private laterLine!: HTMLElement;
  private chars: HTMLElement[] = [];
  private grades: CharClass[][] = [];
  private hearts: HTMLElement[] = [];
  private scoreEl!: HTMLElement;
  private comboEl!: HTMLElement;
  private multEl!: HTMLElement;
  private slider!: TimingSlider;
  private guideOn = true;
  private keyboard: KeyboardGuide | null = null;
  private cursorEl: HTMLElement | null = null;
  /** Latency compensation in beats: visuals follow what the player hears, minus their offset. */
  private offsetBeats = 0;
  private feedback!: HTMLElement;
  private banner!: HTMLElement;

  constructor(
    private nav: Navigator,
    private section: SectionDef,
    private level: LevelDef,
  ) {}

  mount(root: HTMLElement): void {
    this.root = root;
    const scene = this.nav.scene;
    scene.theme = this.section.theme;
    scene.bpm = this.section.bpm;
    scene.layout = 'center';
    scene.reducedMotion = store.data.settings.reducedMotion;

    this.build(root);
    window.addEventListener('keydown', this.onKey);
    const intro = this.level.intro;
    const cleared = (store.data.progress[this.level.id]?.stars ?? 0) > 0;
    if (intro && !cleared) this.showIntro(intro);
    else void this.begin();
  }

  /** A short card about the level's new keys, with the keyboard showing where they are. Space starts. */
  private showIntro(intro: NonNullable<LevelDef['intro']>): void {
    const kb = new KeyboardGuide(false);
    kb.spotlight(intro.keys);
    const start = () => {
      window.removeEventListener('keydown', onKey);
      overlay.remove();
      if (!this.disposed) void this.begin();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        start();
      }
    };
    const overlay = h(
      'div',
      { class: 'overlay' },
      h(
        'div',
        { class: 'panel dialog intro-card' },
        h('h2', { text: intro.title }),
        h('p', { class: 'hint', text: intro.text }),
        kb.el,
        button('Start (space)', start, 'primary'),
      ),
    );
    this.root.append(overlay);
    window.addEventListener('keydown', onKey);
    this.offs.push(() => window.removeEventListener('keydown', onKey));
  }

  unmount(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.offs.forEach((o) => o());
    this.music.stop(0.15);
    if (audio.ready && audio.ctx.state === 'suspended') void audio.ctx.resume();
  }

  // ---- setup ---------------------------------------------------------------
  private build(root: HTMLElement): void {
    this.hearts = Array.from({ length: HEARTS }, () => icon('heart'));
    this.scoreEl = h('div', { class: 'score', text: '0' });
    this.comboEl = h('div', { class: 'combo-num', text: '0' });
    this.multEl = h('div', { class: 'mult', text: '×1' });
    this.curLine = h('div', { class: 'line current' });
    this.nextLine = h('div', { class: 'line next' });
    this.laterLine = h('div', { class: 'line later' });
    this.feedback = h('div', { class: 'feedback' });
    this.banner = h('div', { class: 'banner', text: '' });
    const win = timingWindows(this.section.bpm, this.level.grid, this.level.windowMs);
    const slotMs = win.interval * 1000;
    this.slider = new TimingSlider(this.level.grid, win.goodMs / slotMs, win.perfectMs / slotMs);
    this.guideOn = store.data.settings.beatGuide;
    if (!this.guideOn) this.slider.el.classList.add('hidden');
    // One line of help at most: the level's typing tip until it's cleared once, otherwise a
    // rhythm hint on the first level of a section and on the first double-time level.
    const cleared = (store.data.progress[this.level.id]?.stars ?? 0) > 0;
    const first = /l1$/.test(this.level.id) || (/l5$/.test(this.level.id) && this.level.grid === 2);
    const rhythmHint =
      this.level.grid === 2 ? 'double time: a letter each time the knob reaches an end' : 'type a letter each time the knob reaches an end · finish every word with space';
    const kb = store.data.settings.keyboardGuide;
    // auto: the whole first section, and any level that brings in new keys
    if (kb === 'on' || (kb === 'auto' && (this.section.id === 's1' || !!this.level.intro))) this.keyboard = new KeyboardGuide(true);
    // with the keyboard showing, the holographic hands do the explaining: no text line
    const hintText = this.keyboard ? '' : this.level.tip && !cleared ? this.level.tip : first ? rhythmHint : '';
    const hint = hintText ? h('div', { class: 'type-hint', text: hintText }) : null;
    this.nav.scene.floorFrac = this.keyboard ? 0.5 : 0.6;

    this.panel = h('div', { class: 'typing panel' }, this.slider.el, this.curLine, this.nextLine, this.laterLine, hint, this.keyboard?.el);
    root.append(
      h(
        'div',
        { class: 'screen play' },
        h(
          'div',
          { class: 'hud' },
          h('div', { class: 'hearts' }, ...this.hearts),
          h('div', { class: 'level-name', text: `${this.section.name} · ${this.level.name}` }),
          h('div', { class: 'stats' }, this.scoreEl),
        ),
        h('div', { class: 'combo' }, this.comboEl, h('div', { class: 'combo-label', text: 'combo' }), this.multEl),
        h('div', { class: 'center' }, this.banner, this.feedback, this.panel),
      ),
    );
  }

  private async begin(): Promise<void> {
    await this.music.start(this.section);
    if (this.disposed) {
      this.music.stop(0);
      return;
    }
    const offset = store.data.settings.audioOffsetMs / 1000;
    this.offsetBeats = offset / (60 / this.section.bpm);
    this.session = new GameSession(this.level, this.section, this.music.startTime, offset);
    this.grades = this.session.engine.lines.map((l) => Array.from({ length: l.length }, () => 'pending' as CharClass));
    this.wire();
    this.renderLines();
    this.state = 'countin';

    const scene = this.nav.scene;
    scene.beatSource = () => this.music.currentBeat();
    scene.combo = 0;
    scene.heartsFrac = 1;
    this.raf = requestAnimationFrame(this.frame);
  }

  private wire(): void {
    const s = this.session;
    const scene = this.nav.scene;
    this.offs.push(
      s.on('typed', ({ outcome, grade, points, deltaMs }) => {
        if (outcome.kind === 'wrong') {
          sfx.miss();
          this.flashWrong();
          return;
        }
        if (outcome.kind !== 'correct' || grade === null) return;
        this.grades[outcome.line]![outcome.index] = grade;
        if (grade !== 'skipped') {
          sfx.hit(grade, s.combo);
          scene.hit(grade);
          const side = deltaMs < 0 ? 'early' : 'late';
          if (grade === 'perfect') this.popup('Perfect!', grade);
          else if (grade === 'good') this.popup('Good', grade, side);
          else this.popup(side === 'early' ? 'Too early' : 'Too late', grade);
        }
        this.scoreEl.textContent = String(s.score);
        if (outcome.lineDone && !outcome.finished) this.renderLines(true);
        else this.paint();
        void points;
      }),
      s.on('combo', ({ combo, multiplier }) => {
        this.comboEl.textContent = String(combo);
        this.multEl.textContent = `×${multiplier}`;
        this.comboEl.classList.remove('bump');
        void this.comboEl.offsetWidth; // restart animation
        this.comboEl.classList.add('bump');
        scene.combo = combo;
      }),
      s.on('miss', ({ hearts }) => {
        this.hearts.forEach((el, i) => el.classList.toggle('lost', i >= hearts));
        scene.heartsFrac = Math.max(0, hearts / HEARTS);
        scene.recovering = true;
        scene.miss();
        this.panel.classList.remove('shake');
        void this.panel.offsetWidth;
        this.panel.classList.add('shake');
      }),
      s.on('music', ({ layers, fast }) => this.music.setLayers(layers, fast ? 0.12 : 0.4)),
      s.on('recovered', () => {
        scene.recovering = false;
        scene.recovered();
      }),
      s.on('finished', (r) => this.finish(r)),
    );
  }

  // ---- frame loop: count-in, beat guide ------------------------------------
  private frame = () => {
    if (this.disposed) return;
    const beat = this.music.currentBeat();
    const vb = beat - this.offsetBeats; // the beat as the player should feel it

    if (this.state === 'countin' && beat >= COUNT_IN_BEATS - 0.4) this.state = 'playing';
    const n = COUNT_IN_BEATS - Math.floor(vb);
    const showCount = vb >= 0 && n > 0;
    const showGo = vb >= COUNT_IN_BEATS && vb < COUNT_IN_BEATS + 1 && this.state === 'playing';
    const text = showCount ? String(n) : showGo ? 'type!' : '';
    if (this.banner.textContent !== text) this.banner.textContent = text;
    this.banner.classList.toggle('show', showCount || showGo);
    this.banner.classList.toggle('pulse', vb - Math.floor(vb) < 0.15);

    if (this.guideOn && this.state !== 'paused') this.drawSlider(vb);

    this.raf = requestAnimationFrame(this.frame);
  };

  /** Draw the timing slider and keep it hovering over the cursor letter. Also flash the cursor on each slot. */
  private drawSlider(vb: number): void {
    this.slider.draw(vb);
    const g = this.level.grid;
    const p = vb * g - Math.floor(vb * g);
    const flash = vb >= 0 && (p < 0.1 || p > 0.94);
    const el = this.cursorEl;
    if (!el) return;
    const m = this.slider.el;
    const x = el.offsetLeft - m.offsetLeft + el.offsetWidth / 2 - m.offsetWidth / 2;
    m.style.transform = `translateX(${Math.round(x)}px)`;
    el.classList.toggle('flash', flash);
  }

  // ---- input ---------------------------------------------------------------
  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.togglePause();
      return;
    }
    if (this.state === 'countin' && this.music.currentBeat() >= COUNT_IN_BEATS - 0.4) this.state = 'playing';
    if (this.state !== 'playing' || e.repeat) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    e.preventDefault(); // stops space scrolling and ' opening quick-find
    this.session.handleKey(e.key, audio.keyTimeToCtx(e));
  };

  private togglePause(): void {
    if (this.state === 'playing' || this.state === 'countin') {
      this.prevState = this.state;
      this.state = 'paused';
      void audio.ctx.suspend();
      this.pauseEl = h(
        'div',
        { class: 'overlay' },
        h(
          'div',
          { class: 'panel dialog' },
          h('h2', { text: 'Paused' }),
          button('Resume', () => this.togglePause(), 'primary'),
          button('Restart', () => this.nav.go(new PlayScreen(this.nav, this.section, this.level))),
          button('Quit to levels', () => this.nav.go(new LevelSelectScreen(this.nav)), 'ghost'),
        ),
      );
      this.root.append(this.pauseEl);
    } else if (this.state === 'paused') {
      this.pauseEl?.remove();
      this.state = this.prevState;
      void audio.ctx.resume();
    }
  }
  private prevState: State = 'playing';
  private pauseEl?: HTMLElement;

  // ---- rendering the typing panel -------------------------------------------
  private renderLines(slide = false): void {
    const e = this.session.engine;
    const text = e.lines[e.line] ?? '';
    this.chars = [...text].map((ch, i) => charSpan(ch, i === text.length - 1));

    this.curLine.replaceChildren(...this.chars);
    this.nextLine.replaceChildren(...[...(e.lines[e.line + 1] ?? '')].map((ch) => charSpan(ch)));
    this.laterLine.textContent = e.lines[e.line + 2]?.trimEnd() ?? '';
    if (slide) {
      this.curLine.classList.remove('slide');
      void this.curLine.offsetWidth;
      this.curLine.classList.add('slide');
    }
    this.paint();
  }

  private paint(): void {
    const e = this.session.engine;
    const end = e.wordEnd();
    const inv = this.session.invulnerable;
    this.cursorEl = null;
    this.chars.forEach((el, i) => {
      const g = this.grades[e.line]?.[i] ?? 'pending';
      const cursor = i === e.index && !e.finished;
      el.className = `ch ${cursor ? 'cursor' : g}${inv && i >= e.index && i <= end ? ' invuln' : ''}`;
      if (cursor) this.cursorEl = el;
    });
    this.keyboard?.show(e.expected);
  }

  private flashWrong(): void {
    const el = this.chars[this.session.engine.index];
    if (!el) return;
    el.classList.remove('wrong');
    void el.offsetWidth;
    el.classList.add('wrong');
    this.paint();
    el.classList.add('wrong');
  }

  private popup(text: string, grade: Grade, sub?: string): void {
    const el = h('div', { class: `pop ${grade}` }, text, sub ? h('small', { text: ` ${sub}` }) : null);
    this.feedback.replaceChildren(el);
  }

  // ---- end of level -----------------------------------------------------------
  private finish(r: LevelResult): void {
    this.state = 'done';
    this.cursorEl = null;
    this.music.stop(1.2);
    this.nav.scene.beatSource = null;
    if (r.completed) sfx.win();
    else sfx.lose();

    const prev = store.data.progress[r.levelId];
    store.update((d) => {
      d.yarn += r.yarn;
      d.progress[r.levelId] = {
        stars: Math.max(prev?.stars ?? 0, r.stars),
        bestScore: Math.max(prev?.bestScore ?? 0, r.score),
        bestCombo: Math.max(prev?.bestCombo ?? 0, r.maxCombo),
      };
    });

    const next = nextLevel(r.levelId);
    const stat = (k: string, v: string | number) => h('div', { class: 'stat' }, h('span', { text: k }), h('b', { text: String(v) }));
    const buttons = [
      r.completed && next ? button('Next level', () => this.nav.go(new PlayScreen(this.nav, next.section, next.level)), 'primary') : null,
      button('Retry', () => this.nav.go(new PlayScreen(this.nav, this.section, this.level)), r.completed ? '' : 'primary'),
      button('Levels', () => this.nav.go(new LevelSelectScreen(this.nav)), 'ghost'),
    ];
    this.root.append(
      h(
        'div',
        { class: 'overlay' },
        h(
          'div',
          { class: 'panel dialog results' },
          h('h2', { text: r.completed ? 'Purrfect!' : 'The yarn got tangled…' }),
          r.completed ? starRow(r.stars, 'big') : null,
          h(
            'div',
            { class: 'stats-grid' },
            stat('Score', r.score),
            stat('Best combo', r.maxCombo),
            stat('On the beat', `${Math.round(r.onBeatRatio * 100)}%`),
            stat('Hearts left', r.heartsLeft),
            h('div', { class: 'stat' }, h('span', { text: 'Yarn earned' }), h('b', {}, icon('yarn'), ` ${r.yarn}`)),
          ),
          leaderboardBox(r.levelId, r.completed ? r.score : 0, r.maxCombo),
          h('div', { class: 'row-buttons' }, ...buttons),
        ),
      ),
    );
  }

}
