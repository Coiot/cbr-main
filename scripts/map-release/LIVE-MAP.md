# Personal map edits and tile notes

The public timeline currently ends at T645 for everyone. Recorded geography,
borders, city locations, and names remain controlled by game history.

## Personal views

The community map’s Edit tab changes your personal draft. Changes to units,
improvements, routes, citadels, ruins, wonders, city status, and ideology apply
only at the exact turn where you made them. Population and religion controls
and overlays are hidden on the timeline map.

Anyone can experiment locally. Drafts are stored on the current device, separated
by account, game history, and view. Current supporters and existing map
administrators can save private views or publish them for others to open and
follow. New views default to private. Updating a published view requires an
explicit save; a viewer’s experiments never change someone else’s saved view.

A view includes its framing, turn-specific tile edits, and personal tile notes.
Personal notes stay on their tile across every timeline turn. Resetting a tile’s
edits affects the selected turn and retains its note. Resetting the view draft
returns to the last saved layer, or to an empty draft for a new view.

## Community notes

The Notes tab shows community notes separately from the personal view note.
Each author can keep one public note per tile. Notes follow coordinates rather
than cities or ownership, and remain visible across the timeline. Supporters and
map administrators can create and update their own notes. Authors with expired
access can still delete their notes; administrators can hide or restore notes.

Community notes appear on the default map and alongside saved views. Hover
content and note-pin graphics indicate notes on a tile. Note text is plain text.

## Storage and deployment

`map-view-layers.sql` creates private layer payload storage linked to existing
saved views, public notes by author, and private note revision history. The
`map-release` API validates data and permissions before calling service-only
save functions. Framing and personal layers save in one transaction. Revision
checks prevent stale tabs from silently overwriting newer saves.

Layers are limited to 5,000 records and 1 MiB, with 2,000 characters per note.
The API checks each edit against its recorded turn, city lifetime, owner, and
published endpoint. It never accepts geography, border, or city-placement edits.
Private views stay private; hidden views cannot expose layer payloads. Following
and showcase links continue using the existing saved-view identifiers.

Saves record the public cutoff. A rollback withholds community notes and saved
layers created against a later cutoff; local drafts also respect that cutoff.
The full T751 history remains private and is not supplied to map viewers.

The migration and updated API are installed. `viewLayersEnabled` enables the
new controls in the site code. The old `editorDetailsEnabled` flag stays false:
there is no shared global tile-editing layer. The older `map-tile-details.sql`
was not installed. The replay lab’s local file experiments remain separate.

Legacy note migration uses only the latest published snapshot plus its live
overrides. Explicit note clears are respected; older snapshot variants remain
in the private backup. Authors are taken from edits that changed the note text,
not unrelated later edits to the same tile. Notes keep their original text,
author, timestamp and tile coordinates, and remain visible across turns.

`migrate-notes.mjs` prepares private SQL and a provenance report from a private
`cbr-legacy-notes-backup` archive containing snapshots, overrides, edit history,
author profiles, existing new notes, and the active release identity. It refuses
unverified authors. The generated transaction checks the source notes and public
release are unchanged and inserts notes without overwriting existing entries,
including deleted or hidden notes. Repeating the import does not duplicate notes.
Keep the backup, report and SQL outside the repository; these contain note text
and author identifiers.

No legacy geography, city records or other tile edits are imported. Legacy data
is retained in the cloud; archive retirement remains a separate task.

On 2026-10-21, eight current notes were imported from the Episode 31 published
base: seven by LacsiraxAriscal and one by NopeCopter. Public API reads verified
their text, authors, timestamps and coordinates. The public endpoint stayed at
T645. The private backup, source provenance, insert-only SQL and verification
report are in `~/Downloads/cbr-legacy-notes-migration-2026-10-21/`.

## Verification

Run `npm run test:site` and `supabase/tests/map-view-layers.sql` in a disposable
database. Verify turn-specific edits, persistent notes, account isolation,
private/public views, owner-only saves, multiple authors, moderation, expiry,
revision conflicts, rollback, and rejection of T646/T751.
