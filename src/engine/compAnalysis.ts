import type { DDChampion, EnemyCompAnalysis } from '../types';

// ─── Champion threat heuristics ──────────────────────────────────────
//
// We classify champions along several axes to know what to counter-itemize.
// Most of this is derived from tags + info, but some champions have strong
// kit-specific traits (heavy CC, significant healing, stealth assassins)
// that are worth hard-coding to avoid miscalculation.

/** Champions with significant innate healing / lifesteal / shielding. */
const HIGH_HEALING_CHAMPIONS = new Set([
  'Aatrox', 'Akshan', 'Darius', 'Dr. Mundo', 'Fiora', 'Garen',
  'Illaoi', 'Irelia', 'Kayn', 'Legend', 'Mordekaiser', 'Nasus',
  'Olaf', 'Renekton', 'Sett', 'Shyvana', 'Swain', 'Tryndamere',
  'Udyr', 'Vladimir', 'Volibear', 'Warwick', 'Yorick',
  'Sion', 'Soraka', 'Yuumi', 'Nami', 'Sona', 'Seraphine', 'Senna',
  'Rakan', 'Taric', 'Renata Glasc', 'Milio', 'Karma',
  'Kled', 'Samira', 'Kled', 'Briar', 'Ambessa', 'Gwen',
  'Master Yi', 'Ryze', 'Zac', 'Taliyah', 'Kindred',
]);

/** Champions with high, reliable CC (stuns, roots, multi-person knockups). */
const HIGH_CC_CHAMPIONS = new Set([
  'Leona', 'Nautilus', 'Blitzcrank', 'Thresh', 'Pyke', 'Rell',
  'Alistar', 'Braum', 'Morgana', 'Amumu', 'Sejuani', 'Maokai',
  'Zac', 'Ornn', 'Malphite', 'Lissandra', 'Ashe', 'Varus',
  'Veigar', 'Syndra', 'Lux', 'Ahri', 'Diana', 'Sion',
  'Skarner', 'Neeko', 'Cassiopeia', 'Urgot', 'Jarvan IV',
  'Galio', 'Taric', 'Bard', 'Nami', 'Rakan', 'Kalista',
  "Vel'Koz", 'Swain', 'Viktor', 'Volibear', 'Trundle',
  'Shen', 'Poppy', 'Gragas', 'Warwick', 'Hecarim',
  'Singed', 'Shaco', 'Twisted Fate', 'Annie', 'Ryze',
  'Xerath', 'Ziggs', 'Sylas', 'Seraphine', 'Renata Glasc',
  'Lillia', 'Udyr', 'Ivern', 'Elise', 'Fiddlesticks',
  'Pantheon', 'Rengar', 'Wukong',
]);

/** Champions who rely heavily on auto-attacks (counter with armor + thornmail). */
const AUTO_ATTACK_RELIANT = new Set([
  'Aphelios', 'Ashe', 'Caitlyn', 'Draven', 'Ezreal',
  "Kai'Sa", 'Kalista', 'Kog\'Maw', 'Jhin', 'Jinx',
  'Lucian', 'Miss Fortune', 'Nilah', 'Samira', 'Senna',
  'Sivir', 'Smolder', 'Tristana', 'Twitch', 'Varus',
  'Vayne', 'Xayah', 'Zeri', 'Yasuo', 'Yone',
  'Master Yi', 'Tryndamere', 'Jax', 'Udyr', 'Fiora',
  'Irelia', 'Warwick', 'Kayle', 'Kindred', 'Shyvana',
  'Volibear', 'Gnar', 'Camille',
]);

/** Assassins — burst from stealth / dashes, counter with HP + zhonya's/banshee's. */
const ASSASSIN_CHAMPIONS = new Set([
  'Akali', 'Akshan', 'Diana', 'Ekko', 'Evelynn',
  'Fizz', 'Kassadin', 'Katarina', 'Kayn', 'Kha\'Zix',
  'LeBlanc', 'Master Yi', 'Nocturne', 'Pyke', 'Qiyana',
  'Rengar', 'Shaco', 'Talon', 'Viego', 'Yone', 'Zed',
  'Briar', 'Naafiri',
]);

/** Heavy ranged poke mages — counter with MR + tenacity. */
const RANGED_POKE = new Set([
  'Ahri', 'Anivia', 'Annie', 'Aurelion Sol', 'Azir',
  'Brand', 'Cassiopeia', 'Heimerdinger', 'Karma',
  'Karthus', 'Kennen', 'LeBlanc', 'Lissandra', 'Lux',
  'Malzahar', 'Morgana', 'Neeko', 'Nidalee', 'Orianna',
  'Syndra', 'Taliyah', 'Twisted Fate', 'Varus', 'Veigar',
  "Vel'Koz", 'Vex', 'Viktor', 'Xerath', 'Zoe', 'Ziggs',
  'Seraphine', 'Hwei', 'Aurora',
]);

/** Tank-like champions with high HP / armor / MR stacking. */
const TANK_LIKE = new Set([
  'Alistar', 'Amumu', 'Blitzcrank', 'Braum', 'Cho\'Gath',
  'Dr. Mundo', 'Galio', 'Garen', 'Gnar', 'Gragas',
  'Leona', 'Malphite', 'Maokai', 'Nasus', 'Nautilus',
  'Nunu & Willump', 'Ornn', 'Poppy', 'Rammus', 'Rell',
  'Sejuani', 'Shen', 'Singed', 'Sion', 'Skarner',
  'Tahm Kench', 'Taric', 'Thresh', 'Volibear', 'Warwick',
  'Zac', 'K\'Sante', 'Mordekaiser',
]);

// ─── Analysis ────────────────────────────────────────────────────────

export function analyzeEnemyComp(enemies: (DDChampion | null)[]): EnemyCompAnalysis | null {
  const present = enemies.filter((c): c is DDChampion => c !== null);
  if (present.length === 0) return null;

  let adSum = 0;
  let apSum = 0;
  let tankCount = 0;
  let squishyCount = 0;
  let ccScore = 0;
  let healingThreat = 0;
  let autoAttackThreat = 0;
  let assassinThreat = 0;
  let rangedThreat = 0;
  const enemyNames: string[] = [];

  for (const c of present) {
    enemyNames.push(c.name);

    // Damage type — weighted by info.attack / info.magic
    const total = c.info.attack + c.info.magic;
    if (total > 0) {
      adSum += c.info.attack / total;
      apSum += c.info.magic / total;
    }

    // Tags-based classification
    const isTank = c.tags.includes('Tank') || TANK_LIKE.has(c.name);
    const isSquishy = (c.tags.includes('Marksman') || c.tags.includes('Mage') || c.tags.includes('Assassin'))
      && !c.tags.includes('Tank') && !c.tags.includes('Fighter');
    const isAssassin = c.tags.includes('Assassin') || ASSASSIN_CHAMPIONS.has(c.name);

    if (isTank) tankCount++;
    if (isSquishy) squishyCount++;
    if (isAssassin) assassinThreat++;

    if (HIGH_HEALING_CHAMPIONS.has(c.name)) healingThreat++;
    if (AUTO_ATTACK_RELIANT.has(c.name)) autoAttackThreat++;
    if (RANGED_POKE.has(c.name)) rangedThreat++;

    // CC score: high CC champion = +2, tank = +1, support = +1
    if (HIGH_CC_CHAMPIONS.has(c.name)) ccScore += 2;
    if (c.tags.includes('Tank')) ccScore += 1;
    if (c.tags.includes('Support')) ccScore += 1;
  }

  const teamSize = present.length;
  const adThreat = adSum / teamSize;
  const apThreat = apSum / teamSize;
  const mixedDamage = adThreat >= 0.35 && apThreat >= 0.35;

  return {
    adThreat,
    apThreat,
    mixedDamage,
    tankCount,
    squishyCount,
    ccScore,
    healingThreat,
    autoAttackThreat,
    assassinThreat,
    rangedThreat,
    teamSize,
    enemyNames,
  };
}

// ─── Strategy summary ────────────────────────────────────────────────

export function generateCounterStrategy(analysis: EnemyCompAnalysis): string[] {
  const strategy: string[] = [];
  const { adThreat, apThreat, mixedDamage, tankCount, squishyCount, ccScore,
    healingThreat, autoAttackThreat, assassinThreat, teamSize } = analysis;

  // Damage profile
  if (mixedDamage) {
    strategy.push(`Mixed damage comp (${Math.round(adThreat * 100)}% AD / ${Math.round(apThreat * 100)}% AP) — build balanced resistances`);
  } else if (adThreat > 0.6) {
    strategy.push(`AD-heavy comp (${Math.round(adThreat * 100)}% physical) — prioritize armor over MR`);
  } else if (apThreat > 0.6) {
    strategy.push(`AP-heavy comp (${Math.round(apThreat * 100)}% magic) — prioritize magic resist over armor`);
  }

  // Tank density
  if (tankCount >= 2) {
    strategy.push(`${tankCount} tanks/bruisers on enemy team — %penetration items become crucial (Void Staff, LDR, BotRK)`);
  } else if (tankCount === 0 && teamSize >= 3) {
    strategy.push(`No tanks on enemy team — lethality/flat pen scales better than %pen`);
  }

  // Squishies
  if (squishyCount >= 3) {
    strategy.push(`${squishyCount} squishy targets — burst/execute items (Shadowflame, Collector) find easy kills`);
  }

  // CC
  if (ccScore >= 6) {
    strategy.push(`Very heavy CC (score ${ccScore}) — tenacity (Mercury's Treads, Sterak's) is mandatory`);
  } else if (ccScore >= 4) {
    strategy.push(`Significant CC (score ${ccScore}) — tenacity sources recommended`);
  }

  // Healing
  if (healingThreat >= 2) {
    strategy.push(`${healingThreat} champions with significant healing — Grievous Wounds items are mandatory (Mortal Reminder, Morellonomicon, Executioner's)`);
  } else if (healingThreat === 1) {
    strategy.push(`1 high-healing threat — consider Grievous Wounds if they are the main carry`);
  }

  // Auto-attackers
  if (autoAttackThreat >= 2) {
    strategy.push(`${autoAttackThreat} auto-attack reliant enemies — Thornmail/Randuin's/Frozen Heart shut them down`);
  } else if (autoAttackThreat === 1 && tankCount <= 1) {
    strategy.push(`One major auto-attack threat — Plated Steelcaps / extra armor helps`);
  }

  // Assassins
  if (assassinThreat >= 2) {
    strategy.push(`${assassinThreat} assassins — HP stacking + Zhonya's/Banshee's/GA keeps you alive through burst`);
  } else if (assassinThreat === 1 && squishyCount <= 2) {
    strategy.push(`1 assassin threat — prioritize HP over flat resistances`);
  }

  return strategy;
}
