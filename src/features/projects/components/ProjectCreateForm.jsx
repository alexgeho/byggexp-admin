import { useMemo, useRef, useState, useEffect } from 'react';
import { Button, DatePicker, Form, Input, Switch, TimePicker, message } from 'antd';
import dayjs from 'dayjs';
import { Field, Input as UiInput, Select, Textarea, Button as UiButton, Segmented } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import ProjectLocationPicker from '@/src/features/projects/components/ProjectLocationPicker';
import AdminModal from '@/src/shared/components/AdminModal';
import ClientCreateForm from '@/src/features/clients/components/ClientCreateForm';
import UserCreateForm from '@/src/features/users/components/UserCreateForm';
import { useProjectStore } from '@/src/store/projectStore';
import { useToolStore } from '@/src/store/toolStore';
import { useClientStore } from '@/src/store/clientStore';
import { useAuthStore } from '@/src/store/authStore';
import apiClient from '@/src/api/apiClient';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';
import { DEFAULT_LOCATION_RADIUS_METERS } from '@/src/utils/projectLocationSearch';
import { SHIFT_GRACE_MINUTE_OPTIONS, buildShiftSchedulePayload, createDefaultShiftSchedule } from '@/src/utils/shiftSchedule';
import AmountInput from '@/src/features/projects/components/AmountInput';
import LocationSelectButton from '@/src/features/projects/components/LocationSelectButton';
import { STATUS_OPTIONS, clientOptionLabel, normalizeAmount } from '@/src/features/projects/components/projectFormUtils';

// Create is a short guided wizard (mirrors add-employee / add-client): the
// basics first, then who works it, then schedule & money. Edit stays a single
// full form (also used inside the project Settings tab via showSubmitButton).
const LAST_STEP = 2;
const STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'team', label: 'Team & client' },
  { key: 'plan', label: 'Schedule & budget' },
];

export default function ProjectCreateForm({ onClose, projectToEdit = null, showSubmitButton = false }) {
  const t = useT();
  const [form] = Form.useForm();
  const isCreate = !projectToEdit;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
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
  const [userModalOpen, setUserModalOpen] = useState(false);
  const newWorkerRef = useRef(null);
  const watchedLocation = Form.useWatch('location', form);
  const watchedLatitude = Form.useWatch('locationLatitude', form);
  const watchedLongitude = Form.useWatch('locationLongitude', form);
  const watchedRadius = Form.useWatch('locationRadiusMeters', form);
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

  // Fetch (and refresh) the assignable users. Returned so callers can grab the
  // freshly-created worker after inviting one inline.
  const refreshUsers = async () => {
    let usersData = [];
    if (isSuperAdmin) {
      usersData = (await apiClient.get('/users')).data;
    } else if (isCompanyAdmin && user?.companyId) {
      usersData = (await apiClient.get(`/users/company/${user.companyId}`)).data;
    }
    usersData = Array.isArray(usersData) ? usersData : [];
    setUsers(usersData);
    return usersData;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await refreshUsers();
        const toolsRes = await apiClient.get('/tools');
        setTools(Array.isArray(toolsRes.data) ? toolsRes.data : []);
      } catch (err) {
        console.error('Fetch error:', err);
        message.warning(formatApiError(err, t('Failed to load data')));
      }
    };

    fetchData();
    // Clients are scoped to the caller's company by the backend.
    fetchClients().catch(() => null);
    // refreshUsers closes over stable auth flags; re-running only on those.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, isCompanyAdmin, user, fetchClients, t]);

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
        // Load both workers and project admins into the one team selector; on
        // save they're split back apart by role.
        workers: [
          ...(projectToEdit.workers || []).map((w) => (typeof w === 'object' ? w._id : w)),
          ...(projectToEdit.projectAdmins || []).map((a) => (typeof a === 'object' ? a._id : a)),
        ],
        toolIds: [],
        description: projectToEdit.description,
      });
    } else {
      form.resetFields();
      setStep(0);
      form.setFieldsValue({
        useLocationAsName: true,
        status: 'planning',
        locationRadiusMeters: DEFAULT_LOCATION_RADIUS_METERS,
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
    // In the create wizard, submitting (Next / Enter) just advances a step until
    // the last one; only then do we actually create the project. form.submit()
    // validates the whole form, so required fields on any step are enforced.
    if (isCreate && step < LAST_STEP) {
      setStep(step + 1);
      return;
    }
    try {
      setSubmitting(true);
      // onFinish only carries the currently-mounted step's fields; pull the rest
      // of the wizard (name/status/team on earlier, now-unmounted steps) too.
      values = { ...form.getFieldsValue(true), ...values };
      const allowedStatuses = ['planning', 'in_progress', 'completed', 'on_hold'];
      // The Status field lives on the wizard's Team step, which is unmounted by
      // the time the last step submits — so default to 'planning' rather than
      // erroring when the value didn't round-trip.
      const status = allowedStatuses.includes(values.status) ? values.status : 'planning';

      const payload = {
        ownerId: values.ownerId,
        projectManagerId: values.projectManagerId,
        clientId: values.clientId || null,
        name: values.name?.trim() || '',
        status,
        location: values.location?.trim() || '',
        locationLatitude: values.locationLatitude,
        locationLongitude: values.locationLongitude,
        locationRadiusMeters: values.locationRadiusMeters ?? DEFAULT_LOCATION_RADIUS_METERS,
        shiftSchedule: buildShiftSchedulePayload({
          // Shift window is always active now (toggle removed) — the work-day
          // hours drive the planned baseline on the Hours grid.
          enabled: true,
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
        // Split the single team selector back into workers vs project admins,
        // which the backend stores (and grants access) as separate arrays.
        workers: (values.workers || []).filter(
          (id) => users.find((u) => getEntityId(u) === id)?.role !== 'projectAdmin',
        ),
        projectAdmins: (values.workers || []).filter(
          (id) => users.find((u) => getEntityId(u) === id)?.role === 'projectAdmin',
        ),
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
        message.success(t('Project updated'));
      } else {
        const createdProject = await create(payload);
        const projectId = getEntityId(createdProject);
        if (values.toolIds?.length && projectId) {
          await attachToolsToProject(projectId, values.toolIds);
        }
        message.success(t('Project created'));
      }

      onClose();
      form.resetFields();
    } catch (err) {
      message.error(formatApiError(err, t('Failed to save project')));
    } finally {
      setSubmitting(false);
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

  // Team members you can assign to a project: workers AND project admins (the
  // roles a company admin manages), matching the project Team tab + mobile.
  // Company admins are company-wide (no per-project membership); the platform
  // superadmin and yourself are excluded.
  const myId = user?.id || user?._id || user?.userId;
  const teamMemberOptions = users
    .filter((item) => ['worker', 'projectAdmin'].includes(item.role) && getEntityId(item) !== myId)
    .map((item) => ({
      value: getEntityId(item),
      label: item.role === 'projectAdmin' ? `${item.name} · ${t('Project admin')}` : item.name,
    }));

  const userOptions = users.map((item) => ({
    value: getEntityId(item),
    label: item.name,
  }));

  const clientOptions = clients.map((item) => ({
    value: getEntityId(item),
    label: clientOptionLabel(item, t),
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

  // After inviting a worker inline, refresh the list and add them to the team.
  const handleWorkerCreated = async () => {
    setUserModalOpen(false);
    try {
      await refreshUsers();
      const created = newWorkerRef.current;
      newWorkerRef.current = null;
      const newId = created ? getEntityId(created) : null;
      if (newId) {
        const current = form.getFieldValue('workers') || [];
        if (!current.includes(newId)) {
          form.setFieldValue('workers', [...current, newId]);
        }
      }
    } catch {
      // Non-fatal: the select just keeps its current value.
    }
  };

  const toolOptions = tools.map((item) => ({
    value: getEntityId(item),
    label: item.name,
  }));

  // Hidden fields the location picker writes into — always mounted so their
  // values survive across wizard steps.
  const hiddenFields = (
    <>
      <Form.Item name="locationLatitude" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="locationLongitude" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="locationRadiusMeters" hidden>
        <Input />
      </Form.Item>
    </>
  );

  const generalSection = (
        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('General')}</h3>
          <div className="admin-modal-form__grid">
            <div className="admin-modal-form__grid-item--full">
              <Field
                name="location"
                label={t('Location')}
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

                      return Promise.reject(new Error(t('Search for an address first')));
                    },
                  },
                ]}
              >
                <LocationSelectButton onOpen={() => setLocationPickerOpen(true)} />
              </Field>
            </div>

            <div className="admin-modal-form__grid-item--full">
              <Field name="useLocationAsName" label={t('Use location as name')} valuePropName="checked">
                <Switch />
              </Field>
            </div>

            <Field
              name="name"
              label={t('Project name')}
              rules={[{ required: true, message: t('Please enter a project name') }]}
            >
              <UiInput
                placeholder={t('Project name')}
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

            <Field name="contractNumber" label={t('Contract No.')}>
              <UiInput placeholder={t('e.g. BYG-2025-001')} />
            </Field>

            <Field name="littera" label={t('Littera / order no.')}>
              <UiInput placeholder={t('e.g. 100014')} />
            </Field>
          </div>
        </section>
  );

  const teamSection = (
        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Team')}</h3>
          <div className="admin-modal-form__grid">
            <Field
              name="workers"
              label={t('Team members')}
              extra={(
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() => setUserModalOpen(true)}
                >
                  {t('+ New worker')}
                </Button>
              )}
            >
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                placeholder={t('Project team')}
                options={teamMemberOptions}
                style={{ width: '100%' }}
              />
            </Field>

            <Field name="toolIds" label={t('Tools')}>
              <Select
                mode="multiple"
                placeholder={t('Attach tools')}
                options={toolOptions}
                style={{ width: '100%' }}
              />
            </Field>

            <Field name="projectManagerId" label={t('Project manager')}>
              <Select placeholder={t('Project manager')} options={userOptions} style={{ width: '100%' }} allowClear />
            </Field>

            <Field
              name="clientId"
              label={t('Client')}
              extra={
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() => setClientModalOpen(true)}
                >
                  {t('+ New client')}
                </Button>
              }
            >
              <Select
                placeholder={t('Select client')}
                options={clientOptions}
                style={{ width: '100%' }}
                showSearch
                optionFilterProp="label"
                allowClear
              />
            </Field>

            <Field name="status" label={t('Status')}>
              <Select
                placeholder={t('Status')}
                options={STATUS_OPTIONS.map((opt) => ({ ...opt, label: t(opt.label) }))}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
        </section>
  );

  const scheduleSection = (
        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Shift schedule')}</h3>
          <div className="admin-modal-form__grid">
            <Field
              name="workDayStartTime"
              label={t('Work day starts')}
              rules={[{ required: true, message: t('Please select work day start time') }]}
            >
              <TimePicker
                format="HH:mm"
                minuteStep={5}
                needConfirm={false}
                placeholder="07:00"
              />
            </Field>

            <Field
              name="workDayEndTime"
              label={t('Work day ends')}
              rules={[{ required: true, message: t('Please select work day end time') }]}
            >
              <TimePicker
                format="HH:mm"
                minuteStep={5}
                needConfirm={false}
                placeholder="16:00"
              />
            </Field>

            <Field name="startGraceMinutes" label={t('Start grace (minutes)')}>
              <Select
                options={graceOptions}
                style={{ width: '100%' }}
              />
            </Field>

            <Field name="endGraceMinutes" label={t('End grace (minutes)')}>
              <Select
                options={graceOptions}
                style={{ width: '100%' }}
              />
            </Field>
          </div>
        </section>
  );

  const datesSection = (
        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Dates')}</h3>
          <div className="admin-modal-form__grid">
            <Field name="beginningDate" label={t('Start date')}>
              <DatePicker format="YYYY-MM-DD" placeholder={t('Select date')} />
            </Field>

            <Field name="endDate" label={t('End date')}>
              <DatePicker format="YYYY-MM-DD" placeholder={t('Select date')} />
            </Field>
          </div>
        </section>
  );

  const budgetSection = (
        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Budget & resources')}</h3>
          <div className="admin-modal-form__grid">
            <Field name="budget" label={t('Total budget (SEK)')}>
              <AmountInput />
            </Field>

            <Field name="plannedHours" label={t('Planned hours')}>
              <AmountInput />
            </Field>

            <Field name="plannedMaterialsCost" label={t('Planned materials (SEK)')}>
              <AmountInput />
            </Field>

            {projectToEdit ? (
              <Field name="spentMaterialsCost" label={t('Spent materials (SEK)')}>
                <AmountInput />
              </Field>
            ) : null}

            <Field name="costRatePerHour" label={t('Cost rate / hour — self-cost (SEK)')}>
              <AmountInput />
            </Field>

            <Field name="billRatePerHour" label={t('Bill rate / hour — billed (SEK)')}>
              <AmountInput />
            </Field>
          </div>
        </section>
  );

  const noteSection = (
        <section className="admin-modal-form__section">
          <div className="admin-modal-form__grid">
            <div className="admin-modal-form__grid-item--full">
              <Field name="description" label={t('Note')}>
                <Textarea rows={4} placeholder={t('Note')} />
              </Field>
            </div>
          </div>
        </section>
  );

  // Wizard step bodies (create only): basics → team & client → schedule & money.
  const stepBody = [
    generalSection,
    teamSection,
    <>{scheduleSection}{datesSection}{budgetSection}{noteSection}</>,
  ];

  const locationPicker = (
    <ProjectLocationPicker
      open={locationPickerOpen}
      onClose={() => setLocationPickerOpen(false)}
      onConfirm={handleLocationConfirm}
      initialValue={locationPickerInitialValue}
    />
  );

  const clientModal = (
    <AdminModal
      title={t('Add client')}
      saveForm="client-create-form"
      saveText={t('Save client')}
      open={clientModalOpen}
      onCancel={() => setClientModalOpen(false)}
      destroyOnHidden
      width={920}
    >
      <ClientCreateForm onClose={handleClientCreated} />
    </AdminModal>
  );

  // Invite a worker without leaving the project form. Single quick form (email
  // required, role defaults to Worker); the invite email is sent on save and the
  // new worker is auto-added to the team.
  const userModal = (
    <AdminModal
      title={t('Add worker')}
      saveForm="user-create-form"
      saveText={t('Send invitation')}
      open={userModalOpen}
      onCancel={() => setUserModalOpen(false)}
      destroyOnHidden
      width={920}
    >
      <UserCreateForm
        onClose={handleWorkerCreated}
        onCreated={(u) => { newWorkerRef.current = u; }}
        minimal
      />
    </AdminModal>
  );

  // --- Edit (and Settings-tab embed): the original single, full form ---------
  if (!isCreate) {
    return (
      <>
        <Form
          id="project-create-form"
          className="admin-modal-form"
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          {hiddenFields}
          {generalSection}
          {teamSection}
          {scheduleSection}
          {datesSection}
          {budgetSection}
          {noteSection}

          {showSubmitButton ? (
            <section className="admin-modal-form__section project-settings-tab__actions">
              <Button type="primary" htmlType="submit">
                {t('Save changes')}
              </Button>
            </section>
          ) : null}
        </Form>
        {locationPicker}
        {clientModal}
        {userModal}
      </>
    );
  }

  // --- Create: the 3-step wizard ---------------------------------------------
  return (
    <>
      <Form
        id="project-create-form"
        className="admin-modal-form admin-modal-form--wizard"
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Segmented
          className="admin-modal-form__steps"
          size="sm"
          value={step}
          onChange={(next) => {
            // Allow jumping back to a completed step; go forward only via Next.
            if (next < step) setStep(next);
          }}
          options={STEPS.map((s, i) => ({ value: i, label: `${i + 1}. ${t(s.label)}` }))}
        />

        {hiddenFields}
        {stepBody[step]}

        <div className="admin-modal-form__wizard-nav">
          <UiButton
            variant="secondary"
            onClick={step === 0 ? onClose : () => setStep(step - 1)}
          >
            {step === 0 ? t('Cancel') : t('Back')}
          </UiButton>
          {step < LAST_STEP ? (
            <UiButton variant="primary" onClick={() => form.submit()}>
              {t('Next')}
            </UiButton>
          ) : (
            <UiButton variant="primary" htmlType="submit" loading={submitting}>
              {t('Create project')}
            </UiButton>
          )}
        </div>
      </Form>
      {locationPicker}
      {clientModal}
      {userModal}
    </>
  );
}
