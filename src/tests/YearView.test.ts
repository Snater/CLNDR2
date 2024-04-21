import '@testing-library/jest-dom';
import {endOfDay, startOfDay} from 'date-fns';
import Clndr from '../Clndr';
import {screen} from '@testing-library/dom';

describe('YEAR view', () => {

	const oneYearTemplate = `
		<div><%= year.getFullYear() %></div>
		<div class="clndr-previous-button">previous</div>
		<div class="clndr-next-button">next</div>
		<div class="clndr-today-button">Current year</div>
		<% items.forEach(month => { %>
			<div class="<%= month.classes %>"><%= format(month.date, 'MMMM') %></div>
		<% }) %>
	`;

	const multiYearTemplate = `
		<div>
			<% years.forEach((year, yearIndex) => { %>
				<div><%= year.getFullYear() %></div>
				<% items[yearIndex].forEach(month => { %>
					<div class="<%= month.classes %>"><%= format(month.date, 'MMMM') %></div>
				<% }) %>
			<% }) %>
		</div>
	`;

	test('Rendering plain calendar', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			pagination: {year: {size: 1}},
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
			pagination: {year: {size: 1}},
		});

		expect(screen.getByText('2024')).toBeInTheDocument();
		clndr.setMonth(4);
		// setMonth does of course not change the year, but need to check if the behaviour is indeed as
		// expected when calling setMonth.
		expect(screen.getByText('2024')).toBeInTheDocument();

		clndr.setIntervalStart(new Date('1992-10-15'));
		expect(screen.getByText('1992')).toBeInTheDocument();

		clndr.setYear(2000);
		expect(screen.getByText('2000')).toBeInTheDocument();
	});

	test('Start and end constraints', async () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			constraints: {
				start: new Date('1991'),
				end: new Date('1994'),
			},
			pagination: {year: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		await user.click(screen.getByText('previous'));
		expect(screen.getByText('1991')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(1);
		await user.click(screen.getByText('previous'));
		expect(screen.getByText('1991')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(1);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('1992')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(2);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('1993')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(3);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('1994')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(4);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('1994')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(4);
	});

	test('Start date before start constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			constraints: {
				start: new Date('1993'),
			},
			pagination: {year: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('1993')).toBeInTheDocument();
	});

	test('End date date after end constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			constraints: {
				end: new Date('1991'),
			},
			pagination: {year: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('1991')).toBeInTheDocument();
	});

	test('Click event handlers', async () => {
		const handleClick = jest.fn();
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			clickEvents: {
				onClick: handleClick,
				onNavigate: handleNavigate,
			},
			pagination: {year: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		await user.click(screen.getByText('next'));
		await user.click(screen.getByText('previous'));

		expect(handleNavigate).toHaveBeenCalledTimes(2);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('1993-01-01')), end: endOfDay(new Date('1993-12-31'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: true,
			element: screen.getByText('next'),
		});

		expect(handleNavigate.mock.calls[1][0]).toEqual({
			interval: {start: startOfDay(new Date('1992-01-01')), end: endOfDay(new Date('1992-12-31'))},
			isBefore: true,
			isAfter: false,
			monthChanged: true,
			yearChanged: true,
			element: screen.getByText('previous'),
		});

		await user.click(screen.getByText('July'));

		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('1992-07'),
			events: [],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('July'),
		});

		await user.click(screen.getByText('Current year'));

		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(handleNavigate).toHaveBeenCalledTimes(3);

		expect(handleNavigate.mock.calls[2][0]).toEqual({
			interval: {start: startOfDay(new Date('2024-01-01')), end: endOfDay(new Date('2024-12-31'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: true,
			element: screen.getByText('Current year'),
		});
	});

	test('Events', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			events: [
				{date: '1991-10-15', title: 'event out of range'},
				{date: '1992-10-15', title: 'event on current page'},
				{date: '1993-10-15', title: 'event out of range'},
			],
			pagination: {year: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('September').classList.contains('event')).toBeFalsy();
		expect(screen.getByText('October').classList.contains('event')).toBeTruthy();
		expect(screen.getByText('November').classList.contains('event')).toBeFalsy();
	});

	test('Multiple years on one page', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiYearTemplate),
			pagination: {year: {size: 2}},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('1992')).toBeInTheDocument();
		expect(screen.getByText('1993')).toBeInTheDocument();
		expect(container.querySelectorAll('.item').length).toBe(24);
	});

	test('Click on a month while the identifier class is unexpectedly not assigned', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneYearTemplate),
			clickEvents: {
				onClick: handleClick,
			},
			pagination: {year: {size: 1}},
			trackSelectedDate: true,
		});

		const monthElement = screen.getByText('October');
		expect(monthElement instanceof Element).toBeTruthy();
		(monthElement as Element).classList.remove('calendar-month-2024-10');
		await user.click(monthElement as Element);

		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: undefined,
			events: [],
			selectedDateChanged: false,
			isToday: false,
			element: monthElement,
		});
	});

});