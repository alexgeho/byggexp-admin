import { formatDuration } from '@/src/utils/formatDuration';

export function getTodayDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getShiftDurationAt(shift, now = Date.now()) {
  if (!shift) {
    return 0;
  }

  if (shift.status === 'active' && shift.lastResumedAt) {
    const resumedAt = new Date(shift.lastResumedAt).getTime();
    const baseDuration = shift.storedDurationMs ?? shift.durationMs ?? 0;

    if (!Number.isNaN(resumedAt)) {
      return baseDuration + Math.max(0, now - resumedAt);
    }
  }

  return shift.durationMs ?? 0;
}

export function buildWorkerShiftMap(shifts = [], now = Date.now()) {
  return shifts.reduce((map, shift) => {
    const workerId = shift.workerId;
    if (!workerId) {
      return map;
    }

    const current = map[workerId] || {
      hasShiftToday: false,
      totalDurationMs: 0,
      shifts: [],
    };

    current.hasShiftToday = true;
    current.totalDurationMs += getShiftDurationAt(shift, now);
    current.shifts.push(shift);
    map[workerId] = current;

    return map;
  }, {});
}

const SHIFT_TRACKED_ROLES = ['worker', 'projectAdmin'];

// Reasons a shift is auto-paused (worker went offline or left the site). Their
// shift is kept and can resume, so we surface when they were last seen.
const AUTO_PAUSED_REASONS = new Set([
  'offline',
  'outside_project_area',
  'outside_project_area_notified',
]);

export function isShiftTrackedRole(role) {
  return SHIFT_TRACKED_ROLES.includes(role);
}

const formatLastSeen = (source) => {
  const date = new Date(source);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `last seen ${hours}:${minutes}`;
};

export function getLiveStatus(user, workerShiftInfo) {
  if (!SHIFT_TRACKED_ROLES.includes(user?.role)) {
    return { kind: 'na' };
  }

  const workStatus = user.workStatus || 'off_duty';
  const workStatusReason = user.workStatusReason || '';
  const hasShiftToday = Boolean(workerShiftInfo?.hasShiftToday);
  const durationMs = workerShiftInfo?.totalDurationMs ?? 0;

  // On shift and the app is reporting — always live, no last-seen nagging.
  if (workStatus === 'working') {
    return {
      kind: 'at_work',
      label: 'At work',
      durationMs,
      durationLabel: formatDuration(durationMs),
    };
  }

  // Shift auto-paused because the worker went offline or left the site: keep the
  // hours and show when they were last seen (fixed time).
  const isAutoPaused =
    workStatus === 'outside_project_area' || AUTO_PAUSED_REASONS.has(workStatusReason);

  if (isAutoPaused) {
    const lastSeenSource = user.lastSeenAt || user.workStatusUpdatedAt;

    return {
      kind: 'paused',
      label: 'Off duty',
      durationMs,
      durationLabel: durationMs ? formatDuration(durationMs) : null,
      lastSeenLabel: lastSeenSource ? formatLastSeen(lastSeenSource) : null,
    };
  }

  if (!hasShiftToday) {
    return {
      kind: 'missing',
      label: 'Not at work',
      durationMs: 0,
      durationLabel: null,
    };
  }

  return {
    kind: 'off_duty',
    label: 'Off duty',
    durationMs,
    durationLabel: durationMs ? formatDuration(durationMs) : null,
  };
}

const LIVE_STATUS_SORT_PRIORITY = {
  at_work: 0,
  paused: 1,
  off_duty: 2,
  missing: 3,
  na: 4,
};

export function getLiveStatusSortPriority(user, workerShiftInfo) {
  const { kind } = getLiveStatus(user, workerShiftInfo);
  return LIVE_STATUS_SORT_PRIORITY[kind] ?? 99;
}
