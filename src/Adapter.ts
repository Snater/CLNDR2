import type {
	Adjacent,
	ClndrTemplateData,
	Day,
	InternalClndrEvent,
	Interval,
	PageDates,
} from './types';
import {Locale} from 'date-fns';

export abstract class Adapter {
	abstract initInterval(pageSize: number, startOn?: Date, weekOffset?: number): Interval;

	abstract initStartConstraint(
		constraintStart: Date,
		interval: Interval,
		pageSize?: number
	): Interval;
	abstract initEndConstraint(
		constraintEnd: Date,
		interval: Interval,
		pageSize?: number
	): Interval;

	abstract aggregateDays(interval: Interval, weekOffset?: number): PageDates;

	abstract isAdjacent(day: Date, interval: Interval): Adjacent

	abstract setDay(day: Date, pageSize: number, startOn?: Date): Interval
	abstract setMonth(newMonth: number, interval: Interval, pageSize: number): Interval

	abstract back(interval: Interval, pageSize: number, step: number): Interval
	abstract forward(interval: Interval, pageSize: number, step: number): Interval

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