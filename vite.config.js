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
import viteImagemin from 'vite-plugin-imagemin';
import clean from 'vite-plugin-clean';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import sitemap from 'vite-plugin-sitemap';
import legacy from '@vitejs/plugin-legacy';
import mkcert from 'vite-plugin-mkcert';
import Inspect from 'vite-plugin-inspect';
import FullReload from 'vite-plugin-full-reload';
import { imagetools } from 'vite-imagetools';
import imageminAvif from 'imagemin-avif';
import imageminWebp from 'imagemin-webp';

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

/* — konfiguracja — */
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_');
	const rawBreakpoints = (env.VITE_SITE_BREAKPOINTS || '').replace(/['"]/g, '');
	const brk = rawBreakpoints.split(',')[0] || '319';
	const dirs = pageDirs();

	/* lista stron dla vite-plugin-html */
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
					],
				},
			},
		};
	});

	return {
		resolve: {
			alias: {
				'@common': resolve(__dirname, 'src/js/common'),
			},
		},
		plugins: [
			Inspect(),
			clean({ targets: ['./dist'] }),
			FaviconsInject(
				resolve(__dirname, 'public/logo.svg'),
				{
					manifest: false,
				},
				{ failGraciously: true }
			),

			{
				name: 'auto-jpg-png-to-avif',
				enforce: 'post', // zostaje post (plugin po createHtmlPlugin)

				/* ───────────── HTML ───────────── */
				transformIndexHtml(html) {
					const IMG_RE =
						/(<img\b[^>]*?\s)(?<!\bsrcset=["'][^"']*)(src=["'])([^"']+\.(?:jpe?g|png))(?![^>]*\bsrcset)/gi;

					return html.replace(
						IMG_RE,
						(_, pre, srcAttr, path) =>
							// UWAGA: NIE dodajemy drugiego cudzysłowu!
							`${pre}${srcAttr}${path}?width=${brk}&format=avif;webp&as=srcset`
					);
				},

				/* ───────────── CSS ───────────── */
				transform(code, id) {
					if (!/\.css$/i.test(id)) return;

					const CSS_RE =
						/url\((['"]?)([^'")]+\.(?:jpe?g|png))\1\)(?!\s*format)/gi;

					return code.replace(
						CSS_RE,
						(_, q, path) =>
							// q zawiera otwierający i zamykający cudzysłów (lub pusty), więc
							// wstawiamy query PRZED nim, nie po.
							`url(${q}${path}?width=${brk}&format=avif;webp&as=srcset${q})`
					);
				},
			},

			webfontDownload(
				[
					// 1) możesz podać gotowy URL Google Fonts
					env.VITE_SITE_FONTS_URL,

					// 2) albo lokalny CSS z @font-face
					// resolve(__dirname, 'src/styles/my-fonts.css')
				],
				{
					injectAsStyleTag: false, // wygeneruje <link rel="stylesheet">
					async: true, // dodaje tag <link rel="preload" … as="style" onload="this.rel='stylesheet'">
					minifyCss: true, // inline/external CSS przeleci przez clean-CSS
					fontsSubfolder: 'fonts', // <-- nowa poprawna opcja od v3.10.x
				}
			),
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
				filter: /\.html$/, // minifikuj tylko pliki .html
			}),

			createSvgIconsPlugin({
				iconDirs: [resolve(__dirname, 'src/assets/icons')],
				// zamiast 'i-[dir]-[name]' użyj po prostu:
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
			/* ----------  IMAGES PIPELINE  ---------- */

			/* 1) auto-doklej query do <img> i CSS url() */
			/* ----------  IMAGES PIPELINE  ---------- */

			/* 2) imagetools — tworzy warianty AVIF + srcset */
			imagetools({
				force: true,
				defaultDirectives: new URLSearchParams({
					format: 'avif;webp', // fallback webp
					widths: env.VITE_SITE_BREAKPOINTS,
					quality: '90',
					as: 'srcset',
					filename: '[name]-[width]-[hash][ext]',
				}),
			}),

			/* 3) dodatkowa kompresja AVIF */
			viteImagemin({
				makeAvif: { plugins: { jpg: imageminAvif({ quality: 90 }) } },
				makeWebp: { plugins: { jpg: imageminWebp({ quality: 90 }) } },
				cache: true,
			}),

			/* ---------------------------------------- */

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
				modernPolyfills: false, // w Vite 5 domyślnie = false
				additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
			}),
			// PluginCritical można dodać z powrotem
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
