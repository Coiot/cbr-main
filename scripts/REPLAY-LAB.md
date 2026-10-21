# Local replay map lab

Open `/map-replay/` directly. The page is not linked in navigation, is excluded
from the sitemap, and has `noindex,nofollow`. It is unlisted, not authenticated.
The standalone layout deliberately does not mount the account-enabled navbar.

Choose or drop a `.Civ5Replay` file or recovered save-history JSON, play/scrub the timeline, inspect tiles, or
download the selected turn as JSON. Reopen that JSON on the same page for a
frozen snapshot. Files and map edits stay in memory; there is no map-data
upload, browser map database, map pin storage, or live-map import. Localhost
remembers only the supplied episode/turn marker settings on this device. The initial
geography is fetched from the existing same-origin static Season 5 base asset.
Other site pages and the browser's standard download destination are unchanged.

## Data and format

The bounded worker parser uses format research from Andrew Webb's MIT-licensed
[civ5replay](https://github.com/aiwebb/civ5replay). Its parser and game artwork are
not bundled. Our independent reader handles the variable BNW/mod options header
by validating a plausible timeline through the entire remaining file, including
record counts, map coordinates, and exact EOF. No fixed byte offset from the
test replay is used. The file limit is 50 MB; collection counts, strings, and
total event coordinate references are also bounded.

The viewer mounts the community grid with a preview data source. That mode skips
map database initialization and disables legacy writes and saved-view tools.
Off localhost, the page reads the account session only to identify Coiot and,
once enabled, the public manifest for confirmed episode endpoints.
The viewer opens at the latest available end-of-turn state, capped at Episode
34’s endpoint, **595**, by `officialMapConfig.latestEpisode`. Shorter sources stop
at their own last turn. Other readers obey that limit; Coiot and localhost can
inspect the full available range. An episode dropdown and marker ticks use the
endpoints supplied so far. Pointer dragging briefly holds at markers; keyboard,
numeric and episode-selection inputs stay exact. The local **+** form remembers
only marker settings on this device. For non-privileged viewers, a frozen snapshot
beyond the public endpoint is rejected. Source events are not
rewritten or renumbered. Turn N includes all events recorded on turn N, in their
original order, and excludes turn N+1. Reverse seeks reconstruct state afresh. The lab renders through `CommunityTileMapGrid.vue`, using the same SVG/canvas zoom renderers, capital stars, city banners, citadels, ruins, unit markers and Overlays/Contrast controls as the public community map. Banners omit population badges only where population is unknown. One shared live editor layer supplies missing details; see `map-release/LIVE-MAP.md`.
Playback pauses on visibility changes. Geographic coordinates use the same
source-row to display-row flip as the community map.

Version 1 supports the current Season 5 base map and roster. Replay player IDs
are mapped by normalized civilization name, including explicit Bjarmia →
Bjarmians and Hansa → Hanseatic League aliases. Unknown/duplicate matches fail
visibly instead of assigning another competitor's colors or ownership.

Founding, city transfers, recorded razings, and tile claims populate the map.
Names come from English founding messages; later renames may not be recorded.
Terrain/rivers/resources use the static base map. Replay terrain differences
are reported. Individual city population, units, improvements, routes, religions,
and wonders are not inferred. Overlay coverage is displayed explicitly, and the UI never uses
fake population defaults. Technical extraction/publication checks stay outside the reader UI.

Exports use `format: cbr-local-replay-snapshot`, `version: 1`, with map identity,
selected turn, civilization names/mapping, source fingerprint, owners, cities,
and availability warnings. The fingerprint is a content identity hint (FNV-1a),
not a security signature. Original paths, raw replay files, per-player datasets,
and account data are not exported. The schema is intentionally separate from
production map snapshots. Reopening validates bounds, ownership, duplicate city
IDs/locations, roster mapping and base-map fingerprint before accepting state.

## Recovered save histories

The lab also accepts `format: cbr-save-replay-extraction`, `version: 1` JSON.
It validates the source SHA-256 identifier, declared turn range and event count,
unique event order, civilization roster, event types, coordinate bounds, and
string/reference limits. It uses only this extraction’s events and never appends
or merges the earlier reference replay’s timeline. The Season 5 base geography
is used explicitly; current saved-map state and final city statistics are absent.
The original `.Civ5Save` itself is not a supported picker input yet.

The T751 extraction has 19,095 events, 62 civilizations and turns 0–751.
At T751 it reconstructs 910 city locations and 15,131 claimed tiles. Eight city
records conflict with tile ownership, and the extracted save header appears to
report 900 cities. The file remains available for local investigation; the UI currently displays
only through the end of turn 595. Snapshot export is blocked on turns with owner conflicts so
that the lab does not create a file its snapshot importer would reject. A clean
turn remains exportable. Reconciliation with the actual saved map is separate
from viewing the event history.

The local test input is `~/Downloads/cbr-s5-turn-751-recovered-events.json`.
No raw save, recovered events, or reference replay is bundled in the website.

## Verification

Run `npm run test:site` for synthetic parser/model fixtures. They cover standard
and extended headers, malformed input, neutral events, captures, mass transfers,
razing, reverse seeks, aliases and snapshot round trips, recovered T751 timelines, invalid extraction rejection, and conflicting snapshot export prevention. The user's full replay
is not committed or copied into public assets.

Run an isolated build without regenerating release assets:

```sh
npx vuepress build src --dest /private/tmp/cbr-replay-site
```

The supplied `Chieftain Nebuchadnezzar II_0166 AD-1060_1.Civ5Replay` has 16,920
tiles (180 × 94), 62 civilizations, 5,839 events and turns 0–166. Turn 166
reconstructs 544 cities and 8,472 owned tiles, matching city-count statistics for
all 62 civilizations. Fifteen terrain tiles differ from the original base map.
An independent Node parse took approximately 22 ms on the development machine;
that is parser time, not a browser rendering benchmark.

Firefox testing covered the actual replay, final-turn seeking, snapshot
download/reopen, and tile 143,15 (Michilimackinac, Anishinaabe). Network Monitor
on a fresh direct load showed only same-origin assets and no Supabase requests.
Playback advanced through the actual replay and paused when its tab was hidden.
The responsive layout was checked at 1440px and 375px. All 192 site tests and
the isolated 576-page production build passed. Downloaded snapshots
remain useful local test artifacts; no database migration is required.
