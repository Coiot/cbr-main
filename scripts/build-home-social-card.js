/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const yamlFrontMatter = require("yaml-front-matter");

const ROOT_DIR = path.join(__dirname, "..");
const ALBUMS_DIR = path.join(ROOT_DIR, "src/albums");
const PUBLIC_DIR = path.join(ROOT_DIR, "src/.vuepress/public");

const OUTPUT_PATH =
  process.env.SOCIAL_CARD_OUTPUT || path.join(PUBLIC_DIR, "social-card.svg");
const OUTPUT_PNG_PATH =
  process.env.SOCIAL_CARD_OUTPUT_PNG ||
  path.join(PUBLIC_DIR, "social-card.png");
const EPISODE_CARD_DIR =
  process.env.SOCIAL_CARD_EPISODE_DIR ||
  path.join(PUBLIC_DIR, "social/episodes");
const EPISODE_CARD_LIMIT = Number.parseInt(
  process.env.SOCIAL_CARD_EPISODE_LIMIT || "3",
  10
);
const FONT_FILE =
  process.env.SOCIAL_CARD_FONT_FILE || process.env.SUPPORTERS_FONT_FILE || "";
const FONT_NAME =
  process.env.SOCIAL_CARD_FONT_NAME ||
  process.env.SUPPORTERS_FONT_NAME ||
  "Teko";
const FONT_FAMILY =
  process.env.SOCIAL_CARD_FONT || `"${FONT_NAME}","Teko","Impact",sans-serif`;

const WIDTH = Number.parseInt(process.env.SOCIAL_CARD_WIDTH || "1200", 10);
const HEIGHT = Number.parseInt(process.env.SOCIAL_CARD_HEIGHT || "630", 10);
const PADDING = Number.parseInt(process.env.SOCIAL_CARD_PADDING || "50", 10);
const ACCENT = process.env.SOCIAL_CARD_ACCENT || "#ffbf46";

const SITE_TITLE =
  process.env.SOCIAL_CARD_SITE_TITLE || "Civilization Battle Royale";
const KICKER = process.env.SOCIAL_CARD_KICKER || "Latest Episode";
const SITE_URL = process.env.SOCIAL_CARD_SITE_URL || "civbattleroyale.tv";
let sharpModule = null;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function walkMarkdown(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkMarkdown(fullPath));
      return;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(fullPath);
    }
  });
  return files;
}

function isSeasonAlbum(filePath) {
  const relative = path.relative(ALBUMS_DIR, filePath);
  const [top] = relative.split(path.sep);
  return /^s\d+/i.test(top || "");
}

function parseEpisode(filePath) {
  let frontmatter;
  try {
    frontmatter = yamlFrontMatter.loadFront(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return null;
  }
  if (!frontmatter || !frontmatter.title) {
    return null;
  }
  const dateValue = frontmatter.date || frontmatter.release_date || "";
  const timestamp = Date.parse(dateValue);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  const image =
    frontmatter.image ||
    (Array.isArray(frontmatter.scenes) && frontmatter.scenes.length
      ? frontmatter.scenes[0].slide_url
      : "");
  return {
    filePath,
    title: frontmatter.title,
    edition: frontmatter.edition || "",
    release_date: frontmatter.release_date || "",
    image: image || "",
    timestamp,
  };
}

function guessMimeType(source) {
  const ext = String(source || "")
    .split("?")[0]
    .split("#")[0]
    .split(".")
    .pop()
    .toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

function fetchBuffer(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location &&
          redirectCount < 5
        ) {
          const nextUrl = response.headers.location.startsWith("http")
            ? response.headers.location
            : new URL(response.headers.location, url).toString();
          response.resume();
          fetchBuffer(nextUrl, redirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }
        if (!response.statusCode || response.statusCode >= 400) {
          reject(
            new Error(
              `Failed to fetch ${url} (status ${response.statusCode || "?"})`
            )
          );
          response.resume();
          return;
        }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: response.headers["content-type"],
          });
        });
      })
      .on("error", reject);
  });
}

async function loadImageData(source) {
  if (!source) {
    return null;
  }
  if (source.startsWith("http")) {
    const { buffer, contentType } = await fetchBuffer(source);
    const mime = contentType || guessMimeType(source);
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }
  if (source.startsWith("/")) {
    const localPath = path.join(PUBLIC_DIR, source);
    if (!fs.existsSync(localPath)) {
      return null;
    }
    const buffer = fs.readFileSync(localPath);
    const mime = guessMimeType(localPath);
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }
  if (fs.existsSync(source)) {
    const buffer = fs.readFileSync(source);
    const mime = guessMimeType(source);
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }
  return null;
}

function wrapText(text, maxWidth, fontSize, widthFactor = 0.58) {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) {
    return [];
  }
  const maxChars = Math.max(6, Math.floor(maxWidth / (fontSize * widthFactor)));
  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (next.length <= maxChars) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function getSharp() {
  if (sharpModule) {
    return sharpModule;
  }
  try {
    // eslint-disable-next-line global-require
    sharpModule = require("sharp");
    return sharpModule;
  } catch (error) {
    return null;
  }
}

function buffersEqual(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.equals(b);
}

function writeTextIfChanged(filePath, text) {
  const next = String(text);
  if (fs.existsSync(filePath)) {
    const prev = fs.readFileSync(filePath, "utf8");
    if (prev === next) {
      return { wrote: false, skipped: true, reason: "unchanged" };
    }
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next, "utf8");
  return { wrote: true, skipped: false };
}

function writeBufferIfChanged(filePath, nextBuffer) {
  if (!Buffer.isBuffer(nextBuffer)) {
    return { wrote: false, skipped: true, reason: "invalid-buffer" };
  }
  if (fs.existsSync(filePath)) {
    const prevBuffer = fs.readFileSync(filePath);
    if (buffersEqual(prevBuffer, nextBuffer)) {
      return { wrote: false, skipped: true, reason: "unchanged" };
    }
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, nextBuffer);
  return { wrote: true, skipped: false };
}

async function renderPngBufferFromSvg(svg) {
  const sharp = getSharp();
  if (!sharp) {
    return null;
  }
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function writePngFromSvg(svg) {
  const pngBuffer = await renderPngBufferFromSvg(svg);
  if (!pngBuffer) {
    console.warn("sharp not installed; skipping social-card.png generation.");
    return { wrote: false, skipped: true, reason: "sharp-missing" };
  }
  try {
    return writeBufferIfChanged(OUTPUT_PNG_PATH, pngBuffer);
  } catch (error) {
    console.warn("Failed to write social-card.png.", error);
    return { wrote: false, skipped: true, reason: "write-failed" };
  }
}

function toEpisodeSlug(filePath) {
  const relative = path.relative(ALBUMS_DIR, filePath);
  const noExt = relative.replace(path.extname(relative), "");
  return noExt.split(path.sep).join("-").toLowerCase();
}

function buildCardSvg({
  episodeTitle,
  episodeMeta,
  kickerText = KICKER,
  imageData,
  imageWidth,
  imageHeight,
  imageX,
  imageY,
  imageRadius,
  textMaxWidth,
  brandSize,
  kickerSize,
  titleSize,
  titleLineHeight,
  metaSize,
  siteSize,
  hexRadius,
  hexWidth,
  hexHeight,
  hexStepY,
  hexRowYOffset,
  patternWidth,
  patternHeight,
  hexPath,
  brandY,
  kickerY,
  titleStartY,
  titleLines,
  titleText,
  metaY,
  siteY,
  fontFace,
}) {
  const safeKicker = kickerText || KICKER;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(
    `${SITE_TITLE} — ${safeKicker}`
  )}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0b0b" />
      <stop offset="55%" stop-color="#1b1508" />
      <stop offset="100%" stop-color="#2b1f0d" />
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,191,70,0.3)" />
      <stop offset="80%" stop-color="rgba(255,191,70,0)" />
    </linearGradient>
    <linearGradient id="imageOverlay" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.25)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.55)" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="rgba(0,0,0,0.55)" />
    </filter>
    <clipPath id="imageClip">
      <rect x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" rx="${imageRadius}" ry="${imageRadius}" />
    </clipPath>
    <pattern id="grid" width="${patternWidth.toFixed(
      3
    )}" height="${patternHeight.toFixed(3)}" patternUnits="userSpaceOnUse">
      <path d="${hexPath(
        hexWidth / 2,
        hexRadius
      )}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
      <path d="${hexPath(
        hexWidth / 2 + hexWidth,
        hexRadius
      )}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
      <path d="${hexPath(
        hexWidth,
        hexRadius + hexStepY + hexRowYOffset
      )}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
      <path d="${hexPath(
        hexWidth + hexWidth,
        hexRadius + hexStepY + hexRowYOffset
      )}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
    </pattern>
  </defs>
  <style>
    ${fontFace}
    .title {
      font-family: ${FONT_FAMILY};
      font-size: ${titleSize}px;
      font-weight: 600;
      letter-spacing: 0.01em;
      line-height: 1.2;
      fill: #ffffff;
    }
    .kicker {
      font-family: ${FONT_FAMILY};
      font-size: ${kickerSize}px;
      text-transform: uppercase;
      letter-spacing: 0.22em;
      fill: ${ACCENT};
    }
    .meta {
      font-family: ${FONT_FAMILY};
      font-size: ${metaSize}px;
      fill: rgba(255,255,255,0.75);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .site {
      font-family: ${FONT_FAMILY};
      font-size: ${siteSize}px;
      fill: rgba(255,255,255,0.65);
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    .brand {
      font-family: ${FONT_FAMILY};
      font-size: ${brandSize}px;
      letter-spacing: 0.18em;
      fill: rgba(255,255,255,0.9);
      text-transform: uppercase;
    }
  </style>
  <rect width="100%" height="100%" fill="url(#bg)" />
  <rect width="100%" height="100%" fill="url(#grid)" opacity="0.6" />
  <rect x="0" y="0" width="100%" height="${Math.round(
    HEIGHT * 0.5
  )}" fill="url(#glow)" />
  <text class="brand" x="${PADDING}" y="${brandY}">${escapeXml(
    SITE_TITLE
  )}</text>

  <text class="kicker" x="${PADDING}" y="${kickerY}">${escapeXml(
    safeKicker
  )}</text>
  <text class="title" x="${PADDING}" y="${titleStartY}" dominant-baseline="hanging">
    ${titleText}
  </text>
  ${
    episodeMeta
      ? `<text class="meta" x="${PADDING}" y="${metaY}">${escapeXml(
          episodeMeta
        )}</text>`
      : ""
  }
  <text class="site" x="${PADDING}" y="${siteY}">${escapeXml(SITE_URL)}</text>

  ${
    imageData
      ? `<g filter="url(#shadow)">
    <image href="${imageData}" x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" preserveAspectRatio="xMidYMid slice" clip-path="url(#imageClip)" />
    <rect x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" fill="url(#imageOverlay)" clip-path="url(#imageClip)" />
  </g>`
      : ""
  }
</svg>
`;
}

async function buildSocialCard() {
  const markdownFiles = walkMarkdown(ALBUMS_DIR).filter(isSeasonAlbum);
  const episodes = markdownFiles
    .map(parseEpisode)
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp);

  const latest = episodes[0] || null;
  const episodeTitle = latest ? latest.title : SITE_TITLE;
  const episodeMeta = [latest && latest.edition, latest && latest.release_date]
    .filter(Boolean)
    .join(" • ");

  const imageData = await loadImageData(latest && latest.image).catch(
    () => null
  );

  const imageWidth = Number.parseInt(
    process.env.SOCIAL_CARD_IMAGE_WIDTH || "640",
    10
  );
  const imageHeight = Number.parseInt(
    process.env.SOCIAL_CARD_IMAGE_HEIGHT || "520",
    10
  );
  const imageX = WIDTH - PADDING - imageWidth;
  const imageY = Math.round((HEIGHT - imageHeight) / 2);
  const imageRadius = Number.parseInt(
    process.env.SOCIAL_CARD_IMAGE_RADIUS || "28",
    10
  );

  const textMaxWidth = imageX - PADDING - 10;

  const brandSize = Number.parseInt(
    process.env.SOCIAL_CARD_BRAND_SIZE || "26",
    10
  );
  const kickerSize = Number.parseInt(
    process.env.SOCIAL_CARD_KICKER_SIZE || "26",
    10
  );
  const titleSize = Number.parseInt(
    process.env.SOCIAL_CARD_TITLE_SIZE || "48",
    10
  );
  const titleLineHeight = Math.round(titleSize * 1.15);
  const metaSize = Number.parseInt(
    process.env.SOCIAL_CARD_META_SIZE || "26",
    10
  );
  const siteSize = Number.parseInt(
    process.env.SOCIAL_CARD_SITE_SIZE || "22",
    10
  );
  const hexRadius = Number.parseInt(
    process.env.SOCIAL_CARD_HEX_RADIUS || "42",
    10
  );
  const hexWidth = Math.sqrt(3) * hexRadius;
  const hexHeight = hexRadius * 2;
  const hexStepY = 1 * hexRadius;
  const hexRowYOffset = hexHeight / 4;
  const patternWidth = hexWidth * 2;
  const patternHeight = (hexStepY + hexRowYOffset) * 2;

  const hexPath = (cx, cy) => {
    const halfWidth = hexWidth / 2;
    return [
      `M${cx.toFixed(3)} ${(cy - hexRadius).toFixed(3)}`,
      `L${(cx + halfWidth).toFixed(3)} ${(cy - hexRadius / 2).toFixed(3)}`,
      `L${(cx + halfWidth).toFixed(3)} ${(cy + hexRadius / 2).toFixed(3)}`,
      `L${cx.toFixed(3)} ${(cy + hexRadius).toFixed(3)}`,
      `L${(cx - halfWidth).toFixed(3)} ${(cy + hexRadius / 2).toFixed(3)}`,
      `L${(cx - halfWidth).toFixed(3)} ${(cy - hexRadius / 2).toFixed(3)}`,
      "Z",
    ].join(" ");
  };

  const brandY = PADDING + brandSize + 10;
  const kickerY = brandY + 35;
  const titleStartY = kickerY + 80;
  const titleLines = wrapText(episodeTitle, textMaxWidth, titleSize, 0.55);
  const titleBlockHeight = titleLines.length * titleLineHeight;
  const metaY = titleStartY + titleBlockHeight;
  const siteY = HEIGHT - PADDING - 20;

  const titleText = titleLines
    .map((line, index) => {
      const dy = index === 0 ? 0 : titleLineHeight;
      return `<tspan x="${PADDING}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const fontFace =
    FONT_FILE && fs.existsSync(FONT_FILE)
      ? `@font-face {\n  font-family: "${FONT_NAME}";\n  src: url("data:font/otf;base64,${fs
          .readFileSync(FONT_FILE)
          .toString(
            "base64"
          )}") format("opentype");\n  font-weight: 500;\n  font-style: normal;\n  font-display: swap;\n}\n`
      : "";

  const svg = buildCardSvg({
    episodeTitle,
    episodeMeta,
    imageData,
    imageWidth,
    imageHeight,
    imageX,
    imageY,
    imageRadius,
    textMaxWidth,
    brandSize,
    kickerSize,
    titleSize,
    titleLineHeight,
    metaSize,
    siteSize,
    hexRadius,
    hexWidth,
    hexHeight,
    hexStepY,
    hexRowYOffset,
    patternWidth,
    patternHeight,
    hexPath,
    brandY,
    kickerY,
    titleStartY,
    titleLines,
    titleText,
    metaY,
    siteY,
    fontFace,
  });

  const svgWrite = writeTextIfChanged(OUTPUT_PATH, svg);
  const pngWrite = await writePngFromSvg(svg);
  if (latest) {
    if (svgWrite.wrote) {
      console.log(`Wrote social card for ${latest.title} to ${OUTPUT_PATH}`);
    } else {
      console.log(
        `Skipped social card for ${latest.title}; SVG is unchanged at ${OUTPUT_PATH}`
      );
    }
  } else {
    if (svgWrite.wrote) {
      console.log(`Wrote fallback social card to ${OUTPUT_PATH}`);
    } else {
      console.log(
        `Skipped fallback social card; SVG is unchanged at ${OUTPUT_PATH}`
      );
    }
  }
  if (pngWrite && pngWrite.wrote) {
    console.log(`Wrote social card PNG to ${OUTPUT_PNG_PATH}`);
  } else if (fs.existsSync(OUTPUT_PNG_PATH)) {
    console.log(`Skipped social card PNG; unchanged at ${OUTPUT_PNG_PATH}`);
  }

  const latestEpisodes = episodes.slice(0, EPISODE_CARD_LIMIT);
  if (!latestEpisodes.length) {
    return;
  }
  const sharp = getSharp();
  if (!sharp) {
    console.warn("sharp not installed; skipping episode social cards.");
    return;
  }
  fs.mkdirSync(EPISODE_CARD_DIR, { recursive: true });
  for (const episode of latestEpisodes) {
    const slug = toEpisodeSlug(episode.filePath);
    const outputPng = path.join(EPISODE_CARD_DIR, `${slug}.png`);
    const episodeMetaLine = [episode.edition, episode.release_date]
      .filter(Boolean)
      .join(" • ");
    const episodeImage = await loadImageData(episode.image).catch(() => null);
    const episodeLines = wrapText(episode.title, textMaxWidth, titleSize, 0.55);
    const episodeTitleText = episodeLines
      .map((line, index) => {
        const dy = index === 0 ? 0 : titleLineHeight;
        return `<tspan x="${PADDING}" dy="${dy}">${escapeXml(line)}</tspan>`;
      })
      .join("");
    const episodeSvg = buildCardSvg({
      episodeTitle: episode.title,
      episodeMeta: episodeMetaLine,
      kickerText: "Season 5",
      imageData: episodeImage,
      imageWidth,
      imageHeight,
      imageX,
      imageY,
      imageRadius,
      textMaxWidth,
      brandSize,
      kickerSize,
      titleSize,
      titleLineHeight,
      metaSize,
      siteSize,
      hexRadius,
      hexWidth,
      hexHeight,
      hexStepY,
      hexRowYOffset,
      patternWidth,
      patternHeight,
      hexPath,
      brandY,
      kickerY,
      titleStartY,
      titleLines: episodeLines,
      titleText: episodeTitleText,
      metaY,
      siteY,
      fontFace,
    });
    try {
      const pngBuffer = await sharp(Buffer.from(episodeSvg)).png().toBuffer();
      const writeResult = writeBufferIfChanged(outputPng, pngBuffer);
      if (writeResult.wrote) {
        console.log(`Wrote episode social card to ${outputPng}`);
      } else {
        console.log(`Skipped episode social card; unchanged at ${outputPng}`);
      }
    } catch (error) {
      console.warn(`Failed to write episode social card for ${slug}.`, error);
    }
  }
}

buildSocialCard().catch((error) => {
  console.error(error);
  process.exit(1);
});
