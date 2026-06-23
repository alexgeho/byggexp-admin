import { Form, Input, message, Select } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import AdminFormField from '@/src/shared/components/AdminFormField';
import { useCompanyStore } from '@/src/store/companyStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const { Option } = Select;

export default function CompanyCreateForm({ onClose, companyToEdit = null }) {
  const [form] = Form.useForm();
  const createCompany = useCompanyStore((state) => state.create);
  const updateCompany = useCompanyStore((state) => state.update);
  const registerWithAdmin = useCompanyStore((state) => state.registerWithAdmin);

  const [mode, setMode] = useState('simple');

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
        const companyId = getEntityId(companyToEdit);
        if (!companyId) {
          throw new Error('Company id is missing');
        }
        await updateCompany(companyId, {
          name: values.name,
          address: values.address,
          email: values.email,
        });
        message.success('Company updated');
      } else if (mode === 'withAdmin') {
        await registerWithAdmin(values);
        message.success('Company and administrator created');
      } else {
        await createCompany(values);
        message.success('Company created');
      }
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(formatApiError(error, 'Failed to save company'));
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
                <div className="project-create-form__field-main">
                  <div className="project-create-form__field-label">Creation mode</div>
                  <Select
                    value={mode}
                    onChange={setMode}
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
          <AdminFormField
            name="name"
            label="Company Name"
            fieldLabel="Company name"
            rules={[{ required: true, message: 'Please enter company name' }]}
          >
            <Input placeholder="Company name" />
          </AdminFormField>

          <AdminFormField
            name="address"
            label="Address"
            fieldLabel="Address"
            rules={[{ required: true, message: 'Please enter address' }]}
          >
            <Input placeholder="Address" />
          </AdminFormField>

          <AdminFormField
            name="email"
            label="Email"
            fieldLabel="Email"
            rowClassName="project-create-form__row project-create-form__row--last"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="Company email" />
          </AdminFormField>
        </div>
      </div>

      {!companyToEdit && mode === 'withAdmin' && (
        <div>
          <h3 className="project-create-form__section-title">Administrator</h3>
          <div className="project-create-form__group">
            <AdminFormField
              name="adminName"
              label="Admin Name"
              fieldLabel="Admin name"
              rules={[{ required: true, message: 'Please enter admin name' }]}
            >
              <Input placeholder="Administrator full name" />
            </AdminFormField>

            <AdminFormField
              name="adminEmail"
              label="Admin Email"
              fieldLabel="Admin email"
              rules={[
                { required: true, message: 'Please enter admin email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input placeholder="Administrator email" />
            </AdminFormField>

            <AdminFormField
              name="adminPassword"
              label="Admin Password"
              fieldLabel="Admin password"
              rules={[
                { required: true, message: 'Please enter password' },
                { min: 6, message: 'Password must be at least 6 characters' },
              ]}
            >
              <Input.Password placeholder="Administrator password" />
            </AdminFormField>

            <AdminFormField
              name="adminPhoneAreaCode"
              label="Admin Phone Area Code"
              fieldLabel="Admin phone area code"
              rules={[{ required: true, message: 'Please enter area code' }]}
            >
              <Input type="number" placeholder="7" />
            </AdminFormField>

            <AdminFormField
              name="adminPhoneNumber"
              label="Admin Phone Number"
              fieldLabel="Admin phone number"
              rowClassName="project-create-form__row project-create-form__row--last"
              rules={[{ required: true, message: 'Please enter phone number' }]}
            >
              <Input type="number" placeholder="1234567890" />
            </AdminFormField>
          </div>
        </div>
      )}
    </Form>
  );
}
