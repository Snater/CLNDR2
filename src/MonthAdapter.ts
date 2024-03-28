import {
	addDays,
	addMonths,
	differenceInDays,
	endOfDay,
	endOfMonth,
	format,
	getDay,
	getMonth,
	getYear,
	isAfter,
	isBefore,
	setMonth, startOfDay,
	startOfMonth,
	subDays,
	subMonths,
} from 'date-fns';
import {Adapter} from './Adapter';
import type {
	Adjacent,
	ClndrEvent,
	ClndrItem,
	ClndrTemplateData,
	InternalClndrEvent,
	Interval,
	PageDates,
} from './types';

export class MonthAdapter extends Adapter {

	initInterval(startOn?: Date): Interval {
		const start = startOfMonth(startOn || new Date());

		// Subtract a day so that we are at the end of the interval. We always want intervalEnd to be
		// inclusive.
		const end = subDays(addMonths(start, this.options.pageSize), 1);
		return [start, end];
	}

	initStartConstraint(constraintStart: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = [interval[0], interval[1]];

		if (isBefore(adjustedInterval[0], subMonths(constraintStart, 1))) {
			adjustedInterval[0] = startOfMonth(constraintStart);
		}

		if (isBefore(adjustedInterval[1], subMonths(constraintStart, 1))) {
			adjustedInterval[1] = endOfMonth(constraintStart);
		}

		return adjustedInterval;
	}

	initEndConstraint(constraintEnd: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = [interval[0], interval[1]];

		if (isAfter(adjustedInterval[1], addMonths(constraintEnd, 1))) {
			adjustedInterval[1] = endOfMonth(constraintEnd);
		}

		if (isAfter(adjustedInterval[0], addMonths(constraintEnd, 1))) {
			adjustedInterval[0] = startOfMonth(constraintEnd);
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

		const startOfLastMonth = startOfMonth(subMonths(interval[0], 1));
		const endOfLastMonth = endOfMonth(startOfLastMonth);
		const startOfNextMonth = startOfMonth(addMonths(interval[1], 1));
		const endOfNextMonth = endOfMonth(startOfNextMonth);

		const eventsPreviousMonth = events.filter(event => {
			const beforeStart = isBefore(event._clndrEndDateObject, startOfLastMonth);
			const afterEnd = isAfter(event._clndrStartDateObject, endOfLastMonth);

			return !(beforeStart || afterEnd);
		});

		const eventsNextMonth = events.filter(event => {
			const beforeStart = isBefore(event._clndrEndDateObject, startOfNextMonth);
			const afterEnd = isAfter(event._clndrStartDateObject, endOfNextMonth);

			return !(beforeStart || afterEnd);
		});

		return [eventsPreviousMonth, eventsNextMonth];
	}

	aggregateScopeItems(interval: Interval, weekOffset: number): PageDates {
		return [
			this.aggregateDaysOfPreviousMonth(interval[0], weekOffset),
			this.aggregateDaysOfCurrentPage(interval),
			this.aggregateDaysOfNextMonth(interval[1], weekOffset),
		]
	}

	aggregateDaysOfCurrentPage(interval: Interval): Date[] {
		const days: Date[] = [];
		for (let i = 0; i <= differenceInDays(interval[1], interval[0]); i++) {
			days.push(addDays(interval[0], i));
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

	aggregateDaysOfNextMonth(endDate: Date, weekOffset: number): Date[] {
		const days: Date[] = [];
		const remainingDaysOfNextMonth = 7 - getDay(endDate) + weekOffset - 1;

		for (let i = 1; i <= remainingDaysOfNextMonth; i++) {
			days.push(addDays(endDate, i));
		}

		// Add another row if needed when forcing six rows (42 is 6 rows of 7 days)
		const remainingDaysForSixRows = 42 - days.length;

		if (this.options.forceSixRows) {
			for (let i = 1; i <= remainingDaysForSixRows; i++) {
				days.push(addDays(endDate, remainingDaysOfNextMonth + i));
			}
		}

		return days;
	}

	isAdjacent(itemInterval: Interval, interval: Interval): Adjacent {
		if (getMonth(interval[0]) > getMonth(itemInterval[1])) {
			return getYear(interval[0]) >= getYear(itemInterval[1]) ? 'before' : 'after';
		} else if (getMonth(interval[0]) < getMonth(itemInterval[0])) {
			return getYear(interval[0]) <= getYear(itemInterval[0]) ? 'after' : 'before';
		}
		return null;
	}

	getIntervalForDate(date: Date): Interval {
		return [startOfDay(date), endOfDay(date)];
	}

	getIdClasses(interval: Interval): string[] {
		return [
			`calendar-day-${format(interval[0], 'yyyy-MM-dd')}`,
			// Day of week
			`calendar-dow-${getDay(interval[0])}`,
		];
	}

	setDay(day: Date): Interval {
		const start = startOfMonth(day);
		return [start, endOfMonth(subDays(addMonths(start, this.options.pageSize), 1))];
	}

	setMonth(newMonth: number, interval: Interval): Interval {
		const start = startOfMonth(setMonth(interval[0], newMonth));
		return [start, endOfMonth(subDays(addMonths(start, this.options.pageSize), 1))];
	}

	back(interval: Interval, step: number): Interval {
		const start = startOfMonth(subMonths(interval[0], step));
		return [start, endOfMonth(subDays(addMonths(start, this.options.pageSize), 1))];
	}

	forward(interval: Interval, step: number): Interval {
		const start = startOfMonth(addMonths(interval[0], step));
		return [start, endOfMonth(subDays(addMonths(start, this.options.pageSize), 1))];
	}

	flushTemplateData(
		data: ClndrTemplateData,
		createDaysObject: (interval: Interval) => ClndrItem[],
		events: [InternalClndrEvent[], InternalClndrEvent[], InternalClndrEvent[]],
		pageSize: number
	): ClndrTemplateData {

		data.month = data.interval[0];
		data.items = [] as ClndrItem[][];
		const currentPageEvents: ClndrEvent[][] = [];
		data.months = [];

		for (let i = 0; i < pageSize; i++) {
			const currentIntervalStart = addMonths(data.interval[0], i);
			const currentIntervalEnd = endOfMonth(currentIntervalStart);

			data.months.push(currentIntervalStart);

			data.items.push(createDaysObject.apply(this, [[currentIntervalStart, currentIntervalEnd]]));

			// Save events processed for each month into a master array of events for this interval
			currentPageEvents.push(
				events[1].filter(event => {
					const beforeStart = isBefore(event._clndrEndDateObject, currentIntervalStart);
					const afterEnd = isAfter(event._clndrStartDateObject, currentIntervalEnd);

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