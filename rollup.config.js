import cleaner from 'rollup-plugin-cleaner';

export default [{
	input: 'src/clndr.js',
	output: [{
		file: 'dist/index.js',
		format: 'esm',
		sourcemap: true,
	}],
	external: ['moment', 'underscore'],
	plugins: [
		cleaner({targets: ['./dist']}),
	],
}];