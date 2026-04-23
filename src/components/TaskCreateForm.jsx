import { useEffect, useState } from 'react';
import { DatePicker, Form, Input, Select, message } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/apiClient';
import { useAuthStore } from '../store/authStore';
import { useTaskStore } from '../store/taskStore';

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
        const msg = err.response?.data?.message || 'Не удалось загрузить проекты';
        message.warning(msg);
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
        await updateTask(taskToEdit._id, payload);
      } else {
        await createTask(payload);
      }

      onClose();
      form.resetFields();
    } catch {
      // Messages are handled in the store.
    }
  };

  return (
    <Form
      id="task-create-form"
      form={form}
      layout="vertical"
      onFinish={onFinish}
    >
      <Form.Item
        name="projectId"
        label="Project"
        rules={[{ required: true, message: 'Выберите проект' }]}
      >
        <Select
          placeholder="Выберите проект"
          showSearch
          optionFilterProp="children"
        >
          {projects.map((project) => (
            <Option key={project._id} value={project._id}>
              {project.name}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="taskTitle"
        label="Task title"
        rules={[{ required: true, message: 'Введите название задачи' }]}
      >
        <Input placeholder="e.g. Prepare permit documents" />
      </Form.Item>

      <Form.Item name="taskDescription" label="Description">
        <TextArea rows={4} placeholder="Описание задачи" />
      </Form.Item>

      <Form.Item name="notes" label="Notes">
        <TextArea rows={3} placeholder="Внутренние заметки" />
      </Form.Item>

      <Form.Item
        name="notifications"
        label="Notifications"
        extra="По одному уведомлению на строку"
      >
        <TextArea rows={4} placeholder={`Например: Позвонить клиенту
Проверить документы`} />
      </Form.Item>

      <Form.Item
        name="startDate"
        label="Start date"
        rules={[{ required: true, message: 'Выберите дату начала' }]}
      >
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>

      <Form.Item
        name="dueDate"
        label="Due date"
        rules={[{ required: true, message: 'Выберите дедлайн' }]}
      >
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>
    </Form>
  );
}
