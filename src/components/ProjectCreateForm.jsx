import { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, DatePicker, message } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  ProjectOutlined,
  RightOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminFormField from './AdminFormField';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/apiClient';
import { getEntityId } from '../utils/entityId';
import { formatApiError } from '../utils/formError';

const { Option } = Select;

export default function ProjectCreateForm({ onClose, projectToEdit = null }) {
  const [form] = Form.useForm();
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const { create } = useProjectStore();
  const updateProject = useProjectStore((state) => state.update);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isCompanyAdmin = useAuthStore((state) => state.isCompanyAdmin());
  const watchedLocation = Form.useWatch('location', form);
  const useLocationAsName = Form.useWatch('useLocationAsName', form);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let companiesData = [];
        let usersData = [];

        if (isSuperAdmin) {
          const [usersRes, companiesRes] = await Promise.all([
            apiClient.get('/users'),
            apiClient.get('/company'),
          ]);
          usersData = usersRes.data;
          companiesData = companiesRes.data;
        } else if (isCompanyAdmin && user?.companyId) {
          const [usersRes, companyRes] = await Promise.all([
            apiClient.get(`/users/company/${user.companyId}`),
            apiClient.get(`/company/${user.companyId}`),
          ]);
          usersData = usersRes.data;
          companiesData = [companyRes.data];
        }

        setUsers(usersData);
        setCompanies(companiesData);
      } catch (err) {
        console.error('Fetch error:', err);
        message.warning(formatApiError(err, 'Failed to load data'));
      }
    };

    fetchData();
  }, [isSuperAdmin, isCompanyAdmin, user]);

  useEffect(() => {
    if (projectToEdit) {
      form.setFieldsValue({
        name: projectToEdit.name,
        useLocationAsName: projectToEdit.useLocationAsName,
        location: projectToEdit.location,
        status: projectToEdit.status,
        contractNumber: projectToEdit.contractNumber,
        beginningDate: projectToEdit.beginningDate ? dayjs(projectToEdit.beginningDate) : null,
        endDate: projectToEdit.endDate ? dayjs(projectToEdit.endDate) : null,
        ownerId: typeof projectToEdit.ownerId === 'object' ? projectToEdit.ownerId?._id : projectToEdit.ownerId,
        projectManagerId:
          typeof projectToEdit.projectManagerId === 'object'
            ? projectToEdit.projectManagerId?._id
            : projectToEdit.projectManagerId,
        clientCompanyId:
          typeof projectToEdit.clientCompanyId === 'object'
            ? projectToEdit.clientCompanyId?._id
            : projectToEdit.clientCompanyId,
        workers: (projectToEdit.workers || []).map((w) => (typeof w === 'object' ? w._id : w)),
        description: projectToEdit.description,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        useLocationAsName: true,
        status: 'planning',
        ...(isCompanyAdmin && user?.companyId ? { clientCompanyId: user.companyId } : {}),
      });
    }
  }, [projectToEdit, form, isCompanyAdmin, user]);

  useEffect(() => {
    if (useLocationAsName && watchedLocation) {
      form.setFieldValue('name', watchedLocation);
    }
  }, [form, useLocationAsName, watchedLocation]);

  const onFinish = async (values) => {
    try {
      const allowedStatuses = ['planning', 'in_progress', 'completed', 'on_hold'];
      if (!allowedStatuses.includes(values.status)) {
        throw new Error('Invalid project status');
      }

      let clientCompanyId = values.clientCompanyId;
      if (isCompanyAdmin && user?.companyId) {
        clientCompanyId = user.companyId;
      }

      const payload = {
        ownerId: values.ownerId,
        projectManagerId: values.projectManagerId,
        clientCompanyId: String(clientCompanyId),
        name: values.name.trim(),
        status: values.status,
        location: values.location.trim(),
        contractNumber: values.contractNumber?.trim() || '',
        beginningDate: values.beginningDate ? values.beginningDate.toISOString() : null,
        endDate: values.endDate ? values.endDate.toISOString() : null,
        description: values.description?.trim() || '',
        documents: projectToEdit?.documents || [],
        tasks: [],
        workers: values.workers || [],
      };

      if (projectToEdit) {
        const projectId = getEntityId(projectToEdit);
        if (!projectId) {
          throw new Error('Project id is missing');
        }
        await updateProject(projectId, payload);
        message.success('Project updated');
      } else {
        await create(payload);
        message.success('Project created');
      }

      onClose();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, 'Failed to save project'));
    }
  };

  return (
    <Form
      id="project-create-form"
      className="admin-create-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <div className="project-create-form__group">
        <AdminFormField
          name="location"
          label="Location"
          rules={[{ required: true, message: 'Please enter a location' }]}
        >
          <Input placeholder="Location" />
        </AdminFormField>

        <AdminFormField
          layout="switch"
          name="useLocationAsName"
          label="Use location as a name"
          valuePropName="checked"
          rowClassName="project-create-form__row project-create-form__row--switch"
          fieldLabel="Use location as a name"
        >
          <Switch />
        </AdminFormField>

        <AdminFormField
          name="name"
          label="Project name"
          fieldLabel="Project name *"
          rules={[{ required: true, message: 'Please enter a project name' }]}
        >
          <Input placeholder="Project name" disabled={useLocationAsName} />
        </AdminFormField>

        <AdminFormField
          name="contractNumber"
          label="Contract No."
          fieldLabel="Contract No."
          rowClassName="project-create-form__row project-create-form__row--last"
        >
          <Input placeholder="e.g. BYG-2025-001" />
        </AdminFormField>
      </div>

      <div className="project-create-form__group">
        <AdminFormField name="workers" label="Workers" icon={<TeamOutlined />}>
          <Select
            variant="borderless"
            className="project-create-form__select project-create-form__select--multiple"
            mode="multiple"
            placeholder="Project team"
            suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
          >
            {users
              .filter((u) => u.role === 'worker')
              .map((u) => (
                <Option key={getEntityId(u)} value={getEntityId(u)}>
                  {u.name}
                </Option>
              ))}
          </Select>
        </AdminFormField>

        <AdminFormField
          name="ownerId"
          label="Owner"
          icon={<UserOutlined />}
          rules={[
            { required: true, message: 'Please select an owner' },
            {
              validator: (_, value) =>
                value && /^[0-9a-fA-F]{24}$/.test(value)
                  ? Promise.resolve()
                  : Promise.reject(new Error('Invalid owner ID')),
            },
          ]}
        >
          <Select
            variant="borderless"
            className="project-create-form__select"
            placeholder="Owner"
            suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
          >
            {users.map((u) => (
              <Option key={getEntityId(u)} value={getEntityId(u)}>
                {u.name}
              </Option>
            ))}
          </Select>
        </AdminFormField>

        <AdminFormField
          name="projectManagerId"
          label="Project manager"
          icon={<ProjectOutlined />}
          rules={[{ required: true, message: 'Please select a project manager' }]}
        >
          <Select
            variant="borderless"
            className="project-create-form__select"
            placeholder="Project Manager"
            suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
          >
            {users.map((u) => (
              <Option key={getEntityId(u)} value={getEntityId(u)}>
                {u.name}
              </Option>
            ))}
          </Select>
        </AdminFormField>

        <AdminFormField
          name="clientCompanyId"
          label="Client company"
          fieldLabel="Client Company"
          icon={<ShopOutlined />}
          rules={[{ required: true, message: 'Please select a client company' }]}
          extra={isCompanyAdmin ? 'Only your company is available' : ''}
        >
          <Select
            variant="borderless"
            className="project-create-form__select"
            placeholder="Select..."
            disabled={isCompanyAdmin}
            suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
          >
            {companies.map((c) => (
              <Option key={getEntityId(c)} value={getEntityId(c)}>
                {c.name} {c.email ? `- ${c.email}` : ''}
              </Option>
            ))}
          </Select>
        </AdminFormField>

        <AdminFormField
          name="status"
          label="Status"
          icon={<FlagOutlined />}
          rowClassName="project-create-form__row project-create-form__row--last"
          rules={[{ required: true, message: 'Please select a status' }]}
        >
          <Select
            variant="borderless"
            className="project-create-form__select"
            placeholder="Status"
            suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
          >
            <Option value="planning">Planning</Option>
            <Option value="in_progress">In progress</Option>
            <Option value="completed">Completed</Option>
            <Option value="on_hold">On hold</Option>
          </Select>
        </AdminFormField>
      </div>

      <div className="project-create-form__group">
        <AdminFormField
          name="beginningDate"
          label="Start date"
          fieldLabel="Start Date"
          icon={<CalendarOutlined />}
        >
          <DatePicker format="YYYY-MM-DD" placeholder="Select date" />
        </AdminFormField>

        <AdminFormField
          name="endDate"
          label="End date"
          fieldLabel="End Date"
          icon={<ClockCircleOutlined />}
          rowClassName="project-create-form__row project-create-form__row--last"
        >
          <DatePicker format="YYYY-MM-DD" placeholder="Select date" />
        </AdminFormField>
      </div>

      <div className="project-create-form__group project-create-form__note-group">
        <AdminFormField layout="note" name="description" label="Note">
          <Input.TextArea rows={4} placeholder="Note" />
        </AdminFormField>
      </div>
    </Form>
  );
}
