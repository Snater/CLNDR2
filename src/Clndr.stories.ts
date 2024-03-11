import './clndr.stories.less';
import {Meta, StoryObj} from '@storybook/html';
import {de, enUS, es, fr} from 'date-fns/locale';
import Clndr from './Clndr.js';
import {action} from '@storybook/addon-actions';
import ejs from 'ejs';

import type {ClndrOptions} from './types';

const meta: Meta<ClndrOptions> = {
	title: 'CLNDR2',
	argTypes: {
		render: {
			control: false,
			description: '**(REQUIRED)** Function rendering a template being passed ClndrTemplateData as parameter.',
			table: {
				defaultValue: {
					summary: 'undefined',
				},
				type: '(data: ClndrTemplateData) => string',
			},
		},
		adjacentDaysChangeMonth: {
			description: 'Whether clicking the day of the preceding or following month navigates to that month.',
			table: {
				defaultValue: {
					summary: 'false',
				},
				type: {
					summary: 'boolean',
				},
			},
		},
		classes: {
			control: false,
			description: 'Custom CSS class names to apply to the calendar elements to be used for styling.',
			table: {
				defaultValue: {
					summary: '{past: \'past\', today: \'today\', event: \'event\', inactive: \'inactive\', selected: \'selected\', lastMonth: \'last-month\', nextMonth: \'next-month\', adjacentMonth: \'adjacent-month\'}',
				},
				type: {
					summary: '{past?: string, today?: string, event?: string, inactive?: string, selected?: string, lastMonth?: string, nextMonth?: string, adjacentMonth?: string}',
				},
			},
		},
		clickEvents: {
			description: 'Callbacks to be triggered when clicking particular elements.',
			table: {
				defaultValue: {
					summary: 'undefined',
				},
				type: {
					summary: '{click?: (target: ClndrTarget) => void, today?: (month: Date) => void, nextYear?: (month: Date) => void, nextMonth?: (month: Date) => void, nextInterval?: (intervalStart: Date, intervalEnd: Date) => void, previousYear?: (month: Date) => void, onYearChange?: (month: Date) => void, previousMonth?: (month: Date) => void, onMonthChange?: (month: Date) => void, previousInterval?: (intervalStart: Date, intervalEnd: Date) => void, onIntervalChange?: (intervalStart: Date, intervalEnd: Date) => void}',
				},
			},
		},
		constraints: {
			control: 'object',
			description: 'Restrict calendar navigation specifying the calendar\'s boundaries.',
			table: {
				defaultValue: {
					summary: 'undefined',
				},
				type: {
					summary: '{startDate: Date | string, endDate: Date | string}',
				},
			},
		},
		dateParameter: {
			description: 'The key(s) used to extract dates from the `events` array. For a calendar with *single-day* events only, this may be a plain string, i.e. setting this option to `\'dateParam\'`, the events array should be `{dateParam: Date | string, ...}[]`. Provide an object to configure multi-day events, i.e. setting `{startDate: \'start\', endDate: \'end\'}`, the events array should be `{start: Date | string, end: Date | string, ...}[]`. Use the `date` field to also enable single-day events in a multi-day calendar, i.e. `{date: \'day\', startDate: \'start\', endDate: \'end\'}`.',
			table: {
				defaultValue: {
					summary: '{date: \'date\', startDate: \'startDate\', endDate: \'endDate\'},',
				},
				type: {
					summary: 'string | {date?: string, startDate?: string, endDate?: string}',
				},
			},
		},
		daysOfTheWeek: {
			description: 'Labels for each day of the week.',
			control: 'object',
			table: {
				defaultValue: {
					summary: 'undefined',
					detail: 'By default, the labels are acquired from date-fns using the `locale`, if provided.',
				},
				type: {
					summary: '[string, string, string, string, string, string, string]',
					detail: 'An array of seven strings, one per day of the week.',
				},
			},
		},
		doneRendering: {
			description: 'A callback triggered each time the calendar is (re-)rendered.',
			control: false,
			table: {
				defaultValue: {
					summary: 'undefined',
				},
				type: {
					summary: '() => void',
				},
			},
		},
		events: {
			description: 'Array of event objects. When setting up the calendar for using single-day events, each event object should contain a "date" field (the name can be customized per `dateParameter`). When setting up the calendar for multi-day events, start and end date have to be provided per keys set per `dateParameter` option.',
			table: {
				defaultValue: {
					summary: '[]',
				},
				type: {
					summary: 'ClndrEvent[]',
				},
			},
		},
		extras: {
			control: false,
			description: 'Any extra data to be passed into the template. For example, use this to inject date-fns functions into your template.',
			table: {
				defaultValue: {
					summary: 'undefined',
				},
				type: {
					summary: 'unknown',
				},
			},
		},
		forceSixRows: {
			description: 'Forces the calendar to always display six rows.',
			table: {
				defaultValue: {
					summary: 'false',
				},
				type: {
					summary: 'boolean',
				},
			},
		},
		formatWeekdayHeader: {
			description: 'A function to format the day labels in the header row.',
			table: {
				defaultValue: {
					summary: 'undefined',
					detail: '`format` of date-fns is used by default: `format(day, \'cccccc\', {locale}).charAt(0)`',
				},
				type: {
					summary: '(day: Date, locale?: Locale) => string',
				},
			},
		},
		ignoreInactiveDaysInSelection: {
			description: 'Whether days that are out the the calendar\'s boundaries (defined by `constraints`) should be selectable if `trackSelectedDate` is activated.',
			table: {
				defaultValue: {
					summary: 'false',
				},
				type: {
					summary: 'boolean',
				},
			},
		},
		lengthOfTime: {
			description: 'Specify a custom interval the calendar should display, i.e. more than one month or two weeks. You can also define the pagination step.',
			table: {
				defaultValue: {
					summary: '{months: 1, interval: 1}',
				},
				type: {
					summary: '({days: number, months?: never} | {days?: never,	months: number}) & {interval: number}',
				},
			},
		},
		locale: {
			control: 'select',
			options: ['enUS', 'de', 'es', 'fr'],
			mapping: {enUS, de, es, fr},
			description: 'A date-fns locale used for formatting Date strings.',
			table: {
				defaultValue: {
					summary: 'undefined',
				},
				type: {
					summary: 'Locale',
					detail: 'date-fns locale object',
				},
			},
		},
		ready: {
			control: false,
			description: 'Callback triggered after the calendar has finished initialization and rendered for the first time.',
			table: {
				defaultValue: {
					summary: 'undefined',
				},
				type: {
					summary: '() => void',
				},
			},
		},
		selectedDate: {
			description: 'A date that should receive a CSS class marking it selected. by default, the CSS class is "selected", it can be customized per the `classes` option.',
			control: 'date',
			table: {
				defaultValue: {
					summary: 'undefined',
				},
				type: {
					summary: 'Date | string',
				},
			},
		},
		showAdjacentMonths: {
			description: 'Whether days of the preceding and following month should be displayed.',
			table: {
				defaultValue: {
					summary: 'true',
				},
				type: {
					summary: 'boolean',
				},
			},
		},
		startOn: {
			description: 'Set up the start point which the calendar should initially be rendered from. The value provided will be mapped to the setup of the calendar, i.e. if you set up the calendar using `months` of the `lengthOfTime` option (which is also set by default), the calendar will start on, for example, October 1992 no matter if `startDate` is `new Date(\'1992-10\')` or new Date(\'1992-10-15\')`. `undefined` will use today\'s date.',
			control: 'date',
			table: {
				defaultValue: {
					summary: 'undefined',
				},
				type: {
					summary: 'Date | undefined',
				},
			},
		},
		targets: {
			description: 'Override the CSS class names applied to the calendar elements for binding the `clickEvents` to.',
			table: {
				defaultValue: {
					summary: '{day: \'day\', empty: \'empty\', nextButton: \'clndr-next-button\', todayButton: \'clndr-today-button\', previousButton: \'clndr-previous-button\', nextYearButton: \'clndr-next-year-button\', previousYearButton: \'clndr-previous-year-button\'}',
				},
				type: {
					summary: '{day?: string, empty?: string, nextButton?: string, todayButton?: string, previousButton?: string, nextYearButton?: string, previousYearButton?: string}',
				},
			},
		},
		trackSelectedDate: {
			description: 'Whether the last clicked day should be tracked, that is applying the `classes.selected` CSS class to the day that was clicked last. Otherwise, `classes.selected` will remain on what is set per `selectedDate` option.',
			control: 'boolean',
			table: {
				defaultValue: {
					summary: 'false',
				},
				type: {
					summary: 'boolean',
				},
			},
		},
		useTouchEvents: {
			description: 'Whether to use `touchstart` instead of `click` for triggering the `clickEvents` handlers.',
			table: {
				defaultValue: {
					summary: 'false',
				},
				type: {
					summary: 'boolean',
				},
			},
		},
		weekOffset: {
			control: {
				type: 'range',
				min: 0,
				max: 6,
			},
			description: 'Adjust the weekday that a week starts with, i.e. set to 1 to start a week with Monday.',
			table: {
				defaultValue: 0,
				type: 'number',
			},
		},
	},
	args: {
		render: data => ejs.render(`
			<div class="clndr-controls">
				<div class="clndr-control-button">
					<span class="clndr-previous-button" role="button">previous</span>
				</div>
				<div class="month"><%= month %> <%= year %></div>
				<div class="clndr-control-button">
					<span class="clndr-next-button" role="button">next</span>
				</div>
			</div>
			<table class="clndr-table">
				<thead>
					<tr class="header-days">
						<% for(var i = 0; i < daysOfTheWeek.length; i++) { %>
							<td class="header-day"><%= daysOfTheWeek[i] %></td>
						<% } %>
					</tr>
				</thead>
				<tbody>
					<% for(var i = 0; i < numberOfRows; i++){ %>
						<tr>
							<% for(var j = 0; j < 7; j++){ %>
								<% var d = j + i * 7; %>
								<td class="<%= days[d].classes %>">
									<div class="day-contents"><%= days[d].day %></div>
								</td>
							<% } %>
						</tr>
					<% } %>
				</tbody>
			</table>`, data),
		adjacentDaysChangeMonth: false,
		clickEvents: {
			click: action('click'),
			today: action('today'),
			nextMonth: action('nextMonth'),
			previousMonth: action('previousMonth'),
			onMonthChange: action('onMonthChange'),
			nextYear: action('nextYear'),
			previousYear: action('previousYear'),
			onYearChange: action('onYearChange'),
			nextInterval: action('nextInterval'),
			previousInterval: action('previousInterval'),
			onIntervalChange: action('onIntervalChange'),
		},
		dateParameter: {
			date: 'date',
			startDate: 'startDate',
			endDate: 'endDate',
		},
		doneRendering: action('doneRendering'),
		events: [
			{
				title: 'Multi-Day Event',
				endDate: new Date().toISOString().slice(0, 8) + '14',
				startDate: new Date().toISOString().slice(0, 8) + '10',
			}, {
				endDate: new Date().toISOString().slice(0, 8) + '23',
				startDate: new Date().toISOString().slice(0, 8) + '21',
				title: 'Another Multi-Day Event',
			},
		],
		forceSixRows: false,
		ignoreInactiveDaysInSelection: false,
		ready: action('ready'),
		useTouchEvents: false,
		weekOffset: 0,
	},
	parameters: {
		docs: {
			description: {
				component: 'Source code and usage instructions: https://github.com/Snater/CLNDR2/',
			},
		},
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<ClndrOptions>;

function getDateOfCurrentMonth(day: number) {
	return new Date(new Date().getFullYear(), new Date().getMonth(), day + 1)
		.toISOString()
		.slice(0, 10);
}

export const Default: Story = {
	args: {
		adjacentDaysChangeMonth: false,
		showAdjacentMonths: true,
	},
	render: args => {
		const container = document.createElement('div');
		container.classList.add('cal1');

		const clndr = new Clndr(container, args);

		document.addEventListener('keydown', event => {
			if (event.key === 'ArrowLeft') {
				clndr.back();
			}
			if (event.key === 'ArrowRight') {
				clndr.forward();
			}
		});

		return container;
	},
};

export const FullCalendar: Story = {
	args: {
		render: data => ejs.render(`
			<div class="clndr-controls">
				<div class="clndr-previous-button" role="button">&lt;</div>
				<div class="current-month"><%= month %> <%= year %></div>
				<div class="clndr-next-button" role="button">&gt;</div>
			</div>
			<div class="clndr-content">
				<div class="clndr-grid">
					<div class="days-of-the-week">
						<% daysOfTheWeek.forEach(day => { %>
							<div class="header-day"><%= day %></div>
						<% }); %>
					</div>
					<div class="days">
						<% days.forEach(day => { %>
							<div class="<%= day.classes %>" id="<%= day.id %>"><span class="day-number"><%= day.day %></span></div>
						<% }); %>
					</div>
				</div>
				<div class="event-listing">
					<div class="event-listing-title">EVENTS THIS MONTH</div>
					<% eventsThisMonth.forEach(event => { %>
						<div class="event-item">
							<div class="event-item-name"><%= event.title %></div>
							<div class="event-item-location"><%= event.location %></div>
						</div>
					<% }); %>
				</div>
			</div>
		`, data),
		events: [{
			date: getDateOfCurrentMonth(12),
			title: 'Football Match',
			location: 'Stadium',
		}, {
			date: getDateOfCurrentMonth(16),
			title: 'Walk In The Park',
			location: 'Nick Straker Park',
		}, {
			date: getDateOfCurrentMonth(22),
			title: 'Trip To A Remote Island',
			location: 'In The Middle Of Nowhere',
		}, {
			date: getDateOfCurrentMonth(7),
			title: 'Boogie Night',
			location: 'Seahorse Club',
		}],
		forceSixRows: true,
	},
	render: args => {
		const container = document.createElement('div');
		container.classList.add('full-clndr');
		new Clndr(container, args);
		return container;
	},
}

export const MiniCalendarWithClickEvent: Story = {
	args: {
		render: data => ejs.render(`
			<div class="clndr-controls">
				<div class="clndr-previous-button" role="button">&lsaquo;</div>
				<div class="month"><%= month %></div>
				<div class="clndr-next-button" role="button">&rsaquo;</div>
			</div>
			<div class="clndr-grid">
				<div class="days-of-the-week">
					<% daysOfTheWeek.forEach(day => { %><div class="header-day"><%= day %></div><% }); %>
				</div>
				<div class="days">
					<% days.forEach(day => { %>
						<div class="<%= day.classes %>" role="button"><%= day.day %></div>
					<% }); %>
				</div>
			</div>
		`, data),
		clickEvents: {
			click: target => {
				action('click')(target);

				if (!target.date) {
					return;
				}

				const eventsContainer = document.querySelector('.events');
				const eventList = eventsContainer?.querySelector('.events-list');

				if (!eventsContainer || !eventList) {
					throw new Error('HTML not properly initialized');
				}

				const events = target.events;

				if (events.length === 0) {
					eventsContainer.classList.add('hidden');
					eventList.innerHTML = '';
					return;
				}

				eventsContainer.classList.remove('hidden');

				let html = '';

				events.forEach(event => {
					html += `
						<div class="event">
							<div class="event-title">${event.title}</div>
							<div class="event-body">${event.description}</div>
						</div>
					`;
				})

				eventList.innerHTML = html;
			},
			today: action('today'),
			nextMonth: action('nextMonth'),
			previousMonth: action('previousMonth'),
			onMonthChange: action('onMonthChange'),
			nextYear: action('nextYear'),
			previousYear: action('previousYear'),
			onYearChange: action('onYearChange'),
			nextInterval: action('nextInterval'),
			previousInterval: action('previousInterval'),
			onIntervalChange: action('onIntervalChange'),
		},
		events: [{
			title: 'Boogie Night',
			description: 'Bring your vinyls.',
			date: getDateOfCurrentMonth(12),
		}, {
			title: 'Walk In The Park',
			description: 'A step in the dark!',
			date: getDateOfCurrentMonth(16),
		}, {
			title: 'Trip To A Remote Island',
			description: 'Don\'t forget to take three things.',
			startDate: getDateOfCurrentMonth(22),
			endDate: getDateOfCurrentMonth(28),
		}, {
			title: 'Prepare for exam',
			description: 'Make sure to buy enough food.',
			startDate: getDateOfCurrentMonth(11),
			endDate: getDateOfCurrentMonth(13),
		}],
		trackSelectedDate: true,
	},
	render: args => {
		const container = document.createElement('div');
		container.classList.add('mini-clndr');

		container.innerHTML = `
			<div class="clndr"></div>
			<div class="events hidden">
				<div class="events-header">Events</div>
				<div class="events-list"></div>
			</div>
		`;

		new Clndr(container.querySelector('.clndr') as HTMLElement, args);
		return container;
	},
}

export const TwoWeeksIntervalWithOneWeekPagination: Story = {
	args: {
		render: data => ejs.render(`
			<div class="clndr-controls">
				<div class="clndr-previous-button" role="button">&lsaquo;</div>
				<div class="month"><%= days[0].day %>/<%= days[0].date.getMonth() + 1 %> - <%= days[days.length - 1].day %>/<%= days[days.length - 1].date.getMonth() + 1 %></div>
				<div class="clndr-next-button" role="button">&rsaquo;</div>
			</div>
			<div class="clndr-grid">
				<div class="days-of-the-week">
					<% daysOfTheWeek.forEach(day => { %>
						<div class="header-day"><%= day %></div>
					<% }); %>
				</div>
				<div class="days">
					<% days.forEach(day => { %>
						<div class="<%= day.classes %>"><%= day.day %></div>
					<% }); %>
				</div>
			</div>
			<div class="clndr-today-button" role="button">Today</div>
		`, data),
		lengthOfTime: {
			days: 14,
			interval: 7,
		},
	},
	render: args => {
		const container = document.createElement('div');
		container.classList.add('cal2');
		new Clndr(container, args);
		return container;
	},
};

export const TwoMonthsWithOneMonthPagination: Story = {
	args: {
		render: data => ejs.render(`
			<div class="clndr-controls top">
				<div class="clndr-previous-button" role="button">&lsaquo;</div>
				<div class="clndr-next-button" role="button">&rsaquo;</div>
			</div>
			<% months.forEach(cal => { %>
				<div class="cal">
					<div class="month"><%= format(cal.month, 'MMMM') %></div>
					<div class="clndr-grid">
						<div class="days-of-the-week">
							<% daysOfTheWeek.forEach(day => { %>
								<div class="header-day"><%= day %></div>
							<% }); %>
						</div>
						<div class="days">
							<% cal.days.forEach(day => { %>
									<div class="<%= day.classes %>"><%= day.day %></div>
							<% }); %>
						</div>
					</div>
				</div>
			<% }); %>
			<div class="clndr-today-button" role="button">Today</div>
		`, data),
		lengthOfTime: {
			months: 2,
			interval: 1,
		},
	},
	render: args => {
		const container = document.createElement('div');
		container.classList.add('cal3');
		new Clndr(container, args);
		return container;
	},
};