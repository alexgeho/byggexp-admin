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
import { Button, Field, Input } from '@/src/ui-kit';
import ManagerRemindersCard from '@/src/features/profile/ManagerRemindersCard';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useCompanyStore } from '@/src/store/companyStore';
import { useUserStore } from '@/src/store/userStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

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
      message.success('Logo updated');
    } catch (err) {
      message.error(formatApiError(err, 'Failed to upload logo'));
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
      });
    }
  }, [currentCompany, companyForm]);

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

      message.success('Profile updated');
    } catch (err) {
      message.error(formatApiError(err, 'Failed to update profile'));
    }
  };

  const handleCompanyFinish = async (values) => {
    try {
      if (hasCompany) {
        await updateCompany(user.companyId, values);
        message.success('Company updated');
        return;
      }

      const created = await createCompany(values);
      const companyId = getEntityId(created);

      await updateUser(getEntityId(user), { email: user.email, companyId });
      updateUserInSession({ companyId });

      message.success('Company created and linked to your account');
    } catch (err) {
      message.error(formatApiError(err, hasCompany ? 'Failed to update company' : 'Failed to create company'));
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
              {ROLE_LABELS[user?.role] || user?.role}
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
              <h3 className="profile-page__card-title">Your information</h3>
              <p className="profile-page__card-subtitle">Your account and company details</p>
            </div>
          </div>

          <h4 className="profile-page__section-title">Personal details</h4>
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
                  label="Name"
                  initialValue={user?.name}
                  rules={[{ required: true, message: 'Please enter your name' }]}
                >
                  <Input placeholder="Your name" />
                </Field>
              </div>

              <Field
                name="phoneAreaCode"
                label="Phone area code"
                initialValue={user?.phoneAreaCode}
              >
                <Input type="number" placeholder="7" />
              </Field>

              <Field
                name="phoneNumber"
                label="Phone number"
                initialValue={user?.phoneNumber}
              >
                <Input type="number" placeholder="1234567890" />
              </Field>
            </div>

            <Button htmlType="submit">Save changes</Button>
          </Form>

          {hasCompany || isSuperAdmin ? (
            <>
              <div className="profile-page__section-divider" />
              <h4 className="profile-page__section-title">Company details</h4>
              <p className="profile-page__card-subtitle" style={{ margin: '0 0 16px' }}>
                {!hasCompany
                  ? 'Set up your company — used as the sender information on your invoices'
                  : canManageCompany
                    ? 'Used as the sender information on your invoices'
                    : 'Only a company admin can edit these details'}
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
                    Logo shown on your invoices &amp; offers. PNG/JPG, up to 5 MB.
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
                    {uploadingLogo ? 'Uploading…' : logoSrc ? 'Change logo' : 'Upload logo'}
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
                  label="Company name"
                  rules={[{ required: true, message: 'Please enter company name' }]}
                >
                  <Input placeholder="Company name" />
                </Field>

                <Field
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Please enter email' },
                    { type: 'email', message: 'Please enter a valid email' },
                  ]}
                >
                  <Input placeholder="Company email" />
                </Field>

                <div className="admin-modal-form__grid-item--full">
                  <Field
                    name="address"
                    label="Address"
                    rules={[{ required: true, message: 'Please enter address' }]}
                  >
                    <Input placeholder="Address" />
                  </Field>
                </div>

                <Field name="city" label="Postal code / city">
                  <Input placeholder="116 31 Stockholm" />
                </Field>

                <Field name="phone" label="Phone">
                  <Input placeholder="+46..." />
                </Field>

                <Field name="website" label="Website">
                  <Input prefix={<GlobalOutlined />} placeholder="https://..." />
                </Field>

                <Field name="orgNumber" label="Org no.">
                  <Input placeholder="Org no." />
                </Field>

                <Field name="vatNumber" label="VAT reg no.">
                  <Input placeholder="VAT reg no." />
                </Field>

                <div className="admin-modal-form__grid-item--full">
                  <Field name="vatStatus" label="F-skatt" valuePropName="checked">
                    <Switch checkedChildren="On" unCheckedChildren="Off" />
                  </Field>
                </div>
              </div>

              {canManageCompany ? (
                <Button htmlType="submit">{hasCompany ? 'Save changes' : 'Create company'}</Button>
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
              <h3 className="profile-page__card-title">Juridik</h3>
              <p className="profile-page__card-subtitle">Integritetspolicy &amp; villkor</p>
            </div>
          </div>
          <div className="profile-page__legal-links">
            <a href="/legal/integritetspolicy" target="_blank" rel="noreferrer">Integritetspolicy</a>
            <a href="/legal/villkor" target="_blank" rel="noreferrer">Användarvillkor</a>
            <a href="/legal/underbitraden" target="_blank" rel="noreferrer">Underbiträden</a>
            <a href="/legal/dpa" target="_blank" rel="noreferrer">Personuppgiftsbiträdesavtal</a>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
