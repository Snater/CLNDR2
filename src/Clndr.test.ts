import '@testing-library/jest-dom';
import {fireEvent, screen} from '@testing-library/dom';
import userEvent, {UserEvent} from '@testing-library/user-event';
import Clndr from './Clndr';
import {de} from 'date-fns/locale';
import ejs from 'ejs';

import type {ClndrTemplateData} from './types';

const defaultTemplate = `
	<div class="clndr-controls">
		<div class="clndr-control-button">
			<span class="clndr-previous-button" role="button">previous</span>
		</div>
		<div class="month"><%= format(month, 'MMMM') %> <%= interval[0].getFullYear() %></div>
		<div class="clndr-control-button">
			<span class="clndr-next-button" role="button">next</span>
		</div>
	</div>
	<table class="clndr-table">
		<thead>
			<tr class="header-days">
				<% for(let i = 0; i < daysOfTheWeek.length; i++) { %>
					<td class="header-day"><%= daysOfTheWeek[i] %></td>
				<% } %>
			</tr>
		</thead>
		<tbody>
			<% for(let i = 0; i < numberOfRows; i++){ %>
				<tr>
					<% for(let j = 0; j < 7; j++){ %>
						<% const d = j + i * 7; %>
						<td class="<%= items[d].classes %>">
							<div class="day-contents"><%= items[d].day %></div>
						</td>
					<% } %>
				</tr>
			<% } %>
		</tbody>
	</table>`;

const simpleTemplate = `
	<div class="clndr-controls">
		<div class="clndr-previous-button">&lsaquo;</div>
		<div class="month"><%= format(month, 'MMMM') %></div>
		<div class="clndr-next-button">&rsaquo;</div>
	</div>
	<div class="clndr-grid">
		<div class="days-of-the-week">
			<% daysOfTheWeek.forEach(day => { %>
				<div class="header-day"><%= day %></div>
			<% }); %>
			<div class="days">
				<% items.forEach(day => { %>
					<div class="<%= day.classes %>"><%= day.day %></div>
				<% }); %>
			</div>
		</div>
	</div>
	<div class="clndr-today-button">Today</div>`;

const oneWeekTemplate = `
	<div class="clndr-controls">
		<div class="clndr-previous-button">&lsaquo;</div>
		<div class="month">
			<%= format(interval[0], 'MM/dd') %> - <%= format(interval[1], 'MM/dd') %>
		</div>
		<div class="clndr-next-button">&rsaquo;</div>
	</div>
	<div class="clndr-grid">
		<div class="days-of-the-week">
			<% daysOfTheWeek.forEach(day => { %>
				<div class="header-day"><%= day %></div>
			<% }); %>
			<div class="days">
				<% items.forEach(day => { %>
					<div class="<%= day.classes %>"><%= day.day %></div>
				<% }); %>
			</div>
		</div>
	</div>`;

const multiMonthTemplate = `
	<div class="multi-month-controls">
		<div class="clndr-previous-year-button quarter-button">&laquo;</div><!--
		--><div class="clndr-previous-button quarter-button">&lsaquo;</div><!--
		--><div class="clndr-next-button quarter-button right-align">&rsaquo;</div><!--
		--><div class="clndr-next-year-button quarter-button right-align">&raquo;</div>
	</div>
	<% months.forEach((month, monthIndex) => { %>
		<div class="clndr-controls">
			<div class="month"><%= format(month, 'MMMM yyyy') %></div>
		</div>
		<div class="clndr-grid">
			<div class="days-of-the-week">
				<% daysOfTheWeek.forEach(day => { %>
					<div class="header-day"><%= day %></div>
				<% }); %>
				<div class="days">
					<% items[monthIndex].forEach(day => { %>
						<div class="<%= day.classes %>"><%= day.day %></div>
					<% }); %>
				</div>
			</div>
		</div>
		<div class="clndr-today-button">Today</div>
	<% }); %>`;

const provideRender = (template?: string) => (data: ClndrTemplateData) => {
	return ejs.render(template || defaultTemplate, data);
}

let user: UserEvent;
let container: HTMLElement;
let clndr: Clndr;

beforeAll(() => {
	jest.useFakeTimers({now: new Date(2024, 0, 18, 12)});
	jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-18T12:00:00.000Z').valueOf());
	user = userEvent.setup({delay: null});
});

afterAll(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
})

beforeEach(() => {
	container = document.createElement('div');
	document.body.appendChild(container);
});

afterEach(() => {
	if (clndr) {
		clndr.destroy();
	}

	container.remove();
});

describe('Setup', () => {

	test('Default setup', () => {
		clndr = new Clndr(container, {render: provideRender()});

		expect(container).not.toBeEmptyDOMElement();

		clndr.destroy();

		expect(container).toBeEmptyDOMElement();
	});

	test('Pass compiled template to render option', () => {
		const template = ejs.compile(simpleTemplate);
		clndr = new Clndr(container, {render: data => template(data)});

		expect(container).not.toBeEmptyDOMElement();
		expect(screen.getByText('January')).toBeInTheDocument();

		clndr.destroy();

		expect(container).toBeEmptyDOMElement();
	});

	test('Pass in some events', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			events: [
				{date: '2024-01-07'},
				{date: '2024-01-23'},
			],
		});

		expect(screen.getByText('6').parentNode).not.toHaveClass('event');
		expect(screen.getByText('7').parentNode).toHaveClass('event');
		expect(screen.getByText('23').parentNode).toHaveClass('event');
	});

	test('Basic multi-day events', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {
				startDate: 'startDate',
				endDate: 'endDate',
			},
			events: [
				{
					title: 'Multi1',
					startDate: '1992-10-12',
					endDate: '1992-10-17',
				}, {
					title: 'Multi2',
					startDate: '1992-10-24',
					endDate: '1992-10-27',
				},
			],
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('12').parentNode).toHaveClass('event');
		expect(screen.getByText('17').parentNode).toHaveClass('event');
		expect(screen.getByText('14').parentNode).toHaveClass('event');
		expect(screen.getByText('25').parentNode).toHaveClass('event');
		expect(screen.getByText('2').parentNode).not.toHaveClass('event');
	});

	test('Multi-day events with partial dates', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {
				startDate: 'startDate',
				endDate: 'endDate',
			},
			events: [
				{
					title: 'Multi1',
					startDate: '2024-01-17',
				}, {
					title: 'Multi2',
					endDate: '2024-01-12',
				},
			],
		});

		expect(container.querySelector('.calendar-day-2024-01-12')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-17')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-14')).not.toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-25')).not.toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-02')).not.toHaveClass('event');
	});

	test('Mixing single-day and multi-day events', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {
				date: 'date',
				startDate: 'startDate',
				endDate: 'endDate',
			},
			events: [
				{
					title: 'Multi1',
					startDate: '2024-01-12',
					endDate: '2024-01-17',
				}, {
					title: 'Multi2',
					startDate: '2024-01-24',
					endDate: '2024-01-27',
				}, {
					title: 'Single',
					date: '2024-01-19',
				},
			],
		});

		expect(container.querySelector('.calendar-day-2024-01-12')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-17')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-14')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-19')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-02')).not.toHaveClass('event');
	});

	test('Custom week offset', () => {
		clndr = new Clndr(container, {render: provideRender(), weekOffset: 1});

		expect(screen.getByText('M')).toBe(container.querySelector('.header-day'));
	});

	test('Custom week offset bigger than actual week length', () => {
		const mockWarn = jest.fn();
		jest.spyOn(console, 'warn').mockImplementation(mockWarn);

		// @ts-expect-error Intentionally provide weekOffset > 6
		clndr = new Clndr(container, {render: provideRender(), weekOffset: 10});

		expect(screen.queryAllByText('S')[0]).toBe(container.querySelector('.header-day'));
		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	test('Custom week offset while not showing adjacent months', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			showAdjacent: false,
			weekOffset: 3,
		});

		expect(container.querySelectorAll('.empty').length).toBeGreaterThan(0);
	})

	test('Force six rows', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			forceSixRows: true,
			startOn: new Date('1992-02'),
		});

		expect(container.querySelector('.calendar-day-1992-03-07')).toBeInTheDocument();
	})

	test('Force six rows while not showing adjacent months', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			forceSixRows: true,
			showAdjacent: false,
			startOn: new Date('1992-02'),
		});

		expect(container.querySelectorAll('.empty').length).toBeGreaterThan(0);
	})

	test('Selected date', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			selectedDate: new Date('1992-10-15'),
			startOn: new Date('1992-10'),
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toHaveClass('selected');
	});

	test('Custom day interval while providing start month', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {scope: 'day', size: 7},
			startOn: new Date('1992-10'),
		});

		expect(container.querySelector('.calendar-day-1992-10-01')).toBeInTheDocument();
	});

	test('Day interval not being dividable by 7', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {scope: 'day', size: 6},
			startOn: new Date('1992-10'),
		});

		expect(container.querySelector('.calendar-day-1992-10-01')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-10-06')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-10-07')).not.toBeInTheDocument();
	});

	test('Custom days of the week naming', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			daysOfTheWeek: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'],
		});

		expect(screen.getByText('d7')).toBeInTheDocument();
	})

	test('Do not show adjacent months', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			events: [{date: '1992-10-15'}],
			showAdjacent: false,
			startOn: new Date('1992-10'),
		});

		expect(screen.queryAllByText('1').length).toBe(1);
		expect(screen.queryAllByText('30').length).toBe(1);
	})

	test('Pass in locale', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			clickEvents: {
				click: jest.fn(),
			},
			pagination: {scope: 'month', size: 3},
			locale: de,
		});

		expect(screen.getByText('Januar 2024')).toBeInTheDocument();
	});

	test('Use touch events', () => {
		const handleIntervalChange = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onIntervalChange: handleIntervalChange,
			},
			useTouchEvents: true,
		});

		fireEvent.touchStart(screen.getByText('next'));
		expect(handleIntervalChange).toHaveBeenCalledTimes(1);
	});

	test('Track selected date while inactive days should be ignored in selection', async() => {
		clndr = new Clndr(container, {
			render: provideRender(),
			ignoreInactiveDaysInSelection: true,
			startOn: new Date('1992-06'),
			trackSelectedDate: true,
		});

		expect(container.querySelector('.selected')).toBeNull();
		await user.click(screen.getByText('12'));
		expect(screen.getByText('12').parentNode).toHaveClass('selected');
		await user.click(screen.getByText('31'));
		expect(screen.getByText('12').parentNode).not.toHaveClass('selected');
		expect(screen.getByText('31').parentNode).toHaveClass('selected');
	});

	test('Track selected date while inactive days should be ignored in selection and adjacent month\'s days change the month', async() => {
		clndr = new Clndr(container, {
			render: provideRender(),
			adjacentDaysChangeMonth: true,
			ignoreInactiveDaysInSelection: true,
			startOn: new Date('1992-06'),
			trackSelectedDate: true,
		});

		expect(container.querySelector('.selected')).toBeNull();
		await user.click(screen.getByText('12'));
		expect(screen.getByText('12').parentNode).toHaveClass('selected');
		await user.click(screen.getByText('31'));
		expect(screen.getByText('31').parentNode).toHaveClass('selected');
		await user.click(screen.getByText('next'));
		expect(screen.getByText('12').parentNode).not.toHaveClass('selected');
	});

	test('Define just a date after the current date', async() => {
		clndr = new Clndr(container, {
			render: provideRender(),
			events: [{date: '1992-10-15'}],
			startOn: new Date('1992-09'),
		});

		await user.click(screen.getByText('next'));
		expect(screen.getByText('15').parentNode).toHaveClass('event');
	});

	test('Custom dateParameter', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: 'customDateParameter',
			events: [{customDateParameter: '1992-10-15'}],
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText(15).parentNode).toHaveClass('event');
	});

	test('formatWeekDayHeader option', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			formatWeekdayHeader: day => {
				return `${day.getDay()}X`;
			},
		});

		expect(screen.getByText('3X')).toBeInTheDocument();
	});

	test('Custom target class', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			targets: {
				item: 'custom-item-class',
			},
		});

		expect(container.querySelectorAll('.custom-item-class').length).toBeGreaterThan(0);
	});

	test('Custom day status class', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			classes: {
				now: 'custom-now-class',
			},
		});

		expect(container.querySelectorAll('.custom-now-class').length).toBe(1);
	});

});

describe('Navigation', () => {

	test('Navigate between months', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			events: [{date: '1992-10-15'}],
			startOn: new Date('1992-11'),
		});

		expect(screen.getByText('November 1992')).toBeInTheDocument();
		await user.click(screen.getByText('previous'));
		expect(screen.getByText('October 1992')).toBeInTheDocument();
		await user.click(screen.getByText('next'));
		expect(screen.getByText('November 1992')).toBeInTheDocument();
	});

	test('Change month with click on previous month\'s day', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			adjacentDaysChangeMonth: true,
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		await user.click(screen.getAllByText('30')[0]);
		expect(screen.getByText('September 1992')).toBeInTheDocument();
	});

	test('Change month by clicking on empty field preceding current month\'s days', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			showAdjacent: false,
			adjacentDaysChangeMonth: true,
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		const emptyElement = container.querySelector('.empty');
		expect(emptyElement).not.toBeNull();
		await user.click(emptyElement as Element);
		expect(screen.getByText('September 1992')).toBeInTheDocument();
	});

	test('Change month by clicking on empty field following current month\'s days', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			showAdjacent: false,
			adjacentDaysChangeMonth: true,
			startOn: new Date('1992-09'),
		});

		expect(screen.getByText('September 1992')).toBeInTheDocument();
		await user.click(container.querySelectorAll('.empty')[container.querySelectorAll('.empty').length - 1]);
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Click button switching to next year', async () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			clickEvents: {
				click: jest.fn(),
			},
			startOn: new Date('1992-10'),
			pagination: {scope: 'month', size: 3},
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		await user.click(screen.getByText('»'));
		expect(screen.getByText('October 1993')).toBeInTheDocument();
	});

	test('Click button switching to previous year', async () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			clickEvents: {
				click: jest.fn(),
			},
			startOn: new Date('1992-10'),
			pagination: {scope: 'month', size: 3},
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		await user.click(screen.getByText('«'));
		expect(screen.getByText('October 1991')).toBeInTheDocument();
	});

	test('Programmatically change month by calling previous()', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.previous();
		expect(screen.getByText('September 1992')).toBeInTheDocument();
	});

	test('Programmatically change month by calling forward() and back()', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			startOn: new Date('1992-09'),
		});

		expect(screen.getByText('September 1992')).toBeInTheDocument();
		clndr.forward();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.back();
		expect(screen.getByText('September 1992')).toBeInTheDocument();
	});

	test('Programmatically change month by calling forward() and back() with custom month page size', async () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			pagination: {scope: 'month', size: 2},
			startOn: new Date('1992-09'),
		});

		expect(screen.getByText('September 1992')).toBeInTheDocument();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.forward();
		expect(screen.getByText('November 1992')).toBeInTheDocument();
		expect(screen.getByText('December 1992')).toBeInTheDocument();
		clndr.back();
		expect(screen.getByText('September 1992')).toBeInTheDocument();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Programmatically change month by calling forward() and back() with custom month pagination, including step', async () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			pagination: {scope: 'month', size: 2, step: 1},
			startOn: new Date('1992-09'),
		});

		expect(screen.getByText('September 1992')).toBeInTheDocument();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.forward();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
		expect(screen.getByText('November 1992')).toBeInTheDocument();
		clndr.back();
		expect(screen.getByText('September 1992')).toBeInTheDocument();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Programmatically change month by calling forward() and back() with custom day page size', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {scope: 'day', size: 7},
			startOn: new Date('1992-09'),
		});

		expect(screen.getByText('09/01 - 09/07')).toBeInTheDocument();
		clndr.forward();
		expect(screen.getByText('09/08 - 09/14')).toBeInTheDocument();
		clndr.back();
		expect(screen.getByText('09/01 - 09/07')).toBeInTheDocument();
	});

	test('Programmatically change month by calling forward() and back() with custom day pagination, including step', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {scope: 'day', size: 7, step: 1},
			startOn: new Date('1992-09'),
		});

		expect(screen.getByText('09/01 - 09/07')).toBeInTheDocument();
		clndr.forward();
		expect(screen.getByText('09/02 - 09/08')).toBeInTheDocument();
		clndr.back();
		expect(screen.getByText('09/01 - 09/07')).toBeInTheDocument();
	});

	test('Programmatically change year using previousYear()', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.previousYear();
		expect(screen.getByText('October 1991')).toBeInTheDocument();
	});

	test('Prevent navigating backward if constraint prohibits', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			constraints: {
				startDate: new Date('1992-10-15'),
			},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.previous();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.previousYear();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Programmatically change year using nextYear()', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.nextYear();
		expect(screen.getByText('October 1993')).toBeInTheDocument();
	})

	test('Prevent navigating forward if constraint prohibits', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			constraints: {
				endDate: new Date('1992-10-15'),
			},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.next();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.nextYear();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Programmatically trigger today()', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			startOn: new Date('1992-10'),
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		clndr.today({withCallbacks: true});
		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
	});

	test('Programmatically trigger today() with callbacks', () => {
		const handleToday = jest.fn();
		const handleIntervalChange = jest.fn();
		const handleYearChange = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onIntervalChange: handleIntervalChange,
				onYearChange: handleYearChange,
				today: handleToday,
			},
			startOn: new Date('1992-10'),
		});

		clndr.today({withCallbacks: true});

		expect(handleToday).toHaveBeenCalledTimes(1);
		expect(handleYearChange).toHaveBeenCalledTimes(1);
		expect(handleIntervalChange).toHaveBeenCalledTimes(1);
	});

	test('Go to today while having a custom interval with a start date being set', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {scope: 'day', size: 7},
			startOn: new Date('1992-10-15'),
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();

		clndr.today();

		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
	});

	test('Go to today while having a custom interval', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {scope: 'day', size: 7},
		});

		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
		clndr.today();
		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
	});

	test('Click today button', async () => {
		const handleToday = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(simpleTemplate),
			clickEvents: {
				today: handleToday,
			},
		});

		await user.click(screen.getByText('Today'));

		expect(handleToday).toHaveBeenCalledTimes(1);
	})

	test('Programmatically set month with callbacks', () => {
		const handleIntervalChange = jest.fn();
		const handleMonthChange = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onIntervalChange: handleIntervalChange,
				onMonthChange: handleMonthChange,
			},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setMonth(0, {withCallbacks: true});
		expect(screen.getByText('January 1992')).toBeInTheDocument();

		expect(handleIntervalChange).toHaveBeenCalledTimes(1);
		expect(handleMonthChange).toHaveBeenCalledTimes(1);
	});

	test('Programmatically set month with empty options', () => {
		const handleIntervalChange = jest.fn();
		const handleMonthChange = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onIntervalChange: handleIntervalChange,
				onMonthChange: handleMonthChange,
			},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setMonth(0, {});
		expect(screen.getByText('January 1992')).toBeInTheDocument();

		expect(handleIntervalChange).toHaveBeenCalledTimes(0);
		expect(handleMonthChange).toHaveBeenCalledTimes(0);
	});

	test('Programmatically set month while having configured a custom month interval', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			pagination: {scope: 'month', size: 2},
			startOn: new Date('1992-10-01'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		expect(screen.getByText('November 1992')).toBeInTheDocument();
		clndr.setMonth(4);
		expect(screen.getByText('May 1992')).toBeInTheDocument();
		expect(screen.getByText('June 1992')).toBeInTheDocument();
	});

	test('Programmatically set month while having configured a custom day interval', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {scope: 'day', size: 7},
			startOn: new Date('1992-10-01'),
		});

		expect(screen.getByText('10/01 - 10/07')).toBeInTheDocument();
		clndr.setMonth(4);
		expect(screen.getByText('05/01 - 05/07')).toBeInTheDocument();
	});

	test('Programmatically set year with callbacks', () => {
		const handleIntervalChange = jest.fn();
		const handleYearChange = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onIntervalChange: handleIntervalChange,
				onYearChange: handleYearChange,
			},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setYear(1991, {withCallbacks: true});
		expect(screen.getByText('October 1991')).toBeInTheDocument();

		expect(handleIntervalChange).toHaveBeenCalledTimes(1);
		expect(handleYearChange).toHaveBeenCalledTimes(1);
	});

	test('Programmatically set year with empty options', () => {
		const handleIntervalChange = jest.fn();
		const handleYearChange = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onIntervalChange: handleIntervalChange,
				onYearChange: handleYearChange,
			},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setYear(1991);
		expect(screen.getByText('October 1991')).toBeInTheDocument();

		expect(handleIntervalChange).toHaveBeenCalledTimes(0);
		expect(handleYearChange).toHaveBeenCalledTimes(0);
	});

	test('Programmatically set new interval on default configuration', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setIntervalStart('2000-10-15');
		expect(screen.getByText('October 2000')).toBeInTheDocument();
	});

	test('Programmatically set new interval with having a custom month interval configured', () => {
		const handleIntervalChange = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			clickEvents: {
				onIntervalChange: handleIntervalChange,
			},
			pagination: {scope: 'month', size: 3},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setIntervalStart('2000-06-01', {withCallbacks: true});
		expect(screen.getByText('June 2000')).toBeInTheDocument();
		expect(handleIntervalChange).toHaveBeenCalledTimes(1);
	});

	test('Programmatically set new interval with having a custom month interval configured', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {scope: 'day', size: 7},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('10/01 - 10/07')).toBeInTheDocument();
		clndr.setIntervalStart('2000-06-01');
		expect(screen.getByText('06/01 - 06/07')).toBeInTheDocument();
	});

});

describe('Events', () => {

	test('Initialisation events', () => {
		const handleDoneRendering = jest.fn();
		const handleReady = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			doneRendering: function() {
				expect(this).toBeInstanceOf(Clndr);
				handleDoneRendering();
			},
			ready: function() {
				expect(this).toBeInstanceOf(Clndr);
				handleReady();
			},
		});

		expect(handleDoneRendering).toHaveBeenCalledTimes(1);
		expect(handleReady).toHaveBeenCalledTimes(1);
	});

	test('Change month with click on next month\'s day', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			adjacentDaysChangeMonth: true,
			startOn: new Date('1992-09'),
		});

		expect(screen.getByText('September 1992')).toBeInTheDocument();
		await user.click(screen.getAllByText('1')[screen.getAllByText('1').length - 1]);
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Click handler', async () => {
		const handleClick = jest.fn();
		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {click: handleClick},
			startOn: new Date('1992-10'),
		});

		await user.click(screen.getByText('15'));

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	test('Trigger interval change callbacks', () => {
		const handlePreviousInterval = jest.fn();
		const handleNextInterval = jest.fn();
		const handleIntervalChange = jest.fn();

		const clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			clickEvents: {
				previousInterval: handlePreviousInterval,
				nextInterval: handleNextInterval,
				onIntervalChange: handleIntervalChange,
			},
			pagination: {scope: 'month', size: 3},
		});

		clndr.back({withCallbacks: true});
		clndr.next({withCallbacks: true});

		expect(handlePreviousInterval).toHaveBeenCalledTimes(1);
		expect(handleNextInterval).toHaveBeenCalledTimes(1);
		expect(handleIntervalChange).toHaveBeenCalledTimes(2);
	});

	test('Trigger default change callbacks', () => {
		const handleIntervalChange = jest.fn();
		const handleMonthChange = jest.fn();
		const handlePreviousMonth = jest.fn();
		const handleNextMonth = jest.fn();
		const handleYearChange = jest.fn();
		const handlePreviousYear = jest.fn();
		const handleNextYear = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onIntervalChange: function() {
					expect(this).toBeInstanceOf(Clndr);
					handleIntervalChange();
				},
				onMonthChange: function() {
					expect(this).toBeInstanceOf(Clndr);
					handleMonthChange();
				},
				previousMonth: function() {
					expect(this).toBeInstanceOf(Clndr);
					handlePreviousMonth();
				},
				nextMonth: function() {
					expect(this).toBeInstanceOf(Clndr);
					handleNextMonth();
				},
				onYearChange: function() {
					expect(this).toBeInstanceOf(Clndr);
					handleYearChange();
				},
				previousYear: function() {
					expect(this).toBeInstanceOf(Clndr);
					handlePreviousYear();
				},
				nextYear: function() {
					expect(this).toBeInstanceOf(Clndr);
					handleNextYear();
				},
			},
			startOn: new Date('1992-12'),
		});

		clndr.next({withCallbacks: true});
		clndr.back({withCallbacks: true});

		expect(handleIntervalChange).toHaveBeenCalledTimes(2);
		expect(handleMonthChange).toHaveBeenCalledTimes(2);
		expect(handlePreviousMonth).toHaveBeenCalledTimes(1);
		expect(handleNextMonth).toHaveBeenCalledTimes(1);
		expect(handleYearChange).toHaveBeenCalledTimes(2);
		expect(handlePreviousYear).toHaveBeenCalledTimes(1);
		expect(handleNextYear).toHaveBeenCalledTimes(1);
	});

	test('Click on a day with an event', async() => {
		const handleClick = jest.fn(data => {
			expect(data.events[0].title).toBe('This is an event');
		});

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				click: handleClick,
			},
			events: [{
				title: 'This is an event',
				date: '1992-10-15',
			}],
			startOn: new Date('1992-10'),
		})

		await user.click(screen.getByText('15'));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	test('Click on a day of a multi-day event', async() => {
		const handleClick = jest.fn(data => {
			expect(data.events[0].title).toBe('Multi-day event');
		});

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				click: handleClick,
			},
			dateParameter: {
				startDate: 'startDate',
				endDate: 'endDate',
			},
			events: [{
				title: 'Multi-day event',
				startDate: '1992-10-12',
				endDate: '1992-10-17',
			}],
			startOn: new Date('1992-10'),
		})

		await user.click(screen.getByText('15'));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	test('Click on empty calendar box', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			showAdjacent: false,
			clickEvents: {
				click: handleClick,
			},
		});

		const emptyElement = container.querySelector('.empty');
		expect(emptyElement).not.toBeNull();
		await user.click(emptyElement as Element);
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

});

describe('Data manipulations', () => {

	test('Set extras', () => {
		clndr = new Clndr(container, {
			render: provideRender('<div><%= extras.someExtra %></div>'),
			extras: {someExtra: 'some extra'},
		});

		expect(screen.queryAllByText('some extra').length).toBe(1);

		clndr.setExtras({someExtra: 'updated extra'});

		expect(screen.queryAllByText('some extra').length).toBe(0);
		expect(screen.queryAllByText('updated extra').length).toBe(1);
	});

	test('Add an event with date string', () => {
		clndr = new Clndr(container, {render: provideRender()});

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');

		clndr.addEvents([{date: '2024-01-12'}]);

		expect(container.querySelector('.calendar-day-2024-01-12')).toHaveClass('event');
	});

	test('Add an event with Date object', () => {
		clndr = new Clndr(container, {render: provideRender()});

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');

		clndr.addEvents([{date: new Date('2024-01-12')}]);

		expect(container.querySelector('.calendar-day-2024-01-12')).toHaveClass('event');
	});

	test('Add an event with forcing no re-rendering', () => {
		clndr = new Clndr(container, {render: provideRender()});

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');

		clndr.addEvents([{date: '2024-01-12'}], false);

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');
	});

	test('Add a single-day event with multi-day events being configured', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {
				date: 'date',
				startDate: 'startDate',
				endDate: 'endDate',
			},
		});

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');

		clndr.addEvents([{date: '2024-01-12'}], false);

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');
	})

	test('Set all events', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			events: [{date: '2024-01-07'}],
		});

		expect(container.querySelector('.calendar-day-2024-01-07')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');

		clndr.setEvents([{date: '2024-01-12'}]);

		expect(container.querySelector('.calendar-day-2024-01-07')).not.toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-12')).toHaveClass('event');
	});

	test('Set all events with multi-day events being configured', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {
				date: 'date',
				startDate: 'startDate',
				endDate: 'endDate',
			},
			events: [{
				title: 'Multi',
				startDate: '2024-01-12',
				endDate: '2024-01-17',
			}],
		});

		expect(container.querySelector('.calendar-day-2024-01-15')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-03')).not.toHaveClass('event');

		clndr.setEvents([{date: '2024-01-03'}]);

		expect(container.querySelector('.calendar-day-2024-01-15')).not.toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-03')).toHaveClass('event');
	})

	test('Remove events', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			events: [
				{date: '2024-01-07'},
				{date: '2024-01-23'},
			],
		})

		expect(container.querySelector('.calendar-day-2024-01-07')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-23')).toHaveClass('event');

		clndr.removeEvents(event => event.date === '2024-01-23');

		expect(container.querySelector('.calendar-day-2024-01-07')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-23')).not.toHaveClass('event');
	});

});

describe('Custom interval', () => {

	test('pagination option', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			dateParameter: {
				startDate: 'startDate',
				endDate: 'endDate',
			},
			events: [{
				title: 'Event in previous month',
				startDate: '1992-09-24',
				endDate: '1992-09-27',
			}, {
				title: 'Event in this month',
				startDate: '1992-10-24',
				endDate: '1992-10-27',
			}, {
				title: 'Event in next month',
				startDate: '1992-11-24',
				endDate: '1992-11-27',
			}, {
				title: 'Event in next month interval',
				startDate: '1993-01-24',
				endDate: '1993-01-27',
			}],
			pagination: {scope: 'month', size: 3},
			startOn: new Date('1992-10'),
		});

		expect(container.querySelector('.calendar-day-1992-10-07')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-11-07')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-12-08')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1993-01-03')).not.toBeInTheDocument();
	});

	test('Custom month view interval with custom start date', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			pagination: {scope: 'month', size: 2},
			startOn: new Date('1992-10-15'),
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-11-15')).toBeInTheDocument();
	});

	test('Custom month view interval with custom start month', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			pagination: {scope: 'month', size: 2},
			startOn: new Date('1992-10'),
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-11-15')).toBeInTheDocument();
	});

	test('Custom day view interval', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			events: [{date: '1992-10-15'}],
			pagination: {scope: 'day', size: 7},
			startOn: new Date('1992-10-15'),
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-10-15')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-1992-10-22')).not.toBeInTheDocument();
	});

});

describe('pagination.scope set to `year`', () => {
	const oneYearTemplate = `
		<div class="clndr-controls">
			<div class="clndr-previous-button" role="button">previous</div>
			<div class="year"><%= year.getFullYear() %></div>
			<div class="clndr-next-button" role="button">next</div>
		</div>
		<div class="clndr-grid">
			<% items.forEach(month => { %>
				<div class="<%= month.classes %>" role="button"><%= format(month.date, 'MMMM') %></div>
			<% }); %>
		</div>
		<div class="clndr-today-button" role="button">Current year</div>
	`;

	const multiYearTemplate = `
		<div class="clndr-controls">
			<div class="clndr-previous-button" role="button">previous</div>
			<div class="clndr-next-button" role="button">next</div>
		</div>
		<div class="clndr-years">
			<% years.forEach((year, yearIndex) => { %>
				<div class="clndr-year">
					<div class="clndr-year-title"><%= year.getFullYear() %></div>
					<div class="clndr-grid">
						<% items[yearIndex].forEach(month => { %>
							<div class="<%= month.classes %>" role="button"><%= format(month.date, 'MMMM') %></div>
						<% }); %>
					</div>
				</div>
			<% }) %>
		</div>
		<div class="clndr-today-button" role="button">Current year</div>
	`;

	test('Rendering plain calendar', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			pagination: {scope: 'year', size: 1},
		});

		expect(screen.getByText('2024')).toBeInTheDocument();
		expect(screen.getByText('January')).toBeInTheDocument();
		expect(screen.getByText('February')).toBeInTheDocument();
		expect(screen.getByText('March')).toBeInTheDocument();
		expect(screen.getByText('April')).toBeInTheDocument();
		expect(screen.getByText('May')).toBeInTheDocument();
		expect(screen.getByText('June')).toBeInTheDocument();
		expect(screen.getByText('July')).toBeInTheDocument();
		expect(screen.getByText('August')).toBeInTheDocument();
		expect(screen.getByText('September')).toBeInTheDocument();
		expect(screen.getByText('October')).toBeInTheDocument();
		expect(screen.getByText('November')).toBeInTheDocument();
		expect(screen.getByText('December')).toBeInTheDocument();
		expect(container.querySelector('.calendar-month-2024-01')).toBeInTheDocument();
		expect(container.querySelector('.calendar-month-2024-02')).toBeInTheDocument();
		expect(container.querySelector('.calendar-month-2024-03')).toBeInTheDocument();
		expect(container.querySelector('.calendar-month-2024-04')).toBeInTheDocument();
		expect(container.querySelector('.calendar-month-2024-05')).toBeInTheDocument();
		expect(container.querySelector('.calendar-month-2024-06')).toBeInTheDocument();
		expect(container.querySelector('.calendar-month-2024-07')).toBeInTheDocument();
		expect(container.querySelector('.calendar-month-2024-08')).toBeInTheDocument();
		expect(container.querySelector('.calendar-month-2024-09')).toBeInTheDocument();
		expect(container.querySelector('.calendar-month-2024-10')).toBeInTheDocument();
		expect(container.querySelector('.calendar-month-2024-11')).toBeInTheDocument();
		expect(container.querySelector('.calendar-month-2024-12')).toBeInTheDocument();
	});

	test('Programmatic navigation', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			pagination: {scope: 'year', size: 1},
		});

		expect(screen.getByText('2024')).toBeInTheDocument();
		clndr.setMonth(4);
		// setMonth does of course not change the year, but need to check if the behaviour is indeed as
		// expected when calling setMonth.
		expect(screen.getByText('2024')).toBeInTheDocument();

		clndr.setIntervalStart(new Date('1992-10-15'));
		expect(screen.getByText('1992')).toBeInTheDocument();
	});

	test('Start and end constraints', async () => {
		const handleIntervalChange = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			clickEvents: {
				onIntervalChange: handleIntervalChange,
			},
			constraints: {
				startDate: new Date('1991'),
				endDate: new Date('1994'),
			},
			pagination: {scope: 'year', size: 1},
			startOn: new Date('1992-10-15'),
		});

		await user.click(screen.getByText('previous'));
		expect(screen.getByText('1991')).toBeInTheDocument();
		expect(handleIntervalChange).toHaveBeenCalledTimes(1);
		await user.click(screen.getByText('previous'));
		expect(screen.getByText('1991')).toBeInTheDocument();
		expect(handleIntervalChange).toHaveBeenCalledTimes(1);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('1992')).toBeInTheDocument();
		expect(handleIntervalChange).toHaveBeenCalledTimes(2);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('1993')).toBeInTheDocument();
		expect(handleIntervalChange).toHaveBeenCalledTimes(3);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('1994')).toBeInTheDocument();
		expect(handleIntervalChange).toHaveBeenCalledTimes(4);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('1994')).toBeInTheDocument();
		expect(handleIntervalChange).toHaveBeenCalledTimes(4);
	});

	test('Start date before start constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			constraints: {
				startDate: new Date('1993'),
			},
			pagination: {scope: 'year', size: 1},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('1993')).toBeInTheDocument();
	});

	test('End date before start constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			constraints: {
				startDate: new Date('1993'),
			},
			pagination: {scope: 'year', size: 1},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('1993')).toBeInTheDocument();
	});

	test('Start date after end constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			constraints: {
				endDate: new Date('1991'),
			},
			pagination: {scope: 'year', size: 1},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('1991')).toBeInTheDocument();
	});

	test('End date date after end constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			constraints: {
				endDate: new Date('1991'),
			},
			pagination: {scope: 'year', size: 1},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('1991')).toBeInTheDocument();
	});

	test('Click event handlers', async () => {
		const handleClick = jest.fn(target => {
			expect(target.date.getMonth()).toBe(6);
		});
		const handleIntervalChange = jest.fn();
		const handlePreviousInterval = jest.fn();
		const handleNextInterval = jest.fn();
		const handleMonthChange = jest.fn();
		const handlePreviousMonth = jest.fn();
		const handleNextMonth = jest.fn();
		const handleYearChange = jest.fn();
		const handlePreviousYear = jest.fn();
		const handleNextYear = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			clickEvents: {
				click: handleClick,
				onIntervalChange: handleIntervalChange,
				previousInterval: handlePreviousInterval,
				nextInterval: handleNextInterval,
				onMonthChange: handleMonthChange,
				previousMonth: handlePreviousMonth,
				nextMonth: handleNextMonth,
				onYearChange: handleYearChange,
				previousYear: handlePreviousYear,
				nextYear: handleNextYear,
			},
			pagination: {scope: 'year', size: 1},
			startOn: new Date('1992-10-15'),
		});

		await user.click(screen.getByText('next'));
		await user.click(screen.getByText('previous'));

		expect(handleIntervalChange).toHaveBeenCalledTimes(2);
		expect(handlePreviousInterval).toHaveBeenCalledTimes(1);
		expect(handleNextInterval).toHaveBeenCalledTimes(1);
		expect(handleMonthChange).toHaveBeenCalledTimes(2);
		expect(handlePreviousMonth).toHaveBeenCalledTimes(0);
		expect(handleNextMonth).toHaveBeenCalledTimes(0);
		expect(handleYearChange).toHaveBeenCalledTimes(2);
		expect(handlePreviousYear).toHaveBeenCalledTimes(1);
		expect(handleNextYear).toHaveBeenCalledTimes(1);

		await user.click(screen.getByText('July'));

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	test('Events', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			events: [
				{date: '1991-10-15', title: 'event out of range'},
				{date: '1992-10-15', title: 'event on current page'},
				{date: '1993-10-15', title: 'event out of range'},
			],
			pagination: {scope: 'year', size: 1},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('September').classList.contains('event')).toBeFalsy();
		expect(screen.getByText('October').classList.contains('event')).toBeTruthy();
		expect(screen.getByText('November').classList.contains('event')).toBeFalsy();
	});

	test('Multiple years on one page', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiYearTemplate),
			pagination: {scope: 'year', size: 2},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('1992')).toBeInTheDocument();
		expect(screen.getByText('1993')).toBeInTheDocument();
	});

	test('Click on a month while the identifier class is unexpectedly not assigned', async() => {
		const handleClick = jest.fn(data => {
			expect(data.date).toBeNull();
		});

		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			clickEvents: {
				click: handleClick,
			},
			pagination: {scope: 'year', size: 1},
			trackSelectedDate: true,
		});

		const monthElement = screen.getByText('October');
		expect(monthElement instanceof Element).toBeTruthy();
		(monthElement as Element).classList.remove('calendar-month-2024-10');
		await user.click(monthElement as Element);

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

});

describe('Events passed to the template', () => {
	test('Events of previous, next and current page, a page being one month', () => {
		clndr = new Clndr(container, {
			render: provideRender(`
				<div>
					<% events.previousScope.forEach(event => { %>
						<%= event.title %>
					<% }) %>
				</div>
				<div>
					<% events.currentPage.forEach(event => { %>
						<%= event.title %>
					<% }) %>
				</div>
				<div>
					<% events.nextScope.forEach(event => { %>
						<%= event.title %>
					<% }) %>
				</div>
			`),
			events: [
				{date: '1992-08-15', title: 'event out of range'},
				{date: '1992-09-15', title: 'event on previous page'},
				{date: '1992-10-15', title: 'event on current page'},
				{date: '1992-11-15', title: 'event on next page'},
				{date: '1992-12-15', title: 'event out of range'},
			],
			startOn: new Date('1992-10'),
		});

		expect(screen.queryByText('event out of range')).toBeNull();
		expect(screen.getByText('event on previous page')).toBeInTheDocument();
		expect(screen.getByText('event on current page')).toBeInTheDocument();
		expect(screen.getByText('event on next page')).toBeInTheDocument();
	});

	test('Events of previous, next and current page, a page being multiple months', () => {
		clndr = new Clndr(container, {
			render: provideRender(`
				<div>
					<% events.previousScope.forEach(event => { %>
						<div><%= event.title %></div>
					<% }) %>
					<% events.currentPage.forEach(monthEvents => { %>
						<div>
							<% monthEvents.forEach(event => { %>
								<div><%= event.title %></div>
							<% }) %>
						</div>
					<% }) %>
					<% events.nextScope.forEach(event => { %>
						<div><%= event.title %></div>
					<% }) %>
				</div>
			`),
			events: [
				{date: '1992-07-15', title: 'event out of range'},
				{date: '1992-08-15', title: 'first event on previous page'},
				{date: '1992-09-15', title: 'second event on previous page'},
				{date: '1992-10-15', title: 'first event on current page'},
				{date: '1992-11-15', title: 'second event on current page'},
				{date: '1992-12-15', title: 'first event on next page'},
				{date: '1993-01-15', title: 'second event on next page'},
				{date: '1993-02-15', title: 'event out of range'},
			],
			pagination: {scope: 'month', size: 2},
			startOn: new Date('1992-10'),
		});

		expect(screen.queryByText('event out of range')).toBeNull();
		expect(screen.queryByText('first event on previous page')).toBeNull();
		expect(screen.getByText('second event on previous page')).toBeInTheDocument();
		expect(screen.getByText('first event on current page')).toBeInTheDocument();
		expect(screen.getByText('second event on current page')).toBeInTheDocument();
		expect(screen.getByText('first event on next page')).toBeInTheDocument();
		expect(screen.queryByText('second event on next page')).toBeNull();
	});

	test('Events with page being multiple days', () => {
		clndr = new Clndr(container, {
			render: provideRender(`
				<div>
					<% events.previousScope.forEach(event => { %>
						<%= event.title %>
					<% }) %>
				</div>
				<div>
					<% events.currentPage.forEach(event => { %>
						<%= event.title %>
					<% }) %>
				</div>
				<div>
					<% events.nextScope.forEach(event => { %>
						<%= event.title %>
					<% }) %>
				</div>
			`),
			events: [
				{date: '1992-10-12', title: 'event out of range'},
				{date: '1992-10-15', title: 'event on current page'},
				{date: '1992-12-21', title: 'event out of range'},
			],
			pagination: {scope: 'day', size: 7},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.queryByText('event out of range')).toBeNull();
		expect(screen.getByText('event on current page')).toBeInTheDocument();
	});

});

describe('Constraints', () => {

	test('Start and end date constraints in the past', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			constraints: {
				endDate: new Date('1992-11-15'),
				startDate: new Date('1992-10-15'),
			},
		});

		expect(container.querySelector('.calendar-day-1992-11-15')).toBeInTheDocument();
		await user.click(screen.getByText('next'));
		expect(container.querySelector('.calendar-day-1992-11-15')).toBeInTheDocument();
		await user.click(screen.getByText('previous'));
		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		await user.click(screen.getByText('previous'));
		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		await user.click(screen.getByText('next'));
		expect(container.querySelector('.calendar-day-1992-11-15')).toBeInTheDocument();
	});

	test('Start and end date constraints in the future', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			constraints: {
				endDate: new Date('2100-01-06'),
				startDate: new Date('2100-01-01'),
			},
			pagination: {scope: 'day', size: 7, step: 7},
		});

		expect(container.querySelector('.calendar-day-2100-01-01')).toBeInTheDocument();
		await user.click(screen.getByText('‹'));
		expect(container.querySelector('.calendar-day-2100-01-01')).toBeInTheDocument();
		await user.click(screen.getByText('›'));
		expect(container.querySelector('.calendar-day-2100-01-06')).toBeInTheDocument();
		await user.click(screen.getByText('›'));
		expect(container.querySelector('.calendar-day-2100-01-06')).toBeInTheDocument();
		await user.click(screen.getByText('‹'));
		expect(container.querySelector('.calendar-day-2100-01-01')).toBeInTheDocument();
	});

	test('Day starting interval is after the ending constraint', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {scope: 'day', size: 7, step: 7},
			constraints: {
				startDate: new Date('1992-09-01'),
				endDate: new Date('1992-09-15'),
			},
			startOn: new Date('1992-10-15'),
		});

		expect(container.querySelector('.calendar-day-1992-09-15')).toBeInTheDocument();
	});

	test('End date constraint is before start date constraint', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			pagination: {scope: 'month', size: 3, step: 7},
			constraints: {
				startDate: new Date('1993-11-30'),
				endDate: new Date('1992-11-15'),
			},
			startOn: new Date('1992-10-15'),
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).not.toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-11-15')).toBeInTheDocument();
	});

});

describe('Handling errors', () => {

	test('Not providing a render function', () => {

		// @ts-expect-error Intentionally provide no options
		expect(() => new Clndr(container)).toThrow();
	});

	test('Multi-day event with no date', () => {
		const mockWarn = jest.fn();
		jest.spyOn(console, 'warn').mockImplementation(mockWarn);

		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {
				date: undefined,
				startDate: 'startDate',
				endDate: 'endDate',
			},
			events: [{title: 'Multi'}],
		});

		expect(container.querySelectorAll('.event').length).toBe(0);
		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	test('Missing CSS classes to detect month change when not showing adjacent months', async() => {
		clndr = new Clndr(container, {
			render: provideRender(),
			adjacentDaysChangeMonth: true,
			showAdjacent: false,
			startOn: new Date('1992-09'),
		});

		const emptyElement = container.querySelector('.empty');
		expect(emptyElement).not.toBeNull();
		(emptyElement as Element).classList.remove('previous');
		await user.click(emptyElement as Element);
	});

	test('Click on a day while the day identifier class is unexpectedly not assigned', async() => {
		const handleClick = jest.fn(data => {
			expect(data.date).toBeNull();
		});

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				click: handleClick,
			},
			startOn: new Date('1992-10'),
			trackSelectedDate: true,
		});

		const dayElement = screen.getByText('15').parentNode;
		expect(dayElement instanceof Element).toBeTruthy();
		(dayElement as Element).classList.remove('calendar-day-1992-10-15');
		await user.click(dayElement as Element);

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	test('Specifying wrong dateParameter option', () => {
		const mockWarn = jest.fn();
		jest.spyOn(console, 'warn').mockImplementation(mockWarn);

		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: 'wrong',
			events: [{date: '2024-02-19'}],
		});

		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	test('Specifying multi-day events without dateParameter option', () => {
		const mockWarn = jest.fn();
		jest.spyOn(console, 'warn').mockImplementation(mockWarn);

		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: 'wrong',
			events: [{date: '2024-02-19'}],
		});

		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	test('Invalid date parameter on multi-day event', () => {
		const mockWarn = jest.fn();
		jest.spyOn(console, 'warn').mockImplementation(mockWarn);

		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {
				date: 'wrong',
				startDate: 'startDate',
				endDate: 'endDate',
			},
			events: [{
				title: 'Multi1',
				startDate: {year: 1992},
				endDate: '1992-10-17',
			}],
			startOn: new Date('1992-10'),
		});

		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	test('Invalid date parameter on single-day event when having set up multi-day event', () => {
		const mockWarn = jest.fn();
		jest.spyOn(console, 'warn').mockImplementation(mockWarn);

		clndr = new Clndr(container, {
			render: provideRender(),
			// @ts-expect-error Intentionally provide invalid dateParameter configuration
			dateParameter: {
				date: 'wrong',
			},
			events: [{singleDay: '1992-10-15'}],
			startOn: new Date('1992-10'),
		});

		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

});