# Ko-fi supporter access

New payments go directly from Ko-fi to the Supabase `kofi-payment` function.
The receiver authenticates the private verification token, accepts donation and
subscription payments, and stores only email, IDs, date, amount, currency and
payment kind. Shop orders, commissions and dashboard samples do not grant access.
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

Until step 7 the checker retains its current sheet fallback. This allows the
backend and site to be deployed safely without starting an expiry clock before
Ko-fi is connected. Do not reapply older access policy/migration files afterward;
apply this migration last if rebuilding the database.

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
