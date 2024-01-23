import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import Clndr from './clndr';
import moment from 'moment';
import {fireEvent, screen} from '@testing-library/dom';

const defaultTemplate = `
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
	<div class="clndr-today-button">Today</div>`;

const oneWeekTemplate = `
	<div class="clndr-controls">
		<div class="clndr-previous-button">&lsaquo;</div>
		<div class="month">
			<%= format(intervalStart, 'MM/dd') %> - <%= format(intervalEnd, 'MM/dd') %>
		</div>
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
	</div>`;

const multiMonthTemplate = `
	<div class="multi-month-controls">
		<div class="clndr-previous-year-button quarter-button">&laquo;</div><!--
		--><div class="clndr-previous-button quarter-button">&lsaquo;</div><!--
		--><div class="clndr-next-button quarter-button right-align">&rsaquo;</div><!--
		--><div class="clndr-next-year-button quarter-button right-align">&raquo;</div>
	</div>
	<% months.forEach(oneMonth => { %>
		<div class="clndr-controls">
			<div class="month"><%= oneMonth.month.format('MMMM YYYY') %></div>
		</div>
		<div class="clndr-grid">
			<div class="days-of-the-week">
				<% daysOfTheWeek.forEach(day => { %>
					<div class="header-day"><%= day %></div>
				<% }); %>
				<div class="days">
					<% oneMonth.days.forEach(day => { %>
						<div class="<%= day.classes %>"><%= day.day %></div>
					<% }); %>
				</div>
			</div>
		</div>
		<div class="clndr-today-button">Today</div>
	<% }); %>`;

let user;
let container;
let clndr;

beforeAll(() => {
	jest.useFakeTimers({now: new Date(2024, 0, 18, 12)});
	jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-18T12:00:00.000Z'));
	jest.spyOn(console, 'warn').mockImplementation(jest.fn);
	moment.locale('en');
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
		clndr = new Clndr(container);

		expect(container).not.toBeEmptyDOMElement();

		clndr.destroy();

		expect(container).toBeEmptyDOMElement();
	});

	test('Provide a custom template', () => {
		clndr = new Clndr(container, {
			template: defaultTemplate,
		});

		expect(container).not.toBeEmptyDOMElement();
		expect(screen.getByText('January')).toBeInTheDocument();

		clndr.destroy();

		expect(container).toBeEmptyDOMElement();
	});

	test('Pass in some events', () => {
		clndr = new Clndr(container, {
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
			events: [
				{
					title: 'Multi1',
					endDate: '1992-10-17',
					startDate: '1992-10-12',
				}, {
					title: 'Multi2',
					endDate: '1992-10-27',
					startDate: '1992-10-24',
				},
			],
			multiDayEvents: {
				endDate: 'endDate',
				startDate: 'startDate',
			},
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('12').parentNode).toHaveClass('event');
		expect(screen.getByText('17').parentNode).toHaveClass('event');
		expect(screen.getByText('14').parentNode).toHaveClass('event');
		expect(screen.getByText('25').parentNode).toHaveClass('event');
		expect(screen.getByText('2').parentNode).not.toHaveClass('event');
	});

	test('Multi-day events with partial dates', () => {
		clndr = new Clndr(container, {
			events: [
				{
					title: 'Multi1',
					startDate: '2024-01-17',
				}, {
					title: 'Multi2',
					endDate: '2024-01-12',
				},
			],
			multiDayEvents: {
				endDate: 'endDate',
				startDate: 'startDate',
			},
		});

		expect(container.querySelector('.calendar-day-2024-01-12')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-17')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-14')).not.toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-25')).not.toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-02')).not.toHaveClass('event');
	});

	test('Mixing single-day and multi-day events', () => {
		clndr = new Clndr(container, {
			events: [
				{
					title: 'Multi1',
					endDate: '2024-01-17',
					startDate: '2024-01-12',
				}, {
					title: 'Multi2',
					endDate: '2024-01-27',
					startDate: '2024-01-24',
				}, {
					title: 'Single',
					date: '2024-01-19',
				},
			],
			multiDayEvents: {
				singleDay: 'date',
				endDate: 'endDate',
				startDate: 'startDate',
			},
		});

		expect(container.querySelector('.calendar-day-2024-01-12')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-17')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-14')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-19')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-02')).not.toHaveClass('event');
	});

	test('Pass moment instance', () => {
		clndr = new Clndr(container, {moment});

		expect(clndr.options.moment).not.toBeNull();
	});

	test('Custom week offset', () => {
		clndr = new Clndr(container, {weekOffset: 1});

		expect(screen.getByText('M')).toBe(container.querySelector('.header-day'));
	});

	test('Custom week offset bigger than actual week length', () => {
		clndr = new Clndr(container, {weekOffset: 10});

		expect(screen.queryAllByText('S')[0]).toBe(container.querySelector('.header-day'));
	});

	test('Custom week offset while not showing adjacent months', () => {
		clndr = new Clndr(container, {weekOffset: 3, showAdjacentMonths: false});

		expect(container.querySelectorAll('.empty').length).toBeGreaterThan(0);
	})

	test('Force six rows', () => {
		clndr = new Clndr(container, {forceSixRows: true, startWithMonth: '1992-02'});

		expect(container.querySelector('.calendar-day-1992-03-07')).toBeInTheDocument();
	})

	test('Force six rows while not showing adjacent months', () => {
		clndr = new Clndr(container, {
			forceSixRows: true,
			showAdjacentMonths: false,
			startWithMonth: '1992-02',
		});

		expect(container.querySelectorAll('.empty').length).toBeGreaterThan(0);
	})

	test('Selected date', () => {
		clndr = new Clndr(container, {selectedDate: '1992-10-15', startWithMonth: '1992-10'});

		expect(container.querySelector('.calendar-day-1992-10-15')).toHaveClass('selected');
	});

	test('Custom render function', () => {
		clndr = new Clndr(container, {render: () => '<div>test</div>'});

		expect(screen.getByText('test')).toBeInTheDocument();
	});

	test('Custom day interval while providing start month', () => {
		clndr = new Clndr(container, {
			lengthOfTime: {
				days: 7,
			},
			startWithMonth: '1992-10',
			template: oneWeekTemplate,
		});

		expect(container.querySelector('.calendar-day-1992-10-01')).toBeInTheDocument();
	});

	test('Custom days of the week naming', () => {
		clndr = new Clndr(container, {
			daysOfTheWeek: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'],
		});

		expect(screen.getByText('d7')).toBeInTheDocument();
	})

	test('Do not show adjacent months', () => {
		clndr = new Clndr(container, {
			events: [{date: '1992-10-15'}],
			showAdjacentMonths: false,
			startWithMonth: '1992-10',
		});

		expect(screen.queryAllByText('1').length).toBe(1);
		expect(screen.queryAllByText('30').length).toBe(1);
	})

	test('Use touch events', () => {
		const handleMonthChange = jest.fn();

		clndr = new Clndr(container, {
			clickEvents: {
				onMonthChange: handleMonthChange,
			},
			useTouchEvents: true,
		});

		fireEvent.touchStart(screen.getByText('next'));
		expect(handleMonthChange).toHaveBeenCalledTimes(1);
	});

	test('Track selected date while inactive days should be ignored in selection', async() => {
		clndr = new Clndr(container, {
			ignoreInactiveDaysInSelection: true,
			startWithMonth: '1992-06',
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
			adjacentDaysChangeMonth: true,
			ignoreInactiveDaysInSelection: true,
			startWithMonth: '1992-06',
			trackSelectedDate: true,
		});

		expect(container.querySelector('.selected')).toBeNull();
		await user.click(screen.getByText('12'));
		expect(screen.getByText('12').parentNode).toHaveClass('selected');
		await user.click(screen.getByText('31'));
		expect(screen.getByText('31').parentNode).not.toHaveClass('selected');
		await user.click(screen.getByText('next'));
		expect(screen.getByText('12').parentNode).toHaveClass('selected');
	});

	test('Define just a date after the current date', async() => {
		clndr = new Clndr(container, {
			events: [{date: '1992-10-15'}],
			startWithMonth: '1992-09',
		});

		await user.click(screen.getByText('next'));
		expect(screen.getByText('15').parentNode).toHaveClass('event');
	});

});

describe('Navigation', () => {

	test('Navigate between months', async () => {
		clndr = new Clndr(container, {
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		await user.click(screen.getByText('previous'));
		expect(screen.getByText('September 1992')).toBeInTheDocument();
		await user.click(screen.getByText('next'));
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Change month with click on previous month\'s day', async () => {
		clndr = new Clndr(container, {
			adjacentDaysChangeMonth: true,
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		await user.click(screen.getAllByText('30')[0]);
		expect(screen.getByText('September 1992')).toBeInTheDocument();
	});

	test('Change month by clicking on empty field preceding current month\'s days', async () => {
		clndr = new Clndr(container, {
			showAdjacentMonths: false,
			adjacentDaysChangeMonth: true,
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		await user.click(container.querySelector('.empty'));
		expect(screen.getByText('September 1992')).toBeInTheDocument();
	});

	test('Change month by clicking on empty field following current month\'s days', async () => {
		clndr = new Clndr(container, {
			showAdjacentMonths: false,
			adjacentDaysChangeMonth: true,
			startWithMonth: '1992-09',
		});

		expect(screen.getByText('September 1992')).toBeInTheDocument();
		await user.click(container.querySelectorAll('.empty')[container.querySelectorAll('.empty').length - 1]);
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Click button switching to next year', async () => {
		clndr = new Clndr(container, {
			template: multiMonthTemplate,
			clickEvents: {
				click: jest.fn(),
			},
			startWithMonth: '1992-10',
			lengthOfTime: {
				months: 3,
			},
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		await user.click(screen.getByText('»'));
		expect(screen.getByText('October 1993')).toBeInTheDocument();
	});

	test('Click button switching to previous year', async () => {
		clndr = new Clndr(container, {
			template: multiMonthTemplate,
			clickEvents: {
				click: jest.fn(),
			},
			startWithMonth: '1992-10',
			lengthOfTime: {
				months: 3,
			},
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		await user.click(screen.getByText('«'));
		expect(screen.getByText('October 1991')).toBeInTheDocument();
	});

	test('Programmatically change month by calling previous()', async () => {
		clndr = new Clndr(container, {
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.previous();
		expect(screen.getByText('September 1992')).toBeInTheDocument();
	});

	test('Programmatically change month by calling forward()', async () => {
		clndr = new Clndr(container, {
			startWithMonth: '1992-09',
		});

		expect(screen.getByText('September 1992')).toBeInTheDocument();
		clndr.forward();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Programmatically change year using previousYear()', async () => {
		clndr = new Clndr(container, {
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.previousYear();
		expect(screen.getByText('October 1991')).toBeInTheDocument();
	});

	test('Prevent changing to previous year if constraint prohibits', async () => {
		clndr = new Clndr(container, {
			constraints: {
				startDate: '1992-10-15',
			},
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.previousYear();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Programmatically change year using nextYear()', async () => {
		clndr = new Clndr(container, {
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.nextYear();
		expect(screen.getByText('October 1993')).toBeInTheDocument();
	})

	test('Prevent changing to next year if constraint prohibits', async () => {
		clndr = new Clndr(container, {
			constraints: {
				endDate: '1992-10-15',
			},
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.nextYear();
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Programmatically trigger today()', () => {
		clndr = new Clndr(container, {
			startWithMonth: '1992-10',
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		clndr.today({withCallbacks: true});
		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
	});

	test('Programmatically trigger today() with callbacks', () => {
		const handleToday = jest.fn();
		const handleYearChange = jest.fn();

		clndr = new Clndr(container, {
			clickEvents: {
				onYearChange: handleYearChange,
				today: handleToday,
			},
			startWithMonth: '1992-10',
		});

		clndr.today({withCallbacks: true});

		expect(handleToday).toHaveBeenCalledTimes(1);
		expect(handleYearChange).toHaveBeenCalledTimes(1);
	});

	test('Go to today while having a custom interval with a start date being set', () => {
		clndr = new Clndr(container, {
			lengthOfTime: {
				days: 7,
				// FIXME: startDate should not require a moment object
				startDate: moment('1992-10-15'),
			},
			template: oneWeekTemplate,
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();

		clndr.today();

		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
	});

	test('Go to today while having a custom interval', () => {
		clndr = new Clndr(container, {
			lengthOfTime: {
				days: 7,
			},
			template: oneWeekTemplate,
		});

		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
		clndr.today();
		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
	});

	test('Click today button', async () => {
		const handleToday = jest.fn();

		clndr = new Clndr(container, {
			template: defaultTemplate,
			clickEvents: {
				today: handleToday,
			},
		});

		await user.click(screen.getByText('Today'));

		expect(handleToday).toHaveBeenCalledTimes(1);
	})

	test('Programmatically set month with callbacks', () => {
		const handleMonthChange = jest.fn();

		clndr = new Clndr(container, {
			clickEvents: {
				onMonthChange: handleMonthChange,
			},
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setMonth(0, {withCallbacks: true});
		expect(screen.getByText('January 1992')).toBeInTheDocument();

		expect(handleMonthChange).toHaveBeenCalledTimes(1);
	});

	test('Programmatically set month with empty options', () => {
		const handleMonthChange = jest.fn();

		clndr = new Clndr(container, {
			clickEvents: {
				onMonthChange: handleMonthChange,
			},
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setMonth(0, {});
		expect(screen.getByText('January 1992')).toBeInTheDocument();

		expect(handleMonthChange).toHaveBeenCalledTimes(0);
	});

	test('Try programmatically setting month while having configured a custom interval', () => {
		const mockWarn = jest.fn();
		console.warn = mockWarn;

		clndr = new Clndr(container, {
			template: multiMonthTemplate,
			lengthOfTime: {
				months: 2,
			},
		});

		expect(mockWarn).toHaveBeenCalledTimes(0);
		clndr.setMonth(4);
		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	test('Programmatically set year with callbacks', () => {
		const handleYearChange = jest.fn();

		clndr = new Clndr(container, {
			clickEvents: {
				onYearChange: handleYearChange,
			},
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setYear(1991, {withCallbacks: true});
		expect(screen.getByText('October 1991')).toBeInTheDocument();

		expect(handleYearChange).toHaveBeenCalledTimes(1);
	});

	test('Programmatically set year with empty options', () => {
		const handleYearChange = jest.fn();

		clndr = new Clndr(container, {
			clickEvents: {
				onYearChange: handleYearChange,
			},
			startWithMonth: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setYear(1991, {});
		expect(screen.getByText('October 1991')).toBeInTheDocument();

		expect(handleYearChange).toHaveBeenCalledTimes(0);
	});

	test('Try programmatically set new interval while there is a custom interval configured', () => {
		const mockWarn = jest.fn();
		console.warn = mockWarn;

		clndr = new Clndr(container, {
			startWithMonth: '1992-10',
		});

		expect(mockWarn).toHaveBeenCalledTimes(0);
		clndr.setIntervalStart('2000-10-15');
		expect(mockWarn).toHaveBeenCalledTimes(1);
	});

	test('Programmatically set new interval with having a custom month interval configured', () => {
		const handleIntervalChange = jest.fn();

		clndr = new Clndr(container, {
			clickEvents: {
				onIntervalChange: handleIntervalChange,
			},
			lengthOfTime: {
				months: 3,
			},
			startWithMonth: '1992-10',
			template: multiMonthTemplate,
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		clndr.setIntervalStart('2000-06-01', {withCallbacks: true});
		expect(screen.getByText('June 2000')).toBeInTheDocument();
		expect(handleIntervalChange).toHaveBeenCalledTimes(1);
	});

	test('Programmatically set new interval with having a custom month interval configured', () => {
		clndr = new Clndr(container, {
			lengthOfTime: {
				days: 7,
			},
			startWithMonth: '1992-10',
			template: oneWeekTemplate,
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
			doneRendering: handleDoneRendering,
			ready: handleReady,
		});

		expect(handleDoneRendering).toHaveBeenCalledTimes(1);
		expect(handleReady).toHaveBeenCalledTimes(1);
	});

	test('Change month with click on next month\'s day', async () => {
		clndr = new Clndr(container, {
			adjacentDaysChangeMonth: true,
			startWithMonth: '1992-09',
		});

		expect(screen.getByText('September 1992')).toBeInTheDocument();
		await user.click(screen.getAllByText('1')[screen.getAllByText('1').length - 1]);
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Click handler', async () => {
		const handleClick = jest.fn();
		clndr = new Clndr(container, {clickEvents: {click: handleClick}, startMonth: '1992-10-15'});

		await user.click(screen.getByText('15'));

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	test('Trigger interval change callbacks', () => {
		const handlePreviousInterval = jest.fn();
		const handleNextInterval = jest.fn();
		const handleIntervalChange = jest.fn();

		const clndr = new Clndr(container, {
			clickEvents: {
				previousInterval: handlePreviousInterval,
				nextInterval: handleNextInterval,
				onIntervalChange: handleIntervalChange,
			},
			lengthOfTime: {months: 3},
			template: multiMonthTemplate,
		});

		clndr.back({withCallbacks: true});
		clndr.next({withCallbacks: true});

		expect(handlePreviousInterval).toHaveBeenCalledTimes(1);
		expect(handleNextInterval).toHaveBeenCalledTimes(1);
		expect(handleIntervalChange).toHaveBeenCalledTimes(2);
	});

	test('Trigger default change callbacks', () => {
		const handleMonthChange = jest.fn();
		const handlePreviousMonth = jest.fn();
		const handleNextMonth = jest.fn();
		const handleYearChange = jest.fn();
		const handlePreviousYear = jest.fn();
		const handleNextYear = jest.fn();

		clndr = new Clndr(container, {
			clickEvents: {
				onMonthChange: handleMonthChange,
				previousMonth: handlePreviousMonth,
				nextMonth: handleNextMonth,
				onYearChange: handleYearChange,
				previousYear: handlePreviousYear,
				nextYear: handleNextYear,
			},
			startWithMonth: '1992-12',
		});


		clndr.next({withCallbacks: true});
		clndr.back({withCallbacks: true});

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
			clickEvents: {
				click: handleClick,
			},
			events: [{
				title: 'This is an event',
				date: '1992-10-15',
			}],
			startWithMonth: '1992-10',
		})

		await user.click(screen.getByText('15'));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	test('Click on a day of a multi-day event', async() => {
		const handleClick = jest.fn(data => {
			expect(data.events[0].title).toBe('Multi-day event');
		});

		clndr = new Clndr(container, {
			clickEvents: {
				click: handleClick,
			},
			events: [{
				title: 'Multi-day event',
				endDate: '1992-10-17',
				startDate: '1992-10-12',
			}],
			multiDayEvents: {
				endDate: 'endDate',
				startDate: 'startDate',
			},
			startWithMonth: '1992-10',
		})

		await user.click(screen.getByText('15'));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	test('Click on empty calendar box', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			showAdjacentMonths: false,
			clickEvents: {
				click: handleClick,
			},
		});

		await user.click(container.querySelector('.empty'));
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

});

describe('Data manipulations', () => {

	test('Set extras', () => {
		clndr = new Clndr(container);

		expect(clndr.options.extras).toBeNull();

		clndr.setExtras({someExtra: 'value'});

		expect(clndr.options.extras).toMatchObject({someExtra: 'value'});
	});

	test('Add an event', () => {
		clndr = new Clndr(container);

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');

		clndr.addEvents([{date: '2024-01-12'}]);

		expect(container.querySelector('.calendar-day-2024-01-12')).toHaveClass('event');
	});

	test('Add an event with forcing no re-rendering', () => {
		const clndr = new Clndr(container);

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');

		clndr.addEvents([{date: '2024-01-12'}], false);

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');
	});

	test('Add a single-day event with multi-day events being configured', () => {
		clndr = new Clndr(container, {
			multiDayEvents: {
				singleDay: 'date',
				endDate: 'endDate',
				startDate: 'startDate',
			},
		});

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');

		clndr.addEvents([{date: '2024-01-12'}], false);

		expect(container.querySelector('.calendar-day-2024-01-12')).not.toHaveClass('event');
	})

	test('Set all events', () => {
		clndr = new Clndr(container, {
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
			events: [{
				title: 'Multi',
				endDate: '2024-01-17',
				startDate: '2024-01-12',
			}],
			multiDayEvents: {
				singleDay: 'date',
				startDate: 'startDate',
				endDate: 'endDate',
			},
		});

		expect(container.querySelector('.calendar-day-2024-01-15')).toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-03')).not.toHaveClass('event');

		clndr.setEvents([{date: '2024-01-03'}]);

		expect(container.querySelector('.calendar-day-2024-01-15')).not.toHaveClass('event');
		expect(container.querySelector('.calendar-day-2024-01-03')).toHaveClass('event');
	})

	test('Remove events', () => {
		clndr = new Clndr(container, {
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

	test('lengthOfTime option', () => {
		clndr = new Clndr(container, {
			events: [
				{
					title: 'Multi1',
					endDate: '1992-10-17',
					startDate: '1992-10-12',
				}, {
					title: 'Multi2',
					endDate: '1992-10-27',
					startDate: '1992-10-24',
				},
			],
			lengthOfTime: {months: 3},
			startWithMonth: '1992-10',
			template: multiMonthTemplate,
		});

		expect(container.querySelector('.calendar-day-1992-10-07')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-11-07')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-12-08')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1993-01-03')).not.toBeInTheDocument();
	});

	test('Custom month view interval with custom start date', () => {
		clndr = new Clndr(container, {
			lengthOfTime: {months: 2, startDate: '1992-10-15'},
			template: multiMonthTemplate,
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-11-15')).toBeInTheDocument();
	});

	test('Custom month view interval with custom start month', () => {
		clndr = new Clndr(container, {
			lengthOfTime: {months: 2},
			startWithMonth: '1992-10',
			template: multiMonthTemplate,
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-11-15')).toBeInTheDocument();
	});

	test('Custom day view interval', () => {
		clndr = new Clndr(container, {
			lengthOfTime: {days: 7, startDate: '1992-10-15'},
			template: oneWeekTemplate,
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-10-22')).not.toBeInTheDocument();
	});
});

describe('Constraints', () => {

	test('Start and end date constraints in the past', async () => {
		clndr = new Clndr(container, {
			constraints: {
				startDate: '1992-10-15',
				endDate: '1992-11-15',
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
			constraints: {
				startDate: '2100-01-01',
				endDate: '2100-01-06',
			},
			lengthOfTime: {days: 7, interval: 7},
			template: oneWeekTemplate,
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
			lengthOfTime: {
				days: 7,
				interval: 7,
				startDate: '1992-10-15',
			},
			constraints: {
				endDate: '1992-09-15',
				startDate: '1992-09-01',
			},
			template: oneWeekTemplate,
		});

		expect(container.querySelector('.calendar-day-1992-09-15')).toBeInTheDocument();
	});

	test('End date constraint is before start date constraint', () => {
		clndr = new Clndr(container, {
			lengthOfTime: {
				months: 3,
				interval: 7,
				startDate: '1992-10-15',
			},
			constraints: {
				endDate: '1992-11-15',
				startDate: '1993-11-30',
			},
			template: multiMonthTemplate,
		});

		expect(container.querySelector('.calendar-day-1992-10-15')).not.toBeInTheDocument();
		expect(container.querySelector('.calendar-day-1992-11-15')).toBeInTheDocument();
	});

});

describe('Forcing errors', () => {

	test('Neither providing Underscore, nor a custom render function', () => {
		const underscore = _;

		// eslint-disable-next-line no-global-assign
		_ = undefined;

		expect(() => new Clndr(container)).toThrow();

		// eslint-disable-next-line no-global-assign
		_ = underscore;
	});

	test('Missing CSS classes to detect month change when not showing adjacent months', async() => {
		clndr = new Clndr(container, {
			adjacentDaysChangeMonth: true,
			showAdjacentMonths: false,
			startWithMonth: '1992-09',
		});

		const empty = container.querySelector('.empty');
		empty.classList.remove('last-month');
		await user.click(empty);
	});

	test('Click on a day while the day identifier class is unexpectedly not assigned', async() => {
		const handleClick = jest.fn(data => {
			expect(data.date).toBeNull();
		});

		clndr = new Clndr(container, {
			clickEvents: {
				click: handleClick,
			},
			startWithMonth: '1992-10',
		});

		const day = screen.getByText('15').parentNode;
		day.classList.remove('calendar-day-1992-10-15');
		await user.click(day);

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

});