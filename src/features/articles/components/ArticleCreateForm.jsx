import { useEffect } from 'react';
import { Form, InputNumber, Switch, message } from 'antd';
import { Field, Input, Select, Textarea } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useArticleStore } from '@/src/store/articleStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const ARTICLE_TYPE_OPTIONS = [
  { value: 'services', label: 'Tjanster', konteringLabel: 'Tjänster' },
  { value: 'products', label: 'Varor', konteringLabel: 'Varor' },
  { value: 'private-client', label: 'Privatkund', konteringLabel: 'Privatkund' },
];

const VAT_RATE_OPTIONS = [25, 12, 6, 0].map((value) => ({
  value,
  label: `${value}%`,
}));

const UNIT_OPTIONS = [
  { value: 'st', label: 'Styck (st)' },
  { value: 'h', label: 'Timmar (h)' },
  { value: 'dag', label: 'Dagar' },
  { value: 'mån', label: 'Månader' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'm', label: 'Meter (m)' },
  { value: 'm2', label: 'Kvadratmeter (m²)' },
];

const HOUSEWORK_OPTIONS = [
  { value: 'none', label: 'Ej husarbete' },
  { value: 'rot', label: 'ROT' },
  { value: 'rut', label: 'RUT' },
];

const getArticleTypeFromKontering = (kontering) => {
  const normalized = String(kontering || '').toLowerCase();

  if (normalized.includes('privat')) {
    return 'private-client';
  }

  if (normalized.includes('varor')) {
    return 'products';
  }

  return 'services';
};

const buildKontering = (articleType, momsPercent) => {
  const option = ARTICLE_TYPE_OPTIONS.find((item) => item.value === articleType)
    || ARTICLE_TYPE_OPTIONS[0];
  const normalizedVatRate = VAT_RATE_OPTIONS.some((item) => item.value === Number(momsPercent))
    ? Number(momsPercent)
    : 25;

  return `${option.konteringLabel} ${normalizedVatRate}%`;
};

export default function ArticleCreateForm({ onClose, articleToEdit = null }) {
  const [form] = Form.useForm();
  const createArticle = useArticleStore((state) => state.create);
  const updateArticle = useArticleStore((state) => state.update);
  const fetchNextNumber = useArticleStore((state) => state.fetchNextNumber);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const initForm = async () => {
      if (articleToEdit) {
        const articleType = getArticleTypeFromKontering(articleToEdit.kontering);
        const momsPercent = VAT_RATE_OPTIONS.some((item) => item.value === Number(articleToEdit.momsPercent))
          ? Number(articleToEdit.momsPercent)
          : 25;

        form.setFieldsValue({
          ...articleToEdit,
          articleType,
          momsPercent,
          kontering: buildKontering(articleType, momsPercent),
          active: articleToEdit.active ?? true,
          unit: articleToEdit.unit || 'st',
          houseworkType: articleToEdit.houseworkType || 'none',
        });
        return;
      }

      form.resetFields();
      form.setFieldsValue({
        companyId: user?.companyId,
        articleType: 'services',
        momsPercent: 25,
        kontering: buildKontering('services', 25),
        priceExclMoms: 0,
        active: true,
        unit: 'st',
        houseworkType: 'none',
        purchasePriceExclMoms: 0,
      });

      const nextNumber = await fetchNextNumber(user?.companyId);
      form.setFieldValue('articleNumber', nextNumber);
    };

    initForm();
  }, [articleToEdit, fetchNextNumber, form, user]);

  const syncKontering = (nextValues = {}) => {
    const articleType = nextValues.articleType ?? form.getFieldValue('articleType') ?? 'services';
    const momsPercent = nextValues.momsPercent ?? form.getFieldValue('momsPercent') ?? 25;
    form.setFieldValue('kontering', buildKontering(articleType, momsPercent));
  };

  const watchedMomsPercent = Form.useWatch('momsPercent', form) ?? 25;
  const watchedPriceExclMoms = Form.useWatch('priceExclMoms', form) ?? 0;
  const watchedPurchasePrice = Form.useWatch('purchasePriceExclMoms', form) ?? 0;
  const priceInclMoms = watchedPriceExclMoms * (1 + watchedMomsPercent / 100);
  const contributionMargin = watchedPriceExclMoms - watchedPurchasePrice;

  const handlePriceInclMomsChange = (value) => {
    const nextExclMoms = (Number(value) || 0) / (1 + watchedMomsPercent / 100);
    form.setFieldValue('priceExclMoms', Math.round(nextExclMoms * 100) / 100);
  };

  const onFinish = async (values) => {
    const { articleType, ...restValues } = values;
    const payload = {
      ...restValues,
      kontering: buildKontering(articleType, values.momsPercent),
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
      message.error(formatApiError(err, 'Failed to save article'));
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
        <h3 className="admin-modal-form__section-title">Grunduppgifter</h3>
        <div className="admin-modal-form__grid">
          <Field name="companyId" hidden>
            <Input />
          </Field>

          <Field name="active" label="Aktiv" valuePropName="checked">
            <Switch checkedChildren="On" unCheckedChildren="Off" />
          </Field>

          <Field name="articleNumber" label="Artikelnr.">
            <Input readOnly />
          </Field>

          <Field
            name="name"
            label="Artikelnamn"
            rules={[{ required: true, message: 'Please enter article name' }]}
          >
            <Input placeholder="Article name" />
          </Field>

          <div className="admin-modal-form__grid-item--full">
            <Field name="notes" label="Anteckningar">
              <Textarea rows={3} placeholder="Anteckningar..." />
            </Field>
          </div>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">Försäljningsinformation</h3>
        <div className="admin-modal-form__grid">
          <Field
            name="articleType"
            label="Article type"
            rules={[{ required: true, message: 'Please select article type' }]}
          >
            <Select
              options={ARTICLE_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))}
              onChange={(value) => syncKontering({ articleType: value })}
              style={{ width: '100%' }}
            />
          </Field>

          <Field name="kontering" label="Kontering">
            <Input readOnly />
          </Field>

          <Field name="houseworkType" label="Typ av husarbete">
            <Select options={HOUSEWORK_OPTIONS} style={{ width: '100%' }} />
          </Field>

          <Field name="unit" label="Enheter">
            <Select options={UNIT_OPTIONS} style={{ width: '100%' }} />
          </Field>

          <Field name="momsPercent" label="VAT %">
            <Select
              options={VAT_RATE_OPTIONS}
              onChange={(value) => syncKontering({ momsPercent: value })}
              style={{ width: '100%' }}
            />
          </Field>

          <Field name="priceExclMoms" label="Pris exkl. moms">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Field>

          <Field label="Pris inkl. moms">
            <InputNumber
              min={0}
              precision={2}
              value={priceInclMoms}
              onChange={handlePriceInclMomsChange}
              style={{ width: '100%' }}
            />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">Inköp</h3>
        <div className="admin-modal-form__grid">
          <Field name="purchasePriceExclMoms" label="Inköpspris exkl. moms">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Field>

          <Field label="TB">
            <InputNumber value={contributionMargin} precision={2} disabled style={{ width: '100%' }} />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">Artikelgrupper</h3>
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field name="articleGroups" label="Valda grupper">
              <Select mode="tags" placeholder="Sök artikelgrupp" style={{ width: '100%' }} options={[]} />
            </Field>
          </div>
        </div>
      </section>
    </Form>
  );
}
