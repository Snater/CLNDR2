import {format, getDay, isSameDay} from 'date-fns';
import {Adapter} from './Adapter';
import type {Interval} from './types';

export default abstract class DayBasedAdapter extends Adapter {

	isToday(date: Date): boolean {
		return isSameDay(date, new Date());
	}

	getIdClasses(interval: Interval): string[] {
		return [
			`calendar-day-${format(interval.start, 'yyyy-MM-dd')}`,
			// Day of week
			`calendar-dow-${getDay(interval.start)}`,
		];
	}

	getDateFromClassNames(classNames: string) {
		const index = classNames.indexOf('calendar-day-');
		return index === -1 ? null : new Date(classNames.substring(index + 13, index + 23));
	}

}