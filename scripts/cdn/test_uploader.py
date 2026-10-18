import json
import os
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch

from uploader import Batch, Bunny, Interrupted, UploadError, batch_lock, inspect_selection, load_config


class FakeBunny:
    def __init__(self, listings=None):
        self.cancelled = threading.Event()
        self.listings = list(listings or [{}, {}])
        self.uploads, self.purges = [], []
        self.fail_upload = False
        self.fail_purge = False

    def listing(self):
        return self.listings.pop(0) if len(self.listings) > 1 else self.listings[0]

    def upload(self, source, remote, content_type):
        self.uploads.append((str(source), remote, content_type))
        if self.fail_upload:
            raise UploadError('Checksum verification failed.')

    def purge(self, url):
        self.purges.append(url)
        if self.fail_purge:
            raise UploadError('Purge failed.')

    def cancel(self):
        self.cancelled.set()


class UploaderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.config = {'cli_command': ['bunny'], 'profile': 'cbr-uploader', 'zone_id': 123,
                       'zone_name': 'cbr', 'cdn_url': 'https://cdn.civbattleroyale.tv',
                       'working_directory': str(self.root)}
        self.fake = FakeBunny()
        self.events = []
        self.batch = Batch(self.config, self.root / 'reports', self.events.append, self.fake)

    def file(self, name='image.svg'):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
        return str(path)

    def test_selected_names_types_and_no_local_mutation(self):
        names = ['photo space.png', "quote'#%你好.svg", '`touch HACK`.jpg', '-option.webp']
        paths = [self.file(name) for name in names]
        before = [Path(path).read_bytes() for path in paths]
        result = self.batch.run(self.batch.plan(paths), 'skip')
        self.assertEqual(result['counts']['uploaded'], 4)
        self.assertEqual([Path(path).read_bytes() for path in paths], before)
        self.assertEqual({row['name'] for row in result['files']}, set(names))
        self.assertIn("quote%27%23%25%E4%BD%A0%E5%A5%BD.svg", {args[1] for args in self.fake.uploads})
        self.assertFalse((self.root / 'HACK').exists())
        self.assertEqual(self.fake.purges, [])
        self.assertTrue(Path(result['report']).exists())

    def test_invalid_selections_and_duplicate_basenames(self):
        image = self.file()
        self.file('unsupported.txt')
        files, invalid = inspect_selection([image, image, str(self.root), str(self.root / 'unsupported.txt')])
        self.assertEqual(len(files), 1)
        self.assertEqual(len(invalid), 2)
        with self.assertRaises(UploadError):
            self.batch.plan([image, self.file('other/image.svg')])
        with self.assertRaises(UploadError):
            self.batch.plan([])

    def test_conflicts_detected_before_any_upload(self):
        self.fake.listings = [{'image.svg': {'isDirectory': False}}]
        plan = self.batch.plan([self.file()])
        self.assertEqual(plan['conflicts'], ['image.svg'])
        self.assertFalse(self.fake.uploads)

    def test_skip_existing_and_new_conflicts(self):
        first = {'image.svg': {'isDirectory': False}}
        self.fake.listings = [first, {**first, 'new.svg': {'isDirectory': False}}]
        result = self.batch.run(self.batch.plan([self.file(), self.file('new.svg')]), 'skip')
        self.assertEqual(result['counts']['skipped'], 2)
        self.assertFalse(self.fake.uploads)

    def test_replace_and_cache_purge(self):
        self.fake.listings = [{'image.svg': {'isDirectory': False}}]
        result = self.batch.run(self.batch.plan([self.file()]), 'replace')
        self.assertEqual(result['counts']['replaced'], 1)
        self.assertEqual(self.fake.purges, ['https://cdn.civbattleroyale.tv/image.svg'])
        self.assertEqual(result['purge_failures'], 0)

    def test_purge_failure_is_separate_from_upload_failure(self):
        self.fake.listings = [{'image.svg': {'isDirectory': False}}]
        self.fake.fail_purge = True
        result = self.batch.run(self.batch.plan([self.file()]), 'replace')
        self.assertEqual(result['counts']['replaced'], 1)
        self.assertEqual(result['purge_failures'], 1)
        self.assertEqual(len(result['urls']), 1)

    def test_checksum_failure_is_never_success(self):
        self.fake.fail_upload = True
        result = self.batch.run(self.batch.plan([self.file()]), 'skip')
        self.assertEqual(result['counts']['failed'], 1)
        self.assertEqual(result['urls'], [])

    def test_cancel_before_and_during_transfer(self):
        result = self.batch.run(self.batch.plan([self.file()]), 'cancel')
        self.assertEqual(result['counts']['cancelled'], 1)
        self.assertFalse(self.fake.uploads)
        self.fake.cancelled.clear()
        def interrupted(*args):
            self.fake.cancel()
            raise Interrupted('Interrupted transfer')
        self.fake.upload = interrupted
        result = self.batch.run(self.batch.plan([self.file()]), 'skip')
        self.assertEqual(result['counts']['uncertain'], 1)
        self.assertEqual(result['urls'], [])

    def test_changed_file_and_remote_directory_preserved(self):
        path = self.file()
        plan = self.batch.plan([path])
        Path(path).write_text('Changed')
        result = self.batch.run(plan, 'skip')
        self.assertEqual(result['counts']['failed'], 1)
        self.assertFalse(self.fake.uploads)
        self.fake.listings = [{'image.svg': {'isDirectory': True}}]
        result = self.batch.run(self.batch.plan([self.file()]), 'replace')
        self.assertEqual(result['counts']['skipped'], 1)

    def test_batch_lock_and_config_validation(self):
        with batch_lock(self.root):
            with self.assertRaises(UploadError):
                with batch_lock(self.root):
                    self.fail('Overlapping batch accepted')
        config = self.root / 'config.json'
        with self.assertRaises(UploadError):
            load_config(config)
        config.write_text(json.dumps(self.config))
        self.assertEqual(load_config(config)['zone_id'], 123)
        bad = dict(self.config, cdn_url='https://example.com/path')
        config.write_text(json.dumps(bad))
        with self.assertRaises(UploadError):
            load_config(config)

    def test_cli_arguments_are_not_shell_commands_and_env_is_scoped(self):
        script = self.root / 'fake.py'
        script.write_text('import sys,json,os; print(json.dumps({"argv":sys.argv[1:],"secret_override":os.getenv("BUNNYNET_API_KEY")}))')
        config = dict(self.config, cli_command=[sys.executable, str(script)])
        with patch.dict(os.environ, {'BUNNYNET_API_KEY': 'must-not-use'}):
            result = Bunny(config).command(['api', 'GET', '/literal/$(touch HACK)'])
        self.assertEqual(result['argv'][:3], ['api', 'GET', '/literal/$(touch HACK)'])
        self.assertIn('cbr-uploader', result['argv'])
        self.assertIsNone(result['secret_override'])
        self.assertFalse((self.root / 'HACK').exists())

    def test_upload_uses_checksum_and_rejects_ambiguous_success(self):
        bunny = Bunny(self.config)
        with patch.object(bunny, 'command', return_value={'uploaded': True, 'path': 'image.svg'}) as command:
            bunny.upload(Path('/tmp/image.svg'), 'image.svg', 'image/svg+xml')
            self.assertIn('--checksum', command.call_args.args[0])
            self.assertIn('--content-type', command.call_args.args[0])
        with patch.object(bunny, 'command', return_value={'uploaded': True, 'path': 'wrong.svg'}):
            with self.assertRaises(Interrupted):
                bunny.upload(Path('/tmp/image.svg'), 'image.svg', 'image/svg+xml')

    def test_authentication_errors_are_sanitized_and_listing_fails_closed(self):
        script = self.root / 'error.py'
        script.write_text('import sys; print("401 sensitive-api-key",file=sys.stderr); sys.exit(1)')
        config = dict(self.config, cli_command=[sys.executable, str(script)])
        with self.assertRaises(UploadError) as caught:
            Bunny(config).command(['storage', 'files', 'list'])
        self.assertNotIn('sensitive-api-key', str(caught.exception))
        self.assertIn('authentication', str(caught.exception))
        with patch.object(Bunny, 'command', return_value={'error': 'bad listing'}):
            with self.assertRaises(UploadError):
                Bunny(self.config).listing()

    def test_timeout_kills_only_the_child_process_group(self):
        script = self.root / 'slow.py'
        script.write_text('import time; time.sleep(60)')
        bunny = Bunny(dict(self.config, cli_command=[sys.executable, str(script)]))
        with self.assertRaises(Interrupted):
            bunny.command(['anything'], timeout=0.05)
        self.assertEqual(len(bunny.processes), 0)

    def test_html_report_escapes_names_and_errors(self):
        result = self.batch.run(self.batch.plan([self.file('<script>.svg')]), 'skip')
        html = Path(result['report']).read_text()
        self.assertNotIn('<script>', html)
        self.assertIn('&lt;script&gt;', html)


if __name__ == '__main__':
    unittest.main()
