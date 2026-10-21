// Format research: Andrew Webb, https://github.com/aiwebb/civ5replay (MIT).
// Independent bounded reader; no third-party runtime or game assets are bundled.
export const MAX_REPLAY_BYTES = 50 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });
class Reader {
  constructor(buffer, offset = 0) { this.view = new DataView(buffer); this.offset = offset; }
  need(size) { if (!Number.isSafeInteger(size) || size < 0 || this.offset + size > this.view.byteLength) throw new Error('Truncated or invalid replay data.'); }
  skip(size) { this.need(size); this.offset += size; }
  number(size, method) { this.need(size); const value = this.view[method](this.offset, true); this.offset += size; return value; }
  int() { return this.number(4, 'getInt32'); }
  short() { return this.number(2, 'getInt16'); }
  byte() { return this.number(1, 'getInt8'); }
  count(max, minimumBytes = 1) { const value = this.int(); if (value < 0 || value > max || value * minimumBytes > this.view.byteLength - this.offset) throw new Error('Invalid replay record count.'); return value; }
  string(max = 65536) { const length = this.count(max); this.need(length); const value = decoder.decode(new Uint8Array(this.view.buffer, this.offset, length)); this.offset += length; return value; }
}
export function fingerprintBytes(bytes) {
  let hash = 2166136261;
  for (const value of bytes) hash = Math.imul(hash ^ value, 16777619);
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}:${bytes.length}`;
}
function body(buffer, offset) {
  const r = new Reader(buffer, offset);
  const startTurn = r.int(), startYear = r.int(), endTurn = r.int(), endYear = r.string(80);
  if (startTurn < 0 || endTurn < startTurn || endTurn > 100000 || Math.abs(startYear) > 100000 || !/\d/.test(endYear) || /[\x00-\x1f]/.test(endYear)) throw new Error('Unsupported replay timeline.');
  r.skip(8);
  const civs = [];
  for (let i = 0, count = r.count(256, 32); i < count; i++) {
    r.skip(16);
    civs.push({ leader: r.string(512), longName: r.string(512), name: r.string(256), demonym: r.string(512) });
  }
  if (!civs.length) throw new Error('Replay has no civilizations.');
  const datasets = [];
  for (let i = 0, count = r.count(128, 4); i < count; i++) datasets.push(r.string(256));
  const recordedCityCounts = [];
  for (let player = 0, count = r.count(256, 4); player < count; player++) {
    const datasetCount = r.count(128, 4);
    if (datasetCount !== datasets.length) throw new Error('Inconsistent replay statistics.');
    for (let dataset = 0; dataset < datasetCount; dataset++) {
      const records = r.count(100001, 8);
      if (datasets[dataset] === 'REPLAYDATASET_CITYCOUNT') {
        let lastTurn = -1, value = 0;
        for (let row = 0; row < records; row++) {
          const turn = r.int(), cities = r.int();
          if (turn >= lastTurn && turn <= endTurn) { lastTurn = turn; value = cities; }
        }
        recordedCityCounts[player] = value;
      } else r.skip(records * 8);
    }
  }
  r.skip(4);
  const events = [];
  let tileReferences = 0;
  for (let i = 0, count = r.count(500000, 20); i < count; i++) {
    const turn = r.int(), type = r.int(), tiles = [];
    if (turn < startTurn || turn > endTurn) throw new Error('Replay event is outside the timeline.');
    const size = r.count(250000, 4);
    tileReferences += size;
    if (tileReferences > 1000000) throw new Error('Replay contains too many map references.');
    for (let j = 0; j < size; j++) tiles.push([r.short(), r.short()]);
    const civ = r.int(), text = r.string();
    if (civ < -1 || civ >= civs.length) throw new Error('Unknown replay civilization ID.');
    events.push({ turn, type, tiles, civ, text, order: i });
  }
  const width = r.int(), height = r.int(), count = r.count(250000, 12);
  if (width < 1 || height < 1 || width * height !== count) throw new Error('Invalid replay map dimensions.');
  const terrain = [];
  for (let i = 0; i < count; i++) { r.skip(8); terrain.push({ elevation: r.byte(), terrain: r.byte(), feature: r.byte() }); r.skip(1); }
  if (r.offset !== buffer.byteLength) throw new Error('Unsupported replay format: trailing data.');
  for (const event of events) for (const [x, y] of event.tiles) {
    if (x === -1 && y === -1 && ![1, 2, 3, 4].includes(event.type)) continue;
    if (x < 0 || x >= width || y < 0 || y >= height) throw new Error('Replay contains an invalid map coordinate.');
  }
  events.sort((a, b) => a.turn - b.turn || a.order - b.order);
  return { meta: { startTurn, startYear, endTurn, endYear }, width, height, civs, events, terrain, recordedCityCounts };
}
export function parseCiv5Replay(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength > MAX_REPLAY_BYTES) throw new Error('Choose a replay smaller than 50 MB.');
  const r = new Reader(buffer);
  r.need(8);
  if (decoder.decode(new Uint8Array(buffer, 0, 4)) !== 'CIV5') throw new Error('This is not a Civilization V replay.');
  r.skip(4);
  if (r.int() !== 1) throw new Error('Unsupported Civilization V replay version.');
  const version = r.string(128), build = r.string(128);
  r.skip(5);
  const header = {};
  for (const name of ['playerCiv', 'difficulty', 'eraStart', 'eraEnd', 'gameSpeed', 'worldSize', 'mapScript']) header[name] = r.string(4096);
  for (let i = 0, count = r.count(256, 24); i < count; i++) { r.skip(20); r.string(4096); }
  const mods = [];
  for (let i = 0, count = r.count(512, 12); i < count; i++) { r.string(128); r.int(); mods.push(r.string(4096)); }
  r.string(4096); r.string(4096); r.string(256); r.skip(8); r.string(4096);
  // BNW/mod DLL headers have variable options here. Find a plausible timeline,
  // then validate the ENTIRE body, including tile count and exact EOF, before accepting.
  const end = Math.min(buffer.byteLength - 40, r.offset + 65536);
  for (let offset = r.offset; offset <= end; offset++) {
    const v = r.view, start = v.getInt32(offset, true), year = v.getInt32(offset + 4, true), finish = v.getInt32(offset + 8, true), length = v.getInt32(offset + 12, true);
    if (start < 0 || start > 100000 || year < -100000 || year > 100000 || finish < start || finish > 100000 || length < 1 || length > 80) continue;
    try {
      const replay = body(buffer, offset);
      return { ...replay, meta: { ...replay.meta, version, build, mapScript: header.mapScript.split(/[\\/]/).pop() }, mods,
        sourceFingerprint: fingerprintBytes(new Uint8Array(buffer)) };
    } catch { /* A false header candidate must not produce a partial replay. */ }
  }
  throw new Error('This replay format could not be read. Try a Brave New World / Season 5 replay.');
}
