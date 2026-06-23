import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, message } from 'antd';
import apiClient from '@/src/api/apiClient';
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

  return (
    <Form
      id="article-create-form"
      className="invoice-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <div className="invoice-form__grid">
        {isSuperAdmin ? (
          <Form.Item
            name="companyId"
            label="Company"
            rules={[{ required: true, message: 'Please select company' }]}
          >
            <Select placeholder="Select company">
              {companies.map((company) => (
                <Select.Option key={getEntityId(company)} value={getEntityId(company)}>
                  {company.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ) : null}

        <Form.Item name="articleNumber" label="Article no.">
          <Input readOnly />
        </Form.Item>

        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Please enter article name' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="kontering" label="Kontering">
          <Select options={KONTERING_OPTIONS} onChange={handleKonteringChange} />
        </Form.Item>

        <Form.Item name="momsPercent" label="VAT %">
          <InputNumber min={0} max={100} precision={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="priceExclMoms" label="Price excl. VAT">
          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
        </Form.Item>
      </div>
    </Form>
  );
}
