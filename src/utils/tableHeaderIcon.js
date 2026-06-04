const FILTER_FIELD_PATTERN =
  /(^status$|^role$|status|date|datetime|time$|at$|started|ended|due|beginning|^end$|^start$|duration|photos|notifications)/i;

const SEARCH_ONLY_PATTERN =
  /^(name|email|address|description|title|phone|location|contract|task|worker|project|company|client|manager)$/i;

export function resolveHeaderIconType(column) {
  if (!column || column.headerSearch === false) {
    return null;
  }

  if (column.headerIconType === 'search' || column.headerIconType === 'filter') {
    return column.headerIconType;
  }

  if (column.key === 'actions') {
    return null;
  }

  const identifiers = [column.key, column.dataIndex, column.title]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).trim());

  if (identifiers.length === 0) {
    return 'search';
  }

  const combined = identifiers.join(' ').toLowerCase();

  if (SEARCH_ONLY_PATTERN.test(combined.replace(/\s+/g, ' '))) {
    return 'search';
  }

  if (FILTER_FIELD_PATTERN.test(combined)) {
    return 'filter';
  }

  return 'search';
}
