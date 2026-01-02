import { DateTime } from 'luxon';

export const timeZone = 'Europe/Rome';

export const getTodayRange = (date = new Date()) => {
  const startOfDayRome = DateTime.fromJSDate(date)
    .setZone(timeZone)
    .startOf('day');
  const endOfDayRome = startOfDayRome.endOf('day');

  const dayAndMonthKyiv = startOfDayRome.toFormat('dd MMMM', { locale: 'it' });

  return {
    startOfDay: startOfDayRome.toJSDate(),
    endOfDay: endOfDayRome.toJSDate(),
    dayAndMonthKyiv,
  };
};

const getWeekRange = (date = new Date()) => {
  const startOfWeekRome = DateTime.fromJSDate(date, { zone: timeZone }).startOf(
    'week'
  );
  const endOfWeekRome = startOfWeekRome.plus({ days: 7 });

  const weekRangeKyiv = `${startOfWeekRome.toFormat('dd MMMM', {
    locale: 'it',
  })} - ${endOfWeekRome.toFormat('dd MMMM', { locale: 'it' })}`;

  return {
    startOfWeek: startOfWeekRome.toJSDate(),
    endOfWeek: endOfWeekRome.toJSDate(),
    weekRangeKyiv,
  };
};

export const getRangeByKeyType = (
  keyType: 'stats_this_week' | 'stats_last_week',
  date = new Date()
) => {
  if (keyType === 'stats_this_week') {
    return getWeekRange(date);
  } else if (keyType === 'stats_last_week') {
    const lastWeekDate = DateTime.fromJSDate(date, { zone: timeZone }).minus({
      weeks: 1,
    });
    return getWeekRange(lastWeekDate.toJSDate());
  }
  throw new Error(`Unsupported KeyType: ${keyType}`);
};

export const getAllDatesInWeek = (startOfWeek: Date) => {
  const startOfWeekRome = DateTime.fromJSDate(startOfWeek, { zone: timeZone });
  return Array.from({ length: 7 }, (_, i) => {
    return startOfWeekRome.plus({ days: i }).toFormat('yyyy-MM-dd');
  });
};

export const formatDateToKey = (timestamp: Date) => {
  return DateTime.fromJSDate(timestamp, { zone: timeZone }).toFormat(
    'yyyy-MM-dd'
  );
};

export const getWeekAgoDate = (date = new Date()) => {
  return DateTime.fromJSDate(date, { zone: timeZone })
    .minus({ weeks: 1 })
    .toJSDate();
};
