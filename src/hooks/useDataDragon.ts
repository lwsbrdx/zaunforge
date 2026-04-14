import { useState, useEffect } from 'react';
import type { DDChampion, ParsedItem, RuneIconLookup } from '../types';
import {
  getLatestVersion,
  getChampions,
  getItems,
  getRunes,
  getChampionImageUrl,
  parseAllItems,
  buildRuneIconLookup,
} from '../api/datadragon';

interface DataDragonState {
  version: string | null;
  champions: DDChampion[];
  items: ParsedItem[];
  runeLookup: RuneIconLookup | null;
  loading: boolean;
  error: string | null;
}

export function useDataDragon() {
  const [state, setState] = useState<DataDragonState>({
    version: null,
    champions: [],
    items: [],
    runeLookup: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const version = await getLatestVersion();
        if (cancelled) return;

        const [champData, itemData, runesData] = await Promise.all([
          getChampions(version),
          getItems(version),
          getRunes(version),
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
        const runeLookup = buildRuneIconLookup(runesData);

        setState({
          version,
          champions,
          items,
          runeLookup,
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
