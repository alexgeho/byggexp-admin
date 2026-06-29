import { useEffect, useState } from 'react';
import { Button, Divider, Form, Input, Select, Space, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useOfferStore } from '@/src/store/offerStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

const DEFAULT_CONTACT = {
  role: 'Projektledare',
  name: '',
};

const emptyToUndefined = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function OfferForm({ onClose, offerToEdit = null }) {
  const [form] = Form.useForm();
  const [companies, setCompanies] = useState([]);
  const createOffer = useOfferStore((state) => state.create);
  const updateOffer = useOfferStore((state) => state.update);
  const fetchNextNumber = useOfferStore((state) => state.fetchNextNumber);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const watchedCompanyId = Form.useWatch('companyId', form);

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
      if (offerToEdit) {
        form.setFieldsValue({
          ...offerToEdit,
          contactPersons: offerToEdit.contactPersons?.length
            ? offerToEdit.contactPersons
            : [DEFAULT_CONTACT],
        });
        return;
      }

      form.resetFields();
      form.setFieldsValue({
        companyId: user?.companyId,
        date: today(),
        status: 'draft',
        contactPersons: [DEFAULT_CONTACT],
      });

      const companyId = user?.companyId;
      if (!isSuperAdmin || companyId) {
        const nextNumber = await fetchNextNumber(isSuperAdmin ? companyId : undefined);
        form.setFieldValue('offerNumber', nextNumber);
      }
    };

    initForm();
  }, [fetchNextNumber, form, isSuperAdmin, offerToEdit, user]);

  useEffect(() => {
    if (offerToEdit || !isSuperAdmin || !watchedCompanyId) {
      return;
    }

    fetchNextNumber(watchedCompanyId)
      .then((nextNumber) => {
        if (nextNumber) {
          form.setFieldValue('offerNumber', nextNumber);
        }
      })
      .catch(() => {});
  }, [fetchNextNumber, form, isSuperAdmin, offerToEdit, watchedCompanyId]);

  const onFinish = async (values) => {
    const payload = {
      ...values,
      companyName: emptyToUndefined(values.companyName),
      email: emptyToUndefined(values.email),
      subtitle: emptyToUndefined(values.subtitle),
      priceText: emptyToUndefined(values.priceText),
      description: emptyToUndefined(values.description),
      clarifications: emptyToUndefined(values.clarifications),
      contactPersons: (values.contactPersons || [])
        .map((contact) => ({
          role: emptyToUndefined(contact.role) || '',
          name: emptyToUndefined(contact.name) || '',
        }))
        .filter((contact) => contact.role || contact.name),
      items: [],
      subtotal: 0,
      vat: 0,
      total: 0,
    };

    delete payload.offerNumber;

    try {
      if (offerToEdit) {
        await updateOffer(getEntityId(offerToEdit), payload);
      } else {
        await createOffer(payload);
      }

      onClose?.();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, 'Failed to save offer'));
    }
  };

  return (
    <Form
      id="offer-form"
      className="invoice-form offer-form"
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

        <Form.Item name="offerNumber" label="Offer no.">
          <Input readOnly placeholder="Generated on save" />
        </Form.Item>

        <Form.Item name="status" label="Status">
          <Select options={STATUS_OPTIONS} />
        </Form.Item>

        <Form.Item name="date" label="Offer date">
          <Input type="date" />
        </Form.Item>

        <Form.Item name="validUntil" label="Valid until">
          <Input type="date" />
        </Form.Item>

        <Form.Item name="companyName" label="Customer / company">
          <Input placeholder="Customer company" />
        </Form.Item>

        <Form.Item name="email" label="Email">
          <Input type="email" placeholder="customer@example.com" />
        </Form.Item>

        <Form.Item name="subtitle" label="Subtitle">
          <Input placeholder="Offer subtitle" />
        </Form.Item>

        <Form.Item name="priceText" label="Price">
          <Input placeholder="e.g. 120 000 kr excl. VAT" />
        </Form.Item>
      </div>

      <Form.Item name="description" label="Description">
        <Input.TextArea rows={6} placeholder="Describe the work included in the offer" />
      </Form.Item>

      <Form.Item name="clarifications" label="Clarifications">
        <Input.TextArea rows={5} placeholder="Clarifications, assumptions, exclusions" />
      </Form.Item>

      <Divider orientation="left">Contact persons</Divider>

      <Form.List name="contactPersons">
        {(fields, { add, remove }) => (
          <div className="offer-form__contacts">
            {fields.map(({ key, name, ...restField }) => (
              <Space key={key} className="offer-form__contact" align="start">
                <Form.Item {...restField} name={[name, 'role']} label="Role">
                  <Input placeholder="Projektledare" />
                </Form.Item>
                <Form.Item {...restField} name={[name, 'name']} label="Name">
                  <Input placeholder="Name" />
                </Form.Item>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(name)}
                  disabled={fields.length === 1}
                  aria-label="Remove contact person"
                />
              </Space>
            ))}
            <Button icon={<PlusOutlined />} onClick={() => add(DEFAULT_CONTACT)}>
              Add contact person
            </Button>
          </div>
        )}
      </Form.List>
    </Form>
  );
}
