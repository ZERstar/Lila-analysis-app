import { useEffect, useRef } from 'react';
import { MapContainer, ImageOverlay, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../store';
import { useFilteredEvents } from '../hooks/useEventData';
import { HeatmapLayer } from './HeatmapLayer';
import { PathLayer } from './PathLayer';
import { EncounterLabels } from './EncounterLabels';

const EVENT_COLORS: Record<string, string> = {
  Kill: '#EF4444',
  BotKill: '#EF4444',
  Killed: '#9CA3AF',
  BotKilled: '#9CA3AF',
  Loot: '#EAB308',
  KilledByStorm: '#A855F7',
};

function createIcon(color: string, isBot: boolean, size: number) {
  if (isBot) {
    return L.divIcon({
      className: '',
      html: `<div style="width:${size}px;height:${size}px;background:${color};transform:rotate(45deg);border:1px solid rgba(255,255,255,0.4);opacity:0.85;"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:1px solid rgba(255,255,255,0.4);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function EventMarkers() {
  const map = useMap();
  const events = useFilteredEvents();
  const groupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!groupRef.current) {
      groupRef.current = L.layerGroup().addTo(map);
    }
    const group = groupRef.current;
    group.clearLayers();

    // Limit for performance
    const toRender = events.length > 5000 ? events.slice(0, 5000) : events;

    toRender.forEach(e => {
      const color = EVENT_COLORS[e.event] || '#9CA3AF';
      const size = e.event.includes('Kill') ? 10 : 8;
      const icon = createIcon(color, !e.is_human, size);
      // CRS.Simple: latLng = [1024 - py, px] (py=0 is top of image)
      const marker = L.marker([1024 - e.py, e.px], { icon });
      marker.bindTooltip(
        `<strong>${e.event}</strong><br/>${e.is_human ? 'Human' : 'Bot'}<br/><span style="opacity:0.7">${e.match_id.slice(0, 8)}...</span>`,
        { className: 'dark-tooltip' }
      );
      group.addLayer(marker);
    });

    return () => { group.clearLayers(); };
  }, [events, map]);

  return null;
}

function MapViewerInner({ minimapUrl }: { minimapUrl: string }) {
  const bounds: L.LatLngBoundsExpression = [[0, 0], [1024, 1024]];
  return (
    <>
      <ImageOverlay url={minimapUrl} bounds={bounds} />
      <EventMarkers />
      <HeatmapLayer />
      <EncounterLabels />
      <PathLayer />
    </>
  );
}

export function MapViewer() {
  const selectedMap = useStore(s => s.selectedMap);
  const minimapUrl = `/data/maps/${selectedMap}.png`;
  const bounds: L.LatLngBoundsExpression = [[0, 0], [1024, 1024]];

  return (
    <div className="flex-1 h-full">
      <MapContainer
        key={selectedMap}
        crs={L.CRS.Simple}
        bounds={bounds}
        center={[512, 512]}
        zoom={0}
        minZoom={-2}
        maxZoom={4}
        style={{ height: '100%', width: '100%', background: '#0f0f0f' }}
      >
        <MapViewerInner minimapUrl={minimapUrl} />
      </MapContainer>
    </div>
  );
}
