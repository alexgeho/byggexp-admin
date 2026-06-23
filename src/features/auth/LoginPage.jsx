import { useEffect, useState } from 'react';
import { App, Form, Input, Button } from 'antd';
import { getRedirectPathForUser, loginWithCredentials, useAuthStore } from '@/src/store/authStore';
import { useNavigate } from '@/src/shared/routing/routerCompat';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

export default function LoginPage() {
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

  return (
    <div className="auth-page">
      <div className="login-card">
        <div className="login-card-brand">
          <h2 className="login-card-title">
            BYGGEXP
          </h2>
          <p className="login-card-subtitle">
            Construction management software
          </p>
        </div>

        <Form onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              className="form-submit-offset"
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
