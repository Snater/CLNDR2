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

export type TargetOption = 'switchYearButton'

export default class YearAdapter extends Adapter {

	static targets: Record<TargetOption, string> = {
		switchYearButton: 'clndr-switch-year-button',
	}

	static eventListener(element: HTMLElement, callback: ({scope}: {scope: Scope}) => void) {
		if (element.closest('.' + YearAdapter.targets.switchYearButton)) {
			callback({scope: 'year'});
		}
	}

	initInterval(startOn?: Date): Interval {
		const start = startOfYear(startOn || new Date());
		const end = endOfYear(addYears(start, this.options.pageSize - 1));
		return [start, end];
	}

	initStartConstraint(constraintStart: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = [interval[0], interval[1]];
		const start = startOfYear(constraintStart);

		if (isBefore(adjustedInterval[0], start)) {
			adjustedInterval[0] = start;
		}

		if (isBefore(adjustedInterval[1], start)) {
			adjustedInterval[1] = endOfYear(constraintStart);
		}

		return adjustedInterval;
	}

	initEndConstraint(constraintEnd: Date, interval: Interval): Interval {
		const adjustedInterval: Interval = [interval[0], interval[1]];
		const end = endOfYear(constraintEnd);

		if (isAfter(adjustedInterval[1], end)) {
			adjustedInterval[1] = end;
		}

		if (isAfter(adjustedInterval[0], end)) {
			adjustedInterval[0] = startOfYear(constraintEnd);
		}

		return adjustedInterval;
	}

	aggregateAdjacentScopeEvents(): [InternalClndrEvent[], InternalClndrEvent[]] {
		// Since "day" is the smallest unit, there is no point in having an implementation for this
		// scope as there will never be adjacent months visible.
		return [[], []];
	}

	aggregateScopeItems(interval: Interval): PageDates {
		return [
			[],
			eachMonthOfInterval({start: interval[0], end: interval[1]}),
			[],
		]
	}

	endOfScope(date: Date): Date {
		return endOfYear(date);
	}

	isToday(date: Date): boolean {
		return isSameMonth(date, new Date());
	}

	isAdjacent(): Adjacent {
		return null;
	}

	getIntervalForDate(date: Date): Interval {
		return [startOfMonth(date), endOfMonth(date)];
	}

	getIdClasses(interval: Interval): string[] {
		return [`calendar-month-${format(interval[0], 'yyyy-MM')}`];
	}

	getDateFromClassNames(classNames: string): Date | null {
		const index = classNames.indexOf('calendar-month-');
		return index === -1 ? null : new Date(classNames.substring(index + 15, index + 22));
	}

	setDay(day: Date): Interval {
		const start = startOfYear(day);
		return [start, endOfYear(addYears(start, this.options.pageSize - 1))];
	}

	setMonth(newMonth: number, interval: Interval): Interval {
		const start = startOfYear(setMonth(interval[0], newMonth));
		return [start, endOfYear(addMonths(start, this.options.pageSize - 1))];
	}

	setYear(newYear: number): Interval {
		return [startOfYear(new Date(newYear.toString())), endOfYear(new Date(newYear.toString()))];
	}

	back(interval: Interval, step: number): Interval {
		const start = startOfYear(subYears(interval[0], step));
		return [start, endOfYear(addYears(start, this.options.pageSize - 1))];
	}

	forward(interval: Interval, step: number): Interval {
		const start = startOfYear(addYears(interval[0], step));
		return [start, endOfYear(addYears(start, this.options.pageSize - 1))];
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
		data.years = [];

		for (let i = 0; i < pageSize; i++) {
			const currentIntervalStart = addYears(data.interval[0], i);
			const currentIntervalEnd = endOfYear(currentIntervalStart);

			data.years.push(currentIntervalStart);

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