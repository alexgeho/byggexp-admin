// Grossist price files (Mowin model): Huvudprislista / Nettoprislista /
// Kopparpriser, downloaded by the admin and uploaded monthly.
export const PRICE_LIST_TYPES = [
  { value: 'main', label: 'Main price list' },
  { value: 'net', label: 'Net price list' },
  { value: 'copper', label: 'Copper prices' },
];

export const STALE_DAYS = 90;

// File name → file type ("Lunda_Nettopris.csv" → net). Defaults to main.
export function guessFileType(name) {
  const n = String(name || '').toLowerCase();
  if (/koppar|copper|kobber/.test(n)) return 'copper';
  if (/netto|net/.test(n)) return 'net';
  return 'main';
}

// Latest import of any file type, or null.
export function latestPriceListDate(priceLists) {
  const times = Object.values(priceLists || {})
    .map((d) => (d ? new Date(d).getTime() : NaN))
    .filter((n) => !Number.isNaN(n));
  return times.length ? new Date(Math.max(...times)) : null;
}

// Never imported or older than 90 days → time to update.
export function isPriceListStale(priceLists, now = new Date()) {
  const latest = latestPriceListDate(priceLists);
  if (!latest) return true;
  return now.getTime() - latest.getTime() > STALE_DAYS * 86400000;
}
