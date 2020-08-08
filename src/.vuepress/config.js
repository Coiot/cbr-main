const currentDateUTC = new Date().toUTCString()
const autometa_options = {
	enable: true,
	image: true,
	twitter: true,
	og: true,
	schema: true,
	site: {
		name: 'CivBattleRoyale.tv',
		twitter: 'lacoiot',
	},
	canonical_base: 'https://civbattleroyale.tv',
	description_sources: [
		'frontmatter',
	],
	image_sources: [
		'frontmatter',
	],
};
module.exports = {
	title: 'CivBattleRoyale.tv',
	description: '',
	dest: './public',
	themeConfig: {
		nav: [
			{ text: 'Albums', link: '/albums/' },
			{ text: 'Patreon', link: 'https://www.patreon.com/civbr' },
			{ text: 'Reddit', link: 'https://old.reddit.com/r/civbattleroyale/' },
			{ text: 'Discord', link: 'https://discord.gg/vAvSFdu' },
			{ text: 'Twitch', link: 'https://www.twitch.tv/civbattleroyale' },
			{ text: 'Youtube', link: 'https://www.youtube.com/channel/UCyKT0We3nrm7Mm0d4AtxnkQ' },
		],
		logo: '/cbr_logo_color.svg',
		docsDir: 'src',
		serviceWorker: true,
	},
	plugins: [
		'vuepress-plugin-janitor',
		[
			'vuepress-plugin-medium-zoom',
			{
				selector: '.medium img',
				delay: 1000,
				options: {
					background: 'rgba(27, 27, 27, 0.9)',
					scrollOffset: 110,
				}
			}
		],
		['vuepress-plugin-autometa', autometa_options],
		['vuepress-plugin-clean-urls',
			{
				normalSuffix: '/'
			}
		],
		[
			'@vuepress/pwa',
			{
				serviceWorker: true,
				updatePopup: true
			}
		]
	],
	head: [
		['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-icon.png' }],
		['link', { rel: 'icon', sizes: '32x32', href: '/favicon-32x32.png' }],
		['link', { rel: 'icon', sizes: '16x16', href: '/favicon-16x16.png' }],
		['link', { rel: 'manifest', href: '/site.webmanifest' }],
		['link', { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#5bbad5' }],
		['meta', { name: 'msapplication-TileColor', content: '#da532c' }],
		['meta', { name: 'theme-color', content: '#ffffff' }],
	]
}
