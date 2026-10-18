from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from automation_files import atomic_json, publish_file, write_text
from validation import album_data, validate_structure


class SharedUtilitiesTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_failed_replace_keeps_original_and_removes_temporary_file(self):
        path = self.root / 'state.json'
        path.write_text('original')
        with patch('automation_files.os.replace', side_effect=OSError('disk error')):
            with self.assertRaises(OSError):
                atomic_json(path, {'ready': True})
        self.assertEqual(path.read_text(), 'original')
        self.assertEqual(list(self.root.iterdir()), [path])

    def test_exclusive_publish_preserves_a_concurrent_edit(self):
        path = self.root / 'Episode35.md'
        def concurrent_edit(temp, target):
            target.write_text('editor changes')
            raise FileExistsError('editor won the race')
        with patch('automation_files.os.link', side_effect=concurrent_edit):
            with self.assertRaises(FileExistsError):
                publish_file(path, b'generated')
        self.assertEqual(path.read_text(), 'editor changes')
        self.assertEqual(list(self.root.iterdir()), [path])

    def test_publish_and_replace_have_distinct_semantics(self):
        path = self.root / 'draft.md'
        publish_file(path, 'Narración'.encode())
        publish_file(path, 'Narración'.encode())
        with self.assertRaises(FileExistsError):
            publish_file(path, b'replacement')
        write_text(path, 'Updated draft')
        self.assertEqual(path.read_text(), 'Updated draft')

    def test_import_and_review_share_structure_but_have_different_url_policy(self):
        data = dict.fromkeys(('title', 'narrated_by', 'description', 'image', 'release_date', 'date'), 'present')
        data['scenes'] = [{'scene_number': n, 'scene_title': 'Title', 'narration': 'Text'} for n in range(1, 7)]
        errors, warnings, count = validate_structure(data)
        self.assertFalse(errors)
        self.assertEqual(len(warnings), 6)
        self.assertEqual(count, 6)
        errors, _, _ = validate_structure(data, generated=True)
        self.assertEqual(len(errors), 6)
        data['scenes'][1]['scene_number'] = 1
        self.assertTrue(validate_structure(data)[0])
        self.assertEqual(len(validate_structure(data, generated=True)[0]), 7)

    def test_review_accepts_prose_but_generated_album_requires_only_frontmatter(self):
        text = '---\ntitle: Example\n---\nSome prose\n'
        self.assertEqual(album_data(text)['title'], 'Example')
        with self.assertRaises(ValueError):
            album_data(text, generated=True)


if __name__ == '__main__':
    unittest.main()
