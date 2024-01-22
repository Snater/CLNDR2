import _ from 'underscore';
import moment from 'moment';

const config = {
	globals: {_, moment},
	testEnvironment: 'jsdom',
	transform: {
		'\\.[jt]s$': 'babel-jest',
	},
};

export default config;