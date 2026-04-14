import type { Archetype, ParsedItem, EnemyCompAnalysis, StarterOption } from '../types';

// Item IDs for the common starter pool (SR Summoner's Rift)
const ID = {
  DORANS_BLADE: '1055',
  DORANS_SHIELD: '1054',
  DORANS_RING: '1056',
  CULL: '1083',
  DARK_SEAL: '1082',
  LONG_SWORD: '1036',
  WORLD_ATLAS: '3865',
  TEAR: '3070', // Tear of the Goddess
} as const;

function findById(items: ParsedItem[], id: string): ParsedItem | null {
  return items.find(i => i.id === id) ?? null;
}

/**
 * Pick 1–2 starter options for a given archetype.
 * Returned options are ranked: option[0] is the "standard" pick.
 */
export function pickStarterOptions(
  archetype: Archetype,
  allItems: ParsedItem[],
  comp: EnemyCompAnalysis | null,
): StarterOption[] {
  const find = (id: string) => findById(allItems, id);
  const make = (ids: string[], label: string, notes: string[]): StarterOption | null => {
    const items = ids.map(find).filter(Boolean) as ParsedItem[];
    if (items.length === 0) return null;
    return { items, label, notes };
  };

  const HP_POT = '+ Health Potion';
  const HP_POTS_3 = '+ 3 Health Potions';

  // Adapt option 2 based on threat
  const rangedHeavy = comp ? comp.rangedThreat >= 2 : false;
  const burstHeavy = comp ? comp.assassinThreat + (comp.apThreat > 0.6 ? 1 : 0) >= 2 : false;

  switch (archetype) {
    case 'ad_carry':
      return [
        make([ID.DORANS_BLADE], 'Standard', [HP_POT, 'Early trade + sustain']),
        make([ID.CULL], 'Farming', [HP_POT, 'Scales with minion kills (late-game gold)']),
      ].filter(Boolean) as StarterOption[];

    case 'ad_bruiser':
      return [
        make([ID.DORANS_BLADE], 'Standard', [HP_POT, 'Aggressive lane with sustain']),
        make([ID.DORANS_SHIELD], 'Lane-safe', [HP_POT, rangedHeavy ? 'vs ranged matchups — HP + regen' : 'vs poke — HP + regen']),
      ].filter(Boolean) as StarterOption[];

    case 'ad_assassin':
      return [
        make([ID.DORANS_BLADE], 'Standard', [HP_POT, 'Early damage + sustain']),
        make([ID.LONG_SWORD], 'Scaling', [HP_POTS_3, 'Builds into first item (Serrated Dirk / Pickaxe)']),
      ].filter(Boolean) as StarterOption[];

    case 'ap_mage': {
      // Prefer Dark Seal scaling if comp isn't high-burst vs us
      const secondary = burstHeavy
        ? make([ID.DORANS_SHIELD], 'Lane-safe', [HP_POT, 'vs burst/assassin pressure'])
        : make([ID.DARK_SEAL], 'Snowball', [HP_POT, 'Mejai\'s starter — strong solo-lane scaling']);
      return [
        make([ID.DORANS_RING], 'Standard', [HP_POT, 'Mana regen + AP early']),
        secondary,
      ].filter(Boolean) as StarterOption[];
    }

    case 'ap_assassin':
      return [
        make([ID.DORANS_RING], 'Standard', [HP_POT, 'AP + mana sustain']),
        make([ID.DARK_SEAL], 'Snowball', [HP_POT, 'Scales with takedowns']),
      ].filter(Boolean) as StarterOption[];

    case 'ap_bruiser':
      return [
        make([ID.DORANS_RING], 'Standard', [HP_POT, 'AP pressure early']),
        make([ID.DORANS_SHIELD], 'Lane-safe', [HP_POT, 'HP + regen vs poke']),
      ].filter(Boolean) as StarterOption[];

    case 'tank':
      return [
        make([ID.DORANS_SHIELD], 'Standard', [HP_POT, 'HP + regen for extended trades']),
      ].filter(Boolean) as StarterOption[];

    case 'enchanter':
    case 'tank_support':
      return [
        make([ID.WORLD_ATLAS], 'Support', [HP_POT, 'Support gold income item']),
      ].filter(Boolean) as StarterOption[];
  }
}
