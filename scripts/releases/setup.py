#!/usr/bin/env python3
"""Install or remove the current user's CBR release inbox LaunchAgent."""

import argparse
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys

SITE = Path(__file__).resolve().parents[2]
LABEL = "tv.civbattleroyale.release-inbox"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("install", "uninstall"))
    parser.add_argument("--narration-dir", type=Path, default=Path.home() / "CBRX/Narration")
    parser.add_argument("--downloads-dir", type=Path, default=Path.home() / "Downloads")
    args = parser.parse_args()
    if sys.platform != "darwin":
        parser.error("The background job requires macOS; intake.py can be run manually elsewhere.")
    plist = Path.home() / "Library/LaunchAgents" / f"{LABEL}.plist"
    domain = f"gui/{os.getuid()}"
    if args.command == "uninstall":
        subprocess.run(["launchctl", "bootout", f"{domain}/{LABEL}"], capture_output=True)
        plist.unlink(missing_ok=True)
        print("Removed CBR release background job. Inputs, outputs, and history were preserved.")
        return

    node = shutil.which("node")
    if not node:
        parser.error("Node.js is required. Activate the website's Node installation first.")
    version = tuple(map(int, subprocess.check_output(
        [node, "-p", "process.versions.node"], text=True).strip().split(".")))
    if not (20, 19, 0) <= version < (23, 0, 0):
        parser.error("Use the website's supported Node version (20.19 through 22.x).")
    if not (SITE / "node_modules/dotenv").exists():
        parser.error("Install the website's npm dependencies first.")
    venv = SITE / ".venv-release"
    if not (venv / "bin/python").exists():
        subprocess.run([sys.executable, "-m", "venv", str(venv)], check=True)
    python = venv / "bin/python"
    subprocess.run([str(python), "-m", "pip", "install", "-r",
                    str(SITE / "scripts/releases/requirements.txt")], check=True)
    # Create only an empty template; API keys are entered locally by the user.
    env_file = SITE / ".env.releases"
    if not env_file.exists():
        fd = os.open(env_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as handle:
            handle.write((SITE / ".env.releases.example").read_text())
    root = args.narration_dir.expanduser().resolve()
    automation = root / "Automation"
    for path in (root / "Inbox", root / "Archive", root / "Review", root / "Releases", automation):
        path.mkdir(parents=True, exist_ok=True)
    config_path = automation / "config.json"
    config = json.loads(config_path.read_text()) if config_path.exists() else {}
    config.update({"site_root": str(SITE), "narration_dir": str(root),
                                      "downloads_dir": str(args.downloads_dir.expanduser().resolve()),
                                      "node": node})
    config.setdefault("notifications", True)
    config_path.write_text(json.dumps(config, indent=2) + "\n")
    job = {
        "Label": LABEL,
        "ProgramArguments": [str(python), str(SITE / "scripts/releases/intake.py"),
                             "scan", "--config", str(config_path)],
        "WorkingDirectory": str(SITE),
        "StartInterval": 15,
        "RunAtLoad": True,
        "ProcessType": "Background",
        "EnvironmentVariables": {"PATH": f"{Path(node).parent}:/usr/bin:/bin:/usr/sbin:/sbin",
                                 "PYTHONUNBUFFERED": "1"},
        "StandardOutPath": str(automation / "intake.log"),
        "StandardErrorPath": str(automation / "intake-error.log"),
    }
    plist.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["launchctl", "bootout", f"{domain}/{LABEL}"], capture_output=True)
    plist.write_bytes(plistlib.dumps(job))
    subprocess.run(["launchctl", "bootstrap", domain, str(plist)], check=True)
    print(f"Installed {LABEL}. Drop narration HTML or ZIP files into {root / 'Inbox'}.")
    print(f"History: {automation / 'state.json'}")


if __name__ == "__main__":
    main()
