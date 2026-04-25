import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Popconfirm, Space, Table } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';
import TaskCreateForm from '../components/TaskCreateForm';
import RoleBasedAccess from '../components/RoleBasedAccess';
import { useProjectsInfo } from '../hooks/useEntitiesInfo';
import { useTaskStore } from '../store/taskStore';

export default function TaskListPage() {
  const { tasks, loading, fetchAllAccessible, remove } = useTaskStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const { registerAddButton, unregisterAddButton } = useOutletContext();

  const projectIds = useMemo(
    () => tasks.map((task) => (typeof task.projectId === 'object' ? task.projectId?._id : task.projectId)).filter(Boolean),
    [tasks]
  );
  const { projects } = useProjectsInfo(projectIds);

  const showDrawer = (taskToEdit = null) => {
    setEditingTask(taskToEdit);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setEditingTask(null);
    setDrawerOpen(false);
  };

  useEffect(() => {
    fetchAllAccessible();
    registerAddButton(() => showDrawer(), 'Add task');

    return () => unregisterAddButton();
  }, [fetchAllAccessible, registerAddButton, unregisterAddButton]);

  const columns = [
    {
      title: 'Task',
      dataIndex: 'taskTitle',
      key: 'taskTitle',
    },
    {
      title: 'Project',
      key: 'project',
      render: (_, task) => {
        const projectId = typeof task.projectId === 'object' ? task.projectId?._id : task.projectId;
        return projects[projectId]?.name || '-';
      },
    },
    {
      title: 'Description',
      dataIndex: 'taskDescription',
      key: 'taskDescription',
      render: (value) => value || '-',
    },
    {
      title: 'Start',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      title: 'Due',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (value) => (value ? new Date(value).toLocaleDateString() : '-'),
    },
    {
      title: 'Notifications',
      key: 'notifications',
      render: (_, task) => task.notifications?.length || 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => showDrawer(record)}
            />
          </RoleBasedAccess>
          <RoleBasedAccess allowedRoles={['superadmin', 'companyAdmin']}>
            <Popconfirm
              title="Delete task?"
              onConfirm={() => remove(record._id)}
              okText="Delete"
              cancelText="Cancel"
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
        dataSource={tasks}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: true }}
      />

      <Drawer
        title={editingTask ? 'Edit task' : 'Create task'}
        width={520}
        open={drawerOpen}
        onClose={closeDrawer}
        destroyOnClose
        footer={(
          <div style={{ textAlign: 'right' }}>
            <Button onClick={closeDrawer} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" form="task-create-form" key="submit" htmlType="submit">Save</Button>
          </div>
        )}
      >
        <TaskCreateForm onClose={closeDrawer} taskToEdit={editingTask} />
      </Drawer>
    </>
  );
}
