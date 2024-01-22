/** @type { import('@storybook/html-vite').StorybookConfig } */
import inject from '@rollup/plugin-inject';
import {mergeConfig} from 'vite';
import {viteCommonjs} from '@originjs/vite-plugin-commonjs';

const config = {
	stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
	addons: [
		'@storybook/addon-links',
		'@storybook/addon-essentials',
		'@storybook/addon-interactions',
	],
	core: {
		disableTelemetry: true,
	},
	framework: {
		name: '@storybook/html-vite',
		options: {},
	},
	staticDirs: ['./assets'],
	async viteFinal(config) {
		return mergeConfig(config, {
			plugins: [
				inject({
					_: 'underscore',
					jQuery: 'jquery',
					moment: 'moment',
				}),
				viteCommonjs(),
			],
			define: {
				'process.env': process.env,
			},
		});
	},
};

export default config;