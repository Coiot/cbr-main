import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'yaml-front-matter';

// One-time release selection. Future PRs are not silently appended to the published collection.
export function hyksosCollection(directory, now = Date.now()) {
  const scenes = readdirSync(directory).filter(name => /^s5pr\d+\.md$/.test(name))
    .sort((a, b) => Number(a.match(/\d+(?=\.md$)/)[0]) - Number(b.match(/\d+(?=\.md$)/)[0]))
    .flatMap(name => {
      const album = yaml.loadFront(readFileSync(join(directory, name), 'utf8'));
      if (album.exclude || Date.parse(album.date || album.release_date) > now) return [];
      const matches = (album.scenes || []).flatMap((scene, index) => String(scene.scene_title || '').trim() === 'Hyksos'
        ? [{ path: `/albums/pr/${name.slice(0, -3)}/`, number: Number.parseInt(scene.scene_number, 10) || index + 1, note: '' }] : []);
      if (matches.length > 1) throw new Error(`More than one Hyksos scene in ${name}. Review before publishing.`);
      return matches;
    });
  if (!scenes.length || scenes.length > 100) throw new Error('Expected between 1 and 100 matching Hyksos scenes.');
  return { title: 'Hyksos: Season 5 Power Rankings', description: 'Follow Hyksos through the Season 5 power rankings, from the opening predictions onward.', scenes, published: true, featured: false };
}
