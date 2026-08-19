// Currency-aware amount formatting. Amounts are stored as plain numbers; the
// currency comes from the company (see useCompanyCurrency). Existing callers
// that assumed Swedish kronor keep working via formatSek(), which is just
// formatMoney(value, 'SEK') — byte-identical to the previous behaviour.

// Per-currency display: which locale formats the number grouping, and the
// suffix shown after the amount. SEK/NOK/DKK all render "kr"-style grouping;
// the suffix disambiguates them. Unknown currencies fall back to SEK.
const CURRENCY_META = {
  SEK: { locale: 'sv-SE', suffix: 'SEK' },
  NOK: { locale: 'nb-NO', suffix: 'NOK' },
  DKK: { locale: 'da-DK', suffix: 'DKK' },
  EUR: { locale: 'de-DE', suffix: 'EUR' },
  USD: { locale: 'en-US', suffix: 'USD' },
};

const DEFAULT_CURRENCY = 'SEK';

function metaFor(currency) {
  return CURRENCY_META[currency] || CURRENCY_META[DEFAULT_CURRENCY];
}

const formatterCache = new Map();

function getFormatter(locale, decimals) {
  const key = `${locale}:${decimals}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/**
 * Formats a numeric amount using Swedish grouping (e.g. 2 450 000,00).
 * Pass { decimals: false } for whole-number amounts (e.g. 2 450 000).
 * Currency-agnostic — use formatMoney/formatSek when a suffix is needed.
 */
export function formatAmount(value, { decimals = true } = {}) {
  return getFormatter('sv-SE', decimals).format(Number(value || 0));
}

/**
 * Formats an amount with its currency suffix (e.g. 2 450 000 SEK / 2 450 000 NOK),
 * grouped in the currency's locale. Defaults to SEK so pre-existing callers keep
 * the exact same output.
 */
export function formatMoney(value, currency = DEFAULT_CURRENCY, { decimals = true } = {}) {
  const meta = metaFor(currency);
  const number = getFormatter(meta.locale, decimals).format(Number(value || 0));
  return `${number} ${meta.suffix}`;
}

/**
 * Backwards-compatible SEK formatter (e.g. 2 450 000 SEK). Equivalent to
 * formatMoney(value, 'SEK', options).
 */
export function formatSek(value, options) {
  return formatMoney(value, 'SEK', options);
}
