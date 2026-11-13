import { audio } from './engine.js';
import { MusicDirector } from './music.js';
import { store } from '../core/storage.js';
import type { SectionDef } from '../data/sections.js';
import { DEFAULT_THEME } from '../render/cat.js';

/** A slow, gentle loop for the menus (no count-in, a little quieter than the levels). */
const MENU_SONG: SectionDef = {
  id: 'menu',
  name: 'Menu',
  blurb: '',
  bpm: 66,
  music: { rootMidi: 62, scale: [0, 2, 4, 5, 7, 9, 11], progression: [3, 4, 2, 5], seed: 5 },
  theme: DEFAULT_THEME,
  levels: [],
};

/**
 * Background music for the menu screens. It keeps playing while you move between menu, level
 * select, shop and settings, and fades out when a level or practice starts.
 * Browsers only allow sound after a click or key press, so it waits for the first one.
 */
class MenuMusic {
  private dir: MusicDirector | null = null;
  private wanted = false;
  private armed = false;

  /** Call on every screen change: true for menu screens. */
  set(active: boolean): void {
    this.wanted = active && store.data.settings.menuMusic;
    if (this.wanted) this.start();
    else this.stop();
  }

  private start(): void {
    if (this.dir) return;
    if (!audio.ready) return this.arm();
    const dir = new MusicDirector();
    this.dir = dir;
    void audio.resume().then(() => {
      if (this.dir === dir && this.wanted) void dir.start(MENU_SONG, 0.4, { clicks: false, volume: 0.75 });
    });
  }

  private stop(): void {
    this.dir?.stop(0.8);
    this.dir = null;
  }

  /** Wait for the first click or key press, which is when the browser allows audio. */
  private arm(): void {
    if (this.armed) return;
    this.armed = true;
    const go = () => {
      window.removeEventListener('pointerdown', go, true);
      window.removeEventListener('keydown', go, true);
      this.armed = false;
      if (!this.wanted) return;
      void audio.resume().then(() => this.start());
    };
    window.addEventListener('pointerdown', go, true);
    window.addEventListener('keydown', go, true);
  }
}

export const menuMusic = new MenuMusic();
