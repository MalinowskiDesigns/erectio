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
// import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import fg from 'fast-glob';
import sharp from 'sharp';

// import PluginCritical from 'rollup-plugin-critical';
/* — helpery — */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** 1️⃣  Rekurencyjne wyszukiwanie katalogów–stron */
const pageDirs = () =>
	fg
		.sync('src/pages/**', { onlyDirectories: true })
		.filter((dir) => {
			const slug = dir.replace(/^src\/pages\//, '');
			const leaf = slug.split('/').pop();
			const htmlSlug = slug === 'home' ? 'index' : slug;
			return (
				fs.existsSync(`${dir}/${leaf}.json`) &&
				fs.existsSync(`${dir}/${leaf}.js`) &&
				fs.existsSync(`${htmlSlug}.html`)
			);
		})
		.map((dir) => dir.replace(/^src\/pages\//, ''));

/** 2️⃣  Mapa wejść dla Rollupa (absolutne ścieżki) */
const makeInput = (slugs) =>
	slugs.reduce((acc, slug) => {
		const outSlug = slug === 'home' ? 'index' : slug;
		acc[outSlug] = resolve(__dirname, `${outSlug}.html`);
		return acc;
	}, {});

/** 3️⃣  Konwersja JPG/PNG -> WebP przy buildzie */
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

	/** 4️⃣  Dane dla vite-plugin-html (z wiodącym „/” w entry) */
	const pages = dirs.map((slug) => {
		const leaf = slug.split('/').pop();
		const meta = JSON.parse(
			fs.readFileSync(`src/pages/${slug}/${leaf}.json`, 'utf-8')
		);
		const outSlug = slug === 'home' ? 'index' : slug;
		return {
			entry: `/src/pages/${slug}/${leaf}.js`, //  <-- kluczowa zmiana
			filename: `${outSlug}.html`,
			template: `${outSlug}.html`,
			injectOptions: {
				data: { ...meta, ...env },
				ejsOptions: {
					filename: resolve(__dirname, `${outSlug}.html`),
					localsName: 'meta',
					views: [
						resolve(__dirname, 'src/templates'),
						resolve(__dirname, 'src/treatment-methods'),
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
				'@js': resolve(__dirname, 'src/js'),
				'@img': resolve(__dirname, 'src/assets/images'),
			},
		},
		plugins: [
			imageConvertPlugin(),
			Inspect(),
			clean({ targets: ['./dist'] }),
			FaviconsInject(
				resolve(__dirname, 'public/logo.svg'),
				{ manifest: false },
				{ failGraciously: true }
			),
			webfontDownload([env.VITE_SITE_FONTS_URL], {
				injectAsStyleTag: false,
				async: true,
				minifyCss: true,
				fontsSubfolder: 'fonts',
			}),

			/* PWA (opcjonalnie) */
			// VitePWA({ … }),

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
			// !disableCritical && PluginCritical({ … }),
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
