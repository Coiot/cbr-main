import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
from urllib.error import HTTPError

import yaml

import terminology as t
from intake import Intake


def album(narration, title="A title", other="Untouched", newline="\n"):
    return newline.join([
        '---', '# Preserve this comment', 'title: "Part 35"', 'edition: S5',
        'image: https://example.com/mark.jpg', 'scenes:', '- scene_number: 01',
        '  scene_title: ' + json.dumps(title, ensure_ascii=False),
        '  narration: ' + json.dumps(narration, ensure_ascii=False),
        '  custom: ' + json.dumps(other), '---', '', 'Trailing body stays exactly as written.', ''])


class FakeClient:
    model = "test-model"

    def __init__(self, decide=None):
        self.decide = decide or (lambda c: "replace")
        self.calls = []

    def classify(self, payload):
        self.calls.append(payload)
        # Fixture outcomes are supplied only by this test double, never by production requests.
        if 'type' not in payload['release']:
            examples = json.loads(Path(t.__file__).with_name('terminology_examples.json').read_text())
            decisions = [{"id": c["id"], "decision": examples[int(c['field_id'].split(':')[0]) - 1]['expected'],
                          "reason": "Test fixture expected decision."} for c in payload['occurrences']]
        else:
            decisions = [{"id": c["id"], "decision": self.decide(c), "reason": "Test classification."}
                         for c in payload['occurrences']]
        return {"decisions": decisions}


class TerminologyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.site = self.root / 'site'
        self.site.mkdir()
        self.cache = self.root / 'cache'
        self.env = patch.dict(os.environ, {'OPENAI_API_KEY': '', 'CBR_TERMINOLOGY_MODEL': ''})
        self.env.start()
        self.addCleanup(self.env.stop)

    def review(self, source, client=None):
        return t.review(source, self.site, self.cache, client)

    def test_only_scoped_fields_and_visible_text_change(self):
        source = album('<p>Last <em>part</em>, we fought this mark.</p>'
                       '<a href="https://example.com/part" title="mark">Details</a>', title='Next Part')
        updated, result = self.review(source, FakeClient())
        self.assertEqual(result['corrections'], 3)
        expected = source.replace('Last <em>part</em>', 'Last <em>episode</em>')
        expected = expected.replace('this mark.', 'this season.').replace('Next Part', 'Next Episode')
        self.assertEqual(updated, expected)
        self.assertIn('title: "Part 35"', updated)
        self.assertIn('href=\\"https://example.com/part\\"', updated)

    def test_case_plural_possessive_and_abbreviation(self):
        source = album("PART Part part parts parts' part’s mark marks mark's Mk. 5 MK. 5")
        updated, result = self.review(source, FakeClient())
        narration = yaml.safe_load(t.FRONT.match(updated)[1])['scenes'][0]['narration']
        self.assertEqual(narration, "EPISODE Episode episode episodes episodes' episode’s season seasons season's Season 5 SEASON 5")
        self.assertEqual(result['unresolved'], 0)

    def test_historical_guard_and_mixed_decisions(self):
        source = album('Fan since Mark I and Mk. II. Last part, we saw a question mark. This part is unclear.')
        fields, _ = t.fields_from_markdown(source)
        candidates = t.candidates_for(fields)
        choices = ['replace', 'replace', 'replace', 'keep', 'review']
        client = FakeClient(lambda c: choices[int(c['id'][1:]) - 1])
        updated, result = self.review(source, client)
        self.assertEqual(updated, source.replace('Last part', 'Last episode'))
        self.assertEqual(result['corrections'], 1)
        self.assertEqual(result['unresolved'], 1)
        self.assertEqual(len(candidates), 5)

    def test_abbreviation_periods(self):
        self.assertEqual(t.replacement('mk.', ' has been entertaining.'), 'season')
        self.assertEqual(t.replacement('Mk.', ' 5 is underway.'), 'Season')
        self.assertEqual(t.replacement('mk.', ' Next year we start again.'), 'season.')
        self.assertEqual(t.replacement('mk.', '\n'), 'season.')

    def test_split_markup_encoded_words_urls_and_compounds(self):
        source = album('<p>Last pa<b>rt</b>, this m&#97;rk, part-time, '
                       'https://example.com/part and www.example.com/mark</p>'
                       '<script>part mark</script><style>.part {}</style>')
        updated, result = self.review(source, FakeClient())
        self.assertEqual(updated, source)
        self.assertEqual(len(result['findings']), 2)
        self.assertEqual(result['unresolved'], 2)

    def test_absent_key_and_no_candidates(self):
        source = album('Last part.')
        with patch('terminology.request.urlopen') as network:
            updated, result = self.review(source)
            self.assertEqual(updated, source)
            self.assertEqual(result['status'], 'incomplete')
            self.assertEqual(result['unresolved'], 1)
            clean = album('Nothing to change.')
            self.assertEqual(self.review(clean)[1]['status'], 'complete')
            network.assert_not_called()

    def test_cache_is_context_model_and_policy_specific(self):
        client = FakeClient()
        source = album('Last part.')
        self.review(source, client)
        self.review(source, client)
        self.assertEqual(len(client.calls), 2)  # Evaluation plus one release request.
        self.review(source.replace('edition: S5', 'edition: S6'), client)
        self.assertEqual(len(client.calls), 3)
        with patch.object(t, 'POLICY', 'new-policy'):
            self.review(source, client)
        self.assertEqual(len(client.calls), 5)
        client.model = 'another-model'
        self.review(source, client)
        self.assertEqual(len(client.calls), 7)

    def test_evaluation_blocks_incorrect_changes_and_caches_failure(self):
        client = FakeClient()
        client.classify = Mock(side_effect=lambda payload: {'decisions': [
            {'id': c['id'], 'decision': 'replace', 'reason': 'Incorrect blanket change.'}
            for c in payload['occurrences']]})
        source = album('Last part.')
        for _ in range(2):
            updated, result = self.review(source, client)
            self.assertEqual(updated, source)
            self.assertEqual(result['status'], 'incomplete')
            self.assertIn('evaluation', result['message'])
        self.assertEqual(client.classify.call_count, 1)

    def test_invalid_decisions_never_partially_apply(self):
        source = album('Last part. This mark.')
        variants = [
            {'decisions': []},
            {'decisions': [{'id': 'c99', 'decision': 'replace', 'reason': 'Unknown'}]},
            {'decisions': [{'id': 'c1', 'decision': 'replace', 'reason': 'A'}] * 2},
            {'decisions': [{'id': 'c1', 'decision': 'replace', 'reason': 'A', 'replacement': 'bad'}]},
            {'decisions': [{'id': 'c1', 'decision': 'rewrite', 'reason': 'A'}]},
        ]
        for response in variants:
            client = FakeClient()
            with patch('terminology.evaluate'), patch.object(client, 'classify', return_value=response):
                updated, result = self.review(source, client)
            self.assertEqual(updated, source)
            self.assertEqual(result['status'], 'incomplete')
            self.assertEqual(result['corrections'], 0)

    def test_block_scalars_crlf_and_anchors(self):
        source = album('Last part.', newline='\r\n')
        self.assertEqual(self.review(source, FakeClient())[0], source.replace('Last part.', 'Last episode.'))
        source = album('Last part.').replace('"Last part."', '|\n    Last part.\n    End.')
        updated, _ = self.review(source, FakeClient())
        data = yaml.safe_load(t.FRONT.match(updated)[1])
        self.assertEqual(data['scenes'][0]['narration'], 'Last episode.\nEnd.\n')
        self.assertIn('  custom: "Untouched"', updated)
        anchored = album('Last part.').replace('"Last part."', '&shared "Last part."')
        self.assertEqual(self.review(anchored, FakeClient())[0], anchored)

    def test_report_escapes_content_and_protects_edits(self):
        _, result = self.review(album('<p>Last part. &lt;script&gt;bad&lt;/script&gt;</p>'), FakeClient())
        result['findings'][0]['reason'] = '<script>alert(1)</script>'
        report = t.write_report(self.root / 'review', result)
        self.assertNotIn('<script>', report.read_text())
        self.assertIn('&lt;script&gt;', report.read_text())
        self.assertEqual(t.write_report(self.root / 'review', result), report)
        report.write_text('Hand edited')
        with self.assertRaises(FileExistsError):
            t.write_report(self.root / 'review', result)
        self.assertEqual(report.read_text(), 'Hand edited')

    def test_manual_recheck_preserves_original_and_writes_candidate(self):
        source = self.site / 'Episode35.md'
        source.write_text(album('Last part.'))
        before = source.read_bytes()
        intake = Intake({'site_root': str(self.site), 'narration_dir': str(self.root / 'Narration'),
                         'downloads_dir': str(self.root / 'Downloads'), 'notifications': False})
        original_review = t.review
        with patch('terminology.review', side_effect=lambda md, site, cache: original_review(md, site, cache, FakeClient())):
            summary = intake.recheck_terminology(source)
        self.assertEqual(source.read_bytes(), before)
        self.assertIn('Last episode.', Path(summary['candidate']).read_text())
        self.assertTrue(Path(summary['report']).exists())

    def test_import_corrections_and_duplicate_protection(self):
        from test_intake import html
        narration_dir = self.root / 'Narration'
        intake = Intake({'site_root': str(self.site), 'narration_dir': str(narration_dir),
                         'cdn_config': str(self.root / 'no-cdn.json'),
                         'downloads_dir': str(self.root / 'Downloads'), 'node': 'node', 'notifications': False})
        intake.inbox.mkdir(parents=True)
        (self.site / 'src/albums/s5').mkdir(parents=True)
        source = intake.inbox / 'Episode35.html'
        content = html().replace(b'<b>Bold</b>', b'Last part')
        source.write_bytes(content)
        client = FakeClient()
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-key'}), \
                patch('terminology.Client', return_value=client), \
                patch.object(intake, 'build_supporters', return_value=b'<svg/>'):
            with intake.locked():
                intake.scan(100)
                intake.scan(115)
            target = self.site / 'src/albums/s5/Episode35.md'
            self.assertIn('Last episode', target.read_text())
            job = next(iter(intake.state['jobs'].values()))
            self.assertEqual(job['terminology']['corrections'], 6)
            self.assertTrue(Path(job['terminology']['report']).exists())
            target.write_text(target.read_text() + '\nManual edit\n')
            before = target.read_bytes()
            source.write_bytes(content)
            with intake.locked():
                intake.scan(130)
                intake.scan(145)
            self.assertEqual(target.read_bytes(), before)
            self.assertEqual(len(client.calls), 2)

    def test_import_finishes_when_ai_is_unavailable(self):
        from test_intake import html
        intake = Intake({'site_root': str(self.site), 'narration_dir': str(self.root / 'Narration'),
                         'cdn_config': str(self.root / 'no-cdn.json'),
                         'downloads_dir': str(self.root / 'Downloads'), 'notifications': False})
        intake.inbox.mkdir(parents=True)
        (self.site / 'src/albums/s5').mkdir(parents=True)
        source = intake.inbox / 'Episode35.html'
        source.write_bytes(html().replace(b'<b>Bold</b>', b'Last part'))
        with patch.object(intake, 'build_supporters', return_value=b'<svg/>'):
            with intake.locked():
                intake.scan(100)
                intake.scan(115)
        self.assertIn('Last part', (self.site / 'src/albums/s5/Episode35.md').read_text())
        self.assertFalse(source.exists())
        job = next(iter(intake.state['jobs'].values()))
        self.assertEqual(job['terminology']['status'], 'incomplete')
        self.assertIn('AI review incomplete', Path(job['terminology']['report']).read_text())

    def test_env_file_quotes_and_precedence(self):
        (self.site / '.env.releases').write_text('OPENAI_API_KEY="local-test" # comment\nCBR_TERMINOLOGY_MODEL=test-model\n')
        self.assertEqual(t.settings(self.site), ('local-test', 'test-model'))
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'env-test'}):
            self.assertEqual(t.settings(self.site)[0], 'env-test')

    def test_network_schema_timeout_retry_and_refusal(self):
        client = t.Client('secret-test-key', t.MODEL)
        payload = {'occurrences': []}
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.read.return_value = json.dumps({'status': 'completed', 'output': [
            {'type': 'message', 'content': [{'type': 'output_text', 'text': '{"decisions": []}'}]}]}).encode()
        with patch('terminology.request.urlopen', side_effect=[TimeoutError(), response]) as network, patch('terminology.time.sleep'):
            self.assertEqual(client.classify(payload), {'decisions': []})
            self.assertEqual(network.call_count, 2)
            req = network.call_args.args[0]
            body = json.loads(req.data)
            self.assertTrue(body['text']['format']['strict'])
            self.assertFalse(body['store'])
            self.assertEqual(network.call_args.kwargs['timeout'], 30)
        response.read.return_value = b'{"status":"completed","output":[{"type":"message","content":[{"type":"refusal"}]}]}'
        with patch('terminology.request.urlopen', return_value=response):
            with self.assertRaises(t.ReviewUnavailable):
                client.classify(payload)
        error = HTTPError('https://api.openai.com/v1/responses', 401, 'secret-test-key', {}, io.BytesIO(b'secret-test-key'))
        with patch('terminology.request.urlopen', side_effect=error) as network:
            with self.assertRaises(t.ReviewUnavailable) as caught:
                client.classify(payload)
            self.assertNotIn('secret-test-key', str(caught.exception))
            self.assertEqual(network.call_count, 1)


if __name__ == '__main__':
    unittest.main()
