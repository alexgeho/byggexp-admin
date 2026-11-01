import { describe, it, expect } from 'vitest';
import { offerToInvoicePrefill } from './offerToInvoice';

const offer = {
  offerNumber: 12,
  companyName: 'Kunde AS',
  items: [{ description: 'Rivning', quantity: 2, unit: 'st', price: 100, vatRate: 25 }],
};

describe('offerToInvoicePrefill reference', () => {
  it('uses «Tilbud <nr>» for Norwegian companies', () => {
    expect(offerToInvoicePrefill(offer, 'NO').orderReference).toBe('Tilbud 12');
  });

  it('keeps «Offert <nr>» for Swedish companies and when country is unknown', () => {
    expect(offerToInvoicePrefill(offer, 'SE').orderReference).toBe('Offert 12');
    expect(offerToInvoicePrefill(offer).orderReference).toBe('Offert 12');
  });

  it('localises the legacy single-line fallback too', () => {
    const legacy = { offerNumber: 7, priceText: '1 000 kr' };
    expect(offerToInvoicePrefill(legacy, 'NO').items[0].description).toBe('Tilbud 7');
    expect(offerToInvoicePrefill(legacy, 'SE').items[0].description).toBe('Offert 7');
  });

  it('copies the rows unchanged', () => {
    expect(offerToInvoicePrefill(offer, 'NO').items).toEqual([
      { description: 'Rivning', quantity: 2, unit: 'st', price: 100, discount: 0, vatRate: 25 },
    ]);
  });
});
