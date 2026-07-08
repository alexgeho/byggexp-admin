import { useEffect, useState } from 'react';
import { Form, InputNumber, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { Field, Input, Select } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useArticleStore } from '@/src/store/articleStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const KONTERING_OPTIONS = [
  { value: 'Tjänster 25%', label: 'Tjänster 25%', momsPercent: 25 },
  { value: 'Tjänster 12%', label: 'Tjänster 12%', momsPercent: 12 },
  { value: 'Tjänster 6%', label: 'Tjänster 6%', momsPercent: 6 },
  { value: 'Varor 25%', label: 'Varor 25%', momsPercent: 25 },
  { value: 'Varor 12%', label: 'Varor 12%', momsPercent: 12 },
  { value: 'Varor 6%', label: 'Varor 6%', momsPercent: 6 },
  { value: 'Privatkund 25%', label: 'Privatkund 25%', momsPercent: 25 },
];

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
        form.setFieldsValue(articleToEdit);
        return;
      }

      form.resetFields();
      form.setFieldsValue({
        companyId: user?.companyId,
        kontering: 'Tjänster 25%',
        momsPercent: 25,
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

  const handleKonteringChange = (value) => {
    const option = KONTERING_OPTIONS.find((item) => item.value === value);
    if (option) {
      form.setFieldValue('momsPercent', option.momsPercent);
    }
  };

  const onFinish = async (values) => {
    try {
      if (articleToEdit) {
        await updateArticle(getEntityId(articleToEdit), values);
      } else {
        await createArticle(values);
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
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter article name' }]}
          >
            <Input placeholder="Article name" />
          </Field>

          <Field name="kontering" label="Kontering">
            <Select
              options={KONTERING_OPTIONS}
              onChange={handleKonteringChange}
              style={{ width: '100%' }}
            />
          </Field>

          <Field name="momsPercent" label="VAT %">
            <InputNumber min={0} max={100} precision={0} />
          </Field>

          <Field name="priceExclMoms" label="Price excl. VAT">
            <InputNumber min={0} precision={2} />
          </Field>
        </div>
      </section>
    </Form>
  );
}
