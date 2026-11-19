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
      { articleNumber: '', description: 'Rivning', quantity: 2, unit: 'st', price: 100, discount: 0, vatRate: 25 },
    ]);
  });
});

describe('offerToInvoicePrefill customer', () => {
  it('carries every customer detail over to the invoice customer block', () => {
    const { customer } = offerToInvoicePrefill({
      offerNumber: 3,
      companyName: 'Kund AB',
      clientType: 'company',
      orgNumber: '556000-0000',
      contactPerson: 'Anna Berg',
      email: 'anna@kund.se',
      phone: '070-123 45 67',
      address: 'Storgatan 1',
      postalCode: '111 22',
      city: 'Stockholm',
    }, 'SE');
    expect(customer).toEqual({
      companyName: 'Kund AB',
      email: 'anna@kund.se',
      clientType: 'company',
      orgNumber: '556000-0000',
      phone: '070-123 45 67',
      address: 'Storgatan 1',
      postalCode: '111 22',
      city: 'Stockholm',
      // the offer's contact person is the invoice's "Er referens"
      yourReference: 'Anna Berg',
    });
  });

  it('keeps a private customer private and without a contact person', () => {
    const { customer } = offerToInvoicePrefill({
      companyName: 'Erik Svensson',
      clientType: 'private',
      orgNumber: '850101-1234',
      contactPerson: 'Should not carry',
    }, 'SE');
    expect(customer.clientType).toBe('private');
    expect(customer.orgNumber).toBe('850101-1234');
    expect(customer.yourReference).toBeUndefined();
  });
});
