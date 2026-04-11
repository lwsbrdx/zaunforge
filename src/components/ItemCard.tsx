import { useState, useCallback } from 'react';
import type { ParsedItem } from '../types';
import { ItemTooltip } from './ItemTooltip';

interface ItemCardProps {
  item: ParsedItem;
  index?: number;
  showStats?: boolean;
}

export function ItemCard({ item, index, showStats = false }: ItemCardProps) {
  const nonZeroStats = Object.entries(item.stats).filter(([, v]) => v > 0);
  const [hover, setHover] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setHover(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHover(false);
  }, []);

  return (
    <div
      className="group relative bg-zaun-card border border-zaun-border rounded-xl p-3 hover:border-zaun-glow/50 transition-all duration-200 cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center gap-3">
        {index !== undefined && (
          <span className="text-xs text-zaun-muted font-mono w-4">{index + 1}</span>
        )}
        <div className="relative">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-12 h-12 rounded-lg border border-zaun-border"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-zaun-text truncate">{item.name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-zaun-gold font-medium">{item.goldTotal}g</span>
            {item.isBoot && (
              <span className="text-[10px] bg-stat-ms/20 text-stat-ms px-1.5 py-0.5 rounded">
                Boot
              </span>
            )}
          </div>
        </div>
      </div>

      {showStats && nonZeroStats.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
          {nonZeroStats.map(([key, value]) => (
            <StatLine key={key} statKey={key} value={value} />
          ))}
        </div>
      )}

      {hover && <ItemTooltip item={item} position={mousePos} />}
    </div>
  );
}

function StatLine({ statKey, value }: { statKey: string; value: number }) {
  const info = STAT_DISPLAY[statKey as keyof typeof STAT_DISPLAY];
  if (!info) return null;

  const displayValue = info.percent
    ? `${(value * 100).toFixed(0)}%`
    : value.toFixed(0);

  return (
    <div className="flex items-center justify-between text-xs">
      <span className={`${info.color}`}>{info.label}</span>
      <span className="text-zaun-text font-medium">{displayValue}</span>
    </div>
  );
}

const STAT_DISPLAY = {
  attackDamage: { label: 'AD', color: 'text-stat-ad', percent: false },
  abilityPower: { label: 'AP', color: 'text-stat-ap', percent: false },
  health: { label: 'HP', color: 'text-stat-hp', percent: false },
  mana: { label: 'Mana', color: 'text-stat-mr', percent: false },
  armor: { label: 'Armor', color: 'text-stat-armor', percent: false },
  magicResist: { label: 'MR', color: 'text-stat-mr', percent: false },
  attackSpeed: { label: 'AS', color: 'text-stat-as', percent: true },
  critChance: { label: 'Crit', color: 'text-stat-crit', percent: true },
  critDamage: { label: 'Crit DMG', color: 'text-stat-crit', percent: true },
  lifeSteal: { label: 'Life Steal', color: 'text-stat-hp', percent: true },
  abilityHaste: { label: 'AH', color: 'text-stat-ap', percent: false },
  lethality: { label: 'Lethality', color: 'text-stat-ad', percent: false },
  armorPen: { label: 'Armor Pen', color: 'text-stat-ad', percent: true },
  magicPen: { label: 'Magic Pen', color: 'text-stat-ap', percent: false },
  magicPenPercent: { label: '% Magic Pen', color: 'text-stat-ap', percent: true },
  moveSpeed: { label: 'MS', color: 'text-stat-ms', percent: false },
  moveSpeedPercent: { label: '% MS', color: 'text-stat-ms', percent: true },
  omnivamp: { label: 'Omnivamp', color: 'text-stat-hp', percent: true },
  tenacity: { label: 'Tenacity', color: 'text-stat-armor', percent: true },
  healShieldPower: { label: 'Heal/Shield', color: 'text-stat-hp', percent: true },
  hpRegen: { label: 'HP Regen', color: 'text-stat-hp', percent: false },
} as const;
