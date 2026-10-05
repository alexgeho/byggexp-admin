import { isValidElement } from 'react';

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

const isBlank = (v, depth = 0) => {
  if (v === null || v === undefined || v === '') return true;
  if (typeof v === 'string') return /^[\s—–-]*$/.test(v);
  // <span>{x || '-'}</span>-style wrappers around a stray dash
  if (depth < 2 && isValidElement(v) && v.type !== EmptyCell && 'children' in (v.props || {})) {
    return isBlank(v.props.children, depth + 1);
  }
  return false;
};

const getField = (record, dataIndex) => {
  if (dataIndex === undefined || dataIndex === null || dataIndex === '') return record;
  const path = Array.isArray(dataIndex) ? dataIndex : [dataIndex];
  return path.reduce((acc, key) => (acc == null ? acc : acc[key]), record);
};

// Wraps every column so a blank cell (empty, null, or a stray "—"/"-") renders
// the grey dash. Used by the shared tables — pages don't need orDash per column.
export const withEmptyCells = (columns) =>
  (columns || []).map((col) => {
    if (!col || col.render?.__emptyAware) return col;
    if (col.children) return { ...col, children: withEmptyCells(col.children) };
    if (!col.render && (col.dataIndex === undefined || col.dataIndex === null)) return col;
    const render = (value, record, index) => {
      const out = col.render
        ? col.render(value, record, index)
        : cleanCell(getField(record, col.dataIndex));
      return isBlank(out) ? <EmptyCell /> : out;
    };
    render.__emptyAware = true;
    return { ...col, render };
  });
