import {endOfDay, format, getDay} from 'date-fns';
import {Adapter} from './Adapter';
import type {Interval} from './types';

export default abstract class DayBasedAdapter extends Adapter {

	endOfScope(date: Date): Date {
		return endOfDay(date);
	}

	getIdClasses(interval: Interval): string[] {
		return [
			`calendar-day-${format(interval[0], 'yyyy-MM-dd')}`,
			// Day of week
			`calendar-dow-${getDay(interval[0])}`,
		];
	}

	getDateFromClassNames(classNames: string) {
		const index = classNames.indexOf('calendar-day-');
		return index === -1 ? null : new Date(classNames.substring(index + 13, index + 23));
	}

}