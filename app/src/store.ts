import { create } from 'zustand';
import type { FilterState, MapName, HeatmapMode, TimeWindow, Match, EventData, PositionsData, HeatmapData } from './lib/types';

interface Store extends FilterState {
  matches: Match[];
  events: EventData[];
  positions: PositionsData;
  heatmap: HeatmapData | null;
  setSelectedMap: (map: MapName) => void;
  toggleDate: (date: string) => void;
  setSelectedMatch: (matchId: string | null) => void;
  setShowKills: (show: boolean) => void;
  setShowDeaths: (show: boolean) => void;
  setShowLoot: (show: boolean) => void;
  setShowStorm: (show: boolean) => void;
  setShowHumans: (show: boolean) => void;
  setShowBots: (show: boolean) => void;
  setHeatmapMode: (mode: HeatmapMode) => void;
  setTimeWindow: (window: TimeWindow) => void;
  setPlaybackTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setMatches: (matches: Match[]) => void;
  setEvents: (events: EventData[]) => void;
  setPositions: (positions: PositionsData) => void;
  setHeatmap: (heatmap: HeatmapData | null) => void;
}

export const useStore = create<Store>((set) => ({
  selectedMap: 'AmbroseValley',
  selectedDates: ['February_10', 'February_11', 'February_12', 'February_13', 'February_14'],
  selectedMatch: null,
  showKills: true,
  showDeaths: true,
  showLoot: true,
  showStorm: true,
  showHumans: true,
  showBots: true,
  heatmapMode: 'off',
  timeWindow: 'all',
  playbackTime: 0,
  isPlaying: false,
  playbackSpeed: 1,
  matches: [],
  events: [],
  positions: {},
  heatmap: null,

  setSelectedMap: (map) => set({ selectedMap: map, selectedMatch: null }),
  toggleDate: (date) => set((state) => ({
    selectedDates: state.selectedDates.includes(date)
      ? state.selectedDates.filter(d => d !== date)
      : [...state.selectedDates, date]
  })),
  setSelectedMatch: (matchId) => set({ selectedMatch: matchId, playbackTime: 0, isPlaying: false }),
  setShowKills: (show) => set({ showKills: show }),
  setShowDeaths: (show) => set({ showDeaths: show }),
  setShowLoot: (show) => set({ showLoot: show }),
  setShowStorm: (show) => set({ showStorm: show }),
  setShowHumans: (show) => set({ showHumans: show }),
  setShowBots: (show) => set({ showBots: show }),
  setHeatmapMode: (mode) => set({ heatmapMode: mode }),
  setTimeWindow: (window) => set({ timeWindow: window }),
  setPlaybackTime: (time) => set({ playbackTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setMatches: (matches) => set({ matches }),
  setEvents: (events) => set({ events }),
  setPositions: (positions) => set({ positions }),
  setHeatmap: (heatmap) => set({ heatmap }),
}));
