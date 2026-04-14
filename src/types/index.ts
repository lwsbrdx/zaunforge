// Data Dragon raw types

export interface DDChampionList {
  version: string;
  data: Record<string, DDChampion>;
}

export interface DDChampion {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: ChampionTag[];
  partype: string;
  info: {
    attack: number;
    defense: number;
    magic: number;
    difficulty: number;
  };
  stats: ChampionStats;
  image: DDImage;
}

export interface ChampionStats {
  hp: number;
  hpperlevel: number;
  mp: number;
  mpperlevel: number;
  movespeed: number;
  armor: number;
  armorperlevel: number;
  spellblock: number;
  spellblockperlevel: number;
  attackrange: number;
  hpregen: number;
  hpregenperlevel: number;
  mpregen: number;
  mpregenperlevel: number;
  crit: number;
  critperlevel: number;
  attackdamage: number;
  attackdamageperlevel: number;
  attackspeed: number;
  attackspeedperlevel: number;
}

export type ChampionTag = 'Fighter' | 'Mage' | 'Assassin' | 'Marksman' | 'Tank' | 'Support';

// Champion detail (individual endpoint)

export interface DDChampionDetail {
  id: string;
  name: string;
  title: string;
  lore: string;
  passive: DDPassive;
  spells: DDSpell[];
}

export interface DDPassive {
  name: string;
  description: string;
  image: DDImage;
}

export interface DDSpell {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  maxrank: number;
  cooldown: number[];
  cooldownBurn: string;
  cost: number[];
  costBurn: string;
  costType: string;
  range: number[];
  rangeBurn: string;
  image: DDImage;
}

export interface DDItemList {
  version: string;
  data: Record<string, DDItem>;
}

export interface DDItem {
  name: string;
  description: string;
  plaintext: string;
  colloq: string;
  from?: string[];
  into?: string[];
  depth?: number;
  gold: {
    base: number;
    total: number;
    sell: number;
    purchasable: boolean;
  };
  tags: string[];
  maps: Record<string, boolean>;
  stats: ItemStats;
  image: DDImage;
  effect?: Record<string, string>;
  requiredChampion?: string;
  requiredAlly?: string;
  hideFromAll?: boolean;
  consumed?: boolean;
  group?: string;
}

export interface ItemStats {
  FlatPhysicalDamageMod?: number;
  FlatMagicDamageMod?: number;
  FlatHPPoolMod?: number;
  FlatMPPoolMod?: number;
  FlatArmorMod?: number;
  FlatSpellBlockMod?: number;
  FlatMovementSpeedMod?: number;
  PercentMovementSpeedMod?: number;
  PercentAttackSpeedMod?: number;
  FlatCritChanceMod?: number;
  PercentLifeStealMod?: number;
  FlatHPRegenMod?: number;
}

export interface DDImage {
  full: string;
  sprite: string;
  group: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Parsed item with all stats (including from description)

export interface ParsedStats {
  attackDamage: number;
  abilityPower: number;
  health: number;
  mana: number;
  armor: number;
  magicResist: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
  lifeSteal: number;
  abilityHaste: number;
  lethality: number;
  armorPen: number;
  magicPen: number;
  magicPenPercent: number;
  moveSpeed: number;
  moveSpeedPercent: number;
  omnivamp: number;
  tenacity: number;
  healShieldPower: number;
  hpRegen: number;
}

export interface ParsedItem {
  id: string;
  name: string;
  description: string;
  plaintext: string;
  goldTotal: number;
  goldBase: number;
  stats: ParsedStats;
  tags: string[];
  depth: number;
  isBoot: boolean;
  group?: string;
  imageUrl: string;
  from?: string[];
  into?: string[];
  requiredChampion?: string;
}

// Build engine types

export type Archetype =
  | 'ad_carry'
  | 'ap_mage'
  | 'ad_assassin'
  | 'ap_assassin'
  | 'ad_bruiser'
  | 'ap_bruiser'
  | 'tank'
  | 'enchanter'
  | 'tank_support';

export type StatWeights = Record<keyof ParsedStats, number>;

export interface ItemReason {
  item: ParsedItem;
  reasons: string[];
}

export interface BuildExplanation {
  archetype: Archetype;
  archetypeLabel: string;
  summary: string;
  profileTraits: string[];
  itemReasons: ItemReason[];
  bootReason: ItemReason | null;
  compAnalysis: EnemyCompAnalysis | null;
  counterStrategy: string[];
}

export interface BuildResult {
  items: ParsedItem[];
  boot: ParsedItem | null;
  totalStats: ParsedStats;
  totalGold: number;
  score: number;
  archetype: Archetype;
  explanation: BuildExplanation;
}

// Enemy composition analysis for counter-itemization

export interface EnemyCompAnalysis {
  /** 0..1 — ratio of enemy physical damage (based on info.attack and tags) */
  adThreat: number;
  /** 0..1 — ratio of enemy magic damage */
  apThreat: number;
  /** 0..1 — mixed damage penalty (neither side heavily dominant) */
  mixedDamage: boolean;
  /** Count of tanks / bruisers with HP stacking */
  tankCount: number;
  /** Count of squishy burst targets */
  squishyCount: number;
  /** 0..10 — subjective CC score (stuns, roots, knockups, etc.) */
  ccScore: number;
  /** Count of champions with significant healing/sustain (life steal, omnivamp, shielding) */
  healingThreat: number;
  /** Count of auto-attack reliant champions (marksmen, on-hit fighters) */
  autoAttackThreat: number;
  /** Count of assassins — burst from stealth/dashes */
  assassinThreat: number;
  /** Count of ranged poke threats */
  rangedThreat: number;
  /** Count of enemies — 0 to 5 */
  teamSize: number;
  /** List of enemy champion names (for display) */
  enemyNames: string[];
}

export interface AppState {
  version: string | null;
  champions: DDChampion[];
  items: ParsedItem[];
  selectedChampion: DDChampion | null;
  enemyTeam: (DDChampion | null)[];
  build: BuildResult | null;
  loading: boolean;
  error: string | null;
}
