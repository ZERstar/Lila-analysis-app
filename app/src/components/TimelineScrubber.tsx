import { useStore } from '../store';
import { usePlayback } from '../hooks/usePlayback';

const PHASE_LABELS = [
  { at: 0, label: 'Drop' },
  { at: 0.33, label: 'Early Game' },
  { at: 0.66, label: 'Late Game' },
  { at: 1, label: 'End' },
];

function getPhaseLabel(t: number): string {
  if (t < 0.33) return 'Early Game';
  if (t < 0.66) return 'Mid Game';
  return 'Late Game';
}

export function TimelineScrubber() {
  usePlayback();

  const {
    selectedMatch, playbackTime, isPlaying, playbackSpeed,
    setPlaybackTime, setIsPlaying, setPlaybackSpeed,
  } = useStore();

  if (!selectedMatch) return null;

  return (
    <div className="bg-[#1a1a1a] border-t border-[#333] px-4 py-2 shrink-0">
      {/* Top row: match info + phase */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          Match Playback
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            {getPhaseLabel(playbackTime)}
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            {selectedMatch.slice(0, 8)}...
          </span>
        </div>
      </div>

      {/* Scrubber track with phase markers */}
      <div className="relative mb-1.5">
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={playbackTime}
          onChange={e => setPlaybackTime(parseFloat(e.target.value))}
          className="w-full h-2 accent-blue-500 cursor-pointer"
          aria-label="Match timeline"
        />
        {/* Phase tick marks */}
        <div className="absolute top-full left-0 right-0 flex justify-between pointer-events-none mt-0.5">
          {PHASE_LABELS.map(p => (
            <span key={p.at} className="text-[9px] text-gray-600" style={{ marginLeft: p.at === 0 ? 0 : undefined, marginRight: p.at === 1 ? 0 : undefined }}>
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom row: controls + progress */}
      <div className="flex items-center gap-2 mt-4">
        <button
          type="button"
          onClick={() => { setPlaybackTime(0); setIsPlaying(false); }}
          className="text-gray-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-[#2a2a2a]"
          title="Reset to start"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={() => {
            if (!isPlaying && playbackTime >= 1) setPlaybackTime(0);
            setIsPlaying(!isPlaying);
          }}
          className={`text-xs px-3 py-0.5 rounded font-medium ${
            isPlaying
              ? 'bg-red-600/80 text-white hover:bg-red-600'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <div className="flex items-center gap-0.5 ml-1">
          <span className="text-[10px] text-gray-500 mr-1">Speed</span>
          {[1, 2, 4].map(speed => (
            <button
              key={speed}
              type="button"
              onClick={() => setPlaybackSpeed(speed)}
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                playbackSpeed === speed
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <span className="text-xs text-gray-400 font-mono">
          {Math.round(playbackTime * 100)}%
        </span>
      </div>
    </div>
  );
}
