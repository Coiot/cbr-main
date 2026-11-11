import struct
import unittest
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from extract import decompress_save, payload_turn
from extract_statistics import extend_native_history, NATIVE_OVERLAP
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
    def test_native_continuation_preserves_old_gaps_and_does_not_fill_dead_players(self):
        values={key:[1,None,2,None,None] for key in NATIVE_OVERLAP.values()}
        values['alive']=[1,1,1,1,0];values['research']=['TECH_MINING',None,'TECH_WRITING',None,None]
        native={key:[9,9,9,8,7] for key in NATIVE_OVERLAP.values()}
        extend_native_history(values,native,2,4)
        self.assertEqual(values['score'],[1,None,2,8,None])
        self.assertEqual(values['research'],['TECH_MINING',None,'TECH_WRITING',None,None])

    @unittest.skipUnless(shutil.which('zstd'), 'Native save tests require zstd')
    def test_native_wrapper_blocks_checksum_and_turn_header(self):
        payload=integers(3,3,1,94,0,943)+os.urandom(70000)
        compressed=subprocess.run(['zstd','-q','-c'],input=payload,stdout=subprocess.PIPE,check=True).stdout
        header=b'C5EX'+integers(2,2,0,3,3,2,2,3,3,1)+b'CIV5'+integers(8)
        blocks=b''.join(integers(len(compressed[i:i+65536]))+compressed[i:i+65536] for i in range(0,len(compressed),65536))
        raw=header+integers(15)+blocks
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'native.Civ5Save';path.write_bytes(raw)
            source,decoded,count=decompress_save(path)
            self.assertEqual(decoded,payload);self.assertEqual(count,2)
            self.assertEqual(payload_turn(source,decoded),943)
            for broken in [raw[:-1],raw[:-1]+bytes([raw[-1]^1]),raw[:4]+integers(99)+raw[8:],header+integers(16)+blocks]:
                path.write_bytes(broken)
                with self.assertRaises(ValueError):decompress_save(path)

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
