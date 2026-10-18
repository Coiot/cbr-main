"""Shared structural checks, with strict import and editorial-review policies."""

import yaml

REQUIRED_METADATA = ("title", "narrated_by", "description", "image", "release_date", "date")


def has_conflict_markers(markdown):
    return any(line.startswith(("<<<<<<<", "=======", ">>>>>>>")) for line in markdown.splitlines())


def album_data(markdown, *, generated=False):
    lines = markdown.splitlines()
    if not lines or lines[0] != "---":
        raise ValueError("Missing opening front matter delimiter.")
    try:
        end = lines.index("---", 1)
    except ValueError:
        raise ValueError("Missing closing front matter delimiter.") from None
    if generated and end != len(lines) - 1:
        raise ValueError("Generated album contains content outside its front matter.")
    data = yaml.safe_load("\n".join(lines[1:end]))
    if not isinstance(data, dict):
        raise ValueError("Album front matter must be a mapping.")
    return data


def validate_structure(data, *, generated=False, ranking=False):
    errors, warnings = [], []
    for field in REQUIRED_METADATA:
        if not data.get(field):
            errors.append(f"Missing {field}.")
    scenes = data.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        errors.append("No scenes found.")
        return errors, warnings, 0
    if generated and len(scenes) < (1 if ranking else 6):
        errors.append("Too few scenes for the standard cover/supporters layout.")
    seen = {}
    for index, scene in enumerate(scenes, 1):
        if not isinstance(scene, dict):
            errors.append(f"Scene {index} is not a mapping.")
            continue
        try:
            valid_number = int(str(scene.get("scene_number", ""))) == index
        except ValueError:
            valid_number = False
        if not valid_number:
            errors.append(f"Scene {index} has a missing, duplicate, or out-of-order number.")
        for field in ("scene_title", "narration"):
            if not str(scene.get(field) or "").strip():
                warnings.append(f"Scene {index}: empty {field}.")
        url = scene.get("slide_svg") or scene.get("slide_url")
        if not url:
            (errors if generated else warnings).append(f"Scene {index}: image URL still needs to be entered.")
        elif str(url) in seen:
            warnings.append(f"Scenes {seen[str(url)]} and {index} share an image URL; confirm this is intentional.")
        else:
            seen[str(url)] = index
    return errors, warnings, len(scenes)
