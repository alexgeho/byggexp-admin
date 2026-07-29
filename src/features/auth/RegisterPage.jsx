import { useEffect, useState } from 'react';
import { App, Form, Input, Button } from 'antd';
import { BankOutlined, UserOutlined } from '@ant-design/icons';
import {
  getRedirectPathForUser,
  registerCompanyWithCredentials,
  useAuthStore,
} from '@/src/store/authStore';
import { useNavigate, Link } from '@/src/shared/routing/routerCompat';
import authMailIcon from '@/src/assets/icons/auth-mail.svg';
import authLockIcon from '@/src/assets/icons/auth-lock.svg';

const resolveSvgSrc = (asset) => (typeof asset === 'string' ? asset : asset.src);

// Self-serve onboarding: a new construction company signs itself up. This
// creates the company and its first companyAdmin, then drops them into the
// panel (all modules, trial). Superadmin can still create companies manually
// in /admin/companies.
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
      const data = await registerCompanyWithCredentials({
        companyName: values.companyName,
        userName: values.userName,
        email: values.email,
        password: values.password,
      });
      useAuthStore.getState().setSession(data);
      message.success('Welcome to ByggExp! Your company is ready.');
      navigate(getRedirectPathForUser(data.user), { replace: true });
    } catch (err) {
      console.error('Onboarding failed:', err);
      message.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="login-card">
        <div className="login-card-header">
          <p className="login-card-welcome">Get started</p>
          <h1 className="login-card-heading">Create your company</h1>
        </div>

        <Form
          className="auth-form"
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="companyName"
            label="Company name"
            rules={[{ required: true, message: 'Please enter your company name' }]}
          >
            <Input prefix={<BankOutlined className="auth-field-icon" />} placeholder="Bygg AB" />
          </Form.Item>

          <Form.Item
            name="userName"
            label="Your name"
            rules={[{ required: true, message: 'Please enter your name' }]}
          >
            <Input prefix={<UserOutlined className="auth-field-icon" />} placeholder="First and last name" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Work email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
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
              placeholder="example@company.se"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter a password' },
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
              placeholder="Choose a password"
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
              placeholder="Confirm your password"
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
              Create company
            </Button>
          </Form.Item>
        </Form>

        <p className="auth-form-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-form-footer-link">
            Login here →
          </Link>
        </p>
      </div>
    </div>
  );
}
