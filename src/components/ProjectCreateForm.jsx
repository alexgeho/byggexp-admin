import { useState, useEffect } from 'react';
import { Form, Input, Select, Switch, DatePicker, message } from 'antd';
import {
  CalendarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FlagOutlined,
  NumberOutlined,
  RightOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
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
      className="admin-create-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <div>
        <h3 className="project-create-form__section-title">General</h3>
        <div className="project-create-form__group">
          <Form.Item
            className="project-create-form__item"
            name="location"
            label="Location"
            rules={[{ required: true, message: 'Please enter a location' }]}
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <EnvironmentOutlined />
              </span>
              <div className="project-create-form__field-main">
                <Input placeholder="Location" />
              </div>
            </div>
          </Form.Item>

          <Form.Item
            className="project-create-form__item"
            name="useLocationAsName"
            label="Use location as a name"
            valuePropName="checked"
          >
            <div className="project-create-form__row project-create-form__row--switch">
              <div className="project-create-form__switch-label">Use location as a name</div>
              <Switch />
            </div>
          </Form.Item>

          <Form.Item
            className="project-create-form__item"
            name="name"
            label="Project name"
            rules={[{ required: true, message: 'Please enter a project name' }]}
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <FileTextOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Project name</div>
                <Input
                  placeholder="e.g. Office renovation - Norrmalm"
                  disabled={useLocationAsName}
                />
              </div>
            </div>
          </Form.Item>
        </div>
      </div>

      <div>
        <div className="project-create-form__group">
          <Form.Item
            className="project-create-form__item"
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please select a status' }]}
          >
            <div className="project-create-form__row project-create-form__row--last">
              <span className="project-create-form__icon">
                <FlagOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Status</div>
                <Select
                  variant="borderless"
                  className="project-create-form__select"
                  placeholder="Select a status"
                  suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
                >
                  <Option value="planning">Planning</Option>
                  <Option value="in_progress">In progress</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="on_hold">On hold</Option>
                </Select>
              </div>
            </div>
          </Form.Item>

          <Form.Item
            className="project-create-form__item"
            name="contractNumber"
            label="Contract №"
          >
            <div className="project-create-form__row project-create-form__row--last">
              <span className="project-create-form__icon">
                <NumberOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Contract No.</div>
                <Input placeholder="e.g. BYG-2025-001" />
              </div>
            </div>
          </Form.Item>
        </div>
      </div>

      <div>
        <h3 className="project-create-form__section-title">Team</h3>
        <div className="project-create-form__group">
          <Form.Item
            className="project-create-form__item"
            name="workers"
            label="Workers"
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <TeamOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Project team</div>
                <Select
                  variant="borderless"
                  className="project-create-form__select project-create-form__select--multiple"
                  mode="multiple"
                  placeholder="Add workers"
                  suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
                >
                  {users
                    .filter((u) => u.role === 'worker')
                    .map((u) => (
                      <Option key={u._id} value={u._id}>
                        {u.name}
                      </Option>
                    ))}
                </Select>
              </div>
            </div>
          </Form.Item>

          <Form.Item
            className="project-create-form__item"
            name="ownerId"
            label="Owner"
            rules={[
              { required: true, message: 'Please select an owner' },
              {
                validator: (_, value) =>
                  value && /^[0-9a-fA-F]{24}$/.test(value)
                    ? Promise.resolve()
                    : Promise.reject('Invalid owner ID'),
              },
            ]}
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <UserOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Owner</div>
                <Select
                  variant="borderless"
                  className="project-create-form__select"
                  placeholder="Select an owner"
                  suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
                >
                  {users.map((u) => (
                    <Option key={u._id} value={u._id}>{u.name}</Option>
                  ))}
                </Select>
              </div>
            </div>
          </Form.Item>

          <Form.Item
            className="project-create-form__item"
            name="projectManagerId"
            label="Project manager"
            rules={[{ required: true, message: 'Please select a project manager' }]}
          >
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <UserOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Project manager</div>
                <Select
                  variant="borderless"
                  className="project-create-form__select"
                  placeholder="Select a project manager"
                  suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
                >
                  {users.map((u) => (
                    <Option key={u._id} value={u._id}>
                      {u.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
          </Form.Item>

          <Form.Item
            className="project-create-form__item"
            name="clientCompanyId"
            label="Client company"
            rules={[{ required: true, message: 'Please select a client company' }]}
            extra={isCompanyAdmin ? 'Only your company is available' : ''}
          >
            <div className="project-create-form__row project-create-form__row--last">
              <span className="project-create-form__icon">
                <ShopOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Client company</div>
                <Select
                  variant="borderless"
                  className="project-create-form__select"
                  placeholder="Select a company"
                  disabled={isCompanyAdmin}
                  suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
                >
                  {companies.map((c) => (
                    <Option key={c._id} value={c._id}>
                      {c.name} {c.email ? `- ${c.email}` : ''}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
          </Form.Item>
        </div>
      </div>

      <div>
        <h3 className="project-create-form__section-title">Schedule</h3>
        <div className="project-create-form__group">
          <Form.Item className="project-create-form__item" name="beginningDate" label="Beginning date">
            <div className="project-create-form__row">
              <span className="project-create-form__icon">
                <CalendarOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">Beginning date</div>
                <DatePicker format="YYYY-MM-DD" />
              </div>
            </div>
          </Form.Item>

          <Form.Item className="project-create-form__item" name="endDate" label="End date">
            <div className="project-create-form__row project-create-form__row--last">
              <span className="project-create-form__icon">
                <CalendarOutlined />
              </span>
              <div className="project-create-form__field-main">
                <div className="project-create-form__field-label">End date</div>
                <DatePicker format="YYYY-MM-DD" />
              </div>
            </div>
          </Form.Item>
        </div>
      </div>

      <div>
        <h3 className="project-create-form__section-title">Notes</h3>
        <div className="project-create-form__group project-create-form__note-group">
          <Form.Item className="project-create-form__item" name="description" label="Description">
            <div className="project-create-form__field-main">
              <Input.TextArea rows={4} placeholder="Note" />
            </div>
          </Form.Item>
        </div>
      </div>
    </Form>
  );
}
