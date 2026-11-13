import type { LevelProgress, SaveData } from './types.js';

/**
 * Combine this device's save with the cloud copy (pure, no I/O).
 *
 *  - Level progress: the best of both, per level (stars, score, combo).
 *  - Owned items: everything bought on either device.
 *  - Yarn, outfit and settings: whichever save changed most recently. Yarn is a balance, so it
 *    can't simply be added; while signed in, saves sync within seconds, so this rarely matters.
 *  - The audio offset always stays local: it depends on this device's speakers or headphones.
 */
export function mergeSaves(local: SaveData, remote: SaveData): SaveData {
  const newer = (remote.updatedAt ?? 0) > (local.updatedAt ?? 0) ? remote : local;

  const progress: Record<string, LevelProgress> = { ...remote.progress };
  for (const [id, p] of Object.entries(local.progress)) {
    const r = progress[id];
    progress[id] = r
      ? { stars: Math.max(p.stars, r.stars), bestScore: Math.max(p.bestScore, r.bestScore), bestCombo: Math.max(p.bestCombo, r.bestCombo) }
      : { ...p };
  }

  const owned = Array.from(new Set([...local.owned, ...remote.owned]));
  const equipped = { ...newer.equipped };
  for (const [cat, id] of Object.entries(equipped)) {
    if (!owned.includes(id)) equipped[cat as keyof typeof equipped] = local.equipped[cat as keyof typeof equipped];
  }

  return {
    version: Math.max(local.version, remote.version),
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
    settings: { ...newer.settings, audioOffsetMs: local.settings.audioOffsetMs },
    yarn: newer.yarn,
    progress,
    owned,
    equipped,
  };
}

/** True when two saves hold the same data (ignoring the timestamp). */
export function sameSave(a: SaveData, b: SaveData): boolean {
  return JSON.stringify({ ...a, updatedAt: 0 }) === JSON.stringify({ ...b, updatedAt: 0 });
}
