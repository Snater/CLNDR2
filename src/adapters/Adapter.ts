import type {
	Adjacent,
	InternalClndrEvent,
	Interval,
	PageDates,
	View,
} from '../types';
import type {MonthAdapterOptions} from './MonthAdapter';
import type {WeekAdapterOptions} from './WeekAdapter';

export type AdapterOptions = {
	/**
	 * Number of pages to be rendered at once.
	 */
	pageSize: number
} & MonthAdapterOptions & WeekAdapterOptions

export abstract class Adapter {

	protected static view: View;

	getView()  {
		const adapter = <typeof Adapter>this.constructor;
		return adapter.view;
	}

	protected readonly options: AdapterOptions

	constructor(options: AdapterOptions) {
		this.options = options;
	}

	abstract initInterval(startOn?: Date): Interval

	abstract initStartConstraint(constraintStart: Date, interval: Interval): Interval
	abstract initEndConstraint(constraintEnd: Date, interval: Interval): Interval

	abstract aggregateAdjacentPageEvents(
		interval: Interval,
		events: InternalClndrEvent[]
	): [InternalClndrEvent[], InternalClndrEvent[]]

	abstract aggregatePageItems(interval: Interval): PageDates

	abstract endOfPage(date: Date): Date
	protected abstract addPages(date: Date, count: number): Date

	abstract isToday(date: Date): boolean
	abstract isAdjacent(itemInterval: Interval, interval: Interval): Adjacent

	abstract getIntervalForDate(date: Date): Interval
	abstract getIdForItem(date: Date): string
	abstract getDateFromClassNames(classNames: string): Date | null

	abstract setDate(day: Date): Interval
	abstract setMonth(newMonth: number, interval: Interval): Interval
	abstract setYear(newYear: number, interval: Interval): Interval

	abstract back(interval: Interval, step?: number): Interval
	abstract forward(interval: Interval, step?: number): Interval

	getPageIntervals(startDate: Date): Interval[] {
		const pageIntervals: Interval[] = [];

		for (let i = 0; i < this.options.pageSize; i++) {
			const start = this.addPages(startDate, i);
			pageIntervals.push({start, end: this.endOfPage(start)});
		}

		return pageIntervals;
	}
}
