// Duplicate-invoice detection at capture — the single biggest control against
// paying the same supplier invoice twice. Best practice is to flag on
// supplier + amount + invoice number BEFORE the invoice is approved/posted, and
// let a human confirm (never auto-drop). All matching is fuzzy-tolerant on the
// supplier name and exact on the strong identifiers.
import { getEntityId, matchesEntityId } from '@/src/utils/entityId';

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const digits = (s) => String(s || '').replace(/\D/g, '');
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Returns the existing invoice that `candidate` most likely duplicates, or null.
// `ignoreId` skips a record (its own id, when re-checking an edit).
export const findDuplicateInvoice = (candidate, existing = [], ignoreId = null) => {
  const supplier = norm(candidate.supplierName);
  if (!supplier) return null;
  const invNo = norm(candidate.invoiceNumber);
  const total = round2(candidate.total ?? (Number(candidate.amountExclVat) || 0) + (Number(candidate.vat) || 0));
  const ocr = digits(candidate.ocr);

  for (const inv of existing) {
    if (ignoreId && matchesEntityId(inv, ignoreId)) continue;
    if (norm(inv.supplierName) !== supplier) continue;

    // Strong: same supplier + same invoice number.
    if (invNo && norm(inv.invoiceNumber) === invNo) return inv;
    // Strong: same supplier + same OCR reference.
    if (ocr && digits(inv.ocr) === ocr) return inv;
    // Fallback when no invoice number: same supplier + same amount + same date.
    if (!invNo && total > 0
      && round2(inv.total) === total
      && String(inv.invoiceDate || '') === String(candidate.invoiceDate || '')) {
      return inv;
    }
  }
  return null;
};

export const duplicateKey = (inv) => getEntityId(inv);
