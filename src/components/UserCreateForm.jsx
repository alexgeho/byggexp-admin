import { useEffect } from 'react';
import { Form, Input, message, Select } from 'antd';
import {
  LockOutlined,
  MailOutlined,
  NumberOutlined,
  RightOutlined,
  SafetyOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import AdminFormField from './AdminFormField';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { getEntityId } from '../utils/entityId';
import { formatApiError } from '../utils/formError';

const { Option } = Select;

export default function UserCreateForm({ onClose, userToEdit = null }) {
  const [form] = Form.useForm();
  const createUser = useUserStore((state) => state.create);
  const updateUser = useUserStore((state) => state.update);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isCompanyAdmin = useAuthStore((state) => state.isCompanyAdmin());

  const availableRoles = () => {
    if (isSuperAdmin) {
      return [
        { value: 'worker', label: 'Worker' },
        { value: 'projectAdmin', label: 'Project Admin' },
        { value: 'companyAdmin', label: 'Company Admin' },
        { value: 'superadmin', label: 'Super Admin' },
      ];
    }
    if (isCompanyAdmin) {
      return [
        { value: 'worker', label: 'Worker' },
        { value: 'projectAdmin', label: 'Project Admin' },
      ];
    }
    return [];
  };

  useEffect(() => {
    if (userToEdit) {
      form.setFieldsValue({
        name: userToEdit.name,
        email: userToEdit.email,
        profession: userToEdit.profession,
        phoneAreaCode: userToEdit.phoneAreaCode,
        phoneNumber: userToEdit.phoneNumber,
        role: userToEdit.role,
      });
    } else {
      form.resetFields();
    }
  }, [userToEdit, form]);

  const onFinish = async (values) => {
    try {
      const payload = { ...values };

      if (isCompanyAdmin && user?.companyId) {
        payload.companyId = user.companyId;
      }

      if (userToEdit) {
        const userId = getEntityId(userToEdit);
        if (!userId) {
          throw new Error('User id is missing');
        }

        payload.email = userToEdit.email;
        await updateUser(userId, payload);
      } else {
        await createUser(payload);
      }

      form.resetFields();
      onClose();
    } catch (error) {
      message.error(formatApiError(error, 'Failed to save user'));
    }
  };

  return (
    <Form
      className="admin-create-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
      id="user-create-form"
    >
      <div>
        <h3 className="project-create-form__section-title">Profile</h3>
        <div className="project-create-form__group">
          <AdminFormField
            name="name"
            label="Name"
            fieldLabel="Name"
            icon={<UserOutlined />}
            rules={[{ required: true, message: 'Please enter user name' }]}
          >
            <Input />
          </AdminFormField>

          <AdminFormField
            name="email"
            label="Email"
            fieldLabel="Email"
            icon={<MailOutlined />}
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input disabled={!!userToEdit} autoComplete="off" />
          </AdminFormField>

          <AdminFormField name="profession" label="Profession" fieldLabel="Profession" icon={<ToolOutlined />}>
            <Input placeholder="Electrician" />
          </AdminFormField>

          {!userToEdit && (
            <AdminFormField
              name="password"
              label="Password"
              fieldLabel="Password"
              icon={<LockOutlined />}
              rowClassName="project-create-form__row project-create-form__row--last"
              rules={[
                { required: true, message: 'Please enter password' },
                { min: 6, message: 'Password must be at least 6 characters' },
              ]}
            >
              <Input.Password />
            </AdminFormField>
          )}

          {userToEdit && (
            <div className="project-create-form__row project-create-form__row--last">
              <span className="project-create-form__icon">
                <SafetyOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Password</div>
                <div className="project-create-form__field-caption">Password is not changed in edit mode</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="project-create-form__section-title">Contact</h3>
        <div className="project-create-form__group">
          <AdminFormField
            name="phoneAreaCode"
            label="Phone Area Code"
            fieldLabel="Phone area code"
            icon={<NumberOutlined />}
            rules={[{ required: true, message: 'Please enter area code' }]}
          >
            <Input type="number" placeholder="7" />
          </AdminFormField>

          <AdminFormField
            name="phoneNumber"
            label="Phone Number"
            fieldLabel="Phone number"
            icon={<NumberOutlined />}
            rowClassName="project-create-form__row project-create-form__row--last"
            rules={[{ required: true, message: 'Please enter phone number' }]}
          >
            <Input type="number" placeholder="1234567890" />
          </AdminFormField>
        </div>
      </div>

      <div>
        <h3 className="project-create-form__section-title">Access</h3>
        <div className="project-create-form__group">
          <AdminFormField
            name="role"
            label="Role"
            fieldLabel="Role"
            icon={<SafetyOutlined />}
            rowClassName="project-create-form__row project-create-form__row--last"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select
              variant="borderless"
              className="project-create-form__select"
              placeholder="Select role"
              disabled={!isSuperAdmin && !!userToEdit}
              suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
            >
              {availableRoles().map((role) => (
                <Option key={role.value} value={role.value}>
                  {role.label}
                </Option>
              ))}
            </Select>
          </AdminFormField>
        </div>
      </div>
    </Form>
  );
}
