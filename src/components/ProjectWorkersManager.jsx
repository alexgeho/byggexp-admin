import { Card, Table, Button, Select, Space, Popconfirm, message, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useProjectStore } from '../store/projectStore';
import { useUserStore } from '../store/userStore';

const { Option } = Select;

export default function ProjectWorkersManager({ projectId, project }) {
  const { removeWorker, addWorkers } = useProjectStore();
  const { users } = useUserStore();

  const handleAddWorker = async (workerId) => {
    if (!workerId) return;
    
    try {
      await addWorkers(projectId, [workerId]);
    } catch {
      message.error('Ошибка добавления работника');
    }
  };

  const handleRemoveWorker = async (workerId) => {
    try {
      await removeWorker(projectId, workerId);
    } catch {
      message.error('Ошибка удаления работника');
    }
  };

  const columns = [
    {
      title: 'Имя',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'worker' ? 'green' : 'blue'}>{role}</Tag>
      ),
    },
    {
      title: 'Телефон',
      key: 'phone',
      render: (_, worker) => 
        worker.phoneAreaCode && worker.phoneNumber 
          ? `+${worker.phoneAreaCode} ${worker.phoneNumber}` 
          : '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="Удалить работника из проекта?"
          onConfirm={() => handleRemoveWorker(record._id)}
          okText="Да"
          cancelText="Отмена"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            Удалить
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const projectWorkers = project?.workers || [];
  const availableWorkerIds = new Set(projectWorkers.map(w => w._id));

  return (
    <Card title="Управление работниками проекта">
      <Space style={{ marginBottom: '16px' }}>
        <Select
          placeholder="Добавить работника"
          style={{ width: 300 }}
          onChange={handleAddWorker}
          value={null}
        >
          {users
            .filter(u => u.role === 'worker' && !availableWorkerIds.has(u._id))
            .map(u => (
              <Option key={u._id} value={u._id}>{u.name}</Option>
            ))
          }
        </Select>
      </Space>

      <Table
        dataSource={projectWorkers}
        columns={columns}
        rowKey="_id"
        pagination={false}
      />
    </Card>
  );
}
