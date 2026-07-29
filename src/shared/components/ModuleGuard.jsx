'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/authStore';
import { useModuleStore, isModuleEnabled } from '@/src/store/moduleStore';

// Derive the module key a company path belongs to (mirrors the sidebar keys).
const moduleKeyForPath = (pathname) => {
  const seg = (pathname || '').split('/').filter(Boolean); // ['company', ...]
  if (seg[0] !== 'company') return null;
  if (seg[1] === 'invoicing') return seg[2] || null;
  return seg[1] || 'dashboard';
};

// Loads the current company's module set and soft-redirects away from any
// section that has been hidden (direct URL entry). Never blocks superadmin.
export default function ModuleGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const enabled = useModuleStore((s) => s.enabled);
  const fetchForCompany = useModuleStore((s) => s.fetchForCompany);

  const isSuperadmin = user?.role === 'superadmin';
  const companyId = user?.companyId;

  useEffect(() => {
    if (!isSuperadmin && companyId) fetchForCompany(companyId);
  }, [isSuperadmin, companyId, fetchForCompany]);

  useEffect(() => {
    if (isSuperadmin || !enabled) return;
    const key = moduleKeyForPath(pathname);
    if (key && !isModuleEnabled(enabled, key)) {
      router.replace('/company');
    }
  }, [isSuperadmin, enabled, pathname, router]);

  return null;
}
