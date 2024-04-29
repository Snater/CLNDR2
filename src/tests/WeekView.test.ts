import '@testing-library/jest-dom';
import {endOfDay, startOfDay} from 'date-fns';
import Clndr from '../Clndr';
import {screen} from '@testing-library/dom';

describe('WEEK view', () => {

	const oneWeekTemplate = `
		<div>Week <%= format(interval.start, 'w') %> in <%= format(interval.start, 'yyyy') %></div>
		<div class="clndr-previous-button">previous</div>
		<div class="clndr-next-button">next</div>
		<div class="clndr-today-button">Current week</div>
		<% items.forEach(day => { %>
			<div class="<%= day.classes %>"><%= format(day.date, 'd') %></div>
		<% }) %>
	`;

	const multiWeekTemplate = `
		<div>
			<% pages.forEach((week, pageIndex) => { %>
				<div>Week <%= format(week, 'w') %></div>
				<% items[pageIndex].forEach(day => { %>
					<div class="<%= day.classes %>"><%= format(day.date, 'd') %></div>
				<% }) %>
			<% }) %>
		</div>
	`;

	test('Rendering plain calendar', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {week: {size: 1}},
		});

		expect(screen.getByText('Week 3 in 2024')).toBeInTheDocument();
		expect(screen.getByText('14')).toBeInTheDocument();
		expect(screen.getByText('15')).toBeInTheDocument();
		expect(screen.getByText('16')).toBeInTheDocument();
		expect(screen.getByText('17')).toBeInTheDocument();
		expect(screen.getByText('18')).toBeInTheDocument();
		expect(screen.getByText('19')).toBeInTheDocument();
		expect(screen.getByText('20')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-2024-01-14')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-2024-01-15')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-2024-01-16')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-2024-01-17')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-2024-01-18')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-2024-01-19')).toBeInTheDocument();
		expect(container.querySelector('.calendar-day-2024-01-20')).toBeInTheDocument();
	});

	test('Programmatic navigation', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			pagination: {week: {size: 1}},
		});

		clndr.setYear(2025);
		expect(screen.getByText('Week 3 in 2025')).toBeInTheDocument();

		clndr.setMonth(4);
		expect(screen.getByText('Week 20 in 2025')).toBeInTheDocument();

		clndr.setIntervalStart(new Date('1992-10-15'));
		expect(screen.getByText('Week 42 in 1992')).toBeInTheDocument();
	});

	test('Start and end constraints', async () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			constraints: {
				start: new Date('1992-10-07'),
				end: new Date('1992-10-31'),
			},
			pagination: {week: {size: 1}},
			startOn: '1992-10-15',
		});

		expect(screen.getByText('Week 42 in 1992')).toBeInTheDocument();
		await user.click(screen.getByText('previous'));
		expect(screen.getByText('Week 41 in 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(1);
		await user.click(screen.getByText('previous'));
		expect(screen.getByText('Week 41 in 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(1);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('Week 42 in 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(2);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('Week 43 in 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(3);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('Week 44 in 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(4);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('Week 44 in 1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(4);
	});

	test('Start date before start constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			constraints: {
				start: new Date('1992-11-15'),
			},
			pagination: {week: {size: 1}},
			startOn: '1992-10-15',
		});

		expect(screen.getByText('Week 47 in 1992')).toBeInTheDocument();
	});

	test('End date after end constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			constraints: {
				end: new Date('1992-09-15'),
			},
			pagination: {week: {size: 1}},
			startOn: '1992-10-15',
		});

		expect(screen.getByText('Week 38 in 1992')).toBeInTheDocument();
	});

	test('Click event handlers', async () => {
		const handleClick = jest.fn();
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			clickEvents: {
				onClick: handleClick,
				onNavigate: handleNavigate,
			},
			pagination: {week: {size: 1}},
			startOn: '1992-10-15',
		});

		await user.click(screen.getByText('next'));
		await user.click(screen.getByText('previous'));

		expect(handleNavigate).toHaveBeenCalledTimes(2);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('1992-10-18')), end: endOfDay(new Date('1992-10-24'))},
			isBefore: false,
			isAfter: true,
			monthChanged: false,
			yearChanged: false,
			element: screen.getByText('next'),
		});

		expect(handleNavigate.mock.calls[1][0]).toEqual({
			interval: {start: startOfDay(new Date('1992-10-11')), end: endOfDay(new Date('1992-10-17'))},
			isBefore: true,
			isAfter: false,
			monthChanged: false,
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

		await user.click(screen.getByText('Current week'));

		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(handleNavigate).toHaveBeenCalledTimes(3);

		expect(handleNavigate.mock.calls[2][0]).toEqual({
			interval: {start: startOfDay(new Date('2024-01-14')), end: endOfDay(new Date('2024-01-20'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: true,
			element: screen.getByText('Current week'),
		});
	});

	test('Events', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			events: [
				{date: '2024-01-12', title: 'event out of range'},
				{date: '2024-01-18', title: 'event on current page'},
				{date: '2024-01-25', title: 'event out of range'},
			],
			pagination: {week: {size: 1}},
		});

		expect(screen.getByText('17').classList.contains('event')).toBeFalsy();
		expect(screen.getByText('18').classList.contains('event')).toBeTruthy();
		expect(screen.getByText('19').classList.contains('event')).toBeFalsy();
	});

	test('Multiple weeks on one page', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiWeekTemplate),
			pagination: {week: {size: 2}},
		});

		expect(screen.getByText('Week 3')).toBeInTheDocument();
		expect(screen.getByText('Week 4')).toBeInTheDocument();
		expect(container.querySelectorAll('.item').length).toBe(14);

		clndr.next();
		expect(screen.getByText('Week 5')).toBeInTheDocument();
		expect(screen.getByText('Week 6')).toBeInTheDocument();

		clndr.previous();
		expect(screen.getByText('Week 3')).toBeInTheDocument();
		expect(screen.getByText('Week 4')).toBeInTheDocument();
	});

	test('selectedDate option', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			clickEvents: {
				onClick: handleClick,
			},
			pagination: {week: {size: 1}},
			selectedDate: '2024-01-19',
			trackSelectedDate: true,
		});

		expect(clndr.getSelectedDate()).toBeDefined();
		expect(container.querySelector('.selected')).toBe(screen.getByText('19'));
		expect(clndr.getSelectedDate()?.toISOString()).toBe(new Date('2024-01-19').toISOString());
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

	test('Click on a day while the identifier class is unexpectedly not assigned', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneWeekTemplate),
			clickEvents: {
				onClick: handleClick,
			},
			pagination: {week: {size: 1}},
			trackSelectedDate: true,
		});

		const element = screen.getByText('18');
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