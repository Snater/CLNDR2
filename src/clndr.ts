import {
	FormatOptions,
	Locale,
	addDays,
	addMonths,
	addWeeks,
	addYears,
	endOfDay,
	endOfMonth,
	endOfWeek,
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
	setMonth,
	setYear,
	startOfDay,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
	subWeeks,
	subYears,
} from 'date-fns';

import type {
	ClndrEvent,
	ClndrEventOrigin,
	ClndrInteractionEvent,
	ConstraintCheckSubject,
	ConstraintChecks,
	Constraints,
	Day,
	DayProperties,
	InternalClndrEvent,
	Interval,
	LengthOfTime,
	Month,
	MultiDayEvents,
	NavigationOptions,
	Options,
	SetterOptions,
	Target,
	TargetOption,
	UserOptions,
} from './types';

// Defaults used throughout the application, see docs.
const defaults: Options = {
	events: [],
	ready: null,
	extras: null,
	locale: null,
	weekOffset: 0,
	constraints: null,
	forceSixRows: false,
	selectedDate: null,
	doneRendering: null,
	daysOfTheWeek: null,
	multiDayEvents: null,
	startWithMonth: null,
	dateParameter: 'date',
	showAdjacentMonths: true,
	trackSelectedDate: false,
	formatWeekdayHeader: null,
	adjacentDaysChangeMonth: false,
	ignoreInactiveDaysInSelection: false,
	lengthOfTime: {
		days: null,
		interval: 1,
		months: null,
		startDate: null,
	},
	clickEvents: {},
	useTouchEvents: false,
	targets: {
		day: 'day',
		empty: 'empty',
		nextButton: 'clndr-next-button',
		todayButton: 'clndr-today-button',
		previousButton: 'clndr-previous-button',
		nextYearButton: 'clndr-next-year-button',
		previousYearButton: 'clndr-previous-year-button',
	},
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
};

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
				if (!targetObject[key]) {
					Object.assign(targetObject, {[key]: {}});
				}
				Clndr.mergeDeep(
					targetObject[key] as {[k: string]: unknown},
					source[key] as {[k: string]: unknown},
				);
			} else {
				Object.assign(target, {[key]: source[key]});
			}
		}

		return Clndr.mergeDeep(target, ...sources);
	}

	static mergeOptions<T extends {[key: string]: unknown}, S extends {[key: string]: unknown} = T>(
		target: T,
		source: S,
	) {
		return Clndr.mergeDeep<T, S>({} as T, target, source);
	}

	private readonly element: HTMLElement;
	private readonly constraints: ConstraintChecks;
	private readonly interval: Interval;
	private options: Options;
	private daysOfTheWeek: string[];
	private calendarContainer?: HTMLElement;
	private eventsLastMonth: InternalClndrEvent[];
	private eventsNextMonth: InternalClndrEvent[];
	private eventsThisInterval: InternalClndrEvent[];
	private eventHandler?: EventListener;
	private events: InternalClndrEvent[];
	/**
	 * Helper object for days to be able to resolve their classes correctly.
	 */
	private _currentIntervalStart: Date;

	/**
	 * The actual plugin constructor.
	 * Parses the events and lengthOfTime options to build a calendar of day
	 * objects containing event information from the events array.
	 */
	constructor(element: HTMLElement, options: UserOptions) {
		this.element = element;
		this.daysOfTheWeek = [];
		this._currentIntervalStart = new Date();
		this.eventsLastMonth = [];
		this.eventsNextMonth = [];
		this.eventsThisInterval = [];

		// Merge the default options with user-provided options
		this.options = Clndr.mergeOptions<Options, UserOptions>(defaults, options);

		// Validate any correct options
		this.validateOptions();

		// Boolean values used to log if any contraints are met
		this.constraints = {
			next: true,
			today: true,
			previous: true,
			nextYear: true,
			previousYear: true,
		};

		// If there are events, we should run them through our
		// addDateObjectToEvents function which will add a date object that
		// we can use to make life easier. This is only necessarywhen events
		// are provided on instantiation, since our setEvents function uses
		// addDateObjectToEvents.
		this.events = this.options.multiDayEvents
			? this.addMultiDayDateObjectsToEvents(this.options.events)
			: this.addDateObjectToEvents(this.options.events);

		// Annihilate any chance for bugs by overwriting conflicting options.
		if (this.options.lengthOfTime.months) {
			this.options.lengthOfTime.days = null;
		}

		// To support arbitrary lengths of time we're going to store the current range in addition to
		// the current month.
		this.interval = this.initInterval(
			this.options.lengthOfTime,
			this.options.startWithMonth,
			this.options.weekOffset,
		);

		if (this.options.startWithMonth) {
			this.interval.month = startOfMonth(new Date(this.options.startWithMonth));
			this.interval.start = new Date(this.interval.month);
			this.interval.end = this.options.lengthOfTime.days
				? endOfDay(addDays(this.interval.month, this.options.lengthOfTime.days - 1))
				: endOfMonth(this.interval.month);
		}

		// If we've got constraints set, make sure the interval is within them.
		if (this.options.constraints) {
			this.interval = this.initConstraints(
				this.options.constraints,
				this.options.lengthOfTime,
				this.interval,
			);
		}

		this.daysOfTheWeek = this.options.daysOfTheWeek
			? this.options.daysOfTheWeek
			: this.initDaysOfTheWeek(this.options.formatWeekdayHeader, this.options.locale);

		if (this.options.weekOffset) {
			this.daysOfTheWeek = this.shiftWeekdayLabels(this.daysOfTheWeek, this.options.weekOffset);
		}

		// Quick and dirty test to make sure rendering is possible.
		if (!(this.options as UserOptions).render) {
			throw new Error(
				'No render function provided per the "render" option. A render function is required for ' +
				'rendering the calendar, i.e. when using EJS: data => ejs.render(defaultTemplate, data)',
			);
		}

		this.element.innerHTML = '<div class="clndr"></div>';
		this.calendarContainer = this.element.querySelector('.clndr') as HTMLElement;

		this.bindEvents();

		this.render();

		this.options.ready?.apply(this, []);
	}

	private initInterval(
		lengthOfTime: LengthOfTime,
		startWithMonth: Date | string | null,
		weekOffset: number,
	): Interval {

		if (lengthOfTime.months) {
			const start = startOfMonth(
				new Date(lengthOfTime.startDate || startWithMonth || Date.now()),
			);

			// Subtract a day so that we are at the end of the interval. We always want intervalEnd to be
			// inclusive.
			const end = subDays(addMonths(start, lengthOfTime.months), 1);

			return {start, end, month: new Date(start)};
		}

		if (lengthOfTime.days) {
			const start = startOfDay(lengthOfTime.startDate
				? new Date(lengthOfTime.startDate)
				: setDay(new Date(), weekOffset),
			);

			const end = endOfDay(addDays(start, lengthOfTime.days - 1));

			return {start, end, month: new Date(start)};
		}

		// No length of time specified, so we're going to default into using the current month as the
		// time period.
		const month = startOfMonth(new Date());

		return {
			month,
			start: new Date(month),
			end: endOfMonth(month),
		};
	}

	private initConstraints(
		constraints: Constraints,
		lengthOfTime: LengthOfTime,
		interval: Interval,
	) {
		let adjustedInterval: Interval = {
			month: interval.month,
			start: interval.start,
			end: interval.end,
		};

		if (constraints.startDate) {
			adjustedInterval = this.initStartConstraint(
				new Date(constraints.startDate),
				lengthOfTime,
				adjustedInterval,
			);
		}

		if (constraints.endDate) {
			adjustedInterval = this.initEndConstraint(
				new Date(constraints.endDate),
				lengthOfTime,
				adjustedInterval,
			);
		}

		return adjustedInterval;
	}

	private initStartConstraint(
		constraintStart: Date,
		lengthOfTime: LengthOfTime,
		interval: Interval,
	) {
		const adjustedInterval: Interval = {
			month: interval.month,
			start: interval.start,
			end: interval.end,
		};

		if (lengthOfTime.days) {
			if (isBefore(adjustedInterval.start, subWeeks(constraintStart, 1))) {
				adjustedInterval.start = startOfWeek(constraintStart);
			}

			adjustedInterval.end = endOfDay(addDays(adjustedInterval.start, lengthOfTime.days - 1));
			adjustedInterval.month = new Date(adjustedInterval.start);
		} else {
			if (isBefore(adjustedInterval.start, subMonths(constraintStart, 1))) {
				adjustedInterval.start = setYear(
					setMonth(adjustedInterval.start, getMonth(constraintStart)),
					getYear(constraintStart),
				);
				adjustedInterval.month = setYear(
					setMonth(adjustedInterval.month, getMonth(constraintStart)),
					getYear(constraintStart),
				);
			}

			if (isBefore(adjustedInterval.end, subMonths(constraintStart, 1))) {
				adjustedInterval.end = setYear(
					setMonth(adjustedInterval.end, getMonth(constraintStart)),
					getYear(constraintStart),
				);
			}
		}

		return adjustedInterval;
	}

	private initEndConstraint(
		constraintEnd: Date,
		lengthOfTime: LengthOfTime,
		interval: Interval,
	) {
		const adjustedInterval: Interval = {
			month: interval.month,
			start: interval.start,
			end: interval.end,
		};

		if (lengthOfTime.days) {
			if (isAfter(adjustedInterval.start, addWeeks(constraintEnd, 1))) {
				adjustedInterval.start = startOfDay(
					subDays(endOfWeek(constraintEnd), lengthOfTime.days - 1),
				);
				adjustedInterval.end = endOfWeek(constraintEnd);
				adjustedInterval.month = new Date(adjustedInterval.start);
			}
		} else {
			if (isAfter(adjustedInterval.end, addMonths(constraintEnd, 1))) {
				adjustedInterval.end = setYear(
					setMonth(adjustedInterval.end, getMonth(constraintEnd)),
					getYear(constraintEnd),
				);
				adjustedInterval.month = setYear(
					setMonth(adjustedInterval.month, getMonth(constraintEnd)),
					getYear(constraintEnd),
				);
			}

			if (isAfter(adjustedInterval.start, addMonths(constraintEnd, 1))) {
				adjustedInterval.start = setYear(
					setMonth(adjustedInterval.start, getMonth(constraintEnd)),
					getYear(constraintEnd),
				);
			}
		}

		return adjustedInterval;
	}

	private initDaysOfTheWeek(
		formatWeekdayHeader: ((day: Date, locale?: Locale) => string) | null,
		locale: Locale | null,
	) {
		const daysOfTheWeek: string[] = [];

		formatWeekdayHeader = formatWeekdayHeader || function (day: Date, locale?: Locale) {
			return format(day, 'cccccc', {locale}).charAt(0);
		};

		for (let i = 0; i < 7; i++) {
			daysOfTheWeek.push(formatWeekdayHeader(setDay(new Date(), i), locale || undefined));
		}

		return daysOfTheWeek;
	}

	private shiftWeekdayLabels(daysOfTheWeek: string[], offset: number) {
		const adjustedDaysOfTheWeek = [...daysOfTheWeek];

		for (let i = 0; i < offset; i++) {
			adjustedDaysOfTheWeek.push(adjustedDaysOfTheWeek.shift() as string);
		}

		return adjustedDaysOfTheWeek;
	}

	private validateOptions() {
		// Fix the week offset. It must be between 0 (Sunday) and 6 (Saturday)
		if (this.options.weekOffset > 6 || this.options.weekOffset < 0) {
			console.warn(
				'clndr.js: An invalid offset ' + this.options.weekOffset +
				' was provided (must be 0 - 6); using 0 instead.');
			this.options.weekOffset = 0;
		}
	}

	private createDaysObject(startDate: Date, endDate: Date) {
		// This array will contain the data of the entire grid (including blank spaces)
		let days: Day[] = [];
		let dateIterator;

		this._currentIntervalStart = new Date(startDate);

		this.parseEvents(startDate, endDate);

		// If greater than 0, the last days of the previous month have to be filled in to account for
		// the empty boxes in the grid, also taking the weekOffset into account.
		let remainingDaysOfPreviousMonth = getDay(startDate) - this.options.weekOffset;

		// The weekOffset points to a day in the previous month
		if (remainingDaysOfPreviousMonth < 0) {
			remainingDaysOfPreviousMonth += 7;
		}

		if (!this.options.lengthOfTime.days && remainingDaysOfPreviousMonth > 0) {
			days = [
				...days,
				...this.aggregateDaysOfPreviousMonth(startDate, remainingDaysOfPreviousMonth),
			];
		}

		// Add the days of the current interval
		dateIterator = new Date(startDate);

		while (isBefore(dateIterator, endDate) || isSameDay(dateIterator, endDate)) {
			days.push(this.createDayObject(dateIterator, this.eventsThisInterval));
			dateIterator = addDays(dateIterator, 1);
		}

		// If there are any trailing blank boxes, fill those in with the next month's first days
		const remainingDaysOfNextMonth = 7 - days.length % 7;

		if (!this.options.lengthOfTime.days && remainingDaysOfNextMonth < 7) {
			days = [...days, ...this.aggregateDaysOfNextMonth(dateIterator, remainingDaysOfNextMonth)];
			dateIterator = addDays(dateIterator, remainingDaysOfNextMonth + 1);
		}

		// Add another row if needed when forcing six rows (42 is 6 rows of 7 days)
		const remainingDaysForSixRows = 42 - days.length;

		if (this.options.forceSixRows && remainingDaysForSixRows > 0) {
			days = [...days, ...this.aggregateDaysOfNextMonth(dateIterator, remainingDaysForSixRows)];
		}

		return days;
	}

	/**
	 * Filters the events list to events that are happening last month, this month an next month
	 * (within the current grid view).
	 */
	private parseEvents(startDate: Date, endDate: Date) {
		// Filter the events list (if it exists) to events that are happening last month, this month and
		// next month (within the current grid view).
		this.eventsLastMonth = [];
		this.eventsNextMonth = [];
		this.eventsThisInterval = [];

		if (!this.events.length) {
			return;
		}

		// Here are the only two cases where we don't get an event in our interval:
		//   startDate | endDate | e.start   | e.end
		//   e.start   | e.end   | startDate | endDate
		this.eventsThisInterval = this.events.filter(event => {
			const afterEnd = isAfter(event._clndrStartDateObject, endDate);
			const beforeStart = isBefore(event._clndrEndDateObject, startDate);

			return !(beforeStart || afterEnd);
		});

		if (!this.options.showAdjacentMonths) {
			return;
		}

		const startOfLastMonth = startOfMonth(subMonths(startDate, 1));
		const endOfLastMonth = endOfMonth(startOfLastMonth);
		const startOfNextMonth = startOfMonth(addMonths(endDate, 1));
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

	private aggregateDaysOfPreviousMonth(startDate: Date, count: number) {
		const days: Day[] = [];

		for (let i = 1; i <= count; i++) {
			if (this.options.showAdjacentMonths) {
				const day = subDays(new Date(getYear(startDate), getMonth(startDate), i), count);
				days.push(this.createDayObject(day, this.eventsLastMonth));
			} else {
				days.push(
					this.calendarDay({
						classes: [this.options.targets.empty, this.options.classes.lastMonth].join(' '),
					}),
				);
			}
		}

		return days;
	}

	private aggregateDaysOfNextMonth(startDate: Date, count: number) {
		const days: Day[] = [];

		for (let i = 0; i < count; i++) {
			if (this.options.showAdjacentMonths) {
				days.push(this.createDayObject(addDays(startDate, i), this.eventsNextMonth));
			} else {
				days.push(
					this.calendarDay({
						classes: [this.options.targets.empty, this.options.classes.nextMonth].join(' '),
					}));
			}
		}

		return days;
	}

	private createDayObject(day: Date, monthEvents: InternalClndrEvent[]) {
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

		if (!this.options.lengthOfTime.days) {
			if (getMonth(this._currentIntervalStart) > getMonth(day)) {
				classes.push(this.options.classes.adjacentMonth);
				properties.isAdjacentMonth = true;

				getYear(this._currentIntervalStart) === getYear(day)
					? classes.push(this.options.classes.lastMonth)
					: classes.push(this.options.classes.nextMonth);
			} else if (getMonth(this._currentIntervalStart) < getMonth(day)) {
				classes.push(this.options.classes.adjacentMonth);
				properties.isAdjacentMonth = true;

				getYear(this._currentIntervalStart) === getYear(day)
					? classes.push(this.options.classes.nextMonth)
					: classes.push(this.options.classes.lastMonth);
			}
		}

		// If there are constraints, we need to add the inactive class to the days outside of them.
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
			events: eventsToday,
			properties: properties,
			classes: classes.join(' '),
		});
	}

	/**
	 * Renders the calendar.
	 *
	 * Get rid of the previous set of calendar parts.
	 */
	private render() {
		let i;
		let days;
		let months: Month[];
		let target;
		let data;
		let end = null;
		let start = null;
		let numberOfRows;
		let eventsThisInterval;
		let currentIntervalEnd;
		let currentIntervalStart;
		const oneYearFromEnd = addYears(this.interval.end, 1);
		const oneYearAgo = subYears(this.interval.start, 1);
		const formatProxy = (date: Date, formatStr: string, options: FormatOptions = {}) => {
			return format(date, formatStr, {locale: this.options.locale || undefined, ...options});
		};

		// FIXME: Set calendarContainer in constructor
		(this.calendarContainer as HTMLElement).innerHTML = '';

		if (this.options.lengthOfTime.days) {
			days = this.createDaysObject(this.interval.start, this.interval.end);
			data = {
				days: days,
				months: [],
				year: null,
				month: null,
				eventsLastMonth: [],
				eventsNextMonth: [],
				eventsThisMonth: [],
				extras: this.options.extras,
				daysOfTheWeek: this.daysOfTheWeek,
				intervalEnd: this.interval.end,
				numberOfRows: Math.ceil(days.length / 7),
				intervalStart: this.interval.start,
				eventsThisInterval: this.eventsThisInterval.map(event => event.originalEvent),
				format: formatProxy,
			};
		} else if (this.options.lengthOfTime.months) {
			months = [];
			numberOfRows = 0;
			eventsThisInterval = [];

			for (i = 0; i < this.options.lengthOfTime.months; i++) {
				currentIntervalStart = addMonths(this.interval.start, i);
				currentIntervalEnd = endOfMonth(currentIntervalStart);
				days = this.createDaysObject(currentIntervalStart, currentIntervalEnd);
				// Save events processed for each month into a master array of
				// events for this interval
				eventsThisInterval.push(this.eventsThisInterval);
				months.push({
					days: days,
					month: currentIntervalStart,
				});
			}

			// Get the total number of rows across all months
			for (i = 0; i < months.length; i++) {
				numberOfRows += Math.ceil(months[i].days.length / 7);
			}

			data = {
				days: [],
				year: null,
				month: null,
				months: months,
				eventsThisMonth: [],
				numberOfRows: numberOfRows,
				extras: this.options.extras,
				intervalEnd: this.interval.end,
				intervalStart: this.interval.start,
				daysOfTheWeek: this.daysOfTheWeek,
				eventsLastMonth: this.eventsLastMonth.map(event => event.originalEvent),
				eventsNextMonth: this.eventsNextMonth.map(event => event.originalEvent),
				eventsThisInterval: eventsThisInterval.map(
					events => events.map(event => event.originalEvent),
				),
				format: formatProxy,
			};
		} else {
			// Get an array of days and blank spaces
			days = this.createDaysObject(
				startOfMonth(this.interval.month),
				endOfMonth(this.interval.month),
			);

			data = {
				days: days,
				months: [],
				intervalEnd: null,
				intervalStart: null,
				year: getYear(this.interval.month),
				eventsThisInterval: null,
				extras: this.options.extras,
				month: format(this.interval.month, 'MMMM', {locale: this.options.locale || undefined}),
				daysOfTheWeek: this.daysOfTheWeek,
				eventsLastMonth: this.eventsLastMonth.map(event => event.originalEvent),
				eventsNextMonth: this.eventsNextMonth.map(event => event.originalEvent),
				numberOfRows: Math.ceil(days.length / 7),
				eventsThisMonth: this.eventsThisInterval.map(event => event.originalEvent),
				format: formatProxy,
			};
		}

		// Render the calendar with the data above & bind events to its elements
		(this.calendarContainer as HTMLElement).innerHTML
			= (this.options as UserOptions).render.apply(this, [data]);

		// If there are constraints, we need to add the 'inactive' class to
		// the controls.
		if (this.options.constraints) {
			// In the interest of clarity we're just going to remove all
			// inactive classes and re-apply them each render.
			for (target in this.options.targets) {
				if (target !== 'day') {
					this.element
						.querySelectorAll('.' + this.options.targets[target as TargetOption])
						.forEach(element => element.classList.remove(this.options.classes.inactive));
				}
			}

			// Just like the classes we'll set this internal state to true and
			// handle the disabling below.
			for (i in this.constraints) {
				this.constraints[i as ConstraintCheckSubject] = true;
			}

			if (this.options.constraints.startDate) {
				start = new Date(this.options.constraints.startDate);
			}

			if (this.options.constraints.endDate) {
				end = new Date(this.options.constraints.endDate);
			}

			// Deal with the month controls first. Do we have room to go back?
			if (start && (isAfter(start, this.interval.start) || isSameDay(start, this.interval.start))) {
				this.element
					.querySelectorAll('.' + this.options.targets.previousButton)
					.forEach(element => element.classList.add(this.options.classes.inactive));
				this.constraints.previous = !this.constraints.previous;
			}

			// Do we have room to go forward?
			if (end && (isBefore(end, this.interval.end) || isSameDay(end, this.interval.end))) {
				this.element
					.querySelectorAll('.' + this.options.targets.nextButton)
					.forEach(element => element.classList.add(this.options.classes.inactive));
				this.constraints.next = !this.constraints.next;
			}

			// What's last year looking like?
			if (start && isAfter(start, oneYearAgo)) {
				this.element
					.querySelectorAll('.' + this.options.targets.previousYearButton)
					.forEach(element => element.classList.add(this.options.classes.inactive));
				this.constraints.previousYear = !this.constraints.previousYear;
			}

			// How about next year?
			if (end && isBefore(end, oneYearFromEnd)) {
				this.element
					.querySelectorAll('.' + this.options.targets.nextYearButton)
					.forEach(element => element.classList.add(this.options.classes.inactive));
				this.constraints.nextYear = !this.constraints.nextYear;
			}

			// Today? We could put this in init(), but we want to support the
			// user changing the constraints on a living instance.
			if ((start && isAfter(start, addMonths(new Date(), 1))) ||
				(end && isBefore(end, subMonths(new Date(), 1)))
			) {
				this.element
					.querySelectorAll('.' + this.options.targets.todayButton)
					.forEach(element => element.classList.add(this.options.classes.inactive));
				this.constraints.today = !this.constraints.today;
			}
		}

		if (this.options.doneRendering) {
			this.options.doneRendering.apply(this, []);
		}
	}

	private bindEvents() {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;
		const container = this.element;
		const targets = this.options.targets;
		const classes = self.options.classes;
		const eventType = this.options.useTouchEvents ? 'touchstart' : 'click';

		this.eventHandler = function (event) {
			const eventTarget = event.target as HTMLElement;

			let target;
			let currentTarget: HTMLElement;

			// Target the day elements and give them click events
			if (eventTarget.closest('.' + targets.day)) {
				currentTarget = eventTarget.closest('.' + targets.day) as HTMLElement;

				// If adjacentDaysChangeMonth is on, we need to change the
				// month here. Forward and Back trigger render() to be called.
				// This is a callback because it can be triggered in two places.
				const handleAdjacentDay = function () {
					if (self.options.adjacentDaysChangeMonth) {
						if (currentTarget.classList.contains(classes.lastMonth)) {
							self.backActionWithContext(self);
							return true;
						} else if (currentTarget.classList.contains(classes.nextMonth)) {
							self.forwardActionWithContext(self);
							return true;
						}
					}
				};

				// If setting is enabled, we want to store the selected date
				// as a string. When render() is called, the selected date will
				// get the additional classes added. If there is no re-render,
				// then just add the classes manually.
				if (self.options.trackSelectedDate &&
					!(self.options.ignoreInactiveDaysInSelection &&
						currentTarget.classList.contains(classes.inactive))
				) {
					// If there was no re-render, manually update classes
					if (!handleAdjacentDay()) {
						// Remember new selected date
						self.options.selectedDate =
							self.getTargetDateString(currentTarget);
						container.querySelectorAll('.' + classes.selected)
							.forEach(node => node.classList.remove(classes.selected));
						currentTarget.classList.add(classes.selected);
					}
				} else {
					handleAdjacentDay();
				}

				// Trigger click events after any selected date updates
				if (self.options.clickEvents.click) {
					target = self.buildTargetObject(currentTarget, true);
					self.options.clickEvents.click.apply(self, [target]);
				}
			}

			// Target the empty calendar boxes as well
			if (eventTarget.closest('.' + targets.empty)) {
				currentTarget = eventTarget.closest('.' + targets.empty) as HTMLElement;

				if (self.options.clickEvents.click) {
					target = self.buildTargetObject(currentTarget, false);
					self.options.clickEvents.click.apply(self, [target]);
				}

				if (self.options.adjacentDaysChangeMonth) {
					if (currentTarget.classList.contains(classes.lastMonth)) {
						self.backActionWithContext(self);
					} else if (currentTarget.classList.contains(classes.nextMonth)) {
						self.forwardActionWithContext(self);
					}
				}
			}

			// Bind the previous, next and today buttons. We pass the current
			// context along with the event so that it can update this instance.

			const customEvent = event as ClndrInteractionEvent;

			customEvent.data = {
				context: self,
			};

			if (eventTarget.closest('.' + targets.todayButton)) {
				self.todayAction(customEvent);
			}

			if (eventTarget.closest('.' + targets.nextButton)) {
				self.forwardAction(customEvent);
			}

			if (eventTarget.closest('.' + targets.previousButton)) {
				self.backAction(customEvent);
			}

			if (eventTarget.closest('.' + targets.nextYearButton)) {
				self.nextYearAction(customEvent);
			}

			if (eventTarget.closest('.' + targets.previousYearButton)) {
				self.previousYearAction(customEvent);
			}
		};

		container.addEventListener(eventType, this.eventHandler);
	}

	/**
	 * Creates the object to be returned along with click events.
	 */
	private buildTargetObject(currentTarget: HTMLElement, targetWasDay: boolean): Target {
		const dateString = this.getTargetDateString(currentTarget);
		const target: Target = {
			date: dateString ? new Date(dateString) : null,
			events: [],
			element: currentTarget,
		};

		// No reason to figure out the target day's event if click was just on an empty box or if there
		// are no events at all
		if (!targetWasDay || !target.date || this.events.length === 0) {
			return target;
		}

		const targetEndDate = endOfDay(target.date);

		target.events = this.events.filter(event => {
			if (this.options.multiDayEvents) {
				return target.date && !isAfter(event._clndrStartDateObject, targetEndDate) &&
					!isAfter(target.date, event._clndrEndDateObject);
			} else {
				return dateString === format(event._clndrStartDateObject, 'yyyy-MM-dd');
			}
		}).map(event => event.originalEvent);

		return target;
	}

	/**
	 * Get date string ("YYYY-MM-DD") associated with the given target.
	 * This method is meant to be called on ".day" elements.
	 */
	private getTargetDateString(target: HTMLElement) {
		const index = target.className.indexOf('calendar-day-');

		return index === -1
			? null
			: target.className.substring(index + 13, index + 23);
	}

	/**
	 * Triggers any applicable events given a change in the calendar's start
	 * and end dates. ctx contains the current (changed) start and end date,
	 * orig contains the original start and end dates.
	 */
	private triggerEvents(ctx: Clndr, orig: ClndrEventOrigin) {
		let nextInterval;
		let prevInterval;
		let intervalChanged;
		const monthArg: [Date] = [new Date(ctx.interval.month)];
		const timeOpt = ctx.options.lengthOfTime;
		const eventsOpt = ctx.options.clickEvents;
		const newInt = {
			end: ctx.interval.end,
			start: ctx.interval.start,
		};
		const intervalArg: [Date, Date] = [
			new Date(ctx.interval.start),
			new Date(ctx.interval.end),
		];

		// We want to determine if any of the change conditions have been
		// hit and then trigger our events based off that.
		const nextMonth = isAfter(newInt.start, orig.start) &&
			(Math.abs(getMonth(newInt.start) - getMonth(orig.start)) === 1 ||
				(getMonth(orig.start) === 11 && getMonth(newInt.start) === 0));
		const prevMonth = isBefore(newInt.start, orig.start) &&
			(Math.abs(getMonth(orig.start) - getMonth(newInt.start)) === 1 ||
				(getMonth(orig.start) === 0 && getMonth(newInt.start) === 11));
		const monthChanged = getMonth(newInt.start) !== getMonth(orig.start) ||
			getYear(newInt.start) !== getYear(orig.start);
		const nextYear = getYear(newInt.start) - getYear(orig.start) === 1 ||
			getYear(newInt.end) - getYear(orig.end) === 1;
		const prevYear = getYear(orig.start) - getYear(newInt.start) === 1 ||
			getYear(orig.end) - getYear(newInt.end) === 1;
		const yearChanged = getYear(newInt.start) !== getYear(orig.start);

		// Only configs with a time period will get the interval change event
		if (timeOpt.days || timeOpt.months) {
			nextInterval = isAfter(newInt.start, orig.start);
			prevInterval = isBefore(newInt.start, orig.start);
			intervalChanged = nextInterval || prevInterval;

			if (nextInterval && eventsOpt.nextInterval) {
				eventsOpt.nextInterval.apply(ctx, intervalArg);
			}

			if (prevInterval && eventsOpt.previousInterval) {
				eventsOpt.previousInterval.apply(ctx, intervalArg);
			}

			if (intervalChanged && eventsOpt.onIntervalChange) {
				eventsOpt.onIntervalChange.apply(ctx, intervalArg);
			}
		} else {
			// @V2-todo see https://github.com/kylestetz/CLNDR/issues/225
			if (nextMonth && eventsOpt.nextMonth) {
				eventsOpt.nextMonth.apply(ctx, monthArg);
			}

			if (prevMonth && eventsOpt.previousMonth) {
				eventsOpt.previousMonth.apply(ctx, monthArg);
			}

			if (monthChanged && eventsOpt.onMonthChange) {
				eventsOpt.onMonthChange.apply(ctx, monthArg);
			}

			if (nextYear && eventsOpt.nextYear) {
				eventsOpt.nextYear.apply(ctx, monthArg);
			}

			if (prevYear && eventsOpt.previousYear) {
				eventsOpt.previousYear.apply(ctx, monthArg);
			}

			if (yearChanged && eventsOpt.onYearChange) {
				eventsOpt.onYearChange.apply(ctx, monthArg);
			}
		}
	}

	/**
	 * Main action to go backward one period. Other methods call these, like
	 * backAction which proxies events, and backActionWithContext which is
	 * an internal method that this library uses.
	 */
	back(options: NavigationOptions = {}, ctx?: Clndr) {
		ctx = ctx || this;
		const timeOpt = ctx.options.lengthOfTime;
		const defaults = {
			withCallbacks: false,
		};
		const orig: ClndrEventOrigin = {
			end: ctx.interval.end,
			start: ctx.interval.start,
		};

		// Extend any options
		options = Clndr.mergeOptions<NavigationOptions>(defaults, options) as NavigationOptions;

		// Before we do anything, check if any constraints are limiting this
		if (!ctx.constraints.previous) {
			return ctx;
		}

		if (timeOpt.days && timeOpt.interval) {
			// Shift the interval in days
			ctx.interval.start = startOfDay(subDays(ctx.interval.start, timeOpt.interval));
			ctx.interval.end = endOfDay(addDays(ctx.interval.start, timeOpt.days - 1));
			// @V2-todo Useless, but consistent with API
			ctx.interval.month = new Date(ctx.interval.start);
		} else {
			// Shift the interval by a month (or several months)
			ctx.interval.start = startOfMonth(subMonths(ctx.interval.start, timeOpt.interval));
			ctx.interval.end = endOfMonth(
				subDays(addMonths(ctx.interval.start, timeOpt.months || timeOpt.interval), 1),
			);
			ctx.interval.month = new Date(ctx.interval.start);
		}

		ctx.render();

		if (options.withCallbacks) {
			ctx.triggerEvents(ctx, orig);
		}

		return ctx;
	}

	backAction(event: ClndrInteractionEvent) {
		const ctx = event.data.context;

		ctx.backActionWithContext(ctx);
	}

	private backActionWithContext(ctx: Clndr) {
		ctx.back({
			withCallbacks: true,
		}, ctx);
	}

	previous(options: NavigationOptions = {}) {
		// Alias
		return this.back(options);
	}

	/**
	 * Main action to go forward one period. Other methods call these, like
	 * forwardAction which proxies events, and backActionWithContext which
	 * is an internal method that this library uses.
	 */
	forward(options: NavigationOptions = {}, ctx?: Clndr) {
		ctx = ctx || this;
		const timeOpt = ctx.options.lengthOfTime;
		const defaults = {
			withCallbacks: false,
		};
		const orig: ClndrEventOrigin = {
			end: ctx.interval.end,
			start: ctx.interval.start,
		};

		// Extend any options
		options = Clndr.mergeOptions<NavigationOptions>(defaults, options);

		// Before we do anything, check if any constraints are limiting this
		if (!ctx.constraints.next) {
			return ctx;
		}

		if (timeOpt.days && timeOpt.interval) {
			// Shift the interval in days
			ctx.interval.start = startOfDay(addDays(ctx.interval.start, timeOpt.interval));
			ctx.interval.end = endOfDay(addDays(ctx.interval.start, timeOpt.days - 1));
			// @V2-todo Useless, but consistent with API
			ctx.interval.month = new Date(ctx.interval.start);
		} else {
			// Shift the interval by a month (or several months)
			ctx.interval.start = startOfMonth(addMonths(ctx.interval.start, timeOpt.interval));
			ctx.interval.end = endOfMonth(
				subDays(addMonths(ctx.interval.start, timeOpt.months || timeOpt.interval), 1),
			);
			ctx.interval.month = new Date(ctx.interval.start);
		}

		ctx.render();

		if (options.withCallbacks) {
			ctx.triggerEvents(ctx, orig);
		}

		return ctx;
	}

	private forwardAction(event: ClndrInteractionEvent) {
		const ctx = event.data.context;

		ctx.forwardActionWithContext(ctx);
	}

	private forwardActionWithContext(ctx: Clndr) {
		ctx.forward({
			withCallbacks: true,
		}, ctx);
	}

	next(options: NavigationOptions) {
		// Alias
		return this.forward(options);
	}

	/**
	 * Main action to go back one year.
	 */
	previousYear(options: NavigationOptions = {}, ctx?: Clndr) {
		ctx = ctx || this;
		const defaults = {
			withCallbacks: false,
		};
		const orig: ClndrEventOrigin = {
			end: ctx.interval.end,
			start: ctx.interval.start,
		};

		// Extend any options
		options = Clndr.mergeOptions<NavigationOptions>(defaults, options);

		// Before we do anything, check if any constraints are limiting this
		if (!ctx.constraints.previousYear) {
			return ctx;
		}

		ctx.interval.month = subYears(ctx.interval.month, 1);
		ctx.interval.start = subYears(ctx.interval.start, 1);
		ctx.interval.end = subYears(ctx.interval.end, 1);
		ctx.render();

		if (options.withCallbacks) {
			ctx.triggerEvents(ctx, orig);
		}

		return ctx;
	}

	private previousYearAction(event: ClndrInteractionEvent) {
		event.data.context.previousYear({
			withCallbacks: true,
		}, event.data.context);
	}

	/**
	 * Main action to go forward one year.
	 */
	nextYear(options: NavigationOptions = {}, ctx?: Clndr) {
		ctx = ctx || this;
		const defaults = {
			withCallbacks: false,
		};
		const orig: ClndrEventOrigin = {
			end: ctx.interval.end,
			start: ctx.interval.start,
		};

		// Extend any options
		options = Clndr.mergeOptions<NavigationOptions>(defaults, options);

		// Before we do anything, check if any constraints are limiting this
		if (!ctx.constraints.nextYear) {
			return ctx;
		}

		ctx.interval.month = addYears(ctx.interval.month, 1);
		ctx.interval.start = addYears(ctx.interval.start, 1);
		ctx.interval.end = addYears(ctx.interval.end, 1);
		ctx.render();

		if (options.withCallbacks) {
			ctx.triggerEvents(ctx, orig);
		}

		return ctx;
	}

	private nextYearAction(event: ClndrInteractionEvent) {
		event.data.context.nextYear({
			withCallbacks: true,
		}, event.data.context);
	}

	today(options: NavigationOptions = {}, ctx?: Clndr) {
		ctx = ctx || this;
		const timeOpt = ctx.options.lengthOfTime;
		const defaults = {
			withCallbacks: false,
		};
		const orig: ClndrEventOrigin = {
			end: ctx.interval.end,
			start: ctx.interval.start,
		};

		// Extend any options
		options = Clndr.mergeOptions<NavigationOptions>(defaults, options);
		// @V2-todo Only used for legacy month view
		ctx.interval.month = startOfMonth(new Date());

		if (timeOpt.days) {
			// If there was a startDate specified, we should figure out what
			// the weekday is and use that as the starting point of our
			// interval. If not, go to today.weekday(0).
			if (timeOpt.startDate) {
				ctx.interval.start = startOfDay(setDay(new Date(), getDay(new Date(timeOpt.startDate))));
			} else {
				ctx.interval.start = startOfDay(setDay(new Date(), 0));
			}

			ctx.interval.end = endOfDay(addDays(ctx.interval.start, timeOpt.days - 1));
		} else {
			// Set the intervalStart to this month.
			ctx.interval.start = startOfMonth(new Date());
			ctx.interval.end = endOfMonth(
				subDays(addMonths(ctx.interval.start, timeOpt.months || timeOpt.interval), 1),
			);
		}

		// No need to re-render if we didn't change months.
		if (!isSameMonth(ctx.interval.start, orig.start) ||
			!isSameMonth(ctx.interval.end, orig.end)
		) {
			ctx.render();
		}

		// Fire the today event handler regardless of any change
		if (options.withCallbacks) {
			if (ctx.options.clickEvents.today) {
				ctx.options.clickEvents.today.apply(ctx, [new Date(ctx.interval.month)]);
			}

			ctx.triggerEvents(ctx, orig);
		}
	}

	todayAction(event: ClndrInteractionEvent) {
		event.data.context.today({
			withCallbacks: true,
		}, event.data.context);
	}

	/**
	 * Changes the month. Accepts 0-11.
	 */
	setMonth(newMonth: number, options: SetterOptions = {}) {
		const timeOpt = this.options.lengthOfTime;
		const orig: ClndrEventOrigin = {
			end: this.interval.end,
			start: this.interval.start,
		};

		if (timeOpt.days || timeOpt.months) {
			console.warn(
				'clndr.js: You are using a custom date interval. ' +
				'Use Clndr.setIntervalStart(startDate) instead.');
			return this;
		}

		this.interval.month = setMonth(this.interval.month, newMonth);
		this.interval.start = new Date(startOfMonth(this.interval.month));
		this.interval.end = endOfMonth(this.interval.start);
		this.render();

		if (options && options.withCallbacks) {
			this.triggerEvents(this, orig);
		}

		return this;
	}

	setYear(newYear: number, options: SetterOptions = {}) {
		const orig: ClndrEventOrigin = {
			end: this.interval.end,
			start: this.interval.start,
		};

		this.interval.month = setYear(this.interval.month, newYear);
		this.interval.end = setYear(this.interval.end, newYear);
		this.interval.start = setYear(this.interval.start, newYear);
		this.render();

		if (options && options.withCallbacks) {
			this.triggerEvents(this, orig);
		}

		return this;
	}

	/**
	 * Sets the start of the time period according to newDate.
	 * newDate can be a string or a Date object.
	 */
	setIntervalStart(newDate: Date | string, options: SetterOptions = {}) {
		const timeOpt = this.options.lengthOfTime;
		const orig: ClndrEventOrigin = {
			end: this.interval.end,
			start: this.interval.start,
		};

		if (!timeOpt.days && !timeOpt.months) {
			console.warn(
				'clndr.js: You are using a custom date interval. ' +
				'Use Clndr.setIntervalStart(startDate) instead.');
			return this;
		}

		if (timeOpt.days) {
			this.interval.start = startOfDay(new Date(newDate));
			this.interval.end = endOfDay(addDays(this.interval.start, timeOpt.days - 1));
		} else {
			this.interval.start = startOfMonth(new Date(newDate));
			this.interval.end = endOfMonth(
				subDays(addMonths(this.interval.start, timeOpt.months as number), 1),
			);
		}

		this.interval.month = new Date(this.interval.start);
		this.render();

		if (options && options.withCallbacks) {
			this.triggerEvents(this, orig);
		}

		return this;
	}

	/**
	 * Overwrites extras in the calendar and triggers a render.
	 */
	setExtras(extras: unknown) {
		this.options.extras = extras;
		this.render();

		return this;
	}

	/**
	 * Overwrites events in the calendar and triggers a render.
	 */
	setEvents(events: ClndrEvent[]) {
		this.events = this.options.multiDayEvents
			? this.addMultiDayDateObjectsToEvents(events)
			: this.addDateObjectToEvents(events);

		this.render();

		return this;
	}

	/**
	 * Adds additional events to the calendar and triggers a render.
	 */
	addEvents(events: ClndrEvent[], reRender = true) {
		// Go through each event and add a Date object
		if (this.options.multiDayEvents) {
			this.options.events = [...this.options.events, ...events];
			this.events = [...this.events, ...this.addMultiDayDateObjectsToEvents(events)];
		} else {
			this.options.events = [...this.options.events, ...events];
			this.events = [...this.events, ...this.addDateObjectToEvents(events)];
		}

		if (reRender) {
			this.render();
		}

		return this;
	}

	/**
	 * Passes all events through a matching function. Any that pass a truth
	 * test will be removed from the calendar's events. This triggers a render.
	 */
	removeEvents(matchingFn: (event: ClndrEvent) => boolean) {
		let i;

		for (i = this.options.events.length - 1; i >= 0; i--) {
			if (matchingFn(this.options.events[i])) {
				this.options.events.splice(i, 1);
				this.events.splice(i, 1);
			}
		}

		this.render();

		return this;
	}

	private addDateObjectToEvents(events: ClndrEvent[]) {
		return events.map(event => {
			return {
				// TODO: Resolve "as string"
				_clndrStartDateObject: new Date(event[this.options.dateParameter] as string),
				_clndrEndDateObject: new Date(event[this.options.dateParameter] as string),
				originalEvent: event,
			}
		});
	}

	private addMultiDayDateObjectsToEvents(events: ClndrEvent[]) {
		const multiEvents = this.options.multiDayEvents as MultiDayEvents;
		const internalEvents: InternalClndrEvent[] = [];

		events.forEach(event => {
			const start = multiEvents.startDate && event[multiEvents.startDate];
			const end = multiEvents.endDate && event[multiEvents.endDate];

			if (!end && !start && multiEvents.singleDay) {
				internalEvents.push({
					// TODO: Resolve "as string"
					_clndrEndDateObject: new Date(event[multiEvents.singleDay] as string),
					_clndrStartDateObject: new Date(event[multiEvents.singleDay] as string),
					originalEvent: event,
				});
			} else if (end || start) {
				// TODO: Check Date/string type
				internalEvents.push({
					_clndrEndDateObject: new Date((end || start) as Date | string),
					_clndrStartDateObject: new Date((start || end) as Date | string),
					originalEvent: event,
				});
			}
		});

		return internalEvents;
	}

	calendarDay(options: Day) {
		const defaults: Day = {
			day: '',
			date: undefined,
			events: [],
			classes: this.options.targets.empty,
		};

		return Clndr.mergeOptions<Day>(defaults, options);
	}

	destroy() {
		(this.calendarContainer as HTMLElement).innerHTML = '';
		(this.calendarContainer as HTMLElement).remove();

		this.options = defaults;
	}

}

// This is the default calendar template. This can be used in the function provided as render
// option, i.e: data => ejs.render(defaultTemplate, data);
export const defaultTemplate: string = `
	<div class="clndr-controls">
		<div class="clndr-control-button">
			<span class="clndr-previous-button">previous</span>
		</div>
		<div class="month"><%= month %> <%= year %></div>
		<div class="clndr-control-button rightalign">
			<span class="clndr-next-button">next</span>
		</div>
	</div>
	<table class="clndr-table" border="0" cellspacing="0" cellpadding="0">
		<thead>
			<tr class="header-days">
				<% for(var i = 0; i < daysOfTheWeek.length; i++) { %>
					<td class="header-day"><%= daysOfTheWeek[i] %></td>
				<% } %>
			</tr>
		</thead>
		<tbody>
			<% for(var i = 0; i < numberOfRows; i++){ %>
				<tr>
					<% for(var j = 0; j < 7; j++){ %>
						<% var d = j + i * 7; %>
						<td class="<%= days[d].classes %>">
							<div class="day-contents"><%= days[d].day %></div>
						</td>
					<% } %>
				</tr>
			<% } %>
		</tbody>
	</table>
`;

export default Clndr;