import { describe, it, expect } from 'vitest';
import { statusLabel } from './statusRegistry';

describe('statusLabel', () => {
  it('returns the English label by default', () => {
    expect(statusLabel('paid')).toBe('Paid');
    expect(statusLabel('in_progress', 'en')).toBe('In progress');
  });
  it('returns the Swedish label when asked', () => {
    expect(statusLabel('paid', 'sv')).toBe('Betald');
    expect(statusLabel('in_progress', 'sv')).toBe('Pågår');
  });
  it('is case-insensitive on the status key', () => {
    expect(statusLabel('PAID', 'en')).toBe('Paid');
  });
  it('falls back to the raw value for unknown statuses', () => {
    expect(statusLabel('mystery')).toBe('mystery');
    expect(statusLabel(null)).toBe('');
  });
});
