export const DEFAULT_SHIFT_TIMEZONE = 'Europe/Oslo';

export const SHIFT_GRACE_MINUTE_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60];

export const createDefaultShiftSchedule = () => ({
  enabled: false,
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
  enabled: Boolean(enabled),
  workDayStartTime: workDayStartTime || '07:00',
  workDayEndTime: workDayEndTime || '16:00',
  startGraceMinutes: Number(startGraceMinutes ?? 20),
  endGraceMinutes: Number(endGraceMinutes ?? 20),
  timezone,
});
