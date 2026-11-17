// Timesheet behind an invoice ("tidsunderlag"): who worked which day on the
// invoiced order — the table that used to be drawn by hand and sent with the
// invoice. Built from the same selection the invoice draft is made from.

const round2 = (n) => Math.round(n * 100) / 100;
const svNum = (n) => String(round2(n)).replace('.', ',');
const svMoney = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
// jsPDF's built-in font has no typographic dashes.
const pdfSafe = (s) => String(s ?? '').replace(/[−–—]/g, '-');

// rows: the selected workers; days: the selected day columns;
// hoursOf(worker, day) → billed hours of that cell (0/undefined = none).
export function buildTimesheet({ days, rows, hoursOf, groupLabel }) {
  const lines = rows
    .map((worker) => {
      const cells = days.map((day) => {
        const hours = round2(Number(hoursOf(worker, day)) || 0);
        return hours > 0 ? hours : null;
      });
      return { name: worker.name, cells, total: round2(cells.reduce((sum, h) => sum + (h || 0), 0)) };
    })
    .filter((line) => line.total > 0);
  return {
    groupLabel: groupLabel || '',
    days: days.map((day) => ({ date: day.date, wk: day.wk, we: !!day.we })),
    rows: lines,
    totalHours: round2(lines.reduce((sum, line) => sum + line.total, 0)),
  };
}

// Consecutive days of one ISO week → one band above them ("v43").
export function weekBands(days) {
  const bands = [];
  for (const day of days) {
    const last = bands[bands.length - 1];
    if (last && last.wk === day.wk) last.span += 1;
    else bands.push({ wk: day.wk, span: 1 });
  }
  return bands;
}

export async function downloadTimesheetPdf({
  timesheet,
  title, // top-left cell: the customer
  rate, // price per hour on the invoice line; 0 = leave the money rows out
  currencyLabel = 'kr',
  labels, // { week, totalHours, totalAmount, rate }
  fileBase = 'tidsunderlag',
}) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const { days, rows, groupLabel, totalHours } = timesheet;
  const cols = days.length + 1;
  const weekend = [238, 238, 238];
  const green = [217, 234, 211];
  const hasRate = Number(rate) > 0;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: days.length > 16 ? 'a3' : 'a4' });
  const head = [
    [
      { content: pdfSafe(title), rowSpan: 2, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 10 } },
      ...weekBands(days).map((band) => ({ content: `${labels.week}${band.wk}`, colSpan: band.span, styles: { halign: 'center', fontSize: 11 } })),
    ],
    days.map((day) => day.date.slice(2)),
  ];
  const dayCell = (value, day) => ({
    content: value == null ? '-' : svNum(value),
    styles: day.we ? { fillColor: weekend } : {},
  });
  const body = [
    [{ content: pdfSafe(groupLabel), colSpan: cols, styles: { fillColor: green, fontStyle: 'bold', halign: 'left' } }],
    ...rows.map((row) => [
      { content: pdfSafe(row.name), styles: { halign: 'left' } },
      ...row.cells.map((value, i) => dayCell(value, days[i])),
    ]),
  ];
  // Totals sit in the last two day columns, as on the hand-made sheet.
  const totalLine = (label, value) => {
    const labelSpan = Math.min(2, Math.max(1, cols - 1));
    const lead = cols - 1 - labelSpan;
    return [
      ...(lead > 0 ? [{ content: '', colSpan: lead }] : []),
      { content: label, colSpan: labelSpan, styles: { halign: 'right', fillColor: green } },
      { content: value, styles: { halign: 'right', fillColor: green } },
    ];
  };
  body.push(totalLine(`${labels.totalHours}:`, svNum(totalHours)));
  if (hasRate) body.push(totalLine(`${labels.totalAmount}:`, `${svMoney(totalHours * rate)} ${currencyLabel}`));

  autoTable(doc, {
    head,
    body,
    startY: 14,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 1.4, halign: 'center', textColor: 20, lineColor: [200, 200, 200], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: 20, fontStyle: 'normal' },
    columnStyles: { 0: { cellWidth: 46 } },
  });

  if (hasRate) {
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(`${labels.rate} ${svNum(rate)} ${currencyLabel}/h`, 14, doc.lastAutoTable.finalY + 5);
  }
  doc.save(`${fileBase}.pdf`);
}
