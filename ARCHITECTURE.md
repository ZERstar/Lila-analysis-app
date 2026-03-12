# LILA BLACK - Player Journey Visualization Tool

## Architecture Overview

This browser-based tool lets Level Designers visually explore player behavior across 3 maps in LILA BLACK (extraction shooter).

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Build tool | Vite | Fastest React bundler, native Vercel support |
| Frontend | React + TypeScript | Type safety for coordinate math |
| Map rendering | Leaflet (react-leaflet) + CRS.Simple | Lightweight, first-class image overlay |
| Heatmaps | leaflet-heat | ~10KB, integrates natively with Leaflet |
| Styling | Tailwind CSS | Rapid iteration, dark theme support |
| State | Zustand | Tiny (~1KB), no boilerplate |
| Preprocessing | Python (pandas + pyarrow + Pillow) | One-time local script |
| Hosting | Vercel (static) | Free tier, CDN, auto-deploy |

## Data Flow

```
Raw parquet files (1,243 files, ~8 MB)
    ↓
preprocess.py (runs once locally)
  - Reads all parquet files
  - Decodes bytes, classifies human/bot
  - Converts world coords → pixel coords
  - Resizes minimap images to 1024x1024
  - Outputs structured JSON split by map
    ↓
Static JSON (~2.5 MB total) + resized PNGs (~1 MB)
    ↓
React app (lazy-loads JSON per selected map)
    ↓
Vercel CDN (gzip-compressed)
```

## Key Implementation Details

### Coordinate Mapping
- World coordinates (x, z) converted to 1024x1024 pixel coordinates
- Formula: `u = (x - origin_x) / scale`, `v = (z - origin_z) / scale`
- Y-flip: `pixel_y = (1 - v) * 1024` (image origin is top-left)
- Out-of-bounds values clamped to 0-1023 range

### Human vs Bot Classification
- Human user_ids are UUIDs (36 chars with hyphens)
- Bot user_ids are numeric strings
- Visual encoding: Circle = Human, Diamond = Bot

### Map Configuration
| Map | Scale | Origin X | Origin Z |
|-----|-------|----------|----------|
| AmbroseValley | 900 | -370 | -473 |
| GrandRift | 581 | -290 | -290 |
| Lockdown | 1000 | -500 | -500 |

## Trade-offs

| Decision | Alternative | Why |
|----------|-------------|-----|
| Pre-compute coords in Python | Compute in frontend | Single source of truth, simpler frontend |
| Leaflet over deck.gl | deck.gl for richer heatmaps | Data scale ~16K points - Leaflet handles easily |
| Static JSON over live API | Backend with DuckDB | No server to maintain, instant load |
| Split JSON by map | One big file | Lazy loading per map tab |
| Zustand over Redux | Redux | Single page tool, Zustand is sufficient |

## What I'd Do Differently With More Time

1. **WebGL rendering** (deck.gl) for smoother heatmaps at higher resolution
2. **Tile the minimap images** for multi-zoom-level detail
3. **Player-specific filtering** ("show me player X across all their matches")
4. **Comparative view**: side-by-side maps or overlay two date ranges
5. **Export insights** as shareable screenshots with annotations
6. **Real-time data pipeline** instead of one-time preprocessing
7. **Suspect storm death flagging** - storm deaths far from expected storm edge could indicate map exploits

## Running Locally

```bash
# Preprocess data
cd preprocessing && source ../venv/bin/activate && python preprocess.py

# Run dev server
cd app && npm install && npm run dev
```

## Project Structure

```
LilaBlack/
├── player_data/              # Raw data (gitignored)
├── preprocessing/
│   └── preprocess.py         # Parquet → JSON + image resize
├── app/
│   ├── public/data/          # Preprocessed output
│   │   ├── maps/             # Resized 1024x1024 minimaps
│   │   ├── events/           # Per-map event JSON
│   │   ├── positions/        # Per-map position JSON
│   │   └── matches.json
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Types, constants
│   │   └── store.ts          # Zustand state
│   └── vite.config.ts
└── ARCHITECTURE.md
```
