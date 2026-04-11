import type { ParsedItem } from '../types';

interface ItemTooltipProps {
  item: ParsedItem;
  position: { x: number; y: number };
}

export function ItemTooltip({ item, position }: ItemTooltipProps) {
  const nonZeroStats = Object.entries(item.stats).filter(([, v]) => v > 0);

  // Parse description HTML into cleaner text
  const descriptionHtml = cleanDescription(item.description);

  // Determine tooltip position (avoid going off-screen)
  const style: React.CSSProperties = {
    position: 'fixed',
    left: position.x + 16,
    top: position.y - 8,
    zIndex: 100,
    maxWidth: 340,
  };

  // If tooltip would go off right edge, flip to left
  if (position.x > window.innerWidth - 380) {
    style.left = position.x - 356;
  }
  // If tooltip would go off bottom, move up
  if (position.y > window.innerHeight - 400) {
    style.top = Math.max(8, position.y - 350);
  }

  return (
    <div
      style={style}
      className="bg-[#010a13] border border-[#c8aa6e] rounded-lg shadow-2xl shadow-black/60 pointer-events-none"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-[#1e2328] bg-gradient-to-r from-[#1e2328] to-[#010a13] rounded-t-lg">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-12 h-12 rounded border border-[#5b5a56]"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[#f0e6d2] truncate">{item.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold text-zaun-gold">{item.goldTotal}g</span>
            {item.goldBase > 0 && (
              <span className="text-[10px] text-zaun-muted">(combine: {item.goldBase}g)</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {nonZeroStats.length > 0 && (
        <div className="px-3 py-2 border-b border-[#1e2328]">
          <div className="space-y-0.5">
            {nonZeroStats.map(([key, value]) => {
              const info = STAT_DISPLAY[key as keyof typeof STAT_DISPLAY];
              if (!info) return null;
              const displayValue = info.percent
                ? `+${(value * 100).toFixed(0)}%`
                : `+${value.toFixed(0)}`;
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className={`font-semibold ${info.color}`}>{displayValue}</span>
                  <span className="text-[#a09b8c]">{info.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Description / Passives */}
      <div
        className="px-3 py-2 text-xs text-[#a09b8c] leading-relaxed item-description"
        dangerouslySetInnerHTML={{ __html: descriptionHtml }}
      />

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {item.tags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e2328] text-[#5b5a56]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function cleanDescription(html: string): string {
  // Remove the <stats>...</stats> block (we display stats separately)
  let cleaned = html.replace(/<stats>[\s\S]*?<\/stats>/gi, '');

  // Remove <mainText> and </mainText> wrappers
  cleaned = cleaned.replace(/<\/?mainText>/gi, '');

  // Style passive/active names
  cleaned = cleaned.replace(
    /<(passive|active|unique)>([\s\S]*?)<\/\1>/gi,
    '<span class="text-[#f0e6d2] font-semibold">$2</span>'
  );

  // Style attention values
  cleaned = cleaned.replace(
    /<attention>([\s\S]*?)<\/attention>/gi,
    '<span class="text-[#f0e6d2] font-semibold">$1</span>'
  );

  // Style keywords
  cleaned = cleaned.replace(
    /<keywordMajor>([\s\S]*?)<\/keywordMajor>/gi,
    '<span class="text-zaun-gold font-semibold">$1</span>'
  );
  cleaned = cleaned.replace(
    /<keywordStealth>([\s\S]*?)<\/keywordStealth>/gi,
    '<span class="text-purple-400">$1</span>'
  );

  // Style various LoL-specific tags
  cleaned = cleaned.replace(
    /<(magicDamage|trueDamage|physicalDamage|healing|shield|speed|status)>([\s\S]*?)<\/\1>/gi,
    '<span class="text-[#f0e6d2]">$2</span>'
  );

  // Style rarityMythic, rarityLegendary, etc
  cleaned = cleaned.replace(
    /<rarityMythic>([\s\S]*?)<\/rarityMythic>/gi,
    '<span class="text-orange-400 font-semibold">$1</span>'
  );
  cleaned = cleaned.replace(
    /<rarityLegendary>([\s\S]*?)<\/rarityLegendary>/gi,
    '<span class="text-red-400 font-semibold">$1</span>'
  );

  // Clean remaining custom tags
  cleaned = cleaned.replace(/<\/?[a-zA-Z]+>/g, '');

  // Clean up whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

const STAT_DISPLAY = {
  attackDamage: { label: 'Attack Damage', color: 'text-stat-ad', percent: false },
  abilityPower: { label: 'Ability Power', color: 'text-stat-ap', percent: false },
  health: { label: 'Health', color: 'text-stat-hp', percent: false },
  mana: { label: 'Mana', color: 'text-stat-mr', percent: false },
  armor: { label: 'Armor', color: 'text-stat-armor', percent: false },
  magicResist: { label: 'Magic Resist', color: 'text-stat-mr', percent: false },
  attackSpeed: { label: 'Attack Speed', color: 'text-stat-as', percent: true },
  critChance: { label: 'Critical Strike Chance', color: 'text-stat-crit', percent: true },
  critDamage: { label: 'Critical Strike Damage', color: 'text-stat-crit', percent: true },
  lifeSteal: { label: 'Life Steal', color: 'text-stat-hp', percent: true },
  abilityHaste: { label: 'Ability Haste', color: 'text-stat-ap', percent: false },
  lethality: { label: 'Lethality', color: 'text-stat-ad', percent: false },
  armorPen: { label: 'Armor Penetration', color: 'text-stat-ad', percent: true },
  magicPen: { label: 'Magic Penetration', color: 'text-stat-ap', percent: false },
  magicPenPercent: { label: 'Magic Penetration', color: 'text-stat-ap', percent: true },
  moveSpeed: { label: 'Move Speed', color: 'text-stat-ms', percent: false },
  moveSpeedPercent: { label: 'Move Speed', color: 'text-stat-ms', percent: true },
  omnivamp: { label: 'Omnivamp', color: 'text-stat-hp', percent: true },
  tenacity: { label: 'Tenacity', color: 'text-stat-armor', percent: true },
  healShieldPower: { label: 'Heal & Shield Power', color: 'text-stat-hp', percent: true },
  hpRegen: { label: 'Health Regen', color: 'text-stat-hp', percent: false },
} as const;
