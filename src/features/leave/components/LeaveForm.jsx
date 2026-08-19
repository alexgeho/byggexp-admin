import { useEffect, useState } from 'react';
import { Checkbox, Form, Input, Select, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { useLeaveStore } from '@/src/store/leaveStore';
import { getEntityId } from '@/src/utils/entityId';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';
import { LEAVE_TYPE_OPTIONS } from '@/src/features/leave/leaveTypes';

const today = () => new Date().toISOString().slice(0, 10);

export default function LeaveForm({ onClose, requestToEdit = null }) {
  const [form] = Form.useForm();
  const { t, lang } = useLanguage();
  const [workers, setWorkers] = useState([]);
  const create = useLeaveStore((s) => s.create);
  const update = useLeaveStore((s) => s.update);

  useEffect(() => {
    apiClient
      .get('/users/role/worker')
      .then(({ data }) => setWorkers(data || []))
      .catch(() => setWorkers([]));
  }, []);

  useEffect(() => {
    if (requestToEdit) {
      form.setFieldsValue({
        userId: requestToEdit.userId || undefined,
        type: requestToEdit.type || 'vacation',
        startDate: requestToEdit.startDate || today(),
        endDate: requestToEdit.endDate || '',
        halfDay: !!requestToEdit.halfDay,
        reason: requestToEdit.reason || '',
      });
      return;
    }
    form.resetFields();
    form.setFieldsValue({ type: 'vacation', startDate: today(), halfDay: false });
  }, [form, requestToEdit]);

  const onFinish = async (values) => {
    try {
      if (requestToEdit) {
        await update(getEntityId(requestToEdit), values);
      } else {
        await create(values);
      }
      onClose?.();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, 'Failed to save leave request'));
    }
  };

  return (
    <Form id="leave-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish}>
      <div className="invoice-form__grid">
        <Form.Item name="userId" label={t('Worker')} rules={[{ required: true, message: t('Select a worker') }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t('Worker')}
            disabled={!!requestToEdit}
            options={workers.map((w) => ({ value: getEntityId(w), label: w.name }))}
          />
        </Form.Item>
        <Form.Item name="type" label={t('Type')}>
          <Select options={LEAVE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o[lang] ?? o.en }))} />
        </Form.Item>
        <Form.Item name="startDate" label={t('From')}>
          <Input type="date" />
        </Form.Item>
        <Form.Item name="endDate" label={t('To')}>
          <Input type="date" />
        </Form.Item>
      </div>

      <Form.Item name="halfDay" valuePropName="checked">
        <Checkbox>{t('Half day')}</Checkbox>
      </Form.Item>

      <Form.Item name="reason" label={t('Reason')}>
        <Input.TextArea rows={2} />
      </Form.Item>
    </Form>
  );
}
