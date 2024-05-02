import {FormatOptions, Locale} from 'date-fns';
import type {TargetOption as DecadeTargetOption} from './DecadeAdapter';
import type {TargetOption as MonthTargetOption} from './MonthAdapter';
import type {TargetOption as YearTargetOption} from './YearAdapter';

type RenderFn = (data: ClndrTemplateData) => string

export type InternalOptions = {
	render: RenderFn | {[key in View]?: RenderFn}
	adjacentItemsChangePage: boolean
	classes: {[key in ItemStatus]: string}
	on: InteractionEvents
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
	pagination: {[key in View]?: Pagination}
	selectedDate?: Date | string | number
	showAdjacent: boolean
	startOn?: Date | string | number
	targets: {[key in TargetOption]: string}
	trackSelectedDate: boolean
	useTouchEvents: boolean
	weekOffset: WeekOffset
}

export type ClndrOptions = Partial<
	Omit<InternalOptions, 'classes' | 'defaultView' | 'pagination' | 'render' | 'targets'> & {
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

export type WeekOffset = 0 | 1 | 2 | 3 | 4 | 5 | 6

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

type InteractionEvents = {
	click?: (parameters: ClndrItemEventParameters) => void
	doneRendering?: ({view}: {view: View}) => void
	navigate?: (parameters: NavigationEventParameters) => void
	ready?: ({view}: {view: View}) => void
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