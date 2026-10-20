import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sendSignInLink, signInRedirect, signInReturnScene } from '../../src/.vuepress/theme/account/signIn.mjs';
import { reactionSignInPosition } from '../../src/.vuepress/theme/components/albums/reactionSignInPosition.mjs';
import { albumViewingMethods } from '../../src/.vuepress/theme/components/albums/behavior/albumViewing.js';
import { albumProgressMethods } from '../../src/.vuepress/theme/components/albums/behavior/albumProgress.js';
import { albumReactionsMethods } from '../../src/.vuepress/theme/components/albums/behavior/albumReactions.js';

const location = { origin: 'https://civbattleroyale.tv', pathname: '/albums/s5/Episode34/', search: '?edition=s5', hash: '' };

test('sign-in return carries the selected scene across tabs without mixing it with auth tokens', () => {
  const redirect = signInRedirect({ ...location, hash: '#access_token=private' }, 17);
  assert.equal(redirect, 'https://civbattleroyale.tv/albums/s5/Episode34/?edition=s5&signin_scene=17');
  assert.equal(signInReturnScene({ search: '?signin_scene=17', hash: '#access_token=private' }), 17);
  assert.equal(signInReturnScene({ search: '?signin_scene=17', hash: '#scene-23' }), 23);
  assert.equal(signInRedirect({ ...location, hash: '#scene-23' }), signInRedirect(location, 23));
});

test('sign-in scene destinations reject malformed and unsafe numbers', () => {
  for (const value of ['-1', '0', '2.5', '3junk', 'https://other.test/', '9007199254740992']) {
    assert.equal(signInReturnScene({ search: `?signin_scene=${encodeURIComponent(value)}` }), null);
  }
  assert.equal(signInReturnScene({ hash: '#anything' }), null);
  assert.equal(signInRedirect({ ...location, search: '?signin_scene=bad' }), location.origin + location.pathname);
});

test('successful email request preserves the original tab context without navigation', async () => {
  const requests = [], changes = [];
  const history = { state: { position: 4 }, replaceState: (...args) => changes.push(args) };
  const client = { auth: { signInWithOtp: async request => { requests.push(request); return {}; } } };
  const result = await sendSignInLink(client, ' reader@example.com ', { location, history, scene: 17 });
  assert.equal(result.ok, true);
  assert.equal(requests[0].email, 'reader@example.com');
  assert.equal(new URL(requests[0].options.emailRedirectTo).searchParams.get('signin_scene'), '17');
  assert.deepEqual(changes, [[history.state, '', requests[0].options.emailRedirectTo]]);
});

test('failed requests and invalid email do not change the reading URL, and retries work', async () => {
  let calls = 0, changes = 0;
  const client = { auth: { signInWithOtp: async () => { calls++; return calls === 1 ? { error: { message: 'Please wait before trying again.' } } : {}; } } };
  const options = { location, scene: 17, history: { replaceState() { changes++; } } };
  assert.equal((await sendSignInLink(client, 'invalid', options)).ok, false);
  assert.equal(calls, 0);
  const failed = await sendSignInLink(client, 'reader@example.com', options);
  assert.equal(failed.ok, false);
  assert.match(failed.message, /Please wait/);
  assert.equal(changes, 0);
  assert.equal((await sendSignInLink(client, 'reader@example.com', options)).ok, true);
  assert.equal(changes, 1);
});

test('network failure is recoverable and unavailable history does not mask a sent email', async () => {
  assert.equal((await sendSignInLink({ auth: { signInWithOtp() { throw new Error('Offline'); } } }, 'reader@example.com', { location })).ok, false);
  const result = await sendSignInLink({ auth: { signInWithOtp: async () => ({}) } }, 'reader@example.com', {
    location, scene: 17, history: { replaceState() { throw new Error('Storage restricted'); } },
  });
  assert.equal(result.ok, true);
});

test('email-return destination restores the scene and takes precedence over an old bookmark', t => {
  const previous = globalThis.window;
  globalThis.window = { location: { search: '?signin_scene=17', hash: '' } };
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  const context = { sceneCount: 35, getHashSceneNumber: albumViewingMethods.getHashSceneNumber,
    goToScene() { this.visited = this.jumpToScene; } };
  albumViewingMethods.applyHashScene.call(context);
  assert.equal(context.visited, 17);
  albumProgressMethods.loadBookmarkLocal.call({
    getHashSceneNumber: context.getHashSceneNumber, getLocalSceneNumber: () => 3,
    $nextTick() { assert.fail('Old bookmark must not move a sign-in return'); },
  });
  context.sceneCount = 10;
  albumViewingMethods.applyHashScene.call(context);
  assert.equal(context.visited, 10);
});

test('guest reaction attempts cannot write a reaction', async () => {
  await albumReactionsMethods.toggleReaction.call({ authUser: null,
    supabase: { from() { assert.fail('Guest cannot write'); } } }, 17, 'clap');
});

test('popover fits a narrow viewport and flips above a low reaction button', () => {
  const viewport = { width: 320, height: 640 };
  const panel = { width: 296, height: 330 };
  const result = reactionSignInPosition({ left: 260, top: 550, bottom: 590 }, panel, viewport);
  assert.equal(result.left, 12);
  assert.equal(result.top, 212);
  assert.ok(result.top + panel.height < 550);
  const below = reactionSignInPosition({ left: 20, top: 30, bottom: 70 }, panel, viewport);
  assert.equal(below.top, 78);
  assert.equal(below.left, 12);
});

test('popover remains inside the visual viewport when a keyboard reduces available space', () => {
  const viewport = { width: 390, height: 260, top: 180 };
  const panel = { width: 352, height: 390 };
  for (const anchor of [{ left: 20, top: 300, bottom: 340 }, { left: 20, top: 100, bottom: 140 }, { left: 20, top: 500, bottom: 540 }]) {
    const result = reactionSignInPosition(anchor, panel, viewport);
    assert.ok(result.maxHeight > 0);
    assert.ok(result.top >= 192);
    assert.ok(result.top + Math.min(panel.height, result.maxHeight) <= 428);
    assert.ok(result.left >= 12 && result.left + panel.width <= 378);
  }
});
