import { useEffect, useRef, useState } from 'react';
import { DatePicker, Form, InputNumber, TimePicker, message } from 'antd';
import dayjs from 'dayjs';
import { Field, Input, Select, Textarea } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import apiClient from '@/src/api/apiClient';
import { useAuthStore } from '@/src/store/authStore';
import { useTaskStore } from '@/src/store/taskStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';

// Reminder interval options (minutes). 0 = off.
const INTERVAL_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 15, label: 'Every 15 min' },
  { value: 30, label: 'Every 30 min' },
  { value: 60, label: 'Every hour' },
  { value: 1440, label: 'Every day' },
];

// How the task repeats. On completion the next occurrence is created with its
// dates rolled forward by this cadence.
const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Every weekday (Mon–Fri)' },
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
];

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
  const t = useT();
  const [form] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const selectedProjectId = Form.useWatch('projectId', form);
  const reminderInterval = Form.useWatch('reminderInterval', form);
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
        message.warning(formatApiError(err, t('Failed to load projects')));
      }
    };

    fetchProjects();
  }, [isSuperAdmin, isCompanyAdmin, user, t]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = isSuperAdmin
          ? await apiClient.get('/users')
          : await apiClient.get('/users/my-company');

        setUsers(data.filter((item) => ['worker', 'projectAdmin'].includes(item.role)));
      } catch (err) {
        console.error('Failed to fetch users for task form:', err);
        message.warning(formatApiError(err, t('Failed to load users')));
      }
    };

    fetchUsers();
  }, [isSuperAdmin, t]);

  useEffect(() => {
    if (taskToEdit) {
      const ns = taskToEdit.notificationSettings || {};
      const remindOn = Boolean(ns.remindUntilDone);
      const storedInterval = Number(ns.repeatIntervalMinutes) || 15;
      const knownInterval = INTERVAL_OPTIONS.some((o) => o.value === storedInterval);
      form.setFieldsValue({
        projectId: typeof taskToEdit.projectId === 'object' ? taskToEdit.projectId?._id : taskToEdit.projectId,
        taskTitle: taskToEdit.taskTitle,
        taskDescription: taskToEdit.taskDescription,
        notes: taskToEdit.notes,
        startDate: taskToEdit.startDate ? dayjs(taskToEdit.startDate) : null,
        startTime: taskToEdit.startDate ? dayjs(taskToEdit.startDate) : null,
        dueDate: taskToEdit.dueDate ? dayjs(taskToEdit.dueDate) : null,
        dueTime: taskToEdit.dueDate ? dayjs(taskToEdit.dueDate) : null,
        priority: taskToEdit.priority || 'normal',
        recurrence: taskToEdit.recurrence || 'none',
        reminderInterval: remindOn ? (knownInterval ? storedInterval : 15) : 0,
        escalateAfter: ns.escalateToBoss ? (Number(ns.maxReminders) || 3) : 0,
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

  // Guard against double-submit: the save button lives in AdminModal and isn't
  // disabled while the create/update request is in flight, so a fast double
  // click would fire onFinish twice and create duplicate tasks. A synchronous
  // ref blocks the re-entrant call immediately (a state flag would be read
  // stale by the second click before React re-renders).
  const submittingRef = useRef(false);

  const onFinish = async (values) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
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

    const interval = Number(values.reminderInterval) || 0;
    const remindOn = interval > 0;
    const escAfter = remindOn ? Math.max(0, Number(values.escalateAfter) || 0) : 0;

    const notificationSettings = {
      assignees: chosenAssignees,
      allMembersNotification: chosenAssignees.length === 0,
      autoReminder: false,
      customReminder: false,
      customMessage: '',
      repeat: 'none',
      repeatIntervalMinutes: remindOn ? interval : 15,
      remindUntilDone: remindOn,
      maxReminders: escAfter,
      escalateToBoss: remindOn && escAfter > 0,
      escalateToUserIds: [],
    };

    const payload = {
      projectId: values.projectId,
      taskTitle: values.taskTitle.trim(),
      taskDescription: values.taskDescription?.trim() || '',
      notes: values.notes?.trim() || '',
      notifications: [],
      notificationSettings,
      startDate: combineDateTime(values.startDate, values.startTime, 8),
      dueDate: combineDateTime(values.dueDate, values.dueTime, 17),
      priority: values.priority || 'normal',
      recurrence: values.recurrence || 'none',
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
      message.error(formatApiError(error, t('Failed to save task')));
    } finally {
      submittingRef.current = false;
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

  const remindOn = Number(reminderInterval) > 0;

  return (
    <Form
      id="task-create-form"
      className="admin-modal-form"
      form={form}
      layout="vertical"
      initialValues={{
        // Default a new task's start/due to today so the date is pre-filled and
        // visible; the user still picks the time and can move the date to a later
        // day. Edit mode overrides these from the task in the effect above.
        startDate: dayjs(),
        dueDate: dayjs(),
        priority: 'normal',
        recurrence: 'none',
        reminderInterval: 15,
        escalateAfter: 3,
        assigneeIds: [],
      }}
      onFinish={onFinish}
    >
      {/* 1 — Task title */}
      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field
              name="taskTitle"
              label={t('Task title')}
              rules={[{ required: true, message: t('Please enter a task title') }]}
            >
              <Input placeholder={t('Enter task title')} />
            </Field>
          </div>

          {/* 2 — Project + Assign to */}
          <Field
            name="projectId"
            label={t('Project')}
            rules={[{ required: true, message: t('Please select a project') }]}
          >
            <Select
              placeholder={t('Project not selected')}
              showSearch
              optionFilterProp="label"
              disabled={isProjectLocked}
              allowClear={!isProjectLocked}
              onChange={() => form.setFieldValue('assigneeIds', [])}
              options={projectOptions}
              style={{ width: '100%' }}
            />
          </Field>

          <Field
            name="assigneeIds"
            label={t('Assign to')}
            extra={t('Leave empty to notify the whole project team.')}
          >
            <Select
              mode="multiple"
              placeholder={t('Whole project team')}
              showSearch
              optionFilterProp="label"
              allowClear
              disabled={!selectedProjectId}
              options={assigneeOptions}
              style={{ width: '100%' }}
            />
          </Field>
        </div>
      </section>

      {/* 3 — Start, 4 — Due */}
      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <Field name="startDate" label={t('Start date')}>
            <DatePicker format="YYYY-MM-DD" placeholder={t('Select date')} style={{ width: '100%' }} />
          </Field>

          <Field name="startTime" label={t('Start time')}>
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              needConfirm={false}
              placeholder={t('e.g. 07:00')}
              style={{ width: '100%' }}
            />
          </Field>

          <Field name="dueDate" label={t('Due date')}>
            <DatePicker format="YYYY-MM-DD" placeholder={t('Select date')} style={{ width: '100%' }} />
          </Field>

          <Field
            name="dueTime"
            label={t('Due time')}
            extra={t('The exact deadline — reminders fire from this time.')}
          >
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              needConfirm={false}
              placeholder={t('e.g. 14:00')}
              style={{ width: '100%' }}
            />
          </Field>
        </div>
      </section>

      {/* 5 — Reminders + escalation */}
      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <Field
            name="reminderInterval"
            label={t('Reminders')}
            extra={t('Repeat after the deadline until completion is confirmed.')}
          >
            <Select
              options={INTERVAL_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
              style={{ width: '100%' }}
            />
          </Field>

          {remindOn ? (
            <Field
              name="escalateAfter"
              label={t('Notify the boss after')}
              extra={t('0 = keep reminding the assignee, no escalation. Boss = project manager / owner.')}
            >
              <InputNumber min={0} max={100} addonAfter={t('reminders')} style={{ width: '100%' }} />
            </Field>
          ) : null}

          <Field name="priority" label={t('Priority')}>
            <Select
              options={[
                { value: 'low', label: t('Low') },
                { value: 'normal', label: t('Normal') },
                { value: 'high', label: t('High') },
              ]}
              style={{ width: '100%' }}
            />
          </Field>

          <Field
            name="recurrence"
            label={t('Repeat')}
            extra={t('Creates the next occurrence automatically when this one is completed.')}
          >
            <Select
              options={RECURRENCE_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
              style={{ width: '100%' }}
            />
          </Field>
        </div>
      </section>

      {/* Details */}
      <section className="admin-modal-form__section">
        <div className="admin-modal-form__grid">
          <div className="admin-modal-form__grid-item--full">
            <Field name="taskDescription" label={t('Description')}>
              <Textarea rows={4} placeholder={t('Add task description')} />
            </Field>
          </div>

          <div className="admin-modal-form__grid-item--full">
            <Field name="notes" label={t('Internal notes')}>
              <Textarea rows={3} placeholder={t('Add notes')} />
            </Field>
          </div>
        </div>
      </section>
    </Form>
  );
}
