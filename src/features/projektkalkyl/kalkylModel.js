// Data model + pure helpers for the Projektkalkyl budget board.
// A calculation = { name, note, tables: [Table] }.
// Table = { id, side:'income'|'expense', title, color, vatMode:'inkl25'|'none',
//           columns:[{id,label,type:'text'|'date'|'amount'}], rows:[{id, cells:{[colId]:val}}] }.

export const VAT_RATE = 0.25;
export const VAT_RATES = [25, 12, 6, 0]; // Swedish rates + 0 (no VAT)

// Effective VAT rate (%) for a table, back-compatible with the old vatMode field.
export function tableVatRate(table) {
  if (Number.isFinite(table?.vatRate)) return table.vatRate;
  return table?.vatMode === 'inkl25' ? 25 : 0;
}
// Effective VAT rate (%) for a row — its own override, else the table default.
export function rowVatRate(table, row) {
  return Number.isFinite(row?.vatRate) ? row.vatRate : tableVatRate(table);
}

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

// Whether the typed Amount already INCLUDES VAT (gross). When true the net and
// VAT are backed out of it; when false (default) Amount is the net and VAT is
// added on top. Turned on either by the per-table toggle (`amountInclVat`) or by
// adding an "amount excl. VAT" column (which only makes sense in gross mode).
export function amountIsGross(table) {
  return table?.amountInclVat === true
    || (table?.columns || []).some((c) => c.type === 'amount_excl');
}

// Net (ex-VAT) amount of a row, honouring the gross/net interpretation above.
export function lineNet(table, row) {
  const gross = lineAmount(table, row);
  if (!amountIsGross(table)) return gross;
  const rate = rowVatRate(table, row) / 100;
  return rate > 0 ? gross / (1 + rate) : gross;
}

// VAT amount of a single row (gross − net when inclusive, net × rate otherwise).
export function lineVat(table, row) {
  if (amountIsGross(table)) return lineAmount(table, row) - lineNet(table, row);
  return lineAmount(table, row) * (rowVatRate(table, row) / 100);
}

// t = translator so preset column labels follow the UI language.
export function newTable(side, t, opts = {}) {
  const columns = opts.columns || tableColumns(t, opts.type);
  return {
    id: rid('t'),
    side,
    title: opts.title || t('New table'),
    color: opts.color || (side === 'income' ? 'green' : 'blue'),
    vatRate: Number.isFinite(opts.vatRate) ? opts.vatRate : 0,
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
    newTable('income', t, { title: t('Income — private clients'), color: 'yellow', vatRate: 25, columns: cols() }),
    newTable('income', t, { title: t('Income — construction firms'), color: 'green', vatRate: 0, columns: cols() }),
    newTable('expense', t, { title: t('Expenses — materials'), color: 'blue', vatRate: 25, columns: cols() }),
    newTable('expense', t, { title: t('Expenses — salaries'), color: 'purple', vatRate: 0, columns: cols() }),
  ];
}

export function tableTotals(table) {
  let base = 0;
  let rowVat = 0; // per-row VAT (rows may override the table rate)
  for (const r of table?.rows || []) {
    base += lineNet(table, r);
    rowVat += lineVat(table, r);
  }
  const markup = base * ((Number(table?.markupPct) || 0) / 100);
  const contingency = (base + markup) * ((Number(table?.contingencyPct) || 0) / 100);
  const netto = base + markup + contingency;
  // markup/contingency are taxed at the table's default rate.
  const vat = rowVat + (markup + contingency) * (tableVatRate(table) / 100);
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
