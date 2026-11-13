import { h } from '../core/dom.js';
import type { Navigator, Screen } from '../core/screens.js';
import { store } from '../core/storage.js';
import { CATEGORIES, type Category, type Outfit } from '../core/types.js';
import { CATEGORY_LABELS, itemsIn, variantOf, type ShopItem } from '../data/shop.js';
import { sfx } from '../audio/sfx.js';
import { header, icon } from './ui.js';
import { itemIcon } from '../render/cat.js';
import { MenuScreen } from './menu.js';

/** The cat in the background is the live preview: clicking an item tries it on. */
export class ShopScreen implements Screen {
  readonly menuMusic = true;
  private tab: Category = 'fur';
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
        h('div', { class: 'panel' }, tabs, this.body, h('p', { class: 'hint', text: 'Click an item to preview it. Decor adds up: place as many pieces as you like.' })),
      ),
    );
    this.applyEquipped();
    this.render();
    this.unsub = store.on('change', () => this.render());
  }

  unmount(): void {
    this.unsub?.();
  }

  /** Show what's actually equipped (copying the decor list so previews can't change the save). */
  private applyEquipped(): void {
    const e = store.data.equipped;
    this.nav.scene.outfit = { ...e, decor: [...e.decor], tints: { ...e.tints } };
  }

  private render(): void {
    this.body.replaceChildren();
    // secret items only show up once they're yours
    for (const item of itemsIn(this.tab)) if (!item.secret || store.data.owned.includes(item.id)) this.body.append(this.card(item));
  }

  /** Is this item in use: worn, or (for decor) placed in the room? */
  private inUse(item: ShopItem, outfit = store.data.equipped): boolean {
    return item.category === 'decor' ? outfit.decor.includes(item.id) : outfit[item.category] === item.id;
  }

  /** Wear/place an item in a save's outfit. Decor toggles in and out; everything else swaps. */
  private use(item: ShopItem, outfit: Outfit): void {
    if (item.category !== 'decor') outfit[item.category] = item.id;
    else if (outfit.decor.includes(item.id)) outfit.decor = outfit.decor.filter((d) => d !== item.id);
    else outfit.decor = [...outfit.decor, item.id];
  }

  private card(item: ShopItem): HTMLElement {
    const d = store.data;
    const owned = d.owned.includes(item.id);
    const inUse = this.inUse(item);
    const decor = item.category === 'decor';
    const trying = this.inUse(item, this.nav.scene.outfit) && !inUse;
    const affordable = d.yarn >= item.price;
    // worn items can't be "unequipped" (pick another instead); decor can be removed
    const label = !owned ? undefined : decor ? (inUse ? 'Remove' : 'Place') : inUse ? 'Equipped' : 'Equip';
    const disabled = (!decor && inUse) || (!owned && !affordable);

    const action = h(
      'button',
      {
        class: `btn small ${(!decor && inUse) || (decor && inUse) ? 'ghost' : 'primary'}`,
        text: label,
        attrs: disabled ? { disabled: 'true' } : {},
        on: {
          click: (e: Event) => {
            e.stopPropagation();
            if (owned) {
              store.update((s) => this.use(item, s.equipped));
              sfx.click();
            } else if (affordable) {
              store.update((s) => {
                s.yarn -= item.price;
                s.owned.push(item.id);
                if (!this.inUse(item, s.equipped)) this.use(item, s.equipped);
              });
              sfx.buy();
            }
            this.applyEquipped();
          },
        },
      },
      ...(owned ? [] : [icon('yarn'), ` ${item.price}`]),
    );

    return h(
      'div',
      {
        class: `item ${trying || (!decor && this.inUse(item, this.nav.scene.outfit) && !inUse) ? 'trying' : ''} ${inUse ? 'in-use' : ''}`,
        on: {
          click: () => {
            // preview: try it on (or, for decor, see the room with it toggled)
            const preview = { ...store.data.equipped, decor: [...store.data.equipped.decor], tints: { ...this.nav.scene.outfit.tints } };
            if (!(decor ? false : inUse)) this.use(item, preview);
            this.nav.scene.outfit = preview;
            sfx.click();
            this.render();
          },
        },
      },
      h('div', { class: 'swatch' }, itemIcon(item.id, this.nav.scene.outfit.fur, this.nav.scene.outfit.tints)),
      h('div', { class: 'name', text: item.name }),
      this.variantPicker(item, owned),
      action,
    );
  }

  /** Colour/design dots for decor. Free to change once owned; before that they just preview. */
  private variantPicker(item: ShopItem, owned: boolean): HTMLElement | null {
    if (!item.variants) return null;
    const current = variantOf(item.id, this.nav.scene.outfit.tints)?.id;
    return h(
      'div',
      { class: 'variants' },
      ...item.variants.map((v) =>
        h('button', {
          class: `variant ${v.id === current ? 'on' : ''}`,
          attrs: { title: v.name, 'aria-label': v.name, style: `background:${v.color}` },
          on: {
            click: (e: Event) => {
              e.stopPropagation();
              sfx.click();
              if (owned) store.update((s) => (s.equipped.tints = { ...s.equipped.tints, [item.id]: v.id }));
              const o = this.nav.scene.outfit;
              const decor = o.decor.includes(item.id) ? o.decor : [...o.decor, item.id];
              this.nav.scene.outfit = { ...o, decor, tints: { ...o.tints, [item.id]: v.id } };
              this.render();
            },
          },
        }),
      ),
    );
  }
}
