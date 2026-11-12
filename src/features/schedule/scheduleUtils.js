import dayjs from 'dayjs';
export { resolveUrl } from '@/src/utils/resolveUrl';
import { getEntityId } from '@/src/utils/entityId';

// Constants, colour palette and pure date/id helpers for the schedule timeline.

const DAY_MS = 24 * 60 * 60 * 1000;
export const SIDEBAR_WIDTH = 240;
export const LINE_HEIGHT = 50; // people row, −20% (owner 12.11)
export const MIN_VISIBLE_RANGE_MS = DAY_MS * 3;
export const MAX_VISIBLE_RANGE_MS = DAY_MS * 90;
export const ZOOM_IN_FACTOR = 0.7;
export const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

// Cool palette only (owner rule): blues, teals, indigo, violet — no warm hues.
// People colours (owner 12.11): every person a different, clearly distinguishable
// colour; all cool-toned — cool pink, cool yellow (olive-lime), raspberry are fine,
// no warm orange. Ordered so neighbours differ most. Dark enough for white text.
export const EVENT_COLORS = [
  '#2f6fd0', // blue
  '#c2408f', // cool pink / magenta
  '#1f9e6e', // emerald
  '#6d4fe0', // violet
  '#8f9a1a', // cool yellow (olive-lime)
  '#0e9fb3', // cyan
  '#c43d6b', // raspberry
  '#4b5bd6', // indigo
  '#0b7f99', // petrol
  '#b04fc4', // orchid
  '#5e8f2e', // cool green
  '#7a6a9e', // slate lavender
];

// All day keys (YYYY-MM-DD) in an inclusive range.
export const enumerateDays = (fromKey, toKey) => {
  const out = [];
  let cursor = dayjs(fromKey);
  const end = dayjs(toKey);
  while (cursor.isSame(end, 'day') || cursor.isBefore(end, 'day')) {
    out.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }
  return out;
};

export const normalizeId = (value) => {
  if (!value) {
    return null;
  }

  return String(typeof value === 'object' ? getEntityId(value) : value);
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

export const formatDayLabel = (date, lang = 'en') =>
  new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric' }).format(date);

export const getWeekNumber = (date) => {
  const target = startOfDay(date);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const weekOne = new Date(target.getFullYear(), 0, 4);

  return 1 + Math.round(((target - weekOne) / DAY_MS - 3 + ((weekOne.getDay() + 6) % 7)) / 7);
};

export const getProjectDate = (project, primaryKey, fallbackKey) => {
  const primary = project?.[primaryKey];
  const fallback = project?.[fallbackKey];
  const date = new Date(primary || fallback || Date.now());

  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export const getProjectTimelineDates = (project) => {
  const start = new Date(project.beginningDate);
  const end = new Date(project.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return {
    start: startOfDay(start).getTime(),
    end: addDays(startOfDay(end), 1).getTime(),
  };
};

export const getWorkerIdsForProject = (project) =>
  (project?.workers || [])
    .map(normalizeId)
    .filter(Boolean);
