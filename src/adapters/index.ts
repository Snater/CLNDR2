import {Adapter} from './Adapter';
import DayAdapter from './DayAdapter';
import DecadeAdapter from './DecadeAdapter';
import MonthAdapter from './MonthAdapter';
import WeekAdapter from './WeekAdapter';
import YearAdapter from './YearAdapter';

import type {View} from '../types';
import type {AdapterOptions} from './Adapter';

export {Adapter};

export type {AdapterOptions};
export type {TargetOption as DecadeTargetOption} from './DecadeAdapter';
export type {TargetOption as MonthTargetOption} from './MonthAdapter';
export type {TargetOption as YearTargetOption} from './YearAdapter';

const adapters: Record<
	View,
	(new (options: AdapterOptions) => Adapter) & {
		eventListener?: (element: HTMLElement, callback: (view: View) => void) => void,
		targets?: Record<string, string>
	}
> = {
	decade: DecadeAdapter,
	year: YearAdapter,
	month: MonthAdapter,
	week: WeekAdapter,
	day: DayAdapter,
} as const;

export default adapters;
