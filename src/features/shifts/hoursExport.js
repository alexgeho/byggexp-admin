// Excel / PDF / CSV export for the Hours grid. The heavy libraries (exceljs,
// jspdf) are lazy-imported inside each handler so they never touch the main
// bundle — they load only when the user actually exports.
//
// A "dataset" is: { fileBase, title, subtitle, headers:[string],
//   rows:[{ name, cells:[number|null], total:number }], totalRow:{ name, cells, total } }.
// Day cells carry raw numbers so xlsx stays summable; csv/pdf format them to
// sv-SE decimals here.

const svNum = (n) => (n == null || n === '' ? '' : String(Math.round(n * 100) / 100).replace('.', ','));

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportHoursCsv({ fileBase, headers, rows, totalRow }) {
  const line = (arr) => arr.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
  const lines = [line(headers)];
  rows.forEach((r) => lines.push(line([r.name, ...r.cells.map(svNum), svNum(r.total)])));
  if (totalRow) lines.push(line([totalRow.name, ...totalRow.cells.map(svNum), svNum(totalRow.total)]));
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${fileBase}.csv`);
}

export async function exportHoursXlsx({ fileBase, title, subtitle, headers, rows, totalRow }) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hours');

  ws.addRow([title]).font = { bold: true, size: 13 };
  if (subtitle) ws.addRow([subtitle]).font = { color: { argb: 'FF64748B' }, size: 10 };
  ws.addRow([]);

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
    tr.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FA' } }; });
  }

  ws.columns.forEach((col, i) => { col.width = i === 0 ? 26 : 7; });

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${fileBase}.xlsx`,
  );
}

export async function exportHoursPdf({ fileBase, title, subtitle, headers, rows, totalRow }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(13);
  doc.text(title, 14, 14);
  let startY = 20;
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(subtitle, 14, 19);
    doc.setTextColor(0);
    startY = 24;
  }

  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => [r.name, ...r.cells.map(svNum), svNum(r.total)]),
    foot: totalRow ? [[totalRow.name, ...totalRow.cells.map(svNum), svNum(totalRow.total)]] : undefined,
    startY,
    styles: { fontSize: 7, cellPadding: 1.2, halign: 'center', overflow: 'linebreak' },
    headStyles: { fillColor: [38, 131, 249], textColor: 255, halign: 'center' },
    footStyles: { fillColor: [240, 244, 250], textColor: 20, fontStyle: 'bold' },
    columnStyles: { 0: { halign: 'left', cellWidth: 34 } },
    theme: 'grid',
  });

  doc.save(`${fileBase}.pdf`);
}
