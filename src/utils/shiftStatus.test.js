import { describe, it, expect } from 'vitest';
import { getShiftStatusColor, getShiftStatusLabel } from './shiftStatus';

describe('shiftStatus', () => {
  it('maps known statuses', () => {
    expect(getShiftStatusColor('active')).toBe('green');
    expect(getShiftStatusColor('paused')).toBe('gold');
    expect(getShiftStatusLabel('completed')).toBe('Completed');
  });
  it('falls back for unknown statuses', () => {
    expect(getShiftStatusColor('nope')).toBe('default');
    expect(getShiftStatusLabel('nope')).toBe('nope');
    expect(getShiftStatusLabel('')).toBe('-');
  });
});
