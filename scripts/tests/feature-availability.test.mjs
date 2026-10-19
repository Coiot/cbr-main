import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commentRestriction, mapEditRestriction, supporterRestriction } from '../../src/.vuepress/theme/account/featureAvailability.mjs';
import { albumCommentsComputed, albumCommentsMethods } from '../../src/.vuepress/theme/components/albums/behavior/albumComments.js';
import { mapAccessComputed, mapAccessMethods } from '../../src/.vuepress/theme/components/community/map/mapAccess.js';

const supporter = { signedIn: true, allowed: true, status: 'active' };

test('closed comments explain the release deadline regardless of account access', () => {
  for (const access of [supporter, { signedIn: false }, { signedIn: true, status: 'expired' }, { signedIn: true, failed: true }]) {
    const notice = commentRestriction({ ...access, windowOpen: false, closesLabel: 'October 20, 2026' });
    assert.equal(notice.code, 'comments-closed');
    assert.match(notice.message, /episode closed on October 20, 2026/);
    assert.equal(notice.action, '');
    assert.doesNotMatch(notice.message, /donat|Sign in/);
  }
  assert.match(commentRestriction({ windowOpen: false, powerRanking: true }).message, /power ranking/);
});

test('open comment windows distinguish expired access, failed verification, and sign in', () => {
  assert.equal(commentRestriction({ ...supporter, windowOpen: true }), null);
  assert.equal(commentRestriction({ windowOpen: true, signedIn: true, status: 'expired' }).action, 'donate');
  assert.equal(commentRestriction({ windowOpen: true, signedIn: true, failed: true }).action, 'retry-access');
  assert.equal(commentRestriction({ windowOpen: true, signedIn: false }).action, 'account');
  assert.equal(supporterRestriction({ signedIn: true, checking: true, status: 'expired' }).code, 'checking');
  assert.equal(supporterRestriction({ signedIn: true, status: 'none' }).code, 'supporter-required');
});

test('snapshot and map connection notices take precedence over donation access', () => {
  for (const access of [supporter, { signedIn: false }, { signedIn: true, status: 'expired' }]) {
    const notice = mapEditRestriction({ ...access, snapshot: true, syncing: true });
    assert.equal(notice.code, 'snapshot');
    assert.equal(notice.action, 'live-map');
    assert.doesNotMatch(notice.message, /donat|Sign in/);
  }
  assert.equal(mapEditRestriction({ ...supporter, loading: true }).code, 'loading');
  assert.equal(mapEditRestriction({ ...supporter, loadFailed: true }).action, 'reload-map');
  assert.equal(mapEditRestriction({ ...supporter, syncing: true }).code, 'syncing');
  assert.equal(mapEditRestriction({ ...supporter, syncFailed: true }).action, 'retry-map');
});

test('live supporter editing and existing local mode permissions remain available', () => {
  assert.equal(mapEditRestriction(supporter), null);
  assert.equal(mapEditRestriction({ local: true, localRequiresAuth: false }), null);
  assert.equal(mapEditRestriction({ local: true, localRequiresAuth: true, signedIn: true, status: 'expired' }), null);
  assert.equal(mapEditRestriction({ local: true, localRequiresAuth: true }).code, 'local-sign-in');
});

test('disabled map controls and attempted edits use the same restriction', () => {
  const ctx = { snapshotViewId: 's5-episode-34', canEdit: true, authUser: { id: 'reader' } };
  for (const [key, get] of Object.entries(mapAccessComputed)) Object.defineProperty(ctx, key, { get: get.bind(ctx) });
  assert.equal(ctx.editAccessAllowed, false);
  assert.equal(mapAccessMethods.ensureEditAccess.call(ctx), false);
  assert.match(ctx.editAccessMessage, /read-only map snapshot/);
  ctx.snapshotViewId = ''; assert.equal(ctx.editAccessAllowed, true);
  ctx.canEdit = false; ctx.supporterStatus = 'expired';
  assert.equal(ctx.editAccessNotice.code, 'expired');
});

test('comment actions report the closed window without attempting a database write', async () => {
  const notice = commentRestriction({ windowOpen: false, signedIn: true, status: 'expired' });
  const messages = [];
  const ctx = { commentAccessNotice: notice, authUser: { id: 'reader' }, userComment: { message: 'Saved' },
    refreshCommentWindow() {}, setCommentMessage: message => messages.push(message),
    supabase: { from() { assert.fail('Closed comments must not write'); } } };
  albumCommentsMethods.previewComment.call(ctx);
  await albumCommentsMethods.submitComment.call(ctx);
  albumCommentsMethods.startEditComment.call(ctx);
  await albumCommentsMethods.deleteComment.call(ctx);
  assert.deepEqual(messages, Array(4).fill(notice.message));
});

test('comment deadline refresh closes an already open page and uses the actual PR deadline label', t => {
  const oldWindow = globalThis.window;
  let callback, delay;
  globalThis.window = { clearTimeout() {}, setTimeout(fn, ms) { callback = fn; delay = ms; return 1; } };
  t.after(() => { if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow; });
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-20T12:00:00Z') });
  const ctx = { showComments: true, isPowerRanking: true, isSeasonFive: true,
    commentWindowEndsAt: new Date(Date.now() + 500), refreshCommentWindow() { albumCommentsMethods.refreshCommentWindow.call(this); } };
  ctx.refreshCommentWindow();
  assert.equal(albumCommentsComputed.commentWindowOpen.call(ctx), true);
  assert.equal(delay, 501);
  assert.equal(albumCommentsComputed.commentWindowLabel.call(ctx), ctx.commentWindowEndsAt.toLocaleDateString());
  t.mock.timers.tick(501); callback();
  assert.equal(albumCommentsComputed.commentWindowOpen.call(ctx), false);
});
