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
	DayOptions,
	DayProperties,
	InternalClndrEvent,
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

function isObject(item: unknown) {
	return (item && typeof item === 'object' && !Array.isArray(item));
}

function mergeDeep(target: unknown, ...sources: unknown[]) {
	if (!sources.length) {
		return target;
	}

	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		const targetObject = target as {[k: string]: unknown};
		const sourceObject = source as {[k: string]: unknown};

		for (const key in sourceObject) {
			if (Array.isArray(sourceObject[key])) {
				const arrayValue = sourceObject[key] as unknown[];
				targetObject[key] = arrayValue.map((element: unknown) => {
					return isObject(element) ? mergeDeep({}, element) : element;
				});
			} else if (sourceObject[key] instanceof Date) {
				targetObject[key] = new Date(sourceObject[key] as Date);
			} else if (isObject(sourceObject[key])) {
				if (!targetObject[key]) {
					Object.assign(targetObject, {[key]: {}});
				}
				mergeDeep(targetObject[key], sourceObject[key]);
			} else {
				Object.assign(targetObject, { [key]: sourceObject[key] });
			}
		}
	}

	return mergeDeep(target, ...sources);
}

class Clndr {
	element: HTMLElement;
	options: Options;
	constraints: ConstraintChecks;
	intervalStart: Date;
	intervalEnd: Date;
	month: Date;
	daysOfTheWeek: string[];
	calendarContainer?: HTMLElement;
	_currentIntervalStart: Date;
	eventsLastMonth: ClndrEvent[];
	eventsNextMonth: ClndrEvent[];
	eventsThisInterval: ClndrEvent[];
	eventHandler?: EventListener

	/**
	 * The actual plugin constructor.
	 * Parses the events and lengthOfTime options to build a calendar of day
	 * objects containing event information from the events array.
	 */
	constructor(element: HTMLElement, options: UserOptions) {
		let constraintEnd;
		let constraintStart;

		this.element = element;
		this.daysOfTheWeek = [];
		this._currentIntervalStart = new Date();
		this.eventsLastMonth = [];
		this.eventsNextMonth = [];
		this.eventsThisInterval = [];

		// Merge the default options with user-provided options
		this.options = mergeDeep({}, defaults, options) as Options;

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
		if (this.options.events.length) {
			if (this.options.multiDayEvents) {
				this.options.events =
					this.addMultiDayDateObjectsToEvents(this.options.events);
			} else {
				this.options.events =
					this.addDateObjectToEvents(this.options.events);
			}
		}

		// This used to be a place where we'd figure out the current month,
		// but since we want to open up support for arbitrary lengths of time
		// we're going to store the current range in addition to the current
		// month.
		// if (this.options.lengthOfTime.months || this.options.lengthOfTime.days) {
		// We want to establish intervalStart and intervalEnd, which will
		// keep track of our boundaries. Let's look at the possibilities...
		if (this.options.lengthOfTime.months) {
			// Gonna go right ahead and annihilate any chance for bugs here
			this.options.lengthOfTime.days = null;

			// The length is specified in months. Is there a start date?
			if (this.options.lengthOfTime.startDate) {
				this.intervalStart = startOfMonth(new Date(this.options.lengthOfTime.startDate));
			} else if (this.options.startWithMonth) {
				this.intervalStart = startOfMonth(new Date(this.options.startWithMonth));
			} else {
				this.intervalStart = startOfMonth(new Date());
			}

			// Subtract a day so that we are at the end of the interval. We
			// always want intervalEnd to be inclusive.
			this.intervalEnd = subDays(
				addMonths(this.intervalStart, this.options.lengthOfTime.months),
				1,
			);
			this.month = new Date(this.intervalStart);
		} else if (this.options.lengthOfTime.days) {
			// The length is specified in days. Start date?
			if (this.options.lengthOfTime.startDate) {
				this.intervalStart = startOfDay(new Date(this.options.lengthOfTime.startDate));
			} else {
				this.intervalStart = startOfDay(setDay(new Date(), this.options.weekOffset));
			}

			this.intervalEnd = endOfDay(addDays(this.intervalStart, this.options.lengthOfTime.days - 1));
			this.month = new Date(this.intervalStart);
			// }
			// No length of time specified so we're going to default into using the
			// current month as the time period.
		} else {
			this.month = startOfMonth(new Date());
			this.intervalStart = new Date(this.month);
			this.intervalEnd = endOfMonth(this.month);
		}

		if (this.options.startWithMonth) {
			this.month = startOfMonth(new Date(this.options.startWithMonth));
			this.intervalStart = new Date(this.month);
			this.intervalEnd = this.options.lengthOfTime.days
				? endOfDay(addDays(this.month, this.options.lengthOfTime.days - 1))
				: endOfMonth(this.month);
		}

		// If we've got constraints set, make sure the interval is within them.
		// if (this.options.constraints) {
		// First check if the startDate exists & is later than now.
		if (this.options.constraints && this.options.constraints.startDate) {
			constraintStart = new Date(this.options.constraints.startDate);

			// We need to handle the constraints differently for weekly
			// calendars vs. monthly calendars.
			if (this.options.lengthOfTime.days) {
				if (isBefore(this.intervalStart, subWeeks(constraintStart, 1))) {
					this.intervalStart = startOfWeek(constraintStart);
				}

				// If the new interval period is less than the desired length
				// of time, or before the starting interval, then correct it.
				// dayDiff = this.intervalStart.diff(this.intervalEnd, 'days');
				// Can never be false || false, because having an intervalEnd after intervalStart, intervalEnd is
				// always set according to lenghtOfTime.days, so dayDiff will always be smaller than
				// lengthOfTime.days
				// if (dayDiff < this.options.lengthOfTime.days ||
				//   this.intervalEnd.isBefore(this.intervalStart)
				// ) {
				this.intervalEnd = endOfDay(
					addDays(this.intervalStart, this.options.lengthOfTime.days - 1),
				);
				this.month = new Date(this.intervalStart);
				// }
			} else {
				if (isBefore(this.intervalStart, subMonths(constraintStart, 1))) {
					// Try to preserve the date by moving only the month.
					this.intervalStart = setYear(
						setMonth(this.intervalStart, getMonth(constraintStart)),
						getYear(constraintStart),
					);
					this.month = setYear(
						setMonth(this.month, getMonth(constraintStart)),
						getYear(constraintStart),
					);
				}

				// Check if the ending interval is earlier than now.
				if (isBefore(this.intervalEnd, subMonths(constraintStart, 1))) {
					this.intervalEnd = setYear(
						setMonth(this.intervalEnd, getMonth(constraintStart)),
						getYear(constraintStart),
					);
				}
			}
		}

		// Make sure the intervalEnd is before the endDate.
		if (this.options.constraints && this.options.constraints.endDate) {
			constraintEnd = new Date(this.options.constraints.endDate);

			// We need to handle the constraints differently for weekly
			// calendars vs. monthly calendars.
			if (this.options.lengthOfTime.days) {
				// The starting interval is after our ending constraint.
				if (isAfter(this.intervalStart, addWeeks(constraintEnd, 1))) {
					this.intervalStart = startOfDay(
						subDays(endOfWeek(constraintEnd), this.options.lengthOfTime.days - 1),
					);
					this.intervalEnd = endOfWeek(constraintEnd);
					this.month = new Date(this.intervalStart);
				}
			} else {
				if (isAfter(this.intervalEnd, addMonths(constraintEnd, 1))) {
					this.intervalEnd = setYear(
						setMonth(this.intervalEnd, getMonth(constraintEnd)),
						getYear(constraintEnd),
					);
					this.month = setYear(
						setMonth(this.month, getMonth(constraintEnd)),
						getYear(constraintEnd),
					);
				}

				// Check if the starting interval is later than the ending.
				if (isAfter(this.intervalStart, addMonths(constraintEnd, 1))) {
					this.intervalStart = setYear(
						setMonth(this.intervalStart, getMonth(constraintEnd)),
						getYear(constraintEnd),
					);
				}
			}
		}
		//}

		// Some first-time initialization -> day of the week offset, template
		// compiling, making and storing some elements we'll need later, and
		// event handling for the controller.
		this.init();
	}

	/**
	 * Calendar initialization.
	 * Sets up the days of the week, the rendering function, binds all of the
	 * events to the rendered calendar, and then stores the node locally.
	 */
	private init() {
		let i;
		let formatWeekday;

		// Create the days of the week using date-fn's current language setting
		this.daysOfTheWeek = this.options.daysOfTheWeek || [];

		// User can supply an optional function to format the weekday header
		formatWeekday = this.options.formatWeekdayHeader || formatWeekday;

		if (!this.options.daysOfTheWeek) {
			this.daysOfTheWeek = [];

			formatWeekday = this.options.formatWeekdayHeader || function (day: Date, locale?: Locale) {
				return format(day, 'cccccc', {locale}).charAt(0);
			};

			for (i = 0; i < 7; i++) {
				this.daysOfTheWeek.push(
					formatWeekday(setDay(new Date(), i), this.options.locale || undefined),
				);
			}
		}

		// Shuffle the week if there's an offset
		if (this.options.weekOffset) {
			this.daysOfTheWeek = this.shiftWeekdayLabels(this.options.weekOffset);
		}

		// Quick and dirty test to make sure rendering is possible.
		if (!(this.options as UserOptions).render) {
			throw new Error(
				'No render function provided per the "render" option. A render function is required for ' +
				'rendering the calendar, i.e. when using EJS: data => ejs.render(defaultTemplate, data)',
			);
		}

		// Create the parent element that will hold the plugin and save it
		// for later
		this.element.innerHTML = '<div class="clndr"></div>';
		this.calendarContainer = this.element.querySelector('.clndr') as HTMLElement;

		// Attach event handlers for clicks on buttons/cells
		this.bindEvents();

		// Do a normal render of the calendar template
		this.render();

		// If a ready callback has been provided, call it.
		if (this.options.ready) {
			this.options.ready.apply(this, []);
		}
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

	private shiftWeekdayLabels(offset: number) {
		let i;
		const days = this.daysOfTheWeek;

		for (i = 0; i < offset; i++) {
			days.push(days.shift() as string);
		}

		return days;
	}

	/**
	 * This is where the magic happens. Given a starting date and ending date,
	 * an array of calendarDay objects is constructed that contains appropriate
	 * events and classes depending on the circumstance.
	 */
	private createDaysObject(startDate: Date, endDate: Date) {
		let i;
		let day;
		let diff;
		let dateIterator;
		// This array will hold numbers for the entire grid (even the blank spaces)
		const daysArray = [];
		let endOfNextMonth: Date;
		let endOfLastMonth: Date;
		let startOfNextMonth: Date;
		let startOfLastMonth: Date;
		const date = new Date(startDate);

		// This is a helper object so that days can resolve their classes
		// correctly. Don't use it for anything please.
		this._currentIntervalStart = new Date(startDate);

		// Filter the events list (if it exists) to events that are happening
		// last month, this month and next month (within the current grid view).
		this.eventsLastMonth = [];
		this.eventsNextMonth = [];
		this.eventsThisInterval = [];

		// Event parsing
		if (this.options.events.length) {
			// Here are the only two cases where we don't get an event in our
			// interval:
			//   startDate | endDate | e.start   | e.end
			//   e.start   | e.end   | startDate | endDate
			this.eventsThisInterval = this.options.events.filter(event => {
				const afterEnd = isAfter(event._clndrStartDateObject, endDate);
				const beforeStart = isBefore(event._clndrEndDateObject, startDate);

				return !(beforeStart || afterEnd);
			});

			if (this.options.showAdjacentMonths) {
				startOfLastMonth = startOfMonth(subMonths(startDate, 1));
				endOfLastMonth = endOfMonth(startOfLastMonth);
				startOfNextMonth = startOfMonth(addMonths(endDate, 1));
				endOfNextMonth = endOfMonth(startOfNextMonth);

				this.eventsLastMonth = this.options.events.filter(event => {
					const beforeStart = isBefore(event._clndrEndDateObject, startOfLastMonth);
					const afterEnd = isAfter(event._clndrStartDateObject, endOfLastMonth);

					return !(beforeStart || afterEnd);
				});

				this.eventsNextMonth = this.options.events.filter(event => {
					const beforeStart = isBefore(event._clndrEndDateObject, startOfNextMonth);
					const afterEnd = isAfter(event._clndrStartDateObject, endOfNextMonth);

					return !(beforeStart || afterEnd);
				});
			}
		}

		// If diff is greater than 0, we'll have to fill in last days of the
		// previous month to account for the empty boxes in the grid. We also
		// need to take into account the weekOffset parameter. None of this
		// needs to happen if the interval is being specified in days rather
		// than months.
		if (!this.options.lengthOfTime.days) {
			diff = getDay(date) - this.options.weekOffset;

			if (diff < 0) {
				diff += 7;
			}

			if (this.options.showAdjacentMonths) {
				for (i = 1; i <= diff; i++) {
					day = subDays(new Date(getYear(startDate), getMonth(startDate), i), diff);
					daysArray.push(this.createDayObject(day, this.eventsLastMonth));
				}
			} else {
				for (i = 0; i < diff; i++) {
					daysArray.push(
						this.calendarDay({
							classes: this.options.targets.empty +
								' ' + this.options.classes.lastMonth,
						}));
				}
			}
		}

		// Now we push all of the days in the interval
		dateIterator = new Date(startDate);

		while (isBefore(dateIterator, endDate) || isSameDay(dateIterator, endDate)) {
			daysArray.push(this.createDayObject(dateIterator, this.eventsThisInterval));
			dateIterator = addDays(dateIterator, 1);
		}

		// ...and if there are any trailing blank boxes, fill those in with the
		// next month first days. Again, we can ignore this if the interval is
		// specified in days.
		if (!this.options.lengthOfTime.days) {
			while (daysArray.length % 7 !== 0) {
				if (this.options.showAdjacentMonths) {
					daysArray.push(this.createDayObject(dateIterator, this.eventsNextMonth));
				} else {
					daysArray.push(
						this.calendarDay({
							classes: this.options.targets.empty + ' ' +
								this.options.classes.nextMonth,
						}));
				}
				dateIterator = addDays(dateIterator, 1);
			}
		}

		// If we want to force six rows of calendar, now's our Last Chance to
		// add another row. If the 42 seems explicit it's because we're
		// creating a 7-row grid and 6 rows of 7 is always 42!
		if (this.options.forceSixRows && daysArray.length !== 42) {
			while (daysArray.length < 42) {
				if (this.options.showAdjacentMonths) {
					daysArray.push(this.createDayObject(dateIterator, this.eventsNextMonth));
					dateIterator = addDays(dateIterator, 1);
				} else {
					daysArray.push(this.calendarDay({
						classes: this.options.targets.empty + ' ' +
							this.options.classes.nextMonth,
					}));
				}
			}
		}

		return daysArray;
	}

	private createDayObject(day: Date, monthEvents: ClndrEvent[]) {
		let end;
		let j = 0;
		let start;
		let endDate;
		let startDate;
		const now = new Date();
		const eventsToday = [];
		let extraClasses = '';
		const properties: DayProperties = {
			isToday: false,
			isInactive: false,
			isAdjacentMonth: false,
		};

		// Set to the end of the day for comparisons
		const dayEnd = endOfDay(day);

		for (j; j < monthEvents.length; j++) {
			// Keep in mind that the events here already passed the month/year
			// test. Now all we have to compare is the day.
			start = monthEvents[j]._clndrStartDateObject;
			end = monthEvents[j]._clndrEndDateObject;

			// If today is the same day as start or is after the start, and
			// if today is the same day as the end or before the end ...
			// woohoo semantics!
			if (!isAfter(start, dayEnd) && !isAfter(day, end)) {
				eventsToday.push(monthEvents[j]);
			}
		}

		if (isSameDay(now, day)) {
			extraClasses += (' ' + this.options.classes.today);
			properties.isToday = true;
		}

		if (isBefore(day, now)) {
			extraClasses += (' ' + this.options.classes.past);
		}

		if (eventsToday.length) {
			extraClasses += (' ' + this.options.classes.event);
		}

		if (!this.options.lengthOfTime.days) {
			if (getMonth(this._currentIntervalStart) > getMonth(day)) {
				extraClasses += (' ' + this.options.classes.adjacentMonth);
				properties.isAdjacentMonth = true;

				getYear(this._currentIntervalStart) === getYear(day)
					? extraClasses += (' ' + this.options.classes.lastMonth)
					: extraClasses += (' ' + this.options.classes.nextMonth);
			} else if (getMonth(this._currentIntervalStart) < getMonth(day)) {
				extraClasses += (' ' + this.options.classes.adjacentMonth);
				properties.isAdjacentMonth = true;

				getYear(this._currentIntervalStart) === getYear(day)
					? extraClasses += (' ' + this.options.classes.nextMonth)
					: extraClasses += (' ' + this.options.classes.lastMonth);
			}
		}

		// If there are constraints, we need to add the inactive class to the
		// days outside of them
		if (this.options.constraints) {
			endDate = this.options.constraints.endDate && new Date(this.options.constraints.endDate);
			startDate = this.options.constraints.startDate && new Date(this.options.constraints.startDate);

			if (startDate && isBefore(day, startDate)) {
				extraClasses += (' ' + this.options.classes.inactive);
				properties.isInactive = true;
			}

			if (endDate && isAfter(day, endDate)) {
				extraClasses += (' ' + this.options.classes.inactive);
				properties.isInactive = true;
			}
		}

		// Check whether the day is "selected"
		if (this.options.selectedDate && isSameDay(day, new Date(this.options.selectedDate))) {
			extraClasses += (' ' + this.options.classes.selected);
		}

		// We're moving away from using IDs in favor of classes, since when
		// using multiple calendars on a page we are technically violating the
		// uniqueness of IDs.
		extraClasses += ' calendar-day-' + format(day, 'yyyy-MM-dd');
		// Day of week
		extraClasses += ' calendar-dow-' + getDay(day);

		return this.calendarDay({
			date: day,
			day: getDate(day),
			events: eventsToday,
			properties: properties,
			classes: this.options.targets.day + extraClasses,
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
		const oneYearFromEnd = addYears(this.intervalEnd, 1);
		const oneYearAgo = subYears(this.intervalStart, 1);
		const formatProxy = (date: Date, formatStr: string, options: FormatOptions = {}) => {
			return format(date, formatStr, {locale: this.options.locale || undefined, ...options});
		};

		// FIXME: Set calendarContainer in constructor
		(this.calendarContainer as HTMLElement).innerHTML = '';

		if (this.options.lengthOfTime.days) {
			days = this.createDaysObject(this.intervalStart, this.intervalEnd);
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
				intervalEnd: this.intervalEnd,
				numberOfRows: Math.ceil(days.length / 7),
				intervalStart: this.intervalStart,
				eventsThisInterval: this.eventsThisInterval,
				format: formatProxy,
			};
		} else if (this.options.lengthOfTime.months) {
			months = [];
			numberOfRows = 0;
			eventsThisInterval = [];

			for (i = 0; i < this.options.lengthOfTime.months; i++) {
				currentIntervalStart = addMonths(this.intervalStart, i);
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
				intervalEnd: this.intervalEnd,
				intervalStart: this.intervalStart,
				daysOfTheWeek: this.daysOfTheWeek,
				eventsLastMonth: this.eventsLastMonth,
				eventsNextMonth: this.eventsNextMonth,
				eventsThisInterval: eventsThisInterval,
				format: formatProxy,
			};
		} else {
			// Get an array of days and blank spaces
			days = this.createDaysObject(startOfMonth(this.month), endOfMonth(this.month));

			data = {
				days: days,
				months: [],
				intervalEnd: null,
				intervalStart: null,
				year: getYear(this.month),
				eventsThisInterval: null,
				extras: this.options.extras,
				month: format(this.month, 'MMMM', {locale: this.options.locale || undefined}),
				daysOfTheWeek: this.daysOfTheWeek,
				eventsLastMonth: this.eventsLastMonth,
				eventsNextMonth: this.eventsNextMonth,
				numberOfRows: Math.ceil(days.length / 7),
				eventsThisMonth: this.eventsThisInterval,
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
			if (start && (isAfter(start, this.intervalStart) || isSameDay(start, this.intervalStart))) {
				this.element
					.querySelectorAll('.' + this.options.targets.previousButton)
					.forEach(element => element.classList.add(this.options.classes.inactive));
				this.constraints.previous = !this.constraints.previous;
			}

			// Do we have room to go forward?
			if (end && (isBefore(end, this.intervalEnd) || isSameDay(end, this.intervalEnd))) {
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
	 * If the user provided a click callback we'd like to give them something
	 * nice to work with. buildTargetObject takes the DOM element that was
	 * clicked and returns an object with the DOM element, events, and the date
	 * (if the latter two exist). Currently it is based on the id, however it'd
	 * be nice to use a data- attribute in the future.
	 */
	private buildTargetObject(currentTarget: HTMLElement, targetWasDay: boolean): Target {
		// This is our default target object, assuming we hit an empty day
		// with no events.
		const target: Target = {
			date: null,
			events: [],
			element: currentTarget,
		};
		let filterFn;
		let dateString: string | null;
		let targetEndDate: Date;

		// Did we click on a day or just an empty box?
		if (targetWasDay) {
			dateString = this.getTargetDateString(currentTarget);
			target.date = dateString
				? new Date(dateString)
				: null;

			if (!target.date) {
				return target;
			}

			// Do we have events?
			if (this.options.events.length > 0) {
				// Are any of the events happening today?
				if (this.options.multiDayEvents) {
					targetEndDate = endOfDay(target.date);
					filterFn = (event: ClndrEvent) => {
						return target.date && !isAfter(event._clndrStartDateObject, targetEndDate) &&
							!isAfter(target.date, event._clndrEndDateObject);
					};
				} else {
					filterFn = (event: ClndrEvent) => {
						return dateString === format(event._clndrStartDateObject, 'yyyy-MM-dd');
					};
				}

				// Filter the dates down to the ones that match.
				target.events = this.options.events.filter(filterFn);
			}
		}

		return target;
	}

	/**
	 * Get date string associated with the given target.
	 * This method is meant to be called on ".day" elements.
	 */
	private getTargetDateString = function (target: HTMLElement) {
		// Our identifier is in the list of classNames. Find it!
		const index = target.className.indexOf('calendar-day-');

		if (index !== -1) {
			// Our unique identifier is always 23 characters long.
			// If this feels a little wonky, that's probably because it is.
			// Open to suggestions on how to improve this guy.
			return target.className.substring(index + 13, index + 23);
		}

		return null;
	};

	/**
	 * Triggers any applicable events given a change in the calendar's start
	 * and end dates. ctx contains the current (changed) start and end date,
	 * orig contains the original start and end dates.
	 */
	private triggerEvents(ctx: Clndr, orig: ClndrEventOrigin) {
		let nextInterval;
		let prevInterval;
		let intervalChanged;
		const monthArg: [Date] = [new Date(ctx.month)];
		const timeOpt = ctx.options.lengthOfTime;
		const eventsOpt = ctx.options.clickEvents;
		const newInt = {
			end: ctx.intervalEnd,
			start: ctx.intervalStart,
		};
		const intervalArg: [Date, Date] = [
			new Date(ctx.intervalStart),
			new Date(ctx.intervalEnd),
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
			end: ctx.intervalEnd,
			start: ctx.intervalStart,
		};

		// Extend any options
		options = mergeDeep({}, defaults, options) as NavigationOptions;

		// Before we do anything, check if any constraints are limiting this
		if (!ctx.constraints.previous) {
			return ctx;
		}

		if (timeOpt.days && timeOpt.interval) {
			// Shift the interval in days
			ctx.intervalStart = startOfDay(subDays(ctx.intervalStart, timeOpt.interval));
			ctx.intervalEnd = endOfDay(addDays(ctx.intervalStart, timeOpt.days - 1));
			// @V2-todo Useless, but consistent with API
			ctx.month = new Date(ctx.intervalStart);
		} else {
			// Shift the interval by a month (or several months)
			ctx.intervalStart = startOfMonth(subMonths(ctx.intervalStart, timeOpt.interval));
			ctx.intervalEnd = endOfMonth(
				subDays(addMonths(ctx.intervalStart, timeOpt.months || timeOpt.interval), 1),
			);
			ctx.month = new Date(ctx.intervalStart);
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
			end: ctx.intervalEnd,
			start: ctx.intervalStart,
		};

		// Extend any options
		options = mergeDeep({}, defaults, options) as NavigationOptions;

		// Before we do anything, check if any constraints are limiting this
		if (!ctx.constraints.next) {
			return ctx;
		}

		if (timeOpt.days && timeOpt.interval) {
			// Shift the interval in days
			ctx.intervalStart = startOfDay(addDays(ctx.intervalStart, timeOpt.interval));
			ctx.intervalEnd = endOfDay(addDays(ctx.intervalStart, timeOpt.days - 1));
			// @V2-todo Useless, but consistent with API
			ctx.month = new Date(ctx.intervalStart);
		} else {
			// Shift the interval by a month (or several months)
			ctx.intervalStart = startOfMonth(addMonths(ctx.intervalStart, timeOpt.interval));
			ctx.intervalEnd = endOfMonth(
				subDays(addMonths(ctx.intervalStart, timeOpt.months || timeOpt.interval), 1),
			);
			ctx.month = new Date(ctx.intervalStart);
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
			end: ctx.intervalEnd,
			start: ctx.intervalStart,
		};

		// Extend any options
		options = mergeDeep({}, defaults, options) as NavigationOptions;

		// Before we do anything, check if any constraints are limiting this
		if (!ctx.constraints.previousYear) {
			return ctx;
		}

		ctx.month = subYears(ctx.month, 1);
		ctx.intervalStart = subYears(ctx.intervalStart, 1);
		ctx.intervalEnd = subYears(ctx.intervalEnd, 1);
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
			end: ctx.intervalEnd,
			start: ctx.intervalStart,
		};

		// Extend any options
		options = mergeDeep({}, defaults, options) as NavigationOptions;

		// Before we do anything, check if any constraints are limiting this
		if (!ctx.constraints.nextYear) {
			return ctx;
		}

		ctx.month = addYears(ctx.month, 1);
		ctx.intervalStart = addYears(ctx.intervalStart, 1);
		ctx.intervalEnd = addYears(ctx.intervalEnd, 1);
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
			end: ctx.intervalEnd,
			start: ctx.intervalStart,
		};

		// Extend any options
		options = mergeDeep({}, defaults, options) as NavigationOptions;
		// @V2-todo Only used for legacy month view
		ctx.month = startOfMonth(new Date());

		if (timeOpt.days) {
			// If there was a startDate specified, we should figure out what
			// the weekday is and use that as the starting point of our
			// interval. If not, go to today.weekday(0).
			if (timeOpt.startDate) {
				ctx.intervalStart = startOfDay(setDay(new Date(), getDay(new Date(timeOpt.startDate))));
			} else {
				ctx.intervalStart = startOfDay(setDay(new Date(), 0));
			}

			ctx.intervalEnd = endOfDay(addDays(ctx.intervalStart, timeOpt.days - 1));
		} else {
			// Set the intervalStart to this month.
			ctx.intervalStart = startOfMonth(new Date());
			ctx.intervalEnd = endOfMonth(
				subDays(addMonths(ctx.intervalStart, timeOpt.months || timeOpt.interval), 1),
			);
		}

		// No need to re-render if we didn't change months.
		if (!isSameMonth(ctx.intervalStart, orig.start) ||
			!isSameMonth(ctx.intervalEnd, orig.end)
		) {
			ctx.render();
		}

		// Fire the today event handler regardless of any change
		if (options.withCallbacks) {
			if (ctx.options.clickEvents.today) {
				ctx.options.clickEvents.today.apply(ctx, [new Date(ctx.month)]);
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
			end: this.intervalEnd,
			start: this.intervalStart,
		};

		if (timeOpt.days || timeOpt.months) {
			console.warn(
				'clndr.js: You are using a custom date interval. ' +
				'Use Clndr.setIntervalStart(startDate) instead.');
			return this;
		}

		this.month = setMonth(this.month, newMonth);
		this.intervalStart = new Date(startOfMonth(this.month));
		this.intervalEnd = endOfMonth(this.intervalStart);
		this.render();

		if (options && options.withCallbacks) {
			this.triggerEvents(this, orig);
		}

		return this;
	}

	setYear(newYear: number, options: SetterOptions = {}) {
		const orig: ClndrEventOrigin = {
			end: this.intervalEnd,
			start: this.intervalStart,
		};

		this.month = setYear(this.month, newYear);
		this.intervalEnd = setYear(this.intervalEnd, newYear);
		this.intervalStart = setYear(this.intervalStart, newYear);
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
			end: this.intervalEnd,
			start: this.intervalStart,
		};

		if (!timeOpt.days && !timeOpt.months) {
			console.warn(
				'clndr.js: You are using a custom date interval. ' +
				'Use Clndr.setIntervalStart(startDate) instead.');
			return this;
		}

		if (timeOpt.days) {
			this.intervalStart = startOfDay(new Date(newDate));
			this.intervalEnd = endOfDay(addDays(this.intervalStart, timeOpt.days - 1));
		} else {
			this.intervalStart = startOfMonth(new Date(newDate));
			this.intervalEnd = endOfMonth(
				subDays(addMonths(this.intervalStart, timeOpt.months as number), 1),
			);
		}

		this.month = new Date(this.intervalStart);
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
		// Go through each event and add a Date object
		if (this.options.multiDayEvents) {
			this.options.events = this.addMultiDayDateObjectsToEvents(events);
		} else {
			this.options.events = this.addDateObjectToEvents(events);
		}

		this.render();

		return this;
	}

	/**
	 * Adds additional events to the calendar and triggers a render.
	 */
	addEvents(events: ClndrEvent[], reRender = true) {
		// Go through each event and add a Date object
		if (this.options.multiDayEvents) {
			this.options.events = [
				...this.options.events,
				...this.addMultiDayDateObjectsToEvents(events),
			];
		} else {
			this.options.events = [...this.options.events, ...this.addDateObjectToEvents(events)];
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
			}
		}

		this.render();

		return this;
	}

	private addDateObjectToEvents(events: InternalClndrEvent[]) {
		let i = 0;
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;

		for (i; i < events.length; i++) {
			// Add the date as both start and end, since it's a single-day
			// event by default
			events[i]._clndrStartDateObject =
				new Date(events[i][self.options.dateParameter]);
			events[i]._clndrEndDateObject =
				new Date(events[i][self.options.dateParameter]);
		}

		return events;
	}

	private addMultiDayDateObjectsToEvents(events: InternalClndrEvent[]) {
		let end: Date | string | undefined;
		let start: Date | string | undefined;
		let i = 0;
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;
		const multiEvents = self.options.multiDayEvents as MultiDayEvents;

		for (i; i < events.length; i++) {
			end = multiEvents.endDate && events[i][multiEvents.endDate];
			start = multiEvents.startDate && events[i][multiEvents.startDate];

			// If we don't find the startDate OR endDate fields, look for singleDay
			if (!end && !start && multiEvents.singleDay) {
				events[i]._clndrEndDateObject =
					new Date(events[i][multiEvents.singleDay]);
				events[i]._clndrStartDateObject =
					new Date(events[i][multiEvents.singleDay]);
			} else if (end || start) {
				// Otherwise use startDate and endDate, or whichever one is present
				// TODO: Check Date/string type
				events[i]._clndrEndDateObject = new Date((end || start) as Date | string);
				events[i]._clndrStartDateObject = new Date((start || end) as Date | string);
			}
		}

		return events;
	}

	calendarDay(options: DayOptions) {
		const defaults: DayOptions = {
			day: '',
			date: undefined,
			events: [],
			classes: this.options.targets.empty,
		};

		return mergeDeep({}, defaults, options) as DayOptions;
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