import { useEffect } from 'react';
import { Form, Switch, message } from 'antd';
import { Field, Input, Select, Textarea } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useClientStore } from '@/src/store/clientStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const CLIENT_TYPE_OPTIONS = [
  { value: 'company', label: 'Företag' },
  { value: 'private', label: 'Privatperson' },
];

const PAYMENT_TERMS_OPTIONS = ['10', '20', '30', '40', '50'].map((value) => ({
  value,
  label: `${value} dagar netto`,
}));

const CURRENCY_OPTIONS = [
  { value: 'SEK', label: 'SEK - Svensk krona' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'NOK', label: 'NOK - Norsk krone' },
  { value: 'DKK', label: 'DKK - Dansk krone' },
];

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
        discount: '0',
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
        <h3 className="admin-modal-form__section-title">Allmänt</h3>
        <div className="admin-modal-form__grid">
          <Field name="clientType" label="Kundtyp">
            <Select options={CLIENT_TYPE_OPTIONS} style={{ width: '100%' }} />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">
          {clientType === 'private' ? 'Privatperson' : 'Företag'}
        </h3>
        <div className="admin-modal-form__grid">
          {clientType === 'company' ? (
            <>
              <Field
                name="companyName"
                label="Företagsnamn *"
                rules={[{ required: true, message: 'Ange företagsnamn' }]}
              >
                <Input placeholder="Företagsnamn" />
              </Field>
              <Field name="customerNumber" label="Kundnr">
                <Input readOnly />
              </Field>
              <Field name="orgNumber" label="Org.nummer">
                <Input placeholder="Org.nummer" />
              </Field>
              <Field name="vatNumber" label="Moms nr (VAT)">
                <Input placeholder="Moms nr (VAT)" />
              </Field>
              <Field name="contactPerson" label="Kontaktperson">
                <Input placeholder="Kontaktperson" />
              </Field>
            </>
          ) : (
            <>
              <Field
                name="firstName"
                label="Förnamn *"
                rules={[{ required: true, message: 'Ange förnamn' }]}
              >
                <Input placeholder="Förnamn" />
              </Field>
              <Field
                name="lastName"
                label="Efternamn *"
                rules={[{ required: true, message: 'Ange efternamn' }]}
              >
                <Input placeholder="Efternamn" />
              </Field>
              <Field name="personalNumber" label="Personnummer">
                <Input placeholder="Personnummer" />
              </Field>
              <Field name="customerNumber" label="Kundnr">
                <Input readOnly />
              </Field>
            </>
          )}
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">Adress</h3>
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field name="address" label="Adress">
              <Input placeholder="Adress" />
            </Field>
          </div>
          <Field name="postalCode" label="Postnummer">
            <Input placeholder="Postnummer" />
          </Field>
          <Field name="city" label="Ort">
            <Input placeholder="Ort" />
          </Field>
          <Field name="country" label="Land">
            <Input placeholder="Land" />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">Kontakt</h3>
        <div className="admin-modal-form__grid">
          <Field name="email" label="E-post">
            <Input type="email" placeholder="E-post" />
          </Field>
          <Field name="phone" label="Telefon">
            <Input placeholder="Telefon" />
          </Field>
          <Field name="mobile" label="Mobil">
            <Input placeholder="Mobil" />
          </Field>
          <Field name="website" label="Webbplats">
            <Input placeholder="Webbplats" />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">Betalning</h3>
        <div className="admin-modal-form__grid">
          <Field name="paymentTerms" label="Betalningsvillkor">
            <Select
              placeholder="Välj betalningsvillkor"
              options={PAYMENT_TERMS_OPTIONS}
              style={{ width: '100%' }}
            />
          </Field>
          <Field name="currency" label="Valuta">
            <Select
              placeholder="Välj valuta"
              options={CURRENCY_OPTIONS}
              style={{ width: '100%' }}
            />
          </Field>
          <Field name="discount" label="Kundrabatt %">
            <Input placeholder="0" />
          </Field>
          <Field name="reverseVAT" label="Omvänd skattskyldighet" valuePropName="checked">
            <Switch checkedChildren="On" unCheckedChildren="Off" />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field name="notes" label="Anteckningar">
              <Textarea rows={4} placeholder="Interna anteckningar..." />
            </Field>
          </div>
        </div>
      </section>
    </Form>
  );
}
