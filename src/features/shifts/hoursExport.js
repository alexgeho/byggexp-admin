// Excel / PDF / CSV export for the Hours grid. The heavy libraries (exceljs,
// jspdf) are lazy-imported inside each handler so they never touch the main
// bundle — they load only when the user actually exports.
//
// A "dataset" is: { fileBase, title, subtitle, headers:[string],
//   rows:[{ name, cells:[number|null], total:number }], totalRow:{ name, cells, total } }.
// Day cells carry raw numbers so xlsx stays summable; csv/pdf format them to
// sv-SE decimals here.

import { uniqueSheetName } from '@/src/features/shifts/hoursByProject';

const svNum = (n) => (n == null || n === '' ? '' : String(Math.round(n * 100) / 100).replace('.', ','));

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Build the Week-band row (["", "Week 29", "", …, ""]) aligned to the full
// column layout: one lead cell (Employee), one per day, one trailing (Total).
function weekBandCells(weekBands) {
  const cells = [''];
  weekBands.forEach((b) => { cells.push(b.label); for (let i = 1; i < b.span; i += 1) cells.push(''); });
  cells.push('');
  return cells;
}

export function exportHoursCsv({ fileBase, headers, weekBands, rows, totalRow }) {
  const line = (arr) => arr.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
  const lines = [];
  if (weekBands?.length) lines.push(line(weekBandCells(weekBands)));
  lines.push(line(headers));
  rows.forEach((r) => lines.push(line([r.name, ...r.cells.map(svNum), svNum(r.total)])));
  if (totalRow) lines.push(line([totalRow.name, ...totalRow.cells.map(svNum), svNum(totalRow.total)]));
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${fileBase}.csv`);
}

export async function exportHoursXlsx({ fileBase, title, subtitle, headers, weekBands, rows, totalRow }) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hours');

  ws.addRow([title]).font = { bold: true, size: 13 };
  if (subtitle) ws.addRow([subtitle]).font = { color: { argb: 'FF64748B' }, size: 10 };
  ws.addRow([]);

  // Week-band row above the day-number header, merged per week (col 1 = name).
  if (weekBands?.length) {
    const wkRow = ws.addRow([]);
    let col = 2;
    weekBands.forEach((b) => {
      const cell = ws.getCell(wkRow.number, col);
      cell.value = b.label;
      cell.font = { bold: true, color: { argb: 'FF334155' } };
      cell.alignment = { horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FA' } };
      if (b.span > 1) ws.mergeCells(wkRow.number, col, wkRow.number, col + b.span - 1);
      col += b.span;
    });
  }

  const head = ws.addRow(headers);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2683F9' } };
    cell.alignment = { horizontal: 'center' };
  });

  rows.forEach((r) => {
    const row = ws.addRow([r.name, ...r.cells.map((c) => (c == null ? null : c)), r.total]);
    row.eachCell((cell, col) => { if (col > 1) cell.alignment = { horizontal: 'center' }; });
  });

  if (totalRow) {
    const tr = ws.addRow([totalRow.name, ...totalRow.cells.map((c) => (c == null ? null : c)), totalRow.total]);
    tr.font = { bold: true };
    tr.eachCell((cell, col) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FA' } };
      if (col > 1) cell.alignment = { horizontal: 'center' };
    });
  }

  // Name column wide, day columns narrow, last column sized to fit its header.
  const last = headers.length;
  ws.columns.forEach((col, i) => { col.width = i === 0 ? 26 : (i === last - 1 ? Math.max(14, headers[last - 1].length + 2) : 7); });

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${fileBase}.xlsx`,
  );
}

// One workbook for the whole period: a Summary sheet (employee × project
// totals) plus one sheet per employee with that person's projects as rows and
// the days as columns — so a monthly report per worker no longer needs one
// export per project. `employees` comes from buildWorkerProjectBreakdown.
export async function exportHoursByEmployeeXlsx({
  fileBase, title, subtitle, dayHeaders, weekBands, employees, labels,
}) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const usedNames = new Set();
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2683F9' } };
  const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FA' } };

  const addTitle = (ws, text) => {
    ws.addRow([text]).font = { bold: true, size: 13 };
    if (subtitle) ws.addRow([subtitle]).font = { color: { argb: 'FF64748B' }, size: 10 };
    ws.addRow([]);
  };
  const styleHead = (row) => {
    row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.eachCell((cell) => { cell.fill = headFill; cell.alignment = { horizontal: 'center' }; });
  };
  const styleTotal = (row) => {
    row.font = { bold: true };
    row.eachCell((cell, col) => {
      cell.fill = totalFill;
      if (col > 1) cell.alignment = { horizontal: 'center' };
    });
  };

  // --- Summary: one row per employee+project, a subtotal per employee. ---
  const summary = wb.addWorksheet(uniqueSheetName(labels.summary, usedNames));
  addTitle(summary, title);
  styleHead(summary.addRow([labels.employee, labels.project, labels.total]));
  employees.forEach((emp) => {
    emp.rows.forEach((r) => {
      summary.addRow([emp.name, r.name, r.total]).getCell(3).alignment = { horizontal: 'center' };
    });
    styleTotal(summary.addRow([emp.name, labels.total, emp.total]));
  });
  const grandTotal = Math.round(employees.reduce((s, e) => s + (e.total || 0), 0) * 100) / 100;
  styleTotal(summary.addRow([labels.grandTotal, '', grandTotal]));
  summary.columns = [{ width: 28 }, { width: 44 }, { width: 14 }];

  // --- One sheet per employee: projects × days. ---
  employees.forEach((emp) => {
    const ws = wb.addWorksheet(uniqueSheetName(emp.name, usedNames));
    addTitle(ws, `${emp.name} · ${title}`);

    if (weekBands?.length) {
      const wkRow = ws.addRow([]);
      let col = 2;
      weekBands.forEach((b) => {
        const cell = ws.getCell(wkRow.number, col);
        cell.value = b.label;
        cell.font = { bold: true, color: { argb: 'FF334155' } };
        cell.alignment = { horizontal: 'center' };
        cell.fill = totalFill;
        if (b.span > 1) ws.mergeCells(wkRow.number, col, wkRow.number, col + b.span - 1);
        col += b.span;
      });
    }

    styleHead(ws.addRow([labels.project, ...dayHeaders, labels.total]));
    emp.rows.forEach((r) => {
      const row = ws.addRow([r.name, ...r.cells, r.total]);
      row.eachCell((cell, col) => { if (col > 1) cell.alignment = { horizontal: 'center' }; });
    });
    styleTotal(ws.addRow([labels.dailyTotal, ...emp.dailyTotals.map((v) => v || null), emp.total]));

    ws.columns.forEach((col, i) => {
      col.width = i === 0 ? 40 : (i === dayHeaders.length + 1 ? 14 : 7);
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${fileBase}.xlsx`,
  );
}

// jsPDF's built-in Helvetica only covers WinAnsi, so glyphs like − (U+2212) and
// ≥ (U+2265) render as garbage. Swap them for ASCII equivalents.
const pdfSafe = (s) => String(s ?? '')
  .replace(/[−–—]/g, '-')
  .replace(/≥/g, '>=')
  .replace(/≤/g, '<=');

export async function exportHoursPdf({ fileBase, title, subtitle, headers, weekBands, rows, totalRow }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(13);
  doc.text(pdfSafe(title), 14, 14);
  let startY = 20;
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(pdfSafe(subtitle), 14, 19);
    doc.setTextColor(0);
    startY = 24;
  }

  // Week-band row spanning its days, sitting above the day-number header.
  const bandStyle = { fillColor: [240, 244, 250], textColor: 20, fontStyle: 'bold', halign: 'center' };
  const weekHead = weekBands?.length
    ? [{ content: '', styles: bandStyle }, ...weekBands.map((b) => ({ content: pdfSafe(b.label), colSpan: b.span, styles: bandStyle })), { content: '', styles: bandStyle }]
    : null;

  autoTable(doc, {
    head: weekHead ? [weekHead, headers.map(pdfSafe)] : [headers.map(pdfSafe)],
    body: rows.map((r) => [pdfSafe(r.name), ...r.cells.map(svNum), svNum(r.total)]),
    foot: totalRow ? [[pdfSafe(totalRow.name), ...totalRow.cells.map(svNum), svNum(totalRow.total)]] : undefined,
    startY,
    styles: { fontSize: 9, cellPadding: 1.6, halign: 'center', overflow: 'linebreak' },
    headStyles: { fillColor: [38, 131, 249], textColor: 255, halign: 'center' },
    footStyles: { fillColor: [240, 244, 250], textColor: 20, fontStyle: 'bold' },
    columnStyles: { 0: { halign: 'left', cellWidth: 34 } },
    theme: 'grid',
  });

  doc.save(`${fileBase}.pdf`);
}
