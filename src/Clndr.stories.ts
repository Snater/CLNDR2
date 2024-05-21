import './Clndr.stories.less';
import {Meta, StoryObj} from '@storybook/html';
import {addDays, addMonths, format} from 'date-fns';
import {de, enUS, es, fr} from 'date-fns/locale';
import Clndr from './Clndr';
import {action} from '@storybook/addon-actions';
import ejs from 'ejs';
import {fn} from '@storybook/test';

import type {ClndrEvent, ClndrOptions, Interval, View} from './types';

/**
 * Documentation: https://clndr2.snater.com/docs<br/>
 * Source code: https://github.com/Snater/CLNDR2/
 */
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
				type: {
					summary: 'RenderFn | {[key in View]?: RenderFn}',
				},
			},
		},
		adjacentItemsChangePage: {
			description: 'Whether clicking the item of the preceding or following page navigates to that page. Currently, this option is only relevant for the `month` view where days of the previous and following month may be rendered on the same page of the current month according to the `showAdjacent` option.',
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
					summary: '{past: \'past\', now: \'now\', event: \'event\', inactive: \'inactive\', selected: \'selected\', previous: \'previous\', next: \'next\', adjacent: \'adjacent\', switch: \'switch\'}',
				},
				type: {
					summary: '{[key in ItemStatus]: string}',
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
					summary: 'Interval',
				},
			},
		},
		dateParameter: {
			description: 'The key(s) used to extract dates from the `events` array. `date` is used to extract dates of single-day events, while `start` and `end` are used to extract the dates for multi-day events.',
			table: {
				defaultValue: {
					summary: '{date: \'date\', start: \'start\', end: \'end\'},',
				},
				type: {
					summary: 'DateParameterDefinition',
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
					summary: 'DaysOfTheWeek',
				},
			},
		},
		defaultView: {
			description: 'The view the calendar should render initially. Particularly relevant when configuring multiple views for allowing to switch between views. When just configuring one view per `pagination` option, this will automatically point to that view.',
			control: 'select',
			options: ['day', 'week', 'month', 'year', 'decade'],
			table: {
				defaultValue: {
					summary: 'month',
				},
				type: {
					summary: 'View',
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
		on: {
			description: 'Callbacks to be triggered on particular event, e.g. when clicking calendar elements.',
			table: {
				defaultValue: {
					summary: '{}',
				},
				type: {
					summary: 'InteractionEvents',
				},
			},
			control: false,
		},
		pagination: {
			description: 'Specify custom pagination, i.e. display more than one month or a custom amount of days, like two weeks. You can also define the pagination step.',
			table: {
				defaultValue: {
					summary: '{month:, {size: 1}',
				},
				type: {
					summary: '{[key in View]?: Pagination}',
					detail: 'If `step` is not defined, `size` is used as the step size when navigating.',
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
					summary: 'Date',
				},
			},
		},
		showAdjacent: {
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
			description: 'Set up the start point which the calendar should initially be rendered from. The value provided will be mapped to the setup of the calendar, i.e. if setting up the calendar using `month` pagination (which is also set by default), the calendar will start on, for example, October 1992 no matter if `startOn` is `new Date(\'1992-10\')` or `new Date(\'1992-10-15\')`. `undefined` will use today\'s date.',
			control: 'date',
			table: {
				defaultValue: {
					summary: 'undefined',
				},
				type: {
					summary: 'Date | string | number | undefined',
				},
			},
		},
		targets: {
			description: 'Override the CSS class names applied to the calendar elements for binding the `on` event handlers to.',
			table: {
				defaultValue: {
					summary: '{item: \'item\', empty: \'empty\', nextButton: \'clndr-next-button\', todayButton: \'clndr-today-button\', previousButton: \'clndr-previous-button\', nextYearButton: \'clndr-next-year-button\', previousYearButton: \'clndr-previous-year-button\', switchWeekButton: \'clndr-switch-week-button\', switchMonthButton: \'clndr-switch-month-button\', switchYearButton: \'clndr-switch-year-button\', switchDecadeButton: \'clndr-switch-decade-button\'}',
				},
				type: {
					summary: '{[key in TargetOption]: string}',
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
			description: 'Whether to use `touchstart` instead of `click` for triggering relevant `on` handlers.',
			table: {
				defaultValue: {
					summary: 'false',
				},
				type: {
					summary: 'boolean',
				},
			},
		},
		weekStartsOn: {
			control: {
				type: 'range',
				min: 0,
				max: 6,
			},
			description: 'Adjust the weekday that a week starts with, i.e. set to 1 to start a week with Monday.',
			table: {
				defaultValue: {
					summary: '0',
				},
				type: {
					summary: 'number',
				},
			},
		},
	},
	args: {
		render: data => ejs.render(`
			<div class="clndr-controls">
				<div class="clndr-control-button">
					<span class="clndr-previous-button" role="button">previous</span>
				</div>
				<div class="month"><%= format(date, 'MMMM') %> <%= date.getFullYear() %></div>
				<div class="clndr-control-button">
					<span class="clndr-next-button" role="button">next</span>
				</div>
			</div>
			<table class="clndr-table">
				<thead>
					<tr class="header-days">
						<% daysOfTheWeek.forEach(dayOfTheWeek => { %>
							<td class="header-day"><%= dayOfTheWeek %></td>
						<% }) %>
					</tr>
				</thead>
				<tbody>
					<% for (let row = 0; row < Math.ceil(items.length / 7); row++) { %>
						<tr>
							<% for (let col = 0; col < 7; col++) { %>
								<% const index = col + row * 7; %>
								<td class="<%= items[index].classes %>">
									<div class="day-contents"><%= items[index].date.getDate() %></div>
								</td>
							<% } %>
						</tr>
					<% } %>
				</tbody>
			</table>`, data),
		adjacentItemsChangePage: false,
		dateParameter: {
			date: 'date',
			start: 'start',
			end: 'end',
		},
		defaultView: 'month',
		events: [
			{
				title: 'Multi-Day Event',
				start: new Date().toISOString().slice(0, 8) + '10',
				end: new Date().toISOString().slice(0, 8) + '14',
			}, {
				title: 'Another Multi-Day Event',
				start: new Date().toISOString().slice(0, 8) + '21',
				end: new Date().toISOString().slice(0, 8) + '23',
			},
		],
		forceSixRows: false,
		ignoreInactiveDaysInSelection: false,
		on: {
			afterRender: fn(),
			beforeRender: fn(),
			click: fn(),
			navigate: fn(),
			ready: fn(),
			switchView: fn(),
		},
		trackSelectedDate: false,
		useTouchEvents: false,
		weekStartsOn: 0,
	},
};

export default meta;
type Story = StoryObj<ClndrOptions>;

function getDateOfCurrentMonth(day: number) {
	return new Date(new Date().getFullYear(), new Date().getMonth(), day + 1)
		.toISOString()
		.slice(0, 10);
}

function simulateFetchingEvents(interval: Interval, view: View = 'month'): Promise<ClndrEvent[]> {
	return new Promise(resolve => {
		const add = view === 'month' ? addDays : addMonths;

		// Use some random time to provoke race conditions.
		setTimeout(() => {
			resolve([
				{
					title: 'Event 1',
					date: view === 'month'
						? new Date(interval.start)
						: new Date(interval.start).setMonth(Math.floor(Math.random() * 11 + 1)),
				}, {
					title: 'Event 2',
					date: add(interval.start, interval.start.getMonth() + 4),
				}, {
					title: 'Event 3',
					date: add(interval.start, view === 'month' ? 25 : 9),
				},
			]);
		}, Math.floor(Math.random() * 3 + 1) * 500);
	});
}

export const Default: Story = {
	args: {
		adjacentItemsChangePage: false,
		showAdjacent: true,
	},
	render: args => {
		const container = document.createElement('div');
		container.classList.add('cal1');

		const clndr = new Clndr(container, args);

		document.addEventListener('keydown', event => {
			if (event.key === 'ArrowLeft') {
				clndr.previous();
			}
			if (event.key === 'ArrowRight') {
				clndr.next();
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
				<div class="current-month"><%= format(date, 'MMMM') %> <%= date.getFullYear() %></div>
				<div class="clndr-next-button" role="button">&gt;</div>
			</div>
			<div class="clndr-content">
				<div class="clndr-grid">
					<div class="days-of-the-week">
						<% daysOfTheWeek.forEach(day => { %>
							<div class="header-day"><%= day %></div>
						<% }) %>
					</div>
					<div class="days">
						<% items.forEach(day => { %>
							<div class="<%= day.classes %>" id="<%= day.id %>"><span class="day-number"><%= day.date.getDate() %></span></div>
						<% }) %>
					</div>
				</div>
				<div class="event-listing">
					<div class="event-listing-title">EVENTS THIS MONTH</div>
					<% events.currentPage.forEach(event => { %>
						<div class="event-item">
							<div class="event-item-name"><%= event.title %></div>
							<div class="event-item-location"><%= event.location %></div>
						</div>
					<% }) %>
				</div>
			</div>
		`, data),
		events: [
			{
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
			},
		],
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
				<div class="month"><%= format(date, 'MMMM') %></div>
				<div class="clndr-next-button" role="button">&rsaquo;</div>
			</div>
			<div class="clndr-grid">
				<div class="days-of-the-week">
					<% daysOfTheWeek.forEach(day => { %><div class="header-day"><%= day %></div><% }) %>
				</div>
				<div class="days">
					<% items.forEach(day => { %>
						<div class="<%= day.classes %>" role="button"><%= day.date.getDate() %></div>
					<% }) %>
				</div>
			</div>
		`, data),
		events: [
			{
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
				start: getDateOfCurrentMonth(22),
				end: getDateOfCurrentMonth(28),
			}, {
				title: 'Prepare for exam',
				description: 'Make sure to buy enough food.',
				start: getDateOfCurrentMonth(11),
				end: getDateOfCurrentMonth(13),
			},
		],
		on: {
			...meta.args?.on,
			click: fn(target => {
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

				let html = '';

				events.forEach(event => {
					html += `
						<div class="event">
							<div class="event-title">${event.title}</div>
							<div class="event-body">${event.description}</div>
						</div>
					`;
				});

				eventList.innerHTML = html;

				eventsContainer.classList.remove('hidden');
			}),
		},
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
				<div class="month"><%= format(pages[0], 'd/L') %> - <%= format(pages[pages.length - 1], 'd/L') %></div>
				<div class="clndr-next-button" role="button">&rsaquo;</div>
			</div>
			<div class="clndr-grid">
				<div class="days-of-the-week">
					<% daysOfTheWeek.forEach(day => { %>
						<div class="header-day"><%= day %></div>
					<% }) %>
				</div>
				<div class="days">
					<% items.flat().forEach(day => { %>
						<div class="<%= day.classes %>"><%= day.date.getDate() %></div>
					<% }) %>
				</div>
			</div>
			<div class="clndr-today-button" role="button">Today</div>
		`, data),
		pagination: {week: {size: 2, step: 1}},
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
			<% pages.forEach((month, pageIndex) => { %>
				<div class="cal">
					<div class="month"><%= format(month, 'MMMM') %></div>
					<div class="clndr-grid">
						<div class="days-of-the-week">
							<% daysOfTheWeek.forEach(day => { %>
								<div class="header-day"><%= day %></div>
							<% }) %>
						</div>
						<div class="days">
							<% items[pageIndex].forEach(day => { %>
									<div class="<%= day.classes %>"><%= day.date.getDate() %></div>
							<% }) %>
						</div>
					</div>
				</div>
			<% }); %>
			<div class="clndr-today-button" role="button">Today</div>
		`, data),
		pagination: {month: {size: 2, step: 1}},
	},
	render: args => {
		const container = document.createElement('div');
		container.classList.add('cal3');
		new Clndr(container, args);
		return container;
	},
};

export const Year: Story = {
	args: {
		render: data => ejs.render(`
			<div class="clndr-controls">
				<div class="clndr-previous-button" role="button">&lsaquo;</div>
				<div class="year"><%= date.getFullYear() %></div>
				<div class="clndr-next-button" role="button">&rsaquo;</div>
			</div>
			<div class="clndr-grid">
				<% items.forEach(month => { %>
					<div class="<%= month.classes %>" role="button"><%= format(month.date, 'MMMM') %></div>
				<% }); %>
			</div>
			<div class="clndr-today-button" role="button">Current year</div>
		`, data),
		events: [
			{
				title: 'Multi-Day Event',
				start: new Date().getFullYear() + '-01-20',
				end: new Date().getFullYear() + '-01-21',
			}, {
				title: 'Another Multi-Day Event',
				start: new Date().getFullYear() + '-06-20',
				end: new Date().getFullYear() + '-07-03',
			},
		],
		defaultView: 'year',
		pagination: {year: {size: 1, step: 1}},
	},
	render: args => {
		const container = document.createElement('div');
		container.classList.add('cal-year');
		new Clndr(container, args);
		return container;
	},
};

export const SwitchBetweenViews: Story = {
	args: {
		render: {
			decade: data => ejs.render(`
				<div class="decade-template">
					<div class="clndr-controls">
						<div class="clndr-previous-button" role="button">&lsaquo;</div>
						<div class="title"><%= items[0].date.getFullYear() %> to <%= items[9].date.getFullYear() %></div>
						<div class="clndr-next-button" role="button">&rsaquo;</div>
					</div>
					<div class="clndr-grid">
						<% items.forEach(year => { %>
							<div class="<%= year.classes %>" role="button"><%= format(year.date, 'yyyy') %></div>
						<% }) %>
					</div>
					<div class="clndr-today-button footer-button" role="button">Go to current decade</div>
				</div>
			`, data),
			year: data => ejs.render(`
				<div class="year-template">
					<div class="clndr-controls">
						<div class="clndr-previous-button" role="button">&lsaquo;</div>
						<div class="title"><%= date.getFullYear() %></div>
						<div class="clndr-next-button" role="button">&rsaquo;</div>
					</div>
					<div class="clndr-grid">
						<% items.forEach(month => { %>
							<div class="<%= month.classes %>" role="button"><%= format(month.date, 'MMM') %></div>
						<% }) %>
					</div>
					<div class="clndr-today-button footer-button" role="button">Go to current year</div>
					<div class="clndr-switch-decade-button footer-button" role="button">Switch to decade view</div>
				</div>
			`, data),
			month: data => ejs.render(`
				<div class="month-template">
					<div class="clndr-controls">
						<div class="clndr-previous-button" role="button">&lsaquo;</div>
						<div class="title"><%= format(date, 'MMMM yyyy') %></div>
						<div class="clndr-next-button" role="button">&rsaquo;</div>
					</div>
					<div class="clndr-grid">
						<div class="days-of-the-week grid-template">
							<% daysOfTheWeek.forEach(day => { %><div class="header-day"><%= day %></div><% }) %>
						</div>
						<div class="days grid-template">
							<% items.forEach(day => { %>
								<div class="<%= day.classes %>" role="button"><%= day.date.getDate() %></div>
							<% }) %>
						</div>
					</div>
					<div class="clndr-today-button footer-button" role="button">Go to current month</div>
					<div class="clndr-switch-year-button footer-button" role="button">Switch to year view</div>
					<div class="clndr-switch-decade-button footer-button" role="button">Switch to decade view</div>
				</div>
			`, data),
			week: data => ejs.render(`
				<div class="week-template">
					<div class="clndr-controls">
						<div class="clndr-previous-button" role="button">&lsaquo;</div>
						<div class="title">Week <%= format(date, 'w') %> in <%= format(date, 'yyyy') %></div>
						<div class="clndr-next-button" role="button">&rsaquo;</div>
					</div>
					<div class="clndr-grid">
						<div class="week">
							<div class="days-of-the-week grid-template">
								<% items.forEach(day => { %><div class="header-day"><%= format(day.date, 'EEEE') %></div><% }) %>
							</div>
							<div class="days grid-template">
								<% items.forEach(day => { %>
									<div class="<%= day.classes %>" role="button"><%= format(day.date, 'LLLL do') %></div>
								<% }) %>
							</div>
						</div>
					</div>
					<div class="clndr-today-button footer-button" role="button">Go to current week</div>
					<div class="clndr-switch-month-button footer-button" role="button">Switch to month view</div>
					<div class="clndr-switch-year-button footer-button" role="button">Switch to year view</div>
					<div class="clndr-switch-decade-button footer-button" role="button">Switch to decade view</div>
				</div>
			`, data),
			day: data => ejs.render(`
				<div class="day-template">
					<div class="clndr-controls">
						<div class="clndr-previous-button" role="button">&lsaquo;</div>
						<div class="title"><%= format(date, 'PPP') %></div>
						<div class="clndr-next-button" role="button">&rsaquo;</div>
					</div>
					<div class="clndr-grid">
						<div class="header">Events</div>
						<% if (events.currentPage.length === 0) { %>
							<div class="empty">No events today.</div>
						<% } else { %>
							<% events.currentPage.forEach(event => { %>
								<div class="event"><%= event.title %></div>
							<% }) %>
						<% } %>
						</div>
					</div>
					<div class="clndr-today-button footer-button" role="button">Go to today</div>
					<div class="clndr-switch-week-button footer-button" role="button">Switch to week view</div>
					<div class="clndr-switch-month-button footer-button" role="button">Switch to month view</div>
					<div class="clndr-switch-year-button footer-button" role="button">Switch to year view</div>
					<div class="clndr-switch-decade-button footer-button" role="button">Switch to decade view</div>
				</div>
			`, data),
		},
		events: [
			{
				title: 'Multi-Day Event',
				start: new Date().getFullYear() + '-01-20',
				end: new Date().getFullYear() + '-01-21',
			}, {
				title: 'Another Multi-Day Event',
				start: new Date().getFullYear() + '-02-26',
				end: new Date().getFullYear() + '-03-05',
			}, {
				title: 'And another Multi-Day Event',
				start: new Date().getFullYear() + '-06-20',
				end: new Date().getFullYear() + '-07-03',
			}, {
				title: 'A looong Multi-Day Event',
				start: new Date().getFullYear() + '-09-01',
				end: new Date().getFullYear() + '-10-03',
			}, {
				title: 'Event in another year',
				start: new Date().getFullYear() + 2 + '-06-01',
				end: new Date().getFullYear() + 3 + '-05-31',
			},
		],
		forceSixRows: true,
	},
	render: args => {
		const container = document.createElement('div');
		container.classList.add('cal-month-year');
		new Clndr(container, args);
		return container;
	},
};

export const AsyncBeforeRenderCalendar: Story = {
	args: {
		render: data => ejs.render(`
			<div class="clndr-controls">
				<div class="clndr-previous-button" role="button">&lsaquo;</div>
				<div class="month"><%= format(date, 'MMMM') %></div>
				<div class="clndr-next-button" role="button">&rsaquo;</div>
			</div>
			<div class="clndr-grid">
				<div class="loading">loading</div>
				<div class="days-of-the-week">
					<% daysOfTheWeek.forEach(day => { %><div class="header-day"><%= day %></div><% }) %>
				</div>
				<div class="days">
					<% items.forEach(day => { %>
						<div class="<%= day.classes %>" role="button"><%= day.date.getDate() %></div>
					<% }) %>
				</div>
			</div>
		`, data),
		events: [],
		trackSelectedDate: true,
	},
	render: args => {
		const container = document.createElement('div');
		container.classList.add('mini-clndr');
		container.classList.add('async-clndr');

		const cache: string[] = [];

		function createEventsForInterval(interval: Interval): Promise<ClndrEvent[]> {
			return new Promise(resolve => {
				// Use some random time to provoke race conditions.
				setTimeout(() => {
					resolve([
						{
							title: 'Event 1',
							date: new Date(interval.start),
						}, {
							title: 'Event 2',
							date: addDays(interval.start, interval.start.getMonth() + 4),
						}, {
							title: 'Event 3',
							date: addDays(interval.start, 25),
						},
					]);
				}, Math.floor(Math.random() * 3 + 1) * 500);
			});
		}

		async function beforeRender(
			this: Clndr,
			{element, interval, view}: {element: HTMLElement, interval: Interval, view: View}
		) {
			action('beforeRender')([{element, interval, view}]);

			if (cache.includes(format(interval.start, 'yyyy-MM'))) {
				return;
			}

			element.querySelector('.clndr .loading')?.classList.add('show');

			const additionalEvents = await createEventsForInterval(interval);
			cache.push(format(interval.start, 'yyyy-MM'));

			element.querySelector('.clndr .loading')?.classList.remove('show');

			this.addEvents(additionalEvents);
		}

		new Clndr(container, {...args, on: {...args.on, beforeRender}});
		return container;
	},
};

export const AsyncAfterRenderCalendar: Story = {
	args: {
		render: data => ejs.render(`
			<div class="clndr-controls">
				<div class="clndr-previous-button" role="button">&lsaquo;</div>
				<div class="month"><%= format(date, 'MMMM') %></div>
				<div class="clndr-next-button" role="button">&rsaquo;</div>
			</div>
			<div class="clndr-grid">
				<div class="loading">loading</div>
				<div class="days-of-the-week">
					<% daysOfTheWeek.forEach(day => { %><div class="header-day"><%= day %></div><% }) %>
				</div>
				<div class="days">
					<% items.forEach(day => { %>
						<div class="<%= day.classes %>" role="button"><%= day.date.getDate() %></div>
					<% }) %>
				</div>
			</div>
		`, data),
		events: [],
		trackSelectedDate: true,
	},
	render: args => {
		const container = document.createElement('div');
		container.classList.add('mini-clndr');
		container.classList.add('async-clndr');

		const cache: string[] = [];

		async function afterRender(
			this: Clndr,
			{element, interval, view}: {element: HTMLElement, interval: Interval, view: View}
		) {
			action('afterRender')([{element, interval, view}]);

			if (cache.includes(format(interval.start, 'yyyy-MM'))) {
				return;
			}

			element.querySelector('.clndr .loading')?.classList.add('show');

			const additionalEvents = await simulateFetchingEvents(interval);
			cache.push(format(interval.start, 'yyyy-MM'));

			this.addEvents(additionalEvents);

			// Re-render only if the interval events were requested for is the interval currently
			// rendered.
			if (interval.start === this.getInterval().start) {
				element.querySelector('.clndr .loading')?.classList.remove('show');
				await this.render();
			}
		}

		new Clndr(container, {...args, on: {...args.on, afterRender}});
		return container;
	},
};

export const AsyncSwitchBetweenViews: Story = {
	args: {
		render: {
			year: data => ejs.render(`
				<div class="year-template">
					<div class="clndr-controls">
						<div class="clndr-previous-button" role="button">&lsaquo;</div>
						<div class="title"><%= date.getFullYear() %></div>
						<div class="clndr-next-button" role="button">&rsaquo;</div>
					</div>
					<div class="clndr-grid">
						<div class="loading">loading</div>
						<% items.forEach(month => { %>
							<div class="<%= month.classes %>" role="button"><%= format(month.date, 'MMM') %></div>
						<% }) %>
					</div>
					<div class="clndr-today-button footer-button" role="button">Go to current year</div>
				</div>
			`, data),
			month: data => ejs.render(`
				<div class="month-template">
					<div class="clndr-controls">
						<div class="clndr-previous-button" role="button">&lsaquo;</div>
						<div class="title"><%= format(date, 'MMMM yyyy') %></div>
						<div class="clndr-next-button" role="button">&rsaquo;</div>
					</div>
					<div class="clndr-grid">
						<div class="loading">loading</div>
						<div class="days-of-the-week grid-template">
							<% daysOfTheWeek.forEach(day => { %><div class="header-day"><%= day %></div><% }) %>
						</div>
						<div class="days grid-template">
							<% items.forEach(day => { %>
								<div class="<%= day.classes %>" role="button"><%= day.date.getDate() %></div>
							<% }) %>
						</div>
					</div>
					<div class="clndr-today-button footer-button" role="button">Go to current month</div>
					<div class="clndr-switch-year-button footer-button" role="button">Switch to year view</div>
				</div>
			`, data),
		},
		events: [],
		forceSixRows: true,
	},
	render: args => {
		const cache: Record<'month' | 'year', Record<string, ClndrEvent[]>> = {
			month: {},
			year: {},
		};

		async function afterRender(
			this: Clndr,
			{element, interval, view}: {element: HTMLElement, interval: Interval, view: View}
		) {
			action('afterRender')([{element, interval, view}]);

			if (view !== 'month' && view !== 'year') {
				return;
			}

			const cacheId = format(interval.start, view === 'month' ? 'yyyy-MM' : 'yyyy');
			const cacheForThisInterval = cache[view][cacheId];

			if (cacheForThisInterval) {
				return;
			}

			element.querySelector('.clndr .loading')?.classList.add('show');

			const additionalEvents = await simulateFetchingEvents(interval, view);
			cache[view][cacheId] = additionalEvents;

			this.addEvents(additionalEvents);

			// Re-render only if the interval events were requested for is the interval currently
			// rendered and if the view is
			const currentInterval = this.getInterval();
			if (interval.start === currentInterval.start && interval.end === currentInterval.end) {
				element.querySelector('.clndr .loading')?.classList.remove('show');
				await this.render();
			}
		}

		async function switchView(this: Clndr, {view} : {view: View}) {
			action('switchView')([{view}]);

			if (view !== 'month' && view !== 'year') {
				return;
			}

			this.setEvents(Object.values(cache[view]).flat());
		}

		const container = document.createElement('div');
		container.classList.add('cal-month-year');
		container.classList.add('async-clndr');
		new Clndr(container, {...args, on: {...args.on, afterRender, switchView}});
		return container;
	},
};
