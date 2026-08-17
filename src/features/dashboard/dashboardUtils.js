export { resolveUrl } from '@/src/utils/resolveUrl';

// Framework-free helpers, constants and the per-section link map for the
// dashboard overview. Kept out of DashboardPage so they stay unit-testable.

// Personnel statuses go stale the moment a worker clocks in/out on mobile, so
// re-fetch the roster on the same cadence as the live shift poll.
export const PERSONNEL_POLL_INTERVAL_MS = 15000;

export const SECTION_LINKS = {
  admin: {
    projects: '/admin/projects',
    users: '/admin/users',
    companies: '/admin/companies',
    tasks: '/admin/tasks',
    tools: '/admin/tools',
    shifts: '/admin/shifts',
    schedule: '/admin/schedule',
  },
  company: {
    projects: '/company/projects',
    users: '/company/users',
    tasks: '/company/tasks',
    tools: '/company/tools',
    shifts: '/company/shifts',
    schedule: '/company/schedule',
  },
  projects: {
    projects: '/projects/my',
  },
  worker: {
    projects: '/worker/my',
    shifts: '/worker/time-report',
  },
};

export const getDisplayName = (record, fallback = 'Untitled') =>
  record?.name || record?.title || record?.projectName || record?.companyName || fallback;

export const formatHours = (durationMs = 0) => {
  const hours = Math.round((durationMs / 3600000) * 10) / 10;
  return `${hours || 0}h`;
};

export const formatRelativeTime = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSeconds < 60) {
    return 'Just now';
  }

  const units = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'min', seconds: 60 },
  ];

  const unit = units.find((item) => diffSeconds >= item.seconds);
  const valueCount = Math.floor(diffSeconds / unit.seconds);
  const label = unit.label === 'min' || valueCount === 1 ? unit.label : `${unit.label}s`;

  return `${valueCount} ${label} ago`;
};

export const isOpenTask = (task) => !['done', 'completed', 'closed'].includes(String(task?.status || '').toLowerCase());

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const addDays = (date, amount) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
};

const getRecordDateKey = (record, fields) => {
  for (const field of fields) {
    const value = record?.[field];

    if (!value) {
      continue;
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }

    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return formatDateKey(date);
    }
  }

  return null;
};

export const countRecordsByDate = (records, date, fields, predicate = () => true) => {
  const dateKey = formatDateKey(date);

  return records.filter((record) => (
    predicate(record) && getRecordDateKey(record, fields) === dateKey
  )).length;
};

export const sumShiftDurationByDate = (shifts, date) => {
  const dateKey = formatDateKey(date);

  return shifts
    .filter((shift) => getRecordDateKey(shift, ['shiftDate', 'startedAt', 'date', 'createdAt']) === dateKey)
    .reduce((sum, shift) => sum + (Number(shift.durationMs) || 0), 0);
};

export const getDifference = (todayValue, yesterdayValue) => todayValue - yesterdayValue;

export const formatTrendHours = (durationMs) => {
  const hours = Math.round((durationMs / 3600000) * 10) / 10;

  return `${hours || 0} h`;
};
