// The one "no value" mark for table cells: a grey dash. Old records sometimes
// store "—" (or prefix it) as the value — treat those as empty too.
const DASH_RE = /^[\s—–-]+/;

export const cleanCell = (value) =>
  typeof value === 'string' ? value.replace(DASH_RE, '').trim() : value;

export function EmptyCell() {
  return <span style={{ color: '#94a3b8' }}>—</span>;
}

// render helper: value or the grey dash.
export const orDash = (value) => {
  const v = cleanCell(value);
  return v === null || v === undefined || v === '' ? <EmptyCell /> : v;
};
