import { useEffect, useState } from 'react';
import { Form, Switch, message } from 'antd';
import { Field, Input, Select, Textarea, Button, Segmented } from '@/src/ui-kit';
import { useAuthStore } from '@/src/store/authStore';
import { useClientStore } from '@/src/store/clientStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatApiError } from '@/src/utils/formError';
import { useCompanyCountry } from '@/src/hooks/useActiveCompany';
import { isValidOrgNumber, isValidNationalId, defaultCurrencyForCountry } from '@/src/config/markets';
import useWizardDraft from '@/src/shared/hooks/useWizardDraft';

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

// Create is a short guided wizard (mirrors the add-employee flow): identity
// first, then how to reach them, then billing. Edit stays a single form.
const LAST_STEP = 2;
const STEPS = [
  { key: 'details', label: 'Details' },
  { key: 'address', label: 'Address' },
  { key: 'payment', label: 'Payment' },
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
  const isCreate = !clientToEdit;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

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
      setStep(0);
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

  // Persist create-wizard progress locally so closing mid-way doesn't lose it.
  // Declared after init so its restore runs after the reset/defaults above.
  const draft = useWizardDraft({
    storageKey: 'byggexp.wizard.client',
    form,
    enabled: isCreate,
    setStep,
  });

  const onFinish = async (values) => {
    // In the create wizard, submitting (Next / Enter) advances a step until the
    // last one; only then do we actually create the client.
    if (isCreate && step < LAST_STEP) {
      setStep(step + 1);
      draft.save(step + 1);
      return;
    }

    // onFinish only carries the currently-mounted step; pull earlier wizard
    // steps (company name / identity on step 1, etc.) too.
    values = { ...form.getFieldsValue(true), ...values };

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
      setSubmitting(true);
      if (clientToEdit) {
        await updateClient(getEntityId(clientToEdit), payload);
      } else {
        await createClient(payload);
        draft.clear();
      }

      onClose();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, t('Failed to save client')));
    } finally {
      setSubmitting(false);
    }
  };

  // --- Sections (shared by the edit form and the create wizard) --------------
  const generalSection = (
    <section className="admin-modal-form__section">
      <h3 className="admin-modal-form__section-title">{t('General')}</h3>
      <div className="admin-modal-form__grid">
        <Field name="clientType" label={t('Client type')}>
          <Select options={clientTypeOptions} style={{ width: '100%' }} />
        </Field>
      </div>
    </section>
  );

  const identitySection = (
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
  );

  const addressSection = (
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
  );

  const contactSection = (
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
  );

  const paymentSection = (
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
  );

  const notesSection = (
    <section className="admin-modal-form__section">
      <div className="admin-modal-form__grid">
        <div className="admin-modal-form__grid-item--full">
          <Field name="notes" label={t('Notes')}>
            <Textarea rows={4} placeholder={t('Internal notes')} />
          </Field>
        </div>
      </div>
    </section>
  );

  // --- Edit: the original single, full form ----------------------------------
  if (!isCreate) {
    return (
      <Form
        id="client-create-form"
        className="admin-modal-form"
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        {generalSection}
        {identitySection}
        {addressSection}
        {contactSection}
        {paymentSection}
        {notesSection}
      </Form>
    );
  }

  // --- Create: the 3-step wizard ---------------------------------------------
  const stepBody = [
    <>{generalSection}{identitySection}</>,
    <>{addressSection}{contactSection}</>,
    <>{paymentSection}{notesSection}</>,
  ];

  return (
    <Form
      id="client-create-form"
      className="admin-modal-form admin-modal-form--wizard"
      form={form}
      layout="vertical"
      onFinish={onFinish}
      onValuesChange={() => draft.save(step)}
    >
      <Segmented
        className="admin-modal-form__steps"
        size="sm"
        value={step}
        onChange={(next) => {
          // Allow jumping back to a completed step; go forward only via Next.
          if (next < step) { setStep(next); draft.save(next); }
        }}
        options={STEPS.map((s, i) => ({ value: i, label: `${i + 1}. ${t(s.label)}` }))}
      />

      {stepBody[step]}

      <div className="admin-modal-form__wizard-nav">
        <Button
          variant="secondary"
          onClick={step === 0
            ? () => { draft.clear(); onClose(); }
            : () => { setStep(step - 1); draft.save(step - 1); }}
        >
          {step === 0 ? t('Cancel') : t('Back')}
        </Button>
        {/* One stable button (never htmlType="submit") so advancing a step can't
            swap in a submit button under the same click and auto-submit. */}
        <Button variant="primary" htmlType="button" loading={submitting} onClick={() => form.submit()}>
          {step < LAST_STEP ? t('Next') : t('Save client')}
        </Button>
      </div>
    </Form>
  );
}
