import { describe, it, expect } from 'vitest';
import { createDefaultShiftSchedule, buildShiftSchedulePayload } from './shiftSchedule';

describe('createDefaultShiftSchedule', () => {
  it('returns the disabled 07:00–16:00 default', () => {
    expect(createDefaultShiftSchedule()).toEqual({
      enabled: false,
      workDayStartTime: '07:00',
      workDayEndTime: '16:00',
      startGraceMinutes: 20,
      endGraceMinutes: 20,
      timezone: 'Europe/Oslo',
    });
  });
});

describe('buildShiftSchedulePayload', () => {
  it('coerces types and fills defaults', () => {
    expect(buildShiftSchedulePayload({ enabled: 1, startGraceMinutes: '15' })).toEqual({
      enabled: true,
      workDayStartTime: '07:00',
      workDayEndTime: '16:00',
      startGraceMinutes: 15,
      endGraceMinutes: 20,
      timezone: 'Europe/Oslo',
    });
  });

  it('keeps provided values and timezone', () => {
    expect(buildShiftSchedulePayload({
      enabled: false,
      workDayStartTime: '08:30',
      workDayEndTime: '17:00',
      startGraceMinutes: 5,
      endGraceMinutes: 10,
      timezone: 'Europe/Stockholm',
    })).toEqual({
      enabled: false,
      workDayStartTime: '08:30',
      workDayEndTime: '17:00',
      startGraceMinutes: 5,
      endGraceMinutes: 10,
      timezone: 'Europe/Stockholm',
    });
  });
});
