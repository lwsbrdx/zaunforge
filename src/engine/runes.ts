import type { DDChampion, Archetype, RuneRecommendation, RuneTree, EnemyCompAnalysis } from '../types';

// ─── Champion kit profile (lightweight mirror of optimizer.ts profile) ──
// Kept minimal and self-contained to avoid circular imports.

interface RuneProfile {
  isAP: boolean;
  isMarksman: boolean;
  isAssassin: boolean;
  isMage: boolean;
  isFighter: boolean;
  isTank: boolean;
  isSupport: boolean;
  isMelee: boolean;
  usesMana: boolean;
  burstPattern: boolean;
  dotPattern: boolean;
  onHitSynergy: boolean;
  critSynergy: boolean;
  ultReliant: boolean;
  highMobility: boolean;
  adMultiHitOnHit: boolean;
  spellbladeUserAD: boolean;
  spellbladeUser: boolean;
  apAutoAttacker: boolean;
  apSustained: boolean;
}

function buildRuneProfile(champion: DDChampion): RuneProfile {
  const tags = champion.tags;
  const info = champion.info;
  const isAP = info.magic > info.attack;
  const isMarksman = tags.includes('Marksman');
  const isAssassin = tags.includes('Assassin');
  const isMage = tags.includes('Mage');
  const isFighter = tags.includes('Fighter');
  const isTank = tags.includes('Tank');
  const isSupport = tags.includes('Support');
  const isMelee = champion.stats.attackrange <= 300;
  const usesMana = champion.partype === 'Mana';

  const dotPattern = isMage && (isSupport || (info.magic >= 8 && !isAssassin && info.attack <= 3));
  const onHitSynergy = isMelee && isFighter && info.attack >= 8;
  const critSynergy = isMarksman || (info.attack >= 9 && !isAP);
  const burstPattern = isAssassin || (isMage && !dotPattern && info.magic >= 7);
  const ultReliant = isAssassin || (isFighter && !isAP);
  const highMobility = isAssassin || (isFighter && champion.stats.movespeed >= 340);
  const adMultiHitOnHit = isMelee && isFighter && (isTank || isAssassin) && info.attack >= 8 && !isAP;
  const spellbladeUserAD = isMelee && isFighter && !isAP && info.attack >= 8;
  const spellbladeUser = isAP && isAssassin;
  const apAutoAttacker = isAP && isFighter && isMelee;
  const apSustained = isAP && isFighter && isMelee;

  return {
    isAP, isMarksman, isAssassin, isMage, isFighter, isTank, isSupport,
    isMelee, usesMana, burstPattern, dotPattern, onHitSynergy, critSynergy,
    ultReliant, highMobility, adMultiHitOnHit, spellbladeUserAD, spellbladeUser,
    apAutoAttacker, apSustained,
  };
}

// ─── Keystone selection ──────────────────────────────────────────────

interface KeystonePick {
  name: string;
  tree: RuneTree;
  reasoning: string;
}

function pickKeystone(
  champion: DDChampion,
  archetype: Archetype,
  profile: RuneProfile,
  comp: EnemyCompAnalysis | null,
): KeystonePick {
  const name = champion.name;

  // Hard-coded overrides for iconic choices (high-agreement across the LoL community)
  const overrides: Record<string, KeystonePick> = {
    'Kled': { name: 'Conqueror', tree: 'Precision', reasoning: 'Sustained fighter with auto-ability combos — Conqueror ramps through extended trades' },
    'Renekton': { name: 'Conqueror', tree: 'Precision', reasoning: 'W multi-hit + sustained trades stack Conqueror fast for max AD + omnivamp' },
    'Mordekaiser': { name: 'Conqueror', tree: 'Precision', reasoning: 'AP melee with long Q + R isolation — Conqueror ramps for burst + sustain' },
    'Ambessa': { name: 'Conqueror', tree: 'Precision', reasoning: 'Combo chains and auto-resets stack Conqueror in ~2s' },
    'Ahri': { name: 'Electrocute', tree: 'Domination', reasoning: 'Q-W-E combo + auto hits 3 times fast — Electrocute procs on every all-in' },
    'Samira': { name: 'Conqueror', tree: 'Precision', reasoning: 'Multi-hit combo + Q spam + R channel — Conqueror caps in seconds' },
    'Master Yi': { name: 'Lethal Tempo', tree: 'Precision', reasoning: 'Auto-reliant with Q reset — Lethal Tempo maxes AS + range for kite' },
    'Brand': { name: 'Arcane Comet', tree: 'Sorcery', reasoning: 'Skillshot poke mage — Comet chunks health from range every rotation' },
  };

  if (overrides[name]) return overrides[name];

  // ── Marksman ──
  if (archetype === 'ad_carry') {
    if (profile.onHitSynergy || name === 'Kalista' || name === 'Vayne' || name === 'Twitch') {
      return { name: 'Lethal Tempo', tree: 'Precision', reasoning: 'Attack-speed ramp + extended range for on-hit DPS' };
    }
    if (profile.burstPattern && profile.critSynergy) {
      return { name: 'Press the Attack', tree: 'Precision', reasoning: 'Burst 3-hit combo + 8% amplified damage window for kill trades' };
    }
    return { name: 'Press the Attack', tree: 'Precision', reasoning: 'Standard crit ADC keystone — amplifies burst windows' };
  }

  // ── AD Assassin ──
  if (archetype === 'ad_assassin') {
    if (profile.highMobility && profile.ultReliant) {
      return { name: 'Electrocute', tree: 'Domination', reasoning: '3-hit burst keystone — your combo procs it instantly from stealth/dash' };
    }
    return { name: 'Electrocute', tree: 'Domination', reasoning: 'Burst keystone for all-in assassins — bonus adaptive on combo' };
  }

  // ── AP Assassin ──
  if (archetype === 'ap_assassin') {
    if (profile.burstPattern) {
      return { name: 'Electrocute', tree: 'Domination', reasoning: 'Multi-hit combo (Q-W-E or R mid-fight) procs Electrocute every fight' };
    }
    return { name: 'Dark Harvest', tree: 'Domination', reasoning: 'Scaling keystone — snowball kills for late-game burst' };
  }

  // ── AP Mage ──
  if (archetype === 'ap_mage') {
    if (profile.dotPattern) {
      return { name: 'Arcane Comet', tree: 'Sorcery', reasoning: 'Continuous spell casts reliably land Comet — DoT keystone synergy' };
    }
    if (profile.burstPattern && profile.ultReliant) {
      return { name: 'Electrocute', tree: 'Domination', reasoning: 'Full combo reaches 3-hit threshold for burst mages' };
    }
    if (profile.highMobility || name === 'Ryze' || name === 'Kassadin') {
      return { name: 'Phase Rush', tree: 'Sorcery', reasoning: 'Mobile mage — Phase Rush movement resets kiting/engage range' };
    }
    return { name: 'Arcane Comet', tree: 'Sorcery', reasoning: 'Safe poke keystone for most mages — free skillshot damage' };
  }

  // ── AD Bruiser ──
  if (archetype === 'ad_bruiser') {
    if (profile.isMelee && !profile.burstPattern) {
      return { name: 'Conqueror', tree: 'Precision', reasoning: 'Sustained melee fighter — Conqueror stacks in extended trades, grants omnivamp' };
    }
    if (profile.adMultiHitOnHit || profile.spellbladeUserAD) {
      return { name: 'Conqueror', tree: 'Precision', reasoning: 'Multi-hit abilities stack Conqueror in ~2 seconds — omnivamp carries extended fights' };
    }
    // High-CC top laners
    if (comp && comp.ccScore >= 6 && profile.isMelee) {
      return { name: 'Conqueror', tree: 'Precision', reasoning: 'Heavy enemy CC — Conqueror heal mitigates peel damage' };
    }
    return { name: 'Conqueror', tree: 'Precision', reasoning: 'Standard bruiser keystone — sustained ramping damage + omnivamp' };
  }

  // ── AP Bruiser (Mordekaiser, Gwen, Rumble, Vladimir, Sylas) ──
  if (archetype === 'ap_bruiser') {
    if (profile.apSustained || profile.apAutoAttacker) {
      return { name: 'Conqueror', tree: 'Precision', reasoning: 'AP bruiser with sustained combat — Conqueror stacks on abilities + autos' };
    }
    return { name: 'Conqueror', tree: 'Precision', reasoning: 'Extended fights + sustain — Conqueror outlasts trades' };
  }

  // ── Tank ──
  if (archetype === 'tank') {
    if (profile.isMelee && !profile.isSupport) {
      return { name: 'Grasp of the Undying', tree: 'Resolve', reasoning: 'Melee HP-stacker — Grasp trades per-auto sustain + HP scaling' };
    }
    return { name: 'Aftershock', tree: 'Resolve', reasoning: 'Engage-reliant tank — Aftershock fortifies after your lockdown lands' };
  }

  // ── Enchanter Support ──
  if (archetype === 'enchanter') {
    if (profile.dotPattern) {
      return { name: 'Arcane Comet', tree: 'Sorcery', reasoning: 'Enchanter poke — Comet harass complements heal/shield gameplay' };
    }
    return { name: 'Summon Aery', tree: 'Sorcery', reasoning: 'Enchanter keystone — Aery follows heals/shields and pokes for free' };
  }

  // ── Tank Support ──
  if (archetype === 'tank_support') {
    return { name: 'Aftershock', tree: 'Resolve', reasoning: 'Engage support — Aftershock + CC combo for lockdown value' };
  }

  return { name: 'Conqueror', tree: 'Precision', reasoning: 'Versatile all-purpose keystone for extended fights' };
}

// ─── Tree minor runes ────────────────────────────────────────────────

function pickPrimaryRunes(tree: RuneTree, profile: RuneProfile, comp: EnemyCompAnalysis | null): string[] {
  switch (tree) {
    case 'Precision': {
      // Row 2: Triumph (takedown heal+gold), Presence of Mind (mana restore), Absorb Life (minion heal)
      const row2 = profile.usesMana && profile.ultReliant ? 'Presence of Mind' : 'Triumph';
      // Row 3: Alacrity (AS), Haste (AH), Bloodline (lifesteal)
      let row3 = 'Legend: Alacrity';
      if (profile.critSynergy && profile.isMarksman) row3 = 'Legend: Bloodline';
      else if (profile.isMelee && profile.isFighter && !profile.critSynergy) row3 = 'Legend: Haste';
      // Row 4: Coup de Grace, Cut Down, Last Stand
      let row4 = 'Coup de Grace';
      if (comp && comp.tankCount >= 2) row4 = 'Cut Down';
      else if (profile.isMelee && profile.isFighter) row4 = 'Last Stand';
      return [row2, row3, row4];
    }
    case 'Domination': {
      // Row 2: Cheap Shot, Taste of Blood, Sudden Impact
      let row2 = 'Taste of Blood';
      if (profile.highMobility && profile.isAssassin) row2 = 'Sudden Impact';
      else if (profile.burstPattern) row2 = 'Cheap Shot';
      // Row 3: Sixth Sense, Grisly Mementos, Deep Ward — scaling pick = Grisly Mementos
      const row3 = 'Grisly Mementos';
      // Row 4: Treasure Hunter, Relentless Hunter, Ultimate Hunter
      const row4 = profile.ultReliant ? 'Ultimate Hunter' : 'Relentless Hunter';
      return [row2, row3, row4];
    }
    case 'Sorcery': {
      // Row 2: Axiom Arcanist (ult buff), Manaflow Band (mana scaling), Nimbus Cloak (MS post-summoner)
      let row2: string;
      if (profile.usesMana) row2 = 'Manaflow Band';
      else if (profile.ultReliant) row2 = 'Axiom Arcanist';
      else row2 = 'Nimbus Cloak';
      // Row 3: Transcendence (AH thresholds), Celerity (MS→adaptive), Absolute Focus (full HP bonus)
      let row3 = 'Transcendence';
      if (profile.highMobility) row3 = 'Celerity';
      // Row 4: Scorch (early harass), Waterwalking (river MS), Gathering Storm (late scaling)
      const row4 = profile.dotPattern || profile.burstPattern ? 'Scorch' : 'Gathering Storm';
      return [row2, row3, row4];
    }
    case 'Resolve': {
      // Row 2: Demolish, Font of Life, Shield Bash
      const row2 = profile.isSupport ? 'Font of Life' : profile.isTank ? 'Demolish' : 'Shield Bash';
      // Row 3: Conditioning (late resists), Second Wind (low HP regen), Bone Plating (burst absorb)
      const row3 = comp && comp.adThreat > 0.55 ? 'Conditioning' : comp && comp.apThreat > 0.55 ? 'Second Wind' : 'Bone Plating';
      // Row 4: Overgrowth (HP scaling), Revitalize (heal/shield power), Unflinching (CC tenacity)
      const row4 = comp && comp.ccScore >= 5 ? 'Unflinching' : 'Overgrowth';
      return [row2, row3, row4];
    }
    case 'Inspiration': {
      // Row 2: Hextech Flashtraption, Magical Footwear, Cash Back
      // Row 3: Triple Tonic, Time Warp Tonic, Biscuit Delivery
      // Row 4: Cosmic Insight, Approach Velocity, Jack Of All Trades
      return ['Magical Footwear', 'Biscuit Delivery', 'Cosmic Insight'];
    }
  }
}

function pickSecondaryTree(primary: RuneTree, archetype: Archetype, profile: RuneProfile, comp: EnemyCompAnalysis | null): RuneTree {
  const heavyCC = comp && comp.ccScore >= 6;
  const mixedDanger = comp && comp.mixedDamage;

  // Tanks usually go Resolve + something defensive-flex
  if (archetype === 'tank' || archetype === 'tank_support') return 'Inspiration';

  // Bruiser fighters
  if (archetype === 'ad_bruiser' || archetype === 'ap_bruiser') {
    if (heavyCC || mixedDanger) return 'Resolve';
    return primary === 'Precision' ? 'Resolve' : 'Precision';
  }

  // Assassins
  if (archetype === 'ad_assassin' || archetype === 'ap_assassin') {
    return primary === 'Domination' ? 'Precision' : 'Domination';
  }

  // Mages
  if (archetype === 'ap_mage') {
    if (profile.dotPattern) return primary === 'Sorcery' ? 'Inspiration' : 'Sorcery';
    if (heavyCC) return 'Resolve';
    return primary === 'Sorcery' ? 'Inspiration' : 'Sorcery';
  }

  // Marksman
  if (archetype === 'ad_carry') {
    return primary === 'Precision' ? 'Domination' : 'Precision';
  }

  // Enchanter
  if (archetype === 'enchanter') {
    return 'Inspiration';
  }

  return 'Inspiration';
}

function pickSecondaryRunes(tree: RuneTree, profile: RuneProfile, comp: EnemyCompAnalysis | null): string[] {
  switch (tree) {
    case 'Precision':
      // row 2 + row 3 — valid cross-slot combo
      return ['Triumph', profile.critSynergy ? 'Legend: Bloodline' : 'Legend: Alacrity'];
    case 'Domination':
      // row 2 + row 3
      return [profile.burstPattern ? 'Cheap Shot' : 'Taste of Blood', 'Grisly Mementos'];
    case 'Sorcery':
      // row 2/3 + row 4
      return [profile.usesMana ? 'Manaflow Band' : 'Transcendence', profile.dotPattern ? 'Scorch' : 'Gathering Storm'];
    case 'Resolve': {
      // row 3 + row 4
      const adHeavy = comp && comp.adThreat > 0.55;
      const apHeavy = comp && comp.apThreat > 0.55;
      return [adHeavy ? 'Conditioning' : apHeavy ? 'Second Wind' : 'Bone Plating', 'Overgrowth'];
    }
    case 'Inspiration':
      // row 2 + row 4
      return ['Magical Footwear', 'Cosmic Insight'];
  }
}

function pickShards(archetype: Archetype, profile: RuneProfile, comp: EnemyCompAnalysis | null): { offense: string; flex: string; defense: string } {
  // Offense shard
  let offense: string;
  if (archetype.startsWith('ap_') || archetype === 'enchanter') offense = 'Adaptive Force';
  else if (profile.onHitSynergy || profile.isMarksman) offense = 'Attack Speed';
  else if (archetype === 'tank' || archetype === 'tank_support') offense = 'Ability Haste';
  else offense = 'Adaptive Force';

  // Flex shard
  let flex: string;
  if (archetype === 'tank' || archetype === 'tank_support') flex = 'Adaptive Force';
  else if (profile.isMelee && profile.isFighter) flex = 'Adaptive Force';
  else flex = 'Adaptive Force';

  // Defense shard
  let defense: string;
  if (!comp) {
    defense = profile.isMelee ? 'Health' : 'Health';
  } else if (comp.adThreat > 0.6) {
    defense = 'Armor';
  } else if (comp.apThreat > 0.6) {
    defense = 'Magic Resist';
  } else if (comp.assassinThreat >= 2) {
    defense = 'Health';
  } else {
    defense = 'Health';
  }

  return { offense, flex, defense };
}

// ─── Main ────────────────────────────────────────────────────────────

export function recommendRunes(
  champion: DDChampion,
  archetype: Archetype,
  comp: EnemyCompAnalysis | null,
): RuneRecommendation {
  const profile = buildRuneProfile(champion);

  const keystone = pickKeystone(champion, archetype, profile, comp);
  const primaryTree = keystone.tree;
  const secondaryTree = pickSecondaryTree(primaryTree, archetype, profile, comp);
  const primaryRunes = pickPrimaryRunes(primaryTree, profile, comp);
  const secondaryRunes = pickSecondaryRunes(secondaryTree, profile, comp);
  const shards = pickShards(archetype, profile, comp);

  const summary = buildSummary(champion, keystone, primaryTree, secondaryTree, comp);

  return {
    keystone,
    primary: { tree: primaryTree, runes: primaryRunes },
    secondary: { tree: secondaryTree, runes: secondaryRunes },
    shards,
    summary,
  };
}

function buildSummary(
  champion: DDChampion,
  keystone: KeystonePick,
  primary: RuneTree,
  secondary: RuneTree,
  comp: EnemyCompAnalysis | null,
): string {
  const compNote = comp
    ? comp.ccScore >= 6
      ? ' Enemy comp has heavy CC — tenacity runes prioritized.'
      : comp.adThreat > 0.6
        ? ' AD-heavy comp — defense shards and Conditioning favor armor.'
        : comp.apThreat > 0.6
          ? ' AP-heavy comp — MR shard and Second Wind prioritized.'
          : ''
    : '';

  return `${champion.name}: ${keystone.name} (${primary}) with ${secondary} secondary.${compNote}`;
}
