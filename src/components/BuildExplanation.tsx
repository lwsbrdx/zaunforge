import type { BuildExplanation as BuildExplanationType } from '../types';
import { getArchetypeColor } from '../engine/optimizer';

interface BuildExplanationProps {
  explanation: BuildExplanationType;
}

export function BuildExplanationPanel({ explanation }: BuildExplanationProps) {
  const color = getArchetypeColor(explanation.archetype);

  return (
    <div className="bg-zaun-surface border border-zaun-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-3 border-b border-zaun-border"
        style={{ background: `linear-gradient(135deg, ${color}15, transparent)` }}
      >
        <h3 className="text-sm font-bold text-zaun-text flex items-center gap-2">
          <span style={{ color }}>&#9881;</span>
          Build Analysis
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: color + '22', color }}
          >
            {explanation.archetypeLabel}
          </span>
        </h3>
      </div>

      {/* Summary */}
      <div className="px-5 py-3 border-b border-zaun-border/50">
        <p className="text-sm text-zaun-muted leading-relaxed">{explanation.summary}</p>
      </div>

      {/* Profile traits */}
      <div className="px-5 py-3 border-b border-zaun-border/50">
        <div className="flex flex-wrap gap-1.5">
          {explanation.profileTraits.map((trait, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded-full bg-zaun-card text-zaun-muted border border-zaun-border"
            >
              {trait}
            </span>
          ))}
        </div>
      </div>

      {/* Item reasons */}
      <div className="px-5 py-3 space-y-3">
        <h4 className="text-xs font-semibold text-zaun-muted uppercase tracking-wide">
          Item Selection Reasoning
        </h4>

        {explanation.bootReason && (
          <ItemReasonRow
            name={explanation.bootReason.item.name}
            imageUrl={explanation.bootReason.item.imageUrl}
            reasons={explanation.bootReason.reasons}
            isBoot
          />
        )}

        {explanation.itemReasons.map(({ item, reasons }, i) => (
          <ItemReasonRow
            key={item.id}
            name={item.name}
            imageUrl={item.imageUrl}
            reasons={reasons}
            index={i + 1}
          />
        ))}
      </div>
    </div>
  );
}

function ItemReasonRow({
  name,
  imageUrl,
  reasons,
  index,
  isBoot,
}: {
  name: string;
  imageUrl: string;
  reasons: string[];
  index?: number;
  isBoot?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 flex items-start gap-2">
        {index !== undefined && (
          <span className="text-[10px] text-zaun-muted font-mono mt-1 w-3">{index}</span>
        )}
        {isBoot && (
          <span className="text-[10px] text-stat-ms font-mono mt-1 w-3">&#x1F462;</span>
        )}
        <img src={imageUrl} alt={name} className="w-8 h-8 rounded border border-zaun-border" />
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="text-xs font-semibold text-zaun-text">{name}</h5>
        <ul className="mt-0.5 space-y-0.5">
          {reasons.map((reason, i) => (
            <li key={i} className="text-[11px] text-zaun-muted leading-snug flex gap-1.5">
              <span className="text-zaun-glow mt-0.5 flex-shrink-0">&#x2022;</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
