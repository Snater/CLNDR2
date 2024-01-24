/** @type { import('@storybook/html-vite').StorybookConfig } */

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
};

export default config;