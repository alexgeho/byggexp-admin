import { useEffect, useState, useMemo } from 'react';
import { Tag, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useProjectStore } from '@/src/store/projectStore';
import { useAuthStore } from '@/src/store/authStore';
import { useUsersInfo, useCompaniesInfo } from '@/src/shared/hooks/useEntitiesInfo';
import ProjectCreateForm from '@/src/features/projects/components/ProjectCreateForm';
import AdminModal from '@/src/shared/components/AdminModal';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';
import ProjectStatusFilterSelect from '@/src/shared/components/ProjectStatusFilterSelect';
import { useOutletContext, useNavigate } from '@/src/shared/routing/routerCompat';
import { getProjectStatusColor, getProjectStatusLabel } from '@/src/utils/projectStatus';

export default function ProjectListPage() {
  const { projects, loading, fetchAll, fetchByCompany, fetchMy, remove } = useProjectStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(undefined);
  const { registerAddButton, unregisterAddButton } = useOutletContext();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const userIds = useMemo(() => 
    projects.flatMap(p => [p.ownerId, p.projectManagerId]).filter(Boolean),
    [projects]
  );
  const companyIds = useMemo(() => 
    projects.map(p => p.clientCompanyId).filter(Boolean),
    [projects]
  );
  const { users } = useUsersInfo(userIds);
  const { companies } = useCompaniesInfo(companyIds);

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
    registerAddButton(() => showModal(), 'Add project');
    return () => unregisterAddButton();
  }, [user, fetchAll, fetchByCompany, fetchMy, registerAddButton, unregisterAddButton]);

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
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => navigate(`/projects/${record._id}`)}>{text}</a>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag className="status-tag" color={getProjectStatusColor(status)}>
          {getProjectStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Contract №',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      render: (val) => val || '-',
    },
    {
      title: 'Beginning',
      dataIndex: 'beginningDate',
      key: 'beginningDate',
      render: (d) => (d ? new Date(d).toLocaleDateString() : '-'),
    },
    {
      title: 'End',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (d) => (d ? new Date(d).toLocaleDateString() : '-'),
    },
    {
      title: 'Project manager',
      key: 'projectManager',
      render: (_, project) => {
        const managerId = typeof project.projectManagerId === 'object' 
          ? project.projectManagerId?._id 
          : project.projectManagerId;
        return users[managerId]?.name || '-';
      },
    },
    {
      title: 'Client company',
      key: 'clientCompany',
      render: (_, project) => {
        const companyId = typeof project.clientCompanyId === 'object' 
          ? project.clientCompanyId?._id 
          : project.clientCompanyId;
        return companies[companyId]?.name || '-';
      },
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'edit',
              label: 'Edit',
              icon: <EditOutlined />,
              roles: ['superadmin', 'companyAdmin', 'projectAdmin'],
              onClick: () => showModal(record),
            },
            {
              key: 'delete',
              label: 'Delete',
              icon: <DeleteOutlined />,
              danger: true,
              roles: ['superadmin', 'companyAdmin'],
              confirmTitle: 'Delete project?',
              confirmOkText: 'Delete',
              confirmCancelText: 'Cancel',
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
        title={editingProject ? 'Edit project' : 'Create project'}
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
