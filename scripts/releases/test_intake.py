from datetime import date
import io
import os
from pathlib import Path
import subprocess
import shutil
import tempfile
import unittest
from unittest.mock import patch
import zipfile

import converter
from intake import Intake, publish_file

SITE = Path(__file__).resolve().parents[2]


def html(episode=35, ranking=False):
    title = f"Power Rankings: Episode {episode}" if ranking else 'A "New" World'
    return (f'<h1>Season 5 Episode {episode}</h1><h2>Narrated by: Tester</h2>'
            f'<h3>Title: {title}</h3><h4>Abstract: A test.</h4>'
            '<table><tr><td>Slide</td><td>Title</td><td>Narration</td></tr>' +
            ''.join(f'<tr><td>{i}</td><td>Scene {i}</td><td><p><b>Bold</b> '
                    '<i>italic</i> <a href="https://example.com">link</a></p></td></tr>'
                    for i in range(1, 7)) + '</table>').encode()


def zipped(files):
    data = io.BytesIO()
    with zipfile.ZipFile(data, "w") as z:
        for name, content in files.items():
            z.writestr(name, content)
    return data.getvalue()


class IntakeTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.config = {"narration_dir": str(self.base / "Narration"),
                       "site_root": str(self.base / "site"),
                       "downloads_dir": str(self.base / "Downloads"),
                       "cdn_config": str(self.base / "missing-cdn-config.json"),
                       "node": "node", "notifications": False}
        self.intake = Intake(self.config)
        self.intake.inbox.mkdir(parents=True)
        (self.intake.site / "src/albums/s5").mkdir(parents=True)
        self.supporters = patch.object(Intake, "build_supporters", return_value=b'<svg>fresh</svg>').start()
        self.addCleanup(patch.stopall)

    def put(self, name="Episode 35 Narration.html", content=None):
        path = self.intake.inbox / name
        path.write_bytes(html() if content is None else content)
        return path

    def run_scan(self, now):
        with self.intake.locked():
            self.intake.scan(now)

    def test_episode_and_restart(self):
        source = self.put()
        self.run_scan(100)
        self.assertTrue(source.exists())
        self.intake = Intake(self.config)
        self.run_scan(115)
        target = self.intake.site / "src/albums/s5/Episode35.md"
        text = target.read_text()
        self.assertIn('<strong>Bold</strong>', text)
        self.assertIn('<em>italic</em>', text)
        self.assertIn('https://example.com', text)
        self.assertIn('s5ep35-supporters.svg', text)
        self.assertFalse(source.exists())
        folder = self.intake.root / "Releases/s5-ep35"
        self.assertTrue((folder / "s5ep35-supporters.svg").is_file())
        self.assertTrue((folder / "Episode35.md").is_symlink())
        self.assertTrue((folder / "Check release.command").exists())
        self.assertEqual(len(list(folder.glob("checks/*/reddit.md"))), 1)
        self.supporters.assert_called_once()
        self.assertEqual(len(list(self.intake.archive.iterdir())), 1)

    def test_duplicate_and_revision(self):
        self.put()
        self.run_scan(100); self.run_scan(115)
        target = self.intake.site / "src/albums/s5/Episode35.md"
        target.write_text(target.read_text() + "editor change\n")
        self.put("Episode 35 Narration (1).html")
        self.run_scan(130); self.run_scan(145)
        self.assertEqual(self.supporters.call_count, 1)
        changed = html().replace(b'A "New" World', b'Changed title')
        self.put(content=changed)
        self.run_scan(160); self.run_scan(175)
        self.assertTrue(target.read_text().endswith("editor change\n"))
        self.assertEqual(len(list((self.intake.root / 'Releases/s5-ep35').glob('revisions/*/Episode35.md'))), 1)

    def test_zip_rankings_and_no_extraction(self):
        self.put("PR Episode 35 Narration.zip", zipped({"../../evil.html": html(ranking=True)}))
        self.run_scan(100); self.run_scan(115)
        self.assertTrue((self.intake.site / "src/albums/pr/s5pr35.md").exists())
        self.assertFalse((self.base / 'evil.html').exists())
        self.supporters.assert_not_called()

    def test_ambiguous_and_invalid_files(self):
        for name, content in [("ambiguous.zip", zipped({"a.html": html(), "b.html": html(36)})),
                              ("bad.html", b'<html>not narration</html>'),
                              ("bad.zip", b'broken zip')]:
            self.put(name, content)
        self.run_scan(100); self.run_scan(115)
        self.assertEqual(len(self.intake.state['jobs']), 3)
        self.assertTrue(all(j['status'] == 'error' for j in self.intake.state['jobs'].values()))
        self.assertFalse(list((self.intake.site / 'src/albums/s5').iterdir()))

    def test_copy_stability_and_unrelated_files(self):
        source = self.put(content=b'<html>')
        self.put('download.crdownload', html())
        self.run_scan(100)
        source.write_bytes(html())
        self.run_scan(115)
        self.assertFalse(self.intake.state['jobs'])
        self.run_scan(130)
        self.assertEqual(len(self.intake.state['jobs']), 1)
        self.assertTrue((self.intake.inbox / 'download.crdownload').exists())

    def test_supporters_failure_and_retry(self):
        source = self.put()
        self.supporters.side_effect = RuntimeError('Supporters fetch failed')
        self.run_scan(100); self.run_scan(115); self.run_scan(130)
        self.assertEqual(self.supporters.call_count, 1)
        self.assertTrue(source.exists())
        self.assertFalse(list((self.intake.site / 'src/albums/s5').iterdir()))
        self.supporters.side_effect = None
        with self.intake.locked():
            self.intake.process(source, retry=True)
        self.assertFalse(source.exists())

    def test_release_date_and_validation(self):
        soup, season, episode, ranking = self.intake.parse_document(html(), 'episode.html')
        markdown = converter.build_album(soup, season, episode, ranking, date(2026, 10, 13))
        self.assertIn('release_date: October 13, 2026', markdown)
        self.assertEqual(self.intake.validate(markdown, False), 6)
        self.assertEqual(self.intake.validate(markdown.replace('A test.', 'A --- test.'), False), 6)
        with self.assertRaises(ValueError):
            self.intake.validate(markdown.replace('narrated_by: "Tester"', 'narrated_by: ""'), False)
        with self.assertRaises(ValueError):
            self.intake.validate(markdown + '\n<<<<<<< HEAD', False)

    def test_no_overwrite(self):
        path = self.base / 'existing.md'
        path.write_bytes(b'hand edited')
        with self.assertRaises(FileExistsError):
            publish_file(path, b'generated')
        self.assertEqual(path.read_bytes(), b'hand edited')

    def test_simultaneous_scans_are_locked(self):
        with self.intake.locked():
            with self.assertRaises(RuntimeError):
                with Intake(self.config).locked():
                    self.fail('Second worker acquired the lock')

    def test_supporters_command_identity(self):
        patch.stopall()
        output = self.base / 'render'
        output.mkdir()
        def fake_run(argv, **kwargs):
            env = kwargs['env']
            self.assertEqual(env['SUPPORTERS_SEASON'], '5')
            self.assertEqual(env['SUPPORTERS_EPISODE'], '35')
            self.assertEqual(env['SUPPORTERS_ALLOW_STALE_ON_FETCH_ERROR'], 'false')
            path = Path(env['SUPPORTERS_DOWNLOADS_DIR']) / 's5ep35-supporters.svg'
            path.parent.mkdir()
            path.write_bytes(b'<svg/>')
        with patch('intake.subprocess.run', side_effect=fake_run):
            self.assertEqual(self.intake.build_supporters(5, '35', output), b'<svg/>')

    def test_real_supporters_generator(self):
        csv = self.base / 'supporters.csv'
        csv.write_text('timestamp,email,name,civ\nnow,test@example.com,Test Supporter,\n')
        env = dict(os.environ, SUPPORTERS_ENV_FILE=str(self.base / 'no-env'),
                   SUPPORTERS_CSV_FILE=str(csv), SUPABASE_URL='',
                   SUPABASE_SERVICE_KEY='', SUPABASE_SERVICE_ROLE_KEY='',
                   SUPPORTERS_SEASON='5', SUPPORTERS_EPISODE='12.5',
                   SUPPORTERS_OUTPUT=str(self.base / 'rendered.svg'),
                   SUPPORTERS_DOWNLOADS_DIR=str(self.base / 'export'),
                   SUPPORTERS_ALLOW_STALE_ON_FETCH_ERROR='false')
        command = [shutil.which('node'), str(SITE / 'scripts/build-supporters-image.js')]
        subprocess.run(command, env=env, capture_output=True, text=True, check=True)
        expected = self.base / 'export/s5ep12.5-supporters.svg'
        self.assertIn('Test Supporter'.upper(), expected.read_text())
        expected.unlink()
        env['SUPPORTERS_CSV_FILE'] = str(self.base / 'missing.csv')
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(expected.exists())
        env['SUPPORTERS_EPISODE'] = 'bad'
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        self.assertIn('Set both SUPPORTERS_SEASON', result.stderr)

    def test_end_to_end_with_real_generator(self):
        patch.stopall()
        self.config['node'] = shutil.which('node')
        (self.intake.site / 'scripts').symlink_to(SITE / 'scripts', target_is_directory=True)
        csv = self.base / 'supporters.csv'
        csv.write_text('timestamp,email,name,civ\nnow,test@example.com,Test Supporter,\n')
        env = dict(SUPPORTERS_ENV_FILE=str(self.base / 'no-env'),
                   SUPPORTERS_CSV_FILE=str(csv), SUPABASE_URL='',
                   SUPABASE_SERVICE_KEY='', SUPABASE_SERVICE_ROLE_KEY='')
        with patch.dict(os.environ, env):
            self.put()
            self.run_scan(100); self.run_scan(115)
        self.assertTrue((self.intake.site / 'src/albums/s5/Episode35.md').exists())
        svg = self.intake.root / 'Releases/s5-ep35/s5ep35-supporters.svg'
        self.assertIn('TEST SUPPORTER', svg.read_text())


if __name__ == '__main__':
    unittest.main()
