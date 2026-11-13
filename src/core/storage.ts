import { Emitter } from './events.js';
import type { Outfit, SaveData } from './types.js';

const KEY = 'purrtype.save';

export function defaultSave(): SaveData {
  return {
    version: 1,
    updatedAt: 0,
    settings: {
      master: 0.8,
      music: 0.8,
      sfx: 0.7,
      metronome: false,
      beatGuide: true,
      reducedMotion: false,
      audioOffsetMs: 0,
      keyboardGuide: 'auto',
      menuMusic: true,
      playerName: '',
    },
    yarn: 0,
    progress: {},
    owned: ['hat.none', 'collar.none', 'toy.yarn', 'fur.orange', 'room.night'],
    equipped: {
      hat: 'hat.none',
      collar: 'collar.none',
      toy: 'toy.yarn',
      fur: 'fur.orange',
      room: 'room.night',
      decor: [],
    },
  };
}

/**
 * Fill in anything a save is missing and upgrade old formats (used for local and cloud saves).
 * Older saves stored one decor item as a string ('decor.none' meant nothing).
 */
export function normalizeSave(raw: unknown): SaveData {
  const p = (raw ?? {}) as Partial<SaveData> & { equipped?: Partial<Outfit> & { decor?: string | string[] } };
  const d = defaultSave();
  const oldDecor = p.equipped?.decor;
  const decor = Array.isArray(oldDecor) ? oldDecor : oldDecor && oldDecor !== 'decor.none' ? [oldDecor] : [];
  return {
    ...d,
    ...p,
    settings: { ...d.settings, ...p.settings },
    equipped: { ...d.equipped, ...p.equipped, decor },
    progress: p.progress ?? {},
    owned: Array.from(new Set([...d.owned, ...(p.owned ?? [])])).filter((id) => id !== 'decor.none'),
  };
}

/** Save data in localStorage. All reads/writes are guarded; the game works without storage. */
class Store extends Emitter<{ change: void }> {
  data: SaveData = defaultSave();

  constructor() {
    super();
    this.load();
  }

  load(): void {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      this.data = normalizeSave(JSON.parse(raw));
    } catch {
      /* corrupt or unavailable storage: keep defaults */
    }
  }

  save(): void {
    this.data.updatedAt = Date.now();
    this.write();
  }

  /** Replace the save (e.g. after merging with the cloud copy) without bumping its timestamp. */
  replace(data: SaveData): void {
    this.data = data;
    this.write();
  }

  private write(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignore */
    }
    this.emit('change');
  }

  update(fn: (d: SaveData) => void): void {
    fn(this.data);
    this.save();
  }

  reset(): void {
    this.data = defaultSave();
    this.save();
  }
}

export const store = new Store();
