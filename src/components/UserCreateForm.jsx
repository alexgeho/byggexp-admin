import { useEffect, useState } from 'react';
import { Form, Input, message, Select } from 'antd';
import { FlagOutlined, ProjectOutlined, RightOutlined } from '@ant-design/icons';
import AdminFormField from './AdminFormField';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { getEntityId } from '../utils/entityId';
import { formatApiError } from '../utils/formError';
import apiClient from '../api/apiClient';

const { Option } = Select;

const parsePhoneFields = (value) => {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) {
    return { areaCode: undefined, phone: undefined };
  }

  if (digits.length <= 2) {
    return {
      areaCode: parseInt(digits, 10),
      phone: undefined,
    };
  }

  return {
    areaCode: parseInt(digits.slice(0, 2), 10),
    phone: parseInt(digits.slice(2), 10),
  };
};

const formatPhoneForDisplay = (areaCode, phoneNumber) => {
  if (areaCode == null && phoneNumber == null) {
    return '';
  }

  const area = areaCode != null ? String(areaCode) : '';
  const phone = phoneNumber != null ? String(phoneNumber) : '';

  if (!area && !phone) {
    return '';
  }

  return `+${area}${phone}`;
};

export default function UserCreateForm({ onClose, userToEdit = null }) {
  const [form] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
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
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const response =
          user?.role === 'superadmin'
            ? await apiClient.get('/projects')
            : await apiClient.get('/projects/my');
        setProjects(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to load projects:', error);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, [user?.role]);

  useEffect(() => {
    if (userToEdit) {
      form.setFieldsValue({
        email: userToEdit.email,
        name: userToEdit.name,
        phone: formatPhoneForDisplay(userToEdit.phoneAreaCode, userToEdit.phoneNumber),
        profession: userToEdit.profession,
        role: userToEdit.role,
        projectIds: userToEdit.projectIds || [],
      });
    } else {
      form.resetFields();
    }
  }, [userToEdit, form]);

  const onFinish = async (values) => {
    try {
      const { phone, password, ...rest } = values;
      const { areaCode, phone: phoneNumber } = parsePhoneFields(phone);

      const payload = {
        email: rest.email?.trim(),
      };

      if (rest.name?.trim()) {
        payload.name = rest.name.trim();
      }

      if (rest.profession?.trim()) {
        payload.profession = rest.profession.trim();
      }

      if (areaCode != null && phoneNumber != null) {
        payload.phoneAreaCode = areaCode;
        payload.phoneNumber = phoneNumber;
      }

      if (rest.role) {
        payload.role = rest.role;
      }

      if (rest.projectIds?.length) {
        payload.projectIds = rest.projectIds;
      }

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
        if (password?.trim()) {
          payload.password = password.trim();
        } else {
          payload.inviteViaEmail = true;
        }

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
      <div className="project-create-form__group">
        <AdminFormField
          name="email"
          label="Email"
          fieldLabel="Email *"
          rules={[
            { required: true, message: 'Please enter email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input placeholder="email@company.com" disabled={!!userToEdit} autoComplete="off" />
        </AdminFormField>

        <AdminFormField
          name="name"
          label="Name"
          fieldLabel="First and Last name"
        >
          <Input placeholder="Employee name" />
        </AdminFormField>

        <AdminFormField
          name="phone"
          label="Phone"
          fieldLabel="Phone number"
          rules={[
            {
              validator: (_, value) => {
                if (!value) {
                  return Promise.resolve();
                }

                const { areaCode, phone } = parsePhoneFields(value);
                if (areaCode && phone) {
                  return Promise.resolve();
                }

                return Promise.reject(new Error('Please enter a valid phone number'));
              },
            },
          ]}
        >
          <Input placeholder="+46 701234567" />
        </AdminFormField>

        <AdminFormField name="profession" label="Profession" fieldLabel="Profession">
          <Input placeholder="Electrician" />
        </AdminFormField>

        {!userToEdit ? (
          <AdminFormField
            name="password"
            label="Password"
            fieldLabel="Password"
            rowClassName="project-create-form__row project-create-form__row--last"
            rules={[{ min: 6, message: 'Password must be at least 6 characters' }]}
          >
            <Input.Password placeholder="Minimum 6 characters" />
          </AdminFormField>
        ) : (
          <div className="project-create-form__row project-create-form__row--last">
            <div className="project-create-form__field-main">
              <div className="project-create-form__field-label">Password</div>
              <div className="project-create-form__field-caption">Password is not changed in edit mode</div>
            </div>
          </div>
        )}
      </div>

      <div className="project-create-form__group">
        <AdminFormField
          name="projectIds"
          label="Projects"
          fieldLabel="Add project"
          icon={<ProjectOutlined />}
        >
          <Select
            variant="borderless"
            mode="multiple"
            className="project-create-form__select project-create-form__select--multiple"
            placeholder={loadingProjects ? 'Loading projects...' : 'Select project'}
            loading={loadingProjects}
            suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
          >
            {projects.map((project) => (
              <Option key={getEntityId(project)} value={getEntityId(project)}>
                {project.name}
              </Option>
            ))}
          </Select>
        </AdminFormField>

        <AdminFormField
          name="role"
          label="Role"
          fieldLabel="Role"
          icon={<FlagOutlined />}
          rowClassName="project-create-form__row project-create-form__row--last"
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
    </Form>
  );
}
