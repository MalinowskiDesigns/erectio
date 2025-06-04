import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import fs from 'fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* — pluginy — */
import FaviconsInject from 'vite-plugin-favicons-inject';
import { VitePWA } from 'vite-plugin-pwa';
import { createHtmlPlugin } from 'vite-plugin-html';
import eslint from 'vite-plugin-eslint';
import checker from 'vite-plugin-checker';
import htmlMinifier from 'vite-plugin-html-minifier';
import webfontDownload from 'vite-plugin-webfont-dl';
import clean from 'vite-plugin-clean';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import sitemap from 'vite-plugin-sitemap';
import legacy from '@vitejs/plugin-legacy';
import mkcert from 'vite-plugin-mkcert';
import Inspect from 'vite-plugin-inspect';
import FullReload from 'vite-plugin-full-reload';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import fg from 'fast-glob';
import sharp from 'sharp';

// import PluginCritical from 'rollup-plugin-critical';
/* — helpery — */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pageDirs = () =>
	fs
		.readdirSync('./src/pages')
		.filter(
			(d) =>
				fs.existsSync(`src/pages/${d}/${d}.json`) &&
				fs.existsSync(`src/pages/${d}/${d}.js`) &&
				fs.existsSync(`${d === 'home' ? 'index' : d}.html`)
		);

const makeInput = (dirs) =>
	dirs.reduce((acc, p) => {
		const slug = p === 'home' ? 'index' : p;
		acc[slug] = resolve(__dirname, `${slug}.html`);
		return acc;
	}, {});

// Custom plugin to convert jpg and png images to webp at 95% quality
const imageConvertPlugin = () => ({
	name: 'convert-images',
	apply: 'build',
	async buildStart() {
		const files = await fg(['src/assets/images/**/*.{jpg,png}']);
		await Promise.all(
			files.map(async (file) => {
				const base = file.replace(/\.(jpg|png)$/i, '');
				await sharp(file)
					.toFormat('webp', { quality: 100 })
					.toFile(`${base}.webp`);
			})
		);
	},
});

/* — konfiguracja — */
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_');
	const dirs = pageDirs();
	// const disableCritical = process.env.DISABLE_CRITICAL === 'true';
	// const breakpoints = env.VITE_SITE_BREAKPOINTS
	// 	? env.VITE_SITE_BREAKPOINTS.split(',').map((b) => parseInt(b, 10))
	// 	: [];
	// const criticalDimensions = breakpoints.map((width) => ({
	// 	width,
	// 	height: 1200,
	// }));
	const pages = dirs.map((d) => {
		const meta = JSON.parse(
			fs.readFileSync(`src/pages/${d}/${d}.json`, 'utf-8')
		);
		const slug = d === 'home' ? 'index' : d;
		return {
			entry: `src/pages/${d}/${d}.js`,
			filename: `${slug}.html`,
			template: `${slug}.html`,
			injectOptions: {
				data: { ...meta, ...env },
				ejsOptions: {
					filename: resolve(__dirname, `${slug}.html`),
					localsName: 'meta',
					views: [
						resolve(__dirname, 'src/templates'),
						resolve(__dirname, 'src/components'),
						resolve(__dirname, 'src/sections'),
					],
				},
			},
		};
	});

	return {
		resolve: {
			alias: {
				'@common': resolve(__dirname, 'src/js/common'),
				'@img': resolve(__dirname, 'src/assets/images'),
			},
		},
		plugins: [
			imageConvertPlugin(),
			Inspect(),
			clean({ targets: ['./dist'] }),
			FaviconsInject(
				resolve(__dirname, 'public/logo.svg'),
				{
					manifest: false,
				},
				{ failGraciously: true }
			),
			webfontDownload([env.VITE_SITE_FONTS_URL], {
				injectAsStyleTag: false, // wygeneruje <link rel="stylesheet">
				async: true, // dodaje tag <link rel="preload" … as="style" onload="this.rel='stylesheet'">
				minifyCss: true, // inline/external CSS przeleci przez clean-CSS
				fontsSubfolder: 'fonts', // <-- nowa poprawna opcja od v3.10.x
			}),

			ViteImageOptimizer({
				test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
				exclude: undefined,
				include: undefined,
				includePublic: false,
				logStats: true,
				ansiColors: true,
				svg: {
					multipass: true,
					plugins: [
						{
							name: 'preset-default',
							params: {
								overrides: {
									cleanupNumericValues: false,
									removeViewBox: false, // https://github.com/svg/svgo/issues/1128
								},
								cleanupIDs: {
									minify: false,
									remove: false,
								},
								convertPathData: false,
							},
						},
						'sortAttrs',
						{
							name: 'addAttributesToSVGElement',
							params: {
								attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }],
							},
						},
					],
				},
				png: {
					quality: 100,
				},
				jpeg: {
					quality: 100,
				},
				jpg: {
					quality: 100,
				},
				tiff: {
					quality: 100,
				},
				// gif does not support lossless compression
				gif: {},
				webp: {
					lossless: true,
				},
				avif: {
					lossless: true,
				},

				cache: false,
				cacheLocation: undefined,
			}),

			/* PWA */
			// VitePWA({
			// 	registerType: 'autoUpdate',
			// 	injectRegister: 'script', // gwarantuje dołączenie SW nawet w SPA/MPA
			// 	devOptions: { enabled: true }, // pełne PWA offline w trybie dev
			// 	strategies: 'generateSW', // najszybszy start unless potrzebujesz własnego SW
			// 	manifest: {
			// 		name: env.VITE_SITE_NAME,
			// 		short_name: env.VITE_SITE_NAME,
			// 		display: 'standalone',
			// 		icons: [
			// 			{
			// 				src: '/android-chrome-192x192.png',
			// 				sizes: '192x192',
			// 				type: 'image/png',
			// 				purpose: 'any', // podstawowa ikona
			// 			},
			// 			{
			// 				src: '/android-chrome-256x256.png',
			// 				sizes: '256x256',
			// 				type: 'image/png',
			// 				purpose: 'any', // (opcjonalna) średnia rozdzielczość
			// 			},
			// 			{
			// 				src: '/android-chrome-512x512.png',
			// 				sizes: '512x512',
			// 				type: 'image/png',
			// 				purpose: 'any maskable', // duża + maskable dla adapt. ikon (Android 12+)
			// 			},
			// 		],
			// 		theme_color: env.VITE_SITE_PRIMARY_COLOR,
			// 		background_color: env.VITE_SITE_BACKGROUND_COLOR,
			// 	},
			// 	workbox: {
			// 		navigateFallback: '/index.html',
			// 		globPatterns: ['**/*.{js,css,html,avif,webp,png,jpg,svg,ico}'],
			// 		runtimeCaching: [
			// 			{
			// 				urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
			// 				handler: 'CacheFirst',
			// 				options: {
			// 					cacheName: 'google-fonts',
			// 					expiration: {
			// 						maxEntries: 30,
			// 						maxAgeSeconds: 60 * 60 * 24 * 365,
			// 					},
			// 				},
			// 			},
			// 		],
			// 	},
			// 	includeAssets: [
			// 		'browserconfig.xml',
			// 		'yandex-browser-manifest.json',
			// 		'og_image.jpg',
			// 	],
			// }),
			mkcert(),
			FullReload(['src/templates/**/*', 'src/pages/**/*.json']),
			createHtmlPlugin({ minify: true, pages, inject: { data: env } }),
			htmlMinifier({
				minifierOptions: {
					collapseWhitespace: true,
					removeComments: true,
					removeRedundantAttributes: true,
					removeEmptyAttributes: true,
					useShortDoctype: true,
					sortAttributes: true,
					minifyCSS: true,
					minifyJS: true,
					minifyURLs: true,
				},
				filter: /\.html$/,
			}),

			createSvgIconsPlugin({
				iconDirs: [resolve(__dirname, 'src/assets/icons')],
				symbolId: 'i-[name]',
				inject: 'body-first',
				svgoOptions: {
					plugins: [{ name: 'removeAttrs', params: { attrs: 'fill' } }],
				},
			}),
			eslint({ include: ['src/**/*.js'], exclude: ['node_modules'] }),
			checker({
				enableBuild: false,
				eslint: false,
				stylelint: {
					fix: true,
					include: ['src/**/*.{css,scss}'],
					lintCommand: 'stylelint "./src/**/*.{css,scss}"',
					dev: { logLevel: ['error', 'warning'] },
				},
			}),

			sitemap({
				hostname: env.VITE_SITE_URL,
				readable: true,
				i18n: {
					defaultLanguage: 'pl',
					languages: ['pl', 'en'],
					strategy: 'prefix',
				},
			}),

			legacy({
				targets: ['defaults', 'not IE 11'],
				modernPolyfills: false,
				additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
			}),
			// !disableCritical &&
			//         PluginCritical({
			//                 criticalUrl: 'https://localhost:5173/',
			//                 criticalBase: resolve(__dirname, 'dist'),
			//                 criticalPages: dirs.map((d) => {
			//                         const slug = d === 'home' ? 'index' : d;
			//                         return {
			//                                 uri: slug === 'index' ? '' : `${slug}.html`,
			//                                 template: slug,
			//                         };
			//                 }),
			//                 criticalConfig: {
			//                         dimensions: criticalDimensions,
			//                 },
			//         }),
		],

		build: {
			rollupOptions: {
				input: makeInput(dirs),
				output: {
					manualChunks(id) {
						if (id.includes('node_modules')) return 'vendor';
					},
				},
			},
		},
	};
});
