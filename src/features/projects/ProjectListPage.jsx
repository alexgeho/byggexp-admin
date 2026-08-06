import { useEffect, useState, useMemo } from 'react';
import { Avatar, Tag, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
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
import ProjectStatusFilterSelect from '@/src/shared/components/ProjectStatusFilterSelect';
import useAddButton from '@/src/shared/hooks/useAddButton';
import { useNavigate, useLocation } from '@/src/shared/routing/routerCompat';
import { getProjectDetailPath } from '@/src/utils/projectRoutes';
import { getProjectStatusColor, getProjectStatusLabel } from '@/src/utils/projectStatus';
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

export default function ProjectListPage() {
  const { projects, loading, fetchAll, fetchByCompany, fetchMy, remove } = useProjectStore();
  const t = useT();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(undefined);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const userIds = useMemo(() => 
    projects.flatMap(p => [p.ownerId, p.projectManagerId]).filter(Boolean),
    [projects]
  );
  const { users } = useUsersInfo(userIds);

  const filteredProjects = useMemo(() => {
    if (!selectedStatus) {
      return projects;
    }

    return projects.filter((project) => project.status === selectedStatus);
  }, [projects, selectedStatus]);

  const toolbarStart = useMemo(() => (
    <div className="admin-table-toolbar-filters">
      <ProjectStatusFilterSelect
        value={selectedStatus}
        onChange={setSelectedStatus}
      />
    </div>
  ), [selectedStatus]);

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
      render: (text, record) => (
        <a onClick={() => navigate(getProjectDetailPath(pathname, record._id))}>{text}</a>
      ),
    },
    {
      title: t('Project manager'),
      key: 'projectManager',
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
    },
    {
      title: t('Contract №'),
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      render: (val) => val || '-',
    },
    {
      title: t('Beginning'),
      dataIndex: 'beginningDate',
      key: 'beginningDate',
      render: (d) => formatAdminDate(d),
    },
    {
      title: t('End'),
      dataIndex: 'endDate',
      key: 'endDate',
      render: (d) => formatAdminDate(d),
    },
    {
      title: t('Budget'),
      dataIndex: 'budget',
      key: 'budget',
      align: 'right',
      render: (budget) => (budget ? formatSek(budget, { decimals: false }) : '-'),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag className="status-tag" color={getProjectStatusColor(status)}>
          {t(getProjectStatusLabel(status))}
        </Tag>
      ),
    },
    {
      title: t('Client'),
      key: 'client',
      render: (_, project) => formatClientName(project.clientId) || '-',
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
        toolbarStart={toolbarStart}
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
