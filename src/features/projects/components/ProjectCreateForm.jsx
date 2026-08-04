import { useMemo, useState, useEffect } from 'react';
import { Button, DatePicker, Form, Input, InputNumber, Switch, TimePicker, message } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Field, Input as UiInput, Select, Textarea } from '@/src/ui-kit';
import ProjectLocationPicker from '@/src/features/projects/components/ProjectLocationPicker';
import AdminModal from '@/src/shared/components/AdminModal';
import ClientCreateForm from '@/src/features/clients/components/ClientCreateForm';
import { useProjectStore } from '@/src/store/projectStore';
import { useToolStore } from '@/src/store/toolStore';
import { useClientStore } from '@/src/store/clientStore';
import { useAuthStore } from '@/src/store/authStore';
import apiClient from '@/src/api/apiClient';
import { getEntityId } from '@/src/utils/entityId';
import { formatClientName } from '@/src/utils/clientName';
import { formatApiError } from '@/src/utils/formError';
import { DEFAULT_LOCATION_RADIUS_METERS } from '@/src/utils/projectLocationSearch';
import { SHIFT_GRACE_MINUTE_OPTIONS, buildShiftSchedulePayload, createDefaultShiftSchedule } from '@/src/utils/shiftSchedule';

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On hold' },
];

const clientOptionLabel = (client) => formatClientName(client) || 'Unnamed client';

const normalizeAmount = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const amountFieldFormatter = (value) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const amountFieldParser = (value) => (value ? value.replace(/\s/g, '') : '');

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
  const [users, setUsers] = useState([]);
  const [tools, setTools] = useState([]);
  const { create } = useProjectStore();
  const updateProject = useProjectStore((state) => state.update);
  const attachToolsToProject = useToolStore((state) => state.attachToProject);
  const clients = useClientStore((state) => state.clients);
  const fetchClients = useClientStore((state) => state.fetchAllAccessible);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isCompanyAdmin = useAuthStore((state) => state.isCompanyAdmin());
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const watchedLocation = Form.useWatch('location', form);
  const watchedLatitude = Form.useWatch('locationLatitude', form);
  const watchedLongitude = Form.useWatch('locationLongitude', form);
  const watchedRadius = Form.useWatch('locationRadiusMeters', form);
  const watchedShiftScheduleEnabled = Form.useWatch('shiftScheduleEnabled', form);
  const useLocationAsName = Form.useWatch('useLocationAsName', form);
  const watchedClientId = Form.useWatch('clientId', form);

  // Prefill the project's bill rate from the selected client's default hourly
  // rate (only when the field is still empty, so a manual value is never lost).
  useEffect(() => {
    if (!watchedClientId) return;
    const client = clients.find((c) => getEntityId(c) === watchedClientId);
    const rate = Number(client?.hourlyRate) || 0;
    if (rate > 0 && !form.getFieldValue('billRatePerHour')) {
      form.setFieldValue('billRatePerHour', rate);
    }
  }, [watchedClientId, clients, form]);

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
        let usersData = [];

        if (isSuperAdmin) {
          const usersRes = await apiClient.get('/users');
          usersData = usersRes.data;
        } else if (isCompanyAdmin && user?.companyId) {
          const usersRes = await apiClient.get(`/users/company/${user.companyId}`);
          usersData = usersRes.data;
        }

        const toolsRes = await apiClient.get('/tools');
        setUsers(usersData);
        setTools(Array.isArray(toolsRes.data) ? toolsRes.data : []);
      } catch (err) {
        console.error('Fetch error:', err);
        message.warning(formatApiError(err, 'Failed to load data'));
      }
    };

    fetchData();
    // Clients are scoped to the caller's company by the backend.
    fetchClients().catch(() => null);
  }, [isSuperAdmin, isCompanyAdmin, user, fetchClients]);

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
        littera: projectToEdit.littera,
        beginningDate: projectToEdit.beginningDate ? dayjs(projectToEdit.beginningDate) : null,
        endDate: projectToEdit.endDate ? dayjs(projectToEdit.endDate) : null,
        budget: projectToEdit.budget ?? null,
        plannedHours: projectToEdit.plannedHours ?? null,
        plannedMaterialsCost: projectToEdit.plannedMaterialsCost ?? null,
        costRatePerHour: projectToEdit.costRatePerHour ?? null,
        billRatePerHour: projectToEdit.billRatePerHour ?? null,
        spentMaterialsCost: projectToEdit.spentMaterialsCost ?? null,
        ownerId: typeof projectToEdit.ownerId === 'object' ? projectToEdit.ownerId?._id : projectToEdit.ownerId,
        projectManagerId:
          typeof projectToEdit.projectManagerId === 'object'
            ? projectToEdit.projectManagerId?._id
            : projectToEdit.projectManagerId,
        clientId:
          typeof projectToEdit.clientId === 'object'
            ? projectToEdit.clientId?._id
            : projectToEdit.clientId,
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

      const payload = {
        ownerId: values.ownerId,
        projectManagerId: values.projectManagerId,
        clientId: values.clientId || null,
        name: values.name?.trim() || '',
        status: values.status,
        location: values.location?.trim() || '',
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
        littera: values.littera?.trim() || '',
        beginningDate: values.beginningDate ? values.beginningDate.toISOString() : null,
        endDate: values.endDate ? values.endDate.toISOString() : null,
        budget: normalizeAmount(values.budget),
        plannedHours: normalizeAmount(values.plannedHours),
        plannedMaterialsCost: normalizeAmount(values.plannedMaterialsCost),
        spentMaterialsCost: normalizeAmount(values.spentMaterialsCost),
        costRatePerHour: normalizeAmount(values.costRatePerHour),
        billRatePerHour: normalizeAmount(values.billRatePerHour),
        description: values.description?.trim() || '',
        // Documents are managed on the Documents tab, not here. Re-sending them
        // made the backend append duplicates on every project save.
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

  const clientOptions = clients.map((item) => ({
    value: getEntityId(item),
    label: clientOptionLabel(item),
  }));

  const handleClientCreated = async () => {
    setClientModalOpen(false);
    try {
      const refreshed = await fetchClients();
      // clientStore sorts newest-first, so the just-created client is on top.
      const newest = Array.isArray(refreshed) ? refreshed[0] : null;
      if (newest) {
        form.setFieldValue('clientId', getEntityId(newest));
      }
    } catch {
      // Non-fatal: the select simply keeps its current value.
    }
  };

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
              <UiInput
                placeholder="Project name"
                readOnly={useLocationAsName}
                onFocus={() => {
                  // Clicking into the name field means the user wants a custom
                  // name, so stop mirroring the location instead of blocking input.
                  if (useLocationAsName) {
                    form.setFieldValue('useLocationAsName', false);
                  }
                }}
              />
            </Field>

            <Field name="contractNumber" label="Contract No.">
              <UiInput placeholder="e.g. BYG-2025-001" />
            </Field>

            <Field name="littera" label="Littera / order no.">
              <UiInput placeholder="e.g. 100014" />
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
              name="clientId"
              label="Client"
              extra={
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() => setClientModalOpen(true)}
                >
                  + New client
                </Button>
              }
            >
              <Select
                placeholder="Select client"
                options={clientOptions}
                style={{ width: '100%' }}
                showSearch
                optionFilterProp="label"
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
          <h3 className="admin-modal-form__section-title">Budget &amp; resources</h3>
          <div className="admin-modal-form__grid">
            <Field name="budget" label="Total budget (SEK)">
              <InputNumber
                min={0}
                controls={false}
                placeholder="0"
                style={{ width: '100%' }}
                formatter={amountFieldFormatter}
                parser={amountFieldParser}
              />
            </Field>

            <Field name="plannedHours" label="Planned hours">
              <InputNumber
                min={0}
                controls={false}
                placeholder="0"
                style={{ width: '100%' }}
                formatter={amountFieldFormatter}
                parser={amountFieldParser}
              />
            </Field>

            <Field name="plannedMaterialsCost" label="Planned materials (SEK)">
              <InputNumber
                min={0}
                controls={false}
                placeholder="0"
                style={{ width: '100%' }}
                formatter={amountFieldFormatter}
                parser={amountFieldParser}
              />
            </Field>

            <Field name="spentMaterialsCost" label="Spent materials (SEK)">
              <InputNumber
                min={0}
                controls={false}
                placeholder="0"
                style={{ width: '100%' }}
                formatter={amountFieldFormatter}
                parser={amountFieldParser}
              />
            </Field>

            <Field name="costRatePerHour" label="Cost rate / hour — självkostnad (SEK)">
              <InputNumber
                min={0}
                controls={false}
                placeholder="0"
                style={{ width: '100%' }}
                formatter={amountFieldFormatter}
                parser={amountFieldParser}
              />
            </Field>

            <Field name="billRatePerHour" label="Bill rate / hour — debiteras (SEK)">
              <InputNumber
                min={0}
                controls={false}
                placeholder="0"
                style={{ width: '100%' }}
                formatter={amountFieldFormatter}
                parser={amountFieldParser}
              />
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

      <AdminModal
        title="Add client"
        saveForm="client-create-form"
        saveText="Save client"
        open={clientModalOpen}
        onCancel={() => setClientModalOpen(false)}
        destroyOnHidden
        width={920}
      >
        <ClientCreateForm onClose={handleClientCreated} />
      </AdminModal>
    </>
  );
}
