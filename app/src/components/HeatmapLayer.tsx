import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { useStore } from '../store';
import type { HeatmapPoints, TimeWindow } from '../lib/types';

// Extend Leaflet types for leaflet.heat
declare module 'leaflet' {
  function heatLayer(
    latlngs: [number, number, number][],
    options?: Record<string, unknown>
  ): L.Layer;
}

function mergePoints(a: HeatmapPoints, b: HeatmapPoints): HeatmapPoints {
  return [...a, ...b];
}

export function HeatmapLayer() {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);
  const { heatmap, heatmapMode, showHumans, showBots, timeWindow } = useStore();

  useEffect(() => {
    // Always clean up previous layer first
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!heatmap || heatmapMode === 'off') return;

    let modeData: HeatmapPoints = [];

    if (heatmapMode === 'kills' || heatmapMode === 'deaths' || heatmapMode === 'traffic') {
      // Select time window, then entity filter
      const tw = heatmap[heatmapMode][timeWindow as TimeWindow] ?? heatmap[heatmapMode].all;
      if (showHumans && showBots) {
        modeData = mergePoints(tw.human, tw.bot);
      } else if (showHumans) {
        modeData = tw.human;
      } else if (showBots) {
        modeData = tw.bot;
      }
    } else if (heatmapMode === 'loot') {
      modeData = heatmap.loot;
    } else if (heatmapMode === 'killDiff') {
      modeData = heatmap.killDiff;
    }

    // For traffic/loot, filter out low-intensity noise
    if (heatmapMode === 'traffic' || heatmapMode === 'loot') {
      const sorted = modeData.map(p => p[2]).sort((a, b) => a - b);
      const cutoff = sorted[Math.floor(sorted.length * 0.15)] || 1;
      modeData = modeData.filter(p => p[2] >= cutoff);
    }

    if (modeData.length === 0) return;

    // Per-mode rendering settings
    const config = {
      kills:   { radius: 25, blur: 15 },
      deaths:  { radius: 25, blur: 15 },
      traffic: { radius: 18, blur: 12 },
      loot:    { radius: 20, blur: 12 },
      killDiff:{ radius: 25, blur: 15 },
    }[heatmapMode] ?? { radius: 25, blur: 15 };

    let points: [number, number, number][] = [];
    let gradient: Record<string, string> = {};
    let maxVal = 1;

    if (heatmapMode === 'killDiff') {
      const positive = modeData.filter(p => p[2] > 0);
      const negative = modeData.filter(p => p[2] < 0).map(p => [p[0], p[1], Math.abs(p[2])] as [number, number, number]);
      // Use 90th percentile for normalization so outliers don't flatten everything
      const absVals = modeData.map(p => Math.abs(p[2])).sort((a, b) => a - b);
      maxVal = absVals[Math.floor(absVals.length * 0.9)] || 1;
      // Clamp to [0, 1] range after normalization
      const normalize = (v: number) => Math.min(1, v / maxVal);
      points = positive.map(([cx, cy, v]) => [1024 - cy, cx, normalize(v)]);
      // Lower gradient thresholds so even value=1 is visible
      gradient = { '0': 'transparent', '0.05': '#fca5a5', '0.3': '#ef4444', '0.7': '#dc2626', '1': '#7f1d1d' };

      const layers: L.Layer[] = [];
      if (negative.length > 0) {
        const negPoints = negative.map(([cx, cy, v]) => [1024 - cy, cx, normalize(v)] as [number, number, number]);
        layers.push(L.heatLayer(negPoints, {
          ...config, maxZoom: 4, max: 1,
          gradient: { '0': 'transparent', '0.05': '#93c5fd', '0.3': '#3b82f6', '0.7': '#2563eb', '1': '#1e3a5f' },
        }));
      }
      if (points.length > 0) {
        layers.push(L.heatLayer(points, { ...config, maxZoom: 4, max: 1, gradient }));
      }
      if (layers.length > 0) {
        const group = L.layerGroup(layers).addTo(map);
        layerRef.current = group;
      }
    } else {
      maxVal = Math.max(...modeData.map(p => p[2]), 1);
      points = modeData.map(([cx, cy, v]) => [1024 - cy, cx, v / maxVal]);

      if (heatmapMode === 'kills') {
        gradient = { '0': 'transparent', '0.2': '#fde68a', '0.5': '#f59e0b', '0.8': '#ef4444', '1': '#7f1d1d' };
      } else if (heatmapMode === 'deaths') {
        gradient = { '0': 'transparent', '0.3': '#c4b5fd', '0.6': '#8b5cf6', '1': '#4c1d95' };
      } else if (heatmapMode === 'traffic') {
        gradient = { '0': 'transparent', '0.25': '#6ee7b7', '0.5': '#34d399', '0.8': '#059669', '1': '#064e3b' };
      } else if (heatmapMode === 'loot') {
        gradient = { '0': 'transparent', '0.2': '#fef08a', '0.5': '#facc15', '0.8': '#eab308', '1': '#854d0e' };
      }

      if (points.length > 0) {
        const layer = L.heatLayer(points, { ...config, maxZoom: 4, max: 1, gradient });
        layer.addTo(map);
        layerRef.current = layer;
      }
    }
  }, [heatmap, heatmapMode, showHumans, showBots, timeWindow, map]);

  return null;
}
