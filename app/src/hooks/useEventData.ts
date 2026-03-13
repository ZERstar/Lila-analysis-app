import { useEffect, useMemo } from 'react';
import { useStore } from '../store';
import type { EventData, Match, PositionsData, HeatmapData, MapName } from '../lib/types';

// Cache loaded data so map switches don't re-fetch
const dataCache: Record<string, {
  events: EventData[];
  positions: PositionsData;
  heatmap: HeatmapData;
}> = {};

let matchesLoaded = false;

export function useEventData() {
  const {
    selectedMap, setMatches, setEvents, setPositions, setHeatmap,
  } = useStore();

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        // Load matches index (once)
        if (!matchesLoaded) {
          const res = await fetch(`${import.meta.env.BASE_URL}data/matches.json`);
          const matches: Match[] = await res.json();
          if (!cancelled) setMatches(matches);
          matchesLoaded = true;
        }

        // Check cache
        if (dataCache[selectedMap]) {
          if (!cancelled) {
            setEvents(dataCache[selectedMap].events);
            setPositions(dataCache[selectedMap].positions);
            setHeatmap(dataCache[selectedMap].heatmap);
          }
          return;
        }

        // Load events, positions, and heatmap in parallel
        const [eventsRes, positionsRes, heatmapRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/${selectedMap}_events.json`),
          fetch(`${import.meta.env.BASE_URL}data/${selectedMap}_positions.json`),
          fetch(`${import.meta.env.BASE_URL}data/${selectedMap}_heatmap.json`),
        ]);

        const events: EventData[] = await eventsRes.json();
        const positions: PositionsData = await positionsRes.json();
        const heatmap: HeatmapData = await heatmapRes.json();

        dataCache[selectedMap] = { events, positions, heatmap };

        if (!cancelled) {
          setEvents(events);
          setPositions(positions);
          setHeatmap(heatmap);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [selectedMap]);
}

export function useFilteredEvents(): EventData[] {
  const {
    events, selectedDates, selectedMatch,
    showKills, showDeaths, showLoot, showStorm,
    showHumans, showBots, playbackTime,
  } = useStore();

  return useMemo(() => {
    return events.filter(e => {
      // Date filter
      if (!selectedDates.includes(e.date)) return false;
      // Match filter
      if (selectedMatch && e.match_id !== selectedMatch) return false;
      // Playback time filter (only when a match is selected)
      if (selectedMatch && e.t > playbackTime) return false;

      // Event type filter
      const isKill = e.event === 'Kill' || e.event === 'BotKill';
      const isDeath = e.event === 'Killed' || e.event === 'BotKilled';
      const isStorm = e.event === 'KilledByStorm';
      const isLoot = e.event === 'Loot';

      if (isKill && !showKills) return false;
      if (isDeath && !showDeaths) return false;
      if (isStorm && !showStorm) return false;
      if (isLoot && !showLoot) return false;

      // Human/Bot filter
      if (e.is_human && !showHumans) return false;
      if (!e.is_human && !showBots) return false;

      return true;
    });
  }, [events, selectedDates, selectedMatch, showKills, showDeaths, showLoot, showStorm, showHumans, showBots, playbackTime]);
}

export function useMatchesForMap(map: MapName): Match[] {
  const { matches, selectedDates } = useStore();
  return useMemo(() => {
    return matches.filter(m => m.map === map && selectedDates.includes(m.date));
  }, [matches, map, selectedDates]);
}
