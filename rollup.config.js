// https://github.com/rollup/rollup
// https://github.com/rollup/rollup-starter-lib
// https://github.com/rollup

// import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';
import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';
import replace from 'rollup-plugin-replace';

export default [
	// browser-friendly UMD build
	{
		input: './src/index.js',
		output: {
			name: pkg.libName,
			file: pkg.main,
			format: 'umd'
		},
		plugins: [
			babel(babelrc()),
			commonjs()
		]
	},
	{
		input: './src/index.js',
		output: [{ file: pkg.cjs, format: 'cjs' }],
		plugins: [
			babel(babelrc()),
			replace({
				TUBUGL_VERSOIN: pkg.version
			})
		]
	},
	{
		input: './src/index.js',
		output: [{ file: pkg.esm, format: 'es' }],
		plugins: [
			replace({
				TUBUGL_VERSOIN: pkg.version
			})
		]
	}
];
