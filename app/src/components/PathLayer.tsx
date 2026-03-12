import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../store';

export function PathLayer() {
  const map = useMap();
  const groupRef = useRef<L.LayerGroup | null>(null);
  const { positions, selectedMatch, showHumans, showBots, playbackTime } = useStore();

  useEffect(() => {
    if (!groupRef.current) {
      groupRef.current = L.layerGroup().addTo(map);
    }
    const group = groupRef.current;
    group.clearLayers();

    // Only show paths when a single match is selected
    if (!selectedMatch) return;

    const matchPaths = positions[selectedMatch];
    if (!matchPaths) return;

    Object.entries(matchPaths).forEach(([userId, path]) => {
      // Human/bot filter
      if (path.is_human && !showHumans) return;
      if (!path.is_human && !showBots) return;

      // Filter points up to current playback time
      const visiblePoints = path.points.filter(([, , t]) => t <= playbackTime);
      if (visiblePoints.length < 2) return;

      // Convert to Leaflet coords
      const latLngs = visiblePoints.map(([px, py]) => [1024 - py, px] as [number, number]);

      const color = path.is_human ? '#60a5fa' : '#4ade80';
      const polyline = L.polyline(latLngs, {
        color,
        weight: 2,
        opacity: 0.6,
        dashArray: path.is_human ? undefined : '4 4',
      });
      group.addLayer(polyline);

      // Current position marker (last visible point)
      const lastPoint = visiblePoints[visiblePoints.length - 1];
      const currentPos = L.circleMarker([1024 - lastPoint[1], lastPoint[0]], {
        radius: 5,
        color,
        fillColor: color,
        fillOpacity: 1,
        weight: 2,
      });
      currentPos.bindTooltip(
        `${path.is_human ? 'Human' : 'Bot'}: ${userId.slice(0, 8)}...`,
        { className: 'dark-tooltip' }
      );
      group.addLayer(currentPos);
    });

    return () => { group.clearLayers(); };
  }, [positions, selectedMatch, showHumans, showBots, playbackTime, map]);

  return null;
}
