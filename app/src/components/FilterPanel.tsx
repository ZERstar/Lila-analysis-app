import { useStore } from '../store';
import { useMatchesForMap } from '../hooks/useEventData';
import type { MapName, HeatmapMode, TimeWindow } from '../lib/types';

const DATES = ['February_10', 'February_11', 'February_12', 'February_13', 'February_14'];
const MAP_LABELS: Record<MapName, string> = {
  AmbroseValley: 'Ambrose',
  GrandRift: 'Grand Rift',
  Lockdown: 'Lockdown',
};
const MAPS: MapName[] = ['AmbroseValley', 'GrandRift', 'Lockdown'];
const HEATMAP_MODES: { value: HeatmapMode; label: string; title: string }[] = [
  { value: 'off', label: 'Off', title: 'Disable heatmap overlay' },
  { value: 'kills', label: 'Kills', title: 'Kill density heatmap' },
  { value: 'deaths', label: 'Deaths', title: 'Death density heatmap' },
  { value: 'traffic', label: 'Traffic', title: 'Player movement density' },
  { value: 'loot', label: 'Loot', title: 'Loot interaction density — where players pick up items' },
  { value: 'killDiff', label: 'Net Kills', title: 'Kill differential: red = advantage zones, blue = death traps' },
];
const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'early', label: 'Early' },
  { value: 'mid', label: 'Mid' },
  { value: 'late', label: 'Late' },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
      {children}
    </h3>
  );
}

function EventCheckbox({
  checked, onChange, color, label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer" onClick={() => onChange(!checked)}>
      <span
        className="w-3 h-3 rounded-sm border border-gray-600 flex items-center justify-center shrink-0"
        style={{ backgroundColor: checked ? color : 'transparent' }}
      >
        {checked && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export function FilterPanel() {
  const {
    selectedMap, selectedDates, selectedMatch,
    showKills, showDeaths, showLoot, showStorm,
    showHumans, showBots,
    heatmapMode, timeWindow,
    setSelectedMap, toggleDate, setSelectedMatch,
    setShowKills, setShowDeaths, setShowLoot, setShowStorm,
    setShowHumans, setShowBots,
    setHeatmapMode, setTimeWindow,
  } = useStore();

  const matches = useMatchesForMap(selectedMap);

  return (
    <div className="w-64 bg-[#1a1a1a] border-r border-[#333] overflow-y-auto shrink-0 relative">
      {/* Scroll fade hint at bottom */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#1a1a1a] to-transparent z-10" />

      <div className="p-4 space-y-5">
        {/* Map Selector — #1: flex-wrap for overflow, #2: consistent padding, #10: CSS uppercase, #17: type=button */}
        <div>
          <SectionLabel>Map</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {MAPS.map((map) => (
              <button
                key={map}
                type="button"
                onClick={() => setSelectedMap(map)}
                aria-pressed={selectedMap === map}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  selectedMap === map
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
                }`}
              >
                {MAP_LABELS[map]}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter */}
        <div>
          <SectionLabel>Date</SectionLabel>
          <div className="space-y-1">
            {DATES.map((date) => (
              <label key={date} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDates.includes(date)}
                  onChange={() => toggleDate(date)}
                  aria-label={`Filter by ${date.replace('_', ' ')}`}
                  className="rounded bg-[#2a2a2a] border-[#444] accent-blue-600"
                />
                <span className="text-sm text-gray-300">{date.replace('February_', 'Feb ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Match Selector — #13: fix misleading count */}
        <div>
          <SectionLabel>Match</SectionLabel>
          <select
            value={selectedMatch || ''}
            onChange={(e) => setSelectedMatch(e.target.value || null)}
            aria-label="Select match"
            className="w-full bg-[#2a2a2a] border border-[#444] rounded px-2 py-1.5 text-sm text-gray-300"
          >
            <option value="">
              {matches.length > 0
                ? `All Matches (${matches.length})`
                : 'No matches for filters'}
            </option>
            {matches.slice(0, 100).map((m) => (
              <option key={m.id} value={m.id}>
                {m.id.slice(0, 8)}... ({m.human_count}h/{m.bot_count}b)
              </option>
            ))}
          </select>
        </div>

        {/* Event Toggles — #3: consistent plural, #4: "Storm Deaths", #7: custom color checkboxes */}
        <div>
          <SectionLabel>Events</SectionLabel>
          <div className="space-y-1.5">
            <EventCheckbox checked={showKills} onChange={setShowKills} color="#EF4444" label="Kills" />
            <EventCheckbox checked={showDeaths} onChange={setShowDeaths} color="#9CA3AF" label="Deaths" />
            <EventCheckbox checked={showLoot} onChange={setShowLoot} color="#EAB308" label="Loot" />
            <EventCheckbox checked={showStorm} onChange={setShowStorm} color="#A855F7" label="Storm Deaths" />
          </div>
        </div>

        {/* Human/Bot Toggle */}
        <div>
          <SectionLabel>Show</SectionLabel>
          <div className="space-y-1.5">
            <EventCheckbox checked={showHumans} onChange={setShowHumans} color="#60a5fa" label="Humans" />
            <EventCheckbox checked={showBots} onChange={setShowBots} color="#4ade80" label="Bots" />
          </div>
        </div>

        {/* Heatmap — #5: default off, #6: proper values, #20: descriptive labels */}
        <div>
          <SectionLabel>Heatmap</SectionLabel>
          <div className="space-y-1">
            {HEATMAP_MODES.map((mode) => (
              <label key={mode.value} className="flex items-center gap-2 cursor-pointer" title={mode.title}>
                <input
                  type="radio"
                  name="heatmap"
                  value={mode.value}
                  checked={heatmapMode === mode.value}
                  onChange={() => setHeatmapMode(mode.value)}
                  aria-label={mode.title}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-300">{mode.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Time Window — #2: consistent padding */}
        <div>
          <SectionLabel>Time Window</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {TIME_WINDOWS.map((tw) => (
              <button
                key={tw.value}
                type="button"
                onClick={() => setTimeWindow(tw.value)}
                aria-pressed={timeWindow === tw.value}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  timeWindow === tw.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
                }`}
              >
                {tw.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend — #3: consistent naming, #8/#12: clear grouping, #9: consistent text, #11: size explained */}
        <div className="pt-3 border-t border-[#333]">
          <SectionLabel>Legend</SectionLabel>

          {/* Event types */}
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Events</p>
          <div className="space-y-1.5 text-sm mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-gray-300">Kills</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
              <span className="text-gray-300">Deaths</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
              <span className="text-gray-300">Loot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <span className="text-gray-300">Storm Deaths</span>
            </div>
          </div>

          {/* Entity types */}
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Entities</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400 border border-white/40 shrink-0" />
              <span className="text-gray-300">Humans <span className="text-gray-500">(circle)</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-400 rotate-45 border border-white/40 shrink-0" />
              <span className="text-gray-300">Bots <span className="text-gray-500">(diamond)</span></span>
            </div>
          </div>

          {/* #11: Size explanation */}
          <p className="text-[10px] text-gray-500 mt-2">Larger markers = kill events</p>
        </div>
      </div>
    </div>
  );
}
