// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/src/api/apiClient', () => ({
  default: { get: vi.fn(async () => ({ data: {} })), put: vi.fn(), defaults: { baseURL: 'http://x' } },
}));

import { useAuthStore } from '@/src/store/authStore';
import { useCompanyStore } from '@/src/store/companyStore';
import CompanyDetailsForm from './CompanyDetailsForm';

window.matchMedia = window.matchMedia || ((q) => ({
  matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
}));

function renderFor(country) {
  useAuthStore.setState({
    user: { _id: 'u1', companyId: 'c1', role: 'companyAdmin' },
    isCompanyAdmin: () => true,
    isSuperAdmin: () => false,
  });
  useCompanyStore.setState({
    currentCompany: { _id: 'c1', name: 'X', email: 'x@x.no', country, currency: country === 'NO' ? 'NOK' : 'SEK' },
    fetchMy: async () => {},
  });
  return render(<CompanyDetailsForm />);
}

describe('CompanyDetailsForm — payment fields by country', () => {
  it('Norway: kontonummer, KID, MVA, Foretaksregisteret; no Swedish fields', async () => {
    renderFor('NO');
    expect(await screen.findByText('Account number')).toBeInTheDocument();
    expect(screen.getByText('KID')).toBeInTheDocument();
    expect(screen.getByText('VAT registered')).toBeInTheDocument();
    expect(screen.getByText('Foretaksregisteret')).toBeInTheDocument();
    expect(screen.queryByText('Bankgiro')).toBeNull();
    expect(screen.queryByText('Plusgiro')).toBeNull();
    expect(screen.queryByText('F-skatt')).toBeNull();
  });

  it('Sweden: unchanged Bankgiro / Plusgiro / F-skatt', async () => {
    renderFor('SE');
    expect(await screen.findByText('Bankgiro')).toBeInTheDocument();
    expect(screen.getByText('Plusgiro')).toBeInTheDocument();
    expect(screen.getByText('F-skatt')).toBeInTheDocument();
    expect(screen.queryByText('Account number')).toBeNull();
    expect(screen.queryByText('KID')).toBeNull();
  });
});
