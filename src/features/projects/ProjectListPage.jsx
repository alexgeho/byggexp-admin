import { useEffect, useState, useMemo, useCallback } from 'react';
import { Avatar, message, Tooltip } from 'antd';
import StatusTag from '@/src/shared/components/StatusTag';
import {
  EditOutlined,
  DeleteOutlined,
  PushpinOutlined,
  PushpinFilled,
} from '@ant-design/icons';
import apiClient from '@/src/api/apiClient';
import { useProjectStore } from '@/src/store/projectStore';
import { useAuthStore } from '@/src/store/authStore';
import { useUsersInfo } from '@/src/shared/hooks/useEntitiesInfo';
import { formatClientName } from '@/src/utils/clientName';
import ProjectCreateForm from '@/src/features/projects/components/ProjectCreateForm';
import AdminModal from '@/src/shared/components/AdminModal';
import { useT } from '@/src/i18n/LanguageProvider';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import StatusPills from '@/src/shared/components/StatusPills';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { useNavigate, useLocation } from '@/src/shared/routing/routerCompat';
import { getProjectDetailPath } from '@/src/utils/projectRoutes';
import { getProjectStatusLabel, PROJECT_STATUS_OPTIONS } from '@/src/utils/projectStatus';
import { formatSek } from '@/src/utils/formatCurrency';
import { formatAdminDate } from '@/src/utils/formatDateTime';

const resolveUrl = (url) => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, apiClient.defaults.baseURL).toString();
  } catch {
    return url;
  }
};

// Comparators used by the sortable column headers. Empty values always sort
// last so a click never buries the filled-in rows under blanks.
const byText = (get) => (a, b) => {
  const av = (get(a) || '').toString();
  const bv = (get(b) || '').toString();
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
};

const byNumber = (get) => (a, b) => {
  const av = get(a);
  const bv = get(b);
  const an = av == null || av === '' ? null : Number(av);
  const bn = bv == null || bv === '' ? null : Number(bv);
  if (an == null && bn == null) return 0;
  if (an == null) return 1;
  if (bn == null) return -1;
  return an - bn;
};

const byDate = (get) => (a, b) => {
  const at = get(a) ? new Date(get(a)).getTime() : null;
  const bt = get(b) ? new Date(get(b)).getTime() : null;
  if (!at && !bt) return 0;
  if (!at) return 1;
  if (!bt) return -1;
  return at - bt;
};

const PINNED_STORAGE_PREFIX = 'byggexp:pinnedProjects:';

const readPinnedIds = (companyId) => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${PINNED_STORAGE_PREFIX}${companyId || 'all'}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export default function ProjectListPage() {
  const { projects, loading, fetchAll, fetchByCompany, fetchMy, remove } = useProjectStore();
  const t = useT();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const userIds = useMemo(() =>
    projects.flatMap(p => [p.ownerId, p.projectManagerId]).filter(Boolean),
    [projects]
  );
  const { users } = useUsersInfo(userIds);

  // Pinned projects float to the top of the list (even while a column sort is
  // active) and persist per company in localStorage.
  const companyKey = user?.companyId || user?.role || 'all';
  const [pinnedIds, setPinnedIds] = useState(() => readPinnedIds(companyKey));
  useEffect(() => {
    setPinnedIds(readPinnedIds(companyKey));
  }, [companyKey]);
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);
  const isPinned = useCallback((id) => pinnedSet.has(id), [pinnedSet]);

  const togglePin = useCallback((id) => {
    setPinnedIds((current) => {
      const next = current.includes(id)
        ? current.filter((pinnedId) => pinnedId !== id)
        : [id, ...current];
      try {
        window.localStorage.setItem(
          `${PINNED_STORAGE_PREFIX}${companyKey}`,
          JSON.stringify(next),
        );
      } catch {
        // localStorage unavailable (private mode) — pins just won't persist.
      }
      return next;
    });
  }, [companyKey]);

  // Controlled column sort. We sort the data ourselves (rather than letting
  // antd do it) so pinned rows can stay on top in BOTH directions — antd would
  // otherwise negate the whole comparator on descend and flip the pins down.
  const [sortState, setSortState] = useState({ key: null, order: null });
  const handleTableChange = useCallback((_pagination, _filters, sorter) => {
    const active = Array.isArray(sorter) ? sorter[0] : sorter;
    setSortState({ key: active?.order ? active.columnKey : null, order: active?.order || null });
  }, []);
  const sortOrderFor = useCallback(
    (key) => (sortState.key === key ? sortState.order : null),
    [sortState],
  );

  const comparators = useMemo(() => {
    const managerName = (project) => {
      const managerId = typeof project.projectManagerId === 'object'
        ? project.projectManagerId?._id
        : project.projectManagerId;
      const manager = typeof project.projectManagerId === 'object'
        ? project.projectManagerId
        : users[managerId];
      return manager?.name || manager?.email || '';
    };
    return {
      name: byText((p) => p.name),
      projectManager: byText(managerName),
      location: byText((p) => p.location),
      beginningDate: byDate((p) => p.beginningDate),
      endDate: byDate((p) => p.endDate),
      budget: byNumber((p) => p.budget),
      status: byText((p) => t(getProjectStatusLabel(p.status || 'planning'))),
      client: byText((p) => formatClientName(p.clientId)),
    };
  }, [users, t]);

  const filteredProjects = useMemo(() => {
    const base = selectedStatus === 'all'
      ? projects
      : projects.filter((project) => project.status === selectedStatus);

    const activeComparator = sortState.order ? comparators[sortState.key] : null;
    const direction = sortState.order === 'descend' ? -1 : 1;

    // Pinned rows always first; within each group apply the active column sort
    // (or keep the incoming order when nothing is sorted).
    return [...base].sort((a, b) => {
      const ap = pinnedSet.has(a._id) ? 0 : 1;
      const bp = pinnedSet.has(b._id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return activeComparator ? direction * activeComparator(a, b) : 0;
    });
  }, [projects, selectedStatus, pinnedSet, sortState, comparators]);

  const statusOptions = useMemo(() => {
    const counts = projects.reduce((acc, project) => {
      const status = project.status || 'planning';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return [
      { value: 'all', label: t('All'), count: projects.length },
      ...PROJECT_STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: t(getProjectStatusLabel(option.value)),
        count: counts[option.value] || 0,
      })),
    ];
  }, [projects, t]);

  const toolbarStart = useMemo(() => (
    <StatusPills options={statusOptions} value={selectedStatus} onChange={setSelectedStatus} />
  ), [statusOptions, selectedStatus]);

  const showModal = (projectToEdit = null) => {
    setEditingProject(projectToEdit);
    setModalOpen(true);
  };
  const closeModal = () => {
    setEditingProject(null);
    setModalOpen(false);
  };

  useEffect(() => {
    const loadProjects = async () => {
      try {
        if (user?.role === 'superadmin') {
          await fetchAll();
        } else if (user?.role === 'companyAdmin' && user?.companyId) {
          await fetchByCompany(user.companyId);
        } else {
          await fetchMy();
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };

    loadProjects();
  }, [user, fetchAll, fetchByCompany, fetchMy]);

  useAddButton(() => showModal(), 'Add project');

  const handleDelete = async (id) => {
    try {
      await remove(id);
      message.success('Project deleted');
    } catch {
      message.error('Failed to delete project');
    }
  };

  const columns = [
    {
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: sortOrderFor('name'),
      render: (text, record) => {
        const pinned = isPinned(record._id);
        return (
          <span className="project-name-cell">
            <Tooltip title={pinned ? t('Unpin from top') : t('Pin to top')}>
              <button
                type="button"
                className={`project-pin-btn${pinned ? ' project-pin-btn--active' : ''}`}
                aria-label={pinned ? t('Unpin from top') : t('Pin to top')}
                onClick={(event) => {
                  event.stopPropagation();
                  togglePin(record._id);
                }}
              >
                {pinned ? <PushpinFilled /> : <PushpinOutlined />}
              </button>
            </Tooltip>
            <a onClick={() => navigate(getProjectDetailPath(pathname, record._id))}>{text}</a>
          </span>
        );
      },
    },
    {
      title: t('Project manager'),
      key: 'projectManager',
      sorter: true,
      sortOrder: sortOrderFor('projectManager'),
      render: (_, project) => {
        const managerId = typeof project.projectManagerId === 'object'
          ? project.projectManagerId?._id
          : project.projectManagerId;
        const manager = typeof project.projectManagerId === 'object'
          ? project.projectManagerId
          : users[managerId];

        if (!manager?.name && !manager?.email) {
          return '-';
        }

        const displayName = manager.name || manager.email;
        const avatarUrl = resolveUrl(manager.avatarUrl);

        return (
          <span className="admin-table-user">
            <Avatar size={39} src={avatarUrl} className="admin-table-user__avatar">
              {displayName.charAt(0).toUpperCase()}
            </Avatar>
            <span className="admin-table-user__name">{displayName}</span>
          </span>
        );
      },
    },
    {
      title: t('Location'),
      dataIndex: 'location',
      key: 'location',
      width: 240,
      sorter: true,
      sortOrder: sortOrderFor('location'),
    },
    {
      title: t('Budget'),
      dataIndex: 'budget',
      key: 'budget',
      align: 'right',
      // Wide enough (no ellipsis) so amounts like "1 200 000 SEK" aren't cut.
      width: 150,
      ellipsis: false,
      sorter: true,
      sortOrder: sortOrderFor('budget'),
      render: (budget) => (budget ? formatSek(budget, { decimals: false }) : '-'),
    },
    {
      title: t('Beginning'),
      dataIndex: 'beginningDate',
      key: 'beginningDate',
      sorter: true,
      sortOrder: sortOrderFor('beginningDate'),
      render: (d) => formatAdminDate(d),
    },
    {
      title: t('End'),
      dataIndex: 'endDate',
      key: 'endDate',
      sorter: true,
      sortOrder: sortOrderFor('endDate'),
      render: (d) => formatAdminDate(d),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      sorter: true,
      sortOrder: sortOrderFor('status'),
      render: (status) => <StatusTag status={status} />,
    },
    {
      title: t('Client'),
      key: 'client',
      sorter: true,
      sortOrder: sortOrderFor('client'),
      render: (_, project) => formatClientName(project.clientId) || '-',
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'pin',
              label: isPinned(record._id) ? t('Unpin from top') : t('Pin to top'),
              icon: isPinned(record._id) ? <PushpinFilled /> : <PushpinOutlined />,
              onClick: () => togglePin(record._id),
            },
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
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: t('Delete project?'),
              confirmOkText: t('Delete'),
              confirmCancelText: t('Cancel'),
              onClick: () => handleDelete(record._id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <AdminTable
        dataSource={filteredProjects}
        columns={columns}
        rowKey="_id"
        loading={loading}
        statusFilter={toolbarStart}
        onChange={handleTableChange}
      />

      <AdminModal
        title={editingProject ? t('Edit project') : t('Create project')}
        saveForm="project-create-form"
        open={modalOpen}
        onCancel={closeModal}
        destroyOnHidden
        width={920}
      >
        <ProjectCreateForm onClose={closeModal} projectToEdit={editingProject} />
      </AdminModal>
    </>
  );
}
