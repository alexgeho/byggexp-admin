import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, Empty, Button, Table, Popconfirm, message, Space, Drawer } from 'antd';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useProjectStore } from '../store/projectStore';
import { useUsersInfo, useCompaniesInfo } from '../hooks/useEntitiesInfo';
import ProjectWorkersManager from '../components/ProjectWorkersManager';
import RoleBasedAccess from '../components/RoleBasedAccess';
import ProjectCreateForm from '../components/ProjectCreateForm';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentProject, loading, fetchOne, remove } = useProjectStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const ownerId = typeof currentProject?.ownerId === 'object' ? currentProject?.ownerId?._id : currentProject?.ownerId;
  const managerId = typeof currentProject?.projectManagerId === 'object' ? currentProject?.projectManagerId?._id : currentProject?.projectManagerId;
  const companyId = typeof currentProject?.clientCompanyId === 'object' ? currentProject?.clientCompanyId?._id : currentProject?.clientCompanyId;
  
  const { users } = useUsersInfo([ownerId, managerId]);
  const { companies } = useCompaniesInfo([companyId]);

  useEffect(() => {
    fetchOne(id);
  }, [id, fetchOne]);

  const handleDelete = async () => {
    try {
      await remove(id);
      message.success('Проект удалён');
      navigate(-1);
    } catch {
      message.error('Ошибка при удалении проекта');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" tip="Загрузка проекта..." />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description="Проект не найден" />
        <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />}>
          Назад
        </Button>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colorMap = {
      planning: '#D4D933',
      in_progress: '#2582D9',
      completed: '#25D937',
      on_hold: '#252ED9',
    };
    return colorMap[status] || 'default';
  };

  const owner = users[ownerId];
  const manager = users[managerId];
  const company = companies[companyId];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Button onClick={() => navigate(-1)} icon={<ArrowLeftOutlined />}>
          Назад
        </Button>
        <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}>
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setDrawerOpen(true)}>
              Редактировать
            </Button>
            <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
              <Popconfirm
                title="Удалить проект?"
                onConfirm={handleDelete}
                okText="Да"
                cancelText="Отмена"
              >
                <Button danger icon={<DeleteOutlined />}>
                  Удалить
                </Button>
              </Popconfirm>
            </RoleBasedAccess>
          </Space>
        </RoleBasedAccess>
      </div>

      <Card 
        title={currentProject.name}
        extra={<Tag color={getStatusColor(currentProject.status)}>{currentProject.status}</Tag>}
      >
        <Descriptions column={2} bordered size="middle">
          <Descriptions.Item label="Локация">{currentProject.location}</Descriptions.Item>
          <Descriptions.Item label="Контракт №">{currentProject.contractNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="Начало">
            {currentProject.beginningDate ? new Date(currentProject.beginningDate).toLocaleDateString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Окончание">
            {currentProject.endDate ? new Date(currentProject.endDate).toLocaleDateString() : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Владелец" span={2}>
            {owner?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Менеджер проекта" span={2}>
            {manager?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Компания клиента" span={2}>
            {company?.name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Описание" span={2}>
            {currentProject.description || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <div style={{ marginTop: '16px' }}>
        <RoleBasedAccess 
          allowedRoles={['superadmin', 'companyAdmin', 'projectAdmin']}
          fallback={
            <Card title="Работники проекта">
              <Table
                dataSource={currentProject.workers || []}
                columns={[
                  { title: 'Имя', dataIndex: 'name', key: 'name' },
                  { title: 'Email', dataIndex: 'email', key: 'email' },
                  { title: 'Роль', dataIndex: 'role', key: 'role' },
                  { title: 'Телефон', key: 'phone', render: (_, w) => w.phoneAreaCode && w.phoneNumber ? `+${w.phoneAreaCode} ${w.phoneNumber}` : '-' },
                ]}
                rowKey="_id"
                pagination={false}
              />
            </Card>
          }
        >
          <ProjectWorkersManager projectId={id} project={currentProject} />
        </RoleBasedAccess>
      </div>

      <Drawer
        title="Edit project"
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setDrawerOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" form="project-create-form" key="submit" htmlType="submit">Save</Button>
          </div>
        }
      >
        <ProjectCreateForm onClose={() => setDrawerOpen(false)} projectToEdit={currentProject} />
      </Drawer>
    </div>
  );
}
