import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineUserConfig } from "vuepress";
import { viteBundler } from "@vuepress/bundler-vite";
import { localTheme } from "./theme/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ASSET_VERSION =
  process.env.ASSET_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.BUILD_ID ||
  "dev";
const siteDescription =
  "Image Archive for the Civilization Battle Royale (CBR)";
const SITE_URL = "https://civbattleroyale.tv";
const SITE_NAME = "Civ Battle Royale";
const SITE_LANGUAGE = "en-US";
const OG_LOCALE = "en_US";
const TWITTER_SITE = "@isaacvolpe";
const DEFAULT_SOCIAL_IMAGE = "/social-card.png";
const DEFAULT_SOCIAL_ALT = "Civ Battle Royale";
const EPISODE_SOCIAL_DIR = "/social/episodes";
const ABOUT_PAGE_PATH = "/archive/what-is-the-civ-battle-royale/";
const SOCIAL_LINKS = [
  "https://old.reddit.com/r/civbattleroyale/",
  "https://discord.gg/565JwaMsuQ",
  "https://ko-fi.com/coiot",
];

const viteManualChunks = (id) => {
  const normalized = id.replaceAll("\\", "/");

  if (normalized.endsWith("/.vuepress-temp/legacyPages.js")) {
    return "site-index";
  }
  if (
    normalized.includes("/node_modules/@supabase/") ||
    normalized.includes("/node_modules/@realtime/") ||
    normalized.includes("/node_modules/@ecies/") ||
    normalized.includes("/node_modules/eciesjs/")
  ) {
    return "vendor-supabase";
  }
  if (
    normalized.includes("/node_modules/vue/") ||
    normalized.includes("/node_modules/@vue/") ||
    normalized.includes("/node_modules/vue-router/") ||
    normalized.includes("/node_modules/@vuepress/client/")
  ) {
    return "vendor-vue";
  }
  if (
    normalized.includes("/node_modules/medium-zoom/") ||
    normalized.includes("/node_modules/nprogress/")
  ) {
    return "vendor-interactions";
  }
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
  const fileLastMod = readFileLastModISO($page.filePath);
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

const buildWebsiteJsonLd = ($page, frontmatter) => {
  const pagePath = normalizePagePath($page.path);
  const isHome = frontmatter.home || pagePath === "/";
  if (!isHome) return null;
  const description =
    (frontmatter.description && String(frontmatter.description).trim()) ||
    siteDescription;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description,
    inLanguage: SITE_LANGUAGE,
    publisher: {
      "@type": "Organization",
      name: "Blue Cassette",
      url: `${SITE_URL}/`,
    },
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

const addHeadOnce = (head, tagName, attrs, matcher) => {
  if (!Array.isArray(head)) return;
  const exists = head.some(
    (item) =>
      Array.isArray(item) &&
      item[0] === tagName &&
      matcher &&
      matcher(item[1] || {})
  );
  if (!exists) {
    head.push([tagName, attrs]);
  }
};

const socialMetaEnhancer = () => ({
  name: "social-meta-enhancer",
  extendsPage($page) {
    const frontmatter = $page.frontmatter || {};
    const pagePath = normalizePagePath($page.path);
    const isHome = frontmatter.home || pagePath === "/";
    const canonicalUrl = toAbsolutePageUrl($page.path);
    const meta = frontmatter.meta || [];
    const head = Array.isArray(frontmatter.head) ? [...frontmatter.head] : [];
    let structuredData = Array.isArray(frontmatter.structuredData)
      ? [...frontmatter.structuredData]
      : [];
    const socialImage = toAbsoluteUrl(DEFAULT_SOCIAL_IMAGE);
    const episodeSlug = episodeSlugFromPath($page.path);
    const episodeSocialImage = episodeSlug
      ? toAbsoluteUrl(`${EPISODE_SOCIAL_DIR}/${episodeSlug}.png`)
      : "";
    const preferredSocialImage =
      episodeSocialImage && $page.path && $page.path.startsWith("/albums/")
        ? episodeSocialImage
        : socialImage;
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
    const socialDescription =
      (frontmatter.description && String(frontmatter.description).trim()) ||
      siteDescription;
    const socialTitle =
      frontmatter.title || $page.title || (isHome ? SITE_NAME : "Civ Battle Royale");

    addMetaOnce(meta, { property: "og:locale", content: OG_LOCALE }, "property");
    addMetaOnce(
      meta,
      { property: "og:type", content: isHome ? "website" : "article" },
      "property"
    );
    addMetaOnce(
      meta,
      { property: "og:site_name", content: SITE_NAME },
      "property"
    );
    addMetaOnce(meta, { property: "og:title", content: socialTitle }, "property");
    addMetaOnce(
      meta,
      { property: "og:description", content: socialDescription },
      "property"
    );
    addMetaOnce(meta, { property: "og:url", content: canonicalUrl }, "property");
    addMetaOnce(
      meta,
      { property: "og:image", content: preferredSocialImage },
      "property"
    );
    addMetaOnce(
      meta,
      {
        property: "og:image:secure_url",
        content: preferredSocialImage,
      },
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
      { name: "twitter:card", content: "summary_large_image" },
      "name"
    );
    addMetaOnce(meta, { name: "twitter:site", content: TWITTER_SITE }, "name");
    addMetaOnce(meta, { name: "twitter:title", content: socialTitle }, "name");
    addMetaOnce(
      meta,
      { name: "twitter:description", content: socialDescription },
      "name"
    );
    addMetaOnce(meta, { name: "twitter:url", content: canonicalUrl }, "name");
    addMetaOnce(
      meta,
      { name: "twitter:image", content: preferredSocialImage },
      "name"
    );

    if (isHome) {
      addMetaOnce(
        meta,
        {
          name: "robots",
          content:
            "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
        },
        "name"
      );
      addMetaOnce(
        meta,
        {
          name: "googlebot",
          content:
            "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
        },
        "name"
      );
      addMetaOnce(
        meta,
        { property: "og:locale", content: OG_LOCALE },
        "property"
      );
      addMetaOnce(
        meta,
        { property: "og:type", content: "website" },
        "property"
      );
      addMetaOnce(
        meta,
        { property: "og:site_name", content: SITE_NAME },
        "property"
      );
      addMetaOnce(
        meta,
        { property: "og:title", content: SITE_NAME },
        "property"
      );
      addMetaOnce(
        meta,
        { property: "og:description", content: socialDescription },
        "property"
      );
      addMetaOnce(
        meta,
        { property: "og:url", content: canonicalUrl },
        "property"
      );
      addMetaOnce(
        meta,
        { property: "og:image", content: socialImage },
        "property"
      );
      addMetaOnce(
        meta,
        { property: "og:image:secure_url", content: socialImage },
        "property"
      );
      addMetaOnce(
        meta,
        { property: "og:image:type", content: "image/png" },
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
        { name: "twitter:card", content: "summary_large_image" },
        "name"
      );
      addMetaOnce(
        meta,
        { name: "twitter:site", content: TWITTER_SITE },
        "name"
      );
      addMetaOnce(meta, { name: "twitter:title", content: SITE_NAME }, "name");
      addMetaOnce(
        meta,
        { name: "twitter:description", content: socialDescription },
        "name"
      );
      addMetaOnce(meta, { name: "twitter:url", content: canonicalUrl }, "name");
      addMetaOnce(
        meta,
        { name: "twitter:image", content: socialImage },
        "name"
      );

      addHeadOnce(
        head,
        "link",
        {
          rel: "alternate",
          hreflang: SITE_LANGUAGE,
          href: canonicalUrl,
        },
        (attrs) => attrs.rel === "alternate" && attrs.hreflang === SITE_LANGUAGE
      );
      addHeadOnce(
        head,
        "link",
        {
          rel: "alternate",
          hreflang: "x-default",
          href: `${SITE_URL}/`,
        },
        (attrs) => attrs.rel === "alternate" && attrs.hreflang === "x-default"
      );
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
    const websiteJsonLd = buildWebsiteJsonLd($page, frontmatter);
    if (websiteJsonLd) {
      structuredData = upsertStructuredData(
        structuredData,
        "website-jsonld",
        websiteJsonLd
      );
    }

    const fileLastMod = readFileLastModISO($page.filePath);
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

    addHeadOnce(
      head,
      "link",
      { rel: "canonical", href: canonicalUrl },
      (attrs) => attrs.rel === "canonical"
    );
    meta.forEach((entry) => {
      const identifier = entry.name
        ? `name:${entry.name}`
        : `property:${entry.property}`;
      addHeadOnce(
        head,
        "meta",
        entry,
        (attrs) =>
          (attrs.name ? `name:${attrs.name}` : `property:${attrs.property}`) ===
          identifier
      );
    });
    structuredData.forEach((item, index) => {
      const payload =
        item && item.payload && typeof item.payload === "object"
          ? item.payload
          : item;
      if (!payload || typeof payload !== "object") return;
      head.push([
        "script",
        {
          type: "application/ld+json",
          "data-vuepress-jsonld": String(index),
        },
        JSON.stringify(payload).replace(/</g, "\\u003c"),
      ]);
    });

    frontmatter.meta = meta;
    frontmatter.head = head;
    frontmatter.structuredData = structuredData;
    $page.data.frontmatter = frontmatter;
    $page.frontmatter = frontmatter;
  },
});

const sitemapEnhancer = () => ({
  name: "sitemap-enhancer",
  async onGenerated(app) {
    const pages = Array.isArray(app.pages) ? app.pages : [];
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
        const fileLastMod = readFileLastModISO(page.filePath);
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
    const outDir = app.dir.dest();
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemapXml, "utf8");
  },
});

const albumSceneDataExtractor = () => ({
  name: "album-scene-data-extractor",
  extendsPage($page) {
    const frontmatter = $page.frontmatter || {};
    if (!Array.isArray(frontmatter.scenes) || !frontmatter.scenes.length) {
      return;
    }
    const relativePath = String($page.path || "")
      .replace(/^\/albums\//, "")
      .replace(/\/$/, "");
    if (!relativePath) return;
    frontmatter.scene_count = frontmatter.scenes.length;
    frontmatter.scene_data_url = `/data/albums/${relativePath}.json`;
    delete frontmatter.scenes;
    $page.data.frontmatter = frontmatter;
    $page.frontmatter = frontmatter;
  },
});

const cleanUrls = () => ({
  name: "clean-urls",
  extendsPageOptions(options, app) {
    if (!options.filePath || options.path) return;
    const relativePath = path.relative(app.dir.source(), options.filePath);
    const parsed = path.parse(relativePath);
    const directory = parsed.dir.split(path.sep).join("/");
    const isReadme = parsed.name.toLowerCase() === "readme";
    const routePath = isReadme
      ? `/${directory}${directory ? "/" : ""}`
      : `/${directory ? `${directory}/` : ""}${parsed.name}/`;
    options.path = routePath.replace(/\/{2,}/g, "/");
  },
});

const legacyPageIndex = () => ({
  name: "legacy-page-index",
  async onPrepared(app) {
    const frontmatterKeys = [
      "audio_narration",
      "date",
      "description",
      "edition",
      "episode",
      "episodeNumber",
      "episode_number",
      "exclude",
      "fullvideo",
      "image",
      "narrated_by",
      "pr",
      "release_date",
      "scene_count",
      "scene_data_url",
      "starting_turn",
      "title",
    ];
    const pages = app.pages.map((page) => ({
      path: page.path,
      title: page.title,
      frontmatter: Object.fromEntries(
        frontmatterKeys
          .filter((key) => page.frontmatter[key] !== undefined)
          .map((key) => [key, page.frontmatter[key]])
      ),
    }));
    await app.writeTemp(
      "legacyPages.js",
      `export const legacyPages = JSON.parse(${JSON.stringify(
        JSON.stringify(pages)
      )})\n`
    );
  },
});

export default defineUserConfig({
  title: "Civ Battle Royale",
  description: siteDescription,
  // Keep VuePress temp artifacts in a stable project folder.
  // This avoids intermittent ENOENT errors for palette/style files under
  // node_modules/@vuepress/core/.temp during dev recompiles.
  temp: path.resolve(__dirname, "../../.vuepress-temp"),
  dest: path.resolve(__dirname, "../../public"),
  shouldPrefetch: false,
  markdown: {
    anchor: false,
  },
  bundler: viteBundler({
    viteOptions: {
      define: {
        __ASSET_VERSION__: JSON.stringify(ASSET_VERSION),
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true,
      },
      build: {
        emptyOutDir: true,
        target: "es2020",
        rollupOptions: {
          output: {
            manualChunks: viteManualChunks,
          },
        },
      },
    },
  }),
  theme: localTheme({
    nav: [
      { text: "About", link: "/archive/what-is-the-civ-battle-royale/" },
      { text: "Albums", link: "/albums/" },
      { text: "Spotlight", link: "/spotlight/" },
    ],
    logo: "/cbr_logo_color.svg",
    assetVersion: ASSET_VERSION,
    socialImage: DEFAULT_SOCIAL_IMAGE,
    socialImageAlt: DEFAULT_SOCIAL_ALT,
    docsDir: "src",
    serviceWorker: false,
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
  }),
  plugins: [
    cleanUrls(),
    socialMetaEnhancer(),
    albumSceneDataExtractor(),
    legacyPageIndex(),
    sitemapEnhancer(),
  ],
  head: [
    [
      "script",
      {},
      `(function(){var mode="dark";try{if(window.localStorage.getItem("themeMode")==="light")mode="light"}catch(error){}document.documentElement.setAttribute("data-theme",mode);document.documentElement.style.colorScheme=mode})()`,
    ],
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
  ],
});
