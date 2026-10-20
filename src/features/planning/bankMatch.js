// Bank-statement reconciliation: find which unpaid supplier invoices a bank
// export already shows as paid, so they can be marked "Betald" with the real
// payment date in one go. Pure, so it is unit-testable.
import { detectRoles, buildBankRows } from '@/src/features/projektkalkyl/excelImport';
import { cleanOcr } from '@/src/features/planning/planningUtils';

const DAY_MS = 86400000;
const AMOUNT_TOLERANCE = 1; // öresavrundning

// Outgoing bank lines ({ date, description, amount<0 }) from a raw sheet.
export const bankPayments = (columns, rows) => {
  const roles = detectRoles(columns, rows);
  const mode = roles.amtI < 0 && (roles.inI >= 0 || roles.outI >= 0) ? 'inout' : 'single';
  return buildBankRows(rows, { mode, ...roles })
    .filter((r) => r.amount != null && r.amount < 0);
};

const words = (name) => String(name || '').toLowerCase()
  .replace(/\b(ab|aktiebolag|hb|kb|i sverige|sverige|sweden)\b/g, ' ')
  .split(/[^a-zåäö0-9]+/).filter((w) => w.length >= 3);

// How sure we are a bank line pays this invoice: 3 = OCR in the text,
// 2 = supplier name in the text, 1 = amount only. 0 = not this invoice.
const score = (line, inv) => {
  if (Math.abs(Math.abs(line.amount) - Number(inv.total || 0)) > AMOUNT_TOLERANCE) return 0;
  const text = String(line.description || '').toLowerCase();
  const ocr = cleanOcr(inv.ocr);
  if (ocr.length >= 4 && text.replace(/[^0-9]/g, '').includes(ocr)) return 3;
  if (words(inv.supplierName).some((w) => text.includes(w))) return 2;
  // Amount alone only counts near the due date (−30…+45 days).
  const paid = new Date(line.date).getTime();
  const due = new Date(inv.dueDate || inv.invoiceDate || '').getTime();
  if (Number.isNaN(paid) || Number.isNaN(due)) return 0;
  const diff = (paid - due) / DAY_MS;
  return diff >= -30 && diff <= 45 ? 1 : 0;
};

// [{ invoice, line, sure }] — each invoice and each bank line used once,
// strongest evidence first. `sure` = matched by OCR or supplier name.
export const matchBankPayments = (lines, invoices) => {
  const candidates = [];
  (lines || []).forEach((line, li) => {
    (invoices || []).forEach((invoice, ii) => {
      if (String(invoice?.status || '') === 'paid' || invoice?._manual || invoice?._missing) return;
      if (!(Number(invoice?.total) > 0)) return;
      const s = score(line, invoice);
      if (s) candidates.push({ li, ii, s });
    });
  });
  candidates.sort((a, b) => b.s - a.s);
  const usedLines = new Set();
  const usedInvoices = new Set();
  const result = [];
  candidates.forEach(({ li, ii, s }) => {
    if (usedLines.has(li) || usedInvoices.has(ii)) return;
    usedLines.add(li);
    usedInvoices.add(ii);
    result.push({ invoice: invoices[ii], line: lines[li], sure: s >= 2 });
  });
  return result.sort((a, b) => String(a.line.date).localeCompare(String(b.line.date)));
};
