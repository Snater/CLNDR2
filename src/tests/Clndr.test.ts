import '@testing-library/jest-dom';
import {endOfDay, startOfDay} from 'date-fns';
import {fireEvent, screen} from '@testing-library/dom';
import Clndr from '../Clndr';
import {de} from 'date-fns/locale';
import ejs from 'ejs';

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
			<%= format(interval.start, 'MM/dd') %> - <%= format(interval.end, 'MM/dd') %>
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
			events: [
				{
					title: 'Multi1',
					start: '1992-10-12',
					end: '1992-10-17',
				}, {
					title: 'Multi2',
					start: '1992-10-24',
					end: '1992-10-27',
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
			events: [
				{
					title: 'Multi1',
					start: '2024-01-17',
				}, {
					title: 'Multi2',
					end: '2024-01-12',
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
			events: [
				{
					title: 'Multi1',
					start: '2024-01-12',
					end: '2024-01-17',
				}, {
					title: 'Multi2',
					start: '2024-01-24',
					end: '2024-01-27',
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

	test('Selected date', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onClick: handleClick,
			},
			selectedDate: new Date('1992-10-15'),
			startOn: new Date('1992-10'),
			trackSelectedDate: true,
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toHaveClass('selected');

		await user.click(screen.getByText('1'));

		expect(container.querySelector('.calendar-day-1992-10-01')).toHaveClass('selected');

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('1992-10-01'),
			events: [],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('1').parentNode,
		})
	});

	test('Custom day interval while providing start month', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {day: {size: 7}},
			startOn: new Date('1992-10'),
		});

		expect(container.querySelector('.calendar-day-1992-10-01')).toBeInTheDocument();
	});

	test('Day interval not being dividable by 7', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {day: {size: 6}},
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
				onClick: jest.fn(),
			},
			pagination: {month: {size: 3}},
			locale: de,
		});

		expect(screen.getByText('Januar 2024')).toBeInTheDocument();
	});

	test('Use touch events', () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			useTouchEvents: true,
		});

		fireEvent.touchStart(screen.getByText('next'));
		expect(handleNavigate).toHaveBeenCalledTimes(1);
	});

	test('Track selected date while inactive days should be ignored in selection', async () => {
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

	test('Track selected date while inactive days should be ignored in selection and adjacent month\'s days change the month', async () => {
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

	test('Define just a date after the current date', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			events: [{date: '1992-10-15'}],
			startOn: new Date('1992-09'),
		});

		await user.click(screen.getByText('next'));
		expect(screen.getByText('15').parentNode).toHaveClass('event');
	});

	test('Custom single-day dateParameter', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {date: 'customDateParameter'},
			events: [{customDateParameter: '1992-10-15'}],
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText(15).parentNode).toHaveClass('event');
	});

	test('Custom multi-day dateParameter', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {start: 'customStart', end: 'customEnd'},
			events: [{customStart: '2024-01-18', customEnd: '2024-01-19'}],
		});

		expect(screen.getByText(17).parentNode).not.toHaveClass('event');
		expect(screen.getByText(18).parentNode).toHaveClass('event');
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
				onClick: jest.fn(),
			},
			startOn: new Date('1992-10'),
			pagination: {month: {size: 3}},
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		await user.click(screen.getByText('»'));
		expect(screen.getByText('October 1993')).toBeInTheDocument();
	});

	test('Click button switching to previous year', async () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			clickEvents: {
				onClick: jest.fn(),
			},
			startOn: new Date('1992-10'),
			pagination: {month: {size: 3}},
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
			pagination: {month: {size: 2}},
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
			pagination: {month: {size: 2, step: 1}},
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

	test('Programmatically change day scope by calling forward() and back() with custom day page size', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {day: {size: 7}},
			startOn: new Date('1992-09'),
		});

		expect(screen.getByText('09/01 - 09/07')).toBeInTheDocument();
		clndr.forward();
		expect(screen.getByText('09/08 - 09/14')).toBeInTheDocument();
		clndr.back();
		expect(screen.getByText('09/01 - 09/07')).toBeInTheDocument();
	});

	test('Programmatically change day scope by calling forward() and back() with custom day pagination, including step', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {day: {size: 7, step: 1}},
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
				start: new Date('1992-10-15'),
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
				end: new Date('1992-10-15'),
			},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.next();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.nextYear();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Click on today', async () => {
		const handleClick = jest.fn();
		const handleNavigate = jest.fn();
		const handleToday = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onClick: handleClick,
				onNavigate: handleNavigate,
			},
			trackSelectedDate: true,
		});

		await user.click(screen.getByText('18'));

		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(handleNavigate).toHaveBeenCalledTimes(0);
		expect(handleToday).toHaveBeenCalledTimes(0);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('2024-01-18'),
			events: [],
			selectedDateChanged: true,
			isToday: true,
			element: screen.getByText('18').parentNode,
		});
	});

	test('Programmatically trigger today() with callbacks', () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			startOn: new Date('1992-10'),
		});

		clndr.today({withCallbacks: true});

		expect(handleNavigate).toHaveBeenCalledTimes(1);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('2024-01-01')), end: endOfDay(new Date('2024-01-31'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: true,
			element: undefined,
		});
	});

	test('Go to today while having a custom interval with a start date being set', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {day: {size: 7}},
			startOn: new Date('1992-10-15'),
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();

		clndr.today();

		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
	});

	test('Go to today while having a custom interval', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {day: {size: 7}},
		});

		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
		clndr.today();
		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
	});

	test('Click today button', async () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(simpleTemplate),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			startOn: new Date('1992-10'),
		});

		await user.click(screen.getByText('Today'));

		expect(handleNavigate).toHaveBeenCalledTimes(1);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('2024-01-01')), end: endOfDay(new Date('2024-01-31'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: true,
			element: screen.getByText('Today'),
		});
	})

	test('Programmatically set month with callbacks', () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setMonth(0, {withCallbacks: true});
		expect(screen.getByText('January 1992')).toBeInTheDocument();

		expect(handleNavigate).toHaveBeenCalledTimes(1);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('1992-01-01')), end: endOfDay(new Date('1992-01-31'))},
			isBefore: true,
			isAfter: false,
			monthChanged: true,
			yearChanged: false,
			element: undefined,
		});
	});

	test('Programmatically set month with empty options', () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setMonth(0, {});
		expect(screen.getByText('January 1992')).toBeInTheDocument();

		expect(handleNavigate).toHaveBeenCalledTimes(0);
	});

	test('Programmatically set month while having configured a custom month interval', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			pagination: {month: {size: 2}},
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
			pagination: {day: {size: 7}},
			startOn: new Date('1992-10-01'),
		});

		expect(screen.getByText('10/01 - 10/07')).toBeInTheDocument();
		clndr.setMonth(4);
		expect(screen.getByText('05/01 - 05/07')).toBeInTheDocument();
	});

	test('Programmatically set year with callbacks', () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setYear(1991, {withCallbacks: true});
		expect(screen.getByText('October 1991')).toBeInTheDocument();

		expect(handleNavigate).toHaveBeenCalledTimes(1);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('1991-10-01')), end: endOfDay(new Date('1991-10-31'))},
			isBefore: true,
			isAfter: false,
			monthChanged: true,
			yearChanged: true,
			element: undefined,
		});
	});

	test('Programmatically set year on day scope with callbacks', () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			pagination: {day: {size: 7}},
		});

		expect(screen.getByText('01/18 - 01/24')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
		clndr.setYear(1992, {withCallbacks: true});
		expect(screen.getByText('01/18 - 01/24')).toBeInTheDocument();

		expect(handleNavigate).toHaveBeenCalledTimes(1);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('1992-01-18')), end: endOfDay(new Date('1992-01-24'))},
			isBefore: true,
			isAfter: false,
			monthChanged: true,
			yearChanged: true,
			element: undefined,
		});
	});

	test('Programmatically set year with empty options', () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setYear(1991);
		expect(screen.getByText('October 1991')).toBeInTheDocument();

		expect(handleNavigate).toHaveBeenCalledTimes(0);
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
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			pagination: {month: {size: 3}},
			startOn: new Date('1992-10'),
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setIntervalStart('2000-06-01', {withCallbacks: true});
		expect(screen.getByText('June 2000')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(1);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('2000-06-01')), end: endOfDay(new Date('2000-08-31'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: true,
			element: undefined,
		});
	});

	test('Programmatically set new interval with having a custom day interval configured', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {day: {size: 7}},
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
			clickEvents: {onClick: handleClick},
			startOn: new Date('1992-10'),
		});

		await user.click(screen.getByText('15'));

		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('1992-10-15'),
			events: [],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('15').parentNode,
		});
	});

	test('Trigger onNavigate callbacks', () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onNavigate: function(params) {
					expect(this).toBeInstanceOf(Clndr);
					handleNavigate(params);
				},
			},
			startOn: new Date('1992-12'),
		});

		clndr.next({withCallbacks: true});
		clndr.back({withCallbacks: true});

		expect(handleNavigate).toHaveBeenCalledTimes(2);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('1993-01-01')), end: endOfDay(new Date('1993-01-31'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: true,
			element: undefined,
		});

		expect(handleNavigate.mock.calls[1][0]).toEqual({
			interval: {start: startOfDay(new Date('1992-12-01')), end: endOfDay(new Date('1992-12-31'))},
			isBefore: true,
			isAfter: false,
			monthChanged: true,
			yearChanged: true,
			element: undefined,
		});
	});

	test('Click on a day with an event', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onClick: handleClick,
			},
			events: [{
				title: 'This is an event',
				date: '1992-10-15',
			}],
			startOn: new Date('1992-10'),
		})

		await user.click(screen.getByText('15'));
		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('1992-10-15'),
			events: [{title: 'This is an event', date: '1992-10-15'}],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('15').parentNode,
		});
	});

	test('Click on a day of a multi-day event', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onClick: handleClick,
			},
			events: [{
				title: 'Multi-day event',
				start: '1992-10-12',
				end: '1992-10-17',
			}],
			startOn: new Date('1992-10'),
		})

		await user.click(screen.getByText('15'));
		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('1992-10-15'),
			events: [{
				title: 'Multi-day event',
				start: '1992-10-12',
				end: '1992-10-17',
			}],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('15').parentNode,
		});
	});

	test('Click on empty calendar box', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			showAdjacent: false,
			clickEvents: {
				onClick: handleClick,
			},
		});

		const emptyElement = container.querySelector('.empty');
		expect(emptyElement).not.toBeNull();
		await user.click(emptyElement as Element);
		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: undefined,
			events: [],
			selectedDateChanged: false,
			isToday: false,
			element: emptyElement,
		});
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
			events: [{
				title: 'Multi',
				start: '2024-01-12',
				end: '2024-01-17',
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
			events: [{
				title: 'Event in previous month',
				start: '1992-09-24',
				end: '1992-09-27',
			}, {
				title: 'Event in this month',
				start: '1992-10-24',
				end: '1992-10-27',
			}, {
				title: 'Event in next month',
				start: '1992-11-24',
				end: '1992-11-27',
			}, {
				title: 'Event in next month interval',
				start: '1993-01-24',
				end: '1993-01-27',
			}],
			pagination: {month: {size: 3}},
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
			pagination: {month: {size: 2}},
			startOn: new Date('1992-10-15'),
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-11-15')).toBeInTheDocument();
	});

	test('Custom month view interval with custom start month', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			pagination: {month: {size: 2}},
			startOn: new Date('1992-10'),
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-11-15')).toBeInTheDocument();
	});

	test('Custom day view interval', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			events: [{date: '1992-10-15'}],
			pagination: {day: {size: 7}},
			startOn: new Date('1992-10-15'),
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-10-15')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-1992-10-22')).not.toBeInTheDocument();
	});

});

describe('Multiple scopes', () => {

	test('Switching scope', async () => {
		clndr = new Clndr(container, {
			render: {
				day: provideRender(`
					<div class="day">Day <%= format(items[0].date, 'D', {useAdditionalDayOfYearTokens: true}) %> in <%= format(items[0].date, 'yyyy') %></div>
					<div class="clndr-switch-week-button" role="button">Switch to week view</div>
				`),
				week: provideRender(`
					<div class="week"><%= format(items[0].date, 'LL-dd') %> to <%= format(items[items.length -1].date, 'LL-dd') %></div>
					<div class="clndr-switch-month-button" role="button">Switch to month view</div>
				`),
				month: provideRender(`
					<div class="month"><%= format(month, 'MMMM yyyy') %></div>
					<div class="clndr-switch-year-button" role="button">Switch to year view</div>
				`),
				year: provideRender(`
					<div class="months">
						<% items.forEach((month, monthIndex) => { %>
							<div class="<%= month.classes %>"><%= format(months[monthIndex], 'MMMM yyyy') %></div>
						<% }) %>
					</div>
					<div class="clndr-switch-decade-button" role="button">Switch to decade view</div>
				`),
				decade: provideRender(`
					<div class="years">
						<% items.forEach((year, yearIndex) => { %>
							<div class="<%= year.classes %>"><%= format(years[yearIndex], 'yyyy') %></div>
						<% }) %>
					</div>
				`),
			},
			defaultView: 'day',
		});

		expect(screen.getByText('Day 18 in 2024')).toBeInTheDocument();
		await user.click(screen.getByText('Switch to week view'));

		expect(screen.getByText('01-14 to 01-20')).toBeInTheDocument();
		await user.click(screen.getByText('Switch to month view'));

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		expect(container.querySelector('.month')?.childNodes.length).toBe(1);

		await user.click(screen.getByText('Switch to year view'));
		expect(container.querySelectorAll('.months > div')?.length).toBe(12);

		await user.click(screen.getByText('Switch to decade view'));
		expect(container.querySelectorAll('.years > div')?.length).toBe(10);

		await user.click(screen.getByText('2024'));

		await user.click(screen.getByText('March 2024'));

		expect(screen.getByText('March 2024')).toBeInTheDocument();
	});

	test('Reapply constraints', async () => {
		clndr = new Clndr(container, {
			render: {
				month: provideRender(`
					<div><%= format(month, 'MMMM') %></div>
					<div>
						<% items.forEach(item => { %>
							<div class="<%= item.classes %>"><%= item.day %></div>
						<% }) %>
					</div>
					<div class="clndr-switch-year-button" role="button">Switch to year view</div>
				`),
				year: provideRender(`
					<div><%= format(month, 'yyyy') %></div>
					<div class="months">
						<% items.forEach((month, monthIndex) => { %>
							<div class="<%= month.classes %>"><%= format(months[monthIndex], 'MMMM yyyy') %></div>
						<% }) %>
					</div>
				`),
			},
			constraints: {
				start: new Date('2024-01-18'),
				end: new Date('2024-02-18'),
			},
		});

		expect(screen.getByText('January')).toBeInTheDocument();

		await user.click(screen.getByText('Switch to year view'));

		await user.click(screen.getByText('March 2024'));
		expect(screen.getByText('2024')).toBeInTheDocument();

		await user.click(screen.getByText('February 2024'));
		expect(screen.getByText('February')).toBeInTheDocument();
	});

	test('Missing render function for scope', async () => {
		const mockWarn = jest.fn();
		jest.spyOn(console, 'warn').mockImplementation(mockWarn);

		clndr = new Clndr(container, {
			render: {
				month: provideRender(`
					<div class="month"><%= format(month, 'MMMM yyyy') %></div>
					<div class="clndr-switch-year-button" role="button">Switch to year view</div>
				`),
				year: undefined,
			},
			constraints: {
				start: new Date('2024-01-18'),
				end: new Date('2024-02-18'),
			},
		});

		await user.click(screen.getByText('Switch to year view'));

		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	test('Try to switch to invalid scope', async () => {
		clndr = new Clndr(container, {
			render: {
				month: provideRender(`
					<div class="month"><%= format(month, 'MMMM yyyy') %></div>
					<div>
						<% items.forEach(item => { %>
							<div class="switch <%= item.classes %>"><%= item.day %></div>
						<% }) %>
					</div>
				`),
				year: undefined,
			},
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();

		await user.click(screen.getByText('18'));

		expect(screen.getByText('January 2024')).toBeInTheDocument();
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
			pagination: {month: {size: 2}},
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
			pagination: {day: {size: 7}},
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
				start: new Date('1992-10-15'),
				end: new Date('1992-11-15'),
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
				start: new Date('2100-01-01'),
				end: new Date('2100-01-06'),
			},
			pagination: {day: {size: 7, step: 7}},
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
			constraints: {
				start: new Date('1992-09-01'),
				end: new Date('1992-09-15'),
			},
			pagination: {day: {size: 7, step: 7}},
			startOn: new Date('1992-10-15'),
		});

		expect(container.querySelector('.calendar-day-1992-09-15')).toBeInTheDocument();
	});

	test('End date constraint is before start date constraint', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			pagination: {month: {size: 3, step: 7}},
			constraints: {
				start: new Date('1993-11-30'),
				end: new Date('1992-11-15'),
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
				start: 'start',
				end: 'end',
			},
			events: [{title: 'Multi'}],
		});

		expect(container.querySelectorAll('.event').length).toBe(0);
		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	test('Missing CSS classes to detect month change when not showing adjacent months', async () => {
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

	test('Click on a day while the day identifier class is unexpectedly not assigned', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onClick: handleClick,
			},
			startOn: new Date('1992-10'),
			trackSelectedDate: true,
		});

		const dayElement = screen.getByText('15').parentNode;
		expect(dayElement instanceof Element).toBeTruthy();
		(dayElement as Element).classList.remove('calendar-day-1992-10-15');
		await user.click(dayElement as Element);

		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: undefined,
			events: [],
			selectedDateChanged: false,
			isToday: false,
			element: dayElement,
		});
	});

	test('Invalid start date parameter on multi-day event', () => {
		const mockWarn = jest.fn();
		jest.spyOn(console, 'warn').mockImplementation(mockWarn);

		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {
				start: 'start',
				end: 'end',
			},
			events: [{
				title: 'Multi1',
				start: {year: 1992},
				end: '1992-10-17',
			}],
			startOn: new Date('1992-10'),
		});

		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	test('Invalid end date parameter on multi-day event', () => {
		const mockWarn = jest.fn();
		jest.spyOn(console, 'warn').mockImplementation(mockWarn);

		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {
				start: 'start',
				end: 'end',
			},
			events: [{
				title: 'Multi1',
				start: new Date('1991'),
				end: {year: 1992},
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
			dateParameter: {
				date: 'wrong',
			},
			events: [{singleDay: '1992-10-15'}],
			startOn: new Date('1992-10'),
		});

		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

});