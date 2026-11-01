// Best-effort parse of an offer's free-text price ("125 000 kr exkl. moms",
// "1 250,50 kr") into a number; returns 0 when nothing numeric is found. Only
// used as a fallback for legacy offers that have no structured line items.
function parsePrice(text) {
  if (!text) return 0;
  const match = String(text).replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

// Build an invoice draft prefill from an offer. Offers carry a free-text
// customer (no linked client), so we map that to the customer fields. When the
// offer has structured line items we copy them straight across (accurate
// offer→invoice); otherwise we fall back to a single line from the old
// free-text price.
// country: the company's home market. Norwegian invoices are bokmål, so the
// reference reads «Tilbud <nr>» there; Sweden keeps «Offert <nr>».
export function offerToInvoicePrefill(offer, country) {
  const word = String(country || '').toUpperCase() === 'NO' ? 'Tilbud' : 'Offert';
  const orderReference = offer?.offerNumber ? `${word} ${offer.offerNumber}` : undefined;
  const customer = {
    companyName: offer?.companyName || undefined,
    email: offer?.email || undefined,
  };

  if (Array.isArray(offer?.items) && offer.items.length) {
    return {
      orderReference,
      customer,
      items: offer.items.map((item) => ({
        description: item?.description || '',
        quantity: Number(item?.quantity) || 1,
        unit: item?.unit || 'st',
        price: Number(item?.price) || 0,
        discount: Number(item?.discount) || 0,
        vatRate: item?.vatRate ?? 25,
      })),
    };
  }

  const description = [offer?.subtitle, offer?.description]
    .filter((part) => part && String(part).trim())
    .join('\n') || (offer?.offerNumber ? `${word} ${offer.offerNumber}` : word);

  return {
    orderReference,
    customer,
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
