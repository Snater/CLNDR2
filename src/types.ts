import {FormatOptions, Locale} from 'date-fns';

export type InternalOptions = {
	render: (data: ClndrTemplateData) => string
	adjacentDaysChangeMonth: boolean
	classes: {[key in DayStatus]: string}
	clickEvents: ClickEvents
	constraints?: Constraints
	dateParameter: string
	daysOfTheWeek?: DaysOfTheWeek
	doneRendering?: () => void
	events: ClndrEvent[]
	extras?: unknown
	forceSixRows: boolean
	formatWeekdayHeader?: (day: Date, locale?: Locale) => string
	ignoreInactiveDaysInSelection: boolean
	lengthOfTime: LengthOfTime
	locale?: Locale
	multiDayEvents?: MultiDayEventsDefinition
	ready?: () => void
	selectedDate?: Date | string
	showAdjacentMonths: boolean
	startWithMonth?: Date | string
	targets: {[key in TargetOption]: string}
	trackSelectedDate: boolean
	useTouchEvents: boolean
	weekOffset: WeekOffset
}

export type ClndrOptions = Partial<
	Omit<InternalOptions, 'classes' | 'lengthOfTime' | 'render' | 'targets'> & {
		classes?: {[key in DayStatus]?: string}
		lengthOfTime?: Partial<LengthOfTime>
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
	startDate?: string | Date
	endDate?: string | Date
}

export type DaysOfTheWeek = [string, string, string, string, string, string, string]

type MultiDayEventsDefinition = Partial<MultiDayEventDefinition & SingleDayEventDefinition>

type MultiDayEventDefinition = {
	startDate: string
	endDate: string
}

type SingleDayEventDefinition = {
	singleDay: string
}

export type LengthOfTime = {
	days?: number
	interval: number
	months?: number
	startDate?: Date | string
}

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

type DayStatus = 'past'
	| 'today'
	| 'event'
	| 'inactive'
	| 'selected'
	| 'lastMonth'
	| 'nextMonth'
	| 'adjacentMonth'

export type ClndrTemplateData = {
	days: Day[]
	months: Month[]
	year: number | null
	month: string | null
	eventsLastMonth: ClndrEvent[]
	eventsNextMonth: ClndrEvent[]
	eventsThisMonth: ClndrEvent[]
	extras: unknown | null
	daysOfTheWeek: string[]
	numberOfRows: number
	intervalStart: Date | null
	intervalEnd: Date | null
	eventsThisInterval: ClndrEvent[] | ClndrEvent[][]
	format: (date: Date, formatStr: string, options: FormatOptions) => string
}

export type Day = {
	day?: number
	date?: Date
	events?: ClndrEvent[]
	classes: string
	properties?: DayProperties
}

export type DayProperties = {
	isToday: boolean
	isInactive: boolean
	isAdjacentMonth: boolean
}

type Month = {
	days: Day[]
	month: Date
}

export type ClndrEventOrigin = {
	start: Date
	end: Date
}

export type ClndrNavigationOptions = {withCallbacks?: boolean}

export type NavigationConstraint = 'next' | 'today' | 'previous' | 'nextYear' | 'previousYear'
export type NavigationConstraints = {[key in NavigationConstraint]: boolean}

export type Interval = {
	month: Date
	start: Date
	end: Date
}