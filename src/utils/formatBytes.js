// Human-readable byte sizes (1024-based): 0 B, 12 KB, 3,4 MB, 1,2 GB.
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return '0 B';
  const exp = Math.min(Math.floor(Math.log(n) / Math.log(1024)), UNITS.length - 1);
  const value = n / 1024 ** exp;
  const decimals = exp === 0 ? 0 : value >= 100 ? 0 : 1;
  return `${value.toFixed(decimals)} ${UNITS[exp]}`;
}
