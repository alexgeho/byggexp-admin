const DEFAULT_SHIFT_TIMEZONE = 'Europe/Oslo';

export const SHIFT_GRACE_MINUTE_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60];

export const createDefaultShiftSchedule = () => ({
  enabled: true,
  workDayStartTime: '07:00',
  workDayEndTime: '16:00',
  startGraceMinutes: 20,
  endGraceMinutes: 20,
  timezone: DEFAULT_SHIFT_TIMEZONE,
});

export const buildShiftSchedulePayload = ({
  enabled,
  workDayStartTime,
  workDayEndTime,
  startGraceMinutes,
  endGraceMinutes,
  timezone = DEFAULT_SHIFT_TIMEZONE,
}) => ({
  // A shift window needs BOTH a start and end time to be active. If either is
  // cleared, the project is saved with no fixed schedule (enabled:false) — the
  // backend then doesn't enforce a window and the Hours grid has no planned
  // baseline for it. Empty times are omitted (never sent as ''), because the
  // API rejects a non-HH:mm string.
  enabled: Boolean(enabled) && Boolean(workDayStartTime) && Boolean(workDayEndTime),
  workDayStartTime: workDayStartTime || undefined,
  workDayEndTime: workDayEndTime || undefined,
  startGraceMinutes: Number(startGraceMinutes ?? 20),
  endGraceMinutes: Number(endGraceMinutes ?? 20),
  timezone,
});
