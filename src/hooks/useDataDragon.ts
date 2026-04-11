import { useState, useEffect } from 'react';
import type { DDChampion, ParsedItem } from '../types';
import { getLatestVersion, getChampions, getItems, getChampionImageUrl, parseAllItems } from '../api/datadragon';

interface DataDragonState {
  version: string | null;
  champions: DDChampion[];
  items: ParsedItem[];
  loading: boolean;
  error: string | null;
}

export function useDataDragon() {
  const [state, setState] = useState<DataDragonState>({
    version: null,
    champions: [],
    items: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const version = await getLatestVersion();
        if (cancelled) return;

        const [champData, itemData] = await Promise.all([
          getChampions(version),
          getItems(version),
        ]);
        if (cancelled) return;

        const champions = Object.values(champData.data).map(c => ({
          ...c,
          image: {
            ...c.image,
            full: getChampionImageUrl(version, c.image.full),
          },
        }));

        // Sort alphabetically
        champions.sort((a, b) => a.name.localeCompare(b.name));

        const items = parseAllItems(itemData, version);

        setState({
          version,
          champions,
          items,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load data',
        }));
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
