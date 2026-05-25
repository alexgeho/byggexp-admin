import { useEffect } from 'react';
import { Tag, Card, Empty, Spin } from 'antd';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import AdminTable from '../components/AdminTable';
import { getProjectStatusColor, getProjectStatusLabel } from '../utils/projectStatus';

export default function MyProjectsPage() {
  const { projects, loading, fetchAll, fetchByCompany, fetchMy } = useProjectStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'superadmin') {
      fetchAll();
    } else if (user?.role === 'companyAdmin' && user?.companyId) {
      fetchByCompany(user.companyId);
    } else {
      fetchMy();
    }
  }, [user, fetchAll, fetchByCompany, fetchMy]);

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
      title: 'Company',
      key: 'clientCompany',
      render: (_, project) => {
        return project.clientCompanyId?.name || '-';
      },
    },
    {
      title: 'Manager',
      key: 'projectManager',
      render: (_, project) => {
        return project.projectManagerId?.name || '-';
      },
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
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" tip="Loading projects..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card title="My Projects" style={{ marginBottom: '16px' }}>
        {projects.length === 0 ? (
          <Empty description="You do not have any projects yet" />
        ) : (
          <AdminTable
            dataSource={projects}
            columns={columns}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
        )}
      </Card>
    </div>
  );
}
