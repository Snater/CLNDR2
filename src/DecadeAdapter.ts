import {
	addYears,
	eachYearOfInterval,
	endOfDecade,
	endOfYear,
	format,
	isAfter,
	isBefore,
	isSameYear,
	setMonth,
	startOfDecade,
	startOfYear,
	subYears,
} from 'date-fns';
import {Adapter} from './Adapter';
import type {Adjacent, InternalClndrEvent, Interval, PageDates, View} from './types';

export type TargetOption = 'switchDecadeButton'

export default class DecadeAdapter extends Adapter {

	static view: View = 'decade';

	static targets: Record<TargetOption, string> = {
		switchDecadeButton: 'clndr-switch-decade-button',
	}

	static eventListener(element: HTMLElement, callback: (view: View) => void) {
		if (element.closest('.' + DecadeAdapter.targets.switchDecadeButton)) {
			callback(DecadeAdapter.view);
		}
	}

	initInterval(startOn?: Date): Interval {
		const start = startOfDecade(startOn || new Date());
		const end = endOfDecade(addYears(start, (this.options.pageSize - 1) * 10));
		return {start, end};
	}

	initStartConstraint(constraintStart: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = {start: interval.start, end: interval.end};
		const start = startOfDecade(constraintStart);

		if (isBefore(adjustedInterval.start, start)) {
			adjustedInterval.start = start;
		}

		if (isBefore(adjustedInterval.end, start)) {
			adjustedInterval.end = endOfDecade(constraintStart);
		}

		return adjustedInterval;
	}

	initEndConstraint(constraintEnd: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = {start: interval.start, end: interval.end};
		const end = endOfDecade(constraintEnd);

		if (isAfter(adjustedInterval.end, end)) {
			adjustedInterval.end = end;
		}

		if (isAfter(adjustedInterval.start, end)) {
			adjustedInterval.start = startOfDecade(constraintEnd);
		}

		return adjustedInterval;
	}

	aggregateAdjacentPageEvents(): [InternalClndrEvent[], InternalClndrEvent[]] {
		// Since "day" is the smallest unit, there is no point in having an implementation for this
		// view as there will never be adjacent years visible.
		return [[], []];
	}

	aggregatePageItems(interval: Interval): PageDates {
		return [[], eachYearOfInterval(interval), []];
	}

	endOfPage(date: Date): Date {
		return endOfDecade(date);
	}

	protected addPages(date: Date, count: number): Date {
		return addYears(date, count * 10);
	}

	isToday(date: Date): boolean {
		return isSameYear(date, new Date());
	}

	isAdjacent(): Adjacent {
		return null;
	}

	getIntervalForDate(date: Date): Interval {
		return {start: startOfYear(date), end: endOfYear(date)};
	}

	getIdForItem(date: Date): string {
		return `calendar-year-${format(date, 'yyyy')}`;
	}

	getDateFromClassNames(classNames: string): Date | null {
		const index = classNames.indexOf('calendar-year-');
		return index === -1 ? null : new Date(classNames.substring(index + 14, index + 18));
	}

	setDay(day: Date): Interval {
		const start = startOfDecade(day);
		return {start, end: endOfDecade(addYears(start, (this.options.pageSize - 1) * 10))};
	}

	setMonth(newMonth: number, interval: Interval): Interval {
		const start = startOfDecade(setMonth(interval.start, newMonth));
		return {start, end: endOfDecade(addYears(start, (this.options.pageSize - 1) * 10))};
	}

	setYear(newYear: number): Interval {
		return {
			start: startOfDecade(new Date(newYear.toString())),
			end: endOfDecade(new Date(newYear.toString())),
		};
	}

	back(interval: Interval, step?: number): Interval {
		const start = startOfDecade(subYears(interval.start, (step ?? this.options.pageSize) * 10));
		return {start, end: endOfDecade(addYears(start, (this.options.pageSize - 1) * 10))};
	}

	forward(interval: Interval, step?: number): Interval {
		const start = startOfDecade(addYears(interval.start, (step ?? this.options.pageSize) * 10));
		return {start, end: endOfDecade(addYears(start, (this.options.pageSize - 1) * 10))};
	}
}