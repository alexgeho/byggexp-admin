import { useEffect } from 'react';
import { Card, Form, Input, Button, message, Descriptions, Tag } from 'antd';
import { useAuthStore } from '../store/authStore';
import { useCompanyStore } from '../store/companyStore';

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [form] = Form.useForm();
  const { currentCompany, fetchMy } = useCompanyStore();

  useEffect(() => {
    if (user?.companyId) {
      fetchMy();
    }
  }, [user, fetchMy]);

  const getRoleColor = (role) => {
    const colorMap = {
      superadmin: 'red',
      companyAdmin: 'orange',
      projectAdmin: 'blue',
      worker: 'green',
    };
    return colorMap[role] || 'default';
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="User Profile" style={{ marginBottom: '16px' }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Name">{user?.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Role">
            <Tag color={getRoleColor(user?.role)}>{user?.role}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Phone">
            {user?.phoneAreaCode && user?.phoneNumber 
              ? `+${user.phoneAreaCode} ${user.phoneNumber}` 
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Company" span={2}>
            {currentCompany?.name || user?.companyId || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Edit Profile" style={{ maxWidth: '600px' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={() => {
            message.success('Profile updated (in development)');
          }}
        >
          <Form.Item
            name="name"
            label="Name"
            initialValue={user?.name}
            rules={[{ required: true, message: 'Please enter your name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="phoneAreaCode"
            label="Phone area code"
            initialValue={user?.phoneAreaCode}
          >
            <Input type="number" placeholder="7" style={{ width: '100px' }} />
          </Form.Item>

          <Form.Item
            name="phoneNumber"
            label="Phone number"
            initialValue={user?.phoneNumber}
          >
            <Input type="number" placeholder="1234567890" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Save
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
