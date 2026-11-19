import {fetchMapAsset, mapAssetPath, mapAssetKeyBytes, mapAssetHex} from '../../../src/shared/mapReleaseDelivery.mjs';

export function createMapDelivery({storageUrl, storageKey, secret}) {
  if (!storageUrl || !storageKey || !secret) return null;
  const storage = new URL(storageUrl);
  if (storage.protocol !== 'https:' || !storage.hostname.endsWith('.bunnycdn.com') ||
      !storage.pathname.endsWith('/') || storage.search || storage.hash || storage.username || storage.password)
    throw new Error('Invalid Bunny map Storage URL.');
  const master = crypto.subtle.importKey('raw', mapAssetKeyBytes(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);

  async function key(id, part) {
    return new Uint8Array(await crypto.subtle.sign('HMAC', await master, new TextEncoder().encode(mapAssetPath(id, part))));
  }

  async function upload(id, part, value) {
    const compressed = new Blob([JSON.stringify(value)]).stream().pipeThrough(new CompressionStream('gzip'));
    const payload = await new Response(compressed).arrayBuffer();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptionKey = await crypto.subtle.importKey('raw', await key(id, part), 'AES-GCM', false, ['encrypt']);
    const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM', iv}, encryptionKey, payload);
    const body = new Blob([iv, ciphertext], {type:'application/octet-stream'});
    const checksum = mapAssetHex(new Uint8Array(await crypto.subtle.digest('SHA-256', await body.arrayBuffer())));
    const response = await fetch(new URL(mapAssetPath(id, part), storage), {
      method:'PUT', headers:{AccessKey:storageKey, Checksum:checksum.toUpperCase(), 'Content-Type':body.type},
      body, signal:AbortSignal.timeout(15000)
    });
    if (response.status !== 201) throw new Error(`Bunny map upload failed (HTTP ${response.status}).`);
    return body.size;
  }

  return {
    async historyKey(id) { return mapAssetHex(await key(id, 'history')); },
    async read(id, part) {
      return fetchMapAsset(id, part, mapAssetHex(await key(id, part)), AbortSignal.timeout(5000));
    },
    async upload(id, release) {
      const {statistics, ...history} = release;
      const historyBytes = await upload(id, 'history', history);
      const fullBytes = await upload(id, 'full', release);
      return {historyBytes, fullBytes};
    }
  };
}
