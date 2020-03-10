import pkg from './package.json';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import svelte from 'rollup-plugin-svelte';
import { terser } from 'rollup-plugin-terser';
import config from 'sapper/config/rollup.js';

const mode = process.env.NODE_ENV;
const dev = mode === 'development';
const legacy = !!process.env.SAPPER_LEGACY_BUILD;

const onwarn = (warning, onwarn) => (
	(warning.code === 'CIRCULAR_DEPENDENCY' && /[/\\]@sapper[/\\]/.test(warning.message))
		|| warning.code === 'THIS_IS_UNDEFINED') || onwarn(warning);
const dedupe = importee => importee === 'svelte' || importee.startsWith('svelte/');

export default {
	client: {
		input: config.client.input(),
		output: config.client.output(),
		plugins: [
			replace({
				'process.browser': true,
				'process.env.NODE_ENV': JSON.stringify(mode)
			}),
			svelte({
				dev,
				hydratable: true,
				emitCss: true,
				extensions: ['.svelte']
			}),
			resolve({
				browser: true,
				dedupe
			}),
			commonjs(),
			json(),
			!legacy && babel({
				extensions: ['.js', '.mjs', '.html', '.svelte'],
				exclude: ['node_modules/@babel/**'],
				plugins: [
					'@babel/plugin-syntax-dynamic-import',
					'@babel/plugin-proposal-object-rest-spread'
				]
			}),
			!dev && terser({
				module: true
			})
		],
		onwarn
	},

	server: {
		input: config.server.input(),
		output: config.server.output(),
		plugins: [
			replace({
				'process.browser': false,
				'process.env.NODE_ENV': JSON.stringify(mode),
				// prevent html caching á la https://github.com/sveltejs/sapper/issues/567#issuecomment-542788270
				// hacky, but if html is cached users may receive wrong locale when they navigate back to root url /
				'max-age=600': 'no-cache'
			}),
			svelte({
				generate: 'ssr',
				dev,
				extensions: ['.svelte']
			}),
			resolve({
				dedupe
			}),
			commonjs(),
			json()
		],
		external: Object.keys(pkg.dependencies).concat(
			require('module').builtinModules || Object.keys(process.binding('natives'))
		),
		onwarn
	},

	serviceworker: {
		input: config.serviceworker.input(),
		output: config.serviceworker.output(),
		plugins: [
			resolve(),
			replace({
				'process.browser': true,
				'process.env.NODE_ENV': JSON.stringify(mode),
				'max-age=600': 'no-cache'
			}),
			commonjs(),
			!dev && terser()
		],
		onwarn
	}
};