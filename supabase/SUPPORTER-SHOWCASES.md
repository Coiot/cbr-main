# Supporter showcases

The directory at `/supporters/` includes current public credit names, including donors without website accounts. A published showcase at `/supporters/profile/?id=<public UUID>` adds an introduction, favourite competitors, selected favourite scenes and public map views. `/supporters/profile/` is the signed-in owner's editor.

## Database deployment

Apply these migrations in order (existing installations already have the first three):

1. `sql/supporter-credits.sql` after `sql/supporter-access.sql` and `sql/account-sync.sql`.
2. `sql/map-saved-views.sql`.
3. `sql/supporter-showcases.sql`.

`supporter-showcases.sql` is applied to production project `ndgkvyldchkgyyoaeukt`. The rollback-only `tests/supporter-showcases.sql` suite passed both locally on PostgreSQL 17 and in production. Final verification found zero showcase test accounts/grants or published fixtures, with RLS enabled. Public API verification returned 34 named entries and one anonymous acknowledgement; direct owner-table and private credit RPC reads were rejected. The website UI still requires publication through the normal release process.

The private `supporter_credit_roster()` centralizes the existing SVG eligibility and credit privacy logic. `get_supporter_credits()` retains its signature and service-role-only access. Public directory data comes from `list_supporter_directory(search, civ, offset)`, with 24 rows per request, available civ filters and a grouped anonymous count. Private donations and email-like names never become named directory entries. Directory preferences affect the current directory only, not episode credits or direct showcase links.

`supporter_showcases` stores only introduction, two extra competitors, six ordered scene references, three map-view references and publication state. Owner RLS and a write trigger require current supporter access to create/customize/publish; expired owners may unpublish/delete. `get_supporter_showcase(id)` returns a safe public projection for published pages. Selected map views must belong to the owner and be public; privatized, deleted and admin-hidden views are excluded at read time. No image/map duplication is stored.

`lookup_supporter_showcases(user_ids)` resolves published profile links for existing comment/map bylines, batched and cached for one minute. It exposes only already-public showcase IDs for the requested account IDs. Missing profiles leave ordinary text names intact.

Account preferences supply username, primary favourite civ and custom flair. The editor uses the existing account menu to change those shared preferences, avoiding conflicting identity copies. The showcase itself starts as a private draft; only an explicit Publish action publishes it. Removing a star/heart later does not erase an already-curated scene. New selections require the owner's star/heart reaction at save time. Static album metadata resolves released scenes and supplies preview URLs and spoiler controls.

## Credits and verification

New SVG artwork includes a visible directory URL and an SVG anchor. Album narration panels add a normal directory link for supporters SVG scenes in vertical, horizontal and fullscreen modes. Existing artwork is not rewritten. The generator's configured output paths, CDN upload and cache behaviour remain unchanged.

Run `npm run test:site` and a VuePress production build. Run `tests/supporter-showcases.sql` as an administrator; it manages its own transaction and rolls back all fixtures. The existing credit suite should continue to pass when run in a rollback-only transaction. Browser previews use fictional in-memory accounts for publishing/follow tests and never send sign-in emails or create persistent production profiles.

Verification: 155 site tests and a 573-page production build passed. Safari covered editing, preview, publication, guest sign-in placement, following with an account, and an actual episode credits link. Firefox covered the 320px layout, light/dark themes, and access expiry on tab return. Chromium was unavailable in this environment. No production showcase or follow fixtures were retained.
