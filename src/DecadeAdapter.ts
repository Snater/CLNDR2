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
		return [start, end];
	}

	initStartConstraint(constraintStart: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = [interval[0], interval[1]];
		const start = startOfDecade(constraintStart);

		if (isBefore(adjustedInterval[0], start)) {
			adjustedInterval[0] = start;
		}

		if (isBefore(adjustedInterval[1], start)) {
			adjustedInterval[1] = endOfDecade(constraintStart);
		}

		return adjustedInterval;
	}

	initEndConstraint(constraintEnd: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = [interval[0], interval[1]];
		const end = endOfDecade(constraintEnd);

		if (isAfter(adjustedInterval[1], end)) {
			adjustedInterval[1] = end;
		}

		if (isAfter(adjustedInterval[0], end)) {
			adjustedInterval[0] = startOfDecade(constraintEnd);
		}

		return adjustedInterval;
	}

	aggregateAdjacentScopeEvents(): [InternalClndrEvent[], InternalClndrEvent[]] {
		// Since "day" is the smallest unit, there is no point in having an implementation for this
		// scope as there will never be adjacent years visible.
		return [[], []];
	}

	aggregateScopeItems(interval: Interval): PageDates {
		return [
			[],
			eachYearOfInterval({start: interval[0], end: interval[1]}),
			[],
		]
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
		return [startOfYear(date), endOfYear(date)];
	}

	getIdClasses(interval: Interval): string[] {
		return [`calendar-year-${format(interval[0], 'yyyy')}`];
	}

	getDateFromClassNames(classNames: string): Date | null {
		const index = classNames.indexOf('calendar-year-');
		return index === -1 ? null : new Date(classNames.substring(index + 14, index + 18));
	}

	setDay(day: Date): Interval {
		const start = startOfDecade(day);
		return [start, endOfDecade(addYears(start, (this.options.pageSize - 1) * 10))];
	}

	setMonth(newMonth: number, interval: Interval): Interval {
		const start = startOfDecade(setMonth(interval[0], newMonth));
		return [start, endOfDecade(addYears(start, (this.options.pageSize - 1) * 10))];
	}

	setYear(newYear: number): Interval {
		return [startOfDecade(new Date(newYear.toString())), endOfDecade(new Date(newYear.toString()))];
	}

	back(interval: Interval, step?: number): Interval {
		const start = startOfDecade(subYears(interval[0], (step ?? this.options.pageSize) * 10));
		return [start, endOfDecade(addYears(start, (this.options.pageSize - 1) * 10))];
	}

	forward(interval: Interval, step?: number): Interval {
		const start = startOfDecade(addYears(interval[0], (step ?? this.options.pageSize) * 10));
		return [start, endOfDecade(addYears(start, (this.options.pageSize - 1) * 10))];
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
		data.months = eachMonthOfInterval({start: data.interval[0], end: data.interval[1]});
		data.years = eachYearOfInterval({start: data.interval[0], end: data.interval[1]});
		data.decade = data.interval[0];
		data.decades = [];

		for (let i = 0; i < pageSize; i++) {
			const currentIntervalStart = addYears(data.interval[0], i * 10);
			const currentIntervalEnd = endOfDecade(currentIntervalStart);

			data.decades.push(currentIntervalStart);

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

		if (pageSize > 1) {
			return data;
		}

		data.events.currentPage = data.events.currentPage[0];
		data.items = data.items[0];

		return data;
	}
}