import {Preview} from '@storybook/html-vite';

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
	tags: ['autodocs'],
};

export default preview;
