import { h } from '../core/dom.js';
import type { Navigator, Screen } from '../core/screens.js';
import { store } from '../core/storage.js';
import { audio } from '../audio/engine.js';
import { sfx } from '../audio/sfx.js';
import { button, header, slider, toggle } from './ui.js';
import { openCalibration } from './calibrate.js';
import { cloud } from '../cloud/cloud.js';
import { cleanNickname, NAME_MAX } from '../core/names.js';
import { MenuScreen } from './menu.js';

function choice(label: string, value: string, options: [string, string][], onChange: (v: string) => void): HTMLElement {
  const sel = h('select', {}, ...options.map(([v, t]) => h('option', { text: t, attrs: v === value ? { value: v, selected: '' } : { value: v } })));
  sel.addEventListener('change', () => onChange(sel.value));
  return h('label', { class: 'row' }, h('span', { class: 'label', text: label }), sel);
}

/** Leaderboard nickname. Saved when the field loses focus or Enter is pressed. */
function nameField(value: string, onChange: (v: string) => void): HTMLElement {
  const input = h('input', { attrs: { type: 'text', maxlength: String(NAME_MAX), value, placeholder: 'chosen when you first post a score', spellcheck: 'false' } });
  const commit = () => {
    const v = cleanNickname(input.value);
    input.value = v;
    if (v && v !== value) {
      value = v;
      onChange(v);
    }
  };
  input.addEventListener('change', commit);
  input.addEventListener('keydown', (e: KeyboardEvent) => e.key === 'Enter' && input.blur());
  return h(
    'div',
    {},
    h('label', { class: 'row' }, h('span', { class: 'label', text: 'Your name' }), input),
    h('p', { class: 'hint', text: 'This is the only thing other players see. Nothing from your Google account is shown.' }),
  );
}

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
          button('Calibrate timing (tap along)', () => openCalibration(root, () => this.nav.go(new SettingsScreen(this.nav))), 'small primary'),
          slider('Audio offset', s.audioOffsetMs, -250, 250, 5, (v) => `${v > 0 ? '+' : ''}${v} ms`, (v) => set(() => (s.audioOffsetMs = v))),
          h('p', { class: 'hint', text: 'Calibrate once per device (headphones change it). Fine-tune by hand: if hits feel judged too early, raise the offset; if too late, lower it.' }),
          h('h3', { text: 'Typing help' }),
          choice('Keyboard guide', s.keyboardGuide, [['auto', 'Home Row only'], ['on', 'Always'], ['off', 'Off']], (v) => set(() => (s.keyboardGuide = v as typeof s.keyboardGuide))),
          cloud.enabled ? h('h3', { text: 'Leaderboards' }) : null,
          cloud.enabled ? nameField(s.playerName, (v) => {
            set(() => (s.playerName = v));
            void cloud.renameEntries();
          }) : null,
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
