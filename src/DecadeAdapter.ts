import {
	addYears,
	eachMonthOfInterval,
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

export type TargetOption = 'switchDecadeButton'

export default class DecadeAdapter extends Adapter {

	static scope: Scope = 'decade';

	static targets: Record<TargetOption, string> = {
		switchDecadeButton: 'clndr-switch-decade-button',
	}

	static eventListener(element: HTMLElement, callback: (scope: Scope) => void) {
		if (element.closest('.' + DecadeAdapter.targets.switchDecadeButton)) {
			callback('decade');
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

	aggregateAdjacentScopeEvents(): [InternalClndrEvent[], InternalClndrEvent[]] {
		// Since "day" is the smallest unit, there is no point in having an implementation for this
		// scope as there will never be adjacent years visible.
		return [[], []];
	}

	aggregateScopeItems(interval: Interval): PageDates {
		return [[], eachYearOfInterval(interval), []];
	}

	endOfScope(date: Date): Date {
		return endOfDecade(date);
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

	getIdClasses(interval: Interval): string[] {
		return [`calendar-year-${format(interval.start, 'yyyy')}`];
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

	flushTemplateData(
		data: ClndrTemplateData,
		createDaysObject: (interval: Interval) => ClndrItem[],
		events: [InternalClndrEvent[], InternalClndrEvent[], InternalClndrEvent[]],
		pageSize: number
	): ClndrTemplateData {

		data.items = [] as ClndrItem[][];
		const currentPageEvents: ClndrEvent[][] = [];
		data.months = eachMonthOfInterval(data.interval);
		data.years = eachYearOfInterval(data.interval);
		data.decades = [];

		for (let i = 0; i < pageSize; i++) {
			const currentIntervalStart = addYears(data.interval.start, i * 10);
			const currentIntervalEnd = endOfDecade(currentIntervalStart);

			data.decades.push(currentIntervalStart);

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

		if (pageSize > 1) {
			return data;
		}

		data.events.currentPage = data.events.currentPage[0];
		data.items = data.items[0];

		return data;
	}
}