'use client';

import { Empty } from 'antd';
import { useAuthStore } from '@/src/store/authStore';
import { useModuleStore } from '@/src/store/moduleStore';
import { useT } from '@/src/i18n/LanguageProvider';
import CompanyModulesPanel from '@/src/features/companies/components/CompanyModulesPanel';

// Self-service "Customize menu" for the logged-in company admin. Restricted:
// hide/show within the plan only. Superadmin here gets full control. Saving
// refreshes the shared module store so the sidebar updates immediately.
export default function ModulesSettingsPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const reset = useModuleStore((s) => s.reset);
  const fetchForCompany = useModuleStore((s) => s.fetchForCompany);

  const companyId = user?.companyId;
  const isSuperadmin = user?.role === 'superadmin';

  const onSaved = () => {
    reset();
    if (companyId) fetchForCompany(companyId);
  };

  if (!companyId) {
    return <Empty description={t('No company linked to your account')} />;
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <CompanyModulesPanel companyId={companyId} restricted={!isSuperadmin} onSaved={onSaved} />
    </div>
  );
}
