import { h } from '../core/dom.js';
import { store } from '../core/storage.js';
import { sfx } from '../audio/sfx.js';

export function button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  return h('button', {
    class: `btn ${cls}`.trim(),
    text: label,
    on: {
      click: () => {
        sfx.click();
        onClick();
      },
    },
  });
}

export type IconName = 'heart' | 'star' | 'yarn' | 'lock';

/** A small pixel-art icon (drawn in styles.css). */
export function icon(name: IconName, extra = ''): HTMLElement {
  return h('span', { class: `px-icon ${name} ${extra}`.trim(), attrs: { 'aria-hidden': 'true' } });
}

/** Three pixel stars, `n` of them filled. */
export function starRow(n: number, cls = ''): HTMLElement {
  return h(
    'span',
    { class: `stars ${cls}`.trim(), attrs: { 'aria-label': `${n} of 3 stars` } },
    ...[0, 1, 2].map((i) => icon('star', i < n ? '' : 'empty')),
  );
}

export function yarnChip(): HTMLElement {
  const num = h('span', { text: String(store.data.yarn) });
  const chip = h('div', { class: 'chip yarn' }, icon('yarn'), num);
  const render = () => (num.textContent = String(store.data.yarn));
  store.on('change', render);
  return chip;
}

/** Back button + title row used by every sub-screen. */
export function header(title: string, onBack: () => void): HTMLElement {
  return h('div', { class: 'header' }, button('< back', onBack, 'ghost'), h('h2', { text: title }), yarnChip());
}

export function slider(label: string, value: number, min: number, max: number, step: number, fmt: (v: number) => string, onInput: (v: number) => void): HTMLElement {
  const out = h('span', { class: 'value', text: fmt(value) });
  const input = h('input', { attrs: { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) } });
  input.addEventListener('input', () => {
    const v = Number(input.value);
    out.textContent = fmt(v);
    onInput(v);
  });
  return h('label', { class: 'row' }, h('span', { class: 'label', text: label }), input, out);
}

export function toggle(label: string, value: boolean, onChange: (v: boolean) => void): HTMLElement {
  const input = h('input', { attrs: { type: 'checkbox' } });
  input.checked = value;
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'row' }, h('span', { class: 'label', text: label }), input);
}
