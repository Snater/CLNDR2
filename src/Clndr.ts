import {
	FormatOptions,
	Locale,
	addMonths,
	addYears,
	endOfDay,
	endOfMonth,
	format,
	getDate,
	getDay,
	getMonth,
	getYear,
	isAfter,
	isBefore,
	isSameDay,
	isSameMonth,
	setDay,
	setYear,
	startOfMonth,
	subMonths,
	subYears,
} from 'date-fns';
import {Adapter, AdapterOptions} from './Adapter';
import {DayAdapter} from './DayAdapter';
import {MonthAdapter} from './MonthAdapter';
import type {
	ClndrEvent,
	ClndrNavigationOptions,
	ClndrOptions,
	ClndrTarget,
	ClndrTemplateData,
	Constraints,
	Day,
	DayProperties,
	DaysOfTheWeek,
	InternalClndrEvent,
	InternalOptions,
	Interval,
	NavigationConstraint,
	NavigationConstraints,
	Scope,
	TargetOption,
	WeekOffset,
} from './types';

const defaults: InternalOptions = {
	render: () => {
		throw new Error('Missing render function');
	},
	adjacentDaysChangeMonth: false,
	classes: {
		past: 'past',
		today: 'today',
		event: 'event',
		inactive: 'inactive',
		selected: 'selected',
		lastMonth: 'last-month',
		nextMonth: 'next-month',
		adjacentMonth: 'adjacent-month',
	},
	clickEvents: {},
	dateParameter: {
		date: 'date',
		startDate: 'startDate',
		endDate: 'endDate',
	},
	events: [],
	forceSixRows: false,
	ignoreInactiveDaysInSelection: false,
	pagination: {scope: 'month', size: 1},
	showAdjacentMonths: true,
	targets: {
		day: 'day',
		empty: 'empty',
		nextButton: 'clndr-next-button',
		todayButton: 'clndr-today-button',
		previousButton: 'clndr-previous-button',
		nextYearButton: 'clndr-next-year-button',
		previousYearButton: 'clndr-previous-year-button',
	},
	trackSelectedDate: false,
	useTouchEvents: false,
	weekOffset: 0,
};

const adapters: Record<Scope, new (options: AdapterOptions) => Adapter> = {
	month: MonthAdapter,
	day: DayAdapter,
} as const;

class Clndr {

	static isObject(item: unknown) {
		return item && typeof item === 'object' && !Array.isArray(item);
	}

	static mergeDeep<T extends {[key: string]: unknown}, S extends {[key: string]: unknown} = T>(
		target: T,
		...sources: [T, S] | [T]
	): T {
		const source = sources.shift();

		if (!source) {
			return target;
		}

		const targetObject = target as {[k: string]: unknown};

		for (const key in source) {
			if (Array.isArray(source[key])) {
				targetObject[key] = (source[key] as unknown[]).map(element => {
					return Clndr.isObject(element)
						? Clndr.mergeDeep({}, element as {[k: string]: unknown})
						: element;
				});
			} else if (source[key] instanceof Date) {
				targetObject[key] = new Date(source[key] as Date);
			} else if (Clndr.isObject(source[key])) {
				if (!Clndr.isObject(targetObject[key])) {
					Object.assign(targetObject, {[key]: {}});
				}
				Clndr.mergeDeep(
					targetObject[key] as {[k: string]: unknown},
					source[key] as {[k: string]: unknown}
				);
			} else {
				Object.assign(target, {[key]: source[key]});
			}
		}

		return Clndr.mergeDeep(target, ...sources);
	}

	static mergeOptions<T extends {[key: string]: unknown}, S extends {[key: string]: unknown} = T>(
		target: T,
		source: S
	) {
		return Clndr.mergeDeep<T, S>({} as T, target, source);
	}

	private readonly element: HTMLElement;
	private readonly adapter: Adapter;
	/**
	 * Boolean values used to log whether any constraints are met
	 */
	private readonly constraints: NavigationConstraints;
	private readonly daysOfTheWeek: DaysOfTheWeek;
	private interval: Interval;
	private options: InternalOptions;
	private calendarContainer: HTMLElement;
	private eventsLastMonth: InternalClndrEvent[];
	private eventsNextMonth: InternalClndrEvent[];
	private eventsThisInterval: InternalClndrEvent[];
	private events: InternalClndrEvent[];

	constructor(element: HTMLElement, options: ClndrOptions) {
		this.element = element;
		this.eventsLastMonth = [];
		this.eventsNextMonth = [];
		this.eventsThisInterval = [];

		this.options = Clndr.mergeOptions<InternalOptions, ClndrOptions>(defaults, options);

		if (this.options.weekOffset > 6 || this.options.weekOffset < 0) {
			console.warn(
				`An invalid offset ${this.options.weekOffset} was provided (must be 0 - 6); using 0 instead`
			);
			this.options.weekOffset = 0;
		}

		this.adapter = new adapters[this.options.pagination.scope](
			{pageSize: this.options.pagination.size, forceSixRows: this.options.forceSixRows}
		);

		this.constraints = {
			next: true,
			today: true,
			previous: true,
			nextYear: true,
			previousYear: true,
		};

		// Store the events internally with a Day object attached to them. The Day object eases date
		// comparisons while looping over the event dates
		this.events = this.parseToInternalEvents(this.options.events);

		// To support arbitrary lengths of time, the current range is stored in addition to the current
		// month
		this.interval = this.adapter.initInterval(this.options.startOn, this.options.weekOffset);

		// If there are constraints, make sure the interval is within them
		if (this.options.constraints) {
			this.interval = this.initConstraints(this.options.constraints, this.interval);
		}

		this.daysOfTheWeek = this.options.daysOfTheWeek
			? this.options.daysOfTheWeek
			: this.initDaysOfTheWeek(this.options.formatWeekdayHeader, this.options.locale);

		if (this.options.weekOffset) {
			this.daysOfTheWeek = this.shiftWeekdayLabels(this.daysOfTheWeek, this.options.weekOffset);
		}

		this.element.innerHTML = '<div class="clndr"></div>';
		this.calendarContainer = this.element.querySelector('.clndr') as HTMLElement;

		this.element.addEventListener(
			this.options.useTouchEvents ? 'touchstart' : 'click',
			this.handleEvent.bind(this)
		);

		this.render();

		this.options.ready?.apply(this, []);
	}

	private initConstraints(constraints: Constraints, interval: Interval) {
		let adjustedInterval: Interval = [interval[0], interval[1]];

		if (constraints.startDate) {
			adjustedInterval = this.adapter.initStartConstraint(
				new Date(constraints.startDate),
				adjustedInterval
			);
		}

		if (constraints.endDate) {
			adjustedInterval = this.adapter.initEndConstraint(
				new Date(constraints.endDate),
				adjustedInterval
			);
		}

		return adjustedInterval;
	}

	private initDaysOfTheWeek(
		formatWeekdayHeader?: ((day: Date, locale?: Locale) => string),
		locale?: Locale
	) {
		const daysOfTheWeek: string[] = [];

		formatWeekdayHeader = formatWeekdayHeader || function (day: Date, locale?: Locale) {
			return format(day, 'cccccc', {locale}).charAt(0);
		};

		for (let i = 0; i < 7; i++) {
			daysOfTheWeek.push(formatWeekdayHeader(setDay(new Date(), i), locale || undefined));
		}

		return daysOfTheWeek as DaysOfTheWeek;
	}

	private shiftWeekdayLabels(daysOfTheWeek: DaysOfTheWeek, offset: WeekOffset) {
		const adjustedDaysOfTheWeek: DaysOfTheWeek = [...daysOfTheWeek];

		for (let i = 0; i < offset; i++) {
			adjustedDaysOfTheWeek.push(adjustedDaysOfTheWeek.shift() as string);
		}

		return adjustedDaysOfTheWeek;
	}

	private createDaysObject(interval: Interval) {

		const dates = this.adapter.aggregateDays(interval, this.options.weekOffset);

		// This array will contain the data of the entire grid (including blank spaces)
		return [
			...dates[0].map(day => {
				if (this.options.showAdjacentMonths) {
					return this.createDayObject(day, this.events, interval)
				} else {
					return this.calendarDay({
						classes: [this.options.targets.empty, this.options.classes.lastMonth].join(' '),
					})
				}
			}),
			...dates[1].map(date => {
				return this.createDayObject(date, this.eventsThisInterval, interval)
			}),
			...dates[2].map(day => {
				if (this.options.showAdjacentMonths) {
					return this.createDayObject(day, this.events, interval)
				} else {
					return this.calendarDay({
						classes: [this.options.targets.empty, this.options.classes.nextMonth].join(' '),
					})
				}
			}),
		];
	}

	/**
	 * Filters the events list to events that are happening last month, this month and next month
	 * (within the current grid view).
	 */
	private parseEvents(interval: Interval) {
		// Filter the events list (if it exists) to events that are happening last month, this month and
		// next month (within the current grid view).
		this.eventsLastMonth = [];
		this.eventsNextMonth = [];
		this.eventsThisInterval = [];

		if (!this.events.length) {
			return;
		}

		this.eventsThisInterval = this.events.filter(event => {
			const afterEnd = isAfter(event._clndrStartDateObject, interval[1]);
			const beforeStart = isBefore(event._clndrEndDateObject, interval[0]);

			return !(beforeStart || afterEnd);
		});

		if (!this.options.showAdjacentMonths) {
			return;
		}

		const startOfLastMonth = startOfMonth(subMonths(interval[0], 1));
		const endOfLastMonth = endOfMonth(startOfLastMonth);
		const startOfNextMonth = startOfMonth(addMonths(interval[1], 1));
		const endOfNextMonth = endOfMonth(startOfNextMonth);

		this.eventsLastMonth = this.events.filter(event => {
			const beforeStart = isBefore(event._clndrEndDateObject, startOfLastMonth);
			const afterEnd = isAfter(event._clndrStartDateObject, endOfLastMonth);

			return !(beforeStart || afterEnd);
		});

		this.eventsNextMonth = this.events.filter(event => {
			const beforeStart = isBefore(event._clndrEndDateObject, startOfNextMonth);
			const afterEnd = isAfter(event._clndrStartDateObject, endOfNextMonth);

			return !(beforeStart || afterEnd);
		});
	}

	private createDayObject(day: Date, monthEvents: InternalClndrEvent[], interval: Interval) {
		const now = new Date();
		const dayEnd = endOfDay(day);
		const classes = [this.options.targets.day];
		const properties: DayProperties = {
			isToday: false,
			isInactive: false,
			isAdjacentMonth: false,
		};

		const eventsToday = monthEvents.filter(event => {
			const start = event._clndrStartDateObject;
			const end = event._clndrEndDateObject;

			return !isAfter(start, dayEnd) && !isAfter(day, end);
		});

		if (isSameDay(now, day)) {
			classes.push(this.options.classes.today);
			properties.isToday = true;
		}

		if (isBefore(day, now)) {
			classes.push(this.options.classes.past);
		}

		if (eventsToday.length) {
			classes.push(this.options.classes.event);
		}

		const adjacent = this.adapter.isAdjacent(day, interval);

		if (adjacent) {
			// TODO: Change to generic classes
			classes.push(this.options.classes.adjacentMonth);
			properties.isAdjacentMonth = true;
		}

		if (adjacent === 'before') {
			classes.push(this.options.classes.lastMonth);
		} else if (adjacent === 'after') {
			classes.push(this.options.classes.nextMonth);
		}

		// If there are constraints, the inactive class needs to be added to the days outside of them
		if (this.options.constraints) {
			const endDate = this.options.constraints.endDate
				&& new Date(this.options.constraints.endDate);
			const startDate = this.options.constraints.startDate
				&& new Date(this.options.constraints.startDate);

			if (startDate && isBefore(day, startDate)) {
				classes.push(this.options.classes.inactive);
				properties.isInactive = true;
			}

			if (endDate && isAfter(day, endDate)) {
				classes.push(this.options.classes.inactive);
				properties.isInactive = true;
			}
		}

		if (this.options.selectedDate && isSameDay(day, new Date(this.options.selectedDate))) {
			classes.push(this.options.classes.selected);
		}

		classes.push(`calendar-day-${format(day, 'yyyy-MM-dd')}`);
		// Day of week
		classes.push(`calendar-dow-${getDay(day)}`);

		return this.calendarDay({
			date: day,
			day: getDate(day),
			events: eventsToday.map(event => event.originalEvent),
			properties: properties,
			classes: classes.join(' '),
		});
	}

	private render() {
		this.calendarContainer.innerHTML = '';

		this.calendarContainer.innerHTML = this.options.render.apply(
			this,
			[this.aggregateTemplateData()]
		);

		this.applyInactiveClasses();

		if (this.options.doneRendering) {
			this.options.doneRendering.apply(this, []);
		}
	}

	private aggregateTemplateData() {
		const data: ClndrTemplateData = {
			days: [],
			months: [],
			year: null,
			month: null,
			eventsThisMonth: [],
			eventsLastMonth: [],
			eventsNextMonth: [],
			extras: this.options.extras,
			daysOfTheWeek: this.daysOfTheWeek,
			numberOfRows: 0,
			intervalStart: null,
			intervalEnd: null,
			eventsThisInterval: [],
			format: (date: Date, formatStr: string, options: FormatOptions = {}) => {
				return format(date, formatStr, {locale: this.options.locale || undefined, ...options});
			},
		};

		this.parseEvents(this.interval);

		// TODO: Streamline template data
		return this.adapter.flushTemplateData.apply(this, [
			data,
			this.interval,
			this.createDaysObject,
			{
				eventsThisInterval: this.eventsThisInterval,
				eventsLastMonth: this.eventsLastMonth,
				eventsNextMonth: this.eventsNextMonth,
			},
			this.options.pagination.size,
			this.options.locale,
		]);
	}

	/**
	 * Adds "inactive" class to controls if needed. This function is called during rendering.
	 */
	private applyInactiveClasses() {
		if (!this.options.constraints) {
			return;
		}

		// Remove all "inactive" class assignments to start with a clean state
		for (const target in this.options.targets) {
			if (target !== 'day') {
				this.element
					.querySelectorAll('.' + this.options.targets[target as TargetOption])
					.forEach(element => element.classList.remove(this.options.classes.inactive));
			}
		}

		// Just like the classes, reset the internal states to true
		for (const navigationConstraint in this.constraints) {
			this.constraints[navigationConstraint as NavigationConstraint] = true;
		}

		const start = this.options.constraints.startDate
			? new Date(this.options.constraints.startDate)
			: null;
		const end = this.options.constraints.endDate
			? new Date(this.options.constraints.endDate)
			: null;

		// Month control
		// Room to go back?
		if (start && (isAfter(start, this.interval[0]) || isSameDay(start, this.interval[0]))) {
			this.element
				.querySelectorAll('.' + this.options.targets.previousButton)
				.forEach(element => element.classList.add(this.options.classes.inactive));
			this.constraints.previous = false;
		}

		// Room to go forward?
		if (end && (isBefore(end, this.interval[1]) || isSameDay(end, this.interval[1]))) {
			this.element
				.querySelectorAll('.' + this.options.targets.nextButton)
				.forEach(element => element.classList.add(this.options.classes.inactive));
			this.constraints.next = false;
		}

		// Year control
		// Room to go back?
		if (start && isAfter(start, subYears(this.interval[0], 1))) {
			this.element
				.querySelectorAll('.' + this.options.targets.previousYearButton)
				.forEach(element => element.classList.add(this.options.classes.inactive));
			this.constraints.previousYear = false;
		}

		// Room to for forward?
		if (end && isBefore(end, addYears(this.interval[1], 1))) {
			this.element
				.querySelectorAll('.' + this.options.targets.nextYearButton)
				.forEach(element => element.classList.add(this.options.classes.inactive));
			this.constraints.nextYear = false;
		}

		// Today
		// Constraints could be updated programmatically. Therefore, this check cannot be just run on
		// initialization.
		if (start && isAfter(start, addMonths(new Date(), 1))
			|| end && isBefore(end, subMonths(new Date(), 1))
		) {
			this.element
				.querySelectorAll('.' + this.options.targets.todayButton)
				.forEach(element => element.classList.add(this.options.classes.inactive));
			this.constraints.today = false;
		}
	}

	/**
	 * Central event handler handling click event.
	 */
	private handleEvent(event: Event) {
		const targets = this.options.targets;
		const eventTarget = event.target as HTMLElement;

		this.handleDayEvent(event);
		this.handleEmptyEvent(event);

		if (eventTarget.closest('.' + targets.todayButton)) {
			this.today({withCallbacks: true});
		}

		if (eventTarget.closest('.' + targets.nextButton)) {
			this.forward({withCallbacks: true});
		}

		if (eventTarget.closest('.' + targets.previousButton)) {
			this.back({withCallbacks: true});
		}

		if (eventTarget.closest('.' + targets.nextYearButton)) {
			this.nextYear({withCallbacks: true});
		}

		if (eventTarget.closest('.' + targets.previousYearButton)) {
			this.previousYear({withCallbacks: true});
		}
	}

	/**
	 * Handles click event on day boxes.
	 */
	private handleDayEvent(event: Event) {
		const eventTarget = event.target as HTMLElement | null;
		const currentTarget = eventTarget?.closest(
			'.' + this.options.targets.day
		) as HTMLElement | null;

		if (!currentTarget) {
			return;
		}

		this.navigatePerAdjacentDay(currentTarget);

		this.updateSelectedDate(currentTarget);

		if (this.options.clickEvents.click) {
			const target = this.buildTargetObject(currentTarget);
			this.options.clickEvents.click.apply(this, [target]);
		}
	}

	/**
	 * Navigates to another month according to the target element provided.
	 */
	private navigatePerAdjacentDay(target: HTMLElement) {
		if (!this.options.adjacentDaysChangeMonth) {
			return;
		}

		if (target.classList.contains(this.options.classes.lastMonth)) {
			this.back({withCallbacks: true});
		} else if (target.classList.contains(this.options.classes.nextMonth)) {
			this.forward({withCallbacks: true});
		}
	}

	/**
	 * Updates the selected date according to the target element provided.
	 */
	private updateSelectedDate(target: HTMLElement) {
		if (!this.options.trackSelectedDate
			|| (
				this.options.ignoreInactiveDaysInSelection
				&& target.classList.contains(this.options.classes.inactive)
			)
		) {
			return;
		}

		this.options.selectedDate = this.getTargetDateString(target);
		this.element.querySelectorAll('.' + this.options.classes.selected)
			.forEach(node => node.classList.remove(this.options.classes.selected));
		this.element.querySelector('.calendar-day-' + this.options.selectedDate)?.classList
			.add(this.options.classes.selected);
	}

	/**
	 * Handles click event on empty day boxes.
	 */
	private handleEmptyEvent(event: Event) {
		const eventTarget = event.target as HTMLElement | null;
		const currentTarget = eventTarget?.closest(
			'.' + this.options.targets.empty
		) as HTMLElement | null;

		if (!currentTarget) {
			return;
		}

		if (this.options.clickEvents.click) {
			const target = this.buildTargetObject(currentTarget);
			this.options.clickEvents.click.apply(this, [target]);
		}

		if (this.options.adjacentDaysChangeMonth) {
			if (currentTarget.classList.contains(this.options.classes.lastMonth)) {
				this.back({withCallbacks: true});
			} else if (currentTarget.classList.contains(this.options.classes.nextMonth)) {
				this.forward({withCallbacks: true});
			}
		}
	}

	/**
	 * Creates the object to be returned along click events.
	 */
	private buildTargetObject(target: HTMLElement): ClndrTarget {
		const targetWasDay = target.classList.contains(this.options.targets.day);
		const dateString = this.getTargetDateString(target);
		const date = dateString ? new Date(dateString) : null;

		return {
			date,
			events: targetWasDay && date ? this.getEventsOfDate(date) : [],
			element: target,
		};
	}

	/**
	 * Get date string ("YYYY-MM-DD") associated with the given target.
	 * This method is meant to be called on ".day" elements.
	 */
	private getTargetDateString(target: HTMLElement) {
		const index = target.className.indexOf('calendar-day-');

		return index === -1
			? undefined
			: target.className.substring(index + 13, index + 23);
	}

	private getEventsOfDate(date: Date): ClndrEvent[] {
		if (this.events.length === 0) {
			return [];
		}

		const targetEndDate = endOfDay(date);

		return this.events.filter(event => {
			return !isAfter(event._clndrStartDateObject, targetEndDate)
				&& !isAfter(date, event._clndrEndDateObject);
		}).map(event => event.originalEvent);
	}

	/**
	 * Triggers any applicable events given a change in the calendar's start and end dates.
	 * @param orig Contains the original start and end dates.
	 */
	private triggerEvents(orig: Interval) {
		const eventsOpt = this.options.clickEvents;
		const newInt: Interval = [this.interval[0], this.interval[1]];

		// If any of the change conditions have been hit, trigger the relevant events
		const nextMonth = isAfter(newInt[0], orig[0])
			&& (
				Math.abs(getMonth(newInt[0]) - getMonth(orig[0])) === 1
				|| (getMonth(orig[0]) === 11 && getMonth(newInt[0]) === 0)
			);
		const prevMonth = isBefore(newInt[0], orig[0])
			&& (
				Math.abs(getMonth(orig[0]) - getMonth(newInt[0])) === 1
				|| (getMonth(orig[0]) === 0 && getMonth(newInt[0]) === 11)
			);
		const monthChanged = getMonth(newInt[0]) !== getMonth(orig[0])
			|| getYear(newInt[0]) !== getYear(orig[0]);
		const nextYear = getYear(newInt[0]) - getYear(orig[0]) === 1
			|| getYear(newInt[1]) - getYear(orig[1]) === 1;
		const prevYear = getYear(orig[0]) - getYear(newInt[0]) === 1
			|| getYear(orig[1]) - getYear(newInt[1]) === 1;
		const yearChanged = getYear(newInt[0]) !== getYear(orig[0]);

		const nextInterval = isAfter(newInt[0], orig[0]);
		const prevInterval = isBefore(newInt[0], orig[0]);
		const intervalChanged = nextInterval || prevInterval;
		const intervalArg: [Date, Date] = this.interval;

		if (nextInterval && eventsOpt.nextInterval) {
			eventsOpt.nextInterval.apply(this, intervalArg);
		}

		if (prevInterval && eventsOpt.previousInterval) {
			eventsOpt.previousInterval.apply(this, intervalArg);
		}

		if (intervalChanged && eventsOpt.onIntervalChange) {
			eventsOpt.onIntervalChange.apply(this, intervalArg);
		}

		const monthArg: [Date] = [this.interval[0]];

		if (nextMonth && eventsOpt.nextMonth) {
			eventsOpt.nextMonth.apply(this, monthArg);
		}

		if (prevMonth && eventsOpt.previousMonth) {
			eventsOpt.previousMonth.apply(this, monthArg);
		}

		if (monthChanged && eventsOpt.onMonthChange) {
			eventsOpt.onMonthChange.apply(this, monthArg);
		}

		if (nextYear && eventsOpt.nextYear) {
			eventsOpt.nextYear.apply(this, monthArg);
		}

		if (prevYear && eventsOpt.previousYear) {
			eventsOpt.previousYear.apply(this, monthArg);
		}

		if (yearChanged && eventsOpt.onYearChange) {
			eventsOpt.onYearChange.apply(this, monthArg);
		}
	}

	private parseToInternalEvents(events: ClndrEvent[]) {
		const dateParameter = this.options.dateParameter;

		return events.map(event => {

			if (typeof dateParameter === 'string') {
				if (!(event[dateParameter] instanceof Date) && typeof event[dateParameter] !== 'string') {
					console.warn(
						`event['${dateParameter}'] is required to be a Date or a string, while ${typeof event[dateParameter]} was provided`,
						event
					);
					return;
				}

				return {
					_clndrStartDateObject: new Date(event[dateParameter] as Date | string),
					_clndrEndDateObject: new Date(event[dateParameter] as Date | string),
					originalEvent: event,
				};
			}

			const start = dateParameter.startDate && event[dateParameter.startDate];
			const end = dateParameter.endDate && event[dateParameter.endDate];

			if (!end && !start && dateParameter.date) {
				if (!(event[dateParameter.date] instanceof Date)
					&& typeof event[dateParameter.date] !== 'string'
				) {
					console.warn(
						`event['${dateParameter.date}'] is required to be a Date or a string, while ${typeof event[dateParameter.date]} was provided`,
						event
					);
					return;
				}

				return {
					_clndrStartDateObject: new Date(event[dateParameter.date] as Date | string),
					_clndrEndDateObject: new Date(event[dateParameter.date] as Date | string),
					originalEvent: event,
				};
			} else if (end || start) {
				if (
					start && !(start instanceof Date) && typeof start !== 'string'
					|| end && !(end instanceof Date) && typeof end !== 'string'
				) {
					console.warn(
						`event['${dateParameter.startDate}'] and event['${dateParameter.endDate}'] are required to be a Date or a string`,
						event
					);
					return;
				}

				return {
					_clndrStartDateObject: new Date((start || end) as Date | string),
					_clndrEndDateObject: new Date((end || start) as Date | string),
					originalEvent: event,
				};
			}

			console.warn('Invalid event configuration', event);
		}).filter(event => !!event) as InternalClndrEvent[];
	}

	private calendarDay(options: Day) {
		const defaults: Day = {
			date: undefined,
			events: [],
			classes: this.options.targets.empty,
		};

		return Clndr.mergeOptions<Day>(defaults, options);
	}

	/**
	 * Action to go backward one or more periods.
	 */
	back(options: ClndrNavigationOptions = {}) {
		const defaults: ClndrNavigationOptions = {withCallbacks: false};
		const orig: Interval = [this.interval[0], this.interval[1]];

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		if (!this.constraints.previous) {
			return this;
		}

		this.interval = this.adapter.back(
			this.interval,
			this.options.pagination.step || this.options.pagination.size
		);

		this.render();

		if (options.withCallbacks) {
			this.triggerEvents(orig);
		}

		return this;
	}

	/**
	 * Alias of Clndr.back().
	 */
	previous(options: ClndrNavigationOptions = {}) {
		return this.back(options);
	}

	/**
	 * Action to go forward one or more periods.
	 */
	forward(options: ClndrNavigationOptions = {}) {
		const defaults: ClndrNavigationOptions = {withCallbacks: false};
		const orig: Interval = [this.interval[0], this.interval[1]];

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		if (!this.constraints.next) {
			return this;
		}

		this.interval = this.adapter.forward(
			this.interval,
			this.options.pagination.step || this.options.pagination.size
		);

		this.render();

		if (options.withCallbacks) {
			this.triggerEvents(orig);
		}

		return this;
	}

	/**
	 * Alias of Clndr.forward()
	 */
	next(options: ClndrNavigationOptions) {
		return this.forward(options);
	}

	/**
	 * Action to go back one year.
	 */
	previousYear(options: ClndrNavigationOptions = {}) {
		const defaults: ClndrNavigationOptions = {	withCallbacks: false};
		const orig: Interval = [this.interval[0], this.interval[1]];

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		if (!this.constraints.previousYear) {
			return this;
		}

		this.interval[0] = subYears(this.interval[0], 1);
		this.interval[1] = subYears(this.interval[1], 1);

		this.render();

		if (options.withCallbacks) {
			this.triggerEvents(orig);
		}

		return this;
	}

	/**
	 * Action to go forward one year.
	 */
	nextYear(options: ClndrNavigationOptions = {}) {
		const defaults: ClndrNavigationOptions = {withCallbacks: false};
		const orig: Interval = [this.interval[0], this.interval[1]];

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		if (!this.constraints.nextYear) {
			return this;
		}

		this.interval[0] = addYears(this.interval[0], 1);
		this.interval[1] = addYears(this.interval[1], 1);

		this.render();

		if (options.withCallbacks) {
			this.triggerEvents(orig);
		}

		return this;
	}

	today(options: ClndrNavigationOptions = {}) {
		const defaults: ClndrNavigationOptions = {withCallbacks: false};
		const orig: Interval = [this.interval[0], this.interval[1]];

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		this.interval = this.adapter.setDay(new Date(), this.options.startOn);

		// No need to re-render if the month was not changed
		if (
			!isSameMonth(this.interval[0], orig[0])
			|| !isSameMonth(this.interval[1], orig[1])
		) {
			this.render();
		}

		// Fire the today event handler regardless of any change
		if (options.withCallbacks) {
			if (this.options.clickEvents.today) {
				this.options.clickEvents.today.apply(this, [this.interval[0]]);
			}

			this.triggerEvents(orig);
		}
	}

	/**
	 * Changes the month being provided a value between 0 and 11.
	 */
	setMonth(newMonth: number, options: ClndrNavigationOptions = {}) {
		const orig: Interval = [this.interval[0], this.interval[1]];

		this.interval = this.adapter.setMonth(newMonth, this.interval);

		this.render();

		if (options && options.withCallbacks) {
			this.triggerEvents(orig);
		}

		return this;
	}

	setYear(newYear: number, options: ClndrNavigationOptions = {}) {
		const orig: Interval = [this.interval[0], this.interval[1]];

		this.interval[0] = setYear(this.interval[0], newYear);
		this.interval[1] = setYear(this.interval[1], newYear);

		this.render();

		if (options && options.withCallbacks) {
			this.triggerEvents(orig);
		}

		return this;
	}

	/**
	 * Sets the start of the time period.
	 */
	setIntervalStart(newDate: Date | string, options: ClndrNavigationOptions = {}) {
		const orig: Interval = [this.interval[0], this.interval[1]];

		this.interval = this.adapter.setDay(new Date(newDate), this.options.startOn);

		this.render();

		if (options && options.withCallbacks) {
			this.triggerEvents(orig);
		}

		return this;
	}

	/**
	 * Overwrites extras and triggers re-rendering.
	 */
	setExtras(extras: unknown) {
		this.options.extras = extras;
		this.render();

		return this;
	}

	/**
	 * Overwrites events and triggers re-rendering.
	 */
	setEvents(events: ClndrEvent[]) {
		this.events = this.parseToInternalEvents(events);
		this.render();

		return this;
	}

	/**
	 * Adds additional events and triggers re-rendering.
	 */
	addEvents(events: ClndrEvent[], reRender = true) {
		this.options.events = [...this.options.events, ...events];
		this.events = [...this.events, ...this.parseToInternalEvents(events)];

		if (reRender) {
			this.render();
		}

		return this;
	}

	/**
	 * Removes all events according to a matching function and triggers rendering.
	 */
	removeEvents(matchingFn: (event: ClndrEvent) => boolean) {
		for (let i = this.options.events.length - 1; i >= 0; i--) {
			if (matchingFn(this.options.events[i])) {
				this.options.events.splice(i, 1);
				this.events.splice(i, 1);
			}
		}

		this.render();

		return this;
	}

	destroy() {
		(this.calendarContainer as HTMLElement).innerHTML = '';
		(this.calendarContainer as HTMLElement).remove();

		this.options = defaults;
	}

}

export default Clndr;