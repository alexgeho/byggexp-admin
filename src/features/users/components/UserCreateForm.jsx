import { useEffect, useMemo, useState } from 'react';
import { Form, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Field, Input, Select, Button, Segmented } from '@/src/ui-kit';
import { useUserStore } from '@/src/store/userStore';
import { useToolStore } from '@/src/store/toolStore';
import { useAuthStore } from '@/src/store/authStore';
import { getEntityId } from '@/src/utils/entityId';
import { formatApiError } from '@/src/utils/formError';
import apiClient from '@/src/api/apiClient';
import { useT } from '@/src/i18n/LanguageProvider';
import { useCompanyCountry } from '@/src/hooks/useActiveCompany';
import { isValidNationalId } from '@/src/config/markets';
import useWizardDraft from '@/src/shared/hooks/useWizardDraft';

const EMPTY_PROJECT_IDS = [];

// Create is a short guided wizard (research: chunk a 12+ field, multi-category
// form into 3 named steps → higher completion; keep required fields on step 1
// minimal to reduce abandonment). Edit stays a single form.
const LAST_STEP = 2;
const STEPS = [
  { key: 'contact', label: 'Contact', title: 'Who are you adding?' },
  { key: 'access', label: 'Projects', title: 'Which projects?' },
  { key: 'details', label: 'Details', title: 'Employment details' },
];

const parsePhoneFields = (value) => {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) {
    return { areaCode: undefined, phone: undefined };
  }

  if (digits.length <= 2) {
    return {
      areaCode: parseInt(digits, 10),
      phone: undefined,
    };
  }

  return {
    areaCode: parseInt(digits.slice(0, 2), 10),
    phone: parseInt(digits.slice(2), 10),
  };
};

const formatPhoneForDisplay = (areaCode, phoneNumber) => {
  if (areaCode == null && phoneNumber == null) {
    return '';
  }

  const area = areaCode != null ? String(areaCode) : '';
  const phone = phoneNumber != null ? String(phoneNumber) : '';

  if (!area && !phone) {
    return '';
  }

  return `+${area}${phone}`;
};

export default function UserCreateForm({
  onClose,
  userToEdit = null,
  defaultProjectIds = EMPTY_PROJECT_IDS,
  onCreated,
}) {
  const t = useT();
  const country = useCompanyCountry();
  const phonePlaceholder = country === 'NO' ? '+47 40012345' : '+46 701234567';
  const [form] = Form.useForm();
  const [projects, setProjects] = useState([]);
  const [tools, setTools] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const createUser = useUserStore((state) => state.create);
  const updateUser = useUserStore((state) => state.update);
  const attachToolsToWorker = useToolStore((state) => state.attachToWorker);
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin());
  const isCompanyAdmin = useAuthStore((state) => state.isCompanyAdmin());
  const selectedRole = Form.useWatch('role', form);
  const isWorkerRole = selectedRole === 'worker';
  const isCreate = !userToEdit;
  const userToEditId = userToEdit ? getEntityId(userToEdit) : null;
  const editingSelf = !!userToEditId && String(userToEditId) === String(getEntityId(user) || '');
  // Who may change a user's role: superadmin always; a company admin for other
  // users in the company (never their own role). Mirrors the backend rule.
  const canAssignRole = isSuperAdmin || (isCompanyAdmin && !editingSelf);
  const defaultProjectIdsKey = (defaultProjectIds || EMPTY_PROJECT_IDS).join(',');

  const roleOptions = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { value: 'worker', label: 'Worker' },
        { value: 'projectAdmin', label: 'Project Admin' },
        { value: 'companyAdmin', label: 'Company Admin' },
        { value: 'superadmin', label: 'Super Admin' },
      ];
    }
    if (isCompanyAdmin) {
      // A company admin may only assign worker / project admin — never another
      // company admin (only a superadmin mints company admins).
      return [
        { value: 'worker', label: 'Worker' },
        { value: 'projectAdmin', label: 'Project Admin' },
      ];
    }
    return [];
  }, [isCompanyAdmin, isSuperAdmin]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const response =
          user?.role === 'superadmin'
            ? await apiClient.get('/projects')
            : await apiClient.get('/projects/my');
        setProjects(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to load projects:', error);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    const loadTools = async () => {
      try {
        const response = await apiClient.get('/tools');
        setTools(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Failed to load tools:', error);
        setTools([]);
      }
    };

    loadProjects();
    loadTools();
  }, [user?.role]);

  useEffect(() => {
    if (userToEdit) {
      form.setFieldsValue({
        email: userToEdit.email,
        name: userToEdit.name,
        phone: formatPhoneForDisplay(userToEdit.phoneAreaCode, userToEdit.phoneNumber),
        profession: userToEdit.profession,
        hourlyRate: userToEdit.hourlyRate ?? undefined,
        taxTable: userToEdit.taxTable ?? undefined,
        taxColumn: userToEdit.taxColumn ?? undefined,
        personalNumber: userToEdit.personalNumber || undefined,
        role: userToEdit.role,
        projectIds: userToEdit.projectIds || [],
      });
      return;
    }

    form.resetFields();
    setStep(0);
    // Most added members are workers — preselect to cut a decision on step 2.
    form.setFieldsValue({
      role: 'worker',
      ...(defaultProjectIds.length ? { projectIds: defaultProjectIds } : {}),
    });
    // Reset only when the edit target / default projects change — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable keys
  }, [defaultProjectIdsKey, userToEditId, form]);

  // Persist create-wizard progress locally so closing mid-way doesn't lose it.
  // Declared after the init effect so its restore runs *after* the reset above.
  const draft = useWizardDraft({
    storageKey: 'byggexp.wizard.user',
    form,
    enabled: isCreate,
    setStep,
  });

  const onFinish = async (values) => {
    // In the create wizard, submitting (Next button / Enter) advances a step
    // until the last one; only then do we actually create the user.
    if (isCreate && step < LAST_STEP) {
      setStep(step + 1);
      draft.save(step + 1);
      return;
    }

    try {
      setSubmitting(true);
      const { phone, ...rest } = values;
      const { areaCode, phone: phoneNumber } = parsePhoneFields(phone);

      const payload = {
        email: rest.email?.trim(),
      };

      if (rest.name?.trim()) {
        payload.name = rest.name.trim();
      }

      if (rest.profession?.trim()) {
        payload.profession = rest.profession.trim();
      }

      if (rest.hourlyRate !== undefined && rest.hourlyRate !== null && rest.hourlyRate !== '') {
        payload.hourlyRate = Number(String(rest.hourlyRate).replace(',', '.'));
      }

      if (rest.taxTable !== undefined && rest.taxTable !== null && rest.taxTable !== '') {
        payload.taxTable = Number(rest.taxTable);
      }

      if (rest.taxColumn !== undefined && rest.taxColumn !== null && rest.taxColumn !== '') {
        payload.taxColumn = Number(rest.taxColumn);
      }

      if (rest.personalNumber?.trim()) {
        payload.personalNumber = rest.personalNumber.trim();
      }

      if (areaCode != null && phoneNumber != null) {
        payload.phoneAreaCode = areaCode;
        payload.phoneNumber = phoneNumber;
      }

      if (rest.role) {
        payload.role = rest.role;
      }

      if (rest.projectIds?.length) {
        payload.projectIds = rest.projectIds;
      }

      if (isCompanyAdmin && user?.companyId) {
        payload.companyId = user.companyId;
      }

      if (userToEdit) {
        const userId = getEntityId(userToEdit);
        if (!userId) {
          throw new Error('User id is missing');
        }

        payload.email = userToEdit.email;
        await updateUser(userId, payload);
      } else {
        payload.inviteViaEmail = true;
        const createdUser = await createUser(payload);
        const workerId = getEntityId(createdUser);

        if (isWorkerRole && rest.toolIds?.length && workerId) {
          await attachToolsToWorker(workerId, rest.toolIds);
        }

        if (onCreated) {
          await onCreated(createdUser);
        }
        draft.clear();
      }

      form.resetFields();
      onClose();
    } catch (error) {
      message.error(formatApiError(error, t('Failed to save user')));
    } finally {
      setSubmitting(false);
    }
  };

  const projectOptions = projects.map((project) => ({
    value: getEntityId(project),
    label: project.name,
  }));

  const toolOptions = tools.map((tool) => ({
    value: getEntityId(tool),
    label: tool.name,
  }));

  // --- Field groups (shared by the edit form and the create wizard) ---------
  const contactFields = (
    <>
      <Field
        name="email"
        label={t('Email')}
        rules={[
          { required: true, message: t('Please enter email') },
          { type: 'email', message: t('Please enter a valid email') },
        ]}
      >
        <Input placeholder="email@company.com" disabled={!!userToEdit} autoComplete="off" />
      </Field>

      <Field name="name" label={t('Name')}>
        <Input placeholder={t('Employee name')} />
      </Field>

      <Field
        name="phone"
        label={t('Phone')}
        rules={[
          {
            validator: (_, value) => {
              if (!value) {
                return Promise.resolve();
              }

              const { areaCode, phone } = parsePhoneFields(value);
              if (areaCode && phone) {
                return Promise.resolve();
              }

              return Promise.reject(new Error(t('Please enter a valid phone number')));
            },
          },
        ]}
      >
        <Input placeholder={phonePlaceholder} />
      </Field>

      <Field name="role" label={t('Role')}>
        <Select
          placeholder={t('Select role')}
          disabled={!!userToEdit && !canAssignRole}
          options={roleOptions.map((option) => ({ ...option, label: t(option.label) }))}
          style={{ width: '100%' }}
        />
      </Field>
    </>
  );

  const accessFields = (
    <>
      <Field name="projectIds" label={t('Projects')}>
        <Select
          mode="multiple"
          placeholder={loadingProjects ? t('Loading projects...') : t('Select project')}
          loading={loadingProjects}
          options={projectOptions}
          style={{ width: '100%' }}
        />
      </Field>

      {isWorkerRole && !userToEdit ? (
        <Field name="toolIds" label={t('Tools')}>
          <Select
            mode="multiple"
            placeholder={t('Select tools')}
            options={toolOptions}
            style={{ width: '100%' }}
          />
        </Field>
      ) : null}
    </>
  );

  const detailFields = (
    <>
      <Field name="profession" label={t('Profession')}>
        <Input placeholder={t('Electrician')} />
      </Field>

      <Field name="hourlyRate" label={t('Hourly rate (SEK)')}>
        <Input type="number" min={0} step="0.01" placeholder="e.g. 350" />
      </Field>

      <Field
        name="personalNumber"
        label={t('Personnummer')}
        rules={[{
          warningOnly: true,
          validator: (_, v) => (isValidNationalId(v, country)
            ? Promise.resolve()
            : Promise.reject(new Error(t('Check the ID number format')))),
        }]}
      >
        <Input placeholder={country === 'NO' ? 'DDMMÅÅ-XXXXX' : t('YYYYMMDD-XXXX')} />
      </Field>

      <Field name="taxTable" label={t('Tax table')}>
        <Input type="number" min={29} max={43} placeholder={t('e.g. 31')} />
      </Field>

      <Field name="taxColumn" label={t('Column')}>
        <Select
          allowClear
          placeholder="1–6"
          options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
        />
      </Field>
    </>
  );

  // --- Edit: the original single, two-section form ---------------------------
  if (!isCreate) {
    return (
      <Form
        className="admin-modal-form"
        form={form}
        layout="vertical"
        onFinish={onFinish}
        id="user-create-form"
      >
        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Profile')}</h3>
          <div className="admin-modal-form__grid">
            {contactFields}
            {detailFields}
          </div>
        </section>

        <section className="admin-modal-form__section">
          <h3 className="admin-modal-form__section-title">{t('Assignment')}</h3>
          <div className="admin-modal-form__grid">{accessFields}</div>
        </section>
      </Form>
    );
  }

  // --- Create: the 3-step wizard --------------------------------------------
  const stepBody = [
    <div className="admin-modal-form__grid" key="contact">{contactFields}</div>,
    <div className="admin-modal-form__grid" key="access">{accessFields}</div>,
    <div key="details">
      <div className="admin-modal-form__invite-note">
        <MailOutlined />
        <span>{t('An invitation email will be sent to the address above.')}</span>
      </div>
      <div className="admin-modal-form__grid">{detailFields}</div>
    </div>,
  ];

  return (
    <Form
      className="admin-modal-form admin-modal-form--wizard"
      form={form}
      layout="vertical"
      onFinish={onFinish}
      onValuesChange={() => draft.save(step)}
      id="user-create-form"
    >
      <Segmented
        className="admin-modal-form__steps"
        size="sm"
        value={step}
        onChange={(next) => {
          // Allow jumping back to a completed step; go forward only via Next.
          if (next < step) { setStep(next); draft.save(next); }
        }}
        options={STEPS.map((s, i) => ({ value: i, label: `${i + 1}. ${t(s.label)}` }))}
      />

      <section className="admin-modal-form__section">
        <h3 className="admin-modal-form__section-title">{t(STEPS[step].title)}</h3>
        {stepBody[step]}
      </section>

      <div className="admin-modal-form__wizard-nav">
        <Button
          variant="secondary"
          onClick={step === 0
            ? () => { draft.clear(); onClose(); }
            : () => { setStep(step - 1); draft.save(step - 1); }}
        >
          {step === 0 ? t('Cancel') : t('Back')}
        </Button>
        {step < LAST_STEP ? (
          <Button variant="primary" onClick={() => form.submit()}>
            {t('Next')}
          </Button>
        ) : (
          <Button variant="primary" htmlType="submit" loading={submitting}>
            {t('Send invitation')}
          </Button>
        )}
      </div>
    </Form>
  );
}
