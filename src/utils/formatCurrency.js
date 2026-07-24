const amountFormatter = new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeAmountFormatter = new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Formats a numeric amount using Swedish grouping (e.g. 2 450 000,00).
 * Pass { decimals: false } for whole-number amounts (e.g. 2 450 000).
 */
export function formatAmount(value, { decimals = true } = {}) {
  const formatter = decimals ? amountFormatter : wholeAmountFormatter;
  return formatter.format(Number(value || 0));
}

/**
 * Formats an amount with the SEK suffix (e.g. 2 450 000 SEK).
 */
export function formatSek(value, options) {
  return `${formatAmount(value, options)} SEK`;
}
