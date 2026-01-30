/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { pathToFileURL } = require("url");

const envPath =
  process.env.SUPPORTERS_ENV_FILE || path.join(__dirname, "../.env.supporters");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_GID = process.env.GOOGLE_SHEET_GID || "0";
const PUBLISHED_ID = process.env.GOOGLE_SHEET_PUB_ID;

const EMAIL_COLUMN = Number.parseInt(
  process.env.SUPPORTERS_EMAIL_COLUMN || "1",
  10
);
const NAME_COLUMN = Number.parseInt(
  process.env.SUPPORTERS_NAME_COLUMN || "2",
  10
);
const CIV_COLUMN = Number.parseInt(
  process.env.SUPPORTERS_CIV_COLUMN || "3",
  10
);

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";
const SUPABASE_PROFILES_TABLE =
  process.env.SUPPORTERS_PROFILES_TABLE || "profiles";
const SUPABASE_SETTINGS_TABLE =
  process.env.SUPPORTERS_USER_SETTINGS_TABLE || "user_settings";

const OUTPUT_PATH =
  process.env.SUPPORTERS_OUTPUT ||
  path.join(__dirname, "../src/.vuepress/public/supporters.svg");

const TITLE = process.env.SUPPORTERS_TITLE || "Supporters";
const FONT_FAMILY = process.env.SUPPORTERS_FONT || '"Teko","Impact",sans-serif';
const FONT_FILE = process.env.SUPPORTERS_FONT_FILE || "";
const FONT_NAME = process.env.SUPPORTERS_FONT_NAME || "Teko";
const WIDTH = Number.parseInt(process.env.SUPPORTERS_WIDTH || "1400", 10);
const PADDING = Number.parseInt(process.env.SUPPORTERS_PADDING || "110", 10);
const COLUMN_GAP = Number.parseInt(
  process.env.SUPPORTERS_COLUMN_GAP || "140",
  10
);
const FONT_SIZE = Number.parseInt(process.env.SUPPORTERS_FONT_SIZE || "34", 10);
const LINE_HEIGHT = Number.parseInt(
  process.env.SUPPORTERS_LINE_HEIGHT || "38",
  10
);
const TITLE_SIZE = Number.parseInt(
  process.env.SUPPORTERS_TITLE_SIZE || "90",
  10
);
const TITLE_GAP = Number.parseInt(process.env.SUPPORTERS_TITLE_GAP || "84", 10);
const TITLE_WEIGHT = process.env.SUPPORTERS_TITLE_WEIGHT || "500";
const NAME_WEIGHT = process.env.SUPPORTERS_NAME_WEIGHT || "400";
const BG_COLOR = process.env.SUPPORTERS_BG || "#0a0a0a";
const TITLE_COLOR = process.env.SUPPORTERS_TITLE_COLOR || "#ffffff";
const TEXT_COLOR = process.env.SUPPORTERS_TEXT_COLOR || "#f5f1e6";
const BAR_COLOR = process.env.SUPPORTERS_BAR_COLOR || "#f4a641";
const BAR_WIDTH = Number.parseInt(process.env.SUPPORTERS_BAR_WIDTH || "18", 10);
const TITLE_LETTER_SPACING = process.env.SUPPORTERS_TITLE_SPACING || "0.12em";
const NAME_LETTER_SPACING = process.env.SUPPORTERS_NAME_SPACING || "0.04em";
const UPPERCASE = (process.env.SUPPORTERS_UPPERCASE || "true") === "true";

const CIV_BADGE_RADIUS = Number.parseInt(
  process.env.SUPPORTERS_CIV_BADGE_RADIUS || "10",
  10
);
const CIV_BADGE_GAP = Number.parseInt(
  process.env.SUPPORTERS_CIV_BADGE_GAP || "10",
  10
);
const CIV_BADGE_STROKE_WIDTH = Number.parseInt(
  process.env.SUPPORTERS_CIV_BADGE_STROKE_WIDTH || "3",
  10
);
const CIV_FALLBACK_PRIMARY = process.env.SUPPORTERS_CIV_FALLBACK || "#6c6c6c";
const CIV_FALLBACK_SECONDARY =
  process.env.SUPPORTERS_CIV_FALLBACK_STROKE || "#d1c3a1";

const COUNTS_FONT_SIZE = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_FONT_SIZE || "22",
  10
);
const COUNTS_MIN_FONT_SIZE = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_MIN_FONT_SIZE || "16",
  10
);
const COUNTS_TEXT_WIDTH_FACTOR = Number.parseFloat(
  process.env.SUPPORTERS_CIV_COUNTS_TEXT_WIDTH_FACTOR || "0.45"
);
const COUNTS_LINE_HEIGHT = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_LINE_HEIGHT || "28",
  10
);
const COUNTS_ITEM_GAP = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_ITEM_GAP || "24",
  10
);
const COUNTS_ROW_GAP = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_ROW_GAP || "16",
  10
);
const COUNTS_ITEM_WIDTH = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_ITEM_WIDTH || "",
  10
);
const COUNTS_GAP = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_GAP || "50",
  10
);
const COUNTS_BADGE_RADIUS = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_BADGE_RADIUS || "8",
  10
);
const COUNTS_BADGE_GAP = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_BADGE_GAP || "8",
  10
);
const COUNTS_BADGE_STROKE_WIDTH = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_BADGE_STROKE_WIDTH || "3",
  10
);
const COUNTS_PANEL_PADDING = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_PANEL_PADDING || "16",
  10
);
const COUNTS_PANEL_BG =
  process.env.SUPPORTERS_CIV_COUNTS_PANEL_BG || "rgba(60,60,60,0.4)";
const COUNTS_TOP_N = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_TOP_N || "5",
  10
);
const COUNTS_LABEL =
  process.env.SUPPORTERS_CIV_COUNTS_LABEL || "Top 5 Supporters Choice";
const COUNTS_LABEL_FONT_SIZE = Number.parseInt(
  process.env.SUPPORTERS_CIV_COUNTS_LABEL_FONT_SIZE || "20",
  10
);
const COUNTS_LABEL_COLOR =
  process.env.SUPPORTERS_CIV_COUNTS_LABEL_COLOR || "#b6b3ae";

const TOOLTIP_FONT_SIZE = Number.parseInt(
  process.env.SUPPORTERS_TOOLTIP_FONT_SIZE || "36",
  10
);
const TOOLTIP_PADDING = Number.parseInt(
  process.env.SUPPORTERS_TOOLTIP_PADDING || "8",
  10
);
const TOOLTIP_OFFSET = Number.parseInt(
  process.env.SUPPORTERS_TOOLTIP_OFFSET || "6",
  10
);
const TOOLTIP_BG = process.env.SUPPORTERS_TOOLTIP_BG || "rgba(0,0,0,0.8)";
const TOOLTIP_TEXT_COLOR = process.env.SUPPORTERS_TOOLTIP_TEXT_COLOR || "#fff";

const CIV_COLOR_FILE = path.join(
  __dirname,
  "../src/.vuepress/data/civColors.mjs"
);

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const next = csv[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      current = "";
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }
    current += char;
  }
  row.push(current);
  if (row.some((cell) => cell !== "")) {
    rows.push(row);
  }
  return rows;
}

async function fetchSheetCsv() {
  if (!SHEET_ID) {
    throw new Error("Missing GOOGLE_SHEET_ID.");
  }
  const primaryUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
  let response = await fetch(primaryUrl);
  if (!response.ok && PUBLISHED_ID) {
    const publishedUrl = `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?output=csv`;
    response = await fetch(publishedUrl);
  }
  const csv = await response.text();
  if (!response.ok) {
    throw new Error("Unable to read Google Sheet.");
  }
  return csv;
}

async function loadCivColors() {
  try {
    const module = await import(pathToFileURL(CIV_COLOR_FILE).href);
    return {
      OWNER_COLOR_MAP: module.OWNER_COLOR_MAP || {},
      normalizeOwnerKey:
        module.normalizeOwnerKey ||
        ((value) =>
          String(value || "")
            .toLowerCase()
            .trim()),
    };
  } catch (error) {
    console.warn("Unable to load civ color map.");
    return {
      OWNER_COLOR_MAP: {},
      normalizeOwnerKey: (value) =>
        String(value || "")
          .toLowerCase()
          .trim(),
    };
  }
}

async function fetchSupabaseCivOverrides() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Map();
  }
  let createClient;
  try {
    ({ createClient } = require("@supabase/supabase-js"));
  } catch (error) {
    console.warn("Supabase client unavailable. Skipping civ overrides.");
    return new Map();
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profiles, error: profilesError } = await supabase
    .from(SUPABASE_PROFILES_TABLE)
    .select("id,email");
  if (profilesError) {
    console.warn("Unable to load profile emails.", profilesError);
    return new Map();
  }
  const { data: settingsRows, error: settingsError } = await supabase
    .from(SUPABASE_SETTINGS_TABLE)
    .select("user_id, settings");
  if (settingsError) {
    console.warn("Unable to load user settings.", settingsError);
    return new Map();
  }
  const emailById = new Map();
  (profiles || []).forEach((profile) => {
    const email = profile && profile.email ? String(profile.email) : "";
    if (!profile || !profile.id || !email) {
      return;
    }
    emailById.set(profile.id, email.trim().toLowerCase());
  });
  const overrides = new Map();
  (settingsRows || []).forEach((row) => {
    if (!row || !row.user_id) {
      return;
    }
    const email = emailById.get(row.user_id);
    if (!email) {
      return;
    }
    const settings =
      row.settings && typeof row.settings === "object" ? row.settings : {};
    const favorite =
      typeof settings.favoriteCiv === "string"
        ? settings.favoriteCiv.trim()
        : "";
    if (favorite) {
      overrides.set(email, favorite);
    }
  });
  return overrides;
}

function pickEntries(rows, civOverrides = new Map()) {
  if (!rows.length) {
    return [];
  }
  const body = rows.slice(1);
  const byName = new Map();

  body.forEach((row) => {
    const rawEmail = String(row[EMAIL_COLUMN] || "")
      .trim()
      .toLowerCase();
    const rawName = String(row[NAME_COLUMN] || "").trim();
    if (!rawName) {
      return;
    }
    if (rawName.trim().toLowerCase() === "coiot") {
      return;
    }
    const nameKey = rawName.trim().toLowerCase();
    if (byName.has(nameKey)) {
      return;
    }
    const overrideCiv = rawEmail ? civOverrides.get(rawEmail) : "";
    const rawCiv = overrideCiv
      ? String(overrideCiv).trim()
      : String(row[CIV_COLUMN] || "").trim();
    const name = UPPERCASE ? rawName.toUpperCase() : rawName;
    const civLabel = rawCiv ? (UPPERCASE ? rawCiv.toUpperCase() : rawCiv) : "";
    byName.set(nameKey, { name, civ: rawCiv, civLabel });
  });

  return Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" })
  );
}

function hydrateEntries(entries, civColors, normalizeOwnerKey) {
  return entries.map((entry) => {
    const civKey = entry.civ ? normalizeOwnerKey(entry.civ) : "";
    const color = civKey && civColors[civKey] ? civColors[civKey] : null;
    return {
      ...entry,
      civKey,
      civPrimary: color ? color.primary : CIV_FALLBACK_PRIMARY,
      civSecondary: color ? color.secondary : CIV_FALLBACK_SECONDARY,
    };
  });
}

function buildCivSummary(entries) {
  const summary = new Map();
  entries.forEach((entry) => {
    if (!entry.civKey) {
      return;
    }
    const existing = summary.get(entry.civKey) || {
      key: entry.civKey,
      label: entry.civLabel || entry.civ || entry.civKey,
      count: 0,
      primary: entry.civPrimary,
      secondary: entry.civSecondary,
    };
    existing.count += 1;
    summary.set(entry.civKey, existing);
  });
  return Array.from(summary.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.label.localeCompare(b.label, "en", { sensitivity: "base" });
  });
}

function buildSvg(entries, civSummary) {
  const safeEntries = entries.length
    ? entries
    : [
        {
          name: "Supporters list is empty",
          civPrimary: CIV_FALLBACK_PRIMARY,
          civSecondary: CIV_FALLBACK_SECONDARY,
        },
      ];
  const preferredColumns = Number.parseInt(
    process.env.SUPPORTERS_COLUMNS || "",
    10
  );
  const columns = Number.isFinite(preferredColumns)
    ? Math.max(1, preferredColumns)
    : Math.min(3, Math.max(2, Math.ceil(Math.sqrt(safeEntries.length))));
  const rows = Math.ceil(safeEntries.length / columns);
  const titleOffset = TITLE ? TITLE_SIZE + TITLE_GAP : 0;
  const innerPadding = Number.parseInt(
    process.env.SUPPORTERS_INNER_PADDING || String(Math.round(PADDING * 0.25)),
    10
  );
  const contentWidth = WIDTH - (PADDING + BAR_WIDTH + innerPadding) * 2;
  const columnWidth = (contentWidth - COLUMN_GAP * (columns - 1)) / columns;
  const namesHeight = rows * LINE_HEIGHT;
  const topCounts = civSummary.slice(0, COUNTS_TOP_N);
  const hasCounts = topCounts.length > 0;
  const countsLayout = [];
  let countsFontSize = COUNTS_FONT_SIZE;
  let countsItemGap = COUNTS_ITEM_GAP;
  let countsLineHeight = COUNTS_LINE_HEIGHT;
  const estimateCountsWidth = (fontSize, gap) => {
    const widths = topCounts.map((entry) => {
      const labelText = `${entry.label} ${entry.count}`;
      const textWidth = labelText.length * fontSize * COUNTS_TEXT_WIDTH_FACTOR;
      return COUNTS_BADGE_RADIUS * 2 + COUNTS_BADGE_GAP + textWidth;
    });
    const total =
      widths.reduce((sum, value) => sum + value, 0) +
      Math.max(0, widths.length - 1) * gap;
    return { total, widths };
  };
  if (hasCounts) {
    let { total, widths } = estimateCountsWidth(countsFontSize, countsItemGap);
    while (total > contentWidth && countsFontSize > COUNTS_MIN_FONT_SIZE) {
      countsFontSize -= 1;
      ({ total, widths } = estimateCountsWidth(countsFontSize, countsItemGap));
    }
    if (total > contentWidth && widths.length > 1) {
      const minGap = 6;
      const baseWidth = widths.reduce((sum, value) => sum + value, 0);
      const possibleGap = Math.floor(
        (contentWidth - baseWidth) / (widths.length - 1)
      );
      countsItemGap = Math.max(minGap, possibleGap);
      ({ total, widths } = estimateCountsWidth(countsFontSize, countsItemGap));
    }
    countsLineHeight = Math.max(
      Math.round(countsFontSize * 1.35),
      Math.round(COUNTS_LINE_HEIGHT * (countsFontSize / COUNTS_FONT_SIZE))
    );
    let cursorX = 0;
    widths.forEach((width, index) => {
      countsLayout.push({
        entry: topCounts[index],
        x: cursorX,
        y: 0,
        width,
      });
      cursorX += width + countsItemGap;
    });
  }
  const countsBlockWidth = hasCounts
    ? Math.max(0, ...countsLayout.map((item) => item.x + item.width))
    : 0;
  const countsHeight = hasCounts
    ? countsLineHeight + COUNTS_LABEL_FONT_SIZE + 12
    : 0;
  const countsGap = hasCounts ? COUNTS_GAP : 0;
  const startX = (WIDTH - contentWidth) / 2;
  const startY = PADDING + titleOffset;
  const height =
    PADDING * 2 + titleOffset + namesHeight + countsGap + countsHeight;

  const titleText = UPPERCASE ? TITLE.toUpperCase() : TITLE;
  const fontFace =
    FONT_FILE && fs.existsSync(FONT_FILE)
      ? `
    @font-face {
      font-family: "${FONT_NAME}";
      src: url("data:font/otf;base64,${fs
        .readFileSync(FONT_FILE)
        .toString("base64")}") format("opentype");
      font-weight: 500;
      font-style: normal;
      font-display: swap;
    }
    `
      : "";

  const textNodes = safeEntries
    .map((entry, index) => {
      const col = Math.floor(index / rows);
      const row = index % rows;
      const x = col * (columnWidth + COLUMN_GAP);
      const centerY = startY + row * LINE_HEIGHT + LINE_HEIGHT / 2;
      const badgeX = x + CIV_BADGE_RADIUS;
      const textX = x + CIV_BADGE_RADIUS * 2 + CIV_BADGE_GAP;
      const tooltipLabel = entry.civLabel || entry.civ || "";
      const tooltipWidth = tooltipLabel
        ? Math.max(
            60,
            tooltipLabel.length * TOOLTIP_FONT_SIZE * 0.6 + TOOLTIP_PADDING * 2
          )
        : 0;
      const tooltipHeight = TOOLTIP_FONT_SIZE + TOOLTIP_PADDING * 1.4;
      const tooltipX = badgeX - tooltipWidth / 2;
      const tooltipY =
        centerY - CIV_BADGE_RADIUS - TOOLTIP_OFFSET - tooltipHeight;

      return `  <g class="supporter">
    <circle class="civ-badge" cx="${badgeX}" cy="${centerY}" r="${CIV_BADGE_RADIUS}" fill="${
        entry.civPrimary
      }" stroke="${
        entry.civSecondary
      }" stroke-width="${CIV_BADGE_STROKE_WIDTH}" />
    ${
      tooltipLabel
        ? `<rect class="civ-tooltip-bg" x="${tooltipX}" y="${tooltipY}" width="${tooltipWidth}" height="${tooltipHeight}" rx="6" ry="6" />
    <text class="civ-tooltip" x="${badgeX}" y="${
            tooltipY + tooltipHeight / 2
          }" text-anchor="middle" dominant-baseline="middle">${escapeXml(
            tooltipLabel
          )}</text>`
        : ""
    }
    <text class="name" x="${textX}" y="${centerY}" dominant-baseline="middle">${escapeXml(
        entry.name
      )}</text>
  </g>`;
    })
    .join("\n");

  const countsOffsetX = hasCounts
    ? Math.max(0, (contentWidth - countsBlockWidth) / 2)
    : 0;
  const countsPanelWidth =
    hasCounts && countsBlockWidth
      ? countsBlockWidth + COUNTS_PANEL_PADDING * 2
      : 0;
  const countsPanelHeight =
    hasCounts && countsHeight ? countsHeight + COUNTS_PANEL_PADDING * 2 : 0;
  const countsPanelX = startX + countsOffsetX - COUNTS_PANEL_PADDING;
  const countsPanelY = startY + namesHeight + countsGap - COUNTS_PANEL_PADDING;
  const countsLabelX = startX + countsOffsetX + countsBlockWidth / 2;
  const countsLabelY =
    startY + namesHeight + countsGap + COUNTS_LABEL_FONT_SIZE;
  const countsNodes = hasCounts
    ? countsLayout
        .map(({ entry, x, y }) => {
          const centerY =
            startY +
            namesHeight +
            countsGap +
            COUNTS_LABEL_FONT_SIZE +
            14 +
            y +
            countsLineHeight / 2;
          const badgeX = x + COUNTS_BADGE_RADIUS;
          const textX = x + COUNTS_BADGE_RADIUS * 2 + COUNTS_BADGE_GAP;
          return `  <circle class="count-badge" cx="${badgeX}" cy="${centerY}" r="${COUNTS_BADGE_RADIUS}" fill="${
            entry.primary
          }" stroke="${
            entry.secondary
          }" stroke-width="${COUNTS_BADGE_STROKE_WIDTH}" />
  <text class="count" x="${textX}" y="${centerY}" dominant-baseline="middle">${escapeXml(
            entry.label
          )} ${entry.count}</text>`;
        })
        .join("\n")
    : "";

  const titleNode = TITLE
    ? `<text class="title" x="${WIDTH / 2}" y="${
        PADDING + TITLE_SIZE
      }" text-anchor="middle">${escapeXml(titleText)}</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${escapeXml(
    TITLE || "Supporters"
  )}">
  <style>
    ${fontFace}
    .title {
      font-family: ${FONT_FAMILY};
      font-size: ${TITLE_SIZE}px;
      font-weight: ${TITLE_WEIGHT};
      letter-spacing: ${TITLE_LETTER_SPACING};
      text-transform: uppercase;
      fill: ${TITLE_COLOR};
    }
    .name {
      font-family: ${FONT_FAMILY};
      font-size: ${FONT_SIZE}px;
      font-weight: ${NAME_WEIGHT};
      letter-spacing: ${NAME_LETTER_SPACING};
      fill: ${TEXT_COLOR};
    }
    .count {
      font-family: ${FONT_FAMILY};
      font-size: ${countsFontSize}px;
      font-weight: ${NAME_WEIGHT};
      letter-spacing: ${NAME_LETTER_SPACING};
      fill: ${TEXT_COLOR};
    }
    .supporter {
      cursor: default;
    }
    .civ-tooltip-bg,
    .civ-tooltip {
      opacity: 0;
      pointer-events: none;
    }
    .supporter:hover .civ-tooltip-bg,
    .supporter:hover .civ-tooltip {
      opacity: 1;
    }
    .civ-tooltip-bg {
      fill: ${TOOLTIP_BG};
    }
    .civ-tooltip {
      font-family: ${FONT_FAMILY};
      font-size: ${TOOLTIP_FONT_SIZE}px;
      fill: ${TOOLTIP_TEXT_COLOR};
      letter-spacing: ${NAME_LETTER_SPACING};
    }
    .counts-panel {
      fill: ${COUNTS_PANEL_BG};
    }
    .counts-label {
      font-family: ${FONT_FAMILY};
      font-size: ${COUNTS_LABEL_FONT_SIZE}px;
      fill: ${COUNTS_LABEL_COLOR};
      letter-spacing: ${NAME_LETTER_SPACING};
    }
    .side-bar {
      fill: ${BAR_COLOR};
    }
  </style>
  <rect width="100%" height="100%" fill="${BG_COLOR}" />

  <rect class="side-bar" x="${PADDING * 0.45}" y="${
    PADDING * 0.4
  }" width="${BAR_WIDTH}" height="${height - PADDING * 0.8}" />
  <rect class="side-bar" x="${WIDTH - PADDING * 0.45 - BAR_WIDTH}" y="${
    PADDING * 0.4
  }" width="${BAR_WIDTH}" height="${height - PADDING * 0.8}" />

  ${titleNode}
  <g class="names" transform="translate(${startX}, 0)">
${textNodes}
  </g>
  ${
    hasCounts
      ? `<rect class="counts-panel" x="${countsPanelX}" y="${countsPanelY}" width="${countsPanelWidth}" height="${countsPanelHeight}" rx="10" ry="10" />
  <text class="counts-label" x="${countsLabelX}" y="${countsLabelY}" text-anchor="middle">${escapeXml(
          COUNTS_LABEL
        )}</text>
  <g class="counts" transform="translate(${startX + countsOffsetX}, 0)">
${countsNodes}
  </g>`
      : ""
  }
</svg>
`;
}

async function run() {
  const csv = await fetchSheetCsv();
  const rows = parseCsv(csv);
  const { OWNER_COLOR_MAP, normalizeOwnerKey } = await loadCivColors();
  const civOverrides = await fetchSupabaseCivOverrides();
  const entries = hydrateEntries(
    pickEntries(rows, civOverrides),
    OWNER_COLOR_MAP,
    normalizeOwnerKey
  );
  const civSummary = buildCivSummary(entries);
  const svg = buildSvg(entries, civSummary);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, svg, "utf8");
  console.log(`Wrote ${entries.length} supporters to ${OUTPUT_PATH}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
