import dayjs from 'dayjs';

// Pure helpers and constants for the Hours grid, kept out of HoursPage.

export const RULE_WEEKDAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 7]];

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Localised day/month labels for the grid header (the grid uppercases them in
// CSS). Indexed the same as dayjs: day() 0 = Sunday, month() 0 = January.
const DOW_LOCALE = {
  en: DOW,
  sv: ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'],
  nb: ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'],
};
const MONTHS_LOCALE = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  sv: ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'],
  nb: ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'],
};
const MONTHS_SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  sv: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
  nb: ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'],
};

// Day-of-week abbreviation for a dayjs weekday index (0 = Sun) in the given UI language.
export const dowOf = (lang, dayIdx) => (DOW_LOCALE[lang] || DOW)[dayIdx];
// "juli 2026" / "July 2026" — full month + year in the given language.
export const monthYearLabel = (lang, d) => `${(MONTHS_LOCALE[lang] || MONTHS_LOCALE.en)[d.month()]} ${d.year()}`;
// "6 jul" — day + short month in the given language.
export const dayMonthLabel = (lang, d) => `${d.date()} ${(MONTHS_SHORT[lang] || MONTHS_SHORT.en)[d.month()]}`;

export const HOURS_VIEW_KEY = 'byggexp.hours.view.v1';

// Cell value → Swedish decimal string (comma separator), blank for null.
// Rounded to 1 decimal.
export const fmt = (x) => (x == null ? '' : String(Math.round(x * 10) / 10).replace('.', ','));

// Total → 1-decimal grouped number in sv-SE.
export const grp = (x) => (Math.round((x || 0) * 10) / 10).toLocaleString('sv-SE');

// Unpaid-lunch deduction for a single worked day. `lunch` hours are subtracted
// from the raw day value, but only on days long enough to have taken a break
// (raw >= `threshold`), and never below zero. `lunch = 0` is a no-op, so the
// grid behaves exactly as before until a deduction is configured.
export function netDayHours(raw, lunch = 0, threshold = 6) {
  const v = Number(raw) || 0;
  const cut = Number(lunch) || 0;
  if (cut > 0 && v >= threshold) {
    return Math.max(0, Math.round((v - cut) * 100) / 100);
  }
  return v;
}

// ISO week number for a dayjs date.
export function isoWeek(d) {
  const date = new Date(Date.UTC(d.year(), d.month(), d.date()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  return (
    1 +
    Math.round(
      ((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    )
  );
}

// `offset` shifts the relative windows by whole periods so you can page back
// into history or forward to plan ahead (0 = the current period).
export function periodRange(mode, custom, offset = 0) {
  const today = dayjs();
  if (mode === 'month') {
    const month = today.add(offset, 'month');
    return [month.startOf('month'), month.endOf('month')];
  }
  if (mode === 'custom') {
    return [custom.from, custom.to];
  }
  // 2 weeks, ending `offset` fortnights from today.
  const end = today.add(offset * 14, 'day');
  return [end.subtract(13, 'day'), end];
}
