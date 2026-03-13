# LILA BLACK — Player Journey Visualization

A browser-based spatial analytics tool for Level Designers to explore player behavior across 3 maps in LILA BLACK (extraction shooter). Built for the LILA Games APM assignment.

**Live:** https://zerstar.github.io/Lila-analysis-app/

---

## Features

- **Interactive minimap** — pan/zoom across AmbroseValley, GrandRift, and Lockdown with event markers
- **5 heatmap modes** — Kills, Deaths, Traffic, Loot, Net Kills (kill differential)
- **Time-windowed heatmaps** — Early / Mid / Late game phase filtering
- **Human vs Bot toggle** — compare player behavior against bot patterns
- **Match playback** — select a match, scrub through the timeline, watch player paths animate
- **Encounter hotspots** — auto-detected top 5 kill clusters labeled on map
- **Filter controls** — date, match, event type, entity type

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Map | Leaflet + CRS.Simple + leaflet-heat |
| State | Zustand |
| Styling | Tailwind CSS |
| Preprocessing | Python (pandas + pyarrow + Pillow) |
| Hosting | GitHub Pages (static) |

## Running Locally

### Prerequisites
- Node.js 18+
- Python 3.9+ (only if you need to re-run preprocessing)

### Quick Start (frontend only)

```bash
cd app
npm install
npm run dev
```

Opens at `http://localhost:5173`. All preprocessed data is already committed in `app/public/data/`.

### Re-running Preprocessing (optional)

Only needed if you want to regenerate the JSON from raw parquet files.

```bash
# Place raw data in player_data/ (February_10 through February_14 folders)
cd preprocessing
python3 -m venv .venv
source .venv/bin/activate
pip install pandas pyarrow numpy Pillow
python preprocess.py
```

This reads parquet files from `player_data/`, converts coordinates, bins heatmaps, resizes minimap images, and outputs JSON + PNGs to `app/public/data/`.

### Environment Variables

None required. All data is static and pre-committed.

## Project Structure

```
LilaBlack/
├── preprocessing/
│   └── preprocess.py          # Parquet → JSON + image resize (one-time)
├── app/
│   ├── public/data/           # Preprocessed output (committed)
│   │   ├── maps/              # 1024x1024 minimap PNGs
│   │   ├── {Map}_events.json  # Combat/loot events with pixel coords
│   │   ├── {Map}_positions.json # Player movement paths
│   │   ├── {Map}_heatmap.json # Pre-binned density grids
│   │   └── matches.json       # Match index
│   ├── src/
│   │   ├── components/        # MapViewer, FilterPanel, HeatmapLayer, etc.
│   │   ├── hooks/             # useEventData, usePlayback
│   │   ├── lib/types.ts       # TypeScript interfaces
│   │   └── store.ts           # Zustand state
│   └── vite.config.ts
├── ARCHITECTURE.md
├── INSIGHTS.md
└── .github/workflows/deploy.yml
```
