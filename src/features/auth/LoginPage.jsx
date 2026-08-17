import { useEffect, useState } from 'react';
import { App, Form, Input, Button, Modal } from 'antd';
import {
  getRedirectPathForUser,
  loginWithCredentials,
  requestPasswordReset,
  useAuthStore,
} from '@/src/store/authStore';
import { useNavigate, Link } from '@/src/shared/routing/routerCompat';
import authMailIcon from '@/src/assets/icons/auth-mail.svg';
import authLockIcon from '@/src/assets/icons/auth-lock.svg';

import { resolveSvgSrc } from '@/src/utils/assets';

export default function LoginPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();
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
      const data = await loginWithCredentials(values.email, values.password);
      useAuthStore.getState().setSession(data);
      message.success(`Signed in successfully, ${data.user.name || 'welcome'}!`);
      
      const redirectPath = getRedirectPathForUser(data.user);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error('Sign-in failed:', err);
      message.error(err.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async () => {
    const email = forgotEmail.trim();
    if (!email) {
      message.error('Please enter your email');
      return;
    }
    setForgotLoading(true);
    try {
      await requestPasswordReset(email);
      setForgotOpen(false);
      setForgotEmail('');
      message.success(
        'If that email has an account, a reset link is on its way. Check your inbox.',
      );
    } catch (err) {
      console.error('Password reset request failed:', err);
      message.error(err.message || 'Could not send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="login-card">
        <div className="login-card-header">
          <p className="login-card-welcome">Welcome!</p>
          <h1 className="login-card-heading">Log In to your account</h1>
        </div>

        <Form
          className="auth-form"
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="E-Mail or Username"
            rules={[{ required: true, message: 'Please enter your email or username' }]}
          >
            <Input
              prefix={(
                <img
                  src={resolveSvgSrc(authMailIcon)}
                  width={16}
                  height={16}
                  alt=""
                  className="auth-field-icon"
                  aria-hidden="true"
                />
              )}
              placeholder="example@gmail.com"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={(
                <img
                  src={resolveSvgSrc(authLockIcon)}
                  width={16}
                  height={16}
                  alt=""
                  className="auth-field-icon"
                  aria-hidden="true"
                />
              )}
              placeholder="your password here"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item className="auth-form-submit">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="auth-form-button"
            >
              Log In
            </Button>
          </Form.Item>
        </Form>

        <p className="auth-form-footer">
          <Button
            type="link"
            className="auth-form-footer-link"
            style={{ padding: 0 }}
            onClick={() => setForgotOpen(true)}
          >
            Forgot password?
          </Button>
        </p>

        <p className="auth-form-footer">
          New to ByggExp?{' '}
          <Link to="/register" className="auth-form-footer-link">
            Create your company →
          </Link>
        </p>
      </div>

      <Modal
        title="Reset your password"
        open={forgotOpen}
        onOk={handleForgotSubmit}
        onCancel={() => setForgotOpen(false)}
        okText="Send reset link"
        confirmLoading={forgotLoading}
        destroyOnClose
      >
        <p style={{ color: '#5a6b7d', marginBottom: 12 }}>
          Enter your account email and we&apos;ll send you a link to choose a new
          password.
        </p>
        <Input
          type="email"
          placeholder="example@gmail.com"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          onPressEnter={handleForgotSubmit}
          autoFocus
        />
      </Modal>
    </div>
  );
}
