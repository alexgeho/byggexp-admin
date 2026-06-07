import { formatDuration } from './formatDuration';

export const LIVE_DOT_COLORS = {
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  gray: '#9ca3af',
};

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

export function getLiveStatus(user, workerShiftInfo, now = Date.now()) {
  if (user?.role !== 'worker') {
    return { kind: 'na' };
  }

  const workStatus = user.workStatus || 'off_duty';
  const hasShiftToday = Boolean(workerShiftInfo?.hasShiftToday);
  const durationMs = workerShiftInfo?.totalDurationMs ?? 0;
  const projectName = user.workStatusProjectName || null;

  if (workStatus === 'working') {
    return {
      kind: 'at_work',
      dotColor: 'green',
      label: projectName ? `At work · ${projectName}` : 'At work',
      durationMs,
      durationLabel: formatDuration(durationMs),
    };
  }

  if (workStatus === 'outside_project_area') {
    return {
      kind: 'absent',
      dotColor: 'amber',
      label: projectName ? `Outside project area · ${projectName}` : 'Outside project area',
      durationMs,
      durationLabel: durationMs ? formatDuration(durationMs) : null,
    };
  }

  if (!hasShiftToday) {
    return {
      kind: 'missing',
      dotColor: 'red',
      label: 'Missing from work',
      durationMs: 0,
      durationLabel: null,
    };
  }

  return {
    kind: 'off_duty',
    dotColor: 'gray',
    label: 'Off duty',
    durationMs,
    durationLabel: durationMs ? formatDuration(durationMs) : null,
  };
}
