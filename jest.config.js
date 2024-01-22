import _ from 'underscore';
import {JSDOM} from 'jsdom';
import jQuery from 'jquery';
import moment from 'moment';

const config = {
	globals: {
		_,
		jQuery: jQuery(new JSDOM().window),
		moment,
	},
	testEnvironment: 'jsdom',
	transform: {
		'\\.[jt]s$': 'babel-jest',
	},
};

export default config;