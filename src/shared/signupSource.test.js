// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import {
  SIGNUP_SOURCE_KEY,
  readGaIds,
  readSignupSource,
  signupSourceBootScript,
  signupSourceLabel,
} from './signupSource';

describe('signupSourceLabel', () => {
  it('prefers mailer campaign, then UTM, then referrer host', () => {
    expect(signupSourceLabel({ campaign: 'El – B', utmSource: 'x' })).toBe('El – B');
    expect(signupSourceLabel({ utmSource: 'brevo', utmMedium: 'email' })).toBe('brevo / email');
    expect(signupSourceLabel({ referrer: 'https://www.google.com/' })).toBe('google.com');
  });

  it('falls back to App / Direkt, empty for old companies', () => {
    expect(signupSourceLabel({ client: 'app' })).toBe('App');
    expect(signupSourceLabel({ client: 'web' })).toBe('Direkt');
    expect(signupSourceLabel(null)).toBe('');
  });
});

describe('signupSourceBootScript', () => {
  beforeEach(() => sessionStorage.clear());

  it('stores the first landing once per session', () => {
    window.history.replaceState({}, '', '/register?utm_source=brevo&utm_campaign=el-b');
    new Function(signupSourceBootScript)();
    window.history.replaceState({}, '', '/login?utm_source=other');
    new Function(signupSourceBootScript)();
    const s = readSignupSource();
    expect(s.utmSource).toBe('brevo');
    expect(s.utmCampaign).toBe('el-b');
    expect(s.landing).toBe('/register?utm_source=brevo&utm_campaign=el-b');
    expect(sessionStorage.getItem(SIGNUP_SOURCE_KEY)).toBeTruthy();
  });
});

describe('readGaIds', () => {
  it('parses client id and both session cookie formats', () => {
    expect(readGaIds('_ga=GA1.1.123.456; _ga_551T40R4WV=GS1.1.1759580000.1.1.1759580100.0.0.0')).toEqual({
      gaClientId: '123.456',
      gaSessionId: '1759580000',
    });
    expect(readGaIds('_ga=GA1.1.1.2; _ga_551T40R4WV=GS2.1.s1759580000$o3$g1$t1759580100').gaSessionId).toBe('1759580000');
  });

  it('is empty without cookies', () => {
    expect(readGaIds('')).toEqual({ gaClientId: '', gaSessionId: '' });
  });
});
