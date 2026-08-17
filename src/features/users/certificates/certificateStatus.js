// Shared logic for employee certificates (certifikat/behörigheter) and the
// expiry reminders that hang off them. Kept framework-free so the user detail
// page, the user list badge and the "Att göra" reminder centre all agree on
// what "expiring" and "expired" mean.

const DAY_MS = 24 * 60 * 60 * 1000;

// How many days before the expiry date a certificate starts nagging.
const DEFAULT_WARNING_DAYS = 30;

export const CERT_STATUS = {
  VALID: 'valid',
  EXPIRING: 'expiring',
  EXPIRED: 'expired',
  UNKNOWN: 'unknown',
};

// English source strings — run them through t() at the render site.
const STATUS_META = {
  valid: { color: 'green', label: 'Valid' },
  expiring: { color: 'orange', label: 'Expiring soon' },
  expired: { color: 'red', label: 'Expired' },
  unknown: { color: 'default', label: 'No expiry date' },
};

// Higher wins when collapsing many certificates into one badge.
const SEVERITY = { expired: 3, expiring: 2, valid: 1, unknown: 0 };

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Status + whole days until expiry (negative once expired) for a single cert.
export function getCertificateStatus(cert, { warningDays = DEFAULT_WARNING_DAYS, now = new Date() } = {}) {
  const expiresAt = cert?.expiresAt ? new Date(cert.expiresAt) : null;

  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    return { status: CERT_STATUS.UNKNOWN, daysLeft: null };
  }

  const daysLeft = Math.ceil((startOfDay(expiresAt).getTime() - startOfDay(now).getTime()) / DAY_MS);

  let status;
  if (daysLeft < 0) {
    status = CERT_STATUS.EXPIRED;
  } else if (daysLeft <= warningDays) {
    status = CERT_STATUS.EXPIRING;
  } else {
    status = CERT_STATUS.VALID;
  }

  return { status, daysLeft };
}

export function getCertificateStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.unknown;
}

// Expired or within the warning window — i.e. worth a reminder.
export function isCertificateActionable(cert, opts = {}) {
  const { status } = getCertificateStatus(cert, opts);
  return status === CERT_STATUS.EXPIRED || status === CERT_STATUS.EXPIRING;
}

// Collapse a user's certificates into { total, counts, worst } for list badges.
export function summarizeCertificates(certificates = [], opts = {}) {
  const counts = { valid: 0, expiring: 0, expired: 0, unknown: 0 };
  let worst = null;

  certificates.forEach((cert) => {
    const { status } = getCertificateStatus(cert, opts);
    counts[status] += 1;
    if (!worst || SEVERITY[status] > SEVERITY[worst]) {
      worst = status;
    }
  });

  return { total: certificates.length, counts, worst };
}
