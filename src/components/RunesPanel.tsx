import type { RuneRecommendation, RuneTree } from '../types';

interface RunesPanelProps {
  runes: RuneRecommendation;
}

const TREE_COLORS: Record<RuneTree, { bg: string; text: string; accent: string }> = {
  Precision: { bg: 'bg-yellow-500/10', text: 'text-yellow-300', accent: 'border-yellow-500/40' },
  Domination: { bg: 'bg-red-500/10', text: 'text-red-300', accent: 'border-red-500/40' },
  Sorcery: { bg: 'bg-blue-500/10', text: 'text-blue-300', accent: 'border-blue-500/40' },
  Resolve: { bg: 'bg-green-500/10', text: 'text-green-300', accent: 'border-green-500/40' },
  Inspiration: { bg: 'bg-teal-500/10', text: 'text-teal-300', accent: 'border-teal-500/40' },
};

export function RunesPanel({ runes }: RunesPanelProps) {
  const keystoneColor = TREE_COLORS[runes.keystone.tree];
  const primaryColor = TREE_COLORS[runes.primary.tree];
  const secondaryColor = TREE_COLORS[runes.secondary.tree];

  return (
    <div className="bg-zaun-surface border border-zaun-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-zaun-border flex items-center gap-2">
        <span className="text-zaun-gold">&#9728;</span>
        <h3 className="text-sm font-bold text-zaun-text">Recommended Runes</h3>
      </div>

      {/* Keystone highlight */}
      <div className={`px-5 py-4 border-b border-zaun-border/50 ${keystoneColor.bg}`}>
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${keystoneColor.accent} bg-zaun-card flex-shrink-0`}>
            <span className={`text-2xl ${keystoneColor.text}`}>&#9733;</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${keystoneColor.text}`}>
                {runes.keystone.tree} keystone
              </span>
            </div>
            <h4 className="text-base font-bold text-zaun-text mt-0.5">
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
        />
        <TreeBlock
          title="Secondary"
          tree={runes.secondary.tree}
          runes={runes.secondary.runes}
          color={secondaryColor}
        />
      </div>

      {/* Stat shards */}
      <div className="px-5 py-3 border-t border-zaun-border/50">
        <h5 className="text-[10px] font-semibold text-zaun-muted uppercase tracking-wide mb-2">
          Stat Shards
        </h5>
        <div className="grid grid-cols-3 gap-2">
          <ShardCard label="Offense" value={runes.shards.offense} />
          <ShardCard label="Flex" value={runes.shards.flex} />
          <ShardCard label="Defense" value={runes.shards.defense} />
        </div>
      </div>
    </div>
  );
}

function TreeBlock({
  title,
  tree,
  runes,
  color,
}: {
  title: string;
  tree: RuneTree;
  runes: string[];
  color: { bg: string; text: string; accent: string };
}) {
  return (
    <div className="px-5 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold text-zaun-muted uppercase tracking-wide">
          {title}
        </span>
        <span className={`text-[11px] font-bold ${color.text}`}>{tree}</span>
      </div>
      <ul className="space-y-1">
        {runes.map((rune, i) => (
          <li key={i} className="text-xs text-zaun-text flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${color.text.replace('text-', 'bg-')}`} />
            <span>{rune}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShardCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zaun-card rounded-lg px-3 py-2 text-center border border-zaun-border">
      <div className="text-[10px] text-zaun-muted uppercase tracking-wide">{label}</div>
      <div className="text-xs font-semibold text-zaun-text mt-0.5">{value}</div>
    </div>
  );
}
