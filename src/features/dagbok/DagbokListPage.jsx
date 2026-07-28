import { useEffect, useMemo, useState } from 'react';
import { Select, Space, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, PictureOutlined } from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import { useOutletContext } from '@/src/shared/routing/routerCompat';
import DagbokForm from '@/src/features/dagbok/components/DagbokForm';
import { useAuthStore } from '@/src/store/authStore';
import { useDagbokStore } from '@/src/store/dagbokStore';
import { getEntityId } from '@/src/utils/entityId';
import { useT } from '@/src/i18n/LanguageProvider';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const truncate = (v, n = 60) => {
  const s = String(v || '');
  return s.length > n ? `${s.slice(0, n)}…` : s;
};

// Dagbok — construction site diary, as its own section with a project filter.
export default function DagbokListPage() {
  const { entries, loading, fetchAll, remove } = useDagbokStore();
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [projectFilter, setProjectFilter] = useState(null);
  const [projects, setProjects] = useState([]);
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const showModal = (record = null) => { setEditing(record); setModalOpen(true); };
  const closeModal = () => { setEditing(null); setModalOpen(false); };

  useEffect(() => {
    registerAddButton(() => showModal(), 'Add diary entry');
    return () => unregisterAddButton();
  }, [registerAddButton, unregisterAddButton]);

  useEffect(() => {
    void fetchAll(projectFilter || undefined);
  }, [fetchAll, projectFilter]);

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

  const columns = useMemo(() => [
    { title: t('Date'), dataIndex: 'date', key: 'date', width: 120, render: (v) => (v ? formatAdminDate(v) : '—') },
    {
      title: t('Project'),
      key: 'project',
      render: (_, r) => (r.projectId ? projectNames[String(r.projectId)] || '—' : '—'),
    },
    {
      title: t('Weather'),
      key: 'weather',
      render: (_, r) => [r.temperature, r.weather].filter(Boolean).join(' · ') || '—',
    },
    { title: t('Crew on site'), dataIndex: 'crewCount', key: 'crewCount', align: 'right', render: (v) => v || 0 },
    { title: t('Work performed'), dataIndex: 'workPerformed', key: 'workPerformed', render: (v) => truncate(v) || '—' },
    {
      title: t('Photos'),
      dataIndex: 'photoUrls',
      key: 'photoUrls',
      align: 'center',
      width: 80,
      render: (v) => (v?.length ? <Tag icon={<PictureOutlined />}>{v.length}</Tag> : '—'),
    },
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
              onClick: () => showModal(record),
            },
            {
              key: 'delete',
              label: t('Delete'),
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              confirmTitle: t('Delete diary entry?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => remove(getEntityId(record)),
            },
          ]}
        />
      ),
    },
  ], [projectNames, remove, t]);

  return (
    <>
      <AdminTable
        dataSource={entries}
        columns={columns}
        rowKey="_id"
        loading={loading}
        scroll={{ x: 960 }}
        toolbarStart={(
          <Space>
            <span>{t('Project')}</span>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ minWidth: 220 }}
              placeholder={t('All projects')}
              value={projectFilter}
              onChange={setProjectFilter}
              options={projects.map((p) => ({ value: getEntityId(p), label: p.name }))}
            />
          </Space>
        )}
      />

      <AdminModal
        title={editing ? t('Edit diary entry') : t('New diary entry')}
        saveForm="dagbok-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={880}
      >
        <DagbokForm onClose={closeModal} entryToEdit={editing} defaultProjectId={projectFilter} />
      </AdminModal>
    </>
  );
}
