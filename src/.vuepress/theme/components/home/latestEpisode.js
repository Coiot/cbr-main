export function latestEpisode(pages) {
  let latest = null, latestTime = -Infinity;
  for (const page of pages) {
    if (!/^\/albums\/s\d+\/[^/]+\/$/.test(page?.path || '') || page.frontmatter?.exclude) continue;
    const time = Date.parse(page.frontmatter?.date || '');
    if (Number.isFinite(time) && time > latestTime) {
      latest = page;
      latestTime = time;
    }
  }
  return latest;
}
