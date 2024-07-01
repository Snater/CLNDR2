import {format, isSameDay} from 'date-fns';
import {Adapter} from './Adapter';

export default abstract class DayBasedAdapter extends Adapter {

	isToday(date: Date): boolean {
		return isSameDay(date, new Date());
	}

	getIdForItem(date: Date): string {
		return `calendar-day-${format(date, 'yyyy-MM-dd')}`;
	}

	getDateFromClassNames(classNames: string) {
		const index = classNames.indexOf('calendar-day-');
		return index === -1 ? null : new Date(classNames.substring(index + 13, index + 23));
	}

}