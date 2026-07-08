import { useEffect, useState } from 'react';
import { Form, message } from 'antd';
import { Field, Input, Select } from '@/src/ui-kit';
import { useUserStore } from '@/src/store/userStore';
import { useToolStore } from '@/src/store/toolStore';
import { useAuthStore } from '@/src/store/authStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';
import apiClient from '@/src/api/apiClient';

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
  const [tools, setTools] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const createUser = useUserStore((state) => state.create);
  const updateUser = useUserStore((state) => state.update);
  const attachToolsToWorker = useToolStore((state) => state.attachToWorker);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isCompanyAdmin = useAuthStore((state) => state.isCompanyAdmin());
  const selectedRole = Form.useWatch('role', form);
  const isWorkerRole = selectedRole === 'worker';

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

    const loadTools = async () => {
      try {
        const response = await apiClient.get('/tools');
        setTools(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to load tools:', error);
        setTools([]);
      }
    };

    loadProjects();
    loadTools();
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
      const { phone, ...rest } = values;
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
        payload.inviteViaEmail = true;
        const createdUser = await createUser(payload);
        const workerId = getEntityId(createdUser);

        if (isWorkerRole && rest.toolIds?.length && workerId) {
          await attachToolsToWorker(workerId, rest.toolIds);
        }
      }

      form.resetFields();
      onClose();
    } catch (error) {
      message.error(formatApiError(error, 'Failed to save user'));
    }
  };

  const projectOptions = projects.map((project) => ({
    value: getEntityId(project),
    label: project.name,
  }));

  const toolOptions = tools.map((tool) => ({
    value: getEntityId(tool),
    label: tool.name,
  }));

  return (
    <Form
      className="admin-modal-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
      id="user-create-form"
    >
      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">Profile</h3>
        <div className="admin-modal-form__grid">
          <Field
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input placeholder="email@company.com" disabled={!!userToEdit} autoComplete="off" />
          </Field>

          <Field name="name" label="Name">
            <Input placeholder="Employee name" />
          </Field>

          <Field
            name="phone"
            label="Phone"
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
          </Field>

          <Field name="profession" label="Profession">
            <Input placeholder="Electrician" />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">Assignment</h3>
        <div className="admin-modal-form__grid">
          <Field name="projectIds" label="Projects">
            <Select
              mode="multiple"
              placeholder={loadingProjects ? 'Loading projects...' : 'Select project'}
              loading={loadingProjects}
              options={projectOptions}
              style={{ width: '100%' }}
            />
          </Field>

          <Field name="role" label="Role">
            <Select
              placeholder="Select role"
              disabled={!isSuperAdmin && !!userToEdit}
              options={availableRoles()}
              style={{ width: '100%' }}
            />
          </Field>

          {isWorkerRole && !userToEdit ? (
            <Field name="toolIds" label="Tools">
              <Select
                mode="multiple"
                placeholder="Select tools"
                options={toolOptions}
                style={{ width: '100%' }}
              />
            </Field>
          ) : null}
        </div>
      </section>
    </Form>
  );
}
