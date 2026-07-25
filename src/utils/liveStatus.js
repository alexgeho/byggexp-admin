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

// The mobile app pings every ~15s while a shift is active. If we haven't heard
// from the device for longer than this, the worker is treated as offline.
const OFFLINE_AFTER_MS = 3 * 60 * 1000;

export function isShiftTrackedRole(role) {
  return SHIFT_TRACKED_ROLES.includes(role);
}

const formatLastSeen = (ageMs) => {
  const minutes = Math.floor(ageMs / 60000);

  if (minutes < 60) {
    return `last seen ${Math.max(1, minutes)}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `last seen ${hours}h ago`;
};

export function getLiveStatus(user, workerShiftInfo) {
  if (!SHIFT_TRACKED_ROLES.includes(user?.role)) {
    return { kind: 'na' };
  }

  const workStatus = user.workStatus || 'off_duty';
  const hasShiftToday = Boolean(workerShiftInfo?.hasShiftToday);
  const durationMs = workerShiftInfo?.totalDurationMs ?? 0;

  if (workStatus === 'working') {
    const lastSeenTime = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : null;
    const offlineForMs = lastSeenTime ? Date.now() - lastSeenTime : null;
    const isOffline = offlineForMs != null && offlineForMs > OFFLINE_AFTER_MS;

    return {
      kind: 'at_work',
      label: 'At work',
      durationMs,
      durationLabel: formatDuration(durationMs),
      offline: isOffline,
      lastSeenLabel: isOffline ? formatLastSeen(offlineForMs) : null,
    };
  }

  if (workStatus === 'outside_project_area') {
    return {
      kind: 'absent',
      label: 'Not at work',
      durationMs,
      durationLabel: durationMs ? formatDuration(durationMs) : null,
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
  absent: 1,
  off_duty: 2,
  missing: 3,
  na: 4,
};

export function getLiveStatusSortPriority(user, workerShiftInfo) {
  const { kind } = getLiveStatus(user, workerShiftInfo);
  return LIVE_STATUS_SORT_PRIORITY[kind] ?? 99;
}
