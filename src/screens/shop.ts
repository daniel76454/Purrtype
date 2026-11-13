import { h } from '../core/dom.js';
import type { Navigator, Screen } from '../core/screens.js';
import { store } from '../core/storage.js';
import { CATEGORIES, type Category } from '../core/types.js';
import { CATEGORY_LABELS, itemsIn, type ShopItem } from '../data/shop.js';
import { sfx } from '../audio/sfx.js';
import { header, icon } from './ui.js';
import { itemIcon } from '../render/cat.js';
import { MenuScreen } from './menu.js';

/** The cat in the background is the live preview: clicking an item tries it on. */
export class ShopScreen implements Screen {
  private tab: Category = 'hat';
  private body!: HTMLElement;
  private unsub?: () => void;

  constructor(private nav: Navigator) {}

  mount(root: HTMLElement): void {
    this.body = h('div', { class: 'grid' });
    const tabs = h('div', { class: 'tabs' });
    for (const c of CATEGORIES) {
      tabs.append(
        h('button', {
          class: 'tab',
          text: CATEGORY_LABELS[c],
          on: {
            click: () => {
              this.tab = c;
              tabs.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', CATEGORIES[i] === c));
              this.render();
            },
          },
        }),
      );
    }
    tabs.firstElementChild?.classList.add('active');

    root.append(
      h(
        'div',
        { class: 'screen left' },
        header('Shop', () => this.nav.go(new MenuScreen(this.nav))),
        h('div', { class: 'panel' }, tabs, this.body, h('p', { class: 'hint', text: 'Click an item to try it on the cat.' })),
      ),
    );
    this.applyEquipped();
    this.render();
    this.unsub = store.on('change', () => this.render());
  }

  unmount(): void {
    this.unsub?.();
  }

  private applyEquipped(): void {
    this.nav.scene.outfit = { ...store.data.equipped };
  }

  private render(): void {
    this.body.replaceChildren();
    for (const item of itemsIn(this.tab)) this.body.append(this.card(item));
  }

  private card(item: ShopItem): HTMLElement {
    const d = store.data;
    const owned = d.owned.includes(item.id);
    const equipped = d.equipped[item.category] === item.id;
    const trying = this.nav.scene.outfit[item.category] === item.id;
    const affordable = d.yarn >= item.price;

    const action = h(
      'button',
      {
        class: `btn small ${equipped ? 'ghost' : 'primary'}`,
        text: equipped ? 'Equipped' : owned ? 'Equip' : undefined,
        attrs: equipped || (!owned && !affordable) ? { disabled: 'true' } : {},
        on: {
          click: (e: Event) => {
            e.stopPropagation();
            if (owned) {
              store.update((s) => (s.equipped[item.category] = item.id));
              sfx.click();
            } else if (affordable) {
              store.update((s) => {
                s.yarn -= item.price;
                s.owned.push(item.id);
                s.equipped[item.category] = item.id;
              });
              sfx.buy();
            }
            this.applyEquipped();
          },
        },
      },
      ...(equipped || owned ? [] : [icon('yarn'), ` ${item.price}`]),
    );

    return h(
      'div',
      {
        class: `item ${trying ? 'trying' : ''}`,
        on: {
          click: () => {
            this.nav.scene.outfit = { ...store.data.equipped, [item.category]: item.id };
            sfx.click();
            this.render();
          },
        },
      },
      h('div', { class: 'swatch' }, itemIcon(item.id, this.nav.scene.outfit.fur)),
      h('div', { class: 'name', text: item.name }),
      action,
    );
  }
}
