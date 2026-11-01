import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown } from 'antd';
import {
  CheckOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Select } from '@/src/ui-kit';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import ProjectFilterSelect from '@/src/shared/components/ProjectFilterSelect';
import StatusPills from '@/src/shared/components/StatusPills';
import StatusTag from '@/src/shared/components/StatusTag';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { statusLabel } from '@/src/shared/statusRegistry';
import { useAuthStore } from '@/src/store/authStore';
import { useDeviationStore } from '@/src/store/deviationStore';
import { appMessage } from '@/src/utils/appMessage';
import { getEntityId } from '@/src/utils/entityId';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { useLanguage } from '@/src/i18n/LanguageProvider';
import {
  DEVIATION_CATEGORIES,
  deviationCategoryLabel,
  deviationQueryParams,
  deviationSeverityLabel,
  deviationStatusKey,
  isDeviationOverdue,
} from '@/src/features/avvik/deviationMeta';
import DeviationForm from '@/src/features/avvik/components/DeviationForm';
import DeviationDrawer from '@/src/features/avvik/components/DeviationDrawer';
import CloseDeviationModal from '@/src/features/avvik/components/CloseDeviationModal';
import '@/src/features/avvik/avvik.scss';

const PILL_ORDER = ['open', 'in_progress', 'overdue', 'closed'];
const pillKey = (d) => d.status;

// Page mode only: the header «+ New deviation» (a project tab keeps its own
// toolbar button and must not register one in the page header).
function HeaderAddButton({ onAdd }) {
  useAddButton(onAdd, 'New deviation');
  return null;
}

// The deviation list. Page mode: project filter + header «+» button. Project
// tab mode (`projectId`): fixed project, «New deviation» in the toolbar.
export default function DeviationsView({ projectId = null }) {
  const { t, lang } = useLanguage();
  const role = useAuthStore((s) => s.user?.role);
  const canDelete = ['superadmin', 'companyAdmin'].includes(role);
  const { deviations, loading, fetchDeviations, reopenDeviation, removeDeviation } = useDeviationStore();
  const [projectFilter, setProjectFilter] = useState(projectId || undefined);
  const [category, setCategory] = useState(undefined);
  const [pill, setPill] = useState('all');
  const [formModal, setFormModal] = useState({ open: false, deviation: null });
  const [formCanSave, setFormCanSave] = useState(false);
  const [drawerId, setDrawerId] = useState(null);
  const [closing, setClosing] = useState(null);

  const scopeProject = projectId || projectFilter;
  const load = useCallback(
    () => fetchDeviations(deviationQueryParams(scopeProject, category)),
    [fetchDeviations, scopeProject, category],
  );
  useEffect(() => { void load(); }, [load]);

  const openNew = () => setFormModal({ open: true, deviation: null });

  const counts = useMemo(() => {
    const c = { all: deviations.length, open: 0, in_progress: 0, closed: 0, overdue: 0 };
    deviations.forEach((d) => {
      c[pillKey(d)] = (c[pillKey(d)] || 0) + 1;
      if (d.overdue ?? isDeviationOverdue(d)) c.overdue += 1;
    });
    return c;
  }, [deviations]);

  const rows = useMemo(() => {
    if (pill === 'all') return deviations;
    if (pill === 'overdue') return deviations.filter((d) => d.overdue ?? isDeviationOverdue(d));
    return deviations.filter((d) => d.status === pill);
  }, [deviations, pill]);

  const download = useCallback(async (kind) => {
    try {
      const res = await apiClient.get(`/deviations/export.${kind}`, {
        params: deviationQueryParams(scopeProject, category),
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lang === 'nb' ? 'avviksrapport' : 'avvikelserapport'}.${kind}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      appMessage.error(t('Could not download the report'));
    }
  }, [scopeProject, category, lang, t]);

  const columns = useMemo(() => [
    { title: '#', dataIndex: 'number', key: 'number', width: 64, render: (v) => `#${v}` },
    { title: t('Title'), dataIndex: 'title', key: 'title' },
    !projectId && { title: t('Project'), dataIndex: 'projectName', key: 'project', render: (v) => v || '—' },
    { title: t('Category'), dataIndex: 'category', key: 'category', render: (v) => deviationCategoryLabel(v, lang) },
    { title: t('Severity'), dataIndex: 'severity', key: 'severity', render: (v) => deviationSeverityLabel(v, lang) },
    { title: t('Responsible'), dataIndex: 'responsibleName', key: 'responsible', render: (v) => v || '—' },
    {
      title: t('Due by'),
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (v, r) => (v
        ? <span className={(r.overdue ?? isDeviationOverdue(r)) ? 'avvik-late' : undefined}>{formatAdminDate(v)}</span>
        : '—'),
    },
    { title: t('Status'), dataIndex: 'status', key: 'status', render: (v) => <StatusTag status={deviationStatusKey(v)} /> },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, r) => (
        <AdminTableActions
          items={[
            r.status === 'closed'
              ? r.canManage && {
                key: 'reopen',
                label: t('Reopen'),
                icon: <ReloadOutlined />,
                onClick: () => reopenDeviation(getEntityId(r)),
              }
              : r.canManage && {
                key: 'close',
                label: t('Close deviation'),
                icon: <CheckOutlined />,
                onClick: () => setClosing(r),
              },
            {
              key: 'edit',
              label: t('Edit'),
              icon: <EditOutlined />,
              onClick: () => setFormModal({ open: true, deviation: r }),
            },
            canDelete && {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              confirmTitle: t('Delete deviation?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => removeDeviation(getEntityId(r)),
            },
          ].filter(Boolean)}
        />
      ),
    },
  ].filter(Boolean), [t, lang, projectId, canDelete, reopenDeviation, removeDeviation]);

  const pills = [
    { value: 'all', label: t('All'), count: counts.all },
    ...PILL_ORDER.map((k) => ({
      value: k,
      label: k === 'overdue' ? t('Overdue') : statusLabel(deviationStatusKey(k), lang),
      count: counts[k] || 0,
    })),
  ];

  return (
    <>
      {projectId ? null : <HeaderAddButton onAdd={openNew} />}
      <AdminTable
        dataSource={rows}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={projectId ? false : { x: 1000 }}
        onRowClick={(r) => setDrawerId(getEntityId(r))}
        statusFilter={<StatusPills options={pills} value={pill} onChange={setPill} />}
        projectFilter={(
          <div className="admin-table-toolbar-filters">
            {projectId ? null : (
              <ProjectFilterSelect value={projectFilter} onChange={setProjectFilter} />
            )}
            <Select
              className="admin-table-filter-select"
              allowClear
              placeholder={t('All categories')}
              value={category}
              onChange={setCategory}
              options={DEVIATION_CATEGORIES.map((c) => ({ value: c, label: deviationCategoryLabel(c, lang) }))}
            />
          </div>
        )}
        toolbarEnd={(
          <>
            <Dropdown
              menu={{
                items: [
                  { key: 'pdf', label: t('Export PDF') },
                  { key: 'csv', label: t('Export CSV') },
                ],
                onClick: ({ key }) => download(key),
              }}
            >
              <Button icon={<DownloadOutlined />}>{t('Export')}</Button>
            </Dropdown>
            {projectId ? (
              <Button icon={<PlusOutlined />} onClick={openNew}>{t('New deviation')}</Button>
            ) : null}
          </>
        )}
        emptyState={{
          icon: <WarningOutlined />,
          title: t('No deviations'),
          actionLabel: t('New deviation'),
          onAction: openNew,
        }}
      />

      <AdminModal
        title={formModal.deviation ? `${t('Edit deviation')} #${formModal.deviation.number}` : t('New deviation')}
        saveForm="deviation-form"
        saveDisabled={!formCanSave}
        open={formModal.open}
        onCancel={() => setFormModal({ open: false, deviation: null })}
        destroyOnHidden
        width={720}
      >
        <DeviationForm
          deviation={formModal.deviation}
          fixedProjectId={projectId}
          onCanSaveChange={setFormCanSave}
          onSaved={() => setFormModal({ open: false, deviation: null })}
        />
      </AdminModal>

      <DeviationDrawer
        deviationId={drawerId}
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
        onEdit={(d) => setFormModal({ open: true, deviation: d })}
      />

      {closing ? (
        <CloseDeviationModal deviation={closing} open onClose={() => setClosing(null)} />
      ) : null}
    </>
  );
}
