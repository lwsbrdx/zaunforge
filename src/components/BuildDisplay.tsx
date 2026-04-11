import type { BuildResult, DDChampion, DDChampionDetail, ParsedStats } from '../types';
import { getArchetypeLabel, getArchetypeColor } from '../engine/optimizer';
import { ItemCard } from './ItemCard';
import { BuildExplanationPanel } from './BuildExplanation';
import { AbilitiesPanel } from './AbilitiesPanel';

interface BuildDisplayProps {
  champion: DDChampion;
  build: BuildResult;
  version: string;
  championDetail: DDChampionDetail | null;
  detailLoading: boolean;
}

export function BuildDisplay({ champion, build, version, championDetail, detailLoading }: BuildDisplayProps) {
  const champImgUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.id}.png`;
  const archetypeColor = getArchetypeColor(build.archetype);

  return (
    <div className="space-y-6">
      {/* Champion header */}
      <div className="bg-zaun-surface border border-zaun-border rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <img
            src={champImgUrl}
            alt={champion.name}
            className="w-20 h-20 rounded-xl border-2 shadow-lg"
            style={{ borderColor: archetypeColor }}
          />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-zaun-text">{champion.name}</h2>
            <p className="text-sm text-zaun-muted capitalize">{champion.title}</p>
            <div className="flex items-center gap-3 mt-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: archetypeColor + '22', color: archetypeColor }}
              >
                {getArchetypeLabel(build.archetype)}
              </span>
              <span className="text-xs text-zaun-gold font-medium">
                Total: {build.totalGold.toLocaleString()}g
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Abilities */}
      {detailLoading && (
        <div className="bg-zaun-surface border border-zaun-border rounded-2xl p-6 text-center">
          <p className="text-xs text-zaun-muted">Loading abilities...</p>
        </div>
      )}
      {championDetail && !detailLoading && (
        <AbilitiesPanel detail={championDetail} version={version} />
      )}

      {/* Build explanation */}
      <BuildExplanationPanel explanation={build.explanation} />

      {/* Build items */}
      <div>
        <h3 className="text-lg font-semibold text-zaun-text mb-3">Optimal Build</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {build.boot && (
            <ItemCard item={build.boot} showStats />
          )}
          {build.items.map((item, i) => (
            <ItemCard key={item.id} item={item} index={i} showStats />
          ))}
        </div>
      </div>

      {/* Total stats */}
      <div className="bg-zaun-surface border border-zaun-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-zaun-text mb-4">Total Build Stats</h3>
        <StatsGrid stats={build.totalStats} />
      </div>
    </div>
  );
}

function StatsGrid({ stats }: { stats: ParsedStats }) {
  const entries = Object.entries(stats).filter(([, v]) => v > 0);

  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {entries.map(([key, value]) => {
        const info = STAT_INFO[key as keyof typeof STAT_INFO];
        if (!info) return null;
        const displayValue = info.percent
          ? `${(value * 100).toFixed(0)}%`
          : value.toFixed(0);

        return (
          <div key={key} className="bg-zaun-card rounded-lg p-3 text-center">
            <div className={`text-lg font-bold ${info.color}`}>{displayValue}</div>
            <div className="text-xs text-zaun-muted mt-0.5">{info.label}</div>
          </div>
        );
      })}
    </div>
  );
}

const STAT_INFO = {
  attackDamage: { label: 'Attack Damage', color: 'text-stat-ad', percent: false },
  abilityPower: { label: 'Ability Power', color: 'text-stat-ap', percent: false },
  health: { label: 'Health', color: 'text-stat-hp', percent: false },
  mana: { label: 'Mana', color: 'text-stat-mr', percent: false },
  armor: { label: 'Armor', color: 'text-stat-armor', percent: false },
  magicResist: { label: 'Magic Resist', color: 'text-stat-mr', percent: false },
  attackSpeed: { label: 'Attack Speed', color: 'text-stat-as', percent: true },
  critChance: { label: 'Crit Chance', color: 'text-stat-crit', percent: true },
  critDamage: { label: 'Crit Damage', color: 'text-stat-crit', percent: true },
  lifeSteal: { label: 'Life Steal', color: 'text-stat-hp', percent: true },
  abilityHaste: { label: 'Ability Haste', color: 'text-stat-ap', percent: false },
  lethality: { label: 'Lethality', color: 'text-stat-ad', percent: false },
  armorPen: { label: 'Armor Pen', color: 'text-stat-ad', percent: true },
  magicPen: { label: 'Magic Pen', color: 'text-stat-ap', percent: false },
  magicPenPercent: { label: '% Magic Pen', color: 'text-stat-ap', percent: true },
  moveSpeed: { label: 'Move Speed', color: 'text-stat-ms', percent: false },
  moveSpeedPercent: { label: '% Move Speed', color: 'text-stat-ms', percent: true },
  omnivamp: { label: 'Omnivamp', color: 'text-stat-hp', percent: true },
  tenacity: { label: 'Tenacity', color: 'text-stat-armor', percent: true },
  healShieldPower: { label: 'Heal/Shield', color: 'text-stat-hp', percent: true },
  hpRegen: { label: 'HP Regen', color: 'text-stat-hp', percent: false },
} as const;
