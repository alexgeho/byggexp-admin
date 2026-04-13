import { useEffect } from 'react';
import { Table, Tag, Card, Empty, Spin } from 'antd';
import { useProjectStore } from '../store/projectStore';
import { useNavigate } from 'react-router-dom';

export default function MyProjectsPage() {
  const { projects, loading, fetchMy } = useProjectStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMy();
  }, [fetchMy]);

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => navigate(`/projects/${record._id}`)}>{text}</a>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          planning: '#D4D933',
          in_progress: '#2582D9',
          completed: '#25D937',
          on_hold: '#252ED9',
        };
        return (
          <Tag color={colorMap[status] || 'default'}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: 'Локация',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Компания',
      key: 'clientCompany',
      render: (_, project) => {
        return project.clientCompanyId?.name || '-';
      },
    },
    {
      title: 'Менеджер',
      key: 'projectManager',
      render: (_, project) => {
        return project.projectManagerId?.name || '-';
      },
    },
    {
      title: 'Начало',
      dataIndex: 'beginningDate',
      key: 'beginningDate',
      render: (d) => (d ? new Date(d).toLocaleDateString() : '-'),
    },
    {
      title: 'Окончание',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (d) => (d ? new Date(d).toLocaleDateString() : '-'),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" tip="Загрузка проектов..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card title="Мои проекты" style={{ marginBottom: '16px' }}>
        {projects.length === 0 ? (
          <Empty description="У вас пока нет проектов" />
        ) : (
          <Table
            dataSource={projects}
            columns={columns}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: true }}
          />
        )}
      </Card>
    </div>
  );
}
