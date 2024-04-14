import {
	addDays,
	addWeeks,
	differenceInDays,
	eachMonthOfInterval,
	eachYearOfInterval,
	endOfDay,
	endOfWeek,
	getDay,
	isAfter,
	isBefore,
	setDay,
	setMonth,
	setYear,
	startOfDay,
	startOfWeek,
	subDays,
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

export default class DayAdapter extends DayBasedAdapter {

	static scope: Scope = 'day';

	initInterval(startOn?: Date): Interval {
		const start = startOfDay(startOn ? startOn : setDay(new Date(), this.options.weekOffset));
		const end = endOfDay(addDays(start, this.options.pageSize - 1));

		return {start, end};
	}

	initStartConstraint(constraintStart: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = {start: interval.start, end: interval.end};

		if (isBefore(adjustedInterval.start, subWeeks(constraintStart, 1))) {
			adjustedInterval.start = startOfWeek(constraintStart);
		}

		adjustedInterval.end = endOfDay(addDays(adjustedInterval.start, this.options.pageSize - 1));

		return adjustedInterval;
	}

	initEndConstraint(constraintEnd: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = {start: interval.start, end: interval.end};

		if (isAfter(adjustedInterval.start, addWeeks(constraintEnd, 1))) {
			adjustedInterval.start = startOfDay(
				subDays(endOfWeek(constraintEnd), this.options.pageSize - 1)
			);
			adjustedInterval.end = endOfWeek(constraintEnd);
		}

		return adjustedInterval;
	}

	aggregateAdjacentScopeEvents(): [InternalClndrEvent[], InternalClndrEvent[]] {
		// Since "day" is the smallest unit, there is no point in having an implementation for this
		// scope as there will never be adjacent days visible.
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

	setDay(day: Date, startOn?: Date): Interval {
		// If there was startOn specified, its weekday should be figured out to use that as the
		// starting point of the interval. If not, go to today.weekday(0).
		const start = startOfDay(setDay(day, startOn ? getDay(startOn) : 0));

		return {start, end: endOfDay(addDays(start, this.options.pageSize - 1))};
	}

	setMonth(newMonth: number, interval: Interval): Interval {
		const start = setDay(setMonth(interval.start, newMonth), this.options.weekOffset);
		return {start, end: endOfDay(addDays(start, this.options.pageSize - 1))};
	}

	setYear(newYear: number, interval: Interval): Interval {
		const start = setDay(setYear(interval.start, newYear), this.options.weekOffset);
		return {start, end: endOfDay(addDays(start, this.options.pageSize - 1))};
	}

	back(interval: Interval, step?: number): Interval {
		const start = startOfDay(subDays(interval.start, step ?? this.options.pageSize));
		return {start, end: endOfDay(addDays(start, this.options.pageSize - 1))};
	}

	forward(interval: Interval, step?: number): Interval {
		const start = startOfDay(addDays(interval.start, step ?? this.options.pageSize));
		return {start, end: endOfDay(addDays(start, this.options.pageSize - 1))};
	}

	flushTemplateData(
		data: ClndrTemplateData,
		createDaysObject: (interval: Interval) => ClndrItem[],
		events: [InternalClndrEvent[], InternalClndrEvent[], InternalClndrEvent[]]
	): ClndrTemplateData {

		data.months = eachMonthOfInterval(data.interval);
		data.years = eachYearOfInterval(data.interval);
		data.items = createDaysObject.apply(this, [data.interval]);
		data.numberOfRows = Math.ceil(data.items.length / 7);
		data.events.currentPage = events[1].map(event => event.originalEvent);

		return data;
	}
}