import { useEffect } from 'react';
import { Button, Form, Input, Select, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useChecklistStore } from '@/src/store/checklistStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import { KMA_CATEGORY_OPTIONS } from '@/src/features/kma/categories';

export default function TemplateForm({ onClose, templateToEdit = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const create = useChecklistStore((s) => s.createTemplate);
  const update = useChecklistStore((s) => s.updateTemplate);

  useEffect(() => {
    if (templateToEdit) {
      form.setFieldsValue({
        name: templateToEdit.name || '',
        category: templateToEdit.category || 'quality',
        description: templateToEdit.description || '',
        items: templateToEdit.items?.length ? templateToEdit.items : [{ text: '', reference: '' }],
      });
      return;
    }
    form.resetFields();
    form.setFieldsValue({ category: 'quality', items: [{ text: '', reference: '' }] });
  }, [form, templateToEdit]);

  const onFinish = async (values) => {
    const payload = {
      ...values,
      items: (values.items || []).filter((it) => it && it.text && it.text.trim()),
    };
    if (templateToEdit) {
      await update(getEntityId(templateToEdit), payload);
    } else {
      await create(payload);
    }
    onClose?.();
  };

  return (
    <Form id="template-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish}>
      <div className="invoice-form__grid">
        <Form.Item name="name" label={t('Template name')} rules={[{ required: true, message: t('Enter a name') }]}>
          <Input placeholder={t('e.g. Self-inspection, electrical')} />
        </Form.Item>
        <Form.Item name="category" label={t('Category')}>
          <Select options={KMA_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))} />
        </Form.Item>
      </div>

      <Form.Item name="description" label={t('Description')}>
        <Input.TextArea rows={2} />
      </Form.Item>

      <label style={{ display: 'block', fontWeight: 500, margin: '8px 0' }}>{t('Control points')}</label>
      <Form.List name="items">
        {(fields, { add, remove }) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fields.map((field) => (
              <Space key={field.key} align="start" style={{ display: 'flex' }}>
                <Form.Item name={[field.name, 'text']} style={{ marginBottom: 0, flex: 1, minWidth: 320 }}>
                  <Input placeholder={t('Control point')} />
                </Form.Item>
                <Form.Item name={[field.name, 'reference']} style={{ marginBottom: 0, width: 160 }}>
                  <Input placeholder={t('Reference')} />
                </Form.Item>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
              </Space>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ text: '', reference: '' })}>
              {t('Add control point')}
            </Button>
          </div>
        )}
      </Form.List>
    </Form>
  );
}
