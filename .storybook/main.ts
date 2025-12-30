import {StorybookConfig} from '@storybook/html-vite';

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
	addons: ['@storybook/addon-docs'],
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
