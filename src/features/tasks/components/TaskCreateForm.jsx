import { useEffect, useState } from 'react';
import { Checkbox, DatePicker, Form, InputNumber, TimePicker, message } from 'antd';
import dayjs from 'dayjs';
import { Field, Input, Select, Textarea } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useTaskStore } from '@/src/store/taskStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

// Merge a date-picker value with a separate time-picker value into one ISO
// string. When only the date is set, fall back to a sensible default hour.
function combineDateTime(dateVal, timeVal, defaultHour) {
  if (!dateVal) return null;
  const hour = timeVal ? timeVal.hour() : defaultHour;
  const minute = timeVal ? timeVal.minute() : 0;
  return dateVal.hour(hour).minute(minute).second(0).millisecond(0).toISOString();
}

export default function TaskCreateForm({
  onClose,
  taskToEdit = null,
  defaultProjectId = null,
}) {
  const [form] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const selectedProjectId = Form.useWatch('projectId', form);
  const reminderBefore = Form.useWatch('reminderBefore', form);
  const reminderRepeat = Form.useWatch('reminderRepeat', form);
  const remindUntilDone = Form.useWatch('remindUntilDone', form);
  const escalateToBoss = Form.useWatch('escalateToBoss', form);
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
      const ns = taskToEdit.notificationSettings || {};
      form.setFieldsValue({
        projectId: typeof taskToEdit.projectId === 'object' ? taskToEdit.projectId?._id : taskToEdit.projectId,
        taskTitle: taskToEdit.taskTitle,
        taskDescription: taskToEdit.taskDescription,
        notes: taskToEdit.notes,
        notifications: (taskToEdit.notifications || []).join('\n'),
        startDate: taskToEdit.startDate ? dayjs(taskToEdit.startDate) : null,
        startTime: taskToEdit.startDate ? dayjs(taskToEdit.startDate) : null,
        dueDate: taskToEdit.dueDate ? dayjs(taskToEdit.dueDate) : null,
        dueTime: taskToEdit.dueDate ? dayjs(taskToEdit.dueDate) : null,
        priority: taskToEdit.priority || 'normal',
        reminderBefore: Boolean(ns.autoReminder || ns.customReminder),
        reminderRepeat: ns.repeat || 'none',
        reminderIntervalMinutes: ns.repeatIntervalMinutes || 15,
        reminderMessage: ns.customMessage || '',
        remindUntilDone: Boolean(ns.remindUntilDone),
        maxReminders: ns.maxReminders || 3,
        escalateToBoss: Boolean(ns.escalateToBoss),
        escalateToUserIds: Array.isArray(ns.escalateToUserIds) ? ns.escalateToUserIds : [],
        assigneeIds: Array.isArray(ns.assignees)
          ? ns.assignees.map((assignee) => assignee.id).filter(Boolean)
          : [],
      });
    } else {
      form.resetFields();
      if (defaultProjectId) {
        form.setFieldsValue({ projectId: defaultProjectId });
      }
    }
  }, [defaultProjectId, taskToEdit, form]);

  const isProjectLocked = Boolean(defaultProjectId && !taskToEdit);

  const onFinish = async (values) => {
    const beforeOn = Boolean(values.reminderBefore);
    const untilDone = Boolean(values.remindUntilDone);
    const customMessage = (values.reminderMessage || '').trim();

    // Who gets notified/reminded: a chosen subset of the project team, or (when
    // none picked) the whole project team.
    const chosenAssignees = (values.assigneeIds || [])
      .map((id) => users.find((item) => getEntityId(item) === id))
      .filter(Boolean)
      .map((item) => ({
        id: getEntityId(item),
        name: item.name || item.email || '',
        profession: item.profession || '',
      }));

    const escalateIds = untilDone && values.escalateToBoss
      ? (values.escalateToUserIds || [])
          .map((id) => users.find((item) => getEntityId(item) === id))
          .filter(Boolean)
          .map((item) => getEntityId(item))
      : [];

    const notificationSettings = {
      assignees: chosenAssignees,
      allMembersNotification: chosenAssignees.length === 0,
      autoReminder: beforeOn && !customMessage,
      customReminder: beforeOn && Boolean(customMessage),
      customMessage: beforeOn ? customMessage : '',
      repeat: beforeOn ? (values.reminderRepeat || 'none') : 'none',
      repeatIntervalMinutes: Number(values.reminderIntervalMinutes) || 15,
      remindUntilDone: untilDone,
      maxReminders: untilDone ? (Number(values.maxReminders) || 0) : 0,
      escalateToBoss: untilDone && Boolean(values.escalateToBoss),
      escalateToUserIds: escalateIds,
    };

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
      notificationSettings,
      startDate: combineDateTime(values.startDate, values.startTime, 8),
      dueDate: combineDateTime(values.dueDate, values.dueTime, 17),
      priority: values.priority || 'normal',
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

  // Assignee options for a project task: the project's members when the project
  // exposes them, otherwise every company worker/projectAdmin as a fallback.
  const selectedProject = projects.find(
    (project) => getEntityId(project) === selectedProjectId,
  );
  const projectMemberIds = selectedProject
    ? new Set(
        [
          selectedProject.ownerId,
          selectedProject.projectManagerId,
          ...(selectedProject.projectAdmins || []),
          ...(selectedProject.workers || []),
        ]
          .filter(Boolean)
          .map((value) => String(typeof value === 'object' ? getEntityId(value) : value)),
      )
    : null;
  const useMemberFilter = Boolean(projectMemberIds && projectMemberIds.size > 0);
  const assigneeOptions = users
    .filter((item) => !useMemberFilter || projectMemberIds.has(String(getEntityId(item))))
    .map((item) => ({ value: getEntityId(item), label: item.name || item.email }));

  return (
    <Form
      id="task-create-form"
      className="admin-modal-form"
      form={form}
      layout="vertical"
      initialValues={{
        priority: 'normal',
        reminderBefore: false,
        reminderRepeat: 'none',
        reminderIntervalMinutes: 15,
        remindUntilDone: false,
        maxReminders: 3,
        escalateToBoss: false,
        escalateToUserIds: [],
        assigneeIds: [],
      }}
      onFinish={onFinish}
    >
      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field
              name="projectId"
              label="Project"
              rules={[{ required: true, message: 'Please select a project' }]}
            >
              <Select
                placeholder="Project not selected"
                showSearch
                optionFilterProp="label"
                disabled={isProjectLocked}
                allowClear={!isProjectLocked}
                onChange={() => form.setFieldValue('assigneeIds', [])}
                options={projectOptions}
                style={{ width: '100%' }}
              />
            </Field>
          </div>

          <div className="admin-modal-form__grid-item--full">
            <Field
              name="taskTitle"
              label="Task title"
              rules={[{ required: true, message: 'Please enter a task title' }]}
            >
              <Input placeholder="Enter task title" />
            </Field>
          </div>

          <div className="admin-modal-form__grid-item--full">
            <Field
              name="assigneeIds"
              label="Assign to"
              extra="Leave empty to notify the whole project team."
            >
              <Select
                mode="multiple"
                placeholder="Whole project team"
                showSearch
                optionFilterProp="label"
                allowClear
                disabled={!selectedProjectId}
                options={assigneeOptions}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <Field name="startDate" label="Start date">
            <DatePicker format="YYYY-MM-DD" placeholder="Select date" style={{ width: '100%' }} />
          </Field>

          <Field name="startTime" label="Start time">
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              needConfirm={false}
              placeholder="e.g. 07:00"
              style={{ width: '100%' }}
            />
          </Field>

          <Field name="dueDate" label="Due date">
            <DatePicker format="YYYY-MM-DD" placeholder="Select date" style={{ width: '100%' }} />
          </Field>

          <Field
            name="dueTime"
            label="Due time"
            extra="The exact deadline — reminders fire from this time."
          >
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              needConfirm={false}
              placeholder="e.g. 14:00"
              style={{ width: '100%' }}
            />
          </Field>

          <Field name="priority" label="Priority">
            <Select
              options={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
              ]}
              style={{ width: '100%' }}
            />
          </Field>
        </div>
      </section>

      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field name="reminderBefore" valuePropName="checked">
              <Checkbox>Remind before the deadline</Checkbox>
            </Field>
          </div>

          {reminderBefore ? (
            <Field name="reminderRepeat" label="Repeat">
              <Select
                options={[
                  { value: 'none', label: 'Once (1 h before)' },
                  { value: 'minutes', label: 'Every N minutes' },
                  { value: 'hourly', label: 'Hourly' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                ]}
                style={{ width: '100%' }}
              />
            </Field>
          ) : null}

          <div className="admin-modal-form__grid-item--full">
            <Field
              name="remindUntilDone"
              valuePropName="checked"
              extra="Keeps pushing a reminder every N minutes after the due date until the task is marked done. Requires a due date & time."
            >
              <Checkbox>Keep reminding after the deadline until it&apos;s done</Checkbox>
            </Field>
          </div>

          {(reminderBefore && reminderRepeat === 'minutes') || remindUntilDone ? (
            <div className="admin-modal-form__grid-item--full">
              <Field
                name="reminderIntervalMinutes"
                label="Reminder interval"
                extra="How often to repeat the reminder — default 15 min."
              >
                <InputNumber
                  min={1}
                  max={180}
                  addonAfter="min"
                  placeholder="15"
                  style={{ width: 180 }}
                />
              </Field>
            </div>
          ) : null}

          {remindUntilDone ? (
            <div className="admin-modal-form__grid-item--full">
              <Field
                name="maxReminders"
                label="Number of reminders to the assignee"
                extra="After this many, escalate (if enabled). 0 = remind until done, no escalation."
              >
                <InputNumber
                  min={0}
                  max={100}
                  addonAfter="times"
                  placeholder="3"
                  style={{ width: 180 }}
                />
              </Field>
            </div>
          ) : null}

          {remindUntilDone ? (
            <div className="admin-modal-form__grid-item--full">
              <Field name="escalateToBoss" valuePropName="checked">
                <Checkbox>Then notify the boss</Checkbox>
              </Field>
            </div>
          ) : null}

          {remindUntilDone && escalateToBoss ? (
            <div className="admin-modal-form__grid-item--full">
              <Field
                name="escalateToUserIds"
                label="Escalate to"
                extra="Leave empty to notify the project manager / owner."
              >
                <Select
                  mode="multiple"
                  placeholder="Project manager / owner"
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  disabled={!selectedProjectId}
                  options={assigneeOptions}
                  style={{ width: '100%' }}
                />
              </Field>
            </div>
          ) : null}

          {reminderBefore ? (
            <div className="admin-modal-form__grid-item--full">
              <Field
                name="reminderMessage"
                label="Custom reminder message"
                extra="Leave empty for the default message"
              >
                <Input placeholder="e.g. Order the materials" />
              </Field>
            </div>
          ) : null}
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
