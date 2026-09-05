import { useEffect } from 'react';
import { Form, message, Tag } from 'antd';
import {
  BankOutlined,
  FileProtectOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { Button, Field, Input } from '@/src/ui-kit';
import ManagerRemindersCard from '@/src/features/profile/ManagerRemindersCard';
import CompanyDetailsForm from '@/src/features/profile/CompanyDetailsForm';
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
  const { currentCompany, fetchMy } = useCompanyStore();

  const hasCompany = Boolean(user?.companyId);
  const canManageCompany = isCompanyAdmin || isSuperAdmin;

  useEffect(() => {
    if (user?.companyId) {
      fetchMy();
    }
  }, [user, fetchMy]);

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

            <CompanyDetailsForm />
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
