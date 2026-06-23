import { useEffect, useState } from 'react';
import { DatePicker, Form, Input, Select, message } from 'antd';
import {
  BellOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminFormField from '@/src/shared/components/AdminFormField';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useTaskStore } from '@/src/store/taskStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

const { TextArea } = Input;
const { Option } = Select;

export default function TaskCreateForm({ onClose, taskToEdit = null }) {
  const [form] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const createTask = useTaskStore((state) => state.create);
  const updateTask = useTaskStore((state) => state.update);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isCompanyAdmin = useAuthStore((state) => state.isCompanyAdmin());

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        let projectsData = [];

        if (isSuperAdmin) {
          const { data } = await apiClient.get('/projects/populated');
          projectsData = data;
        } else if (isCompanyAdmin && user?.companyId) {
          const { data } = await apiClient.get(`/projects/company/${user.companyId}`);
          projectsData = data;
        } else {
          const { data } = await apiClient.get('/projects/my');
          projectsData = data;
        }

        setProjects(projectsData);
      } catch (err) {
        console.error('Failed to fetch projects for task form:', err);
        message.warning(formatApiError(err, 'Failed to load projects'));
      }
    };

    fetchProjects();
  }, [isSuperAdmin, isCompanyAdmin, user]);

  useEffect(() => {
    if (taskToEdit) {
      form.setFieldsValue({
        projectId: typeof taskToEdit.projectId === 'object' ? taskToEdit.projectId?._id : taskToEdit.projectId,
        taskTitle: taskToEdit.taskTitle,
        taskDescription: taskToEdit.taskDescription,
        notes: taskToEdit.notes,
        notifications: (taskToEdit.notifications || []).join('\n'),
        startDate: taskToEdit.startDate ? dayjs(taskToEdit.startDate) : null,
        dueDate: taskToEdit.dueDate ? dayjs(taskToEdit.dueDate) : null,
      });
    } else {
      form.resetFields();
    }
  }, [taskToEdit, form]);

  const onFinish = async (values) => {
    const payload = {
      projectId: values.projectId,
      taskTitle: values.taskTitle.trim(),
      taskDescription: values.taskDescription?.trim() || '',
      notes: values.notes?.trim() || '',
      notifications: values.notifications
        ? values.notifications
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
      startDate: values.startDate ? values.startDate.toISOString() : null,
      dueDate: values.dueDate ? values.dueDate.toISOString() : null,
    };

    try {
      if (taskToEdit) {
        const taskId = getEntityId(taskToEdit);
        if (!taskId) {
          throw new Error('Task id is missing');
        }
        await updateTask(taskId, payload);
      } else {
        await createTask(payload);
      }

      onClose();
      form.resetFields();
    } catch (error) {
      message.error(formatApiError(error, 'Failed to save task'));
    }
  };

  return (
    <Form
      id="task-create-form"
      className="admin-create-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <div className="project-create-form__group">
        <AdminFormField
          name="projectId"
          label="Project"
          fieldLabel="Project"
          icon={<FolderOutlined />}
          rules={[{ required: true, message: 'Please select a project' }]}
        >
          <Select
            variant="borderless"
            className="project-create-form__select"
            placeholder="Project not selected"
            showSearch
            optionFilterProp="children"
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
          name="taskTitle"
          label="Task title"
          fieldLabel="Task title *"
          rowClassName="project-create-form__row project-create-form__row--last"
          rules={[{ required: true, message: 'Please enter a task title' }]}
        >
          <Input placeholder="Enter task title" />
        </AdminFormField>
      </div>

      <div className="project-create-form__group">
        <AdminFormField
          name="startDate"
          label="Start date"
          fieldLabel="Start date"
          icon={<CalendarOutlined />}
          rules={[{ required: true, message: 'Please select a start date' }]}
        >
          <DatePicker format="YYYY-MM-DD" placeholder="Select date" />
        </AdminFormField>

        <AdminFormField
          name="dueDate"
          label="Due date"
          fieldLabel="Due date"
          icon={<ClockCircleOutlined />}
          rowClassName="project-create-form__row project-create-form__row--last"
          rules={[{ required: true, message: 'Please select a due date' }]}
        >
          <DatePicker format="YYYY-MM-DD" placeholder="Select date" />
        </AdminFormField>
      </div>

      <div className="project-create-form__group project-create-form__note-group">
        <AdminFormField layout="note" name="taskDescription" label="Description" fieldLabel="Description">
          <TextArea rows={4} placeholder="Add task description" />
        </AdminFormField>
      </div>

      <div className="project-create-form__group project-create-form__note-group">
        <AdminFormField
          name="notifications"
          label="Notifications"
          fieldLabel="Notifications"
          icon={<BellOutlined />}
          rowClassName="project-create-form__row project-create-form__row--last"
          extra="One notification per line"
        >
          <TextArea
            rows={4}
            placeholder={`For example: Call the client
Review the documents`}
          />
        </AdminFormField>
      </div>

      <div className="project-create-form__group project-create-form__note-group">
        <AdminFormField layout="note" name="notes" label="Internal notes" fieldLabel="Internal notes">
          <TextArea rows={4} placeholder="Add notes" />
        </AdminFormField>
      </div>
    </Form>
  );
}
