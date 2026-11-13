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
    if (!r) {
      progress[id] = { ...p };
      continue;
    }
    const best: LevelProgress = { stars: Math.max(p.stars, r.stars), bestScore: Math.max(p.bestScore, r.bestScore), bestCombo: Math.max(p.bestCombo, r.bestCombo) };
    if (p.bestWpm !== undefined || r.bestWpm !== undefined) best.bestWpm = Math.max(p.bestWpm ?? 0, r.bestWpm ?? 0);
    if (p.bestAccuracy !== undefined || r.bestAccuracy !== undefined) best.bestAccuracy = Math.max(p.bestAccuracy ?? 0, r.bestAccuracy ?? 0);
    progress[id] = best;
  }

  const owned = Array.from(new Set([...local.owned, ...remote.owned]));
  const equipped = { ...newer.equipped, decor: newer.equipped.decor.filter((id) => owned.includes(id)), tints: { ...local.equipped.tints, ...newer.equipped.tints } };
  for (const cat of ['fur', 'hat', 'collar', 'toy', 'room'] as const) {
    if (!owned.includes(equipped[cat])) equipped[cat] = local.equipped[cat];
  }

  return {
    version: Math.max(local.version, remote.version),
    updatedAt: Math.max(local.updatedAt ?? 0, remote.updatedAt ?? 0),
    settings: { ...newer.settings, audioOffsetMs: local.settings.audioOffsetMs },
    yarn: newer.yarn,
    pets: Math.max(local.pets ?? 0, remote.pets ?? 0),
    progress,
    owned,
    equipped,
  };
}

/** True when two saves hold the same data (ignoring the timestamp). */
export function sameSave(a: SaveData, b: SaveData): boolean {
  return JSON.stringify({ ...a, updatedAt: 0 }) === JSON.stringify({ ...b, updatedAt: 0 });
}
