import { useEffect } from 'react';
import { Form, Input, Button, message, Select } from 'antd';
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

  // Доступные роли для создания в зависимости от роли текущего пользователя
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
      console.log('Отправляемые данные:', values);

      if (isCompanyAdmin && user?.companyId) {
        values.companyId = user.companyId;
      }

      if (userToEdit) {
        values.email = userToEdit.email;
      }

      if (userToEdit) {
        await updateUser(userToEdit._id, values);
        message.success('Пользователь обновлён');
      } else {
        await createUser(values);
        message.success('Пользователь создан');
      }
      
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(error.message || 'Ошибка сохранения пользователя');
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      id="user-create-form"
    >
      <Form.Item
        name="name"
        label="Name"
        rules={[{ required: true, message: 'Please enter user name' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: 'Please enter email' },
          { type: 'email', message: 'Please enter a valid email' },
        ]}
      >
        <Input disabled={!!userToEdit} autoComplete="off" />
      </Form.Item>
      {!userToEdit && (
        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: 'Please enter password' },
            { min: 6, message: 'Password must be at least 6 characters' },
          ]}
        >
          <Input.Password />
        </Form.Item>
      )}
      <Form.Item
        name="phoneAreaCode"
        label="Phone Area Code"
        rules={[{ required: true, message: 'Please enter area code' }]}
      >
        <Input type="number" placeholder="7" />
      </Form.Item>
      <Form.Item
        name="phoneNumber"
        label="Phone Number"
        rules={[{ required: true, message: 'Please enter phone number' }]}
      >
        <Input type="number" placeholder="1234567890" />
      </Form.Item>
      <Form.Item
        name="role"
        label="Role"
        rules={[{ required: true, message: 'Please select a role' }]}
      >
        <Select placeholder="Select role" disabled={!isSuperAdmin && !!userToEdit}>
          {availableRoles().map((role) => (
            <Option key={role.value} value={role.value}>
              {role.label}
            </Option>
          ))}
        </Select>
      </Form.Item>
    </Form>
  );
}
