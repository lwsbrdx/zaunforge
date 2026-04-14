import type { BuildResult, DDChampion, DDChampionDetail, ParsedStats, RuneIconLookup, ParsedItem, StarterOption } from '../types';
import { getArchetypeLabel, getArchetypeColor } from '../engine/optimizer';
import { pickStarterOptions } from '../engine/starterItems';
import { ItemCard } from './ItemCard';
import { BuildExplanationPanel } from './BuildExplanation';
import { AbilitiesPanel } from './AbilitiesPanel';
import { RunesPanel } from './RunesPanel';

interface BuildDisplayProps {
  champion: DDChampion;
  build: BuildResult;
  version: string;
  championDetail: DDChampionDetail | null;
  detailLoading: boolean;
  runeLookup: RuneIconLookup | null;
  items: ParsedItem[];
}

export function BuildDisplay({ champion, build, version, championDetail, detailLoading, runeLookup, items }: BuildDisplayProps) {
  const champImgUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.id}.png`;
  const archetypeColor = getArchetypeColor(build.archetype);

  const starterOptions = pickStarterOptions(build.archetype, items, build.explanation.compAnalysis);

  const coreItems = build.items.slice(0, 3);
  const situationalItems = build.items.slice(3);

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

      {/* Runes */}
      <RunesPanel runes={build.explanation.runes} lookup={runeLookup} />

      {/* Item Build + Build Analysis side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Item Build (op.gg-style overview) */}
        <div className="bg-zaun-surface border border-zaun-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zaun-border flex items-center gap-2">
            <span style={{ color: archetypeColor }}>&#9876;</span>
            <h3 className="text-sm font-bold text-zaun-text">Item Build</h3>
          </div>

          {/* Starter + Boots row */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zaun-border/50">
            <StarterItemsBlock options={starterOptions} />
            <BootsBlock boot={build.boot} reason={build.explanation.bootReason?.reasons[0] ?? null} />
          </div>

          {/* Core build sequence */}
          {coreItems.length > 0 && (
            <CoreBuildBlock items={coreItems} />
          )}

          {/* Situational (slots 4-5) */}
          {situationalItems.length > 0 && (
            <SituationalBlock items={situationalItems} startSlot={coreItems.length + 1} />
          )}
        </div>

        {/* Right: Build Analysis (detailed reasoning) */}
        <BuildExplanationPanel explanation={build.explanation} />
      </div>

      {/* Detailed Breakdown + Total Stats side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Full-detail item list */}
        <div>
          <h3 className="text-lg font-semibold text-zaun-text mb-3">Detailed Breakdown</h3>
          <div className="grid grid-cols-1 gap-3">
            {build.boot && (
              <ItemCard item={build.boot} showStats />
            )}
            {build.items.map((item, i) => (
              <ItemCard key={item.id} item={item} index={i} showStats />
            ))}
          </div>
        </div>

        {/* Right: Total stats */}
        <div className="bg-zaun-surface border border-zaun-border rounded-2xl p-6 h-fit">
          <h3 className="text-lg font-semibold text-zaun-text mb-4">Total Build Stats</h3>
          <StatsGrid stats={build.totalStats} />
        </div>
      </div>
    </div>
  );
}

// ─── Op.gg-style blocks ────────────────────────────────────────────────

function StarterItemsBlock({ options }: { options: StarterOption[] }) {
  return (
    <div className="px-5 py-4">
      <h4 className="text-[10px] font-semibold text-zaun-muted uppercase tracking-widest mb-3">
        Starter Items
      </h4>
      {options.length === 0 ? (
        <p className="text-xs text-zaun-muted italic">No starter recommendation for this archetype.</p>
      ) : (
        <ul className="space-y-2.5">
          {options.map((opt, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="flex gap-1 flex-shrink-0">
                {opt.items.map(item => (
                  <img
                    key={item.id}
                    src={item.imageUrl}
                    alt={item.name}
                    title={item.name}
                    className="w-10 h-10 rounded-lg border border-zaun-border"
                    loading="lazy"
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zaun-text">{opt.items.map(i => i.name).join(' + ')}</span>
                  <span className="text-[10px] text-zaun-glow font-medium uppercase tracking-wide">{opt.label}</span>
                </div>
                <ul className="mt-0.5 space-y-0.5">
                  {opt.notes.map((n, ni) => (
                    <li key={ni} className="text-[11px] text-zaun-muted leading-snug">{n}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BootsBlock({ boot, reason }: { boot: ParsedItem | null; reason: string | null }) {
  if (!boot) {
    return (
      <div className="px-5 py-4">
        <h4 className="text-[10px] font-semibold text-zaun-muted uppercase tracking-widest mb-3">Boots</h4>
        <p className="text-xs text-zaun-muted italic">No boots recommended.</p>
      </div>
    );
  }
  return (
    <div className="px-5 py-4">
      <h4 className="text-[10px] font-semibold text-zaun-muted uppercase tracking-widest mb-3">Boots</h4>
      <div className="flex items-start gap-3">
        <img
          src={boot.imageUrl}
          alt={boot.name}
          title={boot.name}
          className="w-10 h-10 rounded-lg border border-zaun-border flex-shrink-0"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zaun-text">{boot.name}</span>
            <span className="text-[10px] text-zaun-gold font-medium">{boot.goldTotal}g</span>
          </div>
          {reason && (
            <p className="text-[11px] text-zaun-muted leading-snug mt-0.5">{reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CoreBuildBlock({ items }: { items: ParsedItem[] }) {
  const totalGold = items.reduce((sum, i) => sum + i.goldTotal, 0);
  return (
    <div className="px-5 py-4 border-t border-zaun-border/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[10px] font-semibold text-zaun-muted uppercase tracking-widest">
          Core Build — First {items.length} Items
        </h4>
        <span className="text-[11px] text-zaun-gold font-medium">{totalGold.toLocaleString()}g</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2">
            <div className="relative group">
              <img
                src={item.imageUrl}
                alt={item.name}
                title={item.name}
                className="w-14 h-14 rounded-lg border-2 border-zaun-border hover:border-zaun-glow transition-colors"
                loading="lazy"
              />
              <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-zaun-glow text-zaun-bg text-[10px] font-bold flex items-center justify-center shadow">
                {i + 1}
              </div>
              <div className="absolute inset-x-0 -bottom-5 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-[10px] text-zaun-text bg-zaun-bg/90 px-1.5 py-0.5 rounded whitespace-nowrap">{item.name}</span>
              </div>
            </div>
            {i < items.length - 1 && (
              <span className="text-zaun-muted text-xl select-none">&rsaquo;</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SituationalBlock({ items, startSlot }: { items: ParsedItem[]; startSlot: number }) {
  return (
    <div className="px-5 py-4 border-t border-zaun-border/50">
      <h4 className="text-[10px] font-semibold text-zaun-muted uppercase tracking-widest mb-3">
        Situational — Slots {startSlot}{items.length > 1 ? `–${startSlot + items.length - 1}` : ''}
      </h4>
      <div className="flex gap-3 flex-wrap">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2">
            <div className="relative group">
              <img
                src={item.imageUrl}
                alt={item.name}
                title={item.name}
                className="w-12 h-12 rounded-lg border border-zaun-border hover:border-zaun-glow transition-colors"
                loading="lazy"
              />
              <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-zaun-card border border-zaun-border text-zaun-muted text-[9px] font-bold flex items-center justify-center">
                {startSlot + i}
              </div>
            </div>
            <span className="text-xs text-zaun-text">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stats grid (unchanged) ────────────────────────────────────────────

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
