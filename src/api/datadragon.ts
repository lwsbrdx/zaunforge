import type { DDChampionList, DDItemList, DDItem, ParsedItem, ParsedStats } from '../types';

const BASE_URL = 'https://ddragon.leagueoflegends.com';

export async function getLatestVersion(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/versions.json`);
  const versions: string[] = await res.json();
  return versions[0];
}

export async function getChampions(version: string): Promise<DDChampionList> {
  const res = await fetch(`${BASE_URL}/cdn/${version}/data/en_US/champion.json`);
  return res.json();
}

export async function getItems(version: string): Promise<DDItemList> {
  const res = await fetch(`${BASE_URL}/cdn/${version}/data/en_US/item.json`);
  return res.json();
}

export function getChampionImageUrl(version: string, championId: string): string {
  return `${BASE_URL}/cdn/${version}/img/champion/${championId}.png`;
}

export function getItemImageUrl(version: string, itemId: string): string {
  return `${BASE_URL}/cdn/${version}/img/item/${itemId}.png`;
}

// Parse stats from HTML description that aren't in the stats{} object
function parseDescriptionStats(description: string): Partial<ParsedStats> {
  const parsed: Partial<ParsedStats> = {};

  // Extract the stats section from <stats>...</stats>
  const statsMatch = description.match(/<stats>([\s\S]*?)<\/stats>/i);
  if (!statsMatch) return parsed;

  const statsHtml = statsMatch[1];

  // Pattern: <attention>VALUE</attention> Stat Name
  const statEntries = statsHtml.matchAll(/<attention>(\d+%?)<\/attention>\s*([^<\n]+)/gi);

  for (const match of statEntries) {
    const rawValue = match[1];
    const statName = match[2].trim().toLowerCase();
    const value = parseFloat(rawValue);

    if (statName.includes('attack damage')) parsed.attackDamage = value;
    else if (statName.includes('ability power')) parsed.abilityPower = value;
    else if (statName.includes('health') && !statName.includes('regen')) parsed.health = value;
    else if (statName.includes('mana') && !statName.includes('regen')) parsed.mana = value;
    else if (statName.includes('armor') && !statName.includes('penetration')) parsed.armor = value;
    else if (statName.includes('magic resist')) parsed.magicResist = value;
    else if (statName.includes('attack speed')) parsed.attackSpeed = value / 100;
    else if (statName.includes('critical strike chance')) parsed.critChance = value / 100;
    else if (statName.includes('critical strike damage')) parsed.critDamage = value / 100;
    else if (statName.includes('life steal')) parsed.lifeSteal = value / 100;
    else if (statName.includes('ability haste')) parsed.abilityHaste = value;
    else if (statName.includes('lethality')) parsed.lethality = value;
    else if (statName.includes('armor penetration')) parsed.armorPen = value / 100;
    else if (statName.includes('magic penetration') && rawValue.includes('%')) parsed.magicPenPercent = value / 100;
    else if (statName.includes('magic penetration')) parsed.magicPen = value;
    else if (statName.includes('move speed') && rawValue.includes('%')) parsed.moveSpeedPercent = value / 100;
    else if (statName.includes('move speed')) parsed.moveSpeed = value;
    else if (statName.includes('omnivamp')) parsed.omnivamp = value / 100;
    else if (statName.includes('tenacity')) parsed.tenacity = value / 100;
    else if (statName.includes('heal and shield')) parsed.healShieldPower = value / 100;
  }

  return parsed;
}

function emptyStats(): ParsedStats {
  return {
    attackDamage: 0,
    abilityPower: 0,
    health: 0,
    mana: 0,
    armor: 0,
    magicResist: 0,
    attackSpeed: 0,
    critChance: 0,
    critDamage: 0,
    lifeSteal: 0,
    abilityHaste: 0,
    lethality: 0,
    armorPen: 0,
    magicPen: 0,
    magicPenPercent: 0,
    moveSpeed: 0,
    moveSpeedPercent: 0,
    omnivamp: 0,
    tenacity: 0,
    healShieldPower: 0,
    hpRegen: 0,
  };
}

export function parseItem(id: string, raw: DDItem, version: string): ParsedItem | null {
  // Filter: must be purchasable on Summoner's Rift, not hidden, not consumed
  if (!raw.gold.purchasable) return null;
  if (!raw.maps['11']) return null;
  if (raw.hideFromAll) return null;
  if (raw.consumed) return null;

  // Build stats from both structured data and description parsing
  const stats = emptyStats();

  // From structured stats
  if (raw.stats.FlatPhysicalDamageMod) stats.attackDamage = raw.stats.FlatPhysicalDamageMod;
  if (raw.stats.FlatMagicDamageMod) stats.abilityPower = raw.stats.FlatMagicDamageMod;
  if (raw.stats.FlatHPPoolMod) stats.health = raw.stats.FlatHPPoolMod;
  if (raw.stats.FlatMPPoolMod) stats.mana = raw.stats.FlatMPPoolMod;
  if (raw.stats.FlatArmorMod) stats.armor = raw.stats.FlatArmorMod;
  if (raw.stats.FlatSpellBlockMod) stats.magicResist = raw.stats.FlatSpellBlockMod;
  if (raw.stats.FlatMovementSpeedMod) stats.moveSpeed = raw.stats.FlatMovementSpeedMod;
  if (raw.stats.PercentMovementSpeedMod) stats.moveSpeedPercent = raw.stats.PercentMovementSpeedMod;
  if (raw.stats.PercentAttackSpeedMod) stats.attackSpeed = raw.stats.PercentAttackSpeedMod;
  if (raw.stats.FlatCritChanceMod) stats.critChance = raw.stats.FlatCritChanceMod;
  if (raw.stats.PercentLifeStealMod) stats.lifeSteal = raw.stats.PercentLifeStealMod;
  if (raw.stats.FlatHPRegenMod) stats.hpRegen = raw.stats.FlatHPRegenMod;

  // Override/supplement with parsed description stats
  const descStats = parseDescriptionStats(raw.description);
  for (const [key, value] of Object.entries(descStats)) {
    if (value && value > 0) {
      stats[key as keyof ParsedStats] = value;
    }
  }

  const isBoot = raw.tags.includes('Boots') && (raw.depth ?? 1) >= 2;

  return {
    id,
    name: raw.name,
    description: raw.description,
    plaintext: raw.plaintext,
    goldTotal: raw.gold.total,
    goldBase: raw.gold.base,
    stats,
    tags: raw.tags,
    depth: raw.depth ?? 1,
    isBoot,
    group: raw.group,
    imageUrl: `${BASE_URL}/cdn/${version}/img/item/${raw.image.full}`,
    from: raw.from,
    requiredChampion: raw.requiredChampion || undefined,
  };
}

export function parseAllItems(itemList: DDItemList, version: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  for (const [id, raw] of Object.entries(itemList.data)) {
    const parsed = parseItem(id, raw, version);
    if (parsed) items.push(parsed);
  }
  return items;
}
