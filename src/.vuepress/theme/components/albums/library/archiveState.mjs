// Archive navigation context is transient UI state; reading status lives in Supabase.
const returns = new Map();
let pendingReturn = null;
export function archiveControls(query = {}) {
  return {
    episodeQuery: typeof query.q === 'string' ? query.q : '',
    albumSort: ['asc', 'desc'].includes(query.sort) ? query.sort : '',
    readingFilter: ['all', 'unread', 'not_started', 'in_progress', 'finished'].includes(query.reading) ? query.reading : 'all',
  };
}
export function archiveQuery(route, controls, editionId) {
  const query = { ...route.query, edition: editionId };
  for (const key of ['q', 'sort', 'reading']) delete query[key];
  if (controls.episodeQuery) query.q = controls.episodeQuery;
  if (controls.albumSort) query.sort = controls.albumSort;
  if (controls.readingFilter !== 'all') query.reading = controls.readingFilter;
  return query;
}
export function rememberArchive(postPath, route, scrollY) {
  const record = { albumPath: postPath, to: { path: route.path, query: { ...route.query } }, scrollY };
  returns.set(postPath, record); pendingReturn = record;
}
export function archiveReturnFor(path) { return returns.get(path); }
export function takeArchiveScroll(route) {
  if (!pendingReturn || route.path !== pendingReturn.to.path
    || JSON.stringify(archiveControls(route.query)) !== JSON.stringify(archiveControls(pendingReturn.to.query))
    || route.query?.edition !== pendingReturn.to.query?.edition) return null;
  const value = pendingReturn.scrollY; pendingReturn = null; return value;
}

export function carryArchiveReturn(from, to) {
  const record = returns.get(from);
  if (record && from?.split('/')[2] === to?.split('/')[2]) {
    const next = { ...record, albumPath: to };
    returns.set(to, next); pendingReturn = next;
  }
}
