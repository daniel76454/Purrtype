import { h } from '../core/dom.js';
import type { Navigator, Screen } from '../core/screens.js';
import { store } from '../core/storage.js';
import { SECTIONS, isUnlocked } from '../data/sections.js';
import { sfx } from '../audio/sfx.js';
import { header, icon, starRow } from './ui.js';
import { MenuScreen } from './menu.js';
import { PlayScreen } from './play.js';

const DEV = new URLSearchParams(location.search).has('dev');

export class LevelSelectScreen implements Screen {
  constructor(private nav: Navigator) {}

  mount(root: HTMLElement): void {
    const progress = store.data.progress;
    const list = h('div', { class: 'sections' });

    for (const section of SECTIONS) {
      const levels = section.levels.map((level, i) => {
        const p = progress[level.id];
        const open = isUnlocked(level.id, progress, DEV);
        const card = h(
          'button',
          {
            class: `level ${open ? '' : 'locked'}`,
            attrs: open ? {} : { disabled: 'true' },
            on: {
              click: () => {
                sfx.click();
                this.nav.go(new PlayScreen(this.nav, section, level));
              },
            },
          },
          open ? h('span', { class: 'num', text: String(i + 1) }) : h('span', { class: 'num' }, icon('lock')),
          h('span', { class: 'name', text: level.name }),
          starRow(p?.stars ?? 0),
          h('span', { class: 'best', text: p ? `best ${p.bestScore}` : level.mode === 'words' ? `${level.wpm} wpm` : level.grid === 2 ? 'double time' : '' }),
        );
        return card;
      });

      const sectionEl = h(
        'section',
        { class: 'section' },
        h('div', { class: 'section-head' }, h('h3', { text: section.name }), h('span', { class: 'chip', text: `${section.bpm} BPM` })),
        h('p', { class: 'hint', text: section.blurb }),
        h('div', { class: 'levels' }, ...levels),
      );
      sectionEl.addEventListener('pointerenter', () => (this.nav.scene.theme = section.theme));
      list.append(sectionEl);
    }

    root.append(h('div', { class: 'screen left wide' }, header('Choose a level', () => this.nav.go(new MenuScreen(this.nav))), list));
  }

  unmount(): void {}
}
