# Game history and one live editor layer

The game history controls geography, city locations, city names, foundings,
captures, destruction, and territory. Editors maintain one mutable detail layer
on top of that history through the community map's existing **Edit / Notes** tabs.
There are no snapshot imports, dated observations, or per-turn editor layers.
Changing a detail replaces its current value across the timeline.

The layer supports citadels and other improvements, visible ruins, notes, routes,
pillaging, units, population, religion, wonders, capital and city status, and
civilization ideology. City details only appear for a matching city lifetime and
owner; a manual ruin never covers a recorded city. A civilization has one current
capital selection and one ideology value. Recorded facts retain precedence.
These are current editor annotations, not a reconstruction of those details at
each historical turn. Turn-specific cities and borders still come from history.

## Local testing

1. Open `/map-replay/` and load the recovered history JSON.
2. Hover or click a tile for the standard tooltip. Use **Edit / Notes** to edit.
3. Seek to another turn. The same live layer remains applied where relevant.
4. **Save edits**, beside the file controls, saves the local layer as JSON. To
   restore it, load the matching history and then choose that edits file using
   the same file picker. Loading another history starts an empty layer.

The lab keeps edits in memory; save them before closing it. A downloaded frozen
map snapshot is a separate inspection artifact, not a backup of editor changes.
Old hybrid layers and legacy community exports cannot be loaded as live edits.
The Replay panel contains civilization/event summaries only. Technical file
checks remain in extraction and preparation, outside the public reading UI.

The private `/map-releases/` loopback preview also supports native editing in
memory. Nothing is sent to production from either local preview.

## Pending online migration

`supabase/sql/map-tile-details.sql` and the updated `map-release` function remain
local. The shared timeline is published through T595, with its full T751 source kept
private. The separate editor layer remains disabled. Automatic approval review
rejected deploying this layer as outside the shared-history upload request.
Obtain separate authorization before applying its migration and enabling it. The retired draft hybrid migration was not deployed.

`map_tile_details` holds one current value per tile/field, or per civilization
for ideology/capital. Every write rechecks editor permission and the published
turn bound, and uses optimistic revisions. Private recovery records allow
investigating an overwrite; they are not public map snapshots or timeline layers.

The server records the edit's source turn internally to enforce rollback safety.
An edit made beyond a rolled-back release cap is withheld entirely. Within the
approved public range, every selected turn uses the same live layer. The date
range fields from the former hybrid approach are rejected. Public reads expose
only validated records, public author names, and revisions.

The published viewer loads this layer separately from game history, refreshes it
while visible and paused, and reloads it after edits. Seeking does not fetch a
different layer. Episode bookmarks only select turns in the history. New release
packages contain game history only, never editor data or snapshot imports.

## Legacy data retirement after launch

The existing community map, cloud snapshots and overrides remain untouched while
the new map is being tested. After a verified public cutover:

1. Export all legacy map tables, snapshots and relevant storage objects to a
   private local archive. Include schema, identifiers, row counts and file hashes.
   `export-community` alone only combines the latest published snapshot and its
   overrides; it is not a full archival database backup.
2. Verify that the archive can be read/restored, and confirm saved-view links
   have a suitable destination or retirement notice.
3. Remove obsolete snapshot/live-data reads, static cache generation and legacy
   subscriptions from the public path. Keep the base geography and new history.
4. Only then perform the separately reviewed cloud cleanup. Keep the local
   archive for records; do not import it into the new live layer.

No cloud deletion or backup is performed by this change. The existing
`officialMapConfig.enabled` flag is true for the shared timeline;
`editorDetailsEnabled` stays false until the separate editor migration is authorized.
