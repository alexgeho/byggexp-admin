import { describe, it, expect } from 'vitest';
import { isActivated, orderStepsByFocus, ONBOARDING_FOCI } from './activation';

describe('isActivated', () => {
  it('needs both a project and billing', () => {
    expect(isActivated({ projectCount: 0, billingCount: 0 })).toBe(false);
    expect(isActivated({ projectCount: 1, billingCount: 0 })).toBe(false);
    expect(isActivated({ projectCount: 0, billingCount: 1 })).toBe(false);
    expect(isActivated({ projectCount: 1, billingCount: 1 })).toBe(true);
  });

  it('defaults missing counts to zero', () => {
    expect(isActivated()).toBe(false);
    expect(isActivated({})).toBe(false);
  });
});

describe('orderStepsByFocus', () => {
  const steps = ['company', 'team', 'project', 'client', 'billing'].map((key) => ({ key }));

  it('returns steps unchanged for an unknown / skip focus', () => {
    expect(orderStepsByFocus(steps, null).map((s) => s.key))
      .toEqual(['company', 'team', 'project', 'client', 'billing']);
    expect(orderStepsByFocus(steps, 'skip').map((s) => s.key))
      .toEqual(['company', 'team', 'project', 'client', 'billing']);
  });

  it('reorders by the billing focus', () => {
    expect(orderStepsByFocus(steps, 'billing').map((s) => s.key))
      .toEqual(ONBOARDING_FOCI.billing);
  });

  it('reorders by the fieldwork focus', () => {
    expect(orderStepsByFocus(steps, 'fieldwork').map((s) => s.key))
      .toEqual(ONBOARDING_FOCI.fieldwork);
  });

  it('never drops or duplicates a step', () => {
    const out = orderStepsByFocus(steps, 'billing');
    expect(out).toHaveLength(steps.length);
    expect(new Set(out.map((s) => s.key)).size).toBe(steps.length);
  });
});
