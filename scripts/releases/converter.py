#!/usr/bin/env python3

import argparse
import html
import json
import os
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup, NavigableString, Tag


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_NARRATION_DIR = Path("/Users/coiot/CBRX/Narration")
DEFAULT_SITE_ROOT = Path(
    os.environ.get("CBRX_SITE_ROOT", "/Users/coiot/Sites/cbr-main")
)
EPISODE_PATTERN = r"\d+(?:\.\d+)?"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Convert an exported Google Docs narration to a CBR album page."
    )
    parser.add_argument("input_file", help="HTML file name or absolute path")
    parser.add_argument("--season", type=int, help="Override the detected season")
    parser.add_argument("--episode", help="Override the detected episode number")
    document_type = parser.add_mutually_exclusive_group()
    document_type.add_argument(
        "--power-ranking",
        dest="is_power_ranking",
        action="store_true",
        help="Force Power Rankings output",
    )
    document_type.add_argument(
        "--episode-album",
        dest="is_power_ranking",
        action="store_false",
        help="Force regular episode output",
    )
    parser.set_defaults(is_power_ranking=None)
    parser.add_argument(
        "--release-date",
        default=date.today().isoformat(),
        help="Release date in YYYY-MM-DD format (default: today)",
    )
    parser.add_argument(
        "--site-root",
        type=Path,
        default=DEFAULT_SITE_ROOT,
        help=f"Website repository root (default: {DEFAULT_SITE_ROOT})",
    )
    parser.add_argument("--output", type=Path, help="Override the output Markdown path")
    return parser.parse_args()


def resolve_input_path(value):
    candidate = Path(value).expanduser()
    if candidate.is_absolute():
        return candidate
    return DEFAULT_NARRATION_DIR / candidate


def normalize_episode(value):
    match = re.fullmatch(EPISODE_PATTERN, str(value).strip())
    if not match:
        raise ValueError(f"Invalid episode number: {value}")
    whole, separator, fraction = match.group(0).partition(".")
    whole = str(int(whole))
    fraction = fraction.rstrip("0")
    return whole if not separator or not fraction else f"{whole}.{fraction}"


def heading_texts(soup):
    return [
        heading.get_text(" ", strip=True)
        for heading in soup.find_all(["h1", "h2", "h3", "h4"])
    ]


def labeled_heading(soup, label, fallback_tag=None):
    pattern = re.compile(rf"^{re.escape(label)}\s*:\s*(.*)$", re.IGNORECASE)
    for text in heading_texts(soup):
        match = pattern.match(text)
        if match:
            return match.group(1).strip()
    if fallback_tag:
        heading = soup.find(fallback_tag)
        if heading:
            return heading.get_text(" ", strip=True)
    return ""


def detect_power_ranking(soup, input_path):
    context = " ".join([input_path.stem, *heading_texts(soup)])
    if re.search(r"\bpower\s*rankings?\b", context, re.IGNORECASE):
        return True
    filename = input_path.stem
    return bool(
        re.search(r"^pr\d", filename, re.IGNORECASE)
        or re.search(r"(?:^|[^a-z])s\d+pr\d", filename, re.IGNORECASE)
        or re.search(r"(?:^|[^a-z])pr(?:\d|[^a-z]|$)", filename, re.IGNORECASE)
    )


def detect_season(soup, input_path, albums_dir):
    context = " ".join([input_path.stem, *heading_texts(soup)])
    patterns = (
        r"\bseason\s*([0-9]+)\b",
        r"\bcbrx\s*([0-9]+)\b",
        r"\bx\s*([0-9]+)\b",
        r"(?:^|[^a-z0-9])s([0-9]+)(?:pr|ep|episode|[^a-z0-9]|$)",
    )
    for pattern in patterns:
        match = re.search(pattern, context, re.IGNORECASE)
        if match:
            return int(match.group(1))

    seasons = []
    if albums_dir.is_dir():
        for child in albums_dir.iterdir():
            match = re.fullmatch(r"s([0-9]+)", child.name, re.IGNORECASE)
            if child.is_dir() and match:
                seasons.append(int(match.group(1)))
    if seasons:
        return max(seasons)
    raise ValueError("Unable to detect a season. Pass --season explicitly.")


def detect_episode(soup, input_path, is_power_ranking):
    contexts = heading_texts(soup)
    for context in contexts:
        match = re.search(
            rf"\bepisode\s*({EPISODE_PATTERN})\b", context, re.IGNORECASE
        )
        if match:
            return normalize_episode(match.group(1))

    filename = input_path.stem
    filename_patterns = [rf"episode\s*({EPISODE_PATTERN})"]
    if is_power_ranking:
        filename_patterns.extend(
            [rf"s\d+pr\s*({EPISODE_PATTERN})", rf"^pr\s*({EPISODE_PATTERN})"]
        )
    for pattern in filename_patterns:
        match = re.search(pattern, filename, re.IGNORECASE)
        if match:
            return normalize_episode(match.group(1))
    raise ValueError("Unable to detect an episode number. Pass --episode explicitly.")


def parse_release_date(value):
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError("--release-date must use YYYY-MM-DD format.") from error


def yaml_string(value):
    # JSON strings are valid YAML scalars and safely escape quotes and backslashes.
    return json.dumps(str(value), ensure_ascii=False)


def extract_class_styles(soup):
    class_styles = {}
    for style_tag in soup.find_all("style"):
        css = style_tag.get_text(" ", strip=False)
        for match in re.finditer(r"\.([A-Za-z0-9_-]+)\s*\{([^}]*)\}", css):
            class_styles[match.group(1)] = match.group(2).lower()
    return class_styles


def node_style(node, class_styles):
    styles = []
    for class_name in node.get("class", []):
        if class_name in class_styles:
            styles.append(class_styles[class_name])
    if node.get("style"):
        styles.append(node["style"].lower())
    return ";".join(styles)


def safe_link(value):
    href = str(value or "").strip()
    if not href:
        return ""
    parsed = urlparse(href)
    if parsed.scheme.lower() not in ("", "http", "https", "mailto"):
        return ""
    if parsed.netloc.lower() in ("google.com", "www.google.com") and parsed.path == "/url":
        target = parse_qs(parsed.query).get("q", [""])[0].strip()
        if target:
            return safe_link(target)
    return href


def normalize_markdown_links(value):
    linked = re.sub(
        r'\[([^\]]+)\]\((?:<u>)?<a href="([^"]+)">.*?</a>(?:</u>)?\)',
        lambda match: f'<a href="{match.group(2)}">{match.group(1)}</a>',
        value,
        flags=re.DOTALL,
    )
    return re.sub(
        r"\[([^\]]+)\]\((https?://[^)\s]+)\)",
        lambda match: (
            f'<a href="{html.escape(safe_link(match.group(2)), quote=True)}">'
            f"{match.group(1)}</a>"
        ),
        linked,
    )


def render_node(node, class_styles):
    if isinstance(node, NavigableString):
        return html.escape(str(node), quote=False)
    if not isinstance(node, Tag):
        return ""
    if node.name == "br":
        return "<br>"

    content = "".join(render_node(child, class_styles) for child in node.children)
    style = node_style(node, class_styles)
    font_weight = re.search(r"font-weight\s*:\s*([0-9]+|bold)", style)
    is_bold = node.name in ("b", "strong") or bool(
        font_weight
        and (
            font_weight.group(1) == "bold"
            or int(font_weight.group(1)) >= 600
        )
    )
    is_italic = node.name in ("i", "em") or bool(
        re.search(r"font-style\s*:\s*italic", style)
    )
    is_underlined = node.name == "u" or bool(
        re.search(r"text-decoration[^;]*(?:underline)", style)
    )
    is_struck = node.name in ("s", "strike") or bool(
        re.search(r"text-decoration[^;]*(?:line-through)", style)
    )

    if node.name == "a":
        href = safe_link(node.get("href"))
        if href:
            content = f'<a href="{html.escape(href, quote=True)}">{content}</a>'
    elif node.name == "code":
        content = f"<code>{content}</code>"
    elif node.name == "sub":
        content = f"<sub>{content}</sub>"
    elif node.name == "sup":
        content = f"<sup>{content}</sup>"

    if is_struck:
        content = f"<s>{content}</s>"
    if is_underlined:
        content = f"<u>{content}</u>"
    if is_italic:
        content = f"<em>{content}</em>"
    if is_bold:
        content = f"<strong>{content}</strong>"
    return content


def narration_html(cell, class_styles):
    paragraphs = cell.find_all("p")
    if not paragraphs:
        content = "".join(render_node(child, class_styles) for child in cell.children)
        return normalize_markdown_links(f"<p>{content.strip()}</p>")
    rendered = "".join(
        f'<p>{"".join(render_node(child, class_styles) for child in paragraph.children)}</p>'
        for paragraph in paragraphs
    )
    return normalize_markdown_links(rendered)


def is_table_header(cells):
    values = [
        re.sub(r"[^a-z0-9]+", "", cell.get_text(" ", strip=True).lower())
        for cell in cells
    ]
    if len(values) < 3:
        return False
    title_headers = ("title", "civilization", "civilisation", "civ")
    narration_headers = ("narration", "writeup", "description")
    return any(label in values[1] for label in title_headers) and any(
        label in values[2] for label in narration_headers
    )


def extract_scenes(soup):
    class_styles = extract_class_styles(soup)
    scenes = []
    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 3 or is_table_header(cells):
            continue
        title = cells[1].get_text(" ", strip=True)
        narration = narration_html(cells[2], class_styles)
        if not title and narration == "<p></p>":
            continue
        scenes.append({"title": title, "narration": narration})
    if not scenes:
        raise ValueError("No scene rows were found in the document table.")
    return scenes


def album_title(raw_title, episode, is_power_ranking):
    if is_power_ranking:
        return f"Power Rankings: Episode {episode}"
    cleaned = re.sub(r"^title\s*:\s*", "", raw_title, flags=re.IGNORECASE).strip()
    if re.match(r"^episode\b", cleaned, re.IGNORECASE):
        return cleaned
    return f"Episode {episode}: {cleaned}" if cleaned else f"Episode {episode}"


def build_album(soup, season, episode, is_power_ranking, released):
    title = album_title(labeled_heading(soup, "Title", "h3"), episode, is_power_ranking)
    narrator = labeled_heading(soup, "Narrated by", "h2")
    if is_power_ranking and not narrator:
        narrator = "Power-Rankers"
    description = labeled_heading(soup, "Abstract", "h4")
    scenes = extract_scenes(soup)

    if is_power_ranking:
        album_key = "pr"
        image_base = f"season{season}-pr{episode}"
        hero_scene = "01"
    else:
        album_key = "edition"
        image_base = f"cbrx-season{season}-episode{episode}"
        hero_scene = "06"

    lines = [
        "---",
        f"title: {yaml_string(title)}",
        f"narrated_by: {yaml_string(narrator)}",
        f"description: {yaml_string(description)}",
        f"release_date: {released.strftime('%B %d, %Y')}",
        f"{album_key}: S{season}",
        f"date: {released.isoformat()}T00:00:00.000Z",
        f"image: https://cdn.civbattleroyale.tv/{image_base}-scene{hero_scene}.jpeg",
        "scenes:",
    ]

    for index, scene_data in enumerate(scenes, start=1):
        scene = f"{index:02d}"
        if not is_power_ranking and index == 4:
            media_line = (
                "  slide_svg: https://cdn.civbattleroyale.tv/"
                f"s{season}ep{episode}-supporters.svg"
            )
        else:
            media_line = (
                "  slide_url: https://cdn.civbattleroyale.tv/"
                f"{image_base}-scene{scene}.jpeg"
            )
        lines.extend(
            [
                f"- scene_number: {scene}",
                f"  scene_title: {yaml_string(scene_data['title'])}",
                media_line,
                f"  narration: {yaml_string(scene_data['narration'])}",
            ]
        )
    lines.append("---")
    return "\n".join(lines) + "\n"


def output_path(site_root, season, episode, is_power_ranking, override=None):
    if override:
        return override.expanduser().resolve()
    albums_dir = site_root / "src" / "albums"
    if is_power_ranking:
        return albums_dir / "pr" / f"s{season}pr{episode}.md"
    return albums_dir / f"s{season}" / f"Episode{episode}.md"


def main():
    args = parse_args()
    input_path = resolve_input_path(args.input_file)
    if not input_path.is_file():
        print(f"Error: File {input_path} not found.", file=sys.stderr)
        return 1

    site_root = args.site_root.expanduser().resolve()
    albums_dir = site_root / "src" / "albums"
    try:
        with input_path.open("r", encoding="utf-8") as source:
            soup = BeautifulSoup(source, "html.parser")
        is_power_ranking = (
            args.is_power_ranking
            if args.is_power_ranking is not None
            else detect_power_ranking(soup, input_path)
        )
        season = args.season or detect_season(soup, input_path, albums_dir)
        if season < 1:
            raise ValueError("Season must be a positive number.")
        episode = (
            normalize_episode(args.episode)
            if args.episode is not None
            else detect_episode(soup, input_path, is_power_ranking)
        )
        released = parse_release_date(args.release_date)
        markdown = build_album(
            soup, season, episode, is_power_ranking, released
        )
        destination = output_path(
            site_root, season, episode, is_power_ranking, args.output
        )
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(markdown, encoding="utf-8")
    except (OSError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    album_type = "Power Rankings" if is_power_ranking else "episode"
    print(
        f"Converted {input_path.name} to Season {season} {album_type} {episode}."
    )
    print(f"Wrote {destination}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
