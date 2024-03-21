import type {
	Adjacent,
	ClndrTemplateData,
	Day,
	InternalClndrEvent,
	Interval,
	PageDates,
} from './types';
import {Locale} from 'date-fns';

export type AdapterOptions = {
	forceSixRows: boolean
	pageSize: number
}

export abstract class Adapter {

	protected readonly options: AdapterOptions;

	constructor(options: AdapterOptions) {
		this.options = options;
	}

	abstract initInterval(startOn?: Date, weekOffset?: number): Interval;

	abstract initStartConstraint(constraintStart: Date, interval: Interval): Interval;
	abstract initEndConstraint(constraintEnd: Date, interval: Interval): Interval;

	abstract aggregateDays(interval: Interval, weekOffset?: number): PageDates;

	abstract isAdjacent(day: Date, interval: Interval): Adjacent

	abstract setDay(day: Date, startOn?: Date): Interval
	abstract setMonth(newMonth: number, interval: Interval): Interval

	abstract back(interval: Interval, step: number): Interval
	abstract forward(interval: Interval, step: number): Interval

	abstract flushTemplateData(
		data: ClndrTemplateData,
		interval: Interval,
		createDaysObject: (interval: Interval) => Day[],
		events: {
			eventsThisInterval: InternalClndrEvent[],
			eventsLastMonth: InternalClndrEvent[],
			eventsNextMonth: InternalClndrEvent[],
		},
		pageSize?: number,
		locale?: Locale
	): ClndrTemplateData
}