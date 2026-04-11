import { useState, useMemo } from 'react';
import type { DDChampion, ChampionTag } from '../types';

interface ChampionGridProps {
  champions: DDChampion[];
  selectedChampion: DDChampion | null;
  version: string;
  onSelect: (champion: DDChampion) => void;
}

const TAG_COLORS: Record<ChampionTag, string> = {
  Fighter: 'bg-tag-fighter/20 text-tag-fighter',
  Mage: 'bg-tag-mage/20 text-tag-mage',
  Assassin: 'bg-tag-assassin/20 text-tag-assassin',
  Marksman: 'bg-tag-marksman/20 text-tag-marksman',
  Tank: 'bg-tag-tank/20 text-tag-tank',
  Support: 'bg-tag-support/20 text-tag-support',
};

const ALL_TAGS: ChampionTag[] = ['Fighter', 'Mage', 'Assassin', 'Marksman', 'Tank', 'Support'];

export function ChampionGrid({ champions, selectedChampion, version, onSelect }: ChampionGridProps) {
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<ChampionTag | null>(null);

  const filtered = useMemo(() => {
    return champions.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !filterTag || c.tags.includes(filterTag);
      return matchesSearch && matchesTag;
    });
  }, [champions, search, filterTag]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search champions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zaun-card border border-zaun-border rounded-lg px-4 py-2.5 text-zaun-text placeholder:text-zaun-muted focus:outline-none focus:border-zaun-glow transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zaun-muted hover:text-zaun-text"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterTag === tag
                  ? TAG_COLORS[tag] + ' ring-1 ring-current'
                  : 'bg-zaun-card text-zaun-muted hover:text-zaun-text'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
        {filtered.map(champion => {
          const isSelected = selectedChampion?.id === champion.id;
          const imgUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.id}.png`;
          return (
            <button
              key={champion.id}
              onClick={() => onSelect(champion)}
              className={`group relative rounded-lg overflow-hidden transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-zaun-glow scale-110 z-10 shadow-lg shadow-zaun-glow/20'
                  : 'hover:ring-1 hover:ring-zaun-border hover:scale-105'
              }`}
              title={champion.name}
            >
              <img
                src={imgUrl}
                alt={champion.name}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
              <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 ${
                isSelected ? 'from-zaun-glow/30' : ''
              }`}>
                <span className="text-[9px] font-medium leading-none block truncate">
                  {champion.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-zaun-muted py-8">No champions found</p>
      )}
    </div>
  );
}
