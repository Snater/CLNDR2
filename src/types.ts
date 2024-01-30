import {FormatOptions, Locale} from 'date-fns';
import Clndr from './Clndr';

export type InternalOptions = {
	render: (data: ClndrTemplateData) => string
	events: ClndrEvent[]
	ready?: (() => void)
	extras?: unknown
	locale?: Locale
	weekOffset: WeekOffset
	constraints?: Constraints
	forceSixRows: boolean
	selectedDate?: Date | string
	doneRendering?: (() => void)
	daysOfTheWeek?: DaysOfTheWeek
	multiDayEvents?: MultiDayEventsDefinition
	startWithMonth?: Date | string
	dateParameter: string
	showAdjacentMonths: boolean
	trackSelectedDate: boolean
	formatWeekdayHeader?: ((day: Date, locale?: Locale) => string)
	adjacentDaysChangeMonth: boolean
	ignoreInactiveDaysInSelection: boolean
	lengthOfTime: LengthOfTime
	clickEvents: ClickEvents
	useTouchEvents: boolean
	targets: {[key in TargetOption]: string}
	classes: {[key in DayStatus]: string}
}

export type Options = Partial<
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
	intervalEnd: Date | null
	numberOfRows: number
	intervalStart: Date | null
	eventsThisInterval: ClndrEvent[] | ClndrEvent[][]
	format: (date: Date, formatStr: string, options: FormatOptions) => string
}

export type Day = {
	day?: number | string
	date?: Date
	events?: InternalClndrEvent[]
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

export type ClndrInteractionEvent = Event & {data: {context: Clndr}}

export type NavigationOptions = {withCallbacks?: boolean}

export type NavigationConstraint = 'next' | 'today' | 'previous' | 'nextYear' | 'previousYear'
export type NavigationConstraints = {[key in NavigationConstraint]: boolean}

export type Interval = {
	month: Date
	start: Date
	end: Date
}