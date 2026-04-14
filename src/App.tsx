import { useState, useMemo, useEffect } from 'react';
import type { DDChampion, DDChampionDetail, BuildResult } from './types';
import { useDataDragon } from './hooks/useDataDragon';
import { getChampionDetail } from './api/datadragon';
import { optimizeBuild } from './engine/optimizer';
import { analyzeEnemyComp } from './engine/compAnalysis';
import { Header } from './components/Header';
import { ChampionPickerModal } from './components/ChampionPickerModal';
import { BuildDisplay } from './components/BuildDisplay';
import { LoadingScreen } from './components/LoadingScreen';

const EMPTY_ENEMIES: (DDChampion | null)[] = [null, null, null, null, null];

type PickerTarget =
  | { type: 'ally' }
  | { type: 'enemy'; index: number };

function App() {
  const { version, champions, items, loading, error } = useDataDragon();
  const [selectedChampion, setSelectedChampion] = useState<DDChampion | null>(null);
  const [enemyTeam, setEnemyTeam] = useState<(DDChampion | null)[]>(EMPTY_ENEMIES);
  const [championDetail, setChampionDetail] = useState<DDChampionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [picker, setPicker] = useState<PickerTarget | null>(null);

  // Fetch champion detail when selection changes
  useEffect(() => {
    if (!selectedChampion || !version) {
      setChampionDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    getChampionDetail(version, selectedChampion.id).then(detail => {
      if (!cancelled) {
        setChampionDetail(detail);
        setDetailLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setDetailLoading(false);
    });

    return () => { cancelled = true; };
  }, [selectedChampion, version]);

  const compAnalysis = useMemo(() => analyzeEnemyComp(enemyTeam), [enemyTeam]);

  const build: BuildResult | null = useMemo(() => {
    if (!selectedChampion || items.length === 0) return null;
    return optimizeBuild(selectedChampion, items, compAnalysis);
  }, [selectedChampion, items, compAnalysis]);

  // Exclude already-picked champions from picker (except in the slot being edited)
  const excludeIds = useMemo(() => {
    const ids = new Set<string>();
    if (picker?.type !== 'ally' && selectedChampion) ids.add(selectedChampion.id);
    enemyTeam.forEach((c, i) => {
      if (c && !(picker?.type === 'enemy' && picker.index === i)) {
        ids.add(c.id);
      }
    });
    return ids;
  }, [picker, selectedChampion, enemyTeam]);

  const handlePickerSelect = (champion: DDChampion) => {
    if (!picker) return;
    if (picker.type === 'ally') {
      setSelectedChampion(champion);
    } else {
      const next = [...enemyTeam];
      next[picker.index] = champion;
      setEnemyTeam(next);
    }
    setPicker(null);
  };

  const handleEnemyClear = (index: number) => {
    const next = [...enemyTeam];
    next[index] = null;
    setEnemyTeam(next);
  };

  const resetEnemies = () => setEnemyTeam(EMPTY_ENEMIES);

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-400 font-medium">Failed to load data</p>
          <p className="text-sm text-zaun-muted">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zaun-card border border-zaun-border rounded-lg text-sm hover:border-zaun-glow transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header version={version} />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Comp setup panel */}
        <div className="bg-zaun-surface border border-zaun-border rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-8">
            {/* Ally side */}
            <div className="flex-shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zaun-glow mb-2">
                Your Champion
              </h3>
              <ChampionSlot
                champion={selectedChampion}
                version={version!}
                side="ally"
                onClick={() => setPicker({ type: 'ally' })}
                onClear={selectedChampion ? () => setSelectedChampion(null) : undefined}
              />
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-zaun-border self-stretch" />

            {/* Enemy side */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">
                  Enemy Team
                </h3>
                {enemyTeam.some(c => c !== null) && (
                  <button
                    onClick={resetEnemies}
                    className="text-[10px] text-zaun-muted hover:text-red-400 transition-colors uppercase tracking-wide"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {enemyTeam.map((champion, i) => (
                  <ChampionSlot
                    key={i}
                    champion={champion}
                    version={version!}
                    side="enemy"
                    onClick={() => setPicker({ type: 'enemy', index: i })}
                    onClear={champion ? () => handleEnemyClear(i) : undefined}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-zaun-muted">
                {compAnalysis
                  ? `${compAnalysis.teamSize}/5 enemies picked — build adapts to their threats.`
                  : 'Pick enemy champions to get a counter-itemized build. Leave empty for a generic best build.'}
              </p>
            </div>
          </div>
        </div>

        {/* Build result */}
        {selectedChampion && build && version ? (
          <BuildDisplay
            champion={selectedChampion}
            build={build}
            version={version}
            championDetail={championDetail}
            detailLoading={detailLoading}
          />
        ) : (
          <div className="flex items-center justify-center h-64 bg-zaun-surface border border-zaun-border rounded-2xl">
            <div className="text-center space-y-2">
              <div className="text-4xl opacity-30">&#9876;</div>
              <p className="text-zaun-muted text-sm">
                Pick your champion to see the optimal build
              </p>
            </div>
          </div>
        )}
      </main>

      {picker && (
        <ChampionPickerModal
          champions={champions}
          version={version!}
          title={picker.type === 'ally' ? 'Pick your champion' : `Pick enemy #${picker.index + 1}`}
          excludeIds={excludeIds}
          onSelect={handlePickerSelect}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

interface ChampionSlotProps {
  champion: DDChampion | null;
  version: string;
  side: 'ally' | 'enemy';
  onClick: () => void;
  onClear?: () => void;
}

function ChampionSlot({ champion, version, side, onClick, onClear }: ChampionSlotProps) {
  const dashedBorder = side === 'ally' ? 'border-zaun-glow/40 hover:border-zaun-glow' : 'border-red-500/40 hover:border-red-400';
  const solidBorder = side === 'ally' ? 'border-zaun-glow hover:border-zaun-glow' : 'border-red-500 hover:border-red-400';
  const plusColor = side === 'ally' ? 'group-hover:text-zaun-glow' : 'group-hover:text-red-300';

  if (!champion) {
    return (
      <button
        onClick={onClick}
        className={`relative w-16 h-16 rounded-xl border-2 border-dashed ${dashedBorder} transition-all duration-150 flex items-center justify-center bg-zaun-card/50 hover:bg-zaun-card hover:scale-105 group`}
      >
        <span className={`text-2xl text-zaun-muted transition-colors ${plusColor}`}>+</span>
      </button>
    );
  }

  const imgUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.id}.png`;
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`w-16 h-16 rounded-xl overflow-hidden border-2 ${solidBorder} transition-all duration-150 hover:scale-105 block`}
        title={`${champion.name} — click to change`}
      >
        <img src={imgUrl} alt={champion.name} className="w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1 py-0.5">
          <span className="text-[9px] font-medium leading-none block truncate">
            {champion.name}
          </span>
        </div>
      </button>
      {onClear && (
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zaun-bg border border-zaun-border text-zaun-muted hover:text-red-400 hover:border-red-400 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default App;
