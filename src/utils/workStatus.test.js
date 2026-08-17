import { describe, it, expect } from 'vitest';
import { getWorkStatusColor, getWorkStatusLabel } from './workStatus';

describe('workStatus', () => {
  it('maps known statuses', () => {
    expect(getWorkStatusColor('working')).toBe('green');
    expect(getWorkStatusColor('outside_project_area')).toBe('gold');
    expect(getWorkStatusLabel('working')).toBe('Working');
    expect(getWorkStatusLabel('off_duty')).toBe('Off duty');
  });
  it('falls back for unknown statuses', () => {
    expect(getWorkStatusColor('nope')).toBe('default');
    expect(getWorkStatusLabel('nope')).toBe('nope');
    expect(getWorkStatusLabel('')).toBe('-');
  });
});
