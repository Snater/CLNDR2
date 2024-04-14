import {
	addDays,
	addMonths,
	differenceInDays,
	eachYearOfInterval,
	endOfDay,
	endOfMonth,
	getDay,
	getMonth,
	getYear,
	isAfter,
	isBefore,
	setMonth,
	setYear,
	startOfDay,
	startOfMonth,
	subDays,
	subMonths,
} from 'date-fns';
import DayBasedAdapter from './DayBasedAdapter';
import type {
	Adjacent,
	ClndrEvent,
	ClndrItem,
	ClndrTemplateData,
	InternalClndrEvent,
	Interval,
	PageDates,
	Scope,
} from './types';

export type TargetOption = 'switchMonthButton'

export default class MonthAdapter extends DayBasedAdapter {

	protected static scope: Scope = 'month';

	static targets: Record<TargetOption, string> = {
		switchMonthButton: 'clndr-switch-month-button',
	}

	static eventListener(element: HTMLElement, callback: (scope: Scope) => void) {
		if (element.closest('.' + MonthAdapter.targets.switchMonthButton)) {
			callback('month');
		}
	}

	initInterval(startOn?: Date): Interval {
		const start = startOfMonth(startOn || new Date());

		// Subtract a day so that we are at the end of the interval. We always want intervalEnd to be
		// inclusive.
		const end = subDays(addMonths(start, this.options.pageSize), 1);
		return {start, end};
	}

	initStartConstraint(constraintStart: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = {start: interval.start, end: interval.end};

		if (isBefore(adjustedInterval.start, subMonths(constraintStart, 1))) {
			adjustedInterval.start = startOfMonth(constraintStart);
		}

		if (isBefore(adjustedInterval.end, subMonths(constraintStart, 1))) {
			adjustedInterval.end = endOfMonth(constraintStart);
		}

		return adjustedInterval;
	}

	initEndConstraint(constraintEnd: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = {start: interval.start, end: interval.end};

		if (isAfter(adjustedInterval.end, addMonths(constraintEnd, 1))) {
			adjustedInterval.end = endOfMonth(constraintEnd);
		}

		if (isAfter(adjustedInterval.start, addMonths(constraintEnd, 1))) {
			adjustedInterval.start = startOfMonth(constraintEnd);
		}

		return adjustedInterval;
	}

	aggregateAdjacentScopeEvents(
		interval: Interval,
		events: InternalClndrEvent[]
	): [InternalClndrEvent[], InternalClndrEvent[]] {
		if (!this.options.showAdjacent) {
			return [[], []];
		}

		const startOfLastMonth = startOfMonth(subMonths(interval.start, 1));
		const endOfLastMonth = endOfMonth(startOfLastMonth);
		const startOfNextMonth = startOfMonth(addMonths(interval.end, 1));
		const endOfNextMonth = endOfMonth(startOfNextMonth);

		const eventsPreviousMonth = events.filter(event => {
			const beforeStart = isBefore(event.clndrInterval.end, startOfLastMonth);
			const afterEnd = isAfter(event.clndrInterval.start, endOfLastMonth);

			return !(beforeStart || afterEnd);
		});

		const eventsNextMonth = events.filter(event => {
			const beforeStart = isBefore(event.clndrInterval.end, startOfNextMonth);
			const afterEnd = isAfter(event.clndrInterval.start, endOfNextMonth);

			return !(beforeStart || afterEnd);
		});

		return [eventsPreviousMonth, eventsNextMonth];
	}

	aggregateScopeItems(interval: Interval, weekOffset: number): PageDates {
		const daysOfPreviousMonth = this.aggregateDaysOfPreviousMonth(interval.start, weekOffset);
		const daysOfCurrentMonth = this.aggregateDaysOfCurrentPage(interval);

		return [
			daysOfPreviousMonth,
			daysOfCurrentMonth,
			this.aggregateDaysOfNextMonth(
				interval.end,
				weekOffset,
				daysOfPreviousMonth.length + daysOfCurrentMonth.length
			),
		]
	}

	aggregateDaysOfCurrentPage(interval: Interval): Date[] {
		const days: Date[] = [];
		for (let i = 0; i <= differenceInDays(interval.end, interval.start); i++) {
			days.push(addDays(interval.start, i));
		}
		return days;
	}

	aggregateDaysOfPreviousMonth(startDate: Date, weekOffset: number): Date[] {
		const days: Date[] = [];

		// If greater than 0, the last days of the previous month have to be filled in to account for
		// the empty boxes in the grid, also taking the weekOffset into account.
		let remainingDaysOfPreviousMonth = getDay(startDate) - weekOffset;

		// The weekOffset points to a day in the previous month
		if (remainingDaysOfPreviousMonth < 0) {
			remainingDaysOfPreviousMonth += 7;
		}

		if (remainingDaysOfPreviousMonth <= 0) {
			return days;
		}

		for (let i = remainingDaysOfPreviousMonth; i > 0; i--) {
			days.push(subDays(startDate, i));
		}

		return days;
	}

	aggregateDaysOfNextMonth(endDate: Date, weekOffset: number, numberOfDays: number): Date[] {
		const days: Date[] = [];
		const remainingDaysOfNextMonth = 7 - getDay(endDate) + weekOffset - 1;

		for (let i = 1; i <= remainingDaysOfNextMonth; i++) {
			days.push(addDays(endDate, i));
		}

		// Add another row if needed when forcing six rows (42 is 6 rows of 7 days)
		const remainingDaysForSixRows = 42 - (numberOfDays + days.length);

		if (this.options.forceSixRows) {
			for (let i = 1; i <= remainingDaysForSixRows; i++) {
				days.push(addDays(endDate, remainingDaysOfNextMonth + i));
			}
		}

		return days;
	}

	isAdjacent(itemInterval: Interval, interval: Interval): Adjacent {
		if (getMonth(interval.start) > getMonth(itemInterval.end)) {
			return getYear(interval.start) >= getYear(itemInterval.end) ? 'before' : 'after';
		} else if (getMonth(interval.start) < getMonth(itemInterval.start)) {
			return getYear(interval.start) <= getYear(itemInterval.start) ? 'after' : 'before';
		}
		return null;
	}

	getIntervalForDate(date: Date): Interval {
		return {start: startOfDay(date), end: endOfDay(date)};
	}

	setDay(day: Date): Interval {
		const start = startOfMonth(day);
		return {start, end: endOfMonth(subDays(addMonths(start, this.options.pageSize), 1))};
	}

	setMonth(newMonth: number, interval: Interval): Interval {
		const start = startOfMonth(setMonth(interval.start, newMonth));
		return {start, end: endOfMonth(subDays(addMonths(start, this.options.pageSize), 1))};
	}

	setYear(newYear: number, interval: Interval): Interval {
		const start = setYear(interval.start, newYear);
		return {start, end: endOfMonth(subDays(addMonths(start, this.options.pageSize), 1))};
	}

	back(interval: Interval, step?: number): Interval {
		const start = startOfMonth(subMonths(interval.start, step ?? this.options.pageSize));
		return {start, end: endOfMonth(subDays(addMonths(start, this.options.pageSize), 1))};
	}

	forward(interval: Interval, step?: number): Interval {
		const start = startOfMonth(addMonths(interval.start, step ?? this.options.pageSize));
		return {start, end: endOfMonth(subDays(addMonths(start, this.options.pageSize), 1))};
	}

	flushTemplateData(
		data: ClndrTemplateData,
		createDaysObject: (interval: Interval) => ClndrItem[],
		events: [InternalClndrEvent[], InternalClndrEvent[], InternalClndrEvent[]],
		pageSize: number
	): ClndrTemplateData {

		data.years = eachYearOfInterval(data.interval);
		data.items = [] as ClndrItem[][];
		const currentPageEvents: ClndrEvent[][] = [];
		data.months = [];

		for (let i = 0; i < pageSize; i++) {
			const currentIntervalStart = addMonths(data.interval.start, i);
			const currentIntervalEnd = endOfMonth(currentIntervalStart);

			data.months.push(currentIntervalStart);

			data.items.push(
				createDaysObject.apply(this, [{start: currentIntervalStart, end: currentIntervalEnd}])
			);

			// Save events processed for each month into a master array of events for this interval
			currentPageEvents.push(
				events[1].filter(event => {
					const beforeStart = isBefore(event.clndrInterval.end, currentIntervalStart);
					const afterEnd = isAfter(event.clndrInterval.start, currentIntervalEnd);

					return !(beforeStart || afterEnd);
				}).map(event => event.originalEvent)
			);
		}

		data.events.currentPage = currentPageEvents;

		// Get the total number of rows across all months
		data.months.forEach((_, i) => {
			data.numberOfRows += Math.ceil((data.items[i] as ClndrItem[]).length / 7);
		});

		data.events.previousScope = events[0].map(event => event.originalEvent);
		data.events.nextScope = events[2].map(event => event.originalEvent);

		if (pageSize > 1) {
			return data;
		}

		data.events.currentPage = data.events.currentPage[0];
		data.items = data.items[0];

		return data;
	}
}