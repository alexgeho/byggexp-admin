const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value) {
  return String(value).padStart(2, '0');
}

export function parseAdminDate(value) {
  if (value == null || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const dateOnlyMatch = trimmed.match(DATE_ONLY_PATTERN);

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      const date = new Date(Number(year), Number(month) - 1, Number(day));

      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatAdminDate(value, fallback = '-') {
  const date = parseAdminDate(value);

  if (!date) {
    return fallback;
  }

  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export function formatAdminTime(value, fallback = '-') {
  const date = parseAdminDate(value);

  if (!date) {
    return fallback;
  }

  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function formatAdminDateTime(value, fallback = '-') {
  const date = parseAdminDate(value);

  if (!date) {
    return fallback;
  }

  return `${formatAdminDate(date)} ${formatAdminTime(date)}`;
}

export function formatAdminDateRange(start, end, separator = ' – ') {
  const startLabel = formatAdminDate(start, null);
  const endLabel = formatAdminDate(end, null);

  if (startLabel && endLabel) {
    return `${startLabel}${separator}${endLabel}`;
  }

  if (startLabel) {
    return `From ${startLabel}`;
  }

  if (endLabel) {
    return `Until ${endLabel}`;
  }

  return null;
}
