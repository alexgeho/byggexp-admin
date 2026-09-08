import * as XLSX from '@e965/xlsx';
import { tableTotals, sideTotals } from '@/src/features/projektkalkyl/kalkylModel';

// Export the whole calculation board to an .xlsx file (triggers a download).
export function exportKalkylToExcel(calc, t) {
  const tables = calc.tables || [];
  const aoa = [];

  const amtIdxOf = (tb) => {
    const i = tb.columns.findIndex((c) => c.type === 'amount');
    return i < 0 ? tb.columns.length : i;
  };

  const pushTable = (tb) => {
    aoa.push([tb.title || '']);
    aoa.push(tb.columns.map((c) => c.label));
    for (const r of tb.rows || []) {
      aoa.push(tb.columns.map((c) => (c.type === 'amount'
        ? (Number(r?.cells?.[c.id]) || 0)
        : (r?.cells?.[c.id] || ''))));
    }
    const tt = tableTotals(tb);
    const sub = [];
    sub[0] = t('Subtotal');
    sub[amtIdxOf(tb)] = tt.brutto;
    aoa.push(sub);
    aoa.push([]);
  };

  aoa.push([`=== ${t('Income')} ===`]);
  tables.filter((x) => x.side === 'income').forEach(pushTable);
  const inc = sideTotals(tables, 'income');
  aoa.push([`TOTAL ${t('Income')}`, '', inc.brutto]);
  aoa.push([]);

  aoa.push([`=== ${t('Expenses')} ===`]);
  tables.filter((x) => x.side === 'expense').forEach(pushTable);
  const exp = sideTotals(tables, 'expense');
  aoa.push([`TOTAL ${t('Expenses')}`, '', exp.brutto]);
  aoa.push([]);

  aoa.push([t('Profit'), '', inc.brutto - exp.brutto]);
  if (calc.note) { aoa.push([]); aoa.push([t('Note'), calc.note]); }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Projektkalkyl');
  const safe = (calc.name || 'projektkalkyl').replace(/[^\w\-åäöÅÄÖ]+/g, '_');
  XLSX.writeFile(wb, `${safe}.xlsx`);
}
