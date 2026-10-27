import * as XLSX from '@e965/xlsx';
import { parseAmount } from '@/src/features/projektkalkyl/excelImport';

// Header aliases seen in Swedish grossist price files (Ahlsell, Dahl, Rexel,
// Sonepar, Beijer, Bevego, Lundagrossisten…). Earlier aliases win when a file
// has several matching columns (the grossist's own number before E-nr/RSK, so
// orders use the number the grossist knows). Aliases of ≤ 4 letters match the
// whole header only ("pris" must not catch "Prisenhet"); longer ones also match
// as a prefix ("Nettopris SEK").
const NUMBER = [
  // Lundagrossisten "Mitt Lunda → Prisfiler" (Styck / Nettopris / Koppar)
  'lunda artikelnr', 'lunda art.nr', 'lunda art nr', 'lundanummer', 'lundanr', 'lunda nr',
  'artikelnummer', 'artikelnr', 'art.nr', 'art nr', 'artnr', 'art.nummer',
  'leverantörens artikelnr', 'lev artikelnr', 'lev.art.nr',
  'e-nummer', 'e-nr', 'enummer', 'enr', 'rsk-nr', 'rsk nr', 'rsknr', 'rsk-nummer', 'rsk',
  'varunummer', 'varunr', 'article number', 'item number', 'sku',
];
const NAME = ['benämning', 'benamning', 'artikelbenämning', 'artikelbenamning', 'beskrivning', 'artikeltext', 'varubenämning', 'text', 'namn', 'description', 'name'];
const UNIT = ['enhet', 'säljenhet', 'saljenhet', 'prisenhet', 'unit', 'förp', 'forp'];
const NET = ['nettopris', 'nettopr', 'nto-pris', 'ntopris', 'nto pris', 'netto', 'ditt pris', 'ert pris', 'kundpris', 'net price', 'nto', 'net'];
const GROSS = ['bruttopris', 'styckpris', 'st-pris', 'stpris', 'listpris', 'grundpris', 'brutto', 'á-pris', 'a-pris', 'pris', 'price', 'list price'];
const DISCOUNT = ['rabattsats', 'rabatt %', 'rabatt%', 'rabatt', 'discount'];
// Rabattgrupp: the key of the company's rabattbrev at this grossist.
const DISCOUNT_GROUP = ['rabattgrupp', 'rabattgr', 'rabatt grupp', 'rabattkod', 'rabattkategori', 'discount group'];

const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const matches = (n, a) => n === a || (a.length > 4 && n.startsWith(a));
const findCol = (row, aliases, skip = []) => {
  const headers = row.map(norm);
  for (const a of aliases) {
    const i = headers.findIndex((n, idx) => n && !skip.includes(idx) && matches(n, a));
    if (i >= 0) return i;
  }
  return -1;
};
// Prices given in öre ("Nettopris (öre)", files "utan komma") → kronor.
const inOre = (header) => /öre|ore\b/.test(norm(header));

// Turns the sheet rows into [{ articleNumber, name, unit, purchasePrice,
// discountGroup }]. Net price wins; otherwise gross price minus the discount
// column. The rabattgrupp is kept only for a plain list price — a file that
// already carries the company's discount must not get the rabattbrev twice.
export function rowsFromSheet(aoa) {
  const headerIdx = aoa.findIndex((row) => findCol(row, NUMBER) >= 0 && (findCol(row, NET) >= 0 || findCol(row, GROSS) >= 0));
  if (headerIdx < 0) return { rows: [], error: 'no-header' };
  const h = aoa[headerIdx];
  const numI = findCol(h, NUMBER);
  const nameI = findCol(h, NAME);
  const unitI = findCol(h, UNIT);
  const netI = findCol(h, NET);
  const grossI = findCol(h, GROSS, [netI]);
  const groupI = findCol(h, DISCOUNT_GROUP);
  const discI = findCol(h, DISCOUNT, [groupI]);
  const netScale = netI >= 0 && inOre(h[netI]) ? 0.01 : 1;
  const grossScale = grossI >= 0 && inOre(h[grossI]) ? 0.01 : 1;

  const rows = [];
  for (let i = headerIdx + 1; i < aoa.length; i += 1) {
    const r = aoa[i];
    const articleNumber = String(r[numI] ?? '').trim();
    if (!articleNumber) continue;
    let price = netI >= 0 ? parseAmount(r[netI]) : null;
    if (price != null) price *= netScale;
    const listPriced = price == null && discI < 0;
    if (price == null && grossI >= 0) {
      const raw = parseAmount(r[grossI]);
      const gross = raw == null ? null : raw * grossScale;
      const disc = discI >= 0 ? parseAmount(String(r[discI]).replace('%', '')) || 0 : 0;
      price = gross == null ? null : gross * (1 - disc / 100);
    }
    if (price == null) continue;
    rows.push({
      articleNumber,
      name: nameI >= 0 ? String(r[nameI] ?? '').trim() : '',
      unit: unitI >= 0 ? String(r[unitI] ?? '').trim() : '',
      purchasePrice: Math.round(price * 100) / 100,
      ...(listPriced && groupI >= 0 && String(r[groupI] ?? '').trim()
        ? { discountGroup: String(r[groupI]).trim() } : {}),
    });
  }
  return { rows, error: rows.length ? null : 'no-rows' };
}

// Grossist text exports (.csv/.txt) are often semicolon- or tab-separated and
// Windows-1252 encoded; SheetJS guesses both badly, so split them ourselves.
export function decodeText(buf) {
  const utf8 = new TextDecoder('utf-8').decode(buf);
  const text = utf8.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(buf) : utf8;
  return text.replace(/^\uFEFF/, '');
}

export function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 20);
  let best = ',';
  let bestScore = 0;
  for (const d of [';', '\t', '|', ',']) {
    const counts = sample.map((l) => l.split(d).length - 1);
    // Prefer a separator that appears on most lines (header + data agree).
    const score = counts.filter((c) => c > 0).length * 100 + Math.min(...counts);
    if (score > bestScore) { best = d; bestScore = score; }
  }
  return best;
}

export function splitDelimited(text, delimiter = detectDelimiter(text)) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === delimiter) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell.trim());
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some((v) => v !== '')) rows.push(row);
  return rows;
}

export async function parsePriceList(file) {
  const aoa = await readSheet(file);
  return aoa.length ? rowsFromSheet(aoa) : { rows: [], error: 'no-rows' };
}

const PERCENT = ['rabatt %', 'rabatt%', 'rabattsats', 'rabatt', 'procent', 'discount', '%'];

// Rabattbrev (Excel/CSV): rabattgrupp + rabatt % → [{ group, percent }].
// "35", "35 %", "35,5" and 0.35 (a fraction) all read as percent.
export function discountsFromSheet(aoa) {
  const headerIdx = aoa.findIndex((row) => {
    const g = findCol(row, DISCOUNT_GROUP);
    return g >= 0 && findCol(row, PERCENT, [g]) >= 0;
  });
  if (headerIdx < 0) return { rows: [], error: 'no-header' };
  const h = aoa[headerIdx];
  const groupI = findCol(h, DISCOUNT_GROUP);
  const pctI = findCol(h, PERCENT, [groupI]);
  const byGroup = new Map();
  for (const r of aoa.slice(headerIdx + 1)) {
    const group = String(r[groupI] ?? '').trim();
    const raw = parseAmount(String(r[pctI] ?? '').replace('%', ''));
    if (!group || raw == null) continue;
    const percent = raw > 0 && raw < 1 ? raw * 100 : raw;
    if (percent < 0 || percent > 100) continue;
    byGroup.set(group, Math.round(percent * 100) / 100);
  }
  const rows = [...byGroup].map(([group, percent]) => ({ group, percent }));
  return { rows, error: rows.length ? null : 'no-rows' };
}

async function readSheet(file) {
  const buf = await file.arrayBuffer();
  if (/\.(csv|txt|tsv|prn)$/i.test(file.name || '')) return splitDelimited(decodeText(buf));
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return ws ? XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' }) : [];
}

export async function parseDiscountLetter(file) {
  return discountsFromSheet(await readSheet(file));
}
