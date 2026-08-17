import dayjs from 'dayjs';
import apiClient from '@/src/api/apiClient';
import { getEntityId } from '@/src/utils/entityId';

// Constants, colour palette and pure date/id helpers for the schedule timeline.

const DAY_MS = 24 * 60 * 60 * 1000;
export const SIDEBAR_WIDTH = 320;
export const LINE_HEIGHT = 62;
export const MIN_VISIBLE_RANGE_MS = DAY_MS * 3;
export const MAX_VISIBLE_RANGE_MS = DAY_MS * 90;
export const ZOOM_IN_FACTOR = 0.7;
export const ZOOM_OUT_FACTOR = 1 / ZOOM_IN_FACTOR;

export const EVENT_COLORS = [
  '#0089f6',
  '#11b8cf',
  '#8c00e9',
  '#e56200',
  '#11a979',
  '#f05ba8',
  '#5568ff',
];

export const resolveUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, apiClient.defaults.baseURL).toString();
  } catch {
    return url;
  }
};

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

export const formatDayLabel = (date) =>
  new Intl.DateTimeFormat('en', { weekday: 'short', day: '2-digit' }).format(date);

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
