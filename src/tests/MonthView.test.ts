import '@testing-library/jest-dom';
import {endOfDay, startOfDay} from 'date-fns';
import Clndr from '../Clndr';
import {screen} from '@testing-library/dom';

describe('MONTH view', () => {

	const oneMonthTemplate = `
		<div><%= format(interval.start, 'MMMM yyyy') %></div>
		<div class="clndr-previous-button">previous</div>
		<div class="clndr-next-button">next</div>
		<div class="clndr-today-button">Current month</div>
		<% items.forEach(day => { %>
			<div class="<%= day.classes %>"><%= format(day.date, 'd') %></div>
		<% }) %>
	`;

	const multiMonthTemplate = `
		<div>
			<% pages.forEach((month, pageIndex) => { %>
				<div><%= format(month, 'MMMM yyyy') %></div>
				<% items[pageIndex].forEach(day => { %>
					<div class="<%= day.classes %>"><%= format(day.date, 'd') %></div>
				<% }) %>
			<% }) %>
		</div>
	`;

	test('Rendering plain calendar', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneMonthTemplate),
			pagination: {month: {size: 1}},
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		expect(screen.queryAllByText('1').length).toBe(2);
		expect(container.querySelector('.calendar-day-2024-01-01')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-2024-01-31')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-2024-02-01')).toBeInTheDocument();
	});

	test('Programmatic navigation', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneMonthTemplate),
			pagination: {month: {size: 1}},
		});

		clndr.setYear(2025);
		expect(screen.getByText('January 2025')).toBeInTheDocument();

		clndr.setMonth(4);
		expect(screen.getByText('May 2025')).toBeInTheDocument();

		clndr.setIntervalStart(new Date('1992-10-15'));
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Start and end constraints', async () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneMonthTemplate),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			constraints: {
				start: new Date('1992-09-01'),
				end: new Date('1992-12-31'),
			},
			pagination: {month: {size: 1}},
			startOn: '1992-10-15',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		await user.click(screen.getByText('previous'));
		expect(screen.getByText('September 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(1);
		await user.click(screen.getByText('previous'));
		expect(screen.getByText('September 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(1);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('October 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(2);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('November 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(3);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('December 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(4);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('December 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(4);
	});

	test('Start date before start constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneMonthTemplate),
			constraints: {
				start: new Date('1992-11-15'),
			},
			pagination: {month: {size: 1}},
			startOn: '1992-10-15',
		});

		expect(screen.getByText('November 1992')).toBeInTheDocument();
	});

	test('End date after end constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneMonthTemplate),
			constraints: {
				end: new Date('1992-09-15'),
			},
			pagination: {month: {size: 1}},
			startOn: '1992-10-15',
		});

		expect(screen.getByText('September 1992')).toBeInTheDocument();
	});

	test('Click event handlers', async () => {
		const handleClick = jest.fn();
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneMonthTemplate),
			clickEvents: {
				onClick: handleClick,
				onNavigate: handleNavigate,
			},
			pagination: {month: {size: 1}},
			startOn: '1992-10-15',
		});

		await user.click(screen.getByText('next'));
		await user.click(screen.getByText('previous'));

		expect(handleNavigate).toHaveBeenCalledTimes(2);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('1992-11-01')), end: endOfDay(new Date('1992-11-30'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: false,
			element: screen.getByText('next'),
		});

		expect(handleNavigate.mock.calls[1][0]).toEqual({
			interval: {start: startOfDay(new Date('1992-10-01')), end: endOfDay(new Date('1992-10-31'))},
			isBefore: true,
			isAfter: false,
			monthChanged: true,
			yearChanged: false,
			element: screen.getByText('previous'),
		});

		await user.click(screen.getByText('15'));

		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('1992-10-15'),
			events: [],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('15'),
		});

		await user.click(screen.getByText('Current month'));

		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(handleNavigate).toHaveBeenCalledTimes(3);

		expect(handleNavigate.mock.calls[2][0]).toEqual({
			interval: {start: startOfDay(new Date('2024-01-01')), end: endOfDay(new Date('2024-01-31'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: true,
			element: screen.getByText('Current month'),
		});
	});

	test('Events', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneMonthTemplate),
			events: [
				{date: '2023-12-18', title: 'event out of range'},
				{date: '2024-01-18', title: 'event on current page'},
				{date: '2024-02-18', title: 'event out of range'},
			],
			pagination: {month: {size: 1}},
		});

		expect(screen.getByText('17').classList.contains('event')).toBeFalsy();
		expect(screen.getByText('18').classList.contains('event')).toBeTruthy();
		expect(screen.getByText('19').classList.contains('event')).toBeFalsy();
	});

	test('Multiple months on one page', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiMonthTemplate),
			pagination: {month: {size: 2}},
		});

		expect(screen.getByText('January 2024')).toBeInTheDocument();
		expect(screen.getByText('February 2024')).toBeInTheDocument();
		expect(container.querySelectorAll('.item').length).toBe(70);

		clndr.next();
		expect(screen.getByText('March 2024')).toBeInTheDocument();
		expect(screen.getByText('April 2024')).toBeInTheDocument();

		clndr.previous();
		expect(screen.getByText('January 2024')).toBeInTheDocument();
		expect(screen.getByText('February 2024')).toBeInTheDocument();
	});

	test('Custom week offset while not showing adjacent months', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			showAdjacent: false,
			weekOffset: 3,
		});

		expect(container.querySelectorAll('.empty').length).toBeGreaterThan(0);
	});

	test('Force six rows', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			forceSixRows: true,
			startOn: '1992-02',
		});

		expect(container.querySelector('.calendar-day-1992-03-07')).toBeInTheDocument();
	});

	test('Force six rows while not showing adjacent months', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			forceSixRows: true,
			showAdjacent: false,
			startOn: '1992-02',
		});

		expect(container.querySelectorAll('.empty').length).toBeGreaterThan(0);
	});

	test('Do not show adjacent months', () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			events: [{date: '1992-10-15'}],
			showAdjacent: false,
			startOn: '1992-10',
		});

		expect(screen.queryAllByText('1').length).toBe(1);
		expect(screen.queryAllByText('30').length).toBe(1);
	});

	test('Change month by clicking on empty field preceding current month\'s days', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			adjacentItemsChangePage: true,
			pagination: {month: {size: 1}},
			showAdjacent: false,
			startOn: '1992-10',
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
			adjacentItemsChangePage: true,
			pagination: {month: {size: 1}},
			showAdjacent: false,
			startOn: '1992-09',
		});

		expect(screen.getByText('September 1992')).toBeInTheDocument();
		await user.click(container.querySelectorAll('.empty')[container.querySelectorAll('.empty').length - 1]);
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('Change month with click on previous month\'s day', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			adjacentItemsChangePage: true,
			startOn: '1992-10',
		});

		expect(screen.getByText('October 1992')).toBeInTheDocument();
		await user.click(screen.getAllByText('30')[0]);
		expect(screen.getByText('September 1992')).toBeInTheDocument();
	});

	test('Change month with click on next month\'s day', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			adjacentItemsChangePage: true,
			pagination: {month: {size: 1}},
			startOn: '1992-09',
		});

		expect(screen.getByText('September 1992')).toBeInTheDocument();
		await user.click(screen.getAllByText('1')[screen.getAllByText('1').length - 1]);
		expect(screen.getByText('October 1992')).toBeInTheDocument();
	});

	test('selectedDate option', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneMonthTemplate),
			clickEvents: {
				onClick: handleClick,
			},
			pagination: {month: {size: 1}},
			selectedDate: '2024-01-15',
			trackSelectedDate: true,
		});

		expect(clndr.getSelectedDate()).toBeDefined();
		expect(container.querySelector('.selected')).toBe(screen.getByText('15'));
		expect(clndr.getSelectedDate()?.toISOString()).toBe(new Date('2024-01-15').toISOString());
		await user.click(screen.getByText('20'));
		expect(clndr.getSelectedDate()?.toISOString()).toBe(new Date('2024-01-20').toISOString());
		expect(container.querySelector('.selected')).toBe(screen.getByText('20'));

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('2024-01-20'),
			events: [],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('20'),
		});
	});

	test('Track selected date while inactive days should be ignored in selection and adjacent month\'s days change the month', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			adjacentItemsChangePage: true,
			ignoreInactiveDaysInSelection: true,
			trackSelectedDate: true,
		});

		expect(container.querySelector('.selected')).toBeNull();
		await user.click(screen.getByText('18'));
		expect(screen.getByText('18')).toHaveClass('selected');
		await user.click(screen.getByText('16'));
		expect(screen.getByText('16')).toHaveClass('selected');
		await user.click(screen.getByText('next'));
		expect(screen.getByText('18')).not.toHaveClass('selected');
	});

	test('Click on empty calendar box', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(),
			clickEvents: {
				onClick: handleClick,
			},
			showAdjacent: false,
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

	test('Missing CSS classes to detect month change when not showing adjacent months', async () => {
		clndr = new Clndr(container, {
			render: provideRender(),
			adjacentItemsChangePage: true,
			showAdjacent: false,
		});

		const emptyElement = container.querySelector('.empty');
		expect(emptyElement).not.toBeNull();
		(emptyElement as Element).classList.remove('previous');
		await user.click(emptyElement as Element);
	});

});