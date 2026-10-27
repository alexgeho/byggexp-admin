// Purchase invoices → a draft customer invoice ("Fakturera"): one line per
// bill at its amount excl. VAT plus påslag. The ids go with the invoice so the
// backend stamps the bills as billed on.
const round2 = (n) => Math.round(n * 100) / 100;

export function rebillPrefill(rows = [], markupPercent = 0) {
  const factor = 1 + (Number(markupPercent) || 0) / 100;
  return {
    projectId: rows[0]?.projectId || undefined,
    supplierInvoiceIds: rows.map((r) => String(r._id)),
    items: rows.map((r) => ({
      description: [r.supplierName, r.invoiceNumber].filter(Boolean).join(' '),
      quantity: 1,
      unit: 'st',
      price: round2((Number(r.amountExclVat) || 0) * factor),
      vatRate: 25,
    })),
  };
}
