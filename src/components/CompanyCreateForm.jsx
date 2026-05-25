import { Form, Input, message, Select } from 'antd';
import {
  EnvironmentOutlined,
  LockOutlined,
  MailOutlined,
  NumberOutlined,
  RightOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useCompanyStore } from '../store/companyStore';
import { useEffect, useState } from 'react';

const { Option } = Select;

export default function CompanyCreateForm({ onClose, companyToEdit = null }) {
  const [form] = Form.useForm();
  const createCompany = useCompanyStore((state) => state.create);
  const updateCompany = useCompanyStore((state) => state.update);
  const registerWithAdmin = useCompanyStore((state) => state.registerWithAdmin);
  
  const [mode, setMode] = useState('simple'); // 'simple' or 'withAdmin'

  useEffect(() => {
    if (companyToEdit) {
      form.setFieldsValue({
        name: companyToEdit.name,
        address: companyToEdit.address,
        email: companyToEdit.email,
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
      className="admin-create-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
      id="company-create-form"
    >
      {!companyToEdit && (
        <div>
          <h3 className="project-create-form__section-title">Mode</h3>
          <div className="project-create-form__group">
            <Form.Item className="project-create-form__item" label="Creation mode">
              <div className="project-create-form__row project-create-form__row--last">
                <span className="project-create-form__icon">
                  <ShopOutlined />
                </span>
                <div className="project-create-form__field-main">
                  <div className="project-create-form__field-label">Creation mode</div>
                  <Select
                    value={mode}
                    onChange={setMode}
                    disabled={!!companyToEdit}
                    variant="borderless"
                    className="project-create-form__select"
                    suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
                  >
                    <Option value="simple">Company only</Option>
                    <Option value="withAdmin">Company + Administrator</Option>
                  </Select>
                </div>
              </div>
            </Form.Item>
          </div>
        </div>
      )}

      <div>
        <h3 className="project-create-form__section-title">Company</h3>
        <div className="project-create-form__group">
          <Form.Item
            className="project-create-form__item"
            name="name"
            label="Company Name"
            rules={[{ required: true, message: 'Please enter company name' }]}
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <ShopOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Company name</div>
                <Input placeholder="Company name" />
              </div>
            </div>
          </Form.Item>

          <Form.Item
            className="project-create-form__item"
            name="address"
            label="Address"
            rules={[{ required: true, message: 'Please enter address' }]}
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <EnvironmentOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Address</div>
                <Input placeholder="Address" />
              </div>
            </div>
          </Form.Item>

          <Form.Item
            className="project-create-form__item"
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <div className="project-create-form__row project-create-form__row--last">
              <span className="project-create-form__icon">
                <MailOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Email</div>
                <Input placeholder="Company email" />
              </div>
            </div>
          </Form.Item>
        </div>
      </div>

      {!companyToEdit && mode === 'withAdmin' && (
        <div>
          <h3 className="project-create-form__section-title">Administrator</h3>
          <div className="project-create-form__group">
          <Form.Item
            className="project-create-form__item"
            name="adminName"
            label="Admin Name"
            rules={[{ required: true, message: 'Please enter admin name' }]}
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <UserOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Admin name</div>
                <Input placeholder="Administrator full name" />
              </div>
            </div>
          </Form.Item>
          <Form.Item
            className="project-create-form__item"
            name="adminEmail"
            label="Admin Email"
            rules={[
              { required: true, message: 'Please enter admin email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <MailOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Admin email</div>
                <Input placeholder="Administrator email" />
              </div>
            </div>
          </Form.Item>
          <Form.Item
            className="project-create-form__item"
            name="adminPassword"
            label="Admin Password"
            rules={[
              { required: true, message: 'Please enter password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <LockOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Admin password</div>
                <Input.Password placeholder="Administrator password" />
              </div>
            </div>
          </Form.Item>
          <Form.Item
            className="project-create-form__item"
            name="adminPhoneAreaCode"
            label="Admin Phone Area Code"
            rules={[{ required: true, message: 'Please enter area code' }]}
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <NumberOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Admin phone area code</div>
                <Input type="number" placeholder="7" />
              </div>
            </div>
          </Form.Item>
          <Form.Item
            className="project-create-form__item"
            name="adminPhoneNumber"
            label="Admin Phone Number"
            rules={[{ required: true, message: 'Please enter phone number' }]}
          >
            <div className="project-create-form__row project-create-form__row--last">
              <span className="project-create-form__icon">
                <NumberOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Admin phone number</div>
                <Input type="number" placeholder="1234567890" />
              </div>
            </div>
          </Form.Item>
          </div>
        </div>
      )}
    </Form>
  );
}
