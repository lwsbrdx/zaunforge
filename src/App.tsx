import { useState, useMemo, useEffect } from 'react';
import type { DDChampion, DDChampionDetail, BuildResult } from './types';
import { useDataDragon } from './hooks/useDataDragon';
import { getChampionDetail } from './api/datadragon';
import { optimizeBuild } from './engine/optimizer';
import { Header } from './components/Header';
import { ChampionGrid } from './components/ChampionGrid';
import { BuildDisplay } from './components/BuildDisplay';
import { LoadingScreen } from './components/LoadingScreen';

function App() {
  const { version, champions, items, loading, error } = useDataDragon();
  const [selectedChampion, setSelectedChampion] = useState<DDChampion | null>(null);
  const [championDetail, setChampionDetail] = useState<DDChampionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const build: BuildResult | null = useMemo(() => {
    if (!selectedChampion || items.length === 0) return null;
    return optimizeBuild(selectedChampion, items);
  }, [selectedChampion, items]);

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

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Champion selection */}
          <div className="lg:col-span-3">
            <h2 className="text-lg font-semibold text-zaun-text mb-4">
              Select a Champion
            </h2>
            <ChampionGrid
              champions={champions}
              selectedChampion={selectedChampion}
              version={version!}
              onSelect={setSelectedChampion}
            />
          </div>

          {/* Right: Build result */}
          <div className="lg:col-span-2">
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
                    Select a champion to generate<br />the optimal build
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
