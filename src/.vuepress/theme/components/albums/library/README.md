# Reading library

Signed-in readers have an account-owned status for each album: `not_started`,
`in_progress`, or `finished`. No reading-library status is stored in localStorage.
The existing anonymous resume and manual bookmark conveniences remain separate.

Apply `supabase/sql/album-reading-library.sql` before deploying the client. The
additive, rerunnable migration backfills existing progress as **in progress**;
it never infers completion. It retains owner-only row-level security. The trigger
updates status when reading resumes or a bookmark is added, while preserving
explicit completion. A reset clears automatic resume without clearing bookmarks.

`readingLibrary.js` owns the reactive account state, paginated reads and status
saves. It clears records on account changes, rejects stale account responses,
and protects newer saves from pending refreshes and late progress responses.
The archive refreshes on return and window focus. Failed saves keep the prior
status and expose a retryable error.

`LibraryEpisodeState.vue` adds status, resume/start links, and a status selector
beside each archive entry. `EpisodeReadingCompletion.vue` provides explicit
completion at the end of an episode; reaching the final scene alone does not
mark it finished. Progress saves are drained before an explicit status change.

`archiveState.mjs` stores only transient navigation context in memory. Search,
sort and reading filters live in URL query parameters (`q`, `sort`, `reading`),
with the selected edition. Following an episode and returning through the season
link restores these controls and the scroll position, including after following
adjacent episodes. Query-only archive navigation retains focus and scroll.

Run `npm run test:site` for status, filtering, navigation, save failure and
concurrent-response regression coverage. Also verify the archive signed out,
signed in, with Unread selected, and after opening and returning from an episode.
