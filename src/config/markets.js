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
