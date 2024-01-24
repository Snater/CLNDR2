import cleaner from 'rollup-plugin-cleaner';

export default [{
	input: 'src/clndr.js',
	output: [{
		file: 'dist/index.js',
		format: 'esm',
		sourcemap: true,
	}],
	external: ['date-fns', 'underscore'],
	plugins: [
		cleaner({targets: ['./dist']}),
	],
}];