import { useEffect, useState } from 'react';
import { Form, Input } from 'antd';
import AdminModal from '@/src/shared/components/AdminModal';
import { useDeviationStore } from '@/src/store/deviationStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';

// Close with a comment (required) and the corrective action.
export default function CloseDeviationModal({ deviation, open, onClose, onClosed }) {
  const t = useT();
  const [form] = Form.useForm();
  const close = useDeviationStore((s) => s.closeDeviation);
  const [saving, setSaving] = useState(false);
  const comment = Form.useWatch('closingComment', form);

  useEffect(() => {
    if (open) form.setFieldsValue({ closingComment: '', correctiveAction: deviation?.correctiveAction || '' });
  }, [open, deviation, form]);

  const onFinish = async (values) => {
    setSaving(true);
    try {
      const saved = await close(getEntityId(deviation), {
        closingComment: values.closingComment.trim(),
        correctiveAction: values.correctiveAction || '',
      });
      onClosed?.(saved);
      onClose?.();
    } catch { /* store shows the error */ }
    setSaving(false);
  };

  return (
    <AdminModal
      title={t('Close deviation')}
      saveForm="close-deviation-form"
      saveText={t('Close deviation')}
      saveDisabled={!(comment || '').trim()}
      saveLoading={saving}
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={560}
    >
      <Form id="close-deviation-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="correctiveAction" label={t('Corrective action')}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
        </Form.Item>
        <Form.Item name="closingComment" label={t('Closing comment')} rules={[{ required: true, whitespace: true, message: t('Closing comment') }]}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
        </Form.Item>
      </Form>
    </AdminModal>
  );
}
