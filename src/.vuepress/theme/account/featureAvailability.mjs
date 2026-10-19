function notice(code, message, action = '', actionLabel = '') {
  return { code, message, action, actionLabel };
}

export function supporterRestriction({ signedIn, allowed, checking, failed, status }) {
  if (!signedIn) return notice('signed-out', 'Sign in with your Ko-fi payment email to use this supporter feature.', 'account', 'Sign in');
  if (allowed) return null;
  if (checking) return notice('checking', 'Checking your supporter access…');
  if (failed) return notice('verification-failed', 'We couldn’t check your supporter access. Please try again.', 'retry-access', 'Retry access check');
  if (status === 'expired') return notice('expired', 'Your supporter access has ended. Thank you for supporting CBR! You can donate again anytime to bring back your perks.', 'donate', 'Support CBR again');
  return notice('supporter-required', 'No current supporter access was found for this account. If you donated recently, check that you’re signed in with your Ko-fi payment email.', 'account', 'Check account');
}

export function commentRestriction({ windowOpen, closesLabel, powerRanking, ...access }) {
  if (!windowOpen) {
    const subject = powerRanking ? 'power ranking' : 'episode';
    return notice('comments-closed', `Comments for this ${subject} ${closesLabel ? `closed on ${closesLabel}` : 'are closed'}. The commenting window is closed for everyone; existing comments are still available to read.`);
  }
  return supporterRestriction(access);
}

export function mapEditRestriction({ snapshot, loading, loadFailed, syncing, syncFailed, local, localRequiresAuth, ...access }) {
  if (snapshot) return notice('snapshot', 'You’re viewing a read-only map snapshot. Switch to the live map to edit.', 'live-map', 'View live map');
  if (loading) return notice('loading', 'The map is still loading. Editing will be available once it finishes.');
  if (loadFailed) return notice('load-failed', 'The map couldn’t load. Please reload it before editing.', 'reload-map', 'Reload map');
  if (syncing) return notice('syncing', 'The live map is updating. Editing is temporarily paused until it finishes.');
  if (syncFailed) return notice('sync-failed', 'Live map updates are unavailable. Editing is temporarily paused to avoid saving over newer changes.', 'retry-map', 'Retry live updates');
  if (local) return localRequiresAuth && !access.signedIn
    ? notice('local-sign-in', 'Sign in to make local edits. Local edits stay on this device.', 'account', 'Sign in')
    : null;
  return supporterRestriction(access);
}
