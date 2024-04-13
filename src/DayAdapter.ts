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

		return [start, end];
	}

	initStartConstraint(constraintStart: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = [interval[0], interval[1]];

		if (isBefore(adjustedInterval[0], subWeeks(constraintStart, 1))) {
			adjustedInterval[0] = startOfWeek(constraintStart);
		}

		adjustedInterval[1] = endOfDay(addDays(adjustedInterval[0], this.options.pageSize - 1));

		return adjustedInterval;
	}

	initEndConstraint(constraintEnd: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = [interval[0], interval[1]];

		if (isAfter(adjustedInterval[0], addWeeks(constraintEnd, 1))) {
			adjustedInterval[0] = startOfDay(
				subDays(endOfWeek(constraintEnd), this.options.pageSize - 1)
			);
			adjustedInterval[1] = endOfWeek(constraintEnd);
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
		for (let i = 0; i <= differenceInDays(interval[1], interval[0]); i++) {
			days.push(addDays(interval[0], i));
		}
		return [[], days, []];
	}

	isAdjacent(): Adjacent {
		return null;
	}

	getIntervalForDate(date: Date): Interval {
		return [startOfDay(date), endOfDay(date)];
	}

	setDay(day: Date, startOn?: Date): Interval {
		// If there was startOn specified, its weekday should be figured out to use that as the
		// starting point of the interval. If not, go to today.weekday(0).
		const start = startOfDay(setDay(day, startOn ? getDay(startOn) : 0));

		return [start, endOfDay(addDays(start, this.options.pageSize - 1))];
	}

	setMonth(newMonth: number, interval: Interval): Interval {
		const start = setDay(setMonth(interval[0], newMonth), this.options.weekOffset);
		return [start, endOfDay(addDays(start, this.options.pageSize - 1))];
	}

	setYear(newYear: number, interval: Interval): Interval {
		const start = setDay(setYear(interval[0], newYear), this.options.weekOffset);
		return [start, endOfDay(addDays(start, this.options.pageSize - 1))];
	}

	back(interval: Interval, step?: number): Interval {
		const start = startOfDay(subDays(interval[0], step ?? this.options.pageSize));
		return [start, endOfDay(addDays(start, this.options.pageSize - 1))];
	}

	forward(interval: Interval, step?: number): Interval {
		const start = startOfDay(addDays(interval[0], step ?? this.options.pageSize));
		return [start, endOfDay(addDays(start, this.options.pageSize - 1))];
	}

	flushTemplateData(
		data: ClndrTemplateData,
		createDaysObject: (interval: Interval) => ClndrItem[],
		events: [InternalClndrEvent[], InternalClndrEvent[], InternalClndrEvent[]]
	): ClndrTemplateData {

		data.months = eachMonthOfInterval({start: data.interval[0], end: data.interval[1]});
		data.years = eachYearOfInterval({start: data.interval[0], end: data.interval[1]});
		data.items = createDaysObject.apply(this, [data.interval]);
		data.numberOfRows = Math.ceil(data.items.length / 7);
		data.events.currentPage = events[1].map(event => event.originalEvent);

		return data;
	}
}