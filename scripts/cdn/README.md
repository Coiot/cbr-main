# Finder uploads to Bunny

Select already-renamed release images in Finder and click **CBR CDN Uploader**
in the toolbar. Images upload with their exact filenames to the root of the
existing Storage Zone serving `https://cdn.civbattleroyale.tv`.

## Install and connect

From the website repository, with Node and macOS command-line tools available:

```sh
npm run cdn:setup
npm run cdn:login
```

Setup installs the pinned official Bunny CLI (`0.19.0`) into `.tools/bunny`,
builds the Swift/AppKit application, and installs it at
`~/Applications/CBR CDN Uploader.app`. Login opens Bunny's own authentication
page and uses a dedicated `cbr-uploader` CLI profile. Passwords and keys are
never placed in the repository or upload reports. The CLI keeps its profile
in its own user configuration.

After browser login, setup matches the CDN hostname to its existing Storage Zone.
If it cannot determine one unique zone, it asks you to select an existing zone.
To finish configuration after a previous login, use:

```sh
npm run cdn:configure
# If necessary, explicitly choose the existing Storage Zone ID:
npm run cdn:configure -- --zone-id 12345
```

No zones or domains are created. Uploads use Bunny's HTTPS storage interface,
so the existing Cyberduck setup remains available.

Open `~/Applications` in Finder, hold **Command**, and drag **CBR CDN Uploader**
into the Finder toolbar. On first use, allow the app to control Finder when
macOS asks; this permits reading the filenames you selected. This permission
can be managed in System Settings → Privacy & Security → Automation.

## Upload behavior

- Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`, `.svg`.
  No resizing, format conversion, or renaming is performed.
- Select files, not folders. Unsupported items are reported. Different local
  files with identical destination filenames must be renamed first.
- If remote names already exist, one dialog lists them before any upload:
  **Skip existing**, **Replace existing**, or **Cancel batch**. A file that
  appears remotely after this check is skipped rather than silently replaced.
- Four files can upload concurrently. Each upload requests server-side SHA256
  verification and sets the appropriate image content type.
- Approved replacements trigger cache invalidation for that exact CDN URL.
  A purge failure is reported separately: the file is stored, but users may
  still see a cached copy. Browser caches may also require refreshing.
- Cancel stops queued and active work. Completed uploads stay uploaded. An
  interrupted active upload is marked **uncertain**, since Bunny may have
  received some or all of it. Verify storage or reselect files to retry; the
  conflict dialog will ask again before replacement.
- Only one local batch runs at once. Checks do not provide a global lock
  against unrelated clients concurrently writing to Bunny.

The completion window includes **Copy CDN URLs** and **Show report**.
Reports (`upload.html` and `upload.json`) are stored under
`~/Library/Application Support/CBR CDN Uploader/reports/`. That directory also
contains nonsecret `config.json`. The toolbar action does not change narration,
Markdown, source images, Git history, or website deployment.

The app records absolute executable and repository paths. Re-run setup after
moving the repository or replacing your Python/Node installation. This preserves
the configured zone and all prior reports.

## Checks and removal

```sh
npm run cdn:test
npm run cdn:dry-run -- /absolute/path/to/image.jpeg
npm run cdn:smoke
npm run cdn:uninstall
```

Dry run reads filenames and checks remote conflicts without uploading anything.
The smoke test performs actual upload, replacement, retrieval, and cache-purge
checks inside a unique `__cbr-uploader-test-…/` prefix, then removes only its test
objects. It requires successful login and configuration. No live connection is
needed for the unit tests. Uninstall removes only the identified app bundle;
it preserves reports, configuration, credentials, and CDN files. Remove the
toolbar icon with Command-drag if desired.

The application has a `--preview` launch argument for local UI inspection using
simulated progress; this makes no network requests and uploads no files.
