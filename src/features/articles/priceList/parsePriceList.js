import * as XLSX from '@e965/xlsx';
import { parseAmount } from '@/src/features/projektkalkyl/excelImport';

// Header aliases seen in Swedish grossist price files (Ahlsell, Dahl, Rexel,
// Sonepar, Beijer, Bevego…). Matched by equality or prefix, case-insensitive.
const NUMBER = ['artikelnummer', 'artikelnr', 'art.nr', 'art nr', 'artnr', 'rsk-nr', 'rsk nr', 'rsknr', 'rsk', 'e-nr', 'e-nummer', 'enr', 'enummer', 'varunummer', 'varunr', 'article number', 'item number', 'sku'];
const NAME = ['benämning', 'benamning', 'artikelbenämning', 'artikelbenamning', 'beskrivning', 'artikeltext', 'text', 'namn', 'description', 'name'];
const UNIT = ['enhet', 'säljenhet', 'saljenhet', 'unit', 'förp', 'forp'];
const NET = ['nettopris', 'netto', 'ditt pris', 'ert pris', 'kundpris', 'net price', 'net'];
const GROSS = ['bruttopris', 'listpris', 'brutto', 'á-pris', 'a-pris', 'pris', 'price', 'list price'];
const DISCOUNT = ['rabatt', 'rabatt %', 'rabatt%', 'discount'];

const norm = (v) => String(v ?? '').trim().toLowerCase();
const findCol = (row, aliases) => row.findIndex((h) => {
  const n = norm(h);
  return n && aliases.some((a) => n === a || n.startsWith(a));
});

// Turns the sheet rows into [{ articleNumber, name, unit, purchasePrice }].
// Net price wins; otherwise gross price minus the discount column.
export function rowsFromSheet(aoa) {
  const headerIdx = aoa.findIndex((row) => findCol(row, NUMBER) >= 0 && (findCol(row, NET) >= 0 || findCol(row, GROSS) >= 0));
  if (headerIdx < 0) return { rows: [], error: 'no-header' };
  const h = aoa[headerIdx];
  const numI = findCol(h, NUMBER);
  const nameI = findCol(h, NAME);
  const unitI = findCol(h, UNIT);
  const netI = findCol(h, NET);
  const grossI = findCol(h, GROSS);
  const discI = findCol(h, DISCOUNT);

  const rows = [];
  for (let i = headerIdx + 1; i < aoa.length; i += 1) {
    const r = aoa[i];
    const articleNumber = String(r[numI] ?? '').trim();
    if (!articleNumber) continue;
    let price = netI >= 0 ? parseAmount(r[netI]) : null;
    if (price == null && grossI >= 0) {
      const gross = parseAmount(r[grossI]);
      const disc = discI >= 0 ? parseAmount(String(r[discI]).replace('%', '')) || 0 : 0;
      price = gross == null ? null : gross * (1 - disc / 100);
    }
    if (price == null) continue;
    rows.push({
      articleNumber,
      name: nameI >= 0 ? String(r[nameI] ?? '').trim() : '',
      unit: unitI >= 0 ? String(r[unitI] ?? '').trim() : '',
      purchasePrice: Math.round(price * 100) / 100,
    });
  }
  return { rows, error: rows.length ? null : 'no-rows' };
}

export async function parsePriceList(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], error: 'no-rows' };
  return rowsFromSheet(XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' }));
}
