import { useEffect } from 'react';
import { Form, message, Tag } from 'antd';
import {
  BankOutlined,
  GlobalOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { Button, Field, Input } from '@/src/ui-kit';
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
  const { currentCompany, fetchMy, create: createCompany, update: updateCompany } = useCompanyStore();

  const hasCompany = Boolean(user?.companyId);
  const canManageCompany = isCompanyAdmin || isSuperAdmin;

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
        <div className="profile-page__card">
          <div className="profile-page__card-header">
            <IdcardOutlined className="profile-page__card-icon" />
            <div>
              <h3 className="profile-page__card-title">Personal information</h3>
              <p className="profile-page__card-subtitle">Your name and contact number</p>
            </div>
          </div>

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
        </div>

        {hasCompany || isSuperAdmin ? (
          <div className="profile-page__card">
            <div className="profile-page__card-header">
              <BankOutlined className="profile-page__card-icon" />
              <div>
                <h3 className="profile-page__card-title">Company details</h3>
                <p className="profile-page__card-subtitle">
                  {!hasCompany
                    ? 'Set up your company — used as the sender information on your invoices'
                    : canManageCompany
                      ? 'Used as the sender information on your invoices'
                      : 'Only a company admin can edit these details'}
                </p>
              </div>
            </div>

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
                  <Field name="vatStatus" label="VAT status">
                    <Input placeholder="Godkänd för F-skatt" />
                  </Field>
                </div>
              </div>

              {canManageCompany ? (
                <Button htmlType="submit">{hasCompany ? 'Save changes' : 'Create company'}</Button>
              ) : null}
            </Form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
