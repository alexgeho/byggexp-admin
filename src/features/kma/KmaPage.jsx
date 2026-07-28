import { useEffect, useMemo, useState } from 'react';
import { Button, Segmented, Select, Space, Tag, message } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  FilePdfOutlined,
  SignatureOutlined,
} from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import { useAuthStore } from '@/src/store/authStore';
import { useChecklistStore } from '@/src/store/checklistStore';
import { getEntityId } from '@/src/utils/entityId';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { kmaCategoryLabel } from '@/src/features/kma/categories';
import { STARTER_TEMPLATES } from '@/src/features/kma/starterTemplates';
import TemplateForm from '@/src/features/kma/components/TemplateForm';
import NewChecklistForm from '@/src/features/kma/components/NewChecklistForm';
import ChecklistFillForm from '@/src/features/kma/components/ChecklistFillForm';

const STATUS_META = {
  draft: { sv: 'Pågående', en: 'Draft', color: 'default' },
  completed: { sv: 'Klar', en: 'Completed', color: 'processing' },
  signed: { sv: 'Signerad', en: 'Signed', color: 'success' },
};

export default function KmaPage() {
  const { t, lang } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const store = useChecklistStore();
  const {
    templates, checklists, loadingTemplates, loadingChecklists,
    fetchTemplates, createTemplate, removeTemplate,
    fetchChecklists, signChecklist, removeChecklist,
  } = store;
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const [view, setView] = useState('checklists');
  const [projectFilter, setProjectFilter] = useState(null);
  const [projects, setProjects] = useState([]);
  const [seeding, setSeeding] = useState(false);

  const addStarterTemplates = async () => {
    setSeeding(true);
    const existing = new Set(templates.map((tpl) => (tpl.name || '').toLowerCase()));
    let added = 0;
    for (const tpl of STARTER_TEMPLATES) {
      if (existing.has(tpl.name.toLowerCase())) continue;
      try {
        await createTemplate(tpl);
        added += 1;
      } catch { /* store surfaces errors */ }
    }
    setSeeding(false);
    message.success(added ? `${added} ${t('templates added')}` : t('Templates already exist'));
  };

  const [tplModal, setTplModal] = useState({ open: false, editing: null });
  const [newModal, setNewModal] = useState(false);
  const [fillModal, setFillModal] = useState({ open: false, checklist: null });
  const [signModal, setSignModal] = useState({ open: false, checklist: null, name: '' });

  useEffect(() => {
    const label = view === 'templates' ? 'Add template' : 'New checklist';
    registerAddButton(() => {
      if (view === 'templates') setTplModal({ open: true, editing: null });
      else setNewModal(true);
    }, label);
    return () => unregisterAddButton();
  }, [view, registerAddButton, unregisterAddButton]);

  useEffect(() => { void fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { void fetchChecklists(projectFilter || undefined); }, [fetchChecklists, projectFilter]);

  useEffect(() => {
    const load = async () => {
      const url = user?.role === 'superadmin' ? '/projects' : '/projects/my';
      try {
        const { data } = await apiClient.get(url);
        setProjects(data || []);
      } catch { /* ignore */ }
    };
    load();
  }, [user?.role]);

  const projectNames = useMemo(
    () => Object.fromEntries(projects.map((p) => [getEntityId(p), p.name])),
    [projects],
  );

  const downloadPdf = async (record) => {
    try {
      const res = await apiClient.get(`/checklists/${getEntityId(record)}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `egenkontroll-${getEntityId(record)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* store surfaces errors */ }
  };

  const checklistColumns = useMemo(() => [
    { title: t('Title'), dataIndex: 'title', key: 'title', render: (v) => v || '—' },
    {
      title: t('Project'),
      key: 'project',
      render: (_, r) => (r.projectId ? projectNames[String(r.projectId)] || '—' : '—'),
    },
    { title: t('Category'), dataIndex: 'category', key: 'category', render: (v) => kmaCategoryLabel(v, lang) },
    { title: t('Date'), dataIndex: 'date', key: 'date', render: (v) => (v ? formatAdminDate(v) : '—') },
    {
      title: t('Points'),
      key: 'points',
      align: 'center',
      render: (_, r) => {
        const total = r.items?.length || 0;
        const done = (r.items || []).filter((it) => it.result && it.result !== 'pending').length;
        return `${done}/${total}`;
      },
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (v = 'draft') => {
        const m = STATUS_META[v] || STATUS_META.draft;
        return <Tag color={m.color}>{(lang === 'sv' ? m.sv : m.en).toUpperCase()}</Tag>;
      },
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'fill',
              label: record.status === 'signed' ? t('View') : t('Fill in'),
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setFillModal({ open: true, checklist: record }),
            },
            record.status !== 'signed' && {
              key: 'sign',
              label: t('Sign'),
              icon: <SignatureOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setSignModal({ open: true, checklist: record, name: record.responsible || '' }),
            },
            {
              key: 'pdf',
              label: t('Export PDF'),
              icon: <FilePdfOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => downloadPdf(record),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              confirmTitle: t('Delete checklist?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => removeChecklist(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [projectNames, removeChecklist, t, lang]);

  const templateColumns = useMemo(() => [
    { title: t('Template name'), dataIndex: 'name', key: 'name', render: (v) => v || '—' },
    { title: t('Category'), dataIndex: 'category', key: 'category', render: (v) => kmaCategoryLabel(v, lang) },
    { title: t('Control points'), dataIndex: 'items', key: 'items', align: 'center', render: (v) => v?.length || 0 },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'edit',
              label: t('Edit'),
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => setTplModal({ open: true, editing: record }),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              confirmTitle: t('Delete template?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => removeTemplate(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [removeTemplate, t, lang]);

  return (
    <>
      <AdminTable
        dataSource={view === 'templates' ? templates : checklists}
        columns={view === 'templates' ? templateColumns : checklistColumns}
        rowKey="_id"
        loading={view === 'templates' ? loadingTemplates : loadingChecklists}
        scroll={{ x: 960 }}
        toolbarStart={(
          <Space wrap>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'checklists', label: t('Checklists') },
                { value: 'templates', label: t('Templates') },
              ]}
            />
            {view === 'checklists' ? (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ minWidth: 200 }}
                placeholder={t('All projects')}
                value={projectFilter}
                onChange={setProjectFilter}
                options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))}
              />
            ) : (
              <Button loading={seeding} onClick={addStarterTemplates}>
                {t('Add standard templates')}
              </Button>
            )}
          </Space>
        )}
      />

      <AdminModal
        title={tplModal.editing ? t('Edit template') : t('New template')}
        saveForm="template-form"
        open={tplModal.open}
        onCancel={() => setTplModal({ open: false, editing: null })}
        destroyOnHidden
        width={760}
      >
        <TemplateForm onClose={() => setTplModal({ open: false, editing: null })} templateToEdit={tplModal.editing} />
      </AdminModal>

      <AdminModal
        title={t('New checklist')}
        saveForm="new-checklist-form"
        open={newModal}
        onCancel={() => setNewModal(false)}
        destroyOnHidden
        width={720}
      >
        <NewChecklistForm
          onClose={() => setNewModal(false)}
          defaultProjectId={projectFilter}
          onCreated={(created) => created && setFillModal({ open: true, checklist: created })}
        />
      </AdminModal>

      <AdminModal
        title={fillModal.checklist?.title || t('Egenkontroll')}
        saveForm="checklist-fill-form"
        saveText={fillModal.checklist?.status === 'signed' ? t('Close') : t('Save')}
        open={fillModal.open}
        onCancel={() => setFillModal({ open: false, checklist: null })}
        destroyOnHidden
        width={820}
      >
        {fillModal.checklist ? (
          <ChecklistFillForm onClose={() => setFillModal({ open: false, checklist: null })} checklist={fillModal.checklist} />
        ) : null}
      </AdminModal>

      <AdminModal
        title={t('Sign checklist')}
        open={signModal.open}
        onCancel={() => setSignModal({ open: false, checklist: null, name: '' })}
        onSave={async () => {
          await signChecklist(getEntityId(signModal.checklist), signModal.name);
          setSignModal({ open: false, checklist: null, name: '' });
        }}
        saveText={t('Sign')}
        width={480}
      >
        <div style={{ padding: 20 }}>
          <p style={{ marginTop: 0, color: 'var(--muted, #64748b)' }}>
            {t('Signing locks the checklist from further editing.')}
          </p>
          <label style={{ display: 'block', marginBottom: 6 }}>{t('Signed by')}</label>
          <input
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            value={signModal.name}
            placeholder={t('Name')}
            onChange={(e) => setSignModal((s) => ({ ...s, name: e.target.value }))}
          />
        </div>
      </AdminModal>
    </>
  );
}
