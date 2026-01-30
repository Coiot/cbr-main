const currentDateUTC = new Date().toUTCString();
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
  canonical_base: "https://civilizationbattleroyale.com",
  description_sources: ["frontmatter"],
  image_sources: ["frontmatter"],
};
module.exports = {
  title: "Civ Battle Royale",
  description: "Image Archive for the Civilization Battle Royale (CBR)",
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
              targets: { ie: "11" },
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
      // { text: "Reddit", link: "https://old.reddit.com/r/civbattleroyale/" },
      // { text: "Discord", link: "https://discord.gg/565JwaMsuQ" },
      // {
      //   text: "Youtube",
      //   link: "https://www.youtube.com/channel/UCyKT0We3nrm7Mm0d4AtxnkQ",
      // },
    ],
    logo: "/cbr_logo_color.svg",
    docsDir: "src",
    serviceWorker: true,
    reactions: [
      { key: "smart", label: "Smart", emoji: "🧠" },
      { key: "salt", label: "Salt", emoji: "🧂" },
      { key: "clap", label: "Clap", emoji: "👏" },
      { key: "mindblown", label: "MindBlown", emoji: "🤯" },
      { key: "pray", label: "Pray", emoji: "🙏" },
      { key: "fire", label: "Fire", emoji: "🔥" },
      { key: "facepalm", label: "FacePalm", emoji: "🤦" },
      { key: "star", label: "Star", emoji: "⭐" },
      { key: "popcorn", label: "Popcorn", emoji: "🍿" },
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
