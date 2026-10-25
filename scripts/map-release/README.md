# Official map releases

For the shared editor layer, local workflow and pending online migration, see
[Game history and one live editor layer](LIVE-MAP.md).

The community-page integration is **enabled** in `src/shared/officialMapConfig.json`.
The T751 shared history is stored privately; the active public release contains
only T0–645. Readers cannot upload histories. The separate editor detail layer
remains disabled and its migration is not installed.
Episode 35 ends at **turn 645**, as confirmed by the showrunner. Episode 34's
marker remains at T595. The display
controls default to and stop at the end of that turn (or the end of a shorter
source). `officialMapConfig.latestEpisode` holds this display setting. This does
not trim source data, enable publishing, or replace the server publication bound.
All viewers, including Coiot and localhost, stop at the published endpoint. Online endpoints and
markers are managed explicitly through the timeline toolbar; see
[Episode markers](EPISODE-MARKERS.md) for the pending service migration.
Do not choose a later endpoint from a save filename. Raw saves and extracted histories never belong
in this repository, static assets, public storage or frontend environment variables.

## Extract locally

```
npm run map:release -- extract "/path/latest.Civ5Save" "/path/reference.Civ5Replay" "/private/output/history.json"
npm run map:release -- prepare "/private/output/history.json" "/private/output/review.json" "/private/output/revision-1"
```

The reference replay supplies the civilization roster and a recognizable opening,
not its later timeline. Extraction verifies all turn-zero city founding records.
That proves roster alignment, **not that later branches are identical**.
The bounded chunk reader currently supports this Season 5 modded save framing.
It rejects unsupported framing rather than guessing offsets. It does not decode
current saved cities, units, religion followers or population.

Preparation adds a destruction event when a recorded city's centre explicitly
becomes unclaimed and remains unclaimed at the end of that turn. This covers
scripted removals missing a CITY_DESTROYED record. Same-turn reclaiming and
captures retain the city. Ruins persist when the land changes owner and clear
only on a new city founding. The original save extract remains unchanged.

`review.json` is a private review record:

```json
{
  "history": "generate-and-retain-a-UUID-for-this-game",
  "sourceSha256": "SHA256_FROM_EXTRACTION",
  "endTurn": null,
  "bookmarks": [],
  "branchVerified": false,
  "completions": {},
  "checkpoints": []
}
```

Set `endTurn` only to an approved episode endpoint; add bookmarks such as
`{"episode":"35","turn":123}` using the actual turn, not this example.
Classify each revealed completion name as `wonder`, `project`, or `other` using
the modset catalog. No future catalog entries are published. Founding messages
establish holy cities, never majority religion.

Verify the game branch against episode evidence and set `branchVerified`.
Add independently checked checkpoints:
`{"turn":123,"evidence":"Private evidence description","cityCounts":{"0":2,"1":3}}`.
`cityCounts` must cover every mapped owner, including zeros and the observer.
Owner IDs are the website Season 5 roster indices, not save player IDs.
The release boundary requires a checkpoint. Future checkpoints stay private.

Preparation writes `release.json` (a bounded package and its validation report)
and `validation.json`, with restrictive permissions. Existing outputs are never
overwritten. A failing report exits with status 2; its package is only for local
inspection and cannot be staged. The report checks every distinct end-of-turn
state, not only the last frame. It does not claim that an event log is a complete
map dump. Reconcile missing destruction events against independent evidence;
do not merely replace conflicting city owners to make the audit green.

## Install without publishing

Historical statistics can be recovered from the same S5/v94 save with
`npm run map:release -- extract-statistics <save.Civ5Save> <extracted-events.json> <private-statistics.json>`.
Keep that output outside the repository. Pass it as the optional fourth argument
to `prepare`, or as `--statistics <private-statistics.json>` to `publish.mjs`.
The source save hashes and civilization roster must match. The exporter keeps
43 distinct metrics from InfoAddict and native replay statistics. Missing
observations, including InfoAddict's missing T627, stay null; dead civilizations
do not inherit stale values. Turn labels describe observations recorded during
that turn, not a claim that all players were sampled at its exact end.

Publication clips every statistics series at the last approved episode endpoint.
The public `release` response omits the statistics arrays entirely; `statistics`
returns only the explicitly requested turn after checking both the chosen
release and the current public cap. Timeline changes discard stale responses.
Adding an episode endpoint later clips the private source again, including its
statistics. The full source and raw extracts remain in private storage.

For the verified Season 5 source, preparation also adds observed Golden Age
endings, eliminations, named research changes, and first recorded growth
milestones (each 10 cities or 100 total city population points). These are
labelled “Observed” and use consecutive observations only. Missing turns are
never bridged, and later records cannot change earlier events. Survival history
is kept in the private extraction only. A source-hash allowlist prevents these
rules from silently applying to another game; review the branch before adding
a new save. Policy counts, nuclear stockpile changes and guessed named technology
completions do not generate events. Public clipping and selected-turn filters
apply to these messages just as they do to recorded game events.

1. Apply `supabase/sql/map-official-timeline.sql` after the existing saved-view
   migration. It creates a disabled control row, private release bucket, service
   endpoints' tables and legacy-write guards. It does not freeze current editing.
2. Deploy `supabase/functions/map-release` with JWT verification disabled in the
   gateway (the handler verifies users itself). It requires the standard
   `SUPABASE_URL` and server-only `SUPABASE_SERVICE_ROLE_KEY`.
3. Run `supabase/tests/map-official-timeline.sql` in a test database and the site
   tests. Test the deployed `manifest` action: it should return `active:null`.
4. Open `/map-releases/`. Only Coiot's fixed account ID can access remote drafts
   or publishing. A development build on loopback also permits local file
   previews; this grants no remote permission. The existing `/map-replay/`
   remains a local-only investigation tool.
5. Enable `officialMapConfig.enabled` and deploy the frontend after the service
   is verified. With no active release, the current map remains the default.
   Service failures show an error, not a fallback to unchecked data.

The publisher previews the exact prepared package, stages it privately, enters
the maximum public turn and checks the explicit confirmation. Publication
atomically changes the active package and freezes legacy tile writes. Ordinary
users cannot access drafts, even with a guessed object key. The public reader
uses a private-bucket gateway with no-store responses and an active-limit check;
it does not hand out reusable signed URLs for drafts.

Published releases are immutable and identified by SHA-256 of their canonical
JSON. A previous published revision can be selected to roll back; already
downloaded information cannot be recalled. A different game history needs a
separate migration, not the publish button.

## Compatibility and follow-up work

- Existing snapshots and live data remain untouched until the new map launches.
  After a verified local backup, retire the legacy cloud data and its readers.
  New episode bookmarks are episode/turn pairs on the official timeline.
- Saved views retain version 1; their existing `snapshot` field can reference
  `timeline:<history-uuid>:<turn>`. The database validates the published bound.
  Empty source means the latest map. Public readers always use a published
  package, never saved-view payloads as authority.
- Editor details use one current live layer, separate from immutable history.
  Native Edit/Notes controls replace its values; there are no dated observations
  or snapshot imports. Server-checked editor permissions, optimistic revisions
  and release bounds protect writes. See LIVE-MAP.md for the pending migration.
- Population and majority religion remain unknown until recorded or supplied by editors.
  The population-density overlay colours civilizations with a complete set of
  city populations; others stay uncoloured, with coverage shown in the panel.
  The religion overlay uses recorded majority religions of current capitals.
  Missing values are never inferred from holy-city status.
- Private editable copies are deferred. Do not reuse official overrides for
  them. Match future save checkpoints to this exact game history before adding
  richer verified fields or replacing legacy snapshot links.
- `build-episode-snapshots.js` checks the publication control before generating
  new snapshots. After cutover it preserves existing files and skips live-edit
  generation; a failed publication-state check fails the build closed.

## Verification

On October 20, 2026, the supplied Downloads recovered-events JSON was uploaded
as the private T751 shared source, and Episode 34 was published through T595.
The baseline, episode-marker and recovered-history migrations and updated API
are installed. The separate editor detail migration is not installed; its API
routes and frontend loading are disabled. The frontend integration is enabled
in the working tree and requires the normal site deployment.

The supplied T751 save yielded 19,095 replay events. Its reconstruction is not
gap-free: the first end-of-turn city/territory ownership conflict occurs
at T540, and T751 reconstructs 910 cities versus an InfoAddict city-count sum of
900. That statistic also contains non-numeric entries, so it is a discrepancy
to investigate, not an authoritative replacement count. A chosen earlier
episode boundary still requires its own independent checkpoint and branch
verification. Episode 34’s intended endpoint is now confirmed as turn 595; its
branch, city-count checkpoints and ownership conflicts remain documented gaps.
The showrunner explicitly selected this recovered history as the shared source.
Private `event_gaps_accepted` metadata records that choice without changing the
events or suppressing the audit. Format validation and public turn bounds stay
enforced. Anonymous checks confirmed the T595 event maximum, denial of T596 and
the private source, and denial of direct private-storage access.

`npm run test:site` covers clipping, malformed releases, future metadata,
historical reconstruction, intermediate conflicts, authorization, draft access,
rollback bounds, protected facts, contribution precedence and legacy write guards.
Use `npx vuepress build src --dest /private/tmp/cbr-map-build` for a build that
does not regenerate episode assets.

## Selecting the shared recovered history

The credentialed showrunner CLI previews by default. Add `--apply` to upload
the normalized source privately and atomically publish the bounded episode copy:

```
node scripts/map-release/publish.mjs --file /private/history.json --episode 34 --end-turn 595 --accept-event-gaps
```

The command uses the existing private service credentials in `.env.supporters`.
It preserves the current game identity on later uploads. Private sources can
end after their latest confirmed episode marker. A public release must end at
a confirmed marker. Accepting recovered event gaps is a showrunner decision,
not a client flag that readers can use to access later turns.
