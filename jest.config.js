import ejs from 'ejs';

const config = {
	globals: {ejs},
	testEnvironment: 'jsdom',
	transform: {
		'\\.[jt]s$': 'babel-jest',
	},
};

export default config;