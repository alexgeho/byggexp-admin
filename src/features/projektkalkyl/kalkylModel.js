// Data model + pure helpers for the Projektkalkyl budget board.
// A calculation = { name, note, tables: [Table] }.
// Table = { id, side:'income'|'expense', title, color, vatMode:'inkl25'|'none',
//           columns:[{id,label,type:'text'|'date'|'amount'}], rows:[{id, cells:{[colId]:val}}] }.

export const VAT_RATE = 0.25;

// Soft palette (bg = table body, head = header strip). Matches the mockup vibe.
export const KALKYL_COLORS = {
  yellow: { bg: '#fdf6dd', head: '#f6e9a8' },
  green: { bg: '#e4efdd', head: '#cfe3c1' },
  blue: { bg: '#dde6f4', head: '#c3d3ec' },
  purple: { bg: '#e9e3f4', head: '#d6c9ec' },
  orange: { bg: '#fce7d6', head: '#f6ceac' },
  grey: { bg: '#eef1f5', head: '#dbe1ea' },
};
export const COLOR_KEYS = Object.keys(KALKYL_COLORS);

const rid = (p) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export const newColumn = (label, type = 'text') => ({ id: rid('c'), label, type });
export const newRow = () => ({ id: rid('r'), cells: {} });

// Column presets per table type: 'simple' (amount typed) or 'qty' (Antal × À-pris
// → Belopp computed). t = translator so labels follow the UI language.
export function tableColumns(t, type = 'simple') {
  if (type === 'qty') {
    return [
      newColumn(t('Description'), 'text'),
      newColumn(t('Quantity'), 'qty'),
      newColumn(t('Unit price'), 'price'),
      newColumn(t('Amount'), 'amount'),
    ];
  }
  return [
    newColumn(t('Description'), 'text'),
    newColumn(t('Date'), 'date'),
    newColumn(t('Amount'), 'amount'),
  ];
}

// The amount of a single row: qty × price when the table has those columns,
// otherwise the typed amount column.
export function lineAmount(table, row) {
  const cols = table?.columns || [];
  const qtyC = cols.find((c) => c.type === 'qty');
  const priceC = cols.find((c) => c.type === 'price');
  if (qtyC && priceC) {
    return (Number(row?.cells?.[qtyC.id]) || 0) * (Number(row?.cells?.[priceC.id]) || 0);
  }
  const amtC = cols.find((c) => c.type === 'amount');
  return amtC ? (Number(row?.cells?.[amtC.id]) || 0) : 0;
}

// t = translator so preset column labels follow the UI language.
export function newTable(side, t, opts = {}) {
  const columns = opts.columns || tableColumns(t, opts.type);
  return {
    id: rid('t'),
    side,
    title: opts.title || t('New table'),
    color: opts.color || (side === 'income' ? 'green' : 'blue'),
    vatMode: opts.vatMode || 'none',
    markupPct: opts.markupPct || 0,
    contingencyPct: opts.contingencyPct || 0,
    columns,
    rows: [newRow(), newRow(), newRow()],
  };
}

// Preset starter tables per the mockup.
export function presetTables(t) {
  const cols = () => [
    newColumn(t('Description'), 'text'),
    newColumn(t('Date'), 'date'),
    newColumn(t('Amount'), 'amount'),
  ];
  return [
    newTable('income', t, { title: t('Income — private clients'), color: 'yellow', vatMode: 'inkl25', columns: cols() }),
    newTable('income', t, { title: t('Income — construction firms'), color: 'green', vatMode: 'none', columns: cols() }),
    newTable('expense', t, { title: t('Expenses — materials'), color: 'blue', vatMode: 'inkl25', columns: cols() }),
  ];
}

export function tableTotals(table) {
  let base = 0;
  for (const r of table?.rows || []) {
    base += lineAmount(table, r);
  }
  const markup = base * ((Number(table?.markupPct) || 0) / 100);
  const contingency = (base + markup) * ((Number(table?.contingencyPct) || 0) / 100);
  const netto = base + markup + contingency;
  const vat = table?.vatMode === 'inkl25' ? netto * VAT_RATE : 0;
  return { base, markup, contingency, netto, vat, brutto: netto + vat };
}

export function sideTotals(tables, side) {
  let netto = 0;
  let vat = 0;
  for (const table of (tables || []).filter((x) => x.side === side)) {
    const tt = tableTotals(table);
    netto += tt.netto;
    vat += tt.vat;
  }
  return { netto, vat, brutto: netto + vat };
}

// Move an item in an array by direction (-1 up / +1 down), returns a new array.
export function moveInArray(arr, index, dir) {
  const next = [...arr];
  const target = index + dir;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
