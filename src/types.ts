import {FormatOptions, Locale} from 'date-fns';
import type {TargetOption as DecadeTargetOption} from './DecadeAdapter';
import type {TargetOption as MonthTargetOption} from './MonthAdapter';
import type {TargetOption as YearTargetOption} from './YearAdapter';

type RenderFn = (data: ClndrTemplateData) => string

export type DefaultOptions = {
	render?: never
	adjacentItemsChangePage: boolean
	classes: {[key in ItemStatus]: string}
	constraints?: Constraints
	dateParameter: DateParameterDefinition
	daysOfTheWeek?: DaysOfTheWeek
	defaultView: View
	events: ClndrEvent[]
	extras?: unknown
	forceSixRows: boolean
	formatWeekdayHeader?: (day: Date, locale?: Locale) => string
	ignoreInactiveDaysInSelection: boolean
	locale?: Locale
	on: InteractionEvents
	pagination: {[key in View]?: Pagination}
	selectedDate?: Date | string | number
	showAdjacent: boolean
	startOn?: Date | string | number
	targets: {[key in TargetOption]: string}
	trackSelectedDate: boolean
	useTouchEvents: boolean
	weekStartsOn: Day
}

export type ClndrOptions = Partial<
	Omit<DefaultOptions, 'classes' | 'defaultView' | 'pagination' | 'render' | 'targets'> & {
		classes?: {[key in ItemStatus]?: string}
		defaultView?: View
		pagination?: {[key in View]?: Pagination}
		targets?: {[key in TargetOption]?: string}
	}
> & {
	render: RenderFn | {[key in View]?: RenderFn}
}

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

type DateParameterDefinition
	= {date: string, start?: never, end?: never}
	| {date?: string, start: string, end: string}
	| {date: string, start: string, end: string}

export type Pagination = {
	size: number
	step?: number
}

export type View = 'decade' | 'year' | 'month' | 'week' | 'day'

export type InteractionEvents = {
	afterRender?: (
		parameters: {element: HTMLElement, interval: Interval, view: View}
	) => Promise<void>
	beforeRender?: (
		parameters: {element: HTMLElement, interval: Interval, view: View}
	) => Promise<void>
	click?: (parameters: ClndrItemEventParameters) => void
	navigate?: (parameters: NavigationEventParameters) => void
	ready?: (
		parameters: {element: HTMLElement, interval: Interval, view: View}
	) => void
	switchView?: (parameters: {view: View}) => Promise<void>
}

export type ClndrItemEventParameters = {
	date?: Date
	view: View
	events: ClndrEvent[]
	selectedDateChanged: boolean
	isToday: boolean
	element: HTMLElement
}

export type NavigationEventParameters = {
	interval: Interval
	isBefore: boolean
	isAfter: boolean
	monthChanged: boolean
	yearChanged: boolean
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

type ItemStatus = 'past'
	| 'now'
	| 'event'
	| 'inactive'
	| 'selected'
	| 'previous'
	| 'next'
	| 'adjacent'
	| 'switch'

export type ClndrTemplateData = {
	interval: Interval
	pages: Date[]
	items: ClndrItem[] | ClndrItem[][]
	events: {
		currentPage: ClndrEvent[] | ClndrEvent[][]
		previousPage: ClndrEvent[]
		nextPage: ClndrEvent[]
	}
	daysOfTheWeek: string[]
	numberOfRows: number
	format: (date: Date | string | number, formatStr: string, options: FormatOptions) => string
	extras: unknown | null
}

export type ClndrItem = {
	interval?: Interval
	date?: Date
	day?: number
	events?: ClndrEvent[]
	classes: string
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