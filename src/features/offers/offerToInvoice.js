// Best-effort parse of an offer's free-text price ("125 000 kr exkl. moms",
// "1 250,50 kr") into a number; returns 0 when nothing numeric is found.
function parsePrice(text) {
  if (!text) return 0;
  const match = String(text).replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

// Build an invoice draft prefill from an offer. Offers carry a free-text
// customer (no linked client) and a narrative body, so we map those to the
// customer fields and a single editable invoice line.
export function offerToInvoicePrefill(offer) {
  const description = [offer?.subtitle, offer?.description]
    .filter((part) => part && String(part).trim())
    .join('\n') || (offer?.offerNumber ? `Offert ${offer.offerNumber}` : 'Offert');

  return {
    orderReference: offer?.offerNumber ? `Offert ${offer.offerNumber}` : undefined,
    customer: {
      companyName: offer?.companyName || undefined,
      email: offer?.email || undefined,
    },
    items: [
      {
        description,
        quantity: 1,
        unit: 'st',
        price: parsePrice(offer?.priceText),
        vatRate: 25,
      },
    ],
  };
}
