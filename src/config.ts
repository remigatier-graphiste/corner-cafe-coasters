export type RarityId = 'carton' | 'bois' | 'liege' | 'ceramique' | 'metal';

export const RARITY_ORDER: RarityId[] = ['carton', 'bois', 'liege', 'ceramique', 'metal'];

export const RARITIES: Record<RarityId, { label: string; emoji: string; color: number; weight: number }> = {
  carton:    { label: 'Carton',    emoji: '⚪', color: 0xb8b0a5, weight: 60 },
  bois:      { label: 'Bois',      emoji: '🟢', color: 0x6aa84f, weight: 25 },
  liege:     { label: 'Liège',     emoji: '🔵', color: 0x3d85c6, weight: 10 },
  ceramique: { label: 'Céramique', emoji: '🟣', color: 0x8e44ad, weight: 4 },
  metal:     { label: 'Métal',     emoji: '🟡', color: 0xf1c232, weight: 1 },
};

export const SHINY_CHANCE = 0.05;

export type PackTypeId = 'petit_sachet' | 'grand_sachet' | 'boite' | 'coffret';

export interface PackType {
  label: string;
  emoji: string;
  size: number;
  minRarity?: RarityId;
}

export const PACK_TYPES: Record<PackTypeId, PackType> = {
  petit_sachet:  { label: 'Petit Sachet',  emoji: '🍪', size: 1 },
  grand_sachet:  { label: 'Grand Sachet',  emoji: '🥐', size: 3,  minRarity: 'bois' },
  boite:         { label: 'Boîte',         emoji: '🎁', size: 5,  minRarity: 'liege' },
  coffret:       { label: 'Coffret',       emoji: '📦', size: 10, minRarity: 'ceramique' },
};

export const DAILY_PACK: PackTypeId = 'petit_sachet';
export const DAILY_TIMEZONE = 'Europe/Paris';
export const INVENTORY_PAGE_SIZE = 10;
