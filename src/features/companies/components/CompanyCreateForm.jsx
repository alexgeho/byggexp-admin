import { Form, Switch, message } from 'antd';
import { useEffect } from 'react';
import { Field, Input, Select } from '@/src/ui-kit';
import { useCompanyStore } from '@/src/store/companyStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';
import { useT } from '@/src/i18n/LanguageProvider';
import {
  COUNTRY_OPTIONS, DEFAULT_COUNTRY, DEFAULT_CURRENCY,
  defaultCurrencyForCountry, isValidOrgNumber,
} from '@/src/config/markets';

export default function CompanyCreateForm({ onClose, companyToEdit = null }) {
  const t = useT();
  const [form] = Form.useForm();
  const createCompany = useCompanyStore((state) => state.create);
  const updateCompany = useCompanyStore((state) => state.update);
  const country = Form.useWatch('country', form) || DEFAULT_COUNTRY;

  useEffect(() => {
    if (companyToEdit) {
      form.setFieldsValue({
        name: companyToEdit.name,
        address: companyToEdit.address,
        email: companyToEdit.email,
        city: companyToEdit.city,
        phone: companyToEdit.phone,
        website: companyToEdit.website,
        orgNumber: companyToEdit.orgNumber,
        vatNumber: companyToEdit.vatNumber,
        vatStatus: companyToEdit.vatStatus,
        country: companyToEdit.country || DEFAULT_COUNTRY,
        currency: companyToEdit.currency || DEFAULT_CURRENCY,
      });
      return;
    }

    form.resetFields();
    form.setFieldsValue({ country: DEFAULT_COUNTRY, currency: DEFAULT_CURRENCY });
  }, [companyToEdit, form]);

  // When the market changes, snap the currency to that market's default so the
  // common case (Sweden→SEK, Norway→NOK) needs no extra click. Users can still
  // override the currency afterwards.
  const handleCountryChange = (value) => {
    form.setFieldValue('currency', defaultCurrencyForCountry(value));
  };

  const onFinish = async (values) => {
    try {
      if (companyToEdit) {
        const companyId = getEntityId(companyToEdit);
        if (!companyId) {
          throw new Error('Company id is missing');
        }
        await updateCompany(companyId, {
          name: values.name,
          address: values.address,
          email: values.email,
          city: values.city,
          phone: values.phone,
          website: values.website,
          orgNumber: values.orgNumber,
          vatNumber: values.vatNumber,
          vatStatus: values.vatStatus,
          country: values.country,
          currency: defaultCurrencyForCountry(values.country),
        });
        message.success(t('Company updated'));
      } else {
        await createCompany({ ...values, currency: defaultCurrencyForCountry(values.country) });
        message.success(`Company created — login details emailed to ${values.email}`);
      }
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(formatApiError(error, t('Failed to save company')));
    }
  };

  return (
    <Form
      className="admin-modal-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
      id="company-create-form"
    >
      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <Field
            name="email"
            label={t('Email (login)')}
            rules={[
              { required: true, message: t('Please enter email') },
              { type: 'email', message: t('Please enter a valid email') },
            ]}
          >
            <Input placeholder={t('Company email')} />
          </Field>

          <Field name="name" label={t('Company name')}>
            <Input placeholder={t('Company name')} />
          </Field>

          <div className="admin-modal-form__grid-item--full">
            <Field name="address" label={t('Address')}>
              <Input placeholder={t('Address')} />
            </Field>
          </div>

          <Field name="city" label={t('Postal code / city')}>
            <Input placeholder="116 31 Stockholm" />
          </Field>

          <Field name="phone" label={t('Phone')}>
            <Input placeholder={country === 'NO' ? '+47...' : '+46...'} />
          </Field>

          <Field name="website" label={t('Website')}>
            <Input placeholder="https://..." />
          </Field>

          <Field name="country" label={t('Home market')}>
            <Select
              options={COUNTRY_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
              onChange={handleCountryChange}
              style={{ width: '100%' }}
            />
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

          <Field name="vatStatus" label={t('F-skatt')} valuePropName="checked">
            <Switch checkedChildren={t('On')} unCheckedChildren={t('Off')} />
          </Field>
        </div>
      </section>
    </Form>
  );
}
