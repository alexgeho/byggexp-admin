import * as XLSX from '@e965/xlsx';

// Fuzzy header aliases (sv / en / ru) so a user's own Excel maps to our columns.
const DESC = ['beskrivning', 'benämning', 'benamning', 'description', 'text', 'artikel', 'vad', 'наименование', 'название', 'описание'];
const DATE = ['datum', 'date', 'дата'];
const AMOUNT = ['belopp', 'summa', 'sum', 'amount', 'pris', 'kostnad', 'сумма', 'стоимость', 'цена'];

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

const parseAmount = (v) => {
  if (typeof v === 'number') return v;
  const n = Number(String(v ?? '').replace(/\s/g, '').replace(/kr|sek/gi, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const findCol = (headerRow, aliases) =>
  headerRow.findIndex((h) => aliases.includes(norm(h)));

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
