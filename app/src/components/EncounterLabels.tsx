import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../store';

const HOTSPOT_LABELS = [
  'Hotspot #1',
  'Hotspot #2',
  'Hotspot #3',
  'Hotspot #4',
  'Hotspot #5',
];

export function EncounterLabels() {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);
  const { heatmap, heatmapMode } = useStore();

  useEffect(() => {
    if (!groupRef.current) {
      groupRef.current = L.layerGroup().addTo(map);
    }
    const group = groupRef.current;
    group.clearLayers();

    // Only show hotspot labels when a kill-related heatmap is active
    if (!heatmap || (heatmapMode !== 'kills' && heatmapMode !== 'killDiff')) return;

    const hotspots = heatmap.hotspots;
    if (!hotspots || hotspots.length === 0) return;

    hotspots.forEach(([cx, cy, intensity], i) => {
      const label = HOTSPOT_LABELS[i] || `Hotspot #${i + 1}`;
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background: rgba(0,0,0,0.75);
          border: 1px solid rgba(239,68,68,0.6);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 10px;
          color: #fca5a5;
          white-space: nowrap;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          pointer-events: none;
        ">${label} <span style="color:#ef4444">(${intensity})</span></div>`,
        iconSize: [0, 0],
        iconAnchor: [0, -8],
      });

      const marker = L.marker([1024 - cy, cx], { icon, interactive: false });
      group.addLayer(marker);
    });

    return () => { group.clearLayers(); };
  }, [heatmap, heatmapMode, map]);

  return null;
}
