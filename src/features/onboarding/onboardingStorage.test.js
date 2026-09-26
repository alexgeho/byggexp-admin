// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { consumeFreshLogin, markFreshLogin } from './onboardingStorage';

describe('fresh-login flag', () => {
  beforeEach(() => localStorage.clear());

  it('is consumed exactly once per sign-in', () => {
    expect(consumeFreshLogin()).toBe(false);
    markFreshLogin();
    expect(consumeFreshLogin()).toBe(true);
    expect(consumeFreshLogin()).toBe(false);
  });
});
