import { h } from '../core/dom.js';
import type { Navigator, Screen } from '../core/screens.js';
import { store } from '../core/storage.js';
import { SECTIONS } from '../data/sections.js';
import { MusicDirector } from '../audio/music.js';
import { sfx } from '../audio/sfx.js';
import { generatePractice, PracticeEngine, type PracticeResult } from '../game/practice.js';
import { KeyboardGuide } from './keyboard.js';
import { button, icon, leaderboardBox } from './ui.js';
import { MenuScreen } from './menu.js';

export const PRACTICE_ID = 'practice';
/** Clean words in a row before the cat gets its toy back after a mistake. */
const RECOVER_WORDS = 3;
const YARN_PER_SCORE = 1 / 25;

/**
 * Free typing, no rhythm: type a ~100-word story at your own pace. No hearts; clean words build
 * a combo; mistakes have to be fixed with Backspace. The music never thins, and the cat reacts
 * the same way it does in the levels.
 */
export class PracticeScreen implements Screen {
  private music = new MusicDirector();
  private engine: PracticeEngine;
  private raf = 0;
  private done = false;
  private recovering = false;
  private cleanSinceMiss = 0;

  private root!: HTMLElement;
  private panel!: HTMLElement;
  private curLine!: HTMLElement;
  private nextLine!: HTMLElement;
  private wpmEl!: HTMLElement;
  private accEl!: HTMLElement;
  private progEl!: HTMLElement;
  private comboEl!: HTMLElement;
  private keyboard: KeyboardGuide | null = null;
  private section = SECTIONS[1]!; // the rainy room and its music

  constructor(
    private nav: Navigator,
    private seed = Math.floor(Math.random() * 1e9),
  ) {
    this.engine = new PracticeEngine(generatePractice(this.seed));
  }

  mount(root: HTMLElement): void {
    this.root = root;
    const scene = this.nav.scene;
    scene.theme = this.section.theme;
    scene.layout = 'center';
    scene.combo = 0;
    scene.heartsFrac = 1;
    scene.reducedMotion = store.data.settings.reducedMotion;
    if (store.data.settings.keyboardGuide === 'on') this.keyboard = new KeyboardGuide();
    scene.floorFrac = this.keyboard ? 0.5 : 0.6;

    this.wpmEl = h('b', { text: '0' });
    this.accEl = h('b', { text: '100%' });
    this.progEl = h('span', { class: 'dim', text: '' });
    this.comboEl = h('div', { class: 'combo-num', text: '0' });
    this.curLine = h('div', { class: 'line current' });
    this.nextLine = h('div', { class: 'line next' });
    const best = store.data.progress[PRACTICE_ID];
    const hint = h('div', {
      class: 'type-hint',
      text: `type at your own pace · fix mistakes with backspace${best ? ` · best ${best.bestScore} (${best.bestWpm ?? 0} wpm)` : ''}`,
    });
    this.panel = h('div', { class: 'typing panel' }, this.curLine, this.nextLine, hint, this.keyboard?.el);

    root.append(
      h(
        'div',
        { class: 'screen play practice' },
        h(
          'div',
          { class: 'hud' },
          h('div', { class: 'practice-stats' }, h('span', {}, this.wpmEl, ' wpm'), h('span', {}, this.accEl, ' accuracy'), this.progEl),
          h('div', { class: 'level-name', text: 'Practice · free typing' }),
          button('Menu', () => this.nav.go(new MenuScreen(this.nav)), 'ghost small'),
        ),
        h('div', { class: 'combo' }, this.comboEl, h('div', { class: 'combo-label', text: 'combo' })),
        h('div', { class: 'center' }, this.panel),
      ),
    );
    this.render();
    window.addEventListener('keydown', this.onKey);
    void this.music.start(this.section).then(() => {
      if (this.done) this.music.stop(0);
      else scene.beatSource = () => this.music.currentBeat();
    });
    this.raf = requestAnimationFrame(this.tick);
  }

  unmount(): void {
    this.done = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.music.stop(0.3);
  }

  private tick = () => {
    if (this.done) return;
    this.updateStats();
    this.raf = requestAnimationFrame(this.tick);
  };

  private onKey = (e: KeyboardEvent) => {
    if (this.done) return;
    if (e.key === 'Escape') return this.nav.go(new MenuScreen(this.nav));
    const e2 = this.engine;
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (e2.backspace(e.ctrlKey || e.altKey || e.metaKey).kind !== 'ignored') this.render();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    e.preventDefault();
    const lineBefore = e2.line;
    const ev = e2.key(e.key, e.timeStamp);
    if (ev.kind === 'ignored') return;
    const scene = this.nav.scene;

    if (ev.kind === 'typed' && !ev.correct) {
      sfx.miss();
      if (ev.firstErrorInWord) {
        scene.miss();
        scene.recovering = true;
        this.recovering = true;
        this.cleanSinceMiss = 0;
        this.panel.classList.remove('shake');
        void this.panel.offsetWidth;
        this.panel.classList.add('shake');
      }
    } else if (ev.kind === 'word') {
      sfx.hit(ev.clean ? 'perfect' : 'good', e2.combo);
      scene.hit(ev.clean ? 'perfect' : 'good');
      if (ev.clean && this.recovering && ++this.cleanSinceMiss >= RECOVER_WORDS) {
        this.recovering = false;
        scene.recovering = false;
        scene.recovered();
      }
    }
    scene.combo = e2.combo;
    this.comboEl.textContent = String(e2.combo);
    this.render(e2.line !== lineBefore);
    if (e2.finished) this.finish();
  };

  private updateStats(): void {
    const e = this.engine;
    this.wpmEl.textContent = String(Math.round(e.wpm(performance.now())));
    this.accEl.textContent = `${Math.round(e.accuracy * 100)}%`;
    this.progEl.textContent = `${e.wordsDone} / ${e.totalWords} words`;
  }

  /** Draw the current line: typed text, wrong characters in red, the cursor, the rest pending. */
  private render(slide = false): void {
    const e = this.engine;
    const t = e.target;
    const ok = e.correctLength;
    const chars = [...t].map((ch, i) => {
      const cls = i < ok ? 'done' : i < e.typed.length ? 'err' : i === e.typed.length ? 'cursor' : 'pending';
      const attrs: Record<string, string> = {};
      if (ch === ' ') attrs['data-sp'] = i === t.length - 1 ? 'end' : '';
      if (ch === '.' || ch === ',') attrs['data-g'] = ch === '.' ? 'dot' : 'comma';
      return h('span', { class: `ch ${cls}`, text: ch === ' ' ? ' ' : ch, attrs });
    });
    this.curLine.replaceChildren(...chars);
    this.nextLine.textContent = e.lines[e.line + 1] ?? '';
    if (slide) {
      this.curLine.classList.remove('slide');
      void this.curLine.offsetWidth;
      this.curLine.classList.add('slide');
    }
    this.keyboard?.show(e.hasErrors ? '\b' : (t[e.typed.length] ?? ''));
    this.updateStats();
  }

  private finish(): void {
    this.done = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    this.music.stop(1.2);
    this.nav.scene.beatSource = null;
    const r = this.engine.result();
    sfx.win();

    const prev = store.data.progress[PRACTICE_ID];
    const isBest = !prev || r.score > prev.bestScore;
    const yarn = Math.round(r.score * YARN_PER_SCORE);
    store.update((d) => {
      d.yarn += yarn;
      d.progress[PRACTICE_ID] = {
        stars: 0,
        bestScore: Math.max(prev?.bestScore ?? 0, r.score),
        bestCombo: Math.max(prev?.bestCombo ?? 0, r.maxCombo),
        bestWpm: Math.max(prev?.bestWpm ?? 0, r.wpm),
        bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, Math.round(r.accuracy * 1000) / 1000),
      };
    });
    this.showResults(r, isBest, yarn);
  }

  private showResults(r: PracticeResult, isBest: boolean, yarn: number): void {
    const stat = (k: string, v: string | number) => h('div', { class: 'stat' }, h('span', { text: k }), h('b', { text: String(v) }));
    const mins = Math.floor(r.seconds / 60);
    const secs = String(r.seconds % 60).padStart(2, '0');
    this.root.append(
      h(
        'div',
        { class: 'overlay' },
        h(
          'div',
          { class: 'panel dialog results' },
          h('h2', { text: isBest ? 'New best!' : 'Nice typing!' }),
          h('div', { class: 'big-score' }, h('b', { text: String(r.score) }), h('span', { class: 'dim', text: ' points' })),
          h(
            'div',
            { class: 'stats-grid' },
            stat('Speed', `${r.wpm} wpm`),
            stat('Accuracy', `${(r.accuracy * 100).toFixed(1)}%`),
            stat('Time', `${mins}:${secs}`),
            stat('Mistakes', r.errors),
            stat('Best combo', `${r.maxCombo} words`),
            stat('Best score', store.data.progress[PRACTICE_ID]?.bestScore ?? r.score),
            h('div', { class: 'stat' }, h('span', { text: 'Yarn earned' }), h('b', {}, icon('yarn'), ` ${yarn}`)),
          ),
          h('p', { class: 'hint', text: 'Score = wpm × accuracy³ × 10, so accuracy counts for a lot.' }),
          leaderboardBox(PRACTICE_ID, r.score, r.maxCombo),
          h(
            'div',
            { class: 'row-buttons' },
            button('New text', () => this.nav.go(new PracticeScreen(this.nav)), 'primary'),
            button('Same text again', () => this.nav.go(new PracticeScreen(this.nav, this.seed))),
            button('Menu', () => this.nav.go(new MenuScreen(this.nav)), 'ghost'),
          ),
        ),
      ),
    );
  }
}
