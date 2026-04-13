import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Drawer, Tag, Popconfirm, Space, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore } from '../store/authStore';
import { useUsersInfo, useCompaniesInfo } from '../hooks/useEntitiesInfo';
import ProjectCreateForm from '../components/ProjectCreateForm';
import { useOutletContext, useNavigate } from 'react-router-dom';
import RoleBasedAccess from '../components/RoleBasedAccess';

export default function ProjectListPage() {
  const { projects, loading, fetchAll, fetchByCompany, fetchMy, remove } = useProjectStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
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

  const showDrawer = (projectToEdit = null) => {
    setEditingProject(projectToEdit);
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setEditingProject(null);
    setDrawerOpen(false);
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
    registerAddButton(() => showDrawer(), 'Add project');
    return () => unregisterAddButton();
  }, [user, fetchAll, fetchByCompany, fetchMy, registerAddButton, unregisterAddButton]);

  const handleDelete = async (id) => {
    try {
      await remove(id);
      message.success('Проект удалён');
    } catch {
      message.error('Ошибка при удалении проекта');
    }
  };

  const getStatusColor = (status) => {
    const colorMap = {
      planning: '#D4D933',
      in_progress: '#2582D9',
      completed: '#25D937',
      on_hold: '#252ED9',
    };
    return colorMap[status] || 'default';
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
        <Tag color={getStatusColor(status)}>
          {status}
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
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => showDrawer(record)}
            />
          </RoleBasedAccess>
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Popconfirm
              title="Удалить проект?"
              onConfirm={() => handleDelete(record._id)}
              okText="Да"
              cancelText="Отмена"
            >
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </RoleBasedAccess>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        dataSource={projects}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
      />

      <Drawer
        title={editingProject ? 'Edit project' : 'Create project'}
        width={520}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={closeDrawer} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" form="project-create-form" key="submit" htmlType="submit">Save</Button>
          </div>
        }
      >
        <ProjectCreateForm onClose={closeDrawer} projectToEdit={editingProject} />
      </Drawer>
    </>
  );
}
