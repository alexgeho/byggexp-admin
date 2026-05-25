const DATE_FIELDS = [
  'createdAt',
  'updatedAt',
  'startedAt',
  'endedAt',
  'shiftDate',
  'beginningDate',
  'endDate',
  'date',
];

function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function parseObjectIdTimestamp(value) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
    return null;
  }

  return parseInt(value.slice(0, 8), 16) * 1000;
}

function getRecordTimestamp(record) {
  if (!record || typeof record !== 'object') {
    return 0;
  }

  for (const field of DATE_FIELDS) {
    const parsed = parseTimestamp(record[field]);
    if (parsed !== null) {
      return parsed;
    }
  }

  const idCandidates = [record._id, record.id];

  for (const candidate of idCandidates) {
    const parsed = parseObjectIdTimestamp(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return 0;
}

export function sortByNewest(items = []) {
  return [...items].sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
}
