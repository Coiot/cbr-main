"""Read-only S5/v94 history extraction. All output must stay outside the site.

Uses the DLL's complete notification records to identify player sections, then
reads their string-vector / turn-map statistics. The separate embedded SQLite
database supplies InfoAddict's original observations. No latest-state city,
unit, notification, or mod-tracker values are projected into earlier turns.
"""
import hashlib
import json
import re
import sqlite3
import struct
import sys
import tempfile
from pathlib import Path
from extract import decompress_save

INFO_METRICS = {
    's': 'score', 'nc': 'cities', 'tp': 'population', 'po': 'demographicPopulation',
    'l': 'land', 'w': 'wonders', 'c': 'policies', 'm': 'military', 'nu': 'nukes',
    'sc': 'science', 't': 'technologies', 'te': 'research', 'tg': 'treasury',
    'g': 'netGold', 'i': 'grossGold', 'p': 'production', 'f': 'food',
    'tru': 'tradeRoutes', 'h': 'excessHappiness', 'cc': 'culture',
    'gw': 'greatWorks', 'to': 'tourism', 'in': 'influential',
    'tou': 'tourism_unknown', 'toe': 'tourism_exotic', 'tof': 'tourism_familiar',
    'top': 'tourism_popular', 'tod': 'tourism_dominant', 'fa': 'faith', 'fr': 'faithPerTurn',
}
NATIVE_METRICS = {
    'TOTALCULTURE': 'storedCulture', 'HAPPINESS': 'happiness', 'UNHAPPINESS': 'unhappiness',
    'GOLDENAGETURNS': 'goldenAgeTurns', 'GPTCITYCONNECTIONS': 'cityConnectionGold',
    'GPTINTERNATIONALTRADE': 'tradeRouteGold', 'GPTDEALS': 'diplomacyGold',
    'UNITMAINTENANCE': 'unitMaintenance', 'BUILDINGMAINTENANCE': 'buildingMaintenance',
    'IMPROVEMENTMAINTENANCE': 'improvementMaintenance', 'NUMBEROFWORKERS': 'workers',
    'IMPROVEDTILES': 'improvedTiles', 'WORKEDTILES': 'workedTiles',
    'INFOADDICTDATASET_ALIVE': 'alive',
}


class Reader:
    def __init__(self, data, at):
        self.data, self.at = data, at

    def ints(self, count=1):
        values = struct.unpack_from('<' + 'i' * count, self.data, self.at)
        self.at += 4 * count
        return values[0] if count == 1 else values

    def string(self):
        size = self.ints()
        if not 0 <= size <= 65536 or self.at + size > len(self.data):
            raise ValueError('Invalid saved string')
        value = self.data[self.at:self.at + size].decode('utf8')
        self.at += size
        return value


def player_sections(data, end_turn, count):
    sections = []
    for match in re.finditer(re.escape(struct.pack('<II', 2, 94)), data):
        reader = Reader(data, match.start() + 8)
        player, lookup, begin, end = reader.ints(4)
        if not (0 <= player < count and 0 <= lookup < 1000000 and 0 <= begin < 100 and 0 <= end < 100):
            continue
        try:
            for _ in range(100):
                reader.ints()  # Notification hash, not a sequential enum.
                reader.string()
                reader.string()
                x, y, _, _, turn, _ = reader.ints(6)
                dismissed = data[reader.at]
                reader.at += 1
                recipient, mod = reader.ints(2)
                if not (-1 <= turn <= end_turn and dismissed in (0, 1) and mod == 94 and
                        (x == y == -1 or 0 <= x < 180 and 0 <= y < 94)):
                    raise ValueError('Invalid notification boundary')
        except (ValueError, UnicodeDecodeError, struct.error, IndexError):
            continue
        sections.append((player, match.start(), reader.at))
    if [p for p, _, _ in sections] != list(range(count)):
        raise ValueError('Could not verify every player section for this v94 save')
    return sections


def native_statistics(data, section, limit, end_turn):
    start = data.find(b'REPLAYDATASET_SCORE', section[2], limit)
    if start < 8:
        raise ValueError('Missing player statistics')
    reader = Reader(data, start - 8)
    count = reader.ints()
    if count != 31:
        raise ValueError('Unsupported player statistics registry')
    names = [reader.string() for _ in range(count)]
    if names[0] != 'REPLAYDATASET_SCORE' or len(set(names)) != count or reader.ints() != count:
        raise ValueError('Invalid player statistics registry')
    values = {}
    for name in names:
        size = reader.ints()
        if not 0 <= size <= end_turn + 1:
            raise ValueError('Invalid history length')
        points = [reader.ints(2) for _ in range(size)]
        if any(not 0 <= t <= end_turn for t, _ in points) or any(a[0] >= b[0] for a, b in zip(points, points[1:])):
            raise ValueError('Invalid history turns')
        key = NATIVE_METRICS.get(name.removeprefix('REPLAYDATASET_'))
        if key:
            values[key] = [None] * (end_turn + 1)
            for turn, value in points:
                values[key][turn] = value
    if reader.at > limit or set(values) != set(NATIVE_METRICS.values()):
        raise ValueError('Statistics exceed verified player section')
    return values


def infoaddict_statistics(data, players, end_turn):
    anchors = [m.start() for m in re.finditer(b'SQLite format 3\x00', data)]
    if len(anchors) != 1:
        raise ValueError('Expected one embedded save database')
    start = anchors[0]
    page = struct.unpack_from('>H', data, start + 16)[0]
    page = 65536 if page == 1 else page
    size = page * struct.unpack_from('>I', data, start + 28)[0]
    if page not in (512, 1024, 2048, 4096, 8192, 16384, 32768, 65536) or not 100 <= size <= len(data) - start:
        raise ValueError('Invalid embedded database size')
    with tempfile.TemporaryDirectory(prefix='cbr-history-') as directory:
        path = Path(directory) / 'save.sqlite'
        path.write_bytes(data[start:start + size])
        path.chmod(0o600)
        db = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
        try:
            if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                raise ValueError('Save database failed integrity check')
            seen = set()
            for turn, player, text in db.execute('SELECT Turn,Player,Value FROM InfoAddictHistoricalData ORDER BY Turn,Player'):
                if not (isinstance(turn, int) and 1 <= turn <= end_turn and isinstance(player, int) and 0 <= player < len(players)) or (turn, player) in seen:
                    raise ValueError('Invalid or duplicate InfoAddict observation')
                seen.add((turn, player))
                pairs = re.findall(r'(\w+):([^ ]+)', text)
                if len(pairs) != len(INFO_METRICS) or {k for k, _ in pairs} != set(INFO_METRICS):
                    raise ValueError('Unsupported InfoAddict metric registry')
                for code, value in pairs:
                    key = INFO_METRICS[code]
                    if value == 'n':
                        value = None
                    elif code == 'te' and re.fullmatch(r'TECH_[A-Z0-9_]{1,100}', value):
                        pass  # Stable technology type, not a completion event.
                    elif re.fullmatch(r'-?\d+(?:\.\d+)?', value):
                        value = float(value) if '.' in value else int(value)
                    else:
                        raise ValueError('Invalid saved statistic')
                    players[player].setdefault(key, [None] * (end_turn + 1))[turn] = value
            if not seen:
                raise ValueError('Missing InfoAddict history')
        finally:
            db.close()


def extract_statistics(path, reference):
    raw, data, _ = decompress_save(path)
    end_turn = struct.unpack_from('<i', data, 12)[0]
    if hashlib.sha256(raw).hexdigest() != reference['source']['sha256'] or end_turn != reference['source']['turn'] or not 0 <= end_turn <= 10000:
        raise ValueError('Statistics and event history must come from the same save')
    civs = reference['civilizations']['entries']
    sections = player_sections(data, end_turn, len(civs))
    players = [native_statistics(data, section, sections[i + 1][1] if i + 1 < len(sections) else len(data), end_turn)
               for i, section in enumerate(sections)]
    infoaddict_statistics(data, players, end_turn)
    return {'format': 'cbr-save-statistics', 'version': 1, 'sourceSha256': reference['source']['sha256'],
            'firstTurn': 0, 'lastTurn': end_turn,
            'players': [{'name': civ['name'], 'alive': values.pop('alive'), 'values': values} for civ, values in zip(civs, players)]}


if __name__ == '__main__':
    try:
        json.dump(extract_statistics(sys.argv[1], json.load(sys.stdin)), sys.stdout, separators=(',', ':'))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
