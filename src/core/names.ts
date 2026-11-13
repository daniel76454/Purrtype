/** Leaderboard nicknames (pure). Players pick their own; nothing from their Google account is shown. */

const ADJ = ['Sleepy', 'Cozy', 'Fuzzy', 'Tiny', 'Quiet', 'Velvet', 'Misty', 'Mellow', 'Starry', 'Snug', 'Purring', 'Lazy'];
const NOUN = ['Paws', 'Whisker', 'Mochi', 'Bean', 'Mitten', 'Biscuit', 'Noodle', 'Tofu', 'Pebble', 'Muffin', 'Yarn', 'Moth'];

export const NAME_MAX = 16;

/** A random cozy nickname like "SleepyBean27". */
export function randomNickname(rnd: () => number = Math.random): string {
  const pick = (a: string[]) => a[Math.floor(rnd() * a.length)]!;
  return `${pick(ADJ)}${pick(NOUN)}${10 + Math.floor(rnd() * 90)}`;
}

/** Keep letters, digits, spaces, '_', '-' and '.'; trim; cap the length. Empty if nothing is left. */
export function cleanNickname(name: string): string {
  return name
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}
