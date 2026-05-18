import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const getRedirectPath = useAuthStore((state) => state.getRedirectPath);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const data = await login(values.email, values.password);
      message.success(`Signed in successfully, ${data.user.name || 'welcome'}!`);
      
      const redirectPath = getRedirectPath();
      navigate(redirectPath, { replace: true });
    } catch (err) {
      message.error(err.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      <div className="login-card-brand">
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#052D50', marginBottom: '8px' }}>
            BYGGEXP
          </h2>
          <p style={{ color: '#666', fontSize: '14px' }}>
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
              style={{ marginTop: '8px' }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
    </div>
  );
}
