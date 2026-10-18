#!/usr/bin/env python3
"""Live upload/replace/purge test confined to a unique temporary remote prefix."""

from pathlib import Path
import tempfile
from urllib.parse import quote
from urllib.request import urlopen
import uuid

from uploader import CONFIG, Bunny, UploadError, load_config


def main():
    config = load_config(CONFIG)
    bunny = Bunny(config)
    prefix = '__cbr-uploader-test-' + uuid.uuid4().hex + '/'
    names = ['probe.svg', "spaces % # ' 你好.svg"]
    uploaded = []
    try:
        with tempfile.TemporaryDirectory(prefix='cbr-cdn-smoke-') as temp:
            for name in names:
                path = Path(temp) / name
                content = b'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="orange"/></svg>'
                path.write_bytes(content)
                remote = prefix + quote(name, safe='')
                uploaded.append(remote)  # Also attempt cleanup after an ambiguous upload response.
                bunny.upload(path, remote, 'image/svg+xml')
            files = bunny.listing(prefix)
            if set(files) != set(names):
                raise UploadError('Remote filenames did not exactly match the originals.')
            for name in names:
                url = config['cdn_url'].rstrip('/') + '/' + prefix + quote(name, safe='')
                with urlopen(url, timeout=30) as response:
                    if response.read() != content:
                        raise UploadError('CDN retrieval did not match the uploaded bytes.')
                    if not response.headers.get('Content-Type', '').startswith('image/svg+xml'):
                        raise UploadError('CDN content type did not match the image.')
            print('Verified new uploads, special-character filenames, and CDN retrieval.')
            replacement = content.replace(b'orange', b'blue')
            path = Path(temp) / names[0]
            path.write_bytes(replacement)
            bunny.upload(path, prefix + names[0], 'image/svg+xml')
            url = config['cdn_url'].rstrip('/') + '/' + prefix + names[0]
            bunny.purge(url)
            with urlopen(url, timeout=30) as response:
                if response.read() != replacement:
                    raise UploadError('Replacement is stored, but CDN cache refresh has not completed.')
            print('Verified replacement and exact-URL cache invalidation.')
    finally:
        errors = []
        for remote in uploaded:
            try:
                bunny.command(['storage', 'files', 'remove', remote, '--zone', str(config['zone_id']), '--force'], allow_empty=True)
            except UploadError:
                errors.append(remote)
        if not errors and uploaded:
            # Remove only this run's generated test directory after confirming it is empty.
            try:
                if not bunny.listing(prefix):
                    bunny.command(['storage', 'files', 'remove', prefix, '--zone', str(config['zone_id']), '--force'], allow_empty=True)
            except UploadError:
                errors.append(prefix)
        if errors:
            print('Test cleanup needs attention in the test prefix:', prefix)
            for remote in errors:
                print(remote)
        else:
            print('Removed this test run’s remote objects.')


if __name__ == '__main__':
    main()
