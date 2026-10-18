#!/usr/bin/env python3
"""Bunny upload engine. Finder and the dry-run CLI share this implementation."""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
from html import escape
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import threading
from urllib.parse import quote, urlencode, urlparse
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from automation_files import atomic_json

APP_DIR = Path.home() / "Library/Application Support/CBR CDN Uploader"
CONFIG = APP_DIR / "config.json"
TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
         ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml"}


class UploadError(Exception):
    pass


class Interrupted(UploadError):
    pass


class Bunny:
    def __init__(self, config):
        self.config = config
        self.cancelled = threading.Event()
        self.mutex = threading.Lock()
        self.processes = set()

    @staticmethod
    def stop(process):
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            return
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass

    def cancel(self):
        self.cancelled.set()
        with self.mutex:
            processes = list(self.processes)
        for process in processes:
            self.stop(process)

    def command(self, args, timeout=90, allow_empty=False):
        if self.cancelled.is_set():
            raise Interrupted("Cancelled")
        argv = self.config["cli_command"] + args + ["--profile", self.config["profile"], "--output", "json"]
        env = dict(os.environ)
        # The configured profile must win over unrelated terminal credentials/endpoints.
        for key in list(env):
            if key.startswith('BUNNYNET_'):
                env.pop(key)
        env['PATH'] = str(Path(self.config['cli_command'][0]).parent) + ':/usr/bin:/bin:/usr/sbin:/sbin'
        try:
            process = subprocess.Popen(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                       stderr=subprocess.PIPE, start_new_session=True, env=env,
                                       cwd=self.config.get('working_directory', str(APP_DIR)))
        except OSError:
            raise UploadError("Bunny CLI could not start. Reinstall the uploader.") from None
        with self.mutex:
            self.processes.add(process)
        try:
            if self.cancelled.is_set():
                self.stop(process)
            try:
                stdout, stderr = process.communicate(timeout=timeout)
            except subprocess.TimeoutExpired:
                self.stop(process)
                process.communicate()
                raise Interrupted("Bunny request timed out; a transfer may have reached storage.") from None
            if self.cancelled.is_set():
                raise Interrupted("Cancelled; an active transfer may have reached storage.")
            if process.returncode:
                details = (stdout + stderr).lower()
                if any(term in details for term in (b'401', b'403', b'not logged in', b'no api key', b'profile not found')):
                    raise UploadError("Bunny authentication failed. Run npm run cdn:login, then try again.")
                if b'429' in details:
                    raise UploadError("Bunny rate limit reached. Try this batch again later.")
                # Never relay CLI payloads, account data, or credentials to reports.
                raise UploadError(f"Bunny command failed (exit {process.returncode}). Check connectivity and account access.")
            if allow_empty and not stdout.strip():
                return None
            try:
                return json.loads(stdout)
            except (ValueError, UnicodeError):
                raise UploadError("Bunny returned an unexpected response; no success was assumed.") from None
        finally:
            with self.mutex:
                self.processes.discard(process)

    def listing(self, prefix=""):
        data = self.command(["storage", "files", "list", prefix, "--zone", str(self.config["zone_id"])])
        if not isinstance(data, list) or any(not isinstance(row, dict) or not isinstance(row.get('objectName'), str)
                                            or not isinstance(row.get('isDirectory'), bool) for row in data):
            raise UploadError("Bunny file listing was invalid. Uploads stopped to protect existing files.")
        return {row['objectName']: row for row in data}

    def upload(self, source, remote, content_type):
        # Encode each filename segment exactly once; the Storage SDK constructs a URL path.
        data = self.command(["storage", "files", "upload", str(source),
                             "--zone", str(self.config["zone_id"]), "--to=" + remote,
                             "--checksum", "--content-type", content_type], timeout=180)
        if not isinstance(data, dict) or data.get('uploaded') is not True or data.get('path') != remote:
            raise Interrupted("Upload response was ambiguous; verify storage before retrying.")

    def purge(self, url):
        self.command(["api", "POST", "/purge?" + urlencode({'url': url, 'async': 'false', 'exactPath': 'true'})],
                     allow_empty=True)


def inspect_selection(paths):
    entries, invalid, seen = [], [], set()
    for value in paths:
        source = Path(value).expanduser().absolute()
        if str(source) in seen:
            continue
        seen.add(str(source))
        reason = None
        if source.is_symlink() or not source.is_file():
            reason = "Select regular image files, not folders or symbolic links."
        elif source.suffix.lower() not in TYPES:
            reason = "Unsupported type. Use JPEG, PNG, WebP, GIF, AVIF, or SVG."
        elif any(ord(char) < 32 for char in source.name):
            reason = "Filenames containing control characters are not supported."
        try:
            if not reason:
                stat = source.stat()
                if stat.st_size == 0:
                    reason = "File is empty."
                else:
                    with source.open('rb') as handle:
                        handle.read(1)
        except OSError:
            reason = "File could not be read."
        if reason:
            invalid.append({'name': source.name, 'source': str(source), 'status': 'unsupported', 'message': reason})
        else:
            entries.append({'name': source.name, 'source': str(source), 'size': stat.st_size,
                            'mtime_ns': stat.st_mtime_ns, 'content_type': TYPES[source.suffix.lower()]})
    names = [item['name'] for item in entries]
    if len(names) != len(set(names)):
        raise UploadError("Different selected files have the same filename. Rename them before uploading.")
    return entries, invalid


def load_config(path):
    try:
        config = json.loads(path.read_text())
        if (not isinstance(config['zone_id'], int) or config['zone_id'] < 1
                or not config['profile'] or not config['cli_command']):
            raise ValueError()
        url = urlparse(config['cdn_url'])
        if url.scheme != 'https' or not url.netloc or url.path not in ('', '/') or url.query or url.fragment:
            raise ValueError()
        return config
    except (OSError, ValueError, KeyError, TypeError):
        raise UploadError("Uploader is not connected. Run npm run cdn:login (or cdn:configure after login) to select the CBR Storage Zone.") from None


class Batch:
    def __init__(self, config, report_dir, emit=lambda event: None, bunny=None):
        self.config, self.report_dir, self.emit = config, Path(report_dir), emit
        self.bunny = bunny or Bunny(config)
        self.output_lock = threading.Lock()

    def event(self, **data):
        with self.output_lock:
            self.emit(data)

    def plan(self, paths):
        files, invalid = inspect_selection(paths)
        if not files:
            raise UploadError("No supported image files selected.")
        self.event(type='phase', message='Checking filenames on Bunny…')
        remote = self.bunny.listing()
        for item in files:
            item['exists'] = item['name'] in remote
            item['directory_conflict'] = remote.get(item['name'], {}).get('isDirectory', False)
        return {'files': files, 'unsupported': invalid,
                'conflicts': [item['name'] for item in files if item['exists']],
                'destination': self.config['cdn_url'], 'zone': self.config['zone_name']}

    def one(self, item):
        row = dict(item)
        if self.bunny.cancelled.is_set():
            return dict(row, status='cancelled', message='Not started.')
        started = False
        try:
            source = Path(item['source'])
            stat = source.stat()
            if stat.st_size != item['size'] or stat.st_mtime_ns != item['mtime_ns']:
                raise UploadError("Local file changed since selection; select it again.")
            if item.get('directory_conflict'):
                raise UploadError("A remote directory has this name; it was left unchanged.")
            hasher = hashlib.sha256()
            with source.open('rb') as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b''):
                    hasher.update(chunk)
            row['sha256'] = hasher.hexdigest()
            remote = quote(item['name'], safe='')
            url = self.config['cdn_url'].rstrip('/') + '/' + remote
            row['url'] = url
            self.event(type='file_started', name=item['name'])
            started = True
            self.bunny.upload(source, remote, item['content_type'])
            after = source.stat()
            if after.st_size != item['size'] or after.st_mtime_ns != item['mtime_ns']:
                raise Interrupted("Local file changed during upload; verify the stored image before retrying.")
            row.update(status='replaced' if item['exists'] else 'uploaded', message='Checksum-verified upload completed.')
            if item['exists']:
                try:
                    self.bunny.purge(url)
                    row['purge'] = 'complete'
                except UploadError:
                    row.update(purge='failed', message='Uploaded, but cache invalidation did not complete. Refresh this URL in Bunny before relying on the new image.')
        except Interrupted as exc:
            row.update(status='uncertain' if started else 'cancelled', message=str(exc))
        except (OSError, UploadError) as exc:
            row.update(status='failed', message=str(exc) if isinstance(exc, UploadError) else 'Local file could not be read.')
        return row

    def run(self, plan, action):
        if action not in ('replace', 'skip', 'cancel'):
            raise UploadError("Invalid conflict decision.")
        results = list(plan['unsupported'])
        files = plan['files']
        if action == 'cancel':
            self.bunny.cancel()
        else:
            # Refresh after the user chooses. Newly appeared conflicts are never overwritten.
            fresh = self.bunny.listing()
            for item in files:
                if item['name'] in fresh and not item['exists']:
                    results.append(dict(item, status='skipped', message='Appeared on Bunny after the conflict check; select again to review replacement.'))
                elif item['exists'] and action == 'skip':
                    results.append(dict(item, status='skipped', message='Existing file preserved.'))
                elif item['name'] in fresh and fresh[item['name']]['isDirectory']:
                    results.append(dict(item, status='skipped', message='A remote directory has this name; preserved.'))
        completed_names = {r['source'] for r in results}
        pending = [item for item in files if item['source'] not in completed_names]
        self.event(type='uploading', total=len(files), completed=len(results) - len(plan['unsupported']))
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(self.one, item) for item in pending]
            for future in as_completed(futures):
                row = future.result()
                results.append(row)
                self.event(type='file_done', name=row['name'], status=row['status'],
                           completed=len(results) - len(plan['unsupported']), total=len(files), message=row['message'])
        report = {'created': datetime.now(timezone.utc).isoformat(), 'zone': self.config['zone_name'],
                  'destination': self.config['cdn_url'], 'cancelled': self.bunny.cancelled.is_set(), 'files': results}
        report['counts'] = {status: sum(r['status'] == status for r in results)
                            for status in ('uploaded', 'replaced', 'skipped', 'failed', 'uncertain', 'cancelled', 'unsupported')}
        report['purge_failures'] = sum(r.get('purge') == 'failed' for r in results)
        directory = self.report_dir / (datetime.now().strftime('%Y%m%d-%H%M%S-') + uuid.uuid4().hex[:8])
        atomic_json(directory / 'upload.json', report)
        html = self.html_report(report)
        (directory / 'upload.html').write_text(html)
        report.update(report=str(directory / 'upload.html'),
                      urls=[r['url'] for r in results if r['status'] in ('uploaded', 'replaced')])
        self.event(type='finished', **report)
        return report

    @staticmethod
    def html_report(report):
        rows = ''.join('<tr><td>' + escape(row['name']) + '</td><td>' + escape(row['status']) +
                       '</td><td>' + escape(row.get('message', '')) + '</td><td>' +
                       ('<a href="' + escape(row['url'], quote=True) + '">CDN URL</a>' if row.get('url') else '') +
                       '</td></tr>' for row in report['files'])
        return ('<!doctype html><meta charset="utf-8"><title>CBR CDN upload</title>'
                '<style>body{font:16px/1.5 system-ui;margin:35px}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}'
                'td{overflow-wrap:anywhere;max-width:650px}</style><h1>CBR CDN upload</h1><p>' +
                escape(report['destination']) + '</p><table><tr><th>File</th><th>Result</th><th>Details</th><th>URL</th></tr>' + rows + '</table>')


@contextmanager
def batch_lock(directory):
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / 'upload.lock').open('a') as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise UploadError("Another upload is already running. Return to its progress window.") from None
        yield


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['upload', 'dry-run'])
    parser.add_argument('files', nargs='+')
    parser.add_argument('--config', type=Path, default=CONFIG)
    args = parser.parse_args()
    def emit(event):
        print(json.dumps(event, ensure_ascii=False), flush=True)
    try:
        config = load_config(args.config)
        with batch_lock(args.config.parent):
            batch = Batch(config, args.config.parent / 'reports', emit)
            plan = batch.plan(args.files)
            emit(dict(type='plan', **plan))
            if args.command == 'dry-run':
                return 0
            control = json.loads(sys.stdin.readline())
            if not isinstance(control, dict) or control.get('action') not in ('replace', 'skip', 'cancel'):
                raise UploadError("No valid upload decision was received. Nothing uploaded.")
            def listen():
                for line in sys.stdin:
                    try:
                        if json.loads(line).get('action') == 'cancel':
                            batch.bunny.cancel()
                    except (ValueError, AttributeError):
                        pass
                # Closing the app's control pipe also stops any remaining work.
                batch.bunny.cancel()
            threading.Thread(target=listen, daemon=True).start()
            batch.run(plan, control['action'])
    except (UploadError, ValueError, OSError) as exc:
        emit({'type': 'error', 'message': str(exc) if isinstance(exc, UploadError) else 'Uploader could not read its input or save its report.'})
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
