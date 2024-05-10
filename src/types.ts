import {FormatOptions, Locale} from 'date-fns';
import type {DecadeTargetOption, MonthTargetOption, YearTargetOption} from './adapters';

/**
 * The function rendering your template.
 */
export type RenderFn = (data: ClndrTemplateData) => string

export type DefaultOptions = {
	render?: never
	/**
	 * Whether clicking the item of the preceding or following page navigates to that page. Currently,
	 * only relevant for the `month` view where days of adjacent months may be rendered on the page of
	 * the current month according to the `showAdjacent` option.
	 */
	adjacentItemsChangePage: boolean
	/**
	 * Custom CSS classes added to calendar items for avoiding styling conflicts.
	 * @example
	 * In this example a `my-` prefix is added to all classes:
	 * ```
	 * new Clndr(container, {
	 *   render: \/*...*\/,
	 *   classes: {
	 *     past: 'my-past',
	 *     now: 'my-now',
	 *     event: 'my-event',
	 *     inactive: 'my-inactive',
	 *     previous: 'my-previous',
	 *     next: 'my-next',
	 *     adjacent: 'my-adjacent',
	 *   }
	 * });
	 * ```
	 */
	classes: {[key in ItemStatus]: string}
	/**
	 * Prevent the user from navigating the calendar outside a certain date range (e.g. when
	 * configuring a date picker) by specifying either the start, end, or both. It's possible to
	 * change these dynamically after initialization, per the `Clndr` instance's API functions.
	 * @example
	 * ```
	 * constraints: {
	 *   start: '2000-01-01',
	 *   end: '2024-12-31',
	 * },
	 * ```
	 */
	constraints?: Constraints
	/**
	 * If supplying an events array, `dateParameter` configures which key(s) to look for dates in the
	 * events provided per the `events` option. Only parts of this object may be provided, in case of
	 * exclusively configuring single-day or multi-day events only.
	 * @example
	 * ```
	 * dateParameter: {
	 *   date: 'my-date',
	 *   start: 'my-start-date',
	 *   end: 'my-end-date',
	 * },
	 * ```
	 */
	dateParameter: DateParameterDefinition
	/**
	 * An array of day abbreviation labels used in the calendar header. If providing a date-fns locale
	 * per the `locale` option, the days of the week will be guessed.
	 * @example
	 * ```
	 * ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
	 * ```
	 */
	daysOfTheWeek?: DaysOfTheWeek
	/**
	 * The view that should be rendered initially; Only relevant when configuring multiple views to
	 * allow switching between views.
	 * @example
	 * ```
	 * 'month'
	 * ```
	 */
	defaultView: View
	/**
	 * An array of calendar event objects.
	 * @example
	 * ```
	 * events: [
	 *   {
	 *     title: 'This is an event',
	 *     date: '2000-08-20'
	 *   },
	 *   \/*...*\/
	 * ],
	 * ```
	 */
	events: ClndrEvent[]
	/**
	 * Any other data variables you want access to in your template. Use this option if you would like
	 * to pass in date-fns functions to your template.
	 */
	extras?: unknown
	/**
	 * Always make the calendar six rows tall (42 days) so that every month has a consistent height.
	 */
	forceSixRows: boolean
	/**
	 * Callback function that formats the day in the header. Default is as specified in the example
	 * using date-fns' `format`. The function is passed a Date object representing the day, as well as
	 * a date-fns locale, if provided per the `locale` option.
	 * @example
	 * ```
	 * formatWeekdayHeader: (day, locale) => {
	 *   return format(day, 'cccccc', {locale}).charAt(0);
	 * },
	 * ```
	 */
	formatWeekdayHeader?: (day: Date, locale?: Locale) => string
	/**
	 * Whether `inactive` dates (dates considered outside the boundaries defined by the `constraints`
	 * option) should be selectable, if the `trackSelectedDate` option is activated.
	 */
	ignoreInactiveDaysInSelection: boolean
	/**
	 * A date-fns locale to use when formatting date strings (the month name passed to the template,
	 * the day abbreviations in the calendar header).
	 */
	locale?: Locale
	/**
	 * Handlers for interaction events. `this` is set to the calendar instance in all callbacks.
	 */
	on: InteractionEvents
	/**
	 * Customization of the calendar's pagination. That is, if the calendar should, for example,
	 * render more than one month, or a certain amount of days at once. Pagination may be configured
	 * individual to each view when using multiple views.
	 * @example
	 * ```
	 * {
	 *   month: {
	 *     // Render two months at the same time.
	 *     size: 2,
	 *
	 *     // Navigated forward/backward ny one month when paging the calendar.
	 *     step: 1,
	 *   },
	 *   year: {
	 *     size: 1,
	 *     step: 1,
	 *   },
	 * }
	 */
	pagination: {[key in View]?: Pagination}
	/**
	 * A date that should be selected (that is its element is supposed to receive the
	 * `classes.selected` class) at the time the calendar is initialized.
	 */
	selectedDate?: Date | string | number
	/**
	 * Whether to show the items of pages adjacent to the current page. Currently, only relevant for
	 * the `month` view where it allows rendering days of months adjacent to the current month for
	 * achieving a fully populated grid of days.
	 */
	showAdjacent: boolean
	/**
	 * Determines the point in time that should be within the view rendered initially. The value may
	 * be either a `Date` object, a string or number to be passed to the `Date` constructor. If not
	 * provided, today's date is used.
	 * @example
	 * ```
	 * '1992-10'
	 * ```
	 */
	startOn?: Date | string | number
	/**
	 * The target classnames that the calendar will look for to bind events. The defaults are as per
	 * the example.
	 * @example
	 * ```
	 * {
	 *   item: 'item',
	 *   empty: 'empty',
	 *   nextButton: 'clndr-next-button',
	 *   todayButton: 'clndr-today-button',
	 *   previousButton: 'clndr-previous-button',
	 *   nextYearButton: 'clndr-next-year-button',
	 *   previousYearButton: 'clndr-previous-year-button',
	 *   switchWeekButton: 'clndr-switch-week-button',
	 *   switchMonthButton: 'clndr-switch-month-button',
	 *   switchYearButton: 'clndr-switch-year-button',
	 *   switchDecadeButton: 'clndr-switch-decade-button',
	 * }
	 * ```
	 */
	targets: {[key in TargetOption]: string}
	/**
	 * Whether the last clicked day should be tracked, that is applying the `classes.selected` class
	 * to the day that was clicked last. If `trackSelectedDate` is true, "selected" class will always
	 * be applied only to the most recently clicked date; otherwise `selectedDate` will not change.
	 */
	trackSelectedDate: boolean
	/**
	 * Use the "touchstart" event instead of "click" for binding the relevant `on` handlers.
	 */
	useTouchEvents: boolean
	/**
	 * Start the week on Sunday (0), Monday (1), etc. Sunday is the default.
	 */
	weekStartsOn: Day
}

/**
 * See the {@link DefaultOptions} for the documentation of the individual parameters. You might also
 * want to look at the [Storybook demos](https://clndr2.snater.com/demos) for interactively setting
 * options on the demos.
 */
export type ClndrOptions = Partial<
	Omit<DefaultOptions, 'classes' | 'defaultView' | 'pagination' | 'render' | 'targets'> & {
		classes?: {[key in ItemStatus]?: string}
		defaultView?: View
		pagination?: {[key in View]?: Pagination}
		targets?: {[key in TargetOption]?: string}
	}
> & {
	/**
	 * The function rendering your template. This may also be an object with the keys referring to the
	 * views to enable if switching between views is to be enabled.
	 */
	render: RenderFn | {[key in View]?: RenderFn}
}

/**
 * The calendar event.
 */
export type ClndrEvent = {
	[key: string]: unknown
}

export type InternalClndrEvent = {
	clndrInterval: Interval
	originalEvent: ClndrEvent
}

export type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Constraints = {
	start?: Date | string | number
	end?: Date | string | number
}

export type DaysOfTheWeek = [string, string, string, string, string, string, string]

/**
 * `date` configures the key to look for the date on single-day events, while `start` and `end`
 * define the boundaries of an event.
 */
export type DateParameterDefinition
	= {date: string, start?: never, end?: never}
	| {date?: string, start: string, end: string}
	| {date: string, start: string, end: string}

export type Pagination = {
	/**
	 * How many pages to render at once. May be used to display, for example, two months next to each
	 * other.
	 */
	size: number
	/**
	 * The amount of pages will be navigated forward/backward when paging the calendar.
	 * If not set, `size` will be used for paginating.
	 */
	step?: number
}

export type View = 'decade' | 'year' | 'month' | 'week' | 'day'

export type InteractionEvents = {
	/**
	 * A callback triggered when the calendar is done rendering.
	 * @param parameters.element - The calendar's root element.
	 * @param parameters.interval - The interval rendered.
	 * @param parameters.view - Ths view rendered.
	 */
	afterRender?: (
		parameters: {element: HTMLElement, interval: Interval, view: View}
	) => Promise<void>
	/**
	 * A callback triggered when the calendar is about to render.
	 * @param parameters.element - The calendar's root element.
	 * @param parameters.interval - The interval about to be rendered.
	 * @param parameters.view - Ths view about to be rendered.
	 */
	beforeRender?: (
		parameters: {element: HTMLElement, interval: Interval, view: View}
	) => Promise<void>
	/**
	 * A callback triggered whenever a calendar box is clicked.
	 */
	click?: (parameters: ClndrItemEventParameters) => void
	/**
	 * Triggered whenever navigating the calendar, which is any operation other than directly clicking
	 * a calendar box, i.e. clicking the "back" and "forward" buttons, clicking the "today" button
	 * etc.
	 */
	navigate?: (parameters: NavigationEventParameters) => void
	/**
	 * Callback triggered once the calendar has been initialized and rendered.
	 * @param parameters.element - The calendar's root element.
	 * @param parameters.interval - The interval that has been rendered initially.
	 * @param parameters.view - Ths view that has been rendered initially.
	 */
	ready?: (
		parameters: {element: HTMLElement, interval: Interval, view: View}
	) => void
	/**
	 * Callback triggered whenever the view is switched. The callback is triggered before rendering,
	 * hence any updated to the calendar events done here, will be considered when rendering the new
	 * view.
	 * @param parameters.view - Ths view that is switched to.
	 */
	switchView?: (parameters: {view: View}) => Promise<void>
}

export type ClndrItemEventParameters = {
	/**
	 * The date clicked on; not necessarily provided, since it might be an empty placeholder element
	 * that was clicked on.
	 */
	date?: Date
	/**
	 * The origin view of the event.
	 */
	view: View
	/**
	 * The events on the date being clicked as provided by the `events` option.
	 */
	events: ClndrEvent[]
	/**
	 * Whether the clicked triggered changing the selected date, if the `trackSelectedDate` option is
	 * activated.
	 */
	selectedDateChanged: boolean
	/**
	 * Whether the calendar item clicked is or contains today.
	 */
	isToday: boolean
	/**
	 * The element clicked on.
	 */
	element: HTMLElement
}

export type NavigationEventParameters = {
	/**
	 * `Date` object describing the lower and upper end of the new page's interval.
	 */
	interval: Interval
	/**
	 * Whether the new page is before the one previously rendered (i.e. navigating backward).
	 */
	isBefore: boolean
	/**
	 * Whether the new page is after the one previously rendered (i.e. navigating forward).
	 */
	isAfter: boolean
	/**
	 * Whether month was changed (includes navigating to the same month in another year).
	 */
	monthChanged: boolean
	/**
	 * Whether the year was changed.
	 */
	yearChanged: boolean
	/**
	 * The HTML element targeted by the click; `undefined` when navigating programmatically.
	 */
	element?: HTMLElement
}

export type TargetOption = 'item'
	| 'empty'
	| 'nextButton'
	| 'todayButton'
	| 'previousButton'
	| 'nextYearButton'
	| 'previousYearButton'
	| MonthTargetOption
	| YearTargetOption
	| DecadeTargetOption

export type ItemStatus = 'past'
	| 'now'
	| 'event'
	| 'inactive'
	| 'selected'
	| 'previous'
	| 'next'
	| 'adjacent'
	| 'switch'

/**
 * Data provided to the template.
 */
export type ClndrTemplateData = {
	/**
	 * Date indicating the current page for convenience; This is exactly the same as `interval.start`.
	 */
	date: Date
	/**
	 * Start and end of the current page's interval.
	 */
	interval: Interval
	/**
	 * When the calendar is configured to display multiple pages at a time per a view's `pagination`
	 * option, this will contain a Date object for each page referring to the start of each page's
	 * interval. For rendering the items of each page, the `pages` can be looped over and the
	 * corresponding items be rendered like this:
	 * @example
	 * ```
	 * pages.forEach((page, pageIndex) => {
	 *   \/*...*\/ items[pageIndex].forEach(item => \/*...*\/) \/*...*\/
	 * )}
	 * ```
	 */
	pages: Date[]
	/**
	 * The items of a calendar page. When the calendar is configured to display multiple pages at a
	 * time per a view's `pagination` options, `items` will be a multidimensional array, one array of
	 * `ClndrItem` objects per page.
	 */
	items: ClndrItem[] | ClndrItem[][]
	/**
	 * The events of the current page as well as the events of the previous and next page.
	 * `events.currentPage` is a multidimensional array if the pagination size of the current view is
	 * greater than 1. `events.previousPage` and `events.nextPage` may be used to get the events of
	 * adjacent pages if the `showAdjacent` option is turned on. Currently, that option is relevant
	 * for the `month` view only.
	 */
	events: {
		currentPage: ClndrEvent[] | ClndrEvent[][]
		previousPage: ClndrEvent[]
		nextPage: ClndrEvent[]
	}
	/**
	 * An array of day-of-the-week abbreviations, shifted as configured by the `weekStartsOn`
	 * parameter, i.e. `['S', 'M', 'T', etc...]`.
	 */
	daysOfTheWeek: string[]
	/**
	 * A proxy for date-fns' `format` function being equipped with the locale provided to the `locale`
	 * option.
	 * @see [date-fns' `format` function](https://date-fns.org/docs/format)
	 */
	format: (date: Date | string | number, formatStr: string, options: FormatOptions) => string
	/**
	 * Anything passed per the `extras` options when creating the calendar.
	 */
	extras: unknown | null
}

/**
 * An item displayed on a calendar page. A page consists of one or more items, e.g. a year page
 * consists of 12 items, each representing a month.
 */
export type ClndrItem = {
	/**
	 * Start and end of the item.
	 */
	interval?: Interval
	/**
	 * A `Date` object representing the item. This may be undefined if the item is just an empty
	 * placeholder item, e.g. on a month view when the `showAdjacent` option is `false`.
	 */
	date?: Date
	/**
	 * The day of the month, only available on the month view.
	 */
	day?: number
	/**
	 * The calendar events assigned to this item.
	 */
	events?: ClndrEvent[]
	/**
	 * CSS classes to be applied to the item's HTML element indicating its status and whether there
	 * are events assigned to this item.
	 */
	classes: string
	/**
	 * Status indicators for the item.
	 */
	properties?: ClndrItemProperties
}

export type ClndrItemProperties = {
	isNow: boolean
	isInactive: boolean
	isAdjacent: boolean
}

export type NavigationConstraint = 'next' | 'today' | 'previous' | 'nextYear' | 'previousYear'
export type NavigationConstraints = {[key in NavigationConstraint]: boolean}

export type Interval = {start: Date, end: Date}

// Tuple of dates before the days of the current page, the days of the current page, and days after
// the current page's days. To be used when showing days of adjacent months along a current page's
// month(s).
export type PageDates = [Date[], Date[], Date[]];

export type Adjacent = 'before' | 'after' | null;