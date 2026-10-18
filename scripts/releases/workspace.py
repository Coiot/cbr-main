"""Release folders, local checks, Reddit drafts, and supporters upload receipts."""

from datetime import datetime
import hashlib
from html import escape
import json
from pathlib import Path
import re
import shlex
import sys
from urllib.parse import urlparse

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from cdn import uploader
from automation_files import atomic_json, write_text
from validation import album_data, has_conflict_markers, validate_structure

MEGATHREADS = {"5": "https://www.reddit.com/r/civbattleroyale/comments/1jalax7/cbrx_season_5_megathread/"}


def sha(content):
    return hashlib.sha256(content).hexdigest()


def identity(source, data):
    episode = re.fullmatch(r"Episode(\d+(?:\.\d+)?)\.md", source.name)
    ranking = re.fullmatch(r"s([1-9]\d*)pr(\d+(?:\.\d+)?)\.md", source.name)
    season = re.fullmatch(r"S([1-9]\d*)", str(data.get("pr" if ranking else "edition", "")))
    if not season or not (episode or ranking):
        raise ValueError("Expected EpisodeN.md with edition: SN, or sNprN.md with pr: SN.")
    if ranking and season[1] != ranking[1]:
        raise ValueError("Season in filename and metadata disagree.")
    if episode and re.fullmatch(r"s\d+", source.parent.name) and source.parent.name != "s" + season[1]:
        raise ValueError("Season folder and metadata disagree.")
    return season[1], ranking[2] if ranking else episode[1], bool(ranking)


def folder(root, season, episode, ranking):
    return root / "Releases" / f"s{season}-{'pr' if ranking else 'ep'}{episode}"


def upload_supporters(path, directory, config):
    """Use the Finder uploader's checksum and lock, always preserving existing assets."""
    receipt = directory / "supporters-upload.json"
    digest = sha(path.read_bytes())
    if receipt.exists():
        previous = json.loads(receipt.read_text())
        if previous.get("sha256") == digest and previous.get("status") == "uploaded":
            return previous
    result = {"source": str(path), "sha256": digest}
    try:
        config_path = Path(config.get("cdn_config", uploader.CONFIG))
        settings = uploader.load_config(config_path)
        if settings["cdn_url"].rstrip("/") != "https://cdn.civbattleroyale.tv":
            raise uploader.UploadError("Configured CDN does not match the release's CDN.")
        with uploader.batch_lock(config_path.parent):
            batch = uploader.Batch(settings, directory / "uploads")
            report = batch.run(batch.plan([path]), "skip")
        row = report["files"][0]
        result.update(status=row["status"], message=row["message"],
                      report=report["report"], url=row.get("url"))
    except (OSError, ValueError, KeyError, uploader.UploadError):
        result.update(status="failed", message="Automatic upload could not complete. Use the Finder uploader to retry; the local SVG is preserved.")
    atomic_json(receipt, result)
    return result


def md_text(value):
    value = " ".join(str(value).split())
    return re.sub(r"([\\`*_{}\[\]<>])", r"\\\1", value)


def reddit_text(data, season, episode, ranking, config):
    title = md_text(data["title"])
    narrator = md_text(data["narrated_by"])
    route = f"pr/s{season}pr{episode}" if ranking else f"s{season}/Episode{episode}"
    thread = config.get("season_megathreads", MEGATHREADS).get(str(season))
    text = (f"## CBRX Season {season}: {title}\n\n---\n\n"
            f"## **[Image Album Narrated by {narrator}](https://civbattleroyale.tv/albums/{route}/)**\n\n"
            "---\n\n[Support us on Ko-Fi](https://ko-fi.com/coiot)\n")
    if thread and urlparse(thread).scheme == "https":
        text += f"\n[Season {season} Megathread]({thread})\n"
    return text, bool(thread and urlparse(thread).scheme == "https")


def check(source, directory, config, record=None):
    """No network requests, AI calls, uploads, Git writes, or image existence checks."""
    record = record or {}
    raw = source.read_bytes()
    errors, warnings = [], []
    draft = None
    scene_count = 0
    try:
        text = raw.decode("utf-8")
        if has_conflict_markers(text):
            errors.append("Unresolved merge conflict markers.")
        data = album_data(text)
        season, episode, ranking = identity(source, data)
        structural_errors, structural_warnings, scene_count = validate_structure(data)
        errors.extend(structural_errors)
        warnings.extend(structural_warnings)
        expected = f"Power Rankings: Episode {episode}" if ranking else f"Episode {episode}"
        if not re.match(re.escape(expected) + r"(?:\s*:|$)", str(data.get("title", ""))):
            errors.append("Episode number in title does not match the album filename.")
        try:
            date = datetime.fromisoformat(str(data["date"]).replace("Z", "+00:00")).date()
            friendly = datetime.strptime(str(data["release_date"]), "%B %d, %Y").date()
            if date != friendly:
                errors.append("date and release_date disagree.")
        except (ValueError, KeyError, TypeError):
            errors.append("Release dates are missing or invalid.")
        if data.get("title") and data.get("narrated_by"):
            draft, has_thread = reddit_text(data, season, episode, ranking, config)
            if not has_thread:
                warnings.append(f"No Season {season} megathread configured; add its link to the Reddit draft.")
    except (ValueError, TypeError, yaml.YAMLError) as exc:
        errors.append(str(exc))
    review = record.get("terminology")
    if not review:
        warnings.append("No terminology review is recorded for this Markdown.")
    elif review.get("markdown_sha256") != sha(raw):
        warnings.append("Markdown has changed since its terminology review; recheck terminology if narration or titles changed.")
    elif review.get("status") != "complete" or review.get("unresolved", 0):
        warnings.append(f"Terminology review: {review.get('status')}, {review.get('unresolved', 0)} unresolved passages.")
    upload = record.get("supporters_upload")
    if upload and upload.get("status") != "uploaded":
        warnings.append("Supporters upload needs attention: " + upload.get("message", upload["status"]))
    if record.get("status") == "review":
        warnings.append("This is a revised candidate. Compare it with the website Markdown before applying it.")
    # Preserve each generated version so edited Reddit drafts are never overwritten.
    result = {"markdown": str(source), "sha256": sha(raw), "errors": errors,
              "warnings": warnings, "scene_count": scene_count,
              "status": "errors" if errors else "review" if warnings else "passed"}
    version = sha(json.dumps([result, draft], sort_keys=True).encode())[:16]
    output = directory / "checks" / version
    atomic_json(output / "check.json", result)
    if draft is not None and not (output / "reddit.md").exists():
        write_text(output / "reddit.md", draft)
    items = "".join(f"<li>{escape(message)}</li>" for message in errors + warnings)
    body = (f"<h1>Check release: {escape(result['status'])}</h1><p>{scene_count} scenes. "
            "CDN image availability is not checked.</p><ul>" + items + "</ul>")
    if draft is not None:
        body += ('<h2>Reddit post</h2><p><a href="reddit.md">Open Markdown</a> · '
                 'Select and copy the text below.</p><textarea readonly rows="17" style="width:100%">' +
                 escape((output / "reddit.md").read_text()) + '</textarea>')
    write_text(output / "check.html", page("Check release", body))
    return dict(result, report=str(output / "check.html"),
                reddit=str(output / "reddit.md") if draft is not None else None)


def page(title, body):
    return ('<!doctype html><meta charset="utf-8"><title>' + escape(title) + '</title>'
            '<style>body{font:16px/1.6 system-ui;max-width:960px;margin:40px auto;padding:0 20px}'
            'textarea{box-sizing:border-box;font:14px/1.6 monospace}a{overflow-wrap:anywhere}</style>' + body)


def save_folder(directory, record, config, config_path):
    directory.mkdir(parents=True, exist_ok=True)
    atomic_json(directory / "release.json", record)
    links = [("Website Markdown", record.get("website_markdown")),
             ("Markdown to review", record.get("markdown")), ("Original source", record.get("source_copy")),
             ("Supporters SVG", record.get("supporters")),
             ("Terminology review", record.get("terminology", {}).get("report")),
             ("Supporters upload", record.get("supporters_upload", {}).get("report")),
             ("Release check", record.get("check", {}).get("report")),
             ("Reddit Markdown", record.get("check", {}).get("reddit"))]
    body = f"<h1>{escape(record.get('release', directory.name))}</h1><ul>"
    body += "".join(f'<li><a href="{escape(Path(path).as_uri(), quote=True)}">{label}</a></li>'
                    for label, path in links if path)
    body += "</ul><p>Double-click <b>Check release.command</b> in this folder after editing the Markdown to refresh the check and Reddit draft.</p>"
    write_text(directory / "index.html", page("CBR release", body))
    command = [str(Path(sys.executable).absolute()), str(Path(__file__).with_name("intake.py")),
               "check", str(directory), "--config", str(config_path), "--open"]
    action = directory / "Check release.command"
    write_text(action, "#!/bin/sh\nexec " + shlex.join(command) + "\n")
    action.chmod(0o755)
    shortcuts = {"Reddit.md": record.get("check", {}).get("reddit"),
                 "Check release.html": record.get("check", {}).get("report")}
    for name, destination in shortcuts.items():
        link = directory / name
        if link.is_symlink():
            link.unlink()
        if destination and not link.exists():
            link.symlink_to(destination)
    website = record.get("website_markdown")
    if website:
        link = directory / Path(website).name
        if not link.exists() and not link.is_symlink():
            link.symlink_to(website)
