import { useState } from 'react';
import type { DDChampionDetail } from '../types';
import { getPassiveImageUrl, getSpellImageUrl } from '../api/datadragon';

interface AbilitiesPanelProps {
  detail: DDChampionDetail;
  version: string;
}

const SPELL_KEYS = ['Q', 'W', 'E', 'R'] as const;

export function AbilitiesPanel({ detail, version }: AbilitiesPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const abilities = [
    {
      key: 'P',
      name: detail.passive.name,
      description: detail.passive.description,
      imageUrl: getPassiveImageUrl(version, detail.passive.image.full),
      cooldown: null,
      cost: null,
      range: null,
    },
    ...detail.spells.map((spell, i) => ({
      key: SPELL_KEYS[i],
      name: spell.name,
      description: spell.description,
      imageUrl: getSpellImageUrl(version, spell.image.full),
      cooldown: spell.cooldownBurn,
      cost: spell.costBurn !== '0' ? `${spell.costBurn} ${cleanCostType(spell.costType)}` : null,
      range: spell.rangeBurn !== 'self' && spell.rangeBurn !== '0' ? spell.rangeBurn : null,
    })),
  ];

  return (
    <div className="bg-zaun-surface border border-zaun-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-zaun-border">
        <h3 className="text-sm font-bold text-zaun-text">Abilities</h3>
      </div>

      {/* Ability icons row */}
      <div className="px-5 py-3 flex gap-2 justify-center border-b border-zaun-border/50">
        {abilities.map((ability, i) => (
          <button
            key={ability.key}
            onClick={() => setSelectedIndex(selectedIndex === i ? null : i)}
            className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-150 ${
              selectedIndex === i
                ? 'border-zaun-glow scale-110 shadow-lg shadow-zaun-glow/20'
                : 'border-zaun-border hover:border-zaun-muted hover:scale-105'
            }`}
          >
              <img
                src={ability.imageUrl}
                alt={ability.name}
                className="w-full h-full object-cover"
              />
              <span
                className={`absolute bottom-0 right-0 text-[9px] font-bold px-1 leading-tight ${
                  ability.key === 'P'
                    ? 'bg-zaun-gold/80 text-black'
                    : 'bg-black/70 text-zaun-text'
                }`}
              >
                {ability.key}
              </span>
          </button>
        ))}
      </div>

      {/* Detail area */}
      <div className="px-5 py-3 min-h-[120px]">
        {selectedIndex !== null ? (
          <AbilityDetail ability={abilities[selectedIndex]} />
        ) : (
          <p className="text-xs text-zaun-muted text-center py-4">
            Click an ability to see details
          </p>
        )}
      </div>
    </div>
  );
}

interface AbilityInfo {
  key: string;
  name: string;
  description: string;
  imageUrl: string;
  cooldown: string | null;
  cost: string | null;
  range: string | null;
}

function AbilityDetail({ ability }: { ability: AbilityInfo }) {
  const cleanedDesc = cleanDescription(ability.description);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img
          src={ability.imageUrl}
          alt={ability.name}
          className="w-8 h-8 rounded border border-zaun-border"
        />
        <div>
          <h4 className="text-sm font-bold text-zaun-text">
            <span className="text-zaun-gold mr-1.5">[{ability.key}]</span>
            {ability.name}
          </h4>
        </div>
      </div>

      {/* Meta (CD / Cost / Range) */}
      <div className="flex gap-4 text-[11px]">
        {ability.cooldown && (
          <span className="text-stat-ap">
            <span className="text-zaun-muted">CD:</span> {ability.cooldown}s
          </span>
        )}
        {ability.cost && (
          <span className="text-stat-mr">
            <span className="text-zaun-muted">Cost:</span> {ability.cost}
          </span>
        )}
        {ability.range && (
          <span className="text-stat-ms">
            <span className="text-zaun-muted">Range:</span> {ability.range}
          </span>
        )}
      </div>

      {/* Description */}
      <div
        className="text-xs text-zaun-muted leading-relaxed ability-description"
        dangerouslySetInnerHTML={{ __html: cleanedDesc }}
      />
    </div>
  );
}

function cleanCostType(costType: string): string {
  // costType can be things like "{{ abilityresourcename }}" or "Mana" etc
  if (costType.includes('abilityresourcename') || costType.includes('{{')) {
    return 'Mana';
  }
  return costType.trim();
}

function cleanDescription(html: string): string {
  let cleaned = html;

  // Highlight scaling values
  cleaned = cleaned.replace(
    /<scaleAP>([\s\S]*?)<\/scaleAP>/gi,
    '<span class="text-stat-ap font-medium">$1</span>'
  );
  cleaned = cleaned.replace(
    /<scaleAD>([\s\S]*?)<\/scaleAD>/gi,
    '<span class="text-stat-ad font-medium">$1</span>'
  );
  cleaned = cleaned.replace(
    /<scaleMana>([\s\S]*?)<\/scaleMana>/gi,
    '<span class="text-stat-mr font-medium">$1</span>'
  );
  cleaned = cleaned.replace(
    /<scaleHealth>([\s\S]*?)<\/scaleHealth>/gi,
    '<span class="text-stat-hp font-medium">$1</span>'
  );
  cleaned = cleaned.replace(
    /<scaleArmor>([\s\S]*?)<\/scaleArmor>/gi,
    '<span class="text-stat-armor font-medium">$1</span>'
  );
  cleaned = cleaned.replace(
    /<scaleMR>([\s\S]*?)<\/scaleMR>/gi,
    '<span class="text-stat-mr font-medium">$1</span>'
  );
  cleaned = cleaned.replace(
    /<scaleLevel>([\s\S]*?)<\/scaleLevel>/gi,
    '<span class="text-zaun-gold font-medium">$1</span>'
  );

  // Style active/passive/attention
  cleaned = cleaned.replace(
    /<(passive|active|unique)>([\s\S]*?)<\/\1>/gi,
    '<span class="text-[#f0e6d2] font-semibold">$2</span>'
  );
  cleaned = cleaned.replace(
    /<attention>([\s\S]*?)<\/attention>/gi,
    '<span class="text-[#f0e6d2] font-semibold">$1</span>'
  );
  cleaned = cleaned.replace(
    /<keywordMajor>([\s\S]*?)<\/keywordMajor>/gi,
    '<span class="text-zaun-gold font-semibold">$1</span>'
  );
  cleaned = cleaned.replace(
    /<status>([\s\S]*?)<\/status>/gi,
    '<span class="text-yellow-400">$1</span>'
  );
  cleaned = cleaned.replace(
    /<magicDamage>([\s\S]*?)<\/magicDamage>/gi,
    '<span class="text-stat-ap">$1</span>'
  );
  cleaned = cleaned.replace(
    /<physicalDamage>([\s\S]*?)<\/physicalDamage>/gi,
    '<span class="text-stat-ad">$1</span>'
  );
  cleaned = cleaned.replace(
    /<trueDamage>([\s\S]*?)<\/trueDamage>/gi,
    '<span class="text-white font-semibold">$1</span>'
  );
  cleaned = cleaned.replace(
    /<healing>([\s\S]*?)<\/healing>/gi,
    '<span class="text-stat-hp">$1</span>'
  );
  cleaned = cleaned.replace(
    /<shield>([\s\S]*?)<\/shield>/gi,
    '<span class="text-stat-armor">$1</span>'
  );
  cleaned = cleaned.replace(
    /<speed>([\s\S]*?)<\/speed>/gi,
    '<span class="text-stat-ms">$1</span>'
  );

  // Stats section
  cleaned = cleaned.replace(/<\/?stats>/gi, '');
  cleaned = cleaned.replace(/<\/?mainText>/gi, '');

  // Remaining custom tags → strip
  cleaned = cleaned.replace(/<\/?[a-zA-Z]+>/g, '');

  // Template vars like {{ e1 }} → remove
  cleaned = cleaned.replace(/\{\{.*?\}\}/g, '(?)');

  return cleaned.trim();
}
