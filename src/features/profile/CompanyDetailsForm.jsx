'use client';

import { useEffect, useRef, useState } from 'react';
import { Form, Switch, message } from 'antd';
import { BankOutlined, GlobalOutlined } from '@ant-design/icons';
import { Button, Field, Input, Select } from '@/src/ui-kit';
import {
  COUNTRY_OPTIONS, CURRENCY_OPTIONS, DEFAULT_COUNTRY, DEFAULT_CURRENCY,
  defaultCurrencyForCountry, isValidOrgNumber,
} from '@/src/config/markets';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useCompanyStore } from '@/src/store/companyStore';
import { useUserStore } from '@/src/store/userStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';
import { useT } from '@/src/i18n/LanguageProvider';

// The company "sender information" form (logo + details), extracted from
// ProfilePage so it can be reused standalone — e.g. as a focused modal step in
// the onboarding wizard, without dragging in the profile's personal-details and
// reminders sections. `showSubmitButton` renders the form's own Save button
// (profile page); leave it off when an AdminModal footer submits via `formId`.
export default function CompanyDetailsForm({
  onClose,
  showSubmitButton = true,
  formId = 'company-details-form',
}) {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const updateUserInSession = useAuthStore((state) => state.updateUserInSession);
  const isCompanyAdmin = useAuthStore((state) => state.isCompanyAdmin());
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const updateUser = useUserStore((state) => state.update);
  const [companyForm] = Form.useForm();
  const {
    currentCompany, fetchMy, create: createCompany, update: updateCompany, uploadLogo,
  } = useCompanyStore();

  const hasCompany = Boolean(user?.companyId);
  const canManageCompany = isCompanyAdmin || isSuperAdmin;

  const logoInputRef = useRef(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoSrc = currentCompany?.logoUrl
    ? new URL(currentCompany.logoUrl, apiClient.defaults.baseURL).toString()
    : null;

  useEffect(() => {
    if (user?.companyId) fetchMy();
  }, [user, fetchMy]);

  useEffect(() => {
    if (currentCompany) {
      companyForm.setFieldsValue({
        name: currentCompany.name,
        email: currentCompany.email,
        address: currentCompany.address,
        city: currentCompany.city,
        phone: currentCompany.phone,
        website: currentCompany.website,
        orgNumber: currentCompany.orgNumber,
        vatNumber: currentCompany.vatNumber,
        vatStatus: currentCompany.vatStatus,
        bankgiro: currentCompany.bankgiro,
        plusgiro: currentCompany.plusgiro,
        country: currentCompany.country || DEFAULT_COUNTRY,
        currency: currentCompany.currency || DEFAULT_CURRENCY,
      });
    }
  }, [currentCompany, companyForm]);

  const companyCountry = Form.useWatch('country', companyForm) || DEFAULT_COUNTRY;
  const handleCompanyCountryChange = (value) => {
    companyForm.setFieldValue('currency', defaultCurrencyForCountry(value));
  };

  const handleLogoSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingLogo(true);
    try {
      await uploadLogo(user.companyId, file);
      message.success(t('Logo updated'));
    } catch (err) {
      message.error(formatApiError(err, t('Failed to upload logo')));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCompanyFinish = async (values) => {
    try {
      if (hasCompany) {
        await updateCompany(user.companyId, values);
        message.success(t('Company updated'));
        onClose?.();
        return;
      }

      const created = await createCompany(values);
      const companyId = getEntityId(created);
      await updateUser(getEntityId(user), { email: user.email, companyId });
      updateUserInSession({ companyId });
      message.success(t('Company created and linked to your account'));
      onClose?.();
    } catch (err) {
      message.error(formatApiError(err, hasCompany ? t('Failed to update company') : t('Failed to create company')));
    }
  };

  return (
    <>
      {hasCompany && canManageCompany ? (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 96,
              height: 96,
              flex: '0 0 auto',
              borderRadius: 12,
              border: '1px solid var(--border, #e2e8f0)',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="Company logo"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <BankOutlined style={{ fontSize: 28, color: '#94a3b8' }} />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--muted, #64748b)' }}>
              {t('Logo shown on your invoices & offers. PNG/JPG, up to 5 MB.')}
            </span>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleLogoSelect}
            />
            <Button
              variant="secondary"
              disabled={uploadingLogo}
              onClick={() => logoInputRef.current?.click()}
            >
              {uploadingLogo ? t('Uploading…') : logoSrc ? t('Change logo') : t('Upload logo')}
            </Button>
          </div>
        </div>
      ) : null}

      <Form
        id={formId}
        className="admin-modal-form profile-page__form"
        form={companyForm}
        layout="vertical"
        onFinish={handleCompanyFinish}
        disabled={!canManageCompany}
      >
        <div className="admin-modal-form__grid">
          <Field
            name="name"
            label={t('Company name')}
            rules={[{ required: true, message: t('Please enter company name') }]}
          >
            <Input placeholder={t('Company name')} />
          </Field>

          <Field
            name="email"
            label={t('Email')}
            rules={[
              { required: true, message: t('Please enter email') },
              { type: 'email', message: t('Please enter a valid email') },
            ]}
          >
            <Input placeholder={t('Company email')} />
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
            <Input placeholder={companyCountry === 'NO' ? '+47...' : '+46...'} />
          </Field>

          <Field name="website" label={t('Website')}>
            <Input prefix={<GlobalOutlined />} placeholder="https://..." />
          </Field>

          <Field name="country" label={t('Home market')}>
            <Select
              options={COUNTRY_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
              onChange={handleCompanyCountryChange}
              style={{ width: '100%' }}
            />
          </Field>

          <Field name="currency" label={t('Currency')}>
            <Select options={CURRENCY_OPTIONS} style={{ width: '100%' }} />
          </Field>

          <Field
            name="orgNumber"
            label={t('Org no.')}
            rules={[{
              warningOnly: true,
              validator: (_, v) => (isValidOrgNumber(v, companyCountry)
                ? Promise.resolve()
                : Promise.reject(new Error(t('Check the organisation number format')))),
            }]}
          >
            <Input placeholder={t('Org no.')} />
          </Field>

          <Field name="vatNumber" label={t('VAT reg no.')}>
            <Input placeholder={t('VAT reg no.')} />
          </Field>

          <Field name="bankgiro" label={t('Bankgiro')}>
            <Input placeholder="123-4567" />
          </Field>

          <Field name="plusgiro" label={t('Plusgiro')}>
            <Input placeholder="12 34 56-7" />
          </Field>

          <div className="admin-modal-form__grid-item--full">
            <Field name="vatStatus" label={t('F-skatt')} valuePropName="checked">
              <Switch checkedChildren={t('On')} unCheckedChildren={t('Off')} />
            </Field>
          </div>
        </div>

        {showSubmitButton && canManageCompany ? (
          <Button htmlType="submit">{hasCompany ? t('Save changes') : t('Create company')}</Button>
        ) : null}
      </Form>
    </>
  );
}
