const currentDateUTC = new Date().toUTCString();
const siteDescription =
  "Image Archive for the Civilization Battle Royale (CBR)";
const DEFAULT_SOCIAL_IMAGE = "/social-card.svg";
const DEFAULT_SOCIAL_ALT = "Civ Battle Royale";
const EPISODE_SOCIAL_DIR = "/social/episodes";
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
  canonical_base: "https://civbattleroyale.tv",
  description_sources: ["frontmatter"],
  image_sources: ["frontmatter"],
};

const formatSeasonLabel = (edition) => {
  if (!edition) return "";
  const match = String(edition).match(/s(\\d+)/i);
  return match ? `Season ${match[1]}` : String(edition);
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
    .replace(/\//g, "-")
    .toLowerCase();
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
    const socialImage = DEFAULT_SOCIAL_IMAGE;
    const episodeSlug = episodeSlugFromPath($page.path);
    const episodeSocialImage = episodeSlug
      ? `${EPISODE_SOCIAL_DIR}/${episodeSlug}.png`
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

    frontmatter.meta = meta;
    $page.frontmatter = frontmatter;
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

    config
      .plugin("define-global")
      .use(require("webpack").DefinePlugin, [{ global: "window" }]);
  },
  themeConfig: {
    nav: [
      { text: "About", link: "/archive/what-is-the-civ-battle-royale/" },
      { text: "Albums", link: "/albums/" },
    ],
    logo: "/cbr_logo_color.svg",
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
    socialMetaEnhancer(),
    "vuepress-plugin-janitor",
    [
      "vuepress-plugin-medium-zoom",
      {
        selector: ".medium img",
        delay: 1000,
        options: {
          background: "rgba(27, 27, 27, 0.9)",
          scrollOffset: 110,
        },
      },
    ],
    ["vuepress-plugin-autometa", autometa_options],
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
    ["link", { rel: "canonical", href: "https://civbattleroyale.tv" }],
    ["meta", { name: "viewport", content: "initial-scale=1" }],
  ],
};
