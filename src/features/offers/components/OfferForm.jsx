import { useEffect, useMemo, useState } from 'react';
import { Button, Divider, Form, Input, InputNumber, Select, Space, message } from 'antd';
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

const DEFAULT_ITEM = {
  description: '',
  quantity: 1,
  unit: 'st',
  price: 0,
  discount: 0,
  vatRate: 25,
};

const getRowAmount = (item) => {
  const quantity = Number(item?.quantity || 0);
  const price = Number(item?.price || 0);
  const discount = Number(item?.discount || 0);
  return quantity * price * (1 - discount / 100);
};

const calculateTotals = (items = []) => {
  let subtotal = 0;
  let vat = 0;
  items.forEach((item) => {
    const net = getRowAmount(item);
    subtotal += net;
    vat += net * (Number(item?.vatRate ?? 25) / 100);
  });
  return { subtotal, vat, total: subtotal + vat };
};

const formatAmount = (value) => new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value || 0);

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
  const watchedItems = Form.useWatch('items', form);
  const totals = useMemo(() => calculateTotals(watchedItems || []), [watchedItems]);

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
          items: offerToEdit.items?.length ? offerToEdit.items : [DEFAULT_ITEM],
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
        items: [DEFAULT_ITEM],
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
      description: emptyToUndefined(values.description),
      clarifications: emptyToUndefined(values.clarifications),
      contactPersons: (values.contactPersons || [])
        .map((contact) => ({
          role: emptyToUndefined(contact.role) || '',
          name: emptyToUndefined(contact.name) || '',
        }))
        .filter((contact) => contact.role || contact.name),
      items: (values.items || []).map((item) => ({
        ...DEFAULT_ITEM,
        ...item,
        description: emptyToUndefined(item?.description) || '',
        unit: emptyToUndefined(item?.unit) || 'st',
      })),
      subtotal: totals.subtotal,
      vat: totals.vat,
      total: totals.total,
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
      </div>

      <Form.Item name="description" label="Description">
        <Input.TextArea rows={6} placeholder="Describe the work included in the offer" />
      </Form.Item>

      <Divider orientation="left">Offer rows</Divider>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <div className="invoice-form__items">
            <div className="invoice-form__items-scroll">
              {fields.map(({ key, name, ...restField }) => (
                <div className="invoice-form__item offer-form__item" key={key}>
                  <Form.Item
                    {...restField}
                    className="invoice-form__description"
                    name={[name, 'description']}
                    label="Description"
                    rules={[{ required: true, message: 'Please enter description' }]}
                  >
                    <Input.TextArea rows={1} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'quantity']} label="Qty">
                    <InputNumber min={0} precision={2} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'unit']} label="Unit">
                    <Input />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'price']} label="À-price">
                    <InputNumber min={0} precision={2} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'discount']} hidden>
                    <InputNumber min={0} max={100} precision={2} />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, 'vatRate']} hidden>
                    <InputNumber />
                  </Form.Item>
                  <Form.Item label="Amount">
                    <InputNumber
                      value={getRowAmount(watchedItems?.[name])}
                      precision={2}
                      disabled
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => remove(name)}
                    disabled={fields.length === 1}
                    aria-label="Remove offer row"
                  />
                </div>
              ))}
            </div>
            <Button icon={<PlusOutlined />} onClick={() => add(DEFAULT_ITEM)}>
              Add row
            </Button>
          </div>
        )}
      </Form.List>

      <div className="invoice-form__totals">
        <Space size="large" wrap className="invoice-form__totals-content">
          <strong>Excl. VAT: {formatAmount(totals.subtotal)}</strong>
          <strong>VAT: {formatAmount(totals.vat)}</strong>
          <strong>Total: {formatAmount(totals.total)}</strong>
        </Space>
      </div>

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
