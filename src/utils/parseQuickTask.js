// Parse a free-typed quick-task line into a title + optional due date +
// priority. Understands Swedish, English and Russian date phrases so the
// planner feels natural: "ring peter imorgon", "offert på fredag",
// "позвонить до пятницы", "review docs in 3 days !!".
//
// Pure and time-injected (nowMs) so it stays React-Compiler-safe.

const DAY = 86400000;

// Optional preposition that may sit in front of a date phrase and should be
// swallowed along with it (till fredag, on friday, до пятницы, på måndag).
const PREP = '(?:\\b(?:p\\u00e5|till|senast|on|by|due|before|\\u0434\\u043e|\\u043a|\\u0432|\\u0432\\u043e)\\s+)?';

const WEEKDAYS = [
  { i: 1, words: ['måndag', 'monday', 'mon', 'понедельник', 'пн'] },
  { i: 2, words: ['tisdag', 'tuesday', 'tue', 'вторник', 'вт'] },
  { i: 3, words: ['onsdag', 'wednesday', 'wed', 'среда', 'среду', 'ср'] },
  { i: 4, words: ['torsdag', 'thursday', 'thu', 'четверг', 'чт'] },
  { i: 5, words: ['fredag', 'friday', 'fri', 'пятница', 'пятницу', 'пт'] },
  { i: 6, words: ['lördag', 'saturday', 'sat', 'суббота', 'субботу', 'сб'] },
  { i: 0, words: ['söndag', 'sunday', 'sun', 'воскресенье', 'вс'] },
];

const startOfDay = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Due date lands at 17:00 local on the target day — end of a working day.
const dayAtDue = (ms, addDays) => {
  const d = new Date(ms);
  d.setDate(d.getDate() + addDays);
  d.setHours(17, 0, 0, 0);
  return d.getTime();
};

// Each rule returns the number of days to add (from today) when it matches.
const buildRules = (nowMs) => {
  const today = new Date(nowMs).getDay();
  const weekdayRules = WEEKDAYS.map((wd) => ({
    re: new RegExp(`${PREP}\\b(?:${wd.words.join('|')})\\b`, 'iu'),
    days: ((wd.i - today + 7) % 7) || 7, // next occurrence; same-day → next week
  }));
  return [
    { re: /\b(idag|i dag|today|сегодня)\b/iu, days: 0 },
    { re: /\b(i övermorgon|övermorgon|day after tomorrow|послезавтра)\b/iu, days: 2 },
    { re: /\b(imorgon|i morgon|tomorrow|завтра)\b/iu, days: 1 },
    { re: /\b(?:om|in|через)\s+(\d+)\s*(?:dag(?:ar)?|days?|d|дн(?:я|ей|ем)?|день)\b/iu, dynamic: true },
    { re: /\b(nästa vecka|next week|(?:на )?след(?:ующей)? недел[еюя])\b/iu, days: 7 },
    ...weekdayRules,
  ];
};

const PRIORITY_HIGH_RE = /\b(brådskande|urgent|asap|viktigt|срочно|важно)\b/iu;

// Detect a time of day: "kl 14", "klockan 9:30", "at 15", "в 14:00", "3pm",
// or a bare "14:30". Returns { h, min, index, len } or null.
const parseTimeOfDay = (str) => {
  const patterns = [
    /\b(?:kl(?:ockan)?)\.?\s*(\d{1,2})(?:[:.](\d{2}))?\b/iu,
    // \b fails before the Cyrillic "в", so anchor on start/space instead.
    /(?:^|\s)(?:at|в)\s+(\d{1,2})(?:[:.](\d{2}))?\b/iu,
    /\b(\d{1,2})\s*(am|pm)\b/iu,
    /\b(\d{1,2}):(\d{2})\b/u,
  ];
  for (let i = 0; i < patterns.length; i += 1) {
    const m = str.match(patterns[i]);
    if (!m) continue;
    let h;
    let min = 0;
    if (i === 2) {
      h = parseInt(m[1], 10) % 12;
      if (/pm/i.test(m[2])) h += 12;
    } else {
      h = parseInt(m[1], 10);
      min = m[2] ? parseInt(m[2], 10) : 0;
    }
    if (h < 0 || h > 23 || min < 0 || min > 59) continue;
    return { h, min, index: m.index, len: m[0].length };
  }
  return null;
};

const clean = (s) =>
  s
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!])/g, '$1')
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '')
    .trim();

export function parseQuickTask(text, nowMs) {
  const raw = (text || '').trim();
  if (!raw) return { title: '', dueMs: null, priority: 'normal', dueDays: null, dueHour: null };

  let working = raw;
  let priority = 'normal';

  // Priority: trailing/inline "!" or urgent words.
  if (/!{1,3}/.test(working) || PRIORITY_HIGH_RE.test(working)) {
    priority = 'high';
    working = working.replace(/!{1,3}/g, ' ').replace(PRIORITY_HIGH_RE, ' ');
  }

  // Date: first matching rule wins.
  let dueMs = null;
  let dueDays = null;
  for (const rule of buildRules(nowMs)) {
    const m = working.match(rule.re);
    if (!m) continue;
    const days = rule.dynamic ? parseInt(m[1], 10) : rule.days;
    if (rule.dynamic && (!Number.isFinite(days) || days < 0 || days > 3650)) continue;
    dueDays = days;
    dueMs = dayAtDue(nowMs, days);
    working = working.slice(0, m.index) + ' ' + working.slice(m.index + m[0].length);
    break;
  }

  // Time of day: "kl 14", "14:00", "3pm" — set the exact due time (and imply
  // today when no date was given so a bare time lands on today's plan).
  let dueHour = null;
  const tm = parseTimeOfDay(working);
  if (tm) {
    dueHour = tm.h;
    const base = dueMs !== null ? new Date(dueMs) : new Date(nowMs);
    base.setHours(tm.h, tm.min, 0, 0);
    dueMs = base.getTime();
    if (dueDays === null) dueDays = 0;
    working = working.slice(0, tm.index) + ' ' + working.slice(tm.index + tm.len);
  }

  const title = clean(working) || raw;
  // If stripping ate the whole title (user typed only a date/time word), keep
  // the literal text and drop the parsed date so nothing is silently lost.
  if (title === raw && dueMs !== null && clean(working) === '') {
    return { title: raw, dueMs: null, priority, dueDays: null, dueHour: null };
  }
  return { title, dueMs, priority, dueDays, dueHour };
}

// Short human label for a detected due date, e.g. "Today", "In 3 d".
export function dueChipLabel(dueMs, nowMs, t) {
  if (dueMs == null) return null;
  const diff = Math.round((startOfDay(dueMs) - startOfDay(nowMs)) / DAY);
  if (diff <= 0) return t('Today');
  if (diff === 1) return t('Tomorrow');
  if (diff <= 7) return t('In {n} d').replace('{n}', String(diff));
  return new Date(dueMs).toLocaleDateString();
}
