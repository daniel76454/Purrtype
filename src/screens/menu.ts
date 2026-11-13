import { h } from '../core/dom.js';
import type { Navigator, Screen } from '../core/screens.js';
import { store } from '../core/storage.js';
import { audio } from '../audio/engine.js';
import { sfx } from '../audio/sfx.js';
import { itemIcon } from '../render/cat.js';
import { accountChip, button, yarnChip } from './ui.js';
import { LevelSelectScreen } from './levels.js';
import { ShopScreen } from './shop.js';
import { SettingsScreen } from './settings.js';
import { PracticeScreen } from './practice.js';

/** Pet the menu cat this many times and a secret friend shows up. */
export const PETS_FOR_PITSI = 20;
const PITSI = 'fur.pitsi';

export class MenuScreen implements Screen {
  readonly menuMusic = true;
  private root!: HTMLElement;
  private canvas = document.getElementById('stage') as HTMLCanvasElement;
  private lastPet = 0;

  constructor(private nav: Navigator) {}

  mount(root: HTMLElement): void {
    this.root = root;
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
    this.canvas.addEventListener('pointerdown', this.onPet);
    this.canvas.addEventListener('pointermove', this.onHover);
  }

  unmount(): void {
    this.canvas.removeEventListener('pointerdown', this.onPet);
    this.canvas.removeEventListener('pointermove', this.onHover);
    this.canvas.style.cursor = '';
  }

  private onHover = (e: PointerEvent) => {
    this.canvas.style.cursor = this.nav.scene.isOverCat(e.clientX, e.clientY) ? 'pointer' : '';
  };

  /** Petting the cat: a soft purr (or now and then a meow), and a secret after enough pets. */
  private onPet = (e: PointerEvent) => {
    if (!this.nav.scene.petAt(e.clientX, e.clientY)) return;
    void audio.resume().then(() => {
      const now = performance.now();
      if (now - this.lastPet > 900) (Math.random() < 0.7 ? sfx.purr(1.4) : sfx.meow());
      this.lastPet = now;
    });
    store.update((d) => (d.pets = (d.pets ?? 0) + 1));
    if (store.data.pets >= PETS_FOR_PITSI && !store.data.owned.includes(PITSI)) this.unlockPitsi();
  };

  private unlockPitsi(): void {
    store.update((d) => d.owned.push(PITSI));
    sfx.win();
    const close = () => overlay.remove();
    const overlay = h(
      'div',
      { class: 'overlay' },
      h(
        'div',
        { class: 'panel dialog secret' },
        h('h2', { text: 'Pitsi wants to come home with you!' }),
        h('div', { class: 'secret-cat' }, itemIcon(PITSI)),
        h('p', { class: 'hint', text: 'A sweet tabby with a little clementine on her head. You can find her in the shop under Cats.' }),
        h(
          'div',
          { class: 'row-buttons' },
          button(
            'Adopt her now',
            () => {
              store.update((d) => (d.equipped.fur = PITSI));
              this.nav.scene.outfit = { ...this.nav.scene.outfit, fur: PITSI };
              close();
            },
            'primary',
          ),
          button('Later', close, 'ghost'),
        ),
      ),
    );
    this.root.append(overlay);
  }
}
