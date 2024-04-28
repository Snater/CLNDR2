import '@testing-library/jest-dom';
import {endOfDay, startOfDay} from 'date-fns';
import Clndr from '../Clndr';
import {screen} from '@testing-library/dom';

describe('DAY view', () => {

	const oneDayTemplate = `
		<div class="clndr-previous-button">previous</div>
		<div class="clndr-next-button">next</div>
		<div class="clndr-today-button">Current day</div>
		<% items.forEach(day => { %>
			<div class="<%= day.classes %>">Day <%= format(day.date, 'D', {useAdditionalDayOfYearTokens: true}) %> in <%= format(day.date, 'yyyy') %></div>
		<% }) %>
	`;

	const multiDayTemplate = `
		<div>
			<% items.flat().forEach(day => { %>
				<div class="<%= day.classes %>">Day <%= format(day.date, 'D', {useAdditionalDayOfYearTokens: true}) %></div>
			<% }) %>
		</div>
	`;

	test('Rendering plain calendar', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneDayTemplate),
			pagination: {day: {size: 1}},
		});

		expect(screen.getByText('Day 18 in 2024')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
	});

	test('Programmatic navigation', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneDayTemplate),
			pagination: {day: {size: 1}},
		});

		clndr.setYear(2025);
		expect(screen.getByText('Day 18 in 2025')).toBeInTheDocument();

		clndr.setMonth(4);
		expect(screen.getByText('Day 138 in 2025')).toBeInTheDocument();

		clndr.setIntervalStart(new Date('1992-10-15'));
		expect(screen.getByText('Day 289 in 1992')).toBeInTheDocument();
	});

	test('Start and end constraints', async () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneDayTemplate),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			constraints: {
				start: new Date('1992-10-14'),
				end: new Date('1992-10-17'),
			},
			pagination: {day: {size: 1}},
			startOn: new Date('1992-10-15'),
		});
		expect(screen.getByText('Day 289 in 1992')).toBeInTheDocument();
		await user.click(screen.getByText('previous'));
		expect(screen.getByText('Day 288 in 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(1);
		await user.click(screen.getByText('previous'));
		expect(screen.getByText('Day 288 in 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(1);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('Day 289 in 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(2);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('Day 290 in 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(3);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('Day 291 in 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(4);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('Day 291 in 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(4);
	});

	test('Start date before start constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneDayTemplate),
			constraints: {
				start: new Date('1992-10-16'),
			},
			pagination: {day: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('Day 290 in 1992')).toBeInTheDocument();
	});

	test('End date after end constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneDayTemplate),
			constraints: {
				end: new Date('1992-10-14'),
			},
			pagination: {day: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('Day 288 in 1992')).toBeInTheDocument();
	});

	test('Click event handlers', async () => {
		const handleClick = jest.fn();
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneDayTemplate),
			clickEvents: {
				onClick: handleClick,
				onNavigate: handleNavigate,
			},
			pagination: {day: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		await user.click(screen.getByText('next'));
		await user.click(screen.getByText('previous'));

		expect(handleNavigate).toHaveBeenCalledTimes(2);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('1992-10-16')), end: endOfDay(new Date('1992-10-16'))},
			isBefore: false,
			isAfter: true,
			monthChanged: false,
			yearChanged: false,
			element: screen.getByText('next'),
		});

		expect(handleNavigate.mock.calls[1][0]).toEqual({
			interval: {start: startOfDay(new Date('1992-10-15')), end: endOfDay(new Date('1992-10-15'))},
			isBefore: true,
			isAfter: false,
			monthChanged: false,
			yearChanged: false,
			element: screen.getByText('previous'),
		});

		await user.click(screen.getByText('Day 289 in 1992'));

		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('1992-10-15'),
			events: [],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('Day 289 in 1992'),
		});

		await user.click(screen.getByText('Current day'));

		expect(handleNavigate).toHaveBeenCalledTimes(3);

		expect(handleNavigate.mock.calls[2][0]).toEqual({
			interval: {start: startOfDay(new Date('2024-01-18')), end: endOfDay(new Date('2024-01-18'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: true,
			element: screen.getByText('Current day'),
		});
	});

	test('Events', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneDayTemplate),
			events: [
				{date: '2024-01-17', title: 'event out of range'},
				{date: '2024-01-18', title: 'event on current page'},
				{date: '2024-01-29', title: 'event out of range'},
			],
			pagination: {day: {size: 1}},
		});

		expect(screen.getByText('Day 18 in 2024').classList.contains('event')).toBeTruthy();
	});

	test('Multiple days on one page', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiDayTemplate),
			pagination: {day: {size: 2}},
		});

		expect(screen.getByText('Day 18')).toBeInTheDocument();
		expect(screen.getByText('Day 19')).toBeInTheDocument();
		expect(container.querySelectorAll('.item').length).toBe(2);

		clndr.next();
		expect(screen.getByText('Day 20')).toBeInTheDocument();
		expect(screen.getByText('Day 21')).toBeInTheDocument();

		clndr.previous();
		expect(screen.getByText('Day 18')).toBeInTheDocument();
		expect(screen.getByText('Day 19')).toBeInTheDocument();
	});

	test('selectedDate option', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneDayTemplate),
			clickEvents: {
				onClick: handleClick,
			},
			pagination: {day: {size: 1}},
			selectedDate: '1992-10-15',
			trackSelectedDate: true,
		});

		expect(clndr.getSelectedDate()).toBeDefined();
		expect(clndr.getSelectedDate()?.toISOString()).toBe(new Date('1992-10-15').toISOString());
		await user.click(screen.getByText('Day 18 in 2024'));
		expect(clndr.getSelectedDate()?.toISOString()).toBe(new Date('2024-01-18').toISOString());
		expect(container.querySelector('.selected')).toBe(screen.getByText('Day 18 in 2024'));

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('2024-01-18'),
			events: [],
			selectedDateChanged: true,
			isToday: true,
			element: screen.getByText('Day 18 in 2024'),
		});
	});

	test('Click on a day while the identifier class is unexpectedly not assigned', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneDayTemplate),
			clickEvents: {
				onClick: handleClick,
			},
			pagination: {day: {size: 1}},
			trackSelectedDate: true,
		});

		const element = screen.getByText('Day 18 in 2024');
		expect(element instanceof Element).toBeTruthy();
		(element as Element).classList.remove('calendar-day-2024-01-18');
		await user.click(element as Element);

		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: undefined,
			events: [],
			selectedDateChanged: false,
			isToday: false,
			element: element,
		});
	});

});