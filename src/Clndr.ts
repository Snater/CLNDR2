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
	LengthOfTime,
	NavigationConstraint,
	NavigationConstraints,
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
	dateParameter: 'date',
	events: [],
	forceSixRows: false,
	ignoreInactiveDaysInSelection: false,
	lengthOfTime: {interval: 1},
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
	/**
	 * Boolean values used to log whether any constraints are met
	 */
	private readonly constraints: NavigationConstraints;
	private readonly daysOfTheWeek: DaysOfTheWeek;
	private readonly interval: Interval;
	private options: InternalOptions;
	private calendarContainer: HTMLElement;
	private eventsLastMonth: InternalClndrEvent[];
	private eventsNextMonth: InternalClndrEvent[];
	private eventsThisInterval: InternalClndrEvent[];
	private events: InternalClndrEvent[];
	/**
	 * Helper object for days to be able to resolve their classes correctly.
	 */
	private _currentIntervalStart: Date;

	constructor(element: HTMLElement, options: ClndrOptions) {
		this.element = element;
		this._currentIntervalStart = new Date();
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

		this.constraints = {
			next: true,
			today: true,
			previous: true,
			nextYear: true,
			previousYear: true,
		};

		// Store the events internally with a Day object attached to them. The Day object eases
		// date comparisons while looping over the event dates
		this.events = [
			...this.addMultiDayDateObjectsToEvents(this.options.events),
			...this.addDateObjectToEvents(this.options.events),
		];

		// Annihilate any chance for bugs by overwriting conflicting options
		if (this.options.lengthOfTime.months) {
			this.options.lengthOfTime.days = undefined;
		}

		// To support arbitrary lengths of time, the current range is stored in addition to the current
		// month
		this.interval = this.initInterval(
			this.options.lengthOfTime,
			this.options.startWithMonth,
			this.options.weekOffset
		);

		if (this.options.startWithMonth) {
			this.interval.month = startOfMonth(new Date(this.options.startWithMonth));
			this.interval.start = new Date(this.interval.month);
			this.interval.end = this.options.lengthOfTime.days
				? endOfDay(addDays(this.interval.month, this.options.lengthOfTime.days - 1))
				: endOfMonth(this.interval.month);
		}

		// If there are constraints, make sure the interval is within them
		if (this.options.constraints) {
			this.interval = this.initConstraints(
				this.options.constraints,
				this.options.lengthOfTime,
				this.interval
			);
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

	private initInterval(
		lengthOfTime: LengthOfTime,
		startWithMonth: Date | string | undefined,
		weekOffset: WeekOffset
	): Interval {

		if (lengthOfTime.months) {
			const start = startOfMonth(
				new Date(lengthOfTime.startDate || startWithMonth || Date.now())
			);

			// Subtract a day so that we are at the end of the interval. We always want intervalEnd to be
			// inclusive.
			const end = subDays(addMonths(start, lengthOfTime.months), 1);

			return {start, end, month: new Date(start)};
		}

		if (lengthOfTime.days) {
			const start = startOfDay(lengthOfTime.startDate
				? new Date(lengthOfTime.startDate)
				: setDay(new Date(), weekOffset)
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
		interval: Interval
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
				adjustedInterval
			);
		}

		if (constraints.endDate) {
			adjustedInterval = this.initEndConstraint(
				new Date(constraints.endDate),
				lengthOfTime,
				adjustedInterval
			);
		}

		return adjustedInterval;
	}

	private initStartConstraint(
		constraintStart: Date,
		lengthOfTime: LengthOfTime,
		interval: Interval
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
					getYear(constraintStart)
				);
				adjustedInterval.month = setYear(
					setMonth(adjustedInterval.month, getMonth(constraintStart)),
					getYear(constraintStart)
				);
			}

			if (isBefore(adjustedInterval.end, subMonths(constraintStart, 1))) {
				adjustedInterval.end = setYear(
					setMonth(adjustedInterval.end, getMonth(constraintStart)),
					getYear(constraintStart)
				);
			}
		}

		return adjustedInterval;
	}

	private initEndConstraint(
		constraintEnd: Date,
		lengthOfTime: LengthOfTime,
		interval: Interval
	) {
		const adjustedInterval: Interval = {
			month: interval.month,
			start: interval.start,
			end: interval.end,
		};

		if (lengthOfTime.days) {
			if (isAfter(adjustedInterval.start, addWeeks(constraintEnd, 1))) {
				adjustedInterval.start = startOfDay(
					subDays(endOfWeek(constraintEnd), lengthOfTime.days - 1)
				);
				adjustedInterval.end = endOfWeek(constraintEnd);
				adjustedInterval.month = new Date(adjustedInterval.start);
			}
		} else {
			if (isAfter(adjustedInterval.end, addMonths(constraintEnd, 1))) {
				adjustedInterval.end = setYear(
					setMonth(adjustedInterval.end, getMonth(constraintEnd)),
					getYear(constraintEnd)
				);
				adjustedInterval.month = setYear(
					setMonth(adjustedInterval.month, getMonth(constraintEnd)),
					getYear(constraintEnd)
				);
			}

			if (isAfter(adjustedInterval.start, addMonths(constraintEnd, 1))) {
				adjustedInterval.start = setYear(
					setMonth(adjustedInterval.start, getMonth(constraintEnd)),
					getYear(constraintEnd)
				);
			}
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
					})
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

		if (this.options.lengthOfTime.days) {
			data.days = this.createDaysObject(this.interval.start, this.interval.end);
			data.intervalEnd = this.interval.end;
			data.numberOfRows = Math.ceil(data.days.length / 7);
			data.intervalStart = this.interval.start;
			data.eventsThisInterval = this.eventsThisInterval.map(event => event.originalEvent);
		} else if (this.options.lengthOfTime.months) {
			const eventsThisInterval: ClndrEvent[][] = [];

			for (let i = 0; i < this.options.lengthOfTime.months; i++) {
				const currentIntervalStart = addMonths(this.interval.start, i);
				const currentIntervalEnd = endOfMonth(currentIntervalStart);
				const days = this.createDaysObject(currentIntervalStart, currentIntervalEnd);

				// Save events processed for each month into a master array of events for this interval
				eventsThisInterval.push(this.eventsThisInterval.map(event => event.originalEvent));
				data.months.push({
					days: days,
					month: currentIntervalStart,
				});
			}

			data.eventsThisInterval = eventsThisInterval;

			// Get the total number of rows across all months
			data.months.forEach(month => {
				data.numberOfRows += Math.ceil(month.days.length / 7);
			});

			data.intervalEnd = this.interval.end;
			data.intervalStart = this.interval.start;
			data.eventsLastMonth = this.eventsLastMonth.map(event => event.originalEvent);
			data.eventsNextMonth = this.eventsNextMonth.map(event => event.originalEvent);
		} else {
			// Get an array of days and blank spaces
			data.days = this.createDaysObject(
				startOfMonth(this.interval.month),
				endOfMonth(this.interval.month)
			);

			data.year = getYear(this.interval.month);
			data.month = format(this.interval.month, 'MMMM', {locale: this.options.locale || undefined});
			data.eventsLastMonth = this.eventsLastMonth.map(event => event.originalEvent);
			data.eventsNextMonth = this.eventsNextMonth.map(event => event.originalEvent);
			data.numberOfRows = Math.ceil(data.days.length / 7);
			data.eventsThisMonth = this.eventsThisInterval.map(event => event.originalEvent);
		}

		return data;
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
		if (start && (isAfter(start, this.interval.start) || isSameDay(start, this.interval.start))) {
			this.element
				.querySelectorAll('.' + this.options.targets.previousButton)
				.forEach(element => element.classList.add(this.options.classes.inactive));
			this.constraints.previous = false;
		}

		// Room to go forward?
		if (end && (isBefore(end, this.interval.end) || isSameDay(end, this.interval.end))) {
			this.element
				.querySelectorAll('.' + this.options.targets.nextButton)
				.forEach(element => element.classList.add(this.options.classes.inactive));
			this.constraints.next = false;
		}

		// Year control
		// Room to go back?
		if (start && isAfter(start, subYears(this.interval.start, 1))) {
			this.element
				.querySelectorAll('.' + this.options.targets.previousYearButton)
				.forEach(element => element.classList.add(this.options.classes.inactive));
			this.constraints.previousYear = false;
		}

		// Room to for forward?
		if (end && isBefore(end, addYears(this.interval.end, 1))) {
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
			const target = this.buildTargetObject(currentTarget, true);
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
		const eventTarget = event.target as HTMLElement;
		const currentTarget = eventTarget.closest('.' + this.options.targets.empty);

		if (!currentTarget) {
			return;
		}

		if (this.options.clickEvents.click) {
			const target = this.buildTargetObject(currentTarget as HTMLElement, false);
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
	 * Creates the object to be returned along with click events.
	 */
	private buildTargetObject(currentTarget: HTMLElement, targetWasDay: boolean): ClndrTarget {
		const dateString = this.getTargetDateString(currentTarget);
		const target: ClndrTarget = {
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
				return target.date
					&& !isAfter(event._clndrStartDateObject, targetEndDate)
					&& !isAfter(target.date, event._clndrEndDateObject);
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
			? undefined
			: target.className.substring(index + 13, index + 23);
	}

	/**
	 * Triggers any applicable events given a change in the calendar's start and end dates.
	 * @param orig Contains the original start and end dates.
	 */
	private triggerEvents(orig: ClndrEventOrigin) {
		const timeOpt = this.options.lengthOfTime;
		const eventsOpt = this.options.clickEvents;
		const newInt = {
			end: this.interval.end,
			start: this.interval.start,
		};

		// If any of the change conditions have been hit, trigger the relevant events
		const nextMonth = isAfter(newInt.start, orig.start)
			&& (
				Math.abs(getMonth(newInt.start) - getMonth(orig.start)) === 1
				|| (getMonth(orig.start) === 11 && getMonth(newInt.start) === 0)
			);
		const prevMonth = isBefore(newInt.start, orig.start)
			&& (
				Math.abs(getMonth(orig.start) - getMonth(newInt.start)) === 1
				|| (getMonth(orig.start) === 0 && getMonth(newInt.start) === 11)
			);
		const monthChanged = getMonth(newInt.start) !== getMonth(orig.start)
			|| getYear(newInt.start) !== getYear(orig.start);
		const nextYear = getYear(newInt.start) - getYear(orig.start) === 1
			|| getYear(newInt.end) - getYear(orig.end) === 1;
		const prevYear = getYear(orig.start) - getYear(newInt.start) === 1
			|| getYear(orig.end) - getYear(newInt.end) === 1;
		const yearChanged = getYear(newInt.start) !== getYear(orig.start);

		// Only configs with a time period will get the interval change event
		if (timeOpt.days || timeOpt.months) {
			const nextInterval = isAfter(newInt.start, orig.start);
			const prevInterval = isBefore(newInt.start, orig.start);
			const intervalChanged = nextInterval || prevInterval;
			const intervalArg: [Date, Date] = [
				new Date(this.interval.start),
				new Date(this.interval.end),
			];

			if (nextInterval && eventsOpt.nextInterval) {
				eventsOpt.nextInterval.apply(this, intervalArg);
			}

			if (prevInterval && eventsOpt.previousInterval) {
				eventsOpt.previousInterval.apply(this, intervalArg);
			}

			if (intervalChanged && eventsOpt.onIntervalChange) {
				eventsOpt.onIntervalChange.apply(this, intervalArg);
			}
		} else {
			const monthArg: [Date] = [new Date(this.interval.month)];

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
	}

	private addDateObjectToEvents(events: ClndrEvent[]) {
		if (this.options.multiDayEvents) {
			return [];
		}

		return events.map((event): InternalClndrEvent => {
			if (!(event[this.options.dateParameter] instanceof Date)
				&& typeof event[this.options.dateParameter] !== 'string'
			) {
				throw new Error(
					`event['${this.options.dateParameter}'] is required to be a Date or a string, while ${typeof event[this.options.dateParameter]} was provided`
				);
			}

			return {
				_clndrStartDateObject: new Date(event[this.options.dateParameter] as Date | string),
				_clndrEndDateObject: new Date(event[this.options.dateParameter] as Date | string),
				originalEvent: event,
			}
		});
	}

	private addMultiDayDateObjectsToEvents(events: ClndrEvent[]) {
		if (!this.options.multiDayEvents) {
			return [];
		}

		const multiEvents = this.options.multiDayEvents;
		const internalEvents: InternalClndrEvent[] = [];

		events.forEach(event => {
			const start = multiEvents.startDate && event[multiEvents.startDate];
			const end = multiEvents.endDate && event[multiEvents.endDate];

			if (!end && !start && multiEvents.singleDay) {
				if (!(event[multiEvents.singleDay] instanceof Date)
					&& typeof event[multiEvents.singleDay] !== 'string'
				) {
					throw new Error(
						`event['${multiEvents.singleDay}'] is required to be a Date or a string, while ${typeof event[multiEvents.singleDay]} was provided`
					);
				}

				internalEvents.push({
					_clndrEndDateObject: new Date(event[multiEvents.singleDay] as Date | string),
					_clndrStartDateObject: new Date(event[multiEvents.singleDay] as Date | string),
					originalEvent: event,
				});
			} else if (end || start) {
				if (
					start && !(start instanceof Date) && typeof start !== 'string'
					|| end && !(end instanceof Date) && typeof end !== 'string'
				) {
					throw new Error(
						`event['${multiEvents.startDate}'] and event['${multiEvents.endDate}'] are required to be a Date or a string`
					);
				}

				internalEvents.push({
					_clndrEndDateObject: new Date((end || start) as Date | string),
					_clndrStartDateObject: new Date((start || end) as Date | string),
					originalEvent: event,
				});
			}
		});

		return internalEvents;
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
		const timeOpt = this.options.lengthOfTime;
		const defaults: ClndrNavigationOptions = {withCallbacks: false};
		const orig: ClndrEventOrigin = {
			end: this.interval.end,
			start: this.interval.start,
		};

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		if (!this.constraints.previous) {
			return this;
		}

		if (timeOpt.days && timeOpt.interval) {
			// Shift the interval by days
			this.interval.start = startOfDay(subDays(this.interval.start, timeOpt.interval));
			this.interval.end = endOfDay(addDays(this.interval.start, timeOpt.days - 1));
			this.interval.month = new Date(this.interval.start);
		} else {
			// Shift the interval by a month (or several months)
			this.interval.start = startOfMonth(subMonths(this.interval.start, timeOpt.interval));
			this.interval.end = endOfMonth(
				subDays(addMonths(this.interval.start, timeOpt.months || timeOpt.interval), 1)
			);
			this.interval.month = new Date(this.interval.start);
		}

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
		const timeOpt = this.options.lengthOfTime;
		const defaults: ClndrNavigationOptions = {withCallbacks: false};
		const orig: ClndrEventOrigin = {
			end: this.interval.end,
			start: this.interval.start,
		};

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		if (!this.constraints.next) {
			return this;
		}

		if (timeOpt.days && timeOpt.interval) {
			// Shift the interval by days
			this.interval.start = startOfDay(addDays(this.interval.start, timeOpt.interval));
			this.interval.end = endOfDay(addDays(this.interval.start, timeOpt.days - 1));
			this.interval.month = new Date(this.interval.start);
		} else {
			// Shift the interval by a month (or several months)
			this.interval.start = startOfMonth(addMonths(this.interval.start, timeOpt.interval));
			this.interval.end = endOfMonth(
				subDays(addMonths(this.interval.start, timeOpt.months || timeOpt.interval), 1)
			);
			this.interval.month = new Date(this.interval.start);
		}

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
		const orig: ClndrEventOrigin = {
			end: this.interval.end,
			start: this.interval.start,
		};

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		if (!this.constraints.previousYear) {
			return this;
		}

		this.interval.month = subYears(this.interval.month, 1);
		this.interval.start = subYears(this.interval.start, 1);
		this.interval.end = subYears(this.interval.end, 1);

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
		const orig: ClndrEventOrigin = {
			end: this.interval.end,
			start: this.interval.start,
		};

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		if (!this.constraints.nextYear) {
			return this;
		}

		this.interval.month = addYears(this.interval.month, 1);
		this.interval.start = addYears(this.interval.start, 1);
		this.interval.end = addYears(this.interval.end, 1);

		this.render();

		if (options.withCallbacks) {
			this.triggerEvents(orig);
		}

		return this;
	}

	today(options: ClndrNavigationOptions = {}) {
		const timeOpt = this.options.lengthOfTime;
		const defaults: ClndrNavigationOptions = {withCallbacks: false};
		const orig: ClndrEventOrigin = {
			end: this.interval.end,
			start: this.interval.start,
		};

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		// Only used for legacy month view
		this.interval.month = startOfMonth(new Date());

		if (timeOpt.days) {
			// If there was a startDate specified, its weekday should be figured out to use that as the
			// starting point of the interval. If not, go to today.weekday(0).
			this.interval.start = startOfDay(setDay(
				new Date(),
				timeOpt.startDate ? getDay(new Date(timeOpt.startDate)) : 0
			));

			this.interval.end = endOfDay(addDays(this.interval.start, timeOpt.days - 1));
		} else {
			this.interval.start = startOfMonth(new Date());
			this.interval.end = endOfMonth(
				subDays(addMonths(this.interval.start, timeOpt.months || timeOpt.interval), 1)
			);
		}

		// No need to re-render if the month was not changed
		if (
			!isSameMonth(this.interval.start, orig.start)
			|| !isSameMonth(this.interval.end, orig.end)
		) {
			this.render();
		}

		// Fire the today event handler regardless of any change
		if (options.withCallbacks) {
			if (this.options.clickEvents.today) {
				this.options.clickEvents.today.apply(this, [new Date(this.interval.month)]);
			}

			this.triggerEvents(orig);
		}
	}

	/**
	 * Changes the month being provided a value between 0 and 11.
	 */
	setMonth(newMonth: number, options: ClndrNavigationOptions = {}) {
		const timeOpt = this.options.lengthOfTime;
		const orig: ClndrEventOrigin = {
			end: this.interval.end,
			start: this.interval.start,
		};

		if (timeOpt.days || timeOpt.months) {
			console.warn(
				'You are using a custom date interval. Use Clndr.setIntervalStart(startDate) instead.'
			);
			return this;
		}

		this.interval.month = setMonth(this.interval.month, newMonth);
		this.interval.start = new Date(startOfMonth(this.interval.month));
		this.interval.end = endOfMonth(this.interval.start);

		this.render();

		if (options && options.withCallbacks) {
			this.triggerEvents(orig);
		}

		return this;
	}

	setYear(newYear: number, options: ClndrNavigationOptions = {}) {
		const orig: ClndrEventOrigin = {
			end: this.interval.end,
			start: this.interval.start,
		};

		this.interval.month = setYear(this.interval.month, newYear);
		this.interval.end = setYear(this.interval.end, newYear);
		this.interval.start = setYear(this.interval.start, newYear);

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
		const timeOpt = this.options.lengthOfTime;
		const orig: ClndrEventOrigin = {
			end: this.interval.end,
			start: this.interval.start,
		};

		if (!timeOpt.days && !timeOpt.months) {
			console.warn(
				'You are not using a custom date interval. Use Clndr.setMonth(new Month) or Clndr.setYear(newYear) instead.'
			);
			return this;
		}

		if (timeOpt.days) {
			this.interval.start = startOfDay(new Date(newDate));
			this.interval.end = endOfDay(addDays(this.interval.start, timeOpt.days - 1));
		} else {
			this.interval.start = startOfMonth(new Date(newDate));
			this.interval.end = endOfMonth(
				subDays(addMonths(this.interval.start, timeOpt.months as number), 1)
			);
		}

		this.interval.month = new Date(this.interval.start);

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
		this.events = [
			...this.addMultiDayDateObjectsToEvents(events),
			...this.addDateObjectToEvents(events),
		];

		this.render();

		return this;
	}

	/**
	 * Adds additional events and triggers re-rendering.
	 */
	addEvents(events: ClndrEvent[], reRender = true) {
		this.options.events = [...this.options.events, ...events];
		this.events = [
			...this.events,
			...this.addMultiDayDateObjectsToEvents(events),
			...this.addDateObjectToEvents(events),
		];

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