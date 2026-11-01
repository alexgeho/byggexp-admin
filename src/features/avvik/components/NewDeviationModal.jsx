import { useState } from 'react';
import AdminModal from '@/src/shared/components/AdminModal';
import DeviationForm from '@/src/features/avvik/components/DeviationForm';
import { useT } from '@/src/i18n/LanguageProvider';

// «Create deviation» from elsewhere (checklist remark, dagbok entry), prefilled.
export default function NewDeviationModal({ open, prefill, onClose }) {
  const t = useT();
  const [canSave, setCanSave] = useState(false);
  return (
    <AdminModal
      title={t('New deviation')}
      saveForm="deviation-form"
      saveDisabled={!canSave}
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={720}
    >
      {open ? (
        <DeviationForm prefill={prefill} onCanSaveChange={setCanSave} onSaved={onClose} />
      ) : null}
    </AdminModal>
  );
}
