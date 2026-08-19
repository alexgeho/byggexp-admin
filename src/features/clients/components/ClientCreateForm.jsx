import { useEffect } from 'react';
import { Form, Switch, message } from 'antd';
import { Field, Input, Select, Textarea } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useClientStore } from '@/src/store/clientStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';
import { useCompanyCountry } from '@/src/hooks/useActiveCompany';
import { isValidOrgNumber, isValidNationalId, defaultCurrencyForCountry } from '@/src/config/markets';

const CLIENT_TYPE_OPTIONS = [
  { value: 'company', label: 'Business' },
  { value: 'private', label: 'Private person' },
];

const PAYMENT_TERMS_VALUES = ['10', '20', '30', '40', '50'];

const CURRENCY_OPTIONS = [
  { value: 'SEK', label: 'SEK - Svensk krona' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'NOK', label: 'NOK - Norsk krone' },
  { value: 'DKK', label: 'DKK - Dansk krone' },
];

const normalizePaymentTerms = (value) => {
  const normalized = String(value || '').match(/\d+/)?.[0];
  return PAYMENT_TERMS_VALUES.includes(normalized) ? normalized : '30';
};

export default function ClientCreateForm({ onClose, clientToEdit = null }) {
  const [form] = Form.useForm();
  const t = useT();
  const country = useCompanyCountry();
  const createClient = useClientStore((state) => state.create);
  const updateClient = useClientStore((state) => state.update);
  const fetchNextNumber = useClientStore((state) => state.fetchNextNumber);
  const user = useAuthStore((state) => state.user);
  const clientType = Form.useWatch('clientType', form);

  const clientTypeOptions = CLIENT_TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }));
  const paymentTermsOptions = PAYMENT_TERMS_VALUES.map((value) => ({
    value,
    label: `${value} ${t('days net')}`,
  }));

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
        country: country === 'NO' ? 'Norge' : 'Sverige',
        currency: defaultCurrencyForCountry(country),
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
  }, [clientToEdit, fetchNextNumber, form, user, country]);

  const onFinish = async (values) => {
    const companyId = clientToEdit?.companyId || values.companyId || user?.companyId;

    if (!companyId) {
      message.error(t('Company is not available for this client'));
      return;
    }

    const payload = {
      ...values,
      companyId,
      hourlyRate: Number(values.hourlyRate) || 0,
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
      message.error(formatApiError(err, t('Failed to save client')));
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
        <h3 className="admin-modal-form__section-title">{t('General')}</h3>
        <div className="admin-modal-form__grid">
          <Field name="clientType" label={t('Client type')}>
            <Select options={clientTypeOptions} style={{ width: '100%' }} />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">
          {clientType === 'private' ? t('Private person') : t('Business')}
        </h3>
        <div className="admin-modal-form__grid">
          {clientType === 'company' ? (
            <>
              <Field
                name="companyName"
                label={`${t('Company name')} *`}
                rules={[{ required: true, message: t('Please enter company name') }]}
              >
                <Input placeholder={t('Company name')} />
              </Field>
              <Field name="customerNumber" label={t('Customer no.')}>
                <Input readOnly />
              </Field>
              <Field
                name="orgNumber"
                label={t('Org no.')}
                rules={[{
                  warningOnly: true,
                  validator: (_, v) => (isValidOrgNumber(v, country)
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('Check the organisation number format')))),
                }]}
              >
                <Input placeholder={t('Org no.')} />
              </Field>
              <Field name="vatNumber" label={t('VAT reg no.')}>
                <Input placeholder={t('VAT reg no.')} />
              </Field>
              <Field name="contactPerson" label={t('Contact person')}>
                <Input placeholder={t('Contact person')} />
              </Field>
            </>
          ) : (
            <>
              <Field
                name="firstName"
                label={`${t('First name')} *`}
                rules={[{ required: true, message: t('Please enter first name') }]}
              >
                <Input placeholder={t('First name')} />
              </Field>
              <Field
                name="lastName"
                label={`${t('Last name')} *`}
                rules={[{ required: true, message: t('Please enter last name') }]}
              >
                <Input placeholder={t('Last name')} />
              </Field>
              <Field
                name="personalNumber"
                label={t('Personnummer')}
                rules={[{
                  warningOnly: true,
                  validator: (_, v) => (isValidNationalId(v, country)
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('Check the ID number format')))),
                }]}
              >
                <Input placeholder={t('Personnummer')} />
              </Field>
              <Field name="customerNumber" label={t('Customer no.')}>
                <Input readOnly />
              </Field>
            </>
          )}
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">{t('Address')}</h3>
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field name="address" label={t('Address')}>
              <Input placeholder={t('Address')} />
            </Field>
          </div>
          <Field name="postalCode" label={t('Postal code')}>
            <Input placeholder={t('Postal code')} />
          </Field>
          <Field name="city" label={t('City')}>
            <Input placeholder={t('City')} />
          </Field>
          <Field name="country" label={t('Country')}>
            <Input placeholder={t('Country')} />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">{t('Contact')}</h3>
        <div className="admin-modal-form__grid">
          <Field name="email" label={t('Email')}>
            <Input type="email" placeholder={t('Email')} />
          </Field>
          <Field name="phone" label={t('Phone')}>
            <Input placeholder={t('Phone')} />
          </Field>
          <Field name="mobile" label={t('Mobile')}>
            <Input placeholder={t('Mobile')} />
          </Field>
          <Field name="website" label={t('Website')}>
            <Input placeholder={t('Website')} />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">{t('Payment')}</h3>
        <div className="admin-modal-form__grid">
          <Field name="paymentTerms" label={t('Payment terms')}>
            <Select
              placeholder={t('Select payment terms')}
              options={paymentTermsOptions}
              style={{ width: '100%' }}
            />
          </Field>
          <Field name="currency" label={t('Currency')}>
            <Select
              placeholder={t('Select currency')}
              options={CURRENCY_OPTIONS}
              style={{ width: '100%' }}
            />
          </Field>
          <Field name="discount" label={t('Customer discount %')}>
            <Input placeholder="0" />
          </Field>
          <Field name="hourlyRate" label={t('Hourly rate — billed (SEK)')}>
            <Input type="number" min={0} placeholder="0" />
          </Field>
          <Field name="reverseVAT" label={t('Reverse VAT liability')} valuePropName="checked">
            <Switch checkedChildren={t('On')} unCheckedChildren={t('Off')} />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field name="notes" label={t('Notes')}>
              <Textarea rows={4} placeholder={t('Internal notes')} />
            </Field>
          </div>
        </div>
      </section>
    </Form>
  );
}
