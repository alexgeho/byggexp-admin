import { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/apiClient';

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
        const msg = err.response?.data?.message || 'Failed to load data';
        message.warning(msg);
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
        projectManagerId: typeof projectToEdit.projectManagerId === 'object' ? projectToEdit.projectManagerId?._id : projectToEdit.projectManagerId,
        clientCompanyId: typeof projectToEdit.clientCompanyId === 'object'
          ? projectToEdit.clientCompanyId?._id
          : projectToEdit.clientCompanyId,
        workers: (projectToEdit.workers || []).map(w => typeof w === 'object' ? w._id : w),
        description: projectToEdit.description,
      });
    } else {
      form.resetFields();
      if (isCompanyAdmin && user?.companyId) {
        form.setFieldsValue({ clientCompanyId: user.companyId });
      }
    }
  }, [projectToEdit, form, isCompanyAdmin, user]);

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
        await updateProject(projectToEdit._id, payload);
        message.success('Project updated');
      } else {
        await create(payload);
        message.success('Project created');
      }
      
      onClose();
      form.resetFields();
    } catch (err) {
      const msg = err.message || 'Failed to save project';
      message.error(msg);
    }
  };

  return (
    <Form
      id="project-create-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <Form.Item
        name="name"
        label="Project name"
        rules={[{ required: true, message: 'Please enter a project name' }]}
      >
        <Input placeholder="e.g. Office renovation — Norrmalm" disabled={projectToEdit?.useLocationAsName} />
      </Form.Item>

      <Form.Item name="useLocationAsName" label="Use location as a name" valuePropName="checked">
        <Switch onChange={(checked) => {
          if (checked && form.getFieldValue('location')) {
            form.setFieldsValue({ name: form.getFieldValue('location') });
          }
        }} />
      </Form.Item>

      <Form.Item
        name="location"
        label="Location"
        rules={[{ required: true, message: 'Please enter a location' }]}
      >
        <Input placeholder="e.g. Kungsgatan 33, Stockholm" />
      </Form.Item>

      <Form.Item
        name="status"
        label="Status"
        rules={[{ required: true, message: 'Please select a status' }]}
      >
        <Select placeholder="Select a status">
          <Option value="planning">Planning</Option>
          <Option value="in_progress">In progress</Option>
          <Option value="completed">Completed</Option>
          <Option value="on_hold">On hold</Option>
        </Select>
      </Form.Item>

      <Form.Item name="contractNumber" label="Contract №">
        <Input placeholder="e.g. BYG-2025-001" />
      </Form.Item>

      <Form.Item name="beginningDate" label="Beginning date">
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>

      <Form.Item name="endDate" label="End date">
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>

      <Form.Item
        name="ownerId"
        label="Owner"
        rules={[
          { required: true, message: 'Please select an owner' },
          {
            validator: (_, value) =>
              value && /^[0-9a-fA-F]{24}$/.test(value)
              ? Promise.resolve()
              : Promise.reject('Invalid owner ID')
          }
        ]}
      >
        <Select placeholder="Select an owner">
          {users.map(u => (
            <Option key={u._id} value={u._id}>{u.name}</Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="projectManagerId"
        label="Project manager"
        rules={[{ required: true, message: 'Please select a project manager' }]}
      >
        <Select placeholder="Select a project manager">
          {users.map((u) => (
            <Option key={u._id} value={u._id}>
              {u.name}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="clientCompanyId"
        label="Client company"
        rules={[{ required: true, message: 'Please select a client company' }]}
        extra={isCompanyAdmin ? 'Only your company is available' : ''}
      >
        <Select placeholder="Select a company" disabled={isCompanyAdmin}>
          {companies.map((c) => (
            <Option key={c._id} value={c._id}>
              {c.name} {c.email ? `— ${c.email}` : ''}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="workers" label="Workers">
        <Select mode="multiple" placeholder="Add workers">
          {users
            .filter(u => u.role === 'worker')
            .map((u) => (
              <Option key={u._id} value={u._id}>
                {u.name}
              </Option>
            ))}
        </Select>
      </Form.Item>

      <Form.Item name="description" label="Description">
        <Input.TextArea rows={4} placeholder="Project description" />
      </Form.Item>
    </Form>
  );
}
