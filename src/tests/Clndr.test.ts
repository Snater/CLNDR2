import '@testing-library/jest-dom';
import {endOfDay, startOfDay} from 'date-fns';
import {fireEvent, screen} from '@testing-library/dom';
import Clndr from '../Clndr';
import {de} from 'date-fns/locale';
import ejs from 'ejs';

describe('Setup', () => {

	test('Default setup', () => {
		clndr = new Clndr(container, {render: provideRender()});

		expect(container).not.toBeEmptyDOMElement();

		clndr.destroy();

		expect(container).toBeEmptyDOMElement();
	});

	test('Pass compiled template to render option', () => {
		const template = ejs.compile(defaultTemplate);
		clndr = new Clndr(container, {render: data => template(data)});

		expect(container).not.toBeEmptyDOMElement();
		expect(screen.getByText('January 2024')).toBeInTheDocument();

		clndr.destroy();

		expect(container).toBeEmptyDOMElement();
	});

	test('Basic single-day events', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			events: [
				{date: '2024-01-07'},
				{date: '2024-01-23'},
			],
		});

		expect(screen.getByText('6')).not.toHaveClass('event');
		expect(screen.getByText('7')).toHaveClass('event');
		expect(screen.getByText('23')).toHaveClass('event');
	});

	test('Basic multi-day events', () => {
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
				},
			],
		});

		expect(screen.getByText('12')).toHaveClass('event');
		expect(screen.getByText('17')).toHaveClass('event');
		expect(screen.getByText('14')).toHaveClass('event');
		expect(screen.getByText('25')).toHaveClass('event');
		expect(screen.getAllByText('2')[0]).not.toHaveClass('event');
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

	test('Selected date', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onClick: handleClick,
			},
			selectedDate: new Date('2024-01-18'),
			trackSelectedDate: true,
		});

		expect(container.querySelector('.calendar-day-2024-01-18')).toHaveClass('selected');

		await user.click(screen.getByText('16'));

		expect(container.querySelector('.calendar-day-2024-01-16')).toHaveClass('selected');
		expect(container.querySelector('.calendar-day-2024-01-18')).not.toHaveClass('selected');

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('2024-01-16'),
			events: [],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('16'),
		});
	});

	test('Custom days of the week naming', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			daysOfTheWeek: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'],
		});

		expect(screen.getByText('d7')).toBeInTheDocument();
	});

	test('Pass in locale', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onClick: jest.fn(),
			},
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
			trackSelectedDate: true,
		});

		expect(container.querySelector('.selected')).toBeNull();
		await user.click(screen.getByText('18'));
		expect(screen.getByText('18')).toHaveClass('selected');
		await user.click(screen.getByText('16'));
		expect(screen.getByText('18')).not.toHaveClass('selected');
		expect(screen.getByText('16')).toHaveClass('selected');
	});

	test('Custom single-day dateParameter', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {date: 'customDateParameter'},
			events: [{customDateParameter: '2024-01-18'}],
		});

		expect(screen.getByText(18)).toHaveClass('event');
	});

	test('Custom multi-day dateParameter', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			dateParameter: {start: 'customStart', end: 'customEnd'},
			events: [{customStart: '2024-01-18', customEnd: '2024-01-19'}],
		});

		expect(screen.getByText(17)).not.toHaveClass('event');
		expect(screen.getByText(18)).toHaveClass('event');
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

	test('Navigate by clicking on buttons switching the year', async () => {
		const multiNavigationTemplate = `
			<div class="clndr-previous-year-button">previous year</div>
			<div class="clndr-previous-button">previous</div>
			<div class="clndr-next-button">next</div>
			<div class="clndr-next-year-button">next year</div>
			<div><%= format(interval.start, 'MMMM yyyy') %></div>
		`;

		clndr = new Clndr(container, {
			render: provideRender(multiNavigationTemplate),
			clickEvents: {
				onClick: jest.fn(),
			},
			constraints: {
				start: new Date('2023-01'),
				end: new Date('2025-12'),
			},
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		await user.click(screen.getByText('next year'));
		expect(screen.getByText('January 2025')).toBeInTheDocument();
		await user.click(screen.getByText('next year'));
		expect(screen.getByText('January 2025')).toBeInTheDocument();
		await user.click(screen.getByText('previous year'));
		expect(screen.getByText('January 2024')).toBeInTheDocument();
		await user.click(screen.getByText('previous year'));
		expect(screen.getByText('January 2023')).toBeInTheDocument();
		await user.click(screen.getByText('previous year'));
		expect(screen.getByText('January 2023')).toBeInTheDocument();
	});

	test('Programmatically change month by calling previous()', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		clndr.previous();
		expect(screen.getByText('December 2023')).toBeInTheDocument();
	});

	test('Programmatically change year using previousYear()', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		clndr.previousYear();
		expect(screen.getByText('January 2023')).toBeInTheDocument();
	});

	test('Prevent navigating backward if constraint prohibits', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			constraints: {
				start: new Date('2024-01-18'),
			},
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		clndr.previous();
		expect(screen.getByText('January 2024')).toBeInTheDocument();
		clndr.previousYear();
		expect(screen.getByText('January 2024')).toBeInTheDocument();
	});

	test('Programmatically change year using nextYear()', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		clndr.nextYear();
		expect(screen.getByText('January 2025')).toBeInTheDocument();
	})

	test('Prevent navigating forward if constraint prohibits', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			constraints: {
				end: new Date('2024-01-18'),
			},
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		clndr.next();
		expect(screen.getByText('January 2024')).toBeInTheDocument();
		clndr.nextYear();
		expect(screen.getByText('January 2024')).toBeInTheDocument();
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
			element: screen.getByText('18'),
		});
	});

	test('Trigger going to today while already on today\'s page', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		clndr.today();
		expect(screen.getByText('January 2024')).toBeInTheDocument();
	});

	test('Click today button', async () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
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

	test('Programmatically set month', () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onNavigate: handleNavigate,
			},
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		clndr.setMonth(2);
		expect(screen.getByText('March 2024')).toBeInTheDocument();

		expect(handleNavigate).toHaveBeenCalledTimes(1);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('2024-03-01')), end: endOfDay(new Date('2024-03-31'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: false,
			element: undefined,
		});
	});

	test('Programmatically set year', () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onNavigate: handleNavigate,
			},
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		clndr.setYear(1992);
		expect(screen.getByText('January 1992')).toBeInTheDocument();

		expect(handleNavigate).toHaveBeenCalledTimes(1);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('1992-01-01')), end: endOfDay(new Date('1992-01-31'))},
			isBefore: true,
			isAfter: false,
			monthChanged: true,
			yearChanged: true,
			element: undefined,
		});
	});

	test('Programmatically set new interval', () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onNavigate: handleNavigate,
			},
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		clndr.setIntervalStart('2000-06-01');
		expect(screen.getByText('June 2000')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(1);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('2000-06-01')), end: endOfDay(new Date('2000-06-30'))},
			isBefore: true,
			isAfter: false,
			monthChanged: true,
			yearChanged: true,
			element: undefined,
		});
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
		});

		clndr.next();
		clndr.previous();

		expect(handleNavigate).toHaveBeenCalledTimes(2);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('2024-02-01')), end: endOfDay(new Date('2024-02-29'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: false,
			element: undefined,
		});

		expect(handleNavigate.mock.calls[1][0]).toEqual({
			interval: {start: startOfDay(new Date('2024-01-01')), end: endOfDay(new Date('2024-01-31'))},
			isBefore: true,
			isAfter: false,
			monthChanged: true,
			yearChanged: false,
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
				date: '2024-01-19',
			}],
		})

		await user.click(screen.getByText('19'));
		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('2024-01-19'),
			events: [{title: 'This is an event', date: '2024-01-19'}],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('19'),
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
				start: '2024-01-12',
				end: '2024-01-17',
			}],
		})

		await user.click(screen.getByText('16'));
		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('2024-01-16'),
			events: [{
				title: 'Multi-day event',
				start: '2024-01-12',
				end: '2024-01-17',
			}],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('16'),
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

describe('Multiple scopes', () => {

	const multiScopeTemplates = {
		day: provideRender(`
			<div class="day">Day <%= format(items[0].date, 'D', {useAdditionalDayOfYearTokens: true}) %> in <%= format(items[0].date, 'yyyy') %></div>
			<div class="clndr-switch-week-button">Switch to week view</div>
		`),
		week: provideRender(`
			<div class="week"><%= format(items[0].date, 'LL-dd') %> to <%= format(items[items.length -1].date, 'LL-dd') %></div>
			<div class="clndr-switch-month-button">Switch to month view</div>
		`),
		month: provideRender(`
			<div class="month"><%= format(interval.start, 'MMMM yyyy') %></div>
			<% items.forEach(day => { %>
					<div class="<%= day.classes %>"><%= format(day.date, 'd') %></div>
				<% }) %>
			<div class="clndr-switch-year-button">Switch to year view</div>
		`),
		year: provideRender(`
			<div class="months">
				<% items.forEach((month, monthIndex) => { %>
					<div class="<%= month.classes %>"><%= format(month.date, 'MMMM yyyy') %></div>
				<% }) %>
			</div>
			<div class="clndr-switch-decade-button">Switch to decade view</div>
		`),
		decade: provideRender(`
			<div class="years">
				<% items.forEach((year, yearIndex) => { %>
					<div class="<%= year.classes %>"><%= format(year.date, 'yyyy') %></div>
				<% }) %>
			</div>
		`),
	};

	test('Switching scope', async () => {
		clndr = new Clndr(container, {
			render: multiScopeTemplates,
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

	test('Tracking selected date across multiple views', async () => {
		clndr = new Clndr(container, {
			render: multiScopeTemplates,
			defaultView: 'decade',
			trackSelectedDate: true,
		});

		expect(clndr.getSelectedDate()).toBeUndefined();
		await user.click(screen.getByText('2024'));
		expect(clndr.getSelectedDate()).toBeUndefined();
		await user.click(screen.getByText('January 2024'));
		expect(clndr.getSelectedDate()).toBeUndefined();
		await user.click(screen.getByText('20'));
		expect(clndr.getSelectedDate()).not.toBeUndefined();
		expect(clndr.getSelectedDate()?.toISOString()).toBe(new Date('2024-01-20').toISOString());
	});

	test('Tracking selected date on non-day based view', async () => {
		clndr = new Clndr(container, {
			render: {
				year: multiScopeTemplates.year,
				decade: multiScopeTemplates.decade,
			},
			defaultView: 'decade',
			trackSelectedDate: true,
		});

		expect(clndr.getSelectedDate()).toBeUndefined();
		await user.click(screen.getByText('2024'));
		expect(clndr.getSelectedDate()).toBeUndefined();
		await user.click(screen.getByText('January 2024'));
		expect(clndr.getSelectedDate()).not.toBeUndefined();
		expect(clndr.getSelectedDate()?.toISOString()).toBe(new Date('2024-01').toISOString());
	});

	test('Reapply constraints', async () => {
		clndr = new Clndr(container, {
			render: {
				month: provideRender(`
					<div><%= format(interval.start, 'MMMM') %></div>
					<div>
						<% items.forEach(item => { %>
							<div class="<%= item.classes %>"><%= item.day %></div>
						<% }) %>
					</div>
					<div class="clndr-switch-year-button">Switch to year view</div>
				`),
				year: provideRender(`
					<div><%= format(interval.start, 'yyyy') %></div>
					<div>
						<% items.forEach((item, itemIndex) => { %>
							<div class="<%= item.classes %>"><%= format(item.date, 'MMMM yyyy') %></div>
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
					<div><%= format(interval.start, 'MMMM yyyy') %></div>
					<div class="clndr-switch-year-button">Switch to year view</div>
				`),
				year: undefined,
			},
		});

		await user.click(screen.getByText('Switch to year view'));

		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	test('Try to switch to invalid scope', async () => {
		clndr = new Clndr(container, {
			render: {
				month: provideRender(`
					<div><%= format(interval.start, 'MMMM yyyy') %></div>
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
			events: [{singleDay: '2024-01-18'}],
		});

		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

});