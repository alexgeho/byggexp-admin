// Register dayjs locales so antd's DatePicker/Calendar can read each language's
// first day of week. Without these, dayjs only knows 'en' and every picker
// starts the week on Sunday — the dates were right but looked shifted a day.
// Importing a locale only registers it; the global dayjs locale stays 'en', so
// format() output elsewhere (exports, labels) is unchanged.
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import 'dayjs/locale/sv';
import 'dayjs/locale/nb';
import 'dayjs/locale/pl';
import 'dayjs/locale/uk';
import 'dayjs/locale/ru';
import 'dayjs/locale/fi';
import 'dayjs/locale/et';
import 'dayjs/locale/lt';
import 'dayjs/locale/lv';
import 'dayjs/locale/hr';

// English UI too: the product serves Nordic/Baltic companies, where the week
// is Monday-first (ISO 8601). Only weekStart changes; nothing in the app uses
// locale-dependent startOf('week').
dayjs.extend(updateLocale);
dayjs.updateLocale('en', { weekStart: 1 });
