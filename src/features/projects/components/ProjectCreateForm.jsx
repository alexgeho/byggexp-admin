import { useMemo, useState, useEffect } from 'react';
import { Form, Input, Select, Switch, DatePicker, TimePicker, message } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  ProjectOutlined,
  RightOutlined,
  ShopOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AdminFormField from '@/src/shared/components/AdminFormField';
import ProjectLocationPicker from '@/src/features/projects/components/ProjectLocationPicker';
import { useProjectStore } from '@/src/store/projectStore';
import { useToolStore } from '@/src/store/toolStore';
import { useAuthStore } from '@/src/store/authStore';
import apiClient from '@/src/api/apiClient';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';
import { DEFAULT_LOCATION_RADIUS_METERS } from '@/src/utils/projectLocationSearch';
import { SHIFT_GRACE_MINUTE_OPTIONS, buildShiftSchedulePayload, createDefaultShiftSchedule } from '@/src/utils/shiftSchedule';

const { Option } = Select;

function LocationSelectButton({ value, onOpen }) {
  return (
    <button type="button" className="project-location-field" onClick={onOpen}>
      <span
        className={[
          'project-location-field__value',
          !value && 'project-location-field__value--placeholder',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value || 'Location'}
      </span>
      <RightOutlined className="project-location-field__arrow" />
    </button>
  );
}

export default function ProjectCreateForm({ onClose, projectToEdit = null }) {
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

  return (
    <>
    <Form
      id="project-create-form"
      className="admin-create-form"
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

      <div className="project-create-form__group">
        <Form.Item
          className="project-create-form__item"
          name="location"
          label="Location"
          rules={[
            { required: true, message: 'Please select a location' },
            {
              validator: (_, value) => {
                const latitude = form.getFieldValue('locationLatitude');
                const longitude = form.getFieldValue('locationLongitude');

                if (value && latitude != null && longitude != null) {
                  return Promise.resolve();
                }

                return Promise.reject(new Error('Search for an address first'));
              },
            },
          ]}
        >
          <LocationSelectButton onOpen={() => setLocationPickerOpen(true)} />
        </Form.Item>

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

        <AdminFormField name="toolIds" label="Tools" icon={<ToolOutlined />}>
          <Select
            variant="borderless"
            className="project-create-form__select project-create-form__select--multiple"
            mode="multiple"
            placeholder="Attach tools"
            suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
          >
            {tools.map((tool) => (
              <Option key={getEntityId(tool)} value={getEntityId(tool)}>
                {tool.name}
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
          layout="switch"
          name="shiftScheduleEnabled"
          label="Shift time window"
          valuePropName="checked"
          rowClassName="project-create-form__row project-create-form__row--switch"
          fieldLabel="Limit shift start/end by work hours"
        >
          <Switch />
        </AdminFormField>

        <AdminFormField
          name="workDayStartTime"
          label="Work day starts"
          fieldLabel="Work day starts"
          icon={<ClockCircleOutlined />}
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
        </AdminFormField>

        <AdminFormField
          name="workDayEndTime"
          label="Work day ends"
          fieldLabel="Work day ends"
          icon={<ClockCircleOutlined />}
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
        </AdminFormField>

        <AdminFormField
          name="startGraceMinutes"
          label="Start grace"
          fieldLabel="Start grace (minutes before work day)"
          icon={<ClockCircleOutlined />}
        >
          <Select
            variant="borderless"
            className="project-create-form__select"
            disabled={!watchedShiftScheduleEnabled}
            suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
          >
            {SHIFT_GRACE_MINUTE_OPTIONS.map((minutes) => (
              <Option key={`start-${minutes}`} value={minutes}>
                {minutes} min
              </Option>
            ))}
          </Select>
        </AdminFormField>

        <AdminFormField
          name="endGraceMinutes"
          label="End grace"
          fieldLabel="End grace (minutes after work day)"
          icon={<ClockCircleOutlined />}
          rowClassName="project-create-form__row project-create-form__row--last"
        >
          <Select
            variant="borderless"
            className="project-create-form__select"
            disabled={!watchedShiftScheduleEnabled}
            suffixIcon={<RightOutlined className="project-create-form__select-arrow" />}
          >
            {SHIFT_GRACE_MINUTE_OPTIONS.map((minutes) => (
              <Option key={`end-${minutes}`} value={minutes}>
                {minutes} min
              </Option>
            ))}
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

    <ProjectLocationPicker
      open={locationPickerOpen}
      onClose={() => setLocationPickerOpen(false)}
      onConfirm={handleLocationConfirm}
      initialValue={locationPickerInitialValue}
    />
    </>
  );
}
