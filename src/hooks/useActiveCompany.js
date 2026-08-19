'use client';

import { useEffect } from 'react';
import { useCompanyStore } from '@/src/store/companyStore';
import { useAuthStore } from '@/src/store/authStore';
import { DEFAULT_COUNTRY, DEFAULT_CURRENCY } from '@/src/config/markets';

// Returns the logged-in user's company (lazily fetching it once), or null for
// superadmins / users without a company. Used to drive market-specific display
// (currency, VAT rates, ROT availability) across the admin.
export function useActiveCompany() {
  const currentCompany = useCompanyStore((state) => state.currentCompany);
  const fetchMy = useCompanyStore((state) => state.fetchMy);
  const companyId = useAuthStore((state) => state.user?.companyId);

  useEffect(() => {
    if (companyId && !currentCompany) {
      // Best-effort; on failure we fall back to Swedish defaults below.
      fetchMy().catch(() => {});
    }
  }, [companyId, currentCompany, fetchMy]);

  return currentCompany;
}

// The active company's invoicing currency, defaulting to SEK so existing
// (Swedish) installs render exactly as before.
export function useCompanyCurrency() {
  return useActiveCompany()?.currency || DEFAULT_CURRENCY;
}

// The active company's home-market country code, defaulting to Sweden.
export function useCompanyCountry() {
  return useActiveCompany()?.country || DEFAULT_COUNTRY;
}
