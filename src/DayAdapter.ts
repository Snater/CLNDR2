import {
	addDays,
	addWeeks,
	differenceInDays,
	endOfDay,
	endOfWeek,
	getDay,
	isAfter,
	isBefore,
	setDay,
	setMonth,
	startOfDay,
	startOfWeek,
	subDays,
	subWeeks,
} from 'date-fns';
import {Adapter} from './Adapter';
import {InternalClndrEvent} from './types';
import type {Adjacent, ClndrTemplateData, Day, Interval, PageDates} from './types';

export class DayAdapter extends Adapter {

	initInterval(startOn: Date | undefined, weekOffset: number): Interval {
		const start = startOfDay(startOn ? startOn : setDay(new Date(), weekOffset));
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

	aggregateDays(interval: Interval): PageDates {
		const days: Date[] = [];
		// console.log('aggregateDays', interval, differenceInDays(interval[1], interval[0]));
		for (let i = 0; i <= differenceInDays(interval[1], interval[0]); i++) {
			days.push(addDays(interval[0], i));
		}
		return [[], days, []];
	}

	isAdjacent(): Adjacent {
		return null;
	}

	setDay(day: Date, startOn?: Date): Interval {
		// If there was startOn specified, its weekday should be figured out to use that as the
		// starting point of the interval. If not, go to today.weekday(0).
		const start = startOfDay(setDay(day, startOn ? getDay(startOn) : 0));

		return [start, endOfDay(addDays(start, this.options.pageSize - 1))];
	}

	setMonth(newMonth: number, interval: Interval): Interval {
		const start = setMonth(interval[0], newMonth);
		return [start, endOfDay(addDays(start, this.options.pageSize - 1))];
	}

	back(interval: Interval, step: number): Interval {
		const start = startOfDay(subDays(interval[0], step));
		return [start, endOfDay(addDays(start, this.options.pageSize - 1))];
	}

	forward(interval: Interval, step: number): Interval {
		const start = startOfDay(addDays(interval[0], step));
		return [start, endOfDay(addDays(start, this.options.pageSize - 1))];
	}

	flushTemplateData(
		data: ClndrTemplateData,
		interval: Interval,
		createDaysObject: (interval: Interval) => Day[],
		events: [InternalClndrEvent[], InternalClndrEvent[], InternalClndrEvent[]]
	): ClndrTemplateData {
		data.days = createDaysObject(interval);
		data.intervalEnd = interval[1];
		data.numberOfRows = Math.ceil(data.days.length / 7);
		data.intervalStart = interval[0];

		data.eventsThisInterval = events[1].map(
			event => event.originalEvent
		);

		return data;
	}
}