import { describe, it, expect } from 'vitest';
import { getProjectStatusLabel, PROJECT_STATUS_OPTIONS } from './projectStatus';

describe('projectStatus', () => {
  it('maps labels with a fallback', () => {
    expect(getProjectStatusLabel('in_progress')).toBe('In progress');
    expect(getProjectStatusLabel('on_hold')).toBe('On hold');
    expect(getProjectStatusLabel('mystery')).toBe('mystery');
    expect(getProjectStatusLabel('')).toBe('-');
  });
  it('exposes value/label options for filters', () => {
    expect(PROJECT_STATUS_OPTIONS).toContainEqual({ value: 'planning', label: 'Planning' });
    expect(PROJECT_STATUS_OPTIONS).toHaveLength(4);
  });
});
