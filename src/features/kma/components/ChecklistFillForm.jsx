import { useEffect } from 'react';
import { Form, Input, Radio, Tag } from 'antd';
import { useChecklistStore } from '@/src/store/checklistStore';
import { getEntityId } from '@/src/utils/entityId';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { KMA_RESULT_META } from '@/src/features/kma/categories';

const RESULT_CHOICES = ['ok', 'remark', 'na'];

// Fill in / view a single egenkontroll. A signed checklist is read-only.
export default function ChecklistFillForm({ onClose, checklist }) {
  const [form] = Form.useForm();
  const { t, lang } = useLanguage();
  const update = useChecklistStore((s) => s.updateChecklist);
  const readOnly = checklist?.status === 'signed';

  useEffect(() => {
    form.setFieldsValue({
      title: checklist?.title || '',
      date: checklist?.date || '',
      responsible: checklist?.responsible || '',
      notes: checklist?.notes || '',
      items: (checklist?.items || []).map((it) => ({
        text: it.text,
        reference: it.reference,
        result: it.result || 'pending',
        comment: it.comment || '',
      })),
    });
  }, [form, checklist]);

  const onFinish = async (values) => {
    await update(getEntityId(checklist), values);
    onClose?.();
  };

  return (
    <Form id="checklist-fill-form" className="invoice-form" form={form} layout="vertical" onFinish={onFinish} disabled={readOnly}>
      <div className="invoice-form__grid">
        <Form.Item name="title" label={t('Title')} rules={[{ required: true, message: t('Enter a title') }]}>
          <Input />
        </Form.Item>
        <Form.Item name="date" label={t('Date')}>
          <Input type="date" />
        </Form.Item>
        <Form.Item name="responsible" label={t('Responsible')}>
          <Input placeholder={t('Name')} />
        </Form.Item>
      </div>

      <Form.List name="items">
        {(fields) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            {fields.map((field, index) => {
              const item = checklist?.items?.[index] || {};
              return (
                <div key={field.key} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <div>
                      <span style={{ color: '#94a3b8', marginRight: 6 }}>{index + 1}.</span>
                      <strong>{item.text || '—'}</strong>
                      {item.reference ? (
                        <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{item.reference}</div>
                      ) : null}
                    </div>
                  </div>
                  <Form.Item name={[field.name, 'result']} style={{ marginBottom: 8 }}>
                    <Radio.Group optionType="button" buttonStyle="solid">
                      {RESULT_CHOICES.map((r) => (
                        <Radio.Button key={r} value={r}>
                          {lang === 'sv' ? KMA_RESULT_META[r].sv : KMA_RESULT_META[r].en}
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item name={[field.name, 'comment']} style={{ marginBottom: 0 }}>
                    <Input.TextArea rows={1} placeholder={t('Comment')} />
                  </Form.Item>
                  {/* Keep hidden fields so text/reference round-trip on save. */}
                  <Form.Item name={[field.name, 'text']} hidden><Input /></Form.Item>
                  <Form.Item name={[field.name, 'reference']} hidden><Input /></Form.Item>
                </div>
              );
            })}
          </div>
        )}
      </Form.List>

      <Form.Item name="notes" label={t('Notes')} style={{ marginTop: 12 }}>
        <Input.TextArea rows={2} />
      </Form.Item>

      {readOnly ? (
        <Tag color="success">{t('Signed — locked')}</Tag>
      ) : null}
    </Form>
  );
}
