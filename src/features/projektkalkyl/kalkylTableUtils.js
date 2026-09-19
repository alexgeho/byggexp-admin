// Pure, UI-agnostic helpers for the Projektkalkyl board tables.

// Thin-space thousands grouping for the amount inputs.
export const amountFmt = (v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const amountParse = (v) => (v || '').replace(/\s/g, '');

// Evaluate what the user typed in an amount cell. Accepts a plain number OR a
// small arithmetic formula (e.g. "2+2", "=10*3", "(1200+300)*1.25") — like a
// spreadsheet cell. Returns a finite number, or null when empty/invalid. Only
// digits, the four operators, parentheses, dot and comma are allowed, so there
// is no arbitrary-code execution despite using Function.
export function evalFormula(raw) {
  let s = String(raw ?? '').trim().replace(/^=/, '');
  if (!s) return null;
  s = s.replace(/\s+/g, '').replace(/,/g, '.'); // spaces = thousand sep; comma = decimal
  if (!/^[0-9.+\-*/()]+$/.test(s)) return null;
  try {
    const v = Function(`"use strict";return (${s})`)();
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

export const COLLAPSE_AT = 12; // tables longer than this collapse to the last 10 rows

// Muted, same-gamma accents (softer than the old loud green/red).
export const GREEN = '#4e9d78';
export const RED = '#cf7676';

// Per-type column widths (px); the text/description column is left without a
// width so it flexes and fills the space on the right.
export const COL_W = { date: 132, amount: 76, vat: 62, amount_excl: 96, number: 96, qty: 88, price: 96 };

// Canonical left→right order so a toggled-on column lands in a sensible spot.
const COL_ORDER = { text: 0, date: 1, qty: 2, price: 3, amount: 4, number: 5, vat: 6, amount_excl: 7 };
export function insertColumn(cols, col) {
  const target = COL_ORDER[col.type] ?? 99;
  let idx = cols.length;
  for (let i = 0; i < cols.length; i += 1) {
    if ((COL_ORDER[cols[i].type] ?? 99) > target) { idx = i; break; }
  }
  const next = [...cols];
  next.splice(idx, 0, col);
  return next;
}

// Merge freshly-ingested rows (scan/import) into a table: fill existing blank
// rows first, then append the rest. A row is blank when every editable
// (non-computed) cell is empty.
export function fillRows(tb, newRows) {
  const editable = (tb.columns || []).filter((c) => c.type !== 'vat' && c.type !== 'amount_excl');
  const isEmpty = (r) => editable.every((c) => {
    const v = r?.cells?.[c.id];
    return v === undefined || v === null || v === '';
  });
  const rows = [...(tb.rows || [])];
  let si = 0;
  for (let i = 0; i < rows.length && si < newRows.length; i += 1) {
    if (isEmpty(rows[i])) { rows[i] = { ...rows[i], cells: newRows[si].cells, vatRate: newRows[si].vatRate }; si += 1; }
  }
  for (; si < newRows.length; si += 1) rows.push(newRows[si]);
  return rows;
}
