# Architecture

## What I Built With and Why

| Layer | Choice | Why |
|-------|--------|-----|
| Build | Vite | Fastest React bundler, native GitHub Pages support via workflow |
| UI | React 18 + TypeScript | Type safety matters for coordinate math and data shapes |
| Map | Leaflet + CRS.Simple | Lightweight (~40KB), first-class image overlay support. deck.gl would add ~200KB and WebGL complexity for no visible benefit at ~16K points. |
| Heatmaps | leaflet-heat | ~10KB plugin, integrates natively with Leaflet's layer system |
| State | Zustand | ~1KB, zero boilerplate. A single-page tool with ~10 filter slices doesn't need Redux. |
| Styling | Tailwind CSS | Dark theme, consistent spacing, rapid iteration without CSS files |
| Preprocessing | Python (pandas + pyarrow + Pillow) | Parquet ecosystem is mature in Python. One-time local script. |
| Hosting | GitHub Pages (static) | Free, CDN-backed, auto-deploys via GitHub Actions. No backend needed — all data is pre-processed JSON. |

## Data Flow: Parquet Files to Screen

```
Raw parquet files (1,243 files across 5 days, ~89K event rows)
        │
        ▼
  preprocess.py  (runs once locally)
  ├─ Reads all parquet files with pyarrow
  ├─ Decodes byte-encoded event column (.decode('utf-8'))
  ├─ Classifies human vs bot (UUID pattern = human, numeric = bot)
  ├─ Converts world coordinates → pixel coordinates per map
  ├─ Normalizes timestamps to [0, 1] per match for playback
  ├─ Pre-bins heatmap grids (64x64) by mode × time window × entity type
  ├─ Detects encounter hotspots via peak detection on kill grid
  ├─ Resizes minimap images to 1024x1024
  └─ Clamps out-of-bounds coordinates to [0, 1023]
        │
        ▼
  Static JSON + PNGs (~4.5 MB total, committed to repo)
  ├─ matches.json           — match index (id, map, date, player counts)
  ├─ {Map}_events.json      — combat/loot events with pixel coords + normalized time
  ├─ {Map}_positions.json   — downsampled movement paths per match/player
  ├─ {Map}_heatmap.json     — pre-binned density grids (kills, deaths, traffic,
  │                            loot, killDiff, botHeavy, hotspots)
  └─ maps/{Map}.png         — resized 1024x1024 minimaps
        │
        ▼
  React app (loads matches.json once, then lazy-loads per-map JSON on tab switch)
  ├─ Zustand store holds all filter state + loaded data
  ├─ useFilteredEvents() memo filters events by date/match/type/entity/time
  ├─ Leaflet renders: ImageOverlay (minimap) + Markers (events) +
  │  Polylines (paths) + HeatLayer (density) + DivIcons (hotspot labels)
  └─ usePlayback() drives RAF-based animation loop for match timeline
        │
        ▼
  GitHub Pages CDN (gzip-compressed, ~1.5 MB transfer)
```

## Coordinate Mapping

This was the trickiest part. The raw data uses Unreal Engine world coordinates (x, y, z) where y is elevation. The minimap images are not 1024x1024 — AmbroseValley is 4320x4320, GrandRift is 2160x2158 (not even square), Lockdown is 9000x9000.

Each map has its own scale and origin from the game's minimap configuration:

| Map | Scale | Origin X | Origin Z | Original Image Size |
|-----|-------|----------|----------|-------------------|
| AmbroseValley | 900 | -370 | -473 | 4320x4320 |
| GrandRift | 581 | -290 | -290 | 2160x2158 |
| Lockdown | 1000 | -500 | -500 | 9000x9000 |

**Conversion formula** (applied in Python, not frontend):

```
u = (x - origin_x) / scale       # normalized 0-1
v = (z - origin_z) / scale       # normalized 0-1
pixel_x = u * 1024               # scale to image
pixel_y = (1 - v) * 1024         # Y-flip: image origin is top-left
```

The Y-flip is necessary because image coordinates have (0,0) at top-left, but game world Z increases upward.

In Leaflet with CRS.Simple, coordinates are `[lat, lng]` where `[0,0]` is bottom-left. So the frontend applies one more transform: `lat = 1024 - pixel_y`, `lng = pixel_x`. This is consistent across all 4 rendering components (EventMarkers, PathLayer, HeatmapLayer, EncounterLabels).

I validated coordinates by plotting 20+ events on each minimap using matplotlib before building the frontend, confirming markers land on roads, buildings, and POIs rather than empty terrain.

## Ambiguous Data — Assumptions Made

| Ambiguity | What I Found | How I Handled It |
|-----------|-------------|------------------|
| `event` column type | Values are bytes, not strings | Decoded with `.decode('utf-8')` |
| `y` column purpose | Contains elevation data, not 2D position | Ignored `y`, used only `x` and `z` for minimap |
| Timestamp meaning | `ts` is `datetime64[ms]` but dates are 1970-01-21 — clearly engine ticks, not wall-clock | Normalized to [0, 1] per match for relative playback |
| Human vs bot identity | No explicit flag in data | UUID pattern (36 chars with hyphens) = human, numeric string = bot |
| Parquet file extensions | Files end in `.nakama-0`, not `.parquet` | Passed directly to pyarrow reader |
| GrandRift image dimensions | 2160x2158 — not square (2px difference) | Resized to 1024x1024; ~0.1% vertical stretch is imperceptible |
| Storm circle geometry | Only 39 KilledByStorm events total (~1 per match), no storm boundary data | Displayed storm death markers but could not infer storm circle shape |
| Match structure | 1 human per match with position data | This appears to be solo-queue extraction data; treated each match as one player's journey |

## Major Tradeoffs

| Decision | Alternative Considered | Why I Chose This |
|----------|----------------------|------------------|
| Pre-compute everything in Python | Compute in frontend | Single source of truth, no coordinate bugs in JS, frontend just renders. Trade: requires re-running script if logic changes. |
| Leaflet over deck.gl | deck.gl for GPU-accelerated rendering | At ~16K event points and 64x64 heatmap grids, Leaflet handles it fine. deck.gl adds ~200KB bundle + WebGL complexity for no visible performance gain at this scale. |
| Static JSON over backend API | Express/FastAPI serving DuckDB queries | No server to maintain, zero hosting cost, instant page loads from CDN. Trade: can't do ad-hoc queries, all aggregations must be pre-computed. |
| Pre-binned 64x64 heatmap grids | Client-side binning from raw events | Heatmap renders instantly on toggle — no JS computation delay. Trade: fixed resolution, can't zoom into finer detail. |
| Split JSON by map | Single large file | Each map loads ~300KB-2MB instead of loading all ~4.5MB upfront. Trade: brief load on first map switch. |
| Zustand over Redux/Context | Redux for "enterprise" patterns | 10 state slices, no middleware, no async actions in store. Zustand's 1KB footprint and zero-boilerplate API is the right tool here. |
| 90th percentile normalization for kill differential | Max-based normalization | Most kill-diff values are 1-2 but outliers reach 26. Max normalization makes typical values invisible (1/26 = 0.04). 90th percentile makes the full range visible. |
| Noise floor filter on traffic/loot heatmaps | Show all data points | Without filtering, 1545/4096 cells with radius-25 blur painted the entire map green. Stripping bottom 15% intensity + tighter radius (18px) reveals actual corridors. |
