# Ko-fi supporter access

New payments go directly from Ko-fi to the Supabase `kofi-payment` function.
The receiver authenticates the private verification token, accepts donation and
subscription payments, and stores email, IDs, date, amount, currency and payment
kind. A separate private credit table retains public Ko-fi display names and
their visibility choice. Shop orders, commissions and dashboard samples do not grant access.
Payment IDs and transaction IDs are unique: retries cannot extend access twice.

* One-time donation: **32 days from payment**, not delivery time.
* Recurring tip or membership: **one calendar month plus 3 days** from payment.
  The extra days cover month-length variation and short payment delays.
* Multiple payments: use the latest expiry; overlapping tips do not stack months.
* A donation received before registration is matched after verified signup.
* Matching uses the verified email in `auth.users`, never editable profile data.
* Expiry is checked by the database on every privileged request. There is no
  dependency on a cron job updating a permanent flag. `profiles.can_edit` is
  only a compatibility cache, refreshed by payments and account checks.
* Existing comments and saved preferences remain. Editing the map or posting/
  editing supporter comments requires current access; deleting one's own comment
  and ordinary reading, reactions and reading progress remain available.
* The account menu shows a friendly thank-you and renewal link after expiry.
  Open tabs expire locally and recheck on focus/visibility, with shared caching.

## Deployment and activation

1. Apply `supabase/sql/supporter-access.sql` **before** deploying the functions or
   frontend. It installs private tables and functions; payment mode starts **off**.
2. Deploy `kofi-payment` and `check-kofi-subscriber` with `--no-verify-jwt`.
   The former verifies Ko-fi's token; the latter verifies the signed-in Supabase
   bearer token. Neither trusts a submitted account email.
3. In <https://ko-fi.com/manage/webhooks>, open Advanced and copy the existing
   verification token to `.env.kofi` using `.env.kofi.example` as the template.
   Install it with `supabase secrets set --env-file .env.kofi`. Keep it private.
4. Set Ko-fi's webhook URL to
   `https://ndgkvyldchkgyyoaeukt.supabase.co/functions/v1/kofi-payment`.
   Check for an existing receiver first; replacing one could stop other automation.
5. Send Ko-fi's test payment. Expect HTTP 200 with `ignored: true` for the sample
   email. The test records only a delivery timestamp, event type and counter in a
   private health row, so it also verifies database connectivity without granting
   access. A failed database write returns 503 for Ko-fi to retry. Check Edge
   Function errors in Supabase and delivery results in Ko-fi. No raw payloads or
   credentials should appear in logs. Tests with real emails would grant access,
   so use the dashboard sample, not a real supporter identity.
6. Import existing dated records if available (below). Deploy the website.
7. Only after the receiver is configured and tested, activate:
   `npm run supporters:access -- activate --webhook-tested --apply`.

Activation stops spreadsheet verification. Existing signed-up supporters get a
**one-time 32-day transition**. Re-running activation does not extend that window.
An old `can_edit = true` is not silently converted to permanent access. Give any
intentional complimentary accounts an explicit manual grant before activation.
If no dated export exists, the transition gives recurring payments a cycle to
arrive without keeping old grants forever. Historical supporters without an
account need a dated import or a new payment; the old sheet contains no dates.

The current checker requires payment mode after step 7; it no longer falls back
to the old sheet. Do not reapply older access policy/migration files afterward.
Apply `supporter-credits.sql` after this access migration when rebuilding the
database.

## Native Ko-fi member CSV bootstrap

The actual `Subscriber_*.csv` export has `Email`, `IsActive` and `SinceDateUTC`.
`SinceDateUTC` is the signup date, so it must never be treated as a recent payment
or a paid-through date. Stage active members before activation:

```sh
npm run supporters:access -- bootstrap --file /path/to/Subscriber.csv
npm run supporters:access -- bootstrap --file /path/to/Subscriber.csv --apply
```

This previews aggregate account matches, then stages only normalized active
emails in a private table. Names, pledges, Discord handles and signup dates are
not imported. Activation gives this snapshot the same **one-time 32-day window**
as existing grants. It also covers members who register later within that window.
The window starts when payment mode is activated, rather than when a CSV is
uploaded. Repeated activation cannot extend it; staging is rejected after
activation. Future payments establish real renewal dates. Later reconciliations
must use dated records as described below. `IsActive=True` alone does not prove a
recent payment; Ko-fi can label overdue subscriptions active.

## Review and reconcile

`npm run supporters:access -- status` reports activation state, payment count,
the time of the last recorded payment, and the last successful dashboard test
without displaying donor emails.
A quiet ledger alone does not prove delivery failure; inspect Ko-fi deliveries
and Supabase Edge Function errors when an expected payment is missing.

Ko-fi does not supply cancellation/refund webhooks or a full subscription lookup
API. Payment-based expiry is our eligibility rule, not an exact subscription-status
mirror. A cancelled membership keeps its paid access until expiry. Refunds can be
recorded using `revoke --transaction-id ID --apply`. This revokes that payment;
other paid periods or manual grants can still supply access.

Download the member CSV from Ko-fi's Members page. A status such as “Active” or
“Cancelled” alone is insufficient: cancelled members may still have paid time.
Use an **access-through date** from billing records, including the desired grace
period. The importer does not guess a billing date from the download date.

The normalized input is:

```csv
email,access_expires_at
reader@example.com,2026-11-20T12:00:00Z
```

Custom header names are supported with `--email-column "Email" --expires-column
"Access until"`. Dates must be ISO timestamps with a timezone, or YYYY-MM-DD
(midnight UTC at the start of that date). Preview first:

```sh
npm run supporters:access -- import --file /path/to/members.csv
npm run supporters:access -- import --file /path/to/members.csv --apply
```

The preview gives member, account-match, active and expired counts, without
printing emails. Imports create/update dated `import` grants, including expired
records, so previous imported access can end. Duplicate emails keep the latest
expiry. Missing rows never revoke unrelated access. Existing webhook payments,
manual exceptions and transition periods are independent; an expired imported
row does not cancel another valid grant. Preview/apply are explicit CLI actions;
the tool does not scrape the Ko-fi dashboard. Revoke incorrect grants explicitly.

## Manual exceptions

Use a dated grant by default; `--permanent` is an intentional lifetime exception:

```sh
npm run supporters:access -- grant --user-id UUID --until 2026-12-01 --note "Guest contributor" --apply
npm run supporters:access -- grant --user-id UUID --permanent --note "Complimentary access" --apply
npm run supporters:access -- revoke --grant-key manual:UUID --apply
```

Without `--apply`, mutations are previews. The CLI reads existing private
`.env.supporters` service credentials. Browser accounts cannot read the payment
ledger, call payment/import functions, or grant themselves access.

## Validation

`npm run test:site` covers webhook authentication, invalid payloads, test events,
retry responses, parsing, account refresh and messages. The database preflight
runs inside a rollback transaction and checks 32-day access, month ends, replay
protection, out-of-order payments, expiry despite stale flags, RLS rejection,
verified email ownership, future signups and manual exceptions.

## Supporters SVG credits (database only)

Apply `supabase/sql/supporter-credits.sql` **after** `supporter-access.sql`, then
deploy the current `kofi-payment` and `check-kofi-subscriber` functions. The checker
now requires payment mode and never consults a spreadsheet. Reapply the credits
migration if rebuilding from the older access migration.

The SVG builder calls the service-only `get_supporter_credits` RPC. Inclusion uses
unexpired, unrevoked payment periods and explicit grants, including the original
one-time migration window. There is no dependency on `profiles.can_edit`, a
Google Sheet, a site login, or a scheduled expiry job.

Credit identity matches verified `auth.users.email`. The display name prefers the
website username, then an imported credit name, then a public Ko-fi display name.
An account's saved favourite civ overrides the imported civ, including an
explicitly cleared choice. Payment emails never appear in artwork. Private or
unnamed donations receive a combined anonymous acknowledgement. A newer private
Ko-fi payment hides earlier public/legacy names; out-of-order payments and
webhook retries cannot change a newer credit choice. Existing episode SVGs remain
historical snapshots; membership changes affect newly generated artwork.

One-time name migration (these commands do **not** grant/extend access):

```sh
npm run supporters:credits -- --legacy-sheet
npm run supporters:credits -- --legacy-sheet --apply
# Optional: fill missing historical names from a saved Ko-fi member CSV.
npm run supporters:credits -- --file /path/to/Subscriber.csv --apply
```

The first command previews aggregate counts only. `--legacy-sheet` reads the old
sheet solely for this explicit import; ordinary SVG generation cannot read it.
Repeated imports fill missing names/civs and preserve existing imported choices.
Native Ko-fi CSV signup dates and pledge columns never become payment dates or
civ choices. After the import, remove `GOOGLE_SHEET_*`, `SUPPORTERS_EMAIL_COLUMN`,
`SUPPORTERS_PROFILES_TABLE`, and `SUPPORTERS_USER_SETTINGS_TABLE` from
`.env.supporters`. Keep the Supabase credentials and artwork formatting options.

`npm run build:supporters` retains the same SVG rendering and filename behaviour.
The release automation still stages artwork in its release folder and uploads it
to Bunny. Database errors or an empty active roster stop generation, preserving
existing artwork. An explicit `SUPPORTERS_ALLOW_STALE_ON_FETCH_ERROR=true` is
available for manual recovery; automatic release preparation always disables it.
`SUPPORTERS_CSV_FILE` remains an explicit offline fixture override, with no
automatic CSV or spreadsheet fallback. Public clients cannot read the payment
ledger, credit identities, or the private credit RPC.
