# Supporter showcases

The directory at `/supporters/` includes current public credit names, including donors without website accounts. A published showcase at `/supporters/profile/?id=<public UUID>` adds an introduction, favourite competitors, selected favourite scenes and public map views. `/supporters/profile/` is the signed-in owner's editor.

## Database deployment

Apply these migrations in order (existing installations already have the first three):

1. `sql/supporter-credits.sql` after `sql/supporter-access.sql` and `sql/account-sync.sql`.
2. `sql/map-saved-views.sql`.
3. `sql/supporter-showcases.sql`.
4. `sql/showcase-showrunners.sql`.
5. `sql/showcase-competitor-limit.sql`.
6. `sql/showcase-public-content.sql`.
7. `sql/showcase-showrunner-roster.sql`.

`supporter-showcases.sql` is applied to production project `ndgkvyldchkgyyoaeukt`. The rollback-only `tests/supporter-showcases.sql` suite passed both locally on PostgreSQL 17 and in production. Final verification found zero showcase test accounts/grants or published fixtures, with RLS enabled. Public API verification returned 34 named entries and one anonymous acknowledgement; direct owner-table and private credit RPC reads were rejected. The website UI still requires publication through the normal release process.

The private `supporter_credit_roster()` centralizes the existing SVG eligibility and credit privacy logic. `get_supporter_credits()` retains its signature and service-role-only access. Public directory data comes from `list_supporter_directory(search, civ, offset)`, with 24 rows per request, available civ filters and a grouped anonymous count. The website automatically reads all pages and displays the complete list. Private donations and email-like names never become named directory entries. Directory preferences affect the current directory only, not episode credits or direct showcase links.

`supporter_showcases` stores only introduction, nine extra competitors, six ordered scene references, up to 100 explicitly shared map pins, legacy map-view highlights and publication state. Owner RLS and a write trigger require current supporter access to create/customize/publish; expired owners may unpublish/delete. `get_supporter_showcase(id)` returns a safe public projection for published pages. Selected map views must belong to the owner and be public; privatized, deleted and admin-hidden views are excluded at read time. No image/map duplication is stored.

`lookup_supporter_showcases(user_ids)` resolves published profile links for existing comment/map bylines, batched and cached for one minute. It exposes only already-public showcase IDs for the requested account IDs. Missing profiles leave ordinary text names intact.

Account preferences supply username, primary favourite civ and custom flair. The editor uses the existing account menu to change those shared preferences, avoiding conflicting identity copies. The showcase itself starts as a private draft; only an explicit Publish action publishes it. Removing a star/heart later does not erase an already-curated scene. New selections require the owner's star/heart reaction at save time. Static album metadata resolves released scenes and supplies preview URLs and spoiler controls.

## Credits and verification

New SVG artwork includes a visible directory URL and an SVG anchor. Album narration panels add a normal directory link for supporters SVG scenes in vertical, horizontal and fullscreen modes. Existing artwork is not rewritten. The generator's configured output paths, CDN upload and cache behaviour remain unchanged.

Run `npm run test:site` and a VuePress production build. Run `tests/supporter-showcases.sql` as an administrator; it manages its own transaction and rolls back all fixtures. The existing credit suite should continue to pass when run in a rollback-only transaction. Browser previews use fictional in-memory accounts for publishing/follow tests and never send sign-in emails or create persistent production profiles.

Verification: 155 site tests and a 573-page production build passed. Safari covered editing, preview, publication, guest sign-in placement, following with an account, and an actual episode credits link. Firefox covered the 320px layout, light/dark themes, and access expiry on tab return. Chromium was unavailable in this environment. No production showcase or follow fixtures were retained.

## Showrunner showcases

`showcase-showrunners.sql` adds a private, administrator-managed allowlist keyed by verified account UUID, seeded for Coiot. It grants showcase editing/publication only; donation status and other supporter permissions are unchanged. `get_my_showcase_access()` checks the signed-in account on the server. Public names never grant access. Published, directory-visible showrunner showcases appear under “Behind the show”, separately from donor cards, via `list_showrunner_showcases()`. Unpublishing hides showcase content; hiding the directory entry hides the entire card.

`showcase-showrunner-roster.sql` adds LacsiraxAriscal's verified account and explicit display ordering: Coiot first, LacsiraxAriscal second. Cards stack vertically. Administrators may set a `directory_name` to show a minimal staff credit before a showcase is published; only this name and the showrunner label are exposed, without draft content, account IDs, or preferences. A published showcase automatically replaces the minimal credit with the complete preview. Unpublishing returns to the minimal credit; hiding the directory entry hides both forms. Role and donation permissions remain separate.

Applied and verified in production on 2026-10-19. `tests/showcase-showrunner-roster.sql` passed in a rollback-only transaction, checking explicit ordering, minimal-field privacy, publication, unpublishing and directory hiding. The actual account has showcase access, and the staff list returns Coiot followed by LacsiraxAriscal. The local directory rendered both cards in that order; LacsiraxAriscal has no showcase yet. All 184 site tests passed.

The editor displays the primary favourite competitor from account preferences explicitly, followed by removable additional choices and a single add control. Up to ten favourites can appear: the primary favourite plus nine additional competitors. Additional choices are compacted and deduplicated when loading/saving, excluding the primary favourite. The database constraint and client validation enforce the same nine-extra limit.

`showcase-showrunners.sql` was applied to production on 2026-10-19. Both the original showcase SQL suite and the new showrunner suite passed in rollback-only transactions, and the anonymous API returned Coiot’s published showcase with its showrunner label. Run `tests/showcase-showrunners.sql` after the migration for rollback-only authorization and privacy checks.

Showrunner directory cards use a plain bold name, a short introduction, competitor and public-content summaries, and up to four selected scene thumbnails. Preview reads use the small album catalog and only the selected albums’ scene payloads, with three requests at most in flight. Optional thumbnails or featured-collection lookup failures leave the public showcase link usable. The full scene index is not loaded by directory previews; only public curated scenes and published, featured collections are used.

`showcase-competitor-limit.sql` was applied on 2026-10-19. Both showcase SQL suites passed with rollback-only fixtures; the site suite passed 179 tests and the production build rendered 574 pages.

## Complete public contributions

`showcase-public-content.sql` was applied on 2026-10-19. A published showcase shows all owned public, non-hidden scene collections and saved map views, shared map pins, authored public map notes and episode comments. Published map snapshots are currently hidden from both showcases and directory preview summaries: these are administrative episode snapshots, distinct from supporter-created saved map views. Snapshot data remains available in the database/API for future use and the community map. Collection highlighting prioritizes up to three cards; it no longer determines whether a public collection appears. Private favourites remain private; the existing six curated scene highlights remain an explicit selection. Legacy selected-view references are preserved for compatibility, but no longer limit published showcases.

`get_showcase_public_content(showcase UUID)` exposes only a safe projection. A published showcase is public; a private showcase's signed-in owner may also use this projection for their preview. It returns no account IDs, payment data, raw edit logs, private views/collections, unpublished snapshots, or full snapshot payloads. Privacy changes and unpublishing take effect at query time. Collections/views are not restricted to the old featured slots or first result page.

Map notes are attributed from actual note-text changes in the audit history, rather than the last edit to some other field on the tile. Notes must still exist on a public map override or in a published snapshot. Removed notes with no remaining public source, or notes without attributable history, do not get assigned to a showcase. A private snapshot-note index avoids decompressing entire map payloads during reads. Snapshot insert/payload-update triggers maintain it, deletion cascades, and publication is independently checked on every read. Index tables and indexing functions are unavailable to ordinary and anonymous accounts.

Browser-local pins do not belong to a website account and are never uploaded automatically. The showcase editor offers unchecked pin choices; only chosen copies become public after saving/publishing. Names and coordinates are normalized and bounded, extra private fields are discarded by the client and rejected by the database, and owner RLS plus the showcase-access trigger govern writes. Publicly shared pins remain independently saved even if the browser's local pins are cleared.

Validation: `tests/showcase-public-content.sql` rolls back fixture accounts and content. It covers more than 20 views, unfeatured collections, other-account exclusion, private/hidden/unpublished content, private-draft previews, pin opt-in and validation, expired-owner writes/unpublishing, note authorship, archived notes, index privacy and index refresh. Existing supporter, showrunner and collection role suites also passed. The anonymous Coiot response includes the Hyksos collection, 23 published snapshots and five episode discussions; an observed indexed response took about 206 ms.

Final UI verification covered the actual Coiot public page and an isolated fictional account: all contribution sections rendered, local pins started unchecked, explicitly selected pins survived save/publication, and the shared pin linked to its map tile. No production account/content fixtures were retained. All 182 site tests and the 575-page production build passed.
