import { useEffect, useState } from 'react';
import { DatePicker, Form, message } from 'antd';
import dayjs from 'dayjs';
import { Field, Input, Select, Textarea } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useTaskStore } from '@/src/store/taskStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

export default function TaskCreateForm({ onClose, taskToEdit = null }) {
  const [form] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const selectedProjectId = Form.useWatch('projectId', form);
  const selectedAssigneeUserId = Form.useWatch('assigneeUserId', form);
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
    const fetchUsers = async () => {
      try {
        const { data } = isSuperAdmin
          ? await apiClient.get('/users')
          : await apiClient.get('/users/my-company');

        setUsers(data.filter((item) => ['worker', 'projectAdmin'].includes(item.role)));
      } catch (err) {
        console.error('Failed to fetch users for task form:', err);
        message.warning(formatApiError(err, 'Failed to load users'));
      }
    };

    fetchUsers();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (taskToEdit) {
      form.setFieldsValue({
        projectId: typeof taskToEdit.projectId === 'object' ? taskToEdit.projectId?._id : taskToEdit.projectId,
        assigneeUserId: typeof taskToEdit.assigneeUserId === 'object' ? taskToEdit.assigneeUserId?._id : taskToEdit.assigneeUserId,
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
      ...(values.assigneeUserId ? { assigneeUserId: values.assigneeUserId } : { projectId: values.projectId }),
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

  const projectOptions = projects.map((project) => ({
    value: getEntityId(project),
    label: project.name,
  }));

  const userOptions = users.map((item) => ({
    value: getEntityId(item),
    label: item.name || item.email,
  }));

  return (
    <Form
      id="task-create-form"
      className="admin-modal-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <Field
            name="projectId"
            label="Project"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (value || getFieldValue('assigneeUserId')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Please select a project or user'));
                },
              }),
            ]}
          >
            <Select
              placeholder="Project not selected"
              showSearch
              optionFilterProp="label"
              disabled={Boolean(selectedAssigneeUserId)}
              allowClear
              onChange={() => form.setFieldValue('assigneeUserId', undefined)}
              options={projectOptions}
              style={{ width: '100%' }}
            />
          </Field>

          <Field name="assigneeUserId" label="Personal task user">
            <Select
              placeholder="User not selected"
              showSearch
              optionFilterProp="label"
              disabled={Boolean(selectedProjectId)}
              allowClear
              onChange={() => form.setFieldValue('projectId', undefined)}
              options={userOptions}
              style={{ width: '100%' }}
            />
          </Field>

          <div className="admin-modal-form__grid-item--full">
            <Field
              name="taskTitle"
              label="Task title"
              rules={[{ required: true, message: 'Please enter a task title' }]}
            >
              <Input placeholder="Enter task title" />
            </Field>
          </div>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <Field
            name="startDate"
            label="Start date"
            rules={[{ required: true, message: 'Please select a start date' }]}
          >
            <DatePicker format="YYYY-MM-DD" placeholder="Select date" />
          </Field>

          <Field
            name="dueDate"
            label="Due date"
            rules={[{ required: true, message: 'Please select a due date' }]}
          >
            <DatePicker format="YYYY-MM-DD" placeholder="Select date" />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field name="taskDescription" label="Description">
              <Textarea rows={4} placeholder="Add task description" />
            </Field>
          </div>

          <div className="admin-modal-form__grid-item--full">
            <Field
              name="notifications"
              label="Notifications"
              extra="One notification per line"
            >
              <Textarea
                rows={4}
                placeholder={`For example: Call the client
Review the documents`}
              />
            </Field>
          </div>

          <div className="admin-modal-form__grid-item--full">
            <Field name="notes" label="Internal notes">
              <Textarea rows={4} placeholder="Add notes" />
            </Field>
          </div>
        </div>
      </section>
    </Form>
  );
}
