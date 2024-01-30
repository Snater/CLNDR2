import cleaner from 'rollup-plugin-cleaner';
import typescript from '@rollup/plugin-typescript';

export default [{
	input: 'src/index.ts',
	output: [{
		file: 'dist/index.js',
		format: 'esm',
		sourcemap: true,
	}],
	external: ['date-fns'],
	plugins: [
		cleaner({targets: ['./dist']}),
		typescript(),
	],
}];