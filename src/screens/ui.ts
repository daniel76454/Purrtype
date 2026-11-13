import { h } from '../core/dom.js';
import { store } from '../core/storage.js';
import { sfx } from '../audio/sfx.js';
import { cloud } from '../cloud/cloud.js';

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

/** Google sign-in / sync status. Renders nothing when the cloud isn't configured. */
export function accountChip(): HTMLElement | null {
  if (!cloud.enabled) return null;
  const el = h('div', { class: 'chip account' });
  const render = () => {
    if (!el.isConnected && el.dataset.mounted) return off();
    el.dataset.mounted = '1';
    const u = cloud.user;
    const status: Record<string, string> = { syncing: 'syncing…', synced: 'synced', error: 'sync error', loading: '…' };
    if (cloud.status === 'loading') el.replaceChildren(h('span', { class: 'dim', text: 'cloud…' }));
    else if (!u) el.replaceChildren(button('Sign in with Google', () => void cloud.signIn(), 'small'));
    else
      el.replaceChildren(
        h('span', { class: 'cloud-dot ' + cloud.status, attrs: { title: cloud.status === 'error' ? cloud.lastError : 'progress is saved to your account' } }),
        h('span', { text: cloud.nickname }),
        h('span', { class: 'dim', text: status[cloud.status] ?? '' }),
        button('sign out', () => void cloud.signOut(), 'ghost small'),
      );
  };
  const off = cloud.on('change', render);
  render();
  return el;
}

/**
 * Top 5 scores for a level (only when the cloud is configured).
 * Posts `score` first if the player is signed in and it beats their best (0 = don't post).
 */
export function leaderboardBox(levelId: string, score: number, combo: number): HTMLElement | null {
  if (!cloud.enabled) return null;
  const list = h('ol', { class: 'board-list' }, h('li', { class: 'dim', text: 'loading…' }));
  const foot = h('div', { class: 'board-foot' });
  const load = async () => {
    if (score > 0 && cloud.user) await cloud.submitScore(levelId, score, combo);
    const top = await cloud.topScores(levelId, 5);
    list.replaceChildren(
      ...(top.length
        ? top.map((e) => h('li', { class: e.uid === cloud.user?.uid ? 'me' : '' }, h('span', { text: e.name }), h('b', { text: String(e.score) })))
        : [h('li', { class: 'dim', text: 'no scores yet' })]),
    );
    foot.replaceChildren();
    if (!cloud.user && score > 0)
      foot.append(
        button(
          'Sign in to post your score',
          async () => {
            await cloud.signIn();
            if (cloud.user) void load();
          },
          'small',
        ),
      );
  };
  void load();
  return h('div', { class: 'board' }, h('h3', { text: 'Leaderboard' }), list, foot);
}
