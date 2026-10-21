# Episode endpoints and private full-range viewing

Episode 35's confirmed end turn is **645**, now published as the public ceiling.
Episode 34's marker remains at **595**. Until another endpoint is explicitly
published, readers stop at T645. All turns mean **end of turn**: events on N are
included, events on N+1 are excluded. Earlier episode endpoints have not been
invented; add them as the showrunner supplies them.

## Toolbar

The shared toolbar sits below the map toolbar in both the lab and official map.
It has an episode selector, a tick for each supplied endpoint, and the existing
playback, turn and speed controls. Mouse/touch dragging briefly holds an episode
tick for 180 ms. Releasing close to a tick settles on it; a fast drag far past it
retains the intended destination. Keyboard range controls, numeric entry, episode
selection and playback bypass this magnetism and remain exact.

Only Coiot's fixed account ID sees the online **+** endpoint manager. Enter the
episode and its end turn, then choose **Publish endpoint**. Existing episode
numbers update their marker; end turns must follow episode order. Earlier markers
can be added without advancing the public ceiling. Duplicate endpoints are
permitted when two episodes end on the same game turn.

Localhost has the full range of locally loaded files and the same form, labeled
**Local preview only**. **Save marker** stores only the episode/turn pairs on that
device, not map data, and does not contact the publishing API. Non-loopback lab
visitors are bounded by the public markers; signed-in Coiot can inspect the full
local file. These local files never supply the public timeline.

## Publishing and access

A checked full history is staged privately through `/map-releases/`. Staging
selects it as the private timeline source; it does not change the active public
release. Coiot's authenticated community map requests this full source through
the protected `timeline-admin` action. Other readers only receive the bounded
active release. Client usernames, URL flags and claimed localhost status cannot
grant server access to private data. A localhost page cannot bypass remote auth;
load its private history in the lab or private local preview to inspect it.

The `set-episode` action validates the new markers, creates an immutable release
containing events only through the latest entered endpoint, rebuilds its wonder
and religion catalogs from those retained events, and audits the result. It then
atomically publishes that copy. The full source and its event numbering remain
unchanged. Source/publication checks reject stale writes from another tab.

Readers check for a newer publication once a minute while visible, retaining
their selected turn where possible. A newer save alone never advances the
public timeline. Logging out clears the privileged map before loading the
public version. Public saved views and metadata endpoints keep the server's
published turn checks. Private future turns cannot create public saved views.

## Deployment state

The shared T751 source and bounded Episode 34 release (T0–595) are installed in
Supabase. The baseline, episode-marker and recovered-history migrations and
updated `map-release` API are deployed. The frontend integration is enabled in
the working tree; deploy the site normally to update the hosted page.

The showrunner selected the recovered event history with its documented gaps.
Private `event_gaps_accepted` metadata allows publishing bounded episode copies
of that source while retaining the audit and exact source events. Malformed
history still fails validation. The full source cannot be published directly
when it ends after the latest episode marker.

The separate live editor detail migration is not installed. Both its API routes
and frontend loading remain disabled. Legacy cloud data has not been deleted.
