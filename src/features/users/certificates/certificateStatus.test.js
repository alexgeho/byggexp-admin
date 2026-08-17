import { describe, it, expect } from 'vitest';
import {
  getCertificateStatus,
  summarizeCertificates,
  isCertificateActionable,
  CERT_STATUS,
} from './certificateStatus';

const now = new Date('2026-06-15T12:00:00Z');
const opts = { now };

describe('getCertificateStatus', () => {
  it('flags an expired certificate', () => {
    const { status, daysLeft } = getCertificateStatus({ expiresAt: '2026-06-01' }, opts);
    expect(status).toBe(CERT_STATUS.EXPIRED);
    expect(daysLeft).toBeLessThan(0);
  });

  it('flags one expiring within the warning window', () => {
    expect(getCertificateStatus({ expiresAt: '2026-06-20' }, opts).status).toBe(CERT_STATUS.EXPIRING);
  });

  it('treats a far-off expiry as valid', () => {
    expect(getCertificateStatus({ expiresAt: '2026-12-31' }, opts).status).toBe(CERT_STATUS.VALID);
  });

  it('is unknown without a (valid) expiry date', () => {
    expect(getCertificateStatus({}, opts).status).toBe(CERT_STATUS.UNKNOWN);
    expect(getCertificateStatus({ expiresAt: 'not-a-date' }, opts).status).toBe(CERT_STATUS.UNKNOWN);
  });

  it('respects a custom warningDays window', () => {
    expect(getCertificateStatus({ expiresAt: '2026-06-20' }, { now, warningDays: 2 }).status)
      .toBe(CERT_STATUS.VALID);
  });
});

describe('isCertificateActionable', () => {
  it('is true for expired/expiring, false otherwise', () => {
    expect(isCertificateActionable({ expiresAt: '2026-06-01' }, opts)).toBe(true);
    expect(isCertificateActionable({ expiresAt: '2026-06-20' }, opts)).toBe(true);
    expect(isCertificateActionable({ expiresAt: '2026-12-31' }, opts)).toBe(false);
  });
});

describe('summarizeCertificates', () => {
  it('counts by status and reports the worst', () => {
    const summary = summarizeCertificates([
      { expiresAt: '2026-06-01' }, // expired
      { expiresAt: '2026-06-20' }, // expiring
      { expiresAt: '2026-12-31' }, // valid
      {}, // unknown
    ], opts);

    expect(summary.total).toBe(4);
    expect(summary.counts).toEqual({ valid: 1, expiring: 1, expired: 1, unknown: 1 });
    expect(summary.worst).toBe('expired');
  });

  it('is empty-safe', () => {
    expect(summarizeCertificates()).toEqual({
      total: 0, counts: { valid: 0, expiring: 0, expired: 0, unknown: 0 }, worst: null,
    });
  });
});
