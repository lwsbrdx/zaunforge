import type {
  DDChampion,
  ChampionTag,
  Archetype,
  StatWeights,
  ParsedItem,
  ParsedStats,
  BuildResult,
} from '../types';

// Determine champion archetype from tags and stats
export function detectArchetype(champion: DDChampion): Archetype {
  const tags = champion.tags;
  const info = champion.info;
  const isAP = info.magic > info.attack;
  const primary = tags[0] as ChampionTag;
  const secondary = tags[1] as ChampionTag | undefined;

  if (primary === 'Marksman') return 'ad_carry';

  if (primary === 'Assassin') {
    return isAP ? 'ap_assassin' : 'ad_assassin';
  }

  if (primary === 'Mage') {
    if (secondary === 'Fighter') return 'ap_bruiser';
    return 'ap_mage';
  }

  if (primary === 'Fighter') {
    if (isAP) return 'ap_bruiser';
    return 'ad_bruiser';
  }

  if (primary === 'Tank') {
    if (secondary === 'Support') return 'tank_support';
    return 'tank';
  }

  if (primary === 'Support') {
    if (secondary === 'Tank') return 'tank_support';
    return 'enchanter';
  }

  return 'ad_bruiser';
}

// Stat weights per archetype — higher = more valuable
const ARCHETYPE_WEIGHTS: Record<Archetype, StatWeights> = {
  ad_carry: {
    attackDamage: 3.0,
    abilityPower: 0,
    health: 0.3,
    mana: 0.1,
    armor: 0.2,
    magicResist: 0.2,
    attackSpeed: 3.0,
    critChance: 3.5,
    critDamage: 2.0,
    lifeSteal: 2.0,
    abilityHaste: 0.5,
    lethality: 0.5,
    armorPen: 2.0,
    magicPen: 0,
    magicPenPercent: 0,
    moveSpeed: 0.5,
    moveSpeedPercent: 0.8,
    omnivamp: 0.5,
    tenacity: 0.3,
    healShieldPower: 0,
    hpRegen: 0,
  },
  ap_mage: {
    attackDamage: 0,
    abilityPower: 3.5,
    health: 0.5,
    mana: 1.0,
    armor: 0.2,
    magicResist: 0.2,
    attackSpeed: 0,
    critChance: 0,
    critDamage: 0,
    lifeSteal: 0,
    abilityHaste: 2.5,
    lethality: 0,
    armorPen: 0,
    magicPen: 3.0,
    magicPenPercent: 2.5,
    moveSpeed: 0.5,
    moveSpeedPercent: 0.8,
    omnivamp: 0.5,
    tenacity: 0.2,
    healShieldPower: 0,
    hpRegen: 0.2,
  },
  ad_assassin: {
    attackDamage: 3.5,
    abilityPower: 0,
    health: 0.3,
    mana: 0.1,
    armor: 0.1,
    magicResist: 0.1,
    attackSpeed: 0.5,
    critChance: 0.5,
    critDamage: 0.5,
    lifeSteal: 1.0,
    abilityHaste: 2.0,
    lethality: 3.5,
    armorPen: 2.5,
    magicPen: 0,
    magicPenPercent: 0,
    moveSpeed: 1.0,
    moveSpeedPercent: 1.5,
    omnivamp: 0.5,
    tenacity: 0.3,
    healShieldPower: 0,
    hpRegen: 0,
  },
  ap_assassin: {
    attackDamage: 0,
    abilityPower: 3.5,
    health: 0.3,
    mana: 0.8,
    armor: 0.1,
    magicResist: 0.1,
    attackSpeed: 0,
    critChance: 0,
    critDamage: 0,
    lifeSteal: 0,
    abilityHaste: 2.0,
    lethality: 0,
    armorPen: 0,
    magicPen: 3.5,
    magicPenPercent: 2.5,
    moveSpeed: 1.0,
    moveSpeedPercent: 1.5,
    omnivamp: 0.5,
    tenacity: 0.2,
    healShieldPower: 0,
    hpRegen: 0,
  },
  ad_bruiser: {
    attackDamage: 2.5,
    abilityPower: 0,
    health: 2.0,
    mana: 0.3,
    armor: 1.0,
    magicResist: 0.8,
    attackSpeed: 1.0,
    critChance: 0.3,
    critDamage: 0.2,
    lifeSteal: 1.5,
    abilityHaste: 2.0,
    lethality: 0.5,
    armorPen: 1.5,
    magicPen: 0,
    magicPenPercent: 0,
    moveSpeed: 0.5,
    moveSpeedPercent: 0.8,
    omnivamp: 1.0,
    tenacity: 1.5,
    healShieldPower: 0,
    hpRegen: 0.5,
  },
  ap_bruiser: {
    attackDamage: 0,
    abilityPower: 2.5,
    health: 2.0,
    mana: 0.5,
    armor: 0.8,
    magicResist: 0.8,
    attackSpeed: 0,
    critChance: 0,
    critDamage: 0,
    lifeSteal: 0,
    abilityHaste: 2.0,
    lethality: 0,
    armorPen: 0,
    magicPen: 2.0,
    magicPenPercent: 1.5,
    moveSpeed: 0.5,
    moveSpeedPercent: 0.8,
    omnivamp: 1.5,
    tenacity: 1.0,
    healShieldPower: 0,
    hpRegen: 0.5,
  },
  tank: {
    attackDamage: 0.2,
    abilityPower: 0,
    health: 3.0,
    mana: 0.3,
    armor: 2.5,
    magicResist: 2.5,
    attackSpeed: 0,
    critChance: 0,
    critDamage: 0,
    lifeSteal: 0,
    abilityHaste: 2.0,
    lethality: 0,
    armorPen: 0,
    magicPen: 0,
    magicPenPercent: 0,
    moveSpeed: 0.5,
    moveSpeedPercent: 0.8,
    omnivamp: 0,
    tenacity: 2.0,
    healShieldPower: 0,
    hpRegen: 1.0,
  },
  enchanter: {
    attackDamage: 0,
    abilityPower: 2.0,
    health: 0.8,
    mana: 1.0,
    armor: 0.3,
    magicResist: 0.3,
    attackSpeed: 0,
    critChance: 0,
    critDamage: 0,
    lifeSteal: 0,
    abilityHaste: 3.0,
    lethality: 0,
    armorPen: 0,
    magicPen: 0.5,
    magicPenPercent: 0.3,
    moveSpeed: 1.0,
    moveSpeedPercent: 1.5,
    omnivamp: 0,
    tenacity: 0.3,
    healShieldPower: 3.5,
    hpRegen: 0.5,
  },
  tank_support: {
    attackDamage: 0,
    abilityPower: 0.3,
    health: 3.0,
    mana: 0.3,
    armor: 2.0,
    magicResist: 2.0,
    attackSpeed: 0,
    critChance: 0,
    critDamage: 0,
    lifeSteal: 0,
    abilityHaste: 2.5,
    lethality: 0,
    armorPen: 0,
    magicPen: 0,
    magicPenPercent: 0,
    moveSpeed: 0.5,
    moveSpeedPercent: 0.8,
    omnivamp: 0,
    tenacity: 1.5,
    healShieldPower: 1.5,
    hpRegen: 0.8,
  },
};

// Normalize stat values to a common scale for comparison
const STAT_NORMALIZATION: Record<keyof ParsedStats, number> = {
  attackDamage: 35,      // gold value per unit: ~35g
  abilityPower: 21.75,   // ~21.75g
  health: 2.67,          // ~2.67g
  mana: 1.4,             // ~1.4g
  armor: 20,             // ~20g
  magicResist: 18,       // ~18g
  attackSpeed: 2500,     // percentage, ~25g per 1%
  critChance: 4000,      // percentage, ~40g per 1%
  critDamage: 3000,      // percentage
  lifeSteal: 3750,       // percentage, ~37.5g per 1%
  abilityHaste: 26.67,   // ~26.67g
  lethality: 77,         // ~77g per point
  armorPen: 5000,        // percentage
  magicPen: 58,          // ~58g per point
  magicPenPercent: 5000, // percentage
  moveSpeed: 12,         // flat: ~12g
  moveSpeedPercent: 3950,// percentage
  omnivamp: 5000,        // percentage
  tenacity: 2000,        // percentage
  healShieldPower: 3000, // percentage
  hpRegen: 36,           // per 5s
};

function scoreItem(item: ParsedItem, weights: StatWeights): number {
  let score = 0;
  for (const stat of Object.keys(weights) as (keyof ParsedStats)[]) {
    const value = item.stats[stat];
    if (value && weights[stat] > 0) {
      score += value * STAT_NORMALIZATION[stat] * weights[stat];
    }
  }
  // Gold efficiency: score per gold spent
  if (item.goldTotal > 0) {
    score = score / item.goldTotal;
  }
  return score;
}

function sumStats(items: ParsedItem[]): ParsedStats {
  const total: ParsedStats = {
    attackDamage: 0, abilityPower: 0, health: 0, mana: 0,
    armor: 0, magicResist: 0, attackSpeed: 0, critChance: 0,
    critDamage: 0, lifeSteal: 0, abilityHaste: 0, lethality: 0,
    armorPen: 0, magicPen: 0, magicPenPercent: 0, moveSpeed: 0,
    moveSpeedPercent: 0, omnivamp: 0, tenacity: 0, healShieldPower: 0,
    hpRegen: 0,
  };

  for (const item of items) {
    for (const stat of Object.keys(total) as (keyof ParsedStats)[]) {
      total[stat] += item.stats[stat];
    }
  }

  return total;
}

export function optimizeBuild(
  champion: DDChampion,
  allItems: ParsedItem[],
): BuildResult {
  const archetype = detectArchetype(champion);
  const weights = ARCHETYPE_WEIGHTS[archetype];

  // Filter to completed items only (depth >= 2)
  const completedItems = allItems.filter(item => {
    if (item.depth < 2) return false;
    if (item.requiredChampion && item.requiredChampion !== champion.name) return false;
    // Exclude support items for non-support, jungle items for now
    if (item.tags.includes('Jungle') && archetype !== 'tank' && archetype !== 'ad_bruiser') return false;
    return true;
  });

  const boots = completedItems.filter(i => i.isBoot);
  const nonBoots = completedItems.filter(i => !i.isBoot);

  // Score and sort boots
  const scoredBoots = boots
    .map(b => ({ item: b, score: scoreItem(b, weights) }))
    .sort((a, b) => b.score - a.score);

  // Score and sort non-boot items
  const scoredItems = nonBoots
    .map(i => ({ item: i, score: scoreItem(i, weights) }))
    .sort((a, b) => b.score - a.score);

  // Greedy selection with group constraints
  const selectedItems: ParsedItem[] = [];
  const usedGroups = new Set<string>();

  for (const { item } of scoredItems) {
    if (selectedItems.length >= 5) break;

    // Check group exclusivity
    if (item.group && usedGroups.has(item.group)) continue;

    selectedItems.push(item);
    if (item.group) usedGroups.add(item.group);
  }

  // Pick best boot
  const bestBoot = scoredBoots.length > 0 ? scoredBoots[0].item : null;

  const allBuildItems = bestBoot ? [bestBoot, ...selectedItems] : selectedItems;
  const totalStats = sumStats(allBuildItems);
  const totalGold = allBuildItems.reduce((sum, i) => sum + i.goldTotal, 0);
  const totalScore = allBuildItems.reduce((sum, i) => sum + scoreItem(i, weights), 0);

  return {
    items: selectedItems,
    boot: bestBoot,
    totalStats,
    totalGold,
    score: totalScore,
    archetype,
  };
}

export function getArchetypeLabel(archetype: Archetype): string {
  const labels: Record<Archetype, string> = {
    ad_carry: 'AD Carry',
    ap_mage: 'AP Mage',
    ad_assassin: 'AD Assassin',
    ap_assassin: 'AP Assassin',
    ad_bruiser: 'AD Bruiser',
    ap_bruiser: 'AP Bruiser',
    tank: 'Tank',
    enchanter: 'Enchanter',
    tank_support: 'Tank Support',
  };
  return labels[archetype];
}

export function getArchetypeColor(archetype: Archetype): string {
  const colors: Record<Archetype, string> = {
    ad_carry: '#2ecc71',
    ap_mage: '#9b59b6',
    ad_assassin: '#e74c3c',
    ap_assassin: '#e74c3c',
    ad_bruiser: '#e67e22',
    ap_bruiser: '#9b59b6',
    tank: '#3498db',
    enchanter: '#1abc9c',
    tank_support: '#3498db',
  };
  return colors[archetype];
}
