import { Form, Input, Button, message, Select, Divider } from 'antd';
import { useCompanyStore } from '../store/companyStore';
import { useUserStore } from '../store/userStore';
import { useEffect, useState } from 'react';

const { Option } = Select;

export default function CompanyCreateForm({ onClose, companyToEdit = null }) {
  const [form] = Form.useForm();
  const createCompany = useCompanyStore((state) => state.create);
  const updateCompany = useCompanyStore((state) => state.update);
  const registerWithAdmin = useCompanyStore((state) => state.registerWithAdmin);
  const { users, fetchAll } = useUserStore();
  
  const [mode, setMode] = useState('simple'); // 'simple' or 'withAdmin'

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (companyToEdit) {
      form.setFieldsValue({
        name: companyToEdit.name,
        address: companyToEdit.address,
        email: companyToEdit.email,
        representativeId: companyToEdit.representativeId?._id || companyToEdit.representativeId,
      });
      setMode('simple');
    } else {
      form.resetFields();
      setMode('simple');
    }
  }, [companyToEdit, form]);

  const onFinish = async (values) => {
    try {
      if (companyToEdit) {
        // Update company
        await updateCompany(companyToEdit._id, values);
        message.success('Company updated');
      } else if (mode === 'withAdmin') {
        // Register company with admin
        await registerWithAdmin(values);
        message.success('Company and administrator created');
      } else {
        // Simple company creation
        await createCompany(values);
        message.success('Company created');
      }
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(error.message || 'Failed to save company');
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      id="company-create-form"
    >
      {!companyToEdit && (
        <Form.Item label="Creation mode">
          <Select value={mode} onChange={setMode} disabled={!!companyToEdit}>
            <Option value="simple">Company only</Option>
            <Option value="withAdmin">Company + Administrator</Option>
          </Select>
        </Form.Item>
      )}

      <Divider orientation="left">Company information</Divider>
      
      <Form.Item
        name="name"
        label="Company Name"
        rules={[{ required: true, message: 'Please enter company name' }]}
      >
        <Input placeholder="Company name" />
      </Form.Item>
      <Form.Item
        name="address"
        label="Address"
        rules={[{ required: true, message: 'Please enter address' }]}
      >
        <Input placeholder="Address" />
      </Form.Item>
      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: 'Please enter email' },
          { type: 'email', message: 'Please enter a valid email' },
        ]}
      >
        <Input placeholder="Company email" />
      </Form.Item>

      {!companyToEdit && (
        <Form.Item
          name="representativeId"
          label="Representative"
          rules={[{ required: true, message: 'Please select a representative' }]}
        >
          <Select placeholder="Select a representative">
            {users.map(user => (
              <Option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </Option>
            ))}
          </Select>
        </Form.Item>
      )}

      {!companyToEdit && mode === 'withAdmin' && (
        <>
          <Divider orientation="left">Administrator details</Divider>
          
          <Form.Item
            name="adminName"
            label="Admin Name"
            rules={[{ required: true, message: 'Please enter admin name' }]}
          >
            <Input placeholder="Administrator full name" />
          </Form.Item>
          <Form.Item
            name="adminEmail"
            label="Admin Email"
            rules={[
              { required: true, message: 'Please enter admin email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="Administrator email" />
          </Form.Item>
          <Form.Item
            name="adminPassword"
            label="Admin Password"
            rules={[
              { required: true, message: 'Please enter password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password placeholder="Administrator password" />
          </Form.Item>
          <Form.Item
            name="adminPhoneAreaCode"
            label="Admin Phone Area Code"
            rules={[{ required: true, message: 'Please enter area code' }]}
          >
            <Input type="number" placeholder="7" />
          </Form.Item>
          <Form.Item
            name="adminPhoneNumber"
            label="Admin Phone Number"
            rules={[{ required: true, message: 'Please enter phone number' }]}
          >
            <Input type="number" placeholder="1234567890" />
          </Form.Item>
        </>
      )}
    </Form>
  );
}
