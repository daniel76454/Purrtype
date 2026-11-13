import { h } from '../core/dom.js';
import { store } from '../core/storage.js';
import { audio } from '../audio/engine.js';
import { sfx } from '../audio/sfx.js';
import { calibrationOffset } from '../game/calibrate.js';
import { button } from './ui.js';

const BPM = 90;
const CLICKS = 16;
const WARMUP = 4; // taps on the first clicks are ignored while the player finds the beat

/**
 * Tap-along calibration dialog. Plays a steady click; the player taps any key on each click.
 * Audio only on purpose: visuals have their own delay and would skew the result.
 */
export function openCalibration(root: HTMLElement, onClose: () => void): void {
  const msg = h('p', { class: 'hint', text: 'Listen to the clicks and tap any key exactly on each one. Closing your eyes helps. It takes about 10 seconds.' });
  const dots = h('div', { class: 'calib-dots' }, ...Array.from({ length: CLICKS - WARMUP }, () => h('span')));
  const result = h('div', { class: 'calib-result' });
  const actions = h('div', { class: 'row-buttons' });
  const dialog = h('div', { class: 'panel dialog calib' }, h('h2', { text: 'Timing calibration' }), msg, dots, result, actions);
  const overlay = h('div', { class: 'overlay' }, dialog);
  root.append(overlay);

  let taps: number[] = [];
  let clicks: number[] = [];
  let running = false;
  let timer = 0;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return close();
    if (!running || e.repeat) return;
    e.preventDefault();
    const t = audio.keyTimeToCtx(e);
    if (t < clicks[WARMUP]! - 0.3) return;
    taps.push(t);
    dots.children[Math.min(taps.length, CLICKS - WARMUP) - 1]?.classList.add('on');
  };

  const close = () => {
    clearTimeout(timer);
    window.removeEventListener('keydown', onKey);
    overlay.remove();
    onClose();
  };

  const start = async () => {
    await audio.resume();
    taps = [];
    [...dots.children].forEach((d) => d.classList.remove('on'));
    result.textContent = '';
    const spb = 60 / BPM;
    const t0 = audio.ctx.currentTime + 0.8;
    clicks = Array.from({ length: CLICKS }, (_, i) => t0 + i * spb);
    clicks.forEach((t, i) => sfx.tick(t, i % 4 === 0));
    running = true;
    actions.replaceChildren(button('Cancel', close, 'ghost'));
    msg.textContent = 'Tap along… (the first four clicks are a warm-up)';
    timer = window.setTimeout(finish, (t0 - audio.ctx.currentTime + CLICKS * spb + 0.4) * 1000);
  };

  const finish = () => {
    running = false;
    const r = calibrationOffset(taps, clicks.slice(WARMUP));
    if (!r) {
      msg.textContent = 'Not enough taps landed near the clicks. Give it another go!';
      actions.replaceChildren(button('Try again', () => void start(), 'primary'), button('Close', close, 'ghost'));
      return;
    }
    const was = store.data.settings.audioOffsetMs;
    store.update((d) => (d.settings.audioOffsetMs = r.offsetMs));
    const side = r.offsetMs > 0 ? `${r.offsetMs} ms late` : r.offsetMs < 0 ? `${-r.offsetMs} ms early` : 'right on time';
    msg.textContent = `You heard and tapped ${side} on average, so the offset is now ${r.offsetMs > 0 ? '+' : ''}${r.offsetMs} ms (was ${was} ms).`;
    result.textContent = r.spreadMs > 60 ? 'Your taps were a bit uneven. Run it again for a steadier result.' : 'Nice and steady.';
    actions.replaceChildren(button('Done', close, 'primary'), button('Run again', () => void start(), 'ghost'));
  };

  window.addEventListener('keydown', onKey);
  actions.replaceChildren(button('Start', () => void start(), 'primary'), button('Cancel', close, 'ghost'));
}
