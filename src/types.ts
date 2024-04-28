import {FormatOptions, Locale} from 'date-fns';
import type {TargetOption as DecadeTargetOption} from './DecadeAdapter';
import type {TargetOption as MonthTargetOption} from './MonthAdapter';
import type {TargetOption as YearTargetOption} from './YearAdapter';

type RenderFn = (data: ClndrTemplateData) => string

// TODO: Extend Date types to also allow Date compatible types string and number
export type InternalOptions = {
	render: RenderFn | {[key in Scope]?: RenderFn}
	adjacentItemsChangePage: boolean
	classes: {[key in ItemStatus]: string}
	clickEvents: ClickEvents
	constraints?: Constraints
	dateParameter: DateParameterDefinition
	daysOfTheWeek?: DaysOfTheWeek
	defaultView: Scope
	doneRendering?: () => void
	events: ClndrEvent[]
	extras?: unknown
	forceSixRows: boolean
	formatWeekdayHeader?: (day: Date, locale?: Locale) => string
	ignoreInactiveDaysInSelection: boolean
	locale?: Locale
	pagination: {[key in Scope]?: Pagination}
	ready?: () => void
	selectedDate?: Date | string | number
	showAdjacent: boolean
	startOn?: Date
	targets: {[key in TargetOption]: string}
	trackSelectedDate: boolean
	useTouchEvents: boolean
	weekOffset: WeekOffset
}

export type ClndrOptions = Partial<
	Omit<InternalOptions, 'classes' | 'defaultView' | 'pagination' | 'render' | 'targets'> & {
		classes?: {[key in ItemStatus]?: string}
		defaultView?: Scope
		pagination?: {[key in Scope]?: Pagination}
		targets?: {[key in TargetOption]?: string}
	}
> & {
	render: RenderFn | {[key in Scope]?: RenderFn}
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

export type Scope = 'decade' | 'year' | 'month' | 'week' | 'day'

type ClickEvents = {
	onClick?: (parameters: ClndrItemEventParameters) => void
	onNavigate?: (parameters: NavigationEventParameters) => void
}

// TODO: This will need to contain the scope when being able to switch the scope
export type ClndrItemEventParameters = {
	date?: Date
	events: ClndrEvent[]
	selectedDateChanged: boolean
	isToday: boolean
	element?: HTMLElement
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
		previousScope: ClndrEvent[]
		nextScope: ClndrEvent[]
	}
	daysOfTheWeek: string[]
	numberOfRows: number
	format: (date: Date, formatStr: string, options: FormatOptions) => string
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