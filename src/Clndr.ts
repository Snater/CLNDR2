import {
	FormatOptions,
	Locale,
	addMonths,
	addYears,
	areIntervalsOverlapping,
	endOfDay,
	format,
	getDate,
	isAfter,
	isBefore,
	isSameDay,
	isSameMonth,
	isSameYear,
	isWithinInterval,
	setDay,
	subMonths,
	subYears,
	startOfDay,
} from 'date-fns';
import {Adapter, AdapterOptions} from './Adapter';
import DayAdapter from './DayAdapter';
import DecadeAdapter from './DecadeAdapter';
import MonthAdapter from './MonthAdapter';
import WeekAdapter from './WeekAdapter';
import YearAdapter from './YearAdapter';
import type {
	ClndrEvent,
	ClndrItem,
	ClndrItemEventParameters,
	ClndrItemProperties,
	ClndrOptions,
	ClndrTemplateData,
	Constraints,
	DaysOfTheWeek,
	InternalClndrEvent,
	InternalOptions,
	Interval,
	NavigationConstraint,
	NavigationConstraints,
	Pagination,
	TargetOption,
	View,
	WeekOffset,
} from './types';

const orderedViews: View[] = ['day', 'week', 'month', 'year', 'decade'] as const;

const adapters: Record<View,
	(new (options: AdapterOptions) => Adapter) & {
		eventListener?: (element: HTMLElement, callback: (view: View) => void) => void,
		targets?: Record<string, string>
	}
> = {
	decade: DecadeAdapter,
	year: YearAdapter,
	month: MonthAdapter,
	week: WeekAdapter,
	day: DayAdapter,
} as const;

const defaults: InternalOptions = {
	render: () => {
		throw new Error('Missing render function');
	},
	adjacentItemsChangePage: false,
	classes: {
		past: 'past',
		now: 'now',
		event: 'event',
		inactive: 'inactive',
		selected: 'selected',
		previous: 'previous',
		next: 'next',
		adjacent: 'adjacent',
		switch: 'switch',
	},
	on: {},
	dateParameter: {
		date: 'date',
		start: 'start',
		end: 'end',
	},
	defaultView: 'month',
	events: [],
	forceSixRows: false,
	ignoreInactiveDaysInSelection: false,
	pagination: {month: {size: 1}},
	showAdjacent: true,
	targets: {
		item: 'item',
		empty: 'empty',
		nextButton: 'clndr-next-button',
		todayButton: 'clndr-today-button',
		previousButton: 'clndr-previous-button',
		nextYearButton: 'clndr-next-year-button',
		previousYearButton: 'clndr-previous-year-button',
		...Object.values(adapters).map(adapterConstructor => {
			return adapterConstructor.targets;
		}).reduce<Record<string, string>>(
			(accu, value) => {
				if (value !== undefined) {
					Object.keys(value).forEach(key => accu[key] = value[key]);
				}
				return accu;
			},
			{}
		),
	} as {[key in TargetOption]: string},
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
			if (key === 'pagination') {
				// Do not merge pagination to not unintentionally enable view switching functionality
				targetObject[key] = source[key];
			} else if (Array.isArray(source[key])) {
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
					targetObject[key] as { [k: string]: unknown },
					source[key] as { [k: string]: unknown }
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
	private readonly availableViews: View[];
	private adapter: Adapter;
	/**
	 * Boolean values used to log whether any constraints are met
	 */
	private readonly constraints: NavigationConstraints;
	private readonly daysOfTheWeek: DaysOfTheWeek;
	private interval: Interval;
	private options: InternalOptions;
	private calendarContainer: HTMLElement;
	private events: InternalClndrEvent[];
	private selectedDate?: Date;

	constructor(element: HTMLElement, options: ClndrOptions) {
		this.element = element;

		this.options = Clndr.mergeOptions<InternalOptions, ClndrOptions>(defaults, options);

		this.availableViews = typeof this.options.render === 'function'
			? Object.keys(this.options.pagination) as View[]
			: orderedViews.filter(view => Object.keys(this.options.render).includes(view));

		const defaultView = this.options.defaultView !== defaults.defaultView
			? this.options.defaultView
			: this.options.pagination[this.options.defaultView]
				? this.options.defaultView
				// Pick the smallest view configured when pagination is not configured for the default
				// view.
				: orderedViews.filter(view => this.options.pagination[view] !== undefined)[0];

		this.adapter = new adapters[defaultView]({
			forceSixRows: this.options.forceSixRows,
			// There will always be at least one view's pagination be configured as there is a default
			// value. Therefore, `defaultView` will be a valid view having pagination configured.
			pageSize: (this.options.pagination[defaultView] as Pagination)?.size ?? 1,
			showAdjacent: this.options.showAdjacent,
			weekOffset: this.options.weekOffset,
		});

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

		// For supporting arbitrary lengths of time, the current range is stored
		this.interval = this.adapter.initInterval(
			this.options.startOn !== undefined ? new Date(this.options.startOn) : undefined
		);

		// If there are constraints, make sure the interval is within them
		if (this.options.constraints) {
			this.interval = this.initConstraints(this.options.constraints, this.interval);
		}

		if (this.options.selectedDate) {
			this.selectedDate = new Date(this.options.selectedDate);
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

		this.options.on.ready?.apply(this, [{view: this.adapter.getView()}]);
	}

	private initConstraints(constraints: Constraints, interval: Interval) {
		let adjustedInterval: Interval = {start: interval.start, end: interval.end};

		if (constraints.start) {
			adjustedInterval = this.adapter.initStartConstraint(
				new Date(constraints.start),
				adjustedInterval
			);
		}

		if (constraints.end) {
			adjustedInterval = this.adapter.initEndConstraint(
				new Date(constraints.end),
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

	private createPageItems(
		interval: Interval,
		events: [InternalClndrEvent[], InternalClndrEvent[], InternalClndrEvent[]]
	) {

		const dates = this.adapter.aggregatePageItems(interval, this.options.weekOffset);

		// This array will contain the data of the entire grid (including blank spaces)
		return [
			...dates[0].map(date => {
				if (this.options.showAdjacent) {
					return this.createPageItem(date, events[0], interval)
				} else {
					return this.compileClndrItem({
						classes: [this.options.targets.empty, this.options.classes.previous].join(' '),
					})
				}
			}),
			...dates[1].map(date => {
				return this.createPageItem(date, events[1], interval)
			}),
			...dates[2].map(date => {
				if (this.options.showAdjacent) {
					return this.createPageItem(date, events[2], interval)
				} else {
					return this.compileClndrItem({
						classes: [this.options.targets.empty, this.options.classes.next].join(' '),
					})
				}
			}),
		];
	}

	/**
	 * Filters the events list to events that are happening on the previous page, the current page and
	 * the next page, so if the adjacent option is on, the events will also be available in the
	 * template.
	 */
	private parseEvents(interval: Interval) {
		const parsedEvents: [InternalClndrEvent[], InternalClndrEvent[], InternalClndrEvent[]]
			= [[], [], []];

		parsedEvents[1] = this.events.filter(event => {
			const afterEnd = isAfter(event.clndrInterval.start, interval.end);
			const beforeStart = isBefore(event.clndrInterval.end, interval.start);

			return !(beforeStart || afterEnd);
		});

		const [previousPageEvents, nextPageEvents]
			= this.adapter.aggregateAdjacentPageEvents(interval, this.events);

		parsedEvents[0] = previousPageEvents;
		parsedEvents[2] = nextPageEvents;

		return parsedEvents;
	}

	private createPageItem(date: Date, events: InternalClndrEvent[], interval: Interval) {
		const now = new Date();
		const classes = [this.options.targets.item];
		const properties: ClndrItemProperties = {
			isNow: false,
			isInactive: false,
			isAdjacent: false,
		};

		const itemInterval = this.adapter.getIntervalForDate(date);

		if (isWithinInterval(now, itemInterval)) {
			classes.push(this.options.classes.now);
			properties.isNow = true;
		}

		if (isBefore(itemInterval.end, now)) {
			classes.push(this.options.classes.past);
		}

		const eventsOfCurrentItem = events.filter(event => {
			const start = event.clndrInterval.start;
			const end = event.clndrInterval.end;

			return !isAfter(start, itemInterval.end) && !isAfter(itemInterval.start, end);
		});

		if (eventsOfCurrentItem.length) {
			classes.push(this.options.classes.event);
		}

		const adjacent = this.adapter.isAdjacent(itemInterval, interval);

		if (adjacent) {
			classes.push(this.options.classes.adjacent);
			properties.isAdjacent = true;
		}

		if (adjacent === 'before') {
			classes.push(this.options.classes.previous);
		} else if (adjacent === 'after') {
			classes.push(this.options.classes.next);
		}

		// If there are constraints, the inactive class needs to be added to the days outside of them
		if (this.options.constraints) {
			const constraintStart = this.options.constraints.start;
			const constraintEnd = this.options.constraints.end;

			if (constraintStart !== undefined && isBefore(itemInterval.end, constraintStart)) {
				classes.push(this.options.classes.inactive);
				properties.isInactive = true;
			}

			if (constraintEnd !== undefined && isAfter(itemInterval.start, constraintEnd)) {
				classes.push(this.options.classes.inactive);
				properties.isInactive = true;
			}
		}

		if(!properties.isInactive) {
			const adjacentView = this.getAdjacentView(this.adapter.getView());
			adjacentView && classes.push(this.options.classes.switch);
		}

		if (this.selectedDate && isWithinInterval(this.selectedDate, itemInterval)) {
			classes.push(this.options.classes.selected);
		}

		return this.compileClndrItem({
			interval: itemInterval,
			date,
			day: getDate(date),
			events: eventsOfCurrentItem.map(event => event.originalEvent),
			properties: properties,
			classes: [...classes, this.adapter.getIdForItem(itemInterval.start)].join(' '),
		});
	}

	private getAdjacentView(view: View): View | undefined {
		const index = this.availableViews.indexOf(view);
		const adjacentIndex = index - 1;
		return this.availableViews[adjacentIndex];
	}

	private render() {
		this.calendarContainer.innerHTML = '';

		const renderFn = typeof this.options.render === 'function'
			? this.options.render
			: this.options.render[this.adapter.getView()];

		if (!renderFn) {
			console.warn(`No render function defined for ${this.adapter.getView()} view`);
			return;
		}

		this.calendarContainer.innerHTML = renderFn.apply(
			this,
			[this.aggregateTemplateData()]
		);

		this.applyInactiveClasses();

		if (this.options.on.doneRendering) {
			this.options.on.doneRendering.apply(this, [{view: this.adapter.getView()}]);
		}
	}

	private aggregateTemplateData() {
		const data: ClndrTemplateData = {
			pages: [],
			items: [],
			events: {
				currentPage: [],
				previousPage: [],
				nextPage: [],
			},
			extras: this.options.extras,
			daysOfTheWeek: this.daysOfTheWeek,
			numberOfRows: 0,
			interval: this.interval,
			format: (date: Date | string | number, formatStr: string, options: FormatOptions = {}) => {
				return format(date, formatStr, {locale: this.options.locale || undefined, ...options});
			},
		};

		const parsedEvents = this.parseEvents(this.interval);

		data.items = [] as ClndrItem[][];
		data.events.currentPage = [] as ClndrEvent[][];
		const pageIntervals = this.adapter.getPageIntervals(data.interval.start);

		for (const pageInterval of pageIntervals) {
			data.pages.push(pageInterval.start);

			data.items.push(this.createPageItems(pageInterval, parsedEvents));

			data.events.currentPage.push(
				parsedEvents[1]
					.filter(event => areIntervalsOverlapping(event.clndrInterval, pageInterval))
					.map(event => event.originalEvent)
			);
		}

		data.events.previousPage = parsedEvents[0].map(event => event.originalEvent);
		data.events.nextPage = parsedEvents[2].map(event => event.originalEvent);

		if ((this.options.pagination[this.adapter.getView()]?.size ?? 1) > 1) {
			return data;
		}

		data.events.currentPage = data.events.currentPage[0];
		data.items = data.items[0];

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
			if (target !== 'item') {
				this.element
					.querySelectorAll('.' + this.options.targets[target as TargetOption])
					.forEach(element => element.classList.remove(this.options.classes.inactive));
			}
		}

		// Just like the classes, reset the internal states to true
		for (const navigationConstraint in this.constraints) {
			this.constraints[navigationConstraint as NavigationConstraint] = true;
		}

		const start = this.options.constraints.start
			? new Date(this.options.constraints.start)
			: null;
		const end = this.options.constraints.end
			? this.adapter.endOfPage(new Date(this.options.constraints.end))
			: null;

		// Month control
		// Room to go back?
		if (start && (!isBefore(start, this.interval.start))) {
			this.element
				.querySelectorAll('.' + this.options.targets.previousButton)
				.forEach(element => element.classList.add(this.options.classes.inactive));
			this.constraints.previous = false;
		}

		// Room to go forward?
		if (end && (!isAfter(end, this.interval.end))) {
			this.element
				.querySelectorAll('.' + this.options.targets.nextButton)
				.forEach(element => element.classList.add(this.options.classes.inactive));
			this.constraints.next = false;
		}

		// Year control
		// Room to go back?
		if (start && isAfter(startOfDay(start), startOfDay(subYears(this.interval.start, 1)))) {
			this.element
				.querySelectorAll('.' + this.options.targets.previousYearButton)
				.forEach(element => element.classList.add(this.options.classes.inactive));
			this.constraints.previousYear = false;
		}

		// Room to for forward?
		if (end && isBefore(startOfDay(end), startOfDay(addYears(this.interval.end, 1)))) {
			this.element
				.querySelectorAll('.' + this.options.targets.nextYearButton)
				.forEach(element => element.classList.add(this.options.classes.inactive));
			this.constraints.nextYear = false;
		}

		// Today
		// Constraints could be updated programmatically. Therefore, this check cannot be just run on
		// initialization.
		if (
			start && isAfter(start, addMonths(new Date(), 1))
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
		const element = event.target as HTMLElement;

		this.handleItemClick(event);
		this.handleEmptyClick(event);

		if (element.closest('.' + targets.todayButton)) {
			this.todayInternal(element);
		}

		if (element.closest('.' + targets.nextButton)) {
			this.nextInternal(element);
		}

		if (element.closest('.' + targets.previousButton)) {
			this.previousInternal(element);
		}

		if (element.closest('.' + targets.nextYearButton)) {
			this.nextYearInternal(element);
		}

		if (element.closest('.' + targets.previousYearButton)) {
			this.previousYearInternal(element);
		}

		Object.values(adapters).forEach(adapterConstructor => {
			if (adapterConstructor.eventListener) {
				adapterConstructor.eventListener.apply(this, [element, this.setPagination.bind(this)]);
			}
		});
	}

	/**
	 * Handles a click event on an item.
	 */
	private handleItemClick(event: Event) {
		const eventTarget = event.target as HTMLElement | null;
		const currentTarget = eventTarget?.closest(
			'.' + this.options.targets.item
		) as HTMLElement | null;

		if (!currentTarget) {
			return;
		}

		this.navigatePerAdjacentItem(currentTarget);

		if (currentTarget.classList.contains('switch')) {
			// Clicking on an item to switch the view will always switch to the next smaller view.
			// Switching to a larger view by clicking on an item does not make a lot of sense.
			const adjacentView = this.getAdjacentView(this.adapter.getView());

			adjacentView && this.switchViewInternal(adjacentView, currentTarget);
		}

		const previouslySelectedDate = this.selectedDate;

		this.updateSelectedDate(currentTarget);

		if (this.options.on.click) {
			const target = this.aggregateInteractionEventParameters(
				currentTarget,
				previouslySelectedDate
			);
			this.options.on.click.apply(this, [target]);
		}
	}

	/**
	 * Navigates to another page according to the target element provided.
	 */
	private navigatePerAdjacentItem(target: HTMLElement) {
		if (!this.options.adjacentItemsChangePage) {
			return;
		}

		if (target.classList.contains(this.options.classes.previous)) {
			this.previousInternal(target);
		} else if (target.classList.contains(this.options.classes.next)) {
			this.nextInternal(target);
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

		this.selectedDate = this.getTargetDate(target);
		this.element.querySelectorAll('.' + this.options.classes.selected)
			.forEach(node => node.classList.remove(this.options.classes.selected));

		if (this.selectedDate) {
			const id = this.adapter.getIdForItem(this.selectedDate);
			this.element.querySelector('.' + id)?.classList.add(this.options.classes.selected);
		}
	}

	/**
	 * Handles the click event on empty items.
	 */
	private handleEmptyClick(event: Event) {
		const eventTarget = event.target as HTMLElement | null;
		const currentTarget = eventTarget?.closest(
			'.' + this.options.targets.empty
		) as HTMLElement | null;

		if (!currentTarget) {
			return;
		}

		if (this.options.on.click) {
			const target = this.aggregateInteractionEventParameters(currentTarget);
			this.options.on.click.apply(this, [target]);
		}

		if (this.options.adjacentItemsChangePage) {
			if (currentTarget.classList.contains(this.options.classes.previous)) {
				this.previousInternal(currentTarget);
			} else if (currentTarget.classList.contains(this.options.classes.next)) {
				this.nextInternal(currentTarget);
			}
		}
	}

	/**
	 * Creates the object to be returned along click events.
	 */
	private aggregateInteractionEventParameters(
		target: HTMLElement,
		previouslySelectedDate?: Date
	): ClndrItemEventParameters {
		const targetWasDay = target.classList.contains(this.options.targets.item);
		const date = this.getTargetDate(target);

		return {
			date,
			view: this.adapter.getView(),
			events: targetWasDay && date ? this.getEventsOfDate(date) : [],
			selectedDateChanged: !!date && (
				!previouslySelectedDate || !isSameDay(date, previouslySelectedDate)
			),
			isToday: !!date && this.adapter.isToday(date),
			element: target,
		};
	}

	private getTargetDate(target: HTMLElement) {
		return this.adapter.getDateFromClassNames(target.className) || undefined;
	}

	private getEventsOfDate(date: Date): ClndrEvent[] {
		if (this.events.length === 0) {
			return [];
		}

		const interval = this.adapter.getIntervalForDate(date);

		return this.events.filter(event => areIntervalsOverlapping(
			interval,
			event.clndrInterval
		)).map(event => event.originalEvent);
	}

	/**
	 * Triggers any applicable events given a change in the calendar's start and end dates.
	 * @param orig Contains the original start and end dates.
	 * @param element The event's source element.
	 */
	private triggerEvents(orig: Interval, element?: HTMLElement) {
		const newInt: Interval = {start: this.interval.start, end: this.interval.end};

		const eventParameters = {
			interval: this.interval,
			isBefore: isBefore(newInt.start, orig.start),
			isAfter: isAfter(newInt.start, orig.start),
			monthChanged: !isSameMonth(newInt.start, orig.start),
			yearChanged: !isSameYear(newInt.start, orig.start),
			element,
		}

		if (this.options.on.navigate) {
			this.options.on.navigate.apply(this, [eventParameters]);
		}
	}

	private parseToInternalEvents(events: ClndrEvent[]) {
		const dateParameter = this.options.dateParameter;

		return events.map(event => {
			const start = dateParameter.start && event[dateParameter.start];
			const end = dateParameter.end && event[dateParameter.end];

			if (!end && !start && dateParameter.date) {
				if (
					!(event[dateParameter.date] instanceof Date)
					&& typeof event[dateParameter.date] !== 'string'
					&& !Number.isInteger(event[dateParameter.date])
				) {
					console.warn(
						`event['${dateParameter.date}'] is required to be a Date, a string or an integer, while ${typeof event[dateParameter.date]} was provided`,
						event
					);
					return;
				}

				return {
					clndrInterval: {
						start: new Date(event[dateParameter.date] as Date | string | number),
						end: endOfDay(new Date(event[dateParameter.date] as Date | string | number)),
					},
					originalEvent: event,
				};
			} else if (end || start) {
				if (
					start && !(start instanceof Date) && typeof start !== 'string' && !Number.isInteger(start)
					|| end && !(end instanceof Date) && typeof end !== 'string' && !Number.isInteger(end)
				) {
					console.warn(
						`event['${dateParameter.start}'] and event['${dateParameter.end}'] are required to be a Date, a string or an integer`,
						event
					);
					return;
				}

				return {
					clndrInterval: {
						start: new Date((start || end) as Date | string | number),
						end: endOfDay(new Date((end || start) as Date | string | number)),
					},
					originalEvent: event,
				};
			}

			console.warn('Invalid event configuration', event);
		}).filter(event => !!event) as InternalClndrEvent[];
	}

	private compileClndrItem(options: ClndrItem) {
		const defaults: ClndrItem = {
			date: undefined,
			events: [],
			classes: this.options.targets.empty,
		};

		return Clndr.mergeOptions<ClndrItem>(defaults, options);
	}

	private setPagination(view: View, date?: Date) {
		this.adapter = new adapters[view]({
			forceSixRows: this.options.forceSixRows,
			pageSize: this.options.pagination[view]?.size ?? 1,
			showAdjacent: this.options.showAdjacent,
			weekOffset: this.options.weekOffset,
		});

		this.interval = this.adapter.initInterval(date || this.interval.start);

		if (this.options.constraints) {
			this.interval = this.initConstraints(this.options.constraints, this.interval);
		}

		this.render();
	}

	getSelectedDate() {
		return this.selectedDate;
	}

	/**
	 * Switch the view while ensuring the provided date is on the page.
	 */
	switchView(view: View, date?: Date | string | number) {
		this.switchViewInternal(view, date);
	}

	private switchViewInternal(view: View, dateOrTarget?: Date | string | number | HTMLElement) {
		if (view === this.adapter.getView() || !this.availableViews.includes(view)) {
			return;
		}

		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		const date = dateOrTarget instanceof HTMLElement
			? this.getTargetDate(dateOrTarget)
			: dateOrTarget !== undefined ? new Date(dateOrTarget) : this.interval.start;

		this.setPagination(view, date);

		this.triggerEvents(orig, dateOrTarget instanceof HTMLElement ? dateOrTarget : undefined);
	}

	/**
	 * Action to go backward one or more pages.
	 */
	previous() {
		this.previousInternal();
	}

	private previousInternal(element?: HTMLElement) {
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		if (!this.constraints.previous) {
			return;
		}

		this.interval = this.adapter.back(
			this.interval,
			this.options.pagination[this.adapter.getView()]?.step
		);

		this.render();

		this.triggerEvents(orig, element);
	}

	/**
	 * Action to go forward one or more pages.
	 */
	next() {
		this.nextInternal();
	}

	private nextInternal(element?: HTMLElement) {
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		if (!this.constraints.next) {
			return;
		}

		this.interval = this.adapter.forward(
			this.interval,
			this.options.pagination[this.adapter.getView()]?.step
		);

		this.render();

		this.triggerEvents(orig, element);
	}

	previousYear() {
		this.previousYearInternal();
	}

	private previousYearInternal(element?: HTMLElement) {
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		if (!this.constraints.previousYear) {
			return;
		}

		this.interval = {
			start: subYears(this.interval.start, 1),
			end: subYears(this.interval.end, 1),
		};

		this.render();

		this.triggerEvents(orig, element);

		return;
	}

	nextYear() {
		this.nextYearInternal();
	}

	private nextYearInternal(element?: HTMLElement) {
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		if (!this.constraints.nextYear) {
			return;
		}

		this.interval = {
			start: addYears(this.interval.start, 1),
			end: addYears(this.interval.end, 1),
		};

		this.render();

		this.triggerEvents(orig, element);
	}

	today() {
		this.todayInternal();
	}

	private todayInternal(element?: HTMLElement) {
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		this.interval = this.adapter.setDate(new Date());

		// No need to re-render if the page was not changed
		if (
			!isSameMonth(this.interval.start, orig.start)
			|| !isSameMonth(this.interval.end, orig.end)
		) {
			this.render();
		}

		this.triggerEvents(orig, element);
	}

	/**
	 * Ensures a provided date is on the page.
	 */
	setDate(newDate: Date | string | number) {
		this.setDateInternal(newDate);
	}

	private setDateInternal(newDate: Date | string | number, element?: HTMLElement) {
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		this.interval = this.adapter.setDate(new Date(newDate));

		this.render();

		this.triggerEvents(orig, element);
	}

	/**
	 * Changes the month being provided a value between 0 and 11.
	 */
	setMonth(newMonth: number) {
		this.setMonthInternal(newMonth);
	}

	private setMonthInternal(newMonth: number, element?: HTMLElement) {
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		this.interval = this.adapter.setMonth(newMonth, this.interval);

		this.render();

		this.triggerEvents(orig, element);
	}

	setYear(newYear: number) {
		this.setYearInternal(newYear);
	}

	private setYearInternal(newYear: number, element?: HTMLElement) {
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		this.interval = this.adapter.setYear(newYear, this.interval);

		this.render();

		this.triggerEvents(orig, element);
	}

	/**
	 * Overwrites extras and triggers re-rendering.
	 */
	setExtras(extras: unknown) {
		this.options.extras = extras;
		this.render();
	}

	/**
	 * Overwrites events and triggers re-rendering.
	 */
	setEvents(events: ClndrEvent[]) {
		this.events = this.parseToInternalEvents(events);
		this.render();
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
	}

	destroy() {
		(this.calendarContainer as HTMLElement).innerHTML = '';
		(this.calendarContainer as HTMLElement).remove();

		this.options = defaults;
	}

}

export default Clndr;