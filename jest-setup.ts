import '@testing-library/jest-dom';
import ejs from 'ejs';
import userEvent from '@testing-library/user-event';
import type {ClndrTemplateData} from './src';

globalThis.defaultTemplate = `
	<div>
		<div class="clndr-previous-button">previous</div>
		<div><%= format(interval.start, 'MM/dd') %> - <%= format(interval.end, 'MM/dd') %></div>
		<div><%= format(interval.start, 'MMMM') %> <%= interval.start.getFullYear() %></div>
		<div class="clndr-next-button">next</div>
	</div>
	<div>
		<% daysOfTheWeek.forEach(dayOfTheWeek => { %>
			<div class="header-day"><%= dayOfTheWeek %></div>
		<% }) %>
	</div>
	<div>
		<% items.forEach(day => { %>
			<div class="<%= day.classes %>"><%= day.date?.getDate() %></div>
		<% }) %>
	</div>
	<div class="clndr-today-button">Today</div>`;

globalThis.provideRender = (template?: string) => (data: ClndrTemplateData) => {
	return ejs.render(template || globalThis.defaultTemplate, data);
}

globalThis.clndr = null;

beforeAll(() => {
	jest.useFakeTimers({now: new Date(2024, 0, 18, 12)});
	jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-18T12:00:00.000Z').valueOf());
	globalThis.user = userEvent.setup({delay: null});
});

afterAll(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
})

beforeEach(() => {
	globalThis.container = document.createElement('div');
	document.body.appendChild(globalThis.container);
});

afterEach(() => {
	if (globalThis.clndr) {
		globalThis.clndr = null;
	}

	globalThis.container.remove();
});
