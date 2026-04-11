import type {
  DDChampion,
  ChampionTag,
  Archetype,
  StatWeights,
  ParsedItem,
  ParsedStats,
  BuildResult,
  BuildExplanation,
  ItemReason,
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
  if (primary === 'Fighter') {
    if (isAP) return 'ap_bruiser';
    return 'ad_bruiser';
  }
  if (primary === 'Tank') return secondary === 'Support' ? 'tank_support' : 'tank';
  if (primary === 'Support') return secondary === 'Tank' ? 'tank_support' : 'enchanter';
  return 'ad_bruiser';
}

// ─── Champion profile ─────────────────────────────────────────────

interface ChampionProfile {
  trueDamageRatio: number;
  totalApRatio: number;
  totalAdRatio: number;
  spellbladeUser: boolean;
  multiHit: boolean;
  burstPattern: boolean;
  ultReliant: boolean;
  usesMana: boolean;
  baseMoveSpeed: number;
  /** DoT-heavy champion (Brand, Malzahar) — burn items synergy */
  dotPattern: boolean;
  /** On-hit champion (Yi, Kayle, Kog) — on-hit/AS items synergy */
  onHitSynergy: boolean;
  /** Crit-scaling champion (ADCs, Yi Q) */
  critSynergy: boolean;
  /** Life steal synergy (Samira R, ADCs) */
  lifeStealSynergy: boolean;
  /** Heavy AoE kit (Brand, Samira R) */
  aoeHeavy: boolean;
  /** Melee champion */
  isMelee: boolean;
  /** Attack speed focused (Yi, ADCs) */
  attackSpeedFocused: boolean;
}

function buildChampionProfile(champion: DDChampion, _archetype: Archetype): ChampionProfile {
  const tags = champion.tags;
  const info = champion.info;
  const stats = champion.stats;
  const isAP = info.magic > info.attack;
  const isAssassin = tags.includes('Assassin');
  const isMage = tags.includes('Mage');
  const isFighter = tags.includes('Fighter');
  const isMarksman = tags.includes('Marksman');
  const usesMana = champion.partype === 'Mana';
  const isMelee = stats.attackrange <= 300;

  const totalApRatio = isAP ? (info.magic / 10) * 4.0 : (info.magic / 10) * 2.0;
  const totalAdRatio = !isAP ? (info.attack / 10) * 4.0 : (info.attack / 10) * 1.5;

  // DoT: mages with support secondary (Brand), or low burst + high magic
  const dotPattern = isMage && (tags.includes('Support') || (info.magic >= 8 && !isAssassin && info.attack <= 3));

  // On-hit: fighters with high attack rating, melee
  const onHitSynergy = isMelee && isFighter && info.attack >= 8;

  // Crit: marksmen, or fighters with very high attack
  const critSynergy = isMarksman || (info.attack >= 9 && !isAP);

  // Life steal: marksmen, especially with high attack
  const lifeStealSynergy = isMarksman || (isFighter && !isAP && info.attack >= 7);

  // AoE: mages with support tag, marksman+assassin
  const aoeHeavy = dotPattern || (isMarksman && isAssassin);

  // AS focused: fighters with high attack, marksmen
  const attackSpeedFocused = onHitSynergy || (isMarksman && info.attack >= 7);

  return {
    trueDamageRatio: 0,
    totalApRatio,
    totalAdRatio,
    spellbladeUser: isAP && isAssassin,
    multiHit: (isMage && info.magic >= 7) || dotPattern || onHitSynergy,
    burstPattern: isAssassin || (isMage && !dotPattern && info.magic >= 7),
    ultReliant: isAssassin || (isFighter && !isAP),
    usesMana,
    baseMoveSpeed: stats.movespeed,
    dotPattern,
    onHitSynergy,
    critSynergy,
    lifeStealSynergy,
    aoeHeavy,
    isMelee,
    attackSpeedFocused,
  };
}

// ─── Build explanation summary ────────────────────────────────────

function generateProfileTraits(profile: ChampionProfile, archetype: Archetype): string[] {
  const traits: string[] = [];
  if (profile.burstPattern) traits.push('Burst damage pattern');
  if (profile.dotPattern) traits.push('DoT / sustained damage');
  if (profile.onHitSynergy) traits.push('On-hit synergy');
  if (profile.critSynergy) traits.push('Critical strike synergy');
  if (profile.lifeStealSynergy) traits.push('Life steal synergy');
  if (profile.attackSpeedFocused) traits.push('Attack speed focused');
  if (profile.spellbladeUser) traits.push('Spellblade user');
  if (profile.multiHit) traits.push('Multi-hit kit');
  if (profile.aoeHeavy) traits.push('Heavy AoE');
  if (profile.usesMana) traits.push('Mana dependent');
  if (profile.trueDamageRatio > 0.1) traits.push(`~${Math.round(profile.trueDamageRatio * 100)}% true damage`);
  if (profile.isMelee) traits.push('Melee');
  if (archetype.startsWith('ap_')) traits.push(`${profile.totalApRatio.toFixed(1)}x AP ratio (est.)`);
  if (archetype.startsWith('ad_') || archetype === 'ad_carry') traits.push(`${profile.totalAdRatio.toFixed(1)}x AD ratio (est.)`);
  return traits;
}

function generateSummary(champion: DDChampion, archetype: Archetype, profile: ChampionProfile): string {
  const name = champion.name;
  const label = getArchetypeLabel(archetype);

  if (profile.dotPattern) {
    return `${name} is a ${label} with sustained DoT and %max HP damage. Build prioritizes burn item synergy, magic penetration (all damage is magic), and ability haste for more spell rotations.`;
  }
  if (profile.onHitSynergy) {
    return `${name} is an auto-attack ${label} with on-hit synergies. Build maximizes attack speed and on-hit damage, with AD for ability scaling. ${profile.trueDamageRatio > 0 ? 'True damage in kit reduces armor penetration value.' : ''}`;
  }
  if (profile.critSynergy && profile.lifeStealSynergy) {
    return `${name} is a ${label} who scales extremely with crit and life steal. Build stacks AD, crit chance, and life steal for maximum DPS and sustain. ${profile.aoeHeavy ? 'AoE abilities multiply life steal effectiveness in teamfights.' : ''}`;
  }
  if (profile.burstPattern && archetype.includes('ap')) {
    return `${name} is a burst ${label} with high AP ratios (~${profile.totalApRatio.toFixed(1)}x on full combo). Build maximizes raw AP, magic penetration, and ability haste. ${profile.trueDamageRatio > 0 ? `~${Math.round(profile.trueDamageRatio * 100)}% of damage is true damage, slightly reducing magic pen value.` : ''}`;
  }
  return `${name} is classified as ${label}. Build optimizes for the most gold-efficient stats matching this playstyle.`;
}

// ─── Item synergy detection + reasons ─────────────────────────────

interface SynergyResult {
  multiplier: number;
  reasons: string[];
}

function computeSynergyWithReasons(
  item: ParsedItem,
  profile: ChampionProfile,
  archetype: Archetype,
  alreadySelected: ParsedItem[],
): SynergyResult {
  let multiplier = 1.0;
  const reasons: string[] = [];
  const name = item.name;

  // ── Exclude support items for non-supports ──
  const isSupportItem =
    name.includes("Shurelya") || name.includes("Ardent") ||
    name.includes("Moonstone") || name.includes("Echoes of Helia") ||
    name.includes("Imperial Mandate") || name.includes("Staff of Flowing") ||
    name.includes("Redemption") || name.includes("Dawncore");
  if (isSupportItem && archetype !== 'enchanter' && archetype !== 'tank_support') {
    return { multiplier: 0.01, reasons: ['Support item — not suited for this role'] };
  }

  // ── Rabadon's Deathcap: +30% total AP, scales with existing AP ──
  if (name.includes("Rabadon")) {
    const totalAP = alreadySelected.reduce((s, i) => s + i.stats.abilityPower, 0);
    const apBonus = 1.0 + (totalAP / 200) * 0.6;
    const ratioBonus = 1.0 + profile.totalApRatio * 0.15;
    multiplier *= apBonus * ratioBonus;
    reasons.push(`+30% total AP multiplier — amplifies ${Math.round(totalAP)} AP already in build`);
    reasons.push(`High AP ratios (~${profile.totalApRatio.toFixed(1)}x) maximize raw AP value`);
  }

  // ── Shadowflame: execute below 40% HP ──
  if (name.includes("Shadowflame")) {
    if (profile.burstPattern) {
      multiplier *= 1.4;
      reasons.push('Execute passive (+20% dmg < 40% HP) synergizes with burst combo');
    }
    if (profile.dotPattern) {
      multiplier *= 0.8;
      reasons.push('Execute less effective with sustained damage pattern');
    }
  }

  // ── Liandry's Torment: burn + %max HP + sustained combat ──
  if (name.includes("Liandry")) {
    if (profile.dotPattern) {
      multiplier *= 1.8;
      reasons.push('Burn passive double-dips with DoT kit — %max HP burn on every tick');
      reasons.push('+2% damage/s in combat stacks perfectly with sustained damage');
    } else if (profile.multiHit) {
      multiplier *= 1.2;
      reasons.push('Multi-hit kit keeps burn active on multiple targets');
    } else {
      multiplier *= 0.7;
    }
  }

  // ── Rylai's Crystal Scepter: slow on abilities ──
  if (name.includes("Rylai")) {
    if (profile.dotPattern) {
      multiplier *= 1.6;
      reasons.push('DoT constantly reapplies 30% slow — permaslow on burning targets');
    } else if (profile.burstPattern) {
      multiplier *= 0.6;
    }
  }

  // ── Blackfire Torch: burn + AP per burning enemy ──
  if (name.includes("Blackfire")) {
    if (profile.dotPattern) {
      multiplier *= 1.5;
      reasons.push('Burn adds to DoT passive, +4% AP per burning enemy in teamfights');
    } else if (profile.multiHit && profile.usesMana) {
      multiplier *= 1.15;
      reasons.push('Mana + AH + burn synergy with multi-hit kit');
    }
    if (profile.usesMana && !profile.dotPattern) {
      reasons.push('Solves mana needs with 600 Mana + 20 AH');
    }
  }

  // ── Luden's Echo: burst poke ──
  if (name.includes("Luden")) {
    if (profile.burstPattern) {
      multiplier *= 1.2;
      reasons.push('Echo burst adds to poke/burst pattern');
    }
    if (profile.dotPattern) {
      multiplier *= 0.6;
    }
  }

  // ── Spellblade items (Lich Bane, Dusk and Dawn) ──
  if (name.includes("Lich Bane") || name.includes("Dusk and Dawn")) {
    if (profile.spellbladeUser) {
      multiplier *= 1.3;
      reasons.push('Auto-weaving between spells procs Spellblade efficiently');
    } else {
      multiplier *= 0.4;
    }
  }

  // ── Malignance: ult AH ──
  if (name.includes("Malignance")) {
    if (profile.ultReliant) {
      multiplier *= 1.3;
      reasons.push('20 Ult AH reduces ultimate cooldown significantly');
    } else {
      multiplier *= 0.6;
    }
  }

  // ── Stormsurge: burst + MS ──
  if (name.includes("Stormsurge")) {
    if (profile.burstPattern) {
      multiplier *= 1.25;
      reasons.push('Burst combo triggers Squall passive (25% HP in 2.5s) for extra damage');
    }
  }

  // ── Rocketbelt: dash + burst for short range ──
  if (name.includes("Rocketbelt")) {
    if (profile.burstPattern && profile.baseMoveSpeed <= 340) {
      multiplier *= 1.2;
      reasons.push('Dash + burst missiles help close range for combo');
    } else {
      multiplier *= 0.7;
    }
  }

  // ── Nashor's Tooth: on-hit AP ──
  if (name.includes("Nashor")) {
    if (profile.onHitSynergy) {
      multiplier *= 1.1;
      reasons.push('On-hit magic damage synergizes with auto-attack focus');
    } else if (profile.burstPattern) {
      multiplier *= 0.25;
    }
  }

  // ── Rod of Ages: scaling, not for burst ──
  if (name.includes("Rod of Ages")) {
    if (profile.burstPattern) {
      multiplier *= 0.4;
    } else if (profile.dotPattern) {
      multiplier *= 0.9;
    }
  }

  // ── Riftmaker: sustained omnivamp ──
  if (name.includes("Riftmaker")) {
    if (profile.dotPattern) {
      multiplier *= 1.1;
      reasons.push('Sustained combat ramps omnivamp with DoT');
    } else if (profile.burstPattern) {
      multiplier *= 0.35;
    }
  }

  // ── Mejai's: snowball, conservative ──
  if (name.includes("Mejai")) {
    multiplier *= 0.6;
  }

  // ── Bloodletter's Curse: MR shred ──
  if (name.includes("Bloodletter")) {
    if (profile.dotPattern || profile.multiHit) {
      multiplier *= 1.2;
      reasons.push('MR shred stacks quickly with multi-hit/DoT');
    } else {
      multiplier *= 0.6;
    }
  }

  // ── Cosmic Drive: sustained MS + AH ──
  if (name.includes("Cosmic Drive")) {
    if (profile.dotPattern) {
      multiplier *= 1.15;
      reasons.push('Sustained damage keeps Spelldance MS active, 25 AH for spell rotations');
    }
  }

  // ── Void Staff: % magic pen ──
  if (name.includes("Void Staff")) {
    if (profile.trueDamageRatio > 0.15) {
      multiplier *= 1.0 - profile.trueDamageRatio * 0.5;
      reasons.push(`True damage portion (${Math.round(profile.trueDamageRatio * 100)}%) doesn't benefit from magic pen`);
    }
    if (profile.dotPattern) {
      reasons.push('All damage is magic — 40% MPen amplifies %max HP burn');
    }
    if (!profile.dotPattern && archetype.includes('ap')) {
      reasons.push('40% magic pen for scaling against MR-stacking targets');
    }
  }

  // ── Cryptbloom: % pen + healing ──
  if (name.includes("Cryptbloom")) {
    if (profile.trueDamageRatio > 0.15) {
      multiplier *= 1.0 - profile.trueDamageRatio * 0.3;
    }
  }

  // ── Morellonomicon: anti-heal ──
  if (name.includes("Morellonomicon")) {
    if (profile.dotPattern) {
      multiplier *= 1.15;
      reasons.push('DoT constantly applies Grievous Wounds');
    }
  }

  // ═══ AD / ON-HIT / CRIT ITEMS ═══

  // ── Infinity Edge: crit amplifier ──
  if (name.includes("Infinity Edge")) {
    if (profile.critSynergy) {
      const critInBuild = alreadySelected.reduce((s, i) => s + i.stats.critChance, 0);
      multiplier *= 1.3 + critInBuild * 2.0;
      reasons.push('Crit damage amplifier — scales multiplicatively with crit chance in build');
      if (profile.lifeStealSynergy) {
        reasons.push('Bigger crits = more life steal healing');
      }
    } else {
      multiplier *= 0.3;
    }
  }

  // ── Bloodthirster: life steal + shield ──
  if (name.includes("Bloodthirster")) {
    if (profile.lifeStealSynergy) {
      multiplier *= 1.4;
      reasons.push('Life steal applies at full effectiveness on abilities — massive sustain');
      if (profile.aoeHeavy) {
        reasons.push('AoE abilities multiply life steal across all targets hit');
      }
    }
  }

  // ── Blade of the Ruined King: on-hit %HP ──
  if (name.includes("Blade of the Ruined King")) {
    if (profile.onHitSynergy) {
      multiplier *= 1.6;
      reasons.push('On-hit %current HP synergizes with high attack speed and on-hit application');
    } else if (profile.attackSpeedFocused) {
      multiplier *= 1.1;
    } else {
      multiplier *= 0.4;
    }
  }

  // ── Guinsoo's Rageblade: on-hit converter ──
  if (name.includes("Guinsoo") || name.includes("Rageblade")) {
    if (profile.onHitSynergy) {
      multiplier *= 1.5;
      reasons.push('Stacking AS + every 3rd auto applies on-hit twice — perfect for on-hit kit');
    } else {
      multiplier *= 0.3;
    }
  }

  // ── Terminus: on-hit + pen stacking ──
  if (name.includes("Terminus")) {
    if (profile.onHitSynergy) {
      multiplier *= 1.4;
      reasons.push('On-hit magic damage + stacking armor/magic pen with autos');
    } else {
      multiplier *= 0.3;
    }
  }

  // ── Wit's End: on-hit + MR ──
  if (name.includes("Wit's End") || name.includes("Wit's End")) {
    if (profile.onHitSynergy) {
      multiplier *= 1.3;
      reasons.push('On-hit magic damage + MR for durability in fights');
    } else {
      multiplier *= 0.4;
    }
  }

  // ── Kraken Slayer: true damage on-hit ──
  if (name.includes("Kraken")) {
    if (profile.onHitSynergy || profile.attackSpeedFocused) {
      multiplier *= 1.3;
      reasons.push('True damage on-hit proc synergizes with high attack speed');
    }
  }

  // ── Phantom Dancer: AS + crit + MS ──
  if (name.includes("Phantom Dancer")) {
    if (profile.attackSpeedFocused && profile.critSynergy) {
      multiplier *= 1.2;
      reasons.push('AS + Crit + MS for auto-attack DPS and kiting');
    }
  }

  // ── Lord Dominik's Regards: armor pen ──
  if (name.includes("Lord Dominik") || name.includes("Dominik")) {
    if (profile.trueDamageRatio > 0.2) {
      multiplier *= 0.7;
      reasons.push('True damage in kit reduces armor pen value');
    }
    if (profile.critSynergy) {
      reasons.push('Armor pen + crit for tank-busting');
    }
  }

  // ── Death's Dance: AD bruiser sustain ──
  if (name.includes("Death's Dance")) {
    if (profile.isMelee && !archetype.includes('ap')) {
      multiplier *= 1.3;
      reasons.push('Damage delay + heal on takedown — essential for melee fighters');
    } else {
      multiplier *= 0.5;
    }
  }

  // ── Sterak's Gage: anti-burst for melee ──
  if (name.includes("Sterak")) {
    if (profile.isMelee && !archetype.includes('ap')) {
      multiplier *= 1.2;
      reasons.push('Anti-burst shield + tenacity for melee survivability');
    } else {
      multiplier *= 0.3;
    }
  }

  // ═══ GLOBAL MODIFIERS ═══

  // ── Magic pen reduced by true damage ratio ──
  if ((item.stats.magicPen > 0 || item.stats.magicPenPercent > 0) && profile.trueDamageRatio > 0.15) {
    multiplier *= 1.0 - profile.trueDamageRatio * 0.3;
  }

  // ── Armor pen reduced by true damage ratio ──
  if ((item.stats.armorPen > 0 || item.stats.lethality > 0) && profile.trueDamageRatio > 0.15) {
    multiplier *= 1.0 - profile.trueDamageRatio * 0.25;
  }

  // ── Mana items less valuable for non-mana champs ──
  if (item.stats.mana > 0 && !profile.usesMana) {
    multiplier *= 0.3;
  }

  // ── Prevent stacking Lost Chapter items ──
  if (item.from?.includes('3802')) {
    const hasLostChapterItem = alreadySelected.some(i => i.from?.includes('3802'));
    if (hasLostChapterItem) {
      multiplier *= 0.25;
      reasons.push('Already have a Lost Chapter item — diminishing mana returns');
    }
  }

  // ── AP items worthless for pure AD champions ──
  if (item.stats.abilityPower > 0 && archetype === 'ad_carry' && !profile.onHitSynergy) {
    multiplier *= 0.1;
  }
  if (item.stats.abilityPower > 0 && archetype === 'ad_assassin') {
    multiplier *= 0.1;
  }

  // ── AD items worthless for pure AP champions ──
  if (item.stats.attackDamage > 0 && (archetype === 'ap_mage' || archetype === 'ap_assassin')) {
    multiplier *= 0.1;
  }

  // ── AS items bad for pure mages ──
  if (item.stats.attackSpeed > 0 && (archetype === 'ap_mage' || archetype === 'ap_assassin') && !profile.onHitSynergy) {
    multiplier *= 0.15;
  }

  // ── Crit items bad for non-crit champions ──
  if (item.stats.critChance > 0 && !profile.critSynergy) {
    multiplier *= 0.15;
  }

  // Add generic stat-based reason if no specific reasons were generated
  if (reasons.length === 0) {
    const topStats = Object.entries(item.stats)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([k]) => STAT_LABELS[k as keyof ParsedStats] || k);
    if (topStats.length > 0) {
      reasons.push(`Gold-efficient source of ${topStats.join(' + ')}`);
    }
  }

  return { multiplier, reasons };
}

const STAT_LABELS: Record<keyof ParsedStats, string> = {
  attackDamage: 'AD', abilityPower: 'AP', health: 'HP', mana: 'Mana',
  armor: 'Armor', magicResist: 'MR', attackSpeed: 'Attack Speed',
  critChance: 'Crit', critDamage: 'Crit Damage', lifeSteal: 'Life Steal',
  abilityHaste: 'Ability Haste', lethality: 'Lethality', armorPen: 'Armor Pen',
  magicPen: 'Magic Pen', magicPenPercent: '% Magic Pen', moveSpeed: 'Move Speed',
  moveSpeedPercent: '% Move Speed', omnivamp: 'Omnivamp', tenacity: 'Tenacity',
  healShieldPower: 'Heal/Shield Power', hpRegen: 'HP Regen',
};

// ─── Stat weights per archetype ───────────────────────────────────

const ARCHETYPE_WEIGHTS: Record<Archetype, StatWeights> = {
  ad_carry: {
    attackDamage: 3.0, abilityPower: 0, health: 0.3, mana: 0.1,
    armor: 0.2, magicResist: 0.2, attackSpeed: 2.5, critChance: 3.5,
    critDamage: 2.0, lifeSteal: 2.5, abilityHaste: 0.5, lethality: 0.5,
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
    attackDamage: 2.5, abilityPower: 0, health: 1.5, mana: 0.2,
    armor: 0.8, magicResist: 0.6, attackSpeed: 2.0, critChance: 0.3,
    critDamage: 0.2, lifeSteal: 1.5, abilityHaste: 1.5, lethality: 0.5,
    armorPen: 1.5, magicPen: 0, magicPenPercent: 0, moveSpeed: 0.5,
    moveSpeedPercent: 0.8, omnivamp: 1.0, tenacity: 1.5, healShieldPower: 0, hpRegen: 0.3,
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

// Gold value per unit of stat
const STAT_NORMALIZATION: Record<keyof ParsedStats, number> = {
  attackDamage: 35, abilityPower: 21.75, health: 2.67, mana: 1.4,
  armor: 20, magicResist: 18, attackSpeed: 2500, critChance: 4000,
  critDamage: 3000, lifeSteal: 3750, abilityHaste: 26.67, lethality: 77,
  armorPen: 5000, magicPen: 58, magicPenPercent: 5000, moveSpeed: 12,
  moveSpeedPercent: 3950, omnivamp: 5000, tenacity: 2000, healShieldPower: 3000,
  hpRegen: 36,
};

// ─── Scoring ──────────────────────────────────────────────────────

function baseScore(item: ParsedItem, weights: StatWeights): number {
  let score = 0;
  for (const stat of Object.keys(weights) as (keyof ParsedStats)[]) {
    const value = item.stats[stat];
    if (value && weights[stat] > 0) {
      score += value * STAT_NORMALIZATION[stat] * weights[stat];
    }
  }
  if (item.goldTotal > 0) score = score / item.goldTotal;
  return score;
}

// ─── Main optimizer ───────────────────────────────────────────────

export function optimizeBuild(
  champion: DDChampion,
  allItems: ParsedItem[],
): BuildResult {
  const archetype = detectArchetype(champion);
  const weights = ARCHETYPE_WEIGHTS[archetype];
  const profile = buildChampionProfile(champion, archetype);

  // Filter valid completed items
  const completedItems = allItems.filter(item => {
    if (item.depth < 2) return false;
    // Exclude component items that build into something else (e.g. Lost Chapter → Luden's)
    if (item.into && item.into.length > 0 && !item.isBoot) return false;
    if (item.requiredChampion && item.requiredChampion !== champion.name) return false;
    if (item.tags.includes('Jungle') && !['tank', 'ad_bruiser', 'ap_bruiser'].includes(archetype)) return false;
    return true;
  });

  const boots = completedItems.filter(i => i.isBoot);
  const nonBoots = completedItems.filter(i => !i.isBoot);

  // Iterative greedy with synergy re-evaluation
  const selectedItems: ParsedItem[] = [];
  const itemReasons: ItemReason[] = [];
  const usedGroups = new Set<string>();
  const usedIds = new Set<string>();

  for (let slot = 0; slot < 5; slot++) {
    let bestItem: ParsedItem | null = null;
    let bestScore = -Infinity;
    let bestReasons: string[] = [];

    for (const item of nonBoots) {
      if (usedIds.has(item.id)) continue;
      if (item.group && usedGroups.has(item.group)) continue;

      const base = baseScore(item, weights);
      const synergy = computeSynergyWithReasons(item, profile, archetype, selectedItems);
      const score = base * synergy.multiplier;

      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
        bestReasons = synergy.reasons;
      }
    }

    if (bestItem) {
      selectedItems.push(bestItem);
      itemReasons.push({ item: bestItem, reasons: bestReasons });
      usedIds.add(bestItem.id);
      if (bestItem.group) usedGroups.add(bestItem.group);
    }
  }

  // Pick best boot
  let bestBoot: ParsedItem | null = null;
  let bootReasonData: ItemReason | null = null;
  {
    let bestScore = -Infinity;
    let bestReasons: string[] = [];
    for (const boot of boots) {
      const base = baseScore(boot, weights);
      const synergy = computeSynergyWithReasons(boot, profile, archetype, selectedItems);
      const score = base * synergy.multiplier;
      if (score > bestScore) {
        bestScore = score;
        bestBoot = boot;
        bestReasons = synergy.reasons;
      }
    }
    if (bestBoot) {
      bootReasonData = { item: bestBoot, reasons: bestReasons.length > 0 ? bestReasons : ['Best stat-efficient boot for this archetype'] };
    }
  }

  // Compile
  const allBuildItems = bestBoot ? [bestBoot, ...selectedItems] : selectedItems;
  const totalStats = sumStats(allBuildItems);
  const totalGold = allBuildItems.reduce((sum, i) => sum + i.goldTotal, 0);
  const totalScore = allBuildItems.reduce((sum, i) => {
    const base = baseScore(i, weights);
    const syn = computeSynergyWithReasons(i, profile, archetype, selectedItems);
    return sum + base * syn.multiplier;
  }, 0);

  const explanation: BuildExplanation = {
    archetype,
    archetypeLabel: getArchetypeLabel(archetype),
    summary: generateSummary(champion, archetype, profile),
    profileTraits: generateProfileTraits(profile, archetype),
    itemReasons,
    bootReason: bootReasonData,
  };

  return {
    items: selectedItems,
    boot: bestBoot,
    totalStats,
    totalGold,
    score: totalScore,
    archetype,
    explanation,
  };
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

// ─── Labels & colors ──────────────────────────────────────────────

export function getArchetypeLabel(archetype: Archetype): string {
  return {
    ad_carry: 'AD Carry', ap_mage: 'AP Mage', ad_assassin: 'AD Assassin',
    ap_assassin: 'AP Assassin', ad_bruiser: 'AD Bruiser', ap_bruiser: 'AP Bruiser',
    tank: 'Tank', enchanter: 'Enchanter', tank_support: 'Tank Support',
  }[archetype];
}

export function getArchetypeColor(archetype: Archetype): string {
  return {
    ad_carry: '#2ecc71', ap_mage: '#9b59b6', ad_assassin: '#e74c3c',
    ap_assassin: '#e74c3c', ad_bruiser: '#e67e22', ap_bruiser: '#9b59b6',
    tank: '#3498db', enchanter: '#1abc9c', tank_support: '#3498db',
  }[archetype];
}
