"""Extract the verified S5 T809 CvPlot city roster. Rows are [tile, replay civ slot]."""
import hashlib
import json
import re
import struct
import sys

from extract import decompress_save, payload_turn

SAVE_SHA256 = "0281211682f43ddd2d77a14a393faccaa281cf3b3eb96e53936a9b0a64d060c1"


def read_checkpoint(path):
    raw, data, _ = decompress_save(path)
    if hashlib.sha256(raw).hexdigest() != SAVE_SHA256 or payload_turn(raw, data) != 809:
        raise ValueError("Expected the reviewed Season 5 T809 autosave")

    # This save writes CvPlot v7, mod serialization v94, in row-major order.
    # Locate the start using two adjacent plot headers to exclude unrelated records.
    header = struct.pack("<II", 7, 94)
    marker = re.escape(header)
    matches = re.finditer(marker + b"(?=.{4})", data, re.DOTALL)
    starts = [m.end() for m in matches]
    coords = [struct.unpack_from("<hh", data, pos) for pos in starts]
    first = next(i for i, xy in enumerate(coords) if xy == (0, 0) and coords[i+1:i+2] == [(1, 0)])
    records = starts[first:first + 180 * 94]
    if len(records) != 180 * 94:
        raise ValueError("Incomplete plot grid")

    cities, identities = [], set()
    for index, pos in enumerate(records):
        if struct.unpack_from("<hh", data, pos) != (index % 180, index // 180):
            raise ValueError(f"Unexpected plot coordinates at {index}")
        # The sparse trade-route bitfield precedes the owner and city fields.
        words, mode, cells = struct.unpack_from("<IBI", data, pos + 41)
        if words != 16 or mode != 0 or cells > words:
            raise ValueError("Unsupported plot trade-route encoding")
        fields = pos + 8 * cells
        plot_owner, = struct.unpack_from("<i", data, fields + 62)
        owner, city_id = struct.unpack_from("<ii", data, fields + 108)
        if (owner, city_id) == (-1, -1):
            continue
        if not (0 <= owner < 62 and owner == plot_owner and city_id >= 0) or (owner, city_id) in identities:
            raise ValueError(f"Invalid city reference at tile {index}")
        identities.add((owner, city_id))
        cities.append([index, owner])
    return cities


if __name__ == "__main__":
    print(json.dumps(read_checkpoint(sys.argv[1]), separators=(",", ":")))
