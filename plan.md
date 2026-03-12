Ready for review
Select text to add comments on the plan
LILA BLACK - Player Journey Visualization Tool
Context
APM assignment for LILA Games. Build a browser-based tool that lets Level Designers visually explore player behavior across 3 maps in LILA BLACK (extraction shooter). 5-day deadline (~10-15 hours), hosted with shareable URL, code on GitHub.

Evaluated on 6 areas: System design, Attention to detail, End-to-end execution, Product thinking, Code quality, Communication.

1. Product Thinking — Who is the User & What Do They Need?
The User: Level Designer
Not a data scientist. Not an analyst. A creative professional who designs the physical spaces players move through. They think in terms of:

Sightlines, cover, chokepoints — where do fights happen and why?
Player flow — are players exploring the full map or funneling into predictable routes?
Dead zones — areas nobody visits = wasted design effort
Loot placement effectiveness — are players going where loot is? Is loot drawing them into interesting routes?
Storm pacing — is the storm killing players too early or pushing them into the right areas?
Bot believability — do bots move/fight in similar patterns to humans, or are they obviously artificial?
Key Questions This Tool Should Answer
"Where are the fights happening?" → Kill heatmap overlay on minimap
"Where are players dying and why?" → Death markers (killed by player vs storm vs bot) with distinct visuals
"Where are players NOT going?" → Traffic heatmap reveals dead zones by absence
"Is the storm pushing players the right way?" → Storm death locations + path visualization
"Are bots behaving like real players?" → Toggle humans vs bots, compare heatmap patterns
"How does a match actually play out?" → Single-match playback with timeline scrubber
Design Principles
Opinionated defaults — open the tool, immediately see something useful (AmbroseValley, all dates, humans-only kill heatmap on)
Progressive disclosure — aggregate view first, drill into a match only when needed
Visual, not numerical — no tables, no raw numbers. Everything is spatial on the map.
Zero-onboarding UX — a Level Designer should open the URL and immediately understand what they're looking at. No tutorial needed.
Fast — static JSON, lazy loading per map, no spinners for common interactions
2. Data Findings
What we have
1,243 parquet files across 5 days (Feb 10-14), ~89K event rows
3 maps: AmbroseValley (primary/most played), GrandRift, Lockdown
8 event types: Position, BotPosition, Kill, Killed, BotKill, BotKilled, KilledByStorm, Loot
339 unique players, 796 unique matches
Position events are ~85% of data; combat/loot events are ~15%
Data Nuances (attention to detail matters)
Finding	Implication
Minimap images are NOT 1024x1024 (AmbroseValley=4320x4320, GrandRift=2160x2158, Lockdown=9000x9000)	Must resize; GrandRift isn't even square (2px off)
event column is bytes, not string	Must decode with .decode('utf-8')
Files have no .parquet extension	Pass path directly to reader
Timestamps are engine ticks, not wall-clock	Normalize to 0-1 per match for playback
Human-vs-human kills are very rare	Most combat is vs bots — this is the extraction shooter genre
y column is elevation, not 2D position	Use only x and z for minimap plotting
Bot user_ids are numeric strings, human user_ids are UUIDs	Regex or length check to classify
Map Coordinate Config
Map	Scale	Origin X	Origin Z
AmbroseValley	900	-370	-473
GrandRift	581	-290	-290
Lockdown	1000	-500	-500
Conversion formula (pre-computed in Python, not frontend):

u = (x - origin_x) / scale
v = (z - origin_z) / scale
pixel_x = u * 1024
pixel_y = (1 - v) * 1024   ← Y-flip (image origin is top-left)
3. System Design
Tech Stack Decisions
Layer	Choice	Why (for architecture doc)
Build tool	Vite	Fastest React bundler, native Vercel support
Frontend	React + TypeScript	Type safety for coordinate math, component reuse
Map rendering	Leaflet (react-leaflet) + CRS.Simple	Lightweight (~40KB), first-class image overlay support. deck.gl is overkill for ~16K points — it shines at 100K+.
Heatmaps	leaflet-heat plugin	~10KB, integrates natively with Leaflet. No need for a heavier solution at this data scale.
Styling	Tailwind CSS	Rapid iteration, dark theme support, consistent spacing
State	Zustand	Tiny (~1KB), no boilerplate. Redux would be over-engineering for a single-page tool.
Preprocessing	Python (pandas + pyarrow + Pillow)	One-time local script. Parquet ecosystem is mature in Python.
Hosting	Vercel (static)	Free tier, CDN, auto-deploy from GitHub. No backend needed — all data is pre-processed JSON.
Data Flow (for architecture doc)
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
  - Committed to repo under app/public/data/
    ↓
React app (lazy-loads JSON per selected map)
    ↓
Vercel CDN (gzip-compressed, ~1 MB transfer)
JSON Structure
File	Size Est.	Contents
matches.json	~50 KB	Match index: id, map, date, player/bot counts, event summary
{Map}_events.json	30-300 KB	Non-position events with pre-computed pixel coords
{Map}_positions.json	100-700 KB	Downsampled movement paths per match/player
{Map}_heatmap.json	~30 KB	Pre-binned 64x64 density grids: kill, death, traffic, kill-differential (kills minus deaths), per time-window (early/mid/late)
4. UI Design
Layout (dark theme)
+----------------------------------------------------------+
| [AmbroseValley] [GrandRift] [Lockdown]     LILA BLACK     |
+------------+---------------------------------------------+
| FILTERS    |                                             |
|            |          MINIMAP (Leaflet)                  |
| Date:      |          pan/zoom, event overlays           |
| [x] Feb 10 |                                             |
| ...Feb 14  |                                             |
|            |                                             |
| Match:     |                                             |
| [dropdown] |                                             |
|            |                                             |
| Events:    |                                             |
| [x] Kills  |                                             |
| [x] Deaths |                                             |
| [x] Loot   |                                             |
| [x] Storm  |                                             |
|            |                                             |
| Show:      |                                             |
| [x] Humans |                                             |
| [x] Bots   |                                             |
|            |                                             |
| Heatmap:   |                                             |
| ( ) Off    |                                             |
| ( ) Kills  |                                             |
| ( ) Deaths |                                             |
| ( ) Traffic|                                             |
| ( ) Kill Δ |  ← kills minus deaths (advantage zones)     |
|            |                                             |
| Time Window|                                             |
| [Early|Mid|Late]  ← filter heatmap by match phase       |
|            |                                             |
| [x] Storm  |  ← storm circle overlay (match view only)  |
|            |                                             |
| LEGEND     |                                             |
| ⚠ Bot-heavy zone warnings shown on map                  |
+------------+---------------------------------------------+
| [|<]  [▶]  [>>]   =====[====]=========  Match Progress   |
+----------------------------------------------------------+
Visual Encoding
Event	Color	Human	Bot
Kill / BotKill	Red #EF4444	● Circle	◆ Diamond
Killed / BotKilled	Grey #9CA3AF	● Circle	◆ Diamond
Loot	Yellow #EAB308	● Circle	—
KilledByStorm	Purple #A855F7	● Circle	—
Why shape + color, not just color: Distinguishing humans from bots by shape alone is more accessible and immediately readable when zoomed out. A Level Designer can glance and tell "that cluster is mostly bots" vs "that's real players fighting."

Two Modes
Aggregate view (default) — no match selected, all dates. Shows event markers + heatmap across all matches. Paths hidden (too many). Timeline disabled. This answers: "Where do fights/deaths/looting happen overall?"
Match view — single match selected. Shows that match's events + player paths + storm circle overlay. Timeline enabled. This answers: "How did this specific match unfold?"
4b. Feature Matrix (Impact vs Effort)
Tier 1: Must Build (High Impact)
#	Feature	Impact	Effort	Notes
1	Minimap Base Layer	High	Low	Table stakes
2	Coordinate Mapping	High	High	Everything breaks without this — validate first
3	Event Markers	High	Low	Core visibility layer
4	Human vs Bot Distinction	High	Low	Shape + color encoding
5	Filter Controls (map/date/match/event)	High	Med	Core LD workflow
6	Timeline / Playback	High	Med	Core requirement
7	Heatmap Overlay	High	Med	Single most useful LD feature
8	Hosted Shareable URL	High	Low	Non-negotiable deliverable
9	Storm Circle Overlay	High	Med	Extraction-shooter specific — show the storm boundary during match playback. Infer from KilledByStorm event positions + timestamps. High demo value.
10	Humans-Only Heatmap Default	High	Low	Default heatmap filters to humans only — bot noise dilutes signal. 2 lines of logic, massive data quality improvement.
14	Hover States on Markers	High	Low	Tooltip: event type, player id, match id. UX polish.
15	Player Path Trace	High	Med	LD gold — answers "how did they navigate?"
17	Zero-Onboarding UX	High	Low	Design principle, not a feature — opinionated defaults, clear legend
18	Kill Differential Heatmap	High	Low	New heatmap mode: kills minus deaths. Shows where players have advantage vs disadvantage. ~5 lines of logic on pre-binned data, massive signal upgrade for LDs.
19	Time-Windowed Heatmap	High	Med	Slider to view heatmap for early/mid/late match phases. Directly answers "does the map play differently as the storm closes?"
Tier 2: Build If Time (Medium Impact, Low-Med Effort)
#	Feature	Impact	Effort	Notes
11	Bot-Heavy Zone Warning	Med	Low	Visual indicator on zones where bot density >> human density. Shows PM thinking about data quality.
12	Out-of-Bounds Death Handling	Med	Low	Edge case: events with pixel coords outside 0-1024 range. Clamp or flag. Shows attention to detail.
16	Heatmap → Match Drill	Med	Med	Simplified: clicking a heatmap hotspot pre-filters the match dropdown to matches with events in that area. Just a filter link, not a full flow.
20	Playback Speed Control	Med	Low	1x / 2x / 4x buttons. Easy QoL.
21	Overlay Toggle	Med	Low	Toggle between heatmap modes without clearing the map — quick A/B comparison of kill zones vs death zones vs traffic. Replaces split-screen idea.
Noted, Not Built
#	Feature	Notes
13	Suspect Storm Death Flagging	Note in architecture doc as a "with more time" item. Logic: storm deaths far from the expected storm edge could indicate map exploits or bad storm config. Don't build — requires storm geometry data we'd have to infer.
5. Project Structure
LilaBlack/
├── player_data/              # Raw data (gitignored)
├── preprocessing/
│   ├── preprocess.py         # Parquet → JSON + image resize
│   ├── validate.py           # Matplotlib coord verification
│   └── requirements.txt
├── app/
│   ├── public/data/          # Preprocessed output (committed)
│   │   ├── maps/             # Resized 1024x1024 minimaps
│   │   ├── events/           # Per-map event JSON
│   │   ├── positions/        # Per-map position JSON
│   │   ├── heatmap/          # Pre-binned density grids
│   │   └── matches.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapViewer.tsx
│   │   │   ├── EventMarkers.tsx
│   │   │   ├── HeatmapLayer.tsx
│   │   │   ├── PathLayer.tsx
│   │   │   ├── StormOverlay.tsx       # Storm circle during match playback
│   │   │   ├── BotZoneWarning.tsx     # Bot-heavy zone indicators
│   │   │   ├── FilterPanel.tsx
│   │   │   ├── TimelineScrubber.tsx
│   │   │   ├── MapSelector.tsx
│   │   │   └── Legend.tsx
│   │   ├── hooks/
│   │   │   ├── useEventData.ts
│   │   │   └── usePlayback.ts
│   │   ├── lib/
│   │   │   ├── coordinates.ts
│   │   │   ├── types.ts
│   │   │   └── constants.ts
│   │   ├── store.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── ARCHITECTURE.md
├── vercel.json
└── .gitignore
6. Implementation Order (5 days, ~10-15 hrs)
Day 1: Data Pipeline + Coordinate Validation (~3 hrs)
 Write preprocess.py:
Read all parquets, decode events, classify human/bot
Convert world→pixel coords, clamp out-of-bounds to 0-1024 range (#12)
Resize minimaps to 1024x1024
Pre-bin heatmap grids: kills, deaths, traffic, kill-differential (#18), per time-window (early/mid/late) (#19)
Compute per-zone bot-density ratios for bot-heavy warnings (#11)
Output structured JSON split by map
 Run validate.py: matplotlib-plot 20+ events on each minimap, visually confirm coordinates
 Commit preprocessed data to app/public/data/
Day 2: Core Map + Markers + Filters (~3 hrs)
 Scaffold: Vite + React + TS + Tailwind + react-leaflet + zustand
 MapViewer with CRS.Simple + ImageOverlay (minimap as base layer)
 EventMarkers: render all events with correct colors/shapes, hover tooltips (#14)
 MapSelector: tab switcher for 3 maps
 FilterPanel: date checkboxes, match dropdown, event toggles, human/bot toggles
 Wire Zustand store for all filter state
 Verify markers appear in correct positions on all 3 maps
Day 3: Heatmaps + Smart Overlays (~3 hrs)
 HeatmapLayer: leaflet-heat with 5 modes — kills, deaths, traffic, kill-differential (#18), overlay toggle (#21)
 Time-windowed heatmap: early/mid/late phase selector (#19)
 Humans-only heatmap default (#10)
 Bot-heavy zone warnings on map (#11)
 Legend component (includes heatmap gradient key + bot warning explanation)
Day 4: Match Playback + Paths + Storm (~3 hrs)
 TimelineScrubber: range slider + play/pause + speed control (1x/2x/4x) (#6, #20)
 PathLayer: player movement polylines, visible in match view only (#15)
 StormOverlay: infer storm boundary from KilledByStorm positions + timestamps, render as shrinking circle/polygon during playback (#9)
 Animate events appearing as scrubber progresses
 Dark theme polish
Day 5: Deploy + Docs + Demo Prep (~2 hrs)
 Deploy to Vercel, verify shareable URL works
 Write ARCHITECTURE.md (1-page: stack choices, data flow, trade-offs, what I'd do differently)
Note suspect storm flagging (#13) as a "with more time" item
 Prepare 15-min demo narrative with 3-4 insights to show
 Final cross-browser test
Cut List (if behind schedule)
Drop in reverse priority order:

Drop first: Bot-heavy zone warnings (#11), overlay toggle (#21)
Drop second: Storm circle overlay (#9), time-windowed heatmap (#19)
Drop third: Player paths (#15), playback (#6)
Never drop: Map + markers + filters + basic heatmap. That alone covers 5 of 7 core requirements.
7. Trade-offs to Document (for architecture doc)
Decision	Alternative	Why this choice
Pre-compute coords in Python	Compute in frontend	Single source of truth, simpler frontend, easier to validate
Leaflet over deck.gl	deck.gl for richer heatmaps	Data scale is ~16K points, Leaflet handles this easily with less complexity
Static JSON over live API	Backend with DuckDB/Polars	No server to maintain, instant load, free Vercel hosting, data doesn't change
Split JSON by map	One big file	Lazy loading per map tab, smaller initial payload
Pre-binned heatmaps	Client-side binning	Faster render, less JS computation, smaller position file needed
Zustand over Redux	Redux for "enterprise" pattern	Single page tool, ~5 state slices — Zustand is perfectly sufficient
Resize images to 1024	Serve full-res with Leaflet tiles	1024 is sharp enough for this use case, avoids tile server complexity
What I'd Do Differently With More Time
WebGL rendering (deck.gl) for smoother heatmaps at higher resolution
Tile the minimap images for multi-zoom-level detail
Add player-specific filtering ("show me player X across all their matches")
Comparative view: side-by-side maps or overlay two date ranges
Export insights as shareable screenshots with annotations
Real-time data pipeline instead of one-time preprocessing
Suspect storm death flagging — storm deaths far from expected storm edge could indicate map exploits or bad storm config (requires storm geometry data we'd have to infer)
Heatmap-to-match drill: click a heatmap hotspot to auto-filter matches with events in that area
8. Demo Strategy (15-min call)
Narrative Arc
Open with context (1 min): "I built a tool for Level Designers to understand where players fight, die, loot, and avoid on each map."
Aggregate view (3 min): Open AmbroseValley. Show kill heatmap — point out fight clusters. Toggle to traffic — show dead zones. "A Level Designer would look at this and ask: why is nobody going to the northeast? Is there not enough loot? Is the terrain unappealing?"
Filter drill-down (3 min): Filter to a single day. Toggle bots off — show only human behavior. Toggle bots on — compare. "Bots fill the map evenly, humans cluster. This tells us bot pathing could be improved."
Match playback (3 min): Select a single match. Hit play. Watch the match unfold — players spread, storm deaths appear at edges, fights cluster at chokepoints. "This lets a designer watch HOW a match plays out, not just where things happened."
Architecture walkthrough (3 min): Data flow, tech choices, trade-offs. Show coordinate mapping was validated. Mention what I'd do differently.
Q&A (2 min)
3-4 Pre-prepared Insights to Show
Chokepoint discovery: Identify where kills cluster on AmbroseValley using kill heatmap
Dead zone: Show an area with zero traffic — wasted map space, potential design opportunity
Kill differential: Switch to Kill Δ heatmap — "red zones are where players dominate, blue zones are death traps. A Level Designer might add cover to blue zones or move loot away from death traps."
Bot vs human comparison: Toggle bots off → humans cluster at specific POIs. Toggle bots on → bots spread evenly. "This tells us bot pathing isn't mimicking real player behavior — they should be drawn to the same hotspots."
Storm pacing (match playback): Play a match, show storm circle closing. "Storm deaths happening here suggest the extraction points are too far from this spawn area."
9. Verification Checklist
Core Requirements (must pass)
 Coordinates map correctly on all 3 maps (validated with matplotlib before frontend)
 Event counts in JSON match raw parquet counts
 Human/bot classification matches UUID vs numeric pattern
 All 7 core requirements working: data parse, minimap display, human/bot distinction, event markers, filters, timeline, heatmap
 Hosted URL loads and works without assistance
 Architecture doc covers: stack, data flow, trade-offs, what I'd change
Enhanced Features (verify if built)
 Kill differential heatmap shows meaningful red/blue zones (not all one color)
 Time-windowed heatmap changes visibly between early/mid/late
 Storm circle overlay moves during match playback
 Bot-heavy zone warnings appear in areas where bot density >> human density
 Out-of-bounds events are clamped, not missing
 Heatmap defaults to humans-only
Demo Readiness
 Demo rehearsed with 3-4 concrete insights prepared
 Can explain every feature's "why" in terms of Level Designer needs
 Architecture doc is 1 page, covers all 4 required sections