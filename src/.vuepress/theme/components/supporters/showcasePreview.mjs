import { normalizePath } from '../spotlight/spotlightModel.mjs';

// A directory card needs only the small album catalog and up to four selected scenes.
export function showcasePreviewSelections(catalog, selections, now = Date.now()) {
  const albums = new Map(catalog.filter(album => !album.exclude && album.scene_data_url
    && (Date.parse(album.date || album.release_date) || 0) <= now).map(album => [normalizePath(album.path), album]));
  const seen = new Set();
  return (selections || []).flatMap(selection => {
    const album = albums.get(normalizePath(selection.path)), number = Number(selection.number);
    const key = `${album?.path}#${number}`;
    if (!album || !Number.isInteger(number) || number < 1 || seen.has(key)) return [];
    seen.add(key);
    return [{ album, number, key }];
  }).slice(0, 4);
}

export function showcaseSummary(profile, collectionCount = 0, publicContent = null) {
  const count = (number, singular, plural = `${singular}s`) => number ? `${number} ${number === 1 ? singular : plural}` : '';
  return [count(profile.scenes?.length, 'scene highlight'), count(collectionCount, 'collection'), count((publicContent?.map_views || profile.map_views)?.length, 'map view'), count((publicContent?.map_pins || profile.map_pins)?.length, 'shared pin'), count(publicContent?.map_notes?.length, 'map note'), count(publicContent?.comments?.length, 'episode comment')].filter(Boolean).join(' · ');
}

// Keep directory previews representative without reproducing the whole showcase.
export function showcasePreviewSections(profile, publicContent = null, sceneTitles = []) {
  const text = value => String(value || '').replace(/\s+/g, ' ').trim();
  const excerpt = value => {
    const valueText = text(value);
    return valueText.length > 140 ? `${valueText.slice(0, 139).trimEnd()}…` : valueText;
  };
  const names = (rows, label) => {
    const titles = rows.map(label).map(text).filter(Boolean);
    return excerpt(`${titles.slice(0, 2).join(' · ')}${titles.length > 2 ? ` · +${titles.length - 2} more` : ''}`);
  };
  const sections = [];
  const add = (key, rows, singular, plural, detail) => {
    if (rows?.length) sections.push({ key, count: rows.length, label: rows.length === 1 ? singular : plural, detail });
  };
  add('scenes', profile.scenes, 'scene highlight', 'scene highlights', names(sceneTitles, title => title));
  const collections = publicContent?.collections || [];
  add('collections', collections, 'collection', 'collections', names(collections, row => row.title));
  const views = publicContent?.map_views || profile.map_views || [];
  add('views', views, 'map view', 'map views', names(views, row => row.title));
  const pins = publicContent?.map_pins || profile.map_pins || [];
  add('pins', pins, 'shared pin', 'shared pins', names(pins, row => row.name));
  const notes = publicContent?.map_notes || [];
  add('notes', notes, 'map note', 'map notes', excerpt(notes[0]?.note));
  const comments = publicContent?.comments || [];
  const episode = comments[0]?.page_path?.match(/^\/albums\/(s\d+|mk\d+)\/Episode([\d.]+)\/$/i);
  const commentLabel = episode ? `${episode[1].toLowerCase().startsWith('s') ? 'Season' : 'Mark'} ${episode[1].slice(episode[1].toLowerCase().startsWith('s') ? 1 : 2)} · Episode ${episode[2]} — ` : '';
  add('comments', comments, 'episode comment', 'episode comments', excerpt(`${commentLabel}${comments[0]?.message || ''}`));
  return sections;
}

let catalogPromise;
export function loadShowcasePreviewCatalog(withBase = path => path) {
  if (!catalogPromise) catalogPromise = fetch(withBase('/data/albums/index.json')).then(async response => {
    if (!response.ok) throw new Error('Preview unavailable.');
    const data = await response.json();
    if (!Array.isArray(data.albums)) throw new Error('Preview unavailable.');
    return data.albums;
  }).catch(error => { catalogPromise = null; throw error; });
  return catalogPromise;
}
