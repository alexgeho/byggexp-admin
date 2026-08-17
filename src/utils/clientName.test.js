import { describe, it, expect } from 'vitest';
import { formatClientName } from './clientName';

describe('formatClientName', () => {
  it('uses the company name for company clients', () => {
    expect(formatClientName({ companyName: 'Acme AB' })).toBe('Acme AB');
  });

  it('joins first + last name for private clients', () => {
    expect(formatClientName({ clientType: 'private', firstName: 'Anna', lastName: 'Berg' }))
      .toBe('Anna Berg');
  });

  it('falls back to contact person, then email', () => {
    expect(formatClientName({ contactPerson: 'Contact C' })).toBe('Contact C');
    expect(formatClientName({ email: 'e@x.se' })).toBe('e@x.se');
  });

  it('returns an empty string for nothing usable', () => {
    expect(formatClientName(null)).toBe('');
    expect(formatClientName('nope')).toBe('');
    expect(formatClientName({})).toBe('');
  });
});
