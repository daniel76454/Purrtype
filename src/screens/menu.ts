import { h } from '../core/dom.js';
import type { Navigator, Screen } from '../core/screens.js';
import { audio } from '../audio/engine.js';
import { accountChip, button, yarnChip } from './ui.js';
import { LevelSelectScreen } from './levels.js';
import { ShopScreen } from './shop.js';
import { SettingsScreen } from './settings.js';
import { PracticeScreen } from './practice.js';

export class MenuScreen implements Screen {
  constructor(private nav: Navigator) {}

  mount(root: HTMLElement): void {
    // Buttons are the first user gesture: unlock audio here.
    const unlock = (fn: () => void) => () => {
      void audio.resume();
      fn();
    };
    root.append(
      h(
        'div',
        { class: 'screen left menu' },
        h('div', { class: 'top-right' }, accountChip(), yarnChip()),
        h('div', { class: 'title' }, h('h1', { text: 'Purrtype' }), h('p', { text: 'late-night beats to type to' })),
        h(
          'div',
          { class: 'stack' },
          button('Play', unlock(() => this.nav.go(new LevelSelectScreen(this.nav))), 'primary big'),
          button('Practice', unlock(() => this.nav.go(new PracticeScreen(this.nav))), 'big'),
          button('Shop', unlock(() => this.nav.go(new ShopScreen(this.nav))), 'big'),
          button('Settings', unlock(() => this.nav.go(new SettingsScreen(this.nav))), 'big'),
        ),
      ),
    );
  }

  unmount(): void {}
}
