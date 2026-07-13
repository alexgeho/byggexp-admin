import { useEffect } from 'react';
import { Tag, Card, Empty, Spin } from 'antd';
import { useProjectStore } from '@/src/store/projectStore';
import { useAuthStore } from '@/src/store/authStore';
import { useNavigate, useLocation } from '@/src/shared/routing/routerCompat';
import { getProjectDetailPath } from '@/src/utils/projectRoutes';
import AdminTable from '@/src/shared/components/AdminTable';
import { getProjectStatusColor, getProjectStatusLabel } from '@/src/utils/projectStatus';
import { formatAdminDate } from '@/src/utils/formatDateTime';

export default function MyProjectsPage() {
  const { projects, loading, fetchAll, fetchByCompany, fetchMy } = useProjectStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { pathname } = useLocation();

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
        <a onClick={() => navigate(getProjectDetailPath(pathname, record._id))}>{text}</a>
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
      render: (d) => formatAdminDate(d),
    },
    {
      title: 'End',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (d) => formatAdminDate(d),
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
          />
        )}
      </Card>
    </div>
  );
}
