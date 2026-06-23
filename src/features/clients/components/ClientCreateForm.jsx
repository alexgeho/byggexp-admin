import { useEffect, useState } from 'react';
import { Form, Input, Select, Switch, message } from 'antd';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useClientStore } from '@/src/store/clientStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const CLIENT_TYPE_OPTIONS = [
  { value: 'company', label: 'Company' },
  { value: 'private', label: 'Private person' },
];

export default function ClientCreateForm({ onClose, clientToEdit = null }) {
  const [form] = Form.useForm();
  const [companies, setCompanies] = useState([]);
  const createClient = useClientStore((state) => state.create);
  const updateClient = useClientStore((state) => state.update);
  const fetchNextNumber = useClientStore((state) => state.fetchNextNumber);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const clientType = Form.useWatch('clientType', form);

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
      if (clientToEdit) {
        form.setFieldsValue({
          ...clientToEdit,
          reverseVAT: Boolean(clientToEdit.reverseVAT),
        });
        return;
      }

      form.resetFields();
      form.setFieldsValue({
        companyId: user?.companyId,
        clientType: 'company',
        country: 'Sverige',
        currency: 'SEK',
        paymentTerms: '30 dagar netto',
        reverseVAT: false,
      });

      const companyId = isSuperAdmin ? user?.companyId : user?.companyId;
      if (!isSuperAdmin || companyId) {
        const nextNumber = await fetchNextNumber(isSuperAdmin ? companyId : undefined);
        form.setFieldValue('customerNumber', nextNumber);
      }
    };

    initForm();
  }, [clientToEdit, fetchNextNumber, form, isSuperAdmin, user]);

  const watchedCompanyId = Form.useWatch('companyId', form);

  useEffect(() => {
    if (clientToEdit || !isSuperAdmin || !watchedCompanyId) {
      return;
    }

    fetchNextNumber(watchedCompanyId)
      .then((nextNumber) => {
        if (nextNumber) {
          form.setFieldValue('customerNumber', nextNumber);
        }
      })
      .catch(() => {});
  }, [clientToEdit, fetchNextNumber, form, isSuperAdmin, watchedCompanyId]);

  const onFinish = async (values) => {
    const payload = {
      ...values,
      reverseVAT: Boolean(values.reverseVAT),
    };

    try {
      if (clientToEdit) {
        await updateClient(getEntityId(clientToEdit), payload);
      } else {
        await createClient(payload);
      }

      onClose();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, 'Failed to save client'));
    }
  };

  return (
    <Form
      id="client-create-form"
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

        <Form.Item name="clientType" label="Client type">
          <Select options={CLIENT_TYPE_OPTIONS} />
        </Form.Item>

        <Form.Item name="customerNumber" label="Customer no.">
          <Input readOnly />
        </Form.Item>

        {clientType === 'company' ? (
          <>
            <Form.Item
              name="companyName"
              label="Company name"
              rules={[{ required: true, message: 'Please enter company name' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="orgNumber" label="Org. number">
              <Input />
            </Form.Item>
            <Form.Item name="vatNumber" label="VAT number">
              <Input />
            </Form.Item>
            <Form.Item name="contactPerson" label="Contact person">
              <Input />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item
              name="firstName"
              label="First name"
              rules={[{ required: true, message: 'Please enter first name' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="lastName"
              label="Last name"
              rules={[{ required: true, message: 'Please enter last name' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="personalNumber" label="Personal number">
              <Input />
            </Form.Item>
          </>
        )}

        <Form.Item name="address" label="Address">
          <Input />
        </Form.Item>
        <Form.Item name="postalCode" label="Postal code">
          <Input />
        </Form.Item>
        <Form.Item name="city" label="City">
          <Input />
        </Form.Item>
        <Form.Item name="country" label="Country">
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input type="email" />
        </Form.Item>
        <Form.Item name="phone" label="Phone">
          <Input />
        </Form.Item>
        <Form.Item name="mobile" label="Mobile">
          <Input />
        </Form.Item>
        <Form.Item name="website" label="Website">
          <Input />
        </Form.Item>
        <Form.Item name="currency" label="Currency">
          <Input />
        </Form.Item>
        <Form.Item name="paymentTerms" label="Payment terms">
          <Input />
        </Form.Item>
        <Form.Item name="reverseVAT" label="Reverse VAT" valuePropName="checked">
          <Switch checkedChildren="On" unCheckedChildren="Off" />
        </Form.Item>
      </div>

      <Form.Item name="notes" label="Notes">
        <Input.TextArea rows={3} />
      </Form.Item>
    </Form>
  );
}
