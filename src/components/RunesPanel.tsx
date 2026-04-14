import type { RuneRecommendation, RuneTree, RuneIconLookup } from '../types';

interface RunesPanelProps {
  runes: RuneRecommendation;
  lookup: RuneIconLookup | null;
}

const TREE_COLORS: Record<RuneTree, { bg: string; text: string; accent: string; ring: string; shadow: string }> = {
  Precision:   { bg: 'bg-yellow-500/10', text: 'text-yellow-300', accent: 'border-yellow-500/40', ring: 'ring-yellow-400/60', shadow: 'shadow-yellow-500/20' },
  Domination:  { bg: 'bg-red-500/10',    text: 'text-red-300',    accent: 'border-red-500/40',    ring: 'ring-red-400/60',    shadow: 'shadow-red-500/20' },
  Sorcery:     { bg: 'bg-blue-500/10',   text: 'text-blue-300',   accent: 'border-blue-500/40',   ring: 'ring-blue-400/60',   shadow: 'shadow-blue-500/20' },
  Resolve:     { bg: 'bg-green-500/10',  text: 'text-green-300',  accent: 'border-green-500/40',  ring: 'ring-green-400/60',  shadow: 'shadow-green-500/20' },
  Inspiration: { bg: 'bg-teal-500/10',   text: 'text-teal-300',   accent: 'border-teal-500/40',   ring: 'ring-teal-400/60',   shadow: 'shadow-teal-500/20' },
};

function runeIcon(lookup: RuneIconLookup | null, name: string): string | null {
  return lookup?.runeByName[name]?.icon ?? null;
}

function treeIcon(lookup: RuneIconLookup | null, tree: RuneTree): string | null {
  return lookup?.treeByKey[tree]?.icon ?? null;
}

function shardIcon(lookup: RuneIconLookup | null, name: string): string | null {
  return lookup?.shardByName[name] ?? null;
}

export function RunesPanel({ runes, lookup }: RunesPanelProps) {
  const keystoneColor = TREE_COLORS[runes.keystone.tree];
  const primaryColor = TREE_COLORS[runes.primary.tree];
  const secondaryColor = TREE_COLORS[runes.secondary.tree];

  const keystoneSrc = runeIcon(lookup, runes.keystone.name);

  return (
    <div className="bg-zaun-surface border border-zaun-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-zaun-border flex items-center gap-2">
        <span className="text-zaun-gold">&#9728;</span>
        <h3 className="text-sm font-bold text-zaun-text">Recommended Runes</h3>
      </div>

      {/* Keystone highlight */}
      <div className={`px-5 py-4 border-b border-zaun-border/50 ${keystoneColor.bg}`}>
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${keystoneColor.accent} bg-zaun-bg/60 flex-shrink-0 shadow-lg ${keystoneColor.shadow} overflow-hidden`}>
            {keystoneSrc ? (
              <img src={keystoneSrc} alt={runes.keystone.name} className="w-full h-full object-contain" loading="lazy" />
            ) : (
              <span className={`text-2xl ${keystoneColor.text}`}>&#9733;</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <TreeBadge tree={runes.keystone.tree} lookup={lookup} color={keystoneColor} label="keystone" />
            <h4 className="text-base font-bold text-zaun-text mt-1">
              {runes.keystone.name}
            </h4>
            <p className="text-xs text-zaun-muted mt-1 leading-snug">
              {runes.keystone.reasoning}
            </p>
          </div>
        </div>
      </div>

      {/* Primary + Secondary trees */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zaun-border/50">
        <TreeBlock
          title="Primary"
          tree={runes.primary.tree}
          runes={runes.primary.runes}
          color={primaryColor}
          lookup={lookup}
        />
        <TreeBlock
          title="Secondary"
          tree={runes.secondary.tree}
          runes={runes.secondary.runes}
          color={secondaryColor}
          lookup={lookup}
        />
      </div>

      {/* Stat shards */}
      <div className="px-5 py-3 border-t border-zaun-border/50">
        <h5 className="text-[10px] font-semibold text-zaun-muted uppercase tracking-wide mb-2">
          Stat Shards
        </h5>
        <div className="grid grid-cols-3 gap-2">
          <ShardCard label="Offense" value={runes.shards.offense} lookup={lookup} />
          <ShardCard label="Flex" value={runes.shards.flex} lookup={lookup} />
          <ShardCard label="Defense" value={runes.shards.defense} lookup={lookup} />
        </div>
      </div>
    </div>
  );
}

function TreeBadge({
  tree,
  lookup,
  color,
  label,
}: {
  tree: RuneTree;
  lookup: RuneIconLookup | null;
  color: { text: string };
  label?: string;
}) {
  const src = treeIcon(lookup, tree);
  return (
    <span className="inline-flex items-center gap-1.5">
      {src && (
        <img src={src} alt={tree} className="w-4 h-4 object-contain" loading="lazy" />
      )}
      <span className={`text-[10px] font-bold uppercase tracking-widest ${color.text}`}>
        {tree}{label ? ` ${label}` : ''}
      </span>
    </span>
  );
}

function TreeBlock({
  title,
  tree,
  runes,
  color,
  lookup,
}: {
  title: string;
  tree: RuneTree;
  runes: string[];
  color: { bg: string; text: string; accent: string; ring: string; shadow: string };
  lookup: RuneIconLookup | null;
}) {
  const treeSrc = treeIcon(lookup, tree);
  return (
    <div className="px-5 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-semibold text-zaun-muted uppercase tracking-wide">
          {title}
        </span>
        {treeSrc && (
          <img src={treeSrc} alt={tree} className="w-4 h-4 object-contain" loading="lazy" />
        )}
        <span className={`text-[11px] font-bold ${color.text}`}>{tree}</span>
      </div>
      <ul className="space-y-2">
        {runes.map((rune, i) => {
          const src = runeIcon(lookup, rune);
          return (
            <li key={`${rune}-${i}`} className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${color.accent} bg-zaun-bg/60 flex-shrink-0 overflow-hidden`}>
                {src ? (
                  <img src={src} alt={rune} className="w-full h-full object-contain" loading="lazy" />
                ) : (
                  <span className={`w-1.5 h-1.5 rounded-full ${color.text.replace('text-', 'bg-')}`} />
                )}
              </div>
              <span className="text-xs text-zaun-text">{rune}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ShardCard({
  label,
  value,
  lookup,
}: {
  label: string;
  value: string;
  lookup: RuneIconLookup | null;
}) {
  const src = shardIcon(lookup, value);
  return (
    <div className="bg-zaun-card rounded-lg px-3 py-2 flex items-center gap-2 border border-zaun-border">
      <div className="w-7 h-7 rounded-full flex items-center justify-center bg-zaun-bg border border-zaun-border/60 flex-shrink-0 overflow-hidden">
        {src ? (
          <img src={src} alt={value} className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-zaun-muted" />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-zaun-muted uppercase tracking-wide leading-none">{label}</div>
        <div className="text-[11px] font-semibold text-zaun-text mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}
