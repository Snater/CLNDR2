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
	ClndrNavigationOptions,
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
	Scope,
	TargetOption,
	WeekOffset,
} from './types';

const orderedScopes: Scope[] = ['day', 'week', 'month', 'year', 'decade'] as const;

const adapters: Record<Scope,
	(new (options: AdapterOptions) => Adapter) & {
		eventListener?: (element: HTMLElement, callback: (scope: Scope) => void) => void,
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
	clickEvents: {},
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
			} else if (source[key] instanceof HTMLElement) {
				targetObject[key] = source[key];
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
	private readonly availableScopes: Scope[];
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

		this.availableScopes = typeof this.options.render === 'function'
			? Object.keys(this.options.pagination) as Scope[]
			: orderedScopes.filter(scope => Object.keys(this.options.render).includes(scope));

		const defaultView = this.options.defaultView !== defaults.defaultView
			? this.options.defaultView
			: this.options.pagination[this.options.defaultView]
				? this.options.defaultView
				// Pick the smallest scope configured when pagination is not configured for the default
				// view.
				: orderedScopes.filter(scope => this.options.pagination[scope] !== undefined)[0];

		this.adapter = new adapters[defaultView]({
			forceSixRows: this.options.forceSixRows,
			// There will always be at least one scope's pagination be configured as there is a default
			// value. Therefore, `defaultView` will be a valid scope having pagination configured.
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
		this.interval = this.adapter.initInterval(this.options.startOn);

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

		this.options.ready?.apply(this, []);
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

	private createScopeObjects(
		interval: Interval,
		events: [InternalClndrEvent[], InternalClndrEvent[], InternalClndrEvent[]]
	) {

		const dates = this.adapter.aggregateScopeItems(interval, this.options.weekOffset);

		// This array will contain the data of the entire grid (including blank spaces)
		return [
			...dates[0].map(date => {
				if (this.options.showAdjacent) {
					return this.createScopeObject(date, events[0], interval)
				} else {
					return this.compileClndrItem({
						classes: [this.options.targets.empty, this.options.classes.previous].join(' '),
					})
				}
			}),
			...dates[1].map(date => {
				return this.createScopeObject(date, events[1], interval)
			}),
			...dates[2].map(date => {
				if (this.options.showAdjacent) {
					return this.createScopeObject(date, events[2], interval)
				} else {
					return this.compileClndrItem({
						classes: [this.options.targets.empty, this.options.classes.next].join(' '),
					})
				}
			}),
		];
	}

	/**
	 * Filters the events list to events that are happening in the previous scope, the current scope
	 * and the next scope, so if the adjacent option is on, the events will also be available in the
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

		const [previousScopeEvents, nextScopeEvents]
			= this.adapter.aggregateAdjacentScopeEvents(interval, this.events);

		parsedEvents[0] = previousScopeEvents;
		parsedEvents[2] = nextScopeEvents;

		return parsedEvents;
	}

	private createScopeObject(date: Date, events: InternalClndrEvent[], interval: Interval) {
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
			const adjacentScope = this.getAdjacentScope(this.adapter.getScope());
			adjacentScope && classes.push(this.options.classes.switch);
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

	private getAdjacentScope(scope: Scope): Scope | undefined {
		const index = this.availableScopes.indexOf(scope);
		const adjacentIndex = index - 1;
		return this.availableScopes[adjacentIndex];
	}

	private render() {
		this.calendarContainer.innerHTML = '';

		const renderFn = typeof this.options.render === 'function'
			? this.options.render
			: this.options.render[this.adapter.getScope()];

		if (!renderFn) {
			console.warn(`No render function defined for ${this.adapter.getScope()} scope`);
			return;
		}

		this.calendarContainer.innerHTML = renderFn.apply(
			this,
			[this.aggregateTemplateData()]
		);

		this.applyInactiveClasses();

		if (this.options.doneRendering) {
			// TODO: Pass information about scope along the event
			this.options.doneRendering.apply(this, []);
		}
	}

	private aggregateTemplateData() {
		const data: ClndrTemplateData = {
			pages: [],
			items: [],
			events: {
				currentPage: [],
				previousScope: [],
				nextScope: [],
			},
			extras: this.options.extras,
			daysOfTheWeek: this.daysOfTheWeek,
			numberOfRows: 0,
			interval: this.interval,
			format: (date: Date, formatStr: string, options: FormatOptions = {}) => {
				return format(date, formatStr, {locale: this.options.locale || undefined, ...options});
			},
		};

		const parsedEvents = this.parseEvents(this.interval);

		data.items = [] as ClndrItem[][];
		data.events.currentPage = [] as ClndrEvent[][];
		const pageIntervals = this.adapter.getPageIntervals(data.interval.start);

		for (const pageInterval of pageIntervals) {
			data.pages.push(pageInterval.start);

			data.items.push(this.createScopeObjects(pageInterval, parsedEvents));

			data.events.currentPage.push(
				parsedEvents[1]
					.filter(event => areIntervalsOverlapping(event.clndrInterval, pageInterval))
					.map(event => event.originalEvent)
			);
		}

		data.events.previousScope = parsedEvents[0].map(event => event.originalEvent);
		data.events.nextScope = parsedEvents[2].map(event => event.originalEvent);

		if ((this.options.pagination[this.adapter.getScope()]?.size ?? 1) > 1) {
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
			? this.adapter.endOfScope(new Date(this.options.constraints.end))
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
		const options: ClndrNavigationOptions = {element, withCallbacks: true};

		this.handleItemClick(event);
		this.handleEmptyClick(event);

		if (element.closest('.' + targets.todayButton)) {
			this.today(options);
		}

		if (element.closest('.' + targets.nextButton)) {
			this.forward(options);
		}

		if (element.closest('.' + targets.previousButton)) {
			this.back(options);
		}

		if (element.closest('.' + targets.nextYearButton)) {
			this.nextYear(options);
		}

		if (element.closest('.' + targets.previousYearButton)) {
			this.previousYear(options);
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

		this.switchView(currentTarget);

		const previouslySelectedDate = this.selectedDate;

		this.updateSelectedDate(currentTarget);

		if (this.options.clickEvents.onClick) {
			const target = this.aggregateInteractionEventParameters(
				currentTarget,
				previouslySelectedDate
			);
			this.options.clickEvents.onClick.apply(this, [target]);
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
			this.back({element: target, withCallbacks: true});
		} else if (target.classList.contains(this.options.classes.next)) {
			this.forward({element: target, withCallbacks: true});
		}
	}

	/**
	 * Clicking on an item to switch the scope will always switch to the next smaller scope.
	 * Switching to a larger scope by clicking on an item does not make a lot of sense.
	 */
	private switchView(target: HTMLElement) {
		if (!target.classList.contains('switch')) {
			return;
		}

		const adjacentScope = this.getAdjacentScope(this.adapter.getScope());

		if (adjacentScope) {
			this.setPagination(adjacentScope, this.getTargetDate(target));
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

		if (this.options.clickEvents.onClick) {
			const target = this.aggregateInteractionEventParameters(currentTarget);
			this.options.clickEvents.onClick.apply(this, [target]);
		}

		if (this.options.adjacentItemsChangePage) {
			if (currentTarget.classList.contains(this.options.classes.previous)) {
				this.back({element: currentTarget, withCallbacks: true});
			} else if (currentTarget.classList.contains(this.options.classes.next)) {
				this.forward({element: currentTarget, withCallbacks: true});
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

		if (this.options.clickEvents.onNavigate) {
			this.options.clickEvents.onNavigate.apply(this, [eventParameters]);
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

	private setPagination(scope: Scope, date?: Date) {
		this.adapter = new adapters[scope]({
			forceSixRows: this.options.forceSixRows,
			pageSize: this.options.pagination[scope]?.size ?? 1,
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
	 * Action to go backward one or more periods.
	 */
	back(options: ClndrNavigationOptions = {}) {
		const defaults: ClndrNavigationOptions = {withCallbacks: false};
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		if (!this.constraints.previous) {
			return this;
		}

		this.interval = this.adapter.back(
			this.interval,
			this.options.pagination[this.adapter.getScope()]?.step
		);

		this.render();

		if (options.withCallbacks) {
			this.triggerEvents(orig, options.element);
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
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		if (!this.constraints.next) {
			return this;
		}

		this.interval = this.adapter.forward(
			this.interval,
			this.options.pagination[this.adapter.getScope()]?.step
		);

		this.render();

		if (options.withCallbacks) {
			this.triggerEvents(orig, options.element);
		}

		return this;
	}

	/**
	 * Alias of Clndr.forward()
	 */
	next(options: ClndrNavigationOptions = {}) {
		return this.forward(options);
	}

	/**
	 * Action to go back one year.
	 */
	previousYear(options: ClndrNavigationOptions = {}) {
		const defaults: ClndrNavigationOptions = {	withCallbacks: false};
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		if (!this.constraints.previousYear) {
			return this;
		}

		this.interval = {
			start: subYears(this.interval.start, 1),
			end: subYears(this.interval.end, 1),
		};

		this.render();

		if (options.withCallbacks) {
			this.triggerEvents(orig, options.element);
		}

		return this;
	}

	/**
	 * Action to go forward one year.
	 */
	nextYear(options: ClndrNavigationOptions = {}) {
		const defaults: ClndrNavigationOptions = {withCallbacks: false};
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		if (!this.constraints.nextYear) {
			return this;
		}

		this.interval = {
			start: addYears(this.interval.start, 1),
			end: addYears(this.interval.end, 1),
		};

		this.render();

		if (options.withCallbacks) {
			this.triggerEvents(orig, options.element);
		}

		return this;
	}

	today(options: ClndrNavigationOptions = {}) {
		const defaults: ClndrNavigationOptions = {withCallbacks: false};
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		options = Clndr.mergeOptions<ClndrNavigationOptions>(defaults, options);

		this.interval = this.adapter.setDay(new Date(), this.options.startOn);

		// No need to re-render if the page was not changed
		if (
			!isSameMonth(this.interval.start, orig.start)
			|| !isSameMonth(this.interval.end, orig.end)
		) {
			this.render();
		}

		if (options.withCallbacks) {
			this.triggerEvents(orig, options.element);
		}
	}

	// TODO: Add setWeek and setDecade

	/**
	 * Changes the month being provided a value between 0 and 11.
	 */
	setMonth(newMonth: number, options: ClndrNavigationOptions = {}) {
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		this.interval = this.adapter.setMonth(newMonth, this.interval);

		this.render();

		if (options && options.withCallbacks) {
			this.triggerEvents(orig, options.element);
		}

		return this;
	}

	setYear(newYear: number, options: ClndrNavigationOptions = {}) {
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		this.interval = this.adapter.setYear(newYear, this.interval);

		this.render();

		if (options && options.withCallbacks) {
			this.triggerEvents(orig, options.element);
		}

		return this;
	}

	/**
	 * Sets the start of the time period.
	 */
	setIntervalStart(newDate: Date | string, options: ClndrNavigationOptions = {}) {
		const orig: Interval = {start: this.interval.start, end: this.interval.end};

		this.interval = this.adapter.setDay(new Date(newDate), this.options.startOn);

		this.render();

		if (options && options.withCallbacks) {
			this.triggerEvents(orig, options.element);
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