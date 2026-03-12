import { useEventData } from './hooks/useEventData';
import { MapViewer } from './components/MapViewer';
import { FilterPanel } from './components/FilterPanel';
import { TimelineScrubber } from './components/TimelineScrubber';

function App() {
  useEventData();

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f]">
      {/* Header */}
      <div className="h-12 bg-[#1a1a1a] border-b border-[#333] flex items-center px-4 shrink-0">
        <h1 className="text-lg font-bold text-white">LILA BLACK</h1>
        <span className="text-sm text-gray-500 ml-2">Player Journey Visualization</span>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Filter Panel */}
        <FilterPanel />

        {/* Map Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <MapViewer />
          </div>
          <TimelineScrubber />
        </div>
      </div>
    </div>
  );
}

export default App;
