"""Atomic file writes shared by release preparation and CDN tooling."""

import json
import os
from pathlib import Path
import tempfile


def atomic_write(path, content, *, overwrite=True):
    """Publish complete bytes; exclusive writes preserve existing edited files."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not overwrite and path.exists():
        if path.read_bytes() == content:
            return
        raise FileExistsError(f"Existing file left unchanged: {path}")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        if overwrite:
            os.replace(temporary, path)
        else:
            os.link(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def atomic_json(path, data):
    atomic_write(path, (json.dumps(data, indent=2, ensure_ascii=False) + "\n").encode("utf-8"))


def write_text(path, text):
    atomic_write(path, text.encode("utf-8"))


def publish_file(path, content):
    atomic_write(path, content, overwrite=False)
