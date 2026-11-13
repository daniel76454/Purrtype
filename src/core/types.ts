export type Grade = 'perfect' | 'good' | 'off';
export type Layer = 'melody' | 'pad' | 'bass' | 'drums';
export const LAYERS: Layer[] = ['melody', 'pad', 'bass', 'drums'];

export type Category = 'hat' | 'collar' | 'toy' | 'fur' | 'decor';
export const CATEGORIES: Category[] = ['hat', 'collar', 'toy', 'fur', 'decor'];
export type Outfit = Record<Category, string>;

export interface Settings {
  master: number; // 0..1
  music: number;
  sfx: number;
  metronome: boolean; // audible click on every beat
  beatGuide: boolean; // visual beat pips in the typing panel
  reducedMotion: boolean;
  audioOffsetMs: number; // latency compensation, positive = player hears late
  /** On-screen keyboard with finger hints: 'auto' shows it in the Home Row section only. */
  keyboardGuide: 'auto' | 'on' | 'off';
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
}
