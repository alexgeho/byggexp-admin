import { useState } from 'react';
import { AutoComplete, Form } from 'antd';
import { Field, Input } from '@/src/ui-kit';
import AdminModal from '@/src/shared/components/AdminModal';
import { useSubcontractorStore } from '@/src/store/subcontractorStore';
import { WORK_TYPE_OPTIONS } from '@/src/shared/config/workTypes';
import { formatApiError } from '@/src/utils/formError';
import { appMessage } from '@/src/utils/appMessage';
import { useT } from '@/src/i18n/LanguageProvider';

const FORM_ID = 'subcontractor-create-form';

// «Ny underentreprenör» (owner-approved mockup, 2026-11-18): one window, six
// one-line fields. With an e-mail the contact person is invited to the admin
// and adds the firm's own workers there.
export default function SubcontractorCreateModal({ open, onClose, onCreated }) {
  const t = useT();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const create = useSubcontractorStore((state) => state.create);

  const close = () => {
    form.resetFields();
    onClose?.();
  };

  const onFinish = async (values) => {
    const clean = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, String(value || '').trim()]),
    );
    setSaving(true);
    try {
      const created = await create(clean);
      if (!clean.email) appMessage.success(t('Subcontractor created'));
      else if (created?.inviteEmailSent) appMessage.success(t('Subcontractor created — invitation sent'));
      else appMessage.warning(t('Subcontractor created, but the invitation was not sent'));
      onCreated?.(created);
      close();
    } catch (err) {
      appMessage.error(formatApiError(err, t('Failed to create subcontractor')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      title={t('New subcontractor')}
      saveText={t('Create and invite')}
      saveForm={FORM_ID}
      saveLoading={saving}
      open={open}
      onCancel={close}
      destroyOnHidden
      width={680}
    >
      <Form className="admin-modal-form" form={form} layout="vertical" onFinish={onFinish} id={FORM_ID}>
        <section className="admin-modal-form__section">
          <div className="admin-modal-form__grid">
            <Field
              name="name"
              label={t('Company name')}
              rules={[{ required: true, whitespace: true, message: t('Please enter the company name') }]}
            >
              <Input autoComplete="off" />
            </Field>
            <Field name="orgNumber" label={t('Org no.')}>
              <Input autoComplete="off" />
            </Field>
            <Field name="contactPerson" label={t('Contact person')}>
              <Input autoComplete="off" />
            </Field>
            <Field name="email" label={t('Email')} rules={[{ type: 'email', message: t('Please enter a valid email') }]}>
              <Input autoComplete="off" />
            </Field>
            <Field name="phone" label={t('Phone')}>
              <Input autoComplete="off" />
            </Field>
            <Field name="workType" label={t('Work type')}>
              <AutoComplete
                options={WORK_TYPE_OPTIONS}
                filterOption={(input, option) => (
                  (option?.value || '').toLowerCase().includes((input || '').toLowerCase())
                )}
              />
            </Field>
          </div>
        </section>
      </Form>
    </AdminModal>
  );
}
