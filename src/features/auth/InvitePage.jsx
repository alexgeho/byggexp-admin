'use client';

import { useEffect, useState } from 'react';
import { App, Form, Input, Button, Spin } from 'antd';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/src/api/apiClient';
import { getRedirectPathForUser, loginWithCredentials, useAuthStore } from '@/src/store/authStore';
import { useNavigate, Link } from '@/src/shared/routing/routerCompat';
import { formatApiError } from '@/src/utils/formError';

export default function InvitePage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('This invitation link is invalid.');
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data } = await apiClient.get(`/company/invite/${token}`);
        if (active) setInvite(data);
      } catch (err) {
        if (active) setError(formatApiError(err, 'This invitation is invalid or has expired.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

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
      message.success('Account created — welcome!');
      navigate(getRedirectPathForUser(session.user), { replace: true });
    } catch (err) {
      message.error(formatApiError(err, 'Could not accept the invitation'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="login-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}><Spin size="large" /></div>
        ) : error ? (
          <>
            <div className="login-card-header">
              <p className="login-card-welcome">Invitation</p>
              <h1 className="login-card-heading">Link not valid</h1>
            </div>
            <p style={{ color: 'var(--muted, #6b8199)', marginTop: 4 }}>{error}</p>
            <p className="auth-form-footer">
              <Link to="/login" className="auth-form-footer-link">Go to sign in →</Link>
            </p>
          </>
        ) : (
          <>
            <div className="login-card-header">
              <p className="login-card-welcome">Welcome to ByggExp</p>
              <h1 className="login-card-heading">Set up {invite.companyName || 'your company'}</h1>
            </div>

            <Form className="auth-form" onFinish={onFinish} layout="vertical" requiredMark={false}
              initialValues={{ name: invite.name || invite.companyName || '' }}>
              <Form.Item label="E-Mail">
                <Input value={invite.email} disabled />
              </Form.Item>

              <Form.Item name="name" label="Your name"
                rules={[{ required: true, message: 'Please enter your name' }]}>
                <Input placeholder="Your name" autoComplete="name" />
              </Form.Item>

              <Form.Item name="password" label="Password"
                rules={[{ required: true, message: 'Please choose a password' }, { min: 6, message: 'At least 6 characters' }]}>
                <Input.Password placeholder="Choose a password" autoComplete="new-password" />
              </Form.Item>

              <Form.Item name="confirm" label="Confirm password" dependencies={['password']}
                rules={[
                  { required: true, message: 'Please confirm your password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve();
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}>
                <Input.Password placeholder="Repeat the password" autoComplete="new-password" />
              </Form.Item>

              <Form.Item className="auth-form-submit">
                <Button type="primary" htmlType="submit" loading={submitting} block className="auth-form-button">
                  Create account &amp; sign in
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
