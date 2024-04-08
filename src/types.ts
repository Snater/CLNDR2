import {FormatOptions, Locale} from 'date-fns';

type RenderFn = (data: ClndrTemplateData) => string

export type InternalOptions = {
	render: RenderFn | {[key in Scope]?: RenderFn}
	adjacentDaysChangeMonth: boolean
	classes: {[key in ItemStatus]: string}
	clickEvents: ClickEvents
	constraints?: Constraints
	dateParameter: DateParameterDefinition
	daysOfTheWeek?: DaysOfTheWeek
	doneRendering?: () => void
	events: ClndrEvent[]
	extras?: unknown
	forceSixRows: boolean
	formatWeekdayHeader?: (day: Date, locale?: Locale) => string
	ignoreInactiveDaysInSelection: boolean
	locale?: Locale
	pagination: Pagination
	ready?: () => void
	selectedDate?: Date
	showAdjacent: boolean
	startOn?: Date
	targets: {[key in TargetOption]: string}
	trackSelectedDate: boolean
	useTouchEvents: boolean
	weekOffset: WeekOffset
}

export type ClndrOptions = Partial<
	Omit<InternalOptions, 'classes' | 'pagination' | 'render' | 'targets'> & {
		classes?: {[key in ItemStatus]?: string}
		pagination?: Pagination
		targets?: {[key in TargetOption]?: string}
	}
> & {
	render: RenderFn | {[key in Scope]?: RenderFn}
}

export type ClndrEvent = {
	_clndrStartDateObject?: never
	_clndrEndDateObject?: never
} & Partial<ClndrMultiDayEvent & ClndrSingleDayEvent>

type ClndrMultiDayEvent = {
	[key: string]: unknown
}

type ClndrSingleDayEvent = {
	[key: string]: unknown
}

export type InternalClndrEvent = {
	_clndrStartDateObject: Date
	_clndrEndDateObject: Date
	originalEvent: ClndrEvent
}

export type WeekOffset = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Constraints = {
	startDate?: Date
	endDate?: Date
}

export type DaysOfTheWeek = [string, string, string, string, string, string, string]

type DateParameterDefinition = string
	| {date: string, startDate: never, endDate: never}
	| {date?: string, startDate: string, endDate: string}

export type Pagination = {
	scope: Scope
	size: number
	step?: number
}

export type Scope = 'year' | 'month' | 'day'

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
	| 'switchYearButton'

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
	items: ClndrItem[] | ClndrItem[][]
	month: Date
	months: Date[]
	year: Date
	years: Date[]
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

export type ClndrNavigationOptions = {element?: HTMLElement, withCallbacks?: boolean}

export type NavigationConstraint = 'next' | 'today' | 'previous' | 'nextYear' | 'previousYear'
export type NavigationConstraints = {[key in NavigationConstraint]: boolean}

export type Interval = [Date, Date]

// Tuple of dates before the days of the current page, the days of the current page, and days after
// the current page's days. To be used when showing days of adjacent months along a current page's
// month(s).
export type PageDates = [Date[], Date[], Date[]];

export type Adjacent = 'before' | 'after' | null;