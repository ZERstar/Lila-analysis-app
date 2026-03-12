import { useStore } from '../store';
import { usePlayback } from '../hooks/usePlayback';

export function TimelineScrubber() {
  usePlayback();

  const {
    selectedMatch, playbackTime, isPlaying, playbackSpeed,
    setPlaybackTime, setIsPlaying, setPlaybackSpeed,
  } = useStore();

  // Only visible when a match is selected
  if (!selectedMatch) return null;

  return (
    <div className="h-12 bg-[#1a1a1a] border-t border-[#333] flex items-center px-4 gap-3">
      {/* Reset */}
      <button
        onClick={() => { setPlaybackTime(0); setIsPlaying(false); }}
        className="text-gray-400 hover:text-white text-sm px-2"
        title="Reset"
      >
        &#9198;
      </button>

      {/* Play/Pause */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="text-gray-400 hover:text-white text-lg px-2"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '\u23F8' : '\u25B6'}
      </button>

      {/* Speed */}
      {[1, 2, 4].map(speed => (
        <button
          key={speed}
          onClick={() => setPlaybackSpeed(speed)}
          className={`text-xs px-2 py-0.5 rounded ${
            playbackSpeed === speed
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {speed}x
        </button>
      ))}

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={playbackTime}
        onChange={e => setPlaybackTime(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-blue-500 cursor-pointer"
      />

      {/* Progress */}
      <span className="text-xs text-gray-500 w-12 text-right">
        {Math.round(playbackTime * 100)}%
      </span>
    </div>
  );
}
