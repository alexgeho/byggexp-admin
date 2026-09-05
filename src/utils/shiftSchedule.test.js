import { describe, it, expect } from 'vitest';
import { createDefaultShiftSchedule, buildShiftSchedulePayload } from './shiftSchedule';

describe('createDefaultShiftSchedule', () => {
  it('returns the enabled 07:00–16:00 default', () => {
    expect(createDefaultShiftSchedule()).toEqual({
      enabled: true,
      workDayStartTime: '07:00',
      workDayEndTime: '16:00',
      startGraceMinutes: 20,
      endGraceMinutes: 20,
      timezone: 'Europe/Oslo',
    });
  });
});

describe('buildShiftSchedulePayload', () => {
  it('coerces grace types and disables an empty (timeless) schedule', () => {
    expect(buildShiftSchedulePayload({ enabled: 1, startGraceMinutes: '15' })).toEqual({
      enabled: false,
      workDayStartTime: undefined,
      workDayEndTime: undefined,
      startGraceMinutes: 15,
      endGraceMinutes: 20,
      timezone: 'Europe/Oslo',
    });
  });

  it('keeps provided values and timezone (both times → enabled)', () => {
    expect(buildShiftSchedulePayload({
      enabled: true,
      workDayStartTime: '08:30',
      workDayEndTime: '17:00',
      startGraceMinutes: 5,
      endGraceMinutes: 10,
      timezone: 'Europe/Stockholm',
    })).toEqual({
      enabled: true,
      workDayStartTime: '08:30',
      workDayEndTime: '17:00',
      startGraceMinutes: 5,
      endGraceMinutes: 10,
      timezone: 'Europe/Stockholm',
    });
  });

  it('disables the schedule when only one time is set', () => {
    expect(buildShiftSchedulePayload({
      enabled: true,
      workDayStartTime: '08:30',
    })).toMatchObject({
      enabled: false,
      workDayStartTime: '08:30',
      workDayEndTime: undefined,
    });
  });
});
