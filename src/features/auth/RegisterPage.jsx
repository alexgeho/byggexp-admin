import { useEffect, useState } from 'react';
import { App, Form, Input, Button } from 'antd';
import { BankOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import {
  getRedirectPathForUser,
  registerCompanyWithCredentials,
  useAuthStore,
} from '@/src/store/authStore';
import { useNavigate, Link } from '@/src/shared/routing/routerCompat';
import { useT } from '@/src/i18n/LanguageProvider';
import { readSignupSource } from '@/src/shared/signupSource';

// Plans a visitor may pick on the website (?plan=…). Absent = full trial.
const SIGNUP_PLANS = ['egenkontroll'];

// Self-serve sign-up. Step 1 here: company + name + email. The backend emails a
// confirmation link; the person chooses a password on that page and the
// company is created (14-day trial, or the picked plan). Superadmin can still
// create companies manually in /admin/companies.
export default function RegisterPage() {
  const { message } = App.useApp();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const navigate = useNavigate();
  // Read on the client (no useSearchParams → no Suspense needed for prerender).
  const [plan, setPlan] = useState(undefined);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('plan');
    if (SIGNUP_PLANS.includes(p)) setPlan(p);
  }, []);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (hasHydrated && user) {
      navigate(getRedirectPathForUser(user), { replace: true });
    }
  }, [hasHydrated, navigate, user]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const data = await registerCompanyWithCredentials({
        companyName: values.companyName,
        userName: values.userName,
        email: values.email,
        plan,
        source: readSignupSource(),
      });
      setSentTo(data.email || values.email);
    } catch (err) {
      message.error(err.message || t('Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    // Equal spacing between the three lines of this short confirmation.
    return (
      <div className="auth-page">
        <div className="login-card">
          <p className="login-card-welcome" style={{ margin: '0 0 12px' }}><MailOutlined /> {t('Check your inbox')}</p>
          <h1 className="login-card-heading" style={{ margin: '0 0 12px' }}>{t('Confirm your email')}</h1>
          <p style={{ margin: 0, color: '#475569' }}>
            {t('We sent a link to')} <strong>{sentTo}</strong>.{' '}
            {t('Open it and choose a password — then you can start right away.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="login-card">
        <div className="login-card-header">
          <p className="login-card-welcome">
            {plan === 'egenkontroll' ? t('ByggExp Egenkontroll') : t('Get started')}
          </p>
          <h1 className="login-card-heading">
            {plan === 'egenkontroll' ? t('Egenkontroll that fills itself in') : t('Create your company')}
          </h1>
          <p style={{ margin: '12px 0 0', color: '#475569' }}>
            {t('After confirming your email and choosing a password, work on the web or in the app (iPhone and Android).')}
          </p>
        </div>

        <Form className="auth-form" onFinish={onFinish} layout="vertical" requiredMark={false}>
          <Form.Item
            name="companyName"
            label={t('Company name')}
            rules={[{ required: true, message: t('Please enter your company name') }]}
          >
            <Input prefix={<BankOutlined className="auth-field-icon" />} placeholder="Bygg AB" />
          </Form.Item>

          <Form.Item
            name="userName"
            label={t('Your name')}
            rules={[{ required: true, message: t('Please enter your name') }]}
          >
            <Input prefix={<UserOutlined className="auth-field-icon" />} placeholder={t('First and last name')} />
          </Form.Item>

          <Form.Item
            name="email"
            label={t('Work email')}
            rules={[
              { required: true, message: t('Please enter your email') },
              { type: 'email', message: t('Please enter a valid email') },
            ]}
          >
            <Input
              prefix={<MailOutlined className="auth-field-icon" />}
              placeholder="namn@foretag.se"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item className="auth-form-submit">
            <Button type="primary" htmlType="submit" loading={loading} block className="auth-form-button">
              {plan === 'egenkontroll' ? t('Start free') : t('Create company')}
            </Button>
          </Form.Item>
        </Form>

        <p className="auth-form-footer">
          {t('Already have an account?')}{' '}
          <Link to="/login" className="auth-form-footer-link">
            {t('Log in')} →
          </Link>
        </p>
      </div>
    </div>
  );
}
