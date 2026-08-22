import { useEffect, useRef, useState } from 'react';
import { Form, Switch, message, Tag } from 'antd';
import {
  BankOutlined,
  FileProtectOutlined,
  GlobalOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { Button, Field, Input, Select } from '@/src/ui-kit';
import {
  COUNTRY_OPTIONS, CURRENCY_OPTIONS, DEFAULT_COUNTRY, DEFAULT_CURRENCY,
  defaultCurrencyForCountry, isValidOrgNumber,
} from '@/src/config/markets';
import ManagerRemindersCard from '@/src/features/profile/ManagerRemindersCard';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useCompanyStore } from '@/src/store/companyStore';
import { useUserStore } from '@/src/store/userStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';
import { useT } from '@/src/i18n/LanguageProvider';

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  companyAdmin: 'Company Admin',
  projectAdmin: 'Project Admin',
  worker: 'Worker',
};

const getRoleColor = (role) => {
  const colorMap = {
    superadmin: 'red',
    companyAdmin: 'orange',
    projectAdmin: 'blue',
    worker: 'green',
  };
  return colorMap[role] || 'default';
};

export default function ProfilePage() {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const updateUserInSession = useAuthStore((state) => state.updateUserInSession);
  const isCompanyAdmin = useAuthStore((state) => state.isCompanyAdmin());
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const updateUser = useUserStore((state) => state.update);
  const [profileForm] = Form.useForm();
  const [companyForm] = Form.useForm();
  const { currentCompany, fetchMy, create: createCompany, update: updateCompany, uploadLogo } = useCompanyStore();

  const hasCompany = Boolean(user?.companyId);
  const canManageCompany = isCompanyAdmin || isSuperAdmin;

  const logoInputRef = useRef(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoSrc = currentCompany?.logoUrl
    ? new URL(currentCompany.logoUrl, apiClient.defaults.baseURL).toString()
    : null;

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

  useEffect(() => {
    if (user?.companyId) {
      fetchMy();
    }
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

  const handleProfileFinish = async (values) => {
    try {
      const updated = await updateUser(getEntityId(user), {
        email: user.email,
        name: values.name,
        phoneAreaCode: values.phoneAreaCode,
        phoneNumber: values.phoneNumber,
      });

      updateUserInSession({
        name: updated.name,
        phoneAreaCode: updated.phoneAreaCode,
        phoneNumber: updated.phoneNumber,
      });

      message.success(t('Profile updated'));
    } catch (err) {
      message.error(formatApiError(err, t('Failed to update profile')));
    }
  };

  const handleCompanyFinish = async (values) => {
    try {
      if (hasCompany) {
        await updateCompany(user.companyId, values);
        message.success(t('Company updated'));
        return;
      }

      const created = await createCompany(values);
      const companyId = getEntityId(created);

      await updateUser(getEntityId(user), { email: user.email, companyId });
      updateUserInSession({ companyId });

      message.success(t('Company created and linked to your account'));
    } catch (err) {
      message.error(formatApiError(err, hasCompany ? t('Failed to update company') : t('Failed to create company')));
    }
  };

  const displayName = user?.name || user?.email || 'User';
  const phoneDisplay = user?.phoneAreaCode && user?.phoneNumber
    ? `+${user.phoneAreaCode} ${user.phoneNumber}`
    : null;

  return (
    <div className="profile-page">
      <div className="profile-page__hero">
        <div className="profile-page__avatar">
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div className="profile-page__hero-body">
          <div className="profile-page__hero-name-row">
            <h2 className="profile-page__hero-name">{displayName}</h2>
            <Tag className="pill-tag" color={getRoleColor(user?.role)}>
              {ROLE_LABELS[user?.role] ? t(ROLE_LABELS[user?.role]) : user?.role}
            </Tag>
          </div>

          <div className="profile-page__hero-meta">
            <span className="profile-page__hero-meta-item">
              <MailOutlined /> {user?.email}
            </span>
            {phoneDisplay ? (
              <span className="profile-page__hero-meta-item">
                <PhoneOutlined /> {phoneDisplay}
              </span>
            ) : null}
            {currentCompany?.name ? (
              <span className="profile-page__hero-meta-item">
                <BankOutlined /> {currentCompany.name}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="profile-page__grid">
        {/* LEFT — Your information: personal details + company in one card */}
        <div className="profile-page__card">
          <div className="profile-page__card-header">
            <IdcardOutlined className="profile-page__card-icon" />
            <div>
              <h3 className="profile-page__card-title">{t('Your information')}</h3>
              <p className="profile-page__card-subtitle">{t('Your account and company details')}</p>
            </div>
          </div>

          <h4 className="profile-page__section-title">{t('Personal details')}</h4>
          <Form
            className="admin-modal-form profile-page__form"
            form={profileForm}
            layout="vertical"
            onFinish={handleProfileFinish}
          >
            <div className="admin-modal-form__grid">
              <div className="admin-modal-form__grid-item--full">
                <Field
                  name="name"
                  label={t('Name')}
                  initialValue={user?.name}
                  rules={[{ required: true, message: t('Please enter your name') }]}
                >
                  <Input placeholder={t('Your name')} />
                </Field>
              </div>

              <div className="admin-modal-form__grid-item--full" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: '0 0 120px' }}>
                  <Field
                    name="phoneAreaCode"
                    label={t('Phone area code')}
                    initialValue={user?.phoneAreaCode}
                  >
                    <Input type="number" placeholder={currentCompany?.country === 'NO' ? '+47' : '+46'} />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field
                    name="phoneNumber"
                    label={t('Phone number')}
                    initialValue={user?.phoneNumber}
                  >
                    <Input type="number" placeholder="1234567890" />
                  </Field>
                </div>
              </div>
            </div>

            <Button htmlType="submit">{t('Save changes')}</Button>
          </Form>

          {hasCompany || isSuperAdmin ? (
            <>
              <div className="profile-page__section-divider" />
              <h4 className="profile-page__section-title">{t('Company details')}</h4>
              <p className="profile-page__card-subtitle" style={{ margin: '0 0 16px' }}>
                {!hasCompany
                  ? t('Set up your company — used as the sender information on your invoices')
                  : canManageCompany
                    ? t('Used as the sender information on your invoices')
                    : t('Only a company admin can edit these details')}
              </p>

            {hasCompany && canManageCompany ? (
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
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
                  <Field
                    name="address"
                    label={t('Address')}
                    rules={[{ required: true, message: t('Please enter address') }]}
                  >
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

              {canManageCompany ? (
                <Button htmlType="submit">{hasCompany ? t('Save changes') : t('Create company')}</Button>
              ) : null}
            </Form>
            </>
          ) : null}
        </div>

        {/* RIGHT — reminders + legal, stacked as one column */}
        <div className="profile-page__col">
          {isCompanyAdmin || isSuperAdmin ? <ManagerRemindersCard /> : null}

          <div className="profile-page__card">
          <div className="profile-page__card-header">
            <FileProtectOutlined className="profile-page__card-icon" />
            <div>
              <h3 className="profile-page__card-title">{t('Legal')}</h3>
              <p className="profile-page__card-subtitle">{t('Privacy & terms')}</p>
            </div>
          </div>
          <div className="profile-page__legal-links">
            <a href="/legal/integritetspolicy" target="_blank" rel="noreferrer">{t('Privacy policy')}</a>
            <a href="/legal/villkor" target="_blank" rel="noreferrer">{t('Terms of use')}</a>
            <a href="/legal/underbitraden" target="_blank" rel="noreferrer">{t('Subprocessors')}</a>
            <a href="/legal/dpa" target="_blank" rel="noreferrer">{t('Data processing agreement')}</a>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
