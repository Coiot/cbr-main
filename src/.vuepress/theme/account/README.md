# Account synchronization

`accountSync.js` coordinates profile reads, donation verification, username saves,
and preferences across the navbar, albums, map, and spotlight. Each Supabase
client has one coordinator. Events include the account ID, stale responses are
discarded after sign-out, and edits made during a read take precedence over that
read. Auth callbacks defer work and duplicate session notifications do not restart
the navbar's initial import.

Preference writes are queued and send only edited keys to `patch_user_settings`.
The database merges the JSON under a row lock, preserving unrelated preferences
and map contrast options. The RPC checks the expected user ID, so an account
switch cannot direct a queued save to a different account. Initial browser values
fill missing keys only. Failed edits remain visible with a retry action; they are
not reported as saved. Name and preference events update an open page immediately.

## Donation verification

The account menu checks access on sign-in, when reopened, and when returning to
an open tab. Readers can choose **Check donation access** without signing out.
Concurrent requests share one check and successful results are cached for one
minute. Existing `can_edit` flags never bypass verification. Dated access expires
in an open tab; the database independently enforces expiry on privileged writes.

[Ko-fi integration and operations](../../../../scripts/supporters/README.md)
describes payment webhooks, 32-day one-time access, recurring access, CSV imports,
manual exceptions, and the staged migration from the supporter spreadsheet.
The spreadsheet fallback is used only until payment mode is activated.

## Database and deployment

Apply `supabase/sql/account-sync.sql` before deploying the website. It adds the
atomic settings RPC and prevents ordinary profile owners from changing their own
`can_edit` flag. Owner RLS remains enforced; the service role and administrator
can continue granting access. Name updates preserve donation access.

Deploy `supabase/functions/check-kofi-subscriber` with its existing
`verify_jwt = false` gateway setting: the handler verifies each bearer token with
`auth.getUser` before reading the donor list or writing any profile. The function
uses the built-in `SUPABASE_SERVICE_ROLE_KEY`, with `SERVICE_ROLE_KEY` supported
as a fallback. Sheet settings are `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_GID`,
`GOOGLE_SHEET_PUB_ID` or `GOOGLE_SHEET_PUB_URL`, and optional zero-based
`SUPPORTERS_EMAIL_COLUMN` (default 1).

Run `npm run test:site` for slow reads, rapid edits, retries, account switches,
profile broadcasts, CSV parsing, source fallback, and verifier authorization.
Database preflight also verifies owner writes, key merging, missing-key imports,
cross-account rejection, protected access flags, and service-role grants in a
transaction that rolls back all test data.
