import type { Category } from '../core/types.js';

export interface ShopItem {
  id: string; // `${category}.${name}`, also what the cat renderer switches on
  category: Category;
  name: string;
  price: number; // in yarn
  color?: string; // used by fur
}

export const CATEGORY_LABELS: Record<Category, string> = {
  hat: 'Hats',
  collar: 'Collars',
  toy: 'Toys',
  fur: 'Fur',
  decor: 'Room',
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'hat.none', category: 'hat', name: 'No hat', price: 0 },
  { id: 'hat.beanie', category: 'hat', name: 'Cozy beanie', price: 150 },
  { id: 'hat.party', category: 'hat', name: 'Party hat', price: 250 },
  { id: 'hat.crown', category: 'hat', name: 'Tiny crown', price: 600 },

  { id: 'collar.none', category: 'collar', name: 'No collar', price: 0 },
  { id: 'collar.bell', category: 'collar', name: 'Bell collar', price: 120 },
  { id: 'collar.bow', category: 'collar', name: 'Bow tie', price: 200 },

  { id: 'toy.yarn', category: 'toy', name: 'Ball of yarn', price: 0 },
  { id: 'toy.mouse', category: 'toy', name: 'Felt mouse', price: 200 },
  { id: 'toy.feather', category: 'toy', name: 'Feather', price: 300 },
  { id: 'toy.fish', category: 'toy', name: 'Fish plush', price: 450 },

  { id: 'fur.orange', category: 'fur', name: 'Marmalade', price: 0, color: '#e8955a' },
  { id: 'fur.grey', category: 'fur', name: 'Smoky grey', price: 250, color: '#9aa3ad' },
  { id: 'fur.black', category: 'fur', name: 'Midnight', price: 250, color: '#45414d' },
  { id: 'fur.cream', category: 'fur', name: 'Vanilla', price: 250, color: '#f0ddb8' },

  { id: 'decor.none', category: 'decor', name: 'Bare floor', price: 0 },
  { id: 'decor.rug', category: 'decor', name: 'Round rug', price: 150 },
  { id: 'decor.plant', category: 'decor', name: 'House plant', price: 250 },
  { id: 'decor.lamp', category: 'decor', name: 'Floor lamp', price: 350 },
];

export const itemById = (id: string): ShopItem | undefined => SHOP_ITEMS.find((i) => i.id === id);
export const itemsIn = (c: Category): ShopItem[] => SHOP_ITEMS.filter((i) => i.category === c);
