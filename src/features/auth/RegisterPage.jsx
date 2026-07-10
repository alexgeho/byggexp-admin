import { useEffect, useState } from 'react';
import { App, Form, Input, Button } from 'antd';
import {
  getRedirectPathForUser,
  registerWithCredentials,
  useAuthStore,
} from '@/src/store/authStore';
import { useNavigate, Link } from '@/src/shared/routing/routerCompat';
import authMailIcon from '@/src/assets/icons/auth-mail.svg';
import authLockIcon from '@/src/assets/icons/auth-lock.svg';

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

export default function RegisterPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
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
      const data = await registerWithCredentials(values.email, values.password);
      useAuthStore.getState().setSession(data);
      message.success('Account created successfully!');

      const redirectPath = getRedirectPathForUser(data.user);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error('Registration failed:', err);
      message.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="login-card">
        <div className="login-card-header">
          <p className="login-card-welcome">Welcome!</p>
          <h1 className="login-card-heading">Create an account</h1>
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
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
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
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
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
              placeholder="confirm your password"
              autoComplete="new-password"
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
              Sign Up
            </Button>
          </Form.Item>
        </Form>

        <p className="auth-form-footer">
          Already a member?{' '}
          <Link to="/login" className="auth-form-footer-link">
            Login here →
          </Link>
        </p>
      </div>
    </div>
  );
}
