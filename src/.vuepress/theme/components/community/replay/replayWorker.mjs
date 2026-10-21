import { parseCiv5Replay } from './replayParser.mjs';
self.onmessage = event => {
  try { self.postMessage({ ok: true, replay: parseCiv5Replay(event.data) }); }
  catch (error) { self.postMessage({ ok: false, error: error.message || 'Replay could not be read.' }); }
};
