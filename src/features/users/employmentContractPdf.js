// Anställningsavtal (employment contract) as a two-page A4 PDF, drawn with
// jsPDF from the values of the contract modal. The document is Swedish (it is
// a Swedish legal document), whatever the admin's UI language is.

// jsPDF's built-in font has no typographic dashes.
const pdfSafe = (s) => String(s ?? '').replace(/[−–—]/g, '-');

const PAGE_W = 210;
const MARGIN = 18;
const INNER_W = PAGE_W - MARGIN * 2;
const ROW_H = 11;


function titleBar(doc, page) {
  doc.setFillColor(15, 15, 15);
  doc.rect(MARGIN, 14, INNER_W, 11, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('ANSTÄLLNINGSAVTAL', MARGIN + 3, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Sida ${page} (2)`, MARGIN + INNER_W - 3, 21.5, { align: 'right' });
  doc.setTextColor(20, 20, 20);
}

function heading(doc, y, text) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(text, MARGIN, y);
  return y + 3;
}

// rows: [[{ label, value, w }]] — w is the share of the row width (sums to 1).
function fieldBox(doc, y, rows, rowHeights = []) {
  const heights = rows.map((_, i) => rowHeights[i] || ROW_H);
  const total = heights.reduce((a, b) => a + b, 0);
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, INNER_W, total, 1.5, 1.5);
  let top = y;
  rows.forEach((row, ri) => {
    const h = heights[ri];
    if (ri > 0) doc.line(MARGIN, top, MARGIN + INNER_W, top);
    let x = MARGIN;
    row.forEach((cell, ci) => {
      const w = INNER_W * cell.w;
      if (ci > 0) doc.line(x, top, x, top + h);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(cell.label, x + 1.5, top + 3);
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(pdfSafe(cell.value), w - 3);
      doc.text(lines, x + 1.5, top + 8.2);
      x += w;
    });
    top += h;
  });
  return y + total;
}

function checkbox(doc, x, y, checked) {
  doc.setLineWidth(0.3);
  doc.rect(x, y - 3.4, 4, 4);
  if (checked) {
    doc.line(x + 0.6, y - 2.8, x + 3.4, y);
    doc.line(x + 3.4, y - 2.8, x + 0.6, y);
  }
}

// One checkbox line: "[x] text ____value____".
function checkLine(doc, x, y, checked, text, value, lineTo) {
  checkbox(doc, x, y, checked);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(text, x + 6, y);
  if (lineTo) {
    const from = x + 6 + doc.getTextWidth(text) + 1.5;
    doc.setLineWidth(0.2);
    doc.line(from, y + 0.6, lineTo, y + 0.6);
    if (value) {
      doc.setFontSize(10.5);
      doc.text(pdfSafe(value), from + 1, y - 0.2);
    }
  }
}

function signature(doc, x, y, w, title, placeDate, name, image = null) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Datum och ort', x, y + 5);
  doc.setFontSize(11);
  doc.text(pdfSafe(placeDate), x, y + 10);
  // The company's uploaded signature scan sits on the signature line.
  if (image) {
    try {
      const props = doc.getImageProperties(image);
      const maxW = Math.min(w, 60);
      const maxH = 13;
      const scale = Math.min(maxW / props.width, maxH / props.height);
      const iw = props.width * scale;
      const ih = props.height * scale;
      doc.addImage(image, props.fileType || 'PNG', x, y + 25.5 - ih, iw, ih);
    } catch { /* unreadable image: leave the line empty for a pen */ }
  }
  doc.setLineDashPattern([0.4, 0.6], 0);
  doc.setLineWidth(0.2);
  doc.line(x, y + 26, x + w, y + 26);
  doc.line(x, y + 34, x + w, y + 34);
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6.5);
  doc.text('Underskrift', x, y + 28.5);
  doc.text('Namnförtydligande', x, y + 36.5);
  doc.setFontSize(11);
  doc.text(pdfSafe(name), x, y + 32.8);
}

// Swedish salary line from the worker's hourly rate: "216,34 kr/t brutto".
const salaryFrom = (rate) => {
  const n = Number(rate);
  return n > 0 ? `${String(Math.round(n * 100) / 100).replace('.', ',')} kr/t brutto` : '';
};

const isoToday = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// The contract filled from the company card and the worker card (owner 19.11:
// no window in between — download or mail straight from the staff list).
export function contractValues({ company, worker, signer }) {
  const today = isoToday();
  // The company card keeps "168 32 Bromma" in one field — split it.
  const cityLine = String(company?.city || '').trim();
  const postal = cityLine.match(/^(\d{3}\s?\d{2})\s+(.*)$/);
  const city = postal ? postal[2] : cityLine;
  const placeDate = [city, today].filter(Boolean).join(' ');
  return {
    employerName: company?.name || '',
    employerOrgNumber: company?.orgNumber || '',
    employerAddress: String(company?.address || '').trim().replace(/,$/, ''),
    employerPostalCode: postal ? postal[1] : (company?.postalCode || ''),
    employerCity: city,
    employerPhone: company?.phone || '',
    employeeName: worker?.name || '',
    employeePersonalNumber: worker?.personalNumber || '',
    employeeAddress: worker?.address || '',
    employeePostalCode: worker?.postalCode || '',
    employeeCity: worker?.city || '',
    employeePhone: worker?.phone || '',
    position: worker?.profession || '',
    workplace: city,
    duties: '',
    startDate: today,
    hoursPerWeek: '40',
    vacationDays: '25',
    salary: salaryFrom(worker?.hourlyRate),
    payday: '25:e',
    benefits: '',
    collectiveAgreement: false,
    employmentForm: 'prov',
    probationUntil: '',
    workingTime: 'heltid',
    overtime: 'kollektivavtal',
    otherTerms: '',
    employerPlaceDate: placeDate,
    employerSigner: signer || '',
    employeePlaceDate: placeDate,
  };
}

export const contractFileName = (worker) =>
  `anstallningsavtal-${String(worker?.name || 'arbetstagare').trim().replace(/\s+/g, '-')}.pdf`;

async function renderEmploymentContract(v, employerSignature = null) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // ---- Page 1 ----
  titleBar(doc, 1);
  let y = heading(doc, 36, '1 Arbetsgivare');
  y = fieldBox(doc, y, [
    [{ label: 'Firma', value: v.employerName, w: 1 }],
    [{ label: 'Adress', value: v.employerAddress, w: 0.75 }, { label: 'Organisationsnummer', value: v.employerOrgNumber, w: 0.25 }],
    [{ label: 'Postnummer', value: v.employerPostalCode, w: 0.18 }, { label: 'Ort', value: v.employerCity, w: 0.57 }, { label: 'Telefonnummer', value: v.employerPhone, w: 0.25 }],
  ]);

  y = heading(doc, y + 9, '2 Arbetstagare');
  y = fieldBox(doc, y, [
    [{ label: 'Namn', value: v.employeeName, w: 1 }],
    [{ label: 'Adress', value: v.employeeAddress, w: 0.75 }, { label: 'Personnummer', value: v.employeePersonalNumber, w: 0.25 }],
    [{ label: 'Postnummer', value: v.employeePostalCode, w: 0.18 }, { label: 'Ort', value: v.employeeCity, w: 0.57 }, { label: 'Telefonnummer', value: v.employeePhone, w: 0.25 }],
  ]);

  y = heading(doc, y + 9, '3 Uppgifter om anställning');
  y = fieldBox(doc, y, [
    [{ label: 'Befattning', value: v.position, w: 0.5 }, { label: 'Arbetsplats', value: v.workplace, w: 0.5 }],
    [{ label: 'Arbetsuppgifter', value: v.duties, w: 1 }],
    [{ label: 'Tillträdesdag', value: v.startDate, w: 0.34 }, { label: 'Antal timmar/vecka', value: v.hoursPerWeek, w: 0.34 }, { label: 'Antal semesterdagar/år', value: v.vacationDays, w: 0.32 }],
    [{ label: 'Lön', value: v.salary, w: 0.34 }, { label: 'Dag för utbetalning av lön', value: v.payday, w: 0.66 }],
    [{ label: 'Övriga förmåner', value: v.benefits, w: 1 }],
    [{ label: '', value: '', w: 1 }],
  ], [ROW_H, 17, ROW_H, ROW_H, ROW_H, 10]);
  checkLine(doc, MARGIN + 3, y - 3.5, Boolean(v.collectiveAgreement), 'Anställningen omfattas av kollektivavtal', v.collectiveAgreementName, MARGIN + INNER_W - 4);

  y = heading(doc, y + 9, '4 Anställningsform');
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, INNER_W, 24, 1.5, 1.5);
  const half = MARGIN + INNER_W / 2 + 2;
  checkLine(doc, MARGIN + 3, y + 7, v.employmentForm === 'tillsvidare', 'Tillsvidareanställning');
  checkLine(doc, half, y + 7, v.employmentForm === 'prov', 'Provanställning t o m', v.employmentForm === 'prov' ? v.probationUntil : '', MARGIN + INNER_W - 4);
  checkLine(doc, MARGIN + 3, y + 14, v.employmentForm === 'behov', 'Intermittent anställning ("behovsanställning")');
  checkLine(doc, half, y + 14, v.employmentForm === 'tidsbegransad', 'Tidsbegränsad anställning - Avtalat slutdatum', v.employmentForm === 'tidsbegransad' ? v.endDate : '', MARGIN + INNER_W - 4);
  checkLine(doc, MARGIN + 3, y + 21, v.employmentForm === 'annan', '', v.employmentForm === 'annan' ? v.employmentFormOther : '', MARGIN + INNER_W - 4);
  y += 24;

  y = heading(doc, y + 9, '5 Arbetstid');
  doc.roundedRect(MARGIN, y, INNER_W, 24, 1.5, 1.5);
  checkLine(doc, MARGIN + 3, y + 7, v.workingTime === 'heltid', 'Heltid, ange timmar per vecka', v.workingTime === 'heltid' ? v.hoursPerWeek : '', MARGIN + 95);
  checkLine(doc, MARGIN + 3, y + 14, v.workingTime === 'deltid', 'Deltid, ange timmar per vecka', v.workingTime === 'deltid' ? v.hoursPerWeek : '', MARGIN + 95);
  checkLine(doc, MARGIN + 3, y + 21, v.workingTime === 'varierande', 'Varierande arbetstid (exempelvis intermittent anställning, "behovsanställning" eller liknande)');

  // ---- Page 2 ----
  doc.addPage();
  titleBar(doc, 2);
  y = heading(doc, 36, '6 Övertidsersättning');
  doc.roundedRect(MARGIN, y, INNER_W, 26, 1.5, 1.5);
  checkLine(doc, MARGIN + 3, y + 7, v.overtime === 'kollektivavtal', 'Enligt vid tidpunkten gällande kollektivavtal.');
  checkLine(doc, MARGIN + 3, y + 14, v.overtime === 'sarskildKollektivavtal', 'Enligt särskild överenskommelse med stöd av kollektivavtalet.');
  checkLine(doc, MARGIN + 3, y + 21, v.overtime === 'sarskild', 'Enligt särskild överenskommelse som innebär:', v.overtime === 'sarskild' ? v.overtimeOther : '', MARGIN + INNER_W - 4);
  y += 26;

  y = heading(doc, y + 9, '7 Övriga villkor');
  doc.roundedRect(MARGIN, y, INNER_W, 30, 1.5, 1.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(doc.splitTextToSize(pdfSafe(v.otherTerms), INNER_W - 6), MARGIN + 3, y + 6);
  y += 30;

  const colW = (INNER_W - 14) / 2;
  signature(doc, MARGIN, y + 14, colW, 'Arbetsgivarens underskrift', v.employerPlaceDate, v.employerSigner, employerSignature);
  signature(doc, MARGIN + colW + 14, y + 14, colW, 'Arbetstagarens underskrift', v.employeePlaceDate, v.employeeName);

  return doc;
}

export async function downloadEmploymentContractPdf(values, fileName = 'anstallningsavtal.pdf', employerSignature = null) {
  const doc = await renderEmploymentContract(values, employerSignature);
  doc.save(fileName);
}

// Base64 of the PDF, for mailing it to the worker through the API.
export async function employmentContractBase64(values, employerSignature = null) {
  const doc = await renderEmploymentContract(values, employerSignature);
  return doc.output('datauristring').split(',')[1];
}
