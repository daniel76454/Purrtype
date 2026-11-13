import { h } from '../core/dom.js';
import type { Navigator, Screen } from '../core/screens.js';
import { store } from '../core/storage.js';
import { audio } from '../audio/engine.js';
import { sfx } from '../audio/sfx.js';
import { button, header, slider, toggle } from './ui.js';
import { MenuScreen } from './menu.js';

export class SettingsScreen implements Screen {
  constructor(private nav: Navigator) {}

  mount(root: HTMLElement): void {
    const s = store.data.settings;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const set = (fn: () => void) => {
      fn();
      store.save();
      audio.applySettings();
      this.nav.scene.reducedMotion = store.data.settings.reducedMotion;
    };

    root.append(
      h(
        'div',
        { class: 'screen left' },
        header('Settings', () => this.nav.go(new MenuScreen(this.nav))),
        h(
          'div',
          { class: 'panel form' },
          h('h3', { text: 'Sound' }),
          slider('Master volume', s.master, 0, 1, 0.01, pct, (v) => set(() => (s.master = v))),
          slider('Music', s.music, 0, 1, 0.01, pct, (v) => set(() => (s.music = v))),
          slider('Effects', s.sfx, 0, 1, 0.01, pct, (v) => set(() => (s.sfx = v))),
          button('Test sound', () => sfx.hit('perfect', 10), 'small'),
          h('h3', { text: 'Rhythm' }),
          toggle('Metronome click', s.metronome, (v) => set(() => (s.metronome = v))),
          toggle('Show beat guide', s.beatGuide, (v) => set(() => (s.beatGuide = v))),
          slider('Audio offset', s.audioOffsetMs, -200, 200, 5, (v) => `${v > 0 ? '+' : ''}${v} ms`, (v) => set(() => (s.audioOffsetMs = v))),
          h('p', { class: 'hint', text: 'If hits feel judged too early, raise the offset; if too late, lower it. Bluetooth headphones usually need a positive value.' }),
          h('h3', { text: 'Accessibility' }),
          toggle('Reduced motion', s.reducedMotion, (v) => set(() => (s.reducedMotion = v))),
          h('h3', { text: 'Data' }),
          button(
            'Reset all progress',
            () => {
              if (confirm('Erase all progress, yarn and purchases?')) {
                store.reset();
                this.nav.go(new MenuScreen(this.nav));
              }
            },
            'danger small',
          ),
        ),
      ),
    );
  }

  unmount(): void {}
}
