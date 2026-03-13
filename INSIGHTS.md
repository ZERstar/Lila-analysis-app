# Insights

Three things I learned about LILA BLACK using this tool.

---

## 1. Almost All Human Deaths Happen in Late Game (99% on AmbroseValley)

### What caught my eye

When switching between time-windowed heatmaps (Early → Mid → Late), the death heatmap is nearly empty for the first two-thirds of the match, then lights up dramatically in the final third.

### The data

| Map | Early Deaths | Mid Deaths | Late Deaths | Late % |
|-----|-------------|-----------|-------------|--------|
| AmbroseValley | 2 | 2 | 295 | 99% |
| GrandRift | 1 | 2 | 22 | 88% |
| Lockdown | 3 | 3 | 76 | 93% |

Across all maps, 88-99% of human combat deaths happen after the 66% match timestamp. Early and mid-game are almost entirely death-free for human players.

### Why a Level Designer should care

This tells us **the storm or zone closure is the primary driver of fatal encounters, not organic map flow.** Players are surviving comfortably until the late-game forces them into tight spaces. This has direct implications:

- **Actionable:** Adjust storm pacing to create earlier pressure — tighter first circle or faster initial shrink. This would spread combat across the full match timeline instead of back-loading it.
- **Metrics affected:** Average time-to-first-engagement, mid-game encounter rate, match pacing score.
- **Actionable:** Add high-value loot in contested mid-map areas to incentivize earlier movement toward the center, creating organic mid-game fights before the storm forces them.
- **Metrics affected:** Mid-game loot interaction rate, voluntary engagement rate (fights not caused by storm).

---

## 2. Bots Don't Move Like Humans — They Spread Evenly, Humans Cluster at POIs

### What caught my eye

Toggling between "Humans only" and "Bots only" on the traffic heatmap reveals completely different movement patterns. Humans create hot corridors between specific points of interest. Bots paint a uniform spread across the map.

### The data

| Map | Human Traffic Coverage | Bot Traffic Coverage | Bot/Human Ratio |
|-----|----------------------|---------------------|-----------------|
| AmbroseValley | 38% of map | 32% of map | 0.84 |
| GrandRift | 24% of map | 17% of map | 0.70 |
| Lockdown | 25% of map | 22% of map | 0.88 |

AmbroseValley has 44 "bot-heavy zones" — cells where bot density exceeds human density by 3x or more. These zones cluster in the northwest quadrant (px 248-312, py 168-264), an area humans largely avoid.

The kill data reinforces this: humans record 1,666 kills on AmbroseValley vs bots' 133. In the late game, bot kill cells drop from 58 (early) to 21 (late), while human kill cells increase from 171 to 260. Bots are dying off before the interesting fights happen.

### Why a Level Designer should care

**Bot pathing doesn't simulate real player behavior**, which means the game feels less populated than it should. When a human player encounters a bot in an area where no real player would go, it breaks immersion.

- **Actionable:** Bias bot spawn points and patrol routes toward the same POIs humans gravitate to (the 5 identified hotspots). Weight bot pathfinding toward high-traffic corridors rather than random map coverage.
- **Metrics affected:** Bot encounter believability score, player-reported "feels empty" feedback rate, bot survival time (bots that move like humans will survive longer and create better late-game encounters).
- **Actionable:** Reduce bot density in the northwest dead zone of AmbroseValley — those 44 bot-heavy cells represent wasted AI budget. Redistribute those bots to high-traffic areas where they'll create meaningful encounters.
- **Metrics affected:** Bot engagement rate (% of bots that interact with humans before dying), AI compute efficiency.

---

## 3. AmbroseValley Has 5 Predictable Fight Zones — the Rest of the Map Is Underused

### What caught my eye

The kill heatmap on AmbroseValley shows 5 tight clusters with kill counts of 20-26, while 62% of the map has zero kill activity. The encounter hotspot labels make this immediately visible. The same POIs appear consistently across all dates and time windows.

### The data

| Hotspot | Location (px) | Kill Intensity | Map Region |
|---------|--------------|---------------|------------|
| #1 | (536, 776) | 26 | South-center |
| #2 | (312, 536) | 23 | West-center |
| #3 | (440, 488) | 21 | Center |
| #4 | (392, 504) | 21 | Center-west |
| #5 | (456, 216) | 20 | North-center |

The kill differential heatmap shows 426 "advantage zones" (more kills than deaths) versus only 59 "death traps" (more deaths than kills). This means fights are heavily one-sided — players who initiate combat at these hotspots almost always win. The spatial clustering suggests these locations offer strong positional advantages (high ground, good cover, or sightline control).

Meanwhile, 100% of loot cells overlap with human traffic cells — meaning players are finding and collecting loot everywhere they go. There are no "hidden" loot spots that players are missing, which suggests loot distribution might be too uniform.

### Why a Level Designer should care

**Predictable fight zones mean predictable gameplay loops.** If every match funnels into the same 5 locations, matches feel repetitive. The 7:1 ratio of advantage zones to death traps suggests the map has clear "power positions" that experienced players will learn and exploit.

- **Actionable:** Add cover, alternate routes, or elevation changes near the 59 death-trap zones to make them more survivable. Currently these positions are just losing positions — making them viable creates more diverse fight patterns.
- **Metrics affected:** Kill location entropy (higher = more diverse fight locations), death-trap zone survival rate, map coverage diversity score.
- **Actionable:** Redistribute some high-tier loot from the well-trafficked center toward the underused edges of the map (the 62% with zero kills). This creates a risk/reward tension — safe loot in the center vs better loot in the quiet edges.
- **Metrics affected:** Map area utilization (% of cells with player traffic), loot route diversity, average distance traveled per match (currently median 684px — incentivizing edge exploration would increase this).
- **Actionable:** Introduce asymmetric POI features near hotspots #3 and #4 (which are only 50px apart) — they're so close that they function as a single mega-zone. Breaking up this cluster would spread fights more evenly.
- **Metrics affected:** Hotspot concentration index, unique POI engagement count per match.
