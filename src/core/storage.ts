import { Emitter } from './events.js';
import type { SaveData } from './types.js';

const KEY = 'purrtype.save';

export function defaultSave(): SaveData {
  return {
    version: 1,
    settings: {
      master: 0.8,
      music: 0.8,
      sfx: 0.7,
      metronome: false,
      beatGuide: true,
      reducedMotion: false,
      audioOffsetMs: 0,
    },
    yarn: 0,
    progress: {},
    owned: ['hat.none', 'collar.none', 'toy.yarn', 'fur.orange', 'decor.none'],
    equipped: {
      hat: 'hat.none',
      collar: 'collar.none',
      toy: 'toy.yarn',
      fur: 'fur.orange',
      decor: 'decor.none',
    },
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
      const p = JSON.parse(raw) as Partial<SaveData>;
      const d = defaultSave();
      this.data = {
        ...d,
        ...p,
        settings: { ...d.settings, ...p.settings },
        equipped: { ...d.equipped, ...p.equipped },
        progress: p.progress ?? {},
        owned: Array.from(new Set([...d.owned, ...(p.owned ?? [])])),
      };
    } catch {
      /* corrupt or unavailable storage: keep defaults */
    }
  }

  save(): void {
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
