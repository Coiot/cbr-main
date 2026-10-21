import { fingerprintBytes } from './replayParser.mjs';
import { mapCivilizations } from './replayModel.mjs';

export const EXTRACTION_FORMAT = 'cbr-save-replay-extraction';
const invalid = () => { throw new Error('Invalid recovered save history. Re-extract the event JSON from the original save.'); };
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

// The extraction is an event log, not a native replay or a current map-state dump.
// Validate it independently; never merge it with the reference replay's later events.
export function readReplayExtraction(input, base, ownerList) {
  if (!Object.is(input?.format, EXTRACTION_FORMAT) || !Object.is(input?.version, 1)) invalid();
  if (!/^[a-f0-9]{64}$/.test(input.source?.sha256 || '') || !integer(input.source?.turn, 0, 100000)) invalid();
  const entries = input.civilizations?.entries;
  if (!Array.isArray(entries) || !entries.length || entries.length > 256) invalid();
  const civs = entries.map(civ => {
    if (typeof civ?.name !== 'string' || !civ.name.trim() || civ.name.length > 256) invalid();
    return { name: civ.name };
  });
  mapCivilizations(civs, ownerList);
  const extraction = input.extraction;
  if (extraction?.eventMessageVersion !== 2 || !Array.isArray(input.events) || !input.events.length || input.events.length > 500000 || extraction.eventCount !== input.events.length) invalid();
  let tileReferences = 0;
  const orders = new Set();
  const events = input.events.map(event => {
    if (!integer(event?.turn, 0, input.source.turn) || !integer(event.type, 0, 6) || !integer(event.civ, -1, civs.length - 1) || !integer(event.order, 0, input.events.length - 1) || orders.has(event.order)) invalid();
    orders.add(event.order);
    if (typeof event.text !== 'string' || event.text.length > 65536 || !Array.isArray(event.tiles) || event.tiles.length > base.width * base.height) invalid();
    tileReferences += event.tiles.length;
    if (tileReferences > 1000000) invalid();
    const tiles = event.tiles.map(point => {
      if (!Array.isArray(point) || point.length !== 2) invalid();
      const [x, y] = point;
      const nonGeographic = x === -1 && y === -1 && ![1, 2, 3, 4].includes(event.type);
      if (!nonGeographic && (!integer(x, 0, base.width - 1) || !integer(y, 0, base.height - 1))) invalid();
      return [x, y];
    });
    return { turn: event.turn, type: event.type, civ: event.civ, order: event.order, text: event.text, tiles };
  });
  events.sort((a, b) => a.turn - b.turn || a.order - b.order);
  const firstTurn = events[0].turn, lastTurn = events.at(-1).turn;
  if (extraction.firstRecordedTurn !== firstTurn || extraction.lastRecordedTurn !== lastTurn) invalid();
  const warnings = [
    'Recovered from the save’s event log. This history is independent of the earlier T166 replay.',
    'Recovered events use the Season 5 base geography. This extraction does not include a current saved-map dump or per-civilization city-count statistics.',
    ...(Array.isArray(input.warnings) ? input.warnings.filter(value => typeof value === 'string').slice(0, 20).map(value => value.slice(0, 1000)) : []),
  ];
  return {
    recovered: true, width: base.width, height: base.height, civs, events, warnings,
    meta: { startTurn: firstTurn, endTurn: input.source.turn }, recordedCityCounts: [],
    sourceFingerprint: fingerprintBytes(new TextEncoder().encode(JSON.stringify({ sha256: input.source.sha256, civs, events }))),
  };
}
