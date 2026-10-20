# Community map views

Apply `sql/map-saved-views.sql` to the site's Supabase project **before deploying the website changes**. It is additive and can be run again. It requires the existing map tables, profiles with usernames, and `sql/supporter-access.sql`.

Production status: applied to project `ndgkvyldchkgyyoaeukt`. Public RPC checks and the transaction-scoped permission suite passed against production. Cleanup checks confirmed zero test accounts, grants, views, or follows remained. The website preview successfully loads the production-backed gallery; publishing the website interface is a separate deployment.

The migration adds `map_saved_views`, `map_view_follows`, and these RPCs:

- `list_map_saved_views(p_map_id, p_section, p_search, p_offset)` returns up to 20 visible cards. Sections are `explore`, `following`, and `mine`; search matches titles and public creator usernames.
- `get_map_saved_view(p_id)` returns a visible card or no rows. Owners can read their private or moderated cards. Other readers cannot distinguish missing, private, and moderated views.
- `hide_map_saved_view(p_id)` lets an existing map administrator hide a public view. To restore it after review, an administrator can set `is_hidden=false` in the dashboard; creators cannot clear moderation.

Public cards contain usernames, never profile emails or payment information. Creating and editing require the payment ledger's current `has_supporter_access()` permission, including for snapshot views. Expired owners retain read access and can privatize or delete their own views. Following requires only an account, and follow identities are owner-only.

Settings are a small versioned JSON object with map center, zoom, overlay/owner, contrast, selected tile, snapshot, and comparison. No map payloads or screenshots are stored. Live views resolve the current live map each time; snapshot views use the existing published snapshot data. Existing query-based view links remain valid. `?saved_view=<uuid>` takes precedence over ordinary framing parameters. Creator changes apply when followers reopen/reset; no polling or notifications are added.

Changing visibility to private hides the view from public links and Following; follow rows remain dormant until republishing. Deleting a view cascades its follows. Changes to privacy or moderation are observed on the next fetch; already-open maps are not remotely moved.

## Verification

Run `npm run test:site` and a VuePress production build. Run `tests/map-saved-views.sql` in a test database after the migration. That test uses anonymous, free, active-supporter, unrelated-supporter, expired-supporter, and map-administrator roles. It rolls back its fixture accounts, grants, views, and follows.

Before deploying, verify the migration through an anonymous call to `list_map_saved_views`, then smoke-test creation and following with authorized accounts. If schema deployment is missing or the service is offline, the gallery shows Retry and ordinary map viewing/sharing remains available. No service-role credential belongs in the browser.
