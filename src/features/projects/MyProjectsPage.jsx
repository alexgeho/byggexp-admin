import { useEffect } from 'react';
import { Card, Empty, Spin } from 'antd';
import StatusTag from '@/src/shared/components/StatusTag';
import { useProjectStore } from '@/src/store/projectStore';
import { useAuthStore } from '@/src/store/authStore';
import { useNavigate, useLocation } from '@/src/shared/routing/routerCompat';
import { getProjectDetailPath } from '@/src/utils/projectRoutes';
import AdminTable from '@/src/shared/components/AdminTable';
import { formatAdminDate } from '@/src/utils/formatDateTime';
import { formatClientName } from '@/src/utils/clientName';
import { useT } from '@/src/i18n/LanguageProvider';

export default function MyProjectsPage() {
  const t = useT();
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
      title: t('Name'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => navigate(getProjectDetailPath(pathname, record._id))}>{text}</a>
      ),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <StatusTag status={status} />
      ),
    },
    {
      title: t('Location'),
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: t('Client'),
      key: 'client',
      render: (_, project) => formatClientName(project.clientId) || '-',
    },
    {
      title: t('Manager'),
      key: 'projectManager',
      render: (_, project) => {
        return project.projectManagerId?.name || '-';
      },
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
      <Card title={t('My Projects')} style={{ marginBottom: '16px' }}>
        {projects.length === 0 ? (
          <Empty description={t('You do not have any projects yet')} />
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
