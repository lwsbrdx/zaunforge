import { useState, useMemo, useEffect } from 'react';
import type { DDChampion, ChampionTag } from '../types';

interface ChampionPickerModalProps {
  champions: DDChampion[];
  version: string;
  title: string;
  excludeIds?: Set<string>;
  onSelect: (champion: DDChampion) => void;
  onClose: () => void;
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

export function ChampionPickerModal({
  champions,
  version,
  title,
  excludeIds = new Set(),
  onSelect,
  onClose,
}: ChampionPickerModalProps) {
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<ChampionTag | null>(null);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [onClose]);

  const filtered = useMemo(() => {
    return champions.filter(c => {
      if (excludeIds.has(c.id)) return false;
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !filterTag || c.tags.includes(filterTag);
      return matchesSearch && matchesTag;
    });
  }, [champions, search, filterTag, excludeIds]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-zaun-surface border border-zaun-border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zaun-border flex items-center justify-between">
          <h2 className="text-base font-bold text-zaun-text">{title}</h2>
          <button
            onClick={onClose}
            className="text-zaun-muted hover:text-zaun-text text-lg leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zaun-card"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Search + filters */}
        <div className="px-5 py-3 border-b border-zaun-border space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search champions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
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

        {/* Champion grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {filtered.map(champion => {
              const imgUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.id}.png`;
              return (
                <button
                  key={champion.id}
                  onClick={() => onSelect(champion)}
                  className="group relative rounded-lg overflow-hidden transition-all duration-150 hover:ring-2 hover:ring-zaun-glow hover:scale-110 hover:z-10"
                  title={champion.name}
                >
                  <img
                    src={imgUrl}
                    alt={champion.name}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1 py-0.5">
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
      </div>
    </div>
  );
}
