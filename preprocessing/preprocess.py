#!/usr/bin/env python3
"""
Preprocess parquet files to JSON for the LILA BLACK visualization tool.
Outputs: matches.json, {Map}_events.json, {Map}_positions.json, {Map}_heatmap.json
         Resized 1024x1024 minimap PNGs
"""
import os
import json
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
from PIL import Image
from collections import defaultdict

# Map configuration from README
MAP_CONFIG = {
    'AmbroseValley': {'scale': 900, 'origin_x': -370, 'origin_z': -473},
    'GrandRift':     {'scale': 581, 'origin_x': -290, 'origin_z': -290},
    'Lockdown':      {'scale': 1000, 'origin_x': -500, 'origin_z': -500},
}

POSITION_EVENTS = {'Position', 'BotPosition'}
COMBAT_EVENTS = {'Kill', 'Killed', 'BotKill', 'BotKilled', 'KilledByStorm', 'Loot'}

def is_human(user_id):
    """Human user_ids are UUIDs (36 chars with hyphens), bots are numeric."""
    if pd.isna(user_id):
        return False
    uid = str(user_id)
    return '-' in uid and len(uid) == 36

def world_to_pixel(x, z, map_name):
    """Convert world (x, z) to pixel coords on 1024x1024 minimap."""
    cfg = MAP_CONFIG.get(map_name)
    if not cfg:
        return None, None
    u = (x - cfg['origin_x']) / cfg['scale']
    v = (z - cfg['origin_z']) / cfg['scale']
    px = round(u * 1024)
    py = round((1 - v) * 1024)
    px = max(0, min(1023, px))
    py = max(0, min(1023, py))
    return px, py

def load_all_data(data_dir):
    """Load all parquet files into a single DataFrame with date column."""
    days = ['February_10', 'February_11', 'February_12', 'February_13', 'February_14']
    frames = []

    for day in days:
        day_dir = os.path.join(data_dir, day)
        if not os.path.exists(day_dir):
            print(f"  Skipping {day} (not found)")
            continue
        files = [f for f in os.listdir(day_dir) if f.endswith('.nakama-0')]
        print(f"  {day}: {len(files)} files")

        for filename in files:
            filepath = os.path.join(day_dir, filename)
            try:
                table = pq.read_table(filepath)
                df = table.to_pandas()
                df['date'] = day
                frames.append(df)
            except Exception as e:
                print(f"    Error reading {filename}: {e}")
                continue

    if not frames:
        raise RuntimeError("No data loaded!")

    print(f"  Concatenating {len(frames)} files...")
    combined = pd.concat(frames, ignore_index=True)

    # Decode event bytes
    combined['event'] = combined['event'].apply(
        lambda e: e.decode('utf-8') if isinstance(e, bytes) else str(e)
    )
    # Classify human/bot
    combined['is_human'] = combined['user_id'].apply(is_human)

    print(f"  Total rows: {len(combined)}")
    print(f"  Event distribution:\n{combined['event'].value_counts().to_string()}")
    return combined

def compute_pixel_coords(df):
    """Add px, py columns with pre-computed pixel coordinates."""
    px_list, py_list = [], []
    for _, row in df.iterrows():
        px, py = world_to_pixel(row['x'], row['z'], row['map_id'])
        px_list.append(px)
        py_list.append(py)
    df['px'] = px_list
    df['py'] = py_list
    df = df.dropna(subset=['px', 'py'])
    df['px'] = df['px'].astype(int)
    df['py'] = df['py'].astype(int)
    return df

def compute_normalized_time(df):
    """Normalize timestamps to 0.0-1.0 per match."""
    df['ts_ms'] = df['ts'].astype('int64')
    # Compute min/max per match via transform (preserves index & columns)
    match_min = df.groupby('match_id')['ts_ms'].transform('min')
    match_max = df.groupby('match_id')['ts_ms'].transform('max')
    duration = match_max - match_min
    df['t'] = 0.0
    mask = duration > 0
    df.loc[mask, 't'] = ((df.loc[mask, 'ts_ms'] - match_min[mask]) / duration[mask]).round(4)
    return df

def build_matches_index(df):
    """Build match metadata index with correct per-user counts."""
    matches = []
    for match_id, group in df.groupby('match_id'):
        map_id = group['map_id'].iloc[0]
        date = group['date'].iloc[0]
        unique_humans = group[group['is_human']]['user_id'].nunique()
        unique_bots = group[~group['is_human']]['user_id'].nunique()
        combat = group[~group['event'].isin(POSITION_EVENTS)]
        event_counts = combat['event'].value_counts().to_dict()
        matches.append({
            'id': match_id,
            'map': map_id,
            'date': date,
            'human_count': int(unique_humans),
            'bot_count': int(unique_bots),
            'event_counts': event_counts,
        })
    return matches

def build_events_json(df):
    """Build per-map event JSON (combat/loot events only, no position events)."""
    events_by_map = {}
    combat_df = df[df['event'].isin(COMBAT_EVENTS)].copy()

    for map_name, group in combat_df.groupby('map_id'):
        events = []
        for _, row in group.iterrows():
            events.append({
                'match_id': row['match_id'],
                'user_id': row['user_id'],
                'event': row['event'],
                'px': int(row['px']),
                'py': int(row['py']),
                'is_human': bool(row['is_human']),
                'date': row['date'],
                't': float(row['t']),
            })
        events_by_map[map_name] = events
        print(f"  {map_name}: {len(events)} combat/loot events")
    return events_by_map

def build_positions_json(df):
    """Build per-map position JSON, downsampled, grouped by match/user."""
    positions_by_map = {}
    pos_df = df[df['event'].isin(POSITION_EVENTS)].copy()
    pos_df = pos_df.sort_values(['match_id', 'user_id', 't'])

    for map_name, map_group in pos_df.groupby('map_id'):
        paths = {}
        for (match_id, user_id), player_group in map_group.groupby(['match_id', 'user_id']):
            # Downsample: keep every 3rd point
            sampled = player_group.iloc[::3]
            points = [[int(r['px']), int(r['py']), float(r['t'])] for _, r in sampled.iterrows()]
            if len(points) < 2:
                continue
            if match_id not in paths:
                paths[match_id] = {}
            paths[match_id][user_id] = {
                'is_human': bool(player_group['is_human'].iloc[0]),
                'points': points,
            }
        positions_by_map[map_name] = paths
        n_matches = len(paths)
        n_players = sum(len(v) for v in paths.values())
        print(f"  {map_name}: {n_matches} matches, {n_players} player paths")
    return positions_by_map

def build_heatmap_json(df):
    """Build pre-binned heatmap grids per map (64x64 bins).
    kills/deaths/traffic are split into {human, bot} × {all, early, mid, late}.
    loot, killDiff, botHeavy, and hotspots are flat."""
    GRID = 64
    CELL = 1024 // GRID  # 16px per cell
    TIME_WINDOWS = {
        'all':   (0.0, 1.0),
        'early': (0.0, 0.33),
        'mid':   (0.33, 0.66),
        'late':  (0.66, 1.0),
    }

    heatmaps_by_map = {}

    for map_name, map_group in df.groupby('map_id'):
        result = {}

        def bin_events(subset):
            grid = np.zeros((GRID, GRID), dtype=int)
            for _, row in subset.iterrows():
                gx = min(GRID - 1, max(0, int(row['px']) // CELL))
                gy = min(GRID - 1, max(0, int(row['py']) // CELL))
                grid[gy][gx] += 1
            points = []
            for gy in range(GRID):
                for gx in range(GRID):
                    if grid[gy][gx] > 0:
                        cx = gx * CELL + CELL // 2
                        cy = gy * CELL + CELL // 2
                        points.append([cx, cy, int(grid[gy][gx])])
            return points, grid

        def time_filter(subset, t_min, t_max):
            return subset[(subset['t'] >= t_min) & (subset['t'] < t_max)]

        def build_entity_split_by_time(human_events, bot_events):
            """Returns {all: {human, bot}, early: {human, bot}, ...}"""
            tw_result = {}
            for tw_name, (t_min, t_max) in TIME_WINDOWS.items():
                h_tw = human_events if tw_name == 'all' else time_filter(human_events, t_min, t_max)
                b_tw = bot_events if tw_name == 'all' else time_filter(bot_events, t_min, t_max)
                h_pts, h_grid = bin_events(h_tw)
                b_pts, b_grid = bin_events(b_tw)
                tw_result[tw_name] = {'human': h_pts, 'bot': b_pts}
            return tw_result

        # Kill zones — split by human/bot × time window
        human_kills = map_group[map_group['event'].isin({'Kill', 'BotKill'}) & map_group['is_human']]
        bot_kills = map_group[map_group['event'].isin({'Kill', 'BotKill'}) & ~map_group['is_human']]
        result['kills'] = build_entity_split_by_time(human_kills, bot_kills)

        # Death zones — split by human/bot × time window
        human_deaths = map_group[map_group['event'].isin({'Killed', 'BotKilled', 'KilledByStorm'}) & map_group['is_human']]
        bot_deaths = map_group[map_group['event'].isin({'Killed', 'BotKilled', 'KilledByStorm'}) & ~map_group['is_human']]
        result['deaths'] = build_entity_split_by_time(human_deaths, bot_deaths)

        # Traffic — split by human/bot × time window
        human_traffic = map_group[map_group['event'].isin(POSITION_EVENTS) & map_group['is_human']]
        bot_traffic = map_group[map_group['event'].isin(POSITION_EVENTS) & ~map_group['is_human']]
        result['traffic'] = build_entity_split_by_time(human_traffic, bot_traffic)

        # Loot interaction density
        loot_events = map_group[map_group['event'] == 'Loot']
        loot_pts, _ = bin_events(loot_events)
        result['loot'] = loot_pts

        # Kill differential (human kills - human deaths per cell, "all" window)
        _, kill_grid_h = bin_events(human_kills)
        _, death_grid_h = bin_events(human_deaths)
        diff_grid = kill_grid_h.astype(int) - death_grid_h.astype(int)
        kill_diff = []
        for gy in range(GRID):
            for gx in range(GRID):
                if diff_grid[gy][gx] != 0:
                    cx = gx * CELL + CELL // 2
                    cy = gy * CELL + CELL // 2
                    kill_diff.append([cx, cy, int(diff_grid[gy][gx])])
        result['killDiff'] = kill_diff

        # Bot-heavy zone warnings
        bot_grid = np.zeros((GRID, GRID), dtype=int)
        human_grid = np.zeros((GRID, GRID), dtype=int)
        for _, row in bot_traffic.iterrows():
            gx = min(GRID - 1, max(0, int(row['px']) // CELL))
            gy = min(GRID - 1, max(0, int(row['py']) // CELL))
            bot_grid[gy][gx] += 1
        for _, row in human_traffic.iterrows():
            gx = min(GRID - 1, max(0, int(row['px']) // CELL))
            gy = min(GRID - 1, max(0, int(row['py']) // CELL))
            human_grid[gy][gx] += 1
        bot_heavy = []
        for gy in range(GRID):
            for gx in range(GRID):
                b, h = bot_grid[gy][gx], human_grid[gy][gx]
                if b > 10 and (h == 0 or b / max(h, 1) > 3):
                    cx = gx * CELL + CELL // 2
                    cy = gy * CELL + CELL // 2
                    bot_heavy.append([cx, cy, int(b)])
        result['botHeavy'] = bot_heavy

        # Encounter hotspots — top 5 kill clusters
        _, kill_grid_b = bin_events(bot_kills)
        combined_kill_grid = kill_grid_h + kill_grid_b
        hotspots = []
        used = set()
        flat_indices = np.argsort(combined_kill_grid, axis=None)[::-1]
        for idx in flat_indices:
            gy, gx = divmod(int(idx), GRID)
            if combined_kill_grid[gy][gx] == 0:
                break
            if any(abs(gy - uy) <= 2 and abs(gx - ux) <= 2 for uy, ux in used):
                continue
            used.add((gy, gx))
            cx = gx * CELL + CELL // 2
            cy = gy * CELL + CELL // 2
            hotspots.append([cx, cy, int(combined_kill_grid[gy][gx])])
            if len(hotspots) >= 5:
                break
        result['hotspots'] = hotspots

        heatmaps_by_map[map_name] = result
        kills_all_h = len(result['kills']['all']['human'])
        kills_all_b = len(result['kills']['all']['bot'])
        print(f"  {map_name}: kills_h={kills_all_h}, kills_b={kills_all_b}, "
              f"loot={len(loot_pts)}, killDiff={len(kill_diff)}, "
              f"botHeavy={len(bot_heavy)}, hotspots={len(hotspots)}")

    return heatmaps_by_map

def resize_minimaps(minimap_dir, output_dir):
    """Resize minimap images to 1024x1024."""
    os.makedirs(output_dir, exist_ok=True)
    filenames = {
        'AmbroseValley_Minimap.png': 'AmbroseValley.png',
        'GrandRift_Minimap.png': 'GrandRift.png',
        'Lockdown_Minimap.jpg': 'Lockdown.png',
    }
    for src_name, dst_name in filenames.items():
        src = os.path.join(minimap_dir, src_name)
        if not os.path.exists(src):
            print(f"  WARNING: {src} not found")
            continue
        img = Image.open(src)
        print(f"  {src_name}: {img.size} -> 1024x1024")
        img_resized = img.resize((1024, 1024), Image.LANCZOS)
        img_resized.save(os.path.join(output_dir, dst_name), 'PNG')

def main():
    BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE, 'player_data')
    MINIMAP_DIR = os.path.join(DATA_DIR, 'minimaps')
    OUTPUT_DIR = os.path.join(BASE, 'app', 'public', 'data')

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Resize minimaps
    print("=== Resizing minimaps ===")
    resize_minimaps(MINIMAP_DIR, os.path.join(OUTPUT_DIR, 'maps'))

    # 2. Load all data
    print("\n=== Loading parquet files ===")
    df = load_all_data(DATA_DIR)

    # 3. Compute pixel coordinates
    print("\n=== Computing pixel coordinates ===")
    df = compute_pixel_coords(df)

    # 4. Normalize timestamps
    print("\n=== Normalizing timestamps ===")
    df = compute_normalized_time(df)

    # 5. Build and save matches index
    print("\n=== Building matches index ===")
    matches = build_matches_index(df)
    with open(os.path.join(OUTPUT_DIR, 'matches.json'), 'w') as f:
        json.dump(matches, f, separators=(',', ':'))
    print(f"  {len(matches)} matches -> matches.json")

    # 6. Build and save events per map
    print("\n=== Building events JSON ===")
    events_by_map = build_events_json(df)
    for map_name, events in events_by_map.items():
        path = os.path.join(OUTPUT_DIR, f'{map_name}_events.json')
        with open(path, 'w') as f:
            json.dump(events, f, separators=(',', ':'))
        size_kb = os.path.getsize(path) // 1024
        print(f"  -> {map_name}_events.json ({size_kb} KB)")

    # 7. Build and save positions per map
    print("\n=== Building positions JSON ===")
    positions_by_map = build_positions_json(df)
    for map_name, paths in positions_by_map.items():
        path = os.path.join(OUTPUT_DIR, f'{map_name}_positions.json')
        with open(path, 'w') as f:
            json.dump(paths, f, separators=(',', ':'))
        size_kb = os.path.getsize(path) // 1024
        print(f"  -> {map_name}_positions.json ({size_kb} KB)")

    # 8. Build and save heatmap data per map
    print("\n=== Building heatmap data ===")
    heatmaps = build_heatmap_json(df)
    for map_name, heatmap in heatmaps.items():
        path = os.path.join(OUTPUT_DIR, f'{map_name}_heatmap.json')
        with open(path, 'w') as f:
            json.dump(heatmap, f, separators=(',', ':'))
        size_kb = os.path.getsize(path) // 1024
        print(f"  -> {map_name}_heatmap.json ({size_kb} KB)")

    print("\n=== Done! ===")

if __name__ == '__main__':
    main()
