# Personal scene collections

Supporters curate named collections independently of reactions and bookmarks. Any visitor can read published collections at `/collections/?id=<UUID>`; `/collections/?view=mine` is the owner library. The scene icon opens an anchored picker in vertical, horizontal, and fullscreen albums. Its muted state explains the supporter requirement on hover/focus or tap and offers in-place email sign-in. That uses the existing scene return mechanism.

## Installation

Apply `sql/scene-collections.sql` after `supporter-access.sql` and `supporter-showcases.sql`, then deploy the website. For an existing installation, also apply `sql/scene-collections-power-rankings.sql` to allow power-ranking scene references. The migration is repeatable and does not rewrite existing reactions, settings, showcases, or payment data. Run `tests/scene-collections.sql` as postgres: its fictional users, grants, and collections are rolled back.

## Behaviour and bounds

- Up to 20 collections per account; 100 distinct scenes per collection.
- Titles: 80 characters; descriptions: 600; optional scene notes: 400.
- Private by default; explicit publication. Public titles/descriptions may contain spoilers. Reader season/episode limits remove later scenes and their notes together.
- Scene ordering supports drag handles and keyboard/touch Move up/Move down buttons. Favourites can be selected in the editor or added in bulk from Spotlight.
- Up to three published collections can be featured on an already published supporter showcase. Making a collection private or hiding/removing it immediately removes it from public APIs and showcase listings.
- Supporter access is required for creation, additions, edits, publication, and featuring. Existing collections remain readable after expiry; owners can always make them private or delete them.
- Collections support episode albums and power-ranking albums, including rankings 0. PR previews and read-through identify the original power rankings; the episode spoiler limit applies to the corresponding PR number too. Spotlight discovery remains episode-only.
- Only scene references and notes are stored. Original images/narration come from existing release data and CDN assets. Episode payloads are fetched on demand during read-through and cached for that reader component.
- Unknown, removed, or unreleased scene references are omitted from previews/read-through, retained in the owner editor for cleanup.

## Data and security

`scene_collections` has owner-only SELECT RLS. Anonymous clients cannot read it. Authenticated clients have no direct INSERT, UPDATE, or DELETE privilege. `change_scene_collection` checks the authenticated owner and verified supporter status, serializes owner changes with a transaction advisory lock, and enforces limits. Whole-editor saves require a matching revision; atomic additions merge new scenes without overwriting current notes/order. Privacy and deletion operations affect only the owner's row and do not require active support.

`get_scene_collection` and `list_scene_collections` expose only published, non-hidden content and safe display names. They never return payment identities, email addresses, account settings, or private favourites. Lists paginate on the server, 24 at a time. Public profile integration uses the published showcase UUID, not an account's payment identity.

For moderation, an administrator can set `scene_collections.is_hidden=true`; owners cannot undo this field through the client API. The owner can still read/manage their row. Public APIs return no hidden content.

The browser shares a single account subscription and collection list across scene buttons; no polling or per-scene database requests. Membership is indexed once per list update. Sign-out clears the in-memory list; stale reads/writes cannot replace another account's state or a newer saved result.

## Validation

`npm run test:site` covers model normalization, spoiler notes, ordering, API error handling, shared loading, account switches, and stale reads/writes. The rollback SQL suite covers owner/guest/other-account/expired access, publication, moderation, profile visibility, revision conflicts, duplicate references, independent reactions, and limits.

## Deployment verification

Confirmed installed in the CBR Supabase project (`ndgkvyldchkgyyoaeukt`) on 2026-10-19. The production rollback role suite passed; follow-up checks confirmed no test accounts, grants, showcases, or collections remained and row-level security was enabled. Public API checks passed for browsing and unavailable IDs, with private-table reads and anonymous mutations rejected. Website publication is a separate deployment step.

## Hyksos example collection

`node scripts/collections/seed-hyksos.mjs` previews the one-time public collection, selecting exact `Hyksos` scene titles from released Season 5 PR albums, in PR number order. It includes rankings 0; PR33 has no exact match. On 2026-10-19, this produces 33 scenes from PR0–PR32.

After confirming the owner’s website account, run `node scripts/collections/seed-hyksos.mjs --owner-id UUID` for a database preflight and add `--apply` to publish. Credentials stay in `.env.supporters`, as with supporter maintenance tools. The command requires a confirmed account with current supporter access, checks the account collection limit and PR validator, and verifies public readability after insertion. An existing identical collection is reused; a conflicting collection is left unchanged. It never appends new releases automatically or rewrites reactions or account preferences.

The targeted PR validator migration was applied and verified in production on 2026-10-19. The local rollback SQL role suite and all 169 site tests passed; all 33 selected scenes resolve to their original images and narration in generated release data.

Published under the verified Coiot website account on 2026-10-19: `/collections/?id=25f034be-90d6-404f-958d-5c64c05b45c1`. Anonymous API and Safari checks confirmed the public directory entry, all 33 scene previews, and original narration in read-through. Re-running the seed returned the same collection without writing a duplicate. The database record is live; the PR frontend compatibility changes require normal website deployment.

## Collection reading layout

Collections open in vertical album-style reading unless the existing `albumsViewMode` preference selects horizontal. A connected Vertical / Horizontal / Overview group preserves the active entry and spoiler limits. Overview image/title links open inside the collection. Original album links appear in each reading entry. The header uses compact album navigation, a copy-link icon, and owner management access; library pages have connected Explore / My collections navigation.

Horizontal reading reuses `SceneCarousel`. Fullscreen reuses `CinematicFullscreen` through its optional `narration` slot and accessible `label`; the existing album fallback remains unchanged. `SceneJumpControl` accepts optional `label`, `itemLabel`, and `optionLabels` while retaining its album defaults. Collection entries use `#entry-N` for their original position in the saved collection, so filtering does not change link identities. Copy link includes the current entry. Layout and fullscreen narration preferences reuse existing browser preference keys; collection reading does not write source-album bookmarks or completion status.

Payload loading is reader-scoped: shared album requests are deduplicated, no more than three run concurrently, failures can retry, and teardown cancels outstanding work. Vertical entries load near the viewport; horizontal/fullscreen reading loads the active and adjacent entries. Metadata remains independent of payload loading. Hidden entries and curator notes are excluded together.

Reader verification on 2026-10-19: 172 site tests and the isolated 574-page production build passed. Safari and Firefox checks covered in-collection overview links, horizontal navigation, original narration, fullscreen layout/entry retention, keyboard focus restoration, spoiler cutoffs, deep-link reloads, connected library navigation, and light/dark responsive layouts (320px, 375px, and desktop). The original PR album fullscreen fallback was also checked. Chromium was not installed in the test environment.
