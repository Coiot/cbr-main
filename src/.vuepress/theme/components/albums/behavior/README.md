# Album behavior

`Albums.vue` retains the template, styles, reactive state, scene loading,
watchers, and lifecycle hooks. It explicitly combines these method and computed
objects, whose functions run with the component instance as `this`:

- `albumReactions`: reaction counts, polling, and optimistic updates.
- `albumComments`: comment eligibility, preview, editing, and submission.
- `albumProgress`: local/cloud bookmarks and reading progress.
- `albumAccount`: auth sessions, profile, and user settings.
- `albumViewing`: view modes, fullscreen, scene navigation, and keyboard/scroll events.
- `albumSnapshot`: episode map identity, URLs, and lazy visibility tracking.
- `albumSettings`: shared constants, page grouping, and the scene-data cache.

Keep lifecycle setup/teardown in the component and method names unique. Episode
number normalization is shared with the snapshot builder through
`src/shared/episode.mjs`. Run `npm run test:site` for offline behavior regressions.

Reaction counts reuse the public `album_reaction_spotlight` aggregate view from
`supabase/sql/community-spotlight.sql` and the Community Spotlight aggregate
configuration. A missing view falls back to individual records for the component's
lifetime; temporary request errors preserve the last displayed counts. Visible
albums poll once per minute. Hidden tabs stop polling and refresh on return.
Routine polls reuse the reader's reaction selections; initial loading, auth
changes, navigation, visibility restoration, and saves refresh those selections.
