import { describe, expect, it } from 'vitest';
import { agiDeadline } from './agi';

describe('agiDeadline', () => {
  it('12th of next month, 17th in January and August, weekend → Monday', () => {
    expect(agiDeadline('202609')).toBe('2026-10-12');
    expect(agiDeadline('202612')).toBe('2027-01-18'); // 17 Jan 2027 is a Sunday
    expect(agiDeadline('202607')).toBe('2026-08-17');
    expect(agiDeadline('202603')).toBe('2026-04-13'); // 12 Apr 2026 is a Sunday
  });
});
