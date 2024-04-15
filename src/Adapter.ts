import type {
	Adjacent,
	ClndrItem,
	ClndrTemplateData,
	InternalClndrEvent,
	Interval,
	PageDates,
	Scope,
	WeekOffset,
} from './types';

export type AdapterOptions = {
	forceSixRows: boolean
	pageSize: number
	showAdjacent: boolean
	weekOffset: WeekOffset
}

export abstract class Adapter {

	protected static scope: Scope;

	getScope()  {
		const adapter = <typeof Adapter>this.constructor;
		return adapter.scope;
	}

	protected readonly options: AdapterOptions

	constructor(options: AdapterOptions) {
		this.options = options;
	}

	abstract initInterval(startOn?: Date): Interval

	abstract initStartConstraint(constraintStart: Date, interval: Interval): Interval
	abstract initEndConstraint(constraintEnd: Date, interval: Interval): Interval

	abstract aggregateAdjacentScopeEvents(
		interval: Interval,
		events: InternalClndrEvent[]
	): [InternalClndrEvent[], InternalClndrEvent[]]

	abstract aggregateScopeItems(interval: Interval, weekOffset?: number): PageDates

	abstract endOfScope(date: Date): Date

	abstract isToday(date: Date): boolean
	abstract isAdjacent(itemInterval: Interval, interval: Interval): Adjacent

	abstract getIntervalForDate(date: Date): Interval
	abstract getIdClasses(interval: Interval): string[]
	abstract getDateFromClassNames(classNames: string): Date | null

	abstract setDay(day: Date, startOn?: Date): Interval
	abstract setMonth(newMonth: number, interval: Interval): Interval
	abstract setYear(newYear: number, interval: Interval): Interval

	abstract back(interval: Interval, step?: number): Interval
	abstract forward(interval: Interval, step?: number): Interval

	abstract flushTemplateData(
		data: ClndrTemplateData,
		createDaysObject: (interval: Interval) => ClndrItem[],
		events: [InternalClndrEvent[], InternalClndrEvent[], InternalClndrEvent[]],
		pageSize?: number
	): ClndrTemplateData
}