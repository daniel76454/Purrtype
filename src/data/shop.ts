import type { Category } from '../core/types.js';
import type { Theme } from './sections.js';

/** Coat patterns drawn on top of the base fur colour (see drawCatSprite in src/render/cat.ts). */
export type FurPattern = 'solid' | 'tuxedo' | 'siamese' | 'calico' | 'tabby' | 'pitsi';
/** Wall finishes for room styles. */
export type WallStyle = 'plain' | 'wood' | 'brick' | 'stars' | 'stripes' | 'leaves';

export interface ShopItem {
  id: string; // `${category}.${name}`, also what the cat renderer switches on
  category: Category;
  name: string;
  price: number; // in yarn
  /** Cats: base fur colour and coat pattern. */
  color?: string;
  pattern?: FurPattern;
  /** Rooms: colours and wall finish. Without one (the default room), each section keeps its own colours. */
  room?: { theme: Theme; wall: WallStyle };
  /** Decor: free colour or design choices once owned. The first is the default. */
  variants?: Variant[];
  /** Hidden from the shop until unlocked some other way. */
  secret?: boolean;
}

export interface Variant {
  id: string;
  name: string;
  color: string;
}

/** Decor that was retired: owners get their yarn back (see normalizeSave). */
export const RETIRED_DECOR: Record<string, number> = { 'decor.plant': 250, 'decor.books': 150, 'decor.clock': 200, 'decor.record': 300 };

export const CATEGORY_LABELS: Record<Category, string> = {
  fur: 'Cats',
  hat: 'Hats',
  collar: 'Collars',
  toy: 'Toys',
  room: 'Rooms',
  decor: 'Decor',
};

const room = (theme: Omit<Theme, 'skyTop' | 'skyBottom'> & Partial<Theme>, wall: WallStyle) => ({
  theme: { skyTop: '#090c24', skyBottom: '#3a3f7e', ...theme },
  wall,
});

export const SHOP_ITEMS: ShopItem[] = [
  // cats
  { id: 'fur.orange', category: 'fur', name: 'Marmalade', price: 0, color: '#e8955a' },
  { id: 'fur.grey', category: 'fur', name: 'Smoky grey', price: 250, color: '#9aa3ad' },
  { id: 'fur.black', category: 'fur', name: 'Midnight', price: 250, color: '#45414d' },
  { id: 'fur.cream', category: 'fur', name: 'Vanilla', price: 250, color: '#f0ddb8' },
  { id: 'fur.white', category: 'fur', name: 'Snowball', price: 300, color: '#f4f1ea' },
  { id: 'fur.tabby', category: 'fur', name: 'Silver tabby', price: 350, color: '#b9bcc4', pattern: 'tabby' },
  { id: 'fur.tuxedo', category: 'fur', name: 'Tuxedo', price: 400, color: '#34303d', pattern: 'tuxedo' },
  { id: 'fur.siamese', category: 'fur', name: 'Siamese', price: 450, color: '#efe0c4', pattern: 'siamese' },
  { id: 'fur.calico', category: 'fur', name: 'Calico', price: 500, color: '#f4efe6', pattern: 'calico' },
  // a secret: pet the cat on the main menu enough times
  { id: 'fur.pitsi', category: 'fur', name: 'Pitsi', price: 0, color: '#8d7f6e', pattern: 'pitsi', secret: true },

  // hats
  { id: 'hat.none', category: 'hat', name: 'No hat', price: 0 },
  { id: 'hat.beanie', category: 'hat', name: 'Cozy beanie', price: 150 },
  { id: 'hat.party', category: 'hat', name: 'Party hat', price: 250 },
  { id: 'hat.crown', category: 'hat', name: 'Tiny crown', price: 600 },

  // collars
  { id: 'collar.none', category: 'collar', name: 'No collar', price: 0 },
  { id: 'collar.bell', category: 'collar', name: 'Bell collar', price: 120 },
  { id: 'collar.bow', category: 'collar', name: 'Bow tie', price: 200 },

  // toys
  { id: 'toy.yarn', category: 'toy', name: 'Ball of yarn', price: 0 },
  { id: 'toy.paper', category: 'toy', name: 'Paper ball', price: 100 },
  { id: 'toy.mouse', category: 'toy', name: 'Felt mouse', price: 200 },
  { id: 'toy.carrot', category: 'toy', name: 'Catnip carrot', price: 250 },
  { id: 'toy.feather', category: 'toy', name: 'Feather', price: 300 },
  { id: 'toy.star', category: 'toy', name: 'Star plush', price: 350 },
  { id: 'toy.donut', category: 'toy', name: 'Donut plush', price: 400 },
  { id: 'toy.fish', category: 'toy', name: 'Fish plush', price: 450 },

  // rooms
  { id: 'room.night', category: 'room', name: 'Night apartment', price: 0 },
  {
    id: 'room.cabin',
    category: 'room',
    name: 'Log cabin',
    price: 500,
    room: room({ wall: '#5e3d2f', wallDark: '#2a1a14', floor: '#6b4a36', floorDark: '#2a1c14', glow: '#ffb35c', accent: '#d9825b', skyBottom: '#2f3f6e' }, 'wood'),
  },
  {
    id: 'room.pastel',
    category: 'room',
    name: 'Pastel bedroom',
    price: 500,
    room: room({ wall: '#6e4c7e', wallDark: '#2e1f3e', floor: '#5a4560', floorDark: '#251b2a', glow: '#ff9ec4', accent: '#f2a6c8', skyBottom: '#5a3f7a' }, 'stripes'),
  },
  {
    id: 'room.stars',
    category: 'room',
    name: 'Starry wallpaper',
    price: 550,
    room: room({ wall: '#24386a', wallDark: '#0e1834', floor: '#3a3552', floorDark: '#17142a', glow: '#bcd4ff', accent: '#9fb6ff' }, 'stars'),
  },
  {
    id: 'room.brick',
    category: 'room',
    name: 'Brick loft',
    price: 600,
    room: room({ wall: '#6b3a34', wallDark: '#281513', floor: '#3e3434', floorDark: '#1a1414', glow: '#ffcf8a', accent: '#e0b25a', rain: true }, 'brick'),
  },
  {
    id: 'room.garden',
    category: 'room',
    name: 'Greenhouse',
    price: 650,
    room: room({ wall: '#2f5a48', wallDark: '#11281f', floor: '#4a3f33', floorDark: '#1f1a14', glow: '#ffe39a', accent: '#7fd1b9', skyBottom: '#1d4a5c' }, 'leaves'),
  },

  // decor: place as many as you like, and pick a colour or design for each
  {
    id: 'decor.rug',
    category: 'decor',
    name: 'Round rug',
    price: 150,
    variants: [
      { id: 'gray', name: 'Grey', color: '#8a8496' },
      { id: 'sand', name: 'Sand', color: '#c9a87a' },
      { id: 'rose', name: 'Rose', color: '#c97b8e' },
      { id: 'sage', name: 'Sage', color: '#7fa38a' },
      { id: 'navy', name: 'Navy', color: '#4a5a8a' },
    ],
  },
  { id: 'decor.candles', category: 'decor', name: 'Candles', price: 150 },
  {
    id: 'decor.poster',
    category: 'decor',
    name: 'Wall poster',
    price: 120,
    variants: [
      { id: 'cat', name: 'Moon cat', color: '#f2a65a' },
      { id: 'waves', name: 'Waves', color: '#7fb7e0' },
      { id: 'peaks', name: 'Mountains', color: '#9b7bd0' },
      { id: 'sunset', name: 'Sunset', color: '#ff9e7a' },
      { id: 'vinyl', name: 'Vinyl', color: '#e8667a' },
    ],
  },
  {
    id: 'decor.bed',
    category: 'decor',
    name: 'Cat bed',
    price: 250,
    variants: [
      { id: 'rose', name: 'Rose', color: '#b5576a' },
      { id: 'gray', name: 'Grey', color: '#7a7686' },
      { id: 'blue', name: 'Blue', color: '#5b7fd1' },
    ],
  },
  {
    id: 'decor.beanbag',
    category: 'decor',
    name: 'Bean bag',
    price: 300,
    variants: [
      { id: 'plum', name: 'Plum', color: '#7a4a8c' },
      { id: 'mustard', name: 'Mustard', color: '#d9a83e' },
      { id: 'teal', name: 'Teal', color: '#3f8a80' },
      { id: 'gray', name: 'Grey', color: '#7a7686' },
    ],
  },
  {
    id: 'decor.lava',
    category: 'decor',
    name: 'Lava lamp',
    price: 300,
    variants: [
      { id: 'purple', name: 'Purple', color: '#b46cff' },
      { id: 'orange', name: 'Orange', color: '#ff8a3d' },
      { id: 'green', name: 'Green', color: '#6fe08a' },
    ],
  },
  {
    id: 'decor.lamp',
    category: 'decor',
    name: 'Floor lamp',
    price: 350,
    variants: [
      { id: 'cream', name: 'Cream', color: '#f6dfae' },
      { id: 'pink', name: 'Pink', color: '#f6b8c8' },
      { id: 'mint', name: 'Mint', color: '#bfe8d6' },
    ],
  },
  {
    id: 'decor.neon',
    category: 'decor',
    name: 'Neon moon',
    price: 400,
    variants: [
      { id: 'pink', name: 'Pink', color: '#ff6fb0' },
      { id: 'cyan', name: 'Cyan', color: '#5ff0ff' },
      { id: 'amber', name: 'Amber', color: '#ffb347' },
    ],
  },
  {
    id: 'decor.guitar',
    category: 'decor',
    name: 'Guitar',
    price: 450,
    variants: [
      { id: 'honey', name: 'Honey', color: '#d99a4e' },
      { id: 'cherry', name: 'Cherry', color: '#b5404a' },
      { id: 'black', name: 'Black', color: '#3a3544' },
    ],
  },
];

export const itemById = (id: string): ShopItem | undefined => SHOP_ITEMS.find((i) => i.id === id);
export const itemsIn = (c: Category): ShopItem[] => SHOP_ITEMS.filter((i) => i.category === c);

/** The colour/design chosen for an item (or its first variant). */
export function variantOf(id: string, tints: Record<string, string> | undefined): Variant | undefined {
  const v = itemById(id)?.variants;
  return v?.find((x) => x.id === tints?.[id]) ?? v?.[0];
}
