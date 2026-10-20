# Civ Battle Royale Website

Live: [https://civilizationbattleroyale.com](https://civilizationbattleroyale.com)

Release preparation: [Narration inbox setup and workflow](scripts/releases/README.md).

CDN uploads: [Finder toolbar uploader setup and workflow](scripts/cdn/README.md).

Code organization: [Album behavior](src/.vuepress/theme/components/albums/behavior/README.md),
[reading library](src/.vuepress/theme/components/albums/library/README.md),
[account synchronization](src/.vuepress/theme/account/README.md),
and [community map behavior](src/.vuepress/theme/components/community/map/README.md).

Run `npm run test:site`, `npm run releases:test`, and `npm run cdn:test` for the
offline regression suites. Release tests require the release setup above.

VuePress development and production builds use separate generated files in
`.vuepress-temp/dev` and `.vuepress-temp/build`, with separate Vite caches.
This lets a build run while `npm run dev` is open without replacing its page data.

Ko-fi payment automation and access expiry: [setup and operations](scripts/supporters/README.md).
