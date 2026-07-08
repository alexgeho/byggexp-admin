import { Card, Select, Space, message, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useProjectStore } from '@/src/store/projectStore';
import { useUserStore } from '@/src/store/userStore';
import AdminTable from '@/src/shared/components/AdminTable';
import AdminTableActions, { getActionsColumnProps } from '@/src/shared/components/AdminTableActions';

const { Option } = Select;

export default function ProjectWorkersManager({ projectId, project }) {
  const { removeWorker, addWorkers } = useProjectStore();
  const { users } = useUserStore();

  const handleAddWorker = async (workerId) => {
    if (!workerId) return;
    
    try {
      await addWorkers(projectId, [workerId]);
    } catch {
      message.error('Failed to add worker');
    }
  };

  const handleRemoveWorker = async (workerId) => {
    try {
      await removeWorker(projectId, workerId);
    } catch {
      message.error('Failed to remove worker');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag className="pill-tag" color={role === 'worker' ? 'green' : 'blue'}>{role}</Tag>
      ),
    },
    {
      title: 'Phone',
      key: 'phone',
      render: (_, worker) => 
        worker.phoneAreaCode && worker.phoneNumber 
          ? `+${worker.phoneAreaCode} ${worker.phoneNumber}` 
          : '-',
    },
    {
      ...getActionsColumnProps(),
      key: 'actions',
      render: (_, record) => (
        <AdminTableActions
          items={[
            {
              key: 'remove',
              label: 'Remove',
              icon: <DeleteOutlined />,
              danger: true,
              confirmTitle: 'Remove worker from project?',
              confirmOkText: 'Remove',
              confirmCancelText: 'Cancel',
              onClick: () => handleRemoveWorker(record._id),
            },
          ]}
        />
      ),
    },
  ];

  const projectWorkers = project?.workers || [];
  const availableWorkerIds = new Set(projectWorkers.map(w => w._id));

  return (
    <Card title="Project workers">
      <Space style={{ marginBottom: '16px' }}>
        <Select
          placeholder="Add a worker"
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

      <AdminTable
        dataSource={projectWorkers}
        columns={columns}
        rowKey="_id"
        infiniteScroll={false}
        scroll={false}
      />
    </Card>
  );
}
