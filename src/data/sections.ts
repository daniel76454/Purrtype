import type { Layer, LevelProgress } from '../core/types.js';

export interface MusicDef {
  rootMidi: number;
  scale: number[]; // semitone offsets of the scale
  progression: number[]; // scale degree (0-based) of the chord root for each bar
  seed: number; // seeds the procedural melody
  /** Optional real stems. All must share the section BPM, length and start on beat 0. */
  stems?: Partial<Record<Layer, string>>;
}

/** Colours of the late-night room for a section (see src/render/cat.ts). */
export interface Theme {
  wall: string;
  wallDark: string;
  floor: string;
  floorDark: string;
  skyTop: string;
  skyBottom: string;
  /** Lamp light. */
  glow: string;
  /** Lamp shade, curtains, rug and the monitor's equaliser. */
  accent: string;
  /** Rain on the window. */
  rain?: boolean;
}

export interface LevelDef {
  id: string;
  name: string;
  /** 1 = one judged slot per beat, 2 = two per beat. */
  grid: 1 | 2;
  /** Base "good" window in ms; tightened further by the grid (see judgeTiming). */
  windowMs: number;
  /** A short, optional typing tip shown until the level is first cleared. Suggestions, not rules. */
  tip?: string;
  /** Characters this level is allowed to use (checked by `npm test`). */
  pool: string;
  lines: string[];
}

export interface SectionDef {
  id: string;
  name: string;
  blurb: string;
  bpm: number;
  music: MusicDef;
  theme: Theme;
  levels: LevelDef[];
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

const HOME_CORE = 'asdfjkl ';
const HOME = 'asdfghjkl ';
const TOP = HOME + 'qwertyuiop';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const EVERYTHING = LOWER + LOWER.toUpperCase() + " .,'!?";

export const SECTIONS: SectionDef[] = [
  {
    id: 's1',
    name: 'Home Row',
    blurb: 'Rest your fingers and find the beat.',
    bpm: 70,
    music: { rootMidi: 60, scale: MAJOR, progression: [0, 5, 3, 4], seed: 11 },
    theme: {
      wall: '#2b2347',
      wallDark: '#17122b',
      floor: '#4a3442',
      floorDark: '#22172a',
      skyTop: '#090c24',
      skyBottom: '#3a3f7e',
      glow: '#ffb35c',
      accent: '#f2a65a',
    },
    levels: [
      {
        id: 's1l1',
        name: 'Warm Up',
        tip: 'Tip: rest your index fingers on F and J (feel the little bumps). The others settle on A S D and K L.',
        grid: 1,
        windowMs: 150,
        pool: HOME_CORE,
        lines: [
          'a lad asks dad',
          'dad adds a salad',
          'a sad lass falls',
        ],
      },
      {
        id: 's1l2',
        name: 'First Steps',
        tip: 'Tip: tap space with whichever thumb feels natural.',
        grid: 1,
        windowMs: 145,
        pool: HOME_CORE,
        lines: [
          'a lass asks a lad',
          'dad adds a flask',
          'all fall as a lass asks',
        ],
      },
      {
        id: 's1l3',
        name: 'Gliding',
        tip: 'Tip: G and H are a small sideways reach for the index fingers. Then drift back home.',
        grid: 1,
        windowMs: 135,
        pool: HOME,
        lines: [
          'a glad lad had a flag',
          'dad has a glass flask',
          'a lass shall dash as a gal falls',
        ],
      },
      {
        id: 's1l4',
        name: 'Glad Flags',
        tip: 'Tip: try keeping your eyes on the screen, not your hands. Your fingers know more than you think.',
        grid: 1,
        windowMs: 130,
        pool: HOME,
        lines: [
          'half a hall has a sad glass',
          'a flash falls as dad asks',
          'a glad hag had a salad',
        ],
      },
      {
        id: 's1l5',
        name: 'Double Time',
        tip: 'Tip: at double time, lighter taps are faster than harder ones. Stay loose.',
        grid: 2,
        windowMs: 115,
        pool: HOME,
        lines: [
          'all lads shall flash a glad flag',
          'a glass flask falls as a lad has a dash',
          'dad has a dash as a sad lass falls',
        ],
      },
      {
        id: 's1l6',
        name: 'Dash',
        grid: 2,
        windowMs: 110,
        pool: HOME,
        lines: [
          'half a salad falls as a hag asks dad',
          'a glad lass has a flask as a flag falls',
          'a lass has a sad flag as dad shall dash',
        ],
      },
    ],
  },
  {
    id: 's2',
    name: 'Top Row',
    blurb: 'Reach up. The kitty has found some wool.',
    bpm: 80,
    music: { rootMidi: 62, scale: MAJOR, progression: [0, 4, 5, 3], seed: 23 },
    theme: {
      wall: '#2a2450',
      wallDark: '#15112e',
      floor: '#3b3352',
      floorDark: '#1c1730',
      skyTop: '#120c2a',
      skyBottom: '#5a3f7a',
      glow: '#ff9ec4',
      accent: '#c39bf0',
      rain: true,
    },
    levels: [
      {
        id: 's2l1',
        name: 'Reaching Up',
        tip: 'Tip: reach up from the home row and come back. Left hand takes Q to T, right hand takes Y to P.',
        grid: 1,
        windowMs: 150,
        pool: TOP,
        lines: [
          'the kitty is quite shy',
          'outside the sky is gray',
          'the kitty sits at the fire',
        ],
      },
      {
        id: 's2l2',
        name: 'Rainy Window',
        grid: 1,
        windowMs: 145,
        pool: TOP,
        lines: [
          'a lady has a toy of wool',
          'the kitty hopes to play',
          'the lady tosses the wool',
        ],
      },
      {
        id: 's2l3',
        name: 'Wool Chase',
        tip: "Tip: if a key feels better with a different finger, that's fine. Find what's comfortable for you.",
        grid: 1,
        windowMs: 135,
        pool: TOP,
        lines: [
          'the lady drops the wool',
          'the kitty leaps up to get it',
          'the wool rolls past the door',
        ],
      },
      {
        id: 's2l4',
        name: 'Up the Stairs',
        grid: 1,
        windowMs: 130,
        pool: TOP,
        lines: [
          'the kitty tries to get it',
          'it rolls up the stairs',
          'the kitty is quite loud',
        ],
      },
      {
        id: 's2l5',
        name: 'Quiet Day',
        grid: 2,
        windowMs: 115,
        pool: TOP,
        lines: [
          'the lady laughs as the kitty yells',
          'the quiet door is the way to the yard',
          'the kitty is a little tired',
        ],
      },
      {
        id: 's2l6',
        name: 'Tired Kitty',
        grid: 2,
        windowMs: 110,
        pool: TOP,
        lines: [
          'the toy of wool is her joy',
          'the kitty hugs the wool tight',
          'it is quite a quiet day',
        ],
      },
    ],
  },
  {
    id: 's3',
    name: 'Everything',
    blurb: 'Capitals, commas and a long night of play.',
    bpm: 90,
    music: { rootMidi: 57, scale: MINOR, progression: [0, 5, 2, 6], seed: 37 },
    theme: {
      wall: '#1d2b3f',
      wallDark: '#0d1522',
      floor: '#2a3445',
      floorDark: '#121a26',
      skyTop: '#04081a',
      skyBottom: '#1d3b5c',
      glow: '#ffd27a',
      accent: '#7fd1b9',
    },
    levels: [
      {
        id: 's3l1',
        name: 'Moonlight',
        tip: "Tip: for capitals, many typists hold Shift with the other hand's little finger.",
        grid: 1,
        windowMs: 150,
        pool: EVERYTHING,
        lines: [
          'Mochi is a cozy cat.',
          'She loves to play by the window.',
          'The moon is bright tonight.',
        ],
      },
      {
        id: 's3l2',
        name: 'Big Eyes',
        tip: 'Tip: comma and period sit just below K and L.',
        grid: 1,
        windowMs: 145,
        pool: EVERYTHING,
        lines: [
          'A tiny toy swings back and forth.',
          'Mochi watches it with big eyes.',
          'Soon the room is warm and quiet.',
        ],
      },
      {
        id: 's3l3',
        name: 'Pounce',
        grid: 1,
        windowMs: 135,
        pool: EVERYTHING,
        lines: [
          'Tonight the toy feels different.',
          'It swings a little faster, a little higher.',
          'Mochi crouches, wiggles, and waits.',
        ],
      },
      {
        id: 's3l4',
        name: 'Follow the String',
        grid: 1,
        windowMs: 130,
        pool: EVERYTHING,
        lines: [
          'Then she jumps, but the toy is gone!',
          'Quick, quick, follow that string.',
          'Down the hall, under the chair, round the rug.',
        ],
      },
      {
        id: 's3l5',
        name: 'Midnight Zoomies',
        tip: "Tip: short breaks between levels help more than you'd think. Stretch those paws.",
        grid: 2,
        windowMs: 115,
        pool: EVERYTHING,
        lines: [
          'Mochi dashes across the kitchen floor.',
          'Her paws skid on the cool, smooth tiles.',
          'The toy bounces behind the old armchair.',
        ],
      },
      {
        id: 's3l6',
        name: 'Curled Up',
        grid: 2,
        windowMs: 110,
        pool: EVERYTHING,
        lines: [
          'She squeezes through, wiggling her tail.',
          'At last, the toy is hers again.',
          'Purring, Mochi curls up and falls asleep.',
        ],
      },
    ],
  },
  {
    id: 's4',
    name: 'Night Owl',
    blurb: 'Two in the morning. Faster beats, and a mystery toy.',
    bpm: 105,
    music: { rootMidi: 55, scale: MINOR, progression: [0, 3, 4, 2], seed: 51 },
    theme: {
      wall: '#2a1f3d',
      wallDark: '#140e24',
      floor: '#3a2c40',
      floorDark: '#1a1222',
      skyTop: '#0a0618',
      skyBottom: '#4a2a5e',
      glow: '#ff8f6b',
      accent: '#e86a8a',
    },
    levels: [
      {
        id: 's4l1',
        name: 'Wide Awake',
        tip: 'Tip: speed comes from rhythm, not force. Let the beat carry you.',
        grid: 1,
        windowMs: 130,
        pool: EVERYTHING,
        lines: [
          'Mochi wakes up. The clock says two.',
          'The house is dark and very still.',
          'Somewhere, a small bell is ringing.',
        ],
      },
      {
        id: 's4l2',
        name: 'The Bell',
        grid: 1,
        windowMs: 125,
        pool: EVERYTHING,
        lines: [
          'She hops off the bed without a sound.',
          'The bell is on a new toy by the door.',
          'Who left it there? Nobody knows.',
        ],
      },
      {
        id: 's4l3',
        name: 'Tiptoe',
        grid: 2,
        windowMs: 110,
        pool: EVERYTHING,
        lines: [
          'She sniffs it once, then twice.',
          'It smells like rain and fresh mint.',
          'With one soft paw, she taps it.',
        ],
      },
      {
        id: 's4l4',
        name: 'Rolling Away',
        grid: 2,
        windowMs: 105,
        pool: EVERYTHING,
        lines: [
          'The toy rolls away down the hall!',
          'Mochi chases it past the sleepy plants.',
          'It bumps the wall and spins around.',
        ],
      },
      {
        id: 's4l5',
        name: 'Kitchen Run',
        grid: 2,
        windowMs: 100,
        pool: EVERYTHING,
        lines: [
          'Into the kitchen, over the cold tiles.',
          'The toy hides under the fridge, of course.',
          'Mochi lies flat and reaches in.',
        ],
      },
      {
        id: 's4l6',
        name: 'Got It',
        grid: 2,
        windowMs: 95,
        pool: EVERYTHING,
        lines: [
          'Her paw finds it. Got it, at last!',
          'She carries it back, proud as a queen.',
          'Then she drops it right on the pillow.',
        ],
      },
    ],
  },
  {
    id: 's5',
    name: 'Witching Hour',
    blurb: 'The fastest section. A storm, a moth, and quick little paws.',
    bpm: 120,
    music: { rootMidi: 53, scale: MINOR, progression: [0, 5, 3, 4], seed: 67 },
    theme: {
      wall: '#1f2236',
      wallDark: '#0e1020',
      floor: '#2e3044',
      floorDark: '#14151f',
      skyTop: '#0b0d1f',
      skyBottom: '#7a4a6a',
      glow: '#ffc46b',
      accent: '#9fb6ff',
      rain: true,
    },
    levels: [
      {
        id: 's5l1',
        name: 'Three O\'Clock',
        tip: 'Tip: if you slip, let the word go and catch the next beat. The cat will fetch the toy back.',
        grid: 1,
        windowMs: 120,
        pool: EVERYTHING,
        lines: [
          'At three, the wind starts to howl.',
          'The window rattles and the lamp flickers.',
          'Mochi\'s tail puffs up like a brush.',
        ],
      },
      {
        id: 's5l2',
        name: 'Shadows',
        grid: 2,
        windowMs: 110,
        pool: EVERYTHING,
        lines: [
          'A shadow moves across the wall.',
          'Is it a monster? No, just a moth.',
          'Mochi leaps, but the moth is quicker.',
        ],
      },
      {
        id: 's5l3',
        name: 'Moth Chase',
        grid: 2,
        windowMs: 100,
        pool: EVERYTHING,
        lines: [
          'Up the shelf, past the books, she climbs.',
          'A vase wobbles. Careful, Mochi!',
          'The moth flutters out of the window.',
        ],
      },
      {
        id: 's5l4',
        name: 'Storm',
        grid: 2,
        windowMs: 90,
        pool: EVERYTHING,
        lines: [
          'Now the rain comes down in sheets.',
          'Thunder rolls, far away and low.',
          'Mochi hides behind the warm monitor.',
        ],
      },
      {
        id: 's5l5',
        name: 'Quiet Again',
        grid: 2,
        windowMs: 85,
        pool: EVERYTHING,
        lines: [
          'Slowly, the storm drifts out to sea.',
          'The moon peeks out between the clouds.',
          'Everything smells clean and new.',
        ],
      },
      {
        id: 's5l6',
        name: 'First Light',
        grid: 2,
        windowMs: 80,
        pool: EVERYTHING,
        lines: [
          'The sky turns pink, then gold.',
          'Mochi yawns the biggest yawn of all.',
          'Good night, little cat. Good morning.',
        ],
      },
    ],
  },
];

/** Every level in play order, with its section. */
export function allLevels(): { section: SectionDef; level: LevelDef; index: number }[] {
  const out: { section: SectionDef; level: LevelDef; index: number }[] = [];
  for (const section of SECTIONS) for (const level of section.levels) out.push({ section, level, index: out.length });
  return out;
}

export function isUnlocked(levelId: string, progress: Record<string, LevelProgress>, dev = false): boolean {
  if (dev) return true;
  const all = allLevels();
  const i = all.findIndex((l) => l.level.id === levelId);
  if (i <= 0) return i === 0;
  const prev = all[i - 1]!.level.id;
  return (progress[prev]?.stars ?? 0) >= 1;
}

export function nextLevel(levelId: string) {
  const all = allLevels();
  const i = all.findIndex((l) => l.level.id === levelId);
  return i >= 0 ? all[i + 1] : undefined;
}
