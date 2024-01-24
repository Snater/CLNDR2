import Clndr from './clndr.js';
import {action} from '@storybook/addon-actions';
import './clndr.stories.css';
import {enGB} from 'date-fns/locale';

export default {
	title: 'Clndr',
	args: {
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
		locale: enGB,
	},
};

export const Default = {
	args: {
		multiDayEvents: {
			singleDay: 'date',
			endDate: 'endDate',
			startDate: 'startDate',
		},
		showAdjacentMonths: true,
		adjacentDaysChangeMonth: false,
	},
	render: ({...args}) => {
		const container = document.createElement('div');
		container.classList.add('cal1');

		const clndr = new Clndr(container, {...args});

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

export const TwoWeeksIntervalWithOneWeekPagination = {
	args: {
		lengthOfTime: {
			days: 14,
			interval: 7,
		},
		multiDayEvents: {
			singleDay: 'date',
			endDate: 'endDate',
			startDate: 'startDate',
		},
		template: `
			<div class="clndr-controls">
				<div class="clndr-previous-button">&lsaquo;</div>
				<div class="month"><%= month %></div>
				<div class="clndr-next-button">&rsaquo;</div>
			</div>
			<div class="clndr-grid">
				<div class="days-of-the-week">
					<% daysOfTheWeek.forEach(day => { %>
						<div class="header-day"><%= day %></div>
					<% }); %>
					<div class="days">
						<% days.forEach(day => { %>
							<div class="<%= day.classes %>"><%= day.day %></div>
						<% }); %>
					</div>
				</div>
			</div>
			<div class="clndr-today-button">Today</div>
		`,
	},
	render: ({...args}) => {
		const container = document.createElement('div');
		container.classList.add('cal2');
		new Clndr(container, {...args});
		return container;
	},
};

export const TwoMonthsWithOneMonthPagination = {
	args: {
		lengthOfTime: {
			months: 2,
			interval: 1,
		},
		multiDayEvents: {
			endDate: 'endDate',
			startDate: 'startDate',
		},
		template: `
			<div class="clndr-controls top">
				<div class="clndr-previous-button">&lsaquo;</div>
				<div class="clndr-next-button">&rsaquo;</div>
			</div>
			<div class="clearfix">
			<% months.forEach(cal => { %>
					<div class="cal">
							<div class="clndr-controls">
									<div class="month"><%= format(cal.month, 'MMMM') %></div>
							</div>
							<div class="clndr-grid">
									<div class="days-of-the-week">
									<% daysOfTheWeek.forEach(day => { %>
											<div class="header-day"><%= day %></div>
									<% }); %>
											<div class="days">
											<% cal.days.forEach(day => { %>
													<div class="<%= day.classes %>"><%= day.day %></div>
											<% }); %>
											</div>
									</div>
							</div>
					</div>
			<% }); %>
			</div>
			<div class="clndr-today-button">Today</div>
		`,
	},
	render: ({...args}) => {
		const container = document.createElement('div');
		container.classList.add('cal3');
		new Clndr(container, {...args});
		return container;
	},
};