export type Grade = 'perfect' | 'good' | 'off';
export type Layer = 'melody' | 'pad' | 'bass' | 'drums';
export const LAYERS: Layer[] = ['melody', 'pad', 'bass', 'drums'];

export type Category = 'fur' | 'hat' | 'collar' | 'toy' | 'room' | 'decor';
export const CATEGORIES: Category[] = ['fur', 'hat', 'collar', 'toy', 'room', 'decor'];
/** Categories where exactly one item is worn or used at a time. */
export type SingleCategory = Exclude<Category, 'decor'>;
/** What the cat wears and the room looks like. Decor is additive: any number of items at once. */
export type Outfit = Record<SingleCategory, string> & {
  decor: string[];
  /** Chosen colour/design per item id (see ShopItem.variants). */
  tints: Record<string, string>;
};

export interface Settings {
  master: number; // 0..1
  music: number;
  sfx: number;
  metronome: boolean; // audible click on every beat
  beatGuide: boolean; // visual beat pips in the typing panel
  reducedMotion: boolean;
  audioOffsetMs: number; // latency compensation, positive = player hears late
  /** On-screen keyboard with finger hints: 'auto' shows it on Home Row and whenever a level brings in new keys. */
  keyboardGuide: 'auto' | 'on' | 'off';
  /** Background music on the menu screens. */
  menuMusic: boolean;
  /** Name shown on leaderboards (chosen by the player; never taken from their Google account). */
  playerName: string;
}

export interface LevelProgress {
  stars: number;
  bestScore: number;
  bestCombo: number;
  /** Practice mode only. */
  bestWpm?: number;
  bestAccuracy?: number;
}

export interface SaveData {
  version: number;
  /** ms since epoch of the last local change; decides which device wins for yarn, outfit and settings. */
  updatedAt: number;
  settings: Settings;
  yarn: number;
  progress: Record<string, LevelProgress>;
  owned: string[];
  equipped: Outfit;
  /** Times the cat was petted on the main menu (an easter egg). */
  pets: number;
}
