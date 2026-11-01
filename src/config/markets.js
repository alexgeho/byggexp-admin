// Market (country) configuration for the admin. A company's `country` drives
// market-specific behaviour: which VAT/MVA rates are offered, whether the ROT
// deduction is available (Sweden only), and the default invoicing currency.
// Everything defaults to Sweden so existing companies are unaffected.

// Country options for the company form. Labels are English source strings —
// wrap with t() at the render site (keys: 'Sweden', 'Norway').
export const COUNTRY_OPTIONS = [
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
];

// Currency options for the company form. Codes are the stored value; the
// descriptor is informational.
export const CURRENCY_OPTIONS = [
  { value: 'SEK', label: 'SEK — Swedish krona' },
  { value: 'NOK', label: 'NOK — Norwegian krone' },
  { value: 'DKK', label: 'DKK — Danish krone' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'USD', label: 'USD — US Dollar' },
];

// VAT / MVA rate options per country, highest (standard) first.
// Sweden: 25 / 12 / 6 / 0. Norway (MVA): 25 / 15 / 12 / 0.
const VAT_RATES_BY_COUNTRY = {
  SE: [25, 12, 6, 0],
  NO: [25, 15, 12, 0],
};

const DEFAULT_CURRENCY_BY_COUNTRY = {
  SE: 'SEK',
  NO: 'NOK',
};

// Countries where the ROT labour deduction applies (Swedish tax feature).
const ROT_COUNTRIES = new Set(['SE']);

export const DEFAULT_COUNTRY = 'SE';
export const DEFAULT_CURRENCY = 'SEK';

export function vatRatesForCountry(country) {
  return VAT_RATES_BY_COUNTRY[country] || VAT_RATES_BY_COUNTRY[DEFAULT_COUNTRY];
}

export function defaultCurrencyForCountry(country) {
  return DEFAULT_CURRENCY_BY_COUNTRY[country] || DEFAULT_CURRENCY;
}

export function isRotAvailable(country) {
  // Missing country => treat as Sweden so existing installs keep ROT.
  return ROT_COUNTRIES.has(country || DEFAULT_COUNTRY);
}

// SIE is the Swedish accounting-export format (Fortnox/Visma/BL). Norway uses
// SAF-T, which is a separate (unbuilt) feature — hide SIE for non-SE companies.
export function isSieAvailable(country) {
  return (country || DEFAULT_COUNTRY) === 'SE';
}

// Default employer social-fee rate (%) used as a fallback in payroll when a run
// doesn't carry its own rate. SE arbetsgivaravgift = 31.42%. NO arbeidsgiver-
// avgift is zone-based; 14.1% is the zone I (default) rate. Always overridable.
const EMPLOYER_RATE_BY_COUNTRY = {
  SE: 31.42,
  NO: 14.1,
};

export function defaultEmployerRate(country) {
  return EMPLOYER_RATE_BY_COUNTRY[country] ?? EMPLOYER_RATE_BY_COUNTRY[DEFAULT_COUNTRY];
}

// Lenient national-ID / org-number format checks (digits only, expected length).
// SE personnummer = 10 or 12 digits; NO fødselsnummer = 11. SE org.nr = 10; NO
// organisasjonsnummer = 9. Returns true when empty (optional) or well-formed.
function digitCount(value) {
  return String(value || '').replace(/\D/g, '').length;
}

export function isValidNationalId(value, country) {
  if (!value) return true;
  const n = digitCount(value);
  return (country || DEFAULT_COUNTRY) === 'NO' ? n === 11 : n === 10 || n === 12;
}

export function isValidOrgNumber(value, country) {
  if (!value) return true;
  const n = digitCount(value);
  return (country || DEFAULT_COUNTRY) === 'NO' ? n === 9 : n === 10;
}

// ---- Norway: invoice payment details ----
// KID modes for Norwegian invoices: none, or the invoice number + a MOD10
// (Luhn) / MOD11 check digit. Must match the backend (src/invoices/norway.ts).
// Default MOD10: always a digit. MOD11 gives "-" for ~1 in 11 numbers (valid
// per Nets, but some banks' forms reject it).
export const KID_MODE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'mod10', label: 'MOD10' },
  { value: 'mod11', label: 'MOD11' },
];

// Norwegian bank account number (kontonummer): 11 digits, the last a MOD11
// check digit over the first ten (weights 5,4,3,2,7,6,5,4,3,2). Spaces/dots ok.
export function isValidKontonummer(value) {
  const d = String(value || '').replace(/[\s.]/g, '');
  if (!/^\d{11}$/.test(d)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(d[i]), 0);
  const rest = sum % 11;
  const check = rest === 0 ? 0 : 11 - rest;
  return check !== 10 && check === Number(d[10]);
}

// Betalningspåminnelse (customer payment reminder) follows Swedish rules and
// text — not offered for Norwegian companies.
export function isPaymentReminderAvailable(country) {
  return (country || DEFAULT_COUNTRY) !== 'NO';
}

// Currency of a saved invoice/offer: the one stored on the document; else its
// company's (when the company is populated on the record); else the given
// company's — Norway is always NOK. Lists are scoped to one company, so the
// fallback company is the document's own.
export function documentCurrency(record, companyCountry, companyCurrency) {
  if (record?.currency) return record.currency;
  const company = record?.companyId && typeof record.companyId === 'object' ? record.companyId : null;
  const country = record?.country || company?.country || companyCountry;
  if (country === 'NO') return 'NOK';
  return company?.currency || companyCurrency || DEFAULT_CURRENCY;
}
