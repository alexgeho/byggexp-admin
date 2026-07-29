'use client';

import { Modal } from 'antd';
import { useT } from '@/src/i18n/LanguageProvider';
import { getEntityId } from '@/src/utils/entityId';
import CompanyModulesPanel from '@/src/features/companies/components/CompanyModulesPanel';

// Superadmin wrapper: full control over any company's modules.
export default function CompanyModulesModal({ company, open, onClose }) {
  const t = useT();
  const companyId = company ? getEntityId(company) : null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={620}
      title={`${t('Modules')} — ${company?.name || ''}`}
    >
      {open && companyId ? (
        <CompanyModulesPanel companyId={companyId} onSaved={onClose} />
      ) : null}
    </Modal>
  );
}
