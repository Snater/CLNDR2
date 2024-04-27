import '@testing-library/jest-dom';
import {endOfDay, startOfDay} from 'date-fns';
import Clndr from '../Clndr';
import {screen} from '@testing-library/dom';

describe('DECADE view', () => {

	const oneDecadeTemplate = `
		<div><%= items[0].date.getFullYear() %> to <%= items[9].date.getFullYear() %></div>
		<div class="clndr-previous-button">previous</div>
		<div class="clndr-next-button">next</div>
		<div class="clndr-today-button">Current decade</div>
		<% items.forEach(year => { %>
			<div class="<%= year.classes %>"><%= format(year.date, 'yyyy') %></div>
		<% }); %>
	`;

	const multiDecadeTemplate = `
		<div>
			<% pages.forEach((decade, pageIndex) => { %>
				<div><%= decade.getFullYear() %> to <%= decade.getFullYear() + 9 %></div>
				<% items[pageIndex].forEach(year => { %>
					<div class="<%= year.classes %>"><%= format(year.date, 'yyyy') %></div>
				<% }) %>
			<% }) %>
		</div>
	`;

	test('Rendering plain calendar', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneDecadeTemplate),
			pagination: {decade: {size: 1}},
		});

		expect(screen.getByText('2020 to 2029')).toBeInTheDocument();
		expect(screen.getByText('2020')).toBeInTheDocument();
		expect(screen.getByText('2021')).toBeInTheDocument();
		expect(screen.getByText('2022')).toBeInTheDocument();
		expect(screen.getByText('2023')).toBeInTheDocument();
		expect(screen.getByText('2024')).toBeInTheDocument();
		expect(screen.getByText('2025')).toBeInTheDocument();
		expect(screen.getByText('2026')).toBeInTheDocument();
		expect(screen.getByText('2027')).toBeInTheDocument();
		expect(screen.getByText('2028')).toBeInTheDocument();
		expect(screen.getByText('2029')).toBeInTheDocument();
		expect(container.querySelector('.calendar-year-2020')).toBeInTheDocument();
		expect(container.querySelector('.calendar-year-2021')).toBeInTheDocument();
		expect(container.querySelector('.calendar-year-2022')).toBeInTheDocument();
		expect(container.querySelector('.calendar-year-2023')).toBeInTheDocument();
		expect(container.querySelector('.calendar-year-2024')).toBeInTheDocument();
		expect(container.querySelector('.calendar-year-2025')).toBeInTheDocument();
		expect(container.querySelector('.calendar-year-2026')).toBeInTheDocument();
		expect(container.querySelector('.calendar-year-2027')).toBeInTheDocument();
		expect(container.querySelector('.calendar-year-2028')).toBeInTheDocument();
		expect(container.querySelector('.calendar-year-2029')).toBeInTheDocument();
	});

	test('Programmatic navigation', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneDecadeTemplate),
			pagination: {decade: {size: 1}},
		});

		expect(screen.getByText('2020 to 2029')).toBeInTheDocument();

		clndr.setYear(2025);
		clndr.setMonth(4);
		// setMonth and setYear with a year in the same decade do of course not change the decade, but
		// need to check if the behaviour is indeed as expected.
		expect(screen.getByText('2020 to 2029')).toBeInTheDocument();

		clndr.setIntervalStart(new Date('1992-10-15'));
		expect(screen.getByText('1990 to 1999')).toBeInTheDocument();

		clndr.setYear(2000);
		expect(screen.getByText('2000 to 2009')).toBeInTheDocument();
	});

	test('Start and end constraints', async () => {
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneDecadeTemplate),
			clickEvents: {
				onNavigate: handleNavigate,
			},
			constraints: {
				start: new Date('1981'),
				end: new Date('2014'),
			},
			pagination: {decade: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('1990 to 1999')).toBeInTheDocument();
		await user.click(screen.getByText('previous'));
		expect(screen.getByText('1980 to 1989')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(1);
		await user.click(screen.getByText('previous'));
		expect(screen.getByText('1980 to 1989')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(1);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('1990 to 1999')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(2);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('2000 to 2009')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(3);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('2010 to 2019')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(4);
		await user.click(screen.getByText('next'));
		expect(screen.getByText('2010 to 2019')).toBeInTheDocument();
		expect(handleNavigate).toHaveBeenCalledTimes(4);
	});

	test('Start date before start constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneDecadeTemplate),
			constraints: {
				start: new Date('2003'),
			},
			pagination: {decade: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('2000 to 2009')).toBeInTheDocument();
	});

	test('End date after end constraint', async () => {
		clndr = new Clndr(container, {
			render: provideRender(oneDecadeTemplate),
			constraints: {
				end: new Date('1981'),
			},
			pagination: {decade: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('1980 to 1989')).toBeInTheDocument();
	});

	test('Click event handlers', async () => {
		const handleClick = jest.fn();
		const handleNavigate = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneDecadeTemplate),
			clickEvents: {
				onClick: handleClick,
				onNavigate: handleNavigate,
			},
			pagination: {decade: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		await user.click(screen.getByText('next'));
		await user.click(screen.getByText('previous'));

		expect(handleNavigate).toHaveBeenCalledTimes(2);

		expect(handleNavigate.mock.calls[0][0]).toEqual({
			interval: {start: startOfDay(new Date('2000-01-01')), end: endOfDay(new Date('2009-12-31'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: true,
			element: screen.getByText('next'),
		});

		expect(handleNavigate.mock.calls[1][0]).toEqual({
			interval: {start: startOfDay(new Date('1990-01-01')), end: endOfDay(new Date('1999-12-31'))},
			isBefore: true,
			isAfter: false,
			monthChanged: true,
			yearChanged: true,
			element: screen.getByText('previous'),
		});

		await user.click(screen.getByText('1994'));

		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('1994'),
			events: [],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('1994'),
		});

		await user.click(screen.getByText('Current decade'));

		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(handleNavigate).toHaveBeenCalledTimes(3);

		expect(handleNavigate.mock.calls[2][0]).toEqual({
			interval: {start: startOfDay(new Date('2020-01-01')), end: endOfDay(new Date('2029-12-31'))},
			isBefore: false,
			isAfter: true,
			monthChanged: true,
			yearChanged: true,
			element: screen.getByText('Current decade'),
		});
	});

	test('Events', () => {
		clndr = new Clndr(container, {
			render: provideRender(oneDecadeTemplate),
			events: [
				{date: '1981-10-15', title: 'event out of range'},
				{date: '1992-10-15', title: 'event on current page'},
				{date: '2003-10-15', title: 'event out of range'},
			],
			pagination: {decade: {size: 1}},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('1991').classList.contains('event')).toBeFalsy();
		expect(screen.getByText('1992').classList.contains('event')).toBeTruthy();
		expect(screen.getByText('1993').classList.contains('event')).toBeFalsy();
	});

	test('Multiple years on one page', () => {
		clndr = new Clndr(container, {
			render: provideRender(multiDecadeTemplate),
			pagination: {decade: {size: 2}},
			startOn: new Date('1992-10-15'),
		});

		expect(screen.getByText('1990 to 1999')).toBeInTheDocument();
		expect(screen.getByText('2000 to 2009')).toBeInTheDocument();
		expect(container.querySelectorAll('.item').length).toBe(20);

		clndr.forward();
		expect(screen.getByText('2010 to 2019')).toBeInTheDocument();
		expect(screen.getByText('2020 to 2029')).toBeInTheDocument();

		clndr.back();
		expect(screen.getByText('1990 to 1999')).toBeInTheDocument();
		expect(screen.getByText('2000 to 2009')).toBeInTheDocument();
	});

	test('selectedDate option', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneDecadeTemplate),
			clickEvents: {
				onClick: handleClick,
			},
			pagination: {decade: {size: 1}},
			selectedDate: '2025',
			trackSelectedDate: true,
		});

		expect(clndr.getSelectedDate()).toBeDefined();
		expect(container.querySelector('.selected')).toBe(screen.getByText('2025'));
		expect(clndr.getSelectedDate()?.toISOString()).toBe(new Date('2025').toISOString());
		await user.click(screen.getByText('2023'));
		expect(clndr.getSelectedDate()?.toISOString()).toBe(new Date('2023').toISOString());
		expect(container.querySelector('.selected')).toBe(screen.getByText('2023'));

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: new Date('2023'),
			events: [],
			selectedDateChanged: true,
			isToday: false,
			element: screen.getByText('2023'),
		});
	});

	test('Click on a year while the identifier class is unexpectedly not assigned', async () => {
		const handleClick = jest.fn();

		clndr = new Clndr(container, {
			render: provideRender(oneDecadeTemplate),
			clickEvents: {
				onClick: handleClick,
			},
			pagination: {decade: {size: 1}},
			trackSelectedDate: true,
		});

		const yearElement = screen.getByText('2026');
		expect(yearElement instanceof Element).toBeTruthy();
		(yearElement as Element).classList.remove('calendar-year-2026');
		await user.click(yearElement as Element);

		expect(handleClick).toHaveBeenCalledTimes(1);

		expect(handleClick.mock.calls[0][0]).toEqual({
			date: undefined,
			events: [],
			selectedDateChanged: false,
			isToday: false,
			element: yearElement,
		});
	});

});