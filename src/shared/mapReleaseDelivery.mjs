import {isReleaseId, MAX_RELEASE_BYTES} from './mapRelease.mjs';

const origin = 'https://cdn.civbattleroyale.tv';
const hex = /^[0-9a-f]{64}$/;
const ivSize = 12;

export function mapAssetPath(id, part) {
  if (!isReleaseId(id) || !['history', 'full'].includes(part)) throw new Error('Invalid map asset.');
  return `map-releases/v1/${id}-${part}.bin`;
}

export function mapAssetKeyBytes(key) {
  if (!hex.test(key)) throw new Error('Invalid map asset key.');
  return Uint8Array.from(key.match(/../g), byte => parseInt(byte, 16));
}

export const mapAssetHex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

export async function fetchMapAsset(id, part, key, signal) {
  const url = new URL(mapAssetPath(id, part), origin);
  const response = await fetch(url, {signal});
  if (!response.ok) throw new Error('Map CDN asset is unavailable.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length <= ivSize || bytes.length > MAX_RELEASE_BYTES) throw new Error('Invalid map asset size.');
  const decryptionKey = await crypto.subtle.importKey('raw', mapAssetKeyBytes(key), 'AES-GCM', false, ['decrypt']);
  const payload = await crypto.subtle.decrypt({name:'AES-GCM', iv:bytes.subarray(0, ivSize)}, decryptionKey, bytes.subarray(ivSize));
  const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).json();
}
