import { useState, useMemo, useEffect, useRef } from 'react';
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
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return champions.filter(c => {
      if (excludeIds.has(c.id)) return false;
      const matchesSearch = c.name.toLowerCase().includes(q);
      const matchesTag = !filterTag || c.tags.includes(filterTag);
      return matchesSearch && matchesTag;
    });
  }, [champions, search, filterTag, excludeIds]);

  // Reset highlight when the filtered list identity changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search, filterTag]);

  // Clamp highlight in case filtered shrinks (e.g., exclude list updates)
  const safeIndex = filtered.length === 0 ? 0 : Math.min(highlightedIndex, filtered.length - 1);

  // Keyboard navigation
  useEffect(() => {
    const getColumnCount = (): number => {
      if (!gridRef.current) return 1;
      const cols = window.getComputedStyle(gridRef.current).gridTemplateColumns;
      return Math.max(1, cols.split(' ').length);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (filtered.length === 0) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(filtered[safeIndex]);
        return;
      }

      let delta = 0;
      if (e.key === 'ArrowRight') delta = 1;
      else if (e.key === 'ArrowLeft') delta = -1;
      else if (e.key === 'ArrowDown') delta = getColumnCount();
      else if (e.key === 'ArrowUp') delta = -getColumnCount();
      else return;

      e.preventDefault();
      setHighlightedIndex(i => {
        const next = i + delta;
        if (next < 0) return 0;
        if (next >= filtered.length) return filtered.length - 1;
        return next;
      });
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [filtered, safeIndex, onClose, onSelect]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!gridRef.current) return;
    const el = gridRef.current.children[safeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex]);

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
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-zaun-muted">
              <Kbd>&uarr;</Kbd><Kbd>&darr;</Kbd><Kbd>&larr;</Kbd><Kbd>&rarr;</Kbd>
              <span>navigate</span>
              <Kbd>Enter</Kbd>
              <span>select</span>
              <Kbd>Esc</Kbd>
              <span>close</span>
            </span>
            <button
              onClick={onClose}
              className="text-zaun-muted hover:text-zaun-text text-lg leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zaun-card"
              aria-label="Close"
            >
              ×
            </button>
          </div>
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
                tabIndex={-1}
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
                tabIndex={-1}
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
          <div
            ref={gridRef}
            className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2"
          >
            {filtered.map((champion, i) => {
              const imgUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.id}.png`;
              const isHighlighted = i === safeIndex;
              return (
                <button
                  key={champion.id}
                  onClick={() => onSelect(champion)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  tabIndex={-1}
                  className={`group relative rounded-lg overflow-hidden transition-all duration-150 ${
                    isHighlighted
                      ? 'ring-2 ring-zaun-glow scale-110 z-10 shadow-lg shadow-zaun-glow/30'
                      : 'hover:ring-1 hover:ring-zaun-border'
                  }`}
                  title={champion.name}
                >
                  <img
                    src={imgUrl}
                    alt={champion.name}
                    className="block w-full aspect-square object-cover"
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

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-zaun-card border border-zaun-border text-[10px] font-mono text-zaun-text">
      {children}
    </kbd>
  );
}
