import _ from 'underscore';

const config = {
	globals: {_},
	testEnvironment: 'jsdom',
	transform: {
		'\\.[jt]s$': 'babel-jest',
	},
};

export default config;