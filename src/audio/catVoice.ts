import { sfx } from './sfx.js';

/**
 * The cat's voice during play: a calm purr when you hit a streak, and now and then a soft meow
 * when you miss (never two meows close together).
 */
const PURR_EVERY = 15; // combo milestones
const MEOW_CHANCE = 0.4;
const MEOW_GAP_MS = 6000;

let lastMeow = -Infinity;

export const catVoice = {
  combo(combo: number): void {
    if (combo > 0 && combo % PURR_EVERY === 0) sfx.purr();
  },
  miss(): void {
    const now = performance.now();
    if (now - lastMeow < MEOW_GAP_MS || Math.random() > MEOW_CHANCE) return;
    lastMeow = now;
    window.setTimeout(() => sfx.meow(), 260); // after the miss sound
  },
};
