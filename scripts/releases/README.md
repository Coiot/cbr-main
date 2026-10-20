# Release inbox

Drop a Google Docs narration `.html` or `.zip` into
`~/CBRX/Narration/Inbox`. Keep the descriptive download filename; spaces and
browser-added duplicate suffixes are supported. ZIPs do not need to be extracted.

Within about 30 seconds, the background job prepares the release. Supporters
fetching can take longer. macOS notifications and `npm run releases:status` show
the output paths and any errors.

## Your release routine

1. Move the downloaded narration into Inbox.
2. Review the generated Markdown in `src/albums/sN/EpisodeN.md` or
   `src/albums/pr/sNprN.md`.
3. Adjust custom image URLs, cover selection, titles, and other editorial details.
   The converter retains standard image naming, episode cover scene 06, PR cover
   scene 01, and episode supporters scene 04.
4. Open `~/CBRX/Narration/Releases/sN-epN/index.html` for the source narration,
   website Markdown, supporters SVG, terminology review, upload receipt, and Reddit
   draft. Power rankings use `sN-prN`. New supporters SVGs upload automatically
   using the configured Bunny uploader; upload your scene images as usual.
5. Double-click `Check release.command` in that folder after editorial changes.
   Review its report and copy `Reddit.md`, then preview, commit, and publish using
   your normal workflow.

Release dates use the input file's macOS creation date (normally its download
date), or first-seen date when unavailable. Check this when importing an older
download. Season detection uses headings/filename and otherwise the latest
season directory in the website. The completion report identifies the selected
release. Metadata missing from the source must be corrected before retrying.

Existing albums are never replaced. Revised documents go into
`~/CBRX/Narration/Releases/<release>/revisions/<hash>/` for you to compare and copy
into place. The first supporters file sits in the release folder; revised
candidates keep their SVG beside their reports. Successful inputs move
to `~/CBRX/Narration/Archive`; failed inputs stay in Inbox. Identical downloads
are archived without regenerating files or reversing your edits. A release
whose generated Markdown already matches is treated as already prepared.

The release folder retains a source copy and links to the website Markdown rather
than creating a second editable copy. Older Archive, Review, and Downloads files
remain where they are; duplicate imports are not reprocessed to migrate them.

Only newly generated supporters SVGs upload automatically. The existing Bunny
profile, checksum verification, and upload lock are reused. Existing remote names
are skipped: use the Finder uploader to approve a replacement and purge its cache.
Failed or uncertain uploads leave the local release intact and appear in the check
report. Retry with the Finder uploader; importing a duplicate does not retry uploads.
The check records the automatic attempt, not the current CDN state.

The automation does not run Git writes. It stages supporters generation in
temporary files, so it does not alter the shared site supporters SVG. An ordinary
`npm run build:supporters` still behaves as before and does not upload automatically.

## Check release and Reddit draft

```sh
npm run releases:check -- src/albums/s5/Episode35.md --open
# Or use the release folder (checks its current candidate):
npm run releases:check -- "$HOME/CBRX/Narration/Releases/s5-ep35" --open
```

The check validates required metadata, matching dates and album identity, and
consecutive scene numbers. Empty scene text, reused image URLs, incomplete or
outdated terminology reviews, revision candidates, and automatic supporters upload
issues are flagged for review. It makes no network or AI requests and does not
check whether any image or cover is available on the CDN. Warnings do not block
draft generation; structural errors exit with code 1.

The generated Reddit Markdown follows the release title and narrator in the
current Markdown, with the season/episode album URL, Ko-Fi link, and Season 5
megathread. Other seasons need a `season_megathreads` mapping in the automation
config (season numbers as string keys, HTTPS links as values); an unknown season
gets a warning and no incorrect megathread link. Each changed check gets a new
`checks/<hash>/` folder. Hand-edited Reddit drafts are preserved when rerunning the
same check. `Reddit.md` and `Check release.html` shortcuts point to the latest
outputs. Nothing posts to Reddit automatically.

## Setup and operation

Run these commands from the website repository with its Node 20.19–22.x
environment active and npm dependencies installed:

```sh
npm run releases:setup
npm run releases:status
npm run releases:scan
npm run releases:retry -- "$HOME/CBRX/Narration/Inbox/Episode 35 Narration.zip"
npm run releases:test
npm run releases:uninstall
```

Setup creates `.venv-release`, installs the Python requirements, and installs the
current user's `tv.civbattleroyale.release-inbox` LaunchAgent. It runs every 15
seconds while logged in, including after login, without needing a terminal.
The first scan observes a file; a later scan processes it once unchanged for at
least 10 seconds. Downloads outside Inbox are not processed.

Setup records explicit Python, Node, and repository paths. Run setup again after
moving the repository or replacing the selected Node installation. Existing
history is preserved. Uninstall removes only the background job.

Configuration, state, and logs are in `~/CBRX/Narration/Automation/`. Set
`notifications` to `false` in `config.json` to silence notifications. Detailed
history is in `state.json`; startup errors appear in `intake-error.log`.
No credentials are copied into these files. Supporters generation uses the
website's existing `.env.supporters` Supabase credentials and active Ko-fi
payment/grant records. Google Sheets is no longer used. Credit names and civ
fallbacks are managed by the private credit database (see
`scripts/supporters/README.md`). If it fails, fix connectivity/configuration
and use the retry command. Errors do not trigger automatic repeated requests.

For alternate folders, setup accepts `--narration-dir` and `--downloads-dir`.
Manual scan/retry/status commands then need
`--config /path/to/Narration/Automation/config.json`; the installed job already
uses that path. Do not place unrelated HTML in Inbox. Archives containing
multiple narration documents need the intended HTML placed in Inbox separately.

Supporters generation also accepts explicit identity for manual use:

```sh
SUPPORTERS_SEASON=5 SUPPORTERS_EPISODE=35 npm run build:supporters
```

The original `CBRX Narration Converter.py` remains available. The maintained
automation copy is `scripts/releases/converter.py`; update that copy when
changing automated conversion behavior.

## Context-aware terminology review

New imports check `scene_title` and `narration` for whole-word uses of part,
parts, mark, marks, and Mk. The OpenAI review identifies clear release references
and the importer replaces only those exact words with episode or season.
Capitalization, plurals, and possessives are preserved. Historical Mark I/II
names, ordinary meanings, and uncertain cases are retained. Links and HTML
attributes are excluded; words spanning markup/entities are flagged for manual
editing. The model cannot rewrite sentences or other fields.

To enable AI review, set `OPENAI_API_KEY` in the gitignored `.env.releases` file
in the repository root (setup creates an empty template). You can also copy
`.env.releases.example` there if needed. Enter the key locally, not in chat or
Git. This file is read on every job, so the background job needs no restart.
The optional `CBR_TERMINOLOGY_MODEL` setting defaults to
`gpt-5.4-mini-2026-03-17`. Environment variables take precedence over the file.
Only simple literal KEY=value entries are supported, with optional quotes and
comments; shell expansion is never performed.

Candidate scene text and release identity are sent to the OpenAI API, which has
its own usage charges. Releases without candidate terms make no API request.
Requests use structured decisions, no tools, and `store: false`; narration is
treated as data rather than instructions. Each request has a 30-second timeout
and one retry for transient errors. Oversized reviews (over 150 occurrences or
180,000 serialized characters) produce a manual-review report instead.

Before automatic changes are permitted, the selected model must pass the labeled
cases in `terminology_examples.json`. This evaluation runs automatically on the
first review with a key, and again after the model, prompt, or policy changes.
It must produce no incorrect automatic replacements, recognize at least one
clear correction, and may flag uncertain examples. This is a regression check,
not a guarantee that the model will never misclassify a new sentence. Review the
correction report before publishing. A failed evaluation is remembered until you
explicitly re-run it:

```sh
npm run releases:terminology-eval
```

Reports live inside `~/CBRX/Narration/Releases/<release>/`, under the import's
revision folder or a `terminology-<hash>/` folder for manual rechecks:

- `terminology.html` lists automatic corrections and uncertain passages, with
  scene numbers, field names, context, and explanations.
- `terminology.json` contains all decisions, including preserved usages.

The release notification and `releases:status` include counts and a report path.
If the key is absent, the API fails, the evaluation fails, or any response is
invalid, the release is generated without terminology changes and the report
says **AI review incomplete**. Fix the issue and recheck the generated file:

```sh
npm run releases:terminology -- src/albums/s5/Episode35.md
```

This command preserves the supplied file and writes a corrected candidate beside
its report in the release folder, only when corrections are needed. Compare and apply that
candidate manually. It does not rebuild supporters or publish anything. It exits
with code 1 when the AI review is incomplete and code 0 for a complete review,
even if some passages still need your judgment. It accepts `--config` for an
alternate Narration directory just like the other intake commands.

Successful decisions are cached in `Automation/terminology-cache` using content,
release context, model, and policy. Corrected imports retain the original duplicate
protection. Adding a key or upgrading the checker does not retroactively reprocess
archived documents; use the explicit recheck command for those releases.
