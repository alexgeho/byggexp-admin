import { useEffect } from 'react';
import { Form, Switch, message } from 'antd';
import { Field, Input, Select, Textarea } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useClientStore } from '@/src/store/clientStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const CLIENT_TYPE_OPTIONS = [
  { value: 'company', label: 'Company' },
  { value: 'private', label: 'Private person' },
];

const PAYMENT_TERMS_OPTIONS = ['10', '20', '30', '40', '50'].map((value) => ({
  value,
  label: `${value} days`,
}));

const normalizePaymentTerms = (value) => {
  const normalized = String(value || '').match(/\d+/)?.[0];
  return PAYMENT_TERMS_OPTIONS.some((option) => option.value === normalized) ? normalized : '30';
};

export default function ClientCreateForm({ onClose, clientToEdit = null }) {
  const [form] = Form.useForm();
  const createClient = useClientStore((state) => state.create);
  const updateClient = useClientStore((state) => state.update);
  const fetchNextNumber = useClientStore((state) => state.fetchNextNumber);
  const user = useAuthStore((state) => state.user);
  const clientType = Form.useWatch('clientType', form);

  useEffect(() => {
    const initForm = async () => {
      if (clientToEdit) {
        form.setFieldsValue({
          ...clientToEdit,
          paymentTerms: normalizePaymentTerms(clientToEdit.paymentTerms),
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
        paymentTerms: '30',
        reverseVAT: false,
      });

      const companyId = user?.companyId;
      if (companyId) {
        const nextNumber = await fetchNextNumber(companyId);
        form.setFieldValue('customerNumber', nextNumber);
      }
    };

    initForm();
  }, [clientToEdit, fetchNextNumber, form, user]);

  const onFinish = async (values) => {
    const companyId = clientToEdit?.companyId || values.companyId || user?.companyId;

    if (!companyId) {
      message.error('Company is not available for this client');
      return;
    }

    const payload = {
      ...values,
      companyId,
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
      className="admin-modal-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">General</h3>
        <div className="admin-modal-form__grid">
          <Field name="clientType" label="Client type">
            <Select options={CLIENT_TYPE_OPTIONS} style={{ width: '100%' }} />
          </Field>

          <Field name="customerNumber" label="Customer no.">
            <Input readOnly />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">
          {clientType === 'private' ? 'Private person' : 'Company details'}
        </h3>
        <div className="admin-modal-form__grid">
          {clientType === 'company' ? (
            <>
              <Field
                name="companyName"
                label="Company name"
                rules={[{ required: true, message: 'Please enter company name' }]}
              >
                <Input placeholder="Company name" />
              </Field>
              <Field name="orgNumber" label="Org. number">
                <Input placeholder="Org. number" />
              </Field>
              <Field name="vatNumber" label="VAT number">
                <Input placeholder="VAT number" />
              </Field>
              <Field name="contactPerson" label="Contact person">
                <Input placeholder="Contact person" />
              </Field>
            </>
          ) : (
            <>
              <Field
                name="firstName"
                label="First name"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input placeholder="First name" />
              </Field>
              <Field
                name="lastName"
                label="Last name"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input placeholder="Last name" />
              </Field>
              <Field name="personalNumber" label="Personal number">
                <Input placeholder="Personal number" />
              </Field>
            </>
          )}
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">Address</h3>
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field name="address" label="Address">
              <Input placeholder="Address" />
            </Field>
          </div>
          <Field name="postalCode" label="Postal code">
            <Input placeholder="Postal code" />
          </Field>
          <Field name="city" label="City">
            <Input placeholder="City" />
          </Field>
          <Field name="country" label="Country">
            <Input placeholder="Country" />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">Contact</h3>
        <div className="admin-modal-form__grid">
          <Field name="email" label="Email">
            <Input type="email" placeholder="Email" />
          </Field>
          <Field name="phone" label="Phone">
            <Input placeholder="Phone" />
          </Field>
          <Field name="mobile" label="Mobile">
            <Input placeholder="Mobile" />
          </Field>
          <Field name="website" label="Website">
            <Input placeholder="Website" />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">Billing</h3>
        <div className="admin-modal-form__grid">
          <Field name="currency" label="Currency">
            <Input placeholder="Currency" />
          </Field>
          <Field name="paymentTerms" label="Payment terms">
            <Select
              placeholder="Select payment terms"
              options={PAYMENT_TERMS_OPTIONS}
              style={{ width: '100%' }}
            />
          </Field>
          <Field name="reverseVAT" label="Reverse VAT" valuePropName="checked">
            <Switch checkedChildren="On" unCheckedChildren="Off" />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field name="notes" label="Notes">
              <Textarea rows={4} placeholder="Notes" />
            </Field>
          </div>
        </div>
      </section>
    </Form>
  );
}
