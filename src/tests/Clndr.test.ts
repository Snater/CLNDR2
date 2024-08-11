import '@testing-library/jest-dom';
import {endOfDay, format as formatFn, startOfDay} from 'date-fns';
import {fireEvent, screen} from '@testing-library/dom';
import Clndr from '../Clndr';
import Handlebars from 'handlebars';
import Mustache from 'mustache';
import {de} from 'date-fns/locale';
import ejs from 'ejs';
import pug from 'pug';
import type {ClndrTemplateData} from '../';

describe('Setup', () => {

	test('Default setup', () => {
		clndr = new Clndr(container, {render: provideRender()});

		expect(container).not.toBeEmptyDOMElement();
	});

	test('Pass compiled EJS template to render option', () => {
		const template = ejs.compile(defaultTemplate);
		clndr = new Clndr(container, {render: template});

		expect(container).not.toBeEmptyDOMElement();
		expect(screen.getByText('January 2024')).toBeInTheDocument();
	});

	test('Pass compiled Handlebars template to render option', () => {
		Handlebars.registerHelper(
			'formatHelper',
			(format: typeof formatFn, formatString: string, date?: Date) => {
				return date ? format(date, formatString) : '';
			}
		);

		const handlebarsTemplate = `
			<div>
				<div class="clndr-previous-button">previous</div>
				<div>{{formatHelper format 'MM/dd' interval.start}} - {{formatHelper format 'MM/dd' interval.end}}</div>
				<div>{{formatHelper format 'MMMM yyyy' interval.start}}</div>
				<div class="clndr-next-button">next</div>
			</div>
			<div>
				{{~#each daysOfTheWeek~}}
					<div class="header-day">{{this}}</div>
				{{~/each~}}
			</div>
			<div>
				{{~#each items~}}
					<div class="{{this.classes}}">{{formatHelper ../format 'd' this.date}}</div>
				{{~/each~}}
			</div>
			<div class="clndr-today-button">Today</div>`;

		clndr = new Clndr(container, {render: Handlebars.compile(handlebarsTemplate)});

		expect(container).not.toBeEmptyDOMElement();
		expect(screen.getByText('January 2024')).toBeInTheDocument();
	});

	test('date-fns format proxy', () => {
		clndr = new Clndr(container, {
			render: vars => vars.format(vars.date, 'MMMM yyyy'),
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
	});

	test('Pass compiled Mustache template to render option', () => {
		const mustacheTemplate = `
			<div>
				<div class="clndr-previous-button">previous</div>
				<div>{{heading1}}</div>
				<div>{{heading2}}</div>
				<div class="clndr-next-button">next</div>
			</div>
			<div>
				{{#daysOfTheWeek}}
					<div class="header-day">{{.}}</div>
				{{/daysOfTheWeek}}
			</div>
			<div>
				{{#items}}
					<div class="{{this.classes}}">{{day}}</div>
				{{/items}}
			</div>
			<div class="clndr-today-button">Today</div>`;

		clndr = new Clndr(container, {
			render: (
				vars: ClndrTemplateData & {
					day?: () => string,
					heading1?: string,
					heading2?: string
				}
			) => {
				const format = vars.format;
				vars.heading1 = `${format(vars.interval.start, 'MM/dd')} - ${format(vars.interval.end, 'MM/dd')}`;
				vars.heading2 = format(vars.interval.start, 'MMMM yyyy');
				vars.day = function() {
					return this.date?.getDate().toString() || '';
				}

				return Mustache.render(mustacheTemplate, vars);
			},
		});

		expect(container).not.toBeEmptyDOMElement();
		expect(screen.getByText('January 2024')).toBeInTheDocument();
	});

	test('Pass compiled Pug template to render option', () => {
		const pugTemplate = `
div
	div(class='clndr-previous-button') previous
	div= format(interval.start, 'MM/dd') + ' - ' + format(interval.end, 'MM/dd') 
	div= format(interval.start, 'MMMM yyyy')
	div(class='clndr-next-button') next
div
	each dayOfTheWeek in daysOfTheWeek
		div(class='header-day')= dayOfTheWeek
div
	each day in items
		div(class=day.classes)= day.date ? day.date.getDate() : ''
div(class='clndr-today-button') Today
`;

		clndr = new Clndr(container, {render: pug.compile(pugTemplate)});

		expect(container).not.toBeEmptyDOMElement();
		expect(screen.getByText('January 2024')).toBeInTheDocument();
	});

	test('Date-fns format proxy', () => {
		clndr = new Clndr(container, {
			render: vars => vars.format(vars.date, 'MMMM yyyy'),
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
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
		clndr = new Clndr(container, {render: provideRender(), weekStartsOn: 1});

		expect(screen.getByText('M')).toBe(container.querySelector('.header-day'));
	});

	test('Selected date', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			on: {
				click: handleClick,
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
			view: 'month',
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
			locale: de,
			on: {
				click: jest.fn(),
			},
		});

		expect(screen.getByText('Januar 2024')).toBeInTheDocument();
	});

	test('Use touch events', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			on: {
				navigate: function() {
					expect(true);
				},
			},
			useTouchEvents: true,
		});

		fireEvent.touchStart(screen.getByText('next'));
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

	test('getView()', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
		});

		expect(clndr.getView()).toBe('month');
	});

	test('getInterval()', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
		});

		expect(clndr.getInterval()).toEqual({
			start: startOfDay('2024-01-01'),
			end: endOfDay('2024-01-31'),
		});
	});

});

describe('Navigation', () => {

	test('Navigate by clicking on buttons switching the year', async () => {
		const multiNavigationTemplate = `
			<div class="clndr-previous-year-button">previous year</div>
			<div class="clndr-previous-button">previous</div>
			<div class="clndr-next-button">next</div>
			<div class="clndr-next-year-button">next year</div>
			<div><%= format(date, 'MMMM yyyy') %></div>
		`;

		clndr = new Clndr(container, {
			render: provideRender(multiNavigationTemplate),
			constraints: {
				start: new Date('2023-01'),
				end: new Date('2025-12'),
			},
			on: {
				click: jest.fn(),
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
			on: {
				click: handleClick,
				navigate: handleNavigate,
			},
			trackSelectedDate: true,
		});

		await user.click(screen.getByText('18'));

		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(handleNavigate).toHaveBeenCalledTimes(0);
		expect(handleToday).toHaveBeenCalledTimes(0);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('2024-01-18'),
			view: 'month',
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
			on: {
				navigate: handleNavigate,
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

	test('Programmatically set month', async () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			on: {
				navigate: handleNavigate,
			},
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		await clndr.setMonth(2);
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

	test('Programmatically set year', async () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			on: {
				navigate: handleNavigate,
			},
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		await clndr.setYear(1992);
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

	test('Programmatically set new interval', async () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			on: {
				navigate: handleNavigate,
			},
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		await clndr.setDate('2000-06-01');
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

	test('Initialisation events', async () => {
		expect.assertions(6);

		clndr = new Clndr(container, {
			render: provideRender(),
			on: {
				afterRender: async function(params) {
					expect(this).toBeInstanceOf(Clndr);
					expect(params).toEqual({
						element: container,
						interval: {start: startOfDay('2024-01-01'), end: endOfDay('2024-01-31')},
						view: 'month',
					});
				},
				beforeRender: async function(params) {
					expect(this).toBeInstanceOf(Clndr);
					expect(params).toEqual({
						element: container,
						interval: {start: startOfDay('2024-01-01'), end: endOfDay('2024-01-31')},
						view: 'month',
					});
				},
				ready: function(params) {
					expect(this).toBeInstanceOf(Clndr);
					expect(params).toEqual({
						element: container,
						interval: {start: startOfDay('2024-01-01'), end: endOfDay('2024-01-31')},
						view: 'month',
					});
				},
			},
		});
	});

	test('Trigger `navigate` callbacks', async () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			on: {
				navigate: function(params) {
					expect(this).toBeInstanceOf(Clndr);
					handleNavigate(params);
				},
			},
		});

		await clndr.next();
		await clndr.previous();

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
			events: [{
				title: 'This is an event',
				date: '2024-01-19',
			}],
			on: {
				click: handleClick,
			},
		})

		await user.click(screen.getByText('19'));
		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('2024-01-19'),
			view: 'month',
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
			events: [{
				title: 'Multi-day event',
				start: '2024-01-12',
				end: '2024-01-17',
			}],
			on: {
				click: handleClick,
			},
		})

		await user.click(screen.getByText('16'));
		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('2024-01-16'),
			view: 'month',
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

	test('Set extras', async () => {
		clndr = new Clndr(container, {
			render: provideRender('<div><%= extras.someExtra %></div>'),
			extras: {someExtra: 'some extra'},
		});

		expect(screen.queryAllByText('some extra').length).toBe(1);

		await clndr.setExtras({someExtra: 'updated extra'}).render();

		expect(screen.queryAllByText('some extra').length).toBe(0);
		expect(screen.queryAllByText('updated extra').length).toBe(1);
	});

	test('Add an event with date string', async () => {
		clndr = new Clndr(container, {render: provideRender()});

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');

		await clndr.addEvents([{date: '2024-01-12'}]).render();

		expect(container.querySelector('.calendar-day-2024-01-12')).toHaveClass('event');
	});

	test('Add an event with Date object', async () => {
		clndr = new Clndr(container, {render: provideRender()});

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');

		await clndr.addEvents([{date: new Date('2024-01-12')}]).render();

		expect(container.querySelector('.calendar-day-2024-01-12')).toHaveClass('event');
	});

	test('Add an event with forcing no re-rendering', () => {
		clndr = new Clndr(container, {render: provideRender()});

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');

		clndr.addEvents([{date: '2024-01-12'}]);

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');
	});

	test('Set all events', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			events: [{date: '2024-01-07'}],
		});

		expect(container.querySelector('.calendar-day-2024-01-07')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');

		await clndr.setEvents([{date: '2024-01-12'}]).render();

		expect(container.querySelector('.calendar-day-2024-01-07')).not.toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-12')).toHaveClass('event');
	});

	test('Remove events', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			events: [
				{date: '2024-01-07'},
				{date: '2024-01-23'},
			],
		})

		expect(container.querySelector('.calendar-day-2024-01-07')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-23')).toHaveClass('event');

		await clndr.removeEvents(event => event.date === '2024-01-23').render();

		expect(container.querySelector('.calendar-day-2024-01-07')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-23')).not.toHaveClass('event');
	});

});

describe('Multiple views', () => {

	const multiViewTemplates = {
		day: provideRender(`
			<div class="day">Day <%= format(items[0].date, 'D', {useAdditionalDayOfYearTokens: true}) %> in <%= format(items[0].date, 'yyyy') %></div>
			<div class="clndr-switch-week-button">Switch to week view</div>
		`),
		week: provideRender(`
			<div class="week"><%= format(items[0].date, 'LL-dd') %> to <%= format(items[items.length -1].date, 'LL-dd') %></div>
			<div class="clndr-switch-month-button">Switch to month view</div>
		`),
		month: provideRender(`
			<div class="month"><%= format(date, 'MMMM yyyy') %></div>
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

	test('Switching view', async () => {
		const handleSwitchView = jest.fn();

		clndr = new Clndr(container, {
			render: multiViewTemplates,
			defaultView: 'day',
			on: {
				switchView: async function(params) {
					expect(this).toBeInstanceOf(Clndr);
					handleSwitchView(params);
				},
			},
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

		expect(handleSwitchView.mock.calls[0][0]).toEqual({
			view: 'week',
		});

		expect(handleSwitchView.mock.calls[1][0]).toEqual({
			view: 'month',
		});

		expect(handleSwitchView.mock.calls[2][0]).toEqual({
			view: 'year',
		});

		expect(handleSwitchView.mock.calls[3][0]).toEqual({
			view: 'decade',
		});

		expect(handleSwitchView.mock.calls[4][0]).toEqual({
			view: 'year',
		});

		expect(handleSwitchView.mock.calls[5][0]).toEqual({
			view: 'month',
		});
	});

	test('Programmatically switching view', async () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: multiViewTemplates,
			defaultView: 'day',
			on: {
				navigate: handleNavigate,
			},
		});

		expect(screen.getByText('Day 18 in 2024')).toBeInTheDocument();
		await clndr.switchView('decade');
		expect(screen.getByText('2024')).toBeInTheDocument();
		// Try again switching to the same view:
		await clndr.switchView('decade');
		expect(screen.getByText('2024')).toBeInTheDocument();
		await clndr.switchView('month', '1992-10');
		expect(screen.getByText('October 1992')).toBeInTheDocument();

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('2020-01-01')), end: endOfDay(new Date('2029-12-31'))},
			isBefore: true,
			isAfter: false,
			monthChanged: true,
			yearChanged: true,
		});

		expect(handleNavigate.mock.calls[1][0]).toEqual({
			interval: {start: startOfDay(new Date('1992-10-01')), end: endOfDay(new Date('1992-10-31'))},
			isBefore: true,
			isAfter: false,
			monthChanged: true,
			yearChanged: true,
		});
	});

	test('Tracking selected date across multiple views', async () => {
		clndr = new Clndr(container, {
			render: multiViewTemplates,
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
				year: multiViewTemplates.year,
				decade: multiViewTemplates.decade,
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
					<div><%= format(date, 'MMMM') %></div>
					<div>
						<% items.forEach(item => { %>
							<div class="<%= item.classes %>"><%= item.date.getDate() %></div>
						<% }) %>
					</div>
					<div class="clndr-switch-year-button">Switch to year view</div>
				`),
				year: provideRender(`
					<div><%= format(date, 'yyyy') %></div>
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

	test('Missing render function for view', async () => {
		const mockWarn = jest.fn();
		jest.spyOn(console, 'warn').mockImplementation(mockWarn);

		clndr = new Clndr(container, {
			render: {
				month: provideRender(`
					<div><%= format(date, 'MMMM yyyy') %></div>
					<div class="clndr-switch-year-button">Switch to year view</div>
				`),
				year: undefined,
			},
		});

		await user.click(screen.getByText('Switch to year view'));

		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	test('Try to switch to invalid view', async () => {
		clndr = new Clndr(container, {
			render: {
				month: provideRender(`
					<div><%= format(date, 'MMMM yyyy') %></div>
					<div>
						<% items.forEach(item => { %>
							<div class="switch <%= item.classes %>"><%= item.date.getDate() %></div>
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

	test('Unable to detect target date when switching view due to CSS id class unexpectedly missing', async () => {
		clndr = new Clndr(container, {
			render: {
				month: provideRender('<div><%= format(date, "MMMM yyyy") %></div>'),
				year: provideRender(`
					<div>
						<div>YEAR</div>
						<% items.forEach(month => { %>
							<div class="<%= month.classes %>"><%= format(month.date, 'MMMM') %></div>
						<% }) %>
					</div>
				`),
			},
			defaultView: 'year',
		});

		const item = screen.getByText('November');
		item.classList.remove('calendar-month-2024-11');

		await user.click(item);

		expect(screen.getByText('January 2024')).toBeInTheDocument();
	});

});
