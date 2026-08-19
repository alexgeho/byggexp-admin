import { useEffect } from 'react';
import { Form, message } from 'antd';
import { Field, Input, Select, Textarea } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useArticleStore } from '@/src/store/articleStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';

const VAT_RATE_OPTIONS = [25, 12, 6, 0].map((value) => ({
  value,
  label: `${value}%`,
}));

const UNIT_OPTIONS = [
  { value: 'st', label: 'Piece (pc)' },
  { value: 'h', label: 'Hours (h)' },
  { value: 'dag', label: 'Days' },
  { value: 'mån', label: 'Months' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'm', label: 'Metre (m)' },
  { value: 'm2', label: 'Square metre (m²)' },
];

const normalizeVatRate = (momsPercent) =>
  VAT_RATE_OPTIONS.some((item) => item.value === Number(momsPercent))
    ? Number(momsPercent)
    : 25;

// Kontering is no longer edited in the form; derive it from the VAT rate so
// existing invoicing that reads it keeps a sensible value.
const buildKontering = (momsPercent) => `Tjänster ${normalizeVatRate(momsPercent)}%`;

export default function ArticleCreateForm({ onClose, articleToEdit = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const createArticle = useArticleStore((state) => state.create);
  const updateArticle = useArticleStore((state) => state.update);
  const fetchNextNumber = useArticleStore((state) => state.fetchNextNumber);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const initForm = async () => {
      if (articleToEdit) {
        form.setFieldsValue({
          ...articleToEdit,
          momsPercent: normalizeVatRate(articleToEdit.momsPercent),
          unit: articleToEdit.unit || 'st',
        });
        return;
      }

      form.resetFields();
      form.setFieldsValue({
        companyId: user?.companyId,
        momsPercent: 25,
        unit: 'st',
      });

      const nextNumber = await fetchNextNumber(user?.companyId);
      form.setFieldValue('articleNumber', nextNumber);
    };

    initForm();
  }, [articleToEdit, fetchNextNumber, form, user]);

  const onFinish = async (values) => {
    const payload = {
      ...values,
      kontering: buildKontering(values.momsPercent),
    };

    try {
      if (articleToEdit) {
        await updateArticle(getEntityId(articleToEdit), payload);
      } else {
        await createArticle(payload);
      }

      onClose();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, t('Failed to save article')));
    }
  };

  return (
    <Form
      id="article-create-form"
      className="admin-modal-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <Field name="companyId" hidden>
            <Input />
          </Field>

          <Field
            name="name"
            label={t('Article name')}
            rules={[{ required: true, message: t('Please enter article name') }]}
          >
            <Input placeholder={t('Article name')} />
          </Field>

          <Field name="articleNumber" label={t('Art.no.')}>
            <Input readOnly />
          </Field>

          <div className="admin-modal-form__grid-item--full">
            <Field name="notes" label={t('Notes')}>
              <Textarea rows={3} placeholder={t('Notes')} />
            </Field>
          </div>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">{t('Sales information')}</h3>
        <div className="admin-modal-form__grid">
          <Field name="momsPercent" label={t('VAT %')}>
            <Select options={VAT_RATE_OPTIONS} style={{ width: '100%' }} />
          </Field>

          <Field name="unit" label={t('Units')}>
            <Select options={UNIT_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} style={{ width: '100%' }} />
          </Field>
        </div>
      </section>
    </Form>
  );
}
