"""Read-only BNW/CBRX chunked save reader. Reference metadata arrives on stdin.

This is deliberately not a general-purpose Civ5 save parser. It locates and
validates a complete replay-message section; it never guesses current city data.
"""
import hashlib
import json
import struct
import sys
import zlib
from pathlib import Path


def decompress_save(path):
    raw = Path(path).read_bytes()
    if len(raw) > 100_000_000 or raw[:4] != b"CIV5":
        raise ValueError("Expected a Civ5 save smaller than 100 MB")
    payload = None
    chunks = 0
    # A chunk stream must consume the file exactly. Do not assume a mod header size.
    for start in range(8, min(len(raw) - 8, 2_000_000)):
        if raw[start:start + 2] not in (b"\x78\x9c", b"\x78\xda", b"\x78\x01"):
            continue
        if struct.unpack_from("<II", raw, start - 8) != (2, 65536):
            continue
        at, pieces = start - 4, []
        while at + 4 <= len(raw):
            length = struct.unpack_from("<I", raw, at)[0]
            at += 4
            if not 0 < length <= 65536 or at + length > len(raw):
                break
            pieces.append(raw[at:at + length])
            at += length
        if at != len(raw) or not pieces:
            continue
        decoder = zlib.decompressobj()
        candidate = decoder.decompress(b"".join(pieces), 300_000_001)
        if len(candidate) > 300_000_000 or decoder.unconsumed_tail:
            raise ValueError("Decompressed save exceeds the limit")
        payload, chunks = candidate, len(pieces)
        break
    if payload is None:
        raise ValueError("Unsupported compression framing")
    return raw, payload, chunks


def extract(path, reference):
    raw, payload, chunks = decompress_save(path)
    turn = struct.unpack_from("<i", payload, 12)[0]
    if not 0 <= turn <= 100000:
        raise ValueError("Unsupported game header")
    def encoded(e):
        s = e["text"].encode("utf8")
        return (struct.pack("<iii", e["turn"], e["type"], len(e["tiles"])) +
                b"".join(struct.pack("<hh", *xy) for xy in e["tiles"]) +
                struct.pack("<ii", e["civ"], len(s)) + s)
    anchor = b"".join(encoded(e) for e in reference["events"][:2])
    start = payload.find(anchor)
    if start < 8 or payload.find(anchor, start + 1) >= 0:
        raise ValueError("Could not uniquely locate the reference opening")
    version, count = struct.unpack_from("<ii", payload, start - 8)
    if version != 2 or not 0 < count <= 500000:
        raise ValueError("Unsupported replay event section")
    at, events, refs = start, [], 0
    for order in range(count):
        t, kind, n = struct.unpack_from("<iii", payload, at)
        at += 12
        if not 0 <= t <= turn or not 0 <= kind <= 6 or not 0 <= n <= 16920:
            raise ValueError("Invalid replay record")
        refs += n
        if refs > 1000000:
            raise ValueError("Too many coordinates")
        points = [list(struct.unpack_from("<hh", payload, at + i * 4)) for i in range(n)]
        at += n * 4
        civ, length = struct.unpack_from("<ii", payload, at)
        at += 8
        if not -1 <= civ < len(reference["civs"]) or not 0 <= length <= 262144:
            raise ValueError("Invalid replay civilization or message")
        message = payload[at:at + length].decode("utf8")
        at += length
        for x, y in points:
            if not (0 <= x < 180 and 0 <= y < 94) and not (x == y == -1 and kind not in (1, 2, 3, 4)):
                raise ValueError("Invalid coordinate")
        events.append(dict(turn=t, type=kind, tiles=points, civ=civ, text=message, order=order))
    opening = lambda es: [(e["civ"], e["tiles"], e["text"]) for e in es if e["turn"] == 0 and e["type"] == 1]
    if not opening(events) or opening(events) != opening(reference["events"]):
        raise ValueError("Reference roster does not match this save's opening")
    return {
        "format": "cbr-save-replay-extraction", "version": 1,
        "source": {"sha256": hashlib.sha256(raw).hexdigest(), "turn": turn},
        "civilizations": {"entries": [{"name": c["name"]} for c in reference["civs"]]},
        "extraction": {"compressionChunks": chunks, "decompressedBytes": len(payload),
                      "eventLogOffset": start, "eventLogEnd": at, "eventMessageVersion": version,
                      "eventCount": count, "firstRecordedTurn": min(e["turn"] for e in events),
                      "lastRecordedTurn": max(e["turn"] for e in events)},
        "events": events,
        "warnings": ["Opening roster verified; later game branch and city removals require independent verification."]
    }


if __name__ == "__main__":
    try:
        json.dump(extract(sys.argv[1], json.load(sys.stdin)), sys.stdout, separators=(",", ":"))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
