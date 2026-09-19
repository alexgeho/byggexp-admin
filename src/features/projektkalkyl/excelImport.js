import * as XLSX from '@e965/xlsx';

// Fuzzy header aliases (sv / en / ru) so a user's own Excel maps to our columns.
const DESC = ['beskrivning', 'benämning', 'benamning', 'description', 'text', 'artikel', 'vad', 'наименование', 'название', 'описание', 'meddelande', 'motpart', 'mottagare', 'referens'];
const DATE = ['datum', 'date', 'дата', 'bokföringsdatum', 'bokforingsdatum', 'transaktionsdatum', 'valutadatum'];
const AMOUNT = ['belopp', 'summa', 'sum', 'amount', 'pris', 'kostnad', 'сумма', 'стоимость', 'цена', 'transaktionsbelopp'];
// Separate credit/debit columns some bank exports use instead of one signed amount.
const MONEY_IN = ['insättning', 'insattning', 'inbetalning', 'kredit', 'credit', 'in', 'приход', 'поступление', 'ingående', 'ingaende'];
const MONEY_OUT = ['uttag', 'utbetalning', 'debet', 'debit', 'ut', 'out', 'расход', 'списание', 'utgående', 'utgaende'];

// Download an .xlsx template with the exact headers the importer expects, so a
// user can fill it and re-upload without guessing the format.
export function downloadImportTemplate(headers) {
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    [`${headers[0]} 1`, '2026-01-15', 1000],
    [`${headers[0]} 2`, '2026-01-16', 2500],
  ]);
  ws['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import');
  XLSX.writeFile(wb, 'projektkalkyl-import-mall.xlsx');
}

const norm = (v) => String(v ?? '').trim().toLowerCase();

export const parseAmount = (v) => {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').trim();
  if (!s) return null;
  // Swedish/European numbers: "1 234,56 kr", "-1.234,56", "(1 234,56)" (negative).
  const negative = /^\(.*\)$/.test(s) || /-\s*$/.test(s) || /^-/.test(s);
  s = s.replace(/[()]/g, '').replace(/kr|sek|pln|eur|nok|dkk/gi, '').replace(/\s/g, '');
  // If both separators exist, the last one is the decimal separator.
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '');
  } else {
    s = s.replace(',', '.');
  }
  let n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (negative && n > 0) n = -n;
  return n;
};

// Match a header against aliases by equality or prefix (so "Mottagarens namn"
// resolves via "mottagar", "Transaktionsdatum" via "datum" is NOT matched — use
// the full alias). Prefix (not arbitrary substring) avoids false hits like
// "Valuta" containing "ut".
const findCol = (headerRow, aliases) =>
  headerRow.findIndex((h) => {
    const n = norm(h);
    return aliases.some((a) => n === a || n.startsWith(a));
  });

// Description is guessed by PRIORITY: prefer the counterparty (recipient) name,
// then a free-text/message column, then the payment type.
const DESC_PRIORITY = ['mottagar', 'motpart', 'beskrivning', 'benämning', 'meddelande', 'text', 'betalningstyp', 'referens', 'наименование', 'название', 'описание'];

const isDateCell = (v) => v instanceof Date || /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(String(v ?? '').trim());
// "Money-like": a parseable number that looks like an amount (has a decimal, or
// is short) — excludes long integers such as account/reference numbers.
const isMoneyCell = (v) => {
  const s = String(v ?? '').trim();
  if (!s || parseAmount(s) == null) return false;
  return /[.,]/.test(s) || s.replace(/\D/g, '').length <= 7;
};

// Parse the first sheet of an uploaded Excel/CSV into normalized expense rows:
// [{ description, date, amount }]. Detects a header row by known aliases; if none
// is found, assumes columns are [description, date, amount].
export async function parseExcelExpenses(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  if (!aoa.length) return [];

  let headerIdx = aoa.findIndex(
    (row) => findCol(row, DESC) >= 0 || findCol(row, AMOUNT) >= 0,
  );
  let descI, dateI, amtI, dataStart;
  if (headerIdx >= 0) {
    const h = aoa[headerIdx];
    descI = findCol(h, DESC);
    dateI = findCol(h, DATE);
    amtI = findCol(h, AMOUNT);
    dataStart = headerIdx + 1;
  } else {
    descI = 0; dateI = 1; amtI = 2; dataStart = 0;
  }
  if (amtI < 0) amtI = descI >= 0 ? descI + 2 : 2;
  if (descI < 0) descI = 0;

  const fmtDate = (v) => {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v ?? '').trim();
  };

  const rows = [];
  for (let i = dataStart; i < aoa.length; i += 1) {
    const r = aoa[i];
    const description = String(r[descI] ?? '').trim();
    const amount = parseAmount(r[amtI]);
    const date = dateI >= 0 ? fmtDate(r[dateI]) : '';
    if (!description && amount == null) continue; // skip blank lines
    rows.push({ description, date, amount });
  }
  return rows;
}

export const fmtSheetDate = (v) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? '').trim();
};

// Detect which columns are Date / Description / Amount, using header names AND
// the actual data (bank headers vary wildly), ignoring any `hidden` columns. The
// UI re-runs this when the user × out a column, so removing a wrong column makes
// the next-best one take over — a single source of truth, no dropdowns.
export function detectRoles(columns, rows, hidden = new Set()) {
  const usable = (i) => i >= 0 && !hidden.has(i);
  const N = Math.min(rows.length, 25);
  const stats = columns.map((_, ci) => {
    let filled = 0; let date = 0; let money = 0; let num = 0; let textLen = 0;
    for (let i = 0; i < N; i += 1) {
      const v = rows[i]?.[ci];
      const s = String(v ?? '').trim();
      if (!s) continue;
      filled += 1;
      if (isDateCell(v)) date += 1;
      if (isMoneyCell(v)) money += 1;
      if (parseAmount(v) != null) num += 1; else textLen += s.length;
    }
    return { filled, date, money, num, textLen };
  });
  const ratio = (a, f) => (f ? a / f : 0);
  const findH = (aliases) => columns.findIndex((h, i) => usable(i)
    && aliases.some((a) => { const n = norm(h); return n === a || n.startsWith(a); }));

  let dateI = findH(DATE);
  let descI = (() => {
    for (const a of DESC_PRIORITY) {
      const i = columns.findIndex((h, j) => usable(j) && norm(h).startsWith(a));
      if (i >= 0) return i;
    }
    return -1;
  })();
  let amtI = findH(AMOUNT);
  const inI = findH(MONEY_IN);
  const outI = findH(MONEY_OUT);

  if (!usable(dateI) || ratio(stats[dateI]?.date, stats[dateI]?.filled) < 0.5) {
    const di = stats.findIndex((s, i) => usable(i) && ratio(s.date, s.filled) >= 0.6);
    if (di >= 0) dateI = di;
  }
  const amtOk = (i) => usable(i) && stats[i]?.filled && ratio(stats[i].money, stats[i].filled) >= 0.5;
  if (!amtOk(amtI)) {
    let best = -1; let bestScore = 0.49;
    stats.forEach((s, i) => {
      if (!usable(i) || i === dateI || !s.filled) return;
      const sc = ratio(s.money, s.filled);
      if (sc > bestScore) { bestScore = sc; best = i; }
    });
    if (best >= 0) amtI = best;
  }
  const descOk = (i) => usable(i) && stats[i]?.filled && ratio(stats[i].num, stats[i].filled) < 0.5;
  if (!descOk(descI)) {
    let best = -1; let bestAvg = -1;
    stats.forEach((s, i) => {
      if (!usable(i) || i === dateI || i === amtI || !s.filled) return;
      if (ratio(s.num, s.filled) >= 0.5) return;
      const avg = s.textLen / s.filled;
      if (avg > bestAvg) { bestAvg = avg; best = i; }
    });
    if (best >= 0) descI = best;
  }

  return {
    dateI: usable(dateI) ? dateI : -1,
    descI: usable(descI) ? descI : -1,
    amtI: usable(amtI) ? amtI : -1,
    inI: usable(inI) ? inI : -1,
    outI: usable(outI) ? outI : -1,
  };
}

// Decide a kalkyl column type for EVERY visible column, so the whole file can be
// imported as-is (the user only ×-hides columns they don't want). The detected
// amount column becomes the table's amount (so totals work); other money columns
// become plain numbers, date-like → date, the rest → text.
export function classifyColumns(columns, rows, hidden = new Set()) {
  const roles = detectRoles(columns, rows, hidden);
  const N = Math.min(rows.length, 25);
  const moneyRatio = (ci) => {
    let f = 0; let m = 0;
    for (let i = 0; i < N; i += 1) {
      const v = rows[i]?.[ci];
      if (!String(v ?? '').trim()) continue;
      f += 1;
      if (isMoneyCell(v)) m += 1;
    }
    return f ? m / f : 0;
  };
  const out = [];
  columns.forEach((label, i) => {
    if (hidden.has(i)) return;
    let type = 'text';
    if (i === roles.amtI) type = 'amount';
    else if (i === roles.dateI) type = 'date';
    else if (moneyRatio(i) >= 0.6) type = 'number';
    out.push({ label: String(label || `#${i + 1}`), type, index: i });
  });
  return out;
}

// Read an uploaded bank export into the raw grid a column-mapping UI needs.
// Handles Swedish CSVs that come as `;`-separated Windows-1252 (åäö) by decoding
// the text and letting SheetJS sense the delimiter. Returns the detected header
// labels, all data rows, and a best-guess mapping of which column is what.
export async function readBankSheet(file) {
  const buf = await file.arrayBuffer();
  const isCsv = /\.csv$/i.test(file.name || '') || (file.type || '').includes('csv');
  let wb;
  if (isCsv) {
    let text = new TextDecoder('utf-8').decode(buf);
    // A replacement char means it wasn't UTF-8 → re-decode as Windows-1252.
    if (text.includes('�')) {
      try { text = new TextDecoder('windows-1252').decode(buf); } catch { /* keep utf-8 */ }
    }
    wb = XLSX.read(text, { type: 'string', cellDates: true });
  } else {
    wb = XLSX.read(buf, { type: 'array', cellDates: true });
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { columns: [], rows: [], guess: {} };
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  if (!aoa.length) return { columns: [], rows: [], guess: {} };

  // Header = first row that names a known column; else assume row 0 is the header.
  let headerIdx = aoa.findIndex(
    (row) => findCol(row, DESC) >= 0 || findCol(row, AMOUNT) >= 0
      || findCol(row, DATE) >= 0 || findCol(row, MONEY_IN) >= 0 || findCol(row, MONEY_OUT) >= 0,
  );
  if (headerIdx < 0) headerIdx = 0;
  const header = aoa[headerIdx] || [];
  const width = aoa.reduce((w, r) => Math.max(w, r.length), 0);
  const columns = Array.from({ length: width }, (_, i) => String(header[i] ?? '').trim() || `#${i + 1}`);
  const rows = aoa.slice(headerIdx + 1);

  return { columns, rows, guess: detectRoles(columns, rows) };
}

// Turn the raw rows + a user's column mapping into normalized import rows.
// mode 'single' = one signed amount column; mode 'inout' = separate money-in and
// money-out columns (amount = in − out). `expense:true` flips sign so a positive
// amount lands as a positive cost in an Expenses table.
export function buildBankRows(rows, mapping) {
  const { mode = 'single', dateI = -1, descI = -1, amtI = -1, inI = -1, outI = -1, expense = false } = mapping || {};
  const out = [];
  for (const r of rows || []) {
    const description = descI >= 0 ? String(r[descI] ?? '').trim() : '';
    const date = dateI >= 0 ? fmtSheetDate(r[dateI]) : '';
    let amount;
    if (mode === 'inout') {
      const cin = inI >= 0 ? (parseAmount(r[inI]) || 0) : 0;
      const cout = outI >= 0 ? (parseAmount(r[outI]) || 0) : 0;
      amount = cin - Math.abs(cout);
    } else {
      amount = amtI >= 0 ? parseAmount(r[amtI]) : null;
    }
    if (!description && (amount == null || amount === 0)) continue; // skip blanks
    if (expense && amount != null) amount = Math.abs(amount);
    out.push({ description, date, amount: amount == null ? null : amount });
  }
  return out;
}
