import {
	addMonths,
	addYears,
	eachMonthOfInterval,
	endOfMonth,
	endOfYear,
	format,
	isAfter,
	isBefore,
	isSameMonth,
	setMonth,
	startOfMonth,
	startOfYear,
	subYears,
} from 'date-fns';
import {Adapter} from './Adapter';
import type {Adjacent, InternalClndrEvent, Interval, PageDates, Scope} from './types';

export type TargetOption = 'switchYearButton'

export default class YearAdapter extends Adapter {

	static scope: Scope = 'year';

	static targets: Record<TargetOption, string> = {
		switchYearButton: 'clndr-switch-year-button',
	}

	static eventListener(element: HTMLElement, callback: (scope: Scope) => void) {
		if (element.closest('.' + YearAdapter.targets.switchYearButton)) {
			callback(YearAdapter.scope);
		}
	}

	initInterval(startOn?: Date): Interval {
		const start = startOfYear(startOn || new Date());
		const end = endOfYear(addYears(start, this.options.pageSize - 1));
		return {start, end};
	}

	initStartConstraint(constraintStart: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = {
			start: startOfYear(interval.start),
			end: endOfYear(interval.end),
		};
		const start = startOfYear(constraintStart);

		if (isBefore(adjustedInterval.start, start)) {
			adjustedInterval.start = start;
		}

		adjustedInterval.end = endOfYear(
			addYears(adjustedInterval.start, this.options.pageSize - 1)
		);

		return adjustedInterval;
	}

	initEndConstraint(constraintEnd: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = {
			start: startOfYear(interval.start),
			end: endOfYear(interval.end),
		};
		const end = endOfYear(constraintEnd);

		if (isAfter(adjustedInterval.start, end)) {
			adjustedInterval.start = startOfYear(subYears(end, this.options.pageSize - 1));
			adjustedInterval.end = end;
		}

		return adjustedInterval;
	}

	aggregateAdjacentScopeEvents(): [InternalClndrEvent[], InternalClndrEvent[]] {
		// Since "day" is the smallest unit, there is no point in having an implementation for this
		// scope as there will never be adjacent months visible.
		return [[], []];
	}

	aggregateScopeItems(interval: Interval): PageDates {
		return [[], eachMonthOfInterval(interval), []];
	}

	endOfScope(date: Date): Date {
		return endOfYear(date);
	}

	protected addScope(date: Date, count: number): Date {
		return addYears(date, count);
	}

	isToday(date: Date): boolean {
		return isSameMonth(date, new Date());
	}

	isAdjacent(): Adjacent {
		return null;
	}

	getIntervalForDate(date: Date): Interval {
		return {start: startOfMonth(date), end: endOfMonth(date)};
	}

	getIdForItem(date: Date): string {
		return `calendar-month-${format(date, 'yyyy-MM')}`;
	}

	getDateFromClassNames(classNames: string): Date | null {
		const index = classNames.indexOf('calendar-month-');
		return index === -1 ? null : new Date(classNames.substring(index + 15, index + 22));
	}

	setDay(day: Date): Interval {
		const start = startOfYear(day);
		return {start, end: endOfYear(addYears(start, this.options.pageSize - 1))};
	}

	setMonth(newMonth: number, interval: Interval): Interval {
		const start = startOfYear(setMonth(interval.start, newMonth));
		return {start, end: endOfYear(addMonths(start, this.options.pageSize - 1))};
	}

	setYear(newYear: number): Interval {
		return {
			start: startOfYear(new Date(newYear.toString())),
			end: endOfYear(new Date(newYear.toString())),
		};
	}

	back(interval: Interval, step?: number): Interval {
		const start = startOfYear(subYears(interval.start, step ?? this.options.pageSize));
		return {start, end: endOfYear(addYears(start, this.options.pageSize - 1))};
	}

	forward(interval: Interval, step?: number): Interval {
		const start = startOfYear(addYears(interval.start, step ?? this.options.pageSize));
		return {start, end: endOfYear(addYears(start, this.options.pageSize - 1))};
	}
}