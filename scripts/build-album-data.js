const fs = require("fs");
const path = require("path");
const yamlFront = require("yaml-front-matter");

const ROOT = path.resolve(__dirname, "..");
const ALBUMS_DIR = path.join(ROOT, "src", "albums");
const OUTPUT_DIR = path.join(
  ROOT,
  "src",
  ".vuepress",
  "public",
  "data",
  "albums"
);

function listMarkdownFiles(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listMarkdownFiles(fullPath);
      }
      return /\.md$/i.test(entry.name) ? [fullPath] : [];
    });
}

function normalizeRoute(relativeFile) {
  const stem = relativeFile.replace(/\\/g, "/").replace(/\.md$/i, "");
  return `/albums/${stem}/`;
}

function sceneNumber(scene, fallback) {
  const parsed = Number.parseInt(scene && scene.scene_number, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMetadata(frontmatter, route, dataUrl, count) {
  const keys = [
    "title",
    "edition",
    "pr",
    "release_date",
    "date",
    "narrated_by",
    "image",
    "description",
    "exclude",
    "episode_number",
  ];
  const metadata = { path: route, scene_count: count, scene_data_url: dataUrl };
  keys.forEach((key) => {
    if (frontmatter[key] !== undefined && frontmatter[key] !== null) {
      metadata[key] = frontmatter[key];
    }
  });
  return metadata;
}

function removeStaleJsonFiles(directory, expectedFiles) {
  if (!fs.existsSync(directory)) return;
  fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      removeStaleJsonFiles(fullPath, expectedFiles);
      if (!fs.readdirSync(fullPath).length) fs.rmdirSync(fullPath);
      return;
    }
    if (/\.json$/i.test(entry.name) && !expectedFiles.has(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  });
}

function run() {
  const files = listMarkdownFiles(ALBUMS_DIR);
  const catalog = [];
  const sceneAlbums = [];
  const expectedFiles = new Set();
  let sceneTotal = 0;

  files.forEach((filePath) => {
    const relativeFile = path.relative(ALBUMS_DIR, filePath);
    const route = normalizeRoute(relativeFile);
    const frontmatter = yamlFront.loadFront(fs.readFileSync(filePath, "utf8"));
    const scenes = Array.isArray(frontmatter.scenes) ? frontmatter.scenes : [];
    if (!scenes.length) return;

    const relativeJson = relativeFile.replace(/\.md$/i, ".json");
    const outputPath = path.join(OUTPUT_DIR, relativeJson);
    const dataUrl = `/data/albums/${relativeJson.replace(/\\/g, "/")}`;
    const title = String(frontmatter.title || path.basename(relativeFile, ".md"));
    const sortDateValue = new Date(
      frontmatter.date || frontmatter.release_date || 0
    ).getTime();
    const sortDate = Number.isFinite(sortDateValue) ? sortDateValue : 0;
    const subtitle = [
      frontmatter.edition,
      frontmatter.release_date,
      frontmatter.narrated_by,
    ]
      .filter(Boolean)
      .map(String)
      .join(" · ");

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(
      outputPath,
      `${JSON.stringify({ version: 1, path: route, scenes })}\n`,
      "utf8"
    );
    expectedFiles.add(outputPath);
    sceneTotal += scenes.length;
    catalog.push(cleanMetadata(frontmatter, route, dataUrl, scenes.length));
    sceneAlbums.push({
      path: route,
      title,
      subtitle,
      sortDate,
      scenes: scenes.map((scene, index) => ({
        number: sceneNumber(scene, index + 1),
        title: stripHtml(scene.scene_title || scene.scene_title_html),
        previewUrl: String(scene.slide_url || scene.slide_svg || "").trim(),
      })),
    });
  });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const indexPath = path.join(OUTPUT_DIR, "index.json");
  const sceneIndexPath = path.join(OUTPUT_DIR, "scene-index.json");
  expectedFiles.add(indexPath);
  expectedFiles.add(sceneIndexPath);
  catalog.sort((a, b) => a.path.localeCompare(b.path, "en"));
  sceneAlbums.sort((a, b) => a.path.localeCompare(b.path, "en"));
  fs.writeFileSync(
    indexPath,
    `${JSON.stringify({ version: 1, albums: catalog })}\n`,
    "utf8"
  );
  fs.writeFileSync(
    sceneIndexPath,
    `${JSON.stringify({ version: 1, albums: sceneAlbums })}\n`,
    "utf8"
  );
  removeStaleJsonFiles(OUTPUT_DIR, expectedFiles);

  const bytes = Array.from(expectedFiles).reduce(
    (total, filePath) => total + fs.statSync(filePath).size,
    0
  );
  console.log(
    `Generated ${catalog.length} album files with ${sceneTotal} scenes (${(
      bytes /
      1024 /
      1024
    ).toFixed(2)} MB).`
  );
}

run();
