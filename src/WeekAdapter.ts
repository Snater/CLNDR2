import {
	addDays,
	addWeeks,
	differenceInDays,
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
import type {Adjacent, InternalClndrEvent, Interval, PageDates, Scope} from './types';

export type TargetOption = 'switchWeekButton'

export default class WeekAdapter extends DayBasedAdapter {

	static scope: Scope = 'week';

	static targets: Record<TargetOption, string> = {
		switchWeekButton: 'clndr-switch-week-button',
	}

	static eventListener(element: HTMLElement, callback: (scope: Scope) => void) {
		if (element.closest('.' + WeekAdapter.targets.switchWeekButton)) {
			callback(WeekAdapter.scope);
		}
	}

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

	endOfScope(date: Date): Date {
		return endOfWeek(date);
	}

	protected addScope(date: Date, count: number): Date {
		return addWeeks(date, count);
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
}