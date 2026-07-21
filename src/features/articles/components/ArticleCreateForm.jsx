import { useEffect, useState } from 'react';
import { Form, InputNumber, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { Field, Input, Select } from '@/src/ui-kit';
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
  const [companies, setCompanies] = useState([]);
  const createArticle = useArticleStore((state) => state.create);
  const updateArticle = useArticleStore((state) => state.update);
  const fetchNextNumber = useArticleStore((state) => state.fetchNextNumber);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    const fetchCompanies = async () => {
      try {
        const res = await apiClient.get('/company');
        setCompanies(res.data || []);
      } catch (err) {
        message.warning(formatApiError(err, 'Failed to load companies'));
      }
    };

    fetchCompanies();
  }, [isSuperAdmin]);

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
      });

      const companyId = user?.companyId;
      if (!isSuperAdmin || companyId) {
        const nextNumber = await fetchNextNumber(isSuperAdmin ? companyId : undefined);
        form.setFieldValue('articleNumber', nextNumber);
      }
    };

    initForm();
  }, [articleToEdit, fetchNextNumber, form, isSuperAdmin, user]);

  const watchedCompanyId = Form.useWatch('companyId', form);

  useEffect(() => {
    if (articleToEdit || !isSuperAdmin || !watchedCompanyId) {
      return;
    }

    fetchNextNumber(watchedCompanyId)
      .then((nextNumber) => {
        if (nextNumber) {
          form.setFieldValue('articleNumber', nextNumber);
        }
      })
      .catch(() => {});
  }, [articleToEdit, fetchNextNumber, form, isSuperAdmin, watchedCompanyId]);

  const syncKontering = (nextValues = {}) => {
    const articleType = nextValues.articleType ?? form.getFieldValue('articleType') ?? 'services';
    const momsPercent = nextValues.momsPercent ?? form.getFieldValue('momsPercent') ?? 25;
    form.setFieldValue('kontering', buildKontering(articleType, momsPercent));
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

  const companyOptions = companies.map((company) => ({
    value: getEntityId(company),
    label: company.name,
  }));

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
          {isSuperAdmin ? (
            <Field
              name="companyId"
              label="Company"
              rules={[{ required: true, message: 'Please select company' }]}
            >
              <Select
                placeholder="Select company"
                options={companyOptions}
                style={{ width: '100%' }}
              />
            </Field>
          ) : null}

          <Field name="articleNumber" label="Article no.">
            <Input readOnly />
          </Field>

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

          <Field
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter article name' }]}
          >
            <Input placeholder="Article name" />
          </Field>

          <Field name="kontering" label="Kontering">
            <Input readOnly />
          </Field>

          <Field name="momsPercent" label="VAT %">
            <Select
              options={VAT_RATE_OPTIONS}
              onChange={(value) => syncKontering({ momsPercent: value })}
              style={{ width: '100%' }}
            />
          </Field>

          <Field name="priceExclMoms" label="Price excl. VAT">
            <InputNumber min={0} precision={2} />
          </Field>
        </div>
      </section>
    </Form>
  );
}
