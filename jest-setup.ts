import '@testing-library/jest-dom';
import ejs from 'ejs';
import userEvent from '@testing-library/user-event';
import type {ClndrTemplateData} from './src';

const defaultTemplate = `
	<div class="clndr-controls">
		<div class="clndr-control-button">
			<span class="clndr-previous-button" role="button">previous</span>
		</div>
		<div class="month"><%= format(month, 'MMMM') %> <%= interval.start.getFullYear() %></div>
		<div class="clndr-control-button">
			<span class="clndr-next-button" role="button">next</span>
		</div>
	</div>
	<table class="clndr-table">
		<thead>
			<tr class="header-days">
				<% for(let i = 0; i < daysOfTheWeek.length; i++) { %>
					<td class="header-day"><%= daysOfTheWeek[i] %></td>
				<% } %>
			</tr>
		</thead>
		<tbody>
			<% for(let i = 0; i < numberOfRows; i++){ %>
				<tr>
					<% for(let j = 0; j < 7; j++){ %>
						<% const d = j + i * 7; %>
						<td class="<%= items[d].classes %>">
							<div class="day-contents"><%= items[d].day %></div>
						</td>
					<% } %>
				</tr>
			<% } %>
		</tbody>
	</table>`;

globalThis.provideRender = (template?: string) => (data: ClndrTemplateData) => {
	return ejs.render(template || defaultTemplate, data);
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
		globalThis.clndr.destroy();
	}

	globalThis.container.remove();
});
