/* vite.config.js */
import { defineConfig, loadEnv } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

import { createMpaPlugin } from 'vite-plugin-virtual-mpa';

/* — reszta pluginów (bez zmian) — */
import FaviconsInject from 'vite-plugin-favicons-inject';
import eslint from 'vite-plugin-eslint';
import checker from 'vite-plugin-checker';
import webfontDownload from 'vite-plugin-webfont-dl';
import clean from 'vite-plugin-clean';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import sitemap from 'vite-plugin-sitemap';
import htmlMinifier from 'vite-plugin-html-minifier';
import legacy from '@vitejs/plugin-legacy';
import mkcert from 'vite-plugin-mkcert';
import Inspect from 'vite-plugin-inspect';
import FullReload from 'vite-plugin-full-reload';
import fg from 'fast-glob';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ---- wyszukiwanie stron ---- */
const pageSlugs = fg
	.sync('src/pages/**', { onlyDirectories: true })
	.filter((dir) => {
		const slug = dir.replace(/^src\/pages\//, '');
		const leaf = slug.split('/').pop();
		return (
			fs.existsSync(`${dir}/${leaf}.html`) &&
			fs.existsSync(`${dir}/${leaf}.js`) &&
			fs.existsSync(`${dir}/${leaf}.json`)
		);
	})
	.map((dir) => dir.replace(/^src\/pages\//, ''));

function buildPages(env) {
	return pageSlugs.map((slug) => {
		const leaf = slug.split('/').pop();
		const html = `src/pages/${slug}/${leaf}.html`;
		const js = `/src/pages/${slug}/${leaf}.js`;
		const meta = JSON.parse(
			fs.readFileSync(`src/pages/${slug}/${leaf}.json`, 'utf-8')
		);

		return {
			name: slug.replace(/\//g, '__'),
			filename: slug === 'index' ? 'index.html' : `${slug}.html`,
			template: html,
			entry: js,

			/* <-- najważniejsze: meta w osobnym polu  */
			data: { meta, env },
		};
	});
}

/* ---- plugin WebP ---- */
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

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), 'VITE_');
	const pages = buildPages(env);

	return {
		resolve: {
			alias: {
				'@common': resolve(__dirname, 'src/js/common'),
				'@js': resolve(__dirname, 'src/js'),
				'@img': resolve(__dirname, 'src/assets/images'),
			},
		},

		plugins: [
			/* === GŁÓWNY PLUGIN MPA === */
			createMpaPlugin({
				pages,
				htmlMinify: false,
				ejsOptions: {
					/* 1️⃣  pozwala używać  "/src/templates/…" */
					root: resolve(__dirname),

					/* 2️⃣  pozwala używać krótkich include’ów  */
					views: [
						resolve(__dirname, 'src/templates'),
						resolve(__dirname, 'src/components'),
						resolve(__dirname, 'src/sections'),
					],
				},
			}),

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
			mkcert(),
			FullReload(['src/templates/**/*', 'src/pages/**/*.{json,html}']),
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
		],
	};
});
