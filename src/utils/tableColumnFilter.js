import { getProjectStatusLabel } from './projectStatus';
import { getShiftStatusLabel } from './shiftStatus';

export function getColumnFilterKey(column) {
  if (!column) {
    return '';
  }

  return String(column.filterKey ?? column.dataIndex ?? column.key ?? '');
}

export function getCellFilterText(record, column) {
  if (!record || !column) {
    return '';
  }

  if (typeof column.getFilterValue === 'function') {
    const value = column.getFilterValue(record);
    return value == null ? '' : String(value);
  }

  const field = column.dataIndex ?? column.key;

  if (!field || field === 'actions') {
    return '';
  }

  const value = record[field];

  if (value == null || value === '') {
    return '';
  }

  if (typeof value === 'object') {
    return String(value.name ?? value.label ?? value.title ?? value._id ?? '');
  }

  return String(value);
}

export function resolveColumnFilterKind(column, iconType) {
  if (column?.filterKind) {
    return column.filterKind;
  }

  if (iconType === 'search') {
    return 'search';
  }

  const id = getColumnFilterKey(column).toLowerCase();

  if (id === 'status' || id === 'role') {
    return 'enum';
  }

  if (
    id.includes('date') ||
    id.endsWith('at') ||
    id === 'beginning' ||
    id === 'end' ||
    id === 'start' ||
    id === 'due'
  ) {
    return 'date';
  }

  return 'enum';
}

export function getEnumOptionLabel(column, value) {
  if (column?.filterEnumLabels?.[value]) {
    return column.filterEnumLabels[value];
  }

  const projectLabel = getProjectStatusLabel(value);
  const shiftLabel = getShiftStatusLabel(value);

  if (projectLabel && projectLabel !== value) {
    return projectLabel;
  }

  if (shiftLabel && shiftLabel !== value) {
    return shiftLabel;
  }

  return value;
}

export function buildEnumFilterOptions(dataSource, column) {
  if (column?.filterOptions?.length) {
    return column.filterOptions;
  }

  const values = [
    ...new Set(
      (dataSource ?? [])
        .map((record) => getCellFilterText(record, column))
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  return values.map((value) => ({
    value,
    label: getEnumOptionLabel(column, value),
  }));
}

function parseFilterDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toDayStart(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toDayEnd(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function matchesSearch(record, column, query) {
  if (!query?.trim()) {
    return true;
  }

  const haystack = getCellFilterText(record, column).toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function matchesEnum(record, column, values) {
  if (!values?.length) {
    return true;
  }

  const cellValue = getCellFilterText(record, column);
  return values.includes(cellValue);
}

function matchesDateRange(record, column, range) {
  if (!range?.from && !range?.to) {
    return true;
  }

  const rawValue = record?.[column.dataIndex ?? column.key];

  if (!rawValue) {
    return false;
  }

  const cellDate = parseFilterDate(rawValue);

  if (!cellDate) {
    return false;
  }

  const fromDate = range.from ? toDayStart(parseFilterDate(range.from)) : null;
  const toDate = range.to ? toDayEnd(parseFilterDate(range.to)) : null;

  if (fromDate && cellDate < fromDate) {
    return false;
  }

  if (toDate && cellDate > toDate) {
    return false;
  }

  return true;
}

export function isColumnFilterActive(filterState) {
  if (!filterState) {
    return false;
  }

  if (filterState.type === 'search') {
    return Boolean(filterState.query?.trim());
  }

  if (filterState.type === 'enum') {
    return Boolean(filterState.values?.length);
  }

  if (filterState.type === 'date') {
    return Boolean(filterState.from || filterState.to);
  }

  return false;
}

export function applyColumnFilters(dataSource, columns, columnFilters) {
  const filters = Object.entries(columnFilters ?? {}).filter(([, state]) =>
    isColumnFilterActive(state),
  );

  if (!filters.length) {
    return dataSource ?? [];
  }

  const columnsByKey = new Map(
    (columns ?? []).flatMap((column) => {
      if (column?.children?.length) {
        return column.children.map((child) => [getColumnFilterKey(child), child]);
      }

      return [[getColumnFilterKey(column), column]];
    }),
  );

  return (dataSource ?? []).filter((record) =>
    filters.every(([columnKey, filterState]) => {
      const column = columnsByKey.get(columnKey);

      if (!column) {
        return true;
      }

      if (filterState.type === 'search') {
        return matchesSearch(record, column, filterState.query);
      }

      if (filterState.type === 'enum') {
        return matchesEnum(record, column, filterState.values);
      }

      if (filterState.type === 'date') {
        return matchesDateRange(record, column, filterState);
      }

      return true;
    }),
  );
}
