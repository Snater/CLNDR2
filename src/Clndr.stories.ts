import './clndr.stories.less';
import {Meta, StoryObj} from '@storybook/html';
import Clndr from './Clndr.js';
import {action} from '@storybook/addon-actions';
import {enGB} from 'date-fns/locale';
import ejs from 'ejs';

import type {Options} from './types';

const meta: Meta<Options> = {
	title: 'Clndr',
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

export default meta;
type Story = StoryObj<Options>;

export const Default: Story = {
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

function getDateOfCurrentMonth(day: number) {
	return new Date(new Date().getFullYear(), new Date().getMonth(), day).toISOString().slice(0, 10);
}

export const FullCalendar: Story = {
	args: {
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
		render: data => {
			return ejs.render(`
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
			`, data);
		},
	},
	render: ({...args}) => {
		const container = document.createElement('div');
		container.classList.add('full-clndr');
		new Clndr(container, {...args});
		return container;
	},
}

export const TwoWeeksIntervalWithOneWeekPagination: Story = {
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
		render: data => {
			return ejs.render(`
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
			`, data);
		},
	},
	render: ({...args}) => {
		const container = document.createElement('div');
		container.classList.add('cal2');
		new Clndr(container, {...args});
		return container;
	},
};

export const TwoMonthsWithOneMonthPagination: Story = {
	args: {
		lengthOfTime: {
			months: 2,
			interval: 1,
		},
		multiDayEvents: {
			endDate: 'endDate',
			startDate: 'startDate',
		},
		render: data => {
			return ejs.render(`
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
			`, data);
		},
	},
	render: ({...args}) => {
		const container = document.createElement('div');
		container.classList.add('cal3');
		new Clndr(container, {...args});
		return container;
	},
};