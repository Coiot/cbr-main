const fs = require("fs");
const path = require("path");

const ASSET_VERSION =
  process.env.ASSET_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.BUILD_ID ||
  "dev";
const siteDescription =
  "Image Archive for the Civilization Battle Royale (CBR)";
const SITE_URL = "https://civbattleroyale.tv";
const DEFAULT_SOCIAL_IMAGE = "/social-card.png";
const DEFAULT_SOCIAL_ALT = "Civ Battle Royale";
const EPISODE_SOCIAL_DIR = "/social/episodes";
const ABOUT_PAGE_PATH = "/archive/what-is-the-civ-battle-royale/";
const MEDIUM_ZOOM_SELECTOR = ".medium-zoom";
const MEDIUM_ZOOM_DELAY = 1000;
const MEDIUM_ZOOM_OPTIONS = {
  background: "rgba(27, 27, 27, 0.9)",
  scrollOffset: 110,
};
const SOCIAL_LINKS = [
  "https://old.reddit.com/r/civbattleroyale/",
  "https://discord.gg/565JwaMsuQ",
  "https://ko-fi.com/coiot",
];
const autometa_options = {
  enable: true,
  image: true,
  twitter: true,
  og: true,
  schema: true,
  site: {
    name: "Civilization Battle Royale",
    twitter: "isaacvolpe",
  },
  canonical_base: SITE_URL,
  description_sources: ["frontmatter"],
  image_sources: ["frontmatter"],
};

const toISODateTime = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

const toISODate = (value) => {
  const iso = toISODateTime(value);
  return iso ? iso.slice(0, 10) : "";
};

const normalizePagePath = (pagePath) => {
  if (!pagePath) return "/";
  let normalized = String(pagePath).trim();
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  normalized = normalized.replace(/\.html?$/i, "/").replace(/\/{2,}/g, "/");
  if (normalized !== "/" && !normalized.endsWith("/")) {
    normalized = `${normalized}/`;
  }
  return normalized;
};

const toAbsolutePageUrl = (pagePath) =>
  `${SITE_URL}${normalizePagePath(pagePath)}`;

const readFileLastModISO = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return "";
  try {
    return toISODateTime(fs.statSync(filePath).mtime);
  } catch (error) {
    return "";
  }
};

const pickFirstDate = (...values) => {
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    const iso = toISODateTime(value);
    if (iso) return iso;
  }
  return "";
};

const cleanupObject = (value) => {
  if (Array.isArray(value)) {
    return value
      .map(cleanupObject)
      .filter((item) => item !== undefined && item !== null && item !== "");
  }
  if (value && typeof value === "object") {
    const out = {};
    Object.keys(value).forEach((key) => {
      const cleaned = cleanupObject(value[key]);
      const isEmptyArray = Array.isArray(cleaned) && !cleaned.length;
      const isEmptyObject =
        cleaned &&
        typeof cleaned === "object" &&
        !Array.isArray(cleaned) &&
        !Object.keys(cleaned).length;
      if (
        cleaned !== undefined &&
        cleaned !== null &&
        cleaned !== "" &&
        !isEmptyArray &&
        !isEmptyObject
      ) {
        out[key] = cleaned;
      }
    });
    return out;
  }
  return value;
};

const toAbsoluteImageUrl = (frontmatter) => {
  if (frontmatter.image) return toAbsoluteUrl(frontmatter.image);
  if (Array.isArray(frontmatter.scenes) && frontmatter.scenes.length) {
    const firstScene = frontmatter.scenes[0];
    if (firstScene && firstScene.slide_url)
      return toAbsoluteUrl(firstScene.slide_url);
  }
  return toAbsoluteUrl(DEFAULT_SOCIAL_IMAGE);
};

const isAlbumEntryPage = ($page, frontmatter) =>
  Array.isArray(frontmatter.scenes) &&
  frontmatter.scenes.length > 0 &&
  ($page.path.startsWith("/albums/") || frontmatter.edition || frontmatter.pr);

const humanizeSegment = (segment) => {
  const raw = decodeURIComponent(String(segment || "")).replace(
    /\.[^/.]+$/,
    ""
  );
  if (!raw) return "";
  const seasonMatch = raw.match(/^s(\d+)$/i);
  if (seasonMatch) return `Season ${seasonMatch[1]}`;
  if (/^pr$/i.test(raw)) return "Power Rankings";
  if (/^mk2$/i.test(raw)) return "Mk2";
  if (/^albums$/i.test(raw)) return "Albums";
  if (/^archive$/i.test(raw)) return "Archive";
  return raw
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const buildBreadcrumbJsonLd = ($page, frontmatter) => {
  const pagePath = normalizePagePath($page.path);
  if (pagePath === "/" || pagePath === "/404.html/") return null;
  const segments = pagePath.split("/").filter(Boolean);
  const items = [{ name: "Home", item: `${SITE_URL}/` }];
  let runningPath = "";
  segments.forEach((segment, index) => {
    runningPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    const name = isLast
      ? frontmatter.title || $page.title || humanizeSegment(segment)
      : humanizeSegment(segment);
    items.push({
      name,
      item: `${SITE_URL}${runningPath}/`,
    });
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
};

const buildArticleJsonLd = ($page, frontmatter) => {
  if (!isAlbumEntryPage($page, frontmatter)) return null;
  const canonicalUrl = toAbsolutePageUrl($page.path);
  const fileLastMod = readFileLastModISO($page._filePath);
  const published = pickFirstDate(
    frontmatter.datePublished,
    frontmatter.date,
    frontmatter.release_date,
    fileLastMod
  );
  const modified = pickFirstDate(
    frontmatter.dateModified,
    frontmatter.lastmod,
    frontmatter.lastModified,
    frontmatter.updated_at,
    frontmatter.updatedAt,
    fileLastMod,
    published
  );
  const authorName = frontmatter.narrated_by || "Civilization Battle Royale";
  return cleanupObject({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: frontmatter.title || $page.title || "Civilization Battle Royale",
    author: {
      "@type": "Person",
      name: authorName,
    },
    datePublished: published,
    dateModified: modified || published,
    image: [toAbsoluteImageUrl(frontmatter)],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  });
};

const buildOrganizationJsonLd = ($page, frontmatter) => {
  const pagePath = normalizePagePath($page.path);
  const isHome = frontmatter.home || pagePath === "/";
  const isAbout = pagePath === ABOUT_PAGE_PATH;
  if (!isHome && !isAbout) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Blue Cassette",
    url: `${SITE_URL}/`,
    logo: toAbsoluteUrl("/cbr_logo_color.svg"),
    sameAs: SOCIAL_LINKS,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "support",
        url: "https://ko-fi.com/coiot",
        availableLanguage: ["en"],
      },
    ],
  };
};

const upsertStructuredData = (items, id, payload) => {
  if (!payload) return items;
  const nextItems = Array.isArray(items) ? [...items] : [];
  const existingIndex = nextItems.findIndex((item) => item && item.id === id);
  const entry = { id, payload };
  if (existingIndex === -1) {
    nextItems.push(entry);
  } else {
    nextItems[existingIndex] = entry;
  }
  return nextItems;
};

const buildEpisodeDescription = (frontmatter) => {
  const parts = [];
  parts.push("The newest episode, ready to watch");
  if (frontmatter.narrated_by) {
    parts.push(`Narrated by ${frontmatter.narrated_by}`);
  }
  if (Array.isArray(frontmatter.scenes) && frontmatter.scenes.length) {
    parts.push(`${frontmatter.scenes.length} scenes`);
  }
  return parts.join(" • ");
};

const buildFallbackDescription = (frontmatter) => {
  const isEpisode =
    Boolean(frontmatter.scenes) ||
    (frontmatter.title && /episode/i.test(frontmatter.title));
  if (isEpisode) {
    const episodeDescription = buildEpisodeDescription(frontmatter);
    if (episodeDescription) return episodeDescription;
  }
  return siteDescription;
};

const episodeSlugFromPath = (pagePath) => {
  if (!pagePath) return "";
  return String(pagePath)
    .replace(/^\/+/, "")
    .replace(/\/$/, "")
    .replace(/\.html?$/i, "")
    .replace(/\//g, "-")
    .replace(/^albums-/, "")
    .toLowerCase();
};

const toAbsoluteUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
};

const addMetaOnce = (meta, entry, key) => {
  if (!entry || !entry.content) return;
  const exists = meta.some((item) => item && item[key] === entry[key]);
  if (!exists) {
    meta.push(entry);
  }
};

const socialMetaEnhancer = () => ({
  name: "social-meta-enhancer",
  extendPageData($page) {
    const frontmatter = $page.frontmatter || {};
    const meta = frontmatter.meta || [];
    let structuredData = Array.isArray(frontmatter.structuredData)
      ? [...frontmatter.structuredData]
      : [];
    const socialImage = toAbsoluteUrl(DEFAULT_SOCIAL_IMAGE);
    const episodeSlug = episodeSlugFromPath($page.path);
    const episodeSocialImage = episodeSlug
      ? toAbsoluteUrl(`${EPISODE_SOCIAL_DIR}/${episodeSlug}.png`)
      : "";
    const socialAlt =
      frontmatter.image_alt ||
      frontmatter.imageAlt ||
      frontmatter.title ||
      DEFAULT_SOCIAL_ALT;

    if (!frontmatter.image) {
      if (
        Array.isArray(frontmatter.scenes) &&
        frontmatter.scenes.length &&
        frontmatter.scenes[0].slide_url
      ) {
        frontmatter.image = frontmatter.scenes[0].slide_url;
      } else {
        frontmatter.image = socialImage;
      }
    }

    if (!frontmatter.description || !String(frontmatter.description).trim()) {
      const fallbackDescription = buildFallbackDescription(frontmatter);
      if (frontmatter.home) {
        frontmatter.description = fallbackDescription;
      } else {
        addMetaOnce(
          meta,
          { name: "description", content: fallbackDescription },
          "name"
        );
        addMetaOnce(
          meta,
          { property: "og:description", content: fallbackDescription },
          "property"
        );
        addMetaOnce(
          meta,
          { name: "twitter:description", content: fallbackDescription },
          "name"
        );
      }
      frontmatter.descriptionAuto = true;
    } else {
      frontmatter.descriptionAuto = false;
    }

    if (episodeSocialImage && $page.path && $page.path.startsWith("/albums/")) {
      addMetaOnce(
        meta,
        { property: "og:image", content: episodeSocialImage },
        "property"
      );
      addMetaOnce(
        meta,
        { property: "og:image:secure_url", content: episodeSocialImage },
        "property"
      );
      addMetaOnce(
        meta,
        { property: "og:image:width", content: "1200" },
        "property"
      );
      addMetaOnce(
        meta,
        { property: "og:image:height", content: "630" },
        "property"
      );
      addMetaOnce(
        meta,
        { name: "twitter:image", content: episodeSocialImage },
        "name"
      );
    }

    addMetaOnce(
      meta,
      { property: "og:image:alt", content: socialAlt },
      "property"
    );
    addMetaOnce(
      meta,
      { name: "twitter:image:alt", content: socialAlt },
      "name"
    );

    if (frontmatter.image === socialImage) {
      addMetaOnce(
        meta,
        { property: "og:image:width", content: "1200" },
        "property"
      );
      addMetaOnce(
        meta,
        { property: "og:image:height", content: "630" },
        "property"
      );
    }

    const canonicalUrl = toAbsolutePageUrl($page.path);
    frontmatter.canonicalUrl = canonicalUrl;

    const breadcrumbJsonLd = buildBreadcrumbJsonLd($page, frontmatter);
    if (breadcrumbJsonLd) {
      structuredData = upsertStructuredData(
        structuredData,
        "breadcrumbs-jsonld",
        breadcrumbJsonLd
      );
    }

    const articleJsonLd = buildArticleJsonLd($page, frontmatter);
    if (articleJsonLd) {
      structuredData = upsertStructuredData(
        structuredData,
        "article-jsonld",
        articleJsonLd
      );
    }

    const organizationJsonLd = buildOrganizationJsonLd($page, frontmatter);
    if (organizationJsonLd) {
      structuredData = upsertStructuredData(
        structuredData,
        "organization-jsonld",
        organizationJsonLd
      );
    }

    const fileLastMod = readFileLastModISO($page._filePath);
    const modifiedISO = pickFirstDate(
      frontmatter.dateModified,
      frontmatter.lastmod,
      frontmatter.lastModified,
      frontmatter.updated_at,
      frontmatter.updatedAt,
      fileLastMod,
      frontmatter.date,
      frontmatter.release_date
    );
    if (modifiedISO) {
      frontmatter.lastmod = modifiedISO;
      frontmatter.dateModified = modifiedISO;
    }

    frontmatter.meta = meta;
    frontmatter.structuredData = structuredData;
    $page.frontmatter = frontmatter;
  },
});

const sitemapEnhancer = (_, ctx) => ({
  name: "sitemap-enhancer",
  async generated() {
    const pages = Array.isArray(ctx.pages) ? ctx.pages : [];
    const urls = pages
      .filter((page) => page && page.path && page.path !== "/404.html")
      .filter(
        (page) =>
          !(
            page.frontmatter &&
            Object.prototype.hasOwnProperty.call(page.frontmatter, "sitemap") &&
            page.frontmatter.sitemap === false
          )
      )
      .map((page) => {
        const frontmatter = page.frontmatter || {};
        const fileLastMod = readFileLastModISO(page._filePath);
        const lastmod =
          toISODate(
            pickFirstDate(
              frontmatter.lastmod,
              frontmatter.dateModified,
              frontmatter.lastModified,
              frontmatter.updated_at,
              frontmatter.updatedAt,
              frontmatter.date,
              frontmatter.release_date,
              fileLastMod
            )
          ) || toISODate(new Date());
        return {
          loc: toAbsolutePageUrl(page.path),
          lastmod,
        };
      })
      .sort((a, b) => a.loc.localeCompare(b.loc));

    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(
        (url) =>
          `  <url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod></url>`
      ),
      "</urlset>",
      "",
    ];
    const sitemapXml = lines.join("\n");
    fs.mkdirSync(ctx.outDir, { recursive: true });
    fs.writeFileSync(path.join(ctx.outDir, "sitemap.xml"), sitemapXml, "utf8");
  },
});
module.exports = {
  title: "Civ Battle Royale",
  description: siteDescription,
  dest: "./public",
  chainWebpack(config) {
    config.module
      .rule("mjs")
      .test(/\.mjs$/)
      .include.add(/node_modules/)
      .end()
      .type("javascript/auto");

    config.module
      .rule("iceberg-js")
      .test(/\.(mjs|js)$/)
      .include.add(/node_modules\/iceberg-js/)
      .end()
      .use("babel")
      .loader("babel-loader")
      .options({
        babelrc: false,
        configFile: false,
        presets: [
          [
            "@babel/preset-env",
            {
              targets: { esmodules: true },
              modules: false,
            },
          ],
        ],
        plugins: [
          "@babel/plugin-proposal-optional-chaining",
          "@babel/plugin-proposal-nullish-coalescing-operator",
        ],
      });

    config.plugin("define-global").use(require("webpack").DefinePlugin, [
      {
        global: "window",
        __ASSET_VERSION__: JSON.stringify(ASSET_VERSION),
        // Fallback compile-time defines for vuepress-plugin-medium-zoom.
        // Some builds miss the plugin-provided define() injection and crash.
        MZ_SELECTOR: JSON.stringify(MEDIUM_ZOOM_SELECTOR),
        MZ_OPTIONS: JSON.stringify(JSON.stringify(MEDIUM_ZOOM_OPTIONS)),
        MZ_DELAY: JSON.stringify(String(MEDIUM_ZOOM_DELAY)),
      },
    ]);
  },
  themeConfig: {
    nav: [
      { text: "About", link: "/archive/what-is-the-civ-battle-royale/" },
      { text: "Albums", link: "/albums/" },
    ],
    logo: "/cbr_logo_color.svg",
    assetVersion: ASSET_VERSION,
    socialImage: DEFAULT_SOCIAL_IMAGE,
    socialImageAlt: DEFAULT_SOCIAL_ALT,
    docsDir: "src",
    serviceWorker: true,
    reactions: [
      { key: "smart", label: "Smart", emoji: "🧠" },
      { key: "clap", label: "Clap", emoji: "👏" },
      { key: "mindblown", label: "MindBlown", emoji: "🤯" },
      { key: "pray", label: "Pray", emoji: "🙏" },
      { key: "fire", label: "Fire", emoji: "🔥" },
      { key: "facepalm", label: "FacePalm", emoji: "🤦" },
      { key: "popcorn", label: "Popcorn", emoji: "🍿" },
      { key: "star", label: "Star", emoji: "⭐" },
      { key: "salt", label: "Salt", emoji: "🧂" },
      { key: "hype", label: "Hype", emoji: "🚀" },
      { key: "heart", label: "Heart", emoji: "❤️" },
      { key: "laugh", label: "Laugh", emoji: "😂" },
      { key: "stress", label: "Stress", emoji: "😰" },
      { key: "scared", label: "Scared", emoji: "😱" },
      { key: "tears", label: "Tears", emoji: "😭" },
      { key: "rage", label: "Rage", emoji: "😡" },
      { key: "rip", label: "RIP", emoji: "🪦" },
    ],
  },
  plugins: [
    // Order matters:
    // 1) `socialMetaEnhancer` populates frontmatter/meta/canonical/json-ld
    // 2) `structured-data-root-mixin` injects JSON-LD in SSR/client
    // 3) `sitemapEnhancer` consumes final page data to write sitemap.xml
    // Keep autometa disabled so custom SEO injection is the single source.
    socialMetaEnhancer(),
    {
      name: "structured-data-root-mixin",
      clientRootMixin: path.resolve(__dirname, "structuredDataRootMixin.js"),
    },
    sitemapEnhancer,
    "vuepress-plugin-janitor",
    // Disabled intentionally; retained for quick rollback if needed.
    // ["vuepress-plugin-autometa", autometa_options],
    [
      "vuepress-plugin-medium-zoom",
      {
        selector: MEDIUM_ZOOM_SELECTOR,
        delay: MEDIUM_ZOOM_DELAY,
        options: MEDIUM_ZOOM_OPTIONS,
      },
    ],
    [
      "vuepress-plugin-clean-urls",
      {
        normalSuffix: "/",
      },
    ],
  ],
  head: [
    [
      "link",
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
    ],
    ["link", { rel: "icon", sizes: "32x32", href: "/favicon-32x32.png" }],
    ["link", { rel: "icon", sizes: "16x16", href: "/favicon-16x16.png" }],
    ["link", { rel: "manifest", href: "/manifest.json" }],
    ["meta", { name: "msapplication-TileColor", content: "#FFBF46" }],
    ["meta", { name: "theme-color", content: "#FFBF46" }],
    ["meta", { name: "viewport", content: "initial-scale=1" }],
  ],
};
