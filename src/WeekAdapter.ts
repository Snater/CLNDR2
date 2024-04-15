import {
	addDays,
	addWeeks,
	differenceInDays,
	eachMonthOfInterval,
	eachWeekOfInterval,
	eachYearOfInterval,
	endOfDay,
	endOfWeek,
	isAfter,
	isBefore,
	setDay,
	setMonth,
	setYear,
	startOfDay,
	startOfWeek,
	subWeeks,
} from 'date-fns';
import DayBasedAdapter from './DayBasedAdapter';
import type {
	Adjacent,
	ClndrItem,
	ClndrTemplateData,
	InternalClndrEvent,
	Interval,
	PageDates,
	Scope,
} from './types';

export default class WeekAdapter extends DayBasedAdapter {

	static scope: Scope = 'week';

	initInterval(startOn?: Date): Interval {
		const start = startOfWeek(
			startOn ? startOn : setDay(new Date(), this.options.weekOffset),
			{weekStartsOn: this.options.weekOffset}
		);
		const end = endOfWeek(
			addWeeks(start, this.options.pageSize - 1),
			{weekStartsOn: this.options.weekOffset}
		);

		return {start, end};
	}

	initStartConstraint(constraintStart: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = {start: interval.start, end: interval.end};

		if (isBefore(adjustedInterval.start, subWeeks(constraintStart, 1))) {
			adjustedInterval.start = startOfWeek(constraintStart);
		}

		adjustedInterval.end = endOfWeek(
			addWeeks(adjustedInterval.start, this.options.pageSize - 1),
			{weekStartsOn: this.options.weekOffset}
		);

		return adjustedInterval;
	}

	initEndConstraint(constraintEnd: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = {start: interval.start, end: interval.end};

		if (isAfter(adjustedInterval.start, addWeeks(constraintEnd, 1))) {
			adjustedInterval.start = startOfWeek(
				subWeeks(
					endOfWeek(constraintEnd, {weekStartsOn: this.options.weekOffset}),
					this.options.pageSize - 1
				),
				{weekStartsOn: this.options.weekOffset}
			);
			adjustedInterval.end = endOfWeek(constraintEnd, {weekStartsOn: this.options.weekOffset});
		}

		return adjustedInterval;
	}

	aggregateAdjacentScopeEvents(): [InternalClndrEvent[], InternalClndrEvent[]] {
		return [[], []];
	}

	aggregateScopeItems(interval: Interval): PageDates {
		const days: Date[] = [];
		for (let i = 0; i <= differenceInDays(interval.end, interval.start); i++) {
			days.push(addDays(interval.start, i));
		}
		return [[], days, []];
	}

	isAdjacent(): Adjacent {
		return null;
	}

	getIntervalForDate(date: Date): Interval {
		return {start: startOfDay(date), end: endOfDay(date)};
	}

	setDay(day: Date): Interval {
		const start = startOfWeek(day, {weekStartsOn: this.options.weekOffset});
		const end = endOfWeek(
			addWeeks(start, this.options.pageSize - 1),
			{weekStartsOn: this.options.weekOffset}
		);

		return {start, end};
	}

	setMonth(newMonth: number, interval: Interval): Interval {
		const start = startOfWeek(
			setMonth(interval.start, newMonth),
			{weekStartsOn: this.options.weekOffset}
		);
		const end = endOfWeek(
			addWeeks(start, this.options.pageSize - 1),
			{weekStartsOn: this.options.weekOffset}
		);

		return {start, end};
	}

	setYear(newYear: number, interval: Interval): Interval {
		const start = startOfWeek(
			setYear(interval.start, newYear),
			{weekStartsOn: this.options.weekOffset}
		);
		const end = endOfWeek(
			addWeeks(start, this.options.pageSize - 1),
			{weekStartsOn: this.options.weekOffset}
		);

		return {start, end};
	}

	back(interval: Interval, step?: number): Interval {
		const start = startOfWeek(
			subWeeks(interval.start, step ?? this.options.pageSize),
			{weekStartsOn: this.options.weekOffset}
		);
		const end = endOfWeek(
			addWeeks(start, this.options.pageSize - 1),
			{weekStartsOn: this.options.weekOffset}
		);

		return {start, end};
	}

	forward(interval: Interval, step?: number): Interval {
		const start = startOfWeek(
			addWeeks(interval.start, step ?? this.options.pageSize),
			{weekStartsOn: this.options.weekOffset}
		);
		const end = endOfWeek(
			addWeeks(start, this.options.pageSize - 1),
			{weekStartsOn: this.options.weekOffset}
		);

		return {start, end};
	}

	flushTemplateData(
		data: ClndrTemplateData,
		createDaysObject: (interval: Interval) => ClndrItem[],
		events: [InternalClndrEvent[], InternalClndrEvent[], InternalClndrEvent[]]
	): ClndrTemplateData {

		data.weeks = eachWeekOfInterval(data.interval);
		data.months = eachMonthOfInterval(data.interval);
		data.years = eachYearOfInterval(data.interval);
		data.items = createDaysObject.apply(this, [data.interval]);
		data.numberOfRows = Math.ceil(data.items.length / 7);
		data.events.currentPage = events[1].map(event => event.originalEvent);

		return data;
	}
}