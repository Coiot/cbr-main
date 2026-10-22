import struct
import unittest
from extract_statistics import Reader, player_sections, native_statistics, NATIVE_METRICS


def integers(*values):
    return struct.pack('<' + 'i' * len(values), *values)


def string(value):
    data = value.encode('utf8')
    return integers(len(data)) + data


def notifications(owner):
    entry = integers(-1) + string('') + string('') + integers(-1, -1, -1, -1, -1, -1) + bytes([0]) + integers(owner, 94)
    return integers(2, 94, owner, 0, 0, 0) + entry * 100


def statistics(points):
    names = ['REPLAYDATASET_SCORE'] + [name if name.startswith('INFOADDICT') else 'REPLAYDATASET_' + name for name in NATIVE_METRICS]
    names += ['INFOADDICTDATASET_UNUSED_' + str(i) for i in range(31 - len(names))]
    registry = integers(31) + b''.join(string(name) for name in names)
    values = integers(len(points)) + b''.join(integers(turn, value) for turn, value in points)
    return registry + integers(31) + values * 31


class StatisticsReaderTests(unittest.TestCase):
    def test_complete_player_boundaries_and_unicode(self):
        data = notifications(0) + statistics([(0, 3), (2, 9)]) + notifications(1)
        sections = player_sections(data, 4, 2)
        self.assertEqual([s[0] for s in sections], [0, 1])
        decoded = native_statistics(data, sections[0], sections[1][1], 4)
        self.assertEqual(decoded['storedCulture'], [3, None, 9, None, None])
        self.assertEqual(decoded['alive'], [3, None, 9, None, None])
        self.assertEqual(Reader(string('Hyksos · 日本'), 0).string(), 'Hyksos · 日本')

    def test_rejects_missing_or_duplicate_player_sections(self):
        with self.assertRaises(ValueError):
            player_sections(notifications(0), 4, 2)
        with self.assertRaises(ValueError):
            player_sections(notifications(0) * 2, 4, 1)

    def test_rejects_future_duplicate_and_unsorted_samples(self):
        for points in [[(5, 1)], [(1, 1), (1, 2)], [(2, 1), (1, 2)]]:
            data = notifications(0) + statistics(points)
            section = player_sections(data, 4, 1)[0]
            with self.assertRaises(ValueError):
                native_statistics(data, section, len(data), 4)

    def test_rejects_dataset_crossing_the_next_player_boundary(self):
        data = notifications(0) + statistics([(0, 1)])
        section = player_sections(data, 4, 1)[0]
        with self.assertRaises(ValueError):
            native_statistics(data, section, len(data) - 1, 4)


if __name__ == '__main__':
    unittest.main()
