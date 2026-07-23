import { useMemo, useState, useEffect } from 'react';
import { Button, DatePicker, Form, Input, Switch, TimePicker, message } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Field, Input as UiInput, Select, Textarea } from '@/src/ui-kit';
import ProjectLocationPicker from '@/src/features/projects/components/ProjectLocationPicker';
import { useProjectStore } from '@/src/store/projectStore';
import { useToolStore } from '@/src/store/toolStore';
import { useAuthStore } from '@/src/store/authStore';
import apiClient from '@/src/api/apiClient';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';
import { DEFAULT_LOCATION_RADIUS_METERS } from '@/src/utils/projectLocationSearch';
import { SHIFT_GRACE_MINUTE_OPTIONS, buildShiftSchedulePayload, createDefaultShiftSchedule } from '@/src/utils/shiftSchedule';

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On hold' },
];

function LocationSelectButton({ value, onOpen }) {
  return (
    <button
      type="button"
      className={[
        'admin-modal-form__location-trigger',
        !value && 'admin-modal-form__location-trigger--placeholder',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onOpen}
    >
      <span>{value || 'Select location'}</span>
      <RightOutlined />
    </button>
  );
}

export default function ProjectCreateForm({ onClose, projectToEdit = null, showSubmitButton = false }) {
  const [form] = Form.useForm();
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [tools, setTools] = useState([]);
  const { create } = useProjectStore();
  const updateProject = useProjectStore((state) => state.update);
  const attachToolsToProject = useToolStore((state) => state.attachToProject);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isCompanyAdmin = useAuthStore((state) => state.isCompanyAdmin());
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const watchedLocation = Form.useWatch('location', form);
  const watchedLatitude = Form.useWatch('locationLatitude', form);
  const watchedLongitude = Form.useWatch('locationLongitude', form);
  const watchedRadius = Form.useWatch('locationRadiusMeters', form);
  const watchedShiftScheduleEnabled = Form.useWatch('shiftScheduleEnabled', form);
  const useLocationAsName = Form.useWatch('useLocationAsName', form);

  const locationPickerInitialValue = useMemo(
    () => ({
      location: watchedLocation || '',
      latitude: watchedLatitude,
      longitude: watchedLongitude,
      radiusMeters: watchedRadius ?? DEFAULT_LOCATION_RADIUS_METERS,
    }),
    [watchedLocation, watchedLatitude, watchedLongitude, watchedRadius],
  );

  const graceOptions = SHIFT_GRACE_MINUTE_OPTIONS.map((minutes) => ({
    value: minutes,
    label: `${minutes} min`,
  }));

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

        const toolsRes = await apiClient.get('/tools');
        setUsers(usersData);
        setCompanies(companiesData);
        setTools(Array.isArray(toolsRes.data) ? toolsRes.data : []);
      } catch (err) {
        console.error('Fetch error:', err);
        message.warning(formatApiError(err, 'Failed to load data'));
      }
    };

    fetchData();
  }, [isSuperAdmin, isCompanyAdmin, user]);

  useEffect(() => {
    if (projectToEdit) {
      const schedule = projectToEdit.shiftSchedule || createDefaultShiftSchedule();
      form.setFieldsValue({
        name: projectToEdit.name,
        useLocationAsName: projectToEdit.useLocationAsName,
        location: projectToEdit.location,
        locationLatitude: projectToEdit.locationLatitude,
        locationLongitude: projectToEdit.locationLongitude,
        locationRadiusMeters: projectToEdit.locationRadiusMeters ?? DEFAULT_LOCATION_RADIUS_METERS,
        shiftScheduleEnabled: schedule.enabled,
        workDayStartTime: dayjs(schedule.workDayStartTime || '07:00', 'HH:mm'),
        workDayEndTime: dayjs(schedule.workDayEndTime || '16:00', 'HH:mm'),
        startGraceMinutes: schedule.startGraceMinutes ?? 20,
        endGraceMinutes: schedule.endGraceMinutes ?? 20,
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
        toolIds: [],
        description: projectToEdit.description,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        useLocationAsName: true,
        status: 'planning',
        locationRadiusMeters: DEFAULT_LOCATION_RADIUS_METERS,
        shiftScheduleEnabled: false,
        workDayStartTime: dayjs('07:00', 'HH:mm'),
        workDayEndTime: dayjs('16:00', 'HH:mm'),
        startGraceMinutes: 20,
        endGraceMinutes: 20,
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
        locationLatitude: values.locationLatitude,
        locationLongitude: values.locationLongitude,
        locationRadiusMeters: values.locationRadiusMeters ?? DEFAULT_LOCATION_RADIUS_METERS,
        shiftSchedule: buildShiftSchedulePayload({
          enabled: values.shiftScheduleEnabled,
          workDayStartTime: values.workDayStartTime?.format('HH:mm'),
          workDayEndTime: values.workDayEndTime?.format('HH:mm'),
          startGraceMinutes: values.startGraceMinutes,
          endGraceMinutes: values.endGraceMinutes,
        }),
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
        if (values.toolIds?.length) {
          await attachToolsToProject(projectId, values.toolIds);
        }
        message.success('Project updated');
      } else {
        const createdProject = await create(payload);
        const projectId = getEntityId(createdProject);
        if (values.toolIds?.length && projectId) {
          await attachToolsToProject(projectId, values.toolIds);
        }
        message.success('Project created');
      }

      onClose();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, 'Failed to save project'));
    }
  };

  const handleLocationConfirm = ({
    location,
    locationLatitude,
    locationLongitude,
    locationRadiusMeters,
  }) => {
    form.setFieldsValue({
      location,
      locationLatitude,
      locationLongitude,
      locationRadiusMeters,
    });
    form.validateFields(['location']);
  };

  const workerOptions = users
    .filter((item) => item.role === 'worker')
    .map((item) => ({ value: getEntityId(item), label: item.name }));

  const userOptions = users.map((item) => ({
    value: getEntityId(item),
    label: item.name,
  }));

  const companyOptions = companies.map((item) => ({
    value: getEntityId(item),
    label: item.email ? `${item.name} - ${item.email}` : item.name,
  }));

  const toolOptions = tools.map((item) => ({
    value: getEntityId(item),
    label: item.name,
  }));

  return (
    <>
      <Form
        id="project-create-form"
        className="admin-modal-form"
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item name="locationLatitude" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="locationLongitude" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="locationRadiusMeters" hidden>
          <Input />
        </Form.Item>

        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">General</h3>
          <div className="admin-modal-form__grid">
            <div className="admin-modal-form__grid-item--full">
              <Field
                name="location"
                label="Location"
                rules={[
                  {
                    validator: (_, value) => {
                      const latitude = form.getFieldValue('locationLatitude');
                      const longitude = form.getFieldValue('locationLongitude');

                      if (!value) {
                        return Promise.resolve();
                      }

                      if (latitude != null && longitude != null) {
                        return Promise.resolve();
                      }

                      return Promise.reject(new Error('Search for an address first'));
                    },
                  },
                ]}
              >
                <LocationSelectButton onOpen={() => setLocationPickerOpen(true)} />
              </Field>
            </div>

            <div className="admin-modal-form__grid-item--full">
              <Field name="useLocationAsName" label="Use location as name" valuePropName="checked">
                <Switch />
              </Field>
            </div>

            <Field
              name="name"
              label="Project name"
              rules={[{ required: true, message: 'Please enter a project name' }]}
            >
              <UiInput placeholder="Project name" disabled={useLocationAsName} />
            </Field>

            <Field name="contractNumber" label="Contract No.">
              <UiInput placeholder="e.g. BYG-2025-001" />
            </Field>
          </div>
        </section>

        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">Team</h3>
          <div className="admin-modal-form__grid">
            <Field name="workers" label="Workers">
              <Select
                mode="multiple"
                placeholder="Project team"
                options={workerOptions}
                style={{ width: '100%' }}
              />
            </Field>

            <Field name="toolIds" label="Tools">
              <Select
                mode="multiple"
                placeholder="Attach tools"
                options={toolOptions}
                style={{ width: '100%' }}
              />
            </Field>

            <Field
              name="ownerId"
              label="Owner"
              rules={[
                {
                  validator: (_, value) =>
                    !value || /^[0-9a-fA-F]{24}$/.test(value)
                      ? Promise.resolve()
                      : Promise.reject(new Error('Invalid owner ID')),
                },
              ]}
            >
              <Select placeholder="Owner" options={userOptions} style={{ width: '100%' }} allowClear />
            </Field>

            <Field name="projectManagerId" label="Project manager">
              <Select placeholder="Project manager" options={userOptions} style={{ width: '100%' }} allowClear />
            </Field>

            <Field
              name="clientCompanyId"
              label="Client company"
              extra={isCompanyAdmin ? 'Only your company is available' : undefined}
            >
              <Select
                placeholder="Select company"
                disabled={isCompanyAdmin}
                options={companyOptions}
                style={{ width: '100%' }}
                allowClear
              />
            </Field>

            <Field name="status" label="Status">
              <Select placeholder="Status" options={STATUS_OPTIONS} style={{ width: '100%' }} />
            </Field>
          </div>
        </section>

        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">Shift schedule</h3>
          <div className="admin-modal-form__grid">
            <div className="admin-modal-form__grid-item--full">
              <Field name="shiftScheduleEnabled" label="Shift time window" valuePropName="checked">
                <Switch />
              </Field>
            </div>

            <Field
              name="workDayStartTime"
              label="Work day starts"
              rules={
                watchedShiftScheduleEnabled
                  ? [{ required: true, message: 'Please select work day start time' }]
                  : []
              }
            >
              <TimePicker
                format="HH:mm"
                minuteStep={5}
                needConfirm={false}
                disabled={!watchedShiftScheduleEnabled}
                placeholder="07:00"
              />
            </Field>

            <Field
              name="workDayEndTime"
              label="Work day ends"
              rules={
                watchedShiftScheduleEnabled
                  ? [{ required: true, message: 'Please select work day end time' }]
                  : []
              }
            >
              <TimePicker
                format="HH:mm"
                minuteStep={5}
                needConfirm={false}
                disabled={!watchedShiftScheduleEnabled}
                placeholder="16:00"
              />
            </Field>

            <Field name="startGraceMinutes" label="Start grace (minutes)">
              <Select
                disabled={!watchedShiftScheduleEnabled}
                options={graceOptions}
                style={{ width: '100%' }}
              />
            </Field>

            <Field name="endGraceMinutes" label="End grace (minutes)">
              <Select
                disabled={!watchedShiftScheduleEnabled}
                options={graceOptions}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
        </section>

        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">Dates</h3>
          <div className="admin-modal-form__grid">
            <Field name="beginningDate" label="Start date">
              <DatePicker format="YYYY-MM-DD" placeholder="Select date" />
            </Field>

            <Field name="endDate" label="End date">
              <DatePicker format="YYYY-MM-DD" placeholder="Select date" />
            </Field>
          </div>
        </section>

        <section className="admin-modal-form__section">
          <div className="admin-modal-form__grid">
            <div className="admin-modal-form__grid-item--full">
              <Field name="description" label="Note">
                <Textarea rows={4} placeholder="Note" />
              </Field>
            </div>
          </div>
        </section>

        {showSubmitButton ? (
          <section className="admin-modal-form__section project-settings-tab__actions">
            <Button type="primary" htmlType="submit">
              Save changes
            </Button>
          </section>
        ) : null}
      </Form>

      <ProjectLocationPicker
        open={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onConfirm={handleLocationConfirm}
        initialValue={locationPickerInitialValue}
      />
    </>
  );
}
