import { describe, it, expect } from 'vitest';
import { isActivated, stepsForFocus, nextFocus, ONBOARDING_FOCI } from './activation';

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

describe('stepsForFocus', () => {
  const steps = ['company', 'team', 'project', 'client', 'billing', 'article'].map((key) => ({ key }));

  it('returns all steps unchanged for an unknown / skip focus', () => {
    expect(stepsForFocus(steps, null).map((s) => s.key))
      .toEqual(['company', 'team', 'project', 'client', 'billing', 'article']);
    expect(stepsForFocus(steps, 'skip').map((s) => s.key))
      .toEqual(['company', 'team', 'project', 'client', 'billing', 'article']);
  });

  it('shows only the fieldwork subset in order', () => {
    expect(stepsForFocus(steps, 'fieldwork').map((s) => s.key))
      .toEqual(ONBOARDING_FOCI.fieldwork.steps);
    expect(stepsForFocus(steps, 'fieldwork').some((s) => s.key === 'billing')).toBe(false);
  });

  it('shows only the billing subset in order (with the article step)', () => {
    expect(stepsForFocus(steps, 'billing').map((s) => s.key))
      .toEqual(ONBOARDING_FOCI.billing.steps);
    expect(stepsForFocus(steps, 'billing').some((s) => s.key === 'article')).toBe(true);
  });

  it('never invents a step that is not in the base list', () => {
    const out = stepsForFocus(steps, 'billing');
    const keys = new Set(steps.map((s) => s.key));
    expect(out.every((s) => keys.has(s.key))).toBe(true);
  });
});

describe('nextFocus', () => {
  it('points each track at the other', () => {
    expect(nextFocus('fieldwork')).toBe('billing');
    expect(nextFocus('billing')).toBe('fieldwork');
  });

  it('is null for unknown / skip', () => {
    expect(nextFocus('skip')).toBe(null);
    expect(nextFocus(null)).toBe(null);
  });
});
