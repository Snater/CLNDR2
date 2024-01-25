import {FormatOptions, Locale} from 'date-fns';
import Clndr from './clndr';

export type Options = {
	// FIXME: Do not overload events
	events: ClndrEvent[] | InternalClndrEvent[]
	ready: (() => void) | null
	extras: unknown | null
	locale: Locale | null
	weekOffset: number
	constraints: Constraints | null
	forceSixRows: boolean
	selectedDate: Date | string | null
	doneRendering: (() => void) | null
	daysOfTheWeek: string[] | null
	multiDayEvents: MultiDayEvents | null
	startWithMonth: Date | string | null
	dateParameter: DateParameter
	showAdjacentMonths: boolean
	trackSelectedDate: boolean
	formatWeekdayHeader: ((day: Date, locale?: Locale) => string) | null
	adjacentDaysChangeMonth: boolean
	ignoreInactiveDaysInSelection: boolean
	lengthOfTime: LengthOfTime
	clickEvents: ClickEvents
	useTouchEvents: boolean
	targets: {[key in TargetOption]: string}
	classes: {
		past: string
		today: string
		event: string
		inactive: string
		selected: string
		lastMonth: string
		nextMonth: string
		adjacentMonth: string
	},
}

export type UserOptions = Partial<
	Omit<Options, 'lengthOfTime'> & {lengthOfTime?: Partial<LengthOfTime>}
> & {
	render: (data: ClndrTemplateData) => string
}

export type ClndrEvent = {
	// FIXME: Value should allowed to be unknown
	[key: DateParameter]: string | Date
} & Partial<ClndrMultiEvent & ClndrSingleEvent>

type ClndrMultiEvent = {
	startDate?: string
	endDate?: string
}

type ClndrSingleEvent = {
	singleDay: string
}

// FIXME: Properties should not be optional
export type InternalClndrEvent = ClndrEvent & {
	_clndrStartDateObject?: Date
	_clndrEndDateObject?: Date
}

type Constraints = {
	startDate?: string | Date
	endDate?: string | Date
}

export type MultiDayEvents = Partial<MultiDayEvent & SingleDayEvent>

export type MultiDayEvent = {
	startDate: string
	endDate: string
}

type SingleDayEvent = {
	singleDay: string
}

type DateParameter = string

type LengthOfTime = {
	days?: number | null
	interval: number
	months?: number | null
	startDate?: Date | string | null
}

type ClickEvents = {
	click?: (target: Target) => void
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

export type Target = {
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

export type ClndrTemplateData = {
	days: DayOptions[]
	months: Month[]
	year: number | null
	month: string | null
	eventsLastMonth: ClndrEvent[]
	eventsNextMonth: ClndrEvent[]
	eventsThisMonth: ClndrEvent[]
	extras: unknown | null
	daysOfTheWeek: string[]
	intervalEnd: Date | null
	numberOfRows: number
	intervalStart: Date | null
	eventsThisInterval: ClndrEvent[] | ClndrEvent[][] | null
	format: (date: Date, formatStr: string, options: FormatOptions) => string
}

export type DayOptions = {
	day?: number | string
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

export type Month = {
	days: DayOptions[]
	month: Date
}

export type ClndrEventOrigin = {
	start: Date
	end: Date
}

export type ClndrInteractionEvent = Event & {data: {context: Clndr}}

export type SetterOptions = {withCallbacks?: boolean}

export type NavigationOptions = Partial<Options> & SetterOptions

export type ConstraintCheckSubject = 'next' | 'today' | 'previous' | 'nextYear' | 'previousYear'
export type ConstraintChecks = {[key in ConstraintCheckSubject]: boolean}