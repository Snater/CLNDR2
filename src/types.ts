import {FormatOptions, Locale} from 'date-fns';

export type InternalOptions = {
	render: (data: ClndrTemplateData) => string
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
	render: (data: ClndrTemplateData) => string
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

export type Scope = 'month' | 'day'

type ClickEvents = {
	click?: (target: ClndrTarget) => void
	today?: (month: Date) => void
	nextYear?: (month: Date) => void
	nextMonth?: (month: Date) => void
	nextInterval?: (intervalStart: Date, intervalEnd: Date) => void
	previousYear?: (month: Date) => void
	onYearChange?: (month: Date) => void
	previousMonth?: (month: Date) => void
	onMonthChange?: (month: Date) => void
	previousInterval?: (intervalStart: Date, intervalEnd: Date) => void
	onIntervalChange?: (intervalStart: Date, intervalEnd: Date) => void
}

export type ClndrTarget = {
	date: Date | null
	events: ClndrEvent[]
	element: HTMLElement
}

export type TargetOption = 'day'
	| 'empty'
	| 'nextButton'
	| 'todayButton'
	| 'previousButton'
	| 'nextYearButton'
	| 'previousYearButton'

type ItemStatus = 'past'
	| 'now'
	| 'event'
	| 'inactive'
	| 'selected'
	| 'previous'
	| 'next'
	| 'adjacent'

export type ClndrTemplateData = {
	interval: Interval
	items: ClndrItem[] | ClndrItem[][]
	month: Date | null
	months: Date[] | null
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

export type ClndrNavigationOptions = {withCallbacks?: boolean}

export type NavigationConstraint = 'next' | 'today' | 'previous' | 'nextYear' | 'previousYear'
export type NavigationConstraints = {[key in NavigationConstraint]: boolean}

export type Interval = [Date, Date]

// Tuple of dates before the days of the current page, the days of the current page, and days after
// the current page's days. To be used when showing days of adjacent months along a current page's
// month(s).
export type PageDates = [Date[], Date[], Date[]];

export type Adjacent = 'before' | 'after' | null;