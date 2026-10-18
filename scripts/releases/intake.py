#!/usr/bin/env python3
"""Prepare release folders and upload new supporters SVGs. Never commits or publishes the site."""

import argparse
from contextlib import contextmanager
from datetime import datetime
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import zipfile

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from automation_files import atomic_json as save_json, publish_file
import converter
import terminology
import workspace
from validation import album_data, has_conflict_markers, validate_structure

DEFAULT_CONFIG = Path.home() / "CBRX/Narration/Automation/config.json"
MAX_HTML = 20 * 1024 * 1024
MAX_INPUT = 100 * 1024 * 1024
STABLE_SECONDS = 10


def signature(path):
    stat = path.stat()
    return [stat.st_size, stat.st_mtime_ns]


def notify(title, message, enabled=True):
    print(f"{title}: {message}", flush=True)
    if enabled and sys.platform == "darwin":
        # Pass text as arguments, never interpolate document text into AppleScript.
        script = ('on run argv\n'
                  'display notification (item 2 of argv) with title (item 1 of argv)\n'
                  'end run')
        try:
            subprocess.run(["/usr/bin/osascript", "-e", script, title, message],
                           capture_output=True, timeout=10, check=False)
        except (OSError, subprocess.TimeoutExpired):
            pass  # The persistent status report remains available.


class Intake:
    def __init__(self, config):
        self.config = config
        self.root = Path(config["narration_dir"])
        self.site = Path(config["site_root"])
        self.inbox = self.root / "Inbox"
        self.automation = self.root / "Automation"
        self.archive = self.root / "Archive"
        self.state_path = self.automation / "state.json"
        self.state = {"observations": {}, "jobs": {}}
        self.config_path = Path(config.get("config_path", self.automation / "config.json"))

    @contextmanager
    def locked(self):
        self.automation.mkdir(parents=True, exist_ok=True)
        with (self.automation / "intake.lock").open("a") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise RuntimeError("Another release intake is running; try again shortly.")
            if self.state_path.exists():
                self.state = json.loads(self.state_path.read_text())
            yield

    def save(self):
        save_json(self.state_path, self.state)

    def announce(self, title, message):
        notify(title, message, self.config.get("notifications", True))

    def parse_document(self, data, name):
        if len(data) > MAX_HTML:
            raise ValueError("Narration HTML exceeds the 20 MB limit.")
        soup = BeautifulSoup(data.decode("utf-8-sig"), "html.parser")
        path = Path(name)
        ranking = converter.detect_power_ranking(soup, path)
        episode = converter.detect_episode(soup, path, ranking)
        season = converter.detect_season(soup, path, self.site / "src/albums")
        if season < 1:
            raise ValueError("Season must be positive.")
        converter.extract_scenes(soup)
        return soup, season, episode, ranking

    def load_document(self, source, content):
        if source.suffix.lower() == ".html":
            return self.parse_document(content, source.name)
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            html_files = [entry for entry in archive.infolist()
                          if entry.filename.lower().endswith(".html")
                          and not entry.filename.startswith("__MACOSX/")]
            if len(html_files) > 20 or sum(e.file_size for e in html_files) > MAX_INPUT:
                raise ValueError("ZIP contains too much HTML; provide the narration HTML directly.")
            candidates = []
            errors = []
            for entry in html_files:
                try:
                    if entry.file_size > MAX_HTML:
                        raise ValueError("HTML exceeds 20 MB")
                    # Read bytes only: archive paths are never extracted to disk.
                    document = self.parse_document(archive.read(entry), Path(entry.filename).name)
                    candidates.append((entry.filename, document))
                except (ValueError, UnicodeError) as error:
                    errors.append(f"{entry.filename}: {error}")
            if len(candidates) != 1:
                detail = "; ".join(name for name, _ in candidates) or "; ".join(errors)
                raise ValueError(f"Expected one narration HTML in ZIP, found {len(candidates)}. "
                                 f"Place the intended HTML in Inbox directly. {detail}")
            return candidates[0][1]

    def validate(self, markdown, ranking):
        if has_conflict_markers(markdown):
            raise ValueError("Generated Markdown contains conflict markers.")
        data = album_data(markdown, generated=True)
        errors, _, count = validate_structure(data, generated=True, ranking=ranking)
        if errors:
            raise ValueError(" ".join(errors) + " Correct the narration HTML and retry.")
        return count

    def build_supporters(self, season, episode, directory):
        env = dict(os.environ,
                   SUPPORTERS_SEASON=str(season), SUPPORTERS_EPISODE=episode,
                   SUPPORTERS_OUTPUT=str(directory / "supporters.svg"),
                   SUPPORTERS_DOWNLOADS_DIR=str(directory / "downloads"),
                   SUPPORTERS_ALLOW_STALE_ON_FETCH_ERROR="false")
        try:
            subprocess.run(
                [self.config["node"], str(self.site / "scripts/build-supporters-image.js")],
                cwd=self.site, env=env, capture_output=True, text=True, timeout=180, check=True)
        except subprocess.CalledProcessError:
            # Avoid persisting environment values or server response bodies in user logs.
            raise RuntimeError("Supporters generation failed. Check .env.supporters and network "
                               "access, then retry. No album was installed.") from None
        path = directory / "downloads" / f"s{season}ep{episode}-supporters.svg"
        content = path.read_bytes()
        if b"<svg" not in content:
            raise ValueError("Supporters generator did not produce an SVG.")
        return content

    def prepare(self, source, content, digest, released):
        soup, season, episode, ranking = self.load_document(source, content)
        markdown = converter.build_album(soup, season, episode, ranking, released)
        count = self.validate(markdown, ranking)
        body = markdown.encode("utf-8")
        target = converter.output_path(self.site, season, episode, ranking)
        website = target
        label = f"S{season} {'PR' if ranking else 'Episode'} {episode}"
        directory = workspace.folder(self.root, season, episode, ranking)
        review_dir = directory / "revisions" / digest[:12]
        source_copy = directory / "sources" / f"{digest[:12]}-{source.name}"
        publish_file(source_copy, content)
        if target.exists() and target.read_bytes() == body:
            record = {"status": "ready", "release": label, "markdown": str(target),
                      "website_markdown": str(website), "source_copy": str(source_copy),
                      "folder": str(directory),
                      "note": "Markdown already matches; existing release and assets left unchanged."}
            record["check"] = workspace.check(target, directory, self.config, record)
            workspace.save_folder(directory, record, self.config, self.config_path)
            return record
        markdown, terminology_result = terminology.review(
            markdown, self.site, self.automation / "terminology-cache")
        self.validate(markdown, ranking)
        body = markdown.encode("utf-8")
        terminology_report = terminology.write_report(review_dir, terminology_result)
        terminology_summary = {"status": terminology_result["status"],
                               "corrections": terminology_result["corrections"],
                               "unresolved": terminology_result["unresolved"],
                               "markdown_sha256": workspace.sha(body),
                               "report": str(terminology_report)}
        review_needed = target.exists()
        if review_needed:
            target = review_dir / target.name
        supporters_path = None
        if not ranking:
            with tempfile.TemporaryDirectory(prefix="supporters-", dir=self.automation) as temp:
                svg = self.build_supporters(season, episode, Path(temp))
            supporters_path = directory / f"s{season}ep{episode}-supporters.svg"
            if review_needed or (supporters_path.exists() and supporters_path.read_bytes() != svg):
                supporters_path = review_dir / supporters_path.name
            publish_file(supporters_path, svg)
        try:
            publish_file(target, body)
        except FileExistsError:
            # An editor may have created the album while the supporters fetch ran.
            target = review_dir / target.name
            publish_file(target, body)
            review_needed = True
        record = {"status": "review" if review_needed else "ready", "release": label,
                "markdown": str(target), "supporters": str(supporters_path) if supporters_path else None,
                "website_markdown": str(website), "source_copy": str(source_copy), "folder": str(directory),
                "scene_count": count, "release_date": released.isoformat(),
                "terminology": terminology_summary,
                "note": "Review metadata and custom image URLs; upload scene images before publishing."}
        if supporters_path:
            record["supporters_upload"] = workspace.upload_supporters(supporters_path, review_dir, self.config)
        record["check"] = workspace.check(target, directory, self.config, record)
        workspace.save_folder(directory, record, self.config, self.config_path)
        return record

    def check_release(self, source):
        if source.is_dir():
            directory = source
            record = json.loads((directory / "release.json").read_text())
            source = Path(record["markdown"])
        else:
            data = workspace.album_data(source.read_text())
            season, episode, ranking = workspace.identity(source, data)
            directory = workspace.folder(self.root, season, episode, ranking)
            manifest = directory / "release.json"
            record = json.loads(manifest.read_text()) if manifest.exists() else {}
            if record.get("markdown") != str(source):
                # Do not attribute a candidate's AI review to a different file.
                record = {key: value for key, value in record.items()
                          if key not in ("terminology", "status")}
            record.update(markdown=str(source), folder=str(directory),
                          release=f"S{season} {'PR' if ranking else 'Episode'} {episode}")
            website = converter.output_path(self.site, int(season), episode, ranking)
            record["website_markdown"] = str(website)
        result = workspace.check(source, directory, self.config, record)
        record["check"] = result
        workspace.save_folder(directory, record, self.config, self.config_path)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return result

    def recheck_terminology(self, source):
        # Preserve the original bytes, including CRLF and all unrelated fields.
        original = source.read_bytes().decode("utf-8")
        revised, result = terminology.review(original, self.site, self.automation / "terminology-cache")
        data = workspace.album_data(original)
        season, episode, ranking = workspace.identity(source, data)
        directory = workspace.folder(self.root, season, episode, ranking)
        report = terminology.write_report(directory, result)
        candidate = None
        if revised != original:
            candidate = report.parent / source.name
            publish_file(candidate, revised.encode("utf-8"))
        summary = {"status": result["status"], "corrections": result["corrections"],
                   "unresolved": result["unresolved"], "report": str(report),
                   "markdown_sha256": workspace.sha(revised.encode("utf-8")),
                   "candidate": str(candidate) if candidate else None}
        manifest = directory / "release.json"
        record = json.loads(manifest.read_text()) if manifest.exists() else {}
        record.update(markdown=str(candidate or source), terminology=summary,
                      folder=str(directory), release=f"S{season} {'PR' if ranking else 'Episode'} {episode}",
                      website_markdown=str(converter.output_path(self.site, int(season), episode, ranking)),
                      status="review" if candidate else "ready")
        record["check"] = workspace.check(candidate or source, directory, self.config, record)
        workspace.save_folder(directory, record, self.config, self.config_path)
        self.announce("CBR terminology review", self.terminology_message(summary))
        print(json.dumps(summary, indent=2))
        return summary

    @staticmethod
    def terminology_message(summary):
        prefix = "AI review incomplete; " if summary["status"] == "incomplete" else ""
        return (f'{prefix}{summary["corrections"]} corrections, {summary["unresolved"]} unresolved. '
                f'Report: {summary["report"]}')

    def archive_source(self, source, content, digest):
        archive_path = self.archive / f"{digest[:12]}-{source.name}"
        publish_file(archive_path, content)
        if source.exists() and hashlib.sha256(source.read_bytes()).hexdigest() == digest:
            source.unlink()
        return str(archive_path)

    def process(self, source, retry=False):
        initial = signature(source)
        if initial[0] > MAX_INPUT:
            raise ValueError("Input exceeds the 100 MB limit.")
        content = source.read_bytes()
        if signature(source) != initial:
            return  # Copy still in progress; next scan will observe the new signature.
        digest = hashlib.sha256(content).hexdigest()
        previous = self.state["jobs"].get(digest)
        if previous and previous["status"] != "error":
            previous["archive"] = self.archive_source(source, content, digest)
            self.save()
            return previous
        if previous and not retry:
            return previous
        observation = self.state["observations"].get(str(source), {})
        created = getattr(source.stat(), "st_birthtime", observation.get("first_seen", time.time()))
        released = datetime.fromtimestamp(created).date()
        record = {"source": str(source), "hash": digest}
        try:
            record.update(self.prepare(source, content, digest, released))
        except Exception as error:
            record.update(status="error", error=str(error),
                          retry=f'npm run releases:retry -- "{source}"')
        self.state["jobs"][digest] = record
        self.save()
        if record["status"] != "error":
            record["archive"] = self.archive_source(source, content, digest)
            self.save()
            message = f'{record["release"]}: {record.get("folder", record["markdown"])}'
            if record.get("supporters"):
                message += f' | Supporters: {record["supporters"]}'
            if record.get("terminology"):
                message += " | " + self.terminology_message(record["terminology"])
            if record.get("supporters_upload"):
                message += " | Supporters upload: " + record["supporters_upload"]["status"]
            self.announce("CBR release ready for review", message)
        else:
            self.announce("CBR release needs attention", f'{source.name}: {record["error"]}')
        return record

    def scan(self, now=None):
        now = time.time() if now is None else now
        self.inbox.mkdir(parents=True, exist_ok=True)
        observations = self.state["observations"]
        for source in sorted(self.inbox.iterdir()):
            if source.is_symlink() or not source.is_file() or source.suffix.lower() not in (".html", ".zip"):
                continue
            key = str(source)
            current = signature(source)
            previous = observations.get(key)
            if not previous or previous["signature"] != current:
                observations[key] = {"signature": current, "stable_since": now,
                                     "first_seen": previous["first_seen"] if previous else now}
                continue
            if now - previous["stable_since"] >= STABLE_SECONDS:
                try:
                    self.process(source)
                except Exception as error:
                    # Filesystem failures are visible but must not prevent other jobs.
                    if previous.get("error") != str(error):
                        previous["error"] = str(error)
                        self.announce("CBR intake error", f"{source.name}: {error}")
        self.state["observations"] = {key: value for key, value in observations.items() if Path(key).exists()}
        self.save()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("scan", "retry", "status", "check", "terminology", "terminology-eval"))
    parser.add_argument("file", nargs="?")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--open", action="store_true", help="Open the release check report in the browser")
    args = parser.parse_args()
    try:
        intake = Intake(json.loads(args.config.read_text()))
        intake.config_path = args.config.resolve()
        with intake.locked():
            if args.command == "status":
                print(json.dumps(intake.state["jobs"], indent=2, ensure_ascii=False))
            elif args.command == "check":
                if not args.file:
                    parser.error("check requires a Markdown file or release folder")
                result = intake.check_release(Path(args.file).expanduser().absolute())
                if args.open and sys.platform == "darwin":
                    subprocess.run(["/usr/bin/open", result["report"]], check=False)
                return 1 if result["errors"] else 0
            elif args.command == "terminology":
                if not args.file:
                    parser.error("terminology requires a Markdown file path")
                source = Path(args.file).expanduser().resolve()
                if source.suffix.lower() != ".md":
                    parser.error("terminology requires a Markdown file")
                summary = intake.recheck_terminology(source)
                return 0 if summary["status"] == "complete" else 1
            elif args.command == "terminology-eval":
                key, model = terminology.settings(intake.site)
                if not key:
                    raise ValueError("Configure OPENAI_API_KEY in .env.releases before running the evaluation.")
                result = terminology.evaluate(terminology.Client(key, model),
                                              intake.automation / "terminology-cache", force=True)
                print(json.dumps(result, indent=2))
            elif args.command == "retry":
                if not args.file:
                    parser.error("retry requires a file path")
                source = Path(args.file).expanduser().resolve()
                if source.parent != intake.inbox.resolve() or source.suffix.lower() not in (".html", ".zip"):
                    parser.error("retry requires an HTML or ZIP file in the inbox")
                record = intake.process(source, retry=True)
                if record is None or record["status"] == "error":
                    return 1
            else:
                intake.scan()
    except Exception as error:
        print(f"Release intake failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
