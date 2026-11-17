'use client';

import { useEffect, useState } from 'react';
import { App, Form, Input, Button, Spin } from 'antd';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/src/api/apiClient';
import { getRedirectPathForUser, loginWithCredentials, useAuthStore } from '@/src/store/authStore';
import { useNavigate, Link } from '@/src/shared/routing/routerCompat';
import { formatApiError } from '@/src/utils/formError';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { adminLangFor } from '@/src/config/languages';

export default function InvitePage() {
  const { t, setLang } = useLanguage();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  // The link was already used: the account exists, so the way on is to sign in (owner 17.11).
  const [used, setUsed] = useState(null); // { email }
  const signedIn = useAuthStore((state) => (state.hasHydrated ? state.user : null));
  useEffect(() => {
    if (used && signedIn) navigate(getRedirectPathForUser(signedIn), { replace: true });
  }, [used, signedIn, navigate]);
  const goToSignIn = () => {
    // The login page fills in the email; it is kept out of the address bar.
    try { if (used?.email) window.sessionStorage.setItem('login-email', used.email); } catch { /* ignore */ }
    navigate('/login');
  };

  useEffect(() => {
    if (!token) {
      setError(t('This invitation link is invalid.'));
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data } = await apiClient.get(`/company/invite/${token}`);
        if (!active) return;
        if (data?.accepted) setUsed({ email: data.email || '' });
        else setInvite(data);
        // Show the page (and the admin afterwards) in the language chosen for them.
        const lang = adminLangFor(data?.language);
        if (lang) setLang(lang);
      } catch (err) {
        if (!active) return;
        // An API that still answers a used link with 409 — same screen, without the email.
        if (err?.response?.status === 409) setUsed({ email: '' });
        else setError(formatApiError(err, t('This invitation is invalid or has expired.')));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token, t, setLang]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      await apiClient.post(`/company/invite/${token}/accept`, {
        name: values.name?.trim() || undefined,
        password: values.password,
      });
      // The account now exists — sign in with the password just set.
      const session = await loginWithCredentials(invite.email, values.password);
      useAuthStore.getState().setSession(session);
      message.success(t('Account created — welcome!'));
      navigate(getRedirectPathForUser(session.user), { replace: true });
    } catch (err) {
      message.error(formatApiError(err, t('Could not accept the invitation')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="login-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}><Spin size="large" /></div>
        ) : used ? (
          <>
            <div className="login-card-header">
              <p className="login-card-welcome">{t('Invitation')}</p>
              <h1 className="login-card-heading">{t('The account is already created')}</h1>
            </div>
            <p style={{ color: 'var(--muted, #6b8199)', marginTop: 4 }}>
              {t('This invitation link has already been used. Sign in with your email and the password you chose.')}
            </p>
            {used.email ? <p style={{ marginTop: 8, fontWeight: 600 }}>{used.email}</p> : null}
            <Button type="primary" block className="auth-form-button" style={{ marginTop: 16 }} onClick={goToSignIn}>
              {t('Sign in')}
            </Button>
          </>
        ) : error ? (
          <>
            <div className="login-card-header">
              <p className="login-card-welcome">{t('Invitation')}</p>
              <h1 className="login-card-heading">{t('Link not valid')}</h1>
            </div>
            <p style={{ color: 'var(--muted, #6b8199)', marginTop: 4 }}>{error}</p>
            <p className="auth-form-footer">
              <Link to="/login" className="auth-form-footer-link">{t('Go to sign in →')}</Link>
            </p>
          </>
        ) : (
          <>
            <div className="login-card-header">
              <p className="login-card-welcome">{t('Welcome to ByggExp')}</p>
              <h1 className="login-card-heading">
                {invite.companyName ? `${t('Set up')} ${invite.companyName}` : t('Set up your company')}
              </h1>
            </div>

            <Form className="auth-form" onFinish={onFinish} layout="vertical" requiredMark={false}
              initialValues={{ name: invite.name || invite.companyName || '' }}>
              <Form.Item label={t('E-Mail')}>
                <Input value={invite.email} disabled />
              </Form.Item>

              <Form.Item name="name" label={t('Your name')}>
                <Input placeholder={t('Your name')} autoComplete="name" />
              </Form.Item>

              <Form.Item name="password" label={t('Password')}
                rules={[{ required: true, message: t('Please choose a password') }, { min: 6, message: t('At least 6 characters') }]}>
                <Input.Password placeholder={t('Choose a password')} autoComplete="new-password" />
              </Form.Item>

              <Form.Item name="confirm" label={t('Confirm password')} dependencies={['password']}
                rules={[
                  { required: true, message: t('Please confirm your password') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve();
                      return Promise.reject(new Error(t('Passwords do not match')));
                    },
                  }),
                ]}>
                <Input.Password placeholder={t('Repeat the password')} autoComplete="new-password" />
              </Form.Item>

              <Form.Item className="auth-form-submit">
                <Button type="primary" htmlType="submit" loading={submitting} block className="auth-form-button">
                  {t('Create account & sign in')}
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
