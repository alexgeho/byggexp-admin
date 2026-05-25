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
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';

const { Option } = Select;

export default function UserCreateForm({ onClose, userToEdit = null }) {
  const [form] = Form.useForm();
  const createUser = useUserStore((state) => state.create);
  const updateUser = useUserStore((state) => state.update);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isCompanyAdmin = useAuthStore((state) => state.isCompanyAdmin());

  // Roles available for creation depend on the current user's role.
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
      console.log('Submitting user payload:', values);

      if (isCompanyAdmin && user?.companyId) {
        values.companyId = user.companyId;
      }

      if (userToEdit) {
        values.email = userToEdit.email;
      }

      if (userToEdit) {
        await updateUser(userToEdit._id, values);
        message.success('User updated');
      } else {
        await createUser(values);
        message.success('User created');
      }
      
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(error.message || 'Failed to save user');
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
          <Form.Item
            className="project-create-form__item"
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter user name' }]}
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <UserOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Name</div>
                <Input />
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
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <MailOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Email</div>
                <Input disabled={!!userToEdit} autoComplete="off" />
              </div>
            </div>
          </Form.Item>

          <Form.Item
            className="project-create-form__item"
            name="profession"
            label="Profession"
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <ToolOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Profession</div>
                <Input placeholder="Electrician" />
              </div>
            </div>
          </Form.Item>

          {!userToEdit && (
            <Form.Item
              className="project-create-form__item"
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Please enter password' },
                { min: 6, message: 'Password must be at least 6 characters' },
              ]}
            >
              <div className="project-create-form__row project-create-form__row--last">
                <span className="project-create-form__icon">
                  <LockOutlined />
                </span>
                <div className="project-create-form__field-main">
                  <div className="project-create-form__field-label">Password</div>
                  <Input.Password />
                </div>
              </div>
            </Form.Item>
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
          <Form.Item
            className="project-create-form__item"
            name="phoneAreaCode"
            label="Phone Area Code"
            rules={[{ required: true, message: 'Please enter area code' }]}
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <NumberOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Phone area code</div>
                <Input type="number" placeholder="7" />
              </div>
            </div>
          </Form.Item>

          <Form.Item
            className="project-create-form__item"
            name="phoneNumber"
            label="Phone Number"
            rules={[{ required: true, message: 'Please enter phone number' }]}
          >
            <div className="project-create-form__row project-create-form__row--last">
              <span className="project-create-form__icon">
                <NumberOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Phone number</div>
                <Input type="number" placeholder="1234567890" />
              </div>
            </div>
          </Form.Item>
        </div>
      </div>

      <div>
        <h3 className="project-create-form__section-title">Access</h3>
        <div className="project-create-form__group">
          <Form.Item
            className="project-create-form__item"
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <div className="project-create-form__row project-create-form__row--last">
              <span className="project-create-form__icon">
                <SafetyOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Role</div>
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
              </div>
            </div>
          </Form.Item>
        </div>
      </div>
    </Form>
  );
}
