import type {
  DDChampion,
  ChampionTag,
  Archetype,
  StatWeights,
  ParsedItem,
  ParsedStats,
  BuildResult,
} from '../types';

// ─── Archetype detection ───────────────────────────────────────────

export function detectArchetype(champion: DDChampion): Archetype {
  const tags = champion.tags;
  const info = champion.info;
  const isAP = info.magic > info.attack;
  const primary = tags[0] as ChampionTag;
  const secondary = tags[1] as ChampionTag | undefined;

  if (primary === 'Marksman') return 'ad_carry';
  if (primary === 'Assassin') return isAP ? 'ap_assassin' : 'ad_assassin';
  if (primary === 'Mage') {
    if (secondary === 'Assassin') return 'ap_assassin';
    if (secondary === 'Fighter') return 'ap_bruiser';
    return 'ap_mage';
  }
  if (primary === 'Fighter') return isAP ? 'ap_bruiser' : 'ad_bruiser';
  if (primary === 'Tank') return secondary === 'Support' ? 'tank_support' : 'tank';
  if (primary === 'Support') return secondary === 'Tank' ? 'tank_support' : 'enchanter';
  return 'ad_bruiser';
}

// ─── Champion profile — extracted from kit analysis ────────────────

interface ChampionProfile {
  /** % of total damage that is true damage (reduces magic pen value) */
  trueDamageRatio: number;
  /** Total AP ratio of full combo — higher = AP more valuable */
  totalApRatio: number;
  /** Does this champ weave autos between spells? (Spellblade synergy) */
  spellbladeUser: boolean;
  /** Does this champ have multi-hit / DoT? (burn item synergy) */
  multiHit: boolean;
  /** Is this champ a burst assassin? (execute item synergy) */
  burstPattern: boolean;
  /** Does this champ rely on ult heavily? (ult AH synergy) */
  ultReliant: boolean;
  /** Does this champ use mana? */
  usesMana: boolean;
  /** Base movespeed — lower = MS items more valuable */
  baseMoveSpeed: number;
}

function buildChampionProfile(champion: DDChampion): ChampionProfile {
  const tags = champion.tags;
  const info = champion.info;
  const stats = champion.stats;
  const isAP = info.magic > info.attack;
  const isAssassin = tags.includes('Assassin');
  const isMage = tags.includes('Mage');
  const isFighter = tags.includes('Fighter');
  const usesMana = champion.partype === 'Mana';

  // Estimate AP ratio from magic rating (1-10)
  // Most mages: 2.5-4.0 total AP ratio
  const totalApRatio = isAP ? (info.magic / 10) * 4.0 : (info.magic / 10) * 2.0;

  // True damage is rare — only a few champs have it significantly
  // We can't detect this from DDragon summary, so default to 0
  // Champions with known true damage on basic kit get a bump
  const trueDamageRatio = 0;

  // Spellblade: champs with short cooldowns and auto-attack weaving
  const spellbladeUser = isAP && isAssassin;

  // Multi-hit: mages with AoE or DoT patterns
  const multiHit = isMage && info.magic >= 7;

  // Burst: assassins and burst mages
  const burstPattern = isAssassin || (isMage && info.attack <= 3 && info.magic >= 7);

  // Ult reliant: most assassins and engage champs
  const ultReliant = isAssassin || (isFighter && !isAP);

  return {
    trueDamageRatio,
    totalApRatio,
    spellbladeUser,
    multiHit,
    burstPattern,
    ultReliant,
    usesMana,
    baseMoveSpeed: stats.movespeed,
  };
}

// ─── Known item names for synergy detection ───────────────────────

const ITEM_SYNERGIES = {
  // Rabadon's Deathcap: +30% total AP — exponentially better with more AP
  rabadons: (name: string) => name.includes("Rabadon"),
  // Shadowflame: execute below 40% HP — burst synergy
  shadowflame: (name: string) => name.includes("Shadowflame"),
  // Lich Bane / Spellblade items
  spellblade: (name: string) =>
    name.includes("Lich Bane") || name.includes("Dusk and Dawn"),
  // Burn items: Liandry, Blackfire, Fated Ashes
  burn: (name: string) =>
    name.includes("Liandry") || name.includes("Blackfire") || name.includes("Fated Ashes"),
  // Luden's Echo: burst poke
  ludens: (name: string) => name.includes("Luden"),
  // Malignance: ult AH
  malignance: (name: string) => name.includes("Malignance"),
  // Cosmic Drive: sustained MS + AH
  cosmicDrive: (name: string) => name.includes("Cosmic Drive"),
  // Stormsurge: burst + MS
  stormsurge: (name: string) => name.includes("Stormsurge"),
  // Hextech Rocketbelt: dash + burst
  rocketbelt: (name: string) => name.includes("Rocketbelt"),
  // Zhonya's: stasis
  zhonyas: (name: string) => name.includes("Zhonya"),
  // Banshee's: spell shield
  banshees: (name: string) => name.includes("Banshee"),
  // Void Staff: % magic pen
  voidStaff: (name: string) => name.includes("Void Staff"),
  // Cryptbloom: % magic pen + healing
  cryptbloom: (name: string) => name.includes("Cryptbloom"),
  // Bloodletter's Curse: MR shred stacking
  bloodletters: (name: string) => name.includes("Bloodletter"),
  // Rod of Ages: scaling + sustain
  rodOfAges: (name: string) => name.includes("Rod of Ages"),
  // Archangel's / Seraph's: mana scaling
  archangels: (name: string) =>
    name.includes("Archangel") || name.includes("Seraph"),
  // Riftmaker: sustained combat omnivamp
  riftmaker: (name: string) => name.includes("Riftmaker"),
  // Mejai's: snowball
  mejais: (name: string) => name.includes("Mejai"),
  // Nashor's Tooth: AS + on-hit AP
  nashors: (name: string) => name.includes("Nashor"),
  // Morellonomicon: anti-heal
  morello: (name: string) => name.includes("Morellonomicon"),
  // Support items
  supportItem: (name: string) =>
    name.includes("Shurelya") || name.includes("Ardent") ||
    name.includes("Moonstone") || name.includes("Echoes of Helia") ||
    name.includes("Imperial Mandate") || name.includes("Staff of Flowing") ||
    name.includes("Redemption") || name.includes("Dawncore"),
} as const;

function isSupport(archetype: Archetype): boolean {
  return archetype === 'enchanter' || archetype === 'tank_support';
}

// ─── Synergy scoring ──────────────────────────────────────────────

function computeSynergyBonus(
  item: ParsedItem,
  profile: ChampionProfile,
  archetype: Archetype,
  alreadySelected: ParsedItem[],
): number {
  let bonus = 1.0;
  const name = item.name;

  // ── Filter out support items for non-supports ──
  if (ITEM_SYNERGIES.supportItem(name) && !isSupport(archetype)) {
    return 0.01; // basically exclude
  }

  // ── Rabadon's: scales with total AP in build ──
  if (ITEM_SYNERGIES.rabadons(name)) {
    const totalAP = alreadySelected.reduce((s, i) => s + i.stats.abilityPower, 0);
    // Rabadon's gets better the more AP you already have
    // At 0 existing AP: 1.0x, at 200 AP: 1.6x, at 400 AP: 2.2x
    bonus *= 1.0 + (totalAP / 200) * 0.6;
    // Also scales with champion's AP ratios
    bonus *= 1.0 + profile.totalApRatio * 0.15;
  }

  // ── Shadowflame: execute synergy with burst champions ──
  if (ITEM_SYNERGIES.shadowflame(name) && profile.burstPattern) {
    bonus *= 1.4;
  }

  // ── Spellblade: only for auto-weavers ──
  if (ITEM_SYNERGIES.spellblade(name)) {
    bonus *= profile.spellbladeUser ? 1.3 : 0.5;
  }

  // ── Burn items: for multi-hit / sustained damage ──
  if (ITEM_SYNERGIES.burn(name)) {
    bonus *= profile.multiHit ? 1.3 : 0.8;
    // Blackfire Torch is also great for mana + AH
    if (name.includes("Blackfire") && profile.usesMana) bonus *= 1.15;
  }

  // ── Luden's: burst poke champions ──
  if (ITEM_SYNERGIES.ludens(name) && profile.burstPattern) {
    bonus *= 1.2;
  }

  // ── Malignance: ult-reliant champs ──
  if (ITEM_SYNERGIES.malignance(name)) {
    bonus *= profile.ultReliant ? 1.3 : 0.6;
  }

  // ── Stormsurge: burst + mobility ──
  if (ITEM_SYNERGIES.stormsurge(name) && profile.burstPattern) {
    bonus *= 1.25;
  }

  // ── Rocketbelt: melee/short-range AP assassins ──
  if (ITEM_SYNERGIES.rocketbelt(name)) {
    const isShortRange = profile.baseMoveSpeed <= 340;
    bonus *= (profile.burstPattern && isShortRange) ? 1.2 : 0.7;
  }

  // ── Void Staff: reduced value if champ has high true damage ratio ──
  if (ITEM_SYNERGIES.voidStaff(name)) {
    bonus *= 1.0 - profile.trueDamageRatio * 0.5;
  }

  // ── Cryptbloom: same pen reduction + utility ──
  if (ITEM_SYNERGIES.cryptbloom(name)) {
    bonus *= 1.0 - profile.trueDamageRatio * 0.3;
  }

  // ── Nashor's: only for on-hit AP champs ──
  if (ITEM_SYNERGIES.nashors(name)) {
    // Bad for burst mages, good for Kayle/Teemo/Diana
    bonus *= profile.burstPattern ? 0.3 : 0.8;
  }

  // ── Rod of Ages: scaling, not for assassins who need early power ──
  if (ITEM_SYNERGIES.rodOfAges(name)) {
    bonus *= profile.burstPattern ? 0.5 : 1.1;
  }

  // ── Riftmaker: sustained combat, not burst ──
  if (ITEM_SYNERGIES.riftmaker(name)) {
    bonus *= profile.burstPattern ? 0.4 : 1.3;
  }

  // ── Mejai's: risky snowball, slight bonus for mobile champs ──
  if (ITEM_SYNERGIES.mejais(name)) {
    bonus *= 0.7; // conservative by default, it's a gamble
  }

  // ── Bloodletter's: MR shred, good for sustained multi-hit ──
  if (ITEM_SYNERGIES.bloodletters(name)) {
    bonus *= profile.multiHit ? 1.2 : 0.6;
  }

  // ── Magic pen value reduced by true damage ratio ──
  if (item.stats.magicPen > 0 || item.stats.magicPenPercent > 0) {
    bonus *= 1.0 - profile.trueDamageRatio * 0.3;
  }

  // ── Mana items less valuable for non-mana champs ──
  if (item.stats.mana > 0 && !profile.usesMana) {
    bonus *= 0.3;
  }

  // ── Prevent stacking multiple Lost Chapter items (same build path) ──
  if (item.from?.includes('3802')) { // Lost Chapter
    const hasLostChapterItem = alreadySelected.some(i => i.from?.includes('3802'));
    if (hasLostChapterItem) bonus *= 0.3; // heavy penalty for double mana mythic
  }

  return bonus;
}

// ─── Stat weights per archetype ───────────────────────────────────

const ARCHETYPE_WEIGHTS: Record<Archetype, StatWeights> = {
  ad_carry: {
    attackDamage: 3.0, abilityPower: 0, health: 0.3, mana: 0.1,
    armor: 0.2, magicResist: 0.2, attackSpeed: 3.0, critChance: 3.5,
    critDamage: 2.0, lifeSteal: 2.0, abilityHaste: 0.5, lethality: 0.5,
    armorPen: 2.0, magicPen: 0, magicPenPercent: 0, moveSpeed: 0.5,
    moveSpeedPercent: 0.8, omnivamp: 0.5, tenacity: 0.3, healShieldPower: 0, hpRegen: 0,
  },
  ap_mage: {
    attackDamage: 0, abilityPower: 3.5, health: 0.5, mana: 1.0,
    armor: 0.2, magicResist: 0.2, attackSpeed: 0, critChance: 0,
    critDamage: 0, lifeSteal: 0, abilityHaste: 2.5, lethality: 0,
    armorPen: 0, magicPen: 3.0, magicPenPercent: 2.5, moveSpeed: 0.5,
    moveSpeedPercent: 0.8, omnivamp: 0.5, tenacity: 0.2, healShieldPower: 0, hpRegen: 0.2,
  },
  ad_assassin: {
    attackDamage: 3.5, abilityPower: 0, health: 0.3, mana: 0.1,
    armor: 0.1, magicResist: 0.1, attackSpeed: 0.5, critChance: 0.5,
    critDamage: 0.5, lifeSteal: 1.0, abilityHaste: 2.0, lethality: 3.5,
    armorPen: 2.5, magicPen: 0, magicPenPercent: 0, moveSpeed: 1.0,
    moveSpeedPercent: 1.5, omnivamp: 0.5, tenacity: 0.3, healShieldPower: 0, hpRegen: 0,
  },
  ap_assassin: {
    attackDamage: 0, abilityPower: 3.5, health: 0.4, mana: 0.8,
    armor: 0.1, magicResist: 0.1, attackSpeed: 0, critChance: 0,
    critDamage: 0, lifeSteal: 0, abilityHaste: 2.0, lethality: 0,
    armorPen: 0, magicPen: 3.0, magicPenPercent: 2.0, moveSpeed: 1.0,
    moveSpeedPercent: 1.5, omnivamp: 0.5, tenacity: 0.2, healShieldPower: 0, hpRegen: 0,
  },
  ad_bruiser: {
    attackDamage: 2.5, abilityPower: 0, health: 2.0, mana: 0.3,
    armor: 1.0, magicResist: 0.8, attackSpeed: 1.0, critChance: 0.3,
    critDamage: 0.2, lifeSteal: 1.5, abilityHaste: 2.0, lethality: 0.5,
    armorPen: 1.5, magicPen: 0, magicPenPercent: 0, moveSpeed: 0.5,
    moveSpeedPercent: 0.8, omnivamp: 1.0, tenacity: 1.5, healShieldPower: 0, hpRegen: 0.5,
  },
  ap_bruiser: {
    attackDamage: 0, abilityPower: 2.5, health: 2.0, mana: 0.5,
    armor: 0.8, magicResist: 0.8, attackSpeed: 0, critChance: 0,
    critDamage: 0, lifeSteal: 0, abilityHaste: 2.0, lethality: 0,
    armorPen: 0, magicPen: 2.0, magicPenPercent: 1.5, moveSpeed: 0.5,
    moveSpeedPercent: 0.8, omnivamp: 1.5, tenacity: 1.0, healShieldPower: 0, hpRegen: 0.5,
  },
  tank: {
    attackDamage: 0.2, abilityPower: 0, health: 3.0, mana: 0.3,
    armor: 2.5, magicResist: 2.5, attackSpeed: 0, critChance: 0,
    critDamage: 0, lifeSteal: 0, abilityHaste: 2.0, lethality: 0,
    armorPen: 0, magicPen: 0, magicPenPercent: 0, moveSpeed: 0.5,
    moveSpeedPercent: 0.8, omnivamp: 0, tenacity: 2.0, healShieldPower: 0, hpRegen: 1.0,
  },
  enchanter: {
    attackDamage: 0, abilityPower: 2.0, health: 0.8, mana: 1.0,
    armor: 0.3, magicResist: 0.3, attackSpeed: 0, critChance: 0,
    critDamage: 0, lifeSteal: 0, abilityHaste: 3.0, lethality: 0,
    armorPen: 0, magicPen: 0.5, magicPenPercent: 0.3, moveSpeed: 1.0,
    moveSpeedPercent: 1.5, omnivamp: 0, tenacity: 0.3, healShieldPower: 3.5, hpRegen: 0.5,
  },
  tank_support: {
    attackDamage: 0, abilityPower: 0.3, health: 3.0, mana: 0.3,
    armor: 2.0, magicResist: 2.0, attackSpeed: 0, critChance: 0,
    critDamage: 0, lifeSteal: 0, abilityHaste: 2.5, lethality: 0,
    armorPen: 0, magicPen: 0, magicPenPercent: 0, moveSpeed: 0.5,
    moveSpeedPercent: 0.8, omnivamp: 0, tenacity: 1.5, healShieldPower: 1.5, hpRegen: 0.8,
  },
};

// Gold value per unit of stat (for normalization)
const STAT_NORMALIZATION: Record<keyof ParsedStats, number> = {
  attackDamage: 35, abilityPower: 21.75, health: 2.67, mana: 1.4,
  armor: 20, magicResist: 18, attackSpeed: 2500, critChance: 4000,
  critDamage: 3000, lifeSteal: 3750, abilityHaste: 26.67, lethality: 77,
  armorPen: 5000, magicPen: 58, magicPenPercent: 5000, moveSpeed: 12,
  moveSpeedPercent: 3950, omnivamp: 5000, tenacity: 2000, healShieldPower: 3000,
  hpRegen: 36,
};

// ─── Base scoring (gold efficiency × weight) ──────────────────────

function baseScore(item: ParsedItem, weights: StatWeights): number {
  let score = 0;
  for (const stat of Object.keys(weights) as (keyof ParsedStats)[]) {
    const value = item.stats[stat];
    if (value && weights[stat] > 0) {
      score += value * STAT_NORMALIZATION[stat] * weights[stat];
    }
  }
  if (item.goldTotal > 0) {
    score = score / item.goldTotal;
  }
  return score;
}

// ─── Combined scoring with synergies ──────────────────────────────

function scoreItemWithSynergies(
  item: ParsedItem,
  weights: StatWeights,
  profile: ChampionProfile,
  archetype: Archetype,
  alreadySelected: ParsedItem[],
): number {
  const base = baseScore(item, weights);
  const synergy = computeSynergyBonus(item, profile, archetype, alreadySelected);
  return base * synergy;
}

// ─── Stats summation ──────────────────────────────────────────────

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

// ─── Main optimizer ───────────────────────────────────────────────

export function optimizeBuild(
  champion: DDChampion,
  allItems: ParsedItem[],
): BuildResult {
  const archetype = detectArchetype(champion);
  const weights = ARCHETYPE_WEIGHTS[archetype];
  const profile = buildChampionProfile(champion);

  // Filter to valid completed items
  const completedItems = allItems.filter(item => {
    if (item.depth < 2) return false;
    if (item.requiredChampion && item.requiredChampion !== champion.name) return false;
    if (item.tags.includes('Jungle') && !['tank', 'ad_bruiser', 'ap_bruiser'].includes(archetype)) return false;
    return true;
  });

  const boots = completedItems.filter(i => i.isBoot);
  const nonBoots = completedItems.filter(i => !i.isBoot);

  // ── Iterative greedy with synergy re-evaluation ──
  // At each step, re-score all remaining items considering what's already picked.
  // This lets Rabadon's score increase after AP items are selected, etc.
  const selectedItems: ParsedItem[] = [];
  const usedGroups = new Set<string>();
  const usedIds = new Set<string>();

  for (let slot = 0; slot < 5; slot++) {
    let bestItem: ParsedItem | null = null;
    let bestScore = -Infinity;

    for (const item of nonBoots) {
      if (usedIds.has(item.id)) continue;
      if (item.group && usedGroups.has(item.group)) continue;

      const score = scoreItemWithSynergies(item, weights, profile, archetype, selectedItems);
      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    if (bestItem) {
      selectedItems.push(bestItem);
      usedIds.add(bestItem.id);
      if (bestItem.group) usedGroups.add(bestItem.group);
    }
  }

  // ── Pick best boot ──
  const scoredBoots = boots
    .map(b => ({ item: b, score: scoreItemWithSynergies(b, weights, profile, archetype, selectedItems) }))
    .sort((a, b) => b.score - a.score);
  const bestBoot = scoredBoots.length > 0 ? scoredBoots[0].item : null;

  // ── Compile result ──
  const allBuildItems = bestBoot ? [bestBoot, ...selectedItems] : selectedItems;
  const totalStats = sumStats(allBuildItems);
  const totalGold = allBuildItems.reduce((sum, i) => sum + i.goldTotal, 0);
  const totalScore = allBuildItems.reduce(
    (sum, i) => sum + scoreItemWithSynergies(i, weights, profile, archetype, selectedItems), 0
  );

  return {
    items: selectedItems,
    boot: bestBoot,
    totalStats,
    totalGold,
    score: totalScore,
    archetype,
  };
}

// ─── Labels & colors ──────────────────────────────────────────────

export function getArchetypeLabel(archetype: Archetype): string {
  const labels: Record<Archetype, string> = {
    ad_carry: 'AD Carry', ap_mage: 'AP Mage', ad_assassin: 'AD Assassin',
    ap_assassin: 'AP Assassin', ad_bruiser: 'AD Bruiser', ap_bruiser: 'AP Bruiser',
    tank: 'Tank', enchanter: 'Enchanter', tank_support: 'Tank Support',
  };
  return labels[archetype];
}

export function getArchetypeColor(archetype: Archetype): string {
  const colors: Record<Archetype, string> = {
    ad_carry: '#2ecc71', ap_mage: '#9b59b6', ad_assassin: '#e74c3c',
    ap_assassin: '#e74c3c', ad_bruiser: '#e67e22', ap_bruiser: '#9b59b6',
    tank: '#3498db', enchanter: '#1abc9c', tank_support: '#3498db',
  };
  return colors[archetype];
}
