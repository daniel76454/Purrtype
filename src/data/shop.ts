import type { Category } from '../core/types.js';
import type { Theme } from './sections.js';

/** Coat patterns drawn on top of the base fur colour (see drawCatSprite in src/render/cat.ts). */
export type FurPattern = 'solid' | 'tuxedo' | 'siamese' | 'calico' | 'tabby';
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
}

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

  // decor: place as many as you like
  { id: 'decor.rug', category: 'decor', name: 'Round rug', price: 150 },
  { id: 'decor.books', category: 'decor', name: 'Book pile', price: 150 },
  { id: 'decor.clock', category: 'decor', name: 'Wall clock', price: 200 },
  { id: 'decor.bed', category: 'decor', name: 'Cat bed', price: 250 },
  { id: 'decor.plant', category: 'decor', name: 'House plant', price: 250 },
  { id: 'decor.record', category: 'decor', name: 'Record player', price: 300 },
  { id: 'decor.lamp', category: 'decor', name: 'Floor lamp', price: 350 },
];

export const itemById = (id: string): ShopItem | undefined => SHOP_ITEMS.find((i) => i.id === id);
export const itemsIn = (c: Category): ShopItem[] => SHOP_ITEMS.filter((i) => i.category === c);
