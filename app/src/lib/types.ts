export interface EventData {
  match_id: string;
  user_id: string;
  event: string;
  px: number;
  py: number;
  is_human: boolean;
  date: string;
  t: number; // normalized 0-1 within match
}

export interface Match {
  id: string;
  map: string;
  date: string;
  human_count: number;
  bot_count: number;
  event_counts: Record<string, number>;
}

// Positions grouped: { [match_id]: { [user_id]: PlayerPath } }
export interface PlayerPath {
  is_human: boolean;
  points: [number, number, number][]; // [px, py, t]
}
export type PositionsData = Record<string, Record<string, PlayerPath>>;

// Heatmap pre-binned: [[cx, cy, intensity], ...]
export type HeatmapPoints = [number, number, number][];
export interface HeatmapEntitySplit {
  human: HeatmapPoints;
  bot: HeatmapPoints;
}
export interface TimeWindowedEntitySplit {
  all: HeatmapEntitySplit;
  early: HeatmapEntitySplit;
  mid: HeatmapEntitySplit;
  late: HeatmapEntitySplit;
}
export interface HeatmapData {
  kills: TimeWindowedEntitySplit;
  deaths: TimeWindowedEntitySplit;
  traffic: TimeWindowedEntitySplit;
  loot: HeatmapPoints;
  killDiff: HeatmapPoints;
  botHeavy: HeatmapPoints;
  hotspots: HeatmapPoints;
}

export type MapName = 'AmbroseValley' | 'GrandRift' | 'Lockdown';
export type EventType = 'Kill' | 'Killed' | 'BotKill' | 'BotKilled' | 'Loot' | 'KilledByStorm';
export type HeatmapMode = 'kills' | 'deaths' | 'traffic' | 'loot' | 'killDiff' | 'off';
export type TimeWindow = 'all' | 'early' | 'mid' | 'late';

export interface FilterState {
  selectedMap: MapName;
  selectedDates: string[];
  selectedMatch: string | null;
  showKills: boolean;
  showDeaths: boolean;
  showLoot: boolean;
  showStorm: boolean;
  showHumans: boolean;
  showBots: boolean;
  heatmapMode: HeatmapMode;
  timeWindow: TimeWindow;
  playbackTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
}
