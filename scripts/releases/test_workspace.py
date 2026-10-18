from datetime import date
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import converter
from intake import Intake
from test_intake import html
import workspace as w


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.config = {"site_root": str(self.root / "site"), "narration_dir": str(self.root / "Narration")}
        self.intake = Intake(self.config)
        soup, season, episode, ranking = self.intake.parse_document(html(), "Episode35.html")
        self.text = converter.build_album(soup, season, episode, ranking, date(2026, 10, 13))
        self.source = self.root / "Episode35.md"
        self.source.write_text(self.text)
        self.directory = self.root / "release"

    def check(self, text=None, record=None):
        if text is not None:
            self.source.write_text(text)
        return w.check(self.source, self.directory, self.config, record)

    def test_exact_reddit_template_and_current_metadata(self):
        data = {"title": "Episode 34: Those Who Remain", "narrated_by": "Cocaloid"}
        draft, known = w.reddit_text(data, '5', '34', False, {})
        self.assertTrue(known)
        self.assertEqual(draft, '## CBRX Season 5: Episode 34: Those Who Remain\n\n---\n\n'
                         '## **[Image Album Narrated by Cocaloid](https://civbattleroyale.tv/albums/s5/Episode34/)**\n\n'
                         '---\n\n[Support us on Ko-Fi](https://ko-fi.com/coiot)\n\n'
                         '[Season 5 Megathread](https://www.reddit.com/r/civbattleroyale/comments/1jalax7/cbrx_season_5_megathread/)\n')
        result = self.check(self.text.replace('Tester', 'New Narrator'))
        self.assertIn('New Narrator', Path(result['reddit']).read_text())
        self.assertIn('/s5/Episode35/', Path(result['reddit']).read_text())

    def test_check_never_contacts_cdn(self):
        with patch.object(w.uploader.Bunny, 'command', side_effect=AssertionError('Network forbidden')):
            result = self.check(self.text.replace('cdn.civbattleroyale.tv', 'not-uploaded.invalid'))
        self.assertFalse(result['errors'])

    def test_sequence_dates_conflicts_and_reused_urls(self):
        result = self.check(self.text.replace('scene_number: 02', 'scene_number: 01')
                            .replace('October 13', 'October 12').replace('scene02.jpeg', 'scene01.jpeg')
                            + '\n<<<<<<< HEAD\n')
        self.assertEqual(len(result['errors']), 3)
        self.assertTrue(any('share an image' in warning for warning in result['warnings']))

    def test_review_provenance_and_draft_preservation(self):
        record = {'terminology': {'status': 'complete', 'unresolved': 0, 'markdown_sha256': w.sha(self.text.encode())}}
        result = self.check(record=record)
        self.assertEqual(result['status'], 'passed')
        Path(result['reddit']).write_text('My edited Reddit post')
        self.assertEqual(Path(self.check(record=record)['reddit']).read_text(), 'My edited Reddit post')
        changed = self.check(self.text.replace('Tester', 'Someone else'), record)
        self.assertTrue(any('changed since' in warning for warning in changed['warnings']))
        self.assertNotEqual(result['reddit'], changed['reddit'])

    def test_pr_and_future_season_no_wrong_megathread(self):
        draft, known = w.reddit_text({'title': 'Power Rankings: Episode 12.5', 'narrated_by': 'A [B]'}, '6', '12.5', True, {})
        self.assertFalse(known)
        self.assertIn('/pr/s6pr12.5/', draft)
        self.assertNotIn('Season 5 Megathread', draft)
        self.assertIn(r'A \[B\]', draft)

    def test_invalid_yaml_report_has_no_reddit(self):
        result = self.check('---\ntitle: [broken\n---\n')
        self.assertTrue(result['errors'])
        self.assertIsNone(result['reddit'])
        self.assertTrue(Path(result['report']).exists())

    def test_upload_new_skip_existing_and_failure_receipts(self):
        config_path = self.root / 'cdn/config.json'
        config = {'zone_id': 123, 'zone_name': 'test', 'profile': 'test', 'cli_command': ['bunny'],
                  'cdn_url': 'https://cdn.civbattleroyale.tv'}
        w.uploader.atomic_json(config_path, config)
        svg = self.root / 's5ep35-supporters.svg'
        svg.write_text('<svg/>')
        settings = {'cdn_config': str(config_path)}
        for remote, expected in [({}, 'uploaded'), ({svg.name: {'isDirectory': False}}, 'skipped')]:
            with patch.object(w.uploader.Bunny, 'listing', return_value=remote), \
                    patch.object(w.uploader.Bunny, 'upload') as upload:
                result = w.upload_supporters(svg, self.root / expected, settings)
                self.assertEqual(result['status'], expected)
                self.assertEqual(upload.call_count, 1 if expected == 'uploaded' else 0)
                if expected == 'uploaded':
                    w.upload_supporters(svg, self.root / expected, settings)
                    self.assertEqual(upload.call_count, 1)
        with patch.object(w.uploader.Bunny, 'listing', side_effect=w.uploader.UploadError('Failed')):
            result = w.upload_supporters(svg, self.root / 'failure', settings)
        self.assertEqual(result['status'], 'failed')
        self.assertTrue(svg.exists())

    def test_intake_upload_failure_still_finishes_and_duplicate_does_not_upload(self):
        self.config.update(notifications=False, cdn_config=str(self.root / 'missing.json'))
        self.intake.inbox.mkdir(parents=True)
        source = self.intake.inbox / 'Episode35.html'
        source.write_bytes(html())
        with self.intake.locked(), patch.object(Intake, 'build_supporters', return_value=b'<svg/>'), \
                patch('workspace.upload_supporters', wraps=w.upload_supporters) as upload:
            record = self.intake.process(source)
            self.assertEqual(record['status'], 'ready')
            self.assertEqual(record['supporters_upload']['status'], 'failed')
            self.assertTrue(Path(record['source_copy']).exists())
            self.assertTrue(Path(record['markdown']).exists())
            source.write_bytes(html())
            self.intake.process(source)
            self.assertEqual(upload.call_count, 1)


if __name__ == '__main__':
    unittest.main()
