#!/usr/bin/env python3
"""Build, configure, or uninstall the CBR Finder upload app."""

import argparse
import json
import os
from pathlib import Path
import plistlib
import platform
import shutil
import subprocess
import sys
import tempfile

from uploader import APP_DIR, CONFIG, Bunny, UploadError, atomic_json

SITE = Path(__file__).resolve().parents[2]
TOOLS = SITE / '.tools/bunny'
VERSION = '0.19.0'
APP = Path.home() / 'Applications/CBR CDN Uploader.app'


def cli_command():
    node = shutil.which('node')
    if not node:
        raise UploadError('Activate your Node installation before setup.')
    return [node, str(TOOLS / 'node_modules/@bunny.net/cli/bin/bunny.cjs')]


def build(config):
    APP_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='cbr-cdn-build-') as temp:
        bundle = Path(temp) / APP.name
        macos, resources = bundle / 'Contents/MacOS', bundle / 'Contents/Resources'
        macos.mkdir(parents=True); resources.mkdir(parents=True)
        executable = macos / 'CBRCDNUploader'
        architecture = 'arm64' if platform.machine() == 'arm64' else 'x86_64'
        subprocess.run(['/usr/bin/swiftc', '-swift-version', '5', '-target', f'{architecture}-apple-macosx13.0', '-O', '-framework', 'AppKit',
                        '-module-cache-path', str(SITE / '.tools/swift-cache'),
                        str(SITE / 'scripts/cdn/Uploader.swift'), '-o', str(executable)], check=True)
        subprocess.run([str(executable), '--make-icon', str(Path(temp) / 'AppIcon.iconset')], check=True)
        subprocess.run(['/usr/bin/iconutil', '-c', 'icns', str(Path(temp) / 'AppIcon.iconset'),
                        '-o', str(resources / 'AppIcon.icns')], check=True)
        launcher = {'python': sys.executable, 'worker': str(SITE / 'scripts/cdn/uploader.py'), 'config': str(CONFIG)}
        (resources / 'launcher.json').write_text(json.dumps(launcher, indent=2))
        info = {'CFBundleExecutable': 'CBRCDNUploader', 'CFBundleIdentifier': 'tv.civbattleroyale.cdn-uploader',
                'CFBundleName': 'CBR CDN Uploader', 'CFBundleDisplayName': 'CBR CDN Uploader',
                'CFBundlePackageType': 'APPL', 'CFBundleShortVersionString': '1.0', 'CFBundleVersion': '1',
                'CFBundleIconFile': 'AppIcon', 'NSHighResolutionCapable': True,
                'LSMinimumSystemVersion': '13.0',
                'NSAppleEventsUsageDescription': 'Read selected image files in Finder when you click Upload to CBR CDN.'}
        (bundle / 'Contents/Info.plist').write_bytes(plistlib.dumps(info))
        entitlements = Path(temp) / 'entitlements.plist'
        entitlements.write_bytes(plistlib.dumps({'com.apple.security.automation.apple-events': True}))
        subprocess.run(['/usr/bin/codesign', '--force', '--sign', '-', '--entitlements', str(entitlements), str(bundle)], check=True)
        # Only replace our own identified app bundle, never an unrelated directory.
        if APP.exists():
            info_path = APP / 'Contents/Info.plist'
            if not info_path.exists() or plistlib.loads(info_path.read_bytes()).get('CFBundleIdentifier') != info['CFBundleIdentifier']:
                raise UploadError(f'An unrelated app exists at {APP}; it was preserved.')
            shutil.rmtree(APP)
        APP.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(bundle, APP)
    atomic_json(CONFIG, config)
    print(f'Installed {APP}')


def configure(config, zone_id=None):
    bunny = Bunny(config)
    zones = bunny.command(['storage', 'zones', 'list'])
    if not isinstance(zones, list):
        raise UploadError('Unexpected Storage Zone list.')
    if zone_id is None:
        pulls = bunny.command(['api', 'GET', '/pullzone'])
        if isinstance(pulls, dict):
            pulls = pulls.get('Items', [])
        matches = [p for p in pulls if isinstance(p, dict) and any(
            str(h.get('Value', '')).lower() == 'cdn.civbattleroyale.tv'
            for h in p.get('Hostnames', []) if isinstance(h, dict))]
        ids = {p.get('StorageZoneId') for p in matches if p.get('StorageZoneId')}
        if len(ids) == 1:
            zone_id = ids.pop()
        else:
            print('Choose the existing Storage Zone serving cdn.civbattleroyale.tv:')
            for zone in zones:
                print(f"  {zone.get('Id')}: {zone.get('Name')}")
            if not sys.stdin.isatty():
                raise UploadError('Could not identify exactly one zone. Run cdn:setup -- --zone-id ID.')
            zone_id = int(input('Storage Zone ID: ').strip())
    zone = next((z for z in zones if z.get('Id') == zone_id), None)
    if not zone:
        raise UploadError('The selected Storage Zone was not found.')
    config.update(zone_id=zone_id, zone_name=zone['Name'])
    # Read-only access check before saving the destination.
    Bunny(config).listing()
    atomic_json(CONFIG, config)
    print(f"Connected {zone['Name']} (ID {zone_id}) → {config['cdn_url']}/")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['install', 'login', 'configure', 'uninstall'])
    parser.add_argument('--zone-id', type=int)
    args = parser.parse_args()
    if sys.platform != 'darwin':
        parser.error('The Finder app requires macOS.')
    try:
        if args.command == 'uninstall':
            if APP.exists():
                info = plistlib.loads((APP / 'Contents/Info.plist').read_bytes())
                if info.get('CFBundleIdentifier') != 'tv.civbattleroyale.cdn-uploader':
                    raise UploadError('App identity mismatch; nothing removed.')
                shutil.rmtree(APP)
            print('App removed. Reports, configuration, Bunny login, and CDN files were preserved.')
            return 0
        config = {'cli_command': cli_command(), 'profile': 'cbr-uploader',
                  'cdn_url': 'https://cdn.civbattleroyale.tv', 'working_directory': str(SITE)}
        if CONFIG.exists():
            existing = json.loads(CONFIG.read_text())
            config.update({k: existing[k] for k in ('zone_id', 'zone_name') if k in existing})
        if args.command == 'install':
            subprocess.run(['npm', 'install', '--prefix', str(TOOLS), '--no-audit', '--no-fund',
                            f'@bunny.net/cli@{VERSION}'], check=True)
            build(config)
            print('Command-drag the app from ~/Applications into the Finder toolbar.')
            print('Complete connection with npm run cdn:login, then npm run cdn:configure.')
        elif args.command == 'login':
            subprocess.run(config['cli_command'] + ['login', '--profile', config['profile'], '--no-install-skill'], check=True)
            configure(config, args.zone_id)
        else:
            configure(config, args.zone_id)
    except (OSError, UploadError, ValueError, subprocess.CalledProcessError) as exc:
        print(str(exc) if isinstance(exc, UploadError) else 'Setup failed; check the preceding step and try again.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
